import fs from "node:fs";
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
/* The real Android symptom: Lotus has playable swaps but no perceived hint.
   Check that repeated invalid taps do NOT restart the 30-second timer and
   that Goal (?) can reveal a non-destructive, guaranteed-legal swap now. */
const chrome=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"].find(fs.existsSync);
if(!chrome)throw Error("Chromium required for Lotus hint browser contract");
const browser=await puppeteer.launch({executablePath:chrome,headless:true,
 args:["--no-sandbox","--disable-setuid-sandbox"]});
const page=await browser.newPage(),errors=[],key="japanese-harmony-puzzle-v2";
page.on("pageerror",err=>errors.push(err.message));
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 // Accelerate ONLY the 30-second hint timeout, not gameplay animations.
 // This verifies its actual scheduling/DOM without waiting half a minute.
 await page.evaluateOnNewDocument(()=>{
  const original=window.setTimeout.bind(window);
  window.setTimeout=(handler,ms,...args)=>original(handler,ms===30000?1600:ms,...args);
 });
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",{
  waitUntil:"networkidle2",timeout:40000});
 await page.evaluate(storageKey=>{
  const save=JSON.parse(localStorage.getItem(storageKey));
  save.unlocked=5;save.reduceMotion=true;
  save.run={level:5,data:new HarmonyRules.Game(5,null,{seed:8819,directorMode:"v4"}).save()};
  localStorage.setItem(storageKey,JSON.stringify(save));
 },key);
 await page.reload({waitUntil:"networkidle2"});
 const baseline=await page.evaluate(storageKey=>JSON.parse(localStorage.getItem(storageKey)),key);
 await page.$eval("#menuAdvanced",node=>node.open=true);
 await page.click("#lotusPreviewButton");
 await page.waitForFunction(()=>document.querySelector("#modalTitle")?.textContent==="Lotus Stream · Preview");
 await page.click('.lotus-preview-choice[data-preview="garden-route"]');
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:12000});
 const before=await page.$eval("#movesCount",node=>node.textContent);
 // Repeated taps, including fixed tiles/seed targets and an invalid swap.
 // An idle timer must not be reset to a NEW 30-second countdown each time.
 for(let i=0;i<6;i++){
  await page.evaluate(i=>{
   const index=[0,2,23,25,29,45][i];
   document.querySelector('.tile[data-index="'+index+'"]').click();
  },i);
  await new Promise(resolve=>setTimeout(resolve,200));
 }
 await page.waitForFunction(()=>document.querySelectorAll(".tile.idle-hint-source").length===1&&
  document.querySelectorAll(".tile.idle-hint-target").length===1,
  {timeout:16000});
 const marked=await page.evaluate(()=>{
  const from=Number(document.querySelector(".idle-hint-source").dataset.index);
  const to=Number(document.querySelector(".idle-hint-target").dataset.index);
  const g=new HarmonyRules.Game(60,null,{
   seed:20261101,lotusPreview:"garden-route",directorMode:"v61"});
  return {from,to,legal:HarmonyRules.validSwaps(g.board)};
 });
 assert(marked.legal.some(([a,b])=>(a===marked.from&&b===marked.to)||
  (a===marked.to&&b===marked.from)),"Idle hint must be a real legal swap");
 assert.equal(await page.$eval("#movesCount",n=>n.textContent),before,
  "Hints must not consume a move");
 // Explicit on-demand hint via existing Goal (?) help. It must be visible
 // immediately on returning to the board, even without passive timeout.
 await page.click("#goalHelpButton");
 await page.waitForFunction(()=>!document.querySelector("#modal").hidden);
 await page.waitForFunction(()=>[...document.querySelectorAll("#modalActions button")]
  .some(b=>b.textContent.includes("Show a possible move")));
 await page.evaluate(()=>{
  [...document.querySelectorAll("#modalActions button")]
   .find(b=>b.textContent.includes("Show a possible move")).click();
 });
 await page.waitForFunction(()=>
  document.querySelector("#modal").hidden&&
  document.querySelectorAll(".tile.idle-hint-source").length===1&&
  document.querySelectorAll(".tile.idle-hint-target").length===1,
  {timeout:15000});
 assert.equal(await page.$eval("#movesCount",n=>n.textContent),before);
 const after=await page.evaluate(storageKey=>JSON.parse(localStorage.getItem(storageKey)),key);
 for(const f of ["unlocked","run","bestStars","bestScores","omamoriCards","economy"])
  assert.deepEqual(after[f],baseline[f],"A hint must not mutate saved "+f);
 assert.deepEqual(errors,[]);
 console.log("PASS Lotus stuck-move help: invalid taps do not delay idle guidance, explicit goal help shows a legal swap, no move/score/save change");
}finally{await browser.close();}
