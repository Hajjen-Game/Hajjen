// SKYSHIFT 0.3 – FIRST FLIGHT 2.0.
// Handcrafted course and deterministic, renderer-independent flight simulation.
export const TRIAL=Object.freeze({
  id:"first-flight-v2",name:"FIRST FLIGHT 2.0",length:1300,
  gravity:24,jumpVelocity:12.5,hoverHeight:1.05,
  sideSpeed:15.8,startSpeed:20.5,endSpeed:26.5,
  fallDepth:8.5,shieldPenalty:35
});
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const curve=(s,a,b,radians)=>radians*smooth((s-a)/(b-a));

export const GAPS=Object.freeze([
 {id:"launch-leap",start:156,end:173,kind:"main"},
 {id:"island-one",start:330,end:346,kind:"island"},
 {id:"island-two",start:375,end:388,kind:"island"},
 {id:"island-three",start:417,end:431,kind:"island"},
 {id:"upper-vault",start:855,end:874,kind:"main"},
 {id:"final-horizon",start:1098,end:1120,kind:"final"}
]);
export const ISLANDS=Object.freeze([
 {id:"left-island",start:346,end:375,intervals:[[-6.4,-.35]]},
 {id:"right-island",start:388,end:417,intervals:[[.35,6.4]]},
 {id:"reunion",start:431,end:466,intervals:[[-6.4,6.4]]}
]);
export const SPLITS=Object.freeze([
 {start:560,end:680,innerLeft:1.9,innerRight:2.6},
]);
export const RISK_CUTS=Object.freeze([
 {start:597,end:603},{start:637,end:643}
]);
export const CHECKPOINTS=Object.freeze([0,260,475,735,995]);
export const SECTORS=Object.freeze([
 {s:0,name:"THE LAUNCH",tint:0x43ddf0},
 {s:467,name:"SKYBREAK",tint:0x9d83ff},
 {s:920,name:"FINAL VELOCITY",tint:0xff77ad}
]);
export const ROAD_CUES=Object.freeze([
 {s:120,label:"JUMP"}, {s:287,label:"SKY ISLANDS"},
 {s:522,label:"CHOOSE A LANE"}, {s:817,label:"UPPER VAULT"},
 {s:1065,label:"FINAL LEAP"}
]);
export const ARCHES=Object.freeze([
 {s:12,label:"FIRST FLIGHT",color:0x51e4fa},
 {s:465,label:"SKYBREAK",color:0xa18aff},
 {s:922,label:"FINAL VELOCITY",color:0xff77ad},
 {s:1295,label:"FINISH",color:0xffd6a2}
]);
export const SPEED_SECTIONS=Object.freeze([
 {start:0,end:125,id:"launch"}, {start:175,end:295,id:"long-curve"},
 {start:470,end:553,id:"sky-climb"}, {start:685,end:790,id:"descent"},
 {start:940,end:1092,id:"overdrive"}
]);

export function headingAt(s) {
  return curve(s,126,248,.44)+curve(s,268,338,-.44)+
         curve(s,462,548,-.32)+curve(s,690,770,.32)+
         curve(s,939,1020,.42)+curve(s,1165,1250,-.42);
}
export function heightAt(s) {
  return 3*smooth((s-464)/76)-3*smooth((s-688)/75)+
         4.6*smooth((s-772)/78)-4.6*smooth((s-955)/91);
}
export function widthAt(s) {
  const nodes=[[0,16],[108,16],[173,13.2],[254,14],[306,12.8],
    [466,12.8],[520,16],[550,16],[680,16],[738,13.5],
    [855,11.2],[908,11.6],[980,15.2],[1098,12.8],
    [1120,13.2],[1200,18],[1300,18]];
  for(let i=1;i<nodes.length;i++){
    if(s<nodes[i][0]){
      const a=nodes[i-1],b=nodes[i];
      return lerp(a[1],b[1],smooth((s-a[0])/(b[0]-a[0])));
    }
  }
  return nodes[nodes.length-1][1];
}
export function speedAt(s){
  return lerp(TRIAL.startSpeed,TRIAL.endSpeed,smooth(s/TRIAL.length));
}
export function sectorAt(s){
  let i=0;
  for(let k=1;k<SECTORS.length;k++)if(s>=SECTORS[k].s)i=k;
  return i;
}
export function gapAt(s){return GAPS.find(g=>s>=g.start&&s<g.end)??null;}
export function nextGap(s){return GAPS.find(g=>g.start>s)??null;}
export function roadIntervals(s){
  if(s<0||s>=TRIAL.length||gapAt(s))return [];
  const island=ISLANDS.find(x=>s>=x.start&&s<x.end);
  if(island)return island.intervals;
  const split=SPLITS.find(x=>s>=x.start&&s<x.end);
  if(split){
    const w=widthAt(s)*.5;
    const cut=RISK_CUTS.some(c=>s>=c.start&&s<c.end);
    return cut?[[-w,-split.innerLeft]]:
      [[-w,-split.innerLeft],[split.innerRight,w]];
  }
  const half=widthAt(s)*.5;
  return [[-half,half]];
}
export function onRoad(s,lateral,radius=.48){
  return roadIntervals(s).some(([a,b])=>lateral>=a+radius&&lateral<=b-radius);
}
export function checkpointFor(s){
  let cp=0;
  for(const p of CHECKPOINTS)if(s>=p)cp=p;
  return cp;
}
export const GEOMETRY_BREAKS=Object.freeze([...new Set([
  0,TRIAL.length,...GAPS.flatMap(g=>[g.start,g.end]),
  ...ISLANDS.flatMap(i=>[i.start,i.end]),
  ...SPLITS.flatMap(s=>[s.start,s.end]),
  ...RISK_CUTS.flatMap(x=>[x.start,x.end]),
  ...SECTORS.map(x=>x.s)
])].sort((a,b)=>a-b));

