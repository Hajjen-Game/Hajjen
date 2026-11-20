// SKYSHIFT 0.21.2.5 — verified same-frame ship-only white-key containment.
// Bakes exact WebGL pairs; no camera movement, physics step or bloom change
// between old and new. Photo variants cover cyan, gold, jade and hull bank.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chromium missing");
const server=spawn("python3",["-m","http.server","8810","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
try{
 await sleep(1100);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 const errors=[],records=[];
 async function load(lowMemory=false){
  const page=await browser.newPage({viewport:{width:1536,height:870}});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",m=>{if(m.type()==="error"&&/WebGLProgram|Shader Error|INVALID_OPERATION/i.test(m.text()))
   errors.push(m.text().slice(0,500));});
  await page.addInitScript(v=>Object.defineProperty(navigator,"deviceMemory",
   {get:()=>v,configurable:true}),lowMemory?4:8);
  await page.goto("http://127.0.0.1:8810/skyshift/?v=0.21.2.5"+
   "&artSmoke=1&shipWhiteSmoke=1&shipWhiteFrameProof=1&trackRepairSmoke=1&waveSmoke=1&unifiedLighting=classic",
   {waitUntil:"domcontentloaded",timeout:65000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",null,{timeout:75000});
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",null,{timeout:35000});
  return page;
 }
 function count(p){
  const {width:W,height:H,data}=p;let bright=0,white=0,sat=0,light=0;
  // Actual cockpit/wing region, excluding white guide rails.
  const xl=Math.floor(W*.38),xr=Math.floor(W*.63);
  const yt=Math.floor(H*.69),yb=Math.floor(H*.93);
  let n=0;
  for(let y=yt;y<yb;y+=2)for(let x=xl;x<xr;x+=2){
   const i=(y*W+x)*4,r=data[i],g=data[i+1],b=data[i+2];
   let mn=Math.min(r,g,b),mx=Math.max(r,g,b);
   if(mn>167&&mx>189)bright++;
   if(mn>212&&mx>228)white++;
   light+=(r*.2126+g*.7152+b*.0722);
   sat+=mx-mn;n++;
  }
  return {bright,white,meanLight:+(light/n).toFixed(2),meanChroma:+(sat/n).toFixed(2)};
 }
 async function collect(page,s,stage,bank,label){
  await page.evaluate(v=>window.__skyshiftTrackRepairTeleport(v),s);
  if(stage>0)await page.evaluate(i=>window.__skyshiftWaveSmoke(i),stage);
  await page.waitForTimeout(780);
  const before=await page.evaluate(()=>window.__skyshiftShipWhiteProbe?.());
  if(!before?.enabled||before.treatedHullMaterials<2||
     before.whiteMask<.98||
     before.exteriorKeyIntensity<=0||
     before.geometryAndPhysicsUnchanged!==true)
   throw Error("Ship white source fix not running "+JSON.stringify(before));
  const pair=await page.evaluate(deg=>window.__skyshiftShipWhiteFrameProof(deg),bank);
  if(pair.maskBefore!==0||pair.maskAfter!==1)
   throw Error("Not the same GPU comparison mode "+JSON.stringify(pair));
  const images=Object.fromEntries(Object.entries({
   classic:pair.classic,contained:pair.contained
  }).map(([k,v])=>[k,PNG.sync.read(Buffer.from(v,"base64"))]));
  for(const mode of ["classic","contained"]){
   const file="skyshift-v02125-"+label+"-"+mode+".png";
   writeFileSync(file,Buffer.from(pair[mode],"base64"));
  }
  const a=count(images.classic),b=count(images.contained);
  // This should change the hull, not the road or the tunnel. The entire
  // distance between old and new screenshot is material light response.
  const current=images.classic.data,next=images.contained.data;
  let changed=0,offHullChanges=0;
  for(let y=0;y<images.classic.height;y+=3)
   for(let x=0;x<images.classic.width;x+=3){
    const i=(y*images.classic.width+x)*4;
    const diff=Math.abs(current[i]-next[i])+Math.abs(current[i+1]-next[i+1])+
     Math.abs(current[i+2]-next[i+2]);
    if(diff>32){
     changed++;
     if(x<images.classic.width*.28||x>images.classic.width*.72||
        y<images.classic.height*.42)offHullChanges++;
    }
   }
  const result={label,s,stage,bank,shipId:pair.shipId,
   prior:a,contained:b,changed,offHullChanges,
   brightReductionPct:Math.round(100*(1-b.bright/Math.max(1,a.bright))),
   whiteReductionPct:Math.round(100*(1-b.white/Math.max(1,a.white)))};
  records.push(result);
  if(changed<65)throw Error("Ship light material change was visually inert "+JSON.stringify(result));
  if(offHullChanges>5)throw Error("Ship treatment unexpectedly changes outside hull "+
    JSON.stringify(result));
  if(b.bright>a.bright*1.15||b.white>a.white*1.15)
   throw Error("Ship acquired stronger white wash "+JSON.stringify(result));
  return result;
 }
 const page=await load();
 // A position teleport can leave the chase camera over 90m behind on
 // slow SwiftShader. Color wave stages are forced at the same centered
 // camera/ship position; the hull bank is an independent orientation test.
 await collect(page,165,0,0,"cyan-straight");
 await collect(page,165,2,0,"gold-centered");
 await collect(page,165,2,.28,"gold-banked");
 await collect(page,165,3,-.24,"jade-banked");
 await page.close();
 const mobile=await load(true);
 const p=await mobile.evaluate(()=>window.__skyshiftArtProbe());
 if(p.drawBatches!==3)throw Error("Low memory draw batches changed "+JSON.stringify(p));
 await collect(mobile,165,2,0,"mobile-gold");
 await mobile.close();
 if(errors.length)throw Error("WebGL shader compilation errors: "+errors.join(" | "));
 writeFileSync("skyshift-v02125-ship-white-proof.json",JSON.stringify(records,null,2));
 console.log("PASS SKYSHIFT 0.21.2.5 same-frame ship white wash comparison "+
  JSON.stringify(records));
}finally{await browser?.close();server.kill("SIGTERM")}
