import fs from "node:fs";
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
/* Real app preview must use the complete fixed 49-cell reference boards. */
const executablePath=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"].find(fs.existsSync);
if(!executablePath)throw Error("Chromium missing");
const browser=await puppeteer.launch({executablePath,headless:true,args:["--no-sandbox","--disable-setuid-sandbox"]});
const page=await browser.newPage(),errors=[],KEY="japanese-harmony-puzzle-v2";
page.on("pageerror",e=>errors.push(e.message));
async function open(n){
 await page.$eval("#menuAdvanced",e=>e.open=true);
 await page.$eval("#devPreviews",e=>e.open=true);
 await page.click(n>20?"#journeyChapterPlaytestButton":"#journeyDraftButton");
 const chapter=Math.floor((n-1)/10);
 await page.waitForFunction(ch=>document.querySelector("#modalTitle")?.textContent===
  "Journey 2.0 · Levels "+(ch*10+1)+"–"+(ch*10+10),{},chapter===0||chapter===2?chapter:chapter-1);
 if(chapter===1||chapter===3){
  await page.click(".journey-chapter-tab:nth-child("+(chapter+1)+")");
  await page.waitForFunction(ch=>document.querySelector("#modalTitle")?.textContent===
   "Journey 2.0 · Levels "+(ch*10+1)+"–"+(ch*10+10),{},chapter);
 }
 await page.click('.journey-draft-grid button[data-level="'+n+'"]');
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden);
 if(await page.$eval("#modal",e=>!e.hidden)){
  await page.click("#modalActions .jh-tutorial-ok");
  await page.waitForFunction(()=>document.querySelector("#modal").hidden);
 }
 const snapshot=await page.evaluate(level=>{
  const bp=HarmonyJourneyAuthoredOpenings.get(level-1);
  return {blueprint:bp?.id,opening:bp?.opening.grid,fixtures:bp?.opening.grid.filter(x=>x===null).length,
   cells:document.querySelectorAll("#board .tile").length,
   fixed:[...document.querySelectorAll(".tile")].filter(x=>x.classList.contains("sealed-stone-tile")||
    x.classList.contains("daruma-tile")||x.classList.contains("lotus-seed-tile")||
    x.classList.contains("hanabi-box-tile")).length,
   width:document.documentElement.scrollWidth,viewport:innerWidth,
   draft:document.body.classList.contains("journey-draft-preview"),
   coins:getComputedStyle(document.querySelector("#omamoriPowerBar")).display};
 },n);
 assert.equal(snapshot.blueprint,"journey-authored-"+n);
 assert.equal(snapshot.cells,49);assert.equal(snapshot.fixed,snapshot.fixtures);
 assert(snapshot.draft);assert.equal(snapshot.coins,"none");
 assert(snapshot.width<=snapshot.viewport+1);
 return snapshot;
}
async function leave(){
 await page.click("#pauseButton");
 await page.waitForFunction(()=>document.querySelector("#modalTitle")?.textContent==="Game Menu");
 await page.click("#modalActions .pause-main");
 await page.waitForFunction(()=>!document.querySelector("#menuView").hidden);
}
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2",timeout:40000});
 await page.waitForFunction(()=>window.HarmonyJourneyAuthoredOpenings?.COUNT===15);
 const save=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 for(const n of [5,6,7,9,11,14,18,20,21,22,25,28,30,31,34,36,40]){
  const b=await open(n);
  if(n===6)assert.equal(b.opening[1],null,"First advanced Hanabi starts at top");
  if(n===20)assert.equal(b.fixtures,8);
  if(n>=21)assert.equal(b.opening.length,49);
  await leave();
 }
 const after=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 // A legacy save may gain this empty, backwards-compatible reward ledger during
 // its first normal persist. Previews must not alter any real progress or coins.
 assert.deepEqual(after.economy?.journeyPaidStars,save.economy?.journeyPaidStars??{},
  "Preview cannot issue or alter Journey star reward receipts");
 if(!Object.hasOwn(save.economy??{},"journeyPaidStars")){
  delete after.economy.journeyPaidStars;
 }
 assert.deepEqual(after,save,"Preview may not mutate saved progress or active runs");
 assert.deepEqual(errors,[]);
 console.log("PASS 390px Journey reference previews 1–20 and authored chapter tests 21–40 without save mutations");
}finally{await browser.close();}
