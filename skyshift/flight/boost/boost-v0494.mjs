// SKYSHIFT 0.4.9.4 — single-use boost pads on the extended 1530m circuit.
// Renderer-neutral boost state: never changes yaw authority, steering or road geometry.
export const BOOST_CONFIG=Object.freeze({
 multiplier:1.40,
 durationSeconds:.92,
 attackSeconds:.15,
 releaseSeconds:.23,
 padHalfWidthMeters:4.6,
 colorHex:0xffbe62
});
export const BOOST_PADS=Object.freeze([
 Object.freeze({id:"launch-surge",start:22,end:40,lateralMin:-4.6,lateralMax:4.6}),
 Object.freeze({id:"horizon-surge",start:536,end:558,lateralMin:-4.6,lateralMax:4.6}),
 Object.freeze({id:"vista-surge",start:815,end:837,lateralMin:-4.6,lateralMax:4.6}),
 Object.freeze({id:"midpoint-surge",start:1080,end:1102,lateralMin:-4.6,lateralMax:4.6}),
 Object.freeze({id:"finish-surge",start:1488,end:1508,lateralMin:-4.6,lateralMax:4.6})
]);
export const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export function boostPadAt(s,lateral){
 for(const pad of BOOST_PADS){
  if(s>=pad.start&&s<pad.end&&lateral>=pad.lateralMin&&lateral<=pad.lateralMax)
   return pad;
 }
 return null;
}
export function initBoostState(state,baseSpeed=44){
 state.boostMultiplier=1;
 state.boostTimer=0;
 state.boostActivatedIds=[];
 state.boostActivations=0;
 state.boostActiveSeconds=0;
 state.boostDistanceMeters=0;
 state.peakBoostMultiplier=1;
 state.currentSpeed=baseSpeed;
 state.peakSpeed=baseSpeed;
 state.lastBoostId=null;
 return state;
}
export function boostedSpeedAt(state,baseSpeed){
 return baseSpeed*clamp(state.boostMultiplier??1,1,BOOST_CONFIG.multiplier);
}
// Called once per authoritative 120Hz physics tick, before world displacement.
// The burst triggers only on first physical contact per pad, not in visual FX.
export function stepBoostState(state,dt,baseSpeed,grounded=true){
 if(dt<=0||!Number.isFinite(dt))return null;
 let activated=null;
 const pad=grounded?boostPadAt(state.s,state.lateral):null;
 if(pad&&!state.boostActivatedIds.includes(pad.id)){
  state.boostActivatedIds.push(pad.id);
  state.boostActivations++;
  state.boostTimer=Math.max(state.boostTimer,BOOST_CONFIG.durationSeconds);
  state.lastBoostId=pad.id;
  activated=pad;
 }
 state.boostTimer=Math.max(0,state.boostTimer-dt);
 const active=state.boostTimer>0;
 const target=active?BOOST_CONFIG.multiplier:1;
 const tau=active?BOOST_CONFIG.attackSeconds:BOOST_CONFIG.releaseSeconds;
 const blend=1-Math.exp(-dt/tau);
 state.boostMultiplier=clamp(state.boostMultiplier+
  (target-state.boostMultiplier)*blend,1,BOOST_CONFIG.multiplier);
 state.currentSpeed=boostedSpeedAt(state,baseSpeed);
 state.peakSpeed=Math.max(state.peakSpeed,state.currentSpeed);
 state.peakBoostMultiplier=Math.max(state.peakBoostMultiplier,state.boostMultiplier);
 if(state.boostMultiplier>1.02){
  state.boostActiveSeconds+=dt;
  state.boostDistanceMeters+=state.currentSpeed*dt;
 }
 return activated;
}
