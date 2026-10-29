/* Japanese Harmony · Omamori 6.0 — simple consumable inventory.
 * Each purchase is one card; several copies allowed. No equipping or mastery.
 * Older owned tiered cards and keepsakes are converted once, without spending
 * coins or touching stars/records. Economy.owned is only discovery history.
 */
(function(root){
"use strict";
const VERSION=2,MAX_STACK=99;
const LEGACY={kiri:"sealbreaker",daruma:"twinSealbreaker",akari:"grandBloom"};
const validLevel=n=>Number.isInteger(n)&&n>=0&&n<1000000;
const catalog=()=>root.HarmonyEconomy.CATALOG;
const validId=id=>catalog().some(c=>c.id===id);
const activeIds=["sakura","grandBloom","koi","deepCurrent","sealbreaker","twinSealbreaker","tsuki","moonGrace"];
const keepsakeIds=[];
function mapOld(id,entry){
 if(LEGACY[id])return LEGACY[id];
 const tier=Number.isInteger(entry?.tier)?entry.tier:1;
 if(id==="sakura")return tier>=2?"grandBloom":"sakura";
 if(id==="koi")return tier>=2?"deepCurrent":"koi";
 if(id==="tsuki")return tier>=3?"moonGrace":"tsuki";
 return validId(id)?id:null;
}
function initialize(save){
 if(!save||typeof save!=="object")throw Error("Save required");
 const previous=save.omamoriCards,legacyOwned=Array.isArray(save.economy?.owned)?save.economy.owned:[];
 if(!previous||previous.version!==VERSION){
  const counts={};
  const old=previous?.cards&&typeof previous.cards==="object"&&!Array.isArray(previous.cards)?
   previous.cards:{};
  const migratedIds=previous?.version===1?Object.keys(old):legacyOwned;
  for(const id of migratedIds){
   const entry=old[id];
   // Malformed entries are not revived into free cards.
   if(Object.hasOwn(old,id)&&(!entry||typeof entry!=="object"||Array.isArray(entry)))continue;
   const target=mapOld(id,entry);
   if(target)counts[target]=(counts[target]||0)+1;
  }
  const oldDiscover=Array.isArray(previous?.discovered)?previous.discovered:legacyOwned;
  const discovered=[...new Set([...oldDiscover,...legacyOwned]
    .map(id=>LEGACY[id]||id).filter(validId))];
  const replay=previous?.replay&&typeof previous.replay==="object"&&!Array.isArray(previous.replay)?
   {...previous.replay}:{day:"",claims:0};
  save.omamoriCards={version:VERSION,counts,discovered,replay};
  // Retired companion/equipment state must never generate future power.
  if(save.economy)save.economy.equipped=null;
 }
 const state=save.omamoriCards;
 if(!state.counts||typeof state.counts!=="object"||Array.isArray(state.counts))state.counts={};
 for(const id of Object.keys(state.counts)){
  const count=state.counts[id];
  if(!validId(id)||!Number.isSafeInteger(count)||count<=0){delete state.counts[id];continue;}
  state.counts[id]=Math.min(MAX_STACK,count);
 }
 if(!Array.isArray(state.discovered))state.discovered=[];
 state.discovered=[...new Set(state.discovered.filter(validId))];
 if(!state.replay||typeof state.replay!=="object"||Array.isArray(state.replay))state.replay={day:"",claims:0};
 if(typeof state.replay.day!=="string"||!/^\d{4}-\d\d-\d\d$/.test(state.replay.day))state.replay.day="";
 if(!Number.isInteger(state.replay.claims)||state.replay.claims<0)state.replay.claims=5;
 else state.replay.claims=Math.min(5,state.replay.claims);
 return state;
}
function count(save,id){return validId(id)?initialize(save).counts[id]||0:0;}
function has(save,id){return count(save,id)>0;}
function status(save,id){
 if(!validId(id))return null;
 const state=initialize(save),owned=count(save,id);
 return {id,owned:owned>0,quantity:owned,discovered:state.discovered.includes(id),
  tier:1,count:owned,kind:"power",permanent:false,consumable:true,active:true};
}
function total(save){return Object.values(initialize(save).counts).reduce((a,b)=>a+b,0);}
function buy(save,id){
 const item=catalog().find(c=>c.id===id);
 if(!item)return {ok:false,reason:"unknown"};
 const state=initialize(save),current=state.counts[id]||0;
 if(current>=MAX_STACK)return {ok:false,reason:"inventory-full"};
 const {account:e}=root.HarmonyEconomy.initialize(save);
 if(e.coins<item.price)return {ok:false,reason:"coins"};
 e.coins-=item.price;state.counts[id]=current+1;
 if(!state.discovered.includes(id))state.discovered.push(id);
 if(!e.owned.includes(id))e.owned.push(id);
 return {ok:true,id,price:item.price,balance:e.coins,quantity:current+1};
}
function consume(save,id){
 const state=initialize(save),n=state.counts[id]||0;
 if(!n)return {ok:false,reason:"no-card"};
 if(n===1)delete state.counts[id];else state.counts[id]=n-1;
 return {ok:true,id,quantity:n-1};
}
// No missions or equip bonuses in v6. Older APIs are harmless compatibility
// shims for old snapshots or tools that read those names.
function equip(){return {ok:false,reason:"no-equipment-in-v6"};}
function observe(){return {ok:false,reason:"no-mastery-in-v6"};}
function replayCoins(save,level,won,assisted,day){
 if(!won||!validLevel(level))return 0;
 const state=initialize(save),date=/^\d{4}-\d\d-\d\d$/.test(day||"")?day:"";
 if(!date)return 0;
 const r=state.replay;
 if(date!==r.day){r.day=date;r.claims=0;}
 if(r.claims>=5)return 0;
 r.claims++;const {account:e}=root.HarmonyEconomy.initialize(save);
 const gained=Math.min(4,10000000-e.coins);e.coins+=gained;return gained;
}
const api={VERSION,MAX_STACK,activeIds,keepsakeIds,initialize,count,has,status,total,buy,consume,equip,observe,replayCoins};
root.HarmonyCards=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
