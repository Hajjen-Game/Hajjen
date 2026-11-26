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
 const probes=readFileSync(new URL('../../qa/race-probes.mjs',import.meta.url),'utf8');
 assert.match(live,/import \{installFlightTuningPanel,installRaceQa\} from "\.\/qa\/race-probes\.mjs";/);
 assert.match(live,/installRaceQa\(\{window,document,location,performance,ctx:\{get flight\(\)\{return flight\}/);
 assert.match(live,/snapRacePose,raceSimulation,chaseCameraController,inShadowTunnel/);
 assert.match(probes,/window\.__skyshiftTrackRepairTeleport=\(s=3180\)=>\{[\s\S]*?if\(isVault\(\)\)\{\s*chaseCameraController\.snap\(ctx\.flight,ctx\.motionState,ctx\.cinematicState,true\);/);
 assert.doesNotMatch(live,/\b(?:CAMERA_INFO|CAMERA_VIEW|CAMERA_BASE_POSITION|CAMERA_TARGET_POSITION|CAMERA_TARGET_LOOK|SHADOW_NORMAL|SHADOW_PLANE_NORMAL)\b/);
});

import {clearRaceInput,installRaceInput} from '../../ui/race-input.mjs';
import {createRaceTelemetry} from '../../core/race-diagnostics.mjs';

test('EF04 keyboard and touch input ownership preserves simultaneous GRIP and steering, cancellation and pause',()=>{
 const element=()=>{
  const handlers=new Map(),classes=new Set(),attrs=new Map();
  return {handlers,classes,attrs,style:{setProperty(){}},classList:{add:(...a)=>a.forEach(x=>classes.add(x)),remove:(...a)=>a.forEach(x=>classes.delete(x))},
   addEventListener:(k,fn)=>handlers.set(k,fn),setAttribute:(k,v)=>attrs.set(k,v),setPointerCapture(){},
   getBoundingClientRect:()=>({left:0,width:118})};
 };
 const UI=Object.fromEntries(['gripCue','grip','hud','knob','jump','controls','stick'].map(k=>[k,element()]));
 const uiState={mode:'playing',inputX:0,keys:new Set()};
 const globalHandlers=new Map(),document=element();
 const pause=()=>{uiState.mode='paused';clearRaceInput(UI,uiState);};
 installRaceInput({UI,uiState,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
  addEventListener:(k,fn)=>globalHandlers.set(k,fn),document,pause,resume:()=>uiState.mode='playing',
  closeSettings:()=>uiState.mode='menu',enterPlaying:()=>uiState.mode='playing'});
 const e=(pointerId,clientX=59)=>({pointerId,clientX,preventDefault(){}});
 UI.stick.handlers.get('pointerdown')(e(1,118));
 UI.grip.handlers.get('pointerdown')(e(2));
 assert.equal(uiState.inputX,1);assert.equal(uiState.gripHeld,true);
 UI.grip.handlers.get('pointercancel')(e(3));assert.equal(uiState.gripHeld,true);
 UI.grip.handlers.get('lostpointercapture')(e(2));assert.equal(uiState.gripHeld,false);
 assert.equal(uiState.inputX,1);
 UI.stick.handlers.get('pointerup')(e(1));assert.equal(uiState.inputX,0);
 globalHandlers.get('keydown')({code:'KeyD',preventDefault(){}});
 assert.equal(readRaceInput(uiState).steer,.74);
 globalHandlers.get('blur')();assert.equal(uiState.mode,'paused');
 assert.equal(uiState.keys.size,0);assert.equal(uiState.gripPointer,null);
 assert.equal(UI.knob.style.transform,'translateX(0px)');
});
test('EF04 diagnostics preserve telemetry rounding, order, property precedence and reset',()=>{
 const t=createRaceTelemetry(),f={s:5.4,elapsed:1.23456};
 t.record(f,'launch',{pad:'test'});t.record(f,'other',{s:99});
 assert.deepEqual(t.events,[{type:'launch',s:5,t:1.235,pad:'test'},{type:'other',s:99,t:1.235}]);
 t.reset();assert.deepEqual(t.events,[]);
});
test('EF04 HUD, input and exported run report retain original computation bodies',()=>{
 const old=readHistoricalGameMigrationSource();
 const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
 const slice=(a,b)=>{const start=old.indexOf(a);const end=old.indexOf(b,start+1);assert.ok(start>=0&&end>start);return old.slice(start+a.length,end);};
 const input=read('ui/race-input.mjs'),hud=read('ui/race-hud.mjs'),audit=read('core/race-diagnostics.mjs'),live=read('game-v0210.mjs');
 assert.ok(input.includes(slice('function clearInput(){\n','\n}\nfunction resetFlight(){')));
 assert.ok(input.includes(slice(' UI.export.addEventListener("click",exportAudit);\n','\n}\ntry{\n // Wire the buttons')));
 assert.ok(hud.includes(slice('function refreshHud(){\n','\n}\nfunction maybeShowCue(){')));
 assert.ok(hud.includes(slice('function maybeShowCue(){\n','\n}\nfunction integrate(dt){')));
 const prior=slice('   run:{','\n   },events:telemetry').replaceAll('frameClock.','raceSimulation.clock.');
 assert.ok(audit.includes(prior),'Original run report fields and calculations');
 assert.match(live,/installRaceInput\(\{UI,uiState/);
 assert.match(live,/raceHud\.refreshHud\(flight,zoneWave/);
 assert.match(live,/run:createRunAudit\(\{/);
});

import {createTrackSampler} from '../../tracks/shared/track-sampler.mjs';
import {createCameraFraming,CINEMATIC_DEFAULTS,createCinematicState} from '../../flight/cinematic-camera.mjs';

test('EF04 generic curved, elevated and banked loop samples independently of any authored playable course',()=>{
 const lapLength=80,lapPosition=s=>((s%lapLength)+lapLength)%lapLength;
 const sections=Array.from({length:4},(_,i)=>({id:'arc'+i,type:'turn',start:i*20,end:(i+1)*20,entry:2,hold:16,exit:2,curvature:Math.PI/36}));
 const elevationAt=s=>2*(1-Math.cos(lapPosition(s)*Math.PI/40));
 const gradeAt=s=>Math.PI/20*Math.sin(lapPosition(s)*Math.PI/40);
 const groundNormalAt=(s,heading)=>{
  const g=gradeAt(s),n=Math.hypot(1,g);
  return {x:-g*Math.sin(heading)/n,y:1/n,z:g*Math.cos(heading)/n};
 };
 const magneticBankAt=s=>.4*Math.sin(lapPosition(s)*Math.PI/40);
 const corkscrewBankAt=s=>lapPosition(s)>=40&&lapPosition(s)<60?-2*Math.PI*(lapPosition(s)-40)/20:0;
 const track=createTrackSampler({lapLength,sections,lapPosition,elevationAt,groundNormalAt,magneticBankAt,corkscrewBankAt});
 const near=(a,b,eps=1e-8)=>assert.ok(Math.abs(a-b)<eps,a+' != '+b);
 const p=track.poseAt(0),q=track.poseAt(80);
 near(p.x,q.x);near(p.z,q.z);near(p.y,q.y);near(q.heading-p.heading,2*Math.PI);
 assert.ok(track.LOOP_CLOSURE_ERROR_METERS<.01);
 assert.ok(track.curvatureAt(10)>0);assert.ok(track.heightAt(40)>3.9);
 for(const s of [0,5,10,20,42,50,58,79.9,90,130]){
  const n=track.surfaceNormalAt(s),center=track.positionAt(s),right=track.positionAt(s,2),up=track.positionAt(s,0,1.05);
  near(Math.hypot(n.x,n.y,n.z),1);
  near(Math.hypot(right.x-center.x,right.y-center.y,right.z-center.z),2);
  near((right.x-center.x)*n.x+(right.y-center.y)*n.y+(right.z-center.z)*n.z,0);
  near(up.x-center.x,n.x*1.05);near(up.y-center.y,n.y*1.05);near(up.z-center.z,n.z*1.05);
  near(track.surfaceHeightAt(s,2),right.y);
 }
 const camera=createCameraFraming({heightAt:track.heightAt,bankAt:track.bankAt,CORKSCREW:{start:40,end:60},lapLength});
 near(camera.cameraBankAt(20),track.bankAt(20)*.46);
 near(camera.cameraBankAt(50),track.bankAt(50));near(camera.cameraBankAt(130),track.bankAt(130));
 const point=track.positionAt(130,0,1.05);
 const view={s:130,worldX:point.x,worldZ:point.z,y:point.y,heading:track.headingAt(130),steering:.3};
 const copy=structuredClone(view),motion={cameraHeading:view.heading,hover:0},state=createCinematicState();
 const pose=camera.chasePose(view,motion,state,CINEMATIC_DEFAULTS);
 assert.ok(Object.values(pose).every(Number.isFinite));assert.deepEqual(view,copy);
 assert.ok(pose.y<view.y,'Inverted camera follows the actual road frame');
 const second=camera.chasePose({...view,s:50},motion,state,CINEMATIC_DEFAULTS);
 assert.deepEqual(second,pose,'Feature detection repeats at the injected lap length');
});
test('EF04 live track uses shared geometry without changing original sampler formulae',()=>{
 const original=readHistoricalTrialMigrationSource();
 const actual=readFileSync(new URL('../../tracks/shared/track-sampler.mjs',import.meta.url),'utf8');
 const unexport=s=>s.replace(/^export (function|const) /gm,'$1 ');
 for(const [a,b] of [['export function easedCurvature(u){','// Precision GRIP APEX:'],['const positionCount=Math.round(CIRCUIT.lapLength/STEP);','// 0.8.3 FAST LOCAL PROJECTION.']]){
  const start=original.indexOf(a),end=original.indexOf(b,start);
  assert.ok(start>=0&&end>start);assert.ok(actual.includes(unexport(original.slice(start,end))));
 }
 assert.doesNotMatch(actual,/\b(?:isVault|isAurora|ACTIVE_TRACK_0160|globalThis|document)\b/);
 const adapter=readFileSync(new URL('../../tracks/trials/trial-v0165.mjs',import.meta.url),'utf8');
 assert.match(adapter,/createTrackSampler\(\{\s*lapLength:CIRCUIT\.lapLength/);
 assert.match(adapter,/rules:TRIAL,circuit:CIRCUIT,jump:SKYLINE_LEAP/);
});

import {createRaceLifecycle} from '../../core/race-lifecycle.mjs';
import {installRaceQa} from '../../qa/race-probes.mjs';
import {inventory} from './dependency-inventory-v2.mjs';
import {existsSync} from 'node:fs';
test('EF04 race lifecycle preserves pause, resume and safe abandonment',()=>{
 const node=()=>({classList:{add(){},remove(){},toggle(){}},textContent:''});
 const UI=new Proxy({}, {get:()=>node()}),uiState={mode:'menu'},calls=[],world={visible:false},clock={last:0,accum:9};
 let challenge=null;
 const ctx={sceneReady:true,world,get currentChallenge(){return challenge},setChallenge(c){challenge=c;calls.push('challenge')},app:node,hideGhost(){calls.push('hide')}};
 const life=createRaceLifecycle({UI,uiState,ctx,raceSession:{selectMode:c=>calls.push(c?'challenge-mode':'trial-mode'),ghostEnabled:true},timeTrialState:{mode:'time-trial'},resetFlight:()=>calls.push('reset'),refreshHud:()=>calls.push('hud'),hudBudget:{shouldUpdate(){}},clearInput:()=>calls.push('clear'),refreshTrialMenu:()=>calls.push('menu'),worldClock:clock,event:k=>calls.push(k),now:()=>99,clearTimeout(){}});
 life.returnToMainMenu();assert.deepEqual(calls,[]);
 life.enterPlaying();assert.equal(uiState.mode,'playing');assert.equal(world.visible,true);assert.deepEqual(calls.slice(0,4),['challenge','trial-mode','reset','time_trial_start']);
 life.pause();assert.equal(uiState.mode,'paused');assert.ok(calls.includes('clear'));
 life.resume();assert.equal(uiState.mode,'playing');assert.deepEqual(clock,{last:99,accum:0});
 life.pause();life.returnToMainMenu();assert.equal(uiState.mode,'menu');assert.equal(challenge,null);
});
test('EF04 smoke mutation hooks remain opt-in and read-only compatibility probes remain available',()=>{
 const window={},ctx={};
 installRaceQa({window,location:{search:''},ctx});
 for(const k of ['__skyshiftWaveSmoke','__skyshiftTunnelSmoke','__skyshiftWakeSmoke','__skyshiftFlapSet','__skyshiftSparkSmoke','__skyshiftTrackRepairTeleport','__skyshiftFleetSmokeUnlock','__skyshiftChallengeSmokeFinish','__skyshiftRiskPhysicsSmoke'])assert.equal(window[k],undefined,k);
 for(const k of ['__skyshiftFleetProbe','__skyshiftScreenBeamProbe','__skyshiftHandlingParityProbe','__skyshiftPerfProbe'])assert.equal(typeof window[k],'function',k);
});
test('EF04 root owner entries reconciled with current graph and surviving known consumers',()=>{
 const ledger=JSON.parse(readFileSync(new URL('../../docs/architecture/ef04-owner-reconciliation.json',import.meta.url),'utf8'));
 const prior=JSON.parse(readFileSync(new URL('../../docs/architecture/ef02-final-owner-ledger.json',import.meta.url),'utf8'));
 assert.deepEqual(ledger.entries.map(e=>e.path),prior.entries.filter(e=>e.ownerStage==='EF04').map(e=>e.currentPath));
 const graph=new Set(inventory().literalBrowserGraph.paths);
 const rows=ledger.entries.map(e=>({path:e.path,live:graph.has(e.path.slice('skyshift/'.length)),exists:existsSync(new URL('../../../'+e.path,import.meta.url)),survivingKnownConsumers:e.knownConsumers.filter(p=>existsSync(new URL('../../../'+p,import.meta.url)))}));
 const retired=ledger.entries.filter(e=>e.disposition.startsWith('retired:'));
 assert.deepEqual(retired.map(e=>e.path),retirementEF04.files.map(e=>e.path));
 assert.ok(rows.every(r=>r.exists!==retired.some(e=>e.path===r.path)),'Unexpected retirement or restored obsolete source');
 for(const r of rows)assert.equal(r.live,ledger.entries.find(e=>e.path===r.path).verifiedLiveLiteral,r.path+' graph role changed');
 for(const p of ['core/race-lifecycle.mjs','qa/race-probes.mjs','tracks/shared/track-sampler.mjs','flight/flight-physics.mjs'])assert.ok(graph.has(p),p);
 console.log('SKYSHIFT_EF04_OWNER_RECONCILIATION '+JSON.stringify(rows));
});

import {createPowerCarveAPI} from '../../flight/power-carve.mjs';
test('EF04 current Power Carve replaces old racecraft behavior on an independent route with injected rhythm and lap count',()=>{
 const config={version:'synthetic',lapLength:80,laps:5,releaseSeconds:1.65,
  precisionWindows:[{id:'a',name:'A',start:10,end:20,minGripSeconds:.18},{id:'b',name:'B',start:35,end:45,minGripSeconds:.22}],
  rhythmAt:s=>s>=10&&s<20?'APEX':s>=35&&s<45?'LINK':'FLOW',
  maxFovAdditionDegrees:3.25,maxCameraLeanRadians:.038,maxCameraShiftMeters:.62,maxCameraPullbackMeters:.45,maxHullCarveRadians:.099,extraDrawCalls:0};
 const api=createPowerCarveAPI(config,()=>{throw Error('Generic route must not consult historical track selector');});
 assert.equal(api.raceRhythmAt(92),'APEX');assert.equal(api.raceRhythmAt(-40),'LINK');
 assert.equal(api.raceWindowAt(90),0);assert.equal(api.raceWindowAt(100),-1);
 const dt=1/120,st=api.createRacingExperience();
 const flight={s:0,grounded:true,gripIntensity:.95,steering:.8,yawRate:.7,railContacts:0,elapsed:0};
 const drive=(state,lap,window,variant={})=>{
  const f={...flight,...variant};const start=(lap-1)*80+window.start;
  for(let i=0;i<80;i++){
   f.s=start+.1+(window.end-window.start-.2)*i/80;f.elapsed+=dt;
   const copy={...f};api.observeRacingStep(state,f,dt);assert.deepEqual(f,copy);
  }
  f.s=(lap-1)*80+window.end+.01;
  return api.observeRacingStep(state,f,dt);
 };
 assert.equal(drive(st,1,config.precisionWindows[0]).chain,1);
 assert.equal(drive(st,1,config.precisionWindows[1]).chain,2);
 assert.equal(drive(st,1,config.precisionWindows[0]),null);
 assert.equal(drive(st,4,config.precisionWindows[0]).lap,4);
 assert.equal(drive(st,5,config.precisionWindows[0]).lap,5);
 assert.equal(st.cleanCarves,4);assert.equal(st.maxFlowChain,2);
 for(const variant of [{gripIntensity:0},{yawRate:0},{steering:0}]){
  const bad=api.createRacingExperience();assert.equal(drive(bad,1,config.precisionWindows[0],variant),null);
  assert.equal(bad.cleanCarves,0);assert.equal(bad.missedCarves,1);
 }
 const frame={s:12,steering:.93,yawRate:.78,gripIntensity:1,speed:95,grounded:true,playing:true};
 const a=api.createRacingExperience(),b=api.createRacingExperience(),idle=api.createRacingExperience();
 for(let i=0;i<120;i++)api.stepRacingExperience(a,dt,frame);
 for(let i=0;i<60;i++)api.stepRacingExperience(b,1/60,frame);
 for(let i=0;i<120;i++)api.stepRacingExperience(idle,dt,{...frame,gripIntensity:0});
 assert.ok(a.gripEnergy>.64&&Math.abs(a.hullCarve)>.04&&a.fovAddition>1.75);
 assert.equal(idle.gripEnergy,0);assert.equal(idle.hullCarve,0);
 for(const k of ['fovAddition','cameraLean','cameraShiftMeters','cameraPullbackMeters','hullCarve','engineLift'])assert.ok(Math.abs(a[k]-b[k])<1e-4,k);
 const pause=structuredClone(a);api.stepRacingExperience(a,dt,{...frame,playing:false});assert.deepEqual(a,pause);
 for(const protectedView of [{grounded:false},{wall:true},{corkscrew:true}]){
  const p=api.createRacingExperience();
  for(let i=0;i<120;i++)api.stepRacingExperience(p,dt,frame);
  for(let i=0;i<180;i++)api.stepRacingExperience(p,dt,{...frame,...protectedView});
  assert.ok(Math.abs(p.hullCarve)<1e-5&&Math.abs(p.cameraLean)<1e-5&&p.fovAddition<.003);
  assert.equal(api.racingExperienceAudit(p).physicalFlightUnchanged,true);
 }
 api.resetRacingExperience(st);assert.equal(st.completedWindowKeys.size,0);assert.equal(st.cleanCarves,0);
});

import {retirementEF04,readHistorical} from './legacy-retirement-l1a.mjs';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {resolve,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {expectedRootFiles} from './root-count-contract.mjs';
import {readdirSync} from 'node:fs';
test('EF04 retired racecraft source is recoverable, absent and has no executable consumers',()=>{
 const repo=fileURLToPath(new URL('../../../',import.meta.url));
 const graph=inventory().literalBrowserGraph.paths;
 assert.equal(readdirSync(resolve(repo,'skyshift'),{withFileTypes:true}).filter(e=>e.isFile()).length,expectedRootFiles);
 for(const f of retirementEF04.files){
  assert.ok(!existsSync(resolve(repo,f.path)),f.path);
  assert.ok(!graph.includes(f.path.slice('skyshift/'.length)),f.path);
  const source=readHistorical(resolve(repo,f.path));
  const b=Buffer.from(source);assert.equal(b.length,f.bytes);
  assert.equal(createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),f.sha);
  const checked=spawnSync(process.execPath,['--check','--input-type=module'],{input:source,encoding:'utf8'});assert.equal(checked.status,0,checked.stderr);
  const migrated=readFileSync(resolve(repo,f.originalReader),'utf8');
  assert.match(migrated,/from "\.\.\/\.\.\/racing-experience-v0121\.mjs"/);
  assert.match(migrated,/createSectorLandmarkData\(positionAt,widthAt\)/);
  assert.match(migrated,/assert\.equal\(data\.minLateralClearance,3\.9\)/);
  for(const p of execFileSync('git',['ls-files','-z'],{cwd:repo,encoding:'utf8',maxBuffer:16*1024*1024}).split('\0').filter(Boolean)){
   if(!/\.(?:mjs|js|cjs|ts|html|css|json|ya?ml|sh|py|txt|gltf)$/.test(p)||p.startsWith('skyshift/tests/architecture/')||p.startsWith('skyshift/docs/architecture/')||/migration-manifest|baseline|consumer-inventory|consumer-queue/.test(p))continue;
   assert.ok(!readFileSync(resolve(repo,p),'utf8').includes(basename(f.path)),p+' stale retired source reference');
  }
 }
});
