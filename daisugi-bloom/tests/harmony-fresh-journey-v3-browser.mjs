import assert from "node:assert/strict";
import fs from "node:fs";
import puppeteer from "puppeteer-core";

const chrome=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"].find(fs.existsSync);
if(!chrome)throw Error("Chromium missing");
const browser=await puppeteer.launch({executablePath:chrome,headless:true,
 args:["--no-sandbox","--disable-setuid-sandbox"]});
const page=await browser.newPage(),errors=[];
page.on("pageerror",error=>errors.push(error.message));
const KEY="japanese-harmony-puzzle-v2";
const MARKER="japanese-harmony-architect40-director63-reset-20261105-v1";
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2",timeout:40000});
 await page.waitForFunction(()=>window.HarmonySaveHealth?.freshJourney&&window.HarmonyDirector63);
 // Emulate an existing player who has never opened the 6.3 fresh-start release.
 await page.evaluate(({key,marker})=>{
  localStorage.removeItem(marker);
  localStorage.setItem("unrelated-app-profile","keep me");
  localStorage.setItem("japanese-harmony-first20-reset-20261024-v1","done");
  localStorage.setItem(key,JSON.stringify({
   unlocked:73,bestStars:{0:3,24:3,60:2},bestScores:{60:100000},
   fourFamilyStars:{0:3},sound:false,reduceMotion:true,playMode:"v62",
   journeyProgression:{version:2,unlocked:40,stamps:{0:{stars:3}}},
   economy:{version:1,coins:6500,paidStars:{11:3},journeyPaidStars:{old:3},owned:["koi"]},
   omamoriCards:{version:2,counts:{grandBloom:5},discovered:["grandBloom"]},
   fortune:{version:1,count:12,lastDate:"2026-11-04"},
   run:{level:60,data:{moves:1,board:[]}}
  }));
 },{key:KEY,marker:MARKER});
 await page.reload({waitUntil:"networkidle2",timeout:40000});
 const clean=await page.evaluate(({key,marker})=>{
  const save=JSON.parse(localStorage.getItem(key));
  return {
   marked:localStorage.getItem(marker),
   foreign:localStorage.getItem("unrelated-app-profile"),
   oldMarker:localStorage.getItem("japanese-harmony-first20-reset-20261024-v1"),
   unlocked:HarmonyJourneyProgression.unlocked(save),
   rawUnlocked:save.unlocked,stars:HarmonyJourneyProgression.totalStars(save),
   coins:HarmonyEconomy.snapshot(save).coins,cards:HarmonyCards.total(save),
   fortune:save.fortune?.count,run:save.run,preferences:[save.sound,save.reduceMotion,save.playMode],
   numberedLevels:[...document.querySelectorAll("#levelList .level-tile")].length,
   obsoletePreviewButtons:document.querySelectorAll("#bambooPreviewButton,#lotusPreviewButton,#moonMirrorPreviewButton").length,
   heading:document.querySelector("#directorModeDescription")?.textContent,
   bookText:document.querySelector("#goshuinProgress")?.textContent
  };
 },{key:KEY,marker:MARKER});
 assert.equal(clean.marked,"done");
 assert.equal(clean.oldMarker,null);
 assert.equal(clean.foreign,"keep me");
 assert.equal(clean.unlocked,0);
 assert.equal(clean.rawUnlocked,0);
 assert.equal(clean.stars,0);
 assert.equal(clean.coins,0);
 assert.equal(clean.cards,0);
 assert.equal(clean.fortune,0);
 assert.equal(clean.run,null);
 assert.deepEqual(clean.preferences,[false,true,"auto"]);
 assert.equal(clean.numberedLevels,20);
 assert.equal(clean.obsoletePreviewButtons,0);
 assert(clean.heading.includes("Director 6.3"));
 assert(clean.bookText.includes("0 / 10"));
 await page.click("#continueButton");
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:20000});
 const active=await page.evaluate(key=>{
  const saved=JSON.parse(localStorage.getItem(key)),run=saved.run;
  return {index:run?.level,recipe:run?.data?.levelRecipe?.id,
   director:run?.data?.directorMode,
   families:run?.data?.familyCount,
   tiles:document.querySelectorAll("#board .tile").length,
   coins:saved.economy.coins};
 },KEY);
 assert.equal(active.index,0,"Fresh player must start with level one");
 assert(active.recipe?.startsWith("journey2-"),"Only an approved architect puzzle may be published");
 assert.equal(active.director,"v63");
 assert.equal(active.families,4);
 assert.equal(active.tiles,49);
 assert.equal(active.coins,0);
 await page.reload({waitUntil:"networkidle2",timeout:40000});
 const persisted=await page.evaluate(key=>{
  const save=JSON.parse(localStorage.getItem(key));
  return {index:save.run?.level,mode:save.run?.data?.directorMode,reset:save.unlocked};
 },KEY);
 assert.equal(persisted.index,0,"A second visit must not erase the fresh round");
 assert.equal(persisted.mode,"v63");
 assert.equal(persisted.reset,0);
 assert.deepEqual(errors,[]);
 console.log("PASS 390px Fresh Start 3.0 · old profile erased once, old levels blocked, real v63 Journey playable");
}finally{await browser.close();}
