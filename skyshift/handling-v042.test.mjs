import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 TRIAL,COURSE_SEGMENTS,GAPS,ISLANDS,SPLITS,RISK_CUTS,
 headingAt,curvatureAt,bankAt,bankDegreesAt,poseAt,positionAt,
 widthAt,speedAt,onRoad,roadIntervals,shapeSteer,projectWorldToTrack,
 newFlightState,stepFlight,validateTrial,clamp
} from "./trial-v042.mjs";
import {SURFACE_DESIGN,createSurfacePlan,validateSurfacePlan}
 from "./identity-v042.mjs";

const src=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const dt=1/120,eps=1e-8;

test("0.4.2 uses only five deliberately authored course sections and no jumps",()=>{
 assert.equal(TRIAL.id,"handling-lab-v042");
 assert.equal(TRIAL.length,510);
 assert.deepEqual(COURSE_SEGMENTS.map(p=>p.type),
  ["straight","turn","straight","turn","straight"]);
 assert.deepEqual(COURSE_SEGMENTS.map(p=>[p.start,p.end]),
  [[0,95],[95,222],[222,292],[292,424],[424,510]]);
 assert.deepEqual(GAPS,[]);
 assert.deepEqual(ISLANDS,[]);
 assert.deepEqual(SPLITS,[]);
 assert.deepEqual(RISK_CUTS,[]);
 assert.deepEqual(validateTrial(),[]);
});

test("straights are EXACT mathematical lines, not visually wavy sampled curves",()=>{
 for(const [start,end] of [[0,95],[222,292],[424,510]]){
  const base=poseAt(start),heading=headingAt(start);
  for(let s=start+1;s<end;s+=.5){
   const p=poseAt(s);
   assert.ok(Math.abs(curvatureAt(s))<eps,"unexpected curvature on straight "+s);
   assert.ok(Math.abs(bankAt(s))<eps,"unexpected bank on straight "+s);
   assert.ok(Math.abs(headingAt(s)-heading)<eps,
    "straight heading drift at "+s);
   const cross=(p.x-base.x)*Math.cos(heading)+
      (p.z-base.z)*Math.sin(heading);
   assert.ok(Math.abs(cross)<.001,"not collinear on straight "+s);
  }
 }
});

test("both sweeper cores have constant radius and transitions only at entry/exit",()=>{
 const left=COURSE_SEGMENTS[1],right=COURSE_SEGMENTS[3];
 assert.equal(left.curvature,-.0120);
 assert.equal(right.curvature,.0127);
 for(const t of [left,right]){
  const a=t.start+t.entry,b=a+t.hold;
  for(let s=a;s<b;s+=.5)
   assert.ok(Math.abs(curvatureAt(s)-t.curvature)<eps,
    "core radius changed "+s);
  assert.ok(Math.abs(curvatureAt(t.start))<eps);
  assert.ok(Math.abs(curvatureAt(t.end))<eps);
  assert.ok(Math.abs(curvatureAt(t.start+t.entry*.5)-t.curvature*.5)<eps);
  assert.ok(Math.abs(curvatureAt(t.end-t.exit*.5)-t.curvature*.5)<eps);
 }
 assert.ok(bankDegreesAt(165)<-16);
 assert.ok(bankDegreesAt(360)>17);
 for(let s=0;s<510;s+=.5)
  assert.ok(Math.abs(bankAt(s+.05)-bankAt(s))<.01,
    "bank had a sudden kink at "+s);
});

test("centerline geometry, banked deck and local projection agree everywhere",()=>{
 for(let s=0;s<510;s+=1){
  const p=poseAt(s),q=poseAt(s+.2);
  assert.ok(Math.hypot(p.x-q.x,p.z-q.z)<.25,"position jump at "+s);
  for(const lateral of [-9.0,0,9.0]){
   const r=positionAt(s,lateral);
   assert.ok(Number.isFinite(r.x)&&Number.isFinite(r.y)&&Number.isFinite(r.z));
   const projection=projectWorldToTrack(r.x,r.z,s);
   assert.ok(Math.abs(projection.s-s)<.17,"projected s error "+s);
   assert.ok(Math.abs(projection.lateral-lateral)<.26,"lateral "+s);
  }
 }
 assert.equal(roadIntervals(152).length,1);
 assert.ok(onRoad(152,0));
 assert.equal(widthAt(190),23.2);
 assert.ok(speedAt(400)<=TRIAL.endSpeed);
});

