import test from "node:test";
import assert from "node:assert/strict";
import {runInNewContext} from "node:vm";
import {readFileSync} from "node:fs";
import {
  TRACK_ART,createSurfacePlan,validateSurfacePlan
} from "./identity-v034.mjs";
import {
  WORLD_DESIGN,createFormationPlan,validateWorldPlan
} from "./world-v034.mjs";
import {SHIP_STYLE} from "./ship-v034.mjs";
import {TRIAL,GAPS,ISLANDS,SPLITS,roadIntervals,widthAt,onRoad} from "./trial-v03.mjs";
import {NEON_TUNING} from "./neon-balance-v032.mjs";
import {LUMINANCE} from "./luminance-v0331.mjs";
const src=p=>readFileSync(new URL(p,import.meta.url),"utf8");

const plan=createSurfacePlan();

test("0.3.4 removes ALL decorative road plates, squares, and lighted panels",()=>{
  assert.equal(TRACK_ART.plateCount,0);
  assert.equal(TRACK_ART.maxPanelCount,0);
  assert.deepEqual(validateSurfacePlan(plan),[]);
  assert.ok(plan.length>10&&plan.length<80,"decorative work should stay restrained");
  assert.ok(!plan.some(p=>["plate","seam","energy"].includes(p.kind)));
  assert.ok(plan.every(p=>["nav","risk","landing"].includes(p.kind)));
  assert.doesNotMatch(src("identity-v034.mjs"),/planRect\(result,"plate"/);
  assert.doesNotMatch(src("game-v034.mjs"),/installSurfaceLanguage\(THREE,world\)/);
});

test("painted shapes never create fake roadway over a real gap",()=>{
  for(const [i,p] of plan.entries()){
    for(const s of [p.start+.012,(p.start+p.end)*.5,p.end-.012]){
      assert.ok(roadIntervals(s).some(([a,b])=>p.left>a+.08&&p.right<b-.08),
        "mark "+i+" outside real track "+s);
      assert.equal(onRoad(s,(p.left+p.right)*.5,.02),true);
    }
    for(const g of GAPS)
      assert.ok(p.end<=g.start||p.start>=g.end,
        "mark "+i+" spans gap "+g.id);
  }
});

test("Sky Islands and split lane remain legible with sparse cues",()=>{
  assert.ok(plan.some(p=>p.kind==="landing"));
  for(const p of plan.filter(p=>p.kind==="landing")){
    assert.ok(ISLANDS.some(i=>p.start>=i.start&&p.end<=i.end));
  }
  const split=SPLITS[0];
  const right=plan.filter(p=>p.start>=split.start&&p.end<=split.end&&p.kind==="risk");
  const left=plan.filter(p=>p.start>=split.start&&p.end<=split.end&&p.kind==="nav");
  assert.ok(right.length>=1&&left.length>=1);
  assert.ok(right.every(p=>p.left>0));
  assert.ok(left.every(p=>p.right<0));
  assert.equal(TRIAL.length,1300);
  assert.equal(GAPS.length,6);
});

test("fewer sculpted formations replace repetitive cylinder props without touching the lane",()=>{
  const formations=createFormationPlan();
  assert.deepEqual(validateWorldPlan(formations),[]);
  assert.ok(formations.length>=40&&formations.length<=60);
  assert.ok(new Set(formations.map(p=>p.variant)).size===3);
  assert.equal(WORLD_DESIGN.removedOldGrid,true);
  for(const p of formations)
    assert.ok(Math.abs(p.lateral)>widthAt(p.s)*.5+10);
  assert.deepEqual(WORLD_DESIGN.landmarkDistances,[288,540,782,1025,1257]);
  const world=src("world-v034.mjs");
  assert.match(world,/sculptedGeometry/);
  assert.match(world,/new THREE\.InstancedMesh/);
  assert.match(world,/geo\.computeVertexNormals\(\)/);
  assert.doesNotMatch(world,/const grid=\[\]/);
  const game=src("game-v034.mjs");
  assert.doesNotMatch(game,/new THREE\.CylinderGeometry\(4\.7,10\.4,15\.5,5\)/);
  assert.match(game,/installPremiumWorld\(THREE,world\)/);
});

test("cyan disc is removed; a diffuse dark contact shadow is used only on real road",()=>{
  assert.equal(SHIP_STYLE.removedTurquoiseDisc,true);
  assert.equal(SHIP_STYLE.contactShadow,"soft dark contact occlusion");
  const ship=src("ship-v034.mjs");
  assert.match(ship,/createContactShadow/);
  assert.match(ship,/createRadialGradient/);
  assert.match(ship,/new THREE\.PlaneGeometry\(3\.3,4\.1\)/);
  assert.doesNotMatch(ship,/CircleGeometry/);
  const game=src("game-v034.mjs");
  assert.match(game,/createContactShadow\(THREE,scene\)/);
  assert.match(game,/onRoad\(flight\.s,flight\.lateral\)/);
  assert.doesNotMatch(game,/new THREE\.CircleGeometry\(2\.8,24\)/);
  assert.match(game,/refineCraftSilhouette\(THREE,ship\)/);
});

test("modern HDR, luminance, controls, checkpoint logic and personal best stay intact",()=>{
  const game=src("game-v034.mjs");
  assert.match(game,/from "\.\/trial-v03\.mjs"/);
  assert.match(game,/from "\.\/neon-v032\.mjs"/);
  assert.match(game,/from "\.\/luminance-v0331\.mjs"/);
  assert.match(game,/from "\.\/fullscreen-v02\.mjs"/);
  assert.match(game,/newFlightState\(\)/);
  assert.match(game,/stepFlight\(/);
  assert.match(game,/startImmersiveTrial/);
  assert.match(game,/skyshift-first-flight-best-v03/);
  assert.equal(NEON_TUNING.bloomStrength,.43);
  assert.equal(NEON_TUNING.maxPixelRatio,2);
  assert.equal(LUMINANCE.exposure,1.015);
  assert.match(game,/version:"0\.3\.4\.1"/);
});

test("active HTML loads 0.3.4 and records rendering workload in exported audit",()=>{
  const html=src("index.html");
  const game=src("game-v034.mjs");
  assert.match(html,/src="\.\/game-v042\.mjs\?v=0\.4\.2"/);
  assert.match(html,/style-v042\.css\?v=0\.4\.2/);
  assert.match(html,/id="fullscreen-btn"/);
  assert.match(game,/decorativePlates:0/);
  assert.match(game,/rendererDrawCallsAverage/);
  assert.match(game,/rendererTrianglesAverage/);
  assert.match(game,/skyshift-first-flight-v0341-audit\.json/);
});


test("beacon construction runs at startup without undeclared variables",()=>{
  // Executes the exact production buildDecor function with lightweight Three.js
  // stand-ins: static syntax checks do not detect missing runtime locals.
  const game=src("game-v034.mjs");
  const from=game.indexOf("function buildDecor(){");
  const to=game.indexOf("function makeShip()",from);
  assert.ok(from>=0&&to>from);
  const added=[],billboards=[];
  class Instances {
    constructor(geometry,material,capacity){
      this.capacity=capacity;this.count=0;this.instanceMatrix={needsUpdate:false};
      this.indices=[];
    }
    setMatrixAt(i,matrix){
      assert.ok(Number.isInteger(i)&&i>=0&&i<this.capacity);
      this.indices.push(i);
    }
  }
  class Simple {constructor(...args){this.args=args;}}
  const noop={set(){}};
  const context={
    THREE:{BoxGeometry:Simple,MeshStandardMaterial:Simple,InstancedMesh:Instances},
    TRIAL:{length:1300},LUMINANCE:{housingColor:0x31475e},
    neonKit:{beacon:{},beaconCore:{},beaconHalo:{}},
    reusable:{position:noop,rotation:noop,scale:noop,updateMatrix(){},matrix:{}},
    roadIntervals:()=>[[-8,8]],poseAt:()=>({heading:0}),
    positionAt:(s,l,y)=>({x:s,y,z:l}),
    world:{add:obj=>added.push(obj)},pylonMesh:null,ARCHES:[],
    makeArch(){},makeBillboard:(...args)=>billboards.push(args)
  };
  runInNewContext(game.slice(from,to)+"\nbuildDecor();",context,{timeout:2000});
  assert.equal(added.length,4);
  const n=added[0].count;
  assert.ok(n>125&&n<210);
  for(const mesh of added){
    assert.equal(mesh.count,n);
    assert.equal(mesh.indices.length,n);
    assert.equal(mesh.instanceMatrix.needsUpdate,true);
  }
  assert.equal(billboards.length,2);
});

test("startup error message does not falsely blame missing WebGL for JavaScript exceptions",()=>{
  const game=src("game-v034.mjs");
  assert.match(game,/UI\.error\.textContent="SKYSHIFT could not start: "/);
  assert.doesNotMatch(game,/WebGL required\./);
});
