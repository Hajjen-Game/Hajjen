/* Japanese Harmony · Journey Progression Integrity 2.0
 * Versioned proof of achievement, separate from historical score archives.
 * Preserves access, inventory and the old wallet; never invents a new stamp.
 */
(function(root){
"use strict";
const D=root.HarmonyJourneyDrafts||(typeof require==="function"?require("./journey-levels-v2.js"):null);
const A=root.HarmonyLevelArchitecture||(typeof require==="function"?require("./level-architecture.js"):null);
if(!D||!A)throw Error("Journey 2.0 recipe modules required");
const VERSION=2,COUNT=40;
const object=v=>v!==null&&typeof v==="object"&&!Array.isArray(v);
const integer=(v,max)=>Number.isSafeInteger(v)?Math.max(0,Math.min(max,v)):0;
const clampStars=v=>integer(v,3);
function canonical(index,recipe){
 try{return JSON.stringify(A.normalize(recipe,index));}catch{return null;}
}
function signature(index){
 const recipe=D.get(index);
 if(!recipe||index<0||index>=COUNT)return null;
 const payload=canonical(index,recipe);
 if(!payload)return null;
 let h=2166136261;
 for(let i=0;i<payload.length;i++)h=Math.imul(h^payload.charCodeAt(i),16777619)>>>0;
 return recipe.id+"@"+h.toString(16).padStart(8,"0");
}
function matchesRun(run){
 const i=run?.level,d=run?.data,recipe=D.get(i);
 return Number.isInteger(i)&&i>=0&&i<COUNT&&object(d)&&object(d.levelRecipe)&&
  d.levelArchitectureVersion===A.VERSION&&d.levelRecipe.id===recipe?.id&&
  canonical(i,d.levelRecipe)===canonical(i,recipe);
}
function initialize(save){
 if(!object(save))throw Error("Save required");
 const current=save.journeyProgression;
 if(object(current)&&current.version===VERSION&&object(current.stamps)&&
    Number.isInteger(current.unlocked)&&current.unlocked>=0&&current.unlocked<=COUNT)
  return {created:false,state:current};
 // Keep historical level/score archives and every existing profile field.
 if(current!==undefined&&!Object.hasOwn(save,"journeyProgressionArchive"))
  save.journeyProgressionArchive=current;
 const opened=integer(save.unlocked,COUNT);
 save.journeyProgression={version:VERSION,legacyUnlocked:opened,unlocked:opened,stamps:{}};
 return {created:true,state:save.journeyProgression};
}
function get(save,index){
 if(!Number.isInteger(index)||index<0||index>=COUNT)return null;
 const progress=save?.journeyProgression;
 if(progress?.version!==VERSION||!object(progress.stamps))return null;
 const entry=progress.stamps[index],expected=D.get(index);
 if(!object(entry)||entry.recipeId!==expected?.id||
    entry.signature!==signature(index)||clampStars(entry.stars)===0)return null;
 return entry;
}
function stars(save,index){return clampStars(get(save,index)?.stars);}
function score(save,index){return integer(get(save,index)?.score,Number.MAX_SAFE_INTEGER);}
function chain(save,index){return integer(get(save,index)?.chain,Number.MAX_SAFE_INTEGER);}
function scores(save){
 const out={};for(let i=0;i<COUNT;i++){const value=score(save,i);if(value)out[i]=value;}
 return out;
}
function totalStars(save){
 let total=0;for(let i=0;i<COUNT;i++)total+=stars(save,i);return total;
}
function unlocked(save){
 const p=save?.journeyProgression;
 return p?.version===VERSION?integer(p.unlocked,COUNT):integer(save?.unlocked,COUNT);
}
function complete(save,game){
 const index=game?.level,recipe=D.get(index);
 if(!game?.complete||!recipe||index<0||index>=COUNT||
    canonical(index,game.levelRecipe)!==canonical(index,recipe))
  return {ok:false,reason:"unverified-puzzle"};
 const state=initialize(save).state,prior=get(save,index);
 const assisted=!!game.assisted;
 const grade=assisted?1:clampStars(game.stars());
 if(!grade)return {ok:false,reason:"no-rating"};
 const entry={
  recipeId:recipe.id,signature:signature(index),
  stars:Math.max(clampStars(prior?.stars),grade),
  score:assisted?score(save,index):Math.max(score(save,index),integer(game.score,Number.MAX_SAFE_INTEGER)),
  chain:assisted?chain(save,index):Math.max(chain(save,index),integer(game.bestChain,Number.MAX_SAFE_INTEGER)),
  assistedStars:Math.max(clampStars(prior?.assistedStars),assisted?grade:0)
 };
 state.stamps[index]=entry;
 state.unlocked=Math.max(integer(state.unlocked,COUNT),Math.min(COUNT,index+1));
 return {ok:true,newStamp:!prior,stars:entry.stars,receipt:entry.signature};
}
const api=Object.freeze({VERSION,COUNT,initialize,signature,matchesRun,get,stars,score,chain,scores,totalStars,unlocked,complete});
root.HarmonyJourneyProgression=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
