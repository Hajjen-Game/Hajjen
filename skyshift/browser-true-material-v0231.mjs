// SKYSHIFT 0.23.1: actual Chromium/WebGL images, not concept renders.
// Capture before checking thresholds; archive visible evidence even on failure.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chrome is required for material QA");
const server=spawn("python3",["-m","http.server","8826","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
const issues=[],proofs=[];
function analyze(captures,label,{mobile=false}={}){
 const a=PNG.sync.read(Buffer.from(captures.classic,"base64"));
 const b=PNG.sync.read(Buffer.from(captures.depth,"base64"));
 if(a.width!==b.width||a.height!==b.height)
  throw Error("Same-frame A/B resolutions differ");
 for(const [type,bytes] of [["classic",captures.classic],["depth",captures.depth]])
  writeFileSync("skyshift-v0231-"+label+"-"+type+".png",
   Buffer.from(bytes,"base64"));
 let changed=0,upper=0,side=0,road=0,whiteBefore=0,whiteAfter=0;
 let nativeBright=0,nativeBrightRetained=0;
 for(let y=Math.floor(a.height*.07);y<Math.floor(a.height*.96);y+=2)
  for(let x=Math.floor(a.width*.035);x<Math.floor(a.width*.965);x+=2){
   const i=(y*a.width+x)*4,from=a.data,to=b.data;
   if(Math.min(from[i],from[i+1],from[i+2])>205)whiteBefore++;
   if(Math.min(to[i],to[i+1],to[i+2])>205)whiteAfter++;
   // On 4GB, the geometry is deliberately IDENTICAL; every bright local
   // cyan/violet/gold neon core must retain its previous luminance.
   if(mobile&&y<a.height*.64){
    const oldPeak=Math.max(from[i],from[i+1],from[i+2]);
    const oldLow=Math.min(from[i],from[i+1],from[i+2]);
    if(oldPeak>125&&oldPeak-oldLow>35){
     nativeBright++;
     if(Math.max(to[i],to[i+1],to[i+2])>=oldPeak*.80)
      nativeBrightRetained++;
    }
   }
   const delta=Math.abs(from[i]-to[i])+Math.abs(from[i+1]-to[i+1])+
    Math.abs(from[i+2]-to[i+2]);
   if(delta<12)continue;
   changed++;
   if(y<a.height*.57)upper++;
   if(x<a.width*.35||x>a.width*.65)side++;
   if(y>a.height*.75&&x>a.width*.41&&x<a.width*.59)road++;
  }
 const result={label,changed,upper,side,road,whiteBefore,whiteAfter,
  nativeBright,nativeBrightRetained,flightS:captures.position};
 if(mobile&&nativeBright>80&&nativeBrightRetained/nativeBright<.91)
  throw Error("Native neon glow lost in low-memory tunnel "+JSON.stringify(result));
 if(changed<(mobile?60:1000)||upper<60)
  throw Error("0.23.1 material upgrade too subtle "+JSON.stringify(result));
 if(road>changed*.28+75)
  throw Error("0.23.1 changed driving corridor "+JSON.stringify(result));
 if(whiteAfter>whiteBefore*1.28+65)
  throw Error("0.23.1 reintroduced neutral-white sun "+JSON.stringify(result));
 return result;
}
try{
 await sleep(1100);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 async function load(memory,extra=""){
  const page=await browser.newPage({viewport:{width:1536,height:870}});
  page.on("pageerror",e=>issues.push(e.message));
  page.on("console",m=>{
   if(m.type()==="error"&&/WebGLProgram|Shader Error|INVALID_OPERATION/i.test(m.text()))
    issues.push(m.text().slice(0,1800));
  });
  await page.addInitScript(n=>Object.defineProperty(navigator,"deviceMemory",
   {configurable:true,get:()=>n}),memory);
  await page.goto("http://127.0.0.1:8826/skyshift/?v=0.23.1"+
   "&artSmoke=1&trueDepthSmoke=1&trueDepthFrameProof=1"+
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
  await page.evaluate(n=>window.__skyshiftTrackRepairTeleport(n),s);
  if(zone)await page.evaluate(n=>window.__skyshiftWaveSmoke(n),zone);
  await page.waitForTimeout(700);
  const probe=await page.evaluate(()=>window.__skyshiftTrueDepthProbe());
  if(!probe.requested||!probe.trueDepth0231Enabled||
     probe.trueDepth0231Status!=="active"||
     probe.trueDepth0231MaterialRoles!==(memory===4?1:2)||
     probe.trueDepth0231PreservedNativeNeon!==true||
     probe.trueDepth0231GeometrySwap!==(memory!==4)||
     probe.trueDepth0231AddedDrawBatches!==0||
     (memory!==4&&probe.trueDepth0231NewVertices<10000)||
     probe.roadSolarSeal!==1||!probe.nativeWave)
   throw Error("0.23.1 pipeline not installed safely "+JSON.stringify(probe));
  const pair=await page.evaluate(()=>window.__skyshiftTrueDepthFrameProof());
  const result=analyze(pair,label,{mobile:memory===4});
  proofs.push({...result,triangles:probe.trueDepth0231Triangles,
   materialRoles:probe.trueDepth0231MaterialRoles,mobile:memory===4});
  console.log("TRUE_MATERIAL_0231 "+JSON.stringify(proofs.at(-1)));
 }
 const desktop=await load(8);
 await take(desktop,165,0,"cyan-165",8);
 await take(desktop,165,2,"gold-165",8);
 await take(desktop,165,3,"jade-165",8);
 await desktop.close();
 const mobile=await load(4);
 await take(mobile,165,2,"mobile-gold-165",4);
 await take(mobile,165,1,"mobile-violet-165",4);
 await mobile.close();
 const classic=await load(8,"trueDepth=classic");
 const state=await classic.evaluate(()=>window.__skyshiftTrueDepthProbe());
 if(state.requested||state.trueDepth0231Enabled)
  throw Error("0.23.0 material A/B baseline unavailable "+JSON.stringify(state));
 await classic.close();
 if(issues.length)throw Error("WebGL shader/runtime errors "+issues.join(" | "));
 writeFileSync("skyshift-v0231-proof.json",JSON.stringify(proofs,null,2));
 console.log("PASS SKYSHIFT 0.23.1 true geometry and material in WebGL");
}finally{await browser?.close();server.kill("SIGTERM")}
