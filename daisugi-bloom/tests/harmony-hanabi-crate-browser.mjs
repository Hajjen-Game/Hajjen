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
  s.unlocked=60;s.run=null;s.tutorialHelpSeen={};s.reduceMotion=false;s.sound=true;
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
  window.__hanabiAudioWitness=[];
  const originalAudio=window.HarmonyAudio;
  // Existing play() facade is frozen; replace the window binding, not the
  // immutable method, to observe the real player gesture/audio lifecycle.
  window.HarmonyAudio={...originalAudio,play(type,detail){
   if(type.startsWith("hanabi-"))window.__hanabiAudioWitness.push(type);
   return originalAudio.play(type,detail);
  }};
  window.__hanabiVisualWitness={
   events:[],marks:[],delays:[],glitter:0,colors:[],impacts:[],
   glitterSize:0,glitterDuration:0,spiralMarks:0,
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
     witness.delays.push(n.getAnimations()[0]?.effect?.getTiming()?.delay??-1);
     if(getComputedStyle(n,"::before").display!=="none")witness.spiralMarks++;
     witness.events.push("mark:"+cell);
    }
    if(classList.contains("hanabi-glitter-mote")){
     witness.glitter++;
     witness.glitterSize=Math.max(witness.glitterSize,
      parseFloat(getComputedStyle(n).width)||0);
     witness.glitterDuration=Math.max(witness.glitterDuration,
      n.getAnimations()[0]?.effect?.getTiming()?.duration||0);
     if(n.dataset.color&&!witness.colors.includes(n.dataset.color))
      witness.colors.push(n.dataset.color);
     if(witness.firstSparkAt<0){
      witness.firstSparkAt=witness.events.length;
      witness.markedBeforeGlitter=witness.marks.length>0;
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
  fx:window.__hanabiVisualWitness,
  audio:window.__hanabiAudioWitness
 }));
 assert.equal(after.cargo,1);assert.equal(after.crate,2);assert(after.noSpritesInCrates);
 assert.equal(after.saved.data.hanabiVersion,2);
 assert(after.saved.data.board[43].family==="hanabiCrate");
 assert.equal(after.saved.data.lotusDelivered,1);
 assert(after.saved.data.roundTrace.moves[0].events.some(e=>e.type==="hanabi-launch"));
 assert(after.width<=after.screen+1);
 assert(after.fx.marks.length>=1&&after.fx.marks.length<=6,
  "Only the actual visible column targets should be marked");
 assert(after.fx.marks.every(at=>at%7===1),
  "No unrelated columns may be highlighted by Hanabi");
 assert.deepEqual(after.fx.marks,
  after.fx.marks.slice().sort((a,b)=>b-a),
  "Tiles must charge from the crate upward, skipping true empty cells");
 assert(after.fx.delays.every((d,i)=>
   i===0?d===0:d-after.fx.delays[i-1]>=60),
  "Sequential marks should be staggered on the compositor, without serial JS waits");
 assert(after.fx.markedBeforeGlitter&&after.fx.firstSparkAt===after.fx.marks.length,
  "The FIRST glitter particle may not appear until ALL actual marks exist");
 assert.equal(after.fx.spiralMarks,0,
  "No heavy rotating perimeter animation may remain on charged tiles");
 assert(after.fx.glitter>=30,"Mobile must show a rich, Score Motes-style glitter tail");
 assert.deepEqual(after.fx.colors.sort(),["gold","orange","pearl","pink","violet"],
  "The festival glitter must have five distinct color groups");
 assert.deepEqual(after.fx.impacts,[],
  "Do not create separate circular impact rings in each tile");
 assert(after.fx.glitterSize>=9&&after.fx.glitterDuration>=675,
  "Score Motes-like glitter should be visibly larger and longer-lived");
 assert.equal(after.fx.oldBeam,false,"No old solid laser can appear");
 assert.deepEqual(after.audio,["hanabi-load","hanabi-charge","hanabi-launch"],
  "A delivered firework must sound intake, charging and launch in visual order");
 assert.deepEqual(errors,[]);
 console.log("PASS Hanabi Telegraph mobile: only true targets, smooth staggered tile glows, larger longer five-colour glitter, no circular hits or laser");
}finally{await browser.close();}
