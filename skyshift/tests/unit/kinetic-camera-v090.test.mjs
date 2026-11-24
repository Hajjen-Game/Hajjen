// SKYSHIFT 0.9.0 – deterministic camera motion / seam / performance regression.
import test from "node:test";
import assert from "node:assert/strict";
import {readHistorical as readFileSync} from "../architecture/legacy-retirement-l1a.mjs";
import {TRIAL,CIRCUIT,CORKSCREW,MAGNETIC_WALL,SKYLINE_LEAP,
 newFlightState,validateTrial,bankAt,headingAt,positionAt} from "../../trial-v084.mjs";
import {KINETIC_CAMERA,kineticFovAt,kineticSpeedFraction,
 createKineticCameraState,stepKineticCamera,triggerKineticLanding,
 kineticCameraAudit} from "../../flight/kinetic-camera-v090.mjs";
import {BOOST_SPRING,boostFovTarget} from "../../flight/boost-spring-v090.mjs";
import {chasePose as oldChasePose,CINEMATIC_DEFAULTS as oldSettings,
 cameraBankAt as oldCameraBankAt} from "../../cinematic-v084.mjs";
import {chasePose as kineticChasePose,CINEMATIC_DEFAULTS as newSettings,
 cameraBankAt} from "../../cinematic-v090.mjs";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const near=(x,y,t=.000001)=>assert.ok(Math.abs(x-y)<=t,
 "expected "+x+" near "+y+" (tolerance "+t+")");
