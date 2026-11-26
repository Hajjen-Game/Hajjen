import test from 'node:test';
import assert from 'node:assert/strict';

import {createRaceSimulation,resetRaceSimulation,advanceRaceSimulation,snapRacePose,raceRenderPose,readRaceInput,raceOutcome} from '../../core/race-simulation.mjs';
import {PACING,createFrameClock,advanceFrame,capturePose,interpolatePose,shouldSnapPose} from '../../core/frame-pacing-v0112.mjs';

test('EF04 race simulation preserves exact original frame clock, snapshots and interpolation',()=>{
 const make=()=>({worldX:0,worldZ:0,y:1,heading:3.13,s:0,lateral:0,steering:0,vy:0,yawRate:0,sideVelocity:0,grounded:true,trickVisualAngle:0,trickActive:false});
 const a=make(),b=make(),state=createRaceSimulation();
 resetRaceSimulation(state,a);
 const clock=createFrameClock(),view={};
 let current=capturePose(b),previous=current,alpha=0;
 let steps=0,referenceSteps=0;
 const move=(f,step,n)=>{
  assert.equal(step,PACING.fixedStep);
  f.s+=step*44;f.worldX+=step*44;f.heading=-3.13;
  f.trickVisualAngle=n===8?6.2:n===9?0:f.trickVisualAngle;
  if(n===14)f.worldX+=30;
 };
 for(const dt of [0,.003,.006,.017,.035,.095,2,.016,.004,.02]){
  const actual=advanceRaceSimulation(state,dt,a,step=>move(a,step,++steps));
  const expected=advanceFrame(clock,dt,step=>{
   if(!current)current=capturePose(b);
   if(!previous||previous===current)previous=capturePose(current);
   capturePose(current,previous);move(b,step,++referenceSteps);capturePose(b,current);
   if(shouldSnapPose(previous,current))capturePose(current,previous);
  });
  alpha=expected.alpha;
  assert.deepEqual(actual,expected);assert.deepEqual(state.clock,clock);
  assert.deepEqual(state.current,current);assert.deepEqual(state.previous,previous);
  assert.deepEqual(raceRenderPose(state,a,true),interpolatePose(previous,current,alpha,view));
  assert.equal(raceRenderPose(state,a,false),a);
 }
 assert.equal(steps,referenceSteps);assert.ok(state.clock.droppedSeconds>0);
 const oldAlpha=state.alpha;
 snapRacePose(state,a,false);assert.equal(state.alpha,oldAlpha);assert.equal(state.current,state.previous);
 snapRacePose(state,a);assert.equal(state.alpha,0);assert.equal(state.current,state.previous);
 resetRaceSimulation(state,a);assert.deepEqual(state.clock,createFrameClock());
});

test('EF04 race input and finish decisions match original keyboard, touch and challenge behavior',()=>{
 for(const keys of [[],['ArrowLeft'],['KeyA','KeyD'],['ArrowRight','ShiftLeft'],['KeyD','ShiftRight']]){
  for(const inputX of [-1,-.5,0,.5,1])for(const gripHeld of [false,true]){
   const input={keys:new Set(keys),inputX,gripHeld};
   const keyboard=(input.keys.has('ArrowRight')||input.keys.has('KeyD')?1:0)-(input.keys.has('ArrowLeft')||input.keys.has('KeyA')?1:0);
   assert.deepEqual(readRaceInput(input),{steer:Math.max(-1,Math.min(1,keyboard*.74+inputX)),grip:gripHeld||input.keys.has('ShiftLeft')||input.keys.has('ShiftRight')});
  }
 }
 for(const s of [9,10,11])for(const failed of [false,true])for(const finished of [false,true]){
  const flight={s,failed},result={finished};
  assert.equal(raceOutcome(flight,result,null),finished?true:failed?false:null);
  const reached=s>=10&&!failed;
  assert.equal(raceOutcome(flight,result,{endS:10}),reached||failed?reached:null);
 }
});

import {readFileSync} from 'node:fs';
import {createFlightPhysics} from '../../flight/flight-physics.mjs';
import {createGroupedBoostAPI} from '../../flight/boost/grouped-boost.mjs';
import {readHistoricalTrialMigrationSource} from './ef02-closure-trial-overlay.mjs';

