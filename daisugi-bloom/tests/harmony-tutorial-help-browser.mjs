import assert from "node:assert/strict";
import fs from "node:fs";
import puppeteer from "puppeteer-core";

const executablePath=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"]
 .find(path=>fs.existsSync(path));
if(!executablePath)throw Error("Chrome is needed to test first-time tutorial dialogs");
const browser=await puppeteer.launch({headless:true,executablePath,
 args:["--no-sandbox","--disable-setuid-sandbox"]});
const page=await browser.newPage();
const errors=[];
page.on("pageerror",error=>errors.push(error.message));
const KEY="japanese-harmony-puzzle-v2";
async function openLevel(index){
 await page.evaluate(({index,key})=>{
  const save=JSON.parse(localStorage.getItem(key));
  save.unlocked=index;save.run=null;
  localStorage.setItem(key,JSON.stringify(save));
 },{index,key:KEY});
 await page.reload({waitUntil:"networkidle2"});
 await page.click("#continueButton");
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden&&
  !document.querySelector("#modal").hidden&&
  !!document.querySelector(".jh-tutorial"),{timeout:9000});
}
async function info(){
 return page.evaluate(key=>{
  const modal=document.querySelector("#modal"),body=document.querySelector(".jh-tutorial");
  const saved=JSON.parse(localStorage.getItem(key));
  const rect=modal.querySelector(".modal-inner").getBoundingClientRect();
  return {open:!modal.hidden,type:body?.dataset.lesson,
   cards:body?.querySelectorAll(".jh-tutorial-example").length,
   drawings:body?.querySelectorAll("svg").length,
   button:document.querySelector(".jh-tutorial-ok")?.textContent,
   seen:saved.tutorialHelpSeen||{},moves:document.querySelector("#movesCount").textContent,
   width:rect.width,height:rect.height,screenHeight:innerHeight,screenWidth:innerWidth,
   pageWidth:document.documentElement.scrollWidth};
 },KEY);
}
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2",timeout:40000});
 await page.waitForFunction(()=>!!window.HarmonyTutorialHelp);
 // New player: don't record the tutorial as seen just because it appeared.
 await page.click("#continueButton");
 await page.waitForFunction(()=>!document.querySelector("#modal").hidden&&
  !!document.querySelector(".jh-tutorial"),{timeout:9000});
 const match=await info();
 assert.equal(match.type,"match");assert.equal(match.button,"OK");
 assert.equal(match.cards,1);assert.equal(match.drawings,1);
 assert.equal(match.seen.match,undefined,"Showing is not an acknowledgment");
 await page.click(".jh-tutorial-ok");
 assert.equal((await info()).seen.match,true);
 assert.equal(await page.$eval("#modal",node=>node.hidden),true);
 // Replay opens the same illustrated help from the GOAL question mark.
 await page.click("#goalHelpButton");
 const manual=await info();
 assert.equal(manual.type,"match");
 assert.equal(manual.moves,match.moves);
 assert.equal(await page.$$eval(".jh-guide-state",e=>e.length),1);
 await page.click(".jh-tutorial-ok");
 assert.equal(await page.$eval("#modal",node=>node.hidden),true);
 // On reload, a previously accepted lesson must not block the same level.
 await page.reload({waitUntil:"networkidle2"});
 await page.click("#continueButton");
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:9000});
 assert.equal(await page.$eval("#modal",node=>node.hidden),true,
  "Acknowledged tutorial cannot appear again on same level");

 // Mist is introduced on level 4. On a new lesson, closing the browser
 // without OK must NOT silently mark it as read.
 await openLevel(3);
 let mist=await info();
 assert.equal(mist.type,"mist");assert.equal(mist.cards,2);
 assert.equal(mist.drawings,2);assert.equal(mist.seen.mist,undefined);
 assert.equal(mist.button,"OK");
 // The old tutorial toast vanished after 5.2s; modal must remain open.
 await new Promise(resolve=>setTimeout(resolve,5600));
 assert.equal((await info()).open,true,"No timed auto-dismiss is allowed");
 assert.equal((await info()).seen.mist,undefined);
 await page.reload({waitUntil:"networkidle2"});
 await page.click("#continueButton");
 await page.waitForFunction(()=>document.querySelector(".jh-tutorial")?.dataset.lesson==="mist"&&
  !document.querySelector("#modal").hidden,{timeout:9000});
 assert.equal((await info()).type,"mist","Unread resumed Mist lesson must reopen");
 await page.click(".jh-tutorial-ok");
 mist=await info();assert.equal(mist.seen.mist,true);
 assert.equal(await page.$eval("#modal",e=>e.hidden),true);
 await page.click("#goalHelpButton");
 assert.equal((await info()).type,"mist");
 assert.equal((await info()).moves,mist.moves,"Help must not use moves");
 await page.click(".jh-tutorial-ok");

 // All three main blocker guides use the same system and preserve the board.
 for(const [level,key] of [[20,"daruma"],[30,"stone"]]){
  await openLevel(level);
  const before=await info();
  assert.equal(before.type,key);assert.equal(before.cards,2);
  assert.equal(before.drawings,2);assert.equal(before.seen[key],undefined);
  await page.click(".jh-tutorial-ok");
  assert.equal((await info()).seen[key],true);
  await page.click("#goalHelpButton");
  const reloaded=await info();
  assert.equal(reloaded.type,key);
  assert.equal(reloaded.moves,before.moves);
  await page.click(".jh-tutorial-ok");
 }
 // Even on a 320×640 phone, the modal keeps the OK button reachable.
 await page.setViewport({width:320,height:640,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.click("#goalHelpButton");
 const small=await info();
 assert(small.width<=small.screenWidth&&small.height<=small.screenHeight,
  "Illustrated modal must fit the phone viewport");
 assert(small.pageWidth<=small.screenWidth,
  "Tutorial artwork must not introduce horizontal scrolling");
 await page.waitForSelector(".jh-tutorial-ok",{visible:true});
 await page.click(".jh-tutorial-ok");
 assert.deepEqual(errors,[],"No JavaScript exceptions during onboarding");
 console.log("PASS Tutorial Help Modal 1.0 · Mist/Daruma/Stone SVG, OK, replay, resume, persistence, mobile");
}finally{await browser.close();}
