// SKYSHIFT 0.13.4.2 — real release fallback and optional Blender A/B gating.
import test from "node:test";
import assert from "node:assert/strict";
import {createShipArtController} from "../../ship-hero-loader-v01342.mjs";

const F=()=>({ship:{name:"procedural"}});
test("normal 0.13.4.2 wants Stingray Hero but never loads it on Manta",async()=>{
 let requested=0;
 const ctrl=createShipArtController({},{
  fetchAsset:async()=>{requested++;throw Error("should not fetch");}
 });
 await ctrl.onCraftBuilt(F(),"manta");
 assert.equal(ctrl.state.requested,"hero");
 assert.equal(ctrl.state.status,"waiting-for-stingray");
 assert.equal(requested,0);
 assert.equal(ctrl.state.heroApplied,false);
});
test("classic flag explicitly restores old fully procedural Stingray",async()=>{
 let calls=0;
 const ctrl=createShipArtController({},{
  search:"?shipArt=classic",
  fetchAsset:async()=>{calls++;throw Error("no fetch expected");}
 });
 await ctrl.onCraftBuilt(F(),"stingray");
 assert.equal(ctrl.state.requested,"procedural");
 assert.equal(ctrl.state.status,"procedural");
 assert.equal(ctrl.state.attempts,0);
 assert.equal(calls,0);
 assert.equal(ctrl.audit().originalTailRigPreserved,true);
});
test("failed or missing V4 glTF leaves the original live ship intact",async()=>{
 const craft=F(),stateBefore=craft.ship;
 const ctrl=createShipArtController({},{
  fetchAsset:async()=>({ok:false,status:503})
 });
 await ctrl.onCraftBuilt(craft,"stingray");
 assert.equal(craft.ship,stateBefore);
 assert.equal(ctrl.state.status,"fallback");
 assert.equal(ctrl.state.heroApplied,false);
 assert.ok(ctrl.state.error.includes("503"));
});
test("default fetch targets shipped V4 glTF; experimental Blender targets V4 GLB",async()=>{
 for(const mode of ["", "?shipArt=blender"]){
  let path="";
  const ctrl=createShipArtController({},{
   search:mode,
   fetchAsset:async url=>{
    path=url.href;
    return {ok:false,status:404};
   }
  });
  await ctrl.onCraftBuilt(F(),"stingray");
  assert.ok(path.endsWith(mode?"stingray-evo-hero-v4.glb":
   "stingray-evo-hero-v4.gltf"));
  assert.equal(ctrl.state.status,"fallback");
 }
});
test("stale async response never replaces a newly selected Manta Blade",async()=>{
 let release;
 const gate=new Promise(resolve=>release=resolve);
 const original=F(),manta=F();
 let active=original,selected="stingray";
 const c=createShipArtController({},{
  currentCraft:()=>active,currentShipId:()=>selected,
  fetchAsset:async()=>{await gate;return {ok:false,status:404};}
 });
 const pending=c.onCraftBuilt(original,"stingray");
 active=manta;selected="manta";
 await c.onCraftBuilt(manta,"manta");
 release();await pending;
 assert.equal(c.state.status,"waiting-for-stingray");
 assert.equal(c.state.heroApplied,false);
});
