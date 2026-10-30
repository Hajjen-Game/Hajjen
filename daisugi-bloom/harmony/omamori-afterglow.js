/* Japanese Harmony · Omamori Afterglow 1.0
 * Two valid decisions of gently improved ordinary refill opportunities
 * after a consumed Omamori. No extra moves, special tiles, guaranteed
 * matches, changed goals, modified odds, or direct score/coin bonuses.
 */
(function(root){
"use strict";
const VERSION=1,WINDOW=2;
const fresh=()=>({version:VERSION,used:false,remaining:0});
function normalize(value){
 if(!value||typeof value!=="object"||Array.isArray(value)||value.version!==VERSION)
  return fresh();
 const used=value.used===true;
 const remaining=used&&Number.isInteger(value.remaining)?
  Math.max(0,Math.min(WINDOW,value.remaining)):0;
 return {version:VERSION,used,remaining};
}
function activate(state,mode,gameOver,moves){
 const current=normalize(state);
 if(mode!=="v4"||gameOver||moves<=0||current.used)return {state:current,activated:false};
 return {state:{version:VERSION,used:true,remaining:WINDOW},activated:true};
}
// This is NOT an objective or drop-rate multiplier. Only score the
// opportunities that genuinely exist in alternative seeded refill boards.
// Even on turn one the extra influence is strictly capped at 1.6 points.
function bonus(metrics,remaining){
 if(!Number.isInteger(remaining)||remaining<1||remaining>WINDOW)return 0;
 const good=Math.max(0,Math.min(5,metrics?.goodMoves||0));
 const strong=Math.max(0,Math.min(3,metrics?.strongMoves||0));
 const prospects=Math.max(0,Math.min(4,metrics?.prospects||0));
 const intensity=remaining===2?1:.58;
 return Math.min(1.6,(good*.17+strong*.21+prospects*.095)*intensity);
}
function thresholdReduction(remaining){
 return remaining===2?.4:remaining===1?.22:0;
}
const api=Object.freeze({VERSION,WINDOW,fresh,normalize,activate,bonus,thresholdReduction});
root.HarmonyOmamoriAfterglow=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
