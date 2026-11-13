// SKYSHIFT 0.2 – authored trial geometry and browser-independent flight physics.
// This deliberately replaces endless procedural tracks with one fixed, replayable course.
export const TRIAL = Object.freeze({
  id:"first-flight", name:"FIRST FLIGHT", length:980,
  gravity:24, jumpVelocity:12.5, hoverHeight:1.05,
  sideSpeed:14.6, startSpeed:20.5, endSpeed:25.8,
  fallDepth:8.5, shieldPenalty:35
});
export const GAPS = Object.freeze([
  {id:"the-leap",start:152,end:166},
  {id:"sky-bridge",start:326,end:341},
  {id:"high-crossing",start:634,end:651},
  {id:"final-leap",start:812,end:829}
]);
export const SPLITS = Object.freeze([{start:440,end:510,inner:2.3}]);
export const CHECKPOINTS = Object.freeze([0,268,563,754]);
export const SECTORS = Object.freeze([
  {s:0,name:"FLOW",tint:0x45dbef},
  {s:350,name:"SKYBREAK",tint:0x9c83ff},
  {s:690,name:"OVERDRIVE",tint:0xff78ab}
]);
export const ROAD_CUES = Object.freeze([
  {s:123,label:"FIRST GAP"},
  {s:297,label:"SKY BRIDGE"},
  {s:411,label:"CHOOSE A LANE"},
  {s:605,label:"HIGH CROSSING"},
  {s:779,label:"FINAL LEAP"}
]);

export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
export const lerp=(a,b,t)=>a+(b-a)*t;
const turn=(s,a,b,angle)=>angle*smooth((s-a)/(b-a));
export function headingAt(s) {
  return turn(s,112,207,.33)+turn(s,235,320,-.33)+
    turn(s,516,600,-.33)+turn(s,682,757,.33)+
    turn(s,849,919,.16);
}
export function heightAt(s) {
  return 2.15*smooth((s-260)/61)-2.15*smooth((s-356)/62)+
    3.15*smooth((s-699)/86)-3.15*smooth((s-854)/61);
}
export function widthAt(s) {
  const nodes=[[0,14],[126,14],[166,11.8],[257,12.6],
    [320,11.5],[375,13],[425,14],[525,12],
    [605,10.8],[660,10.2],[755,11],[835,12.4],[980,15]];
  for(let i=1;i<nodes.length;i++)if(s<nodes[i][0]){
    return lerp(nodes[i-1][1],nodes[i][1],smooth((s-nodes[i-1][0])/(nodes[i][0]-nodes[i-1][0])));
  }
  return nodes[nodes.length-1][1];
}
export function sectorAt(s) {
  let index=0;
  for(let i=1;i<SECTORS.length;i++)if(s>=SECTORS[i].s)index=i;
  return index;
}
export function speedAt(s) {
  return lerp(TRIAL.startSpeed,TRIAL.endSpeed,smooth(s/TRIAL.length));
}
export function gapAt(s) { return GAPS.find(g=>s>=g.start && s<g.end)??null; }
export function nextGap(s) { return GAPS.find(g=>g.start>s)??null; }
export function roadIntervals(s) {
  if(s<0||s>=TRIAL.length||gapAt(s))return [];
  const half=widthAt(s)*.5;
  const split=SPLITS.find(p=>s>=p.start&&s<p.end);
  return split?[[-half,-split.inner],[split.inner,half]]:[[-half,half]];
}
export function onRoad(s,lateral,radius=.48) {
  return roadIntervals(s).some(([a,b])=>lateral>=a+radius&&lateral<=b-radius);
}

// Precomputed fixed-step path integral means the track has deliberate straight sections
// and turns, with a coordinate frame consistent with steering, collision and camera.
const STEP=.5;
const positions=[{x:0,z:0}];
for(let i=1;i<=Math.ceil(TRIAL.length/STEP)+80;i++){
  const d=(i-.5)*STEP,head=headingAt(d),prev=positions[i-1];
  positions.push({x:prev.x+Math.sin(head)*STEP,z:prev.z-Math.cos(head)*STEP});
}
export function poseAt(s) {
  const d=clamp(s,0,TRIAL.length+35),a=Math.floor(d/STEP),f=(d/STEP)-a;
  const p=positions[a],q=positions[a+1];
  const heading=headingAt(d);
  return {
    x:lerp(p.x,q.x,f),z:lerp(p.z,q.z,f),y:heightAt(d),heading,
    rightX:Math.cos(heading),rightZ:Math.sin(heading),
    forwardX:Math.sin(heading),forwardZ:-Math.cos(heading)
  };
}
export function positionAt(s,lateral=0,yOffset=0) {
  const p=poseAt(s);
  return {x:p.x+p.rightX*lateral,y:p.y+yOffset,z:p.z+p.rightZ*lateral};
}
export function checkpointFor(s) {
  let checkpoint=CHECKPOINTS[0];
  for(const p of CHECKPOINTS)if(s>=p)checkpoint=p;
  return checkpoint;
}

