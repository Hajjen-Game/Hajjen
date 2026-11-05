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
 // The public Journey stops at level 40. Exercise the original level-61
 // Hanabi pilot through its explicit, unranked Game Dev preview instead.
 const baseline=await page.evaluate(()=>JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")));
 await page.$eval("#menuAdvanced",e=>e.open=true);
 await page.$eval("#devPreviews",e=>e.open=true);
 await page.click("#lotusPreviewButton");
 await page.waitForSelector('.lotus-preview-choice[data-preview="pilot"]');
 await page.click('.lotus-preview-choice[data-preview="pilot"]');
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:15000});
 assert.equal(await page.$eval("#modal",e=>e.hidden),true);
 const first=await page.evaluate(()=>({
  name:document.querySelector("#levelTitle").textContent,
  goal:document.querySelector("#goalLabel").textContent,
  cargo:document.querySelectorAll(".hanabi-firework-art").length,
  crates:document.querySelectorAll(".hanabi-crate").length,
  rocketImage:getComputedStyle(document.querySelector(".hanabi-firework-art")).backgroundImage,
  crateImage:getComputedStyle(document.querySelector(".hanabi-crate")).backgroundImage,
  oldRocketHidden:[...document.querySelector(".hanabi-firework-art").children]
   .every(node=>getComputedStyle(node).display==="none"),
  oldCrateHidden:[...document.querySelector(".hanabi-crate").children]
   .every(node=>getComputedStyle(node).display==="none"),
  body:document.body.classList.contains("hanabi-active"),
  scroll:document.documentElement.scrollWidth,screen:innerWidth
 }));
 assert.equal(first.name,"First Hanabi Crate");
 assert.equal(first.goal,"Deliver fireworks");
 assert.equal(first.cargo,2);assert.equal(first.crates,2);assert(first.body);
 assert(first.rocketImage.includes("hanabi-firework-rocket-256.webp")&&
  first.crateImage.includes("hanabi-firework-crate-256.webp"),
  "Hanabi must render both approved watercolor artworks");
 assert(first.oldRocketHidden&&first.oldCrateHidden,
  "The previous CSS-drawn rocket and box must not overlay the new artwork");
 const imageSizes=await page.evaluate(async()=>{
  return Promise.all([
   "./assets/gameplay-washi/hanabi-firework-rocket-256.webp",
   "./assets/gameplay-washi/hanabi-firework-crate-256.webp"
  ].map(url=>new Promise(resolve=>{
   const image=new Image();
   image.onload=()=>resolve([image.naturalWidth,image.naturalHeight]);
   image.onerror=()=>resolve(null);
   image.src=url;
  })));
 });
 assert.deepEqual(imageSizes,[[256,256],[256,256]],
  "Both transparent game sprites must load at exactly 256x256");
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
  // Regression: a loaded rocket must not reappear in the old square while
  // its receiving box glows. Check every animation frame of the intake cue.
  window.__hanabiReturnWitness={glowFrames:0,returned:[]};
  const watchLoad=()=>{
   for(const box of document.querySelectorAll(".hanabi-crate")){
    const loading=box.getAnimations().some(animation=>
     animation.playState==="running"&&
     animation.effect?.getKeyframes().some(frame=>
      String(frame.filter||"").includes("brightness(1.9)")));
    if(!loading)continue;
    const at=Number(box.parentElement?.dataset.index);
    const above=at-7;
    window.__hanabiReturnWitness.glowFrames++;
    if(above>=0&&document.querySelector('.tile[data-index="'+above+'"] .hanabi-firework-art'))
     window.__hanabiReturnWitness.returned.push(above);
   }
   if(document.querySelector("#board")?.getAttribute("aria-busy")==="true")
    requestAnimationFrame(watchLoad);
  };
  requestAnimationFrame(watchLoad);
  document.querySelector('.tile[data-index="37"]').click();
  document.querySelector('.tile[data-index="44"]').click();
 });
 await page.waitForFunction(()=>document.querySelector("#goalProgress").textContent==="1 / 2"&&
  document.querySelector("#board").getAttribute("aria-busy")==="false",{timeout:40000});
 const after=await page.evaluate(()=>({
  cargo:document.querySelectorAll(".hanabi-firework-art").length,
  crate:document.querySelectorAll(".hanabi-crate").length,
  noSpritesInCrates:[43,47].every(at=>!document.querySelector('.tile[data-index="'+at+'"] .piece')),
  persisted:JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")),
  proof:(()=>{
   const g=new HarmonyRules.Game(60,null,{seed:20261101,directorMode:"v63",
    lotusPreview:"pilot",recordRound:true});
   const moved=g.swap(37,44);
   return {ok:moved.ok,hanabiVersion:g.hanabiVersion,
    crate:g.board[43]?.family,delivered:g.lotusDelivered,
    launch:g.roundTrace?.moves?.[0]?.events?.some(e=>e.type==="hanabi-launch")};
  })(),
  width:document.documentElement.scrollWidth,screen:innerWidth,
  fx:window.__hanabiVisualWitness,
  rocketReturn:window.__hanabiReturnWitness,
  audio:window.__hanabiAudioWitness
 }));
 assert.equal(after.cargo,1);assert.equal(after.crate,2);assert(after.noSpritesInCrates);
 assert(after.rocketReturn.glowFrames>0,
  "A delivered rocket must trigger the receiving box glow");
 assert.deepEqual(after.rocketReturn.returned,[],
  "A delivered rocket must never pop back above its crate during the intake glow");
 assert.equal(after.proof.ok,true,"Pilot must permit the genuine delivery swap");
 assert.equal(after.proof.hanabiVersion,2);
 assert.equal(after.proof.crate,"hanabiCrate");
 assert.equal(after.proof.delivered,1);
 assert.equal(after.proof.launch,true,"Genuine engine trace must include Hanabi launch");
 for(const field of ["unlocked","run","journeyProgression","bestStars","economy","omamoriCards"])
  assert.deepEqual(after.persisted[field],baseline[field],
   "Unranked Hanabi pilot must not modify saved "+field);
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
