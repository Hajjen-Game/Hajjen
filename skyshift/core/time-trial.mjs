// Shared Time Trial recording, validation, storage and audit. Track configuration is explicit.
import {ghostTimeAtDistance} from "./ghost-playback.mjs";

export function createTimeTrialAPI(config){
 const n=(v,precision)=>Math.round(v*precision)/precision;
 const fingerprint=()=>config.trackId+"|"+config.trackRevision+
  "|"+config.raceMeters+"|"+config.laps;
 const emptyRun=()=>({v:1,track:fingerprint(),mode:"time-trial",
  duration:0,laps:[],ship:"",samples:[]});
 function formatTrialTime(seconds){
  if(!Number.isFinite(seconds)||seconds<0)return "--:--.--";
  const c=Math.floor((seconds+0.000001)*100);
  return String(Math.floor(c/6000)).padStart(2,"0")+":"+
   String(Math.floor(c/100)%60).padStart(2,"0")+"."+
   String(c%100).padStart(2,"0");
 }
 function formatTrialDelta(seconds){
  if(!Number.isFinite(seconds))return "—";
  return (seconds>=0?"+":"−")+Math.abs(seconds).toFixed(2);
 }
 function createTimeTrialState(){
  return {mode:"standard",ghostEnabled:true,previousBest:null,
   active:emptyRun(),lastSampleAt:-Infinity,lastSaved:false,
   lastImproved:false,samplesWritten:0,invalidSamples:0,
   lastDelta:null,peakDeltaAhead:0,peakDeltaBehind:0,
   ghostFrames:0,ghostVisibleFrames:0,playbackEnded:false,
   storageStatus:"not-read",saveStatus:"not-started"};
 }
 function saneSample(s){
  return Array.isArray(s)&&s.length===8&&
   s.every(v=>typeof v==="number"&&Number.isFinite(v))&&
   s[0]>=0&&s[0]<=1800&&s[1]>=0&&s[1]<=config.raceMeters+4&&
   Math.abs(s[2])<100000&&Math.abs(s[3])<10000&&Math.abs(s[4])<100000&&
   Math.abs(s[5])<10000&&Math.abs(s[6])<10000&&Math.abs(s[7])<10000;
 }
 function validateGhost(raw){
  if(!raw||raw.v!==1||raw.track!==fingerprint()||
   raw.mode!=="time-trial"||!Array.isArray(raw.samples)||raw.samples.length<20||
   raw.samples.length>config.maxSamples||
   !Number.isFinite(raw.duration)||raw.duration<30||raw.duration>1800||
   !Array.isArray(raw.laps)||raw.laps.length!==config.laps||
   raw.laps.some(x=>!Number.isFinite(x)||x<=0||x>900)||
   typeof raw.ship!=="string"||raw.ship.length>32)return null;
  const samples=raw.samples;
  let lastT=-1,lastS=-1;
  for(let i=0;i<samples.length;i++){
   const x=samples[i];
   if(!saneSample(x)||x[0]<=lastT||x[1]<lastS-.001)return null;
   lastT=x[0];lastS=x[1];
  }
  if(samples[0][0]>.05||samples[0][1]>10||
     lastS<config.raceMeters-1||
     Math.abs(lastT-raw.duration)>.15||
     Math.abs(raw.laps.reduce((a,b)=>a+b,0)-raw.duration)>.35)return null;
  return raw;
 }
 const GHOST_TOGGLE_KEY="skyshift-time-trial-ghost-visible";
 function readGhostEnabled(storage){
  try{return storage?.getItem(GHOST_TOGGLE_KEY)!=="off"}catch{return true}
 }
 function saveGhostEnabled(storage,enabled){
  try{storage?.setItem(GHOST_TOGGLE_KEY,enabled?"on":"off");return !!storage}
  catch{return false}
 }
 function loadPersonalGhost(storage){
  try{
   const str=storage?.getItem(config.storageKey);
   if(!str)return null;
   if(str.length>config.maxStorageChars)return null;
   return validateGhost(JSON.parse(str));
  }catch{return null}
 }
 function savePersonalGhost(storage,run){
  if(!validateGhost(run))return false;
  try{
   const data=JSON.stringify(run);
   if(data.length>config.maxStorageChars)return false;
   storage?.setItem(config.storageKey,data);
   return !!storage;
  }catch{return false}
 }
 function clearPersonalGhost(storage){
  try{storage?.removeItem(config.storageKey);return true}
  catch{return false}
 }
 function startTimeTrial(st,{mode="standard",storage=null,ship="manta",
  ghostEnabled=true}={}){
  st.mode=mode==="time-trial"?"time-trial":"standard";
  st.ghostEnabled=!!ghostEnabled;
  st.previousBest=st.mode==="time-trial"?loadPersonalGhost(storage):null;
  st.active=emptyRun();st.active.ship=String(ship).slice(0,32);
  st.lastSampleAt=-Infinity;st.lastSaved=false;st.lastImproved=false;
  st.samplesWritten=0;st.invalidSamples=0;st.lastDelta=null;
  st.peakDeltaAhead=0;st.peakDeltaBehind=0;
  st.ghostFrames=0;st.ghostVisibleFrames=0;st.playbackEnded=false;
  st.storageStatus=st.previousBest?"personal-best-loaded":"no-local-ghost";
  st.saveStatus="recording";
  return st;
 }
 // Values recorded as 8 small numbers: t, s, x, y, z, yaw, roll, pitch.
 // In particular: x/z comes from the REAL PILOT position, never centerline.
 function captureTimeTrialSample(st,pose,{force=false}={}){
  if(st.mode!=="time-trial"||!pose)return false;
  const t=pose.elapsed,s=pose.s;
  if(!Number.isFinite(t)||!Number.isFinite(s)||
   t<0||s<0||s>config.raceMeters+4)return false;
  const prev=st.active.samples.at(-1);
  if(prev&&t<=prev[0]+.00001)return false;
  if(!force&&t-st.lastSampleAt<config.sampleIntervalSeconds-.0001)
   return false;
  if(st.active.samples.length>=config.maxSamples){
   st.invalidSamples++;return false;
  }
  if(prev&&s+0.0001<prev[1]){
   // Recovery jumps backwards or reversing checkpoints cannot be represented
   // by an unambiguous time-at-distance PB. Mark it ineligible.
   st.invalidSamples++;return false;
  }
  const row=[n(t,1000),n(s,100),n(pose.worldX,100),
   n(pose.y,100),n(pose.worldZ,100),n(pose.heading,10000),
   n(pose.roll??0,10000),n(pose.pitch??0,10000)];
  if(!saneSample(row)){st.invalidSamples++;return false}
  st.active.samples.push(row);st.lastSampleAt=t;st.samplesWritten++;
  return true;
 }
 function finishTimeTrial(st,{won=false,elapsed=0,laps=[],falls=0,
  storage=null}={}){
  if(st.mode!=="time-trial"){st.saveStatus="standard-mode";return null;}
  st.active.duration=n(elapsed,1000);
  st.active.laps=laps.map(x=>n(x,1000));
  if(!won||falls>0||st.invalidSamples>0||
   !validateGhost(st.active)){
   st.saveStatus="ineligible";return {saved:false,improved:false,
    bestSeconds:st.previousBest?.duration??null,reason:"ineligible"};
  }
  const previous=st.previousBest?.duration??Infinity;
  if(st.active.duration>=previous-.005){
   st.saveStatus="slower";return {saved:false,improved:false,
    bestSeconds:st.previousBest?.duration??null,reason:"slower"};
  }
  const saved=savePersonalGhost(storage,st.active);
  st.lastSaved=saved;st.lastImproved=saved;st.saveStatus=saved?"new-pb":"storage-unavailable";
  // Do not swap playback mid-race — the ghost used on this run stays fixed.
  return {saved,improved:saved,
   bestSeconds:saved?st.active.duration:(st.previousBest?.duration??null),
   reason:st.saveStatus};
 }
 function updateGhostDelta(st,{distance=0,elapsed=0}={}){
  if(st.mode!=="time-trial"||!st.previousBest){
   st.lastDelta=null;return null;
  }
  const target=ghostTimeAtDistance(st.previousBest,distance);
  if(target===null)return null;
  const delta=elapsed-target;st.lastDelta=delta;
  if(delta<0)st.peakDeltaAhead=Math.max(st.peakDeltaAhead,-delta);
  else st.peakDeltaBehind=Math.max(st.peakDeltaBehind,delta);
  return delta;
 }
 function ghostAudit(st){
  return {version:config.version,mode:st.mode,
   enabled:st.ghostEnabled,hasPersonalBest:!!st.previousBest,
   previousBestSeconds:st.previousBest?.duration??null,
   previousBestShip:st.previousBest?.ship??null,
   samplesWritten:st.samplesWritten,invalidSamples:st.invalidSamples,
   maxSamples:config.maxSamples,
   samplingHz:1/config.sampleIntervalSeconds,
   lastDeltaSeconds:st.lastDelta===null?null:n(st.lastDelta,1000),
   peakAheadSeconds:n(st.peakDeltaAhead,1000),
   peakBehindSeconds:n(st.peakDeltaBehind,1000),
   playbackFrames:st.ghostFrames,visibleFrames:st.ghostVisibleFrames,
   playbackEnded:st.playbackEnded,saveStatus:st.saveStatus,
   savedNewBest:st.lastSaved,physicalFlightUnchanged:true,
   colliders:0,addedLights:0,addedRenderPasses:0,
   maxGhostDrawCalls:config.ghostMaxDrawCalls,
   track:fingerprint()};
 }

 return {formatTrialTime,formatTrialDelta,createTimeTrialState,validateGhost,GHOST_TOGGLE_KEY,readGhostEnabled,saveGhostEnabled,loadPersonalGhost,savePersonalGhost,clearPersonalGhost,startTimeTrial,captureTimeTrialSample,finishTimeTrial,updateGhostDelta,ghostAudit};
}
