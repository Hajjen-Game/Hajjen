import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  TRIAL,GAPS,ISLANDS,RISK_CUTS,SPLITS,SECTORS,
  FLOW_TURNS,headingAt,curvatureAt,turnLoadAt,widthAt,speedAt,
  roadIntervals,onRoad,poseAt,positionAt,newFlightState,stepFlight,clamp,
  validateTrial
} from "./trial-v04.mjs";
import {createSurfacePlan,validateSurfacePlan} from "./identity-v04.mjs";
import {SPACE_DESIGN} from "./space-v04.mjs";

const src=name=>readFileSync(new URL(name,import.meta.url),"utf8");
const dt=1/120;

test("0.4 has nine authored strong linked turns, genuine corner load and wider deck",()=>{
  assert.equal(TRIAL.id,"first-flight-flow-v04");
  assert.equal(FLOW_TURNS.length,9);
  assert.ok(FLOW_TURNS.filter(t=>Math.abs(t.delta)>.75).length>=6);
  for(let i=1;i<FLOW_TURNS.length;i++)
    assert.ok(FLOW_TURNS[i].start>FLOW_TURNS[i-1].start);
  for(const s of [0,60,108,200,280,510,730,816,1010,1190])
    assert.ok(Number.isFinite(headingAt(s))&&Number.isFinite(curvatureAt(s)));
  assert.ok(widthAt(45)>=19.5);
  assert.ok(widthAt(1190)>=20);
  assert.ok(Math.abs(headingAt(115))>.7);
  assert.ok(Math.abs(headingAt(257)-headingAt(180))>.85);
  assert.ok(Math.abs(turnLoadAt(72))>1.2);
  assert.ok(Math.abs(turnLoadAt(222))>1.7);
  assert.equal(turnLoadAt(155),0);
  assert.equal(turnLoadAt(345),0);
  assert.equal(turnLoadAt(590),0);
  assert.equal(turnLoadAt(860),0);
  assert.equal(turnLoadAt(1100),0);
});

test("physics really needs countersteering; curves do not auto-centre the player",()=>{
  const idle=newFlightState();
  let n=0;
  while(idle.s<114&&n++<1000){
    const r=stepFlight(idle,dt,{steer:0});
    assert.equal(r.crashed,false);
  }
  assert.ok(Math.abs(idle.lateral)>4.5,"a sweeping corner needs driver input");
  assert.ok(idle.peakTurnLoad>1.2);
  const driving=newFlightState();
  n=0;
  while(driving.s<114&&n++<1000){
    const counter=turnLoadAt(driving.s)/TRIAL.sideSpeed;
    const r=stepFlight(driving,dt,{steer:counter});
    assert.equal(r.crashed,false);
  }
  assert.ok(Math.abs(driving.lateral)<.5,"steer can cancel turn-load precisely");
  assert.ok(driving.steerSeconds>2);
});

test("wide visual deck and collision are from the same intervals at all course joints",()=>{
  assert.deepEqual(validateTrial(),[]);
  assert.equal(TRIAL.length,1300);
  assert.equal(GAPS.length,6);
  assert.equal(ISLANDS.length,3);
  assert.equal(RISK_CUTS.length,2);
  for(let s=0;s<TRIAL.length;s+=2){
    const p=poseAt(s),q=poseAt(s+.25);
    assert.ok(Math.hypot(q.x-p.x,q.z-p.z)<.4,"track discontinuity at "+s);
    for(const [left,right] of roadIntervals(s)){
      const center=(left+right)*.5;
      assert.ok(onRoad(s,center));
      const c=positionAt(s,center,0);
      assert.ok(Number.isFinite(c.x)&&Number.isFinite(c.z));
    }
  }
  assert.ok(onRoad(353,-2.2));
  assert.ok(onRoad(399,2.2));
  assert.ok(!onRoad(575,0));
  assert.ok(onRoad(575,-4.5));
  assert.ok(onRoad(575,4.5));
});

