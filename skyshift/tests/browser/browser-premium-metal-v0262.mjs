// 0.26.2 real WebGL / identical-frame A/B on physically lit titanium.
// A/B is a uniform switch — no camera move, fake screenshots or new road path.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as delay} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("0.26.2 needs real Chromium/WebGL");
const server=spawn("python3",["-m","http.server","8860","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;const failures=[],report=[];
const luma=(p,i)=>.2126*p[i]+.7152*p[i+1]+.0722*p[i+2];
function check(frame,label,mobile){
 const A=PNG.sync.read(Buffer.from(frame.classic,"base64"));
 const B=PNG.sync.read(Buffer.from(frame.premium,"base64"));
 const M=PNG.sync.read(Buffer.from(frame.roadMask,"base64"));
 const E=PNG.sync.read(Buffer.from(frame.emptyMask,"base64"));
 if([B,M,E].some(v=>v.width!==A.width||v.height!==A.height))
  throw Error("0.26.2 changed frame/camera dimensions");
 for(const mode of ["classic","premium"])
  writeFileSync("skyshift-v0262-"+label+"-"+mode+".png",
   Buffer.from(frame[mode],"base64"));
 const W=A.width,H=A.height;let metal=0,changed=0,road=0,roadSame=0,
  whiteOld=0,whiteNew=0,oldLuma=0,newLuma=0,peakDelta=0;
 for(let y=Math.floor(H*.09);y<Math.floor(H*.86);y+=3)
  for(let x=Math.floor(W*.04);x<Math.floor(W*.96);x+=3){
   const i=(y*W+x)*4;
   const roadPixel=Math.abs(M.data[i]-E.data[i])+
    Math.abs(M.data[i+1]-E.data[i+1])+
    Math.abs(M.data[i+2]-E.data[i+2])>115;
   const delta=Math.abs(A.data[i]-B.data[i])+
    Math.abs(A.data[i+1]-B.data[i+1])+
    Math.abs(A.data[i+2]-B.data[i+2]);
   if(roadPixel){road++;if(delta<25)roadSame++;continue;}
   if(y<H*.69&&(x<W*.46||x>W*.54)){
    metal++;oldLuma+=luma(A.data,i);newLuma+=luma(B.data,i);
    if(delta>8)changed++;
    peakDelta=Math.max(peakDelta,delta);
   }
   if(Math.min(A.data[i],A.data[i+1],A.data[i+2])>234)whiteOld++;
   if(Math.min(B.data[i],B.data[i+1],B.data[i+2])>234)whiteNew++;
  }
 const stats={label,mobile,metal,changed,road,roadSame,whiteOld,whiteNew,
  peakDelta,oldLuma:+(oldLuma/Math.max(1,metal)).toFixed(2),
  newLuma:+(newLuma/Math.max(1,metal)).toFixed(2)};
 report.push(stats);
 writeFileSync("skyshift-v0262-proof.json",JSON.stringify(report,null,2));
 console.log("PREMIUM_METAL_0262 "+JSON.stringify(stats));
 if(metal<300||changed<metal*(mobile?.003:.010))
  throw Error("0.26.2 material detail not visibly changing the metal "+JSON.stringify(stats));
 if(stats.newLuma>stats.oldLuma+10||stats.newLuma<stats.oldLuma-12)
  throw Error("0.26.2 lost dark graphite or washed out the tunnel "+JSON.stringify(stats));
 if(road<160||roadSame/road<.94)
  throw Error("0.26.2 changed road pixels "+JSON.stringify(stats));
 if(whiteNew>whiteOld*1.15+65)
  throw Error("0.26.2 reintroduced neutral white spill "+JSON.stringify(stats));
}
try{
 await delay(900);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 async function start(memory,extra=""){
  const page=await browser.newPage({viewport:{width:1536,height:870}});
  page.on("pageerror",e=>failures.push(e.message));
  page.on("console",message=>{
   if(message.type()==="error"&&
    /Shader Error|WebGLProgram|INVALID_OPERATION/i.test(message.text()))
    failures.push(message.text().slice(0,2500));
  });
  await page.addInitScript(v=>Object.defineProperty(navigator,
   "deviceMemory",{configurable:true,get:()=>v}),memory);
  await page.goto("http://127.0.0.1:8860/skyshift/?v=0.26.2"+
   "&artSmoke=1&premiumMetalSmoke=1&premiumMetalFrameProof=1"+
   "&trackRepairSmoke=1&waveSmoke=1&"+extra,
   {waitUntil:"domcontentloaded",timeout:65000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:90000});
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:35000});
  return page;
 }
 async function take(page,trackS,zone,label,memory){
  await page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),trackS);
  await page.evaluate(x=>window.__skyshiftWaveSmoke(x),zone);
  await page.waitForTimeout(650);
  const status=await page.evaluate(()=>window.__skyshiftPremiumMetalProbe());
  if(!status.requested||!status.premiumMetal0262Enabled||
   status.premiumMetal0262Status!=="active"||
   status.premiumMetal0262PhysicalGGX!==true||
   status.premiumMetal0262SolarSealed!==true||
   status.premiumMetal0262KeepsLocalReflections!==true||
   status.premiumMetal0262Pass!==2||
   status.premiumMetal0262Textures!==1||
   status.premiumMetal0262TextureSize!==(memory===4?128:256)||
   status.premiumMetal0262Batches!==(memory===4?1:2)||
   status.premiumMetal0262SubstrateBatches!==(memory===4?3:4)||
   status.premiumMetal0262AddedDrawCalls!==0||
   status.premiumMetal0262AddedDynamicLights!==0||
   status.premiumMetal0262ChangesRoad!==false||
   status.premiumMetal0262ChangesShip!==false||
   status.premiumMetal0262ChangesGRIP!==false||
   status.premiumMetal0262ChangesNativeNeon!==false||
   status.roadSolarSeal!==1||!status.nativeWave||!status.unifiedLighting)
   throw Error("0.26.2 source / flight / lighting invariant failure "+JSON.stringify(status));
  const frames=await page.evaluate(()=>window.__skyshiftPremiumMetalFrameProof());
  check(frames,label,memory===4);
 }
 const high=await start(8);
 await take(high,165,1,"high-violet",8);
 await take(high,165,2,"high-gold",8);
 await take(high,320,3,"high-jade",8);
 await high.close();
 const low=await start(4);
 await take(low,165,2,"4gb-gold",4);
 await low.close();
 const classic=await start(8,"premiumMetal=classic");
 const comparison=await classic.evaluate(()=>window.__skyshiftPremiumMetalProbe());
 if(comparison.requested||comparison.premiumMetal0262Enabled)
  throw Error("0.26.2 classic did not preserve 0.26.1 "+JSON.stringify(comparison));
 await classic.close();
 if(failures.length)
  throw Error("0.26.2 WebGL / shader failures: "+failures.join(" | "));
 console.log("PASS SKYSHIFT 0.26.2 — physically lit premium metal high and 4GB");
}finally{await browser?.close();server.kill("SIGTERM");}