test('EF04 extracted flight state and physics are exact original function bodies',()=>{
 const original=readHistoricalTrialMigrationSource();
 const engine=readFileSync(new URL('../../flight/flight-physics.mjs',import.meta.url),'utf8');
 const start=original.indexOf('export function newFlightState(){');
 const end=original.indexOf('export function validateTrial(){');
 assert.ok(start>=0&&end>start);
 const expected=original.slice(start,end).replace('export function newFlightState','function newFlightState').replace('export function stepFlight','function stepFlight');
 assert.ok(engine.includes(expected),'Physics body changed during extraction');
 const adapter=readFileSync(new URL('../../tracks/trials/trial-v0165.mjs',import.meta.url),'utf8');
 assert.match(adapter,/export const \{newFlightState,stepFlight\}=createFlightPhysics\(/);
 assert.doesNotMatch(engine,/from ["'][^"']*track-selection/);
 // Ignore full-line comments, including the original "trick window" explanation.
 const executable=engine.split('\n').filter(line=>!/^\s*\/\//.test(line)).join('\n');
 assert.doesNotMatch(executable,/\b(?:window|document|location|localStorage)\b/);
});

function syntheticTrack({jump=false,wall=false,screw=false}={}){
 const rules={startSpeed:44,raceLength:300,hoverHeight:1.05,gravity:22,
  fallDepth:8.5,shieldPenalty:20,maxYawRate:1.24,turnResponse:24,turnRelease:36,
  zoneAccelerationSeconds:.85};
 const circuit={lapLength:100,laps:3};
 const leap={start:jump?10:1000,approachStart:0,minTakeoffSpeed:35,launchVelocity:9};
 const gapAt=s=>jump&&s>=10&&s<25?{start:10,end:25}:null;
 const inWall=s=>wall&&s>=12&&s<22;
 const inScrew=s=>screw&&s>=12&&s<22;
 const bankAt=s=>inWall(s)?Math.PI/3:inScrew(s)?Math.PI:0;
 const positionAt=(s,lateral=0,height=0)=>({x:lateral,y:height,z:-s});
 const track={rules,circuit,jump:leap,positionAt,headingAt:()=>0,
  surfaceHeightAt:()=>0,lapPosition:s=>s%100,nextGap:s=>jump&&s<10?{start:10}:null,
  speedAt:()=>44,corkscrewAt:inScrew,bankAt,poseAt:()=>({rightX:1,rightZ:0}),
  projectWorldToTrack:(x,z)=>({s:-z,lateral:x}),constrainToGuardrail:()=>false,
  gripApexAt:()=>false,bankDegreesAt:s=>bankAt(s)*180/Math.PI,
  onRoad:s=>!gapAt(s),surfaceNormalAt:s=>({y:Math.cos(bankAt(s))}),gapAt,
  guardrailLateralLimit:()=>10,magneticWallAt:inWall,corkscrewBankAt:s=>inScrew(s)?Math.PI:0,
  shapeSteer:x=>x};
 const boost=createGroupedBoostAPI({multiplier:1.4,durationSeconds:.92,attackSeconds:.15,releaseSeconds:.23},()=>null);
 return createFlightPhysics(track,boost);
}
test('EF04 synthetic no-gap, jump/trick/landing and magnetic features do not require a playable legacy track',()=>{
 const plain=syntheticTrack(),p=plain.newFlightState();
 for(let i=0;i<80;i++)plain.stepFlight(p,1/120,{steer:0,grip:true});
 assert.equal(p.autoLaunches,0);assert.equal(p.gripPreArmTicks,0);assert.equal(p.gripYawSuppressedTicks,0);
 const leap=syntheticTrack({jump:true}),f=leap.newFlightState();
 let launched=false,landed=false,awarded=false;
 for(let i=0;i<240&&!landed;i++){
  const result=leap.stepFlight(f,1/120,{steer:f.grounded?0:1,grip:!f.grounded});
  launched||=result.jumped;landed||=result.landed;awarded||=result.landingBoostAwarded;
 }
 assert.ok(launched,'Synthetic lip launches');assert.ok(landed,'Synthetic gap lands');
 assert.equal(f.trickFullRotations,1);assert.ok(awarded,'Clean aligned synthetic roll earns landing boost');
 for(const kind of ['wall','screw']){
  const engine=syntheticTrack({[kind]:true}),state=engine.newFlightState();
  for(let i=0;i<80;i++)engine.stepFlight(state,1/120,{steer:0,grip:false});
  if(kind==='wall'){assert.equal(state.magneticEntries,1);assert.equal(state.magneticExits,1);}
  else {assert.equal(state.corkscrewEntries,1);assert.equal(state.corkscrewExits,1);assert.ok(state.corkscrewCeilingSeconds>0);}
 }
});

import {createRaceSession,readLegacyRaceBest,updateLegacyRaceBest} from '../../core/race-session.mjs';
import {createTimeTrialAPI} from '../../core/time-trial.mjs';

test('EF04 race session owns real pose, time trial lifecycle and persistent preference',()=>{
 const config={version:'fixture',trackId:'synthetic',trackRevision:'1',raceMeters:300,laps:3,
 sampleIntervalSeconds:.1,maxSamples:3600,maxStorageChars:340000,storageKey:'fixture-pb',ghostMaxDrawCalls:2};
 const api=createTimeTrialAPI(config),data=new Map();
 const store={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v))};
 const session=createRaceSession({api,sampleIntervalSeconds:.1,storage:()=>store,bankAt:()=>.2,pitchAt:()=>.1});
 const flight={elapsed:0,s:0,worldX:3,worldZ:-2,y:1,heading:.3,steering:1,trickVisualAngle:.4,lapTimes:[12,12,12],falls:0};
 session.selectMode(null);session.start('manta');session.record(flight,true);
 assert.deepEqual(session.trial.active.samples[0],[0,0,3,1,-2,.3,-.66,.1]);
 flight.elapsed=.05;session.record(flight);assert.equal(session.trial.samplesWritten,1);
 for(let i=1;i<=360;i++){flight.elapsed=i/10;flight.s=300*i/360;session.record(flight,i===360);}
 assert.equal(session.finish(true,flight).saved,true);
 const saved=data.get(config.storageKey);assert.ok(saved);
 assert.equal(session.toggleGhost(),false);assert.equal(data.get(api.GHOST_TOGGLE_KEY),'off');
 session.start('manta');assert.equal(session.trial.previousBest.duration,36);
 session.playbackFrame(true,37);assert.equal(session.trial.ghostVisibleFrames,1);assert.equal(session.trial.playbackEnded,true);
 session.selectMode({endS:20});session.start('manta');session.record(flight,true);
 assert.equal(session.trial.samplesWritten,0);assert.equal(session.finish(true,flight),null);
 assert.equal(data.get(config.storageKey),saved);
 session.selectMode(null);session.start('manta');session.start('stingray');
 assert.equal(data.get(config.storageKey),saved);
 assert.equal(session.ghostEnabled,false);
 assert.equal(readLegacyRaceBest(store),0);assert.equal(updateLegacyRaceBest(store,true,40),40);
 assert.equal(updateLegacyRaceBest(store,true,45),40);assert.equal(updateLegacyRaceBest(store,false,20),40);
 assert.equal(updateLegacyRaceBest(store,true,35),35);
 assert.equal(updateLegacyRaceBest(null,true,30),30);
});

import {readHistoricalGameMigrationSource} from './ef02-closure-ui-overlay.mjs';
test('EF04 camera and ship presentation preserve original transform formulas and live wiring',()=>{
 const original=readHistoricalGameMigrationSource();
 const start=original.indexOf('function placeShip(time,dt,view=flight,motion=motionState,cinematic=cinematicState){');
 const cut=original.indexOf(' // Low/close chase camera with bounded future curvature preview.',start);
 const end=original.indexOf('\n}\nfunction loop(now){',cut);
 assert.ok(start>=0&&cut>start&&end>cut);
 const hull=original.slice(original.indexOf('\n',start)+1,cut);
 const chase=original.slice(cut,end).replace('uiState.mode==="playing"?dt:0','playing?dt:0');
 const ship=readFileSync(new URL('../../ships/ship-presentation.mjs',import.meta.url),'utf8');
 const camera=readFileSync(new URL('../../flight/chase-camera-controller.mjs',import.meta.url),'utf8');
 assert.ok(ship.includes(hull),'Hull, engine and shadow formulas must remain exact');
 assert.ok(camera.includes(chase),'Chase, boost and protected track camera formulas must remain exact');
 const live=readFileSync(new URL('../../game-v0210.mjs',import.meta.url),'utf8');
 assert.match(live,/shipPresentation\.frame\(time,view,flight/);
 assert.match(live,/chaseCameraController\.apply\(camera,dt,view,flight/);
 assert.match(live,/chaseCameraController\.spawn\(camera,flight,motionState,cinematicState\)/);
 assert.match(live,/chaseCameraController\.snap\(flight,motionState,cinematicState,true\)/);
 assert.doesNotMatch(live,/\b(?:CAMERA_INFO|CAMERA_VIEW|CAMERA_BASE_POSITION|CAMERA_TARGET_POSITION|CAMERA_TARGET_LOOK|SHADOW_NORMAL|SHADOW_PLANE_NORMAL)\b/);
});
