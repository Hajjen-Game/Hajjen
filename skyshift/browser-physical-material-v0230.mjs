// SKYSHIFT 0.23.0 P1 real Chromium/WebGL same-frame material study.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chrome unavailable");
const server=spawn("python3",["-m","http.server","8825","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
const errors=[],results=[];
function compare(pair,label,low=false){
 const a=PNG.sync.read(Buffer.from(pair.classic,"base64"));
 const b=PNG.sync.read(Buffer.from(pair.physical,"base64"));
 if(a.width!==b.width||a.height!==b.height)throw Error("Different frame sizes");
 const W=a.width,H=a.height;
 const state={label,s:pair.position,changed:0,upperTunnel:0,sideWall:0,
  centerRoad:0,whiteBefore:0,whiteAfter:0};
 for(let y=Math.floor(H*.08);y<Math.floor(H*.95);y+=2)
  for(let x=Math.floor(W*.035);x<Math.floor(W*.965);x+=2){
   const i=4*(y*W+x),old=a.data,next=b.data;
   const delta=Math.abs(old[i]-next[i])+Math.abs(old[i+1]-next[i+1])+
    Math.abs(old[i+2]-next[i+2]);
   if(Math.min(old[i],old[i+1],old[i+2])>205)state.whiteBefore++;
   if(Math.min(next[i],next[i+1],next[i+2])>205)state.whiteAfter++;
   if(delta<10)continue;
   state.changed++;
   if(y<H*.47)state.upperTunnel++;
   if(x<W*.30||x>W*.70)state.sideWall++;
   if(x>W*.44&&x<W*.56&&y>H*.75)state.centerRoad++;
  }
 if(state.changed<(low?55:160)||state.upperTunnel<30||
    state.sideWall<30)
  throw Error("Physical material not visible "+JSON.stringify(state));
 if(state.centerRoad>state.changed*.28+55)
  throw Error("New material changes driving corridor "+JSON.stringify(state));
 if(state.whiteAfter>state.whiteBefore*1.26+55)
  throw Error("White solar spill regression "+JSON.stringify(state));
 for(const [kind,data] of [["classic",pair.classic],["material",pair.physical]])
  writeFileSync("skyshift-v0230p1-"+label+"-"+kind+".png",
   Buffer.from(data,"base64"));
 return state;
}
try{
 await sleep(1100);
 browser=await chromium.launch({headless:true,executablePath:chrome,
  args:["--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 async function open(memory,extra=""){
  const page=await browser.newPage({viewport:{width:1536,height:870}});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",m=>{
   if(m.type()==="error"&&/WebGLProgram|Shader Error|INVALID_OPERATION/i.test(m.text()))
    errors.push(m.text().slice(0,1600));
  });
  await page.addInitScript(n=>Object.defineProperty(navigator,"deviceMemory",
   {configurable:true,get:()=>n}),memory);
  await page.goto("http://127.0.0.1:8825/skyshift/?v=0.23.0"+
   "&artSmoke=1&physicalMaterialSmoke=1&physicalMaterialFrameProof=1"+
   "&trackRepairSmoke=1&waveSmoke=1&"+extra,
   {waitUntil:"domcontentloaded",timeout:65000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:80000});
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:35000});
  return page;
 }
 async function capture(page,s,zone,label,memory){
  await page.evaluate(n=>window.__skyshiftTrackRepairTeleport(n),s);
  if(zone)await page.evaluate(n=>window.__skyshiftWaveSmoke(n),zone);
  await page.waitForTimeout(800);
  const status=await page.evaluate(()=>window.__skyshiftPhysicalMaterialProbe());
  if(!status.requested||!status.physicalMaterial023Enabled||
     status.physicalMaterial023Status!=="active"||
     status.physicalMaterial023Batches!==(memory===4?3:4)||
     status.physicalMaterial023AddedDrawCalls!==0||
     status.roadSolarSeal!==1||
     status.drawBatches!==(memory===4?5:9)||
     (memory===4&&status.physicalMaterial023FrameVertices!==0))
   throw Error("0.23.0 physical pipeline not active "+JSON.stringify(status));
  const image=await page.evaluate(()=>window.__skyshiftPhysicalMaterialFrameProof());
  const stats=compare(image,label,memory===4);
  results.push({...stats,mobile:memory===4});
  console.log("PHYSICAL_MATERIAL_P1 "+JSON.stringify(results.at(-1)));
 }
 const high=await open(8);
 await capture(high,165,0,"cyan-165",8);
 await capture(high,165,2,"gold-165",8);
 await capture(high,165,3,"jade-165",8);
 await high.close();
 const mobile=await open(4);
 await capture(mobile,165,2,"mobile-gold-165",4);
 await mobile.close();
 const classic=await open(8,"physicalMaterial=classic");
 const old=await classic.evaluate(()=>window.__skyshiftPhysicalMaterialProbe());
 if(old.requested||old.physicalMaterial023Enabled)
  throw Error("Old 0.22 metal comparison broken "+JSON.stringify(old));
 await classic.close();
 if(errors.length)throw Error("GPU errors "+errors.join(" | "));
 writeFileSync("skyshift-v0230p1-proof.json",JSON.stringify(results,null,2));
 console.log("PASS SKYSHIFT 0.23.0 P1 real WebGL GGX metal and 4GB");
}finally{await browser?.close();server.kill("SIGTERM")}
