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
 await page.setViewport({width:320,height:640,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2"});
 await page.waitForFunction(()=>!!window.HarmonyCards&&window.HarmonyCards.VERSION===2);
 await page.click("#omamoriButton");
 assert.equal(await page.$eval("#modalTitle",el=>el.textContent),"Omamori");
 assert.equal(await page.$$eval(".omamori-card",xs=>xs.length),8);
 assert.equal(await page.$eval('.omamori-card[data-kind="keepsake"]',xs=>xs.length),0);
 const cardPaint=await page.evaluate(()=>{
  const red=id=>getComputedStyle(document.querySelector(
   '.omamori-card[data-omamori-id="'+id+'"] .omamori-charm')).backgroundImage;
  return {single:red("sealbreaker"),twin:red("twinSealbreaker")};
 });
 assert.equal(cardPaint.single,cardPaint.twin,
  "Sealbreaker and Twin Sealbreaker must share the exact red card finish");
 await page.click(".omamori-close");
 await page.evaluate(key=>{
  const s=JSON.parse(localStorage.getItem(key));
  s.economy={version:1,coins:1000,owned:[],paidStars:{},equipped:null};
  s.omamoriCards={version:2,counts:{},discovered:[],replay:{day:"",claims:0}};
  s.unlocked=12;s.run=null;localStorage.setItem(key,JSON.stringify(s));
 },key);
 await page.reload({waitUntil:"networkidle2"});
 await page.click("#omamoriButton");
 const buy='.omamori-card[data-omamori-id="sakura"] .omamori-action';
 await page.click(buy);await page.click(buy);
 let saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
 assert.equal(saved.omamoriCards.counts.sakura,2);
 assert.equal(saved.economy.coins,870);
 assert.equal(saved.economy.equipped,null);
 await page.click(".omamori-tab:nth-child(2)");
 assert.equal(await page.$$eval(".omamori-card",xs=>xs.length),1);
 assert((await page.$eval(".omamori-card-tag",x=>x.textContent)).includes("×2"));
 await page.click(".omamori-close");
 await page.reload({waitUntil:"networkidle2"});
 saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
 assert.equal(saved.omamoriCards.counts.sakura,2,"Inventory survives reload");
 await page.click("#continueButton");
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:9000});
 await page.evaluate(()=>document.querySelector(".jh-tutorial-ok")?.click());
 const bar=await page.evaluate(()=>{
  const plaque=document.querySelector("#omamoriPowerBar");
  const title=plaque.querySelector(".omamori-hud-title");
  const stock=plaque.querySelector(".omamori-hud-stock");
  const meter=plaque.querySelector(".omamori-remaining");
  const action=plaque.querySelector(".omamori-open");
  const p=plaque.getBoundingClientRect(),b=action.getBoundingClientRect();
  return {height:p.height,width:p.width,title:title.textContent,stock:stock.textContent,
   children:[...plaque.children].map(node=>node.className),
   label:action.textContent,used:meter.textContent,
   frame:getComputedStyle(plaque).borderImageSource,
   inset:getComputedStyle(meter).borderImageSource,
   buttonFrame:getComputedStyle(action).borderImageSource,
   buttonHeight:b.height,
   buttonBounds:{left:b.left,right:b.right,top:b.top,bottom:b.bottom},
   plaqueBounds:{left:p.left,right:p.right,top:p.top,bottom:p.bottom}};
 });
 assert(bar.height>=79&&bar.height<=116,"Approved washi Omamori panel should stay compact: "+bar.height);
 assert(bar.frame.includes("goal-omamori-original-20261029.png"),
  "Outer Omamori panel must reuse the exact approved GOAL plaque");
 assert(bar.inset.includes("score-panel-20261029.png"),
  "0/2 counter must have a miniature approved washi panel");
 assert(bar.buttonFrame.includes("moves-panel-20261029.png"),
  "OPEN CARDS must be a visibly framed action, not hidden in the title");
 assert(bar.title.includes("OMAMORI")&&bar.title.includes("お守り"));
 assert.equal(bar.stock,"2 cards");
 assert.equal(bar.used,"0/2");
 assert(bar.label.includes("OPEN CARDS"),"The action must explicitly say OPEN CARDS");
 assert(bar.buttonHeight>=32,"OPEN CARDS needs a mobile-friendly tap target");
 assert(bar.children.indexOf("omamori-hud-heading")<bar.children.indexOf("omamori-remaining"),
  "Title and inventory quantity must precede the 0/2 panel");
 assert(bar.buttonBounds.left>=bar.plaqueBounds.left-1&&
  bar.buttonBounds.right<=bar.plaqueBounds.right+1&&
  bar.buttonBounds.bottom<=bar.plaqueBounds.bottom+1,"Button must remain inside artwork");
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 assert.equal(overflow,false,"Small-phone layout must not scroll horizontally");
 await page.click(".omamori-open");
 assert.equal(await page.$eval("#modalTitle",e=>e.textContent),"Choose a boost");
 assert.equal(await page.$$eval('.omamori-picker-item[data-power="sakura"]',xs=>xs.length),1);
 assert.equal(await page.$$eval('.omamori-picker-item[data-power="tsuki"]',xs=>xs.length),0,
  "Moon cards belong exclusively to the out-of-moves offer");
 await page.click("#modalActions button.primary");
 assert.equal(await page.$eval("#modal",e=>e.hidden),true);
 assert.deepEqual(errors,[],"No browser runtime errors");
 console.log("PASS Omamori 6.0 · shop, repeated purchases, responsive compact HUD, drawer and save");
}finally{await browser.close();}
