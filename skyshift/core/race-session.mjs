// Race session owns mode, persistent ghost preference and recording lifecycle.
// Track-specific sampling/configuration and storage are injected by the caller.
export function createRaceSession({api,sampleIntervalSeconds,storage,bankAt,pitchAt}){
 const trial=api.createTimeTrialState();
 let mode="time-trial",ghostEnabled=api.readGhostEnabled(storage());
 const pose={elapsed:0,s:0,worldX:0,y:0,worldZ:0,heading:0,roll:0,pitch:0};
 function selectMode(challenge){mode=challenge?"standard":"time-trial";}
 function start(ship){
  return api.startTimeTrial(trial,{mode,storage:storage(),ship,ghostEnabled});
 }
 function record(flight,force=false){
  if(trial.mode!=="time-trial"||!flight)return;
  if(!force&&flight.elapsed-trial.lastSampleAt<sampleIntervalSeconds-.0001)return;
  pose.elapsed=flight.elapsed;pose.s=flight.s;pose.worldX=flight.worldX;
  pose.y=flight.y;pose.worldZ=flight.worldZ;pose.heading=flight.heading;
  pose.roll=-bankAt(flight.s)-(flight.trickVisualAngle??0)-
   Math.sign(flight.steering??0)*Math.min(.09,Math.abs(flight.steering??0)*.06);
  pose.pitch=pitchAt(flight.s);
  api.captureTimeTrialSample(trial,pose,{force});
 }
 function finish(won,flight){
  return api.finishTimeTrial(trial,{won,elapsed:flight.elapsed,
   laps:flight.lapTimes,falls:flight.falls,storage:storage()});
 }
 function toggleGhost(){
  ghostEnabled=!ghostEnabled;
  trial.ghostEnabled=ghostEnabled;
  api.saveGhostEnabled(storage(),ghostEnabled);
  return ghostEnabled;
 }
 function playbackFrame(visible,elapsed){
  trial.ghostFrames++;
  if(visible)trial.ghostVisibleFrames++;
  if(trial.previousBest&&elapsed>trial.previousBest.duration)trial.playbackEnded=true;
 }
 return Object.freeze({trial,selectMode,start,record,finish,toggleGhost,playbackFrame,
  get ghostEnabled(){return ghostEnabled},
  personalBest:()=>api.loadPersonalGhost(storage())});
}
const LEGACY_BEST_KEY="skyshift-zone-wave-best-v049";
export function readLegacyRaceBest(storage,key=LEGACY_BEST_KEY){
 try{return Number(storage?.getItem(key))||0;}catch{return 0;}
}
export function updateLegacyRaceBest(storage,won,time,key=LEGACY_BEST_KEY){
 let best=readLegacyRaceBest(storage,key);
 if(won&&(!best||time<best)){
  try{storage?.setItem(key,String(time));}catch{}
  best=time;
 }
 return best;
}
