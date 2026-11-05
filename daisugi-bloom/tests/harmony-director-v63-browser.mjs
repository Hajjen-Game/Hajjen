import assert from "node:assert/strict";
import fs from "node:fs";
import puppeteer from "puppeteer-core";

const chrome=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"].find(fs.existsSync);
if(!chrome)throw Error("Chromium missing");
const browser=await puppeteer.launch({executablePath:chrome,headless:true,
 args:["--no-sandbox","--disable-setuid-sandbox"]});
const page=await browser.newPage(),KEY="japanese-harmony-puzzle-v2",errors=[];
page.on("pageerror",e=>errors.push(e.message));
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2",timeout:40000});
 await page.waitForFunction(()=>window.HarmonyDirector63&&window.HarmonyRules?.Game);
 assert.deepEqual(await page.$$eval("#gameDirectorMode option",xs=>xs.map(x=>x.value)),
  ["auto","v63"],"Only the supported Director must be selectable");
 await page.evaluate(key=>{
  const state=JSON.parse(localStorage.getItem(key));
  state.unlocked=24;state.run=null;delete state.journeyProgression;
  localStorage.setItem(key,JSON.stringify(state));
 },KEY);
 await page.reload({waitUntil:"networkidle2"});
 await page.click("#goshuinButton");
 await page.click('.washi-level-tile[data-level="25"]');
 await page.click(".washi-detail-play");
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:16000});
 const active=await page.evaluate(key=>{
  const save=JSON.parse(localStorage.getItem(key)),g=new HarmonyRules.Game(24,save.run.data,{fastRestore:true});
  const ctx={goal:g.config.goal,goalParts:g.goalParts(),mist:g.mist,
   darumaHealth:g.daruma,sealedHealth:g.sealed,objectiveDrought:g.objectiveDrought};
  const m=HarmonyDirector63.assess(g.board,g.config.goal,ctx,HarmonyRules.validSwaps,HarmonyRules.scan);
  return {level:save.run.level,director:g.directorMode,parts:m.active,
   label:document.querySelector("#paceStatus")?.textContent,
   recipes:save.run.data.levelRecipe?.id,legal:m.legal};
 },KEY);
 assert.equal(active.level,24);assert.equal(active.director,"v63");
 assert.equal(active.parts,2);assert(active.legal>=3);
 assert(active.label.includes("OBJECTIVES 6.3"));
 assert(active.recipes.startsWith("journey2-"));
 await page.click("#pauseButton");await page.click("#modalActions .pause-main");
 await page.$eval("#menuAdvanced",el=>el.open=true);
 await page.click("#devButton");
 const modes=await page.$$eval("#engineMode option",items=>items.map(x=>x.value));
 assert.deepEqual(modes,["compare63","compareStandard63","director63","standard"]);
 await page.click("#modalActions button:last-child");

 // A round saved by 6.2 is still resumed by the historical Director, NOT 6.3.
 await page.evaluate(key=>{
  const save=JSON.parse(localStorage.getItem(key));
  const g=HarmonyPuzzleArchitect.build(HarmonyRules,HarmonyJourneyAuthoredOpenings.get(24),
   {seed:20261105,recordRound:true,directorMode:"v62"});
  if(!g.swap(...HarmonyRules.validSwaps(g.board)[0]).ok)throw Error("Legacy round invalid");
  save.run={level:24,data:g.save()};
  localStorage.setItem(key,JSON.stringify(save));
 },KEY);
 await page.reload({waitUntil:"networkidle2"});
 assert.equal(await page.$eval("#continueButton strong",el=>el.textContent),"CONTINUE");
 await page.click("#continueButton");
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:16000});
 const preserved=await page.evaluate(key=>({
  mode:JSON.parse(localStorage.getItem(key)).run.data.directorMode,
  label:document.querySelector("#paceStatus")?.textContent
 }),KEY);
 assert.equal(preserved.mode,"v62");assert(preserved.label.includes("MOBILITY 6.2"));
 assert.deepEqual(errors,[]);
 console.log("PASS Director 6.3 mobile · production Journey, settings, diagnostics and 6.2 save compatibility");
}finally{await browser.close();}
