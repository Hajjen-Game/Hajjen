import assert from "node:assert/strict";
import fs from "node:fs";
import puppeteer from "puppeteer-core";
const exe=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"].find(p=>fs.existsSync(p));
if(!exe)throw Error("Browser executable missing");
const browser=await puppeteer.launch({executablePath:exe,headless:true,args:["--no-sandbox","--disable-setuid-sandbox"]});
const context=await browser.createBrowserContext(),page=await context.newPage(),errors=[];
page.on("pageerror",e=>errors.push(e.message));
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2",timeout:40000});
 await page.waitForFunction(()=>!!window.HarmonyFortune&&!!window.HarmonyEconomy);
 assert.equal(await page.$eval("#omikujiStatus",el=>el.textContent),"Free today");
 assert.equal(await page.$eval("#harmonyCoins",el=>el.textContent),"0 coins");
 await page.click("#omikujiButton");
 assert.equal(await page.$eval("#modalTitle",el=>el.textContent),"Omikuji Fortune");
 assert.equal(await page.$$eval(".omikuji-paper.is-folded",x=>x.length),1);
 assert.equal(await page.$$eval(".omikuji-draw",x=>x.length),1);
 const before=await page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")).bestStars));
 await page.click(".omikuji-draw");
 const earned=await page.evaluate(()=>{
  const s=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2"));
  return {coins:s.economy.coins,last:s.fortune.lastDraw,draws:s.fortune.count,
   status:document.querySelector("#omikujiStatus").textContent,
   paper:document.querySelector(".omikuji-paper").textContent};
 });
 assert(earned.coins>=5&&earned.coins<=16);
 assert.equal(earned.coins,earned.last.coins);
 assert.equal(earned.draws,1);
 assert.equal(earned.status,"Fortune drawn today");
 assert(earned.paper.includes("TODAY\'S FORTUNE"));
 assert.equal(await page.$$eval(".omikuji-draw",x=>x.length),0,"No repeat-draw button today");
 assert.equal(await page.$$eval(".omikuji-paper.is-revealed",x=>x.length),1);
 const currentUI=await page.$eval("#modalContent",e=>e.textContent);
 assert(currentUI.includes("+"+earned.coins+" Harmony Coins"));
 await page.click(".omikuji-close");
 await page.reload({waitUntil:"networkidle2"});
 assert.equal(await page.$eval("#omikujiStatus",el=>el.textContent),"Fortune drawn today");
 await page.click("#omikujiButton");
 assert.equal(await page.$$eval(".omikuji-draw",x=>x.length),0);
 const reloaded=await page.evaluate(()=>{
  const s=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2"));
  return {coins:s.economy.coins,draws:s.fortune.count,last:s.fortune.lastDraw,
   best:JSON.stringify(s.bestStars)};
 });
 assert.equal(reloaded.coins,earned.coins);
 assert.equal(reloaded.draws,1);
 assert.deepEqual(reloaded.last,earned.last);
 assert.equal(reloaded.best,before,"Stars remain untouched");
 await page.click(".omikuji-close");
 await page.click("#omamoriButton");
 assert((await page.$eval(".omamori-wallet-copy strong",el=>el.textContent)).includes(String(earned.coins)),
  "Omamori shares the currency wallet");
 await page.click(".omamori-close");
 await page.setViewport({width:320,height:640,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.click("#omikujiButton");
 const box=await page.evaluate(()=>{
  const m=document.querySelector(".modal-inner").getBoundingClientRect();
  const p=document.querySelector(".omikuji-paper").getBoundingClientRect();
  return {screen:innerWidth,doc:document.documentElement.scrollWidth,modal:m.width,paper:p.width,
   paperLeft:p.left,paperRight:p.right};
 });
 assert(box.doc<=box.screen+1&&box.modal<=box.screen+1);
 assert(box.paperLeft>=0&&box.paperRight<=box.screen+1,"Paper must fit 320px");
 fs.mkdirSync("/tmp/daisugi-bloom",{recursive:true});
 await page.screenshot({path:"/tmp/daisugi-bloom/omikuji-fortune-320.png"});
 assert.deepEqual(errors,[],"No JavaScript errors");
 console.log("PASS Omikuji Fortune 1.0 mobile, reward, persistence, replay protection, shared wallet");
}finally{await context.close();await browser.close();}
