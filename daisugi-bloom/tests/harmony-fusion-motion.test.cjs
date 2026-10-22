"use strict";
// Fusion Readability 4.3.2: verify slow 3/4/5 travel and survivor reveal
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
const gather=between("function fusionGatherTiming(","// Energy travels out from the masterpiece");
const samples=[],events=[];
const pieces=Array.from({length:49},()=>({
 style:{visibility:""},classList:{add(){}},
 cloneNode(){return {style:{},classList:{add(){}},remove(){}}}
}));
const boardTiles=pieces.map(p=>({querySelector:()=>p}));
const indexRect=i=>({left:(i%7)*50,top:Math.floor(i/7)*50,width:48,height:48});
const fxAt=className=>{
 events.push(["fx",className]);
 return {style:{},remove(){events.push(["remove",className])}};
};
const makeFxLayer=()=>({rect:{left:0,top:0},node:{
 appendChild(){events.push(["ghost"])},remove(){events.push(["layerRemoved"])}
}});
const animateNode=(node,frames,duration)=>{
 samples.push({frames,duration});
 events.push(["animate",duration]);
 return Promise.resolve();
};
const fusion=new Function("FAST","MOBILE_LITE","Element","boardTiles","indexRect","fxAt","makeFxLayer","animateNode","sound","renderBoard","fusionBurst","evolveFamilyFx","evolutionStageLabels",gather+"return {fusionGatherTiming,fusionGatherFrames,playFusion};")(
 ()=>false,true,{prototype:{animate(){}}},boardTiles,indexRect,fxAt,makeFxLayer,animateNode,
 ()=>events.push(["sound"]),()=>events.push(["render"]),
 ()=>events.push(["burst"]),()=>events.push(["evolution"]),()=>events.push(["stageLabels"])
);
// Travel is deliberately distinct from anticipation/contact. A 5-match
// receives a longer pull than a 3-match without adding any extra FX nodes.
for(const [matched,travel,total] of [[3,380,510],[4,430,560],[5,480,610]]){
 const timing=fusion.fusionGatherTiming(matched);
 assert.equal(timing.windup,75);
 assert.equal(timing.travel,travel);
 assert.equal(timing.contact,55);
 assert.equal(timing.total,total);
 const frames=fusion.fusionGatherFrames(100,65,timing);
 assert.equal(frames.length,7);
 assert(frames.every(step=>step.opacity===1),"All pieces must remain fully visible during travel");
 assert(frames.at(-2).transform.includes("100px,65px"),"Source must reach the survivor before hold");
 assert.equal(frames.at(-2).offset,(timing.windup+timing.travel)/timing.total);
 assert.equal(frames.at(-1).offset,1);
 assert.equal(frames.at(-1).transform,frames.at(-2).transform,"Contact must be held before reveal");
 assert(frames[3].transform.includes("50px,32.5px"),"The sprite must physically travel through the center");
 assert(frames[1].offset>=.12,"Anticipation must remain perceptible");
}
const k=fusion.fusionGatherFrames(100,65);
assert(k.every(step=>step.opacity===1));
assert.equal(k[0].offset,0);
assert.equal(k.at(-1).offset,1);
async function main(){
 await fusion.playFusion({board:[],groups:[{at:17,removed:[15,16],family:"koi",to:3,number:3}]});
 const travel=samples.filter(x=>x.duration===510);
 assert.equal(travel.length,3,"3-match: two source ghosts plus survivor must share 510ms clock");
 assert(travel.every(x=>x.frames.at(-1).offset===1&&
  (x.frames.at(-1).opacity===undefined||x.frames.at(-1).opacity===1)),
  "Gather must persist until the common end time");
 assert.equal(events.filter(x=>x[0]==="ghost").length,2);
 const lastGather=events.findIndex(e=>e[0]==="layerRemoved");
 const render=events.findIndex(e=>e[0]==="render");
 assert(lastGather>=0&&render>lastGather,"Survivor stage must update only after visible gathering");
 assert.equal(pieces[15].style.visibility,"","Source visibility must be restored");
 assert.equal(pieces[16].style.visibility,"","Source visibility must be restored");
 assert(events.some(e=>e[0]==="fx"&&e[1]==="fusion-intake intake-koi"),
  "Fusion collision should produce a family-colored contact cue");

 for(const [matched,indices,expected] of [
  [4,[3,4,5],560],
  [5,[29,30,31,32],610]
 ]){
  const before=samples.length;
  await fusion.playFusion({board:[],groups:[{at:matched===4?6:33,removed:indices,family:"fan",to:4,number:matched}]});
  const movements=samples.slice(before).filter(x=>x.duration===expected);
  assert.equal(movements.length,matched,"Match "+matched+" must have a full-length gather for every source");
  assert(movements.every(x=>x.frames.at(-1).offset===1),"No source may finish early");
 }
 // Simultaneous 3+5 matches must share the *longest* gather clock.
 const parallelBefore=samples.length;
 await fusion.playFusion({board:[],groups:[
  {at:10,removed:[9,11],family:"sakura",to:2,number:3},
  {at:24,removed:[22,23,25,26],family:"lantern",to:3,number:5}
 ]});
 assert.equal(samples.slice(parallelBefore).filter(x=>x.duration===610).length,8,
  "Simultaneous 3+5 fusion waves must not reset shorter ghosts before the longer pull ends");

 // Harvest previously shrank objects to 15% over 150ms: almost invisible.
 const harvest=between("async function animateEvent(evt){","async function playEvents(events){");
 const motions=[],order=[];
 const harvestEvent=new Function("presentedBoard","FAST","MOBILE_LITE","Element","boardTiles","indexRect","fxAt","animateNode","sound","renderBoard",harvest+"return animateEvent;")(
  [],()=>false,true,{prototype:{animate(){}}},boardTiles,indexRect,fxAt,
  (n,frames,ms)=>{motions.push({frames,ms});order.push("movement");return Promise.resolve()},
  ()=>order.push("sound"),()=>order.push("render")
 );
 await harvestEvent({type:"harvest",board:[],positions:[3,4],chain:2});
 const piecesLeaving=motions.filter(x=>x.ms===295);
 assert.equal(piecesLeaving.length,2);
 assert(piecesLeaving.every(x=>x.frames.some(k=>k.offset===.71&&k.opacity===1)),
  "Harvested masterpieces must remain visible until near the end");
 assert.equal(order.at(-1),"render","Objects should leave the logical grid only after release");
 console.log("PASS Harmony 4.3.2 – 3/4/5 timing, opaque gathering, held contact and slower harvest");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
