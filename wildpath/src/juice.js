// Wildpath 0.8 — deterministic, frame-rate independent juice helpers.
// Keep gameplay scoring exact; only the displayed score is animated.
export function displayedScoreStep(current,actual,dt){
  if(!Number.isFinite(current)||!Number.isFinite(actual))return actual;
  if(actual<=current)return actual;
  const interval=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0));
  const remaining=actual-current;
  const step=Math.max(1,Math.ceil(remaining*Math.min(.9,interval*12)));
  return Math.min(actual,current+step);
}
export function cooldownFill(remaining,full){
  if(!Number.isFinite(remaining)||!Number.isFinite(full)||full<=0)return 0;
  return Math.max(0,Math.min(100,remaining/full*100));
}
export function justRecharged(previous,current){
  return previous>0 && current<=0;
}
export function shakeStrength(event,reduceMotion=false){
  if(reduceMotion)return 0;
  return {hit:.09,crit:.24,cast:.18,heavy:.40,playerHit:.27,kill:.16}[event]||0;
}
