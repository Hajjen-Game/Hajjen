// SKYSHIFT 0.21.2.3: real Chrome/WebGL proof of neutral WHITE hotspot
// containment at user-observed angles, with unchanged 9-color zone wave.
import {spawn} from "node:child_process";
import {existsSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chrome missing");
const server=spawn("python3",["-m","http.server","8803","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
try{
 await sleep(1100);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 const errors=[];
 async function load(extra="",memory=8){
  const page=await browser.newPage({viewport:{width:1536,height:691}});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",m=>{
   if(m.type()==="error"&&/WebGLProgram|Shader Error|INVALID_OPERATION/i.test(m.text()))
    errors.push(m.text().slice(0,450));
  });
  await page.addInitScript(v=>Object.defineProperty(navigator,"deviceMemory",
   {get:()=>v,configurable:true}),memory);
  await page.goto("http://127.0.0.1:8803/skyshift/?v=0.21.2.5"+
   "&artSmoke=1&whiteCoreSmoke=1&trackRepairSmoke=1&waveSmoke=1&railBody=classic&shipWhite=classic&"+extra,
   {waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:75000});
  await page.waitForFunction(()=>["active","fallback","fallback-materials"].includes(
   window.__skyshiftArtProbe?.()?.status),null,{timeout:75000});
  const art=await page.evaluate(()=>window.__skyshiftArtProbe?.());
  if(art.status!=="active")throw Error("White core art fallback "+JSON.stringify(art));
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:35000});
  return {page,art};
 }
 async function photo(page,s,file){
  await page.evaluate(v=>window.__skyshiftTrackRepairTeleport(v),s);
  await page.waitForTimeout(850);
  const proof=await page.evaluate(()=>window.__skyshiftWhiteCoreProbe?.());
  await page.screenshot({path:file});
  return proof;
 }
 const modern=await load();
 if(modern.art.variant!=="white-core-contained-tunnel"||
    !modern.art.waveSynchronized||
    modern.art.colliders!==0||
    modern.art.globalLightsChanged!==0||
    modern.art.drawBatches!==5)
  throw Error("Containment not active "+JSON.stringify(modern.art));
 for(const s of [90,178,273,333]){
  const status=await photo(modern.page,s,"skyshift-v02123-contained-cyan-"+s+".png");
  if(status.railGlareScale!==.34||status.shipPbrMaterials<1||
    !status.roadSpecularTrimmed||
    status.shipWhiteContainment<.99||
    status.railWhiteContainment!==1||!status.worldLightsUnchanged)
   throw Error("White source not reduced in road/ship "+JSON.stringify(status));
 }
 const gold=await modern.page.evaluate(()=>window.__skyshiftWaveSmoke(2));
 await modern.page.waitForTimeout(350);
 if(gold.palette!=="solar")throw Error("Solar Gold not maintained");
 await photo(modern.page,333,"skyshift-v02123-contained-gold-333.png");
 const jade=await modern.page.evaluate(()=>window.__skyshiftWaveSmoke(3));
 await modern.page.waitForTimeout(350);
 if(jade.palette!=="jade")throw Error("Jade Surge not maintained");
 await photo(modern.page,90,"skyshift-v02123-contained-jade-90.png");
 await modern.page.close();
 const prior=await load("whiteCore=classic");
 if(prior.art.variant!=="sealed-neon-tunnel")
  throw Error("Original 0.21.2.2 before/after mode broken "+JSON.stringify(prior.art));
 for(const s of [90,178,273,333]){
  const status=await photo(prior.page,s,"skyshift-v02123-original-cyan-"+s+".png");
  if(status.enabled||status.railGlareScale!==.52||status.railWhiteContainment!==0)
   throw Error("Original full specular not preserved "+JSON.stringify(status));
 }
 await prior.page.evaluate(()=>window.__skyshiftWaveSmoke(2));
 await prior.page.waitForTimeout(350);
 await photo(prior.page,333,"skyshift-v02123-original-gold-333.png");
 await prior.page.close();
 const low=await load("",4);
 const lowProbe=await low.page.evaluate(()=>window.__skyshiftWhiteCoreProbe());
 if(low.art.variant!=="white-core-contained-tunnel"||
    low.art.drawBatches!==3||!lowProbe?.enabled||
    lowProbe.railGlareScale!==.34||lowProbe.railWhiteContainment!==1||
    lowProbe.shipPbrMaterials<1)
  throw Error("Low memory path broke "+JSON.stringify({art:low.art,probe:lowProbe}));
 await photo(low.page,273,"skyshift-v02123-mobile-273.png");
 await low.page.close();
 if(errors.length)throw Error("WebGL shader errors: "+errors.join(" | "));
 console.log("PASS SKYSHIFT 0.21.2.3: original ship, deck and rails; "+
  "locally contained neutral specular, Solar Gold/Jade palette, exact "+
  "0.21.2.2 A/B and simulated low-memory 4GB Chrome/SwiftShader");
}finally{await browser?.close();server.kill("SIGTERM")}
