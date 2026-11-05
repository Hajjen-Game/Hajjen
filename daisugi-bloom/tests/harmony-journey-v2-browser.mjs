import fs from "node:fs";
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
// Journey 2.0 draft previews must be truly playable on a 390px phone
// and MUST NOT touch the player's normal level, rewards or inventory.
const exe=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"]
 .find(path=>fs.existsSync(path));
if(!exe)throw Error("Chromium missing");
const browser=await puppeteer.launch({executablePath:exe,headless:true,
 args:["--no-sandbox","--disable-setuid-sandbox"]});
const page=await browser.newPage(),errors=[],KEY="japanese-harmony-puzzle-v2";
page.on("pageerror",err=>errors.push(err.message));
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2",timeout:40000});
 await page.waitForFunction(()=>window.HarmonyJourneyDrafts?.COUNT===40);
 await page.evaluate(key=>{
  const save=JSON.parse(localStorage.getItem(key));
  save.unlocked=9;delete save.journeyProgression;
  save.run={level:8,data:new window.HarmonyRules.Game(8,null,
   {seed:9321,directorMode:"v3"}).save()};
  save.tutorialHelpSeen={};
  save.reduceMotion=true;
  localStorage.setItem(key,JSON.stringify(save));
 },KEY);
 await page.reload({waitUntil:"networkidle2"});
 const baseline=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 // A first normal persist may add the empty Journey reward ledger to an old save.
 // Keep verifying the entire original save; any real reward change must fail.
 baseline.economy.journeyPaidStars ??= {};
 assert.equal(baseline.run.level,8);
 await page.$eval("#menuAdvanced",node=>node.open=true);
 await page.$eval("#devPreviews",e=>e.open=true);
 await page.click("#journeyDraftButton");
 await page.waitForFunction(()=>document.querySelector("#modalTitle")?.textContent==="Journey 2.0 · Levels 1–10");
 const options=await page.$$eval(".journey-draft-grid button",xs=>
  xs.map(x=>({level:x.dataset.level,label:x.textContent})));
 assert.equal(options.length,10);
 assert.deepEqual(options.map(x=>Number(x.level)),[1,2,3,4,5,6,7,8,9,10]);
 assert(options[7].label.includes("Festival Bloom"));
 await page.click('.journey-draft-grid button[data-level="8"]');
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden);
 const state=await page.evaluate(()=>{
  const g=window.HarmonyJourneyDrafts.get(7);
  return {
   title:document.querySelector("#levelTitle").textContent,
   hanabi:document.querySelectorAll(".tile.lotus-seed-tile").length,
   moves:Number(document.querySelector("#movesCount").textContent),
   mist:document.querySelectorAll(".tile.misted").length,
   cards:getComputedStyle(document.querySelector("#omamoriPowerBar")).display,
   width:document.documentElement.scrollWidth,screen:innerWidth,
   active:document.body.classList.contains("journey-draft-preview"),
   recipe:g
  };
 });
 assert.equal(state.title,"Festival Bloom");
 assert.equal(state.moves,state.recipe.moves);
 assert.equal(state.mist,0);
 assert.equal(state.hanabi,1);
 assert.equal(state.cards,"none");
 assert(state.active&&state.width<=state.screen+1);
 // The preview uses exactly the same deterministic game engine and start seed.
 const action=await page.evaluate(()=>{
  const draft=window.HarmonyJourneyDrafts.get(7);
  const game=window.HarmonyPuzzleArchitect.build(window.HarmonyRules,
   window.HarmonyJourneyAuthoredOpenings.get(7),
   {seed:20261102+7*197,directorMode:"v63"});
  return window.HarmonyRules.validSwaps(game.board)[0];
 });
 await page.evaluate(([a,b])=>{
  document.querySelector('.tile[data-index="'+a+'"]').click();
  document.querySelector('.tile[data-index="'+b+'"]').click();
 },action);
 await page.waitForFunction(()=>document.querySelector("#board")?.getAttribute("aria-busy")==="false"&&
  document.querySelector("#movesCount")?.textContent==="43",{timeout:35000});
 const after=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 for(const field of ["unlocked","run","bestStars","bestScores","fourFamilyStars","economy","omamoriCards","playerInsight","playerIntent"])
  assert.deepEqual(after[field],baseline[field],"Journey preview must not alter "+field);
 // Leave through the actual in-game pause menu. The home header is
 // intentionally not clickable over the portrait gameplay view.
 await page.click("#pauseButton");
 await page.waitForFunction(()=>document.querySelector("#modalTitle")?.textContent==="Game Menu");
 await page.click("#modalActions .pause-main");
 await page.waitForFunction(()=>document.querySelector("#menuView")?.hidden===false);
 const final=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 assert.deepEqual(final,baseline,"Opening, playing and leaving a draft may not write player data");
 // The pause-menu exit now goes directly to Main Menu.
 // Regression from real playtest: formerly "two any-family Masterpieces"
 // completed in about five moves; the finale must demand two Koi.
 await page.$eval("#menuAdvanced",node=>node.open=true);
 await page.$eval("#devPreviews",e=>e.open=true);
 await page.click("#journeyDraftButton");
 await page.waitForFunction(()=>document.querySelector("#modalTitle")?.textContent==="Journey 2.0 · Levels 1–10");
 await page.click('.journey-draft-grid button[data-level="10"]');
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden);
 assert.equal(await page.$eval("#goalLabel",node=>node.textContent),"Koi masterpieces");
 assert.equal(await page.$eval("#goalProgress",node=>node.textContent.trim()),"0 / 2");
 const beforeRestart=await page.$$eval(".tile",xs=>xs.map(x=>x.getAttribute("aria-label")));
 await page.click("#pauseButton");
 await page.waitForFunction(()=>document.querySelector("#modalTitle")?.textContent==="Game Menu");
 await page.click("#modalActions .pause-restart");
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden&&document.querySelector("#modal").hidden);
 const afterRestart=await page.$$eval(".tile",xs=>xs.map(x=>x.getAttribute("aria-label")));
 assert.notDeepEqual(afterRestart,beforeRestart,"Repeated finale attempts should use a new seed");
 assert.equal(await page.$eval("#goalLabel",node=>node.textContent),"Koi masterpieces");
 await page.click("#pauseButton");
 await page.waitForFunction(()=>document.querySelector("#modalTitle")?.textContent==="Game Menu");
 await page.click("#modalActions .pause-main");
 await page.waitForFunction(()=>document.querySelector("#menuView")?.hidden===false);
 const finalAfterFinale=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 assert.deepEqual(finalAfterFinale,baseline,"Finale retries may not alter live saves or rewards");
 assert.deepEqual(errors,[]);
 console.log("PASS Journey 2.0 390px first-chapter preview: Hanabi on level 8, authentic seeded swap, Koi finale and isolated player progress");
}finally{await browser.close();}
