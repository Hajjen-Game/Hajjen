/* Japanese Harmony · Omamori System Audit 5.0
 * Power cards are physical, evolving, fully consumed on activation.
 * Keepsakes are permanent, equippable collectibles with visual progression.
 * Existing tier/missions/coins and the version-1 save schema remain intact.
 * Economy.owned is discovery history; cards[] is the live inventory.
 */
(function(root){
"use strict";
const VERSION=1,THRESHOLDS=[1,3,6];
const activeIds=["sakura","koi","tsuki"];
const keepsakeIds=["kiri","daruma","akari"];
const kind=id=>catalog().find(c=>c.id===id)?.kind||null;
const descriptions={
 sakura:"Create at least one masterpiece in a level",
 kiri:"Clear at least one mist tile in a level",
 daruma:"Hit a Daruma or Sealed Stone in a level",
 akari:"Trigger Harmony Pulse during a level",
 koi:"Trigger Harmony Pulse or Harmony Echo during a level",
 tsuki:"Complete a level while equipping Moon's Serenity"
};
const validLevel=n=>Number.isInteger(n)&&n>=0&&n<1000000;
const catalog=()=>root.HarmonyEconomy.CATALOG;
const validId=id=>catalog().some(c=>c.id===id);
const original=()=>({tier:1,levels:[]});
function initialize(save){
 if(!save||typeof save!=="object")throw Error("Save required");
 if(!save.omamoriCards||save.omamoriCards.version!==VERSION){
  const legacy=Array.isArray(save.economy?.owned)?save.economy.owned:[];
  const old=save.spirits?.bonds||{};
  const cards={};
  for(const id of legacy)if(validId(id)){
   const levels=[...new Set((Array.isArray(old[id]?.levels)?old[id].levels:[]).filter(validLevel))];
   cards[id]={tier:Math.min(3,1+THRESHOLDS.slice(1).filter(n=>levels.length>=n).length),levels};
  }
  save.omamoriCards={version:VERSION,cards,discovered:[...new Set(legacy.filter(validId))],replay:{day:"",claims:0}};
  // Old v3 charges are deliberately not added as extra cards; each legacy
  // collected charm maps to one full card at its attained tier.
 }
 const state=save.omamoriCards;
 if(!state.cards||typeof state.cards!=="object")state.cards={};
 if(!Array.isArray(state.discovered))state.discovered=[];
 state.discovered=[...new Set(state.discovered.filter(validId))];
 for(const id of Object.keys(state.cards)){
  if(!validId(id)){delete state.cards[id];continue;}
  const entry=state.cards[id];if(!entry||typeof entry!=="object"){delete state.cards[id];continue;}
  entry.tier=Math.max(1,Math.min(3,Number.isInteger(entry.tier)?entry.tier:1));
  entry.levels=[...new Set((Array.isArray(entry.levels)?entry.levels:[]).filter(validLevel))];
 }
 if(!state.replay||typeof state.replay!=="object"||Array.isArray(state.replay))
  state.replay={day:"",claims:0};
 // An invalid counter must never turn the five-replays-per-day limit into
 // an unlimited source of coins (NaN, strings and negative values included).
 if(typeof state.replay.day!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(state.replay.day))
  state.replay.day="";
 if(!Number.isInteger(state.replay.claims)||state.replay.claims<0)
  state.replay.claims=5;
 else state.replay.claims=Math.min(5,state.replay.claims);
 return state;
}
function has(save,id){return validId(id)&&!!initialize(save).cards[id];}
function status(save,id){
 if(!validId(id))return null;
 const state=initialize(save),entry=state.cards[id],count=entry?.levels.length||0;
 const next=entry&&entry.tier<3?THRESHOLDS[entry.tier]:null;
 const type=kind(id);
 return {id,owned:!!entry,discovered:state.discovered.includes(id),tier:entry?.tier||0,
  count,next,mission:descriptions[id],active:type==="power",
  kind:type,permanent:type==="keepsake",consumable:type==="power"};
}
function buy(save,id){
 const item=catalog().find(c=>c.id===id);
 if(!item)return {ok:false,reason:"unknown"};
 const state=initialize(save);
 if(state.cards[id])return {ok:false,reason:"already-owned"};
 const {account:economy}=root.HarmonyEconomy.initialize(save);
 if(economy.coins<item.price)return {ok:false,reason:"coins"};
 economy.coins-=item.price;state.cards[id]=original();
 if(!state.discovered.includes(id))state.discovered.push(id);
 // Historical collection index remains valid after the physical card is spent.
 if(!economy.owned.includes(id))economy.owned.push(id);
 return {ok:true,id,price:item.price,balance:economy.coins};
}
function equip(save,id){
 const {account:economy}=root.HarmonyEconomy.initialize(save);
 if(id!==null&&!has(save,id))return {ok:false,reason:"not-owned"};
 economy.equipped=id;return {ok:true,id};
}
function consume(save,id){
 // Prevent UI mistakes or future callers from deleting permanent collectibles.
 if(kind(id)==="keepsake")return {ok:false,reason:"permanent-keepsake"};
 const state=initialize(save);
 if(!state.cards[id])return {ok:false,reason:"no-card"};
 const tier=state.cards[id].tier;
 delete state.cards[id];
 if(save.economy?.equipped===id)save.economy.equipped=null;
 return {ok:true,id,tier};
}
function eligible(id,events,won){
 const e=Array.isArray(events)?events:[];
 switch(id){
  case"sakura":return e.some(x=>(x.type==="collection"&&x.awards?.length)||(x.type==="harvest"&&x.positions?.length));
  case"kiri":return e.some(x=>x.clearedMist?.length||x.type==="mist"&&x.positions?.length);
  case"daruma":return e.some(x=>(x.type==="sealed-hit"||x.type==="daruma")&&x.hits?.length);
  case"akari":return e.some(x=>x.type==="pulse"&&((x.targets?.length||0)+(x.mistTargets?.length||0)+(x.darumaTargets?.length||0)>0));
  case"koi":return e.some(x=>x.type==="pulse"||x.type==="echo");
  case"tsuki":return !!won;
 }
 return false;
}
function observe(save,level,events,won=false){
 const id=save.economy?.equipped;
 if(!validLevel(level)||!has(save,id)||!eligible(id,events,won))return {ok:false};
 const state=initialize(save),entry=state.cards[id];
 if(entry.levels.includes(level))return {ok:false,reason:"already-earned"};
 entry.levels.push(level);
 const was=entry.tier;
 while(entry.tier<3&&entry.levels.length>=THRESHOLDS[entry.tier])entry.tier++;
 return {ok:true,id,tier:entry.tier,promoted:entry.tier>was,progress:entry.levels.length};
}
// Small repeatable, bounded coin income so consumed cards never dead-end
// after all level stamps have been earned. Maximum 5 clean replays per UTC day.
function replayCoins(save,level,won,assisted,day){
 if(!won||assisted||!validLevel(level))return 0;
 const state=initialize(save);
 const date=/^\d{4}-\d\d-\d\d$/.test(day||"")?day:"";
 if(!date)return 0;
 const r=state.replay;
 if(date!==r.day){r.day=date;r.claims=0;}
 if(r.claims>=5)return 0;
 r.claims++;const {account:e}=root.HarmonyEconomy.initialize(save);
 const gained=Math.min(4,10000000-e.coins);e.coins+=gained;return gained;
}
const api={VERSION,THRESHOLDS,activeIds,keepsakeIds,kind,descriptions,initialize,has,status,buy,equip,consume,observe,replayCoins};
root.HarmonyCards=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
