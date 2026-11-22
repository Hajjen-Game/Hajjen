// SKYSHIFT 0.28.9.7 – REAL cold-start profiling; browser crashes are errors.
// Three modes isolate 10x atlas regeneration, synchronous PMREM GPU capture,
// and 4GB budget, with the same actual Vault geometry and Manta Blade.
import {spawn} from "node:child_process";
import {existsSync,mkdirSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
const binary=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(existsSync)[0];
if(!binary)throw Error("Actual Chrome/WebGL is required to audit SKYSHIFT startup");
const out="skyshift/previews";mkdirSync(out,{recursive:true});
const port=8917;
const server=spawn("python3",["-m","http.server",String(port),"--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
const profiles=[
 {label:"High-shared-atlas",deviceMemory:8,query:""},
 {label:"High-classic-10-atlases",deviceMemory:8,query:"&startupAtlas=classic"},
 {label:"High-no-PMREM-control",deviceMemory:8,query:"&pmrem=off"},
 {label:"4GB-shared-atlas",deviceMemory:4,query:""}
];
let browser;const reports=[];
try{
 await sleep(450);
 browser=await chromium.launch({headless:true,executablePath:binary,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader",
  "--enable-precise-memory-info"]});
 for(const profile of profiles){
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  let crashed=false;const errors=[];
  page.on("crash",()=>{crashed=true;errors.push("Chrome renderer process crashed");});
  page.on("pageerror",e=>errors.push("JavaScript: "+e.message));
  page.on("console",msg=>{
   if(msg.type()==="error"&&/THREE.WebGLProgram|shader error|INVALID_OPERATION|startup failed|context lost/i.test(msg.text()))
    errors.push("GPU "+msg.text().slice(0,1700));
  });
  await page.addInitScript(memory=>Object.defineProperty(navigator,
   "deviceMemory",{configurable:true,get:()=>memory}),profile.deviceMemory);
  const url="http://127.0.0.1:"+port+"/skyshift/?track=vault&v=0.28.9.7"+
   "&startupAudit=1&trackRepairSmoke=1"+profile.query;
  const nav=Date.now();
  await page.goto(url,{waitUntil:"domcontentloaded",timeout:80000});
  await page.waitForFunction(()=>["ready","failed"].includes(
   window.__skyshiftBoot?.phase),null,{timeout:220000});
  const boot=await page.evaluate(()=>({
   state:window.__skyshiftBoot,
   audit:window.__skyshiftStartupAudit?.()
  }));
  if(boot.state?.phase!=="ready"||!boot.audit||crashed)
   throw Error(profile.label+" boot failed: "+JSON.stringify({boot,errors}).slice(0,3000));
  const scene=boot.audit.scene,atlas=boot.audit.atlas;
  if(scene.sharedTunnelModules!==10||scene.meshes<90||
   !Number.isFinite(boot.audit.durations.sharedTunnelMs)||
   !Number.isFinite(boot.audit.durations.pmremMs))
   throw Error(profile.label+" incomplete original source: "+JSON.stringify(boot.audit));
  if(profile.query.includes("startupAtlas=classic")){
   if(atlas.textures!==0)throw Error("classic mode did not restore ten independent atlases");
  }else if(atlas.textures!==1||atlas.references[0]?.refs!==10)
   throw Error(profile.label+" duplicate metal texture upload "+JSON.stringify(atlas));
  if(profile.query.includes("pmrem=off")&&scene.pmremActive)
   throw Error("PMREM-control comparison still had probe active");
  if(!profile.query.includes("pmrem=off")&&!scene.pmremActive)
   throw Error(profile.label+" real PMREM silently failed: "+JSON.stringify(boot.audit));
  // Drawing the actual original 3D tunnel also checks GPU context health.
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:35000});
  await page.evaluate(()=>window.__skyshiftTrackRepairTeleport(110));
  await page.waitForTimeout(260);
  await page.screenshot({path:out+"/v02897-"+profile.label+".png"});
  const render=await page.evaluate(()=>({
   width:document.querySelector("canvas")?.width||0,
   height:document.querySelector("canvas")?.height||0,
   contextLost:document.querySelector("canvas")?.getContext("webgl2")?.isContextLost?.()||false
  }));
  if(render.contextLost||render.width<100||render.height<100||errors.length)
   throw Error(profile.label+" GPU failure "+JSON.stringify({render,errors}));
  const report={label:profile.label,
   totalBootMs:boot.state.readyAfterMs,
   moduleElapsedMs:boot.audit.stamps.bootReady,
   sharedTunnelMs:boot.audit.durations.sharedTunnelMs,
   pmremMs:boot.audit.durations.pmremMs,
   atlas,scene,gpu:boot.audit.renderer,heapMB:boot.audit.jsHeapMB,
   browserElapsedMs:Date.now()-nav,render};
  reports.push(report);
  writeFileSync(out+"/v02897-startup-profile.json",JSON.stringify(reports,null,2));
  console.log("SKYSHIFT_STARTUP_02897 "+JSON.stringify(report));
  await page.close();
 }
 if(reports.length!==profiles.length)throw Error("missing startup profiles");
 console.log("PASS SKYSHIFT 0.28.9.7 real cold boot, exact shared materials and original WebGL visual");
}finally{await browser?.close();server.kill("SIGTERM");}
