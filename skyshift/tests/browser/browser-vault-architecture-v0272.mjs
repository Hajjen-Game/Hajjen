// SKYSHIFT 0.27.2: true Chromium/SwiftShader screenshots from the live game
// comparing the SAME 0.27.1 frame with Skyline's actual 3D raised panels.
// No AI image substitute, no world geometry/camera/ship/physics alterations.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("SKYSHIFT 0.27.2 requires real Chromium WebGL");
const srv=spawn("python3",["-m","http.server","8879","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
const errors=[],proof=[];let browser;
function compare(pair,label,mobile){
 const old=PNG.sync.read(Buffer.from(pair.classic,"base64"));
 const now=PNG.sync.read(Buffer.from(pair.architecture,"base64"));
 if(old.width!==1536||old.height!==870||now.width!==old.width||
  now.height!==old.height)throw Error("0.27.2 mismatched real WebGL frames");
 for(const k of ["classic","architecture"])
  writeFileSync("skyshift-v0272-"+label+"-"+k+".png",
   Buffer.from(pair[k],"base64"));
 const w=old.width,h=old.height,m={
  label,s:pair.s,mobile,sidePixels:0,sideChange:0,sideStrong:0,
  sideBefore:0,sideAfter:0,roadPixels:0,roadBefore:0,roadAfter:0,
  cyanBefore:0,cyanAfter:0,whiteBefore:0,whiteAfter:0,
  blackBefore:0,blackAfter:0
 };
 const lum=(a,i)=>a[i]*.2126+a[i+1]*.7152+a[i+2]*.0722;
 for(let y=95;y<h-32;y+=3)for(let x=38;x<w-38;x+=3){
  const i=4*(y*w+x),xx=x/w,yy=y/h;
  const a=old.data,b=now.data,before=lum(a,i),after=lum(b,i);
  const d=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);
  if(xx<.39||xx>.61||yy<.48){
   m.sidePixels++;m.sideBefore+=before;m.sideAfter+=after;
   if(d>9)m.sideChange++;if(d>30)m.sideStrong++;
   if(a[i+1]>a[i]*1.4&&a[i+2]>a[i]*1.5&&a[i+2]>65)m.cyanBefore++;
   if(b[i+1]>b[i]*1.4&&b[i+2]>b[i]*1.5&&b[i+2]>65)m.cyanAfter++;
  }
  if(xx>.43&&xx<.57&&yy>.73){
   m.roadPixels++;m.roadBefore+=before;m.roadAfter+=after;
  }
  if(Math.min(a[i],a[i+1],a[i+2])>239)m.whiteBefore++;
  if(Math.min(b[i],b[i+1],b[i+2])>239)m.whiteAfter++;
  if(before<11)m.blackBefore++;if(after<11)m.blackAfter++;
 }
 m.sideChangePct=+(m.sideChange/m.sidePixels*100).toFixed(2);
 m.sideStrongPct=+(m.sideStrong/m.sidePixels*100).toFixed(2);
 m.sideMeanBefore=+(m.sideBefore/m.sidePixels).toFixed(2);
 m.sideMeanAfter=+(m.sideAfter/m.sidePixels).toFixed(2);
 m.roadMeanBefore=+(m.roadBefore/m.roadPixels).toFixed(2);
 m.roadMeanAfter=+(m.roadAfter/m.roadPixels).toFixed(2);
 proof.push(m);writeFileSync("skyshift-v0272-proof.json",JSON.stringify(proof,null,2));
 console.log("ARCHITECTURAL_0272 "+JSON.stringify(m));
 // A true geometry pass MUST visibly change side-wall silhouette/panels.
 if(m.sideChangePct<(mobile?1.2:2.2))
  throw Error("0.27.2 no actual architectural geometry visible "+JSON.stringify(m));
 if(m.roadMeanAfter>m.roadMeanBefore+4.2)
  throw Error("0.27.2 washed out race deck "+JSON.stringify(m));
 if(m.whiteAfter>m.whiteBefore*1.20+50)
  throw Error("0.27.2 reintroduced outside white-sun spill "+JSON.stringify(m));
 if(m.blackAfter<m.blackBefore*.56)
  throw Error("0.27.2 erased essential dark tunnel recesses "+JSON.stringify(m));
 if(m.cyanAfter<m.cyanBefore*.55)
  throw Error("0.27.2 obscured cyan fixture architecture "+JSON.stringify(m));
}
try{
 await sleep(800);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 async function open(memory,extra=""){
  const page=await browser.newPage({viewport:{width:1536,height:870}});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",m=>{
   if(m.type()==="error"&&/Shader Error|WebGLProgram|INVALID_OPERATION|THREE.WebGLProgram/i.test(m.text()))
    errors.push(m.text().slice(0,2900));
  });
  await page.addInitScript(v=>Object.defineProperty(navigator,"deviceMemory",
   {configurable:true,get:()=>v}),memory);
  await page.goto("http://127.0.0.1:8879/skyshift/?track=vault&v=0.27.2"+
   "&vaultArchitectureSmoke=1&vaultArchitectureFrameProof=1"+
   "&trackRepairSmoke=1&waveSmoke=1&"+extra,
   {waitUntil:"domcontentloaded",timeout:65000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:90000});
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:40000});
  return page;
 }
 async function take(page,s,zone,label,memory){
  await page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),s);
  if(zone)await page.evaluate(z=>window.__skyshiftWaveSmoke(z),zone);
  await page.waitForTimeout(700);
  const q=await page.evaluate(()=>window.__skyshiftVaultArchitectureProbe());
  if(q.selected!=="vault"||!q.requested||!q.active||
   q.version!=="0.27.2"||q.status!=="active"||
   q.lengthMeters!==3400||q.renderChunks!==20||
   q.trueDepthMeters!==.58||
   q.newDrawCalls!==(memory===4?20:40)||
   q.newMeshes!==(memory===4?20:40)||
   q.triangles<40000||q.panels<80||
   q.worldLightsAdded!==0||q.newColliders!==0||
   q.postprocessPassesAdded!==0||q.roadUnchanged!==true||
   q.railUnchanged!==true||q.shipUnchanged!==true||
   q.physicsUnchanged!==true||q.GRIPUnchanged!==true||
   q.skylineUnchanged!==true||q.auroraUnchanged!==true||
   !q.metalAtlasShared||!q.materialParity?.active||
   q.materialParity?.atlasCount!==1||
   !q.foundation?.active||q.foundation.coverageMeters!==3400||
   q.foundation.drawBatches!==60||
   q.originalRoad!=="MeshStandardMaterial"||
   !q.originalShip||!q.gripPresent||
   q.raceDistance!==10200||q.sunKeyScale>.035||
   q.cameraDistanceToPilotMeters>45)
   throw Error("0.27.2 source builder/flight/metal invariants "+
    JSON.stringify(q));
  const pair=await page.evaluate(()=>window.__skyshiftVaultArchitectureFrameProof());
  if(Math.abs(pair.s-s)>.12)throw Error("test position was not followed by ship");
  compare(pair,label,memory===4);
 }
 const hi=await open(8);
 await take(hi,110,1,"high-launch",8);
 await take(hi,995,2,"high-curve",8);
 await take(hi,1840,1,"high-return",8);
 await take(hi,3230,2,"high-finale",8);
 await hi.close();
 const low=await open(4);
 await take(low,110,1,"4gb-launch",4);
 await take(low,1910,2,"4gb-return",4);
 await low.close();
 const classic=await open(8,"vaultArchitecture=classic");
 const before=await classic.evaluate(()=>window.__skyshiftVaultArchitectureProbe());
 if(before.requested||before.active||!before.materialParity?.active||
  before.foundation?.coverageMeters!==3400)
  throw Error("0.27.2 classic failed to preserve exact 0.27.1 shell");
 await classic.close();
 if(errors.length)throw Error("0.27.2 real WebGL shader compile errors: "+
  errors.join(" | "));
 console.log("PASS 0.27.2 full 3400m real Skyline physical panel sculpture High+4GB WebGL");
}finally{await browser?.close();srv.kill("SIGTERM");}
