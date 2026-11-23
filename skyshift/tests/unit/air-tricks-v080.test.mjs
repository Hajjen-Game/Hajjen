// SKYSHIFT 0.8.0 – Air Tricks & Landing Boost: authoritative 120Hz checks.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {AIR_TRICKS,initAirTrickState,beginAirTrick,advanceAirTrick,
 finalizeAirTrick,stepLandingBoost,settleTrickVisual}
 from "../../air-tricks-v080.mjs";
import {TRIAL,CIRCUIT,SKYLINE_LEAP,MAGNETIC_WALL,CORKSCREW,
 poseAt,positionAt,bankAt,surfaceHeightAt,speedAt,headingAt,
 newFlightState,stepFlight,validateTrial} from "../../trial-v080.mjs";
import {capturePose,interpolatePose,shouldSnapPose}
 from "../../core/frame-pacing-v080.mjs";
import * as archived from "../../trial-v072.mjs";
const source=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const near=(a,b,e=1e-5)=>assert.ok(Math.abs(a-b)<=e,"expected "+a+" ≈ "+b);
function fly({lap=1,stage=0,steer=.74,held=true,delay=0,prearm=false}={}){
 const start=(lap-1)*3400+790,p=positionAt(start,0,0),f=newFlightState();
 Object.assign(f,{s:start,lap,worldX:p.x,worldZ:p.z,
  lateral:0,heading:headingAt(start),
  y:surfaceHeightAt(start)+TRIAL.hoverHeight,
  zoneSpeedStage:stage,zoneCruiseSpeed:speedAt(start,stage),
  currentSpeed:speedAt(start,stage)});
 let launches=0,lands=0,full=0,awards=0,rejections=0,air=0,
  maxImpact=0,steps=0,landingS=0,last=null;
 for(let i=0;i<360;i++){
  const enabled=held&&(prearm?(f.s>=800):(air/120>=delay&&!f.grounded));
  const r=stepFlight(f,1/120,{steer:enabled?steer:0,trick:enabled});
  steps++;last=r;
  if(r.jumped)launches++;
  if(!f.grounded)air++;
  if(r.trickCompleted)full++;
  if(r.landingBoostAwarded)awards++;
  if(r.landingBoostRejected)rejections++;
  if(r.landed){
   lands++;maxImpact=r.landImpact;landingS=f.s;
   break;
  }
 }
 return {f,launches,lands,full,awards,rejections,air,maxImpact,
  steps,landingS,last};
}
test("0.8.0 retains 3-lap geometry, mandatory leap, 70° wall and full 360° corkscrew",()=>{
 assert.equal(TRIAL.id,"skyline-airtricks-v080");
 assert.equal(TRIAL.raceLength,10200);
 assert.equal(CIRCUIT.laps,3);
 assert.equal(AIR_TRICKS.oneTrickPerLeap,true);
 assert.equal(AIR_TRICKS.airborneOnly,true);
 assert.equal(AIR_TRICKS.noAutomaticReward,true);
 assert.equal(AIR_TRICKS.additionalDrawCalls,0);
 assert.equal(SKYLINE_LEAP.start,808);
 assert.equal(CORKSCREW.revolutions,1);
 near(MAGNETIC_WALL.maxBankDegrees,70);
 assert.deepEqual(validateTrial(),[]);
 for(const s of [0,375,790,808,837,1650,2200,2418,2550,2698,3005,3171.5,3338,3400]){
  near(bankAt(s),archived.bankAt(s),1e-12);
  const p=positionAt(s,4,0),q=archived.positionAt(s,4,0);
  near(p.x,q.x,1e-9);near(p.y,q.y,1e-9);
  near(p.z,q.z,1e-9);
 }
});
test("default autopilot leap still launches and lands cleanly with NO trick reward",()=>{
 const a=fly({held:false});
 assert.equal(a.launches,1);assert.equal(a.lands,1);
 assert.equal(a.f.cleanLeapLandings,1);
 assert.equal(a.f.trickAttempts,0);
 assert.equal(a.f.trickFullRotations,0);
 assert.equal(a.f.trickQualifiedLandings,0);
 assert.equal(a.f.landingBoostActivations,0);
 assert.equal(a.f.landingBoostTimer,0);
 assert.equal(a.f.landingBoostMultiplier,1);
 assert.equal(a.f.falls,0);
});
test("full intentional LEFT/RIGHT air roll earns one real landing boost on all laps",()=>{
 for(const [lap,stage,steer] of [[1,0,.74],[1,0,-.74],[2,4,-.74],[3,7,.74],[3,8,.74]]){
  const a=fly({lap,stage,steer});
  assert.equal(a.launches,1);assert.equal(a.lands,1);
  assert.equal(a.full,1);assert.equal(a.awards,1);
  assert.equal(a.rejections,0);
  assert.equal(a.f.trickAttempts,1);
  assert.equal(a.f.trickFullRotations,1);
  assert.equal(a.f.trickQualifiedLandings,1);
  assert.equal(a.f.trickRejectedLandings,0);
  assert.equal(a.f.lastTrickResult,"perfect");
  assert.equal(a.f.landingBoostActivations,1);
  assert.ok(a.f.trickPeakDegrees>=359.9);
  assert.ok(a.f.trickAirSeconds>.4);
  assert.ok(a.f.grounded&&a.f.falls===0);
  assert.ok(a.f.landingBoostTimer>1.4);
  // 0 and ±2π are the same landing attitude after visual settling.
   near(Math.atan2(Math.sin(a.f.trickVisualAngle),Math.cos(a.f.trickVisualAngle)),0,0.02);
  let peak=1,physicalPeak=0;
  for(let i=0;i<175;i++){
    stepFlight(a.f,1/120,{steer:0,trick:false});
    peak=Math.max(peak,a.f.landingBoostMultiplier);
    physicalPeak=Math.max(physicalPeak,a.f.currentSpeed);
  }
  assert.ok(peak>1.21&&peak<=1.221,"unexpected speed envelope "+peak);
  assert.ok(physicalPeak>speedAt(a.landingS,stage)*1.10);
  near(a.f.landingBoostMultiplier,1,1e-9);
  assert.ok(a.f.landingBoostSeconds>1);
  assert.ok(a.f.landingBoostDistanceMeters>30);
 }
});
test("too-late/too-small trick cannot award a free landing boost",()=>{
 for(const settings of [{steer:0.25},{steer:.74,delay:.28}]){
  const a=fly(settings);
  assert.equal(a.launches,1);assert.equal(a.lands,1);
  assert.equal(a.full,0);assert.equal(a.awards,0);
  assert.equal(a.f.landingBoostActivations,0);
  assert.equal(a.f.landingBoostMultiplier,1);
  assert.equal(a.f.landingBoostTimer,0);
 }
 const late=fly({steer:.74,delay:.28});
 assert.equal(late.f.trickAttempts,1);
 assert.equal(late.rejections,1);
 assert.equal(late.f.lastTrickFailReason,"incomplete");
});
test("intentional pre-arming near the lip keeps heading stable then executes a trick",()=>{
 const a=fly({steer:.74,prearm:true});
 assert.equal(a.full,1);assert.equal(a.awards,1);
 assert.equal(a.f.railContacts,0);
 assert.ok(Math.abs(a.f.lateral)<1.0);
 assert.ok(Math.abs(a.f.heading-headingAt(a.f.s))<.06);
});
test("landing judge rejects rail strikes, hard impact and misaligned yaw",()=>{
 function judged(options={}){
  const f=initAirTrickState({grounded:false,lateral:0,railContacts:0});
  beginAirTrick(f,1);
  let done=false;
  for(let i=0;i<90&&!done;i++)
   done=advanceAirTrick(f,1/120,.74,true).completed;
  assert.ok(done);
  f.grounded=true;
  if(options.rail)f.railContacts++;
  if(options.edge)f.lateral=7.5;
  return finalizeAirTrick(f,{
   lap:1,impact:options.impact??8,
   headingErrorDeg:options.heading??0,
   lateralLimit:7.77,grounded:true,railContact:false
  });
 }
 assert.deepEqual([judged().awarded,judged({rail:true}).awarded,
  judged({impact:20}).awarded,judged({heading:20}).awarded,
  judged({edge:true}).awarded],[true,false,false,false,false]);
 assert.equal(judged({rail:true}).reason,"rail-contact");
 assert.equal(judged({heading:20}).reason,"heading");
});
test("visual air roll is interpolated but never reverses across equivalent 2π snap",()=>{
 const f=newFlightState();f.trickVisualAngle=Math.PI;
 const p=capturePose(f);
 f.trickVisualAngle=Math.PI+0.19;
 const q=capturePose(f);
 near(interpolatePose(p,q,.5).trickVisualAngle,Math.PI+.095,1e-9);
 assert.equal(shouldSnapPose(p,q),false);
 f.trickVisualAngle=0;
 const zero=capturePose(f);
 const whole={...q,trickVisualAngle:2*Math.PI-.001};
 assert.equal(shouldSnapPose(whole,zero),true);
 f.grounded=true;f.trickVisualAngle=5.2;
 settleTrickVisual(f,1/60);
 assert.ok(f.trickVisualAngle>5.2);
});
test("production 0.8.0 uses contextual multitouch and exports deterministic stats",()=>{
 const html=source("./index.html"),game=source("./game-v080.mjs"),
  css=source("./style-v080.css"),boot=source("./boot-v080.js"),
  smoke=source("./browser-smoke-v080.mjs");
 assert.match(html,/data-game-module="game-v0103\.mjs"/);
 assert.match(html,/style-v083\.css/);
 assert.match(html,/aria-label="GRIP:/);
 assert.match(html,/SHIFT \+ STEER/);
 assert.match(boot,/game-v080\.mjs\?v=0\.8\.0/);
 assert.match(game,/trick:uiState\.jumpHeld/);
 assert.match(game,/air_trick_full_rotation/);
 assert.match(game,/landing_boost_awarded/);
 assert.match(game,/skyshift-airtricks-v080-audit\.json/);
 assert.match(game,/frame-pacing-v080/);
 assert.match(game,/trickVisualAngle/);
 assert.match(css,/#mobile-controls #jump-btn\.trick-ready/);
 assert.match(css,/display:flex!important/);
 assert.match(smoke,/airTrick/);
 assert.match(source("./trial-v072.mjs"),/skyline-corkscrew-v072/);
 assert.match(source("./trial-v071.mjs"),/skyline-wall-v071/);
});
