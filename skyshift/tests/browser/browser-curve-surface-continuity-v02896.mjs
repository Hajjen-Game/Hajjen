// SKYSHIFT 0.28.9.6 – real Chrome/WebGL A/B at the exact camera frame.
// No synthetic pictures; uses actual Manta Blade, indexed PBR road, full tunnel.
import {spawn} from "node:child_process";
import {existsSync,mkdirSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const binary=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(existsSync)[0];
if(!binary)throw Error("0.28.9.6 actual Chromium/WebGL needed");
const out="skyshift/previews/",port=8899;mkdirSync(out,{recursive:true});
const server=spawn("python3",["-m","http.server",String(port),
 "--bind","127.0.0.1"],{cwd:process.cwd(),stdio:"ignore"});
const scenes=[
 {label:"High-216-curve-approach",s:216,front:60,stage:0,memory:8},
 {label:"High-292-curve",s:292,front:1992,stage:4,memory:8},
 {label:"High-1210-opposite-wave",s:1210,front:2910,stage:4,memory:8},
 {label:"4GB-1916-opposite-wave",s:1916,front:3616,stage:4,memory:4}
];
let browser;const results=[],errors=[];
function diff(a,b){
 const x=PNG.sync.read(a),y=PNG.sync.read(b);
 if(x.width!==y.width||x.height!==y.height)throw Error("mismatched real screenshots");
 const W=x.width,H=x.height;let pixels=0,changed=0,large=0,total=0,peak=0;
 for(let h=Math.floor(H*.48);h<H-25;h+=3)
 for(let w=Math.floor(W*.06);w<Math.ceil(W*.94);w+=3){
  const i=(h*W+w)*4;
  const d=Math.abs(x.data[i]-y.data[i])+
   Math.abs(x.data[i+1]-y.data[i+1])+
   Math.abs(x.data[i+2]-y.data[i+2]);
  pixels++;if(d>5)changed++;if(d>24)large++;
  total+=d;peak=Math.max(peak,d);
 }
 return {pixels,changed,large,coverage:+(changed/pixels).toFixed(4),
  mean:+(total/pixels).toFixed(3),peak};
}
async function capture(scene){
 const p=await browser.newPage({viewport:{width:1440,height:840}});
 p.on("pageerror",e=>errors.push(scene.label+" JS "+e.message));
 p.on("console",msg=>{
  if(msg.type()==="error"&&/THREE.WebGLProgram|shader error|compile failed|WebGL:|INVALID_OPERATION/i.test(msg.text()))
   errors.push(scene.label+" shader "+msg.text().slice(0,1600));
 });
 await p.addInitScript(memory=>Object.defineProperty(navigator,
  "deviceMemory",{configurable:true,get:()=>memory}),scene.memory);
 await p.goto("http://127.0.0.1:"+port+"/skyshift/?track=vault&v=0.28.9.6"+
  "&curveContinuitySmoke=1&archOpticsSmoke=1&trackRepairSmoke=1"+
  "&sharedTunnelSmoke=1",{waitUntil:"domcontentloaded",timeout:80000});
 await p.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",null,{timeout:160000});
 await p.locator("#start-btn").click();
 await p.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",null,{timeout:50000});
 await p.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),scene.s);
 await p.evaluate(([stage,front])=>window.__skyshiftArchOpticsSetStage(stage,front),
  [scene.stage,scene.front]);
 await p.waitForTimeout(650);
 const audit=await p.evaluate(()=>window.__skyshiftCurveContinuityAudit());
 if(!audit.requested||!audit.road?.active||
  audit.road.sourceVertices<12000||
  audit.road.changedOpticalMaskVertices<10||
  audit.road.extraRoadAttributes!==0||
  !audit.road.allTurnMasksZero||!audit.originalEdge?.active||
  !audit.originalSpill?.active||!audit.originalCeiling?.active||
  !audit.originalShip||!audit.originalGrip||!audit.physics)
  throw Error("0.28.9.6 real native pipeline regression: "+JSON.stringify(audit));
 const proof=await p.evaluate(()=>window.__skyshiftCurveContinuityFrameProof());
 const images={};
 for(const type of ["classic","curveOnly","waveOnly","after"]){
  images[type]=Buffer.from(proof[type],"base64");
  writeFileSync(out+"v02896-"+scene.label+"-"+type+".png",images[type]);
 }
 await p.screenshot({path:out+"v02896-"+scene.label+"-full.png"});
 const curve=diff(images.classic,images.curveOnly),
  seam=diff(images.classic,images.waveOnly),
  total=diff(images.classic,images.after);
 if(total.coverage>.44||seam.coverage>.40)
  throw Error("0.28.9.6 introduced a broad road-wide color wash "+JSON.stringify({scene,curve,seam,total}));
 if(scene.label.includes("opposite")&&seam.changed<25)
  throw Error("0.28.9.6 missing actual opposite wave seam correction "+JSON.stringify({scene,seam}));
 results.push({label:scene.label,s:scene.s,stage:scene.stage,
  memory:scene.memory,curve,seam,total,
  opticalVertices:audit.road.changedOpticalMaskVertices,
  originalSourcesSafe:audit.originalEdge.active});
 writeFileSync(out+"v02896-proof.json",JSON.stringify(results,null,2));
 console.log("CURVE_CONTINUITY_02896 "+JSON.stringify(results.at(-1)));
 await p.close();
}
try{
 await sleep(500);
 browser=await chromium.launch({headless:true,executablePath:binary,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 for(const scene of scenes)await capture(scene);
 if(errors.length)throw Error("WebGL/JS issues:\n"+errors.join("\n"));
 if(!results.some(x=>x.curve.changed>10))
  throw Error("0.28.9.6 curve optical fade not visible in real images");
 if(!results.some(x=>x.seam.changed>50&&x.label.includes("opposite")))
  throw Error("0.28.9.6 anti-seam not visible at real sampled wavefront");
 console.log("PASS SKYSHIFT 0.28.9.6 real indexed road; anti-lap seam High/4GB and 0.28.9.1 protected curve-edge light");
}finally{await browser?.close();server.kill("SIGTERM");}
