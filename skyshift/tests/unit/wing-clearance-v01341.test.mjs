// SKYSHIFT 0.13.4.1 — real 3D Stingray wing contact regression.
// Geometry probes come from the checked-in V3 glTF buffers, not imagined tips.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {STINGRAY_CLEARANCE_01341,clampVisualRoll,signedRoadClearance,
 wingSurfaceLift,extractWingUnderside,createStingraySurfaceClearance}
 from "../../wing-clearance-v01341.mjs";
const asset=JSON.parse(readFileSync(new URL(
 "../../"+"./assets/ships/stingray-evo-hero-v3.gltf",import.meta.url),"utf8"));
const bytes=Buffer.from(asset.buffers[0].uri.split(",")[1],"base64");
class Vec3{
 constructor(x=0,y=0,z=0){this.set(x,y,z);}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
 copy(p){return this.set(p.x,p.y,p.z)}
 fromBufferAttribute(a,i){return this.set(a.getX(i),a.getY(i),a.getZ(i))}
 applyMatrix4(m){return this.set(this.x+m.offset.x,
  this.y+m.offset.y,this.z+m.offset.z)}
}
class Matrix4{
 constructor(){this.offset={x:0,y:0,z:0}}
 copy(m){this.offset={...m.offset};return this}
 invert(){this.offset.x*=-1;this.offset.y*=-1;this.offset.z*=-1;return this}
 multiplyMatrices(a,b){
  this.offset={x:a.offset.x+b.offset.x,y:a.offset.y+b.offset.y,
   z:a.offset.z+b.offset.z};return this;
 }
}
const THREE={Matrix4,Vector3:Vec3};
function geometry(name,ship){
 const part=asset.meshes.find(m=>m.name===name);
 assert.ok(part,"missing real V3 mesh "+name);
 const accessor=asset.accessors[part.primitives[0].attributes.POSITION],
  view=asset.bufferViews[accessor.bufferView],
  start=(view.byteOffset??0)+(accessor.byteOffset??0),
  raw=new DataView(bytes.buffer,bytes.byteOffset+start,
   accessor.count*12);
 const position={
  count:accessor.count,
  getX:i=>raw.getFloat32(i*12,true),
  getY:i=>raw.getFloat32(i*12+4,true),
  getZ:i=>raw.getFloat32(i*12+8,true)
 };
 return {geometry:{attributes:{position}},
  matrixWorld:new Matrix4(),
  updateWorldMatrix(){this.matrixWorld.offset={...ship.position}}};
}
function mockedShip(){
 const ship={position:{x:0,y:0,z:0},matrixWorld:new Matrix4()};
 ship.updateWorldMatrix=function(){this.matrixWorld.offset={...this.position}};
 const meshes={};
 for(const side of ["L","R"])meshes["Hero_Wing_"+side]=
  geometry("Hero_Wing_"+side,ship);
 ship.getObjectByName=name=>meshes[name]??null;
 return ship;
}
const flat={road:{x:0,y:0,z:0},n:{x:0,y:1,z:0},
 lane:{x:1,y:0,z:0}};
const point=(x,y,z=0)=>({x,y,z});

