// Track parity probe. Every line of handling and rail physics must be shared.
// Run as a child process so URL-selected course modules initialize fresh.
globalThis.location={search:"?track="+(process.argv[2]??"aurora")};
const t=await import("../trial-v0164.mjs");
const RAD=180/Math.PI;
const st=t.newFlightState();
const snapshots=[];
for(let i=0;i<64;i++){
 const steer=i<15?.15:i<39?-.12:.21;
 const grip=i>=10&&i<44;
 const r=t.stepFlight(st,1/120,{steer,grip});
 snapshots.push([st.yawRate,st.gripIntensity,st.currentSpeed,
  st.peakYawRateDeg,st.railScrubIntensity,st.gripSpeedLossMeters]);
 if(st.railContacting)throw Error("Parity input escaped straight");
}
const collision=[];
for(const side of [-1,1]){
 const s=20,l=t.guardrailLateralLimit(s),state=t.newFlightState();
 const p=t.positionAt(s,side*(l+.3));
 Object.assign(state,{s,worldX:p.x,worldZ:p.z,lateral:side*(l+.3),
  heading:t.headingAt(s)+side*.85,yawRate:side*.64,
  currentSpeed:101.4});
 const prior=state.heading,rate=state.yawRate;
 const hit=t.constrainToGuardrail(state,1/120);
 collision.push({
  side,hit,deltaHeading:state.heading-prior,deltaYawRate:state.yawRate-rate,
  finalLateral:state.lateral,railContacts:state.railContacts,
  railCorrection:state.railHeadingCorrections
 });
}
const s=20,world=t.positionAt(s+1.6,2);
const projected=t.projectWorldToTrack(world.x,world.z,s);
console.log(JSON.stringify({
 track:t.TRIAL.id,maxYawRate:t.TRIAL.maxYawRate,
 turnResponse:t.TRIAL.turnResponse,turnRelease:t.TRIAL.turnRelease,
 steering:t.STEERING_AUTHORITY,projection:t.PROJECTION_083,
 snapshots,collision,projectedDelta:projected.s-s,
 width:t.widthAt(s),turnRadii:t.circuitPlanSummary().uniqueTurnRadii,
 closureError:t.LOOP_CLOSURE_ERROR_METERS,
 finalSection:t.COURSE_SEGMENTS.at(-1)
}));
