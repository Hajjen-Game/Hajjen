import assert from "node:assert/strict";
import fs from "node:fs";
import puppeteer from "puppeteer-core";
const executablePath=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"].find(fs.existsSync);
if(!executablePath)throw Error("Chrome missing");
const browser=await puppeteer.launch({executablePath,headless:true,args:["--no-sandbox","--disable-setuid-sandbox"]});
const page=await browser.newPage(),errors=[],key="japanese-harmony-puzzle-v2";
page.on("pageerror",e=>errors.push(e.message));
const gold=()=>page.$$eval(".tile.omamori-gold-target",els=>els.map(e=>Number(e.dataset.index)).sort((a,b)=>a-b));
async function pick(id){await page.click(".omamori-open");await page.click('.omamori-picker-item[data-power="'+id+'"]');}
async function close(){await page.click('#modalActions button.secondary');assert.deepEqual(await gold(),[],"Cancel clears persistent gold");}
async function target(i){await page.click('.tile[data-index="'+i+'"]');}
try{
 await page.setViewport({width:360,height:780,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2"});
 await page.evaluate(key=>{
  const save=JSON.parse(localStorage.getItem(key));
  save.unlocked=12;save.run=null;
  save.economy={version:1,coins:1400,owned:[],paidStars:{},equipped:null};
  save.omamoriCards={version:2,counts:{sakura:1,grandBloom:1,koi:1,deepCurrent:1,
   sealbreaker:1,twinSealbreaker:1},discovered:[],replay:{day:"",claims:0}};
  localStorage.setItem(key,JSON.stringify(save));
 },key);
 await page.reload({waitUntil:"networkidle2"});
 await page.click("#continueButton");
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:9000});
 await page.evaluate(()=>document.querySelector(".jh-tutorial-ok")?.click());
 // Existing 30-second hint source glow is the same CSS animation, not teal.
 await pick("grandBloom");
 await target(23);
 assert.deepEqual(await gold(),[23],"First of two targets glows immediately");
 let style=await page.$eval('.tile[data-index="23"]',e=>({
  name:getComputedStyle(e).animationName,
  outline:getComputedStyle(e).outlineColor}));
 assert(style.name.includes("jh-idle-source-glow"),"Omamori uses the existing GOLD hint pulse");
 assert(!style.outline.includes("188, 255, 240"),"Omamori never uses the teal hint target");
 await target(23);
 assert.deepEqual(await gold(),[],"Tapping again deselects a chosen tile");
 await target(23);await target(22);
 assert.deepEqual(await gold(),[22,23],"Both chosen tiles glow behind confirmation dialog");
 await close();
 await pick("sakura");await target(24);
 assert.deepEqual(await gold(),[24],"Single tile stays gold until confirmation");
 await close();
 // Preview is exactly the legal shuffle footprint (not an arbitrary 3x3 glow).
 for(const [id,at] of [["koi",48],["deepCurrent",0]]){
  await pick(id);await target(at);
  const expected=await page.evaluate(({id,at})=>
   window.HarmonyOmamoriTargets.area(id,at,window.HarmonyRules?Array.from(document.querySelectorAll(".tile"),e=>({
    family:e.classList.contains("daruma-tile")?"daruma":e.classList.contains("sealed-stone-tile")?"sealedStone":"normal"
   })):[]),{id,at});
  assert.deepEqual(await gold(),expected,id+" must mark every and only affected cell");
  assert.equal(await page.$$eval(".tile.omamori-gold-anchor",els=>els.length),1);
  await close();
 }
 await pick("grandBloom");await target(23);
 await page.evaluate(()=>{document.body.classList.add("harmony-reduced-motion")});
 style=await page.$eval('.tile[data-index="23"]',e=>({name:getComputedStyle(e).animationName,
  color:getComputedStyle(e).outlineColor}));
 assert.equal(style.name,"none","Reduced-motion retains a static golden ring");
 assert(style.color.includes("255"),"Static ring stays gold");
 await page.click(".omamori-power-cancel");
 assert.deepEqual(await gold(),[],"Cancelling the card from the HUD clears its targets");
 const inventory=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).omamoriCards.counts,key);
 assert.equal(inventory.grandBloom,1);
 assert.equal(inventory.deepCurrent,1);
 assert.deepEqual(errors,[]);
 console.log("PASS Omamori Target Feedback 1.0 browser: gold first/second target, toggle, 2x2/3x3, cancel and reduced-motion");
}finally{await browser.close();}