test("world road-normal distance works on flat, banked, and inverted deck",()=>{
 assert.equal(signedRoadClearance(point(3,.24),flat.road,flat.n),.24);
 const angle=70*Math.PI/180,
  normal={x:0,y:Math.cos(angle),z:Math.sin(angle)},
  road=point(0,2,0);
 const p=point(2,2+normal.y*(-.31),normal.z*(-.31));
 assert.ok(Math.abs(signedRoadClearance(p,road,normal)+.31)<1e-9);
 const inv={x:0,y:-1,z:0};
 assert.ok(Math.abs(signedRoadClearance(point(0,2.40),point(0,2),inv)+.4)<1e-10);
});
test("actual V3 model yields 36 wing undersurface probes from BOTH wings",()=>{
 const ship=mockedShip();
 const probes=extractWingUnderside(THREE,ship);
 assert.equal(probes.length,STINGRAY_CLEARANCE_01341.maxDiagnosticProbeCount);
 assert.equal(probes.filter(v=>v.x<0).length,18);
 assert.equal(probes.filter(v=>v.x>0).length,18);
 assert.ok(Math.min(...probes.map(p=>p.x))<-3.5);
 assert.ok(Math.max(...probes.map(p=>p.x))>3.5);
 assert.ok(probes.every(p=>Number.isFinite(p.y)));
});
test("a wing 45cm THROUGH the physical track is lifted immediately",()=>{
 const hit=wingSurfaceLift([point(-3.5,-.45),point(3.5,.65)],
  flat.road,flat.n,flat.lane,0,11);
 assert.ok(hit.required>.70);
 assert.equal(hit.valid,2);
 assert.equal(hit.left,1);assert.equal(hit.right,1);
 assert.ok(hit.minDistance+hit.required>=hit.margin-1e-8);
});
test("banked 70° deck uses normal rather than arbitrary world-Y lift",()=>{
 const a=70*Math.PI/180,
  normal={x:0,y:Math.cos(a),z:Math.sin(a)},
  lane={x:0,y:-Math.sin(a),z:Math.cos(a)};
 const place=(d,g)=>point(0,lane.y*d+normal.y*g,
  lane.z*d+normal.z*g);
 const hit=wingSurfaceLift([place(-3.65,-.21),place(3.65,.60)],
  flat.road,normal,lane,0,11);
 assert.equal(hit.valid,2);
 assert.ok(Math.abs(hit.minDistance+.21)<1e-7);
 assert.ok(hit.minDistance+hit.required>=hit.margin-1e-9);
});
test("inverted corkscrew road normal produces outward—not downward—lift",()=>{
 const hit=wingSurfaceLift([point(-2,1.4),point(2,-.4)],
  flat.road,{x:0,y:-1,z:0},flat.lane,0,11);
 assert.ok(Math.abs(hit.required-1.4-hit.margin)<1e-9);
});
test("outside-deck wing is not used as a fictitious floor",()=>{
 const hit=wingSurfaceLift([point(-11,-1),point(2,.34)],
  flat.road,flat.n,flat.lane,0,10);
 assert.equal(hit.valid,1);
 assert.equal(hit.left,0);
 assert.equal(hit.right,1);
 assert.equal(hit.required,0);
});
test("a grounded Stingray keeps full physical banking but limits extra cosmetic roll",()=>{
 const bank=1.08,raw=-bank+.49;
 const corrected=clampVisualRoll(raw,bank,true);
 assert.ok(Math.abs(corrected+bank-.17)<1e-10);
 assert.equal(clampVisualRoll(raw,bank,false),raw);
 assert.equal(clampVisualRoll(-bank+.11,bank,true),-bank+.11);
 assert.equal(clampVisualRoll(-bank-.44,bank,true),-bank-.17);
});
function createController(ship,roadOn=true){
 return createStingraySurfaceClearance(THREE,{
  positionAt:(s,lateral)=>point(lateral,0,-s),
  surfaceNormalAt:()=>flat.n,widthAt:()=>22,
  onRoad:()=>roadOn,bankAt:()=>0
 });
}
test("live controller lifts actual GLTF mesh while NEVER mutating pilot flight",()=>{
 const ship=mockedShip(),ctrl=createController(ship);
 ctrl.bind(ship,true);
 assert.ok(ctrl.isActive());
 assert.equal(ctrl.stats().probes,36);
 ship.position={x:0,y:.05,z:-100};
 const view={s:100,lateral:0,grounded:true,y:1.05,
  worldX:0,worldZ:-100,steering:.8};
 const before={...view};
 const meters=ctrl.frame(ship,view,1/60);
 assert.ok(meters>.05,"actual wing underside needed more visual ground clearance");
 assert.ok(ship.position.y>.05);
 assert.deepEqual(view,before,"NEVER mutate physics or 120Hz flight state");
 assert.ok(ctrl.stats().minAfter>=
  STINGRAY_CLEARANCE_01341.minVisibleGapMeters+
  STINGRAY_CLEARANCE_01341.curvatureReserveMeters-1e-6);
 assert.ok(ctrl.stats().protectedFrames>0);
 assert.equal(ctrl.stats().physicalFlightUnchanged,true);
});
test("lift eases out with hysteresis, never abruptly drops through track",()=>{
 const ship=mockedShip(),ctrl=createController(ship);
 ctrl.bind(ship,true);
 ship.position={x:0,y:.0,z:-100};
 const view={s:100,lateral:0,grounded:true};
 const before=ctrl.frame(ship,view,1/60);
 assert.ok(before>.06);
 ship.position={x:0,y:1.05,z:-100};
 const after=ctrl.frame(ship,view,1/60);
 assert.ok(after>0&&after<before);
 assert.equal(ctrl.stats().maxUnresolvedPenetration,0);
});
test("skyline leap/gap and genuine airborne tricks never gain artificial lift",()=>{
 const ship=mockedShip(),ctrl=createController(ship);
 ctrl.bind(ship,true);
 ship.position={x:0,y:-.2,z:-100};
 const airborne=ctrl.frame(ship,{s:100,lateral:0,grounded:false},1/60);
 assert.equal(airborne,0);
 assert.equal(ship.position.y,-.2);
 assert.equal(ctrl.stats().minAfter,null);
 const noRoad=createController(ship,false);
 noRoad.bind(ship,true);
 assert.equal(noRoad.frame(ship,{s:100,lateral:0,grounded:true},1/60),0);
});
test("Manta and classic Stingray do not receive model-specific correction",()=>{
 const ship=mockedShip(),ctrl=createController(ship);
 ctrl.bind(ship,false);
 assert.equal(ctrl.isActive(),false);
 assert.equal(ctrl.stats().probes,0);
 ship.position={x:0,y:-.2,z:0};
 assert.equal(ctrl.frame(ship,{s:0,lateral:0,grounded:true},.016),0);
 assert.equal(ship.position.y,-.2);
});
test("changing selected craft disposes old wing samples and resets correction",()=>{
 const ship=mockedShip(),ctrl=createController(ship);
 ctrl.bind(ship,true);
 assert.equal(ctrl.stats().probes,36);
 ctrl.bind(null,false);
 assert.equal(ctrl.stats().probes,0);
 assert.equal(ctrl.stats().liftMeters,0);
 assert.equal(ctrl.isActive(),false);
});
