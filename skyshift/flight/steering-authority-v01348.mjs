// SKYSHIFT 0.13.4.8 — gameplay-first GRIP authority at 50% extra strength.
// Normal steering is intentionally a wide-arc input at EVERY speed. GRIP
// is the dedicated high-authority carving control for deliberate corrections.
// Holding GRIP + steering blends toward a *separate* carve authority.
// The source input-to-yaw response and yaw damping stay unchanged:
// this modifies turn radius, NEVER input lag, steering sign, heading target,
// vehicle position or world-space track coordinates.
export const STEERING_AUTHORITY=Object.freeze({
 version:"grip-bonus-half-power-01348",
 referenceSpeed:44,
 fullSpeed:44*1.11**8,
 normalSlowFactor:.69,
 normalFastFactor:.40,
 // Historical 1.55 reference; preserve normal authority and halve ONLY the
 // additional GRIP turn power at all speeds (NOT the entire yaw factor).
 fullGripFactor:1.55,
 gripBonusFraction:.50,
 inputResponseUnchanged:true,
 noDeadzoneChange:true,
 gripAvailableOnFirstLap:true,
 pilotOwnedSteer:true,
 noAutoSteer:true,
 noCenterlineMagnet:true
});
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export function normalYawFactorAt(speed,settings=STEERING_AUTHORITY){
 const v=Number.isFinite(speed)?speed:settings.referenceSpeed;
 const t=clamp((v-settings.referenceSpeed)/
  (settings.fullSpeed-settings.referenceSpeed),0,1);
 return settings.normalSlowFactor+
  (settings.normalFastFactor-settings.normalSlowFactor)*t;
}
// Effective full-GRIP target is halfway between ordinary and prior full GRIP.
// This retains the SAME physical effect for gripIntensity=0 and a smooth
// interpolation during the unchanged 85ms activation / 140ms release.
export function fullGripYawFactorAt(speed,settings=STEERING_AUTHORITY){
 const normal=normalYawFactorAt(speed,settings);
 return normal+(settings.fullGripFactor-normal)*settings.gripBonusFraction;
}
export function yawAuthorityAt(speed,gripIntensity=0,settings=STEERING_AUTHORITY){
 const ordinary=normalYawFactorAt(speed,settings);
 const grip=clamp(Number.isFinite(gripIntensity)?gripIntensity:0,0,1);
 return ordinary+(fullGripYawFactorAt(speed,settings)-ordinary)*grip;
}
export function steeringBalanceAt(speed,settings=STEERING_AUTHORITY){
 const normal=normalYawFactorAt(speed,settings);
 const grip=fullGripYawFactorAt(speed,settings);
 return {normal,grip,previousGrip:settings.fullGripFactor,
  gripBonusFraction:settings.gripBonusFraction,
  addedGripAuthority:grip-normal,relativeGripGain:grip/normal,
  speed:Number.isFinite(speed)?speed:settings.referenceSpeed};
}
