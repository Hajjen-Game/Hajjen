// SKYSHIFT 0.27.1 – REAL Chromium/WebGL same-frame, fixed-camera
// material A/B from the actually running game. No AI generated images.
// Both states share exactly the same geometry, HDR pipeline and lighting.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("0.27.1 genuine Chromium/WebGL required");
const server=spawn("python3",["-m","http.server","8876","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
const errors=[],report=[];let browser;
const luminance=(data,k)=>data[k]*.2126+data[k+1]*.7152+data[k+2]*.0722;
function compare(pair,label,mobile){
 const classic=PNG.sync.read(Buffer.from(pair.classic,"base64"));
 const parity=PNG.sync.read(Buffer.from(pair.parity,"base64"));
 if(classic.width!==1536||classic.height!==870||
  parity.width!==classic.width||parity.height!==classic.height)
  throw Error("0.27.1 same-frame resolution changed");
 for(const mode of ["classic","parity"])
  writeFileSync("skyshift-v0271-"+label+"-"+mode+".png",
   Buffer.from(pair[mode],"base64"));
 const w=classic.width,h=classic.height;
 const metrics={label,s:pair.s,mobile,pixels:0,
  wallChanged:0,wallStrong:0,wallBefore:0,wallAfter:0,wallPixels:0,
  roadBefore:0,roadAfter:0,roadPixels:0,
  whiteBefore:0,whiteAfter:0,coolBefore:0,coolAfter:0,
  nearBlackBefore:0,nearBlackAfter:0};
 for(let y=95;y<h-32;y+=3)for(let x=38;x<w-38;x+=3){
  const k=(y*w+x)*4,xx=x/w,yy=y/h;
  const old=luminance(classic.data,k),now=luminance(parity.data,k);
  const d=Math.abs(classic.data[k]-parity.data[k])+
   Math.abs(classic.data[k+1]-parity.data[k+1])+
   Math.abs(classic.data[k+2]-parity.data[k+2]);
  metrics.pixels++;
  if(Math.min(classic.data[k],classic.data[k+1],classic.data[k+2])>238)metrics.whiteBefore++;
  if(Math.min(parity.data[k],parity.data[k+1],parity.data[k+2])>238)metrics.whiteAfter++;
  if(old<13)metrics.nearBlackBefore++;
  if(now<13)metrics.nearBlackAfter++;
  // Wall/titanium side profile, excluding most bright lower track.
  if(xx<.37||xx>.63||yy<.48){
   metrics.wallPixels++;
   metrics.wallBefore+=old;metrics.wallAfter+=now;
   if(d>7)metrics.wallChanged++;if(d>21)metrics.wallStrong++;
   if(classic.data[k+2]>classic.data[k]*1.5&&
    classic.data[k+1]>classic.data[k]*1.4&&classic.data[k+2]>70)
    metrics.coolBefore++;
   if(parity.data[k+2]>parity.data[k]*1.5&&
    parity.data[k+1]>parity.data[k]*1.4&&parity.data[k+2]>70)
    metrics.coolAfter++;
  }
  if(xx>.43&&xx<.57&&yy>.71){
   metrics.roadBefore+=old;metrics.roadAfter+=now;metrics.roadPixels++;
  }
 }
 metrics.wallChangePct=+(100*metrics.wallChanged/metrics.wallPixels).toFixed(2);
 metrics.wallMeanClassic=+(metrics.wallBefore/metrics.wallPixels).toFixed(2);
 metrics.wallMeanParity=+(metrics.wallAfter/metrics.wallPixels).toFixed(2);
 metrics.roadMeanClassic=+(metrics.roadBefore/metrics.roadPixels).toFixed(2);
 metrics.roadMeanParity=+(metrics.roadAfter/metrics.roadPixels).toFixed(2);
 report.push(metrics);
 writeFileSync("skyshift-v0271-proof.json",JSON.stringify(report,null,2));
 console.log("VAULT_METAL_0271 "+JSON.stringify(metrics));
 // Deliberately fail if the original new metal shows no measurable effect.
 if(metrics.wallChangePct<(mobile?.24:.50))
  throw Error("0.27.1 no meaningful change in metal panels "+JSON.stringify(metrics));
 if(metrics.roadMeanParity>metrics.roadMeanClassic+2.8)
  throw Error("0.27.1 brightened unrelated racing deck "+JSON.stringify(metrics));
 if(metrics.whiteAfter>metrics.whiteBefore*1.10+40)
  throw Error("0.27.1 reintroduced exterior white light "+JSON.stringify(metrics));
 if(metrics.nearBlackAfter<metrics.nearBlackBefore*.65)
  throw Error("0.27.1 washed out dark tunnel contrast "+JSON.stringify(metrics));
 if(metrics.coolAfter<metrics.coolBefore*.64)
  throw Error("0.27.1 lost cyan fixture light identity "+JSON.stringify(metrics));
}
try{
 await sleep(850);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 async function open(memory,extra=""){
  const page=await browser.newPage({viewport:{width:1536,height:870}});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",m=>{
   if(m.type()==="error"&&/Shader Error|WebGLProgram|INVALID_OPERATION|THREE.WebGLProgram/i.test(m.text()))
    errors.push(m.text().slice(0,3000));
  });
  await page.addInitScript(value=>Object.defineProperty(navigator,
   "deviceMemory",{configurable:true,get:()=>value}),memory);
  await page.goto("http://127.0.0.1:8876/skyshift/?track=vault&v=0.27.1"+
   "&vaultMaterialSmoke=1&vaultMaterialFrameProof=1&trackRepairSmoke=1"+
   "&waveSmoke=1&"+extra,{waitUntil:"domcontentloaded",timeout:65000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:90000});
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:35000});
  return page;
 }
 async function take(page,s,zone,label,memory){
  await page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),s);
  if(zone)await page.evaluate(z=>window.__skyshiftWaveSmoke(z),zone);
  await page.waitForTimeout(700);
  const audit=await page.evaluate(()=>window.__skyshiftVaultMaterialProbe());
  if(!audit.requested||!audit.active||audit.status!=="active"||
   audit.selected!=="vault"||audit.version!=="0.27.1"||
   audit.atlasSize!==(memory===4?128:256)||audit.atlasCount!==1||
   audit.decoratedMeshCount!==40||audit.decoratedSpanMeters!==3400||
   audit.materialPrograms!==2||audit.addedDrawCalls!==0||
   audit.addedMeshes!==0||audit.addedDynamicLights!==0||
   audit.addedRenderPasses!==0||!audit.sourceFixturesUnchanged||
   !audit.solarSealUnchanged||!audit.existingRoadUnchanged||
   !audit.existingRailUnchanged||!audit.racingPhysicsUnchanged||
   !audit.skylineAndAuroraUnchanged||!audit.foundation?.active||
   audit.foundation?.chunks!==20||audit.foundation?.drawBatches!==60||
   audit.foundation?.coverageMeters!==3400||
   audit.solar>.035||audit.road!=="MeshStandardMaterial"||
   !audit.originalShip||!audit.originalGrip||audit.originalTrackLength!==3400)
   throw Error("0.27.1 packed-atlas material invariants "+JSON.stringify(audit));
  compare(await page.evaluate(()=>window.__skyshiftVaultMaterialFrameProof()),
   label,memory===4);
 }
 const high=await open(8);
 await take(high,110,1,"high-launch",8);
 await take(high,990,2,"high-curve",8);
 await take(high,1840,2,"high-return",8);
 await take(high,3230,1,"high-final",8);
 await high.close();
 const mobile=await open(4);
 await take(mobile,110,1,"4gb-launch",4);
 await take(mobile,1910,2,"4gb-return",4);
 await mobile.close();
 const original=await open(8,"vaultMaterial=classic");
 const previous=await original.evaluate(()=>window.__skyshiftVaultMaterialProbe());
 if(previous.requested||previous.active||!previous.foundation?.active||
   previous.foundation?.coverageMeters!==3400)
  throw Error("0.27.1 classic did not reproduce 0.27.0 tunnel");
 await original.close();
 if(errors.length)throw Error("0.27.1 real WebGL material program errors: "+
  errors.join(" | "));
 console.log("PASS SKYSHIFT 0.27.1: original 0.26.2 atlas across 3400m Vault metal High and 4GB");
}finally{await browser?.close();server.kill("SIGTERM");}
