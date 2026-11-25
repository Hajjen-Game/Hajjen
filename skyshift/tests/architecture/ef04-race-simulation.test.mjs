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