const STEP=.5;
const positions=[{x:0,z:0}];
for(let i=1;i<=Math.ceil(TRIAL.length/STEP)+100;i++){
  const d=(i-.5)*STEP,h=headingAt(d),prev=positions[i-1];
  positions.push({x:prev.x+Math.sin(h)*STEP,z:prev.z-Math.cos(h)*STEP});
}
export function poseAt(s){
  const d=clamp(s,0,TRIAL.length+40),i=Math.floor(d/STEP),f=d/STEP-i;
  const p=positions[i],q=positions[i+1],heading=headingAt(d);
  return {
    x:lerp(p.x,q.x,f),y:heightAt(d),z:lerp(p.z,q.z,f),heading,
    forwardX:Math.sin(heading),forwardZ:-Math.cos(heading),
    rightX:Math.cos(heading),rightZ:Math.sin(heading)
  };
}
export function positionAt(s,lateral=0,height=0){
  const p=poseAt(s);
  return {x:p.x+p.rightX*lateral,y:p.y+height,z:p.z+p.rightZ*lateral};
}
export function nearestLane(s,lateral){
  const lanes=roadIntervals(s);
  if(!lanes.length)return null;
  let best=null,bestDistance=Infinity;
  for(const [a,b] of lanes){
    const candidate=clamp(lateral,a+.6,b-.6);
    if(Math.abs(candidate-lateral)<bestDistance){
      bestDistance=Math.abs(candidate-lateral);best=candidate;
    }
  }
  return best;
}
export function newFlightState(){
  return {
    s:5,lateral:0,sideVelocity:0,y:heightAt(5)+TRIAL.hoverHeight,vy:0,
    grounded:true,coyote:0,jumpBuffer:0,jumpHold:0,
    jumps:0,landings:0,falls:0,failedJumps:0,
    clearedGaps:[],shield:100,checkpoint:0,elapsed:0,
    finished:false,failed:false,lastCrashS:0,landImpact:0,
    rightRouteArmed:false,routeRewarded:false,routeChoice:null,
    nearMisses:0,prevGrounded:true
  };
}

