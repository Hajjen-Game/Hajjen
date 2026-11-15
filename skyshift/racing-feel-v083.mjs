// SKYSHIFT 0.8.3 – GRIP Apex language and nonintrusive rail feedback.
// Pure, predictable helper: UI only, never changes steering or race physics.
export const RACING_FEEL=Object.freeze({
 version:"grip-clarity-racing-feel-083",
 gripApproachStart:650,
 gripWarningEnd:995,
 railPulseSeconds:.36,
 railGlowMaximum:.92,
 noAutomaticGrip:true,
 noAutosteer:true,
 extraRenderPasses:0,
 additionalDrawCalls:0
});
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export function gripApexCue(s,grounded,gripHeld,gripActive,apex){
 const d=(s%3400+3400)%3400;
 const visible=grounded&&d>=RACING_FEEL.gripApproachStart&&
  d<RACING_FEEL.gripWarningEnd;
 const inside=visible&&d>=apex.funnelStart;
 const active=visible&&Boolean(gripActive);
 const armed=visible&&Boolean(gripHeld);
 return {
  visible,inside,active,armed,
  phase:!visible?"none":active?"gripping":armed?"armed":
   inside?"apex":"approach",
  text:!visible?"":active?"GRIP ENGAGED · HOLD RIGHT":
   armed?"STEER RIGHT · KEEP GRIP HELD":
   inside?"GRIP + STEER RIGHT":
   "RIGHT APEX AHEAD · HOLD GRIP",
  distanceMeters:visible?Math.max(0,Math.round(apex.funnelStart-d)):null
 };
}
export function createRailFeedbackState(){
 return {pulse:0,contacts:0,maxPulse:0,lastSide:0,activeSeconds:0};
}
export function startRailFeedback(state,side){
 state.pulse=1;state.contacts++;state.lastSide=Math.sign(side);
 state.maxPulse=Math.max(state.maxPulse,state.pulse);
 return state;
}
export function stepRailFeedback(state,dt,contacting){
 const h=clamp(Number.isFinite(dt)?dt:0,0,.10);
 // A bounded one-shot instrument flash; continuous collision does not
 // retrigger every 120Hz tick and cannot create a screen-covering overlay.
 state.pulse=Math.max(0,state.pulse-h/RACING_FEEL.railPulseSeconds);
 if(contacting)state.activeSeconds+=h;
 return Math.min(RACING_FEEL.railGlowMaximum,state.pulse*.92);
}
