// SKYSHIFT 0.29.4 — independently persisted visual options.
export const VELOCITY_EXPERIENCE_KEY="skyshift-velocity-experience-0294";
export const BLUR_MODES=Object.freeze(["off","low","medium","high"]);
export function normalizeVelocityExperience(value={}){
 return {motionBlur:BLUR_MODES.includes(value?.motionBlur)?value.motionBlur:"high",
  adaptiveCamera:value?.adaptiveCamera!==false};
}
export function readVelocityExperience(storage){
 let value={};try{value=JSON.parse(storage?.getItem(VELOCITY_EXPERIENCE_KEY)||"{}");}catch{}
 return normalizeVelocityExperience(value);
}
export function saveVelocityExperience(storage,value){
 try{storage?.setItem(VELOCITY_EXPERIENCE_KEY,JSON.stringify(normalizeVelocityExperience(value)));}catch{}
}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const rad=Math.PI/180;
// Preserve the approved wide mobile framing. Narrower viewports get a
// bounded horizontal-FOV correction, with more of the correction at speed.
export function horizontalFov(vertical,aspect){
 return 2*Math.atan(Math.tan(vertical*rad/2)*aspect)/rad;
}
export function adaptiveVelocityFov(base,aspect,speedMultiplier=1,enabled=true){
 if(!enabled||!Number.isFinite(aspect)||aspect<=0||!Number.isFinite(base))return base;
 const reference=780/360;
 if(aspect>=reference)return base;
 const equivalent=2*Math.atan(Math.tan(base*rad/2)*reference/aspect)/rad;
 const speed=clamp((Number.isFinite(speedMultiplier)?speedMultiplier-1:0)/1.8,0,1);
 return Math.min(88.5,base+clamp(equivalent-base,0,9)*(.65+.35*speed));
}
