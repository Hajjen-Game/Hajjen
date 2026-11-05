import assert from "node:assert/strict";
import fs from "node:fs";
import puppeteer from "puppeteer-core";

// Victory Celebration 2.2: real Chromium, 390px phone, real saved move.
// The result dialog must wait until fireworks finish; gameplay state may
// never be changed by celebratory particles.
const executablePath=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"]
 .find(fs.existsSync);
if(!executablePath)throw Error("Chromium unavailable");
const browser=await puppeteer.launch({executablePath,headless:true,
 args:["--no-sandbox","--disable-setuid-sandbox"]});
const page=await browser.newPage(),errors=[],KEY="japanese-harmony-puzzle-v2";
page.on("pageerror",error=>errors.push(error.message));
const gamePage="http://127.0.0.1:8000/daisugi-bloom/";
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto(gamePage,{waitUntil:"networkidle2",timeout:40000});
 await page.waitForFunction(()=>!!window.HarmonyVictoryCelebration);
 const d=await page.evaluate(()=>window.HarmonyVictoryCelebration.DURATIONS);
 assert.deepEqual(d,{"1":2450,"2":2620,"3":2830});
 await page.click("#continueButton");
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:12000});
 if(!await page.$eval("#modal",el=>el.hidden)){
  await page.waitForSelector("#modalActions .jh-tutorial-ok",{timeout:8000});
  await page.click("#modalActions .jh-tutorial-ok");
 }
 const baseline=await page.evaluate(key=>localStorage.getItem(key),KEY);
 // Direct visual checks: one/two/three-star intensity must differ without
 // consuming turns, adding any scroll width, or leaving any DOM behind.
 for(const [stars,bursts,motes,petals] of [[1,3,10,3],[2,5,17,5],[3,7,25,7]]){
  const live=await page.evaluate(stars=>{
   const effect=window.HarmonyVictoryCelebration;
   window.__victoryCheck=effect.play({boardShell:document.querySelector(".board-shell"),
    board:document.querySelector("#board"),stars});
   const layer=document.querySelector(".jh-victory-celebration");
   return {bursts:layer?.querySelectorAll(".jh-victory-burst").length,
    motes:layer?.querySelectorAll(".jh-victory-mote").length,
    petals:layer?.querySelectorAll(".jh-victory-petal").length,
    encore:layer?.querySelectorAll(".jh-victory-burst.jh-victory-encore").length,
    halo:layer?.querySelectorAll(".jh-victory-final-ring").length,
    stars:layer?.dataset.stars,
    clear:document.querySelector("#modal").hidden,
    aria:layer?.getAttribute("aria-hidden"),
    lastBurstDelay:Number.parseInt([...layer.querySelectorAll(".jh-victory-burst")].at(-1)?.style.getPropertyValue("--delay")),
    lastMoteDelay:Number.parseInt([...layer.querySelectorAll(".jh-victory-mote")].at(-1)?.style.getPropertyValue("--delay")),
    boardDuration:document.querySelector("#board").style.getPropertyValue("--jh-victory-duration"),
    width:document.documentElement.scrollWidth,screen:innerWidth};
  },stars);
  assert.equal(live.bursts,bursts);assert.equal(live.motes,motes);
  assert.equal(live.petals,petals);assert.equal(live.encore,stars);
  assert.equal(live.halo,1,"An extra golden halo plays during the second firework wave");
  assert.equal(live.stars,String(stars));assert(live.clear);
  assert.equal(live.aria,"true");
  assert.equal(live.boardDuration,d[stars]+"ms");
  assert(live.lastBurstDelay>d[stars]*.67,"Second-wave fireworks must play near the end");
  assert(live.lastBurstDelay+540<=d[stars],"Last burst must finish before popup");
  assert(live.lastMoteDelay>d[stars]*.65,"Glitter must fill the longer celebration");
  assert(live.lastMoteDelay+610<=d[stars],"Last mote must finish before popup");
  assert(live.width<=live.screen+1,"Victory FX must stay within phone width");
  await page.waitForFunction(()=>!document.querySelector(".jh-victory-celebration"),{timeout:5000});
  assert.equal(await page.$eval(".board-shell",el=>el.classList.contains("jh-victory-active")),false);
  assert.equal(await page.$eval("#board",el=>el.style.getPropertyValue("--jh-victory-duration")),"",
   "The animation must clean up inline timing after the result");
 }
 assert.equal(await page.evaluate(key=>localStorage.getItem(key),KEY),baseline,
  "Decorative victory animation cannot save or change a run");
 // Cancellation must release animation DOM and resolve, even on navigation.
 const cancelled=await page.evaluate(async()=>{
  const fx=window.HarmonyVictoryCelebration;
  const promise=fx.play({boardShell:document.querySelector(".board-shell"),
   board:document.querySelector("#board"),stars:3});
  fx.cancel();
  const result=await promise;
  return {result,overlay:!!document.querySelector(".jh-victory-celebration")};
 });
 assert.equal(cancelled.result.status,"cancelled");assert.equal(cancelled.overlay,false);
 const reduced=await page.evaluate(async()=>{
  const fx=window.HarmonyVictoryCelebration;
  const result=await fx.play({boardShell:document.querySelector(".board-shell"),
   board:document.querySelector("#board"),stars:3,reduceMotion:true});
  return {result,overlay:!!document.querySelector(".jh-victory-celebration")};
 });
 assert.equal(reduced.result.status,"skipped");assert.equal(reduced.overlay,false);
 // Set up an authentic, recipe-backed Journey 2.0 near-finish game; legacy
 // saves without a levelRecipe are deliberately discarded by startLevel.
 // Set up an authentic near-finish game and complete it through a REAL move,
 // not by calling a result function or mutating DOM.
 await page.evaluate(key=>{
  const R=window.HarmonyRules,g=new R.Game(0,null,{seed:20261024,directorMode:"v63",
   journeyDiagnostic:true,levelRecipe:window.HarmonyJourneyDrafts.get(0),recordRound:true});
  g.fusions=g.target()-1;g.moves=15;
  const save=JSON.parse(localStorage.getItem(key));
  save.unlocked=0;save.run={level:0,data:g.save()};
  save.sound=false;save.reduceMotion=false;
  localStorage.setItem(key,JSON.stringify(save));
 },KEY);
 await page.reload({waitUntil:"networkidle2"});
 await page.click("#continueButton");
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:12000});
 if(!await page.$eval("#modal",el=>el.hidden)){
  await page.click("#modalActions .jh-tutorial-ok");
 }
 const pair=await page.evaluate(key=>{
  const state=JSON.parse(localStorage.getItem(key)).run.data;
  return window.HarmonyRules.validSwaps(state.board)[0];
 },KEY);
 assert(pair?.length===2,"Need a true finishing swap");
 await page.evaluate(pair=>{
  document.querySelector('.tile[data-index="'+pair[0]+'"]').click();
  document.querySelector('.tile[data-index="'+pair[1]+'"]').click();
 },pair);
 try{
  await page.waitForFunction(()=>!!document.querySelector(".jh-victory-celebration"),{timeout:35000});
 }catch(error){
  const debug=await page.evaluate(key=>{
   const stored=JSON.parse(localStorage.getItem(key));
   return {modalTitle:document.querySelector("#modalTitle")?.textContent,
    modalHidden:document.querySelector("#modal").hidden,
    boardBusy:document.querySelector("#board").getAttribute("aria-busy"),
    stage:document.querySelector("#goalProgress")?.textContent,
    moves:document.querySelector("#movesCount")?.textContent,
    saveMoves:stored.run?.data?.moves,
    saveComplete:stored.run?.data?.complete,
    saveFusions:stored.run?.data?.fusions,
    goal:stored.run?.data?.config?.goal,
    hasModule:!!window.HarmonyVictoryCelebration,
    reduced:getComputedStyle(document.querySelector(".board-shell")).animationName,
    errors:window.__victoryErrors||[]};
  },KEY);
  throw Error("Real final-swap celebration was not observed: "+JSON.stringify(debug),{cause:error});
 }
 const during=await page.evaluate(key=>{
  const save=JSON.parse(localStorage.getItem(key));
  return {modalHidden:document.querySelector("#modal").hidden,
   stars:document.querySelector(".jh-victory-celebration")?.dataset.stars,
   fireworks:document.querySelectorAll(".jh-victory-celebration .jh-victory-burst").length,
   busy:document.querySelector("#board").getAttribute("aria-busy"),
   savedMoves:save.run?.data?.moves,
   runComplete:save.run?.data?.complete};
 },KEY);
 assert.equal(during.modalHidden,true,"Never show result during board celebration");
 assert.equal(during.stars,"3");
 assert.equal(during.fireworks,7);
 assert.equal(during.busy,"true","Swaps must be blocked during celebration");
 assert.equal(during.runComplete,true);
 const movesDuring=during.savedMoves;
 // A tap in the celebration cannot move a tile or consume a turn.
 await page.evaluate(()=>document.querySelector(".tile[data-index='0']")?.click());
 assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).run?.data?.moves,KEY),movesDuring);
 await page.waitForFunction(()=>!document.querySelector("#modal").hidden&&
  document.querySelector("#modalTitle")?.textContent==="Beautiful harmony!",{timeout:5000});
 const after=await page.evaluate(key=>{
  const save=JSON.parse(localStorage.getItem(key));
  return {overlay:!!document.querySelector(".jh-victory-celebration"),
   glowing:document.querySelector(".board-shell").classList.contains("jh-victory-active"),
   busy:document.querySelector("#board").getAttribute("aria-busy"),
   stars:document.querySelector(".big-stars")?.textContent,
   moves:save.run?.data?.moves,complete:save.run?.data?.complete,
   next:!!document.querySelector("#modalActions .victory-next"),
   width:document.documentElement.scrollWidth,screen:innerWidth};
 },KEY);
 assert.equal(after.overlay,false);assert.equal(after.glowing,false);
 assert.equal(after.busy,"false");
 assert.equal(after.stars,"★★★");assert.equal(after.moves,movesDuring);
 assert.equal(after.complete,true);assert.equal(after.next,true);
 assert(after.width<=after.screen+1);
 assert.deepEqual(errors,[],"No JavaScript errors on a real victory");
 console.log("PASS Victory Celebration 2.2: +500ms, second Hanabi wave, petals, gold halo, real winning swap, modal delay and unchanged save");
}finally{await browser.close();}
