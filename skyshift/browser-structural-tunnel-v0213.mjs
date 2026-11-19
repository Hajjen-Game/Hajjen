// SKYSHIFT 0.21.3 — actual WebGL same-frame structural geometry proof.
// Captures exactly the same flight/camera with AND without the new matte
// wall/ceiling plates. Also verifies native zone wave, older A/B and 4GB.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chrome missing for 0.21.3");
const server=spawn("python3",["-m","http.server","8813","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
const results=[],errors=[];
let browser;
try{
 await sleep(1250);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 async function load(memory,extra=""){
  const page=await browser.newPage({viewport:{width:1536,height:870}});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",msg=>{
   if(msg.type()==="error"&&/WebGLProgram|Shader Error|INVALID_OPERATION/i.test(msg.text()))
    errors.push(msg.text().slice(0,700));
  });
  await page.addInitScript(v=>Object.defineProperty(navigator,"deviceMemory",
   {get:()=>v,configurable:true}),memory);
  await page.goto("http://127.0.0.1:8813/skyshift/?v=0.21.3"+
   "&artSmoke=1&structureFrameProof=1&trackRepairSmoke=1&waveSmoke=1&"+extra,
   {waitUntil:"domcontentloaded",timeout:65000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:75000});
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:35000});
  return page;
 }
 function compare(pair,label){
  const original=PNG.sync.read(Buffer.from(pair.classic,"base64"));
  const rebuilt=PNG.sync.read(Buffer.from(pair.structural,"base64"));
  if(original.width!==rebuilt.width||original.height!==rebuilt.height)
   throw Error("Structural A/B viewports differ");
  let changed=0,roofChanges=0,wallChanges=0,centerRoadChanges=0;
  const W=original.width,H=original.height;
  for(let y=Math.floor(H*.09);y<Math.floor(H*.90);y+=2)
   for(let x=Math.floor(W*.05);x<Math.floor(W*.95);x+=2){
    const i=4*(y*W+x),a=original.data,b=rebuilt.data;
    const delta=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+
     Math.abs(a[i+2]-b[i+2]);
    if(delta>32){
     changed++;
     if(y<H*.45)roofChanges++;
     if(x<W*.28||x>W*.72)wallChanges++;
     if(x>W*.41&&x<W*.59&&y>H*.77)centerRoadChanges++;
    }
   }
  const row={label,s:pair.trackS,meshes:pair.panels,
   changed,roofChanges,wallChanges,centerRoadChanges};
  if(changed<150||roofChanges+wallChanges<55)
   throw Error("Structural environment is not visibly different "+JSON.stringify(row));
  if(centerRoadChanges>changed*.27)
   throw Error("Structure unexpectedly covers the driving lane "+JSON.stringify(row));
  writeFileSync("skyshift-v0213-"+label+"-baseline.png",Buffer.from(pair.classic,"base64"));
  writeFileSync("skyshift-v0213-"+label+"-architecture.png",Buffer.from(pair.structural,"base64"));
  return row;
 }
 async function capture(page,s,stage,label,memory){
  await page.evaluate(n=>window.__skyshiftTrackRepairTeleport(n),s);
  if(stage>0)await page.evaluate(n=>window.__skyshiftWaveSmoke(n),stage);
  await page.waitForTimeout(820);
  const art=await page.evaluate(()=>window.__skyshiftArtProbe());
  const expected=memory===4?4:7;
  if(art.structuralEnabled!==true||art.structuralStatus!=="active"||
     art.drawBatches!==expected||art.structuralPlates<200||
     art.structuralSecondaryArches<5||art.colliders!==0||
     art.originalGRIPUntouched!==true||
     art.waveSynchronized!==true)
   throw Error("Structure not integrated / physics regression "+JSON.stringify(art));
  const result=await page.evaluate(()=>window.__skyshiftStructureFrameProof());
  if(result.panels!==(memory===4?1:2))
   throw Error("Wrong number of structural batches "+result.panels);
  const stats=compare(result,label);
  results.push({...stats,art:{
   drawBatches:art.drawBatches,structuralPlates:art.structuralPlates,
   geometryTriangles:art.structureTriangles,
   spectrumActive:art.waveSynchronized,gripUnchanged:art.originalGRIPUntouched}});
  console.log("STRUCTURAL_QA "+JSON.stringify(results.at(-1)));
 }
 const high=await load(8);
 await capture(high,165,0,"cyan-165",8);
 await capture(high,165,2,"gold-165",8);
 await capture(high,273,3,"jade-273",8);
 await high.close();
 const mobile=await load(4);
 await capture(mobile,165,2,"mobile-gold-165",4);
 await mobile.close();
 const legacy=await load(8,"tunnelStructure=classic");
 const before=await legacy.evaluate(()=>window.__skyshiftArtProbe());
 if(before.structuralEnabled===true||before.drawBatches!==5)
  throw Error("Original 0.21.2.6 A/B lost "+JSON.stringify(before));
 await legacy.close();
 if(errors.length)throw Error("WebGL shader errors "+errors.join(" | "));
 writeFileSync("skyshift-v0213-structural-proof.json",JSON.stringify(results,null,2));
 console.log("PASS SKYSHIFT 0.21.3 structural same-frame geometry, mobile tier and unchanged wave/GRIP");
}finally{await browser?.close();server.kill("SIGTERM")}
