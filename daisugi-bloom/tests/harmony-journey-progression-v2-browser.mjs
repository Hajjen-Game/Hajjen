import assert from "node:assert/strict";
import fs from "node:fs";
import puppeteer from "puppeteer-core";

const chrome=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"].find(fs.existsSync);
if(!chrome)throw Error("Chrome/Chromium missing");
const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:["--no-sandbox","--disable-setuid-sandbox"]});
const page=await browser.newPage(),KEY="japanese-harmony-puzzle-v2",errors=[];
page.on("pageerror",e=>errors.push(e.message));
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2",timeout:40000});
 await page.waitForFunction(()=>window.HarmonyJourneyProgression?.VERSION===2);
 // Simulate migration of the real older profile, not a freshly signed stamp.
 const original=await page.evaluate(key=>{
  const s=JSON.parse(localStorage.getItem(key));
  s.unlocked=39;
  s.bestStars={20:3,24:3,39:3};
  s.bestScores={24:7900};s.fourFamilyStars={0:3};
  s.economy={version:1,coins:476,paidStars:{20:3,24:3},owned:["sakura"],equipped:null};
  s.omamoriCards={version:2,counts:{sakura:2,grandBloom:1},
   discovered:["sakura","grandBloom"],replay:{day:"2026-11-05",claims:0}};
  s.run=null;delete s.journeyProgression;
  localStorage.setItem(key,JSON.stringify(s));
  return {stars:s.bestStars,score:s.bestScores,coins:s.economy.coins,
   inventory:s.omamoriCards.counts};
 },KEY);
 await page.reload({waitUntil:"networkidle2",timeout:40000});
 const migration=await page.evaluate(key=>{
  const s=JSON.parse(localStorage.getItem(key));
  const P=window.HarmonyJourneyProgression,G=window.HarmonyGoshuincho;
  return {version:s.journeyProgression?.version,unlocked:P.unlocked(s),
   stamps:G.summary(s).earned,legacyStars:s.bestStars,
   score:s.bestScores,coins:s.economy.coins,inventory:s.omamoriCards.counts};
 },KEY);
 assert.equal(migration.version,2);assert.equal(migration.unlocked,40, "Historical level-40 completion preserves access but not a current stamp");
 assert.equal(migration.stamps,0);
 assert.deepEqual(migration.legacyStars,original.stars);
 assert.deepEqual(migration.score,original.score);
 assert.equal(migration.coins,original.coins);
 assert.deepEqual(migration.inventory,original.inventory);
 assert.equal(await page.$eval("#goshuinProgress",e=>e.textContent),"0 / 40 stamps");
 await page.click("#goshuinButton");
 assert.equal(await page.$eval(".washi-chapter-count",e=>e.textContent),"LEVEL 31–40");
 assert.equal(await page.$eval('.washi-level-tile[data-level="40"]',e=>e.classList.contains("is-earned")),false);
 await page.click(".washi-book-close");
 // Real two-move Hanabi solution creates one signed stamp without manual
 // modification of the public gameplay goal, rewards or inventory.
 const proof=await page.evaluate(key=>{
  const s=JSON.parse(localStorage.getItem(key));
  const g=window.HarmonyPuzzleArchitect.build(window.HarmonyRules,
   window.HarmonyJourneyAuthoredOpenings.get(4),{seed:123,recordRound:true,directorMode:"v63"});
  if(!g.swap(30,31).ok||!g.swap(30,37).ok||!g.complete)throw Error("Hanabi proof not won");
  const stamp=window.HarmonyJourneyProgression.complete(s,g);
  if(!stamp.ok)throw Error("Won level rejected");
  const reward=window.HarmonyEconomy.claim(s,4,stamp.stars,stamp.receipt);
  localStorage.setItem(key,JSON.stringify(s));
  return {stamp,coins:s.economy.coins,reward:reward.delta,inventory:s.omamoriCards.counts};
 },KEY);
 assert(proof.stamp.newStamp&&proof.stamp.ok);
 assert.equal(proof.reward,0,"Coins still start after level 10");
 assert.equal(proof.coins,original.coins);
 await page.reload({waitUntil:"networkidle2",timeout:40000});
 assert.equal(await page.$eval("#goshuinProgress",e=>e.textContent),"1 / 40 stamps");
 await page.click("#goshuinButton");
 for(let i=0;i<3;i++)await page.click(".washi-prev");
 assert.equal(await page.$eval(".washi-chapter-count",e=>e.textContent),"LEVEL 1–10");
 assert.equal(await page.$eval('.washi-level-tile[data-level="5"]',e=>e.classList.contains("is-earned")),true);
 await page.click(".washi-next");await page.click(".washi-next");
 assert.equal(await page.$eval('.washi-level-tile[data-level="25"]',e=>e.classList.contains("is-earned")),false,
  "Older level 25 achievement must not become a new level 25 stamp");
 const persisted=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 assert.equal(persisted.economy.coins,original.coins);
 assert.deepEqual(persisted.omamoriCards.counts,original.inventory);
 assert.equal(persisted.bestStars[24],3,"Historical level 25 star record survives");
 assert.deepEqual(errors,[]);
 console.log("PASS Journey Progression Integrity 2.0 · migrated 390px Goshuincho and genuine Hanabi stamp");
}finally{await browser.close();}
