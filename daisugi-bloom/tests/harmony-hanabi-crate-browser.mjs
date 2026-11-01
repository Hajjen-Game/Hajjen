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
 await page.emulateMediaFeatures([{name:"prefers-reduced-motion",value:"no-preference"}]);
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2"});
 await page.evaluate(()=>{
  const k="japanese-harmony-puzzle-v2",s=JSON.parse(localStorage.getItem(k));
  s.unlocked=60;s.run=null;s.tutorialHelpSeen={};s.reduceMotion=false;
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
  // Audit the actual visual DOM sequence, not hypothetical timing data.
  // Every telegraph mark must arrive before the first glitter particle.
  window.__hanabiVisualWitness={
   events:[],marks:[],glitter:0,colors:[],impacts:[],
   markedBeforeGlitter:false,oldBeam:false,firstSparkAt:-1
  };
  const watcher=new MutationObserver(records=>{
   const witness=window.__hanabiVisualWitness;
   for(const rec of records)for(const n of rec.addedNodes){
    if(n.nodeType!==1)continue;
    const classList=n.classList;if(!classList)continue;
    if(classList.contains("hanabi-telegraph-glow")){
     const cell=Number(n.dataset.to);
     witness.marks.push(cell);
     witness.events.push("mark:"+cell);
    }
    if(classList.contains("hanabi-glitter-mote")){
     witness.glitter++;
     if(n.dataset.color&&!witness.colors.includes(n.dataset.color))
      witness.colors.push(n.dataset.color);
     if(witness.firstSparkAt<0){
      witness.firstSparkAt=witness.events.length;
      witness.markedBeforeGlitter=witness.marks.length===6;
      witness.events.push("glitter");
     }
    }
    if(classList.contains("hanabi-glitter-impact")){
     witness.impacts.push(Number(n.dataset.to));
     witness.events.push("impact:"+n.dataset.to);
    }
    if(classList.contains("hanabi-launch-beam")||classList.contains("hanabi-launch-halo"))
     witness.oldBeam=true;
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
 assert.deepEqual(after.fx.marks,[36,29,22,15,8,1],
  "Harmony Pulse telegraph must mark every cell bottom-to-top in order");
 assert(after.fx.markedBeforeGlitter&&after.fx.firstSparkAt===6,
  "The FIRST glitter particle may not appear until ALL six marks exist");
 assert(after.fx.glitter>=30,"Mobile must show a rich, Score Motes-style glitter tail");
 assert.deepEqual(after.fx.colors.sort(),["gold","orange","pearl","pink","violet"],
  "The festival glitter must have five distinct color groups");
 assert.deepEqual(after.fx.impacts,[36,29,22,15,8,1],
  "Impact rings must stay inside the same column");
 assert.equal(after.fx.oldBeam,false,"No old solid laser can appear");
 assert.deepEqual(errors,[]);
 console.log("PASS Hanabi Telegraph mobile: six ordered Pulse marks BEFORE five-color glitter, six column-only impacts, no old beam");
}finally{await browser.close();}
