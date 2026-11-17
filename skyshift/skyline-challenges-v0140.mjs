// SKYSHIFT 0.14.0 — eight repeatable authored challenges and earned medals.
// No vehicle upgrades, hidden assists, remote accounts or new physics.
export const CHALLENGE_RULES_0140=Object.freeze({
 version:"skyline-challenges-medals-0140",
 storageKey:"skyshift-skyline-challenges-v0140",
 physicsRevision:"grip-bonus-half-power-01348",
 trackRevision:"skyline-fairness-0135",
 medals:Object.freeze(["none","bronze","silver","gold"]),
 pilotPhysicsUnchanged:true,sharedForMantaAndStingray:true,
 noGlobalLeaderboard:true,offlineProgress:true,ghostsNotYetSupported:true
});
export const CHALLENGES_0140=Object.freeze([
 {id:"first-sweep",number:"01",name:"FIRST SWEEP",subtitle:"Clean opening line",
  startS:5,endS:770,unlocksAt:0,type:"line",goldSeconds:20.5},
 {id:"skyline-leap",number:"02",name:"SKYLINE LEAP",subtitle:"360° and a clean landing",
  startS:430,endS:1110,unlocksAt:0,type:"landing",goldSeconds:18.8},
 {id:"precision-apex",number:"03",name:"PRECISION APEX",subtitle:"GRIP through the narrow throat",
  startS:360,endS:1320,unlocksAt:1,type:"grip",goldSeconds:25},
 {id:"s-flow",number:"04",name:"S-LINK FLOW",subtitle:"One clean precision carve",
  startS:995,endS:1920,unlocksAt:2,type:"flow",goldSeconds:24.5},
 {id:"magnetic-wall",number:"05",name:"MAGNETIC WALL",subtitle:"Exit the wall without rails",
  startS:1350,endS:2330,unlocksAt:3,type:"wall",goldSeconds:25},
 {id:"shadow-sprint",number:"06",name:"SHADOW SPRINT",subtitle:"Race the shadow tunnel clean",
  startS:1875,endS:2890,unlocksAt:4,type:"line",goldSeconds:25.5},
 {id:"corkscrew",number:"07",name:"CORKSCREW",subtitle:"Keep control through 360°",
  startS:2480,endS:3400,unlocksAt:5,type:"corkscrew",goldSeconds:23.5},
 {id:"skyline-master",number:"08",name:"SKYLINE MASTER",subtitle:"One complete lap, multiple skills",
  startS:5,endS:3400,unlocksAt:6,type:"master",goldSeconds:74}
].map(c=>Object.freeze(c)));
const rank=m=>Math.max(0,CHALLENGE_RULES_0140.medals.indexOf(m));
const safeTime=n=>Number.isFinite(n)&&n>0&&n<600?n:null;
const challengeById=id=>CHALLENGES_0140.find(c=>c.id===id)??null;
export const getChallenge=id=>challengeById(id);
export const challengeDistance=c=>c.endS-c.startS;
export function initialChallengeProgress(){
 return {version:1,ruleset:CHALLENGE_RULES_0140.physicsRevision,
  records:{}};
}
export function normalizeChallengeProgress(source){
 const clean=initialChallengeProgress();
 if(!source||source.version!==1||source.ruleset!==clean.ruleset||
   !source.records||typeof source.records!=="object"||
   Array.isArray(source.records))return clean;
 for(const c of CHALLENGES_0140){
  const r=source.records[c.id];
  if(!r||!CHALLENGE_RULES_0140.medals.includes(r.medal)||r.medal==="none")continue;
  const best=safeTime(r.bestSeconds);
  if(!best)continue;
  clean.records[c.id]={medal:r.medal,bestSeconds:best};
 }
 return clean;
}
export function readChallengeProgress(storage){
 try{const s=storage?.getItem(CHALLENGE_RULES_0140.storageKey);
  return s?normalizeChallengeProgress(JSON.parse(s)):initialChallengeProgress();
 }catch{return initialChallengeProgress();}
}
export function saveChallengeProgress(storage,progress){
 const safe=normalizeChallengeProgress(progress);
 try{storage?.setItem(CHALLENGE_RULES_0140.storageKey,
  JSON.stringify(safe));}catch{/* Private mode must never block play */}
 return safe;
}
export function medalsEarned(progress){
 const p=normalizeChallengeProgress(progress);
 return CHALLENGES_0140.reduce((n,c)=>n+(rank(p.records[c.id]?.medal)>=1?1:0),0);
}
export function challengeUnlocked(progress,id){
 const c=challengeById(id);
 return !!c&&medalsEarned(progress)>=c.unlocksAt;
}
export function challengeSummary(progress){
 const p=normalizeChallengeProgress(progress);
 return {total:CHALLENGES_0140.length,bronzeOrBetter:medalsEarned(p),
  silverOrBetter:CHALLENGES_0140.filter(c=>rank(p.records[c.id]?.medal)>=2).length,
  gold:CHALLENGES_0140.filter(c=>p.records[c.id]?.medal==="gold").length,
  available:CHALLENGES_0140.filter(c=>challengeUnlocked(p,c.id)).length};
}
// All metrics are read-only snapshots from the *actual* 120Hz flight state.
// A bronze is earned for reaching the designated end. For silver, a clean
// route and challenge-specific action are required. Gold additionally needs
// a truly zero-contact run and a time threshold.
export function evaluateChallenge(c,metrics){
 if(!c||!metrics||!metrics.reachedExit||!safeTime(metrics.elapsed))
  return {medal:"none",skillMet:false,reason:"unfinished"};
 const m=metrics;
 let skill=false;
 switch(c.type){
  case "line":skill=true;break;
  case "landing":skill=(m.qualifiedLandings??0)>=1;break;
  case "grip":skill=(m.gripSeconds??0)>=.4;break;
  case "flow":skill=(m.cleanCarves??0)>=1;break;
  case "wall":skill=(m.cleanWallExits??0)>=1;break;
  case "corkscrew":skill=(m.cleanCorkscrewExits??0)>=1;break;
  case "master":skill=[
    (m.qualifiedLandings??0)>=1,(m.cleanCarves??0)>=1,
    (m.cleanWallExits??0)>=1,(m.cleanCorkscrewExits??0)>=1
   ].filter(Boolean).length>=2;break;
 }
 const silver=skill&&(m.falls??0)===0&&(m.railContacts??0)<=2;
 const masterGold=c.type!=="master"||[
  (m.qualifiedLandings??0)>=1,(m.cleanCarves??0)>=1,
  (m.cleanWallExits??0)>=1,(m.cleanCorkscrewExits??0)>=1
 ].filter(Boolean).length===4;
 const gold=silver&&masterGold&&(m.railContacts??0)===0&&
  m.elapsed<=c.goldSeconds;
 return {medal:gold?"gold":silver?"silver":"bronze",skillMet:skill,
  reason:gold?"time-and-perfect-line":silver?"clean-skill":"finished",
  elapsed:+m.elapsed.toFixed(3),railContacts:m.railContacts??0};
}
export function recordChallenge(progress,id,grading){
 const c=challengeById(id),previous=normalizeChallengeProgress(progress);
 if(!c||!challengeUnlocked(previous,id)||!grading||
  rank(grading.medal)<1||!safeTime(grading.elapsed))
  return {progress:previous,improved:false,newlyUnlocked:[]};
 const had=CHALLENGES_0140.filter(q=>challengeUnlocked(previous,q.id))
  .map(q=>q.id);
 const before=previous.records[id];
 const updated={version:1,ruleset:previous.ruleset,
  records:{...previous.records,
   [id]:{medal:rank(grading.medal)>rank(before?.medal)?
    grading.medal:before?.medal??grading.medal,
    bestSeconds:Math.min(before?.bestSeconds??Infinity,grading.elapsed)}}};
 const after=normalizeChallengeProgress(updated);
 const newlyUnlocked=CHALLENGES_0140.filter(q=>
  challengeUnlocked(after,q.id)&&!had.includes(q.id)).map(q=>q.id);
 return {progress:after,improved:!before||
  rank(after.records[id].medal)>rank(before.medal)||
  after.records[id].bestSeconds<before.bestSeconds-.0005,
  newlyUnlocked};
}
export function captureChallengeMetrics(c,flight,racing){
 return {reachedExit:flight.s>=c.endS-.001&&!flight.failed,
  elapsed:flight.elapsed,railContacts:flight.railContacts,
  falls:flight.falls,gripSeconds:flight.gripActiveSeconds,
  qualifiedLandings:flight.trickQualifiedLandings,
  cleanWallExits:flight.magneticCleanExits,
  cleanCorkscrewExits:flight.corkscrewCleanExits,
  cleanCarves:racing?.cleanCarves??0};
}
