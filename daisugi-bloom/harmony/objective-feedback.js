/* Japanese Harmony · Objective & Reward Feedback 2.0
 * Read-only presentation of actual game snapshots/events.
 * No scoring, RNG, star thresholds, cards, saves or move rules are altered.
 */
(function(root){
"use strict";
const nonnegative=n=>Number.isFinite(n)?Math.max(0,Math.trunc(n)):0;
const total=arr=>Array.isArray(arr)?arr.reduce((sum,x)=>sum+nonnegative(x),0):0;
function detail(game){
 const type=game?.config?.goal?.type;
 const target=nonnegative(typeof game?.target==="function"?game.target():game?.config?.goal?.count);
 const done=nonnegative(typeof game?.progress==="function"?game.progress():0);
 const left=Math.max(0,target-done);
 switch(type){
  case "daruma":{
   const eyes=total(game?.daruma?.map(x=>x===2?2:x===1?1:0));
   return left===0?"All Daruma completed":left+" Daruma left · "+eyes+" eyes to fill";
  }
  case "sealedStone":{
   const hits=total(game?.sealed);
   return left===0?"All seals broken":left+" seals left · "+hits+" hits remaining";
  }
  case "mist":return left===0?"All Mist cleared":left+" Mist tiles remaining";
  case "familyFusion":return left===0?"Lantern fusion goal complete":left+" Lantern fusions remaining";
  case "familyMasterpiece":return left===0?"Lantern masterpiece goal complete":left+" Lantern masterpieces remaining";
  case "pulseHits":return left===0?"Harmony Pulse goal complete":left+" Harmony upgrades remaining";
  case "fourTurns":return left===0?"Four-match goal complete":left+" separate four-match moves remaining";
  default:return left===0?"Goal completed":left+" more to reach your goal";
 }
}
function hitLabel(event){
 const hit=Array.isArray(event?.hits)?event.hits[0]:null;
 if(!hit)return null;
 if(event.type==="daruma"){
  const filled=nonnegative(hit.filled);
  return {at:hit.at,kind:"daruma",label:filled>=2?"COMPLETE":filled+"/2 EYES"};
 }
 if(event.type==="sealed-hit"){
  const remaining=nonnegative(hit.remaining);
  return {at:hit.at,kind:"stone",label:remaining===0?"BROKEN":(4-Math.min(4,remaining))+"/4 HITS"};
 }
 return null;
}
function eventLabels(event){
 return (Array.isArray(event?.hits)?event.hits:[]).map(hit=>
  hitLabel({...event,hits:[hit]})).filter(x=>x&&Number.isInteger(x.at)&&x.at>=0&&x.at<49);
}
function summary(events,game){
 if(!Array.isArray(events)||!events.length||!game)return null;
 if(events.some(e=>e.type==="goal"||e.type==="end"||e.type==="lose"))return null;
 const type=game.config?.goal?.type;
 const initial=nonnegative(events[0]?.goal);
 const final=nonnegative(typeof game.progress==="function"?game.progress():initial);
 const gained=Math.max(0,final-initial);
 const lastBlocker=[...events].reverse().find(e=>(type==="daruma"&&e.type==="daruma")||
  (type==="sealedStone"&&e.type==="sealed-hit"));
 if(lastBlocker){
  const labels=eventLabels(lastBlocker);
  if(labels.length)return (labels.length>1?labels.length+" blockers hit · ":"")+labels[0].label+
   (gained?" · "+final+"/"+nonnegative(game.target()):"");
 }
 if(!gained)return null;
 const target=nonnegative(typeof game.target==="function"?game.target():0);
 if(type==="mist")return "Mist cleared +"+gained+" · "+final+"/"+target;
 if(type==="familyFusion")return "Lantern fusions +"+gained+" · "+final+"/"+target;
 if(type==="pulseHits")return "Harmony upgrades +"+gained+" · "+final+"/"+target;
 return "Goal progress +"+gained+" · "+final+"/"+target;
}
function rewardLabel(game){
 return game?.assisted?"PRACTICE RATING · NOT A STAMP":"GOSHUINCHO STAR RATING";
}
const api=Object.freeze({detail,hitLabel,eventLabels,summary,rewardLabel});
root.HarmonyObjectiveFeedback=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
