// SKYSHIFT 0.24.2 — same-camera REAL Chromium WebGL road reflections.
// Three images per frame: identical 0.24.1 baseline, new road-only
// reflections, deck-hidden segmentation. No concept images or fake diffs.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chrome required for 0.24.2 road QA");
const server=spawn("python3",["-m","http.server","8842","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
const issues=[],proof=[];
const luminance=(pixels,i)=>.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2];
function analyze(pair,label,{mobile=false}={}){
 const images=Object.fromEntries(["classic","cinematic","absent"].map(k=>
  [k,PNG.sync.read(Buffer.from(pair[k],"base64"))]));
 const a=images.classic,b=images.cinematic,off=images.absent;
 if(a.width!==b.width||a.height!==b.height||
    a.width!==off.width||a.height!==off.height)
  throw Error("0.24.2 same-frame A/B size mismatch");
 for(const [name,raw] of Object.entries(pair))
  if(name!=="trackS")writeFileSync("skyshift-v0242-"+label+"-"+name+".png",
   Buffer.from(raw,"base64"));
 let deckPixels=0,changedDeck=0,changedOutside=0;
 let whiteBefore=0,whiteAfter=0,oldLuma=0,newLuma=0;
 let coloredBoost=0,darkenedDeck=0,changedTop=0;
 const w=a.width,h=a.height;
 for(let y=Math.floor(h*.25);y<Math.floor(h*.97);y+=3)
  for(let x=Math.floor(w*.035);x<Math.floor(w*.965);x+=3){
   const i=(y*w+x)*4,A=a.data,B=b.data,N=off.data;
   const absentDelta=Math.abs(A[i]-N[i])+Math.abs(A[i+1]-N[i+1])+
    Math.abs(A[i+2]-N[i+2]);
   const change=Math.abs(A[i]-B[i])+Math.abs(A[i+1]-B[i+1])+
    Math.abs(A[i+2]-B[i+2]);
   if(absentDelta>32){
    deckPixels++;
    oldLuma+=luminance(A,i);newLuma+=luminance(B,i);
    if(Math.min(A[i],A[i+1],A[i+2])>190)whiteBefore++;
    if(Math.min(B[i],B[i+1],B[i+2])>190)whiteAfter++;
    if(change>5){
     changedDeck++;
     if(luminance(B,i)+2<luminance(A,i))darkenedDeck++;
     const oldSaturation=Math.max(A[i],A[i+1],A[i+2])-Math.min(A[i],A[i+1],A[i+2]);
     const newSaturation=Math.max(B[i],B[i+1],B[i+2])-Math.min(B[i],B[i+1],B[i+2]);
     if(newSaturation>oldSaturation+1)coloredBoost++;
    }
   }else if(change>32){
    changedOutside++;
    if(y<h*.6)changedTop++;
   }
  }
 const stats={label,trackS:pair.trackS,mobile,deckPixels,changedDeck,
  changedOutside,changedTop,whiteBefore,whiteAfter,coloredBoost,darkenedDeck,
  oldMean:+(oldLuma/Math.max(deckPixels,1)).toFixed(2),
  newMean:+(newLuma/Math.max(deckPixels,1)).toFixed(2)};
 if(deckPixels<300||changedDeck<(mobile?22:75))
  throw Error("0.24.2 reflections invisible on actual deck "+JSON.stringify(stats));
 if(stats.newMean<stats.oldMean-.3||darkenedDeck>changedDeck*.12+35)
  throw Error("0.24.2 neon reflections darken original driving surface "+JSON.stringify(stats));
 if(whiteAfter>whiteBefore*1.15+7)
  throw Error("0.24.2 neutral-white sunlight returned "+JSON.stringify(stats));
 if(changedOutside>changedDeck*3+150)
  throw Error("0.24.2 reflections escaped road geometry "+JSON.stringify(stats));
 return stats;
}
try{
 await sleep(1300);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 async function load(memory,extra=""){
  const page=await browser.newPage({viewport:{width:1536,height:860}});
  page.on("pageerror",e=>issues.push(e.message));
  page.on("console",m=>{
   if(m.type()==="error"&&/WebGLProgram|Shader Error|INVALID_OPERATION/i.test(m.text()))
    issues.push(m.text().slice(0,1200));
  });
  await page.addInitScript(n=>Object.defineProperty(navigator,"deviceMemory",
   {configurable:true,get:()=>n}),memory);
  await page.goto("http://127.0.0.1:8842/skyshift/?v=0.24.2"+
   "&artSmoke=1&cinematicRoadSmoke=1&cinematicRoadFrameProof=1"+
   "&trackRepairSmoke=1&waveSmoke=1&"+extra,
   {waitUntil:"domcontentloaded",timeout:65000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:90000});
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:35000});
  return page;
 }
 async function take(page,position,zone,label,memory){
  await page.evaluate(v=>window.__skyshiftTrackRepairTeleport(v),position);
  if(zone)await page.evaluate(n=>window.__skyshiftWaveSmoke(n),zone);
  await page.waitForTimeout(750);
  const state=await page.evaluate(()=>window.__skyshiftCinematicRoadProbe());
  if(!state.requested||!state.active||state.seal!==1||
     state.roadMaterial!=="MeshStandardMaterial"||
     state.solarSeal!==1||state.priorRoadSeal!==1||
     !state.nativeWave||!state.originalRail||!state.originalShip||
     !state.whiteCoreUnchanged||!state.guideEmissionUnchanged||
     !state.roadSolarSealRetained||!state.physicsUnchanged||
     !state.gripUnchanged||state.lowMemory!==(memory===4)||
     state.newDrawCalls!==0||state.newLights!==0||state.newTextures!==0)
   throw Error("0.24.2 road pipeline safety failure "+JSON.stringify(state));
  const pair=await page.evaluate(()=>window.__skyshiftCinematicRoadFrameProof());
  const stats=analyze(pair,label,{mobile:memory===4});
  proof.push(stats);
  console.log("CINEMATIC_ROAD_0242 "+JSON.stringify(stats));
 }
 const desktop=await load(8);
 await take(desktop,44,0,"cyan-early-44",8);
 await take(desktop,165,0,"cyan-mid-165",8);
 await take(desktop,165,2,"gold-mid-165",8);
 await take(desktop,165,3,"jade-mid-165",8);
 await take(desktop,326,3,"jade-late-326",8);
 await desktop.close();
 const mobile=await load(4);
 await take(mobile,165,2,"mobile-gold-mid",4);
 await take(mobile,165,1,"mobile-violet-mid",4);
 await take(mobile,326,1,"mobile-violet-late",4);
 await mobile.close();
 const classic=await load(8,"cinematicRoad=classic");
 const status=await classic.evaluate(()=>window.__skyshiftCinematicRoadProbe());
 if(status.requested||status.active)
  throw Error("0.24.1 comparison no longer available "+JSON.stringify(status));
 await classic.close();
 if(issues.length)throw Error("0.24.2 WebGL shader errors "+issues.join(" | "));
 writeFileSync("skyshift-v0242-proof.json",JSON.stringify(proof,null,2));
 console.log("PASS SKYSHIFT 0.24.2 road-only colored portal/roof reflections, 8GB + 4GB");
}finally{await browser?.close();server.kill("SIGTERM")}
