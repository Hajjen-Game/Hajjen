import assert from "node:assert/strict";
import fs from "node:fs";
import puppeteer from "puppeteer-core";

const chrome=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"].find(fs.existsSync);
if(!chrome)throw Error("Chromium required");
const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:[
 "--no-sandbox","--disable-setuid-sandbox","--enable-unsafe-swiftshader"
]});
const page=await browser.newPage(),errors=[];
page.on("pageerror",e=>errors.push(e.message));
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.emulateMediaFeatures([{name:"prefers-reduced-motion",value:"no-preference"}]);
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/?hanabiVfx=pixi",
  {waitUntil:"networkidle2",timeout:45000});
 assert.equal(await page.$eval("#hanabiVfxMode",e=>e.value),"pixi");
 const loaded=await page.evaluate(()=>window.HarmonyHanabiPixi.prepare());
 // External CDN or WebGL may be unavailable on a GitHub hosted runner.
 // The separate mandatory browser test strictly proves Classic fallback.
 if(!loaded){
  console.log("SKIP live Pixi GPU render: CDN unavailable; mandatory 390px fallback test covers unsupported devices");
 }else{
  // Use real Puzzle Architect level 5 for the actual 7x7 board geometry.
  await page.evaluate(()=>{
   const k="japanese-harmony-puzzle-v2",save=JSON.parse(localStorage.getItem(k));
   save.unlocked=4;save.run=null;save.tutorialHelpSeen={};
   delete save.journeyProgression;
   localStorage.setItem(k,JSON.stringify(save));
  });
  await page.reload({waitUntil:"networkidle2",timeout:45000});
  await page.click("#continueButton");
  await page.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:15000});
  await page.evaluate(()=>document.querySelector("#modalActions .jh-tutorial-ok")?.click());
  await page.waitForFunction(()=>document.querySelector("#modal").hidden,{timeout:5000});
  const result=await page.evaluate(async()=>{
   const view=window.HarmonyHanabiPixi;
   const path=[38,31,24,17,10,3],notes=[];
   const used=await view.play({
    at:45,path,spreadTargets:[{to:2},{to:9},{to:12}]
   },{
    rectFor:i=>document.querySelector('.tile[data-index="'+i+'"]').getBoundingClientRect(),
    onCharge:()=>notes.push("charge"),
    onLaunch:()=>notes.push("launch"),
    onBurst:()=>notes.push("burst"),
    onReveal:()=>notes.push("reveal")
   });
   return {used,stats:view.inspect(),notes,
    canvas:document.querySelector(".jh-hanabi-pixi-preview")?.getAttribute("aria-hidden"),
    hidden:document.querySelector(".jh-hanabi-pixi-preview")?.style.visibility,
    width:document.documentElement.scrollWidth,
    innerWidth:innerWidth,
    pixels:document.querySelectorAll("#board .tile").length};
  });
  if(!result.used){
   // A browser may import Pixi but still lack WebGL; this is a valid fallback.
   assert.equal(result.stats.failed,true);
   console.log("SKIP GPU renderer: WebGL not available; preview correctly yields to Classic");
  }else{
   assert.equal(result.stats.renderer,"pixi-webgl");
   assert(result.stats.frames>=12,"Pixi must render actual GPU animation frames");
   assert(result.stats.elapsedMs>=1800,"A full fireworks sequence must be rendered");
   assert.deepEqual(result.notes,["charge","launch","burst","reveal"]);
   assert.equal(result.canvas,"true");
   assert.equal(result.hidden,"hidden","GPU overlay must not obstruct the next turn");
   assert.equal(result.pixels,49);
   assert(result.width<=result.innerWidth+1);
   console.log("PASS real PixiJS 8 GPU render · "+result.stats.frames+" frames / "+
    result.stats.elapsedMs+"ms / "+result.stats.estimatedFps+" FPS");
  }
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
