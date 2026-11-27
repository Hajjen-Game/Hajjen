import test from "node:test";
import assert from "node:assert/strict";
import {OPT_0111,bloomScaleFor,scaledBloomSize,tuneBloomPass,
 newHudBudget,createDomWriteCache} from "../../core/render-optimizer-v0111.mjs";
import {perfConfig,recordPerfFrame,newPerfMonitor} from "../../core/performance-audit-v0111.mjs";
test("selective bloom scales only blur input, retains HDR beauty and SMAA",()=>{
 assert.equal(bloomScaleFor({lowMemory:false}),0.88);
 assert.equal(bloomScaleFor({lowMemory:true}),0.78);
 assert.equal(bloomScaleFor({lowMemory:true,forceFullBloom:true}),1);
 assert.deepEqual(scaledBloomSize(1250,700,.88),{width:1100,height:616});
 const sizes=[];
 const pass={setSize(w,h){sizes.push([w,h])}};
 const result=tuneBloomPass(pass,.78);
 pass.setSize(1000,500);
 assert.deepEqual(sizes,[[780,390]]);
 assert.deepEqual(result.stats(),{
  scale:.78,sourceWidth:1000,sourceHeight:500,bloomInputWidth:780,
  bloomInputHeight:390,bloomPixelFraction:.6084,
  fullResolutionBeauty:true,fullResolutionSmaa:true,postPassesAdded:0
 });
 assert.equal(OPT_0111.postPassesAdded,0);
});
test("HUD gets first update, capped 30Hz, and safe reset",()=>{
 const c=newHudBudget(30);
 assert.equal(c.shouldUpdate(1000),true);
 assert.equal(c.shouldUpdate(1010),false);
 assert.equal(c.shouldUpdate(1033.34),true);
 const hud=c.stats();
 assert.ok(Math.abs(hud.targetHz-30)<1e-9);
 assert.equal(hud.updates,2);
 assert.equal(hud.skips,1);
 c.reset();
 assert.equal(c.shouldUpdate(1010),true);
});
test("unchanged DOM attributes, text, HTML and style are not written again",()=>{
 const el={textContent:"",innerHTML:"",style:{width:"",
  setProperty(n,v){this[n]=v}},setAttribute(n,v){this[n]=v}};
 const cache=createDomWriteCache();
 cache.text(el,"ZONE");cache.text(el,"ZONE");
 cache.html(el,"<small>1</small>");cache.html(el,"<small>1</small>");
 cache.width(el,"90%");cache.width(el,"90%");
 cache.attr(el,"aria-label","LAP 1");cache.attr(el,"aria-label","LAP 1");
 cache.property(el,"--rail-contact",".2");cache.property(el,"--rail-contact",".2");
 assert.deepEqual(cache.stats(),{writes:5,skips:5});
 cache.reset();cache.text(el,"ZONE");
 assert.deepEqual(cache.stats(),{writes:1,skips:0});
});
test("full-bloom control preset freezes quality and typed arrays record without allocation",()=>{
 const c=perfConfig("?perf=1&perfPreset=bloom-full");
 assert.equal(c.preset,"bloom-full");
 assert.equal(c.fixedQuality,true);
 const p=newPerfMonitor(8);
 assert.equal(recordPerfFrame(p,{
  frameMs:16.7,physicsMs:0.5,hudMs:0.2,presentationMs:1,
  renderCpuMs:7,steps:2,drawCalls:101,triangles:220000}),true);
 assert.equal(p.buffer[0],Math.fround(16.7));
 assert.equal(p.buffer[7],220000);
});

import {normalizeAdvancedGpu,readAdvancedGpu,saveAdvancedGpu,resolveBloomScale} from "../../core/advanced-gpu-settings.mjs";
import {createConservativeDepthTiles} from "../../rendering/conservative-tunnel-occlusion.mjs";
import {railDetailBins} from "../../rendering/distant-detail-lod.mjs";
test("0.29.3.1 bloom live changes only blur mip input dimensions and restores original",()=>{
 const sizes=[],pass={setSize:(w,h)=>sizes.push([w,h])},b=tuneBloomPass(pass,.88);
 pass.setSize(1560,720);b.setScale(.65);b.setScale(.88);
 assert.deepEqual(sizes,[[1373,634],[1014,468],[1373,634]]);
 assert.equal(b.scale,.88);assert.equal(b.stats().fullResolutionBeauty,true);assert.equal(b.stats().fullResolutionSmaa,true);
 assert.equal(resolveBloomScale("0.78",.78),.78);assert.equal(resolveBloomScale("original",.88),.88);
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};
 assert.deepEqual(normalizeAdvancedGpu(),{bloom:"0.78",exterior:false,detailLod:false,occlusion:false});
 saveAdvancedGpu(storage,{bloom:"0.65",exterior:true,detailLod:true,occlusion:true});
 assert.deepEqual(readAdvancedGpu(storage),{bloom:"0.65",exterior:true,detailLod:true,occlusion:true});
});
test("0.29.3.1 conservative depth tiles reject unknown edges, near and uncovered targets",()=>{
 const t=createConservativeDepthTiles(16,16),p=(x,y,z)=>({x,y,z});
 assert.equal(t.occludes([p(0,0,.8)]),false);
 t.cover(p(-.99,-.99,0),p(.99,-.99,0),p(0,.99,0));
 assert.ok(t.coveredTiles()>0);
 assert.equal(t.occludes([p(-.05,-.4,.8),p(.05,-.3,.8)]),true);
 assert.equal(t.occludes([p(-.05,-.4,-.1),p(.05,-.3,.8)]),false);
 assert.equal(t.occludes([p(-.9,.8,.8),p(.05,-.3,.8)]),false);
 assert.equal(t.occludes([p(0,0,1.1)]),false);
 t.clear();assert.equal(t.coveredTiles(),0);
 assert.equal(t.cover(p(-.9,-.9,-1.1),p(.9,-.9,0),p(0,.9,0)),0);
});
test("0.29.3.1 rail cap triangles stay distinct from short seam triangles",()=>{
 const p={count:6,getX:i=>i,getZ:i=>0},arc=[0,1.15,1.15,10,10.1,10.1],c={count:6,getX:i=>arc[i]};
 assert.deepEqual(railDetailBins(p,c),{channel:[0,1,2],bins:[[3,4,5]]});
});
