// SKYSHIFT 0.15.0 — safe-versus-risk lane rewards, using the original 120Hz boost solver.
// No steer assists, new colliders, or new physics integration. Pad groups prevent
// players from picking both SAFE and RISK boosts on one gate on the same lap.
export const BOOST_CONFIG=Object.freeze({
 multiplier:1.40,
 durationSeconds:.92,
 attackSeconds:.15,
 releaseSeconds:.23,
 padHalfWidthMeters:4.6,
 colorHex:0xffbe62
});
import {BOOST_CHOICES_0150,RACE_BOOST_CHOICES_0150,
 riskChoiceAt,RISK_REWARD_0150} from "../../risk-reward-v0150.mjs";
export const BOOST_PADS=BOOST_CHOICES_0150;
export const RACE_BOOST_PADS=RACE_BOOST_CHOICES_0150;
export const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export function boostPadAt(s,lateral){return riskChoiceAt(s,lateral);}
export function initBoostState(state,baseSpeed=44){
 state.boostMultiplier=1;
 state.boostTimer=0;
 state.boostActivatedIds=[];
 state.boostActivatedGroups=[];
 state.boostChoiceLog=[];
 state.boostActivations=0;
 state.safeBoosts=0;state.riskBoosts=0;
 state.lastBoostKind=null;state.lastBoostGroup=null;
 state.boostTargetMultiplier=1;
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
 if(pad&&!state.boostActivatedGroups.includes(pad.group)){
  // SAFE and RISK share a GROUP. Only the first contact wins this lap.
  state.boostActivatedGroups.push(pad.group);
  state.boostActivatedIds.push(pad.id);
  state.boostActivations++;
  if(pad.kind==="safe")state.safeBoosts++;
  if(pad.kind==="risk")state.riskBoosts++;
  // Entering another gate during a stronger burst cannot reduce it.
  state.boostTargetMultiplier=state.boostTimer>0?
   Math.max(state.boostTargetMultiplier,pad.multiplier):pad.multiplier;
  state.boostTimer=Math.max(state.boostTimer,pad.durationSeconds);
  state.lastBoostId=pad.id;
  state.lastBoostKind=pad.kind;
  state.lastBoostGroup=pad.group;
  state.boostChoiceLog.push({id:pad.id,kind:pad.kind,group:pad.group,
   atMeters:+state.s.toFixed(2),targetMultiplier:pad.multiplier});
  activated=pad;
 }
 state.boostTimer=Math.max(0,state.boostTimer-dt);
 const active=state.boostTimer>0;
 const target=active?state.boostTargetMultiplier:1;
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
