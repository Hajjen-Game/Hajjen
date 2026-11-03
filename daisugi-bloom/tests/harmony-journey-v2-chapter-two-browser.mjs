import fs from "node:fs";
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
/* Early Identity mobile: Hanabi on 5, Mirror on 11, Wind on 16,
 * mixed finale on 20; strict preservation of normal local saves.
 */
const exe=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"]
 .find(path=>fs.existsSync(path));
if(!exe)throw Error("Chromium missing");
const browser=await puppeteer.launch({executablePath:exe,headless:true,
 args:["--no-sandbox","--disable-setuid-sandbox"]});
const page=await browser.newPage(),errors=[],KEY="japanese-harmony-puzzle-v2";
page.on("pageerror",e=>errors.push(e.message));
async function chooser(chapter){
 await page.$eval("#menuAdvanced",node=>node.open=true);
 await page.click("#journeyDraftButton");
 await page.waitForFunction(()=>document.querySelector("#modalTitle")?.textContent==="Journey 2.0 · Levels 1–10");
 if(chapter===1){
  await page.click(".journey-chapter-tab:nth-child(2)");
  await page.waitForFunction(()=>document.querySelector("#modalTitle")?.textContent==="Journey 2.0 · Levels 11–20");
 }
 const list=await page.$$eval(".journey-draft-grid button",xs=>xs.map(x=>Number(x.dataset.level)));
 assert.deepEqual(list,Array.from({length:10},(_,i)=>i+1+chapter*10));
}
async function draft(num,chapter=0){
 await chooser(chapter);
 await page.click('.journey-draft-grid button[data-level="'+num+'"]');
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden);
}
async function lesson(title){
 await page.waitForFunction(t=>document.querySelector("#modalTitle")?.textContent===t,{},title);
 const text=await page.$eval("#modalContent",n=>n.textContent);
 assert(text.length>30,"A meaningful lesson is required");
 await page.click("#modalActions .jh-tutorial-ok");
 await page.waitForFunction(()=>document.querySelector("#modal").hidden);
}
async function leave(){
 await page.click("#pauseButton");
 await page.waitForFunction(()=>document.querySelector("#modalTitle")?.textContent==="Game Menu");
 await page.click("#modalActions .pause-levels");
 await page.waitForFunction(()=>document.querySelector("#menuView").hidden===false);
 await page.click(".washi-book-close");
 await page.waitForFunction(()=>document.querySelector("#modal").hidden);
}
async function count(){return page.evaluate(()=>({
  hanabi:document.querySelectorAll(".tile.lotus-seed-tile").length,
  crates:document.querySelectorAll(".tile.hanabi-box-tile").length,
  mirrors:document.querySelectorAll(".tile.moon-mirror-tile").length,
  mist:document.querySelectorAll(".tile.misted").length,
  wind:document.querySelectorAll(".wind-ambient-row").length,
  title:document.querySelector("#levelTitle").textContent,
  goal:document.querySelector("#goalLabel").textContent,
  moves:Number(document.querySelector("#movesCount").textContent),
  cards:getComputedStyle(document.querySelector("#omamoriPowerBar")).display,
  validWidth:document.documentElement.scrollWidth<=innerWidth+1
}));}
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2",timeout:40000});
 await page.waitForFunction(()=>window.HarmonyJourneyDrafts?.COUNT===20);
 await page.evaluate(key=>{
  const save=JSON.parse(localStorage.getItem(key));
  save.unlocked=21;
  save.run={level:19,data:new window.HarmonyRules.Game(19,null,{seed:9281,directorMode:"v4"}).save()};
  save.reduceMotion=true;
  localStorage.setItem(key,JSON.stringify(save));
 },KEY);
 await page.reload({waitUntil:"networkidle2"});
 const baseline=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 await draft(5);
 await lesson("First Firework");
 let state=await count();
 assert.deepEqual({title:state.title,goal:state.goal,moves:state.moves,
  hanabi:state.hanabi,crates:state.crates,mirrors:state.mirrors,wind:state.wind},
  {title:"First Firework",goal:"Deliver fireworks",moves:30,
   hanabi:1,crates:1,mirrors:0,wind:0});
 assert.equal(state.cards,"none");assert(state.validWidth);
 const move=await page.evaluate(()=>{
  const recipe=window.HarmonyJourneyDrafts.get(4);
  const g=new window.HarmonyRules.Game(4,null,{seed:20261102+4*197,
   directorMode:"v62",journeyDiagnostic:true,levelRecipe:recipe});
  return window.HarmonyRules.validSwaps(g.board)[0];
 });
 await page.evaluate(([a,b])=>{
  document.querySelector('.tile[data-index="'+a+'"]').click();
  document.querySelector('.tile[data-index="'+b+'"]').click();
 },move);
 await page.waitForFunction(()=>document.querySelector("#board")?.getAttribute("aria-busy")==="false"&&
  document.querySelector("#movesCount")?.textContent==="29",{timeout:35000});
 await leave();
 assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY),baseline);
 await draft(11,1);await lesson("First Moon Mirror");
 state=await count();
 assert.equal(state.title,"First Moon Mirror");assert.equal(state.mirrors,1);
 assert.equal(state.hanabi,0);assert.equal(state.wind,0);assert.equal(state.mist,0);
 assert.equal(state.goal,"Objects to stage 4");assert(state.validWidth);
 assert.equal(await page.$eval('.tile[data-index="25"]',n=>n.classList.contains("moon-mirror-tile")),true);
 await leave();
 await draft(16,1);await lesson("First Wind Garden");
 state=await count();
 assert.equal(state.title,"First Wind Garden");assert.equal(state.wind,1);
 assert.equal(state.mirrors,0);assert.equal(state.hanabi,0);assert.equal(state.mist,0);
 assert.equal(state.goal,"Fusions");assert(state.validWidth);
 await leave();
 await draft(18,1);
 state=await count();
 assert.equal(state.title,"Wind and Moonlight");assert.equal(state.mirrors,1);
 assert.equal(state.wind,1);assert.equal(state.mist,0);
 await leave();
 await draft(20,1);
 state=await count();
 assert.equal(state.title,"Festival of Reflections");
 assert.equal(state.goal,"Deliver fireworks");
 assert.equal(state.hanabi,2);assert.equal(state.crates,2);assert.equal(state.mirrors,2);
 assert.equal(state.wind,0);assert.equal(state.mist,0);
 await leave();
 assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY),baseline,
  "No Early Identity draft may modify the normal run, stars, coins, cards or book");
 assert.deepEqual(errors,[]);
 console.log("PASS Early Identity 390px: Hanabi 5, Mirror 11, Wind 16, mixed boards, true swap, unmodified saves");
}finally{await browser.close();}