export function newFlightState() {
  return {
    s:5,lateral:0,sideVelocity:0,y:heightAt(5)+TRIAL.hoverHeight,vy:0,
    grounded:true,coyote:0,jumpBuffer:0,jumpHold:0,
    jumps:0,landings:0,failedJumps:0,falls:0,clearedGaps:[],
    shield:100,checkpoint:0,elapsed:0,finished:false,failed:false,
    lastGap:null
  };
}

// Input: {steer: -1..1, jumpPressed, jumpHeld}. State is mutated to avoid
// per-frame allocations in browser and to make deterministic test simulation easy.
export function stepFlight(state,dt,control={}) {
  if(state.finished||state.failed)return {kind:"idle"};
  const previousS=state.s;
  const previousFoot=state.y-TRIAL.hoverHeight;
  const previousGrounded=state.grounded;
  const steering=clamp(control.steer||0,-1,1);
  state.elapsed+=dt;
  state.sideVelocity=lerp(state.sideVelocity,steering*TRIAL.sideSpeed,1-Math.exp(-dt*13));
  state.lateral+=state.sideVelocity*dt;
  state.s+=speedAt(state.s)*dt;
  state.coyote=Math.max(0,state.coyote-dt);
  state.jumpBuffer=Math.max(0,state.jumpBuffer-dt);
  if(control.jumpPressed)state.jumpBuffer=.14;
  const solid=onRoad(state.s,state.lateral);
  const ground=heightAt(state.s);
  if(previousGrounded && !solid) {
    state.grounded=false;
    state.coyote=.075;
  }
  let jumped=false,landed=false,crashed=false,cleared=false,finished=false;
  if(state.jumpBuffer>0&&(state.grounded||state.coyote>0)) {
    state.vy=TRIAL.jumpVelocity;
    state.grounded=false;state.coyote=0;state.jumpBuffer=0;state.jumpHold=0;
    state.jumps++;jumped=true;
  }
  if(state.grounded&&solid) {
    state.y=ground+TRIAL.hoverHeight;state.vy=0;
  } else {
    const gravityScale=control.jumpHeld && state.vy>0 && state.jumpHold<.17 ? .86 : 1;
    state.vy-=TRIAL.gravity*gravityScale*dt;
    state.y+=state.vy*dt;
    state.jumpHold+=dt;
    const nextFoot=state.y-TRIAL.hoverHeight;
    // A real landing requires descending FROM ABOVE the deck.
    // Reaching the far edge already below it is a missed landing, not a rescue snap.
    if(solid&&state.vy<=0&&previousFoot>=ground-.05&&nextFoot<=ground) {
      state.y=ground+TRIAL.hoverHeight;state.vy=0;
      state.grounded=true;state.landings++;landed=true;
    }
  }
  const nextCheckpoint=checkpointFor(state.s);
  if(nextCheckpoint>state.checkpoint)state.checkpoint=nextCheckpoint;
  for(const gap of GAPS) {
    if(previousS<gap.end&&state.s>=gap.end && !state.clearedGaps.includes(gap.id)){
      if(state.y-TRIAL.hoverHeight>=heightAt(gap.end)-.3) {
        state.clearedGaps.push(gap.id);cleared=true;
      } else {
        state.failedJumps++;
      }
    }
  }
  if(state.y<ground-TRIAL.fallDepth) {
    state.falls++;crashed=true;state.shield=Math.max(0,state.shield-TRIAL.shieldPenalty);
    if(state.shield<=0){state.failed=true;}
    else {
      // Never teleport directly into a gap. Keep the checkpoint before the obstacle.
      const recovery=state.checkpoint+8;
      state.s=recovery;state.lateral=0;state.sideVelocity=0;
      state.y=heightAt(recovery)+TRIAL.hoverHeight;state.vy=0;
      state.grounded=true;state.coyote=0;state.jumpBuffer=0;state.jumpHold=0;
    }
  }
  if(!state.failed && state.s>=TRIAL.length) {
    state.s=TRIAL.length;state.finished=true;finished=true;
  }
  return {kind:state.failed?"failed":finished?"finished":crashed?"crashed":
    jumped?"jumped":landed?"landed":cleared?"cleared":"moving",
    jumped,landed,crashed,cleared,finished};
}
export function validateTrial() {
  const errors=[];
  for(const gap of GAPS) {
    const speed=speedAt(gap.start),width=gap.end-gap.start;
    const airTime=2*TRIAL.jumpVelocity/TRIAL.gravity;
    const freeFall=.5*TRIAL.gravity*(width/speed)**2;
    if(width>=speed*airTime*.87)errors.push(gap.id+": too long for safe jumping");
    if(freeFall<1.5)errors.push(gap.id+": could be coasted without jumping");
    if(Math.abs(heightAt(gap.start)-heightAt(gap.end))>.1)
      errors.push(gap.id+": discontinuous elevation at jump");
  }
  for(const cp of CHECKPOINTS)
    if(!onRoad(cp+8,0))errors.push("checkpoint "+cp+" is not safe");
  return errors;
}
