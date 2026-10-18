// Wildpath 3.0 / Pass 1.1 — visible arcade score, distinct from future tree quality.
// Combat rewards are readable; nature progression and fusion pay more than raw flower farming.
export const SCORE_TABLE=Object.freeze({
  mossling:100,bramble:160,ember:140,guardian:550,
  seed:25,
  flower:15,bush:90,tree:300,blossom:850,
  meadow:220,thicket:390,grove:720,enchanted:1400,
  wave:450
});
export function createScoreLedger(){
  return {total:0,combo:0,bestCombo:0,lastKillAt:-999,kills:0,
    breakdown:{combat:0,nature:0,pickups:0,waves:0}};
}
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export function comboMultiplier(combo){
  return 1+Math.min(1.5,Math.max(0,combo-1)*.075);
}
export function awardScore(ledger,kind,time=0){
  const base=SCORE_TABLE[kind];
  if(!Number.isFinite(base))throw new Error('Unknown score event: '+kind);
  const combat=['mossling','bramble','ember','guardian'].includes(kind);
  if(combat){
    ledger.combo=time-ledger.lastKillAt<=2.8?Math.min(21,ledger.combo+1):1;
    ledger.bestCombo=Math.max(ledger.bestCombo,ledger.combo);
    ledger.lastKillAt=time;
    ledger.kills++;
  }
  const points=Math.round(base*(combat?comboMultiplier(ledger.combo):1));
  ledger.total+=points;
  if(combat)ledger.breakdown.combat+=points;
  else if(kind==='seed')ledger.breakdown.pickups+=points;
  else if(kind==='wave')ledger.breakdown.waves+=points;
  else ledger.breakdown.nature+=points;
  return {points,total:ledger.total,combo:ledger.combo};
}
export function currentCombo(ledger,time){
  return time-ledger.lastKillAt>2.8?0:clamp(ledger.combo,0,21);
}
export function formatScore(score){return Math.max(0,Math.round(score)).toLocaleString('en-US');}
