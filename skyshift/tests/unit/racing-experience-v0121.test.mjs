// SKYSHIFT 0.12.1 — Fidelity profile, opt-out and real Power Carve tests.
import test from "node:test";
import assert from "node:assert/strict";
import {FIDELITY_0121,readFidelityChoice,saveFidelityChoice,
 chooseFidelity0121} from "../../core/fidelity-settings-v0121.mjs";
import {RACING_0121,createRacingExperience,resetRacingExperience,
 raceWindowAt,raceRhythmAt,observeRacingStep,stepRacingExperience,
 racingExperienceAudit} from "../../racing-experience-v0121.mjs";
const v=(grip=1)=>({s:885,steering:.93,yawRate:.78,gripIntensity:grip,
 speed:95,grounded:true,wall:false,corkscrew:false,playing:true});
const f=(s=780)=>({s,grounded:true,gripIntensity:0,steering:0,yawRate:0,
 railContacts:0,elapsed:0});
function drive(st,flight,window,{grip=.95,yaw=.7,contact=false}={}){
 const dt=1/120,first=window.start+1;
 flight.s=first;
 observeRacingStep(st,flight,dt);
 for(let i=0;i<76;i++){
  flight.s=first+(window.end-first-1)*i/76;
  flight.elapsed+=dt;flight.gripIntensity=grip;
  flight.steering=.85;flight.yawRate=yaw;
  if(contact&&i===44)flight.railContacts++;
  observeRacingStep(st,flight,dt);
 }
 flight.s=window.end+.1;
 return observeRacingStep(st,flight,dt);
}
test("four real GRIP windows remain aligned to the original circuit",()=>{
 assert.equal(RACING_0121.precisionWindows.length,4);
 assert.equal(raceWindowAt(810),0);
 assert.equal(raceWindowAt(1148),1);
 assert.equal(raceWindowAt(2000),2);
 assert.equal(raceWindowAt(2600),3);
 assert.equal(raceWindowAt(3400+2600),3);
 assert.equal(raceRhythmAt(1700),"WALL");
 assert.equal(raceRhythmAt(2210),"SHADOW");
 assert.equal(raceRhythmAt(3120),"CORKSCREW");
 assert.equal(RACING_0121.noNewPillars,true);
});
test("normal default uses refined vertex Fidelity even with 4GB; legacy/off benchmarks prevail",()=>{
 const c=readFidelityChoice();
 assert.deepEqual(c,{enabled:true,source:"default"});
 const low=chooseFidelity0121({lowMemory:true,preset:"baseline",choice:c});
 assert.equal(low.mode,"vertex-nearfield-pbr-sheen");
 assert.equal(low.lowMemory,true);
 assert.equal(low.defaultPremiumOnLowMemory,true);
 assert.equal(low.forced,false);
 const high=chooseFidelity0121({lowMemory:false,preset:"baseline",choice:c});
 assert.equal(high.premium,true);
 const off=chooseFidelity0121({lowMemory:true,preset:"fidelity-off",choice:c});
 assert.equal(off.premium,false);
 assert.equal(off.modeSelection,"benchmark");
 const leg=chooseFidelity0121({lowMemory:true,preset:"fidelity-legacy",choice:c});
 assert.equal(leg.legacy,true);
 const on=chooseFidelity0121({lowMemory:true,preset:"fidelity-on",
  choice:{enabled:false,source:"saved"}});
 assert.equal(on.premium,true);
 assert.equal(on.forced,true);
});
test("explicit OFF persists and URL ON/OFF overrides it; inaccessible storage safe",()=>{
 const values=new Map();
 const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 assert.equal(saveFidelityChoice(false,storage),true);
 let off=readFidelityChoice({storage});
 assert.deepEqual(off,{enabled:false,source:"saved"});
 assert.equal(chooseFidelity0121({lowMemory:false,preset:"baseline",choice:off}).premium,false);
 assert.deepEqual(readFidelityChoice({storage,search:"?fidelity=on"}),
  {enabled:true,source:"url"});
 assert.deepEqual(readFidelityChoice({storage,search:"?fidelity=off"}),
  {enabled:false,source:"url"});
 assert.equal(saveFidelityChoice(true,storage),true);
 assert.equal(readFidelityChoice({storage}).enabled,true);
 const broken={getItem(){throw Error("private")},setItem(){throw Error("private")}};
 assert.equal(readFidelityChoice({storage:broken}).enabled,true);
 assert.equal(saveFidelityChoice(false,broken),false);
 assert.equal(FIDELITY_0121.adaptiveDprUnchanged,true);
});
test("Power Carve moves hull, camera and engine DURING actual held GRIP",()=>{
 const a=createRacingExperience(),idle=createRacingExperience();
 for(let i=0;i<80;i++){
  stepRacingExperience(a,1/120,v(1));
  stepRacingExperience(idle,1/120,v(0));
 }
 assert.ok(a.gripEnergy>.64,"held GRIP must create real feedback while driving");
 assert.ok(Math.abs(a.hullCarve)>.04,"ship body should visibly bank extra");
 assert.ok(Math.abs(a.cameraLean)>.018,"camera should visibly lean");
 assert.ok(Math.abs(a.cameraShiftMeters)>.2);
 assert.ok(a.fovAddition>1.75);
 assert.ok(a.engineLift>.40);
 assert.equal(idle.gripEnergy,0);
 assert.equal(idle.hullCarve,0);
 assert.ok(a.peakHullCarve<=RACING_0121.maxHullCarveRadians);
 assert.ok(a.peakCameraLean<=RACING_0121.maxCameraLeanRadians);
 assert.equal(racingExperienceAudit(a).physicalFlightUnchanged,true);
});
test("no steering or no GRIP cannot generate false carve movement",()=>{
 for(const variant of [{gripIntensity:0},{steering:0,yawRate:0}]){
  const st=createRacingExperience();
  for(let i=0;i<90;i++)stepRacingExperience(st,1/120,{...v(1),...variant});
  assert.ok(st.gripEnergy<1e-9);
  assert.ok(Math.abs(st.hullCarve)<1e-8);
 }
});
test("air, 70-degree wall and full corkscrew protect roll and frame",()=>{
 for(const protectedView of [{grounded:false},{wall:true},{corkscrew:true}]){
  const st=createRacingExperience();
  for(let i=0;i<60;i++)stepRacingExperience(st,1/120,v(1));
  for(let i=0;i<140;i++)
   stepRacingExperience(st,1/120,{...v(1),...protectedView});
  assert.ok(Math.abs(st.hullCarve)<1e-5);
  assert.ok(Math.abs(st.cameraLean)<1e-5);
  assert.ok(Math.abs(st.cameraShiftMeters)<1e-5);
  assert.ok(st.fovAddition<.003);
  assert.ok(st.protectedFrames>=140);
 }
});
test("pause freezes director; 30 and 60 fps produce matching damping",()=>{
 const a=createRacingExperience(),b=createRacingExperience();
 for(let i=0;i<60;i++)stepRacingExperience(a,1/60,v());
 for(let i=0;i<30;i++)stepRacingExperience(b,1/30,v());
 for(const x of ["fovAddition","hullCarve","cameraLean",
  "cameraShiftMeters","cameraPullbackMeters","engineLift"]){
  assert.ok(Math.abs(a[x]-b[x])<1e-4,x);
 }
 const value=JSON.stringify(racingExperienceAudit(a));
 stepRacingExperience(a,1/60,{...v(),playing:false});
 assert.equal(JSON.stringify(racingExperienceAudit(a)),value);
});
test("real clean GRIP carves earn one lap-aware event, not an auto boost",()=>{
 const st=createRacingExperience(),ship=f();
 const win=RACING_0121.precisionWindows[0];
 const e=drive(st,ship,win);
 assert.equal(e?.id,"precision-apex");
 assert.equal(e?.chain,1);
 assert.equal(st.cleanCarves,1);
 assert.equal(st.releaseTime,RACING_0121.releaseSeconds);
 const duplicate=drive(st,ship,win);
 assert.equal(duplicate,null);
 assert.equal(st.cleanCarves,1);
 ship.s=3400+win.start;observeRacingStep(st,ship,1/120);
 const second=drive(st,ship,{...win,start:win.start+3400,end:win.end+3400});
 assert.equal(second?.lap,2);
 assert.equal(second.chain,1);
 assert.equal(st.cleanCarves,2);
});
test("rail contact or absent GRIP/yaw still blocks the clean Flow reward",()=>{
 const win=RACING_0121.precisionWindows[0];
 for(const condition of [{grip:0},{yaw:0},{contact:true}]){
  const st=createRacingExperience(),ship=f();
  const award=drive(st,ship,win,condition);
  assert.equal(award,null);
  assert.equal(st.cleanCarves,0);
  assert.equal(st.missedCarves,1);
 }
});
test("reset clears every spring and racecraft counter",()=>{
 const st=createRacingExperience(),ship=f();
 drive(st,ship,RACING_0121.precisionWindows[0]);
 for(let i=0;i<60;i++)stepRacingExperience(st,1/120,v(1));
 resetRacingExperience(st);
 assert.equal(st.cleanCarves,0);
 assert.equal(st.completedWindowKeys.size,0);
 assert.equal(st.gripEnergy,0);
 assert.equal(st.fovAddition,0);
 assert.equal(st.hullCarve,0);
 assert.equal(st.presentationFrames,0);
});
