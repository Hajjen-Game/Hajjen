// SKYSHIFT 0.22.0 Pass 3 — actual WebGL same-frame velocity HDR proof.
// High-speed wall/ceiling edge streaks must be visible without a changed ship
// or playable road. Simulated 4GB stays native (no extra compositor pass).
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chrome missing");
const server=spawn("python3",["-m","http.server","8823","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
const errors=[],results=[];let browser;
function inspect(pair,label){
 const old=PNG.sync.read(Buffer.from(pair.classic,"base64"));
 const now=PNG.sync.read(Buffer.from(pair.cinematic,"base64"));
 if(old.width!==now.width||old.height!==now.height)
  throw Error("A/B resolution differs");
 const W=old.width,H=old.height;
 let changed=0,peripheral=0,shipCenter=0,laneCenter=0;
 for(let y=Math.floor(H*.06);y<Math.floor(H*.97);y+=2)
  for(let x=Math.floor(W*.03);x<Math.floor(W*.97);x+=2){
   const idx=(y*W+x)*4,a=old.data,b=now.data;
   const diff=Math.abs(a[idx]-b[idx])+Math.abs(a[idx+1]-b[idx+1])+
    Math.abs(a[idx+2]-b[idx+2]);
   if(diff<10)continue;
   changed++;
   if(x<W*.26||x>W*.74||y<H*.30)peripheral++;
   if(x>W*.40&&x<W*.60&&y>H*.58)shipCenter++;
   if(x>W*.41&&x<W*.59&&y>H*.39&&y<H*.63)laneCenter++;
  }
 const rec={label,flightS:pair.flightS,speedRatio:pair.velocity,
  changed,peripheral,shipCenter,laneCenter};
 if(changed<50||peripheral<35)
  throw Error("Directional velocity effect invisible "+JSON.stringify(rec));
 if(shipCenter>changed*.25+35||laneCenter>changed*.26+40)
  throw Error("Cinematic smear compromised flight corridor "+JSON.stringify(rec));
 for(const [suffix,bytes] of [["classic",pair.classic],["cinema",pair.cinematic]])
  writeFileSync("skyshift-v0220p3-"+label+"-"+suffix+".png",Buffer.from(bytes,"base64"));
 return rec;
}
try{
 await sleep(1200);
 browser=await chromium.launch({headless:true,executablePath:chrome,
  args:["--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
   "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 async function load(mem,query=""){
  const page=await browser.newPage({viewport:{width:1536,height:870}});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",m=>{
   if(m.type()==="error"&&/WebGLProgram|Shader Error|INVALID_OPERATION/i.test(m.text()))
    errors.push(m.text().slice(0,900));
  });
  await page.addInitScript(n=>Object.defineProperty(navigator,"deviceMemory",
   {get:()=>n,configurable:true}),mem);
  await page.goto("http://127.0.0.1:8823/skyshift/?v=0.22.0.3"+
   "&velocityCinemaSmoke=1&velocityCinemaFrameProof=1"+
   "&trackRepairSmoke=1&waveSmoke=1&artSmoke=1&"+query,
   {waitUntil:"domcontentloaded",timeout:65000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:80000});
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:35000});
  return page;
 }
 const desktop=await load(8);
 for(const [s,zone,label] of [[165,0,"cyan-165"],[165,2,"gold-165"],[273,3,"jade-273"]]){
  await desktop.evaluate(n=>window.__skyshiftTrackRepairTeleport(n),s);
  if(zone)await desktop.evaluate(n=>window.__skyshiftWaveSmoke(n),zone);
  await desktop.waitForTimeout(600);
  const state=await desktop.evaluate(()=>window.__skyshiftVelocityCinemaProbe());
  if(!state.requested||!state.active||!state.outputFinal||
     state.outputIndex!==state.passIndex+1||
     state.roadSolarSeal!==1||!state.nativeWave)
   throw Error("Expected HDR velocity compositor before OutputPass "+JSON.stringify(state));
  const capture=await desktop.evaluate(()=>window.__skyshiftVelocityCinemaFrameProof());
  const result=inspect(capture,label);
  results.push({...result,renderPassCount:state.renderPasses});
  console.log("VELOCITY_CINEMA "+JSON.stringify(results.at(-1)));
 }
 await desktop.close();
 const mobile=await load(4);
 const low=await mobile.evaluate(()=>window.__skyshiftVelocityCinemaProbe());
 if(!low.requested||low.active||low.disabledReason!=="low-memory"||
    !low.outputFinal||low.roadSolarSeal!==1)
  throw Error("4GB device must not use extra blur render pass "+JSON.stringify(low));
 await mobile.close();
 const classic=await load(8,"velocityCinema=classic");
 const old=await classic.evaluate(()=>window.__skyshiftVelocityCinemaProbe());
 if(old.requested||old.active||old.disabledReason!=="comparison")
  throw Error("Pass 2 A/B disabled comparison broken "+JSON.stringify(old));
 await classic.close();
 if(errors.length)throw Error("WebGL shader errors "+errors.join(" | "));
 writeFileSync("skyshift-v0220p3-velocity-proof.json",JSON.stringify(results,null,2));
 console.log("PASS SKYSHIFT 0.22.0 Pass 3: directional streaks, road/ship clarity and mobile gate");
}finally{await browser?.close();server.kill("SIGTERM")}
