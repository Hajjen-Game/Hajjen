import test from "node:test";
import assert from "node:assert/strict";
import {
 TIME_TRIAL_0130,GHOST_TOGGLE_KEY,formatTrialTime,formatTrialDelta,
 createTimeTrialState,startTimeTrial,captureTimeTrialSample,
 finishTimeTrial,validateGhost,loadPersonalGhost,savePersonalGhost,
 clearPersonalGhost,readGhostEnabled,saveGhostEnabled,
 ghostPoseAt,ghostTimeAtDistance,updateGhostDelta,ghostAudit
} from "../../time-trial-v0130.mjs";
import {ghostGeometryData,GHOST_VISUAL_0130}
 from "../../ghost-visual-v0130.mjs";
function memory(){
 const db=new Map();
 return {db,getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,String(v)),
  removeItem:k=>db.delete(k)};
}
function fixture(store,{duration=151,ship="stingray",grounded=true}={}){
 const st=createTimeTrialState();
 startTimeTrial(st,{mode:"time-trial",storage:store,ship});
 const laps=[65,47,39].map(x=>x*duration/151);
 const intervals=Math.round(duration*10);
 for(let i=0;i<=intervals;i++){
  const t=duration*i/intervals,s=5+(TIME_TRIAL_0130.raceMeters-5)*i/intervals;
  const yaw=i%400===0?3.13:3.13-.001*i;
  captureTimeTrialSample(st,{elapsed:t,s,worldX:s*.6,
   worldZ:s*.35+12*Math.sin(t/8),y:1.5+Math.sin(t*.3)*.9,
   heading:yaw,roll:.2*Math.sin(t*.15),
   pitch:.05*Math.sin(t*.13)});
 }
 captureTimeTrialSample(st,{elapsed:duration,
  s:TIME_TRIAL_0130.raceMeters,worldX:6120,
  worldZ:3560,y:1.2,heading:0,roll:0,pitch:0},{force:true});
 const result=finishTimeTrial(st,{won:true,elapsed:duration,laps,
  falls:grounded?0:1,storage:store});
 return {st,result,stored:loadPersonalGhost(store)};
}
test("Time Trial is an actual independent three lap mode",()=>{
 const st=createTimeTrialState(),store=memory();
 startTimeTrial(st,{storage:store,mode:"standard",ship:"stingray"});
 assert.equal(st.mode,"standard");
 assert.equal(st.previousBest,null);
 assert.equal(captureTimeTrialSample(st,{elapsed:1,s:100}),false);
 assert.equal(finishTimeTrial(st,{won:true,elapsed:151}),null);
 startTimeTrial(st,{storage:store,mode:"time-trial",ship:"stingray"});
 assert.equal(st.mode,"time-trial");
 assert.equal(st.active.ship,"stingray");
 assert.equal(TIME_TRIAL_0130.timeTrialSameFlightPhysics,true);
});
test("three laps record a locally saved valid real trajectory",()=>{
 const store=memory(),x=fixture(store);
 assert.equal(x.result.saved,true);
 assert.equal(x.result.improved,true);
 assert.ok(x.st.samplesWritten>1200);
 assert.ok(x.st.samplesWritten<3600);
 assert.equal(x.st.invalidSamples,0);
 assert.ok(x.stored);
 assert.equal(x.stored.duration,151);
 assert.equal(x.stored.laps.length,3);
 assert.equal(x.stored.ship,"stingray");
 assert.ok(store.db.get(TIME_TRIAL_0130.storageKey).length<
  TIME_TRIAL_0130.maxStorageChars);
 assert.ok(x.stored.samples.at(-1)[1]>=10200-1);
});
test("recording detects real lateral lines and ghost interpolates in space",()=>{
 const x=fixture(memory()),g=x.stored;
 const h=ghostPoseAt(g,74.37);
 assert.ok(Math.abs(h.worldZ-h.s*.35)>1,"ghost preserves pilot lateral deviation");
 const a=ghostPoseAt(g,74.30),b=ghostPoseAt(g,74.40);
 assert.ok(h.worldX>a.worldX&&h.worldX<b.worldX);
 assert.equal(ghostPoseAt(g,g.duration+.001),null);
 assert.equal(ghostPoseAt(null,20),null);
 assert.ok(Math.abs(ghostTimeAtDistance(g,5102.5)-75.5)<.25);
});
test("same-distance delta never compares progress at unequal checkpoints",()=>{
 const store=memory(),x=fixture(store);
 startTimeTrial(x.st,{mode:"time-trial",storage:store,ship:"manta"});
 const ahead=updateGhostDelta(x.st,{distance:5102.5,elapsed:73});
 const behind=updateGhostDelta(x.st,{distance:5102.5,elapsed:79});
 assert.ok(ahead<0&&behind>0);
 assert.ok(x.st.peakDeltaAhead>=2);
 assert.ok(x.st.peakDeltaBehind>=3);
 assert.ok(ghostAudit(x.st).hasPersonalBest);
});
test("slower second run cannot replace PB, faster clean run does",()=>{
 const store=memory();fixture(store,{duration:151});
 const slow=fixture(store,{duration:161});
 assert.equal(slow.result.saved,false);
 assert.equal(slow.result.reason,"slower");
 assert.equal(loadPersonalGhost(store).duration,151);
 const fast=fixture(store,{duration:144});
 assert.equal(fast.result.saved,true);
 assert.equal(loadPersonalGhost(store).duration,144);
});
test("incomplete race, crash or damaged trajectory never overwrite saved ghost",()=>{
 const store=memory();fixture(store);
 const crash=fixture(store,{duration:138,grounded:false});
 assert.equal(crash.result.saved,false);
 assert.equal(crash.result.reason,"ineligible");
 assert.equal(loadPersonalGhost(store).duration,151);
 const partial=createTimeTrialState();
 startTimeTrial(partial,{mode:"time-trial",storage:store});
 captureTimeTrialSample(partial,{elapsed:0,s:5,worldX:0,y:0,worldZ:0,heading:0});
 assert.equal(finishTimeTrial(partial,{won:false,elapsed:150,laps:[60,50,40],storage:store}).saved,false);
 assert.equal(loadPersonalGhost(store).duration,151);
});
test("crash/checkpoint backwards invalidates compact distance trace",()=>{
 const st=createTimeTrialState();startTimeTrial(st,{mode:"time-trial"});
 assert.equal(captureTimeTrialSample(st,{elapsed:0,s:5,
   worldX:0,y:0,worldZ:0,heading:0}),true);
 assert.equal(captureTimeTrialSample(st,{elapsed:.2,s:15,
   worldX:10,y:0,worldZ:0,heading:0}),true);
 assert.equal(captureTimeTrialSample(st,{elapsed:.4,s:7,
   worldX:4,y:0,worldZ:0,heading:0}),false);
 assert.equal(st.invalidSamples,1);
});
test("corrupted / wrong-track local data is rejected without crashing",()=>{
 const store=memory(),x=fixture(store);
 for(const bad of ['{bad',JSON.stringify({...x.stored,track:"other-track"}),
  JSON.stringify({...x.stored,samples:[...[...x.stored.samples].slice(0,2),
  ["bad"]]}),'x'.repeat(TIME_TRIAL_0130.maxStorageChars+1)]){
  store.setItem(TIME_TRIAL_0130.storageKey,bad);
  assert.equal(loadPersonalGhost(store),null);
 }
 assert.equal(validateGhost({...x.stored,samples:null}),null);
 const broken={getItem(){throw Error("restricted")},setItem(){throw Error("restricted")}};
 assert.equal(loadPersonalGhost(broken),null);
 assert.equal(savePersonalGhost(broken,x.stored),false);
});
test("ghost visibility preference is independently persisted; OFF is not deletion",()=>{
 const store=memory();fixture(store);
 assert.equal(readGhostEnabled(store),true);
 assert.equal(saveGhostEnabled(store,false),true);
 assert.equal(store.db.get(GHOST_TOGGLE_KEY),"off");
 assert.equal(readGhostEnabled(store),false);
 assert.ok(loadPersonalGhost(store));
 assert.equal(saveGhostEnabled(store,true),true);
 assert.equal(readGhostEnabled(store),true);
 assert.equal(clearPersonalGhost(store),true);
 assert.equal(loadPersonalGhost(store),null);
});
test("format uses centiseconds and conventional signed delta",()=>{
 assert.equal(formatTrialTime(65.899),"01:05.89");
 assert.equal(formatTrialTime(151),"02:31.00");
 assert.equal(formatTrialTime(-1),"--:--.--");
 assert.equal(formatTrialDelta(-1.245),"−1.25");
 assert.equal(formatTrialDelta(2.1),"+2.10");
 assert.equal(formatTrialDelta(null),"—");
});
test("ghost mesh is tiny, readable and never creates lights or colliders",()=>{
 const g=ghostGeometryData();
 assert.ok(g.triangles>10&&g.triangles<80);
 assert.equal(g.body.length%9,0);
 assert.equal(g.edge.length%9,0);
 assert.ok([...g.body,...g.edge].every(Number.isFinite));
 assert.equal(GHOST_VISUAL_0130.drawCalls,2);
 assert.equal(GHOST_VISUAL_0130.colliders,0);
 assert.equal(GHOST_VISUAL_0130.extraLights,0);
 assert.equal(GHOST_VISUAL_0130.noRoadCenterlineApproximation,true);
});
test("data audit excludes bulky samples and records actual ghost state",()=>{
 const x=fixture(memory());const a=ghostAudit(x.st);
 assert.equal("samples" in a,false);
 assert.equal(a.savedNewBest,true);
 assert.equal(a.samplingHz,10);
 assert.equal(a.physicalFlightUnchanged,true);
 assert.equal(a.maxGhostDrawCalls,2);
});
