import fs from "node:fs";
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
// Real mobile browser smoke: the opt-in preview uses production animations,
// but may not alter the player's actual save, inventory or level unlocks.
const exe=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"].find(x=>fs.existsSync(x));
if(!exe)throw Error("Chromium missing");
const browser=await puppeteer.launch({executablePath:exe,headless:true,args:["--no-sandbox","--disable-setuid-sandbox"]});
const page=await browser.newPage(),errors=[];
const KEY="japanese-harmony-puzzle-v2";
page.on("pageerror",e=>errors.push(e.message));
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2",timeout:40000});
 await page.evaluate(key=>{
  const data=JSON.parse(localStorage.getItem(key));
  const previous=new window.HarmonyRules.Game(5,null,{seed:8819,directorMode:"v4"});
  data.unlocked=5;data.run={level:5,data:previous.save()};
  data.reduceMotion=true;data.tutorialHelpSeen={};
  localStorage.setItem(key,JSON.stringify(data));
 },KEY);
 await page.reload({waitUntil:"networkidle2"});
 const baseline=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 assert(baseline.run?.data?.board?.length===49,"Existing saved run must be present before preview");
 await page.$eval("#menuAdvanced",node=>node.open=true);
 await page.click("#moonMirrorPreviewButton");
 await page.waitForFunction(()=>document.querySelector("#modalTitle")?.textContent==="Moon Mirrors 1.2");
 const choices=await page.$eval(".moon-preview-choice",buttons=>buttons.map(b=>b.dataset.preview));
 assert.deepEqual(choices,["echo","obstacle","spark","first","mist","chain"]);
 await page.click('.moon-preview-choice[data-preview="spark"]');
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:10000});
 const start=await page.evaluate(()=>({
  heading:document.querySelector("#levelTitle").textContent,
  mirrored:[...document.querySelectorAll(".moon-mirror-tile")].map(n=>({
   at:Number(n.dataset.index),direction:n.querySelector(".moon-mirror-arrow")?.textContent,
   accessible:n.getAttribute("aria-label"),
   hasStandaloneGlass:!!n.querySelector(".moon-mirror-glass"),
   hasFamilySprite:!!n.querySelector(".piece, .sprite")
  })),
  cardsHidden:getComputedStyle(document.querySelector("#omamoriPowerBar")).display==="none",
  scrollWidth:document.documentElement.scrollWidth,screenWidth:innerWidth
 }));
 assert.equal(start.heading,"Moonlit Chain");
 assert.deepEqual(start.mirrored.map(x=>[x.at,x.direction]),[[25,"→"],[33,"↓"]]);
 assert(start.mirrored.every(x=>x.accessible.includes("Moon Mirror, fixed, reflects Harmony Pulse")));
 assert(start.mirrored.every(x=>x.hasStandaloneGlass&&!x.hasFamilySprite),
  "A mirror must be a standalone fixture with no family object or sprite underneath");
 assert(start.cardsHidden,"Preview must hide real Omamori cards");
 assert(start.scrollWidth<=start.screenWidth+1,"Mirror markers must fit mobile width");
 await page.evaluate(()=>{
  document.querySelector('.tile[data-index="17"]').click();
  document.querySelector('.tile[data-index="24"]').click();
 });
 await page.waitForFunction(()=>document.querySelector("#modalTitle")?.textContent==="Reflection complete!"&&
  !document.querySelector("#modal").hidden,{timeout:35000});
 assert.equal(await page.$eval(".jh-round-export",x=>x.textContent.includes("Export round")),true);
 // Return to the preview picker after a real chain and check that a
 // smaller normal Fusion Echo and the obstacle demo also finish on mobile.
 for(const scenario of ["echo","obstacle"]){
  await page.evaluate(()=>{
   [...document.querySelectorAll("#modalActions button")]
    .find(button=>button.textContent.includes("Choose another preview")).click();
  });
  await page.waitForFunction(()=>document.querySelector("#modalTitle")?.textContent==="Moon Mirrors 1.2");
  await page.click('.moon-preview-choice[data-preview="'+scenario+'"]');
  await page.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:10000});
  await page.evaluate(()=>{
   document.querySelector('.tile[data-index="17"]').click();
   document.querySelector('.tile[data-index="24"]').click();
  });
  await page.waitForFunction(()=>document.querySelector("#modalTitle")?.textContent==="Reflection complete!"&&
   !document.querySelector("#modal").hidden,{timeout:35000});
 }
 const after=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 for(const field of ["unlocked","bestStars","bestScores","fourFamilyStars","run","economy","omamoriCards","playerInsight","playerIntent"])
  assert.deepEqual(after[field],baseline[field],"Moon Mirror preview must preserve "+field);
 assert.deepEqual(errors,[],"No mobile JavaScript errors");
 console.log("PASS Moon Mirrors 1.2: six preview choices, three real browser wins, standalone mirror art and unchanged save");
}finally{await browser.close();}
