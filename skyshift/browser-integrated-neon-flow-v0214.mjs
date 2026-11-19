// SKYSHIFT 0.21.4 — actual Chrome/WebGL same-frame neon flow A/B.
// Capture all four tunnel light lanes without changing camera/physics/wave
// within the two images. Verify desktop, 4GB, cyan, Solar and Jade.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chrome unavailable");
const server=spawn("python3",["-m","http.server","8814","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
const errors=[],records=[];let browser;
try{
 await sleep(1200);
 browser=await chromium.launch({headless:true,executablePath:chrome,
  args:["--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
   "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 async function load(memory,query=""){
  const page=await browser.newPage({viewport:{width:1536,height:870}});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",m=>{
   if(m.type()==="error"&&/WebGLProgram|Shader Error|INVALID_OPERATION/i.test(m.text()))
    errors.push(m.text().slice(0,750));
  });
  await page.addInitScript(n=>Object.defineProperty(navigator,"deviceMemory",
   {get:()=>n,configurable:true}),memory);
  await page.goto("http://127.0.0.1:8814/skyshift/?v=0.21.4"+
   "&artSmoke=1&flowFrameProof=1&trackRepairSmoke=1&waveSmoke=1&"+query,
   {waitUntil:"domcontentloaded",timeout:65000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:75000});
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:35000});
  return page;
 }
 function analyze(pair,label){
  const original=PNG.sync.read(Buffer.from(pair.baseline,"base64"));
  const active=PNG.sync.read(Buffer.from(pair.flow,"base64"));
  if(original.width!==active.width||original.height!==active.height)
   throw Error("Same-frame screenshot dimensions differ");
  const {width:W,height:H}=original;let changed=0,upper=0,sides=0,road=0;
  for(let y=Math.floor(H*.09);y<Math.floor(H*.95);y+=2)
   for(let x=Math.floor(W*.05);x<Math.floor(W*.95);x+=2){
    const i=4*(y*W+x),a=original.data,b=active.data;
    const diff=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+
     Math.abs(a[i+2]-b[i+2]);
    if(diff<28)continue;
    changed++;
    if(y<H*.48)upper++;
    if(x<W*.31||x>W*.69)sides++;
    if(x>W*.40&&x<W*.60&&y>H*.80)road++;
   }
  const rec={label,s:pair.trackS,flowMeshCount:pair.meshes,
   alteredPixels:changed,roofRegion:upper,wallRegion:sides,roadRegion:road};
  if(changed<220||upper<80||sides<25)
   throw Error("Continuous neon lines are not actually visible "+JSON.stringify(rec));
  if(road>changed*.32)
   throw Error("Excessive new light over playable road "+JSON.stringify(rec));
  for(const [mode,bytes] of [["before",pair.baseline],["flow",pair.flow]])
   writeFileSync("skyshift-v0214-"+label+"-"+mode+".png",Buffer.from(bytes,"base64"));
  return rec;
 }
 async function capture(page,position,palette,name,memory){
  await page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),position);
  if(palette>0)await page.evaluate(i=>window.__skyshiftWaveSmoke(i),palette);
  await page.waitForTimeout(780);
  const art=await page.evaluate(()=>window.__skyshiftArtProbe());
  const expected=memory===4?5:9;
  if(art.status!=="active"||!art.flowEnabled||art.flowStatus!=="active"||
     art.flowPaths!==4||art.drawBatches!==expected||
     art.structuralPlates>=450||art.structuralPlates<150||
     art.colliders!==0||art.originalGRIPUntouched!==true||
     !art.waveSynchronized||art.flowUnchangedPhysics!==true)
   throw Error("0.21.4 does not preserve original World/GRIP/PBR "+JSON.stringify(art));
  const pair=await page.evaluate(()=>window.__skyshiftFlowFrameProof());
  if(pair.meshes!==(memory===4?1:2))
   throw Error("Unexpected flow draw batches "+pair.meshes);
  const row=analyze(pair,name);
  records.push({...row,drawBatches:art.drawBatches,structuralPlates:art.structuralPlates,
   waveSynchronized:art.waveSynchronized});
  console.log("FLOW_CAPTURE "+JSON.stringify(records.at(-1)));
 }
 const main=await load(8);
 await capture(main,165,0,"cyan-165",8);
 await capture(main,165,2,"solar-165",8);
 await capture(main,273,3,"jade-273",8);
 await main.close();
 const mobile=await load(4);
 await capture(mobile,165,2,"mobile-solar-165",4);
 await mobile.close();
 const classic=await load(8,"tunnelFlow=classic");
 const old=await classic.evaluate(()=>window.__skyshiftArtProbe());
 if(old.flowEnabled||old.drawBatches!==7||old.structuralPlates<500)
  throw Error("Previous 0.21.3 panel architecture A/B lost "+JSON.stringify(old));
 await classic.close();
 if(errors.length)throw Error("WebGL compile/runtime errors: "+errors.join(" | "));
 writeFileSync("skyshift-v0214-neon-flow-proof.json",JSON.stringify(records,null,2));
 console.log("PASS SKYSHIFT 0.21.4: continuous neon flow, matched frame comparison, native wave and 4GB budget");
}finally{await browser?.close();server.kill("SIGTERM")}
