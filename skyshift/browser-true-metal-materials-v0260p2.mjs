// SKYSHIFT 0.26.0 Pass 2 — REAL Chromium WebGL GGX/sun-seal A/B.
// Physical pass must change metal pixels, keep exact road and neon wave,
// and remain lightweight on simulated 4GB hardware. No mock rendering.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("0.26.0 P2 requires real Chromium + WebGL");
const server=spawn("python3",["-m","http.server","8860","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;const failures=[],proof=[];
const luma=(p,i)=>.2126*p[i]+.7152*p[i+1]+.0722*p[i+2];
function check(pair,label,mobile){
 const imgs=Object.fromEntries(["classic","physical","roadMask","emptyMask"]
  .map(k=>[k,PNG.sync.read(Buffer.from(pair[k],"base64"))]));
 const a=imgs.classic,b=imgs.physical,m=imgs.roadMask,e=imgs.emptyMask;
 if([b,m,e].some(v=>v.width!==a.width||v.height!==a.height))
  throw Error("P2 changed camera or render target dimensions");
 for(const k of ["classic","physical"])
  writeFileSync("skyshift-v0260p2-"+label+"-"+k+".png",
   Buffer.from(pair[k],"base64"));
 const W=a.width,H=a.height,A=a.data,B=b.data,M=m.data,E=e.data;
 let metal=0,changed=0,positive=0,negative=0,road=0,roadSame=0;
 let oldSum=0,newSum=0,whiteOld=0,whiteNew=0,originalCore=0,retainedCore=0;
 for(let y=Math.floor(H*.07);y<Math.floor(H*.92);y+=3)
  for(let x=Math.floor(W*.035);x<Math.floor(W*.965);x+=3){
   const i=(y*W+x)*4;
   const diff=Math.abs(A[i]-B[i])+Math.abs(A[i+1]-B[i+1])+
    Math.abs(A[i+2]-B[i+2]);
   const roadPixel=Math.abs(M[i]-E[i])+Math.abs(M[i+1]-E[i+1])+
    Math.abs(M[i+2]-E[i+2])>115;
   if(roadPixel){road++;if(diff<24)roadSame++;continue;}
   if(y<H*.70&&(x<W*.45||x>W*.55)){
    metal++;oldSum+=luma(A,i);newSum+=luma(B,i);
    if(diff>9)changed++;
    if(luma(B,i)>luma(A,i)+2)positive++;
    if(luma(B,i)+2<luma(A,i))negative++;
    if(Math.max(A[i],A[i+1],A[i+2])>225){
     originalCore++;if(Math.max(B[i],B[i+1],B[i+2])>177)retainedCore++;
    }
   }
   if(Math.min(A[i],A[i+1],A[i+2])>236)whiteOld++;
   if(Math.min(B[i],B[i+1],B[i+2])>236)whiteNew++;
  }
 const stats={label,mobile,metal,changed,positive,negative,road,roadSame,
  oldLuma:+(oldSum/Math.max(metal,1)).toFixed(2),
  newLuma:+(newSum/Math.max(metal,1)).toFixed(2),
  whiteOld,whiteNew,originalCore,retainedCore};
 proof.push(stats);
 writeFileSync("skyshift-v0260p2-proof.json",JSON.stringify(proof,null,2));
 console.log("TRUE_METAL_0260_P2 "+JSON.stringify(stats));
 if(metal<400||changed<metal*(mobile?.008:.015))
  throw Error("P2 physical specular not visible "+JSON.stringify(stats));
 if(stats.newLuma>stats.oldLuma+12||stats.newLuma<stats.oldLuma-14)
  throw Error("P2 unbalanced full-tunnel lighting "+JSON.stringify(stats));
 if(road<250||roadSame/road<.94)
  throw Error("P2 changed original road pixels "+JSON.stringify(stats));
 if(originalCore>60&&retainedCore/originalCore<.83)
  throw Error("P2 native spectral emitters lost "+JSON.stringify(stats));
 if(whiteNew>whiteOld*1.20+80)
  throw Error("P2 white solar spill reintroduced "+JSON.stringify(stats));
}
try{
 await sleep(900);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 async function load(memory,extra=""){
  const page=await browser.newPage({viewport:{width:1536,height:870}});
  page.on("pageerror",e=>failures.push(e.message));
  page.on("console",msg=>{
   if(msg.type()==="error"&&/WebGLProgram|Shader Error|INVALID_OPERATION|THREE.WebGLProgram/i.test(msg.text()))
    failures.push(msg.text().slice(0,3500));
  });
  await page.addInitScript(v=>Object.defineProperty(navigator,"deviceMemory",
   {configurable:true,get:()=>v}),memory);
  await page.goto("http://127.0.0.1:8860/skyshift/?v=0.26.0"+
   "&artSmoke=1&trueMetalSmoke=1&trueMetalFrameProof=1"+
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
  await page.evaluate(v=>window.__skyshiftTrackRepairTeleport(v),s);
  if(zone)await page.evaluate(z=>window.__skyshiftWaveSmoke(z),zone);
  await page.waitForTimeout(650);
  const status=await page.evaluate(()=>window.__skyshiftTrueMetalProbe());
  if(!status.requested||!status.trueMetal0260P2Enabled||
   status.trueMetal0260P2Status!=="active"||
   status.trueMetal0260P2Pass!==2||
   status.trueMetal0260P2Material!=="MeshPhysicalMaterial"||
   !status.trueMetal0260P2NativeGGX||
   !status.trueMetal0260P2RealMetalness||
   !status.trueMetal0260P2RealRoughness||
   !status.trueMetal0260P2SolarSealed||
   !status.trueMetal0260P2BaseRetained||
   !status.trueMetal0260P2DualToneRetained||
   status.trueMetal0260P2Batches!==(memory===4?1:2)||
   status.trueMetal0260P2LowMemory!==(memory===4)||
   status.trueMetal0260P2AddedDynamicLights!==0||
   status.trueMetal0260P2AddedTextures!==0||
   status.trueMetal0260P2ChangesPhysics!==false||
   status.trueMetal0260P2ChangesGRIP!==false||
   status.trueMetal0260P2ChangesShip!==false||
   status.trueMetal0260P2ChangesRoad!==false||
   status.roadSolarSeal!==1||!status.nativeWave)
   throw Error("P2 real physical source or flight guard failed "+JSON.stringify(status));
  const pair=await page.evaluate(()=>window.__skyshiftTrueMetalFrameProof());
  check(pair,label,memory===4);
 }
 const desktop=await load(8);
 await take(desktop,45,0,"cyan-entry",8);
 await take(desktop,165,1,"violet-mid",8);
 await take(desktop,165,2,"gold-mid",8);
 await take(desktop,320,3,"jade-exit",8);
 await desktop.close();
 const mobile=await load(4);
 await take(mobile,165,1,"mobile-violet",4);
 await take(mobile,165,2,"mobile-gold",4);
 await mobile.close();
 const classic=await load(8,"trueMetal=classic");
 const status=await classic.evaluate(()=>window.__skyshiftTrueMetalProbe());
 if(status.requested||status.trueMetal0260P2Enabled)
  throw Error("P2 trueMetal=classic failed to restore original P1 "+JSON.stringify(status));
 await classic.close();
 if(failures.length)
  throw Error("P2 WebGL program or shader errors: "+failures.join(" | "));
 console.log("PASS SKYSHIFT 0.26.0 P2 real Three GGX solar-sealed physical metal 8GB & 4GB");
}finally{await browser?.close();server.kill("SIGTERM");}
