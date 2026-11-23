// SKYSHIFT 0.28.9.4 — actual Chromium/WebGL proof, not concept art.
// Same camera/frame: original 0.21.2 additive road layer / ceiling-source
// native GGX independently on/off, High/4GB and pink/cyan zone wave.
import {spawn} from "node:child_process";
import {existsSync,mkdirSync,writeFileSync} from "node:fs";
import {setTimeout as wait} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const executablePath=[process.env.CHROME_PATH,
 "/usr/bin/google-chrome","/usr/bin/google-chrome-stable",
 "/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!executablePath)throw Error("0.28.9.4 original Chrome/WebGL unavailable");
const dir="skyshift/previews/";mkdirSync(dir,{recursive:true});
const server=spawn("python3",["-m","http.server","8897","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
const errors=[],proof=[];let browser;
function diff(a,b,{region="road"}={}){
 const before=PNG.sync.read(a),after=PNG.sync.read(b);
 if(before.width!==after.width||before.height!==after.height)
  throw Error("0.28.9.4 image dimensions changed");
 let touched=0,substantial=0,area=0,peak=0;
 const W=before.width,H=before.height;
 for(let y=20;y<H-20;y+=3){
  if(region==="road"&&y<H*.54)continue;
  for(let x=15;x<W-15;x+=3){
   if(region==="road"&&(x<W*.15||x>W*.85))continue;
   const i=(y*W+x)*4,A=before.data,B=after.data,
    d=Math.abs(A[i]-B[i])+Math.abs(A[i+1]-B[i+1])+
      Math.abs(A[i+2]-B[i+2]);
   area++;if(d>4)touched++;if(d>19)substantial++;
   peak=Math.max(peak,d);
  }
 }
 return {touched,substantial,area,peak};
}
const shots=[
 {s:126,stage:0,gb:8,label:"High-126-cyan"},
 {s:292,stage:4,gb:8,label:"High-292-pink"},
 {s:955,stage:4,gb:8,label:"High-955-pink"},
 {s:1840,stage:4,gb:4,label:"4GB-1840-pink"}
];
async function open(spec,extra=""){
 const p=await browser.newPage({viewport:{width:1440,height:854}});
 p.on("pageerror",e=>errors.push(spec.label+" PAGE "+e.message));
 p.on("console",m=>{if(m.type()==="error"&&
  /THREE.WebGLProgram|shader error|compile failed|INVALID_OPERATION|WebGL:/i.test(m.text()))
  errors.push(spec.label+" GPU "+m.text().slice(0,1000));});
 await p.addInitScript(gb=>Object.defineProperty(navigator,"deviceMemory",
  {configurable:true,get:()=>gb}),spec.gb);
 const url="http://127.0.0.1:8897/skyshift/?track=vault&v=0.28.9.4"+
  "&unifiedSourcesSmoke=1&archOpticsSmoke=1&trackRepairSmoke=1"+extra;
 await p.goto(url,{waitUntil:"domcontentloaded",timeout:80000});
 await p.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
  null,{timeout:150000});
 await p.locator("#start-btn").click();
 await p.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:45000});
 await p.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),spec.s);
 await p.evaluate(([stage,front])=>window.__skyshiftArchOpticsSetStage(stage,front),
  [spec.stage,spec.s-155]);
 await p.waitForTimeout(650);
 return p;
}
async function capture(spec){
 const page=await open(spec),audit=await page.evaluate(()=>
  window.__skyshiftUnifiedSourcesAudit());
 if(!audit.requested||!audit.ceilingRoad?.active||
  !audit.ceilingRoad?.originalIndexedPBRMaterial||
  !audit.ceilingRoad?.physicalGGX||
  audit.ceilingRoad?.additionalRoadAttributes!==1||
  !audit.ceilingRoad?.webglGuaranteedAttributeBudget||
  audit.ceilingRoad?.modules!==10||
  audit.ceilingRoad?.drawCallsAdded!==0||
  !audit.arch?.sharedRegistry02894||!audit.arch?.packedArcWindow02894||
  audit.arch?.sourceAttributes!==3||
  !audit.edges?.active||!audit.source?.active||
  !audit.movedCeiling?.active||!audit.shipPresent||!audit.gripPresent||
  !audit.originalPhysics)
  throw Error(spec.label+" original physical sources not aligned: "+
   JSON.stringify(audit));
 if(spec.gb===4){
  if(audit.ceilingRoad.lowMemory!==true||audit.oldRoad.removedBatches!==0)
   throw Error("0.28.9.4 4 GB retained source overflow/old layer");
 }else if(audit.oldRoad.removedBatches!==10)
   throw Error("0.28.9.4 old ten additive road draws not cleaned");
 const buffers=await page.evaluate(()=>window.__skyshiftUnifiedSourcesFrameProof());
 const images={};
 for(const k of ["classic","cleanOnly","sourceOnly","after"]){
  images[k]=Buffer.from(buffers[k],"base64");
  writeFileSync(dir+"v02894-"+spec.label+"-"+k+".png",images[k]);
 }
 await page.screenshot({path:dir+"v02894-"+spec.label+"-full.png"});
 const clean=diff(images.classic,images.cleanOnly),
  source=diff(images.classic,images.sourceOnly),
  combined=diff(images.classic,images.after);
 // Source-specific, NOT full-scene bloom or colored road paint. If the
 // floor effect covers most of the screen, the pass failed artistically.
 if(source.touched>source.area*.23||combined.touched>combined.area*.23)
  throw Error(spec.label+" 0.28.9.4 broad road wash "+JSON.stringify({source,combined}));
 proof.push({label:spec.label,gb:spec.gb,pink:spec.stage===4,
  clean,source,combined,sourceRegistry:audit.ceilingRoad,
  legacy:audit.oldRoad,straightOnly:audit.source.active});
 writeFileSync(dir+"v02894-proof.json",JSON.stringify(proof,null,2));
 console.log("UNIFIED_LIGHT_SOURCES_02894 "+JSON.stringify(proof.at(-1)));
 await page.close();
}
async function rollback(){
 const spec={s:126,stage:0,gb:8,label:"High-126-cyan"};
 for(const [params,expected] of [
  ["&unifiedLights=classic",{on:false,legacy:0}],
  ["&roadLayers=classic",{on:true,legacy:0}],
  ["&ceilingRoad=classic",{on:false,legacy:10}]
 ]){
  const page=await open(spec,params);
  const audit=await page.evaluate(()=>window.__skyshiftUnifiedSourcesAudit());
  if(Boolean(audit.ceilingRoad?.active)!==expected.on||
   audit.oldRoad?.removedBatches!==expected.legacy)
   throw Error("0.28.9.4 rollback broken "+params+" "+JSON.stringify(audit));
  await page.screenshot({path:dir+"v02894-rollback-"+params.split("=")[0].slice(1)+".png"});
  await page.close();
 }
}
try{
 await wait(800);
 browser=await chromium.launch({headless:true,executablePath,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 for(const spec of shots)await capture(spec);
 await rollback();
 if(errors.length)throw Error(errors.join("\n"));
 const source=proof.reduce((n,p)=>n+p.source.touched,0);
 if(source<30||!proof.some(p=>p.pink&&p.source.touched>8))
  throw Error("0.28.9.4 shared ceiling GGX is not visible in genuine screenshots "+
   JSON.stringify(proof.map(p=>({label:p.label,source:p.source.touched}))));
 console.log("PASS original 0.21.2 layer cleanup and real 0.28.9.2 j11/j9 source-linked GGX: High, 4GB, pink, cyan and independent rollback");
}finally{await browser?.close();server.kill("SIGTERM");}
