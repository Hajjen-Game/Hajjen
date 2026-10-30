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
 // Onboarding: a fresh player sees the goal, not an empty card picker.
 const journeyContext=await browser.createBrowserContext();
 try{
  const journey=await journeyContext.newPage();
  await journey.setViewport({width:320,height:640,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await journey.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2"});
  await journey.evaluate(key=>{
   const s=JSON.parse(localStorage.getItem(key));
   s.unlocked=11;s.run=null;
   s.economy={version:1,coins:36,owned:[],paidStars:{10:3},equipped:null};
   s.omamoriCards={version:2,counts:{},discovered:[],replay:{day:"",claims:0}};
   delete s.omamoriEverAffordable;delete s.omamoriIntroSeen;
   localStorage.setItem(key,JSON.stringify(s));
  },key);
  await journey.reload({waitUntil:"networkidle2"});
  async function openPicker(){
   await journey.click("#continueButton");
   await journey.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:9000});
   await journey.evaluate(()=>document.querySelector(".jh-tutorial-ok")?.click());
   await journey.click(".omamori-open");
  }
  await openPicker();
  const learning=await journey.evaluate(()=>{
   const panel=document.querySelector(".omamori-picker");
   const track=panel.querySelector(".omamori-coin-track");
   const rect=panel.getBoundingClientRect();
   return {stage:panel.dataset.omamoriStage,title:document.querySelector("#modalTitle").textContent,
    amount:panel.querySelector(".omamori-coin-amount")?.textContent,
    remaining:panel.querySelector(".omamori-coin-remaining")?.textContent,
    value:track?.getAttribute("aria-valuenow"),max:track?.getAttribute("aria-valuemax"),
    width:rect.width,screen:innerWidth};
  });
  assert.equal(learning.stage,"learning");
  assert.equal(learning.title,"Discover Omamori");
  assert.equal(learning.amount,"36 / 65 Coins");
  assert.equal(learning.remaining,"29 more Coins to your first card");
  assert.equal(learning.value,"36");assert.equal(learning.max,"65");
  assert(learning.width<=learning.screen,"Coin journey must fit small mobile screens");
  await journey.click("#modalActions button.primary");
  // Simulate crossing the affordability milestone through a legit wallet.
  await journey.evaluate(key=>{
   const s=JSON.parse(localStorage.getItem(key));
   s.economy.coins=72;s.omamoriEverAffordable=true;s.run=null;
   localStorage.setItem(key,JSON.stringify(s));
  },key);
  await journey.reload({waitUntil:"networkidle2"});
  await openPicker();
  const unlocked=await journey.evaluate(()=>{
   const p=document.querySelector(".omamori-picker");
   return {stage:p.dataset.omamoriStage,
    hasTracker:!!p.querySelector(".omamori-coin-track"),
    message:p.textContent,
    button:[...document.querySelectorAll("#modalActions button")].map(b=>b.textContent)};
  });
  assert.equal(unlocked.stage,"unlocked");
  assert.equal(unlocked.hasTracker,false,"First-card tracker must disappear permanently");
  assert(unlocked.message.includes("Omamori unlocked"));
  assert(unlocked.button.includes("Visit Omamori Shop"),"Player can reach shop after unlock");
  await journey.click("#modalActions button.primary");
  assert.equal(await journey.$eval("#modalTitle",e=>e.textContent),"Omamori",
   "Shop button should take player straight to purchase without losing the run");
  await journey.click('.omamori-card[data-omamori-id="sakura"] .omamori-action');
  await journey.click(".omamori-close");
  await journey.click("#continueButton");
  await journey.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:9000});
  await journey.evaluate(()=>document.querySelector(".jh-tutorial-ok")?.click());
  await journey.click(".omamori-open");
  assert.equal(await journey.$eval(".omamori-picker",p=>p.dataset.omamoriStage),"owned");
  assert.equal(await journey.$eval(".omamori-picker-item[data-power=sakura] .omamori-picker-count",n=>n.textContent),"×1");
  await journey.click("#modalActions button.primary");
  // Once the card is gone, the milestone is still unlocked (wallet only 7).
  await journey.evaluate(key=>{
   const s=JSON.parse(localStorage.getItem(key));
   s.omamoriCards.counts={};s.run=null;localStorage.setItem(key,JSON.stringify(s));
  },key);
  await journey.reload({waitUntil:"networkidle2"});
  await openPicker();
  assert.equal(await journey.$eval(".omamori-picker",p=>p.dataset.omamoriStage),"unlocked",
   "Spending the card must not reset onboarding to the coin tracker");
  assert.equal(await journey.$eval(".omamori-coin-track",nodes=>nodes.length),0);
 }finally{await journeyContext.close();}

 await page.click("#omamoriButton");
 assert.equal(await page.$eval("#modalTitle",el=>el.textContent),"Omamori");
 assert.equal(await page.$$eval(".omamori-card",xs=>xs.length),8);
 assert.equal(await page.$$eval('.omamori-card[data-kind="keepsake"]',xs=>xs.length),0);
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
