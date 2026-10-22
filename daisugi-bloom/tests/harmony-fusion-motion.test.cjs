"use strict";
// Fusion Motion 4.3.1: verify full-opacity source travel, survivor reveal
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
const fusion=new Function("FAST","MOBILE_LITE","Element","boardTiles","indexRect","fxAt","makeFxLayer","animateNode","sound","renderBoard","fusionBurst","evolveFamilyFx","evolutionStageLabels",gather+"return {fusionGatherFrames,playFusion};")(
 ()=>false,true,{prototype:{animate(){}}},boardTiles,indexRect,fxAt,makeFxLayer,animateNode,
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
 const lastGather=events.findIndex(e=>e[0]==="layerRemoved");
 const render=events.findIndex(e=>e[0]==="render");
 assert(lastGather>=0&&render>lastGather,"Survivor stage must update only after visible gathering");
 assert.equal(pieces[15].style.visibility,"","Source visibility must be restored");
 assert.equal(pieces[16].style.visibility,"","Source visibility must be restored");
 assert(events.some(e=>e[0]==="fx"&&e[1]==="fusion-intake intake-koi"),
  "Fusion collision should produce a family-colored contact cue");

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
 console.log("PASS Harmony 4.3.1 – visible gather, delayed fusion, cleanup and slower harvest");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
