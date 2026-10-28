import assert from "node:assert/strict";
import fs from "node:fs";
import puppeteer from "puppeteer-core";
const exe=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"].find(p=>fs.existsSync(p));
if(!exe)throw new Error("Chrome missing");
const browser=await puppeteer.launch({executablePath:exe,headless:true,args:["--no-sandbox","--disable-setuid-sandbox"]});
const context=await browser.createBrowserContext();
const page=await context.newPage(),errors=[];
page.on("pageerror",e=>errors.push(e.message));
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2"});
 await page.waitForFunction(()=>!!window.HarmonyEconomy&&!!window.HarmonyGoshuincho);
 assert.equal(await page.$eval("#harmonyCoins",e=>e.textContent),"0 mynt");
 await page.click("#omamoriButton");
 assert.equal(await page.$eval("#modalTitle",e=>e.textContent),"Omamori");
 assert.equal(await page.$$eval(".omamori-card",xs=>xs.length),6);
 assert.equal(await page.$$eval(".omamori-action:disabled",xs=>xs.length),6);
 await page.click('.omamori-tab:nth-child(2)');
 assert((await page.$eval(".omamori-empty",e=>e.textContent)).includes("inga aktiva"));
 await page.click(".omamori-close");
 const untouched=await page.evaluate(()=>{
  const s=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2"));
  return {unlocked:s.unlocked,stars:s.bestStars,first:s.fourFamilyStars};
 });
 assert.equal(untouched.unlocked,0,"Browsing shop cannot unlock stages");
 // Simulate existing completed profile. Remove just economy to run historic
 // one-time credit; the same archive fields must remain untouched.
 await page.evaluate(()=>{
  const key="japanese-harmony-puzzle-v2";
  const save=JSON.parse(localStorage.getItem(key));
  save.unlocked=18;
  save.fourFamilyStars={0:1,1:2,2:3,3:2,4:1,5:3,6:1,7:2,8:2,9:1};
  save.bestStars={10:3,11:2,12:3,13:1,14:2,15:3,16:2,17:1};
  save.fourFamilyScores={};save.bestScores={};delete save.economy;
  localStorage.setItem(key,JSON.stringify(save));
 });
 await page.reload({waitUntil:"networkidle2"});
 const original=await page.evaluate(()=>{
  const data=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2"));
  return {coins:data.economy.coins,stars:JSON.stringify(data.bestStars),first:JSON.stringify(data.fourFamilyStars)};
 });
 assert(original.coins>300,"Historic progress should grant real one-time credit");
 assert((await page.$eval("#harmonyCoins",el=>el.textContent)).includes(String(original.coins)));
 await page.click("#omamoriButton");
 await page.click('.omamori-card[data-omamori-id="sakura"] .omamori-action');
 const after=await page.evaluate(()=>{
  const e=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")).economy;
  return {coins:e.coins,owned:e.owned,equipped:e.equipped};
 });
 assert.equal(after.coins,original.coins-80);
 assert.deepEqual(after.owned,["sakura"]);
 await page.click('.omamori-card[data-omamori-id="sakura"] .omamori-action');
 const equipped=await page.evaluate(()=>JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2")).economy.equipped);
 assert.equal(equipped,"sakura");
 assert.equal(await page.$$eval('.omamori-card[data-omamori-id="sakura"] .omamori-bond-detail',
  nodes=>nodes.length),1,"Owned Sakura must have a Bond panel");
 assert((await page.$eval('.omamori-card[data-omamori-id="sakura"] .omamori-bond-title',
  e=>e.textContent)).includes("Stadium 1/3"));
 await page.click('.omamori-tab:nth-child(2)');
 assert.equal(await page.$$eval(".omamori-card",xs=>xs.length),1);
 assert.equal(await page.$eval('.omamori-card[data-omamori-id="sakura"] .omamori-action',e=>e.textContent),"Ta av");
 const metrics=await page.evaluate(()=>{
  const dialog=document.querySelector(".modal-inner").getBoundingClientRect();
  const cards=[...document.querySelectorAll(".omamori-card")].map(x=>x.getBoundingClientRect());
  return {w:innerWidth,scroll:document.documentElement.scrollWidth,dialog:dialog.width,
    good:cards.every(c=>c.width<=dialog.width)};
 });
 assert(metrics.scroll<=metrics.w&&metrics.dialog<=metrics.w&&metrics.good,"No horizontal overflow on 390px");
 await page.click(".omamori-close");
 await page.reload({waitUntil:"networkidle2"});
 const reloaded=await page.evaluate(()=>{
  const s=JSON.parse(localStorage.getItem("japanese-harmony-puzzle-v2"));
  return {e:s.economy,best:JSON.stringify(s.bestStars),first:JSON.stringify(s.fourFamilyStars)};
 });
 assert.equal(reloaded.e.coins,after.coins,"Currency must not regenerate after a reload");
 assert.deepEqual(reloaded.e.owned,["sakura"]);
 assert.equal(reloaded.e.equipped,"sakura");
 assert.equal(reloaded.best,original.stars,"Shop must preserve original late-stage star record");
 assert.equal(reloaded.first,original.first,"Shop must preserve original early-stage star record");
 await page.setViewport({width:320,height:640,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.click("#omamoriButton");
 const small=await page.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth,
  modal:document.querySelector(".modal-inner").getBoundingClientRect().width}));
 assert(small.scroll<=small.w&&small.modal<=small.w,"320px Omamori must fit");
 fs.mkdirSync("/tmp/daisugi-bloom",{recursive:true});
 await page.screenshot({path:"/tmp/daisugi-bloom/omamori-shop-320.png"});
 await page.click(".omamori-close");
 await page.click("#continueButton");await page.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:6000});
 const equippedChip=await page.$eval("#spiritBadge",e=>({
  hidden:e.hidden,text:e.textContent,width:e.getBoundingClientRect().width
 }));
 assert.equal(equippedChip.hidden,false);
 assert(equippedChip.text.includes("Sakuras välsignelse"));
 assert(equippedChip.width<320,"The companion should not widen the mobile board");
 await page.evaluate(()=>{
  const key="japanese-harmony-puzzle-v2",state=JSON.parse(localStorage.getItem(key));
  window.HarmonyCards.observe(state,5,[{type:"collection",awards:[{family:"sakura",at:12}]}]);
  localStorage.setItem(key,JSON.stringify(state));
 });
 await page.reload({waitUntil:"networkidle2"});
 await page.click("#omamoriButton");
 assert((await page.$eval('.omamori-card[data-omamori-id="sakura"] .omamori-bond-title',
  el=>el.textContent)).includes("Stadium 1/3"));
 assert.equal(await page.$eval('.omamori-card[data-omamori-id="sakura"] .omamori-bond-track',e=>e.getAttribute("aria-valuenow")),"1");
 assert.deepEqual(errors,[],"No browser JS errors");
 console.log("PASS Omamori 1.0 mobile, migration, persistence, buying and equipping");
}finally{await context.close();await browser.close();}
