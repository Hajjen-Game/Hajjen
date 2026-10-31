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
 // Wind must be present and move continuously BEFORE any player action.
 const initial=await page.evaluate(()=>{
  const root=document.querySelector(".wind-ambient-row");
  const wisps=[...document.querySelectorAll(".wind-ambient-wisp")];
  window.__windAmbientIdentity=root;
  return {row:root?.dataset.row,direction:root?.dataset.direction,
   layers:document.querySelectorAll(".wind-ambient-row").length,
   hasContinuousMotion:wisps.length===2&&wisps.every(n=>
    getComputedStyle(n).animationIterationCount==="infinite"&&
    getComputedStyle(n).animationPlayState==="running"),
   names:wisps.map(n=>getComputedStyle(n).animationName),
   eventLayerCount:document.querySelectorAll(".wind-sweep-row").length
  };
 });
 assert.equal(initial.row,"3");
 assert.equal(initial.direction,direction);
 assert.equal(initial.layers,1);
 assert.equal(initial.eventLayerCount,0,"The wind should be blowing before any shift");
 assert(initial.hasContinuousMotion,"Both background wisps should move continuously");
 assert(initial.names.every(name=>name==="wind-ambient-"+direction),
  "Wind animation must have the same direction across the entire row");
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
 assert(animation.duration>=240&&animation.duration<=320,
  "Actual wind gust must be faster than the earlier 330 ms sweep");
 await page.waitForFunction(()=>document.querySelector(".wind-sweep-row")===null&&
  document.querySelector("#board")?.getAttribute("aria-busy")==="false",
  {timeout:35000});
 assert.equal(await page.$eval(".wind-sweep-row",n=>n.length),0,
  "The temporary strong gust must disappear after shifting");
 const ongoing=await page.evaluate(()=>({
  stillSameLayer:document.querySelector(".wind-ambient-row")===window.__windAmbientIdentity,
  continuousLayers:document.querySelectorAll(".wind-ambient-row").length,
  nextDirection:document.querySelector(".wind-ambient-row")?.dataset.direction,
  nextRow:document.querySelector(".wind-ambient-row")?.dataset.row
 }));
 assert.equal(ongoing.stillSameLayer,true,"Wind must not stop or restart after a row shift");
 assert.equal(ongoing.continuousLayers,1);
 assert.equal(ongoing.nextRow,"3");
 assert.equal(ongoing.nextDirection,scenario==="tide"?"right":direction,
  "The ongoing wind must follow the next forecast direction");
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
 // With alternating target rows, the SAME continuous wind layer changes
 // its position and direction after the second valid move, not on every
 // redraw. An announced 2-move wait must still have visible moving air.
 await page.reload({waitUntil:"networkidle2"});
 await choose("crossing");
 await page.evaluate(()=>{window.__windCrossing=document.querySelector(".wind-ambient-row");});
 assert.deepEqual(await page.$eval(".wind-ambient-row",x=>[x.dataset.row,x.dataset.direction]),["2","left"]);
 await swap();
 await page.waitForFunction(()=>
  document.querySelector("#board")?.getAttribute("aria-busy")==="false"&&
  document.querySelector("#movesCount")?.textContent==="17",{timeout:35000});
 assert.deepEqual(await page.$eval(".wind-ambient-row",x=>[x.dataset.row,x.dataset.direction]),["2","left"]);
 const pair=await page.evaluate(()=>{
  const game=new HarmonyRules.Game(2,null,
   {seed:20261031,directorMode:"v4",windGardenPreview:"crossing"});
  game.swap(17,24);return HarmonyRules.validSwaps(game.board)[0];
 });
 await page.evaluate(([from,to])=>{
  document.querySelector('.tile[data-index="'+from+'"]').click();
  document.querySelector('.tile[data-index="'+to+'"]').click();
 },pair);
 await page.waitForFunction(()=>
  document.querySelector("#board")?.getAttribute("aria-busy")==="false"&&
  document.querySelector("#movesCount")?.textContent==="16",{timeout:35000});
 const crossing=await page.evaluate(()=>({
  same:document.querySelector(".wind-ambient-row")===window.__windCrossing,
  row:document.querySelector(".wind-ambient-row")?.dataset.row,
  direction:document.querySelector(".wind-ambient-row")?.dataset.direction
 }));
 assert.deepEqual(crossing,{same:true,row:"4",direction:"right"},
  "One persistent wind sheet must follow the next forecasted row");
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
 assert.equal(await page.$eval(".wind-sweep-row",x=>x.length),0,
  "Reduce animations must skip Wind Sweep without skipping the actual move");
 assert.equal(await page.$eval(".wind-ambient-row",x=>x.length),1,
  "Reduced motion keeps a static wind-row marking");
 assert.equal(await page.$eval(".wind-ambient-wisp",x=>getComputedStyle(x).display),"none",
  "Reduced motion must disable the continuously moving cloud");
 const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 for(const field of ["unlocked","run","bestScores","bestStars","omamoriCards","economy"])
  assert.deepEqual(saved[field],baseline[field],
   "Visual Wind Sweep must not change progress: "+field);
 assert.deepEqual(errors,[],"No browser errors");
 console.log("PASS Wind Sweep 1.1: persistent one-way row wind before/after turns, faster gust on shift, reduced motion and save safety");
}finally{await browser.close();}
