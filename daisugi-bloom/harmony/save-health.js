/* Japanese Harmony · Technical Cleanup & Stability 1.0
 * Guard browser saves without modifying level rules, the economy or valid
 * historical records. Pure validation plus a narrow localStorage adapter.
 */
(function(root){
"use strict";
const B=root.HarmonyBoardMechanics||(typeof require==="function"?require("./board-mechanics.js"):null);
const L=root.HarmonyLotusStream||(typeof require==="function"?require("./lotus-stream.js"):null);
const LR=root.HarmonyLotusRouting||(typeof require==="function"?require("./lotus-routing.js"):null);
const Insight=root.HarmonyPlayerInsight||(typeof require==="function"?require("./player-insight.js"):null);
const RECORD_FIELDS=["bestStars","bestScores","bestChain","fourFamilyStars",
 "fourFamilyScores","fourFamilyChain","assistedStars","assistedScores","onboardingSeen"];
const FAMILIES=new Set(["sakura","lantern","koi","fan","bonsai","sushi",
 "maneki","origami","ryu","daruma","sealedStone","terrain","lotusSeed"]);
const record=x=>!!x&&typeof x==="object"&&!Array.isArray(x);
function validRun(run){
 if(run===null)return true;
 if(!record(run)||!Number.isInteger(run.level)||run.level<0||run.level>=1000000||
    !record(run.data))return false;
 const d=run.data;
 if(d.level!==undefined&&d.level!==run.level)return false;
 if(!Number.isFinite(d.moves)||d.moves<=0||d.moves>100000||
    !Number.isInteger(d.rolls)||d.rolls<0||d.rolls>100000||
    !Number.isInteger(d.seed)||d.seed<0||d.seed>0xffffffff||
    !Array.isArray(d.board)||d.board.length!==49)return false;
 let boardMechanics=null;
 if(d.boardMechanics!==undefined){
  try{boardMechanics=B.normalize(d.boardMechanics);}catch{return false;}
 }
 if(d.roundTrace!==undefined&&(!Insight||!Insight.valid(d.roundTrace)||
  d.roundTrace.level!==run.level+1||d.roundTrace.seed!==d.seed))return false;
 const terrain=new Set(boardMechanics?.blocked||[]);
 let lotus={starts:[],exits:[]};
 if(d.lotusPrototype!==undefined&&d.lotusPrototype!==null){
  if(d.lotusVersion!==1||run.level!==60||!LR)return false;
  let recipe;
  try{recipe=LR.get(d.lotusPrototype);}catch{return false;}
  if(!record(d.lotus)||JSON.stringify(L.normalize(d.lotus))!==JSON.stringify(recipe.lotus)||
   JSON.stringify(boardMechanics)!==JSON.stringify(recipe.boardMechanics))return false;
 }
 if(d.lotusVersion===1){
  try{lotus=L.normalize(d.lotus);}catch{return false;}
  if(d.lotusDelivered===undefined||!Number.isInteger(d.lotusDelivered)||
   d.lotusDelivered<0||d.lotusDelivered>lotus.starts.length||
   run.level!==60)return false;
 }
 if(d.lotusVersion===1){
  const seeds=d.board.filter(p=>p?.family==="lotusSeed");
  if(seeds.length+d.lotusDelivered!==lotus.starts.length||
   new Set(seeds.map(p=>p.id)).size!==seeds.length||
   seeds.some(p=>!lotus.starts.includes(-2000-p.id)))return false;
 }
 return d.board.every((p,i)=>record(p)&&FAMILIES.has(p.family)&&
  Number.isInteger(p.id)&&Number.isInteger(p.stage)&&
  (p.family==="terrain"?terrain.has(i)&&p.stage===0&&p.id===-(1000+i):
   p.family==="lotusSeed"?d.lotusVersion===1&&!terrain.has(i)&&p.stage===0&&p.id<=-2000&&
    lotus.exits.some(exit=>exit%7===i%7)&&i<42:
   !terrain.has(i)&&(p.family==="daruma"||p.family==="sealedStone"?p.stage===0:p.stage>=1&&p.stage<=5)));
}
function normalize(raw,defaults){
 // Never share default record maps with a live save. A first-run star
 // update must not leak back into defaults and survive a later full reset.
 const baseline={};
 for(const [key,value] of Object.entries(defaults)){
  baseline[key]=record(value)?{}:Array.isArray(value)?[]:value;
 }
 const save={...baseline,...(record(raw)?raw:{})};
 for(const field of RECORD_FIELDS)if(!record(save[field]))save[field]={};
 if(!Number.isInteger(save.unlocked)||save.unlocked<0||save.unlocked>=1000000)
  save.unlocked=defaults.unlocked;
 if(!validRun(save.run))save.run=null;
 if(typeof save.sound!=="boolean")save.sound=defaults.sound;
 save.reduceMotion=!!save.reduceMotion;
 return save;
}
function persist(storageProvider,key,save){
 try{storageProvider().setItem(key,JSON.stringify(save));return true;}
 catch{return false;}
}
function bootstrap(storageProvider,key,marker,defaults,playModes){
 let storage,raw=null,stored={},resetDone=false,writable=true,warning=null;
 try{
  storage=storageProvider();
  raw=storage.getItem(key);
  resetDone=storage.getItem(marker)==="done";
 }catch{
  return {save:normalize({},defaults),writable:false,warning:"storage-unavailable"};
 }
 if(raw!==null){
  try{
   stored=JSON.parse(raw);
   if(!record(stored))throw Error("Not a save object");
  }catch{
   // Never silently overwrite malformed JSON. Keep one recoverable copy;
   // if the backup cannot be written, disable writes for this session.
   try{
    const backupKey=key+"-corrupt-backup",previous=storage.getItem(backupKey);
    if(previous!==null&&previous!==raw)throw Error("Backup occupied");
    if(previous===null)storage.setItem(backupKey,raw);
    warning="corrupt-save";
   }catch{
    writable=false;warning="corrupt-unbacked";
   }
   stored={};
  }
 }
 let save;
 if(!resetDone){
  // Keep the already-shipped one-time first-20 reset contract. Only the
  // player's preferences survive, never scores, unlocks or old cards.
  save=normalize({
   sound:typeof stored.sound==="boolean"?stored.sound:defaults.sound,
   reduceMotion:!!stored.reduceMotion,
   playMode:Object.hasOwn(playModes,stored.playMode)?stored.playMode:defaults.playMode
  },defaults);
  if(writable){
   try{
    storage.setItem(key,JSON.stringify(save));
    storage.setItem(marker,"done");
   }catch{writable=false;warning="storage-unavailable";}
  }
 }else save=normalize(stored,defaults);
 return {save,writable,warning};
}
// Opt-in full progress reset, scoped to this game's save key on this device.
// Never clear the origin's unrelated localStorage (other games/sites may use it).
// The existing first-20 migration marker remains untouched; a truly new
// profile will go through current initialization and receive zero coins/cards.
function resetProgress(storageProvider,key,defaults){
 const fresh=normalize({},defaults);
 if(!persist(storageProvider,key,fresh))return {ok:false,reason:"storage-unavailable"};
 // A corrupt backup can contain the player's previous profile. Best effort
 // removal only after the new clean save is safely written.
 try{storageProvider().removeItem(key+"-corrupt-backup");}catch{}
 return {ok:true,save:fresh};
}
const api=Object.freeze({validRun,normalize,persist,bootstrap,resetProgress});
root.HarmonySaveHealth=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
