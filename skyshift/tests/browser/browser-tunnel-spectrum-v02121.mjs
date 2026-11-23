// SKYSHIFT 0.21.2.2 — verify ACTUAL 0.6 zone wave controls tunnel neon.
// Matched live WebGL shots capture original 0.21.2, before-wave, and
// successive cyan -> violet -> solar -> jade states at the same track metre.
import {spawn} from "node:child_process";
import {existsSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chromium missing");
const server=spawn("python3",["-m","http.server","8799","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
try {
 await sleep(1000);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 const errors=[];
 async function load(query="",mem=8){
  const p=await browser.newPage({viewport:{width:1536,height:691}});
  p.on("pageerror",e=>errors.push(e.message));
  p.on("console",m=>{
   if(m.type()==="error"&&/WebGLProgram|Shader Error|INVALID_OPERATION/i.test(m.text()))
    errors.push(m.text().slice(0,550));
  });
  await p.addInitScript(v=>Object.defineProperty(navigator,"deviceMemory",
   {get:()=>v,configurable:true}),mem);
  await p.goto("http://127.0.0.1:8799/skyshift/?v=0.21.2.2"+
   "&artSmoke=1&trackRepairSmoke=1&waveSmoke=1&exteriorSeal=classic&"+query,
   {waitUntil:"domcontentloaded",timeout:60000});
  await p.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:75000});
  await p.waitForFunction(()=>["active","fallback","fallback-materials"].includes(
   window.__skyshiftArtProbe?.()?.status),null,{timeout:75000});
  const art=await p.evaluate(()=>window.__skyshiftArtProbe?.());
  if(art.status!=="active")throw Error("Tunnel lighting fallback "+JSON.stringify(art));
  await p.locator("#start-btn").click();
  await p.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:30000});
  await p.evaluate(()=>window.__skyshiftTrackRepairTeleport(165));
  await p.waitForTimeout(400);
  return {p,art};
 }
 const now=await load();
 if(now.art.variant!=="neon-wave-interior"||now.art.waveSynchronized!==true||
  now.art.staticPinkCyanWashRemoved!==true||
  now.art.exteriorLightLeakRemoved!==true||
  now.art.drawBatches!==5||now.art.colliders!==0||
  now.art.globalLightsChanged!==0)
  throw Error("New spectral tunnel not installed "+JSON.stringify(now.art));
 await now.p.screenshot({path:"skyshift-v02121-initial-cyan.png"});
 const expected=["violet","solar","jade"];
 for(let stage=1;stage<=3;stage++){
  const result=await now.p.evaluate(i=>window.__skyshiftWaveSmoke(i),stage);
  await now.p.waitForTimeout(350);
  const audit=await now.p.evaluate(()=>window.__skyshiftArtProbe());
  if(audit.currentSpectrumStage!==stage-1||
   audit.currentSpectrumTo!==stage||
   !audit.waveActive||
   Math.abs(audit.currentWaveFront-result.frontS)>.001)
   throw Error("Tunnel colors out of sync with road "+
    JSON.stringify({stage,result,audit}));
  if(result.palette!==expected[stage-1])throw Error("Wrong gameplay palette");
  await now.p.screenshot({path:"skyshift-v02121-zone-"+(stage+1)+"-"+result.palette+".png"});
 }
 await now.p.close();
 const old=await load("tunnelSpectrum=classic");
 if(old.art.variant!=="neon-driven-interior"||old.art.waveSynchronized===true)
  throw Error("Exact 0.21.2 visual baseline lost "+JSON.stringify(old.art));
 await old.p.screenshot({path:"skyshift-v02121-original-static-neon.png"});
 await old.p.close();
 const low=await load("",4);
 if(low.art.variant!=="neon-wave-interior"||!low.art.waveSynchronized||
    low.art.drawBatches!==3)throw Error("Mobile tunnel wave material failed");
 await low.p.evaluate(()=>window.__skyshiftWaveSmoke(1));
 await low.p.waitForTimeout(350);
 const lowArt=await low.p.evaluate(()=>window.__skyshiftArtProbe());
 if(lowArt.currentSpectrumTo!==1)throw Error("Mobile neon did not follow the wave");
 await low.p.screenshot({path:"skyshift-v02121-mobile-violet.png"});
 await low.p.close();
 if(errors.length)throw Error("Shader/WebGL errors: "+errors.join(" | "));
 console.log("PASS: actual zone waves recolor ALL 0.21.2.2 tunnel neon, "+
  "walls, vault, arches, road sheen; old 0.21.2 A/B, 4GB tier, "+
  "no gameplay or world lighting changes");
}finally{await browser?.close();server.kill("SIGTERM")}