export function stepFlight(state,dt,control={}){
  if(state.finished||state.failed)return {kind:"idle"};
  const prevS=state.s;
  const previousFoot=state.y-TRIAL.hoverHeight;
  const prevGrounded=state.grounded;
  const steer=clamp(control.steer||0,-1,1);
  state.elapsed+=dt;
  state.sideVelocity=lerp(state.sideVelocity,steer*TRIAL.sideSpeed,1-Math.exp(-dt*12));
  state.lateral+=state.sideVelocity*dt;
  state.s+=speedAt(state.s)*dt;
  state.jumpBuffer=Math.max(0,state.jumpBuffer-dt);
  state.coyote=Math.max(0,state.coyote-dt);
  if(control.jumpPressed)state.jumpBuffer=.13;

  const solid=onRoad(state.s,state.lateral);
  const ground=heightAt(state.s);
  if(prevGrounded&&!solid){state.grounded=false;state.coyote=.065;}
  let jumped=false,landed=false,crashed=false,cleared=false,finished=false;
  let routeReward=false,routeChoice=null;
  if(state.jumpBuffer>0&&(state.grounded||state.coyote>0)){
    state.vy=TRIAL.jumpVelocity;state.grounded=false;state.coyote=0;
    state.jumpBuffer=0;state.jumpHold=0;state.jumps++;jumped=true;
  }
  if(state.grounded&&solid){
    state.y=ground+TRIAL.hoverHeight;state.vy=0;
  } else {
    state.vy-=TRIAL.gravity*(control.jumpHeld&&state.vy>0&&state.jumpHold<.17?.86:1)*dt;
    state.y+=state.vy*dt;
    state.jumpHold+=dt;
    const foot=state.y-TRIAL.hoverHeight;
    if(solid&&state.vy<=0&&previousFoot>=ground-.07&&foot<=ground){
      state.landImpact=Math.abs(state.vy);
      state.y=ground+TRIAL.hoverHeight;state.vy=0;
      state.grounded=true;state.landings++;landed=true;
    }
  }

  const checkpoint=checkpointFor(state.s);
  if(checkpoint>state.checkpoint)state.checkpoint=checkpoint;
  for(const gap of GAPS){
    if(prevS<gap.end&&state.s>=gap.end&&!state.clearedGaps.includes(gap.id)){
      if(state.y-TRIAL.hoverHeight>=heightAt(gap.end)-.3){
        state.clearedGaps.push(gap.id);cleared=true;
      }else state.failedJumps++;
    }
  }

  const split=SPLITS[0];
  if(prevS<split.start+12&&state.s>=split.start+12){
    state.routeChoice=state.lateral>split.innerRight?"right":
      state.lateral<-split.innerLeft?"left":null;
    state.rightRouteArmed=state.routeChoice==="right";
    routeChoice=state.routeChoice;
  }
  if(state.s>=split.start+12&&state.s<split.end){
    const traversingRightCut=RISK_CUTS.some(c=>state.s>=c.start&&state.s<c.end);
    const stillAboveDeck=state.y-TRIAL.hoverHeight>=heightAt(state.s)-.2;
    if(state.lateral<split.innerRight ||
       (!onRoad(state.s,state.lateral) &&
        !(traversingRightCut&&!state.grounded&&stillAboveDeck)))
      state.rightRouteArmed=false;
  }
  if(prevS<split.end&&state.s>=split.end&&!state.routeRewarded&&
     state.rightRouteArmed&&state.shield>0){
    state.routeRewarded=true;routeReward=true;
  }

  if(state.y<ground-TRIAL.fallDepth){
    state.falls++;crashed=true;state.lastCrashS=state.s;
    state.shield=Math.max(0,state.shield-TRIAL.shieldPenalty);
    state.rightRouteArmed=false;
    if(state.shield===0)state.failed=true;
    else {
      const recover=state.checkpoint+8;
      // Keep only jump clears made before the recovery position.
      // A crash must not leave stale island clears in the exported run log.
      state.clearedGaps=state.clearedGaps.filter(id=>
        GAPS.find(g=>g.id===id)?.end<=recover);
      state.s=recover;state.lateral=0;state.sideVelocity=0;
      state.y=heightAt(recover)+TRIAL.hoverHeight;state.vy=0;
      state.grounded=true;state.coyote=0;state.jumpBuffer=0;state.jumpHold=0;
      state.routeChoice=null;
    }
  }
  if(!state.failed&&state.s>=TRIAL.length){
    state.s=TRIAL.length;state.finished=true;finished=true;
  }
  return {
    kind:state.failed?"failed":finished?"finished":crashed?"crashed":
      jumped?"jumped":landed?"landed":cleared?"cleared":"moving",
    jumped,landed,crashed,cleared,finished,
    routeChoice,routeReward,landImpact:landed?state.landImpact:0
  };
}
export function validateTrial(){
  const errors=[];
  for(const gap of GAPS){
    const v=speedAt(gap.start),size=gap.end-gap.start,air=2*TRIAL.jumpVelocity/TRIAL.gravity;
    const freefall=.5*TRIAL.gravity*Math.pow(size/v,2);
    if(size>=v*air*.92)errors.push(gap.id+": beyond jump range");
    if(freefall<1.4)errors.push(gap.id+": too short; coasting might work");
    if(Math.abs(heightAt(gap.start)-heightAt(gap.end))>.1)
      errors.push(gap.id+": inconsistent landing elevation");
  }
  for(const cp of CHECKPOINTS){
    if(!onRoad(cp+8,0))errors.push("unsafe checkpoint "+cp);
  }
  for(let s=0;s<TRIAL.length;s+=.5){
    const p=poseAt(s),q=poseAt(s+.25);
    if(Math.hypot(p.x-q.x,p.z-q.z)>.45)errors.push("track continuity "+s);
  }
  return errors;
}
