import assert from "node:assert/strict";
import fs from "node:fs";
import puppeteer from "puppeteer-core";

const exe=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"].find(p=>fs.existsSync(p));
if(!exe)throw Error("Chrome not found");
const browser=await puppeteer.launch({headless:true,executablePath:exe,args:["--no-sandbox","--disable-setuid-sandbox"]});
const context=await browser.createBrowserContext();
const page=await context.newPage(),errors=[];
page.on("pageerror",e=>errors.push(e.message));
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2",timeout:40000});
 await page.waitForFunction(()=>!!window.HarmonyRules&&!!window.HarmonyRules.neighbors8);
 const prepare=async(level,hp)=>{
  await page.evaluate(({level,hp})=>{
   const key="japanese-harmony-puzzle-v2";
   const save=JSON.parse(localStorage.getItem(key));
   const g=new HarmonyRules.Game(level,null,{seed:20261025});
   if(hp!=null){
    const at=HarmonyRules.sealedPositions(level)[0];
    g.sealed[at]=hp;
   }
   save.unlocked=level;
   save.run={level,data:g.save()};
   localStorage.setItem(key,JSON.stringify(save));
  },{level,hp});
  await page.reload({waitUntil:"networkidle2"});
  await page.click("#continueButton");await page.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:6000});
  await page.evaluate(()=>document.querySelector("#modalActions .jh-tutorial-ok")?.click());
  await page.waitForSelector(".tile.sealed-stone-tile .sealed-stone-art");
 };
 for(const [hp,stage] of [[4,0],[3,1],[2,2],[1,3]]){
  await prepare(30,hp);
  const data=await page.evaluate(()=>{
   const at=document.querySelector(".tile.sealed-stone-tile");
   const art=at.querySelector(".sealed-stone-art");
   const rect=art.getBoundingClientRect(),tile=at.getBoundingClientRect();
   return {count:document.querySelectorAll(".tile.sealed-stone-tile").length,
    className:art.className,aria:at.getAttribute("aria-label"),
    background:getComputedStyle(art).backgroundImage,
    artWidth:rect.width,tileWidth:tile.width,screen:innerWidth,
    scroll:document.documentElement.scrollWidth};
  });
  assert.equal(data.count,1);
  assert(data.className.includes("state-"+stage));
  assert(data.aria.includes(hp+" hits left"));
  assert(data.background.includes("sealed-stone-"+stage+".webp"));
  assert(data.artWidth<=data.tileWidth&&data.artWidth>20);
  assert(data.scroll<=data.screen+1,"No horizontal mobile overflow");
  const check=await page.evaluate(async stage=>{
   const r=await fetch("./assets/sealed-stone-"+stage+".webp?v=6.39.0");
   const b=await r.arrayBuffer();return {ok:r.ok,size:b.byteLength};
  },stage);
  assert(check.ok&&check.size>40000,"Transparent approved high-res art must load");
  if(stage===3){
   fs.mkdirSync("/tmp/daisugi-bloom",{recursive:true});
   await page.screenshot({path:"/tmp/daisugi-bloom/sealed-stone-critical-390.png"});
  }
 }
 await prepare(33,4);
 assert.equal(await page.$$eval(".tile.sealed-stone-tile",nodes=>nodes.length),2);
 await prepare(39,4);
 assert.equal(await page.$$eval(".tile.sealed-stone-tile",nodes=>nodes.length),3);
 await page.setViewport({width:320,height:640,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const mobile=await page.evaluate(()=>({screen:innerWidth,scroll:document.documentElement.scrollWidth,
  art:document.querySelector(".sealed-stone-art").getBoundingClientRect().width}));
 assert(mobile.scroll<=mobile.screen+1&&mobile.art>20);
 fs.mkdirSync("/tmp/daisugi-bloom",{recursive:true});
 await page.screenshot({path:"/tmp/daisugi-bloom/sealed-stones-320.png"});
 assert.deepEqual(errors,[],"No client errors while loading four art stages");
 console.log("PASS Sealed Stone mobile render, 4 original artwork stages, 1/2/3-stone stages, and 320px layout");
}finally{await context.close();await browser.close();}
