import test from "node:test";
import assert from "node:assert/strict";
import {OPT_0111,bloomScaleFor,scaledBloomSize,tuneBloomPass,
 newHudBudget,createDomWriteCache} from "../../render-optimizer-v0111.mjs";
import {perfConfig,recordPerfFrame,newPerfMonitor} from "../../performance-audit-v0111.mjs";
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
