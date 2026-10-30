import fs from "node:fs";
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
const exe=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"].find(x=>fs.existsSync(x));
if(!exe)throw Error("Chrome/Chromium missing");
const browser=await puppeteer.launch({executablePath:exe,headless:true,args:["--no-sandbox","--disable-setuid-sandbox"]});
const page=await browser.newPage(),errors=[];
const KEY="japanese-harmony-puzzle-v2";
page.on("pageerror",e=>errors.push(e.message));
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2"});
 await page.evaluate(key=>{
  const s=JSON.parse(localStorage.getItem(key));
  s.unlocked=60;s.run=null;s.tutorialHelpSeen={};
  localStorage.setItem(key,JSON.stringify(s));
 },KEY);
 await page.reload({waitUntil:"networkidle2"});
 const config=await page.evaluate(()=>({
  name:HarmonyRules.levelConfig(60).name,
  goal:HarmonyRules.levelConfig(60).goal,
  beyond:HarmonyRules.levelConfig(61).name
 }));
 assert.equal(config.name,"First Lotus Stream");
 assert.equal(config.goal.type,"lotus");
 assert.equal(config.beyond.startsWith("Endless · "),true,
  "Only the pilot is authored; levels 62–70 remain the original generated missions");
 await page.click("#continueButton");
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:10000});
 await page.waitForFunction(()=>!document.querySelector("#modal").hidden&&
   !!document.querySelector(".jh-tutorial[data-lesson='lotus-intro']"),{timeout:10000});
 await page.click("#modalActions .jh-tutorial-ok");
 const intro=await page.evaluate(()=>{
  const board=document.querySelector("#board");
  const seeds=[...board.querySelectorAll(".tile.lotus-seed-tile")].map(n=>Number(n.dataset.index));
  const exits=[...board.querySelectorAll(".tile.lotus-exit-tile")].map(n=>Number(n.dataset.index));
  const first=board.querySelector(".lotus-seed-art");
  return {seeds,exits,graphic:!!first,goal:document.querySelector("#goalLabel").textContent,
   progress:document.querySelector("#goalProgress").textContent,
   layoutWidth:document.body.scrollWidth,port:innerWidth};
 });
 assert.deepEqual(intro.seeds,[36,40]);
 assert.deepEqual(intro.exits,[43,47]);
 assert.equal(intro.graphic,true);
 assert.equal(intro.goal,"Collect Lotus seeds");
 assert.equal(intro.progress,"0 / 2");
 assert(intro.layoutWidth<=intro.port+1,"Lotus symbols must not cause mobile scrolling");
 async function swap(a,b){
  await page.evaluate(([from,to])=>{
   document.querySelector('.tile[data-index="'+from+'"]').click();
   document.querySelector('.tile[data-index="'+to+'"]').click();
  },[a,b]);
 }
 await swap(37,44);
 await page.waitForFunction(()=>document.querySelector("#goalProgress")?.textContent==="1 / 2"&&
   document.querySelector("#board")?.getAttribute("aria-busy")!=="true",{timeout:35000});
 const saved=await page.evaluate(key=>{
  const s=JSON.parse(localStorage.getItem(key));
  return {run:s.run,valid:HarmonySaveHealth.validRun(s.run)};
 },KEY);
 assert(saved.valid&&saved.run?.level===60);
 assert.equal(saved.run.data.lotusDelivered,1);
 await swap(41,48);
 await page.waitForFunction(()=>document.querySelector("#modalTitle")?.textContent==="Beautiful harmony!"&&
  !document.querySelector("#modal").hidden,{timeout:35000});
 const complete=await page.evaluate(key=>{
  const s=JSON.parse(localStorage.getItem(key));
  return {unlocked:s.unlocked,stars:s.bestStars[60],goal:document.querySelector("#goalProgress").textContent,
   remaining:document.querySelectorAll(".lotus-seed-tile").length};
 },KEY);
 assert(complete.unlocked>=61&&complete.stars>=1);
 assert.equal(complete.remaining,0);
 assert.equal(complete.goal,"2 / 2");
 assert.deepEqual(errors,[],"No JavaScript errors in mobile Lotus delivery playthrough");
 console.log("PASS Lotus Stream pilot mobile: tutorial, two gates, 2 authentic swaps, persistence and level clear");
}finally{await browser.close();}
