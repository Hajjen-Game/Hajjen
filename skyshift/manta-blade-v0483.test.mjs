// SKYSHIFT 0.4.8.3 — Manta Blade silhouette and physics regression.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 MANTA_IDENTITY,MANTA_SPINE,MANTA_WING_OUTLINE,MANTA_CANOPY,
 triangulateWing,buildMantaSpine,buildMantaWings,buildMantaCanopy,buildMantaBlade
} from "./manta-blade-v0483.mjs";
import {TRIAL,newFlightState,stepFlight} from "./trial-v048.mjs";
const source=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const close=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<=t,`${a} differs from ${b}`);
const checkMesh=mesh=>{
 assert.equal(mesh.positions.length%3,0);
 assert.equal(mesh.indices.length%3,0);
 assert.ok(mesh.positions.every(Number.isFinite));
 const n=mesh.positions.length/3;
 assert.ok(mesh.indices.every(i=>i>=0&&i<n));
 assert.equal(mesh.triangles,mesh.indices.length/3);
};
test("Manta Blade is a WIDE low-profile signature silhouette, not a generic jet",()=>{
 assert.equal(MANTA_IDENTITY.name,"Manta Blade");
 assert.equal(MANTA_IDENTITY.wingLobes,2);
 assert.equal(MANTA_IDENTITY.thrusters,2);
 assert.equal(MANTA_IDENTITY.openTrailingCenter,true);
 assert.equal(MANTA_IDENTITY.newDynamicLights,0);
 assert.equal(MANTA_IDENTITY.changesFlightPhysics,false);
 assert.ok(MANTA_IDENTITY.visualBeamMeters>=5.7&&MANTA_IDENTITY.visualBeamMeters<=5.9);
 assert.equal(MANTA_SPINE.at(-1).z,1.36);
 assert.ok(MANTA_WING_OUTLINE.some(([x,z])=>x>2&&z>2.5),
  "each aft wing reaches beyond the short central spine");
 assert.ok(MANTA_WING_OUTLINE.some(([x,z])=>x<1.5&&z>1.5),
  "rear inner wing edge must scallop away from center");
 assert.ok(Math.max(...MANTA_WING_OUTLINE.map(p=>p[0]))<=2.95,
  "shape must remain inside unchanged collision half-span");
});
test("triangulation handles the swept, concave manta rear edge",()=>{
 const triangulated=triangulateWing(MANTA_WING_OUTLINE);
 assert.equal(triangulated.triangles.length,MANTA_WING_OUTLINE.length-2);
 assert.equal(new Set(triangulated.triangles.flat()).size,MANTA_WING_OUTLINE.length);
 const mirrored=triangulateWing(MANTA_WING_OUTLINE.map(([x,z])=>[-x,z]));
 assert.equal(mirrored.triangles.length,triangulated.triangles.length);
 assert.equal(mirrored.orientation,-triangulated.orientation);
 assert.throws(()=>triangulateWing([[0,0],[1,0],[2,0]]),/Invalid/);
});
test("indexed manta body and solid wings are compact, watertight shells",()=>{
 const spine=buildMantaSpine(),wings=buildMantaWings(),canopy=buildMantaCanopy();
 for(const part of [spine,wings,canopy])checkMesh(part);
 assert.equal(MANTA_SPINE.length,8);
 assert.ok(spine.triangles>100);
 assert.ok(wings.triangles>70);
 assert.ok(canopy.triangles>60);
 assert.ok(spine.triangles+wings.triangles+canopy.triangles<
  MANTA_IDENTITY.maxGeometryTriangles);
 const xs=[];
 for(let i=0;i<wings.positions.length;i+=3)xs.push(wings.positions[i]);
 close(Math.max(...xs),2.9);
 close(Math.min(...xs),-2.9);
 assert.ok(MANTA_CANOPY.every((p,i)=>i===0||p.z>MANTA_CANOPY[i-1].z));
});
test("wing halves are perfectly symmetrical without self-crossing triangles",()=>{
 const g=buildMantaWings();
 const n=MANTA_WING_OUTLINE.length;
 const left=g.positions.slice(0,n*2*3),right=g.positions.slice(n*2*3);
 assert.equal(left.length,right.length);
 for(let i=0;i<left.length;i+=3){
  close(left[i],-right[i]);
  close(left[i+1],right[i+1]);
  close(left[i+2],right[i+2]);
 }
});
test("builder returns exactly two existing animation plume handles and a recessed keel",()=>{
 class BufferGeometry {
  setAttribute(key,value){(this.attributes??={})[key]=value;}
  setIndex(value){this.indices=value;}
  computeVertexNormals(){this.normals=true;}
  computeBoundingSphere(){this.bounds=true;}
 }
 class Float32BufferAttribute {
  constructor(a,n){this.array=a;this.itemSize=n;}
 }
 class Material {constructor(options){this.options=options;}}
 class Group {
  constructor(){this.children=[];}
  add(child){this.children.push(child);}
 }
 class Mesh {
  constructor(g,m){this.geometry=g;this.material=m;
   this.rotation={x:0,y:0,z:0};
   this.position={set:(...args)=>{this.xyz=args;}};
   this.scale={z:1};}
 }
 class CylinderGeometry{constructor(...a){this.args=a;}}
 class BoxGeometry{constructor(...a){this.args=a;}}
 const THREE={BufferGeometry,Float32BufferAttribute,MeshPhysicalMaterial:Material,
  MeshBasicMaterial:Material,MeshStandardMaterial:Material,Group,Mesh,
  CylinderGeometry,BoxGeometry,DoubleSide:2};
 const oldShipGlow={tag:"existing boost-responsive material"};
 const craft=buildMantaBlade(THREE,oldShipGlow);
 assert.match(craft.ship.name,/Manta Blade/);
 assert.equal(craft.enginePlumes.length,2);
 assert.ok(craft.enginePlumes.every(m=>m.material===oldShipGlow));
 assert.equal(craft.engineCore.material,oldShipGlow);
 assert.equal(craft.engineCore.name,"Recessed central ion keel");
 assert.equal(craft.ship.children.filter(m=>m.name==="Two broad scalloped manta wings").length,1);
 assert.equal(craft.ship.children.filter(m=>m.name==="Low integrated teardrop canopy").length,1);
 assert.equal(craft.ship.children.filter(m=>m.name==="Wing-integrated venturi thruster").length,2);
 assert.equal(craft.ship.children.filter(m=>m.name==="Inset wing thrust aperture").length,2);
 assert.ok(craft.triangles<CRAFT_MAX);
 assert.equal(craft.ship.children.length,12);
 assert.equal(craft.spec.newDynamicLights,0);
 assert.ok(craft.materials.titanium.options.metalness>.7);
 assert.ok(craft.materials.glass.options.roughness<.2);
});
const CRAFT_MAX=MANTA_IDENTITY.maxGeometryTriangles;
test("live game uses new ship while retaining same authoritative trial and camera",()=>{
 const game=source("game-v0483.mjs"),page=source("index.html");
 assert.match(page,/boot-v0494\.js\?v=0\.4\.9\.4/);
 assert.match(game,/from "\.\/manta-blade-v0483\.mjs"/);
 assert.match(game,/buildMantaBlade\(THREE,shipGlow\)/);
 assert.match(game,/engineCore=craft\.engineCore/);
 assert.match(game,/enginePlumes=craft\.enginePlumes/);
 assert.match(game,/from "\.\/premium-track-v0482\.mjs"/);
 assert.match(game,/from "\.\/trial-v048\.mjs"/);
 assert.match(game,/from "\.\/cinematic-v045\.mjs"/);
 assert.match(game,/from "\.\/flight-motion-v044\.mjs"/);
 assert.match(game,/version:"0\.4\.8\.3"/);
 assert.match(game,/skyshift-manta-v0483-audit\.json/);
 assert.doesNotMatch(game,/buildPremiumShip\(THREE,shipGlow\)/);
 assert.doesNotMatch(game,/new THREE\.PointLight\(.*\)\s*;[\s\S]*new THREE\.PointLight/);
});
test("manual flight physics and boost remain untouched",()=>{
 assert.equal(TRIAL.maxYawRate,1.24);
 assert.equal(TRIAL.startSpeed,44);
 assert.equal(TRIAL.endSpeed,47);
 const f=newFlightState();
 for(let i=0;i<150;i++)stepFlight(f,1/120,{steer:.35});
 assert.ok(f.heading>0&&f.steering>0);
 assert.equal(f.falls,0);
 assert.ok(f.boostActivations>=1,"original first straight boost still triggers");
});
