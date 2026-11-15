// SKYSHIFT 0.9.1 — Signature Flight Motion.
// Cosmetic hull + twin-engine response layered over the 0.9.0.1 GRIP-first
// pilot physics and the 0.9.0 Kinetic Camera. No steering, collision,
// longitudinal movement, camera rigs, geometry or shaders are modified here.
// Critically damped, allocation-free presentation updates; no extra draw calls.
export const SIGNATURE_FLIGHT=Object.freeze({
 version:"signature-flight-motion-091",
 referenceSpeed:44,highSpeed:44*1.11**8,
 normalExtraBankDegrees:2.7,gripExtraBankDegrees:7.2,
 maxExtraRollRadians:.16,maxExtraPitchRadians:.065,
 maxExtraLiftMeters:.11,maxEngineSplit:.82,
 extraDrawCalls:0,extraLights:0,extraParticles:0,physicsChanged:false
});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const finite=(x,f=0)=>Number.isFinite(x)?x:f;
const RAD=Math.PI/180;
// Exact analytic solution of a critically damped second-order system:
// identical end state at 30/60/120Hz for a constant signal.
function spring(st,key,velocityKey,target,omega,dt){
 const dx=st[key]-target,v=st[velocityKey],w=Math.max(.01,omega);
 const slope=v+w*dx,decay=Math.exp(-w*dt);
 st[key]=target+(dx+slope*dt)*decay;
 st[velocityKey]=(v-w*slope*dt)*decay;
}
export function createSignatureFlightState(){
 return {roll:0,rollVelocity:0,pitch:0,pitchVelocity:0,
  lift:0,liftVelocity:0,engineEnergy:0,engineEnergyVelocity:0,
  engineSplit:0,engineSplitVelocity:0,boostSurge:0,
  launches:0,landings:0,boosts:0,updates:0,
  peakRollDegrees:0,peakPitchDegrees:0,peakLiftMeters:0,
  peakEngineEnergy:0,peakEngineSplit:0,protectedFrames:0};
}
export function triggerSignatureJump(st){
 st.launches++;
 // Brief visual nose-up on launch, no impulse to the physical vehicle.
 st.pitchVelocity-=.10;
}
export function triggerSignatureLanding(st,impact){
 st.landings++;
 const hit=clamp(finite(impact),0,25);
 // Nose dips and suspension compresses without teleporting the hull.
 st.pitchVelocity+=clamp(hit*.016,0,.30);
 st.liftVelocity-=clamp(hit*.027,0,.50);
}
export function triggerSignatureBoost(st){
 st.boosts++;st.boostSurge=1;
}
export function stepSignatureFlight(st,dt,view={},config=SIGNATURE_FLIGHT){
 const h=clamp(finite(dt),0,.08);
 if(h<=0)return st; // Pause freezes the entire visual state.
 const steer=clamp(finite(view.steering),-1,1);
 const yaw=clamp(finite(view.yawRate)/1.24,-1,1);
 const grip=clamp(finite(view.gripIntensity),0,1);
 const speed=clamp((finite(view.speed,config.referenceSpeed)-
  config.referenceSpeed)/(config.highSpeed-config.referenceSpeed),0,1);
 const boost=clamp((finite(view.boostMultiplier,1)-1)/.40,0,1);
 const airborne=view.grounded===false;
 const protectedWeight=view.corkscrew?.035:view.wall?.20:1;
 if(protectedWeight<1)st.protectedFrames++;
 const rollDrive=clamp(steer*.67+yaw*.33,-1,1);
 // GRIP produces an unmistakable extra power-carve beyond ordinary steering.
 // Entire extra roll fades out during complete air tricks and 360° corkscrew.
 const bankDegrees=(config.normalExtraBankDegrees+
  config.gripExtraBankDegrees*grip)*(.80+.20*speed);
 const rollTarget=-rollDrive*bankDegrees*RAD*protectedWeight*
  (airborne&&view.trickActive?0:1);
 spring(st,"roll","rollVelocity",rollTarget,
  Math.abs(rollTarget)>Math.abs(st.roll)?17:11,h);
 st.roll=clamp(st.roll,-config.maxExtraRollRadians,config.maxExtraRollRadians);
 const pitchTarget=clamp(
  (airborne?clamp(finite(view.verticalSpeed)/29,-1,1)*.030:0)-
  grip*Math.abs(steer)*.017-boost*.018,
  -config.maxExtraPitchRadians,config.maxExtraPitchRadians);
 spring(st,"pitch","pitchVelocity",pitchTarget,12,h);
 st.pitch=clamp(st.pitch,-config.maxExtraPitchRadians,config.maxExtraPitchRadians);
 const liftTarget=clamp((airborne?.012:0)-
  grip*Math.abs(steer)*.038-boost*.012,
  -config.maxExtraLiftMeters,config.maxExtraLiftMeters);
 spring(st,"lift","liftVelocity",liftTarget,16,h);
 st.lift=clamp(st.lift,-config.maxExtraLiftMeters,config.maxExtraLiftMeters);
 const engineTarget=clamp(.15+.20*speed+.28*grip*Math.abs(steer)+
  .26*boost+.22*st.boostSurge,0,1);
 spring(st,"engineEnergy","engineEnergyVelocity",engineTarget,16,h);
 st.engineEnergy=clamp(st.engineEnergy,0,1);
 const splitTarget=clamp(steer*(.15+.67*grip)*(airborne?.5:1),
  -config.maxEngineSplit,config.maxEngineSplit);
 spring(st,"engineSplit","engineSplitVelocity",splitTarget,18,h);
 st.engineSplit=clamp(st.engineSplit,-config.maxEngineSplit,
  config.maxEngineSplit);
 st.boostSurge*=Math.exp(-5.8*h);
 st.peakRollDegrees=Math.max(st.peakRollDegrees,Math.abs(st.roll)/RAD);
 st.peakPitchDegrees=Math.max(st.peakPitchDegrees,Math.abs(st.pitch)/RAD);
 st.peakLiftMeters=Math.max(st.peakLiftMeters,Math.abs(st.lift));
 st.peakEngineEnergy=Math.max(st.peakEngineEnergy,st.engineEnergy);
 st.peakEngineSplit=Math.max(st.peakEngineSplit,Math.abs(st.engineSplit));
 st.updates++;
 return st;
}
export function signatureFlightAudit(st){
 return {version:SIGNATURE_FLIGHT.version,
  peakAdditionalHullBankDegrees:+st.peakRollDegrees.toFixed(2),
  peakAdditionalHullPitchDegrees:+st.peakPitchDegrees.toFixed(2),
  peakCosmeticSuspensionMeters:+st.peakLiftMeters.toFixed(3),
  peakEngineEnergy:+st.peakEngineEnergy.toFixed(3),
  peakTwinEngineSplit:+st.peakEngineSplit.toFixed(3),
  jumpImpulses:st.launches,landingImpulses:st.landings,
  boostIgnitions:st.boosts,protectedTrackFrames:st.protectedFrames,
  presentationUpdates:st.updates,
  extraDrawCalls:SIGNATURE_FLIGHT.extraDrawCalls,
  extraLights:SIGNATURE_FLIGHT.extraLights,
  extraParticles:SIGNATURE_FLIGHT.extraParticles,
  pilotPhysicsUnchanged:true,cameraRigUnchanged:true};
}
