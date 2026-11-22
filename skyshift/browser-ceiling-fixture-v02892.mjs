// SKYSHIFT 0.28.9.2 — live Chromium/WebGL originals, not concept art.
// Compare the same new runtime with its exact original fixture mesh restored
// (?ceilingFixtures=classic) at identical travel locations / quality tiers.
import {spawn} from "node:child_process";
import {existsSync,mkdirSync,writeFileSync} from "node:fs";
import {setTimeout as delay} from "node:timers/promises";
import {chromium} from "playwright-core";
const executablePath=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!executablePath)throw Error("0.28.9.2 requires real Chromium/WebGL");
const dir="skyshift/previews/",port=8895;
mkdirSync(dir,{recursive:true});
const server=spawn("python3",["-m","http.server",String(port),
 "--bind","127.0.0.1"],{cwd:process.cwd(),stdio:"ignore"});
let browser;
const errors=[],records=[];
const cases=[
 {s:110,memory:8,type:"initial upper-wall/roof cove"},
 {s:292,memory:8,type:"banked turn and arch intersection"},
 {s:955,memory:8,type:"long curved wall"},
 {s:1840,memory:4,type:"4GB back-half seam"}
];
async function snapshot(spec,classic){
 const tag=(spec.memory===4?"4GB":"High")+"-"+spec.s+
  (classic?"-before-02891":"-after-02892");
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
  "/skyshift/?track=vault&v=0.28.9.2&ceilingFixtureSmoke=1"+
  "&trackRepairSmoke=1&sharedTunnelSmoke=1"+
  (classic?"&ceilingFixtures=classic":"");
 await page.goto(url,{waitUntil:"domcontentloaded",timeout:80000});
 await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
  null,{timeout:155000});
 await page.locator("#start-btn").click();
 await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:45000});
 await page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),spec.s);
 await page.waitForTimeout(600);
 const result=await page.evaluate(()=>window.__skyshiftCeilingFixtureAudit?.());
 if(!result?.originalShip||!result?.originalGrip||
  !result?.sharedWave?.active||!result?.edge?.active)
  throw Error(tag+" existing physics/wave/0.28.9.1 lost "+JSON.stringify(result));
 const a=result.source;
 if(classic){
  if(result.requested||a?.active)
   throw Error(tag+" old fixtures not restored: "+JSON.stringify(a));
 }else{
  if(!result.requested||!a?.active||a.sourceModules!==10||
   a.cyanStrips!==200||a.warmStrips!==200||
   (spec.memory===8&&a.removedTAccents!==200)||
   a.source?.panelJointUpper!==11||a.source?.panelJointWall!==9||
   !a.source?.sameMeshAndDrawCall||!a.zoneFrontShared)
   throw Error(tag+" original seam fixture parity missing "+JSON.stringify(a));
 }
 await page.screenshot({path:dir+"v02892-"+tag+".png"});
 const record={tag,s:spec.s,memory:spec.memory,type:spec.type,
  active:!!a?.active,cyan:a?.cyanStrips??0,warm:a?.warmStrips??0,
  removedT:a?.removedTAccents??0,drawCallsAdded:0};
 records.push(record);
 writeFileSync(dir+"v02892-proof.json",JSON.stringify(records,null,2));
 console.log("CEILING_FIXTURE_02892 "+JSON.stringify(record));
 await page.close();
}
try{
 await delay(650);
 browser=await chromium.launch({headless:true,executablePath,args:[
  "--no-sandbox","--disable-dev-shm-usage",
  "--enable-webgl","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 for(const spec of cases){await snapshot(spec,true);await snapshot(spec,false);}
 if(errors.length)throw Error("0.28.9.2 GPU/shader failures "+errors.join(" | "));
 console.log("PASS SKYSHIFT 0.28.9.2 seam geometry + zone-wave, "+
  "legacy fixtures restored in same live game release, High / 4GB");
}finally{await browser?.close();server.kill("SIGTERM");}
