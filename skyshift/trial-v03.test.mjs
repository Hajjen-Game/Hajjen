import test from "node:test";
import assert from "node:assert/strict";
import {
  TRIAL,GAPS,ISLANDS,SPLITS,RISK_CUTS,SECTORS,GEOMETRY_BREAKS,
  poseAt,positionAt,headingAt,heightAt,roadIntervals,onRoad,
  speedAt,sectorAt,checkpointFor,clamp,
  newFlightState,stepFlight,validateTrial
} from "./trial-v03.mjs";

const dt=1/120;
function simulate(state,target,pilot=()=>({}),limit=15000){
  let frames=0,crashes=0;
  while(state.s<target&&!state.finished&&!state.failed&&frames++<limit){
    const response=stepFlight(state,dt,pilot(state));
    if(response.crashed){crashes++;break;}
  }
  return {frames,crashes,state};
}
function placedState(s,lateral=0){
  const st=newFlightState();
  st.s=s;st.lateral=lateral;
  st.y=heightAt(s)+TRIAL.hoverHeight;
  st.checkpoint=checkpointFor(s);
  return st;
}
test("0.3 is a finite, authored trial with distinct speed, islands and optional split route",()=>{
  assert.equal(TRIAL.id,"first-flight-v2");
  assert.ok(TRIAL.length>=1100);
  assert.ok(ISLANDS.length>=2);
  assert.ok(GAPS.length>=6);
  assert.ok(SECTORS.length===3);
  assert.ok(Math.abs(headingAt(200))>.2);
  assert.equal(Math.abs(headingAt(40))<1e-9,true);
  assert.ok(heightAt(857)>4.4);
  assert.equal(heightAt(1100),0);
  assert.ok(speedAt(1000)>speedAt(100));
});
test("geometry and collision intervals follow exact matching world positions",()=>{
  assert.deepEqual(validateTrial(),[]);
  for(let i=0;i<GEOMETRY_BREAKS.length-1;i++)
    assert.ok(GEOMETRY_BREAKS[i+1]>GEOMETRY_BREAKS[i]);
  for(let s=0;s<TRIAL.length;s+=2){
    const a=poseAt(s),b=poseAt(s+.25);
    assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<.4,"discontinuity "+s);
  }
  for(const gap of GAPS){
    const m=(gap.start+gap.end)*.5;
    assert.deepEqual(roadIntervals(m),[],gap.id+" is a real empty segment");
    assert.equal(onRoad(m,0),false);
  }
});
test("first island forces left landing, second island forces right landing",()=>{
  assert.equal(onRoad(353,-2.2),true);
  assert.equal(onRoad(353,2.2),false);
  assert.equal(onRoad(399,2.2),true);
  assert.equal(onRoad(399,-2.2),false);
  assert.equal(onRoad(435,0),true);
});
test("risk route contains actual missing deck, safe route remains continuous",()=>{
  assert.equal(onRoad(575,0),false);
  assert.equal(onRoad(575,-4.5),true);
  assert.equal(onRoad(575,4.5),true);
  for(const cut of RISK_CUTS){
    const mid=(cut.start+cut.end)*.5;
    assert.equal(onRoad(mid,-4.5),true);
    assert.equal(onRoad(mid,4.5),false);
  }
});
test("coasting without jumping fails at each mandatory gap",()=>{
  for(const gap of GAPS){
    const lateral=gap.id==="island-two"?-2.2:
      gap.id==="island-three"?2.2:
      gap.id==="island-one"?-2.2:0;
    const st=placedState(gap.start-12,lateral);
    const result=simulate(st,gap.end+20);
    assert.equal(result.crashes,1,gap.id+" must not allow free coasting");
    assert.equal(st.jumps,0);
  }
});
test("well-timed jumps are viable across all main and island voids",()=>{
  for(const gap of GAPS){
    const initial=gap.id==="island-two"?-2.0:
      gap.id==="island-three"?2.0:
      gap.id==="island-one"?-2.0:0;
    const target=gap.id==="island-two"?2.2:initial;
    const st=placedState(gap.start-10,initial);
    let pressed=false;
    const result=simulate(st,gap.end+10,now=>{
      const jump=!pressed && now.s>=gap.start-2.5;
      if(jump)pressed=true;
      const steer=now.s>=gap.start-2.5?
        clamp((target-now.lateral)*.9,-1,1):0;
      return {steer,jumpPressed:jump,jumpHeld:pressed&&now.vy>0};
    });
    assert.equal(result.crashes,0,gap.id+" should permit a timed jump");
    assert.equal(st.jumps,1);
    assert.ok(st.clearedGaps.includes(gap.id),gap.id+" should clear");
  }
});
test("safe split route can be completed without jumping",()=>{
 const st=placedState(548,-4.7);
 const result=simulate(st,686,()=>({steer:0,jumpPressed:false}));
 assert.equal(result.crashes,0);
 assert.ok(st.s>=686);
 assert.equal(st.routeRewarded,false);
});
test("right risk lane rewards only successfully traversed jumping",()=>{
 const st=placedState(550,4.5);
 const cuts=RISK_CUTS.map(g=>({...g}));
 const triggered=new Set();
 let rewarded=false;
 let crash=0;
 for(let i=0;i<1200&&!st.failed&&!st.finished&&st.s<685;i++){
   const gap=cuts.find(g=>st.s>=g.start-2.4&&st.s<g.start+1&&!triggered.has(g.start));
   if(gap)triggered.add(gap.start);
   const r=stepFlight(st,dt,{jumpPressed:!!gap,jumpHeld:st.vy>0});
   if(r.routeReward)rewarded=true;
   if(r.crashed){crash++;break;}
 }
 assert.equal(crash,0);
 assert.equal(triggered.size,2);
 assert.equal(rewarded,true);
 assert.equal(st.routeRewarded,true);
});
test("landing only occurs on a downward deck crossing, never from underneath",()=>{
 const st=placedState(180);
 st.grounded=false;st.y=heightAt(180)-2;st.vy=-8;
 const r=stepFlight(st,dt,{});
 assert.equal(st.grounded,false);
 assert.equal(r.landed,false);
});
test("finish, checkpoints and path frame stay consistent",()=>{
 const a=poseAt(340),right=positionAt(340,3);
 assert.ok(Math.abs(right.x-a.x-3*a.rightX)<1e-7);
 assert.ok(Math.abs(right.z-a.z-3*a.rightZ)<1e-7);
 assert.equal(checkpointFor(510),475);
 assert.equal(sectorAt(0),0);assert.equal(sectorAt(600),1);
 assert.equal(sectorAt(1200),2);
 const st=placedState(TRIAL.length-.05,0);
 const r=stepFlight(st,dt,{});
 assert.equal(r.finished,true);assert.equal(st.s,TRIAL.length);
});

