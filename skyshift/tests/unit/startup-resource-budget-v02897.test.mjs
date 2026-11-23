import test from "node:test";
import assert from "node:assert/strict";
import {acquirePremiumMetalTexture0262,premiumMetalTexturePoolStats0262,
 buildPremiumMetalAtlas0262} from "../../rendering/premium-metal-surface-v0262.mjs";
function makeMock(){
 const records={allocations:0,disposals:0};
 class DataTexture{
  constructor(pixels,width,height,format,type){
   records.allocations++;
   Object.assign(this,{image:{data:pixels,width,height},format,type});
  }
  dispose(){records.disposals++;}
 }
 const THREE={DataTexture,RGBAFormat:12,UnsignedByteType:13,
  RepeatWrapping:14,LinearFilter:15,LinearMipmapLinearFilter:16,
  NoColorSpace:""};
 return {THREE,records};
}
test("ten original shared Skyline tunnel modules lease one identical GPU atlas",()=>{
 const {THREE,records}=makeMock();
 const leases=Array.from({length:10},()=>acquirePremiumMetalTexture0262(THREE,false));
 assert.equal(records.allocations,1);
 assert.equal(leases[0].reused,false);
 assert.ok(leases.slice(1).every(x=>x.reused));
 assert.ok(leases.every(x=>x.texture===leases[0].texture));
 assert.equal(premiumMetalTexturePoolStats0262(THREE).references[0].refs,10);
 assert.equal(leases[0].texture.image.width,256);
 assert.deepEqual(leases[0].texture.image.data,buildPremiumMetalAtlas0262(256).pixels);
 for(const lease of leases.slice(0,-1))lease.release();
 assert.equal(records.disposals,0,"never free a texture while live module still owns it");
 leases.at(-1).release();leases.at(-1).release();
 assert.equal(records.disposals,1,"release once after final original module");
 assert.equal(premiumMetalTexturePoolStats0262(THREE).textures,0);
 const other=acquirePremiumMetalTexture0262(THREE,false);
 assert.equal(records.allocations,2,"new live scene gets a fresh atlas");
 other.release();assert.equal(records.disposals,2);
});
test("four-GB budget uses separate original 128px atlas; classic A/B remains exact",()=>{
 const {THREE,records}=makeMock();
 const high=acquirePremiumMetalTexture0262(THREE,false);
 const low=acquirePremiumMetalTexture0262(THREE,true);
 assert.equal(records.allocations,2);
 assert.notEqual(high.texture,low.texture);
 assert.equal(low.texture.image.width,128);
 assert.equal(high.texture.image.width,256);
 assert.deepEqual(low.texture.image.data,buildPremiumMetalAtlas0262(128).pixels);
 const oldA=acquirePremiumMetalTexture0262(THREE,false,{shared:false});
 const oldB=acquirePremiumMetalTexture0262(THREE,false,{shared:false});
 assert.equal(records.allocations,4);
 assert.notEqual(oldA.texture,oldB.texture);
 assert.deepEqual(oldA.texture.image.data,high.texture.image.data,
  "classic and shared 256px texels remain bit-identical");
 oldA.release();oldB.release();low.release();high.release();
 assert.equal(records.disposals,4);
 assert.equal(premiumMetalTexturePoolStats0262(THREE).textures,0);
});
