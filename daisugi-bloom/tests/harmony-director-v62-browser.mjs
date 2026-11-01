import fs from "node:fs";
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
const exe=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"].find(p=>fs.existsSync(p));
if(!exe)throw Error("Chrome unavailable");
const browser=await puppeteer.launch({executablePath:exe,headless:true,args:["--no-sandbox","--disable-setuid-sandbox"]});
const page=await browser.newPage(),errors=[];
page.on("pageerror",e=>errors.push(e.message));
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2",timeout:40000});
 await page.waitForFunction(()=>!!window.HarmonyDirector62&&!!window.HarmonyRules);
 const initial=await page.evaluate(()=>{
  const key="japanese-harmony-puzzle-v2",saved=JSON.parse(localStorage.getItem(key));
  const g=new HarmonyRules.Game(53,null,{directorMode:"v62",bambooPreview:true,seed:20261031+53*97});
  const pair=HarmonyRules.validSwaps(g.board)[0];
  const e=g.swap(...pair),restored=new HarmonyRules.Game(53,g.save(),{fastRestore:true});
  return {saved:JSON.stringify(saved),mode:g.directorMode,legal:!!pair,ok:e.ok,
   restored:restored.directorMode,settled:HarmonyRules.scan(g.board).length===0};
 });
 assert.equal(initial.mode,"v62");assert(initial.legal&&initial.ok&&initial.settled);
 assert.equal(initial.restored,"v62");
 await page.$eval("#menuAdvanced",node=>node.open=true);
 await page.click("#bambooPreviewButton");
 await page.waitForSelector('.bamboo-preview-choice[data-level="54"]');
 await page.click('.bamboo-preview-choice[data-level="54"]');
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden);
 const state=await page.evaluate(()=>{
  const i=53,g=new HarmonyRules.Game(i,null,{directorMode:"v62",
    bambooPreview:true,seed:20261031+i*97});
  return {mode:document.querySelector("#paceStatus")?.textContent,
   level:document.querySelector("#levelNumber")?.textContent,
   moves:Number(document.querySelector("#movesCount")?.textContent),
   pair:HarmonyRules.validSwaps(g.board)[0]};
 });
 assert(state.mode.includes("6.2"),"Preview must load Director 6.2");
 assert.equal(state.level,"LEVEL 54");
 assert.equal(state.moves,46);
 await page.evaluate(pair=>{
  document.querySelector('.tile[data-index="'+pair[0]+'"]').click();
  document.querySelector('.tile[data-index="'+pair[1]+'"]').click();
 },state.pair);
 await page.waitForFunction(()=>Number(document.querySelector("#movesCount")?.textContent)<46,{timeout:10000});
 const after=await page.evaluate(()=>({
  stored:JSON.stringify(JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2"))),
  moves:Number(document.querySelector("#movesCount")?.textContent)
 }));
 assert(after.moves<46);
 // A preview is unranked and may store UI preferences, but cannot
 // grant any completed levels, stars, coins or paid consumables.
 const beforeSave=JSON.parse(initial.saved),afterSave=JSON.parse(after.stored);
 assert.deepEqual(afterSave.bestStars,beforeSave.bestStars);
 assert.equal(afterSave.unlocked,beforeSave.unlocked);
 assert.deepEqual(errors,[]);
 console.log("PASS Director 6.2 browser · real mobile Bamboo preview, real swap, safe progress");
}finally{await browser.close();}