test("first-flight 2.0 is completable start to finish without losing shield using planned transitions",()=>{
  const st=newFlightState(),jumped=new Set();
  let frames=0,crashes=0;
  while(!st.finished&&!st.failed&&frames++<15000){
    const gap=GAPS.find(g=>!jumped.has(g.id)&&st.s>=g.start-2.5&&st.s<g.start+.5);
    if(gap)jumped.add(gap.id);
    const target=st.s<293?0:st.s<372?-2.8:st.s<458?2.8:
      st.s<517?0:st.s<688?-4.5:0;
    const steering=clamp((target-st.lateral)*.72,-1,1);
    const r=stepFlight(st,dt,{
      steer:steering,jumpPressed:!!gap,jumpHeld:st.vy>0
    });
    if(r.crashed)crashes++;
  }
  assert.equal(st.failed,false);
  assert.equal(crashes,0,"an authored fair route should have zero mandatory crashes");
  assert.ok(st.finished,"a complete autopilot route should reach the finish");
  assert.equal(st.shield,100);
  assert.equal(st.clearedGaps.length,GAPS.length);
  assert.equal(st.jumps,GAPS.length);
});

test("checkpoint recovery removes jump-clears after the rewind position",()=>{
  const st=placedState(370,-2);
  st.checkpoint=260;
  st.clearedGaps=["launch-leap","island-one"];
  st.grounded=false;st.y=-22;st.vy=-15;
  const result=stepFlight(st,dt,{});
  assert.equal(result.crashed,true);
  assert.equal(st.s,268);
  assert.deepEqual(st.clearedGaps,["launch-leap"]);
  assert.equal(st.shield,65);
});
