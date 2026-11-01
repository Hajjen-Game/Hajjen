import fs from "node:fs";
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
const executablePath=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"]
 .find(path=>fs.existsSync(path));
if(!executablePath)throw Error("Chrome required");
const browser=await puppeteer.launch({executablePath,headless:true,
 args:["--no-sandbox","--disable-setuid-sandbox"]});
const page=await browser.newPage(),errors=[];
page.on("pageerror",e=>errors.push(e.message));
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2",timeout:40000});
 await page.evaluate(()=>{
  const k="japanese-harmony-puzzle-v2",save=JSON.parse(localStorage.getItem(k));
  save.reduceMotion=true;save.tutorialHelpSeen={};
  localStorage.setItem(k,JSON.stringify(save));
 });
 await page.reload({waitUntil:"networkidle2"});
 await page.$eval("#menuAdvanced",x=>x.open=true);
 await page.click("#bambooPreviewButton");
 await page.waitForSelector('.bamboo-preview-choice[data-level="54"]');
 await page.click('.bamboo-preview-choice[data-level="54"]');
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden);
 const data=await page.evaluate(()=>{
  const g=new HarmonyRules.Game(53,null,{seed:20261031+53*97,
   directorMode:"v62",bambooPreview:true});
  const pairs=[],moves=[];
  for(let i=0;i<3;i++){
   const p=HarmonyRules.validSwaps(g.board)[0];
   pairs.push(p);moves.push(g.swap(...p).events.map(e=>e.type));
  }
  return {pairs,moves,
   level:document.querySelector("#levelNumber").textContent,
   highlighted:[...document.querySelectorAll(".wind-next-tile")].map(x=>Number(x.dataset.index)),
   atmosphere:!!document.querySelector(".wind-ambient-layer"),
   activeStyle:document.body.classList.contains("wind-garden-active"),
   actualBand:getComputedStyle(document.querySelector(".wind-ambient-row")).display,
   noOverflow:document.documentElement.scrollWidth<=innerWidth+1};
 });
 assert(data.level.includes("LEVEL 54")&&data.level.includes("R7")&&data.level.includes("3 MOVES"));
 assert.deepEqual(data.highlighted,[42,43,44,45,46,47,48]);
 assert(data.atmosphere&&data.activeStyle&&data.actualBand==="block"&&data.noOverflow);
 assert(data.moves[2].includes("wind-shift"),"The real move three must rotate row 7");
 for(let i=0;i<3;i++){
  await page.evaluate(pair=>{
   document.querySelector('.tile[data-index="'+pair[0]+'"]').click();
   document.querySelector('.tile[data-index="'+pair[1]+'"]').click();
  },data.pairs[i]);
  await page.waitForFunction(expected=>Number(document.querySelector("#movesCount").textContent)===expected&&
   document.querySelector("#board").getAttribute("aria-busy")==="false",
   {timeout:30000},45-i);
 }
 const after=await page.evaluate(()=>({
  forecast:document.querySelector("#levelNumber").textContent,
  highlights:document.querySelectorAll(".wind-next-tile").length,
  atmosphere:!!document.querySelector(".wind-ambient-layer"),
  width:document.documentElement.scrollWidth,screen:innerWidth
 }));
 assert(after.forecast.includes("R7")&&after.forecast.includes("3 MOVES"));
 assert(after.atmosphere&&after.highlights===7&&after.width<=after.screen+1);
 assert.deepEqual(errors,[]);
 console.log("PASS Gate of Echoes · 390px Bamboo plus lower-row Wind, real three moves");
}finally{await browser.close();}
