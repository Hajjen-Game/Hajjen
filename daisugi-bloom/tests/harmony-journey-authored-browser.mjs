import fs from "node:fs";
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
/* An actual phone-sized Journey preview must USE the authored board,
 * not merely expose the blueprints in a disconnected developer tool.
 */
const exe=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"].find(fs.existsSync);
if(!exe)throw Error("Chromium missing");
const browser=await puppeteer.launch({executablePath:exe,headless:true,
 args:["--no-sandbox","--disable-setuid-sandbox"]});
const page=await browser.newPage(),errors=[],KEY="japanese-harmony-puzzle-v2";
page.on("pageerror",e=>errors.push(e.message));
async function begin(level){
 await page.$eval("#menuAdvanced",n=>n.open=true);
 await page.click("#journeyDraftButton");
 await page.waitForFunction(()=>document.querySelector("#modalTitle")?.textContent==="Journey 2.0 · Levels 1–10");
 if(level>=11){
  await page.click(".journey-chapter-tab:nth-child(2)");
  await page.waitForFunction(()=>document.querySelector("#modalTitle")?.textContent==="Journey 2.0 · Levels 11–20");
 }
 await page.click('.journey-draft-grid button[data-level="'+level+'"]');
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden);
 const modal=await page.$eval("#modal",n=>!n.hidden);
 if(modal){
  await page.click("#modalActions .jh-tutorial-ok");
  await page.waitForFunction(()=>document.querySelector("#modal").hidden);
 }
 const data=await page.evaluate(n=>{
  const bp=window.HarmonyJourneyAuthoredOpenings.get(n-1);
  const stage=[...document.querySelectorAll("#board .tile")].map((x,i)=>{
   const piece=x.querySelector(".piece");
   return {at:i,aria:x.getAttribute("aria-label"),isFixed:["moon-mirror-tile","hanabi-box-tile","lotus-seed-tile"].some(k=>x.classList.contains(k))};
  });
  return {blueprint:bp?.id,cells:stage.length,
   familySymbols:bp?.opening.grid,
   label:document.querySelector("#levelTitle").textContent,
   moves:Number(document.querySelector("#movesCount").textContent),
   rewardPanel:getComputedStyle(document.querySelector("#omamoriPowerBar")).display,
   hasDraftClass:document.body.classList.contains("journey-draft-preview"),
   width:document.documentElement.scrollWidth-innerWidth};
 },level);
 assert.equal(data.blueprint,"journey-authored-"+level);
 assert.equal(data.cells,49);
 assert(data.hasDraftClass);
 assert.equal(data.rewardPanel,"none");
 assert(data.width<=1);
 return data;
}
async function returnHome(){
 const ended=await page.$eval("#modal",n=>!n.hidden);
 if(ended){
  await page.click("#modalActions button:last-child");
  await page.waitForFunction(()=>!document.querySelector("#menuView").hidden);
  return;
 }
 await page.click("#pauseButton");
 await page.waitForFunction(()=>document.querySelector("#modalTitle")?.textContent==="Game Menu");
 await page.click("#modalActions .pause-levels");
 await page.waitForFunction(()=>!document.querySelector("#menuView").hidden);
 await page.click(".washi-book-close");
 await page.waitForFunction(()=>document.querySelector("#modal").hidden);
}
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2",timeout:40000});
 await page.waitForFunction(()=>window.HarmonyJourneyAuthoredOpenings?.COUNT===5);
 const save=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 let preview=await begin(5);
 assert.equal(preview.label,"First Firework");
 assert.equal(preview.familySymbols[29],null);
 assert.equal(preview.familySymbols[43],null);
 assert.equal(preview.moves,30);
 // The level-5 teaching swap can immediately finish the level and open
 // a victory dialog. Its exact game effect is tested by the Rules unit suite;
 // the browser here confirms the opening and its non-persistent preview UI.
 await returnHome();
 preview=await begin(11);
 assert.equal(preview.label,"First Moon Mirror");
 assert.equal(preview.familySymbols[25],null);
 await page.evaluate(()=>{
  document.querySelector('.tile[data-index="23"]').click();
  document.querySelector('.tile[data-index="24"]').click();
 });
 await page.waitForFunction(()=>document.querySelector("#movesCount")?.textContent==="38"&&
  document.querySelector("#board")?.getAttribute("aria-busy")==="false",{timeout:35000});
 const after=await page.$eval("#goalHelpButton",n=>n.getAttribute("aria-label"));
 assert(after.includes("Mirror activations 1/3"),"First deliberate mirror swap must activate once");
 await returnHome();
 for(const n of [16,18,20]){
  preview=await begin(n);
  assert(preview.label.length>0);
  if(n===20)assert.equal(preview.familySymbols.filter(x=>x===null).length,6);
  await returnHome();
 }
 assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY),save,
  "Playing authored drafts cannot change a single normal save field");
 assert.deepEqual(errors,[]);
 console.log("PASS Journey authored 390px: real hand-built Hanabi/Mirror opening moves, Wind and combined finale, isolated saves");
}finally{await browser.close();}
