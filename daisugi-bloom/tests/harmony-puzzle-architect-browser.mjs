import fs from "node:fs";
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
/* Development-only, responsive Puzzle Architect editor and isolated worker. */
const exe=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"]
 .find(path=>fs.existsSync(path));
if(!exe)throw Error("Chromium missing");
const browser=await puppeteer.launch({executablePath:exe,headless:true,
 args:["--no-sandbox","--disable-setuid-sandbox"]});
const page=await browser.newPage(),errors=[];
page.on("pageerror",e=>errors.push(e.message));
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const url="http://127.0.0.1:8000/daisugi-bloom/puzzle-lab/";
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2"});
 const live=await page.evaluate(()=>{
  const key="japanese-harmony-puzzle-v2";
  localStorage.setItem("puzzle-architect-guard","untouched");
  return localStorage.getItem(key);
 });
 await page.goto(url,{waitUntil:"networkidle2",timeout:40000});
 await page.waitForFunction(()=>window.HarmonyPuzzleArchitect?.VERSION===1&&
  window.HarmonyDifficultyLab?.VERSION===1&&
  document.querySelector("#board")?.children.length===49);
 const setup=await page.evaluate(()=>({
  level:document.querySelector("#level").value,
  board:document.querySelector("#board").children.length,
  fixed:[...document.querySelectorAll("#board .tile.fixed")].length,
  status:document.querySelector("#boardStatus").textContent,
  viewport:innerWidth,contentWidth:document.documentElement.scrollWidth,
  localStorageKey:localStorage.getItem("puzzle-architect-guard")
 }));
 assert.equal(setup.level,"19");
 assert.equal(setup.board,49);
 assert.equal(setup.fixed,6,"Level 20 has two rockets, two crates and two mirrors");
 assert(setup.status.startsWith("Giltigt bräde"));
 assert(setup.contentWidth<=setup.viewport+1);
 assert.equal(setup.localStorageKey,"untouched");
 // Selected family painting changes only an in-memory blueprint. Reset to
 // the captured seed to regain the engine-checked fair start.
 await page.click("#board .tile:not(.fixed)");
 assert((await page.$eval("#boardStatus",x=>x.textContent)).includes("Brädet är ändrat"));
 await page.click("#capture");
 await page.waitForFunction(()=>document.querySelector("#boardStatus").classList.contains("good"));
 // Switch to Hanabi intro and use a dedicated worker to run real moves.
 await page.select("#level","4");
 await page.waitForFunction(()=>document.querySelector("#levelInfo")?.textContent.includes("First Firework"));
 assert.equal(await page.evaluate(()=>document.querySelectorAll("#board .tile.fixed").length),2);
 const worked=await page.evaluate(()=>new Promise((resolve,reject)=>{
  const worker=new Worker("./worker.js?v=1.0.0");
  const recipe=window.HarmonyPuzzleArchitect.create(window.HarmonyRules,
   window.HarmonyJourneyDrafts.get(4),{seed:6121,
    insight:"A Hanabi rocket should move to its crate after a deliberate fusion.",
    primarySkill:"Rocket delivery route",
    sequence:["Plan a delivery","Open the route","Deliver the rocket"]});
  worker.onmessage=event=>{
   worker.terminate();
   if(!event.data.ok){reject(Error(event.data.error));return;}
   resolve({samples:event.data.result.runs.length,
    strategies:event.data.result.strategies,
    first: event.data.result.runs[0].movesUsed,
    caveat:event.data.result.caveat});
  };
  worker.onerror=e=>{worker.terminate();reject(Error(e.message));};
  worker.postMessage({blueprint:recipe,options:{
   trials:1,baseSeed:6121,maxTurns:3,maxCandidates:4,
   strategies:["random","objective"],directorMode:"v62"
  }});
 }));
 assert.equal(worked.samples,2);
 assert.deepEqual(worked.strategies,["random","objective"]);
 assert(worked.first>=1&&worked.first<=3);
 assert(worked.caveat.includes("Does NOT prove"));
 const after=await page.evaluate(()=>({
  save:localStorage.getItem("japanese-harmony-puzzle-v2"),
  guard:localStorage.getItem("puzzle-architect-guard"),
  bodyScroll:document.documentElement.scrollWidth>innerWidth+1
 }));
 assert.equal(after.save,live,"Architect page and lab worker may not change game saves");
 assert.equal(after.guard,"untouched");
 assert.equal(after.bodyScroll,false);
 assert.deepEqual(errors,[]);
 console.log("PASS Puzzle Architect 390px editable 7x7, fixed fixtures, real worker, no player-save writes");
}finally{await browser.close();}
