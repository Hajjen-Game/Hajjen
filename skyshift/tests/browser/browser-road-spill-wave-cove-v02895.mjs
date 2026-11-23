// SKYSHIFT 0.28.9.5 genuine Playwright Chromium/WebGL proof.
// Compare the SAME camera frame with original Skyline/Vault fixture sources.
// A/B toggles are original GPU uniform strengths, not concept images.
import {spawn} from "node:child_process";
import {existsSync,mkdirSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(existsSync)[0];
if(!chrome)throw Error("0.28.9.5 needs actual Chrome/WebGL");
const dir="skyshift/previews/",port=8898;mkdirSync(dir,{recursive:true});
const server=spawn("python3",["-m","http.server",String(port),
 "--bind","127.0.0.1"],{cwd:process.cwd(),stdio:"ignore"});
const proof=[],errors=[];let browser;
const scenes=[
 {s:110,memory:8,stage:0,label:"High-110-cyan-straight"},
 {s:1210,memory:8,stage:4,label:"High-1210-pink-straight"},
 {s:292,memory:8,stage:4,label:"High-292-pink-bend"},
 {s:1840,memory:4,stage:4,label:"4GB-1840-pink-straight"}
];
function measure(a,b,part){
 const p=PNG.sync.read(a),q=PNG.sync.read(b);
 if(p.width!==q.width||p.height!==q.height)throw Error("Image sizes differ");
 let touched=0,bright=0,area=0,peak=0;const W=p.width,H=p.height;
 for(let y=30;y<H-24;y+=3){
  if(part==="road"&&y<H*.47)continue;
  if(part==="wall"&&y>H*.74)continue;
  for(let x=12;x<W-12;x+=3){
   if(part==="road"&&(x<W*.07||x>W*.93))continue;
   const i=(y*W+x)*4;
   const d=Math.abs(p.data[i]-q.data[i])+
    Math.abs(p.data[i+1]-q.data[i+1])+
    Math.abs(p.data[i+2]-q.data[i+2]);
   area++;if(d>5)touched++;if(d>22)bright++;peak=Math.max(peak,d);
  }
 }
 return {touched,bright,peak,area,coverage:touched/Math.max(1,area)};
}
async function capture(spec,{classicRoad=false,classicCove=false}={}){
 const pg=await browser.newPage({viewport:{width:1440,height:840}});
 pg.on("pageerror",e=>errors.push(spec.label+" PAGE "+e.message));
 pg.on("console",m=>{if(m.type()==="error"&&
  /THREE.WebGLProgram|compile failed|shader error|INVALID_OPERATION|WebGL:/i.test(m.text()))
  errors.push(spec.label+" GL "+m.text().slice(0,1300));});
 await pg.addInitScript(memory=>Object.defineProperty(navigator,
  "deviceMemory",{configurable:true,get:()=>memory}),spec.memory);
 const search="track=vault&v=0.28.9.5&roadSpillWaveSmoke=1"+
  "&archOpticsSmoke=1&trackRepairSmoke=1&sharedTunnelSmoke=1"+
  (classicRoad?"&roadSpill=classic":"")+
  (classicCove?"&coveWave=classic":"");
 await pg.goto("http://127.0.0.1:"+port+"/skyshift/?"+search,
  {waitUntil:"domcontentloaded",timeout:80000});
 await pg.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
  null,{timeout:160000});
 await pg.locator("#start-btn").click();
 await pg.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
  null,{timeout:50000});
 await pg.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),spec.s);
 await pg.evaluate(([stage,front])=>window.__skyshiftArchOpticsSetStage(stage,front),
  [spec.stage,spec.s-155]);
 await pg.waitForTimeout(650);
 const audit=await pg.evaluate(()=>window.__skyshiftRoadSpillWaveAudit());
 if(!audit.originalShip||!audit.originalGrip||
  !audit.edge?.active||!audit.ceiling?.active||
  !audit.spill||!audit.cove)
  throw Error(spec.label+" original base pipeline broke "+JSON.stringify(audit));
 if(classicRoad||classicCove){
  if(classicRoad&&audit.spill.active)throw Error("classic lip still active");
  if(classicCove&&audit.cove.active)throw Error("classic roof wave still active");
  await pg.screenshot({path:dir+"v02895-"+spec.label+
   (classicRoad?"-road-classic":"-cove-classic")+".png"});
  await pg.close();return;
 }
 if(!audit.requested||!audit.spill.active||
  !audit.cove.active||audit.cove.modules!==10||
  audit.cove.physicalCoats<(spec.memory===4?10:20)||
  !audit.spill.straightOnly||audit.spill.extraRoadAttributes!==0)
  throw Error(spec.label+" source/wave parity failed "+JSON.stringify(audit));
 const raw=await pg.evaluate(()=>window.__skyshiftRoadSpillWaveFrameProof());
 const b={};
 for(const name of ["classic","spillOnly","coveOnly","after"]){
  b[name]=Buffer.from(raw[name],"base64");
  writeFileSync(dir+"v02895-"+spec.label+"-"+name+".png",b[name]);
 }
 await pg.screenshot({path:dir+"v02895-"+spec.label+"-full.png"});
 const road=measure(b.classic,b.spillOnly,"road"),
  wall=measure(b.classic,b.coveOnly,"wall"),
  combined=measure(b.classic,b.after,"road");
 // Pixel coverage is a guard against the old 0.28.9 road-wide cyan wash.
 // Bends must not regain the straight-only lip lamps.
 if(road.coverage>.26||combined.coverage>.33)
  throw Error(spec.label+" broad road color wash "+JSON.stringify({road,combined}));
 proof.push({label:spec.label,memory:spec.memory,stage:spec.stage,
  road,wall,combined,source:audit.cove.sample,edge:audit.edge});
 writeFileSync(dir+"v02895-proof.json",JSON.stringify(proof,null,2));
 console.log("ROAD_SPILL_COVE_02895 "+JSON.stringify(proof.at(-1)));
 await pg.close();
}
try{
 await sleep(650);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 for(const spec of scenes)await capture(spec);
 await capture(scenes[0],{classicRoad:true});
 await capture(scenes[0],{classicCove:true});
 if(errors.length)throw Error("GPU shader/browser errors:\n"+errors.join("\n"));
 const straights=proof.filter(x=>x.label.includes("straight"));
 if(!straights.some(x=>x.road.touched>20)||
    !proof.some(x=>x.stage===4&&x.wall.touched>50)||
    !proof.some(x=>x.memory===4&&x.road.touched>10))
  throw Error("0.28.9.5 real local road spill or pink wall not visible "+
   JSON.stringify(proof.map(p=>({s:p.label,road:p.road.touched,wall:p.wall.touched}))));
 console.log("PASS SKYSHIFT 0.28.9.5 real WebGL local lip pools and traveling physical metal cove colors, High/4GB, rollback");
}finally{await browser?.close();server.kill("SIGTERM");}
