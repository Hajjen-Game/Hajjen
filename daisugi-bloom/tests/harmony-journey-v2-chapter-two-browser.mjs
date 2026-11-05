import fs from "node:fs";
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
/* Focused 1–20 phone QA: Hanabi top placement, Wind, Daruma, Stones, save safety. */
const executablePath=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"].find(fs.existsSync);
if(!executablePath)throw Error("Chromium missing");
const browser=await puppeteer.launch({executablePath,headless:true,args:["--no-sandbox","--disable-setuid-sandbox"]});
const page=await browser.newPage(),errors=[],KEY="japanese-harmony-puzzle-v2";
page.on("pageerror",e=>errors.push(e.message));
async function openDraft(n){
 await page.$eval("#menuAdvanced",e=>e.open=true);
 await page.$eval("#devPreviews",e=>e.open=true);
 await page.click("#journeyDraftButton");
 await page.waitForFunction(()=>document.querySelector("#modalTitle")?.textContent==="Journey 2.0 · Levels 1–10");
 if(n>10){
  await page.click(".journey-chapter-tab:nth-child(2)");
  await page.waitForFunction(()=>document.querySelector("#modalTitle")?.textContent==="Journey 2.0 · Levels 11–20");
 }
 await page.click('.journey-draft-grid button[data-level="'+n+'"]');
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden);
 const tutorial=await page.$eval("#modal",x=>!x.hidden);
 if(tutorial){
  assert.equal(await page.$eval("#modalEyebrow",e=>e.textContent),"LEVEL "+n+" · HOW TO PLAY");
  await page.click("#modalActions .jh-tutorial-ok");
  await page.waitForFunction(()=>document.querySelector("#modal").hidden);
 }
 const state=await page.evaluate(()=>({
  title:document.querySelector("#levelTitle").textContent,
  rockets:[...document.querySelectorAll(".tile.lotus-seed-tile")].map(n=>Number(n.dataset.index)),
  crates:document.querySelectorAll(".tile.hanabi-box-tile").length,
  stones:document.querySelectorAll(".tile.sealed-stone-tile").length,
  dolls:document.querySelectorAll(".tile.daruma-tile").length,
  mirrors:document.querySelectorAll(".tile.moon-mirror-tile").length,
  wind:document.querySelectorAll(".wind-ambient-row").length,
  cardStyle:getComputedStyle(document.querySelector("#omamoriPowerBar")).display,
  width:document.documentElement.scrollWidth,
  vw:innerWidth
 }));
 assert.equal(state.mirrors,0,"Mirror must be parked");
 assert.equal(state.cardStyle,"none");assert(state.width<=state.vw+1);
 return state;
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
 await page.waitForFunction(()=>window.HarmonyJourneyDrafts?.COUNT===40);
 const baseline=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 // A first normal persist may add the empty Journey reward ledger to an old save.
 // Keep verifying the entire original save; any real reward change must fail.
 baseline.economy.journeyPaidStars ??= {};
 let s=await openDraft(5);assert.equal(s.rockets[0],29);assert.equal(s.crates,1);await leave();
 s=await openDraft(6);assert.deepEqual(s.rockets,[1]);assert.equal(s.crates,1);await leave();
 s=await openDraft(7);assert.deepEqual(s.rockets,[1,5]);await leave();
 s=await openDraft(11);assert.equal(s.title,"First Wind Garden");assert.equal(s.wind,1);await leave();
 s=await openDraft(14);assert.equal(s.title,"First Daruma");assert.equal(s.dolls,1);await leave();
 s=await openDraft(18);assert.equal(s.title,"First Sealed Stone");assert.equal(s.stones,1);await leave();
 s=await openDraft(20);
 assert.equal(s.title,"Festival Seal");assert.equal(s.rockets.length,2);
 assert.equal(s.crates,2);assert.equal(s.stones,4);assert.equal(s.dolls,0);
 const realMove=await page.evaluate(()=>{
  const R=window.HarmonyRules,A=window.HarmonyPuzzleArchitect,H=window.HarmonyJourneyAuthoredOpenings;
  const g=A.build(R,H.get(19),{seed:20261102+19*197,directorMode:"v63"});
  return R.validSwaps(g.board)[0];
 });
 await page.evaluate(([a,b])=>{
  document.querySelector('.tile[data-index="'+a+'"]').click();
  document.querySelector('.tile[data-index="'+b+'"]').click();
 },realMove);
 await page.waitForFunction(()=>document.querySelector("#board")?.getAttribute("aria-busy")==="false"&&
  Number(document.querySelector("#movesCount")?.textContent)===window.HarmonyJourneyDrafts.get(19).moves-1,{timeout:35000});
 await leave();
 assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY),baseline);
 assert.deepEqual(errors,[]);
 console.log("PASS focused Journey 2.0 on phone: top Hanabi, Wind, Daruma, Stones, real swap and unchanged save");
}finally{await browser.close();}
