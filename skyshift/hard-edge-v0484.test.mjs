// SKYSHIFT 0.4.8.4 — Manta hard-edge silhouette & twin-thruster FX.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {MANTA_IDENTITY,MANTA_WING_OUTLINE,ENGINE_SOCKETS,
 buildMantaWings,buildMantaSpine,buildMantaBlade} from "./manta-blade-v0484.mjs";
import {ENGINE_TRAIL_SPEC,trailMotionState,createTwinEngineFX}
 from "./engine-trails-v0484.mjs";
import {newFlightState,stepFlight,TRIAL} from "./trial-v048.mjs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
test("Angular wing shape has a sharp outer shoulder and extended clipped stern",()=>{
 assert.equal(MANTA_IDENTITY.hardEdgeProfile,true);
 assert.equal(MANTA_IDENTITY.name,"Manta Blade");
 assert.equal(MANTA_WING_OUTLINE.length,13);
 const max=Math.max(...MANTA_WING_OUTLINE.map(p=>p[0]));
 assert.equal(max,2.90);
 const rear=MANTA_WING_OUTLINE.filter(p=>p[1]>2);
 assert.ok(rear.length>=2&&rear.some(p=>p[0]<2.1));
 assert.ok(MANTA_WING_OUTLINE.some(([x,z])=>x>2.85&&z<0));
 assert.equal(buildMantaWings().triangles,96);
 assert.ok(buildMantaSpine().triangles<200);
 assert.equal(MANTA_IDENTITY.changesFlightPhysics,false);
});
test("Two true wing engine sockets replace synthetic midline wake",()=>{
 assert.equal(ENGINE_SOCKETS.length,2);
 assert.equal(ENGINE_SOCKETS[0].x,-ENGINE_SOCKETS[1].x);
 assert.equal(ENGINE_SOCKETS[0].z,ENGINE_SOCKETS[1].z);
 assert.ok(Math.abs(ENGINE_SOCKETS[0].x)>=1.9);
 assert.ok(ENGINE_SOCKETS.every(s=>s.z>2.45));
 assert.equal(ENGINE_TRAIL_SPEC.emitters,2);
 assert.equal(ENGINE_TRAIL_SPEC.attachedToShip,true);
 assert.equal(ENGINE_TRAIL_SPEC.newParticles,0);
 assert.equal(ENGINE_TRAIL_SPEC.extraDynamicLights,0);
});
test("Normal speed trails remain short and boost gives room for later escalation",()=>{
 const normal=trailMotionState(44,1,.2,0,0);
 const boosted=trailMotionState(57,1.3,.65,.16,0);
 const future=trailMotionState(85,1.3,1,.28,0);
 assert.ok(normal.length>=2&&normal.length<3.4);
 assert.ok(normal.opacity<.30);
 assert.ok(boosted.length>normal.length+3);
 assert.ok(boosted.opacity>normal.opacity);
 assert.ok(boosted.length<ENGINE_TRAIL_SPEC.maxBoostLengthMeters);
 assert.ok(future.length<=ENGINE_TRAIL_SPEC.maxBoostLengthMeters);
 assert.ok(Math.abs(boosted.sideBias)<.04);
 assert.equal(trailMotionState(44,1).emitterCount,2);
});
test("Actual FX geometry emits exactly two independent streak pairs, not center",()=>{
 class V{constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}copy(v){Object.assign(this,v);return this;}}
 class C{
  constructor(v){this.v=v;}
  setHex(v){this.v=v;return this;}
  copy(v){this.v=v.v;return this;}
  lerp(){return this;}
  multiplyScalar(){return this;}
 }
 class B{constructor(a,n){this.array=a;this.itemSize=n;}setUsage(){return this;}}
 class G{constructor(){this.attributes={};}setAttribute(k,v){this.attributes[k]=v;}dispose(){this.disposed=true;}}
 class Mat{constructor(o){Object.assign(this,o);this.color=new C(o.color);}dispose(){this.disposed=true;}}
 class Mesh{constructor(g,m){this.geometry=g;this.material=m;this.position=new V();this.rotation=new V();this.scale={setScalar(){},set(){}};}removeFromParent(){this.removed=true;}}
 class Ship{constructor(){this.children=[];this.position=new V();this.rotation=new V();this.scale={set(){}};}add(o){this.children.push(o);}}
 const THREE={BufferGeometry:G,BufferAttribute:B,Float32BufferAttribute:B,
  MeshBasicMaterial:Mat,LineBasicMaterial:Mat,Mesh,LineSegments:Mesh,
  Vector3:V,Color:C,Sphere:class{constructor(){this.center=new V();}},
  DynamicDrawUsage:1,DoubleSide:2,AdditiveBlending:3};
 const ship=new Ship(),world=new Ship(),accent={opacity:0};
 const fx=createTwinEngineFX(THREE,world,ship,accent);
 assert.equal(ship.children.length,1);
 assert.equal(world.children.length,1);
 fx.frame({dt:1/60,playing:true,flight:{forwardSpeed:44,boostMultiplier:1},
  ship,sectorColor:0x43ddf0,motionWeight:{engineEnergy:.2}});
 const mesh=ship.children[0],position=mesh.geometry.attributes.position.array;
 const mid0=position[0],mid1=position[36];
 assert.ok(Math.abs(mid0+1.99)<.1);
 assert.ok(Math.abs(mid1-1.99)<.1);
 assert.equal(position.length,72);
 assert.ok(position[2]>2.5&&position[38]>2.5);
 assert.ok(position[8]>position[2]);
 const defaultStats=fx.stats();
 assert.equal(defaultStats.actualEmitters,2);
 fx.frame({dt:1/60,playing:true,flight:{forwardSpeed:57,boostMultiplier:1.3},
  ship,sectorColor:0x43ddf0,motionWeight:{engineEnergy:.65}});
 assert.ok(fx.stats().peakTrailLengthMeters>defaultStats.peakTrailLengthMeters);
 assert.ok(accent.opacity>.7);
 fx.reset();assert.equal(mesh.visible,false);
 fx.dispose();assert.ok(mesh.removed);
});
test("No old center engine light or +/-0.78m fake emitters survive live integration",()=>{
 const game=read("game-v0484.mjs");
 const old=read("premium-v045.mjs");
 assert.match(game,/from "\.\/engine-trails-v0484\.mjs"/);
 assert.match(game,/from "\.\/manta-blade-v0484\.mjs"/);
 assert.match(game,/ENGINE_SOCKETS\.map/);
 assert.match(game,/createTwinEngineFX\(THREE,scene,ship,craft\.materials\.cyan\)/);
 assert.match(game,/for\(const light of engineLights\)/);
 assert.doesNotMatch(game,/engineLight\.position\.set\(0,-\.52,1\.8\)/);
 assert.doesNotMatch(game,/createPremiumFlightFX\(THREE,scene\)/);
 assert.match(old,/offset=sign\*\.78/);
 assert.match(game,/enginePlumes\[i\]\.scale\.set\(shape\+bankVariation/);
});
test("The old pilot/boost model and course visual material are unchanged",()=>{
 const game=read("game-v0484.mjs"),html=read("index.html");
 assert.match(html,/boot-v0495\.js\?v=0\.4\.9\.5/);
 assert.match(game,/from "\.\/trial-v048\.mjs"/);
 assert.match(game,/from "\.\/premium-track-v0482\.mjs"/);
 assert.match(game,/from "\.\/cinematic-v045\.mjs"/);
 assert.match(game,/from "\.\/flight-motion-v044\.mjs"/);
 assert.match(game,/version:"0\.4\.8\.4"/);
 assert.match(game,/skyshift-manta-v0484-audit\.json/);
 assert.equal(TRIAL.maxYawRate,1.24);
 assert.equal(TRIAL.startSpeed,44);
 const st=newFlightState();
 for(let i=0;i<150;i++)stepFlight(st,1/120,{steer:.3});
 assert.equal(st.falls,0);
 assert.ok(st.boostActivations>=1);
});
