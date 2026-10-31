import fs from "node:fs";
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
// Wind Garden Animation 1.2. The main effect is three persistent, thin,
// directional streamlines, with NO bright temporary cloud during a shift.
const exe=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"].find(x=>fs.existsSync(x));
if(!exe)throw Error("Wind Garden visual test requires Chromium");
const browser=await puppeteer.launch({executablePath:exe,headless:true,
 args:["--no-sandbox","--disable-setuid-sandbox"]});
const page=await browser.newPage(),errors=[],KEY="japanese-harmony-puzzle-v2";
page.on("pageerror",e=>errors.push(e.message));
const url="http://127.0.0.1:8000/daisugi-bloom/";
async function openPreview(key){
 await page.$eval("#menuAdvanced",n=>n.open=true);
 await page.click("#windGardenPreviewButton");
 await page.waitForFunction(()=>document.querySelector("#modalTitle")?.textContent==="Wind Garden 1.0");
 await page.click('.wind-preview-choice[data-preview="'+key+'"]');
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden);
 await page.waitForSelector(".wind-ambient-row");
}
async function playMove(a=17,b=24){
 await page.evaluate(([from,to])=>{
  document.querySelector('.tile[data-index="'+from+'"]').click();
  document.querySelector('.tile[data-index="'+to+'"]').click();
 },[a,b]);
}
async function settled(remaining){
 await page.waitForFunction(n=>
  document.querySelector("#board")?.getAttribute("aria-busy")==="false"&&
  document.querySelector("#movesCount")?.textContent===String(n),
  {timeout:35000},remaining);
}
async function checkAmbient(row,direction,reduced=false){
 const data=await page.evaluate(()=>{
  const band=document.querySelector(".wind-ambient-row");
  const a=document.querySelector('.tile[data-index="'+(Number(band?.dataset.row||0)*7)+'"]')?.getBoundingClientRect();
  const b=document.querySelector('.tile[data-index="'+(Number(band?.dataset.row||0)*7+6)+'"]')?.getBoundingClientRect();
  const r=band?.getBoundingClientRect();
  const lines=[...document.querySelectorAll(".wind-ambient-wisp")];
  const info=lines.map(x=>{
   const style=getComputedStyle(x),an=x.getAnimations()[0];
   const frames=an?.effect.getKeyframes()||[];
   return {name:style.animationName,iteration:style.animationIterationCount,
    display:style.display,from:frames[0]?.transform,to:frames.at(-1)?.transform,
    timing:an?.effect.getTiming().duration,
    background:style.backgroundImage};
  });
  return {row:band?.dataset.row,direction:band?.dataset.direction,
   layers:document.querySelectorAll(".wind-ambient-row").length,
   gustLayers:document.querySelectorAll(".wind-sweep-row").length,
   info,layerPointer:getComputedStyle(band?.parentElement).pointerEvents,
   rowPointer:getComputedStyle(band).pointerEvents,
   left:Math.abs(r.left-a.left),right:Math.abs(r.right-b.right),
   height:Math.abs(r.height-a.height),
   overflow:document.documentElement.scrollWidth>innerWidth+1};
 });
 assert.equal(data.row,String(row));
 assert.equal(data.direction,direction);
 assert.equal(data.layers,1);
 assert.equal(data.gustLayers,0,"No separate white burst cloud should exist");
 assert.equal(data.info.length,3,"Three staggered, elongated moving streams should remain");
 assert.equal(data.layerPointer,"none");assert.equal(data.rowPointer,"none");
 assert(data.left<2&&data.right<2&&data.height<2,"Wind must fill exactly one seven-cell row");
 assert.equal(data.overflow,false);
 for(const line of data.info){
  if(reduced){assert.equal(line.display,"none");continue;}
  assert.equal(line.iteration,"infinite");
  assert.equal(line.name,"wind-stream-"+direction);
  assert(line.from?.includes(direction==="right"?"-105%":"105%"));
  assert(line.to?.includes(direction==="right"?"105%":"-105%"));
  assert(line.timing>=3000&&line.timing<=5000,"Wind should flow gently, continuously");
  assert(line.background.includes("radial-gradient"),"Soft, thin Mist-inspired gradients");
 }
 return data;
}
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto(url,{waitUntil:"networkidle2",timeout:40000});
 await page.evaluate(key=>{
  const state=JSON.parse(localStorage.getItem(key));
  state.unlocked=6;
  state.run={level:5,data:new HarmonyRules.Game(5,null,{seed:4848,directorMode:"v4"}).save()};
  state.reduceMotion=false;state.sound=false;
  localStorage.setItem(key,JSON.stringify(state));
 },KEY);
 await page.reload({waitUntil:"networkidle2"});
 const baseline=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 // The row is visibly windy before any move, and still windy afterward.
 await openPreview("breeze");
 const wind=await checkAmbient(3,"right");
 await page.evaluate(()=>{window.__windReference=document.querySelector(".wind-ambient-row");});
 await playMove();await settled(13);
 assert.equal(await page.evaluate(()=>window.__windReference===
  document.querySelector(".wind-ambient-row")),true,"Wind never restarts for ordinary turns");
 await checkAmbient(3,"right");
 const breezeNext=await page.evaluate(()=>{
  const game=new HarmonyRules.Game(2,null,{seed:13,directorMode:"v4",windGardenPreview:"breeze"});
  game.swap(17,24);return HarmonyRules.validSwaps(game.board)[0];
 });
 await playMove(...breezeNext);await settled(12);
 await checkAmbient(3,"right");
 // Calm shift, no bright cloud, full continuous wind retained.
 assert.equal(await page.$$eval(".wind-sweep-row",x=>x.length),0);
 // Garden Tide switches direction but reuses the existing flowing-air layer.
 await page.reload({waitUntil:"networkidle2"});
 await openPreview("tide");
 await checkAmbient(3,"left");
 await page.evaluate(()=>{window.__windReference=document.querySelector(".wind-ambient-row");});
 await playMove();await settled(17);
 assert.equal(await page.evaluate(()=>window.__windReference===
  document.querySelector(".wind-ambient-row")),true);
 await checkAmbient(3,"left","The first move is not an immediate gust");
 const tideNext=await page.evaluate(()=>{
  const game=new HarmonyRules.Game(2,null,{seed:13,directorMode:"v4",windGardenPreview:"tide"});
  game.swap(17,24);return HarmonyRules.validSwaps(game.board)[0];
 });
 await playMove(...tideNext);await settled(16);
 await checkAmbient(3,"right");
 // Crossing Winds: same row through a nonwind turn, then new row.
 await page.reload({waitUntil:"networkidle2"});
 await openPreview("crossing");
 await checkAmbient(2,"left");
 await page.evaluate(()=>{window.__windReference=document.querySelector(".wind-ambient-row");});
 await playMove();await settled(17);
 assert.equal(await page.evaluate(()=>window.__windReference===
  document.querySelector(".wind-ambient-row")),true);
 await checkAmbient(2,"left");
 const pair=await page.evaluate(()=>{
  const engine=new HarmonyRules.Game(2,null,{seed:13,directorMode:"v4",windGardenPreview:"crossing"});
  engine.swap(17,24);return HarmonyRules.validSwaps(engine.board)[0];
 });
 await playMove(...pair);await settled(16);
 assert.equal(await page.evaluate(()=>window.__windReference===
  document.querySelector(".wind-ambient-row")),true);
 await checkAmbient(2,"left"); // Still waiting for move three.
 const third=await page.evaluate(()=>{
  const engine=new HarmonyRules.Game(2,null,{seed:13,directorMode:"v4",windGardenPreview:"crossing"});
  engine.swap(17,24);engine.swap(...HarmonyRules.validSwaps(engine.board)[0]);
  return HarmonyRules.validSwaps(engine.board)[0];
 });
 await playMove(...third);await settled(15);
 assert.equal(await page.evaluate(()=>window.__windReference===
  document.querySelector(".wind-ambient-row")),true);
 await checkAmbient(4,"right");
 // OS or user setting: no continuous motion, but actual moves still work.
 await page.evaluate(key=>{
  const state=JSON.parse(localStorage.getItem(key));
  state.reduceMotion=true;localStorage.setItem(key,JSON.stringify(state));
 },KEY);
 await page.reload({waitUntil:"networkidle2"});
 await openPreview("breeze");
 await checkAmbient(3,"right",true);
 await playMove();await settled(13);
 const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 for(const field of ["unlocked","run","bestStars","bestScores","omamoriCards","economy"])
  assert.deepEqual(stored[field],baseline[field],"Wind visual changed actual save: "+field);
 assert.deepEqual(errors,[],"No browser script errors");
 console.log("PASS Wind Garden Animation 1.2: 3 thin continuous direction-locked wind streams, no white burst, row/direction following, reduced motion, unmodified player save");
}finally{await browser.close();}
