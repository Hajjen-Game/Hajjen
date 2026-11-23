// SKYSHIFT 0.10.3 — GRIP-FIRST STEERING: authority and 3-lap race checks.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as archived from "../../trial-v084.mjs";
import {
 STEERING_AUTHORITY,normalYawFactorAt,yawAuthorityAt,steeringBalanceAt
} from "../../flight/steering-authority-v0901.mjs";
import {GRIP_SPEC,initGripState,stepGripState} from "../../flight/precision-grip-v084.mjs";
import {TRIAL,CIRCUIT,GRIP_APEX,SKYLINE_LEAP,MAGNETIC_WALL,CORKSCREW,
 positionAt,headingAt,surfaceHeightAt,curvatureAt,widthAt,speedAt,
 newFlightState,stepFlight,setZoneSpeedStage,validateTrial} from "../../trial-v0901.mjs";

const near=(actual,expected,tolerance=1e-6)=>
 assert.ok(Math.abs(actual-expected)<=tolerance,
  "expected "+actual+" ~= "+expected+" ± "+tolerance);
const read=name=>readFileSync(new URL("../../"+name,import.meta.url),"utf8");
// The test-only, pilot-like steering controller is NOT shipped to the game.
// It only holds steering or GRIP after sampling the actual curves.
function unshape(x){
 if(Math.abs(x)<.001)return 0;
 const v=Math.min(1,Math.abs(x));
 const raw=(-.32+Math.sqrt(.1024+2.72*v))/1.36;
 return Math.sign(x)*(.055+.945*raw);
}
function run(policy){
 const f=newFlightState();
 const moments={jumps:0,lands:0,walls:0,corks:0,laps:0,boosts:0};
 const contacts=[0,0,0],onGripSeconds=[0,0,0];
 for(let i=0;i<28000&&!f.finished&&!f.failed;i++){
  const v=f.currentSpeed,local=(f.s%3400+3400)%3400;
  const curve=curvatureAt(f.s+v*.1);
  const stage=f.zoneSpeedStage;
  const grip=policy==="skill"&&f.grounded&&(
   (Math.abs(curve)*v>TRIAL.maxYawRate*normalYawFactorAt(v)*.72
    &&Math.abs(curve)>.003)||
   (stage>=3&&local>=740&&local<1010));
  const wanted=curve*v+.95*(headingAt(f.s)-f.heading)-.12*f.lateral;
  const steer=Math.max(-1,Math.min(1,unshape(wanted/
   (TRIAL.maxYawRate*yawAuthorityAt(v,f.gripIntensity)))));
  const old=f.railContacts;
  const r=stepFlight(f,1/120,{steer,grip});
  const index=Math.min(2,Math.floor(f.s/3400));
  if(f.railContacts>old)contacts[index]+=f.railContacts-old;
  if(grip)onGripSeconds[index]+=1/120;
  moments.jumps+=Number(r.jumped);
  moments.lands+=Number(r.landed);
  moments.walls+=Number(r.wallEntered);
  moments.corks+=Number(r.corkscrewEntered);
  moments.laps+=Number(r.lapCompleted>0);
  moments.boosts+=Number(Boolean(r.boostActivated));
  const z=Math.min(8,Math.floor(f.elapsed/18));
  if(z>f.zoneSpeedStage)setZoneSpeedStage(f,z);
  if(r.crashed)break;
 }
 return {f,moments,contacts,onGripSeconds};
}
test("ordinary steering becomes substantially wider and GRIP remains highly authoritative",()=>{
 assert.equal(STEERING_AUTHORITY.normalSlowFactor,.69);
 assert.equal(STEERING_AUTHORITY.normalFastFactor,.40);
 assert.equal(STEERING_AUTHORITY.fullGripFactor,1.55);
 assert.equal(STEERING_AUTHORITY.noAutoSteer,true);
 assert.equal(STEERING_AUTHORITY.pilotOwnedSteer,true);
 assert.equal(STEERING_AUTHORITY.noDeadzoneChange,true);
 near(normalYawFactorAt(44),.69);
 near(normalYawFactorAt(TRIAL.endSpeed),.40);
 assert.ok(normalYawFactorAt(44)<archived.STEERING_AUTHORITY.normalSlowFactor*.75);
 assert.ok(normalYawFactorAt(TRIAL.endSpeed)<archived.STEERING_AUTHORITY.normalFastFactor*.65);
 for(const v of [44,55,66,82,101,142]){
  near(yawAuthorityAt(v,0),normalYawFactorAt(v));
  near(yawAuthorityAt(v,1),1.55);
  assert.ok(yawAuthorityAt(v,.5)>normalYawFactorAt(v));
 }
 near(steeringBalanceAt(44).relativeGripGain,1.55/.69);
 near(steeringBalanceAt(TRIAL.endSpeed).relativeGripGain,1.55/.40);
 assert.equal(TRIAL.turnResponse,archived.TRIAL.turnResponse);
 assert.equal(TRIAL.turnRelease,archived.TRIAL.turnRelease);
 assert.equal(TRIAL.maxYawRate,archived.TRIAL.maxYawRate);
 assert.equal(TRIAL.steerDeadzone,archived.TRIAL.steerDeadzone);
});
test("GRIP requires pilot-held steer, retains real speed cost and airborne roll behavior",()=>{
 const state=initGripState({});
 const zero=stepGripState(state,1/120,0,true,true);
 assert.equal(zero.active,false);
 assert.equal(state.gripActivations,0);
 for(let i=0;i<80;i++)stepGripState(state,1/120,.8,true,true);
 assert.ok(state.gripIntensity>.99);
 assert.equal(state.gripActivations,1);
 assert.equal(GRIP_SPEC.maxSpeedPenalty,.065);
 assert.equal(GRIP_SPEC.minSteer,.12);
 assert.equal(GRIP_SPEC.noAutoSteer,true);
 assert.equal(stepGripState(state,1/120,.8,true,false).active,false);
});
test("same physics as 0.9.0: all 3D features, guardrails, 3 laps and curves",()=>{
 assert.deepEqual(validateTrial(),[]);
 assert.equal(CIRCUIT.laps,3);
 assert.equal(TRIAL.raceLength,10200);
 assert.equal(GRIP_APEX.minWidthMeters,14);
 for(const x of [0,160,573,650,777,850,900,995,1163,1662,1842,
   2195,2540,3005,3175,3338,3400]){
  near(curvatureAt(x),archived.curvatureAt(x),1e-10);
  near(widthAt(x),archived.widthAt(x),1e-10);
  near(headingAt(x),archived.headingAt(x),1e-10);
 }
 for(const item of ["SKYLINE_LEAP","MAGNETIC_WALL","CORKSCREW"]){
  const now={SKYLINE_LEAP,MAGNETIC_WALL,CORKSCREW}[item];
  const old=archived[item];
  near(now.start,old.start);
  near(now.end,old.end);
 }
});
test("new wide-arc steering makes GRIP truly valuable on later laps",()=>{
 const ordinary=run("normal"),skill=run("skill");
 for(const one of [ordinary,skill]){
  assert.equal(one.f.finished,true);
  assert.equal(one.f.failed,false);
  assert.equal(one.f.shield,100);
  assert.equal(one.f.falls,0);
  assert.equal(one.moments.laps,3);
  assert.equal(one.moments.jumps,3);
  assert.equal(one.moments.lands,3);
  assert.equal(one.moments.walls,3);
  assert.equal(one.moments.corks,3);
  assert.equal(one.moments.boosts,9);
 }
 assert.equal(ordinary.contacts[0],0); // approachable first lap
 assert.ok(ordinary.contacts[1]>=1);  // technique begins to matter
 assert.ok(ordinary.contacts[2]>=5);  // old ordinary steering no longer enough
 assert.ok(ordinary.f.railContacts>=8);
 assert.equal(ordinary.f.gripActiveSeconds,0);
 assert.equal(skill.f.railContacts,0);
 assert.equal(skill.f.gripApexCleanExits,3);
 assert.ok(skill.f.gripActiveSeconds>=15);
 assert.ok(skill.f.gripActiveSeconds<35);
 assert.ok(skill.onGripSeconds[1]>1);
 assert.ok(skill.onGripSeconds[2]>1);
 assert.ok(skill.f.peakGripRelativeGain>3);
 assert.ok(skill.f.elapsed>140&&skill.f.elapsed<160);
});
test("0.10.3 release points to new physics while preserving 0.9.0 camera modes",()=>{
 const html=read("./index.html"),boot=read("./boot-v0103.js"),
  game=read("./game-v0103.mjs"),before=read("./game-v090.mjs");
 assert.match(html,/boot-v0103\.js\?v=0\.10\.3/);
 assert.match(html,/data-game-module="game-v0103\.mjs"/);
 assert.match(boot,/game-v0103\.mjs\?v=0\.10\.3/);
 assert.match(game,/version:"0\.10\.3"/);
 assert.match(game,/trial-v0901\.mjs/);
 assert.match(game,/cinematic-v0901\.mjs/);
 assert.match(game,/kinetic-camera-v090\.mjs/);
 assert.match(game,/CAMERA_MODE/);
 assert.match(game,/skyshift-premium-ship-v0103-audit\.json/);
 assert.match(before,/version:"0\.9\.0"/);
 assert.match(read("./flight/steering-authority-v084.mjs"),/normalSlowFactor:\.96/);
});
