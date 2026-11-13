// SKYSHIFT 0.4.1 – TRUE BANKING & MANUAL FLIGHT.
// A craft with independent world position, heading, and player-owned yaw.
// Track coordinates are ONLY used to locate the craft and test the road.
// Physically banked mesh and collision heights share the same surface function.
export const TRIAL=Object.freeze({
  id:"first-flight-manual-v041",name:"FIRST FLIGHT · TRUE BANK",length:1300,
  gravity:24,jumpVelocity:12.5,hoverHeight:1.05,
  sideSpeed:17.4,turnRate:1.12,steerResponse:11.5,
  startSpeed:20.5,endSpeed:26.5,
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
 {id:"left-island",start:346,end:375,intervals:[[-7.0,-.35]]},
 {id:"right-island",start:388,end:417,intervals:[[.35,7.0]]},
 {id:"reunion",start:431,end:466,intervals:[[-7.0,7.0]]}
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

// Angles accumulate into a continuous sweeping race-line. Turns intentionally
// settle before jumping islands, narrow risk cuts and mandatory leap edges.
export const FLOW_TURNS=Object.freeze([
 {start:35,end:116,delta:.85,label:"OPENING SWEEPER"},
 {start:181,end:258,delta:-1.07,label:"CROSSOVER RIGHT"},
 {start:270,end:308,delta:.28,label:"ISLAND APPROACH"},
 {start:460,end:538,delta:-.79,label:"SKYBREAK ENTRY"},
 {start:687,end:768,delta:.96,label:"SKYBREAK SWEEP"},
 {start:787,end:839,delta:-.66,label:"VAULT APPROACH"},
 {start:879,end:965,delta:-.49,label:"ELEVATED DESCENT"},
 {start:967,end:1050,delta:.86,label:"LINKED SWEEPER"},
 {start:1130,end:1248,delta:-.92,label:"FINISH SWEEP"}
]);
export function headingAt(s){
 return FLOW_TURNS.reduce((angle,t)=>angle+curve(s,t.start,t.end,t.delta),0);
}
export function curvatureAt(s){
 // Differential heading per metre. Central difference suppresses aliasing
 // at exact authoring boundaries, critical for deterministic 120Hz steering.
 return (headingAt(s+1)-headingAt(s-1))*.5;
}
// Road banking is truly 3D, and intentionally neutral through jumps,
// split bridges and narrow landing islands. Positive angle: lower right edge.
// The angle comes from authored curvature, not steering or camera orientation.
export const MAX_BANK_RAD=25*Math.PI/180;
export function bankAt(s){
 return clamp(curvatureAt(s)*26,-MAX_BANK_RAD,MAX_BANK_RAD);
}
export function bankDegreesAt(s){return bankAt(s)*180/Math.PI;}
export function surfaceHeightAt(s,lateral=0){
 return heightAt(s)-Math.sin(bankAt(s))*lateral;
}
export function surfaceNormalAt(s){
 const p=poseAt(s),b=bankAt(s);
 return {x:p.rightX*Math.sin(b),y:Math.cos(b),z:p.rightZ*Math.sin(b)};
}
export function heightAt(s) {
  return 3*smooth((s-464)/76)-3*smooth((s-688)/75)+
         4.6*smooth((s-772)/78)-4.6*smooth((s-955)/91);
}
// ~20–25% more room for carving, preserving narrower authored island lanes.
export function widthAt(s) {
  const nodes=[[0,19.6],[108,20],[173,16.4],[254,17.8],[306,15.8],
    [466,15.8],[520,19.8],[550,20.2],[680,20.2],[738,17.4],
    [855,14.5],[908,14.8],[980,18.6],[1098,16.4],
    [1120,17.4],[1200,21.2],[1300,21.2]];
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
  // Rotate lateral and normal axes about the track tangent, keeping visuals,
  // rail geometry, landing shadows, and collision surface at one true bank.
  const p=poseAt(s),bank=bankAt(s),cb=Math.cos(bank),sb=Math.sin(bank);
  const radial=lateral*cb+height*sb;
  return {x:p.x+p.rightX*radial,
    y:p.y-lateral*sb+height*cb,
    z:p.z+p.rightZ*radial};
}
export function projectWorldToTrack(x,z,hintS){
  // Nearest local piecewise track segment. This is a measurement only, NOT a
  // guidance force. Local search prevents jumping to another nearby switchback.
  const spacing=.5;
  let best=null,bestSq=Infinity;
  const from=Math.max(0,Math.floor((hintS-3)/spacing)*spacing);
  const to=Math.min(TRIAL.length+2,hintS+Math.max(4,TRIAL.endSpeed*.1));
  for(let start=from;start<to;start+=spacing){
    const end=Math.min(to,start+spacing),p=poseAt(start),q=poseAt(end);
    const dx=q.x-p.x,dz=q.z-p.z,denom=dx*dx+dz*dz;
    if(denom<1e-9)continue;
    const t=clamp(((x-p.x)*dx+(z-p.z)*dz)/denom,0,1);
    const cx=p.x+dx*t,cz=p.z+dz*t;
    const d=(x-cx)**2+(z-cz)**2;
    if(d<bestSq){bestSq=d;best=start+(end-start)*t;}
  }
  const s=clamp(best??hintS,0,TRIAL.length);
  const p=poseAt(s);
  return {s,lateral:((x-p.x)*p.rightX+(z-p.z)*p.rightZ)/Math.cos(bankAt(s)),
    distance:Math.sqrt(bestSq)};
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
  const start=positionAt(5,0,0);
  return {
    s:5,lateral:0,sideVelocity:0,worldX:start.x,worldZ:start.z,
    heading:headingAt(5),steering:0,lastInput:0,
    peakBankDeg:0,totalHeadingError:0,maxHeadingErrorDeg:0,
    headingSamples:0,offRoadSeconds:0,
    y:surfaceHeightAt(5,0)+TRIAL.hoverHeight,vy:0,
    grounded:true,coyote:0,jumpBuffer:0,jumpHold:0,
    jumps:0,landings:0,falls:0,failedJumps:0,
    steerSeconds:0,steerReversals:0,lastSteerSign:0,
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
  if(Math.abs(steer)>.12){
    state.steerSeconds+=dt;
    const sign=Math.sign(steer);
    if(state.lastSteerSign&&sign!==state.lastSteerSign)state.steerReversals++;
    state.lastSteerSign=sign;
  }
  // Only forward propulsion is automatic. Steering changes the ship's
  // physical heading; never snap it to headingAt() or move on a track spline.
  const previousLateral=state.lateral;
  state.steering=lerp(state.steering,steer,
    1-Math.exp(-dt*TRIAL.steerResponse));
  state.lastInput=steer;
  state.heading+=state.steering*TRIAL.turnRate*dt;
  const speed=speedAt(state.s);
  state.worldX+=Math.sin(state.heading)*speed*dt;
  state.worldZ-=Math.cos(state.heading)*speed*dt;
  const projected=projectWorldToTrack(state.worldX,state.worldZ,state.s);
  state.s=projected.s;state.lateral=projected.lateral;
  state.sideVelocity=(state.lateral-previousLateral)/dt;
  const headingError=Math.atan2(
    Math.sin(state.heading-headingAt(state.s)),
    Math.cos(state.heading-headingAt(state.s))
  );
  const angleDeg=Math.abs(headingError)*180/Math.PI;
  state.maxHeadingErrorDeg=Math.max(state.maxHeadingErrorDeg,angleDeg);
  state.totalHeadingError+=angleDeg;state.headingSamples++;
  state.peakBankDeg=Math.max(state.peakBankDeg,Math.abs(bankDegreesAt(state.s)));
  if(!onRoad(state.s,state.lateral))state.offRoadSeconds+=dt;
  state.jumpBuffer=Math.max(0,state.jumpBuffer-dt);
  state.coyote=Math.max(0,state.coyote-dt);
  if(control.jumpPressed)state.jumpBuffer=.13;

  const solid=onRoad(state.s,state.lateral);
  const ground=surfaceHeightAt(state.s,state.lateral);
  const previousGround=surfaceHeightAt(prevS,previousLateral);
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
    if(solid&&state.vy<=0&&previousFoot>=previousGround-.07&&foot<=ground){
      state.landImpact=Math.abs(state.vy);
      state.y=ground+TRIAL.hoverHeight;state.vy=0;
      state.grounded=true;state.landings++;landed=true;
    }
  }

  const checkpoint=checkpointFor(state.s);
  if(checkpoint>state.checkpoint)state.checkpoint=checkpoint;
  for(const gap of GAPS){
    if(prevS<gap.end&&state.s>=gap.end&&!state.clearedGaps.includes(gap.id)){
      if(state.y-TRIAL.hoverHeight>=surfaceHeightAt(gap.end,state.lateral)-.3){
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
    const stillAboveDeck=state.y-TRIAL.hoverHeight>=surfaceHeightAt(state.s,state.lateral)-.2;
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
      const spawn=positionAt(recover,0,0);
      state.worldX=spawn.x;state.worldZ=spawn.z;
      state.heading=headingAt(recover);state.steering=0;state.lastInput=0;
      state.y=surfaceHeightAt(recover,0)+TRIAL.hoverHeight;state.vy=0;
      state.grounded=true;state.coyote=0;state.jumpBuffer=0;state.jumpHold=0;
      state.routeChoice=null;
    }
  }
  if(!state.failed&&state.s>=TRIAL.length&&onRoad(TRIAL.length-.01,state.lateral)){
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
    if(Math.abs(bankAt(s))>MAX_BANK_RAD+1e-8)
      errors.push("bank beyond limit "+s);
    if(Math.hypot(p.x-q.x,p.z-q.z)>.45)errors.push("track continuity "+s);
  }
  return errors;
}
