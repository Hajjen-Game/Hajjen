import fs from "node:fs";
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
const exe=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"]
 .find(p=>fs.existsSync(p));
if(!exe)throw Error("Chrome required");
const browser=await puppeteer.launch({executablePath:exe,headless:true,args:["--no-sandbox","--disable-setuid-sandbox"]});
const page=await browser.newPage(),errors=[];
page.on("pageerror",e=>errors.push(e.message));
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2"});
 await page.evaluate(()=>{
  const k="japanese-harmony-puzzle-v2",s=JSON.parse(localStorage.getItem(k));
  s.unlocked=60;s.run=null;s.tutorialHelpSeen={};s.reduceMotion=true;
  localStorage.setItem(k,JSON.stringify(s));
 });
 await page.reload({waitUntil:"networkidle2"});
 await page.click("#continueButton");
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:15000});
 await page.waitForFunction(()=>!document.querySelector("#modal").hidden,{timeout:10000});
 await page.click("#modalActions .jh-tutorial-ok");
 const first=await page.evaluate(()=>({
  name:document.querySelector("#levelTitle").textContent,
  goal:document.querySelector("#goalLabel").textContent,
  cargo:document.querySelectorAll(".hanabi-firework-art").length,
  crates:document.querySelectorAll(".hanabi-crate").length,
  body:document.body.classList.contains("hanabi-active"),
  scroll:document.documentElement.scrollWidth,screen:innerWidth
 }));
 assert.equal(first.name,"First Hanabi Crate");
 assert.equal(first.goal,"Deliver fireworks");
 assert.equal(first.cargo,2);assert.equal(first.crates,2);assert(first.body);
 assert(first.scroll<=first.screen+1);
 await page.evaluate(()=>{
  // Confirm the launch is a real on-screen beam even in reduced-motion mode.
  window.__hanabiVisualWitness={beamSeen:false,visible:false,height:0,impacts:0};
  const watcher=new MutationObserver(records=>{
   for(const rec of records)for(const n of rec.addedNodes){
    if(n.nodeType!==1)continue;
    const beam=n.classList?.contains("hanabi-launch-beam")?n:n.querySelector?.(".hanabi-launch-beam");
    if(beam){
     window.__hanabiVisualWitness.beamSeen=true;
     window.__hanabiVisualWitness.height=Math.max(window.__hanabiVisualWitness.height,beam.getBoundingClientRect().height);
     requestAnimationFrame(()=>{
      window.__hanabiVisualWitness.visible ||= parseFloat(getComputedStyle(beam).opacity)>.5;
     });
    }
    const impact=n.classList?.contains("hanabi-launch-impact")?n:n.querySelector?.(".hanabi-launch-impact");
    if(impact)window.__hanabiVisualWitness.impacts++;
   }
  });
  watcher.observe(document.body,{childList:true,subtree:true});
  window.__hanabiObserver=watcher;
  document.querySelector('.tile[data-index="37"]').click();
  document.querySelector('.tile[data-index="44"]').click();
 });
 await page.waitForFunction(()=>document.querySelector("#goalProgress").textContent==="1 / 2"&&
  document.querySelector("#board").getAttribute("aria-busy")==="false",{timeout:40000});
 const after=await page.evaluate(()=>({
  cargo:document.querySelectorAll(".hanabi-firework-art").length,
  crate:document.querySelectorAll(".hanabi-crate").length,
  noSpritesInCrates:[43,47].every(at=>!document.querySelector('.tile[data-index="'+at+'"] .piece')),
  saved:JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")).run,
  width:document.documentElement.scrollWidth,screen:innerWidth,
  fx:window.__hanabiVisualWitness
 }));
 assert.equal(after.cargo,1);assert.equal(after.crate,2);assert(after.noSpritesInCrates);
 assert.equal(after.saved.data.hanabiVersion,2);
 assert(after.saved.data.board[43].family==="hanabiCrate");
 assert.equal(after.saved.data.lotusDelivered,1);
 assert(after.saved.data.roundTrace.moves[0].events.some(e=>e.type==="hanabi-launch"));
 assert(after.width<=after.screen+1);
 assert(after.fx.beamSeen&&after.fx.visible&&after.fx.height>300,
  "Entire board must show an unmistakable gold vertical launch");
 assert(after.fx.impacts>=7,"Every cell in the launch column gets a ring impact");
 assert.deepEqual(errors,[]);
 console.log("PASS Hanabi Crate mobile: two boxes, two rockets, 1 authentic delivery and vertical pulse");
}finally{await browser.close();}
