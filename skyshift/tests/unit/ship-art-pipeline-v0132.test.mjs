// SKYSHIFT 0.13.2 — Blender hero contract, safe fallback and zero-physics tests.
import test from "node:test";
import assert from "node:assert/strict";
import {
 SHIP_ART_0132,requestedShipArt,assessHeroAsset,createShipArtState,
 shipArtAudit,PROCEDURAL_BODY_MESHES_0132,installHeroBodyAndTail
} from "../../ship-art-pipeline-v0132.mjs";
import {createShipArtController} from "../../ship-hero-loader-v0132.mjs";
function makeObject(name,options={}){
 return {name,isMesh:options.mesh??true,isLight:options.light??false,
  isSkinnedMesh:options.skin??false,
  geometry:{attributes:{position:{count:options.count??108}}},
  material:{name:options.material??"armor"},
  traverse(cb){cb(this);for(const c of this.children??[])c.traverse(cb);},
  children:options.children??[]};
}
function asset({omit="",extra=0,texture=false,lights=0}={}){
 const materialPool=new Map();
 const parts=SHIP_ART_0132.requiredMeshes.filter(n=>n!==omit)
  .map((name,i)=>{
   const label=["armor","wing","glass","glow","engine","tail"][i%6];
   if(!materialPool.has(label))materialPool.set(label,{name:label});
   const obj=makeObject(name,{count:120,material:label});
   obj.material=materialPool.get(label);
   return obj;
  });
 for(let i=0;i<extra;i++)parts.push(makeObject("Hero_Detail_"+i,{count:120}));
 if(texture)parts[0].material={map:{image:{}},name:"forbidden-texture"};
 if(lights)parts.push(makeObject("Fake Light",{mesh:false,light:true}));
 const root=makeObject("Root",{mesh:false,children:parts});
 return root;
}
test("GLB contract has 17 named sockets and the 9 real tail joints",()=>{
 assert.equal(SHIP_ART_0132.tailSegments,9);
 assert.equal(SHIP_ART_0132.tailSegmentLength,.68);
 assert.equal(SHIP_ART_0132.requiredMeshes.length,17);
 for(let i=1;i<=9;i++)assert.ok(SHIP_ART_0132.requiredMeshes.includes(
  "Hero_Tail_Plate_"+String(i).padStart(2,"0")));
 assert.ok(SHIP_ART_0132.maxTriangles<=8000);
 assert.ok(SHIP_ART_0132.maxAssetBytes<=700000);
 assert.equal(SHIP_ART_0132.v0132PreviewRequiresOptIn,true);
 assert.equal(SHIP_ART_0132.noPhysicsChange,true);
});
test("no user query uses runtime procedural ship and no Blender imports",()=>{
 for(const search of ["","?shipArt=classic","?perf=1","?shipArt=HERO"]){
  assert.equal(requestedShipArt(search),"procedural");
 }
 assert.equal(requestedShipArt("?shipArt=hero"),"hero");
 assert.equal(PROCEDURAL_BODY_MESHES_0132.length,6);
 const c=createShipArtController({},{
  search:"",currentCraft:()=>null,currentShipId:()=>null});
 return c.onCraftBuilt({ship:{}},"stingray").then(st=>{
  assert.equal(st.status,"procedural");
  assert.equal(st.attempts,0);
  assert.equal(st.loaded,false);
  assert.equal(c.audit().physicalFlightUnchanged,true);
 });
});
test("Blender mesh contract validates every socket and reasonable budgets",()=>{
 const pass=assessHeroAsset(asset());
 assert.equal(pass.valid,true);
 assert.equal(pass.errors.length,0);
 assert.equal(pass.meshes,17);
 assert.equal(pass.triangles,17*120/3);
 assert.equal(pass.materials,6);
 assert.equal(pass.textureImages,0);
 assert.equal(pass.lights,0);
 assert.equal(pass.skinned,0);
});
test("missing 9-link plates, excessive batches, lights and maps are rejected",()=>{
 const cases=[
  asset({omit:"Hero_Tail_Plate_09"}),
  asset({extra:25}),
  asset({texture:true}),
  asset({lights:1})
 ];
 for(const input of cases)assert.equal(assessHeroAsset(input).valid,false);
});
test("corrupted/nonexistent hero preview fails gracefully to procedural",async()=>{
 const craft={ship:{}};
 const c=createShipArtController({},{
  search:"?shipArt=hero",currentCraft:()=>craft,currentShipId:()=>"stingray",
  fetchAsset:async()=>({ok:false,status:404})
 });
 await c.onCraftBuilt(craft,"stingray");
 assert.equal(c.state.status,"fallback");
 assert.equal(c.state.activeMode,"procedural");
 assert.equal(c.state.loaded,false);
 assert.ok(c.audit().error.includes("404"));
 assert.equal(c.audit().proceduralFallback,true);
});
test("preview on Manta Blade never fetches GLB or changes its materials",async()=>{
 let calls=0;
 const c=createShipArtController({},{
  search:"?shipArt=hero",
  fetchAsset:async()=>{calls++;throw Error("should never fetch");}
 });
 await c.onCraftBuilt({ship:{}},"manta");
 assert.equal(c.state.status,"waiting-for-stingray");
 assert.equal(calls,0);
});
test("stale async request cannot replace a newly selected Manta ship",async()=>{
 let done;
 const gate=new Promise(resolve=>done=resolve);
 const craft={ship:{}};
 const c=createShipArtController({},{
  search:"?shipArt=hero",currentCraft:()=>null,currentShipId:()=>"manta",
  fetchAsset:async()=>{await gate;return {ok:false,status:404};}
 });
 const pending=c.onCraftBuilt(craft,"stingray");
 await c.onCraftBuilt({ship:{}},"manta");
 done();await pending;
 assert.equal(c.state.status,"waiting-for-stingray");
 assert.equal(c.state.heroApplied,false);
});
test("bad assets cannot mutate existing procedural Stingray or physics",()=>{
 const fakeCraft={ship:{name:"procedural",children:[]}};
 assert.throws(()=>installHeroBodyAndTail({},fakeCraft,asset({omit:"Hero_Canopy"})),
  /invalid/);
 assert.deepEqual(fakeCraft.ship.children,[]);
 const state=createShipArtState();
 assert.equal(shipArtAudit(state).originalTailRigPreserved,true);
 assert.equal(shipArtAudit(state).originalEngineSocketsPreserved,true);
});
