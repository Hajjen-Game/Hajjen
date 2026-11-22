// SKYSHIFT 0.28.9.3 — genuine Chromium/WebGL, four exact-frame A/B
// components per scene. NOT generated concept art.
import {spawn} from "node:child_process";
import {existsSync,mkdirSync,writeFileSync} from "node:fs";
import {setTimeout as wait} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("0.28.9.3 requires real Chrome/WebGL");
const dir="skyshift/previews/",port=8896;mkdirSync(dir,{recursive:true});
const server=spawn("python3",["-m","http.server",String(port),
 "--bind","127.0.0.1"],{cwd:process.cwd(),stdio:"ignore"});
const errors=[],proof=[];let browser;
const cases=[
 {s:110,memory:8,stage:0,kind:"straight cyan"},
 {s:292,memory:8,stage:4,kind:"banked bend pink"},
 {s:955,memory:8,stage:4,kind:"outer sweeping pink"},
 {s:1840,memory:4,stage:4,kind:"4GB pink"}
];
function changed(a,b,{region="all",difference=5}={}){
 const p=PNG.sync.read(a),q=PNG.sync.read(b);
 if(p.width!==q.width||p.height!==q.height)throw Error("unequal images");
 let touched=0,loud=0,paint=0,area=0;const w=p.width,h=p.height;
 for(let y=22;y<h-25;y+=3){
  if(region==="road"&&y<h*.58)continue;
  if(region==="arch"&&y>h*.81)continue;
  for(let x=8;x<w-8;x+=3){
   if(region==="road"&&(x<w*.16||x>w*.84))continue;
   const i=(y*w+x)*4,pix=p.data,old=q.data;
   const delta=Math.abs(pix[i]-old[i])+Math.abs(pix[i+1]-old[i+1])+
     Math.abs(pix[i+2]-old[i+2]);
   if(delta>difference)touched++;
   if(delta>18)loud++;
   if(delta>35)paint++;
   area++;
  }
 }
 return {touched,loud,paint,area};
}
async function take(spec,classic=false,legacyOff=false){
 const label=(spec.memory===4?"4GB":"High")+"-"+spec.s+
  (classic?"-classic":legacyOff?"-legacy-off":"-premium")+
  (spec.stage===4?"-pink":"-cyan");
 const page=await browser.newPage({viewport:{width:1536,height:870}});
 page.on("pageerror",e=>errors.push(label+" PAGE: "+e.message));
 page.on("console",m=>{if(m.type()==="error"&&
   /THREE.WebGLProgram|shader error|compile failed|INVALID_OPERATION|WebGL:/i.test(m.text()))
   errors.push(label+" GPU: "+m.text().slice(0,1200));});
 await page.addInitScript(mem=>Object.defineProperty(navigator,"deviceMemory",
  {configurable:true,get:()=>mem}),spec.memory);
 const url="http://127.0.0.1:"+port+
  "/skyshift/?track=vault&v=0.28.9.3&archOpticsSmoke=1"+
  "&sharedTunnelSmoke=1&trackRepairSmoke=1"+
  (classic?"&archOptics=classic":"")+
  (legacyOff?"&archLegacyRoad=off":"");
 await page.goto(url,{waitUntil:"domcontentloaded",timeout:80000});
 await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
  null,{timeout:165000});
 await page.locator("#start-btn").click();
 await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:50000});
 await page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),spec.s);
 // Historic classic includes the stage-setter only for QA; color state
 // still uses the actual 9-stage original zone-wave and road palette.
 const audit=await page.evaluate(([stage,front])=>
  window.__skyshiftArchOpticsSetStage(stage,front),[spec.stage,spec.s-160]);
 await page.waitForTimeout(620);
 if(!audit.originalGrip||!audit.originalShip||!audit.originalPhysics||
  !audit.edge?.active)throw Error(label+" lost ship/GRIP/0.28.9.1");
 if(classic){
  if(audit.source?.active||audit.road?.active||audit.requested)
   throw Error(label+" 0.28.9.2 rollback failed");
  const image=await page.screenshot({path:dir+"v02893-"+label+".png"});
  proof.push({label,classic:true,pink:spec.stage===4,legacy:audit.legacyRoadResponseCount});
 }else{
  if(!audit.source?.active||audit.source.sourceModules!==10||
   audit.source.originalArches!==100||
   !audit.road?.active||audit.road.sourceModules!==10||
   !audit.road.nativeGGX||audit.road.drawCallsAdded!==0||
   !audit.source.noNewDrawCalls||audit.road.lowMemory!==(spec.memory===4))
   throw Error(label+" new optics not installed "+JSON.stringify(audit));
  const frame=await page.evaluate(()=>window.__skyshiftArchOpticsFrameProof());
  const data={};
  for(const mode of ["classic","archOnly","roadOnly","after"]){
   data[mode]=Buffer.from(frame[mode],"base64");
   writeFileSync(dir+"v02893-"+label+"-"+mode+".png",data[mode]);
  }
  const arch=changed(data.classic,data.archOnly,{region:"arch"});
  const road=changed(data.classic,data.roadOnly,{region:"road"});
  const final=changed(data.classic,data.after,{region:"all"});
  const image=await page.screenshot({path:dir+"v02893-"+label+".png"});
  if(arch.touched<70||road.touched<8||final.touched<80)
   throw Error(label+" non-visible actual WebGL upgrade "+JSON.stringify({arch,road,final}));
  proof.push({label,pink:spec.stage===4,memory:spec.memory,
   arch,road,final,source:audit.source,roadSource:audit.road,
   legacyCount:audit.legacyRoadResponseCount,
   legacySuppressed:audit.legacyRoadResponseSuppressed});
 }
 console.log("ARCH_OPTICS_02893 "+JSON.stringify(proof.at(-1)));
 writeFileSync(dir+"v02893-proof.json",JSON.stringify(proof,null,2));
 await page.close();
}
try{
 await wait(800);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 for(const spec of cases)await take(spec);
 await take(cases[0],true);
 await take(cases[1],false,true);
 if(errors.length)throw Error(errors.join(" | "));
 console.log("PASS SKYSHIFT 0.28.9.3 genuine source-arch + palette road GGX; "+
  "pink/cyan, High/4GB, classic and old additive overlay comparison");
}finally{await browser?.close();server.kill("SIGTERM");}
