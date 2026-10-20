import fs from "node:fs";
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
const browserPaths=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"];
const executablePath=browserPaths.find(p=>fs.existsSync(p));
if(!executablePath)throw new Error("Chrome/Chromium missing");
const browser=await puppeteer.launch({executablePath,headless:true,args:["--no-sandbox","--disable-setuid-sandbox","--enable-webgl","--use-gl=angle","--use-angle=swiftshader"]});
const page=await browser.newPage();
const errors=[];
page.on("pageerror",e=>errors.push(e.message));
page.on("console",msg=>{if(msg.type()==="error")errors.push(msg.text());});
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true});
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2",timeout:40000});
 await page.waitForFunction(()=>window.BABYLON&&window.DaisugiRules&&window.DaisugiVisuals,{timeout:20000});
 await page.waitForSelector(".level-tile");
 assert.equal(await page.$$eval(".level-tile",xs=>xs.length),5);
 await page.click("#continueButton");
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:10000});
 await new Promise(resolve=>setTimeout(resolve,1200));
 const state=await page.evaluate(()=>({
  error:document.querySelector("#loadError").hidden,
  title:document.querySelector("#levelTitle").textContent,
  canvas:document.querySelector("#boardCanvas").getBoundingClientRect().width,
  engineCount:window.BABYLON.EngineStore.Instances.length,
  levelCount:window.DaisugiRules.levels.length,
  ruleCheck:(()=>{const g=new window.DaisugiRules.Game(3);return !g.complete&&g.board.every(p=>p.stage<=3)&&g.config.goal.trees>=4;})(),
  scoreHud:document.querySelector("#scoreCount").textContent.trim()==="0",
  scoreBoard:document.querySelector(".score-ribbon").getBoundingClientRect().height>40,
  celebration:!!document.querySelector("#treeCelebration"),
  version:document.querySelector(".hero-copy .eyebrow").textContent,
  bodyStyle:getComputedStyle(document.body).backgroundImage,
  resultScore:!!document.querySelector("#resultScore"),
  engineRules:(()=>{const g=new window.DaisugiRules.Game(0);return g.score===0&&g.save().score===0;})()
 }));
 assert(state.error,"fatal error dialog shown");
 assert.equal(state.title,"First Petals");
 assert(state.canvas>250,"Canvas too small");
 assert(state.engineCount>=1,"Babylon engine missing");
 assert(state.ruleCheck,"Rebalanced puzzle layout failed in browser");
 assert(state.scoreHud&&state.scoreBoard&&state.celebration&&state.resultScore&&state.engineRules,"Score/celebration HUD failed");
 assert(state.version.includes("1.2"),"Old version label still visible");
 assert(state.bodyStyle.includes("gradient"),"Japanese visual theme not applied");
 fs.mkdirSync("/tmp/daisugi-bloom",{recursive:true});
 await page.screenshot({path:"/tmp/daisugi-bloom/first-playable-mobile.png",fullPage:true});
 assert.equal(errors.filter(e=>!/favicon|AudioContext|WebGL|GPU|CDN/.test(e)).length,0,"Unexpected page errors: "+errors.join("; "));
 console.log("PASS Daisugi Bloom mobile smoke",state);
}finally{await browser.close();}
