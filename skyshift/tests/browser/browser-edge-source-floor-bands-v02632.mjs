// SKYSHIFT 0.26.3.2 — real Chromium WebGL high / 4GB visual check.
// A/B is the exact same frame, position, camera and spectral zone. Screenshots
// must show SHORT lower insets, JOINED warm foot/shoulder bands, and a dark road.
// Also validate ?edgeSources=classic restores 0.26.3.1.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,
 "/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"]
 .filter(Boolean).find(existsSync);
if(!chrome)throw Error("0.26.3.2 requires real Chromium/WebGL");
const server=spawn("python3",["-m","http.server","8865","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;const errors=[],proof=[];
const lum=(p,i)=>p[i]*.213+p[i+1]*.715+p[i+2]*.072;
function analyze(frame,label,mobile){
 const A=PNG.sync.read(Buffer.from(frame.classic,"base64"));
 const B=PNG.sync.read(Buffer.from(frame.repositioned,"base64"));
 const M=PNG.sync.read(Buffer.from(frame.roadMask,"base64"));
 const E=PNG.sync.read(Buffer.from(frame.emptyMask,"base64"));
 if([B,M,E].some(v=>v.width!==A.width||v.height!==A.height))
  throw Error("0.26.3.2 changed camera/render dimensions");
 for(const k of ["classic","repositioned"])
  writeFileSync("skyshift-v02632-"+label+"-"+k+".png",Buffer.from(frame[k],"base64"));
 let road=0,changedRoad=0,outside=0,changedOutside=0,
  beforeRoad=0,afterRoad=0,totalOld=0,totalNew=0,
  whiteOld=0,whiteNew=0,coolOld=0,coolNew=0,
  warmOld=0,warmNew=0,sourcePixels=0;
 const W=A.width,H=A.height;
 for(let y=Math.floor(H*.10);y<Math.floor(H*.94);y+=3)
 for(let x=Math.floor(W*.025);x<Math.floor(W*.975);x+=3){
  const i=(y*W+x)*4;
  const mask=Math.abs(M.data[i]-E.data[i])+
   Math.abs(M.data[i+1]-E.data[i+1])+
   Math.abs(M.data[i+2]-E.data[i+2])>125;
  const delta=Math.abs(A.data[i]-B.data[i])+
   Math.abs(A.data[i+1]-B.data[i+1])+
   Math.abs(A.data[i+2]-B.data[i+2]);
  const l0=lum(A.data,i),l1=lum(B.data,i);
  totalOld+=l0;totalNew+=l1;
  if(mask){road++;beforeRoad+=l0;afterRoad+=l1;
   if(delta>12)changedRoad++;
  }else{outside++;if(delta>12)changedOutside++;}
  if(Math.min(A.data[i],A.data[i+1],A.data[i+2])>240)whiteOld++;
  if(Math.min(B.data[i],B.data[i+1],B.data[i+2])>240)whiteNew++;
  const cool=p=>p[i+1]>p[i]*1.23&&p[i+2]>p[i]*1.30&&p[i+2]>54;
  const warm=p=>p[i]>p[i+1]*1.17&&p[i]>p[i+2]*1.39&&p[i]>48;
  if(cool(A.data))coolOld++;
  if(cool(B.data))coolNew++;
  if(warm(A.data))warmOld++;
  if(warm(B.data))warmNew++;
  if(delta>36&&l1>50)sourcePixels++;
 }
 const stats={label,mobile,trackS:frame.trackS,road,changedRoad,
  outside,changedOutside,whiteOld,whiteNew,
  coolOld,coolNew,warmOld,warmNew,sourcePixels,
  meanRoadOld:+(beforeRoad/Math.max(1,road)).toFixed(2),
  meanRoadNew:+(afterRoad/Math.max(1,road)).toFixed(2),
  sceneMeanDelta:+((totalNew-totalOld)/(road+outside)).toFixed(2)};
 proof.push(stats);
 writeFileSync("skyshift-v02632-proof.json",JSON.stringify(proof,null,2));
 console.log("EDGE_SOURCE_02632 "+JSON.stringify(stats));
 if(outside<1000||changedOutside<35)
  throw Error("0.26.3.2 joined foot and ground LED sources invisible "+JSON.stringify(stats));
 if(changedRoad<18)
  throw Error("0.26.3.2 lacks road reflections from moved insets "+JSON.stringify(stats));
 if(stats.meanRoadNew>stats.meanRoadOld+7.5||
  stats.sceneMeanDelta>6.0)
  throw Error("0.26.3.2 lost dark cinematic road "+JSON.stringify(stats));
 if(whiteNew>whiteOld*1.12+28)
  throw Error("0.26.3.2 sun/neutral white leak returned "+JSON.stringify(stats));
}
try{
 await sleep(800);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 async function start(memory,extra=""){
  const page=await browser.newPage({viewport:{width:1536,height:870}});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",m=>{
   if(m.type()==="error"&&
    /Shader Error|WebGLProgram|INVALID_OPERATION|THREE.WebGLProgram/i.test(m.text()))
    errors.push(m.text().slice(0,2700));
  });
  await page.addInitScript(m=>Object.defineProperty(navigator,"deviceMemory",{
   configurable:true,get:()=>m}),memory);
  await page.goto("http://127.0.0.1:8865/skyshift/?v=0.26.3.2"+
   "&artSmoke=1&edgeSourceSmoke=1&edgeSourceFrameProof=1"+
   "&trackRepairSmoke=1&waveSmoke=1&"+extra,
   {waitUntil:"domcontentloaded",timeout:65000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:90000});
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:35000});
  return page;
 }
 async function take(page,s,zone,label,memory){
  await page.evaluate(x=>window.__skyshiftTrackRepairTeleport(x),s);
  if(zone)await page.evaluate(x=>window.__skyshiftWaveSmoke(x),zone);
  await page.waitForTimeout(680);
  const state=await page.evaluate(()=>window.__skyshiftEdgeSourceProbe());
  if(!state.requested||!state.edgeSources02632Active||
   state.edgeSources02632Status!=="active"||
   state.edgeSources02632Version!=="0.26.3.2"||
   state.edgeSources02632ConnectedBands!==20||
   state.edgeSources02632FootSources!==20||
   state.edgeSources02632CyanSegments<20||
   state.edgeSources02632CyanLitMeters>250||
   state.edgeSources02632CyanWidth!==.18||
   state.edgeSources02632GGXSamples!==(memory===4?1:2)||
   state.edgeSources026324GB!==(memory===4)||
   state.edgeSources02632DrawBatches!==2||
   state.edgeSources02632NewLights!==0||
   state.edgeSources02632NewColliders!==0||
   !state.edgeSources02632SolarSealed||
   !state.edgeSources02632NativeGGX||
   !state.edgeSources02632GRIPUnchanged||
   !state.edgeSources02632NativeWaveUnchanged||
   !state.edgeSources02632OnOriginalRoad||
   !state.edgeSources02632OnOriginalRail||
   !state.edgeSources02632NoArrowLighting||
   !state.roadRebuild||state.roadMaterial!=="MeshStandardMaterial"||
   state.solarSeal!==1||state.premiumRoadSeal!==1||
   !state.originalShip||!state.originalRail||!state.nativeWave)
   throw Error("0.26.3.2 rail / floor / ship invariants failed "+JSON.stringify(state));
  analyze(await page.evaluate(()=>window.__skyshiftEdgeSourceFrameProof()),label,memory===4);
 }
 const high=await start(8);
 await take(high,154,2,"high-gold-inset",8);
 await take(high,165,2,"high-gold-arch",8);
 await take(high,44,1,"high-violet-arch",8);
 await high.close();
 const low=await start(4);
 await take(low,154,2,"4gb-gold-inset",4);
 await low.close();
 const classic=await start(8,"edgeSources=classic");
 const old=await classic.evaluate(()=>window.__skyshiftEdgeSourceProbe());
 if(old.requested||old.edgeSources02632Active||
  !old.edgeFloor02631Active||!old.roadRebuild)
  throw Error("0.26.3.2 classic does not restore 0.26.3.1 "+JSON.stringify(old));
 await classic.close();
 if(errors.length)throw Error("0.26.3.2 GPU errors: "+errors.join(" | "));
 console.log("PASS SKYSHIFT 0.26.3.2 — SHORT low cyan rail / CONNECTED amber band high + 4GB");
}finally{await browser?.close();server.kill("SIGTERM");}
