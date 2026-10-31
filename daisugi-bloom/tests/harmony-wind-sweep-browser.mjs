import fs from "node:fs";
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
// Dedicated visual-contract test for Wind Garden Animation 1.0.
// The actual phone-sized game must show ONE full-row mist-like band moving
// ONLY with the wind, in sync with real falling/moving treasure sprites.
const exe=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"].find(x=>fs.existsSync(x));
if(!exe)throw Error("Wind Sweep test requires Chromium");
const browser=await puppeteer.launch({executablePath:exe,headless:true,
 args:["--no-sandbox","--disable-setuid-sandbox"]});
const page=await browser.newPage(),errors=[],KEY="japanese-harmony-puzzle-v2";
page.on("pageerror",e=>errors.push(e.message));
const goto=async()=>{
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",{
  waitUntil:"networkidle2",timeout:40000
 });
};
const choose=async(key)=>{
 await page.$eval("#menuAdvanced",n=>n.open=true);
 await page.click("#windGardenPreviewButton");
 await page.waitForFunction(()=>document.querySelector("#modalTitle")?.textContent==="Wind Garden 1.0");
 await page.click('.wind-preview-choice[data-preview="'+key+'"]');
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:10000});
};
const swap=async()=>{
 await page.evaluate(()=>{
  document.querySelector('.tile[data-index="17"]').click();
  document.querySelector('.tile[data-index="24"]').click();
 });
};
const capture=async(scenario,direction)=>{
 await choose(scenario);
 await swap();
 await page.waitForSelector(".wind-sweep-row",{timeout:35000});
 const geometry=await page.evaluate(()=>{
  const band=document.querySelector(".wind-sweep-row"),
   first=document.querySelector('.tile[data-index="21"]').getBoundingClientRect(),
   last=document.querySelector('.tile[data-index="27"]').getBoundingClientRect(),
   box=band.getBoundingClientRect(),fx=band.parentElement;
  return {
   row:band.dataset.row,direction:band.dataset.direction,
   bandCount:document.querySelectorAll(".wind-sweep-row").length,
   hasVeil:!!band.querySelector(".wind-sweep-veil"),
   hasGust:!!band.querySelector(".wind-sweep-gust"),
   pointer:getComputedStyle(band).pointerEvents,
   layerPointer:getComputedStyle(fx).pointerEvents,
   leftDifference:Math.abs(box.left-first.left),
   rightDifference:Math.abs(box.right-last.right),
   heightDifference:Math.abs(box.height-first.height),
   boardOverflow:document.documentElement.scrollWidth>innerWidth+1
  };
 });
 assert.equal(geometry.row,"3");
 assert.equal(geometry.direction,direction);
 assert.equal(geometry.bandCount,1,"Wind must appear as one continuous row band");
 assert(geometry.hasVeil&&geometry.hasGust);
 assert.equal(geometry.pointer,"none");
 assert.equal(geometry.layerPointer,"none");
 assert(geometry.leftDifference<=2&&geometry.rightDifference<=2&&geometry.heightDifference<=2,
  "Wind band must exactly cover the affected seven cells");
 assert.equal(geometry.boardOverflow,false);
 // Motion vector must be ONE-WAY for the ENTIRE sweep. A stalled,
 // backwards, swirling or randomly drifting cloud fails this contract.
 await page.waitForFunction(()=>document.querySelector(".wind-sweep-gust")?.getAnimations().length>0,
  {timeout:5000});
 const animation=await page.evaluate(()=>{
  const gust=document.querySelector(".wind-sweep-gust");
  const frames=gust.getAnimations()[0].effect.getKeyframes();
  return {from:frames[0].transform,to:frames.at(-1).transform,
   duration:gust.getAnimations()[0].effect.getTiming().duration};
 });
 const expected=direction==="right"?["-125%","175%"]:["175%","-125%"];
 assert(animation.from.includes(expected[0])&&animation.to.includes(expected[1]),
  "Whole cloud must move in precisely the announced wind direction");
 assert(animation.duration>=240&&animation.duration<=500);
 await page.waitForFunction(()=>document.querySelector(".wind-sweep-row")===null&&
  document.querySelector("#board")?.getAttribute("aria-busy")==="false",
  {timeout:35000});
 assert.equal(await page.$$eval(".wind-sweep-row",n=>n.length),0,
  "Wind FX layer must be cleaned up when the move finishes");
 return geometry;
};
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await goto();
 await page.evaluate(key=>{
  const save=JSON.parse(localStorage.getItem(key));
  save.sound=false;save.reduceMotion=false;
  save.unlocked=6;save.run={level:5,data:new HarmonyRules.Game(5,null,
   {seed:4848,directorMode:"v4"}).save()};
  localStorage.setItem(key,JSON.stringify(save));
 },KEY);
 await page.reload({waitUntil:"networkidle2"});
 const baseline=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 const right=await capture("breeze","right");
 await page.reload({waitUntil:"networkidle2"});
 const left=await capture("tide","left");
 assert.equal(right.bandCount,1);assert.equal(left.bandCount,1);
 // User's Reduce animations option always takes priority over cosmetics.
 await page.evaluate(key=>{
  const save=JSON.parse(localStorage.getItem(key));
  save.reduceMotion=true;localStorage.setItem(key,JSON.stringify(save));
 },KEY);
 await page.reload({waitUntil:"networkidle2"});
 await choose("breeze");
 await swap();
 await page.waitForFunction(()=>document.querySelector("#board")?.getAttribute("aria-busy")==="false"&&
  document.querySelector("#movesCount")?.textContent==="13",{timeout:35000});
 assert.equal(await page.$$eval(".wind-sweep-row",x=>x.length),0,
  "Reduce animations must skip Wind Sweep without skipping the actual move");
 const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 for(const field of ["unlocked","run","bestScores","bestStars","omamoriCards","economy"])
  assert.deepEqual(saved[field],baseline[field],
   "Visual Wind Sweep must not change progress: "+field);
 assert.deepEqual(errors,[],"No browser errors");
 console.log("PASS Wind Sweep 1.0: continuous row-width cloud, monotonic left/right movement, reduced motion, clean FX and unchanged player progress");
}finally{await browser.close();}
