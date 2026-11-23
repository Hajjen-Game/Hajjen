// SKYSHIFT Unified Tunnel Lighting Foundation 1.0 — REAL Chrome/WebGL A/B.
// Same camera and exact frame, baseline vs shared blackout controller.
// Do not mock render quality or replace materials.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as delay} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Unified Lighting 1.0 requires real Chromium/WebGL");
const server=spawn("python3",["-m","http.server","8860","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
const errors=[],proof=[];
const toPng=b64=>PNG.sync.read(Buffer.from(b64,"base64"));
function inspect(pair,label,mobile,mode){
 const classic=toPng(pair.classic.data),unified=toPng(pair.unified.data);
 if(classic.width!==unified.width||classic.height!==unified.height)
  throw Error("1.0 changed the camera size or render target");
 const A=classic.data,B=unified.data;
 let changed=0,whiteBefore=0,whiteAfter=0,blueOld=0,blueNow=0,visible=0;
 let oldLight=0,newLight=0,samples=0;
 for(let y=Math.floor(classic.height*.07);y<Math.floor(classic.height*.93);y+=3)
  for(let x=Math.floor(classic.width*.06);x<Math.floor(classic.width*.94);x+=3){
   const k=(y*classic.width+x)*4;
   const d=Math.abs(A[k]-B[k])+Math.abs(A[k+1]-B[k+1])+Math.abs(A[k+2]-B[k+2]);
   if(d>15)changed++;
   const before=(A[k]+A[k+1]+A[k+2])/3;
   const after=(B[k]+B[k+1]+B[k+2])/3;
   oldLight+=before;newLight+=after;samples++;
   if(Math.min(A[k],A[k+1],A[k+2])>234)whiteBefore++;
   if(Math.min(B[k],B[k+1],B[k+2])>234)whiteAfter++;
   if(A[k+2]>A[k]*1.24&&A[k+1]>A[k]*1.12&&A[k+2]>150)blueOld++;
   if(B[k+2]>B[k]*1.24&&B[k+1]>B[k]*1.12&&B[k+2]>150)blueNow++;
   if(B[k]+B[k+1]+B[k+2]>65)visible++;
  }
 const stat={label,mobile,mode,changed,whiteBefore,whiteAfter,blueOld,blueNow,
  visible,oldMean:+(oldLight/samples).toFixed(2),newMean:+(newLight/samples).toFixed(2),
  core:pair.unified.levels,legacy:pair.classic.levels,s:pair.s};
 proof.push(stat);
 writeFileSync("skyshift-unified-lighting-v1-proof.json",JSON.stringify(proof,null,2));
 console.log("UNIFIED_TUNNEL_1 "+JSON.stringify(stat));
 writeFileSync("skyshift-unified-lighting-v1-"+label+"-classic.png",
  Buffer.from(pair.classic.data,"base64"));
 writeFileSync("skyshift-unified-lighting-v1-"+label+"-unified.png",
  Buffer.from(pair.unified.data,"base64"));
 if(mode==="gallery"||mode==="transition"){
  if(Math.abs(pair.classic.levels.key-1)>1e-6||
     pair.unified.levels.key>(mode==="gallery"?.40:.99))
   throw Error("1.0 new gallery failed global light source policy");
  if(changed<(mode==="gallery"?180:40))
   throw Error("1.0 gallery/transition PBR lighting difference not visible");
  if(stat.newMean>stat.oldMean+2)
   throw Error("1.0 brought white/exterior light back to gallery");
  if(whiteAfter>whiteBefore*1.08+50)
   throw Error("1.0 introduced a new neutral white-spill");
  if(blueOld>100&&blueNow/blueOld<.78)
   throw Error("1.0 removed too much original bright cyan emission");
 }else{
  for(const key of ["ambient","key","fill","bladeTip","background"])
   if(Math.abs(pair.classic.levels[key]-pair.unified.levels[key])>1e-6)
    throw Error("1.0 changed original "+mode+" light policy");
  if(changed>65)
   throw Error("1.0 changed outside-gallery or legacy-shadow pixels");
 }
}
try{
 await delay(950);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 async function pageFor(memory){
  const page=await browser.newPage({viewport:{width:1536,height:870}});
  page.on("pageerror",error=>errors.push(error.message));
  page.on("console",line=>{
   if(line.type()==="error"&&/Shader Error|WebGLProgram|INVALID_OPERATION/i.test(line.text()))
    errors.push(line.text().slice(0,4000));
  });
  await page.addInitScript(m=>Object.defineProperty(navigator,"deviceMemory",
   {configurable:true,get:()=>m}),memory);
  await page.goto("http://127.0.0.1:8860/skyshift/?v=0.26.0"+
   "&unifiedLightingSmoke=1&unifiedLightingFrameProof=1&trackRepairSmoke=1",
   {waitUntil:"domcontentloaded",timeout:65000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",null,{timeout:90000});
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:45000});
  return page;
 }
 async function capture(page,s,label,memory,mode){
  await page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),s);
  await page.waitForTimeout(600);
  const before=await page.evaluate(()=>window.__skyshiftUnifiedLightingProbe());
  if(!before.enabled||!before.nativeWaveActive||
    before.roadSolarSeal!==1||
    !before.whiteCoreProtectionEnabled||!before.shipWhiteProtectionEnabled||
    before.blackout.externalLightControllerCount!==1||
    !before.blackout.legacyShadowUnchanged||
    before.engineLightIntensities.length!==2)
   throw Error("Unified foundation broke mandatory source/wave protections "+
    JSON.stringify(before));
  // On SwiftShader a teleported chase camera can still be interpolating
  // when the first image is sampled. Never weaken the PBR/white-spill
  // thresholds: re-sample only a non-visible transition, after more frames.
  // A genuinely missing lighting response still fails on the final attempt.
  const maxAttempts=mode==="transition"?4:1;
  for(let attempt=1;attempt<=maxAttempts;attempt++){
   const frame=await page.evaluate(()=>window.__skyshiftUnifiedLightingFrameProof());
   if(Math.abs(frame.s-s)>.001)
    throw Error("1.0 QA frame moved away from requested tunnel position");
   try{
    inspect(frame,label,memory===4,mode);
    return;
   }catch(error){
    if(mode!=="transition"||
       error?.message!=="1.0 gallery/transition PBR lighting difference not visible"||
       attempt===maxAttempts)throw error;
    console.warn("UNIFIED_TUNNEL_1 transition camera settling; retry "+
     attempt+"/"+maxAttempts+" after next browser frames");
    await page.waitForTimeout(850);
   }
  }
 }
 const hi=await pageFor(8);
 await capture(hi,165,"high-gallery",8,"gallery");
 await capture(hi,356,"high-exit",8,"transition");
 await capture(hi,620,"high-outside",8,"outside");
 await capture(hi,2450,"high-shadow",8,"shadow");
 await hi.close();
 const mobile=await pageFor(4);
 await capture(mobile,165,"mobile-gallery",4,"gallery");
 await capture(mobile,2450,"mobile-shadow",4,"shadow");
 await mobile.close();
 if(errors.length)throw Error("1.0 WebGL shader failure "+errors.join(" | "));
 console.log("PASS SKYSHIFT unified shared black-room controller in both tunnels, 8GB/4GB");
}finally{await browser?.close();server.kill("SIGTERM");}
