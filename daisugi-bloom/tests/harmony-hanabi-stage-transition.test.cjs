"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

// Run the actual Hanabi stage-reveal function with a minimal DOM/WAAPI stub.
// Covers the regression where renderBoard replaced a Stage 1 sprite with
// Stage 2 on one frame, bypassing the existing Fusion landing motion.
const app=fs.readFileSync(path.join(__dirname,"../harmony/app.js"),"utf8");
const start=app.indexOf("function revealHanabiUpgrades(evt,highlighted){");
const end=app.indexOf("async function animateHanabiLaunch(evt)",start);
assert(start>=0&&end>start,"Hanabi stage reveal helper must exist");
const revealSource=app.slice(start,end);

async function testUpgrade({reduced=false,hidden=false}={}){
 const previous=Array(49).fill(null),board=Array(49).fill(null);
 const tiles=Array.from({length:49},()=>({
  piece:null,ghosts:[],
  querySelector(){return this.piece;},
  append(node){this.ghosts.push(node);}
 }));
 function pieceAt(at,id,family,stage,nextStage,nextId=id){
  previous[at]={id,family,stage};
  board[at]={id:nextId,family,stage:nextStage};
  tiles[at].piece={
   cloneNode(){return {style:{},removed:false,setAttribute(){},
    remove(){this.removed=true;}};}
  };
 }
 pieceAt(3,30,"sakura",1,2);  // Hanabi column upgrade.
 pieceAt(9,90,"koi",1,2);     // Hanabi spreading rocket.
 pieceAt(16,160,"fan",1,1);  // Unchanged sprite must not animate.
 pieceAt(24,240,"sushi",1,2,241); // Refill with a new ID, not a promotion.
 let renders=0;
 function renderBoard(next){
  renders++;
  for(let i=0;i<49;i++)if(next[i])
   tiles[i].piece={stage:next[i].stage};
 }
 const motions=[];
 const cues={fusion:[],evolution:[],labels:[]};
 const fusionBurst=(positions,groups,kind)=>cues.fusion.push({positions,groups,kind});
 const evolveFamilyFx=groups=>cues.evolution.push(groups);
 const evolutionStageLabels=groups=>cues.labels.push(groups);
 const animateNode=(node,frames,ms)=>{
  motions.push({node,frames,ms});
  return Promise.resolve();
 };
 const Element={prototype:{animate(){}}};
 const reveal=new Function("boardTiles","renderBoard","FAST","document",
  "Element","presentedBoard","MOBILE_LITE","animateNode",
  "fusionBurst","evolveFamilyFx","evolutionStageLabels",
  revealSource+";return revealHanabiUpgrades;"
 )(tiles,renderBoard,()=>reduced,{hidden},Element,previous,false,animateNode,
   fusionBurst,evolveFamilyFx,evolutionStageLabels);
 await reveal({board,targets:[{to:3},{to:16},{to:24}],
  spreadTargets:[{to:9}]},[3,9,16,24]);
 return {tiles,motions,renders,cues};
}

(async()=>{
 const normal=await testUpgrade();
 assert.equal(normal.renders,1,"Update board exactly once");
 assert.equal(normal.tiles[3].ghosts.length,1,"Keep old Stage 1 in column");
 assert.equal(normal.tiles[9].ghosts.length,1,"Keep old Stage 1 at spread impact");
 assert.equal(normal.tiles[16].ghosts.length,0,"Do not animate unchanged tile");
 assert.equal(normal.tiles[24].ghosts.length,0,"Do not animate refilled tile");
 assert(normal.tiles[3].ghosts[0].removed&&normal.tiles[9].ghosts[0].removed,
  "Remove old sprites after crossfade");
 assert.equal(normal.motions.length,4,"Animate old AND new pieces on both targets");
 assert.equal(normal.motions.filter(a=>a.frames.some(f=>
  String(f.transform).includes("scale(1.13)"))).length,2,
 "Stage 2 must receive the original Fusion landing");
 assert.equal(normal.cues.fusion.length,1,"Classic Fusion Burst fires once per reveal");
 assert.deepEqual(normal.cues.fusion[0].positions,[3,9],
  "Only real upgrades get the Classic Fusion Burst");
 assert.equal(normal.cues.fusion[0].kind,"fusion",
  "Use regular Fusion visual, not larger masterpiece ring");
 assert.deepEqual(normal.cues.fusion[0].groups.map(g=>[g.at,g.family,g.to]),[
  [3,"sakura",2],[9,"koi",2]
 ],"Pass the real stages and families to classic Fusion FX");
 assert.equal(normal.cues.evolution.length,1,"Restore family evolution glow");
 assert.equal(normal.cues.labels.length,1,"Restore classic stage feedback");
 assert.deepEqual(normal.cues.evolution[0],normal.cues.fusion[0].groups);
 assert.deepEqual(normal.cues.labels[0],normal.cues.fusion[0].groups);
 for(const opts of [{reduced:true},{hidden:true}]){
  const result=await testUpgrade(opts);
  assert.equal(result.renders,1);
  assert.equal(result.motions.length,0,
   "Reduced motion and background tabs must not animate");
  assert.equal(result.cues.fusion.length,0,
   "Reduced motion/background must not create Fusion effects");
  assert.equal(result.cues.evolution.length,0);
  assert.equal(result.cues.labels.length,0);
 }
 assert(app.includes("onReveal:()=>{void reveal();}"),
  "Pixi must trigger the shared transition at real impact");
 assert(app.includes("fireworks.push(reveal())"),
  "Classic must trigger the shared transition during impact");
 assert(app.includes("await reveal();"),
  "All upgrades must finish before proceeding to the next board event");
 console.log("PASS Hanabi Stage Transition 1.1 · Fusion Burst, evolution glow, stage label and crossfade in Pixi/Classic");
})().catch(error=>{console.error(error);process.exitCode=1;});
