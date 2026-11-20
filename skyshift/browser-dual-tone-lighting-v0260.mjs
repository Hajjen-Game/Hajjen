// SKYSHIFT 0.26.0 Pass 1 — real Chromium WebGL proof of *simultaneous*
// zone neon, permanent cyan and amber lighting on graphite, not a mockup.
// Same-frame comparison against 0.25.1, road masked by direct rendering.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("0.26.0 requires Chromium to validate real pixels");
const server=spawn("python3",["-m","http.server","8860","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
const failures=[],proof=[];
const luma=(p,i)=>.2126*p[i]+.7152*p[i+1]+.0722*p[i+2];
function evaluateFrame(pair,label,{mobile=false,needMix=false}={}){
 const imgs=Object.fromEntries(["classic","dual","roadMask","emptyMask"].map(k=>
  [k,PNG.sync.read(Buffer.from(pair[k],"base64"))]));
 const a=imgs.classic,b=imgs.dual,mask=imgs.roadMask,empty=imgs.emptyMask;
 if(a.width!==b.width||a.height!==b.height||mask.width!==a.width||
  mask.height!==a.height||empty.width!==a.width||empty.height!==a.height)
  throw Error("0.26.0 A/B geometry/camera dimensions differ");
 for(const type of ["classic","dual"])
  writeFileSync("skyshift-v0260-"+label+"-"+type+".png",
   Buffer.from(pair[type],"base64"));
 const W=a.width,H=a.height,A=a.data,B=b.data,M=mask.data,E=empty.data;
 let metalPixels=0,changed=0,oldMean=0,newMean=0,
  cyanOld=0,cyanNow=0,warmOld=0,warmNow=0,
  zoneVioletNow=0,roadPixels=0,roadSame=0,
  oldHot=0,hotRetained=0,whiteOld=0,whiteNow=0;
 for(let y=Math.floor(H*.07);y<Math.floor(H*.93);y+=3)
  for(let x=Math.floor(W*.035);x<Math.floor(W*.965);x+=3){
   const i=(y*W+x)*4;
   const original=luma(A,i),current=luma(B,i);
   const diff=Math.abs(A[i]-B[i])+Math.abs(A[i+1]-B[i+1])+
    Math.abs(A[i+2]-B[i+2]);
   const isRoad=Math.abs(M[i]-E[i])+Math.abs(M[i+1]-E[i+1])+
    Math.abs(M[i+2]-E[i+2])>115;
   if(isRoad){
    roadPixels++;if(diff<23)roadSame++;
   }else if(y<H*.72&&(x<W*.46||x>W*.54)){
    metalPixels++;oldMean+=original;newMean+=current;
    if(diff>15)changed++;
    const cyan=(p)=>p[i+2]>p[i]*1.28&&p[i+1]>p[i]*1.16&&
       p[i+2]>70&&p[i+1]>58;
    const warm=(p)=>p[i]>p[i+1]*1.15&&p[i+1]>p[i+2]*1.22&&
       p[i]>68&&p[i+1]>35;
    if(cyan(A))cyanOld++;
    if(cyan(B))cyanNow++;
    if(warm(A))warmOld++;
    if(warm(B))warmNow++;
    if(B[i]>B[i+1]*1.09&&B[i+2]>B[i+1]*1.19&&B[i+2]>65)
     zoneVioletNow++;
    const originalPeak=Math.max(A[i],A[i+1],A[i+2]);
    if(originalPeak>239&&Math.min(A[i],A[i+1],A[i+2])<172){
     oldHot++;
     if(Math.max(B[i],B[i+1],B[i+2])>182)hotRetained++;
    }
   }
   if(Math.min(A[i],A[i+1],A[i+2])>234)whiteOld++;
   if(Math.min(B[i],B[i+1],B[i+2])>234)whiteNow++;
  }
 const stats={label,mobile,position:pair.position,metalPixels,changed,
  changedPercent:+(changed*100/Math.max(metalPixels,1)).toFixed(2),
  oldWallMean:+(oldMean/Math.max(metalPixels,1)).toFixed(2),
  newWallMean:+(newMean/Math.max(metalPixels,1)).toFixed(2),
  cyanOld,cyanNow,warmOld,warmNow,zoneVioletNow,
  roadPixels,roadSame,oldHot,hotRetained,whiteOld,whiteNow};
 proof.push(stats);
 writeFileSync("skyshift-v0260-proof.json",JSON.stringify(proof,null,2));
 console.log("DUAL_TONE_0260 "+JSON.stringify(stats));
 if(metalPixels<800||changed<metalPixels*(mobile?.055:.075))
  throw Error("0.26.0 new architectural lighting too subtle "+JSON.stringify(stats));
 if(stats.newWallMean>stats.oldWallMean+10)
  throw Error("0.26.0 global neon cyan wash returned "+JSON.stringify(stats));
 if(stats.newWallMean<stats.oldWallMean-16)
  throw Error("0.26.0 tunnel metal lost readability "+JSON.stringify(stats));
 if(roadPixels<300||roadSame/roadPixels<.92)
  throw Error("0.26.0 driving road changed "+JSON.stringify(stats));
 if(oldHot>65&&hotRetained/oldHot<.78)
  throw Error("0.26.0 lost original moving neon core "+JSON.stringify(stats));
 if(whiteNow>whiteOld*1.16+50)
  throw Error("0.26.0 uncontrolled white spill "+JSON.stringify(stats));
 if(needMix&&(cyanNow<5||warmNow<5||cyanNow<cyanOld+3))
  throw Error("0.26.0 missing simultaneous cyan and amber in zone "+JSON.stringify(stats));
 return stats;
}
try{
 await sleep(1200);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 async function load(memory,extra=""){
  const page=await browser.newPage({viewport:{width:1536,height:870}});
  page.on("pageerror",e=>failures.push(e.message));
  page.on("console",msg=>{
   if(msg.type()==="error"&&/WebGLProgram|Shader Error|INVALID_OPERATION/i.test(msg.text()))
    failures.push(msg.text().slice(0,1800));
  });
  await page.addInitScript(v=>Object.defineProperty(navigator,"deviceMemory",
   {configurable:true,get:()=>v}),memory);
  await page.goto("http://127.0.0.1:8860/skyshift/?v=0.26.0"+
   "&artSmoke=1&dualToneSmoke=1&dualToneFrameProof=1"+
   "&trackRepairSmoke=1&waveSmoke=1&"+extra,
   {waitUntil:"domcontentloaded",timeout:65000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:90000});
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:35000});
  return page;
 }
 async function take(page,s,zone,label,memory,needMix=false){
  await page.evaluate(v=>window.__skyshiftTrackRepairTeleport(v),s);
  if(zone)await page.evaluate(z=>window.__skyshiftWaveSmoke(z),zone);
  await page.waitForTimeout(650);
  const status=await page.evaluate(()=>window.__skyshiftDualToneProbe());
  if(!status.requested||!status.dualTone0260Enabled||
   status.dualTone0260Status!=="active"||
   status.dualTone0260Pass!==1||
   status.dualTone0260Batches!==(memory===4?3:4)||
   status.dualTone0260LowMemory!==(memory===4)||
   status.dualTone0260CyanCoveStrips!==20||
   status.dualTone0260CyanAccents!==(memory===4?0:20)||
   !status.dualTone0260WarmFixturesRetained||
   !status.dualTone0260NativeNeonUnchanged||
   !status.dualTone0260SolarSealed||
   status.dualTone0260AddedDrawCalls!==1||
   status.dualTone0260AddedDynamicLights!==0||
   status.dualTone0260AddedTextures!==0||
   status.dualTone0260ChangesRoad!==false||
   status.dualTone0260ChangesShip!==false||
   status.dualTone0260ChangesGRIP!==false||
   status.dualTone0260ChangesPhysics!==false||
   status.roadSolarSeal!==1||!status.nativeWave)
   throw Error("0.26.0 failed physical source/flight safeguards "+
    JSON.stringify(status));
  const pair=await page.evaluate(()=>window.__skyshiftDualToneFrameProof());
  evaluateFrame(pair,label,{mobile:memory===4,needMix});
 }
 const desktop=await load(8);
 await take(desktop,45,0,"cyan-entry",8);
 await take(desktop,165,1,"violet-mid",8,true);
 await take(desktop,165,2,"gold-mid",8,true);
 await take(desktop,165,3,"jade-mid",8);
 await take(desktop,320,2,"gold-exit",8);
 await desktop.close();
 const phone=await load(4);
 await take(phone,45,0,"mobile-cyan-entry",4);
 await take(phone,165,1,"mobile-violet-mid",4,true);
 await take(phone,165,2,"mobile-gold-mid",4,true);
 await take(phone,320,3,"mobile-jade-exit",4);
 await phone.close();
 const classic=await load(8,"dualTone=classic");
 const status=await classic.evaluate(()=>window.__skyshiftDualToneProbe());
 if(status.requested||status.dualTone0260Enabled)
  throw Error("0.25.1 A/B baseline disappeared "+JSON.stringify(status));
 await classic.close();
 if(failures.length)
  throw Error("0.26.0 WebGL shader errors "+failures.join(" | "));
 console.log("PASS SKYSHIFT 0.26.0 P1 REAL mixed cyan/amber/zone render 8GB and 4GB");
}finally{await browser?.close();server.kill("SIGTERM");}
