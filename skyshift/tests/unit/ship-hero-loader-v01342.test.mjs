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

import {createShipSourceCache} from "../../core/ship-source-cache.mjs";

test("EF06 shares one pending source request and one bounded immutable cache entry",async()=>{
 let finish,requests=0;
 const c=createShipSourceCache({maxBytes:10,fetchSource:()=>{requests++;return new Promise(r=>finish=r);}});
 const a=c.acquire(),b=c.acquire();assert.equal(a,b);
 assert.equal(requests,1);finish("mesh");
 assert.equal(await a,"mesh");assert.equal(await c.acquire(),"mesh");
 c.cancelPending();assert.deepEqual(c.audit(),{closed:false,requests:1,hits:2,pending:false,bytes:4});
 c.dispose();assert.equal(c.audit().bytes,0);await assert.rejects(c.acquire(),/disposed/);
});
test("EF06 aborts obsolete fetches and refuses late responses, oversized bytes and stale cache entries",async()=>{
 let signals=[],resolvers=[];
 const c=createShipSourceCache({maxBytes:4,fetchSource:s=>{signals.push(s);return new Promise(r=>resolvers.push(r));}});
 const old=c.acquire(),oldRejected=assert.rejects(old,/cancelled/);
 c.cancelPending();assert.equal(signals[0].aborted,true);
 const next=c.acquire();resolvers[0]("old");await oldRejected;
 resolvers[1]("new");assert.equal(await next,"new");assert.equal(c.audit().bytes,3);
 c.invalidate();const tooLarge=c.acquire(),bad=assert.rejects(tooLarge,/exceeds mobile budget/);
 resolvers[2]("ååå");await bad;assert.equal(c.audit().bytes,0);
 const last=c.acquire(),cancelled=assert.rejects(last,/cancelled/);c.dispose();
 assert.equal(signals[3].aborted,true);resolvers[3]("last");await cancelled;
});
test("EF06 superseded Stingray response does not construct an obsolete parser and reuses source bytes",async()=>{
 let resolveFetch,active=F(),parsers=0,requests=0;
 const ctrl=createShipArtController({},{
  currentCraft:()=>active,currentShipId:()=>"stingray",
  fetchAsset:()=>{requests++;return new Promise(r=>resolveFetch=r);},
  loaderFactory:async()=>{parsers++;return {parse(_src,_url,_ok,fail){fail(Error("invalid fixture"));}};}
 });
 const old=ctrl.onCraftBuilt(active,"stingray");
 active=F();const latest=ctrl.onCraftBuilt(active,"stingray");
 resolveFetch({ok:true,text:async()=>"fixture"});
 await Promise.all([old,latest]);assert.equal(parsers,1);assert.equal(requests,1);
 assert.equal(ctrl.state.status,"fallback");
 assert.equal(ctrl.audit().sourceCache.bytes,0);
});
test("EF06 disposed ship loader aborts pending request and cannot install a late scene",async()=>{
 let release,signal,parsers=0;const craft=F();
 const c=createShipArtController({},{
  currentCraft:()=>craft,currentShipId:()=>"stingray",
  fetchAsset:(_url,opts)=>{signal=opts.signal;return new Promise(r=>release=r);},
  loaderFactory:async()=>{parsers++;throw Error("unexpected parser");}
 });
 const pending=c.onCraftBuilt(craft,"stingray");c.dispose();c.dispose();
 assert.equal(signal.aborted,true);release({ok:true,text:async()=>"mesh"});await pending;
 await c.onCraftBuilt(craft,"stingray");assert.equal(parsers,0);
 assert.equal(c.audit().sourceCache.closed,true);
});
