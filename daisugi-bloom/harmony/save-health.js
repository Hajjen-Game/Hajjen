/* Japanese Harmony · Technical Cleanup & Stability 1.0
 * Guard browser saves without modifying level rules, the economy or valid
 * historical records. Pure validation plus a narrow localStorage adapter.
 */
(function(root){
"use strict";
const RECORD_FIELDS=["bestStars","bestScores","bestChain","fourFamilyStars",
 "fourFamilyScores","fourFamilyChain","assistedStars","assistedScores","onboardingSeen"];
const FAMILIES=new Set(["sakura","lantern","koi","fan","bonsai","sushi",
 "maneki","origami","ryu","daruma","sealedStone"]);
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
 return d.board.every(p=>record(p)&&FAMILIES.has(p.family)&&
  Number.isInteger(p.id)&&Number.isInteger(p.stage)&&
  (p.family==="daruma"||p.family==="sealedStone"?p.stage===0:p.stage>=1&&p.stage<=5));
}
function normalize(raw,defaults){
 const save={...defaults,...(record(raw)?raw:{})};
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
const api=Object.freeze({validRun,normalize,persist,bootstrap});
root.HarmonySaveHealth=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
