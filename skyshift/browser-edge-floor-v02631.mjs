// Real Chromium/WebGL proof — SKYSHIFT 0.26.3.1.
// Lock ship/camera/track/wave to exactly same frame. Verify new rail and
// arch foot emitters are visible but road/shoulder remain dark; no white sun.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,
 "/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"]
 .filter(Boolean).find(existsSync);
if(!chrome)throw Error("0.26.3.1 requires actual Chromium/WebGL");
const server=spawn("python3",["-m","http.server","8864","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;const errors=[],proof=[];
const lum=(p,i)=>.213*p[i]+.715*p[i+1]+.072*p[i+2];
function examine(frames,label,mobile){
 const A=PNG.sync.read(Buffer.from(frames.classic,"base64"));
 const B=PNG.sync.read(Buffer.from(frames.lit,"base64"));
 const M=PNG.sync.read(Buffer.from(frames.roadMask,"base64"));
 const E=PNG.sync.read(Buffer.from(frames.emptyMask,"base64"));
 if([B,M,E].some(v=>v.width!==A.width||v.height!==A.height))
  throw Error("0.26.3.1 changed screen or camera");
 for(const k of ["classic","lit"])writeFileSync(
  "skyshift-v02631-"+label+"-"+k+".png",Buffer.from(frames[k],"base64"));
 let road=0,roadChanges=0,shoulder=0,shoulderChanges=0,
  lumaBefore=0,lumaAfter=0,allLumaBefore=0,allLumaAfter=0,
  cyanBefore=0,cyanAfter=0,amberBefore=0,amberAfter=0,
  whiteBefore=0,whiteAfter=0,changed=0;
 const W=A.width,H=A.height;
 for(let y=Math.floor(H*.10);y<Math.floor(H*.95);y+=3)
 for(let x=Math.floor(W*.025);x<Math.floor(W*.975);x+=3){
  const i=(y*W+x)*4;
  const isRoad=Math.abs(M.data[i]-E.data[i])+
   Math.abs(M.data[i+1]-E.data[i+1])+
   Math.abs(M.data[i+2]-E.data[i+2])>125;
  const delta=Math.abs(A.data[i]-B.data[i])+
   Math.abs(A.data[i+1]-B.data[i+1])+
   Math.abs(A.data[i+2]-B.data[i+2]);
  const prev=lum(A.data,i),next=lum(B.data,i);
  allLumaBefore+=prev;allLumaAfter+=next;
  if(delta>12)changed++;
  if(isRoad){road++;lumaBefore+=prev;lumaAfter+=next;
   if(delta>12)roadChanges++;
  }else{shoulder++;if(delta>12)shoulderChanges++;}
  const cool=p=>p[i+1]>p[i]*1.25&&p[i+2]>p[i]*1.35&&p[i+2]>55;
  const warm=p=>p[i]>p[i+1]*1.22&&p[i]>p[i+2]*1.42&&p[i]>52;
  if(cool(A.data))cyanBefore++;
  if(cool(B.data))cyanAfter++;
  if(warm(A.data))amberBefore++;
  if(warm(B.data))amberAfter++;
  if(Math.min(A.data[i],A.data[i+1],A.data[i+2])>240)whiteBefore++;
  if(Math.min(B.data[i],B.data[i+1],B.data[i+2])>240)whiteAfter++;
 }
 const r={label,mobile,trackS:frames.trackS,road,roadChanges,
  shoulder,shoulderChanges,changed,cyanBefore,cyanAfter,
  amberBefore,amberAfter,whiteBefore,whiteAfter,
  roadLumaBefore:+(lumaBefore/Math.max(1,road)).toFixed(2),
  roadLumaAfter:+(lumaAfter/Math.max(1,road)).toFixed(2),
  sceneLumaDelta:+((allLumaAfter-allLumaBefore)/(road+shoulder)).toFixed(2)};
 proof.push(r);
 writeFileSync("skyshift-v02631-proof.json",JSON.stringify(proof,null,2));
 console.log("EDGE_FLOOR_02631 "+JSON.stringify(r));
 if(changed<(mobile?90:150)||shoulderChanges<(mobile?35:80))
  throw Error("0.26.3.1 floor / emitter surfaces are invisible "+JSON.stringify(r));
 if(roadChanges<(mobile?20:35))
  throw Error("0.26.3.1 lacks reflections on the real road "+JSON.stringify(r));
 if(r.roadLumaAfter>r.roadLumaBefore+8.0||r.sceneLumaDelta>6.5)
  throw Error("0.26.3.1 washed out dark graphite road "+JSON.stringify(r));
 if(whiteAfter>whiteBefore*1.12+30)
  throw Error("0.26.3.1 introduced white sun spill "+JSON.stringify(r));
}
try{
 await sleep(700);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 async function open(memory,extra=""){
  const page=await browser.newPage({viewport:{width:1536,height:870}});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",msg=>{
   if(msg.type()==="error"&&
    /Shader Error|WebGLProgram|INVALID_OPERATION|THREE.WebGLProgram/i.test(msg.text()))
    errors.push(msg.text().slice(0,2600));
  });
  await page.addInitScript(m=>Object.defineProperty(navigator,
   "deviceMemory",{configurable:true,get:()=>m}),memory);
  await page.goto("http://127.0.0.1:8864/skyshift/?v=0.26.3.1"+
   "&artSmoke=1&edgeFloorSmoke=1&edgeFloorFrameProof=1"+
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
  if(zone)await page.evaluate(x=>window.__skyshiftWaveSmoke(x),zone);
  await page.waitForTimeout(700);
  const state=await page.evaluate(()=>window.__skyshiftEdgeFloorProbe());
  if(!state.requested||!state.edgeFloor02631Active||
   state.edgeFloor02631Status!=="active"||
   state.edgeFloor02631Version!=="0.26.3.1"||
   state.edgeFloor02631FootLights!==20||
   state.edgeFloor02631FloorPools!==20||
   state.edgeFloor02631Segments<80||
   state.edgeFloor02631DrawBatches!==2||
   state.edgeFloor02631RailSamples!==(memory===4?1:2)||
   state.edgeFloor02631LowMemory!==(memory===4)||
   state.edgeFloor02631NewLights!==0||
   state.edgeFloor02631NewColliders!==0||
   state.edgeFloor02631NewPostprocess!==0||
   !state.edgeFloor02631SolarSealed||
   !state.edgeFloor02631PreservesShip||
   !state.edgeFloor02631PreservesGRIP||
   !state.edgeFloor02631PreservesNativeWave||
   !state.edgeFloor02631NoArrowLighting||
   !state.roadRebuild||state.roadMaterial!=="MeshStandardMaterial"||
   state.solarSeal!==1||state.premiumRoadSeal!==1||
   !state.nativeWave||!state.originalShip||!state.originalRail)
   throw Error("0.26.3.1 source/render invariants failed "+JSON.stringify(state));
  const frames=await page.evaluate(()=>window.__skyshiftEdgeFloorFrameProof());
  examine(frames,label,memory===4);
 }
 const high=await open(8);
 await take(high,165,2,"high-gold",8);
 await take(high,44,1,"high-violet",8);
 await high.close();
 const low=await open(4);
 await take(low,165,2,"4gb-gold",4);
 await low.close();
 const classic=await open(8,"edgeFloor=classic");
 const old=await classic.evaluate(()=>window.__skyshiftEdgeFloorProbe());
 if(old.requested||old.edgeFloor02631Active||!old.roadRebuild)
  throw Error("0.26.3.1 comparison didn't restore 0.26.3 "+JSON.stringify(old));
 await classic.close();
 if(errors.length)throw Error("0.26.3.1 real WebGL shader errors "+errors.join(" | "));
 console.log("PASS 0.26.3.1 — actual rail and floor emitters, 8GB/4GB, exact 0.26.3 A/B");
}finally{await browser?.close();server.kill("SIGTERM");}
