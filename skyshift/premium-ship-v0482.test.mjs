// SKYSHIFT 0.4.8.2 — sculpted ship, engine continuity and quiet centerline.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 CRAFT_IDENTITY,HULL_SECTIONS,CANOPY_STATIONS,
 buildStreamlinedHull,buildSweptWings,buildCanopyShell,buildPremiumShip
} from "./premium-ship-v0482.mjs";
import {PREMIUM_TRACK,SURFACE_FRAGMENT_GLSL} from "./premium-track-v0482.mjs";
import * as before from "./trial-v048.mjs";
const source=p=>readFileSync(new URL(p,import.meta.url),"utf8");
function indexed(mesh){
 assert.ok(mesh.positions.length%3===0);
 assert.ok(mesh.indices.every(n=>n>=0&&n<mesh.positions.length/3));
 assert.ok(mesh.indices.length%3===0);
 assert.ok(mesh.positions.every(Number.isFinite));
}
test("single sculpted hull has narrow nose, increasing beam then rear taper",()=>{
 const hull=buildStreamlinedHull();
 indexed(hull);
 assert.equal(HULL_SECTIONS.length,8);
 assert.equal(hull.vertices,80);
 assert.ok(hull.triangles>150&&hull.triangles<200);
 assert.ok(HULL_SECTIONS[0].width<.08);
 assert.ok(HULL_SECTIONS[4].width>.7);
 assert.ok(HULL_SECTIONS.at(-1).width<HULL_SECTIONS[5].width);
 assert.ok(HULL_SECTIONS.every((s,i)=>i===0||s.z>HULL_SECTIONS[i-1].z));
});
test("solid swept wings remain symmetric and low-profile",()=>{
 const wings=buildSweptWings();indexed(wings);
 assert.equal(CRAFT_IDENTITY.wingSections,2);
 assert.equal(wings.triangles,40);
 const coords=[];
 for(let i=0;i<wings.positions.length;i+=3)
  coords.push([wings.positions[i],wings.positions[i+1],wings.positions[i+2]]);
 const left=coords.filter(p=>p[0]<0),right=coords.filter(p=>p[0]>0);
 assert.equal(left.length,right.length);
 for(const [x,y,z] of right)
  assert.ok(left.some(p=>Math.abs(p[0]+x)<1e-9&&p[1]===y&&p[2]===z));
 assert.ok(Math.max(...coords.map(p=>Math.abs(p[0])))>=2.9);
 assert.ok(Math.max(...coords.map(p=>p[1]))<.3);
});
test("canopy is shaped by longitudinal height stations and not a cube",()=>{
 const canopy=buildCanopyShell();indexed(canopy);
 assert.equal(CANOPY_STATIONS.length,6);
 assert.ok(canopy.triangles>=75);
 assert.ok(CANOPY_STATIONS[0].width<CANOPY_STATIONS[2].width);
 assert.ok(CANOPY_STATIONS.at(-1).rise<CANOPY_STATIONS[3].rise);
});
test("premium ship returns existing animation controls with zero new dynamic lights",()=>{
 class Geometry{
  setAttribute(k,v){(this.attributes??={})[k]=v;}
  setIndex(v){this.indices=v;}
  computeVertexNormals(){}
  computeBoundingSphere(){}
 }
 class Att{constructor(values,size){this.values=values;this.size=size;}}
 class Material{constructor(options){this.options=options;}}
 class Group{
  constructor(){this.children=[];this.name="";}
  add(child){this.children.push(child);}
 }
 class Mesh{
  constructor(geometry,material){this.geometry=geometry;this.material=material;
   this.rotation={x:0,y:0,z:0};this.position={set:(...args)=>{this.xyz=args;}};
   this.scale={x:1,y:1,z:1};}
 }
 class CylinderGeometry{constructor(...args){this.args=args;}}
 const THREE={BufferGeometry:Geometry,Float32BufferAttribute:Att,
  MeshPhysicalMaterial:Material,MeshStandardMaterial:Material,
  MeshBasicMaterial:Material,Group,Mesh,CylinderGeometry,DoubleSide:2};
 const glow={tag:"Existing neon material"};
 const craft=buildPremiumShip(THREE,glow);
 assert.equal(craft.ship.children.filter(c=>c.name.includes("center hull")).length,1);
 assert.equal(craft.ship.children.filter(c=>c.name.includes("wings")).length,1);
 assert.equal(craft.ship.children.filter(c=>c.name.includes("canopy")).length,1);
 assert.equal(craft.enginePlumes.length,2);
 assert.ok(craft.enginePlumes.every(c=>c.material===glow));
 assert.equal(craft.engineCore.material,glow);
 assert.equal(craft.ship.children.length,13);
 assert.equal(CRAFT_IDENTITY.extraDynamicLights,0);
 assert.ok(craft.materials.titanium.options.metalness>.7);
 assert.ok(craft.materials.canopy.options.roughness<.2);
});
test("spine is a subtle non-emissive 8m segmented material feature, not extra mesh",()=>{
 assert.equal(PREMIUM_TRACK.centerSpineEnabled,true);
 assert.equal(PREMIUM_TRACK.spinePeriodMeters,11.5);
 assert.equal(PREMIUM_TRACK.spineDashMeters,8);
 assert.equal(PREMIUM_TRACK.spineWidthMeters,.15);
 assert.ok(PREMIUM_TRACK.spineContrast<=.25);
 assert.equal(PREMIUM_TRACK.spineEmissive,0);
 assert.equal(PREMIUM_TRACK.floatingDecalBatches,0);
 assert.equal(PREMIUM_TRACK.drawBatches,1);
 assert.match(SURFACE_FRAGMENT_GLSL,/float spinePhase = mod\(trackS, 11\.5\)/);
 assert.match(SURFACE_FRAGMENT_GLSL,/float spineLane/);
 assert.match(SURFACE_FRAGMENT_GLSL,/spine \* 0\.23/);
 assert.match(SURFACE_FRAGMENT_GLSL,/padCoverage \* 0\.80/);
});
test("active game replaces old box/cone prototype without touching movement",()=>{
 const html=source("index.html");
 const game=source("game-v0482.mjs");
 assert.match(html,/boot-v0492\.js\?v=0\.4\.9\.2/);
 assert.match(game,/from "\.\/premium-ship-v0482\.mjs"/);
 assert.match(game,/from "\.\/premium-track-v0482\.mjs"/);
 assert.match(game,/buildPremiumShip\(THREE,shipGlow\)/);
 assert.match(game,/engineCore=craft\.engineCore/);
 assert.match(game,/enginePlumes=craft\.enginePlumes/);
 assert.doesNotMatch(game,/new THREE\.BoxGeometry\(1\.55,.52,3\.85\)/);
 assert.doesNotMatch(game,/new THREE\.ConeGeometry\(\.84,1\.8,4\)/);
 assert.doesNotMatch(game,/refineCraftSilhouette\(THREE,ship\)/);
 assert.match(game,/from "\.\/trial-v048\.mjs"/);
 assert.match(game,/from "\.\/cinematic-v045\.mjs"/);
 assert.match(game,/from "\.\/flight-motion-v044\.mjs"/);
 assert.match(game,/version:"0\.4\.8\.2"/);
 assert.match(game,/skyshift-ship-v0482-audit\.json/);
});
test("pilot input, yaw-rate and boost model remain authoritative",()=>{
 assert.equal(before.TRIAL.maxYawRate,1.24);
 assert.equal(before.TRIAL.startSpeed,44);
 assert.equal(before.TRIAL.endSpeed,47);
 const f=before.newFlightState();
 for(let i=0;i<100;i++)before.stepFlight(f,1/120,{steer:.3});
 assert.ok(f.heading>0);
 assert.ok(f.steering>0);
 assert.equal(f.falls,0);
});
