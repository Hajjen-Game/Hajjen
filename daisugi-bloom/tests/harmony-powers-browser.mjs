import assert from "node:assert/strict";
import fs from "node:fs";
import puppeteer from "puppeteer-core";
const exe=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"].find(p=>fs.existsSync(p));
if(!exe)throw Error("Chrome missing");
const browser=await puppeteer.launch({executablePath:exe,headless:true,args:["--no-sandbox","--disable-setuid-sandbox"]});
const context=await browser.createBrowserContext(),page=await context.newPage(),errors=[];
page.on("pageerror",e=>errors.push(e.message));
try{
 await page.setViewport({width:320,height:640,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const url="http://127.0.0.1:8000/daisugi-bloom/";
 await page.goto(url,{waitUntil:"networkidle2"});
 await page.waitForFunction(()=>!!window.HarmonyPowers&&!!window.HarmonyRules);
 await page.evaluate(()=>{
  const key="japanese-harmony-puzzle-v2",s=JSON.parse(localStorage.getItem(key));
  s.economy.owned=["sakura","koi","tsuki"];s.economy.equipped="sakura";
  s.powers={version:1,charges:{sakura:1,koi:1,tsuki:1},claimed:{sakura:[],koi:[],tsuki:[]},starters:["sakura","koi","tsuki"]};
  s.run=null;localStorage.setItem(key,JSON.stringify(s));
 });
 await page.reload({waitUntil:"networkidle2"});
 await page.click("#continueButton");
 assert.equal(await page.$$eval(".omamori-power-button",n=>n.length),3);
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")));
 await page.click('.omamori-power-button[data-power="sakura"]');
 await page.click('.tile[data-index="24"]');
 assert((await page.$eval("#modalTitle",e=>e.textContent)).includes("Bloom Touch"));
 let confirm=await page.evaluate(()=>JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")).powers.charges.sakura);
 assert.equal(confirm,1,"Merely selecting a target cannot spend a charge");
 await page.click("#modalActions button.primary");
 await page.waitForFunction(()=>{
  const s=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2"));
  return s.run?.data?.blessingUsed&&s.powers.charges.sakura===0;
 },{timeout:15000});
 const after=await page.evaluate(()=>JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")));
 assert.equal(after.run.data.assisted,true);
 assert.equal(after.powers.charges.sakura,0);
 assert.deepEqual(after.bestStars,before.bestStars);
 assert.deepEqual(after.bestScores,before.bestScores);
 await page.reload({waitUntil:"networkidle2"});
 await page.click("#continueButton");
 const afterReload=await page.evaluate(()=>({buttons:[...document.querySelectorAll(".omamori-power-button")].map(x=>({id:x.dataset.power,disabled:x.disabled})),
  scroll:document.documentElement.scrollWidth,width:innerWidth}));
 assert(afterReload.buttons.every(b=>b.disabled),"Only one power per run, including resumed games");
 assert(afterReload.scroll<=afterReload.width,"320px must not overflow");
 // Restart a fresh run for a Koi shuffle, with its separate stock intact.
 await page.evaluate(()=>{const key="japanese-harmony-puzzle-v2",s=JSON.parse(localStorage.getItem(key));
  s.run=null;localStorage.setItem(key,JSON.stringify(s));});
 await page.reload({waitUntil:"networkidle2"});
 await page.click("#continueButton");
 await page.click('.omamori-power-button[data-power="koi"]');
 await page.click('.tile[data-index="24"]');
 assert((await page.$eval("#modalTitle",e=>e.textContent)).includes("Ripple Shuffle"));
 await page.click("#modalActions button.primary");
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")).powers.charges.koi===0,
  {timeout:15000});
 assert.deepEqual(errors,[],"No errors when selecting and spending Sakura/Koi powers");
 console.log("PASS Omamori Powers 3.0 mobile: real targeted consumables, 320px, assisted save and reload");
}finally{await context.close();await browser.close();}
