// SKYSHIFT 0.8.1 – real 33.6m gap, GRIP-powered midair roll and landing boost.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {AIR_TRICKS,initAirTrickState,beginAirTrick,advanceAirTrick}
 from "../../air-tricks-v081.mjs";
import {createFlightMotionState,stepFlightMotion}
 from "../../flight-motion-v044.mjs";
import {TRIAL,CIRCUIT,SKYLINE_LEAP,MAGNETIC_WALL,CORKSCREW,
 positionAt,surfaceHeightAt,headingAt,bankAt,newFlightState,stepFlight,
 speedAt,widthAt,validateTrial} from "../../trial-v081.mjs";
import {createSmoothDeckData} from "../../smooth-track-v081.mjs";
import {createAeroBarrierData} from "../../tracks/barriers/aero-barrier-v081.mjs";
import {PREMIUM_TRACK} from "../../premium-track-v081.mjs";
import * as archived from "../../trial-v080.mjs";
const source=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const near=(a,b,tol=1e-5)=>assert.ok(Math.abs(a-b)<=tol,
 "expected "+a+" ≈ "+b);
function leap(lap=1,stage=0,grip=false,steer=.7,delay=0){
 const s=(lap-1)*3400+790,p=positionAt(s),f=newFlightState();
 Object.assign(f,{s,lap,worldX:p.x,worldZ:p.z,lateral:0,
  y:surfaceHeightAt(s)+TRIAL.hoverHeight,heading:headingAt(s),
  zoneSpeedStage:stage,zoneCruiseSpeed:speedAt(s,stage),
  currentSpeed:speedAt(s,stage)});
 let launches=0,landings=0,completed=0,awards=0,rejections=0,
  airFrames=0,maxHeight=0,lipS=0,landS=0;
 for(let i=0;i<480;i++){
  const active=grip&&!f.grounded&&airFrames/120>=delay;
  const r=stepFlight(f,1/120,{steer:active?steer:0,grip:active});
  if(r.jumped){launches++;lipS=f.s;}
  if(!f.grounded){airFrames++;maxHeight=Math.max(maxHeight,
    f.y-surfaceHeightAt(f.s)-TRIAL.hoverHeight);}
  completed+=Number(r.trickCompleted);
  awards+=Number(r.landingBoostAwarded);
  rejections+=Number(r.landingBoostRejected);
  if(r.landed){landings++;landS=f.s;break;}
  if(r.crashed)break;
 }
 return {f,launches,landings,completed,awards,rejections,
  seconds:airFrames/120,height:maxHeight,distance:landS-lipS};
}
test("0.8.1 geometry physically doubles the gap and preserves old banking",()=>{
 assert.equal(TRIAL.id,"skyline-grip-airtricks-v081");
 assert.equal(TRIAL.raceLength,10200);
 assert.equal(CIRCUIT.laps,3);
 near(SKYLINE_LEAP.start,808);
 near(SKYLINE_LEAP.end,841.6);
 near(SKYLINE_LEAP.landingClearance,33.6);
 assert.ok(SKYLINE_LEAP.launchVelocity>12);
 assert.ok(SKYLINE_LEAP.end>archived.SKYLINE_LEAP.end+15);
 assert.ok(AIR_TRICKS.gripIsTrickButton);
 assert.equal(AIR_TRICKS.oneTrickPerLeap,true);
 assert.equal(AIR_TRICKS.noAutomaticReward,true);
 assert.ok(createSmoothDeckData().triangles>26000);
 assert.ok(createAeroBarrierData().triangles>80000);
 assert.equal(PREMIUM_TRACK.drawBatches,1);
 near(MAGNETIC_WALL.maxBankDegrees,70);
 assert.equal(CORKSCREW.revolutions,1);
 for(const s of [0,390,700,1020,2550,3171.5,3400])
  near(bankAt(s),archived.bankAt(s),1e-8);
 assert.deepEqual(validateTrial(),[]);
});
test("larger leap is at least 3m tall and gets longer with physical speed",()=>{
 const slow=leap(1,0,false),mid=leap(2,4,false),fast=leap(3,8,false);
 for(const r of [slow,mid,fast]){
  assert.equal(r.launches,1);assert.equal(r.landings,1);
  assert.equal(r.f.falls,0);assert.equal(r.f.shield,100);
  assert.equal(r.f.trickFullRotations,0);
  assert.equal(r.f.landingBoostActivations,0);
  assert.ok(r.height>3.3);
  assert.ok(r.seconds>1.05);
 }
 assert.ok(slow.distance>47&&slow.distance<70);
 assert.ok(mid.distance>78&&mid.distance<118);
 assert.ok(fast.distance>125&&fast.distance<165);
 assert.ok(fast.height>slow.height+.7);
 assert.ok(fast.seconds>slow.seconds);
});
test("GRIP + steer powers a complete legible 360° roll and real landing boost",()=>{
 for(const [lap,stage,dir] of [[1,0,.7],[1,0,-.7],[2,4,-.7],[3,7,.7],[3,8,.7]]){
  const r=leap(lap,stage,true,dir);
  assert.equal(r.completed,1);
  assert.equal(r.awards,1);
  assert.equal(r.rejections,0);
  assert.equal(r.f.trickAttempts,1);
  assert.equal(r.f.trickFullRotations,1);
  assert.equal(r.f.landingBoostActivations,1);
  assert.equal(r.f.trickQualifiedLandings,1);
  assert.equal(r.f.lastTrickResult,"perfect");
  near(r.f.trickPeakDegrees,360,.01);
  assert.ok(r.f.landingBoostTimer>1.4);
  assert.equal(r.f.falls,0);
  // Flight is pilot-directed, not auto-centered; validate legal landing lane.
   assert.ok(Math.abs(r.f.lateral)<widthAt(r.f.s)*.5);
  let peak=1;
  for(let i=0;i<160;i++){
   stepFlight(r.f,1/120,{steer:0,grip:false});
   peak=Math.max(peak,r.f.landingBoostMultiplier);
  }
  assert.ok(peak>=1.21&&peak<=1.221);
 }
});
test("without GRIP or without enough rotation, no air trick or bonus occurs",()=>{
 const normal=leap(1,0,false,.7),tooLate=leap(1,0,true,.7,.73);
 assert.equal(normal.completed,0);assert.equal(normal.awards,0);
 assert.equal(normal.f.landingBoostActivations,0);
 assert.equal(tooLate.completed,0);assert.equal(tooLate.awards,0);
 assert.equal(tooLate.f.landingBoostActivations,0);
 assert.equal(tooLate.f.lastTrickFailReason,"incomplete");
});
test("GRIP air roll follows LEFT/RIGHT stick and bank orientation (0.8.1.1)",()=>{
 const game=source("./game-v081.mjs"),thrusters=source("./flight/side-thrusters-v061.mjs");
 // Left touch/stick or A/ArrowLeft produces negative steering.
 assert.ok(game.includes('const keyboard=(keyRight?1:0)-(keyLeft?1:0);'));
 assert.ok(game.includes('uiState.inputX=clamp((e.clientX-(rect.left+rect.width*.5))/59,-1,1);'));
 // The production renderer MUST negate input-signed trickVisualAngle.
 // In Three.js a +Z craft roll lowers the craft's left (-X) wing.
 assert.ok(game.includes('ship.rotation.z=motion.roll-bankAt(view.s)-')&&
  game.includes('(view.trickVisualAngle??0)-'),
  "visual roll must invert the stored steering sign");
 assert.ok(thrusters.includes('activeSide=-Math.sign(direction)'),
  "left roll should fire the right wing side jet, and vice versa");
 for(const steer of [-.74,.74]){
  const st=initAirTrickState({grounded:false,railContacts:0,lateral:0});
  beginAirTrick(st,1);
  const result=advanceAirTrick(st,1/60,steer,true);
  assert.ok(result.started&&st.trickAngle>0);
  assert.equal(st.trickDirection,Math.sign(steer));
  // The previous game bug added this angle instead of subtracting it.
  const signedShipRoll=-st.trickVisualAngle;
  const normalBank=createFlightMotionState();
  for(let k=0;k<18;k++)
   stepFlightMotion(normalBank,{steering:steer,trackBank:0,
    yawRate:0,sideVelocity:0,heading:0,vy:0},1/120,k/120);
  assert.equal(Math.sign(signedShipRoll),Math.sign(normalBank.roll),
   "air roll must agree with ground GRIP bank for "+steer);
  assert.equal(Math.sign(signedShipRoll),-Math.sign(steer));
  // Opposite wing physically supplies the torque: left = right jet.
  const firingWing=-Math.sign(st.trickDirection);
  assert.equal(firingWing,-Math.sign(steer));
 }
 const index=source("./index.html"),boot=source("./boot-v081.js");
 assert.ok(index.includes('boot-v0103.js?v=0.10.3'));
 assert.ok(boot.includes('game-v081.mjs?v=0.8.1.1'));
});
test("active production has one GRIP button for steering and air roll",()=>{
 const html=source("./index.html"),boot=source("./boot-v0103.js"),
  game=source("./game-v0103.mjs"),css=source("./style-v081.css");
 assert.match(html,/data-game-module="game-v0103\.mjs"/);
 assert.match(html,/style-v083\.css/);
 assert.match(html,/hold GRIP \+ steer/);
 assert.match(boot,/game-v0103\.mjs\?v=0\.10\.3/);
 assert.match(game,/version:"0\.10\.3"/);
 assert.match(game,/trial-v0901\.mjs/);
 assert.match(game,/smooth-track-v0901\.mjs/);
 assert.match(game,/aero-barrier-v0901\.mjs/);
 assert.match(game,/premium-track-v0901\.mjs/);
 assert.match(game,/cinematic-v0901\.mjs/);
 assert.match(game,/sideThrusters\?\.frame\(airThruster\?1/);
 assert.match(game,/grip:gripHeld\}/);
 assert.doesNotMatch(game,/trick:uiState\.jumpHeld/);
 assert.match(game,/skyshift-premium-ship-v0103-audit\.json/);
 assert.match(css,/#mobile-controls #jump-btn\{display:none!important\}/);
 assert.match(source("./trial-v080.mjs"),/skyline-airtricks-v080/);
});
