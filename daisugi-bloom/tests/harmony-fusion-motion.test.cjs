"use strict";
// Fusion Motion 4.3.4: verify full-opacity source travel, survivor reveal
// AFTER all sources arrive, cleanup, and legible masterpiece harvesting.
const fs=require("node:fs");
const path=require("node:path");
const assert=require("node:assert/strict");
const app=fs.readFileSync(path.join(__dirname,"../harmony/app.js"),"utf8");
function between(start,end){
 const a=app.indexOf(start),b=app.indexOf(end,a);
 assert(a>=0&&b>a,"Cannot isolate "+start);
 return app.slice(a,b);
}
const gather=between("function fusionGatherFrames(","// Energy travels out from the masterpiece");
const samples=[],events=[];
const pieces=Array.from({length:49},()=>({
 style:{visibility:""},classList:{add(){}},
 cloneNode(){return {style:{},classList:{add(){}},remove(){}}}
}));
const boardTiles=pieces.map(p=>({
 querySelector:()=>p,
 append(){events.push(["afterglowAdded"])}
}));
const indexRect=i=>({left:(i%7)*50,top:Math.floor(i/7)*50,width:48,height:48});
const fxAt=className=>{
 events.push(["fx",className]);
 return {style:{},remove(){events.push(["remove",className])}};
};
const makeFxLayer=()=>({rect:{left:0,top:0},node:{
 appendChild(){events.push(["ghost"])},
 append(){events.push(["dustAdded"])},
 classList:{add(name){events.push(["layerClass",name])}},
 remove(){events.push(["layerRemoved"])}
}});
const animateNode=(node,frames,duration,options={})=>{
 samples.push({frames,duration,options,kind:node.className||""});
 events.push(["animate",duration]);
 return Promise.resolve();
};
const fakeDocument={
 hidden:false,
 createElement:()=>({
  style:{},dataset:{},className:"",setAttribute(){},remove(){events.push(["sparkRemoved"])}
 })
};
const fusion=new Function("FAST","MOBILE_LITE","LITE_FX","document","Element",
 "boardTiles","indexRect","fxAt","makeFxLayer","animateNode","sound","renderBoard",
 "fusionBurst","evolveFamilyFx","evolutionStageLabels",gather+
 "return {fusionGatherFrames,playFusion};")(
 ()=>false,true,()=>false,fakeDocument,{prototype:{animate(){}}},
 boardTiles,indexRect,fxAt,makeFxLayer,animateNode,
 ()=>events.push(["sound"]),()=>events.push(["render"]),
 ()=>events.push(["burst"]),()=>events.push(["evolution"]),()=>events.push(["stageLabels"])
);
const k=fusion.fusionGatherFrames(100,65);
assert.equal(k.length,6);
assert(k.slice(0,5).every(step=>step.opacity===1),"Moving pieces must remain entirely visible");
assert(k[5].opacity>=.85&&k[5].transform.includes("100px,65px"),"Source must arrive intact at exact destination");
assert.equal(k[0].offset,0);
assert.equal(k[k.length-1].offset,1);
async function main(){
 await fusion.playFusion({board:[],groups:[{at:17,removed:[15,16],family:"koi",to:3,number:3}]});
 const travel=samples.filter(x=>x.duration===280);
 assert.equal(travel.length,3,"Two source ghosts plus one survivor anticipation");
 assert.equal(events.filter(x=>x[0]==="ghost").length,2);
 assert.equal(samples.filter(x=>x.kind.includes("fusion-flow-bead")).length,0,
  "Original fusion motion must not include any travelling Flow Polish beads");
 assert.equal(k[1].transform,"translate3d(0px,0px,0) scale(1.075)",
  "Fusion motion must match the pre-Flow Polish pickup keyframe");
 assert.equal(events.filter(x=>x[0]==="dustAdded").length,10,
  "Both vacated cells should receive five drifting dust motes apiece");
 assert(events.some(x=>x[0]==="layerClass"&&x[1]==="magic-dust-layer"),
  "Dust must live in its own FX layer, not in tile DOM");
 assert(events.filter(x=>x[0]==="sparkRemoved").length>=10,
  "Independent dust particles must always clean up");
 const twinkles=samples.filter(x=>x.kind.includes("fusion-afterglow-spark"));
 assert.equal(twinkles.length,10);
 assert(new Set(twinkles.map(x=>x.options.delay)).size>=4,
  "Floating dust must start at different times");
 assert(twinkles.every(x=>{
  const first=x.frames[0],last=x.frames.at(-1);
  return x.frames.length===5&&x.options.easing==="linear"&&
   first.opacity===0&&last.opacity===0&&
   x.duration>=290&&x.duration<=380&&x.duration+x.options.delay<=505&&
   x.frames[2].opacity>=.70&&
   x.frames[2].transform!==first.transform&&last.transform!==first.transform;
 }),"Dust motes should drift up gently over ~300-380ms rather than flashing in place");

 const lastGather=events.findIndex(e=>e[0]==="layerRemoved");
 const render=events.findIndex(e=>e[0]==="render");
 assert(lastGather>=0&&render>lastGather,"Survivor stage must update only after visible gathering");
 assert.equal(pieces[15].style.visibility,"","Source visibility must be restored");
 assert.equal(pieces[16].style.visibility,"","Source visibility must be restored");
 assert(!events.some(e=>e[0]==="fx"&&e[1].startsWith("fusion-intake")),
  "Ordinary fusions must NOT add the unwanted expanding contact circle");

 // 4.3.4 retains the exact 280ms tempo for every 3–5-piece fusion, and
 // multiple groups resolve together. Positioning is verified separately by
 // the browser regression test, which targets real tile coordinates.
 for(const [n,removed,to] of [
  [3,[1,2],3],
  [4,[8,9,10],11],
  [5,[29,30,31,32],33]
 ]){
  const initial=samples.length;
  await fusion.playFusion({board:[],groups:[{at:to,removed,family:"fan",to:2,number:n}]});
  const motion=samples.slice(initial).filter(x=>x.duration===280);
  assert.equal(motion.length,n,"All "+n+" matched pieces must share the fast 280ms clock");
  assert(motion.every(x=>x.frames.at(-1).offset===1));
  assert(samples.slice(initial).every(x=>!x.kind.includes("fusion-flow-bead")),
   "All 3/4/5-object fusions must keep their original motion and no travelling beads");

 }
 const initial=samples.length;
 await fusion.playFusion({board:[],groups:[
  {at:10,removed:[9,11],family:"sakura",to:2,number:3},
  {at:24,removed:[22,23,25,26],family:"lantern",to:3,number:5}
 ]});
 assert.equal(samples.slice(initial).filter(x=>x.duration===280).length,8,
  "Parallel 3+5 groups must complete together at the restored 280ms speed");
 assert.equal(samples.slice(initial).filter(x=>x.kind.includes("fusion-flow-bead")).length,0,
  "Parallel groups must also use only the original fusion movement");


 // Harvest previously shrank objects to 15% over 150ms: almost invisible.
 const harvest=between("async function animateEvent(evt){","async function playEvents(events){");
 const motions=[],order=[];
 const harvestEvent=new Function("presentedBoard","FAST","MOBILE_LITE","Element","boardTiles","indexRect","fxAt","animateNode","sound","renderBoard","sparkleVacatedCells",harvest+"return animateEvent;")(
  [],()=>false,true,{prototype:{animate(){}}},boardTiles,indexRect,fxAt,
  (n,frames,ms)=>{motions.push({frames,ms});order.push("movement");return Promise.resolve()},
  ()=>order.push("sound"),()=>order.push("render"),
  (positions,board)=>{order.push("harvest-sparkle");return positions.filter(i=>!board[i]).map(()=>Promise.resolve());}
 );
 await harvestEvent({type:"harvest",board:[],positions:[3,4],chain:2});
 const piecesLeaving=motions.filter(x=>x.ms===295);
 assert.equal(piecesLeaving.length,2);
 assert(piecesLeaving.every(x=>x.frames.some(k=>k.offset===.71&&k.opacity===1)),
  "Harvested masterpieces must remain visible until near the end");
 assert.deepEqual(order.slice(-2),["render","harvest-sparkle"],
  "Harvested Pulse masterpieces must sparkle when cells become empty, before gravity");
 console.log("PASS Harmony 4.3.4 – visible gather, delayed fusion, cleanup and slower harvest");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
