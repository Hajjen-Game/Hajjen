// SKYSHIFT 0.16.5: deterministic reproduction of the no-jump GRIP bug.
// Run independently per URL-selected course: node ...probe-v0165.mjs aurora
globalThis.location={search:"?track="+(process.argv[2]??"aurora")};
const previous=await import("../tracks/trials/trial-v0164.mjs");
const fixed=await import("../tracks/trials/trial-v0165.mjs");
const stages=[0,0,0,3,6,8,8,8,8,8];
const positions=[120,470,510,1300,4700,6600,8149,9300,9852,10125];
function sample(trial,s,stage,grip,side=0){
 const st=trial.newFlightState(),limit=trial.guardrailLateralLimit(s);
 const lateral=side*(limit+1.2),p=trial.positionAt(s,lateral);
 const speed=trial.speedAt(s,stage);
 Object.assign(st,{s,lateral,worldX:p.x,worldZ:p.z,
  heading:trial.headingAt(s)+side*.12,currentSpeed:speed,
  zoneCruiseSpeed:speed,zoneSpeedStage:stage,
  lap:Math.min(3,Math.floor(s/3400)+1),grounded:true});
 let maxTurn=0,contactTicks=0;
 for(let i=0;i<20;i++){
  const control={steer:side===0?1:side,grip};
  trial.stepFlight(st,1/120,control);
  maxTurn=Math.max(maxTurn,Math.abs(st.yawRate));
  if(st.railContacting)contactTicks++;
 }
 return {
  startS:s,endS:st.s,stage,grip,side,contactTicks,
  yawRate:st.yawRate,maxTurn,
  headingDelta:st.heading-trial.headingAt(s),
  gripIntensity:st.gripIntensity,gripActive:st.gripActive,
  gripPreArmTicks:st.gripPreArmTicks??0,
  gripYawSuppressedTicks:st.gripYawSuppressedTicks??0,
  railContacts:st.railContacts,grounded:st.grounded
 };
}
const pairs=positions.map((s,i)=>({s,
 previous:sample(previous,s,stages[i],true),
 fixed:sample(fixed,s,stages[i],true)}));
const impacts=[-1,1].map(side=>({
 side,previous:sample(previous,9852,8,true,side),
 fixed:sample(fixed,9852,8,true,side)
}));
const skylineJump=[445,500,520,572,620].map(s=>({
 s,previous:sample(previous,s,0,true),
 fixed:sample(fixed,s,0,true)
}));
console.log(JSON.stringify({track:fixed.TRIAL.id,pairs,impacts,skylineJump,
 gapCount:fixed.GAPS.length,courseLastSegment:fixed.COURSE_SEGMENTS.at(-1).id,
 projection:fixed.PROJECTION_083}));
