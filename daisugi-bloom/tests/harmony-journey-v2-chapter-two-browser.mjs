import fs from "node:fs";
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
/* Journey 2.0 Chapter 2: 390px real-game Daruma preview, chapter chooser,
 * reproducible restart and 100% preservation of existing local progress.
 */
const exe=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"]
 .find(path=>fs.existsSync(path));
if(!exe)throw Error("Chromium missing");
const browser=await puppeteer.launch({executablePath:exe,headless:true,
 args:["--no-sandbox","--disable-setuid-sandbox"]});
const page=await browser.newPage(),errors=[];
const KEY="japanese-harmony-puzzle-v2";
page.on("pageerror",e=>errors.push(e.message));
const wait=()=>page.waitForFunction(()=>!document.querySelector("#gameView").hidden);
async function openCh2(){
 await page.evaluate(()=>{const book=document.querySelector(".washi-book-close");
  if(book&&document.querySelector("#modal")?.hidden===false)book.click();});
 await page.waitForFunction(()=>document.querySelector("#modal").hidden);
 await page.$eval("#menuAdvanced",node=>node.open=true);
 await page.click("#journeyDraftButton");
 await page.waitForFunction(()=>document.querySelector("#modalTitle")?.textContent==="Journey 2.0 · Levels 1–10");
 await page.click(".journey-chapter-tab:nth-child(2)");
 await page.waitForFunction(()=>document.querySelector("#modalTitle")?.textContent==="Journey 2.0 · Levels 11–20");
 const buttons=await page.$$eval(".journey-draft-grid button",xs=>xs.map(x=>Number(x.dataset.level)));
 assert.deepEqual(buttons,Array.from({length:10},(_,i)=>i+11));
}
async function exitDraft(){
 await page.click("#pauseButton");
 await page.waitForFunction(()=>document.querySelector("#modalTitle")?.textContent==="Game Menu");
 await page.click("#modalActions .pause-levels");
 await page.waitForFunction(()=>document.querySelector("#menuView").hidden===false);
 await page.click(".washi-book-close");
 await page.waitForFunction(()=>document.querySelector("#modal").hidden);
}
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2",timeout:40000});
 await page.waitForFunction(()=>window.HarmonyJourneyDrafts?.COUNT===20);
 await page.evaluate(key=>{
  const save=JSON.parse(localStorage.getItem(key));
  save.unlocked=19;
  save.run={level:12,data:new window.HarmonyRules.Game(12,null,{seed:9999,directorMode:"v4"}).save()};
  save.reduceMotion=true;
  localStorage.setItem(key,JSON.stringify(save));
 },KEY);
 await page.reload({waitUntil:"networkidle2"});
 const baseline=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 assert.equal(baseline.run.level,12);
 await openCh2();
 assert.equal(await page.$eval(".journey-chapter-tab.selected",x=>x.textContent.trim()),"Levels 11–20");
 await page.click('.journey-draft-grid button[data-level="15"]');
 await wait();
 const opening=await page.evaluate(()=>({
  title:document.querySelector("#levelTitle").textContent,
  goal:document.querySelector("#goalLabel").textContent,
  moves:Number(document.querySelector("#movesCount").textContent),
  daruma:document.querySelectorAll(".tile.daruma-tile").length,
  mist:document.querySelectorAll(".tile.misted").length,
  omamori:getComputedStyle(document.querySelector("#omamoriPowerBar")).display,
  scrollbar:document.documentElement.scrollWidth-innerWidth,
  draft:document.body.classList.contains("journey-draft-preview")
 }));
 assert.equal(opening.title,"First Daruma");
 assert.equal(opening.goal,"Completed Daruma");
 assert.equal(opening.moves,38);
 assert.equal(opening.daruma,1);
 assert.equal(opening.mist,0);
 assert.equal(opening.omamori,"none");
 assert(opening.draft&&opening.scrollbar<=1);
 const pair=await page.evaluate(()=>{
  const r=window.HarmonyJourneyDrafts.get(14);
  const g=new window.HarmonyRules.Game(14,null,{seed:20261102+14*197,
   directorMode:"v4",journeyDiagnostic:true,levelRecipe:r});
  return window.HarmonyRules.validSwaps(g.board)[0];
 });
 await page.evaluate(([from,to])=>{
  document.querySelector('.tile[data-index="'+from+'"]').click();
  document.querySelector('.tile[data-index="'+to+'"]').click();
 },pair);
 await page.waitForFunction(()=>document.querySelector("#board")?.getAttribute("aria-busy")==="false"&&
   document.querySelector("#movesCount")?.textContent==="37",{timeout:35000});
 const oldBoard=await page.evaluate(()=>[...document.querySelectorAll(".tile")].map(x=>x.getAttribute("aria-label")));
 await page.click("#pauseButton");
 await page.waitForFunction(()=>document.querySelector("#modalTitle")?.textContent==="Game Menu");
 await page.click("#modalActions .pause-restart");
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden&&document.querySelector("#modal").hidden);
 const newBoard=await page.evaluate(()=>[...document.querySelectorAll(".tile")].map(x=>x.getAttribute("aria-label")));
 assert.notDeepEqual(oldBoard,newBoard,"A retry should have a fresh playable opening");
 assert.equal(await page.$eval("#movesCount",x=>x.textContent),"38");
 await exitDraft();
 assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY),baseline);
 // Mixed mechanics remain fixed board fixtures in a second unranked draft.
 await openCh2();
 await page.click('.journey-draft-grid button[data-level="18"]');
 await wait();
 const mixed=await page.evaluate(()=>({
  title:document.querySelector("#levelTitle").textContent,
  goal:document.querySelector("#goalLabel").textContent,
  mist:document.querySelectorAll(".tile.misted").length,
  daruma:document.querySelectorAll(".tile.daruma-tile").length
 }));
 assert.deepEqual(mixed,{title:"Mist Around Daruma",goal:"Clear Mist",mist:5,daruma:1});
 await exitDraft();
 await openCh2();
 await page.click('.journey-draft-grid button[data-level="20"]');
 await wait();
 assert.equal(await page.$eval("#goalLabel",x=>x.textContent),"Completed Daruma");
 assert.equal(await page.evaluate(()=>document.querySelectorAll(".tile.daruma-tile").length),3);
 assert.equal(await page.evaluate(()=>document.querySelectorAll(".tile.misted").length),2);
 await exitDraft();
 assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY),baseline,
  "No chapter-two test may change a player's progress, coins, cards or saved round");
 assert.deepEqual(errors,[],"No JavaScript errors");
 console.log("PASS Journey 2.0 Chapter 2 mobile: 11–20 chooser, Daruma, real move, retry, Mist mix, saved progress isolation");
}finally{await browser.close();}
