import fs from "node:fs";
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
// The authored level-61 Hanabi pilot is now an unranked developer preview.
// Exercise authentic delivery/FX and forbid rewards outside Journey 1–40.
const exe=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"].find(fs.existsSync);
if(!exe)throw Error("Chrome/Chromium missing");
const browser=await puppeteer.launch({executablePath:exe,headless:true,args:["--no-sandbox","--disable-setuid-sandbox"]});
const page=await browser.newPage(),errors=[],KEY="japanese-harmony-puzzle-v2";
page.on("pageerror",e=>errors.push(e.message));
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2"});
 const config=await page.evaluate(()=>({
  name:HarmonyRules.levelConfig(60).name,
  goal:HarmonyRules.levelConfig(60).goal,
  beyond:HarmonyRules.levelConfig(61).name
 }));
 assert.equal(config.name,"First Hanabi Crate");
 assert.equal(config.goal.type,"lotus");
 assert(config.beyond.startsWith("Endless · "),"Older generated levels remain archived");
 const baseline=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 await page.$eval("#menuAdvanced",e=>e.open=true);
 await page.$eval("#devPreviews",e=>e.open=true);
 await page.click("#lotusPreviewButton");
 await page.waitForSelector('.lotus-preview-choice[data-preview="pilot"]');
 await page.click('.lotus-preview-choice[data-preview="pilot"]');
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:15000});
 assert.equal(await page.$eval("#modal",e=>e.hidden),true,
  "Development preview must not show a public Journey progression tutorial");
 const initial=await page.evaluate(()=>{
  const board=document.querySelector("#board");
  return {
   seeds:[...board.querySelectorAll(".tile.lotus-seed-tile")].map(n=>Number(n.dataset.index)),
   exits:[...board.querySelectorAll(".tile.lotus-exit-tile")].map(n=>Number(n.dataset.index)),
   graphic:!!board.querySelector(".hanabi-firework-art"),
   crates:board.querySelectorAll(".hanabi-crate").length,
   goal:document.querySelector("#goalLabel").textContent,
   progress:document.querySelector("#goalProgress").textContent,
   layoutWidth:document.body.scrollWidth,port:innerWidth
  };
 });
 assert.deepEqual(initial.seeds,[29,33]);
 assert.deepEqual(initial.exits,[43,47]);
 assert.equal(initial.graphic,true);assert.equal(initial.crates,2);
 assert.equal(initial.goal,"Deliver fireworks");assert.equal(initial.progress,"0 / 2");
 assert(initial.layoutWidth<=initial.port+1);
 async function swap(a,b){
  await page.evaluate(([from,to])=>{
   document.querySelector('.tile[data-index="'+from+'"]').click();
   document.querySelector('.tile[data-index="'+to+'"]').click();
  },[a,b]);
 }
 await swap(37,44);
 await page.waitForFunction(()=>document.querySelector("#goalProgress")?.textContent==="1 / 2"&&
  document.querySelector("#board")?.getAttribute("aria-busy")!=="true",{timeout:40000});
 await swap(41,48);
 await page.waitForFunction(()=>document.querySelector("#goalProgress")?.textContent==="2 / 2"&&
  !document.querySelector("#modal").hidden,{timeout:45000});
 assert.equal(await page.$eval("#modalTitle",n=>n.textContent),"Hanabi fireworks launched!");
 const complete=await page.evaluate(()=>({
  goal:document.querySelector("#goalProgress").textContent,
  remaining:document.querySelectorAll(".lotus-seed-tile").length,
  label:document.querySelector("#modalEyebrow").textContent
 }));
 assert.equal(complete.goal,"2 / 2");
 assert.equal(complete.remaining,0);
 assert(complete.label.includes("UNRANKED PREVIEW"));
 const after=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 for(const field of ["unlocked","run","journeyProgression","economy",
  "bestStars","bestScores","omamoriCards"])
  assert.deepEqual(after[field],baseline[field],
   "Unranked full Hanabi pilot must preserve real "+field);
 assert.deepEqual(errors,[],"No JavaScript errors during real two-delivery preview");
 console.log("PASS Hanabi pilot mobile: two real deliveries, animation, no progression or rewards");
}finally{await browser.close();}
