import fs from "node:fs";
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
const executablePath=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"]
 .find(p=>fs.existsSync(p));
if(!executablePath)throw Error("Chrome required");
const browser=await puppeteer.launch({executablePath,headless:true,
 args:["--no-sandbox","--disable-setuid-sandbox"]});
const page=await browser.newPage(),errors=[];
page.on("pageerror",e=>errors.push(e.message));
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2"});
 await page.evaluate(()=>{
  const key="japanese-harmony-puzzle-v2",s=JSON.parse(localStorage.getItem(key));
  s.reduceMotion=true;s.tutorialHelpSeen={};
  localStorage.setItem(key,JSON.stringify(s));
 });
 await page.reload({waitUntil:"networkidle2"});
 await page.$eval("#menuAdvanced",el=>el.open=true);
 await page.click("#bambooPreviewButton");
 await page.click('.bamboo-preview-choice[data-level="58"]');
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden);
 const snapshot=await page.evaluate(()=>{
  const all=[...document.querySelectorAll("#board > .tile")];
  const holes=all.filter(n=>n.classList.contains("terrain-garden-tile"));
  const center=all[24];
  const desired=[16,17,18,23,24,25,30,31,32];
  const blocked=holes.map(n=>Number(n.dataset.index));
  const styles=holes.map(n=>getComputedStyle(n));
  const board=document.querySelector("#board");
  const g=new HarmonyRules.Game(57,null,{seed:20261031+57*97,bambooPreview:true,directorMode:"v62"});
  return {number:all.length,blocked,desired,
   centerIsMissing:center.classList.contains("terrain-garden-tile"),
   centerIsNotObject:!center.querySelector(".piece,.terrain-garden-art"),
   hidden:styles.every(s=>s.visibility==="hidden"&&s.opacity==="0"),
   noFocus:holes.every(n=>n.disabled&&n.tabIndex===-1&&n.getAttribute("aria-hidden")==="true"),
   playable:all.filter(n=>!n.classList.contains("terrain-garden-tile")).length,
   noHorizontalOverflow:document.documentElement.scrollWidth<=innerWidth+1,
   boardRect:board.getBoundingClientRect().width};
 });
 assert.equal(snapshot.number,49);
 assert.deepEqual(snapshot.blocked,snapshot.desired);
 assert.equal(snapshot.playable,40);
 assert(snapshot.centerIsMissing&&snapshot.centerIsNotObject);
 assert(snapshot.hidden&&snapshot.noFocus);
 assert(snapshot.noHorizontalOverflow);
 const pair=await page.evaluate(()=>{
  const g=new HarmonyRules.Game(57,null,{seed:20261031+57*97,bambooPreview:true,directorMode:"v62"});
  return HarmonyRules.validSwaps(g.board)[0];
 });
 assert(pair&&pair.length===2);
 const before=await page.$eval("#movesCount",e=>Number(e.textContent));
 await page.evaluate(([from,to])=>{
  document.querySelector('.tile[data-index="'+from+'"]').click();
  document.querySelector('.tile[data-index="'+to+'"]').click();
 },pair);
 await page.waitForFunction(expected=>document.querySelector("#board").getAttribute("aria-busy")==="false"&&
  Number(document.querySelector("#movesCount").textContent)===expected,
  {timeout:35000},before-1);
 const after=await page.$$eval(".tile.terrain-garden-tile",nodes=>
  nodes.map(x=>Number(x.dataset.index)));
 assert.deepEqual(after,snapshot.desired);
 assert.deepEqual(errors,[]);
 console.log("PASS Bamboo void 390px: true missing 3x3 center, no art/hover/focus, playable 40 cells, safe Fusion");
}finally{await browser.close();}
