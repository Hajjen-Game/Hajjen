import assert from "node:assert/strict";
import fs from "node:fs";
import puppeteer from "puppeteer-core";

const executablePath=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"].find(fs.existsSync);
if(!executablePath)throw Error("Chrome/Chromium unavailable");
const browser=await puppeteer.launch({executablePath,headless:true,args:["--no-sandbox","--disable-setuid-sandbox"]});
const page=await browser.newPage(),KEY="japanese-harmony-puzzle-v2",errors=[];
page.on("pageerror",error=>errors.push(error.message));
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2",timeout:40000});
 await page.waitForFunction(()=>window.HarmonySaveHealth&&window.HarmonyJourneyDrafts?.COUNT===40);
 for(const index of [4,24,39]){
  const expected=await page.evaluate((level,key)=>{
   const R=window.HarmonyRules;
   const game=window.HarmonyPuzzleArchitect.build(R,window.HarmonyJourneyAuthoredOpenings.get(level),
    {seed:20261105+level,recordRound:true,directorMode:"v62"});
   if(!game.swap(...R.validSwaps(game.board)[0]).ok)throw Error("Opening move failed");
   const run={level,data:game.save(),backgroundId:0};
   if(!window.HarmonySaveHealth.validRun(run))throw Error("Real Journey run rejected");
   const save=JSON.parse(localStorage.getItem(key));
   save.unlocked=level;save.run=run;
   save.economy={version:1,coins:216,paidStars:{20:2},owned:[],equipped:null};
   save.omamoriCards={version:2,counts:{sakura:2},discovered:["sakura"],
    replay:{day:"2026-11-05",claims:0}};
   localStorage.setItem(key,JSON.stringify(save));
   return run.data;
  },index,KEY);
  await page.reload({waitUntil:"networkidle2",timeout:40000});
  assert.equal(await page.$eval("#continueButton strong",x=>x.textContent),"CONTINUE");
  await page.click("#continueButton");
  await page.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:15000});
  const data=await page.evaluate(key=>{
   const s=JSON.parse(localStorage.getItem(key)),r=s.run;
   return {level:r.level,run:r.data,coins:s.economy.coins,cards:s.omamoriCards.counts.sakura,
    preview:document.body.classList.contains("journey-draft-preview")};
  },KEY);
  assert.equal(data.level,index);
  assert.deepEqual(data.run.board,expected.board);
  assert.equal(data.run.moves,expected.moves);
  assert.equal(data.run.score,expected.score);
  assert.equal(data.run.levelRecipe.id,expected.levelRecipe.id);
  assert.equal(data.run.directorMode,"v62");
  assert.equal(data.coins,216);assert.equal(data.cards,2);assert.equal(data.preview,false);
  console.log("PASS browser reload/resume for Journey level "+(index+1));
 }
 const original=await page.evaluate(key=>{
  const save=JSON.parse(localStorage.getItem(key));save.run.data.lotusDelivered=999;
  const raw=JSON.stringify(save);localStorage.setItem(key,raw);return raw;
 },KEY);
 await page.reload({waitUntil:"networkidle2",timeout:40000});
 const recovery=await page.evaluate(key=>({
  live:JSON.parse(localStorage.getItem(key)),
  backup:localStorage.getItem(key+"-invalid-run-backup")
 }),KEY);
 assert.equal(recovery.backup,original);
 assert.equal(recovery.live.run,null);
 assert.equal(recovery.live.economy.coins,216);
 assert.equal(recovery.live.omamoriCards.counts.sakura,2);
 assert.deepEqual(errors,[]);
 console.log("PASS browser invalid-round recovery backup");
}finally{await browser.close();}
