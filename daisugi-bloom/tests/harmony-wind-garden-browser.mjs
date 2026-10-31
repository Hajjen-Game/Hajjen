import fs from "node:fs";
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
// A real phone-sized browser checks the opt-in Wind Garden interaction,
// forecast, row markers, legal swaps and isolation from saved progression.
const exe=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"].find(p=>fs.existsSync(p));
if(!exe)throw Error("Chrome/Chromium is required for Wind Garden browser test");
const browser=await puppeteer.launch({executablePath:exe,headless:true,
 args:["--no-sandbox","--disable-setuid-sandbox"]});
const page=await browser.newPage(),errors=[],KEY="japanese-harmony-puzzle-v2";
page.on("pageerror",e=>errors.push(e.message));
const url="http://127.0.0.1:8000/daisugi-bloom/";
async function swap(a,b){
 await page.evaluate(([from,to])=>{
  document.querySelector('.tile[data-index="'+from+'"]').click();
  document.querySelector('.tile[data-index="'+to+'"]').click();
 },[a,b]);
}
async function waitSettled(remaining){
 await page.waitForFunction(n=>{
  const board=document.querySelector("#board");
  return board?.getAttribute("aria-busy")==="false"&&
   Number(document.querySelector("#movesCount")?.textContent)===n;
 },{timeout:35000},remaining);
}
async function enter(key){
 await page.reload({waitUntil:"networkidle2"});
 await page.$eval("#menuAdvanced",x=>x.open=true);
 await page.click("#windGardenPreviewButton");
 await page.waitForFunction(()=>document.querySelector("#modalTitle")?.textContent==="Wind Garden 1.0");
 const choices=await page.$$eval(".wind-preview-choice",nodes=>nodes.map(x=>x.dataset.preview));
 assert.deepEqual(choices,["breeze","crossing","tide"]);
 await page.click('.wind-preview-choice[data-preview="'+key+'"]');
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:10000});
 return page.evaluate(()=>({
  title:document.querySelector("#levelTitle")?.textContent,
  forecast:document.querySelector("#levelNumber")?.textContent,
  forecastDescription:document.querySelector("#levelNumber")?.title,
  highlights:[...document.querySelectorAll("#board .wind-next-tile")].map(x=>Number(x.dataset.index)),
  omamoriHidden:getComputedStyle(document.querySelector("#omamoriPowerBar")).display==="none",
  width:document.documentElement.scrollWidth,screen:innerWidth
 }));
}
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto(url,{waitUntil:"networkidle2",timeout:40000});
 await page.evaluate(key=>{
  const save=JSON.parse(localStorage.getItem(key));
  save.unlocked=5;save.run={level:5,data:new HarmonyRules.Game(5,null,
   {seed:8819,directorMode:"v4"}).save()};
  save.reduceMotion=true;save.tutorialHelpSeen={};
  localStorage.setItem(key,JSON.stringify(save));
 },KEY);
 const baseline=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 assert.equal(baseline.run.level,5);
 // First Breeze: wind shifts every second valid move.
 let start=await enter("breeze");
 assert.equal(start.title,"First Breeze");
 assert(start.forecast.includes("ROW 4")&&start.forecast.includes("→")&&start.forecast.includes("2 MOVES"));
 assert.deepEqual(start.highlights,[21,22,23,24,25,26,27]);
 assert(start.forecastDescription.includes("wraps around"));
 assert(start.omamoriHidden);assert(start.width<=start.screen+1);
 await swap(17,24);await waitSettled(13);
 const breeze=await page.evaluate(()=>({
  moves:document.querySelector("#movesCount").textContent,
  forecast:document.querySelector("#levelNumber").textContent,
  highlighted:document.querySelectorAll("#board .wind-next-tile").length,
  stillPlaying:document.querySelector("#modal").hidden,
  rowLabels:[...document.querySelectorAll("#board .tile")].slice(21,28).map(x=>x.getAttribute("aria-label"))
 }));
 assert.equal(breeze.stillPlaying,true,"The preview should last more than one move");
 assert.equal(breeze.highlighted,7);
 assert(breeze.rowLabels.every(Boolean));
 assert(breeze.forecast.includes("1 MOVE"));
 const breezePair=await page.evaluate(()=>{
  const game=new HarmonyRules.Game(2,null,{seed:13,directorMode:"v4",windGardenPreview:"breeze"});
  game.swap(17,24);return HarmonyRules.validSwaps(game.board)[0];
 });
 await swap(...breezePair);await waitSettled(12);
 assert((await page.$eval("#levelNumber",e=>e.textContent)).includes("2 MOVES"));
 // Crossing Winds: shift after every third valid move.
 start=await enter("crossing");
 assert.equal(start.title,"Crossing Winds");
 assert(start.forecast.includes("ROW 3")&&start.forecast.includes("3 MOVES"));
 await swap(17,24);await waitSettled(17);
 assert((await page.$eval("#levelNumber",e=>e.textContent)).includes("2 MOVES"));
 const next=await page.evaluate(()=>{
  const game=new HarmonyRules.Game(2,null,{seed:13,directorMode:"v4",windGardenPreview:"crossing"});
  game.swap(17,24);return HarmonyRules.validSwaps(game.board)[0];
 });
 assert(next?.length===2);await swap(...next);await waitSettled(16);
 assert((await page.$eval("#levelNumber",e=>e.textContent)).includes("1 MOVE"));
 const third=await page.evaluate(()=>{
  const game=new HarmonyRules.Game(2,null,{seed:13,directorMode:"v4",windGardenPreview:"crossing"});
  game.swap(17,24);game.swap(...HarmonyRules.validSwaps(game.board)[0]);
  return HarmonyRules.validSwaps(game.board)[0];
 });
 await swap(...third);await waitSettled(15);
 assert((await page.$eval("#levelNumber",e=>e.textContent)).includes("ROW 5"));
 assert((await page.$eval("#levelNumber",e=>e.textContent)).includes("→"));
 // Garden Tide alternates, with Mist remaining visually fixed in its cells.
 start=await enter("tide");
 assert.equal(start.title,"Garden Tide");
 assert(start.forecast.includes("ROW 4")&&start.forecast.includes("←"));
 await swap(17,24);await waitSettled(17);
 assert((await page.$eval("#levelNumber",e=>e.textContent)).includes("←"));
 const tidePair=await page.evaluate(()=>{
  const game=new HarmonyRules.Game(2,null,{seed:13,directorMode:"v4",windGardenPreview:"tide"});
  game.swap(17,24);return HarmonyRules.validSwaps(game.board)[0];
 });
 await swap(...tidePair);await waitSettled(16);
 assert((await page.$eval("#levelNumber",e=>e.textContent)).includes("→"));
 assert.equal(await page.$eval(".tile.misted",x=>x.length),1);
 const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 for(const key of ["unlocked","bestStars","bestScores","fourFamilyStars","run",
  "economy","omamoriCards","playerInsight","playerIntent"])
  assert.deepEqual(stored[key],baseline[key],"Wind preview changed permanent save field "+key);
 assert.deepEqual(errors,[],"No mobile JS errors");
 console.log("PASS Wind Garden mobile: 3 scenarios, row direction/timing forecast, real moves, stationary Mist and intact save");
}finally{await browser.close();}
