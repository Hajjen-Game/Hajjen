import fs from "node:fs";
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
/* A phone-sized browser drives the actual unranked Lotus Stream preview UI,
 * checks the five recipes, cargo/exits, a genuine swap and saved-run isolation.
 */
const exe=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"]
 .find(p=>fs.existsSync(p));
if(!exe)throw Error("Lotus Stream preview browser test requires Chrome/Chromium");
const browser=await puppeteer.launch({executablePath:exe,headless:true,
 args:["--no-sandbox","--disable-setuid-sandbox"]});
const page=await browser.newPage(),errors=[],KEY="japanese-harmony-puzzle-v2";
page.on("pageerror",error=>errors.push(error.message));
const url="http://127.0.0.1:8000/daisugi-bloom/";
const scenarios=[
 ["pilot","First Lotus Stream",2],
 ["long-drop","Long Lotus Crossing",2],
 ["three-lanes","Three Lotus Channels",3],
 ["shared-gate","Two Seeds, One River Gate",3],
 ["garden-route","Garden Lotus Crossing",2]
];
async function enter(key){
 await page.reload({waitUntil:"networkidle2"});
 await page.$eval("#menuAdvanced",node=>node.open=true);
 await page.click("#lotusPreviewButton");
 await page.waitForFunction(()=>document.querySelector("#modalTitle")?.textContent==="Lotus Stream · Preview");
 const options=await page.$$eval(".lotus-preview-choice",nodes=>
  nodes.map(node=>({key:node.dataset.preview,label:node.textContent})));
 assert.deepEqual(options.map(x=>x.key),scenarios.map(x=>x[0]));
 assert(options[0].label.includes("Real level 61"));
 assert(options.slice(1).every(x=>x.label.includes("Experiment")));
 await page.click('.lotus-preview-choice[data-preview="'+key+'"]');
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:10000});
 const state=await page.evaluate(key=>{
  const recipe=key==="pilot"?HarmonyLotusStream.get(60):
   HarmonyLotusRouting.get(key);
  const lotus=recipe.lotus;
  const terrain=HarmonyBoardMechanics.normalize(recipe.boardMechanics).blocked;
  const seeds=[...document.querySelectorAll(".tile.lotus-seed-tile")]
   .map(x=>Number(x.dataset.index)).sort((a,b)=>a-b);
  const exits=[...document.querySelectorAll(".tile.lotus-exit-tile")]
   .map(x=>Number(x.dataset.index)).sort((a,b)=>a-b);
  const stones=[...document.querySelectorAll(".tile.terrain-garden-tile")]
   .map(x=>Number(x.dataset.index)).sort((a,b)=>a-b);
  const engine=new HarmonyRules.Game(60,null,{directorMode:"v4",
   seed:20261101,lotusPreview:key});
  return {title:document.querySelector("#levelTitle").textContent,
   label:document.querySelector("#levelNumber").textContent,
   goal:document.querySelector("#goalLabel").textContent,
   moves:Number(document.querySelector("#movesCount").textContent),
   seeds,starts:lotus.starts.slice().sort((a,b)=>a-b),
   exits,gates:lotus.exits.slice().sort((a,b)=>a-b),
   stones,terrain,
   hasCargoArt:[...document.querySelectorAll(".tile.lotus-seed-tile")]
    .every(node=>!!node.querySelector(".lotus-seed-art")),
   noCards:getComputedStyle(document.querySelector("#omamoriPowerBar")).display==="none",
   screen:innerWidth,width:document.documentElement.scrollWidth,
   validSwap:HarmonyRules.validSwaps(engine.board)[0]};
 },key);
 assert.equal(state.label,"LEVEL 61");
 assert.equal(state.goal,"Collect Lotus seeds");
 assert.deepEqual(state.seeds,state.starts);
 assert.deepEqual(state.exits,state.gates);
 assert.deepEqual(state.stones,state.terrain);
 assert.equal(state.hasCargoArt,true);
 assert.equal(state.noCards,true);
 assert(state.width<=state.screen+1,"No extra horizontal scrolling on phone");
 assert(state.validSwap?.length===2);
 return state;
}
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto(url,{waitUntil:"networkidle2",timeout:40000});
 await page.evaluate(key=>{
  const save=JSON.parse(localStorage.getItem(key));
  save.unlocked=5;
  save.run={level:5,data:new HarmonyRules.Game(5,null,{seed:8819,directorMode:"v4"}).save()};
  save.reduceMotion=true;
  save.tutorialHelpSeen={};
  localStorage.setItem(key,JSON.stringify(save));
 },KEY);
 await page.reload({waitUntil:"networkidle2"});
 const baseline=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 assert.equal(baseline.run.level,5);
 for(const [key,name,count] of scenarios){
  const state=await enter(key);
  assert.equal(state.title,name);
  assert.equal(state.seeds.length,count);
  await page.evaluate(([a,b])=>{
   document.querySelector('.tile[data-index="'+a+'"]').click();
   document.querySelector('.tile[data-index="'+b+'"]').click();
  },state.validSwap);
  await page.waitForFunction(moves=>
   document.querySelector("#board")?.getAttribute("aria-busy")==="false"&&
   document.querySelector("#movesCount")?.textContent===String(moves-1),
   {timeout:35000},state.moves);
  const after=await page.evaluate(()=>({
   seeds:document.querySelectorAll(".tile.lotus-seed-tile").length,
   gates:[...document.querySelectorAll(".tile.lotus-exit-tile")]
    .map(x=>Number(x.dataset.index)).sort((a,b)=>a-b),
   stones:[...document.querySelectorAll(".tile.terrain-garden-tile")]
    .map(x=>Number(x.dataset.index)).sort((a,b)=>a-b)
  }));
  assert(after.seeds<=state.seeds.length,
   "A real move must not create new cargo");
  assert.deepEqual(after.gates,state.gates);
  assert.deepEqual(after.stones,state.terrain);
  const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
  for(const field of ["unlocked","run","bestStars","bestScores","fourFamilyStars",
   "economy","omamoriCards","playerInsight","playerIntent"])
   assert.deepEqual(saved[field],baseline[field],
    "Lotus scenario "+key+" changed player's "+field);
 }
 assert.deepEqual(errors,[],"Lotus preview produced no JS page errors");
 console.log("PASS Lotus Stream mobile: 5 choices, 5 real seeded starts, cargo/exits, real move and normal save isolation");
}finally{await browser.close();}
