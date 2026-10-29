import fs from "node:fs";
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
const executablePath=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"].find(x=>fs.existsSync(x));
if(!executablePath)throw Error("Chrome missing");
const browser=await puppeteer.launch({executablePath,headless:true,args:["--no-sandbox","--disable-setuid-sandbox"]});
const page=await browser.newPage(),errors=[];
page.on("pageerror",e=>errors.push(e.message));
const key="japanese-harmony-puzzle-v2";
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2"});
 await page.evaluate(key=>{
  const s=JSON.parse(localStorage.getItem(key));
  s.unlocked=12;s.run=null;
  s.economy={version:1,coins:1800,paidStars:{},owned:[],equipped:null};
  s.omamoriCards={version:2,counts:{sakura:2,grandBloom:1,deepCurrent:1,tsuki:1,moonGrace:1},
   discovered:["sakura","grandBloom","deepCurrent","tsuki","moonGrace"],replay:{day:"",claims:0}};
  localStorage.setItem(key,JSON.stringify(s));
 },key);
 await page.reload({waitUntil:"networkidle2"});
 await page.click("#continueButton");
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:9000});
 await page.evaluate(()=>document.querySelector(".jh-tutorial-ok")?.click());
 const initially=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
 await page.click(".omamori-open");
 assert.equal(await page.$$eval(".omamori-picker-item",x=>x.length),3,
  "Moon cards are not available as ordinary boosters");
 await page.click('.omamori-picker-item[data-power="sakura"]');
 await page.click('.tile[data-index="24"]');
 assert.equal(await page.$eval(".omamori-hud-title",e=>e.textContent),"✿ Bloom Touch");
 assert.equal(await page.$eval("#modal",e=>e.hidden),true,"No overlay hides the board");
 assert.equal(await page.$eval(".omamori-target-actions.is-ready",x=>x.length),1);
 assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).omamoriCards.counts.sakura,key),2,
  "Selecting a target must not spend a card");
 await page.click(".omamori-power-confirm");
 await page.waitForFunction(key=>{
  const s=JSON.parse(localStorage.getItem(key));
  return s.omamoriCards.counts.sakura===1&&s.run?.data?.blessingUses===1;
 },{timeout:20000},key);
 assert.deepEqual((await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key)).bestStars,initially.bestStars);
 await page.waitForFunction(()=>document.querySelector("#board").getAttribute("aria-busy")==="false",{timeout:20000});
 await page.click(".omamori-open");
 await page.click('.omamori-picker-item[data-power="grandBloom"]');
 await page.click('.tile[data-index="23"]');
 await page.click('.tile[data-index="22"]');
 assert.equal(await page.$eval("#modal",e=>e.hidden),true);
 assert.equal(await page.$eval(".omamori-target-actions.is-ready",x=>x.length),1);
 await page.click(".omamori-power-confirm");
 await page.waitForFunction(key=>{
  const s=JSON.parse(localStorage.getItem(key));
  return !s.omamoriCards.counts.grandBloom&&s.run?.data?.blessingUses===2;
 },{timeout:20000},key);
 await page.waitForFunction(()=>document.querySelector("#board").getAttribute("aria-busy")==="false",{timeout:20000});
 await page.click(".omamori-open");
 assert.equal(await page.$eval('.omamori-picker-item[data-power="deepCurrent"]',e=>e.disabled),true,
  "Two regular boosts reached; all other board powers are locked");
 await page.click("#modalActions button.primary");
 const s=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
 assert.equal(s.omamoriCards.counts.tsuki,1,"Moon is not spent by board boosts");
 assert.equal(s.omamoriCards.counts.moonGrace,1);
 assert.equal(s.omamoriCards.counts.sakura,1);
 assert.equal(s.run.data.blessingUses,2);
 await page.reload({waitUntil:"networkidle2"});
 await page.click("#continueButton");
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:9000});
 await page.evaluate(()=>document.querySelector(".jh-tutorial-ok")?.click());
 assert.equal(await page.$eval(".omamori-remaining",x=>x.textContent),"2/2");
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 // Automatic Moon prompt appears when the FINAL move is actually spent.
 const pair=await page.evaluate(key=>{
  const s=JSON.parse(localStorage.getItem(key));
  s.run.data.moves=1;localStorage.setItem(key,JSON.stringify(s));
  return window.HarmonyRules.validSwaps(s.run.data.board)[0];
 },key);
 assert(pair&&pair.length===2);
 await page.reload({waitUntil:"networkidle2"});
 await page.click("#continueButton");
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:9000});
 await page.evaluate(()=>document.querySelector(".jh-tutorial-ok")?.click());
 await page.click('.tile[data-index="'+pair[0]+'"]');
 await page.click('.tile[data-index="'+pair[1]+'"]');
 await page.waitForFunction(()=>!document.querySelector(".omamori-moon-choices")?.hidden&&
  document.querySelector("#modalTitle")?.textContent==="Out of moves!",{timeout:20000});
 const offered=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).omamoriCards.counts,key);
 assert.equal(offered.tsuki,1,"Showing Moon prompt must not spend the card");
 assert.equal(offered.moonGrace,1);
 await page.click('.omamori-moon-choices .omamori-picker-item[data-power="tsuki"]');
 await page.waitForFunction(key=>{
  const s=JSON.parse(localStorage.getItem(key));
  return !s.omamoriCards.counts.tsuki&&s.run?.data?.moves===3;
 },{timeout:12000},key);
 const rescued=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
 assert.equal(rescued.omamoriCards.counts.moonGrace,1);
 assert.equal(rescued.run.data.blessingUses,3,"Moon does not occupy one of the two board boost slots");
 assert.equal(rescued.run.data.assisted,true);
 assert.deepEqual(errors,[],"No mobile JavaScript errors");
 console.log("PASS Omamori 6.0: stacked Sakura, two-boost limit, Moon separation and saved inventory");
}finally{await browser.close();}
