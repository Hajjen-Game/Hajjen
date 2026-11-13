import test from "node:test";
import assert from "node:assert/strict";
import {
 clamp,TRIAL,GAPS,SECTORS,headingAt,poseAt,positionAt,onRoad,roadIntervals,
 sectorAt,checkpointFor,speedAt,newFlightState,stepFlight,validateTrial
} from "./trial-v02.mjs";
const dt=1/120;
const advance=(state,target,control=()=>({}))=>{
  let steps=0,crashes=0;
  while(state.s<target && !state.failed && !state.finished && steps++<16000){
    const r=stepFlight(state,dt,control(state));
    crashes+=Number(r.crashed);
    if(crashes)break;
  }
  return {state,crashes,steps};
};

test("authored road is connected in world space and contains actual straight lines",()=>{
 const a=poseAt(10),b=poseAt(50),c=poseAt(85);
 assert.ok(Math.abs(a.x-b.x)<1e-9 && Math.abs(b.x-c.x)<1e-9);
 assert.ok(Math.abs(headingAt(45))<1e-9);
 for(let s=1;s<TRIAL.length;s++){
   const a=poseAt(s),b=poseAt(s+.05);
   assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<.08);
 }
});
test("authored gaps and split roads are real collision voids",()=>{
 assert.equal(onRoad(145,0),true);
 for(const g of GAPS) {
   assert.deepEqual(roadIntervals((g.start+g.end)/2),[]);
   assert.equal(onRoad((g.start+g.end)/2,0),false);
   assert.equal(onRoad(g.end+1,0),true);
 }
 assert.equal(onRoad(475,0),false);
 assert.equal(onRoad(475,-4),true);
 assert.equal(onRoad(475,4),true);
});
test("all authored gaps require jumping and remain mathematically viable",()=>{
 assert.deepEqual(validateTrial(),[]);
 for(const g of GAPS) {
   const s=newFlightState();
   s.s=g.start-12;
   s.y=poseAt(s.s).y+TRIAL.hoverHeight;
   const result=advance(s,g.end+15);
   assert.equal(result.crashes,1,g.id+" must be impossible to coast across");
 }
});
test("properly timed jumps clear the first real gap",()=>{
 const s=newFlightState();
 let pressed=false;
 const result=advance(s,185,st=>{
   const jump=!pressed && st.s>=148;
   if(jump)pressed=true;
   return {steer:0,jumpPressed:jump,jumpHeld:pressed && st.vy>=0};
 });
 assert.equal(result.crashes,0);
 assert.equal(s.jumps,1);
 assert.ok(s.clearedGaps.includes("the-leap"));
 assert.ok(s.s>=185);
});
test("landings only happen on downward crossings from above the surface",()=>{
 const s=newFlightState();
 s.s=167;s.y=-3;s.vy=-5;s.grounded=false;
 stepFlight(s,dt,{});
 assert.equal(s.grounded,false);
 assert.equal(s.landings,0);
});
test("camera-aligned track coordinates follow authored heading",()=>{
 const p=poseAt(245),q=positionAt(245,3,1.5);
 assert.ok(Math.abs(Math.hypot(p.rightX,p.rightZ)-1)<1e-10);
 assert.ok(Math.abs(q.x-p.x-3*p.rightX)<1e-7);
 assert.ok(Math.abs(q.z-p.z-3*p.rightZ)<1e-7);
 assert.ok(Math.abs(q.y-p.y-1.5)<1e-7);
});
test("finite 3-sector trial has a proper finish and safe checkpoints",()=>{
 assert.equal(sectorAt(20),0);assert.equal(sectorAt(440),1);assert.equal(sectorAt(900),2);
 assert.equal(checkpointFor(765),754);
 assert.ok(speedAt(500)>speedAt(0));
 assert.equal(onRoad(980,0),false);
 const s=newFlightState();s.s=TRIAL.length-.02;
 s.y=poseAt(s.s).y+TRIAL.hoverHeight;
 const r=stepFlight(s,dt,{});
 assert.equal(r.finished,true);assert.equal(s.finished,true);
});

test("every authored jump has a viable takeoff window at its actual speed",()=>{
 for(const gap of GAPS) {
   const state=newFlightState();
   state.s=gap.start-14;
   state.y=poseAt(state.s).y+TRIAL.hoverHeight;
   state.checkpoint=checkpointFor(state.s);
   let pressed=false;
   const result=advance(state,gap.end+10,st=>{
     const press=!pressed&&st.s>=gap.start-4.2;
     if(press)pressed=true;
     return {steer:0,jumpPressed:press,jumpHeld:pressed&&st.vy>0};
   });
   assert.equal(result.crashes,0,gap.id+" should be jumpable from the intended window");
   assert.equal(state.jumps,1,gap.id+" needs only one jump");
   assert.ok(state.clearedGaps.includes(gap.id),gap.id+" should record a clear");
 }
});
test("split road is steerable into either authored route",()=>{
 for(const direction of [-1,1]){
   const state=newFlightState();
   state.s=410;state.y=poseAt(410).y+TRIAL.hoverHeight;
   state.checkpoint=checkpointFor(state.s);
   const r=advance(state,510,st=>({
     steer:clamp(direction*4.3-st.lateral,-1,1),
     jumpPressed:false,jumpHeld:false
   }));
   assert.equal(r.crashes,0);
   assert.ok(state.s>=510);
   assert.ok(Math.abs(state.lateral)>3.4);
 }
});
