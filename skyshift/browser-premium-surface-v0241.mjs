// SKYSHIFT 0.24.1: actual WebGL machined panels and neon-safe reflective finish.
// Capture before checking thresholds; archive visible evidence even on failure.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chrome is required for material QA");
const server=spawn("python3",["-m","http.server","8827","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
const issues=[],proofs=[];
function analyze(captures,label,{mobile=false}={}){
 const a=PNG.sync.read(Buffer.from(captures.classic,"base64"));
 const b=PNG.sync.read(Buffer.from(captures.crafted,"base64"));
 if(a.width!==b.width||a.height!==b.height)
  throw Error("Same-frame A/B resolutions differ");
 for(const [type,bytes] of [["classic",captures.classic],["crafted",captures.crafted]])
  writeFileSync("skyshift-v0241-"+label+"-"+type+".png",
   Buffer.from(bytes,"base64"));
 let changed=0,upper=0,side=0,road=0,whiteBefore=0,whiteAfter=0;
 let nativeBright=0,nativeBrightRetained=0,darker=0;
 for(let y=Math.floor(a.height*.07);y<Math.floor(a.height*.96);y+=2)
  for(let x=Math.floor(a.width*.035);x<Math.floor(a.width*.965);x+=2){
   const i=(y*a.width+x)*4,from=a.data,to=b.data;
   if(Math.min(from[i],from[i+1],from[i+2])>205)whiteBefore++;
   if(Math.min(to[i],to[i+1],to[i+2])>205)whiteAfter++;
   // On both high and 4GB, actual saturated cyan/violet/gold bright
   // sources must survive. The sculpted recess may legitimately darken.
   if(y<a.height*.64){
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
   if(delta<9)continue;
   changed++;
   if(Math.max(from[i],from[i+1],from[i+2])>
       Math.max(to[i],to[i+1],to[i+2])+4)darker++;
   if(y<a.height*.57)upper++;
   if(x<a.width*.35||x>a.width*.65)side++;
   if(y>a.height*.75&&x>a.width*.41&&x<a.width*.59)road++;
  }
 const result={label,changed,upper,side,road,whiteBefore,whiteAfter,
  nativeBright,nativeBrightRetained,darker,flightS:captures.position};
 if(nativeBright>80&&nativeBrightRetained/nativeBright<(mobile?.97:.92))
  throw Error("Native neon glow lost in low-memory tunnel "+JSON.stringify(result));
 if(changed<(mobile?15:55)||upper<10)
  throw Error("0.24.1 material upgrade too subtle "+JSON.stringify(result));
 if(darker>changed*.33+40)
  throw Error("Excessive shadowing outside machined seams "+JSON.stringify(result));
 if(road>changed*.25+45)
  throw Error("0.24.1 changed driving corridor "+JSON.stringify(result));
 if(whiteAfter>whiteBefore*1.16+45)
  throw Error("0.24.1 reintroduced neutral-white sun "+JSON.stringify(result));
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
  await page.goto("http://127.0.0.1:8827/skyshift/?v=0.24.1"+
   "&artSmoke=1&surfaceCraftSmoke=1&surfaceCraftFrameProof=1"+
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
  const probe=await page.evaluate(()=>window.__skyshiftSurfaceCraftProbe());
  if(!probe.requested||!probe.surfaceCraft0241Enabled||
     probe.surfaceCraft0241Status!=="active"||
     probe.surfaceCraft0241LowMemory!==(memory===4)||
     probe.surfaceCraft0241NativeNeonRetained!==true||
     probe.surfaceCraft0241SunSealed!==true||
     probe.surfaceCraft0241NoFlightChanges!==true||
     probe.surfaceCraft0241NewLights!==0||
     probe.surfaceCraft0241NewDrawCalls!==0||
     probe.roadSolarSeal!==1||!probe.nativeWave)
   throw Error("0.24.1 pipeline not installed safely "+JSON.stringify(probe));
  const pair=await page.evaluate(()=>window.__skyshiftSurfaceCraftFrameProof());
  const result=analyze(pair,label,{mobile:memory===4});
  proofs.push({...result,materialRoles:probe.surfaceCraft0241LowMemory,mobile:memory===4});
  console.log("PREMIUM_SURFACE_0241 "+JSON.stringify(proofs.at(-1)));
 }
 const desktop=await load(8);
 await take(desktop,44,0,"cyan-entry-44",8);
 await take(desktop,165,0,"cyan-165",8);
 await take(desktop,165,2,"gold-165",8);
 await take(desktop,165,3,"jade-165",8);
 await take(desktop,325,3,"jade-exit-325",8);
 await desktop.close();
 const mobile=await load(4);
 await take(mobile,52,2,"mobile-gold-entry-52",4);
 await take(mobile,165,2,"mobile-gold-165",4);
 await take(mobile,165,1,"mobile-violet-165",4);
 await take(mobile,326,1,"mobile-violet-exit-326",4);
 await mobile.close();
 const classic=await load(8,"surfaceCraft=classic");
 const state=await classic.evaluate(()=>window.__skyshiftSurfaceCraftProbe());
 if(state.requested||state.surfaceCraft0241Enabled)
  throw Error("0.24.0 baseline A/B unavailable "+JSON.stringify(state));
 await classic.close();
 if(issues.length)throw Error("WebGL shader/runtime errors "+issues.join(" | "));
 writeFileSync("skyshift-v0241-proof.json",JSON.stringify(proofs,null,2));
 console.log("PASS SKYSHIFT 0.24.1 sculpted surfaces and neon-safe material in WebGL");
}finally{await browser?.close();server.kill("SIGTERM")}