const motion={cameraHeading:.13,hover:.025};
const cine={preview:.08};
function stateFor(seconds,dt,view){
 const s=createKineticCameraState();
 for(let i=0;i<Math.round(seconds/dt);i++)stepKineticCamera(s,dt,view);
 return s;
}
test("cinematic FOV grows through all eight speed zones instead of capping near spawn",()=>{
 const f0=kineticFovAt(TRIAL.startSpeed),
  f2=kineticFovAt(TRIAL.startSpeed*1.11**2),
  f4=kineticFovAt(TRIAL.startSpeed*1.11**4),
  f8=kineticFovAt(TRIAL.endSpeed);
 near(f0,65.4);near(f8,76.2);
 assert.ok(f2>f0+1);
 assert.ok(f4>f2+1);
 assert.ok(f8>f4+1);
 near(kineticSpeedFraction(TRIAL.startSpeed),0);
 near(kineticSpeedFraction(TRIAL.endSpeed),1);
 const boosted=boostFovTarget(f8,1.4,1.4);
 assert.ok(boosted>f8+2&&boosted<=80);
 assert.equal(BOOST_SPRING.maxFovDegrees,80);
 assert.equal(KINETIC_CAMERA.extraRenderPasses,0);
 assert.equal(KINETIC_CAMERA.extraDrawCalls,0);
});
test("turning camera is responsive and genuinely shifts its frame with yaw and GRIP",()=>{
 const right=stateFor(1.7,1/60,{speed:95,steering:.85,yawRate:.92,
  gripIntensity:1,grounded:true});
 const left=stateFor(1.7,1/60,{speed:95,steering:-.85,yawRate:-.92,
  gripIntensity:1,grounded:true});
 const neutral=stateFor(1.7,1/60,{speed:95,steering:0,yawRate:0,
  gripIntensity:0,grounded:true});
 assert.ok(right.sideMeters<-.5);
 near(right.sideMeters,-left.sideMeters,.0001);
 near(right.rollRadians,-left.rollRadians,.0001);
 assert.ok(right.previewMeters>60);
 near(neutral.sideMeters,0);
 assert.ok(Math.abs(right.rollRadians)*180/Math.PI<4);
 const v={s:900,worldX:20,worldZ:-10,y:3,heading:.3,
  steering:.85,clearance:0,kineticSideMeters:right.sideMeters,
  kineticDistanceMeters:right.distanceMeters,
  kineticEyeLiftMeters:0,kineticLandingMeters:0,kineticLookLiftMeters:0};
 const base={...v,kineticSideMeters:0,kineticDistanceMeters:0};
 const x=kineticChasePose(v,motion,cine,newSettings,{});
 const y=kineticChasePose(base,motion,cine,newSettings,{});
 assert.ok(Math.hypot(x.x-y.x,x.z-y.z)>.5);
});
test("critically damped camera looks alike at 30, 60 and 120 FPS",()=>{
 const view={speed:98,steering:.8,yawRate:.9,gripIntensity:.8,
  grounded:true};
 const a=stateFor(2,1/30,view),b=stateFor(2,1/60,view),
  c=stateFor(2,1/120,view);
 for(const key of ["sideMeters","rollRadians","previewMeters",
  "distanceMeters","eyeLiftMeters","landingMeters"]){
  near(a[key],b[key],.00001);
  near(b[key],c[key],.00001);
  assert.ok(Number.isFinite(a[key]));
 }
});
test("camera offsets are damped during 70 degree wall and inverted corkscrew",()=>{
 const v={speed:95,steering:.82,yawRate:.93,gripIntensity:.95,
  grounded:true};
 const road=stateFor(2,1/60,v);
 const wall=stateFor(2,1/60,{...v,wall:true});
 const screw=stateFor(2,1/60,{...v,corkscrew:true});
 assert.ok(Math.abs(wall.sideMeters)<Math.abs(road.sideMeters)*.25);
 assert.ok(Math.abs(screw.sideMeters)<Math.abs(road.sideMeters)*.055);
 assert.ok(Math.abs(screw.rollRadians)<.003);
 assert.ok(wall.wallProtectedFrames>50);
 assert.ok(screw.corkProtectedFrames>50);
 const atMiddle=(CORKSCREW.start+CORKSCREW.end)*.5;
 const full=cameraBankAt(atMiddle);
 near(full,bankAt(atMiddle));
 const justBefore=cameraBankAt(CORKSCREW.end-.01);
 const justAfter=cameraBankAt(CORKSCREW.end+.01);
 const phase=Math.atan2(Math.sin(justAfter-justBefore),
  Math.cos(justAfter-justBefore));
 assert.ok(Math.abs(phase)<.06);
 near(cameraBankAt(atMiddle),oldCameraBankAt(atMiddle));
});
test("free-flight camera unveils landing without artificial jumps or screen shaking",()=>{
 const flight={speed:91,steering:.1,yawRate:.05,
  gripIntensity:0,grounded:false,clearance:5};
 const air=stateFor(.7,1/60,flight);
 assert.ok(air.eyeLiftMeters>.3&&air.eyeLiftMeters<=1.3);
 assert.ok(air.lookLiftMeters<-.1);
 const s=createKineticCameraState();
 triggerKineticLanding(s,17);
 for(let i=0;i<7;i++)stepKineticCamera(s,1/60,{...flight,grounded:true,
  clearance:0});
 assert.ok(s.landingMeters<-.04);
 assert.ok(s.landingMeters>=-.36);
 assert.equal(s.landings,1);
 for(let i=0;i<100;i++)stepKineticCamera(s,1/60,{speed:88,
  steering:0,yawRate:0,grounded:true});
 assert.ok(Math.abs(s.landingMeters)<.005);
 assert.ok(kineticCameraAudit(s).observedPeakLandingDipMeters>.04);
});
test("classic camera geometry is exactly preserved with all kinetic fields zero",()=>{
 const f=newFlightState(),p=positionAt(900,1.2);
 const view={s:900,worldX:p.x,worldZ:p.z,y:4,
  heading:headingAt(900),steering:.9,clearance:0};
 const a=oldChasePose(view,motion,cine,oldSettings,{});
 const b=kineticChasePose(view,motion,cine,oldSettings,{});
 for(const k of ["x","y","z","lookX","lookY","lookZ","sideOffsetMeters"])
  near(a[k],b[k],1e-9);
 assert.deepEqual(validateTrial(),[]);
 assert.equal(CIRCUIT.lapLength,3400);
 assert.equal(TRIAL.raceLength,10200);
 near(SKYLINE_LEAP.start,573);
 near(MAGNETIC_WALL.start,1662);
 near(CORKSCREW.start,3005);
});
test("0.10.3 page offers Classic, Balanced and Kinetic with the new GRIP-first physical handling",()=>{
 const html=read("./index.html"),boot=read("./boot-v0103.js"),
  game=read("./game-v0103.mjs");
 assert.match(html,/boot-v0103\.js\?v=0\.10\.3/);
 assert.match(html,/data-game-module="game-v0103\.mjs"/);
 assert.match(boot,/game-v0103\.mjs\?v=0\.10\.3/);
 assert.match(game,/version:"0\.10\.3"/);
 assert.match(game,/kinetic-camera-v090\.mjs/);
 assert.match(game,/cinematic-v0901\.mjs/);
 assert.match(game,/boost-spring-v090\.mjs/);
 assert.match(game,/trial-v0901\.mjs/);
 assert.match(game,/CAMERA_MODE/);
 assert.match(game,/CAMERA_GAIN/);
 assert.match(game,/skyshift-premium-ship-v0103-audit\.json/);
 assert.match(read("./legacy/game/game-v084.mjs"),/version:"0\.8\.4"/);
});
