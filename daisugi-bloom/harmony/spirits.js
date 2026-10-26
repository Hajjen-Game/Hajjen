/* Japanese Harmony · Omamori Spirits 2.0 — Identity & Bond
 * Cosmetic companions. Only Sakura and Daruma have Bond missions in 2.0.
 * One qualifying level per charm, no replay farming, no move/score mutations.
 */
(function(root){
"use strict";
const VERSION=1;
const TIERS=Object.freeze([1,3,6]);
const IDENTITIES=Object.freeze({
 sakura:Object.freeze({id:"sakura",symbol:"✿",name:"Sakuras välsignelse",
  mission:"Skapa minst ett mästerverk under en nivå",
  reward:["Sakuraglöd","Blomstrande ljuspuls","Gyllene körsbärsblomning"],
  title:["Frö","Blomning","Evig vår"]}),
 daruma:Object.freeze({id:"daruma",symbol:"◉",name:"Darumas löfte",
  mission:"Träffa en Daruma eller Sealed Stone under en nivå (21–40)",
  reward:["Löftesglöd","Sigill av uthållighet","Gyllene välsignelse"],
  title:["Löfte","Uthållighet","Fullbordan"]})
});
const validLevel=n=>Number.isInteger(n)&&n>=0&&n<1000000;
function initialize(save){
 if(!save||typeof save!=="object")throw new Error("Save required");
 if(!save.spirits||save.spirits.version!==VERSION){
  save.spirits={version:VERSION,bonds:{}};
 }
 const bonds=save.spirits.bonds&&typeof save.spirits.bonds==="object"&&!Array.isArray(save.spirits.bonds)
  ?save.spirits.bonds:{};
 const clean={};
 for(const id of Object.keys(IDENTITIES)){
  const levels=Array.isArray(bonds[id]?.levels)?bonds[id].levels:[];
  clean[id]={levels:[...new Set(levels.filter(validLevel))].slice(0,10000)};
 }
 save.spirits.bonds=clean;
 return save.spirits;
}
function status(save,id){
 const spirit=IDENTITIES[id]||null;
 if(!spirit)return null;
 const account=initialize(save);
 const count=account.bonds[id].levels.length;
 const tier=TIERS.filter(n=>count>=n).length;
 const next=TIERS.find(n=>count<n)??TIERS.at(-1);
 const owned=Array.isArray(save.economy?.owned)&&save.economy.owned.includes(id);
 return {id,name:spirit.name,symbol:spirit.symbol,mission:spirit.mission,
  count,tier,next,max:TIERS.at(-1),progress:Math.min(count,next),
  rewards:spirit.reward,titles:spirit.title,
  currentReward:tier?spirit.reward[tier-1]:null,
  nextReward:tier<3?spirit.reward[tier]:null,owned};
}
function qualifies(id,events){
 if(!Array.isArray(events))return false;
 if(id==="sakura")return events.some(e=>
  (e.type==="collection"&&Array.isArray(e.awards)&&e.awards.length>0)||
  (e.type==="harvest"&&Array.isArray(e.positions)&&e.positions.length>0));
 if(id==="daruma")return events.some(e=>
  (e.type==="daruma"||e.type==="sealed-hit")&&Array.isArray(e.hits)&&e.hits.length>0);
 return false;
}
function observe(save,level,events){
 if(!validLevel(level))return {ok:false,reason:"invalid-level"};
 const id=save?.economy?.equipped;
 if(!IDENTITIES[id]||!save.economy.owned?.includes(id))return {ok:false,reason:"no-active-spirit"};
 // The Daruma challenge only appears on genuine obstacle chapters.
 if(id==="daruma"&&(level<20||level>=40))return {ok:false,reason:"outside-chapter"};
 if(!qualifies(id,events))return {ok:false,reason:"not-qualified"};
 const account=initialize(save),levels=account.bonds[id].levels;
 if(levels.includes(level))return {ok:false,reason:"already-earned",status:status(save,id)};
 const before=status(save,id).tier;
 levels.push(level);
 const after=status(save,id);
 return {ok:true,id,level,tierUnlocked:after.tier>before?after.tier:0,status:after};
}
const api={VERSION,TIERS,IDENTITIES,initialize,status,qualifies,observe};
root.HarmonySpirits=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
