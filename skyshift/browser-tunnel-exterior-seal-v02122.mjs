// SKYSHIFT 0.21.2.2 visual QA: real Chrome WebGL, exact location/zone A/B.
// Verify fog off only on tunnel meshes, unchanged exterior world fog,
// dimmed rail glare and sustained cyan-violet-gold wave synchronization.
import {spawn} from "node:child_process";
import {existsSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chromium not installed");
const server=spawn("python3",["-m","http.server","8801","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
try{
 await sleep(1000);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 const errors=[];
 async function load(params="",memory=8){
  const page=await browser.newPage({viewport:{width:1536,height:691}});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",m=>{
   if(m.type()==="error"&&/WebGLProgram|Shader Error|INVALID_OPERATION/i.test(m.text()))
    errors.push(m.text().slice(0,500));
  });
  await page.addInitScript(v=>Object.defineProperty(navigator,"deviceMemory",
   {get:()=>v,configurable:true}),memory);
  await page.goto("http://127.0.0.1:8801/skyshift/?v=0.21.2.3"+
   "&artSmoke=1&sealSmoke=1&trackRepairSmoke=1&waveSmoke=1&whiteCore=classic&"+params,
   {waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:75000});
  await page.waitForFunction(()=>["active","fallback","fallback-materials"].includes(
   window.__skyshiftArtProbe?.()?.status),null,{timeout:75000});
  const art=await page.evaluate(()=>window.__skyshiftArtProbe?.());
  if(art.status!=="active")throw Error("Exterior seal fallback "+JSON.stringify(art));
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:35000});
  return {page,art};
 }
 async function capture(page,s,filename){
  await page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),s);
  await page.waitForTimeout(700);
  await page.screenshot({path:filename});
 }
 const sealed=await load();
 const a=await sealed.page.evaluate(()=>window.__skyshiftExteriorSealProbe());
 if(sealed.art.variant!=="sealed-neon-tunnel"||
    sealed.art.exteriorFogSealed!==true||
    sealed.art.waveSynchronized!==true||
    sealed.art.fogDisabledMaterialCount!==5||
    sealed.art.drawBatches!==5||
    sealed.art.roadShoulderGlareSealed!==true||
    sealed.art.shellBounceReduced!==true||
    sealed.art.originalGRIPUntouched!==true||
    sealed.art.globalLightsChanged!==0||
    a.sceneFogPresent!==true||
    a.globalLightingPresent!==true||
    a.railGlareScale!==.52||
    !a.materials.every(m=>m.fog===false))
  throw Error("Incorrect sealed interior "+JSON.stringify({art:sealed.art,detail:a}));
 await capture(sealed.page,104,"skyshift-v02122-sealed-cyan-104.png");
 await capture(sealed.page,234,"skyshift-v02122-sealed-cyan-234.png");
 const gold=await sealed.page.evaluate(()=>window.__skyshiftWaveSmoke(2));
 await sealed.page.waitForTimeout(400);
 const waveArt=await sealed.page.evaluate(()=>window.__skyshiftArtProbe());
 if(gold.palette!=="solar"||waveArt.currentSpectrumTo!==2||
    waveArt.currentWaveFront!==gold.frontS)
  throw Error("Original nine-palette color wave regressed");
 await capture(sealed.page,234,"skyshift-v02122-sealed-gold-234.png");
 await sealed.page.close();
 const classic=await load("exteriorSeal=classic");
 const b=await classic.page.evaluate(()=>window.__skyshiftExteriorSealProbe());
 if(classic.art.variant!=="neon-wave-interior"||
    classic.art.exteriorFogSealed===true||
    b.railGlareScale!==1||
    !b.materials.every(m=>m.fog!==false))
  throw Error("Exact 0.21.2.1 lighting A/B lost "+JSON.stringify(b));
 await capture(classic.page,104,"skyshift-v02122-original-cyan-104.png");
 await capture(classic.page,234,"skyshift-v02122-original-cyan-234.png");
 await classic.page.evaluate(()=>window.__skyshiftWaveSmoke(2));
 await classic.page.waitForTimeout(400);
 await capture(classic.page,234,"skyshift-v02122-original-gold-234.png");
 await classic.page.close();
 const mobile=await load("",4);
 const mobileMat=await mobile.page.evaluate(()=>window.__skyshiftExteriorSealProbe());
 if(mobile.art.variant!=="sealed-neon-tunnel"||
    mobile.art.drawBatches!==3||mobile.art.fogDisabledMaterialCount!==3||
    !mobileMat.materials.every(m=>m.fog===false))
  throw Error("4GB fog isolation failed "+JSON.stringify(mobile.art));
 await capture(mobile.page,234,"skyshift-v02122-mobile-234.png");
 await mobile.page.close();
 if(errors.length)throw Error("Shader/WebGL errors: "+errors.join(" | "));
 console.log("PASS: SKYSHIFT 0.21.2.2 global fog excluded from tunnel, "+
  "exterior fog preserved, spatial neon wave still synchronized, "+
  "tunnel-only rail glare dimmed, exact position A/B and 4GB rendering");
}finally{await browser?.close();server.kill("SIGTERM")}
