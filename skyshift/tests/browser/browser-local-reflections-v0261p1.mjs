// SKYSHIFT 0.26.1 Pass 1 — real GPU A/B with existing physical-metal base.
// Compare identical camera, ship, zone wave and frame with native emissive,
// old shadow room, road and white spill safeguards. No mocked screenshots.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as delay} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,
 "/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"]
 .filter(Boolean).find(existsSync);
if(!chrome)throw Error("0.26.1 local reflection proof requires real Chromium/WebGL");
const server=spawn("python3",["-m","http.server","8860","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
const errors=[],proof=[];let browser;
const toPng=base64=>PNG.sync.read(Buffer.from(base64,"base64"));
function compare(result,label,mobile){
 const before=toPng(result.classic),after=toPng(result.local),
  mask=toPng(result.roadMask),empty=toPng(result.emptyMask);
 if([after,mask,empty].some(x=>x.width!==before.width||x.height!==before.height))
  throw Error("0.26.1 camera/render target size changed");
 const A=before.data,B=after.data,M=mask.data,E=empty.data;
 const W=before.width,H=before.height;
 let metals=0,changed=0,brightened=0,darkened=0,
     road=0,roadSame=0,whitesBefore=0,whitesAfter=0,
     blueBefore=0,blueAfter=0,orangeBefore=0,orangeAfter=0,
     sumBefore=0,sumAfter=0,peakDelta=0;
 for(let y=Math.floor(H*.09);y<Math.floor(H*.84);y+=3)
 for(let x=Math.floor(W*.04);x<Math.floor(W*.96);x+=3){
  const i=(y*W+x)*4;
  const roadPixel=Math.abs(M[i]-E[i])+Math.abs(M[i+1]-E[i+1])+
    Math.abs(M[i+2]-E[i+2])>120;
  const delta=Math.abs(A[i]-B[i])+Math.abs(A[i+1]-B[i+1])+
    Math.abs(A[i+2]-B[i+2]);
  if(roadPixel){road++;if(delta<25)roadSame++;continue;}
  if(y<H*.68&&(x<W*.46||x>W*.54)){
   metals++;
   const lo=(A[i]*.213+A[i+1]*.715+A[i+2]*.072);
   const ln=(B[i]*.213+B[i+1]*.715+B[i+2]*.072);
   sumBefore+=lo;sumAfter+=ln;
   if(delta>9)changed++;
   if(ln>lo+2)brightened++;
   if(ln+2<lo)darkened++;
   peakDelta=Math.max(peakDelta,delta);
   if(A[i+2]>A[i]*1.32&&A[i+1]>A[i]*1.25&&A[i+2]>75)blueBefore++;
   if(B[i+2]>B[i]*1.32&&B[i+1]>B[i]*1.25&&B[i+2]>75)blueAfter++;
   if(A[i]>A[i+2]*1.28&&A[i]>A[i+1]*1.15&&A[i]>95)orangeBefore++;
   if(B[i]>B[i+2]*1.28&&B[i]>B[i+1]*1.15&&B[i]>95)orangeAfter++;
  }
  if(Math.min(A[i],A[i+1],A[i+2])>234)whitesBefore++;
  if(Math.min(B[i],B[i+1],B[i+2])>234)whitesAfter++;
 }
 const stats={label,mobile,metals,changed,brightened,darkened,road,roadSame,
  whitesBefore,whitesAfter,blueBefore,blueAfter,orangeBefore,orangeAfter,
  meanOld:+(sumBefore/Math.max(1,metals)).toFixed(2),
  meanNew:+(sumAfter/Math.max(1,metals)).toFixed(2),peakDelta};
 proof.push(stats);writeFileSync("skyshift-v0261p1-proof.json",
  JSON.stringify(proof,null,2));
 for(const mode of ["classic","local"])
  writeFileSync("skyshift-v0261p1-"+label+"-"+mode+".png",
   Buffer.from(result[mode],"base64"));
 console.log("LOCAL_REFLECTIONS_0261 "+JSON.stringify(stats));
 if(metals<400||changed<metals*(mobile?.008:.014))
  throw Error("0.26.1 finite strips not visibly changing metal "+JSON.stringify(stats));
 if(stats.meanNew>stats.meanOld+13.0)
  throw Error("0.26.1 broad white/flat wash instead of localized GGX "+JSON.stringify(stats));
 if(road<160||roadSame/road<.94)
  throw Error("0.26.1 accidentally changed original road surface "+JSON.stringify(stats));
 if(whitesAfter>whitesBefore*1.14+60)
  throw Error("0.26.1 introduced exterior-looking white spill "+JSON.stringify(stats));
 if(blueBefore>80&&blueAfter<blueBefore*.80)
  throw Error("0.26.1 erased existing cyan emission "+JSON.stringify(stats));
 if(orangeBefore>40&&orangeAfter<orangeBefore*.70)
  throw Error("0.26.1 erased existing amber practicals "+JSON.stringify(stats));
}
try{
 await delay(950);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 async function start(memory,extra=""){
  const page=await browser.newPage({viewport:{width:1536,height:870}});
  page.on("pageerror",error=>errors.push(error.message));
  page.on("console",line=>{
   if(line.type()==="error"&&/Shader Error|WebGLProgram|INVALID_OPERATION/i.test(line.text()))
    errors.push(line.text().slice(0,3600));
  });
  await page.addInitScript(value=>Object.defineProperty(navigator,
   "deviceMemory",{configurable:true,get:()=>value}),memory);
  await page.goto("http://127.0.0.1:8860/skyshift/?v=0.26.1"+
   "&artSmoke=1&localReflectionsSmoke=1&localReflectionsFrameProof=1"+
   "&trackRepairSmoke=1&waveSmoke=1&"+extra,
   {waitUntil:"domcontentloaded",timeout:65000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:90000});
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:35000});
  return page;
 }
 async function take(page,s,stage,label,memory){
  await page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),s);
  if(stage>0)await page.evaluate(x=>window.__skyshiftWaveSmoke(x),stage);
  await page.waitForTimeout(680);
  const status=await page.evaluate(()=>window.__skyshiftLocalReflectionsProbe());
  if(!status.requested||!status.localReflections0261Enabled||
   status.localReflections0261Status!=="active"||
   status.localReflections0261Pass!==1||
   !status.localReflections0261RealPhysicalGGX||
   !status.localReflections0261FiniteStrips||
   !status.localReflections0261SunIsolated||
   !status.localReflections0261KeepUnifiedTunnelLighting||
   !status.trueMetal0260P2SolarSealed||
   !status.unifiedLighting||
   status.localReflections0261AddedDrawCalls!==0||
   status.localReflections0261AddedDynamicLights!==0||
   status.localReflections0261AddedTextureMaps!==0||
   status.localReflections0261AddedRenderPasses!==0||
   status.localReflections0261ChangesRoad!==false||
   status.localReflections0261ChangesShip!==false||
   status.localReflections0261ChangesGRIP!==false||
   status.localReflections0261ChangesNativeNeon!==false||
   status.localReflections0261LocalMaterials!==(memory===4?1:2)||
   status.localReflections0261Mobile!==(memory===4)||
   status.roadSolarSeal!==1||!status.nativeWave)
   throw Error("0.26.1 real metal/unified lighting source invariants failed "+
    JSON.stringify(status));
  const frames=await page.evaluate(()=>window.__skyshiftLocalReflectionsFrameProof());
  compare(frames,label,memory===4);
 }
 const high=await start(8);
 await take(high,45,0,"high-cyan-entry",8);
 await take(high,165,1,"high-violet",8);
 await take(high,165,2,"high-gold",8);
 await take(high,320,3,"high-jade",8);
 await high.close();
 const low=await start(4);
 await take(low,165,1,"mobile-violet",4);
 await take(low,165,2,"mobile-gold",4);
 await low.close();
 const old=await start(8,"localReflections=classic");
 const p=await old.evaluate(()=>window.__skyshiftLocalReflectionsProbe());
 if(p.requested||p.localReflections0261Enabled||
   !p.trueMetal0260P2Enabled)
  throw Error("0.26.1 A/B did not preserve exact 0.26.0 physical metal "+
   JSON.stringify(p));
 await old.close();
 if(errors.length)throw Error("0.26.1 WebGL shader program error "+
  errors.join(" | "));
 console.log("PASS SKYSHIFT 0.26.1 P1 authentic finite-strip GGX reflections 8GB/4GB");
}finally{await browser?.close();server.kill("SIGTERM");}
