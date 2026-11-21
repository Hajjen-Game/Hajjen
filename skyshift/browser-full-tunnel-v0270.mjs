// SKYSHIFT 0.27.0 — real, reproducible Chromium WebGL full 3400m
// NEON VAULT visual proof. No AI-generated image or substitute rendering.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("0.27.0 real Chromium/WebGL required");
const server=spawn("python3",["-m","http.server","8874","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
const errors=[],reports=[];
let browser;
function inspect(b64,label,memory,s){
 const image=PNG.sync.read(Buffer.from(b64,"base64"));
 if(image.width!==1536||image.height!==870)
  throw Error("0.27.0 expected real 1536x870 WebGL render");
 writeFileSync("skyshift-v0270-"+label+".png",Buffer.from(b64,"base64"));
 let cyan=0,amber=0,white=0,dark=0,nonblack=0,pixels=0;
 for(let y=95;y<image.height-36;y+=4)
 for(let x=50;x<image.width-50;x+=4){
  const k=(y*image.width+x)*4;
  const r=image.data[k],g=image.data[k+1],b=image.data[k+2];
  pixels++;
  if(b>g*1.09&&g>r*1.38&&b>62)cyan++;
  if(r>g*1.20&&g>b*1.48&&r>70)amber++;
  if(Math.min(r,g,b)>240)white++;
  if(r+g+b<30)dark++;
  if(r+g+b>90)nonblack++;
 }
 const report={label,s,memory,pixels,cyan,amber,white,dark,nonblack};
 reports.push(report);
 writeFileSync("skyshift-v0270-proof.json",JSON.stringify(reports,null,2));
 console.log("NEON_VAULT_0270 "+JSON.stringify(report));
 if(cyan<85||nonblack<800)
  throw Error("0.27.0 tunnel scene lacks real luminous architecture "+JSON.stringify(report));
 if(white>pixels*.15)
  throw Error("0.27.0 reintroduced all-white scene spill");
}
try{
 await sleep(800);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 async function open(memory,extra=""){
  const page=await browser.newPage({viewport:{width:1536,height:870}});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",m=>{
   if(m.type()==="error"&&/Shader Error|WebGLProgram|INVALID_OPERATION|THREE.WebGLProgram/i.test(m.text()))
    errors.push(m.text().slice(0,2000));
  });
  await page.addInitScript(x=>Object.defineProperty(navigator,
   "deviceMemory",{configurable:true,get:()=>x}),memory);
  await page.goto("http://127.0.0.1:8874/skyshift/?track=vault&v=0.27.0"+
   "&fullTunnelSmoke=1&fullTunnelFrameProof=1&trackRepairSmoke=1&waveSmoke=1&"+extra,
   {waitUntil:"domcontentloaded",timeout:65000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:90000});
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:45000});
  return page;
 }
 async function take(page,s,zone,label,memory){
  await page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),s);
  if(zone)await page.evaluate(z=>window.__skyshiftWaveSmoke(z),zone);
  await page.waitForTimeout(640);
  const q=await page.evaluate(()=>window.__skyshiftFullTunnelProbe());
  if(q.selected!=="vault"||!q.requested||!q.active||
   q.version!=="0.27.0"||q.status!=="active"||
   q.coverageMeters!==3400||q.end!==3400||
   q.chunks!==20||q.drawBatches!==60||q.collidersAdded!==0||
   !q.roofClosed||!q.sourceLit||!q.originalRoadUntouched||
   !q.originalShip||!q.intactRail||!q.noJump||
   !q.originalGripAvailable||q.totalMeters!==10200||
   q.lapMeters!==3400||q.quality!==(memory===4?"4GB":"High")||
   !q.solarIndependentMaterials)
   throw Error("0.27.0 original racing and full-tunnel invariants failed: "+JSON.stringify(q));
  const frame=await page.evaluate(()=>window.__skyshiftFullTunnelFrameProof());
  if(Math.abs(frame.s-s)>.1)throw Error("teleport s mismatch");
  inspect(frame.image,label,memory,s);
 }
 const high=await open(8);
 await take(high,100,1,"high-launch",8);
 await take(high,980,2,"high-grip",8);
 await take(high,1830,1,"high-return",8);
 await take(high,3230,2,"high-finale",8);
 await high.close();
 const mobile=await open(4);
 await take(mobile,100,1,"4gb-launch",4);
 await take(mobile,1910,2,"4gb-return",4);
 await mobile.close();
 const classic=await open(8,"fullTunnel=classic");
 const state=await classic.evaluate(()=>window.__skyshiftFullTunnelProbe());
 if(state.active||state.coverageMeters!==0)
  throw Error("0.27.0 classic did not remove new tunnel environment");
 await classic.close();
 if(errors.length)throw Error("real WebGL errors "+errors.join(" | "));
 console.log("PASS SKYSHIFT 0.27.0 full-lap closed 3400m tunnel High/4GB proof");
}finally{await browser?.close();server.kill("SIGTERM");}