test("neutral input never turns the ship toward the road, even in left curve",()=>{
 const st=newFlightState(),initial=st.heading;
 let gone=false,n=0;
 while(n++<1800&&!st.failed){
  const r=stepFlight(st,dt,{steer:0});
  if(!onRoad(st.s,st.lateral)){gone=true;break;}
  if(r.crashed)break;
 }
 assert.ok(gone,"idle steering must actually allow driving off a turn");
 assert.ok(Math.abs(st.heading-initial)<eps,"auto-steer introduced");
 assert.ok(st.offRoadSeconds>0);
});

test("input shaping is gentle near center, strong near full deflection, and symmetric",()=>{
 assert.equal(shapeSteer(0),0);
 assert.equal(shapeSteer(.04),0);
 assert.ok(shapeSteer(.25)>.05&&shapeSteer(.25)<.2);
 assert.ok(shapeSteer(.65)>.36&&shapeSteer(.65)<.54);
 assert.ok(Math.abs(shapeSteer(.65)+shapeSteer(-.65))<eps);
 assert.equal(shapeSteer(1),1);
});

test("yaw stops promptly on release without steering the craft toward track center",()=>{
 const st=newFlightState();
 for(let i=0;i<90;i++)stepFlight(st,dt,{steer:.75});
 const yaw=st.yawRate,heading=st.heading;
 assert.ok(yaw>.28&&yaw<.49);
 for(let i=0;i<30;i++)stepFlight(st,dt,{steer:0});
 assert.ok(Math.abs(st.yawRate)<.005,
   "yaw should settle within 0.25s without lingering slide");
 assert.ok(st.heading>heading,"small physically continuous deceleration allowed");
 assert.ok(st.heading-heading<.025,
   "no long rotation tail after releasing stick");
 // No road-directed heading corrections should appear anywhere.
 const code=src("trial-v042.mjs");
 assert.doesNotMatch(code,/st\.heading\s*=\s*headingAt\(st\.s\)/);
 assert.doesNotMatch(code,/turnLoadAt/);
 assert.doesNotMatch(code,/state\.worldX\s*=\s*poseAt/);
});

test("a simulated pilot can drive the entire handling course without assistance",()=>{
 const st=newFlightState();
 let n=0,crashes=0;
 while(!st.finished&&!st.failed&&n++<7000){
  const targetS=Math.min(TRIAL.length,st.s+19);
  const target=positionAt(targetS,0,0);
  const desired=Math.atan2(target.x-st.worldX,-(target.z-st.worldZ));
  const error=Math.atan2(Math.sin(desired-st.heading),
    Math.cos(desired-st.heading));
  const steer=clamp(error*8.4,-1,1);
  const result=stepFlight(st,dt,{steer});
  if(result.crashed)crashes++;
 }
 assert.equal(st.finished,true,
  "handling lap not finishable, at "+st.s.toFixed(1)+
  " lane "+st.lateral.toFixed(1)+" crashes "+crashes);
 assert.equal(crashes,0,"a reasonably smooth pilot should not crash");
 assert.ok(st.steerSeconds>4);
 assert.ok(st.peakBankDeg>16);
 assert.ok(st.maxHeadingErrorDeg<20);
 assert.equal(st.jumps,0);
});

test("visuals: a clean uninterrupted deck, stable camera and no jump hazards",()=>{
 const game=src("game-v042.mjs"),html=src("index.html");
 assert.equal(SURFACE_DESIGN.decorativePanels,0);
 assert.deepEqual(createSurfacePlan(),[]);
 assert.deepEqual(validateSurfacePlan(),[]);
 assert.match(game,/from "\.\/trial-v042\.mjs"/);
 assert.match(game,/from "\.\/identity-v042\.mjs"/);
 assert.match(game,/const follow=1-Math\.exp\(-dt\*11\.8\)/);
 assert.match(game,/camera\.position\.lerp\(targetCamera,follow\)/);
 assert.match(game,/cameraLook\.lerp\(targetLook,follow\)/);
 assert.doesNotMatch(game,/Math\.floor\(s\/4\)/);
 assert.match(game,/UI\.jump\.classList\.add\("hidden"\)/);
 assert.match(html,/no jumping in this test/);
 assert.match(html,/game-v048\.mjs\?v=0\.4\.8/);
 assert.match(html,/style-v043\.css\?v=0\.4\.8/);
 assert.match(html,/id="fullscreen-btn"/);
 assert.match(game,/skyshift-handling-v042-audit\.json/);
 assert.match(game,/skyshift-handling-lab-best-v042/);
});
