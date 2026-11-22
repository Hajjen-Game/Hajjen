// SKYSHIFT 0.25.1 — actual Chromium WebGL material-detail A/B.
// Same frame/camera and zone with the identical 0.25.0 lighting, emitter,
// road and ship. Artifacts are REAL screenshots, never concept renders.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("0.25.1 needs Chrome for real surface QA");
const server=spawn("python3",["-m","http.server","8851","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;const errors=[],proof=[];
const lum=(pixels,i)=>.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2];
function inspect(pair,label,{mobile=false}={}){
 const a=PNG.sync.read(Buffer.from(pair.classic,"base64"));
 const b=PNG.sync.read(Buffer.from(pair.crafted,"base64"));
 const mask=PNG.sync.read(Buffer.from(pair.roadMask,"base64"));
 const empty=PNG.sync.read(Buffer.from(pair.emptyMask,"base64"));
 if(a.width!==b.width||a.height!==b.height||
   mask.width!==a.width||empty.width!==a.width||
   mask.height!==a.height||empty.height!==a.height)
  throw Error("0.25.1 same-frame material A/B dimensions differ");
 for(const name of ["classic","crafted"])
  writeFileSync("skyshift-v0251-"+label+"-"+name+".png",
   Buffer.from(pair[name],"base64"));
 const A=a.data,B=b.data,M=mask.data,E=empty.data;
 const W=a.width,H=a.height;
 let wall=0,changedWall=0,brightened=0,darkened=0;
 let oldMean=0,newMean=0,road=0,roadSame=0,oldHot=0,hotKept=0;
 let whiteBefore=0,whiteAfter=0;
 for(let y=Math.floor(H*.08);y<Math.floor(H*.93);y+=3)
  for(let x=Math.floor(W*.04);x<Math.floor(W*.96);x+=3){
   const i=(y*W+x)*4,old=lum(A,i),now=lum(B,i);
   const delta=Math.abs(A[i]-B[i])+Math.abs(A[i+1]-B[i+1])+
     Math.abs(A[i+2]-B[i+2]);
   const roadMaskDelta=Math.abs(M[i]-E[i])+Math.abs(M[i+1]-E[i+1])+
     Math.abs(M[i+2]-E[i+2]);
   if(roadMaskDelta>115){
    road++;
    if(delta<17)roadSame++;
   }else if(y<H*.68&&(x<W*.44||x>W*.56)){
    wall++;oldMean+=old;newMean+=now;
    if(delta>5)changedWall++;
    if(now>old+3)brightened++;
    if(now<old-3)darkened++;
    const peak=Math.max(A[i],A[i+1],A[i+2]);
    if(peak>234&&Math.min(A[i],A[i+1],A[i+2])<170){
     oldHot++;if(Math.max(B[i],B[i+1],B[i+2])>196)hotKept++;
    }
   }
   if(Math.min(A[i],A[i+1],A[i+2])>237)whiteBefore++;
   if(Math.min(B[i],B[i+1],B[i+2])>237)whiteAfter++;
  }
 const stats={label,mobile,position:pair.position,wall,changedWall,
   changedWallPct:+(100*changedWall/Math.max(1,wall)).toFixed(2),
   brightened,darkened,oldWallMean:+(oldMean/Math.max(wall,1)).toFixed(2),
   newWallMean:+(newMean/Math.max(wall,1)).toFixed(2),
   road,roadSame,oldHot,hotKept,whiteBefore,whiteAfter};
 proof.push(stats);
 writeFileSync("skyshift-v0251-proof.json",JSON.stringify(proof,null,2));
 console.log("MICRO_METAL_0251 "+JSON.stringify(stats));
 if(wall<1000||changedWall<wall*(mobile?.006:.009))
  throw Error("0.25.1 surface detail not visibly present "+JSON.stringify(stats));
 if(stats.newWallMean>stats.oldWallMean+8.0)
  throw Error("0.25.1 recreated glowing cyan wall wash "+JSON.stringify(stats));
 if(stats.newWallMean<stats.oldWallMean-6.0)
  throw Error("0.25.1 erased dark metal readability "+JSON.stringify(stats));
 if(road<300||roadSame/road<.97)
  throw Error("0.25.1 changed original road surface "+JSON.stringify(stats));
 if(oldHot>65&&hotKept/oldHot<.87)
  throw Error("0.25.1 dimmed real neon cores "+JSON.stringify(stats));
 if(whiteAfter>whiteBefore*1.12+25)
  throw Error("0.25.1 added uncontrolled white bloom "+JSON.stringify(stats));
 return stats;
}
try{
 await sleep(1200);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 async function load(memory,extra=""){
  const page=await browser.newPage({viewport:{width:1536,height:870}});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",m=>{
   if(m.type()==="error"&&/WebGLProgram|Shader Error|INVALID_OPERATION/i.test(m.text()))
    errors.push(m.text().slice(0,1700));
  });
  await page.addInitScript(n=>Object.defineProperty(navigator,"deviceMemory",
   {configurable:true,get:()=>n}),memory);
  await page.goto("http://127.0.0.1:8851/skyshift/?v=0.25.1"+
    "&artSmoke=1&microMetalSmoke=1&microMetalFrameProof=1"+
    "&trackRepairSmoke=1&waveSmoke=1&"+extra,
   {waitUntil:"domcontentloaded",timeout:65000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:90000});
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:35000});
  return page;
 }
 async function take(page,s,z,label,memory){
  await page.evaluate(n=>window.__skyshiftTrackRepairTeleport(n),s);
  if(z)await page.evaluate(n=>window.__skyshiftWaveSmoke(n),z);
  await page.waitForTimeout(650);
  const status=await page.evaluate(()=>window.__skyshiftMicroMetalProbe());
  if(!status.requested||!status.microMetal0251Enabled||
    status.microMetal0251Status!=="active"||
    status.microMetal0251Batches!==(memory===4?3:4)||
    status.microMetal0251LowMemory!==(memory===4)||
    !status.microMetal0251PreservesDarkGraphite||
    !status.microMetal0251PreservesNativeNeon||
    !status.microMetal0251SolarSealed||
    status.microMetal0251AddedDrawCalls!==0||
    status.microMetal0251AddedLights!==0||
    status.microMetal0251ChangesRoad!==false||
    status.microMetal0251ChangesShip!==false||
    status.microMetal0251ChangesGRIP!==false||
    status.microMetal0251ChangesPhysics!==false||
    status.roadSolarSeal!==1||!status.nativeWave)
   throw Error("0.25.1 original geometry/neon/physics unavailable "+JSON.stringify(status));
  inspect(await page.evaluate(()=>window.__skyshiftMicroMetalFrameProof()),
   label,{mobile:memory===4});
 }
 const high=await load(8);
 await take(high,40,0,"cyan-entry-40",8);
 await take(high,165,0,"cyan-mid-165",8);
 await take(high,165,2,"gold-mid-165",8);
 await take(high,165,3,"jade-mid-165",8);
 await take(high,320,3,"jade-exit-320",8);
 await high.close();
 const mobile=await load(4);
 await take(mobile,40,0,"mobile-cyan-40",4);
 await take(mobile,165,2,"mobile-gold-mid",4);
 await take(mobile,165,1,"mobile-violet-mid",4);
 await take(mobile,320,1,"mobile-violet-exit",4);
 await mobile.close();
 const classic=await load(8,"microMetal=classic");
 const status=await classic.evaluate(()=>window.__skyshiftMicroMetalProbe());
 if(status.requested||status.microMetal0251Enabled)
  throw Error("0.25.0 exact comparison no longer available "+JSON.stringify(status));
 await classic.close();
 if(errors.length)throw Error("0.25.1 WebGL shader errors "+errors.join(" | "));
 console.log("PASS SKYSHIFT 0.25.1 real brushed metal and neon/road/4GB invariants");
}finally{await browser?.close();server.kill("SIGTERM");}
