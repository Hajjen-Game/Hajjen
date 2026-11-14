// SKYSHIFT 0.4.9.9 — Reactive HUD & Premium Telemetry.
// Lightweight DOM-only feedback: no WebGL draw calls, physics edits,
// browser timers, or animation loops separate from the game's own RAF.
export const HUD_SPEC=Object.freeze({
 version:"reactive-hud-0499",
 boostAttack:14.0,
 boostRelease:6.5,
 zoneFade:3.4,
 hitFade:6.2,
 bankResponse:8,
 speedResponse:7,
 maxBankDegrees:24,
 lowShieldPercent:30,
 updateIntervalSeconds:1/30,
 backgroundDrawCalls:0,
 animationLayer:"CSS transforms / opacity",
 reducedMotionSupported:true
});
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const safe=(v,f=0)=>Number.isFinite(v)?v:f;
const approach=(v,target,response,dt)=>v+(target-v)*(1-Math.exp(-response*dt));
export function createHudState(){
 return {boost:0,zone:0,hit:0,bank:0,speed:0,elapsed:0,
  updateElapsed:0,boostEvents:0,zoneEvents:0,impactEvents:0,
  peakBoost:0,peakBank:0,peakHit:0,zoneStage:0,lowShield:false};
}
export function hudSignal(state,event){
 if(event==="boost"){state.boost=Math.max(state.boost,.98);state.boostEvents++;}
 else if(event==="zone"){state.zone=1;state.zoneEvents++;}
 else if(event==="hit"){state.hit=1;state.impactEvents++;}
 return state;
}
export function stepHudState(state,dt,flight={},settings=HUD_SPEC){
 const h=clamp(safe(dt),0,.08);
 if(h<=0)return state;
 const multiplier=clamp(safe(flight.boostMultiplier,1),1,1.4);
 const boostTarget=clamp((multiplier-1)/.40,0,1);
 state.boost=approach(state.boost,boostTarget,
  boostTarget>state.boost?settings.boostAttack:settings.boostRelease,h);
 state.zone*=Math.exp(-settings.zoneFade*h);
 state.hit*=Math.exp(-settings.hitFade*h);
 const bankTarget=clamp(safe(flight.bankDegrees)/
  settings.maxBankDegrees,-1,1);
 state.bank=approach(state.bank,bankTarget,settings.bankResponse,h);
 const speedTarget=clamp((safe(flight.speedRatio,1)-1)/1.6,0,1);
 state.speed=approach(state.speed,speedTarget,settings.speedResponse,h);
 state.lowShield=safe(flight.shield,100)<=settings.lowShieldPercent;
 state.zoneStage=Math.max(0,Math.floor(safe(flight.zoneStage,0)));
 state.elapsed+=h;
 state.updateElapsed+=h;
 state.peakBoost=Math.max(state.peakBoost,state.boost);
 state.peakHit=Math.max(state.peakHit,state.hit);
 state.peakBank=Math.max(state.peakBank,Math.abs(state.bank));
 return state;
}
export function hudVisualFrame(state,flight={}){
 return {
  boostStrength:+state.boost.toFixed(3),
  zoneStrength:+state.zone.toFixed(3),
  impactStrength:+state.hit.toFixed(3),
  bankAngle:+(state.bank*HUD_SPEC.maxBankDegrees).toFixed(1),
  bankNormalized:+state.bank.toFixed(3),
  speedEnergy:+state.speed.toFixed(3),
  shieldPercent:clamp(safe(flight.shield,100),0,100),
  shieldWarning:state.lowShield,
  boostActive:state.boost>.10,
  zoneShift:state.zone>.11,
  shieldHit:state.hit>.11
 };
}
export function createReactiveHud(root){
 if(!root)throw new Error("Reactive HUD requires #hud");
 const state=createHudState();
 let lastFlight={shield:100};
 const bank=root.querySelector("#hud-bank-gauge");
 const speedMeter=root.querySelector("#speed-energy-fill");
 const shieldFill=root.querySelector("#shield-fill");
 const CSS=(el,name,value)=>el?.style.setProperty(name,value);
 const classes=(frame)=>{
  root.classList.toggle("hud-boost-active",frame.boostActive);
  root.classList.toggle("hud-zone-active",frame.zoneShift);
  root.classList.toggle("hud-shield-hit",frame.shieldHit);
  root.classList.toggle("hud-shield-low",frame.shieldWarning);
 };
 function draw(flight,force=false){
  if(!force&&state.updateElapsed<HUD_SPEC.updateIntervalSeconds)return;
  state.updateElapsed=0;
  const frame=hudVisualFrame(state,flight);
  classes(frame);
  CSS(root,"--hud-boost",String(frame.boostStrength));
  CSS(root,"--hud-zone",String(frame.zoneStrength));
  CSS(root,"--hud-impact",String(frame.impactStrength));
  CSS(root,"--hud-speed",String(frame.speedEnergy));
  CSS(root,"--hud-bank",String(frame.bankNormalized));
  CSS(root,"--hud-bank-degrees",frame.bankAngle+"deg");
  if(bank)bank.setAttribute("aria-valuenow",String(Math.round(frame.bankAngle)));
  if(speedMeter)speedMeter.style.width=(frame.speedEnergy*100).toFixed(1)+"%";
  if(shieldFill)shieldFill.style.width=frame.shieldPercent.toFixed(1)+"%";
  return frame;
 }
 return {
  state,
  reset(flight={}){
   Object.assign(state,createHudState());
   lastFlight=flight;
   classes(hudVisualFrame(state,flight));
   root.classList.remove("hud-boost-active","hud-zone-active","hud-shield-hit");
   draw(flight,true);
  },
  onBoost(){hudSignal(state,"boost");draw(lastFlight,true);},
  onZone(){hudSignal(state,"zone");draw(lastFlight,true);},
  onImpact(){hudSignal(state,"hit");draw(lastFlight,true);},
  update(dt,flight={}){
   lastFlight=flight;
   stepHudState(state,dt,flight);
   return draw(flight);
  },
  stats(){
   return {version:HUD_SPEC.version,
    boostEvents:state.boostEvents,zoneEvents:state.zoneEvents,
    shieldImpactEvents:state.impactEvents,
    peakBoostVisual:+state.peakBoost.toFixed(3),
    peakBankNormalized:+state.peakBank.toFixed(3),
    peakShieldImpactVisual:+state.peakHit.toFixed(3),
    noAdditionalRenderPasses:true,
    updateRateHz:30,
    reducedMotionSupported:HUD_SPEC.reducedMotionSupported};
  }
 };
}
