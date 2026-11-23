// SKYSHIFT 0.25.0 — evidence-first actual WebGL before/after study.
// Dark graphite must ACTUALLY be darker than 0.24.2 across the entire
// tunnel, retaining hot native neon cores and unchanged driving corridor.
// Saved screenshots are the final authority, not static mockup imagery.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chrome required for 0.25.0 material foundation QA");
const server=spawn("python3",["-m","http.server","8850","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;const errors=[],proof=[];
const lum=(p,i)=>.2126*p[i]+.7152*p[i+1]+.0722*p[i+2];
function check(pair,label,{mobile=false}={}){
 const a=PNG.sync.read(Buffer.from(pair.classic,"base64"));
 const b=PNG.sync.read(Buffer.from(pair.dark,"base64"));
 const mask=PNG.sync.read(Buffer.from(pair.roadMask,"base64"));
 const empty=PNG.sync.read(Buffer.from(pair.emptyMask,"base64"));
 if(a.width!==b.width||a.height!==b.height||
    mask.width!==a.width||empty.width!==a.width||
    mask.height!==a.height||empty.height!==a.height)
  throw Error("0.25.0 A/B road silhouette size mismatch");
 for(const k of ["classic","dark"])
  writeFileSync("skyshift-v0250-"+label+"-"+k+".png",Buffer.from(pair[k],"base64"));
 let oldWall=0,newWall=0,samples=0,darkened=0,lightened=0;
 let unchangedRoad=0,roadSamples=0,whiteBefore=0,whiteAfter=0;
 let oldHot=0,newHotRetained=0,warmLights=0,changedWall=0;
 const W=a.width,H=a.height,A=a.data,B=b.data;
 for(let y=Math.floor(H*.10);y<Math.floor(H*.92);y+=3)
  for(let x=Math.floor(W*.04);x<Math.floor(W*.96);x+=3){
   const i=(y*W+x)*4,old=lum(A,i),now=lum(B,i);
   const delta=Math.abs(A[i]-B[i])+Math.abs(A[i+1]-B[i+1])+
    Math.abs(A[i+2]-B[i+2]);
   if(y<H*.62 && (x<W*.43||x>W*.57)){
    samples++;oldWall+=old;newWall+=now;
    if(now<old-8)darkened++;
    if(now>old+8)lightened++;
    if(delta>21)changedWall++;
    // Track the TRUE bright saturated cyan/zone neon cores, not the
    // globally tinted medium-bright metal that we intentionally replace.
    const peak=Math.max(A[i],A[i+1],A[i+2]);
    if(peak>238&&Math.min(A[i],A[i+1],A[i+2])<175){
     oldHot++;
     if(Math.max(B[i],B[i+1],B[i+2])>178)newHotRetained++;
    }
    if(B[i]>90&&B[i]>B[i+1]*1.20&&B[i+1]>B[i+2]*1.25)
     warmLights++;
   }
   // Only the REAL visible road silhouette, rather than a fixed
   // screen-space rectangle that may contain a wall on banked turns.
   const M=mask.data,E=empty.data;
   const roadDelta=Math.abs(M[i]-E[i])+Math.abs(M[i+1]-E[i+1])+
    Math.abs(M[i+2]-E[i+2]);
   if(roadDelta>115){
    roadSamples++;
    if(delta<23)unchangedRoad++;
   }
   if(Math.min(A[i],A[i+1],A[i+2])>237)whiteBefore++;
   if(Math.min(B[i],B[i+1],B[i+2])>237)whiteAfter++;
  }
 const stats={label,mobile,position:pair.position,wallSamples:samples,
  oldWallMean:+(oldWall/Math.max(samples,1)).toFixed(2),
  darkWallMean:+(newWall/Math.max(samples,1)).toFixed(2),
  darkened,lightened,changedWall,oldHot,newHotRetained,warmLights,
  roadSamples,unchangedRoad,whiteBefore,whiteAfter};
 proof.push(stats);writeFileSync("skyshift-v0250-proof.json",JSON.stringify(proof,null,2));
 console.log("DARK_METAL_0250 "+JSON.stringify(stats));
 if(samples<1000||changedWall<samples*.30)
  throw Error("0.25.0 dark foundation not visibly different "+JSON.stringify(stats));
 if(stats.darkWallMean>stats.oldWallMean*.77)
  throw Error("0.25.0 wall/roof still cyan-washed "+JSON.stringify(stats));
 if(darkened<samples*.37)
  throw Error("0.25.0 dark graphite absent from most wall "+JSON.stringify(stats));
 if(oldHot>75&&newHotRetained/oldHot<.48)
  throw Error("0.25.0 original bright neon sources extinguished "+JSON.stringify(stats));
 if(roadSamples<300||unchangedRoad/roadSamples<.76)
  throw Error("0.25.0 driving corridor changed "+JSON.stringify(stats));
 if(whiteAfter>whiteBefore*1.15+45)
  throw Error("0.25.0 white flood returned "+JSON.stringify(stats));
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
    errors.push(m.text().slice(0,1600));
  });
  await page.addInitScript(n=>Object.defineProperty(navigator,"deviceMemory",
   {configurable:true,get:()=>n}),memory);
  await page.goto("http://127.0.0.1:8850/skyshift/?v=0.25.0"+
    "&artSmoke=1&darkMetalSmoke=1&darkMetalFrameProof=1"+
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
  await page.waitForTimeout(600);
  const state=await page.evaluate(()=>window.__skyshiftDarkMetalProbe());
  if(!state.requested||!state.darkMetal0250Enabled||
   state.darkMetal0250Status!=="active"||
   state.darkMetal0250LowMemory!==(memory===4)||
   state.darkMetal0250Batches!==(memory===4?3:4)||
   state.darkMetal0250Fixtures!==20||
   !state.darkMetal0250NativeEmitterUntouched||
   !state.darkMetal0250SolarSealed||
   state.darkMetal0250AddedDynamicLights!==0||
   state.darkMetal0250AddedDrawCalls!==1||
   state.darkMetal0250ChangesPhysics!==false||
   state.darkMetal0250ChangesGRIP!==false||
   state.darkMetal0250ChangesRoad!==false||
   state.darkMetal0250ChangesShip!==false||
   state.roadSolarSeal!==1||!state.nativeWave)
    throw Error("0.25.0 baseline/sun/flight not intact "+JSON.stringify(state));
  const capture=await page.evaluate(()=>window.__skyshiftDarkMetalFrameProof());
  check(capture,label,{mobile:memory===4});
 }
 const hi=await load(8);
 await take(hi,43,0,"cyan-entry-43",8);
 await take(hi,165,0,"cyan-165",8);
 await take(hi,165,2,"gold-165",8);
 await take(hi,165,3,"jade-165",8);
 await take(hi,324,3,"jade-exit-324",8);
 await hi.close();
 const mobile=await load(4);
 await take(mobile,43,0,"mobile-cyan-43",4);
 await take(mobile,165,2,"mobile-gold-165",4);
 await take(mobile,165,1,"mobile-violet-165",4);
 await take(mobile,325,1,"mobile-violet-exit-325",4);
 await mobile.close();
 const classic=await load(8,"darkMetal=classic");
 const status=await classic.evaluate(()=>window.__skyshiftDarkMetalProbe());
 if(status.requested||status.darkMetal0250Enabled)
  throw Error("0.25.0 exact 0.24.2 look no longer available "+JSON.stringify(status));
 await classic.close();
 if(errors.length)throw Error("0.25.0 GPU shader errors "+errors.join(" | "));
 console.log("PASS SKYSHIFT 0.25.0 dark graphite / local neons / warm practicallights real WebGL");
}finally{await browser?.close();server.kill("SIGTERM");}