test("all mandatory gaps can still be finished in one full compensated run",()=>{
  const st=newFlightState(),triggered=new Set();
  let frames=0,crashes=0;
  while(!st.finished&&!st.failed&&frames++<15000){
    const gap=GAPS.find(g=>!triggered.has(g.id)&&st.s>=g.start-2.5&&st.s<g.start+.5);
    if(gap)triggered.add(gap.id);
    const target=st.s<293?0:st.s<372?-2.8:st.s<458?2.8:
       st.s<517?0:st.s<688?-4.5:0;
    const steer=clamp((target-st.lateral)*.72+turnLoadAt(st.s)/TRIAL.sideSpeed,-1,1);
    const r=stepFlight(st,dt,{steer,jumpPressed:!!gap,jumpHeld:st.vy>0});
    if(r.crashed)crashes++;
  }
  assert.equal(st.failed,false);
  assert.equal(st.finished,true,"course should be completable with fair steering");
  assert.equal(crashes,0,"mandatory challenge should not cause unavoidable falls");
  assert.equal(st.clearedGaps.length,GAPS.length);
  assert.equal(st.jumps,GAPS.length);
  assert.equal(st.shield,100);
  assert.ok(st.steerSeconds>10,"long swoopers demand meaningful steering");
  assert.ok(st.peakTurnLoad>1);
});

test("no decorative dark tiles or false platforms are reintroduced by the wider road",()=>{
  const marks=createSurfacePlan();
  assert.deepEqual(validateSurfacePlan(marks),[]);
  assert.ok(marks.length<80);
  assert.ok(marks.every(p=>["nav","risk","landing"].includes(p.kind)));
  for(const p of marks){
    for(const s of [p.start+.012,(p.start+p.end)*.5,p.end-.012]){
      assert.ok(roadIntervals(s).some(([a,b])=>p.left>a+.08&&p.right<b-.08));
    }
  }
});

test("world is pure starfield: no geological geometry or old world installers",()=>{
  const game=src("game-v04.mjs");
  const space=src("space-v04.mjs");
  assert.equal(SPACE_DESIGN.geologicalMeshes,0);
  assert.equal(SPACE_DESIGN.landmarkCount,0);
  assert.equal(SPACE_DESIGN.starLayers,3);
  assert.match(game,/installSpaceBackdrop\(THREE,camera\)/);
  assert.doesNotMatch(game,/installPremiumWorld\(THREE,world\)/);
  assert.doesNotMatch(game,/world-v034\.mjs/);
  assert.doesNotMatch(game,/makeStars\(\)/);
  assert.match(space,/THREE\.PointsMaterial/);
  assert.match(space,/THREE\.SpriteMaterial/);
});

test("camera and craft show turn attitude, with future real banking held back",()=>{
  const game=src("game-v04.mjs");
  assert.match(game,/const shipLean=clamp\(turn\*7\.5/);
  assert.match(game,/camera\.rotateZ\(clamp\(curvatureAt\(flight\.s\+13\)/);
  assert.match(game,/const ahead=positionAt\(Math\.min\(TRIAL\.length,flight\.s\+45\)/);
  assert.match(game,/underRail/);
  assert.match(game,/from "\.\/trial-v04\.mjs"/);
  assert.match(game,/from "\.\/identity-v04\.mjs"/);
  assert.match(game,/from "\.\/space-v04\.mjs"/);
  assert.match(game,/version:"0\.4\.0"/);
  assert.match(game,/peakTurnLoad/);
  assert.match(game,/steerSeconds/);
});

test("active browser entrypoint loads 0.4 and retains fullscreen and neon defaults",()=>{
  const html=src("index.html"),game=src("game-v04.mjs");
  assert.match(html,/game-v0482\.mjs\?v=0\.4\.8\.2/);
  assert.match(html,/style-v043\.css\?v=0\.4\.8\.2/);
  assert.match(html,/id="fullscreen-btn"/);
  assert.match(game,/from "\.\/fullscreen-v02\.mjs"/);
  assert.match(game,/from "\.\/neon-v032\.mjs"/);
  assert.match(game,/from "\.\/luminance-v0331\.mjs"/);
  assert.match(game,/skyshift-first-flight-best-v03/);
  assert.match(game,/skyshift-first-flight-v040-audit\.json/);
});
