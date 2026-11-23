// SKYSHIFT 0.9.0.1 — GRIP-First Racing: pilot-owned speed-shaped steering envelope.
// Normal steering is intentionally a wide-arc input at EVERY speed. GRIP
// is the dedicated high-authority carving control for deliberate corrections.
// Holding GRIP + steering blends toward a *separate* carve authority.
// The source input-to-yaw response and yaw damping stay unchanged:
// this modifies turn radius, NEVER input lag, steering sign, heading target,
// vehicle position or world-space track coordinates.
export const STEERING_AUTHORITY=Object.freeze({
 version:"grip-first-carving-0901",
 referenceSpeed:44,
 fullSpeed:44*1.11**8,
 normalSlowFactor:.69,
 normalFastFactor:.40,
 fullGripFactor:1.55,
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
export function yawAuthorityAt(speed,gripIntensity=0,settings=STEERING_AUTHORITY){
 const ordinary=normalYawFactorAt(speed,settings);
 const grip=clamp(Number.isFinite(gripIntensity)?gripIntensity:0,0,1);
 return ordinary+(settings.fullGripFactor-ordinary)*grip;
}
export function steeringBalanceAt(speed,settings=STEERING_AUTHORITY){
 const normal=normalYawFactorAt(speed,settings);
 const grip=settings.fullGripFactor;
 return {normal,grip,relativeGripGain:grip/normal,
  speed:Number.isFinite(speed)?speed:settings.referenceSpeed};
}
