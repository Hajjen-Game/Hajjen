import fs from "node:fs";
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
const browserPaths=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"];
const exe=browserPaths.find(p=>fs.existsSync(p));
if(!exe)throw new Error("Chrome/Chromium missing");
const browser=await puppeteer.launch({executablePath:exe,headless:true,args:["--no-sandbox","--disable-setuid-sandbox"]});
const page=await browser.newPage();const errors=[];
page.on("pageerror",e=>errors.push(e.message));
page.on("console",m=>{if(m.type()==="error"&&!/harmony-atlas|404/.test(m.text()))errors.push(m.text());});
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2",timeout:40000});
 await page.waitForFunction(()=>!!window.HarmonyRules);
 assert.equal(await page.$$eval(".level-tile",els=>els.length),10);
 assert.equal(await page.$eval("#continueButton",x=>x.disabled),false);
 await page.click("#continueButton");await page.waitForSelector(".tile");
 assert.equal(await page.$$eval(".tile",els=>els.length),49);
 assert.equal(await page.$$eval(".tile",els=>els.filter(el=>el.getAttribute("aria-label")?.includes("stadium 1,")).length),49,"All newly generated mobile tiles must start at stage one");
 assert.equal(await page.$$eval(".tile .stage",els=>els.length),0,"Stage fraction labels should never obscure tiles");
 await page.click(".tile");
 assert((await page.$eval("#selectedInfo",e=>e.textContent)).includes("stadium"),"Selecting a tile should provide stage information in the status line");
 await page.waitForFunction(()=>document.documentElement.classList.contains("has-atlas"),{timeout:10000});
 const atlasState=await page.evaluate(()=>({
   images:document.querySelectorAll(".tile .sprite").length,
   style:getComputedStyle(document.querySelector(".tile .sprite")).backgroundImage,
   loaded:document.documentElement.classList.contains("has-atlas")
 }));
 assert.equal(atlasState.images,49,"All 49 cells must have art sprites");
 assert(atlasState.loaded&&atlasState.style.includes("harmony-atlas.webp"),"Approved Japanese art atlas missing from live board");
 assert.equal(await page.$eval("#levelTitle",e=>e.textContent),"First Match");
 assert.equal(await page.$eval("#gameView",e=>e.hidden),false);
 const start=await page.evaluate(()=>{let g=new HarmonyRules.Game(0);return {moves:g.moves,stage:g.board.length,ready:HarmonyRules.validSwaps(g.board).length,shape:HarmonyRules.levels[7].goal.type};});
 assert.equal(start.moves,12);assert.equal(start.stage,49);assert(start.ready>=3);assert.equal(start.shape,"shape");
 const box=await page.$eval("#board",e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}));
 assert(box.width>300&&Math.abs(box.width-box.height)<2,"7x7 board should be square and fill phone width");
 fs.mkdirSync("/tmp/daisugi-bloom",{recursive:true});
 await page.screenshot({path:"/tmp/daisugi-bloom/japanese-harmony-mobile.png",fullPage:true});
 await page.click("#helpButton");assert.equal(await page.$eval("#modal",x=>x.hidden),false);
 assert((await page.$eval("#modalContent",e=>e.textContent)).includes("Power Moves"));
 await page.click("#modalActions button");assert.equal(await page.$eval("#modal",x=>x.hidden),true);
 // Regression: a real mobile fusion must reuse the same 49 tile DOM nodes.
 // Recreating those nodes for every event previously caused expensive mobile jank.
 // Previous assertion selected tile 0. Clear that selection before the swap test.
 await page.click(".tile:nth-child(1)");
 const stableTile=await page.$(".tile");
 const swap=await page.evaluate(()=>{
  const fromName={Sakura:"sakura",Lykta:"lantern",Koi:"koi",Solfjäder:"fan",Bonsai:"bonsai"};
  const cells=Array.from(document.querySelectorAll(".tile")).map((el,i)=>{
   const family=fromName[el.getAttribute("aria-label").split(",")[0]];
   return {family,stage:1,id:i+1};
  });
  return HarmonyRules.validSwaps(cells)[0];
 });
 assert(swap&&swap.length===2,"At least one playable swap must be visible");
 await page.evaluate(()=>{
   window.__kineticAnimationCount=0;
   const realAnimate=Element.prototype.animate;
   Element.prototype.animate=function(...args){
     if(this.matches(".piece, .fusion-ghost, .pulse-dot"))window.__kineticAnimationCount++;
     return realAnimate.apply(this,args);
   };
 });
 await page.evaluate(()=>{
   window.__scoreFxSeen={score:0,trail:0,burst:0};
   window.__scoreFxWatcher=new MutationObserver(records=>{
     for(const rec of records)for(const node of rec.addedNodes){
       if(node.nodeType!==1||!node.classList)continue;
       if(node.classList.contains("score-flight-token"))window.__scoreFxSeen.score++;
       if(node.classList.contains("score-trail-dot"))window.__scoreFxSeen.trail++;
       if(node.classList.contains("fusion-spark"))window.__scoreFxSeen.burst++;
     }
   });
   window.__scoreFxWatcher.observe(document.body,{childList:true,subtree:true});
 });
 const beforePoints=Number((await page.$eval("#scoreCount",e=>e.textContent)).replace(/\\D/g,""));
 const beforeMoves=Number(await page.$eval("#movesCount",e=>e.textContent));
 await page.click(".tile:nth-child("+(swap[0]+1)+")");
 await page.click(".tile:nth-child("+(swap[1]+1)+")");
 await page.waitForFunction(moves=>Number(document.querySelector("#movesCount").textContent)===moves-1,{timeout:7000},beforeMoves);
 assert(await page.evaluate(tile=>tile===document.querySelector(".tile"),stableTile),
  "Tile DOM was replaced during fusion; expected a stable mobile render surface");
 assert.equal(await page.$$eval(".tile",els=>els.length),49);
 
 await page.waitForFunction(()=>document.querySelector("#board").getAttribute("aria-busy")==="false",{timeout:7000});
 const kineticCount=await page.evaluate(()=>window.__kineticAnimationCount||0);
 assert(kineticCount>=3,"Swap and fusion should animate actual moving objects, not just pause and redraw: "+kineticCount);
 await page.waitForFunction(previous=>Number((document.querySelector("#scoreCount")?.textContent||"").replace(/\\D/g,""))>previous,{timeout:5000},beforePoints);
 const fx=await page.evaluate(()=>window.__scoreFxSeen);
 assert(fx.burst>=3,"Expected a small fusion burst around the survivor: "+JSON.stringify(fx));
 assert(fx.score>=1&&fx.trail>=3,"Expected a flying point label with a trailing stream: "+JSON.stringify(fx));
 assert.equal(await page.$eval(".tile .stage",els=>els.length),0,"Score FX must not reintroduce permanent labels");
 await page.evaluate(()=>window.__scoreFxWatcher.disconnect());


 await page.click("#menuButton");assert.equal(await page.$eval("#menuView",x=>x.hidden),false);
 assert(!errors.length,"Unexpected browser errors: "+errors.join("; "));
 console.log("PASS Japanese Harmony mobile first playable",box);
}finally{await browser.close();}
