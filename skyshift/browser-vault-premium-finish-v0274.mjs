// SKYSHIFT 0.27.4 real Chromium/WebGL, exact-frame 0.27.3 vs 0.27.4.
// Checks 3400m High and the A51-class 4GB profile WITHOUT forcing a
// high-end shader/extra geometry onto lower-memory hardware.
// Camera, simulation, HDR passes and fixtures are IDENTICAL in the pair.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("SKYSHIFT 0.27.4 requires real Chromium WebGL");
const srv=spawn("python3",["-m","http.server","8884","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
const errors=[],reports=[];let browser;
function audit(pair,label,mobile){
 const before=PNG.sync.read(Buffer.from(pair.classic,"base64"));
 const after=PNG.sync.read(Buffer.from(pair.premium,"base64"));
 if(before.width!==1536||before.height!==870||
  after.width!==before.width||after.height!==before.height)
  throw Error("0.27.4 missing identical-resolution real-game A/B");
 for(const key of ["classic","premium"])
  writeFileSync("skyshift-v0274-"+label+"-"+key+".png",
   Buffer.from(pair[key],"base64"));
 const w=before.width,h=before.height,dataA=before.data,dataB=after.data;
 const lum=(a,i)=>a[i]*.2126+a[i+1]*.7152+a[i+2]*.0722;
 const x={label,mobile,s:pair.s,sideN:0,changed:0,strong:0,
  sideBefore:0,sideAfter:0,roadN:0,roadBefore:0,roadAfter:0,
  cyanBefore:0,cyanAfter:0,amberBefore:0,amberAfter:0,
  whiteBefore:0,whiteAfter:0,darkBefore:0,darkAfter:0};
 for(let y=95;y<h-32;y+=3)for(let px=38;px<w-38;px+=3){
  const i=4*(y*w+px),xx=px/w,yy=y/h;
  const l0=lum(dataA,i),l1=lum(dataB,i);
  const diff=Math.abs(dataA[i]-dataB[i])+Math.abs(dataA[i+1]-dataB[i+1])+
   Math.abs(dataA[i+2]-dataB[i+2]);
  if(xx<.39||xx>.61||yy<.48){
   x.sideN++;x.sideBefore+=l0;x.sideAfter+=l1;
   if(diff>5)x.changed++;
   if(diff>19)x.strong++;
   if(dataA[i+2]>dataA[i]*1.4&&dataA[i+1]>dataA[i]*1.3&&dataA[i+2]>65)x.cyanBefore++;
   if(dataB[i+2]>dataB[i]*1.4&&dataB[i+1]>dataB[i]*1.3&&dataB[i+2]>65)x.cyanAfter++;
   if(dataA[i]>dataA[i+2]*1.3&&dataA[i]>dataA[i+1]*1.04&&dataA[i]>80)x.amberBefore++;
   if(dataB[i]>dataB[i+2]*1.3&&dataB[i]>dataB[i+1]*1.04&&dataB[i]>80)x.amberAfter++;
  }
  if(xx>.43&&xx<.57&&yy>.73){
   x.roadN++;x.roadBefore+=l0;x.roadAfter+=l1;
  }
  if(Math.min(dataA[i],dataA[i+1],dataA[i+2])>239)x.whiteBefore++;
  if(Math.min(dataB[i],dataB[i+1],dataB[i+2])>239)x.whiteAfter++;
  if(l0<11)x.darkBefore++;if(l1<11)x.darkAfter++;
 }
 x.sideChangePct=+(100*x.changed/x.sideN).toFixed(2);
 x.sideStrongPct=+(100*x.strong/x.sideN).toFixed(2);
 x.sideMeanClassic=+(x.sideBefore/x.sideN).toFixed(2);
 x.sideMeanPremium=+(x.sideAfter/x.sideN).toFixed(2);
 x.roadMeanClassic=+(x.roadBefore/x.roadN).toFixed(2);
 x.roadMeanPremium=+(x.roadAfter/x.roadN).toFixed(2);
 reports.push(x);
 writeFileSync("skyshift-v0274-proof.json",JSON.stringify(reports,null,2));
 console.log("PREMIUM_FINISH_0274 "+JSON.stringify(x));
 if(x.sideChangePct<(mobile?.16:.30))
  throw Error("0.27.4 has no observable source-aware metal change "+JSON.stringify(x));
 if(x.roadMeanPremium>x.roadMeanClassic+2.5)
  throw Error("0.27.4 brightened the unrelated road "+JSON.stringify(x));
 if(x.whiteAfter>x.whiteBefore*1.22+65)
  throw Error("0.27.4 introduced unwanted global white spill "+JSON.stringify(x));
 if(x.darkAfter<x.darkBefore*.67)
  throw Error("0.27.4 erased the dark tunnel recesses "+JSON.stringify(x));
 if(x.cyanAfter<x.cyanBefore*.82)
  throw Error("0.27.4 destroyed existing cyan source identity "+JSON.stringify(x));
 if(x.amberBefore>15&&x.amberAfter<x.amberBefore*.70)
  throw Error("0.27.4 erased authentic amber fixtures "+JSON.stringify(x));
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
    errors.push(m.text().slice(0,2800));
  });
  await page.addInitScript(v=>Object.defineProperty(navigator,"deviceMemory",
   {configurable:true,get:()=>v}),memory);
  await page.goto("http://127.0.0.1:8884/skyshift/?track=vault&v=0.27.4"+
   "&vaultFinishSmoke=1&vaultFinishFrameProof=1&trackRepairSmoke=1&waveSmoke=1&"+extra,
   {waitUntil:"domcontentloaded",timeout:65000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:95000});
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:35000});
  return page;
 }
 async function take(page,s,zone,label,memory){
  await page.evaluate(m=>window.__skyshiftTrackRepairTeleport(m),s);
  if(zone)await page.evaluate(z=>window.__skyshiftWaveSmoke(z),zone);
  await page.waitForTimeout(650);
  const q=await page.evaluate(()=>window.__skyshiftVaultFinishProbe());
  const lamp=q.fullLighting??{},arch=q.architecture??{};
  if(q.selected!=="vault"||!q.requested||!q.active||
   q.version!=="0.27.4"||q.enabledAmount!==1||
   !q.sculptedPanelsRetained||!q.originalFixtureBaysRetained||
   !q.priorGGXRetained||!q.onlyVault||
   q.atlasCountAdded!==0||q.worldLightsAdded!==0||
   q.drawCallsAdded!==0||q.geometryAdded!==0||
   q.shaderLightSamplesAdded!==0||q.postprocessAdded!==0||
   !lamp.active||!lamp.nativeGGX||!lamp.actualSkylinePBRFunctions||
   lamp.physicalCoats!==(memory===4?20:40)||
   lamp.coveredMeters!==3400||arch.lengthMeters!==3400||
   arch.renderChunks!==20||arch.trueDepthMeters!==.58||
   arch.newMeshes!==(memory===4?20:40)||
   !q.materialParity?.active||q.materialParity.atlasCount!==1||
   q.foundation?.coverageMeters!==3400||
   q.originalRoad!=="MeshStandardMaterial"||
   !q.originalShip||!q.originalGrip||q.raceMeters!==10200||
   q.sunKeyScale>.035||q.cameraDistanceToPilotMeters>45)
   throw Error("0.27.4 native-geometry mobile fidelity check "+
    JSON.stringify(q));
  const pair=await page.evaluate(()=>window.__skyshiftVaultFinishFrameProof());
  if(Math.abs(pair.s-s)>.12)throw Error("0.27.4 snapshot not on real race position");
  audit(pair,label,memory===4);
 }
 const hi=await open(8);
 await take(hi,110,1,"high-start",8);
 await take(hi,985,2,"high-curve",8);
 await take(hi,1820,1,"high-return",8);
 await take(hi,3230,2,"high-finale",8);
 await hi.close();
 const low=await open(4);
 await take(low,110,1,"4gb-start",4);
 await take(low,1910,2,"4gb-return",4);
 await low.close();
 const classic=await open(8,"vaultFinish=classic");
 const old=await classic.evaluate(()=>window.__skyshiftVaultFinishProbe());
 if(old.requested||old.active||!old.fullLighting?.active||
  old.fullLighting?.version!=="0.27.3"||
  old.architecture?.lengthMeters!==3400)
  throw Error("0.27.4 classic did not preserve original 0.27.3 full tunnel");
 await classic.close();
 if(errors.length)throw Error("0.27.4 real GPU shader compilation errors "+
  errors.join(" | "));
 console.log("PASS SKYSHIFT 0.27.4 genuine premium metal finish full 3400m High/4GB");
}finally{await browser?.close();srv.kill("SIGTERM");}
