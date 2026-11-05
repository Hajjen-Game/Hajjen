import assert from "node:assert/strict";
import fs from "node:fs";
import puppeteer from "puppeteer-core";

const executablePath=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"]
 .find(fs.existsSync);
if(!executablePath)throw Error("Chromium is required for onboarding QA");
const browser=await puppeteer.launch({headless:true,executablePath,
 args:["--no-sandbox","--disable-setuid-sandbox"]});
const page=await browser.newPage(),errors=[],KEY="japanese-harmony-puzzle-v2";
page.on("pageerror",error=>errors.push(error.message));
const guideInfo=()=>page.evaluate(key=>{
 const modal=document.querySelector("#modal"),body=document.querySelector(".jh-tutorial");
 const save=JSON.parse(localStorage.getItem(key));
 return {visible:!modal.hidden,key:body?.dataset.lesson,
  drawings:body?.querySelectorAll("svg").length||0,
  cards:body?.querySelectorAll(".jh-tutorial-example").length||0,
  title:document.querySelector("#modalTitle")?.textContent,
  flag:save.tutorialHelpSeen||{},extra:document.querySelectorAll(".jh-tutorial-topic").length,
  width:document.documentElement.scrollWidth,screen:innerWidth};
},KEY);
async function loadOfficial(index){
 await page.evaluate(({key,index})=>{
  const data=JSON.parse(localStorage.getItem(key));data.unlocked=index;data.run=null;delete data.journeyProgression;
  localStorage.setItem(key,JSON.stringify(data));
 },{key:KEY,index});
 await page.reload({waitUntil:"networkidle2"});
 await page.click("#continueButton");
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:12000});
}
async function accept(key){
 const before=await guideInfo();
 assert.equal(before.visible,true);
 assert.equal(before.key,key);
 assert(before.drawings>=1,"Every new mechanic has an illustration: "+key);
 assert.equal(before.flag[key],undefined,"Opening a guide must not acknowledge it");
 assert(before.width<=before.screen+1,"No horizontal clipping");
 await page.click("#modalActions .jh-tutorial-ok");
 assert.equal(await page.$eval("#modal",el=>el.hidden),true,
  "After OK there must not be a second stacked popup");
 const after=await guideInfo();
 assert.equal(after.flag[key],true,"Official OK must persist: "+key);
}
async function leavePreview(){
 await page.click("#pauseButton");
 await page.waitForFunction(()=>document.querySelector("#modalTitle")?.textContent==="Game Menu");
 await page.click("#modalActions .pause-main");
 await page.waitForFunction(()=>!document.querySelector("#menuView").hidden);
}
async function openPreview(index,first=false){
 if(!first)await leavePreview();
 await page.$eval("#menuAdvanced",n=>n.open=true);
 await page.$eval("#devPreviews",e=>e.open=true);
 await page.click("#journeyChapterPlaytestButton");
 await page.waitForFunction(()=>document.querySelector("#modalTitle")?.textContent==="Journey 2.0 · Levels 21–30");
 if(index>=30){
  await page.click(".journey-chapter-tab:nth-child(4)");
  await page.waitForFunction(()=>document.querySelector("#modalTitle")?.textContent==="Journey 2.0 · Levels 31–40");
 }
 await page.click('.journey-draft-grid button[data-level="'+(index+1)+'"]');
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden);
}
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",
  {waitUntil:"networkidle2",timeout:40000});
 await page.waitForFunction(()=>!!window.HarmonyTutorialHelp&&!!window.HarmonyOnboarding);
 await page.click("#continueButton");
 await page.waitForFunction(()=>!document.querySelector("#modal").hidden&&
  !!document.querySelector(".jh-tutorial"),{timeout:12000});
 await accept("match");
 for(const [index,key] of [[1,"stages"],[2,"pulse"],[3,"mist"],[4,"lotus-intro"]]){
  await loadOfficial(index);
  await accept(key);
 }
 // Legacy level-6 used to incorrectly show Four-of-a-kind despite Hanabi.
 await loadOfficial(5);
 assert.equal((await guideInfo()).visible,false,
  "Level 6 should not show the legacy Four-of-a-kind lesson");
 await page.click("#goalHelpButton");
 assert.equal((await guideInfo()).key,"lotus-intro",
  "Goal ? must explain current Hanabi, not the legacy level-6 Four lesson");
 await page.click("#modalActions .jh-tutorial-ok");
 for(const [index,key] of [[9,"koi-finale"],[10,"wind"],[11,"four"],
  [13,"daruma"],[17,"stone"]]){
  await loadOfficial(index);
  await accept(key);
  if(index===10){
   const flags=(await guideInfo()).flag;
   assert.equal(flags.families,undefined,
    "Level 11 must not show a second overlapping fifth-family guide");
  }
 }
 // A read introduction stays read across reload and resuming the level.
 await page.reload({waitUntil:"networkidle2"});
 await page.click("#continueButton");
 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden);
 assert.equal((await guideInfo()).visible,false,"Previously acknowledged Stone must stay read");
 await page.click("#goalHelpButton");
 assert.equal((await guideInfo()).key,"stone");
 await page.click("#modalActions .jh-tutorial-ok");
 const ordinaryBefore=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 // Previews use per-session acknowledgement, not the normal saved tutorial flags.
 await page.reload({waitUntil:"networkidle2"});
 await openPreview(20,true);
 assert.equal((await guideInfo()).key,"daruma");
 await page.click("#modalActions .jh-tutorial-ok");
 assert.equal((await guideInfo()).flag.daruma,true,"Existing official Daruma flag unchanged");
 await openPreview(21);
 assert.equal((await guideInfo()).key,"lotus-intro","A mixed level teaches the still-unseen Hanabi mechanic");
 await page.click("#modalActions .jh-tutorial-ok");
 await page.click("#goalHelpButton");
 assert.equal((await guideInfo()).key,"daruma","? prioritizes the primary objective");
 assert((await guideInfo()).extra>=2,"? should allow switching between mixed mechanics");
 await page.$$eval(".jh-tutorial-topic",buttons=>{
  const choice=buttons.find(b=>b.textContent.includes("Hanabi"));
  if(!choice)throw Error("No Hanabi topic found in level 22");
  choice.click();
 });
 assert.equal((await guideInfo()).key,"lotus-intro");
 await page.click("#modalActions .jh-tutorial-ok");
 await openPreview(22);
 assert.equal((await guideInfo()).key,"wind");
 await page.click("#modalActions .jh-tutorial-ok");
 await openPreview(23);
 assert.equal((await guideInfo()).key,"stone");
 await page.click("#modalActions .jh-tutorial-ok");
 await openPreview(26);
 assert.equal((await guideInfo()).visible,false,
  "Already acknowledged Hanabi should not block another preview");
 const ordinaryAfter=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 assert.deepEqual(ordinaryAfter,ordinaryBefore,
  "Preview tutorials must never modify a saved run, archive or tutorial flag");
 assert.deepEqual(errors,[],"No JavaScript errors in first-time onboarding");
 console.log("PASS Onboarding Polish 2.0: Journey 1–18, illustrated lessons, OK persistence, no duplicate level 11, mixed-goal help and saved-safe previews");
}finally{await browser.close();}
