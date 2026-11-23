// SKYSHIFT 0.26.4 — genuine Chromium/WebGL high/4GB, same-camera
// cinematic finish comparison. Never use an AI-generated reference image.
// Required: HDR fixture/metal effect, road/ship contrast, neutral white seal,
// unchanged straight-only cyan, and exact 0.26.3.3 baseline via classic URL.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,
 "/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"]
 .filter(Boolean).find(existsSync);
if(!chrome)throw Error("0.26.4 requires actual Chromium/WebGL rendering");
const server=spawn("python3",["-m","http.server","8867","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;const errors=[],proof=[];
const lum=(p,i)=>p[i]*.213+p[i+1]*.715+p[i+2]*.072;
function compare(frame,label,mobile){
 const A=PNG.sync.read(Buffer.from(frame.classic,"base64"));
 const B=PNG.sync.read(Buffer.from(frame.cohesion,"base64"));
 if(B.width!==A.width||B.height!==A.height)
  throw Error("0.26.4 changed original camera or output size");
 for(const k of ["classic","cohesion"])
  writeFileSync("skyshift-v0264-"+label+"-"+k+".png",
   Buffer.from(frame[k],"base64"));
 const w=A.width,h=A.height;
 let n=0,changed=0,totalDiff=0,whiteOld=0,whiteNew=0,
  achromaticOld=0,achromaticNew=0,topL0=0,topL1=0,topN=0,
  lowL0=0,lowL1=0,lowN=0,roadL0=0,roadL1=0,roadN=0,
  darkOld=0,darkNew=0,coolOld=0,coolNew=0,warmOld=0,warmNew=0;
 for(let y=Math.floor(h*.07);y<Math.floor(h*.94);y+=3)
 for(let x=Math.floor(w*.02);x<Math.floor(w*.98);x+=3){
  const i=(y*w+x)*4;
  const r0=A.data[i],g0=A.data[i+1],b0=A.data[i+2],
   r1=B.data[i],g1=B.data[i+1],b1=B.data[i+2];
  const d=Math.abs(r0-r1)+Math.abs(g0-g1)+Math.abs(b0-b1);
  const l0=lum(A.data,i),l1=lum(B.data,i);
  if(d>12)changed++;
  if(l0<12)darkOld++;
  if(l1<12)darkNew++;
  if(Math.min(r0,g0,b0)>240)whiteOld++;
  if(Math.min(r1,g1,b1)>240)whiteNew++;
  if(Math.max(r0,g0,b0)-Math.min(r0,g0,b0)<10&&l0>65)achromaticOld++;
  if(Math.max(r1,g1,b1)-Math.min(r1,g1,b1)<10&&l1>65)achromaticNew++;
  if(b0>r0*1.22&&g0>r0*1.14&&b0>55)coolOld++;
  if(b1>r1*1.22&&g1>r1*1.14&&b1>55)coolNew++;
  if(r0>g0*1.18&&r0>b0*1.45&&r0>55)warmOld++;
  if(r1>g1*1.18&&r1>b1*1.45&&r1>55)warmNew++;
  const xx=x/w,yy=y/h;
  if(yy<.43){topL0+=l0;topL1+=l1;topN++;}
  if(yy>.68){lowL0+=l0;lowL1+=l1;lowN++;}
  if(yy>.56&&xx>.30&&xx<.70){
   roadL0+=l0;roadL1+=l1;roadN++;
  }
  totalDiff+=d;n++;
 }
 const r={label,mobile,trackS:frame.trackS,n,changed,
  meanDifference:+(totalDiff/n).toFixed(2),
  upperLumaOld:+(topL0/topN).toFixed(2),
  upperLumaNew:+(topL1/topN).toFixed(2),
  lowerLumaOld:+(lowL0/lowN).toFixed(2),
  lowerLumaNew:+(lowL1/lowN).toFixed(2),
  centralRoadLumaOld:+(roadL0/roadN).toFixed(2),
  centralRoadLumaNew:+(roadL1/roadN).toFixed(2),
  whiteOld,whiteNew,achromaticOld,achromaticNew,
  darkOld,darkNew,coolOld,coolNew,warmOld,warmNew};
 proof.push(r);
 writeFileSync("skyshift-v0264-proof.json",JSON.stringify(proof,null,2));
 console.log("FINAL_COHESION_0264 "+JSON.stringify(r));
 if(changed<(mobile?70:150)||r.meanDifference<.10)
  throw Error("Pass 4 had no meaningful optical effect "+JSON.stringify(r));
 if(r.centralRoadLumaNew>r.centralRoadLumaOld+6.0)
  throw Error("Pass 4 washed out dark middle of road "+JSON.stringify(r));
 if(r.lowerLumaNew>r.lowerLumaOld+8.0)
  throw Error("Pass 4 flattened lower tunnel/ship contrast "+JSON.stringify(r));
 if(whiteNew>whiteOld*1.17+35)
  throw Error("Pass 4 recreated white solar spill "+JSON.stringify(r));
 if(darkNew<darkOld*.67)
  throw Error("Pass 4 lifted too many originally dark panel seams "+JSON.stringify(r));
}
try{
 await sleep(750);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 async function open(memory,extra=""){
  const page=await browser.newPage({viewport:{width:1536,height:870}});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",m=>{
   if(m.type()==="error"&&/Shader Error|WebGLProgram|INVALID_OPERATION|THREE.WebGLProgram/i.test(m.text()))
    errors.push(m.text().slice(0,2700));
  });
  await page.addInitScript(m=>Object.defineProperty(navigator,
   "deviceMemory",{configurable:true,get:()=>m}),memory);
  await page.goto("http://127.0.0.1:8867/skyshift/?v=0.26.4"+
   "&artSmoke=1&finalCohesionSmoke=1&finalCohesionFrameProof=1"+
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
  await page.waitForTimeout(620);
  const q=await page.evaluate(()=>window.__skyshiftFinalCohesionProbe());
  if(!q.requested||!q.finalCohesion0264Active||
   q.finalCohesion0264Status!=="active"||
   q.finalCohesion0264Version!=="0.26.4"||
   q.finalCohesion0264ExtraPasses!==(memory===4?0:1)||
   q.finalCohesion0264LowMemory!==(memory===4)||
   q.finalCohesion0264NewLights!==0||
   q.finalCohesion0264NewColliders!==0||
   !q.finalCohesion0264SolarSealed||
   !q.finalCohesion0264OriginalStraightOnlyCyan||
   !q.finalCohesion0264OriginalAmberBands||
   !q.finalCohesion0264NativeWaveUnchanged||
   !q.finalCohesion0264NoNeutralWhiteFill||
   !q.straightOnly||q.amberBands!==20||
   !q.originalRoad||!q.originalMetal||
   q.roadSolarSeal!==1||q.premiumRoadSeal!==1||
   !q.nativeWave||!q.shipPresent||!q.outputFinal||!q.smaaPresent||
   Math.abs(q.originalExposure-.96)>.06||
   q.finalCohesion0264Bloom.strength!==(memory===4?.44:.52)||
   q.finalCohesion0264Bloom.threshold!==(memory===4?1.38:1.28))
   throw Error("0.26.4 high/4GB physical source and HDR policy "+JSON.stringify(q));
  const frames=await page.evaluate(()=>window.__skyshiftFinalCohesionFrameProof());
  compare(frames,label,memory===4);
 }
 const high=await open(8);
 await take(high,76,2,"high-gold-straight",8);
 await take(high,165,2,"high-gold-transition",8);
 await take(high,195,2,"high-gold-corner",8);
 await take(high,250,1,"high-violet-arch",8);
 await high.close();
 const low=await open(4);
 await take(low,165,2,"4gb-gold-tunnel",4);
 await low.close();
 const classic=await open(8,"finalCohesion=classic");
 const old=await classic.evaluate(()=>window.__skyshiftFinalCohesionProbe());
 if(old.requested||old.finalCohesion0264Active||
  !old.straightOnly||old.amberBands!==20||
  old.roadSolarSeal!==1||old.premiumRoadSeal!==1)
  throw Error("0.26.4 classic comparison failed to recover 0.26.3.3 "+JSON.stringify(old));
 await classic.close();
 if(errors.length)throw Error("0.26.4 real WebGL shader errors "+errors.join(" | "));
 console.log("PASS SKYSHIFT 0.26.4 — final cinematic HDR 8GB/4GB, road contrast and original lights");
}finally{await browser?.close();server.kill("SIGTERM");}
