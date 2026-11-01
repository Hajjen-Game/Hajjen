/* Harmony Director 6.2 — proactive mobility and objective momentum.
 * Read-only outlook, no RNG, extra moves, free matches or scripted victories.
 * Does not alter legacy 6.1 sessions or their refill decisions.
 */
(function(root){
"use strict";
const D61=root.HarmonyDirector61||(typeof require==="function"?require("./director-v61.js"):null);
if(!D61)throw Error("Director 6.1 must load before Director 6.2");
const round=x=>Math.round(x*1000)/1000;
function outlook(board,validSwaps,scan){
 const swaps=validSwaps(board),sample=swaps.slice(0,24);
 let independentRoutes=0,minContinuations=Infinity,total=0;
 for(let k=0;k<sample.length;k++){
  const [a,b]=sample[k],affected=new Set([a%7,b%7]);
  [board[a],board[b]]=[board[b],board[a]];
  try{
   for(const group of scan(board))if(group.includes(a)||group.includes(b))
    for(const at of group)affected.add(at%7);
  }finally{[board[a],board[b]]=[board[b],board[a]];}
  let count=0;
  for(let j=0;j<swaps.length;j++){
   if(j===k)continue;
   if(!affected.has(swaps[j][0]%7)&&!affected.has(swaps[j][1]%7))count++;
  }
  if(count>0)independentRoutes++;
  minContinuations=Math.min(minContinuations,count);total+=count;
 }
 const n=swaps.length;
 const risk=n===0?100:n===1?78:n===2?53:n===3?34:n===4?24:n<=6?15:n<=8?8:2;
 const isolation=n<=8&&independentRoutes===0?12:n<=6&&independentRoutes<=1?6:0;
 return {mobilityRisk:risk+isolation,independentRoutes,
  minContinuations:Number.isFinite(minContinuations)?minContinuations:0,
  avgContinuations:sample.length?round(total/sample.length):0,
  forecastedMoves:sample.length};
}
function assess(board,goal={},context={},validSwaps,scan){
 const base=D61.assess(board,goal,context,validSwaps,scan);
 const structure=outlook(board,validSwaps,scan);
 const drought=Math.min(12,Math.max(0,Number(context.objectiveDrought)||0));
 const reach=Math.min(10,base.objectiveReachability);
 const direct=Math.min(6,base.goalActions);
 // Increase preference for real stage-growth and collection routes only
 // after a prolonged drought. Proximity is NOT a promise of future matches.
 const momentum=round(direct*1.5+reach*.6+
  (drought>=5?Math.min(6,drought-4)*.38*reach:0));
 return {...base,...structure,objectiveMomentum:momentum,
  deadlockWarning:base.legal<=4||(base.legal<=8&&structure.independentRoutes===0)};
}
function choose(baseline,alternatives,scoreFn,context,validSwaps,scan){
 const original=assess(baseline.board,context.goal,context,validSwaps,scan);
 const drought=Math.min(12,Math.max(0,Number(context.objectiveDrought)||0));
 const pressure=original.deadlockWarning,originalPace=scoreFn(baseline.board);
 let selected=baseline,best=original,reason="baseline";
 const value=(m,pace)=>Math.min(10,m.legal)*2.8+
  Math.min(8,m.independentRoutes)*.85-m.mobilityRisk*.28+
  m.objectiveMomentum*(drought>=5?1.2:.75)+
  Math.min(18,m.strategic)*.2+pace*.16;
 let bestValue=value(best,originalPace);
 for(const candidate of alternatives){
  if(candidate.autoMatches!==0)continue; // Genuine normal-bag refills only.
  const h=assess(candidate.board,context.goal,context,validSwaps,scan);
  if(!h.legal)continue;
  const pace=scoreFn(candidate.board),candidateValue=value(h,pace);
  if(!original.legal){
   if(selected===baseline||h.legal>best.legal||
    (h.legal===best.legal&&candidateValue>bestValue+1)){
    selected=candidate;best=h;bestValue=candidateValue;reason="deadlock-rescue";
   }
   continue;
  }
  if(h.legal<Math.max(1,original.legal-(pressure?0:1)))continue;
  if(pressure&&h.mobilityRisk>original.mobilityRisk+2)continue;
  if(context.goal?.type==="lotus"&&h.goalActions<original.goalActions&&
   h.legal<=original.legal)continue;
  if(pace<originalPace-(pressure?6:4))continue;
  if(original.legal>2&&h.objectiveMomentum<original.objectiveMomentum-3)continue;
  const betterMobility=pressure&&
   ((h.legal>original.legal&&h.mobilityRisk<=original.mobilityRisk)||
    (h.legal===original.legal&&h.mobilityRisk<=original.mobilityRisk-6));
  const betterMomentum=h.objectiveMomentum>=original.objectiveMomentum+
   (drought>=5?1.6:3.2)&&h.mobilityRisk<=original.mobilityRisk+2;
  const betterStructure=h.independentRoutes>=original.independentRoutes+2&&
   h.legal>=original.legal&&h.mobilityRisk<=original.mobilityRisk;
  if(!betterMobility&&!betterMomentum&&!betterStructure)continue;
  if(candidateValue>bestValue+(pressure?.3:1.2)){
   selected=candidate;best=h;bestValue=candidateValue;
   reason=betterMobility?"proactive-deadlock-prevention":
    betterMomentum?"objective-momentum":"independent-routes";
  }
 }
 return {selected,health:original,chosenHealth:best,reason};
}
const api=Object.freeze({VERSION:1,assess,choose,outlook});
root.HarmonyDirector62=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
