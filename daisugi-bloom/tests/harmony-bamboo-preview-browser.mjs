import fs from "node:fs";
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
/* Bamboo Paths Early Preview: mobile browser checks the actual Chapter 6
 * board geometry and preserves an existing unfinished player's run. */
const exe=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"]
 .find(p=>fs.existsSync(p));
if(!exe)throw Error("Bamboo preview browser test requires Chromium");
const browser=await puppeteer.launch({executablePath:exe,headless:true,
 args:["--no-sandbox","--disable-setuid-sandbox"]});
const page=await browser.newPage(),errors=[],KEY="japanese-harmony-puzzle-v2";
page.on("pageerror",e=>errors.push(e.message));
const url="http://127.0.0.1:8000/daisugi-bloom/";
async function openPicker(){
 await page.$eval("#menuAdvanced",node=>node.open=true);
 await page.click("#bambooPreviewButton");
 await page.waitForFunction(()=>document.querySelector("#modalTitle")?.textContent==="Bamboo Paths · Preview");
 const options=await page.$$eval(".bamboo-preview-choice",nodes=>
  nodes.map(node=>({level:Number(node.dataset.level),title:node.textContent})));
 assert.equal(options.length,10);
 assert.deepEqual(options.map(x=>x.level),[51,52,53,54,55,56,57,58,59,60]);
 assert(options.every(option=>option.title.includes("Level "+option.level)));
 return options;
}
async function enter(level){
 await page.reload({waitUntil:"networkidle2"});
 await openPicker();
 await page.click('.bamboo-preview-choice[data-level="'+level+'"]');
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:10000});
 const state=await page.evaluate(level=>{
  const cfg=HarmonyBambooPaths.get(level-1);
  const blocked=HarmonyBoardMechanics.normalize(cfg.boardMechanics).blocked;
  const actual=[...document.querySelectorAll(".tile.terrain-garden-tile")]
   .map(x=>Number(x.dataset.index)).sort((a,b)=>a-b);
  return {title:document.querySelector("#levelTitle").textContent,
   levelNumber:document.querySelector("#levelNumber").textContent,
   goal:document.querySelector("#goalLabel").textContent,
   moves:Number(document.querySelector("#movesCount").textContent),
   blocked,actual,
   hasStoneArt:[...document.querySelectorAll(".tile.terrain-garden-tile")]
    .every(x=>!!x.querySelector(".terrain-garden-art")),
   hiddenCards:getComputedStyle(document.querySelector("#omamoriPowerBar")).display==="none",
   pageOverflow:document.documentElement.scrollWidth>innerWidth+1,
   validPair:HarmonyRules.validSwaps(
    new HarmonyRules.Game(level-1,null,{directorMode:"v4",
     seed:20261031+(level-1)*97,bambooPreview:true}).board)[0]
  };
 },level);
 assert.equal(state.title,HarmonyBambooPathsNames[level],"Real chapter title");
 assert.equal(state.levelNumber,"LEVEL "+level);
 assert.deepEqual(state.actual,state.blocked,"Terrain positions must match live Bamboo chapter layout");
 assert(state.hasStoneArt);
 assert(state.hiddenCards,"Bamboo previews cannot spend Omamori cards");
 assert.equal(state.pageOverflow,false,"No horizontal overflow on 390px phone");
 assert(state.validPair?.length===2);
 return state;
}
const HarmonyBambooPathsNames={
 51:"First Bamboo",52:"Narrow Paths",53:"Temple Gate",
 54:"Gate of Echoes",55:"Twin Gardens",56:"Bridge of Harmony",
 57:"Bamboo Breeze",58:"Central Shrine",59:"Heart of the Garden",
 60:"Path of Harmony"
};
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
 for(const level of [51,52,53,55,58,60]){
  const board=await enter(level);
  if(level!==57)assert(board.blocked.length>0);
  await page.evaluate(([from,to])=>{
   document.querySelector('.tile[data-index="'+from+'"]').click();
   document.querySelector('.tile[data-index="'+to+'"]').click();
  },board.validPair);
  await page.waitForFunction(moves=>
   document.querySelector("#board")?.getAttribute("aria-busy")==="false"&&
   document.querySelector("#movesCount")?.textContent===String(moves-1),
   {timeout:35000},board.moves);
  const still=await page.$$eval(".tile.terrain-garden-tile",nodes=>
   nodes.map(x=>Number(x.dataset.index)).sort((a,b)=>a-b));
  assert.deepEqual(still,board.blocked,"Blocked tiles must not fall after a real Fusion");
  const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
  for(const field of ["unlocked","run","bestStars","bestScores","fourFamilyStars",
   "economy","omamoriCards","playerInsight","playerIntent"])
   assert.deepEqual(saved[field],baseline[field],
    "Bamboo level "+level+" unexpectedly changed permanent "+field);
 }
 assert.deepEqual(errors,[],"No mobile JavaScript errors");
 console.log("PASS Bamboo Paths mobile: ten authentic choices, six genuine layouts and real moves, fixed geometry, original player run intact");
}finally{await browser.close();}
