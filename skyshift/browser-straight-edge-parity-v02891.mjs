// SKYSHIFT 0.28.9.1 — real in-game WebGL before/after, true Vault turns.
// The before URL disables ONLY the new parity layer on the same release.
// No generated imagery, invented camera view or mock render path.
import {spawn} from "node:child_process";
import {existsSync,mkdirSync,writeFileSync} from "node:fs";
import {setTimeout as delay} from "node:timers/promises";
import {chromium} from "playwright-core";
const executablePath=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!executablePath)throw Error("0.28.9.1 requires real Chromium/WebGL");
const dir="skyshift/previews/",port=8894;
mkdirSync(dir,{recursive:true});
const server=spawn("python3",["-m","http.server",String(port),
 "--bind","127.0.0.1"],{cwd:process.cwd(),stdio:"ignore"});
const errors=[],records=[];
let browser;
const cases=[
 {s:110,memory:8,type:"straight"},
 {s:292,memory:8,type:"turn"}, // S-bend entry
 {s:540,memory:8,type:"turn"}, // S-bend release
 {s:955,memory:8,type:"turn"}, // GRIP curve
 {s:1210,memory:8,type:"straight"},
 {s:1450,memory:8,type:"turn"}, // grand sweep
 {s:1995,memory:4,type:"turn"}, // second half S-link
 {s:1840,memory:4,type:"straight"}
];
async function snapshot(spec,classic){
 const tag=(spec.memory===4?"4GB":"High")+"-"+spec.s+
  (classic?"-before-0289":"-after-02891");
 const page=await browser.newPage({viewport:{width:1536,height:870}});
 page.on("pageerror",e=>errors.push(tag+" page: "+e.message));
 page.on("console",m=>{
  if(m.type()==="error"&&
    /THREE.WebGLProgram|shader error|INVALID_OPERATION|compile failed|WebGL:/i.test(m.text()))
   errors.push(tag+" GPU: "+m.text().slice(0,1400));
 });
 await page.addInitScript(memory=>Object.defineProperty(navigator,
  "deviceMemory",{configurable:true,get:()=>memory}),spec.memory);
 const url="http://127.0.0.1:"+port+
  "/skyshift/?track=vault&v=0.28.9.1&straightParitySmoke=1"+
  "&trackRepairSmoke=1&sharedTunnelSmoke=1"+
  (classic?"&straightEdgeParity=classic":"");
 await page.goto(url,{waitUntil:"domcontentloaded",timeout:80000});
 await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
  null,{timeout:155000});
 await page.locator("#start-btn").click();
 await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:45000});
 await page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),spec.s);
 await page.waitForTimeout(600);
 const result=await page.evaluate(()=>window.__skyshiftStraightParityProbe());
 if(!result?.originalShip||!result?.originalGrip||!result.pmrem||
  !result.metal?.active||!result.precision?.active||
  !result.stable?.active||!result.archFoot?.active||
  !result.wave?.active||!result.originalRoad?.active)
  throw Error(tag+" 0.28.9 pipeline did NOT survive patch version: "+
   JSON.stringify(result));
 if(classic){
  if(result.requested||result.source?.active||result.road?.active)
   throw Error(tag+" comparison did not restore exact 0.28.9 visuals");
 }else{
  if(!result.requested||!result.source?.active||!result.road?.active||
   result.source.sourceModules!==10||
   !(result.source.litSegments>0)||
   result.source.bendClearanceMeters!==12||
   result.source.straightRanges.length!==8||
   !(result.road.activeVertices>0)||!(result.road.maskedVertices>0)||
   !result.road.curveCyanReflectionsDisabled||
   !result.road.amberUnchanged)
   throw Error(tag+" 0.26.3.3 source parity not actually installed: "+
    JSON.stringify(result));
 }
 await page.screenshot({path:dir+"v02891-"+tag+".png"});
 const measure={tag,condition:spec.type,s:spec.s,memory:spec.memory,
  active:!!result.source?.active,masked:result.road?.maskedVertices??0,
  segments:result.source?.litSegments??0};
 records.push(measure);
 console.log("STRAIGHT_PARITY_02891 "+JSON.stringify(measure));
 writeFileSync(dir+"v02891-proof.json",JSON.stringify(records,null,2));
 await page.close();
}
try{
 await delay(650);
 browser=await chromium.launch({headless:true,executablePath,args:[
  "--no-sandbox","--disable-dev-shm-usage",
  "--enable-webgl","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 for(const spec of cases){
  await snapshot(spec,true);await snapshot(spec,false);
 }
 if(errors.length)throw Error("0.28.9.1 GPU/shader failures "+errors.join(" | "));
 console.log("PASS SKYSHIFT 0.28.9.1 original 0.28.9 look protected; "+
  "straight-only cyan + GGX masked in every authored Vault turn, 8GB and 4GB");
}finally{await browser?.close();server.kill("SIGTERM");}
