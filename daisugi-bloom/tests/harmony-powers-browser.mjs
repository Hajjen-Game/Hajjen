import assert from "node:assert/strict";
import fs from "node:fs";
import puppeteer from "puppeteer-core";
const exe=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"].find(p=>fs.existsSync(p));
if(!exe)throw Error("Chrome missing");
const browser=await puppeteer.launch({executablePath:exe,headless:true,args:["--no-sandbox","--disable-setuid-sandbox"]});
const context=await browser.createBrowserContext(),page=await context.newPage(),errors=[];
page.on("pageerror",e=>errors.push(e.message));
const key="japanese-harmony-puzzle-v2";
try{
 await page.setViewport({width:320,height:640,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2"});
 await page.waitForFunction(()=>!!window.HarmonyCards&&!!window.HarmonyPowers&&!!window.HarmonyRules);
 await page.evaluate(key=>{
  const s=JSON.parse(localStorage.getItem(key));
  s.unlocked=12;s.run=null;
  s.economy={version:1,coins:1800,owned:["sakura","koi","tsuki"],equipped:"sakura",paidStars:{}};
  s.omamoriCards={version:1,cards:{
   sakura:{tier:3,levels:[0,1,2,3,4,5]},
   koi:{tier:3,levels:[0,1,2,3,4,5]},
   tsuki:{tier:3,levels:[0,1,2,3,4,5]}
  },discovered:["sakura","koi","tsuki"],replay:{day:"",claims:0}};
  localStorage.setItem(key,JSON.stringify(s));
 },key);
 await page.reload({waitUntil:"networkidle2"});
 await page.click("#continueButton");
 assert.equal(await page.$$eval(".omamori-power-button[data-power]",n=>n.length),3);
 assert((await page.$eval("#spiritBadge",e=>e.textContent)).includes("stadium 3"));
 const first=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
 await page.click('.omamori-power-button[data-power="sakura"]');
 await page.click('.tile[data-index="24"]');
 await page.click('.tile[data-index="25"]');
 await page.click('.tile[data-index="26"]');
 assert((await page.$eval("#modalTitle",e=>e.textContent)).includes("stadium 3"));
 assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).omamoriCards.cards.sakura.tier,key),3,
  "Targeting is free until player confirms consumption");
 await page.click("#modalActions button.primary");
 await page.waitForFunction(key=>{
  const s=JSON.parse(localStorage.getItem(key));return !s.omamoriCards.cards.sakura&&
   s.run?.data?.blessingUses>=1&&s.run?.data?.assisted;
 },{timeout:20000},key);
 const after=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
 assert.equal(after.economy.equipped,null);
 assert.equal(after.omamoriCards.cards.sakura,undefined,"The whole tier-3 Sakura card is gone");
 assert.deepEqual(after.bestStars,first.bestStars);
 assert.deepEqual(after.bestScores,first.bestScores);
 assert((await page.$eval("#spiritBadge",e=>e.hidden))===true,"Spent Sakura companion must disappear");
 await page.click('.omamori-power-button[data-power="koi"]');
 await page.click('.tile[data-index="24"]');
 assert((await page.$eval("#modalTitle",e=>e.textContent)).includes("Ripple Shuffle"));
 await page.click("#modalActions button.primary");
 await page.waitForFunction(key=>{
  const s=JSON.parse(localStorage.getItem(key));
  return !s.omamoriCards.cards.koi&&s.run?.data?.blessingUses>=2;
 },{timeout:20000},key);
 await page.waitForFunction(()=>!document.querySelector("#modal").hidden,{timeout:20000});
 const modal=await page.$eval("#modalTitle",e=>e.textContent);
 assert(modal.includes("blanda igen"),"Tier III Koi offers the optional second 3x3 shuffle");
 await page.click("#modalActions button.primary");
 await page.waitForFunction(key=>{
  const s=JSON.parse(localStorage.getItem(key));
  return s.run?.data?.koiRerolls===1&&s.run?.data?.blessingUses===2;
 },{timeout:20000},key);
 const last=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
 assert.equal(last.omamoriCards.cards.tsuki.tier,3,"Unused Moon remains owned");
 assert.equal(last.omamoriCards.cards.koi,undefined,"Koi is spent only once across both shuffles");
 assert.deepEqual(last.bestStars,first.bestStars);
 await page.reload({waitUntil:"networkidle2"});
 await page.click("#continueButton");
 const reloaded=await page.evaluate(()=>({
  powerButtons:[...document.querySelectorAll(".omamori-power-button[data-power]")].map(b=>b.dataset.power),
  overflow:document.documentElement.scrollWidth>innerWidth
 }));
 assert.deepEqual(reloaded.powerButtons,["tsuki"],"Used cards never return after resume");
 assert(!reloaded.overflow,"320px game must not overflow");
 assert.deepEqual(errors,[],"No mobile JS runtime errors");
 console.log("PASS Omamori Cards 4.0: tier III Sakura/Koi, consumption, second Koi shuffle, replay-proof save");
}finally{await context.close();await browser.close();}
