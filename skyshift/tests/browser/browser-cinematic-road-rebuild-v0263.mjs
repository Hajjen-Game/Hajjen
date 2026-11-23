// SKYSHIFT 0.26.3: REAL Chrome/WebGL and pixel-level A/B, not mock images.
// Compare native GGX road against exactly the same 0.26.2 road frame.
// Preserve all sidewall metallic lighting, road solar isolation, white crest,
// emissive driving lines, ship and GRIP. Test 8GB and 4GB GPU variants.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,
 "/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"]
 .filter(Boolean).find(existsSync);
if(!chrome)throw Error("0.26.3 requires REAL Chromium/WebGL");
const server=spawn("python3",["-m","http.server","8863","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
const errors=[],stats=[];let browser;
const lum=(p,i)=>p[i]*.213+p[i+1]*.715+p[i+2]*.072;
function analyze(frames,label,mobile){
 const A=PNG.sync.read(Buffer.from(frames.classic,"base64"));
 const B=PNG.sync.read(Buffer.from(frames.physical,"base64"));
 const M=PNG.sync.read(Buffer.from(frames.roadMask,"base64"));
 const E=PNG.sync.read(Buffer.from(frames.emptyMask,"base64"));
 if([B,M,E].some(v=>v.width!==A.width||v.height!==A.height))
  throw Error("0.26.3 cannot change camera resolution");
 for(const [key,file] of [["classic","classic"],["physical","physical"]])
  writeFileSync("skyshift-v0263-"+label+"-"+file+".png",
   Buffer.from(frames[key],"base64"));
 let road=0,changed=0,unchangedOutside=0,outside=0,
  whiteBefore=0,whiteAfter=0,oldSum=0,newSum=0,
  peakDelta=0,newCyan=0,newAmber=0,oldCyan=0,oldAmber=0;
 const W=A.width,H=A.height;
 for(let y=Math.floor(H*.09);y<Math.floor(H*.94);y+=3)
 for(let x=Math.floor(W*.025);x<Math.floor(W*.975);x+=3){
  const i=(y*W+x)*4;
  const mask=Math.abs(M.data[i]-E.data[i])+
   Math.abs(M.data[i+1]-E.data[i+1])+
   Math.abs(M.data[i+2]-E.data[i+2])>125;
  const delta=Math.abs(A.data[i]-B.data[i])+
   Math.abs(A.data[i+1]-B.data[i+1])+
   Math.abs(A.data[i+2]-B.data[i+2]);
  if(mask){
   road++;oldSum+=lum(A.data,i);newSum+=lum(B.data,i);
   if(delta>12)changed++;
   peakDelta=Math.max(peakDelta,delta);
   if(B.data[i+1]>B.data[i]*1.28&&B.data[i+2]>B.data[i]*1.35&&B.data[i+2]>65)newCyan++;
   if(B.data[i]>B.data[i+2]*1.32&&B.data[i]>B.data[i+1]*1.15&&B.data[i]>60)newAmber++;
   if(A.data[i+1]>A.data[i]*1.28&&A.data[i+2]>A.data[i]*1.35&&A.data[i+2]>65)oldCyan++;
   if(A.data[i]>A.data[i+2]*1.32&&A.data[i]>A.data[i+1]*1.15&&A.data[i]>60)oldAmber++;
  }else{outside++;if(delta<28)unchangedOutside++;}
  if(Math.min(A.data[i],A.data[i+1],A.data[i+2])>238)whiteBefore++;
  if(Math.min(B.data[i],B.data[i+1],B.data[i+2])>238)whiteAfter++;
 }
 const r={label,mobile,trackS:frames.trackS,road,changed,
  unchangedOutside,outside,peakDelta,oldCyan,newCyan,oldAmber,newAmber,
  whiteBefore,whiteAfter,
  meanClassic:+(oldSum/Math.max(1,road)).toFixed(2),
  meanPhysical:+(newSum/Math.max(1,road)).toFixed(2)};
 stats.push(r);
 writeFileSync("skyshift-v0263-proof.json",JSON.stringify(stats,null,2));
 console.log("ROAD_REFLECTIONS_0263 "+JSON.stringify(r));
 if(road<280||changed<(mobile?35:80))
  throw Error("0.26.3 new physically based highlights are invisible "+JSON.stringify(r));
 if(r.meanPhysical>r.meanClassic+18||
  r.meanPhysical<r.meanClassic-23)
  throw Error("0.26.3 road lost dark cinematic contrast "+JSON.stringify(r));
 if(whiteAfter>whiteBefore*1.15+40)
  throw Error("0.26.3 reintroduced unwanted white sunlight "+JSON.stringify(r));
 if(outside>500&&unchangedOutside/outside<.84)
  throw Error("0.26.3 changed ship or tunnel material pixels "+JSON.stringify(r));
}
try{
 await sleep(900);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 async function start(memory,extra=""){
  const page=await browser.newPage({viewport:{width:1536,height:870}});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",msg=>{
   if(msg.type()==="error"&&
    /Shader Error|WebGLProgram|INVALID_OPERATION|THREE.WebGLProgram/i.test(msg.text()))
    errors.push(msg.text().slice(0,2500));
  });
  await page.addInitScript(v=>Object.defineProperty(navigator,
   "deviceMemory",{configurable:true,get:()=>v}),memory);
  await page.goto("http://127.0.0.1:8863/skyshift/?v=0.26.3"+
   "&artSmoke=1&roadRebuildSmoke=1&roadRebuildFrameProof=1"+
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
  if(zone>0)await page.evaluate(x=>window.__skyshiftWaveSmoke(x),zone);
  await page.waitForTimeout(760);
  const current=await page.evaluate(()=>window.__skyshiftRoadRebuildProbe());
  if(!current.requested||!current.roadRebuild0263Active||
   current.roadRebuild0263Status!=="active"||
   current.roadRebuild0263PhysicalGGX!==true||
   current.roadRebuild0263UsesOriginalDeck!==true||
   current.roadRebuild0263UsesOriginalSourcePositions!==true||
   current.roadRebuild0263SolarSealed!==true||
   current.roadRebuild0263PreservesWhiteCrest!==true||
   current.roadRebuild0263PreservesGuides!==true||
   current.roadRebuild0263CyanSamples!==(memory===4?2:4)||
   current.roadRebuild0263AmberSamples!==(memory===4?1:2)||
   current.roadRebuild0263LowMemory!==(memory===4)||
   current.roadRebuild0263AddedDrawCalls!==0||
   current.roadRebuild0263AddedLights!==0||
   current.roadRebuild0263AddedTextures!==0||
   current.roadRebuild0263ChangesGRIP!==false||
   current.roadRebuild0263ChangesPhysics!==false||
   current.roadMaterial!=="MeshStandardMaterial"||
   current.solarSeal!==1||current.premiumRoadSeal!==1||
   !current.nativeWave||!current.originalRail||!current.originalShip)
   throw Error("0.26.3 road/night-flight invariants failed "+JSON.stringify(current));
  const frames=await page.evaluate(()=>window.__skyshiftRoadRebuildFrameProof());
  analyze(frames,label,memory===4);
 }
 const high=await start(8);
 await take(high,44,0,"high-cyan-entry",8);
 await take(high,165,1,"high-violet",8);
 await take(high,165,2,"high-gold",8);
 await take(high,165,3,"high-jade",8);
 await high.close();
 const low=await start(4);
 await take(low,165,2,"4gb-gold",4);
 await take(low,165,1,"4gb-violet",4);
 await low.close();
 const classic=await start(8,"roadRebuild=classic");
 const comparison=await classic.evaluate(()=>window.__skyshiftRoadRebuildProbe());
 if(comparison.requested||comparison.roadRebuild0263Active||
  comparison.legacyReflections!==1)
  throw Error("0.26.3 classic A/B did not restore 0.26.2 "+JSON.stringify(comparison));
 await classic.close();
 if(errors.length)throw Error("0.26.3 WebGL GPU errors: "+errors.join(" | "));
 console.log("PASS 0.26.3 physical road, original solar seal, 8GB/4GB");
}finally{await browser?.close();server.kill("SIGTERM");}
