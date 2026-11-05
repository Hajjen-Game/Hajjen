/* Harmony Director 6.3 — Multi-Objective Awareness.
 * Pure candidate evaluation on the actual refill board: never mutates the
 * game state, modifies goal counts, creates matches, or changes RNG.
 * Director 6.2 is preserved for old saves and for single-target levels.
 */
(function(root){
"use strict";
const D62=root.HarmonyDirector62||(typeof require==="function"?require("./director-v62.js"):null);
if(!D62)throw Error("Director 6.2 must load before Director 6.3");
const N=7,round=x=>Math.round(x*1000)/1000;
const fixed=new Set(["terrain","daruma","sealedStone","lotusSeed","hanabiCrate","moonMirror"]);
const adjacent=i=>[i-N,i+N,i%N?i-1:-1,i%N<N-1?i+1:-1].filter(x=>x>=0&&x<49);
const distance=(a,b)=>Math.abs(Math.floor(a/N)-Math.floor(b/N))+Math.abs(a%N-b%N);
function activeGoals(context){
 const parts=Array.isArray(context?.goalParts)&&context.goalParts.length?
  context.goalParts:[context?.goal||{type:"fusion",count:1,progress:0}];
 return parts.filter(p=>p&&typeof p.type==="string"&&
  Number.isFinite(p.count)&&p.count>0&&Number(p.progress||0)<p.count)
  .map(p=>({...p,remaining:Math.max(0,p.count-Number(p.progress||0))}));
}
// Heuristic opportunity, not an assertion that a move will damage a blocker,
// deliver a rocket or produce a future Masterpiece. The game remains sovereign.
function opportunities(board,context={},validSwaps,scan){
 const goals=activeGoals(context),legal=validSwaps(board),values=goals.map(()=>0);
 const distinct=goals.map(()=>new Set()),profiles=goals.map(()=>({type:null,moves:0}));
 const cargo=board.map((p,i)=>p?.family==="lotusSeed"?i:-1).filter(i=>i>=0);
 const daruma=board.map((p,i)=>p?.family==="daruma"&&context.darumaHealth?.[i]>0?i:-1).filter(i=>i>=0);
 const stones=board.map((p,i)=>p?.family==="sealedStone"&&context.sealedHealth?.[i]>0?i:-1).filter(i=>i>=0);
 const mist=Array.isArray(context.mist)?context.mist:[];
 for(const [a,b] of legal){
  [board[a],board[b]]=[board[b],board[a]];
  try{
   const groups=scan(board).filter(group=>group.includes(a)||group.includes(b));
   if(!groups.length)continue;
   for(let k=0;k<goals.length;k++){
    const part=goals[k],type=part.type;
    let best=0;
    for(const group of groups){
     const stage=Math.min(5,1+Math.max(...group.map(i=>board[i]?.stage||1)));
     const family=board[group[0]]?.family;
     const targets=[a,b].filter(i=>group.includes(i));
     let strength=0;
     switch(type){
      case "fusion":strength=1;break;
      case "familyFusion":strength=family===part.family?1:0;break;
      case "stage3":strength=stage>=3?1:stage===2?.2:0;break;
      case "stage4":strength=stage>=4?1:stage===3?.35:0;break;
      case "masterpiece":strength=stage===5?1:stage===4?.32:0;break;
      case "familyMasterpiece":
       strength=family===part.family?(stage===5?1:stage===4?.32:0):0;break;
      case "lotus":
       // Only a match BELOW actual cargo, in its own column, may open
       // a gravity route. Same-column proximity alone gets no direct credit.
       strength=cargo.some(seed=>group.some(i=>i%N===seed%N&&i>seed))?1:0;
       break;
      case "daruma":
      case "sealedStone":{
       const obstacles=type==="daruma"?daruma:stones;
       if(obstacles.some(at=>targets.some(to=>adjacent(to).includes(at))))strength=1;
       else if(stage>=4&&obstacles.some(at=>targets.some(to=>distance(to,at)<=2)))strength=.25;
       break;
      }
      case "mist":
       strength=targets.some(to=>mist[to])?1:
        stage===5&&targets.some(to=>adjacent(to).some(at=>mist[at]))?.85:0;
       break;
      case "pulseHits":
       strength=stage===5?Math.min(2,Math.max(...targets.map(to=>
        adjacent(to).filter(at=>board[at]&&!fixed.has(board[at].family)&&board[at].stage<5).length),0)):.0;
       break;
      case "four":case "fourTurns":strength=group.length>=4?1:0;break;
      case "shape":strength=group.length>=5?1:0;break;
      case "chain":strength=stage===5?.6:0;break;
      case "mirrorResonances":
       strength=targets.some(to=>adjacent(to).some(at=>board[at]?.family==="moonMirror"))?.7:0;break;
      default:strength=0;
     }
     best=Math.max(best,strength);
    }
    if(best>0){values[k]+=best;distinct[k].add(a+":"+b);}
   }
  }finally{[board[a],board[b]]=[board[b],board[a]];}
 }
 const components=goals.map((part,k)=>({
  type:part.type,family:part.family||null,remaining:part.remaining,
  opportunities:round(values[k]),routes:distinct[k].size,
  coverage:round(Math.min(1,values[k]/Math.max(1,Math.min(3,part.remaining))))
 }));
 // A saturated aggregate plus a minimum-goal term rewards breadth.
 // No benefit from "helping" goals already completed by the player.
 const minimum=components.length?Math.min(...components.map(x=>x.coverage)):0;
 const score=round(components.reduce((n,x)=>n+Math.min(3,x.opportunities)*.55,0)+minimum*3.5);
 return {components,active:goals.length,covered:components.filter(x=>x.opportunities>0).length,
  weakest:round(minimum),multiObjectiveScore:score};
}
function assess(board,goal={},context={},validSwaps,scan){
 const base=D62.assess(board,goal,context,validSwaps,scan);
 return {...base,...opportunities(board,context,validSwaps,scan)};
}
function choose(baseline,alternatives,scoreFn,context,validSwaps,scan){
 const previous=D62.choose(baseline,alternatives,scoreFn,context,validSwaps,scan);
 const original=assess(baseline.board,context.goal,context,validSwaps,scan);
 if(original.active<2)return {...previous,
  health:original,chosenHealth:assess(previous.selected.board,context.goal,context,validSwaps,scan)};
 const underPressure=original.legal<=2;
 let selected=previous.selected,choice=assess(selected.board,context.goal,context,validSwaps,scan);
 let reason=previous.reason;
 // Safety rule: a better-looking primary objective cannot erase viable
 // routes to a second unfinished goal just to create prettier refills.
 if(!underPressure&&(choice.covered<original.covered&&choice.weakest<original.weakest-.2)){
  selected=baseline;choice=original;reason="retain-multi-goal-routes";
 }
 let bestValue=choice.multiObjectiveScore+Math.min(10,choice.legal)*.18;
 const basePace=scoreFn(baseline.board);
 for(const candidate of alternatives){
  if(candidate.autoMatches!==0)continue;
  const m=assess(candidate.board,context.goal,context,validSwaps,scan);
  if(!m.legal||m.legal<Math.max(1,original.legal-(underPressure?0:1)))continue;
  if(m.mobilityRisk>original.mobilityRisk+2)continue;
  if(!underPressure&&m.covered<original.covered)continue;
  if(m.weakest<original.weakest-.13)continue;
  if(scoreFn(candidate.board)<basePace-(underPressure?6:4))continue;
  const improvedCoverage=m.covered>original.covered;
  const improvedWeakest=m.weakest>=original.weakest+.16;
  const improvement=m.multiObjectiveScore-original.multiObjectiveScore;
  if(!improvedCoverage&&!improvedWeakest&&improvement<1.5)continue;
  const value=m.multiObjectiveScore+Math.min(10,m.legal)*.18;
  if(value>bestValue+1.0){
   selected=candidate;choice=m;bestValue=value;
   reason=improvedCoverage?"multi-objective-coverage":
    improvedWeakest?"weakest-goal-mobility":"multi-objective-opportunity";
  }
 }
 return {selected,health:original,chosenHealth:choice,reason};
}
const api=Object.freeze({VERSION:1,assess,choose,opportunities,activeGoals});
root.HarmonyDirector63=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
