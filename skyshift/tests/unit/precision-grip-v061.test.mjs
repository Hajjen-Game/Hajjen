// SKYSHIFT 0.6.1 – Precision Grip, real steering and side-thruster visual tests.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {GRIP_SPEC,initGripState,stepGripState} from "../../precision-grip-v061.mjs";
import {SIDE_THRUSTER_SPEC,createSideThrusters} from "../../side-thrusters-v061.mjs";
import {TRIAL,newFlightState,stepFlight,speedAt,positionAt,headingAt,
 CIRCUIT,validateTrial} from "./trial-v061.mjs";
const src=f=>readFileSync(new URL("../../"+f,import.meta.url),"utf8");
function ticks(s,n,opts){
 for(let i=0;i<n;i++)stepFlight(s,1/120,opts);
 return s;
}
test("GRIP requires BOTH held button and physical steering; never auto turns",()=>{
 const st=newFlightState();
 const oldHeading=st.heading;
 ticks(st,50,{steer:0,grip:true});
 assert.equal(st.gripActivations,0);
 assert.equal(st.gripActive,false);
 assert.equal(st.gripIntensity,0);
 assert.equal(st.heading,oldHeading);
 assert.equal(st.gripSpeedLossMeters,0);
 assert.equal(TRIAL.maxYawRate,1.24);
 assert.equal(GRIP_SPEC.noAutoSteer,true);
 assert.equal(GRIP_SPEC.requiresSteering,true);
});
test("GRIP gives responsive >20% sharper actual yaw, no track-following",()=>{
 const normal=newFlightState(),grip=newFlightState();
 ticks(normal,42,{steer:.74});
 ticks(grip,42,{steer:.74,grip:true});
 assert.ok(grip.yawRate>normal.yawRate*1.19);
 assert.ok(grip.heading-normal.heading>.035);
 assert.equal(grip.gripActivations,1);
 assert.equal(grip.gripDirection,1);
 assert.ok(grip.gripIntensity>.95);
 assert.ok(grip.gripPeakYawDeg>0);
 assert.ok(grip.gripSpeedLossMeters>0);
 assert.ok(grip.currentSpeed<normal.currentSpeed);
 assert.equal(grip.gripActive,true);
});
test("GRIP is symmetric left/right; release returns to baseline without inertia",()=>{
 const left=newFlightState(),right=newFlightState();
 ticks(left,32,{steer:-1,grip:true});
 ticks(right,32,{steer:1,grip:true});
 assert.equal(left.gripDirection,-1);
 assert.equal(right.gripDirection,1);
 assert.ok(left.yawRate<0&&right.yawRate>0);
 assert.ok(left.gripIntensity>.90);
 ticks(right,180,{steer:0,grip:false});
 assert.ok(right.gripIntensity<.004);
 assert.equal(right.gripDirection,0);
 assert.equal(right.gripActive,false);
 assert.ok(Math.abs(right.yawRate)<1e-3);
 assert.ok(Math.abs(right.currentSpeed-speedAt(right.s,0))<.1);
});
test("GRIP speed cost changes physical forward travel but never stacks a permanent penalty",()=>{
 const normal=newFlightState(),grip=newFlightState();
 ticks(normal,36,{steer:1});
 ticks(grip,36,{steer:1,grip:true});
 const relative=grip.currentSpeed/normal.currentSpeed;
 assert.ok(relative<.945&&relative>.932,
  "full steering costs at most 6.5% once ramped: "+relative);
 assert.ok(grip.s<normal.s);
 const lost=grip.gripSpeedLossMeters;
 ticks(grip,160,{steer:0,grip:false});
 assert.ok(grip.gripSpeedLossMeters>=lost);
 assert.ok(grip.gripIntensity<.002);
 assert.ok(Math.abs(grip.currentSpeed-speedAt(grip.s,0))<.1);
 assert.equal(GRIP_SPEC.maxSpeedPenalty,.065);
});
test("hold-only, airborne grip, and tiny analog movement never trigger authority",()=>{
 const st=initGripState(newFlightState());
 const none=stepGripState(st,1/120,0,true,true);
 assert.equal(none.authority,1);
 assert.equal(none.active,false);
 assert.equal(st.gripActivations,0);
 const tiny=stepGripState(st,1/120,.08,true,true);
 assert.equal(tiny.active,false);
 const airborne=stepGripState(st,1/120,1,true,false);
 assert.equal(airborne.active,false);
 const actual=stepGripState(st,1/120,-1,true,true);
 assert.equal(actual.activated,true);
 assert.equal(st.gripActivations,1);
 stepGripState(st,1/120,-1,true,true);
 assert.equal(st.gripActivations,1);
 const release=stepGripState(st,1/120,0,false,true);
 assert.equal(release.active,false);
});
test("GRIP still works with zone speed increases, boost pads and checkpointed 3-lap race",()=>{
 assert.equal(CIRCUIT.laps,3);
 assert.equal(TRIAL.raceLength,10200);
 assert.deepEqual(validateTrial(),[]);
 const active=newFlightState();
 active.zoneSpeedStage=4;
 active.zoneCruiseSpeed=speedAt(5,4);
 ticks(active,28,{steer:-.8,grip:true});
 assert.equal(active.zoneSpeedStage,4);
 assert.equal(active.gripActivations,1);
 assert.ok(active.currentSpeed>speedAt(5,0));
 assert.ok(active.gripSpeedLossMeters>0);
 assert.ok(active.gripDistanceMeters>0);
 const boosted=newFlightState();
 boosted.s=214;
 const p=positionAt(boosted.s,0,0);
 boosted.worldX=p.x;boosted.worldZ=p.z;
 boosted.heading=headingAt(boosted.s);
 ticks(boosted,24,{steer:.6,grip:true});
 assert.equal(boosted.boostActivations,1);
 assert.equal(boosted.gripActivations,1);
 assert.ok(boosted.boostMultiplier>1);
 assert.ok(boosted.currentSpeed>44);
});
test("two genuine side jets use no lights or particles and ignite opposite of steering",()=>{
 const geometries=[],materials=[];
 class BufferGeometry{
  constructor(){this.attributes={};geometries.push(this);}
  setAttribute(k,v){this.attributes[k]=v;}
  computeVertexNormals(){}
  dispose(){this.disposed=true;}
 }
 class BufferAttribute{constructor(array,size){this.array=array;this.itemSize=size;}}
 class MeshBasicMaterial{constructor(opts){Object.assign(this,opts);materials.push(this);}dispose(){this.disposed=true;}}
 class Mesh{
  constructor(geo,mat){this.geometry=geo;this.material=mat;
   this.scale={x:1,y:1,z:1};this.visible=true;}
 }
 const THREE={BufferGeometry,BufferAttribute,MeshBasicMaterial,Mesh,
  AdditiveBlending:2,DoubleSide:2};
 const ship={children:[],add(...els){this.children.push(...els);},
  remove(...els){this.children=this.children.filter(x=>!els.includes(x));}};
 const fx=createSideThrusters(THREE,ship);
 assert.equal(ship.children.length,4);
 assert.equal(ship.children.filter(x=>x.visible).length,0);
 fx.frame(.92,1,.12);
 assert.equal(ship.children.filter(x=>x.visible).length,2);
 assert.ok(ship.children.filter(x=>x.visible).every(x=>x.name.includes("port")));
 assert.ok(fx.stats().peakIntensity>=.92);
 fx.frame(.85,-1,.3);
 assert.ok(ship.children.filter(x=>x.visible).every(x=>x.name.includes("starboard")));
 fx.frame(0,0,1);
 assert.equal(ship.children.filter(x=>x.visible).length,0);
 assert.equal(fx.stats().additionalLights,0);
 assert.equal(fx.stats().particles,0);
 assert.equal(SIDE_THRUSTER_SPEC.activeDrawCalls,2);
 fx.dispose();
 assert.equal(ship.children.length,0);
 assert.ok(geometries.every(g=>g.disposed));
 assert.ok(materials.every(m=>m.disposed));
});
test("mobile GRIP and desktop Shift are explicit, touch-safe, and reset on pause",()=>{
 const html=src("./index.html"),css=src("./style-v061.css"),
   game=src("./game-v0103.mjs"),boot=src("./boot-v0103.js");
 assert.match(html,/id="grip-btn"/);
 assert.match(html,/HOLD \+ STEER/);
 assert.match(html,/aria-pressed="false"/);
 assert.match(html,/SHIFT \+ STEER/);
 assert.match(css,/#grip-btn\{/);
 assert.match(css,/#mobile-controls\{justify-content:space-between\}/);
 assert.match(css,/pointer-events:auto;touch-action:none/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(game,/uiState\.keys\.has\("ShiftLeft"\)/);
 assert.match(game,/uiState\.keys\.has\("ShiftRight"\)/);
 assert.match(game,/setPointerCapture\(e\.pointerId\)/);
 assert.match(game,/pointercancel",releaseGrip/);
 assert.match(game,/lostpointercapture",releaseGrip/);
 assert.match(game,/gripHeld=false;uiState\.gripPointer=null/);
 assert.match(game,/stepFlight\(flight,dt,\{steer,grip:gripHeld\}\)/);
 assert.match(game,/sideThrusters\?\.frame\(/);
 assert.match(game,/gripActiveSeconds/);
 assert.match(game,/grip_activated/);
 assert.match(html,/style-v061\.css\?v=0\.6\.1/);
 assert.match(html,/boot-v0103\.js\?v=0\.10\.3/);
 assert.match(html,/data-game-module="game-v0103\.mjs"/);
 assert.match(boot,/import\("\.\/game-v0103\.mjs\?v=0\.10\.3"\)/);
 assert.match(game,/version:"0\.10\.3"/);
 assert.match(game,/from "\.\/neon-v083\.mjs"/);
 assert.match(game,/from "\.\/trial-v0901\.mjs"/);
 assert.match(game,/from "\.\/aero-barrier-v0901\.mjs"/);
});
