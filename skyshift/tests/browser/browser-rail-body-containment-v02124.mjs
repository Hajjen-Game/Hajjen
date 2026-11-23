// SKYSHIFT 0.21.2.4 — real WebGL evidence of the user-circled rail glare.
// Paired exact-position 0.21.2.3 original vs isolated matte rail shell.
// Unlike earlier tests, quantify the whiteness of the actual rail-side pixels.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(existsSync).at(0);
if(!chrome)throw Error("Chromium missing");
const server=spawn("python3",["-m","http.server","8806","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
try{
 await sleep(1000);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 const errors=[];
 const metrics=[];
 function whiteness(bytes){
  const p=PNG.sync.read(bytes);
  const boxes=[[130,560,350,645],[1020,1450,320,660]];
  let nBright=0,nWhite=0;
  for(const [x0,x1,y0,y1] of boxes)
   for(let y=y0;y<y1;y+=2)for(let x=x0;x<x1;x+=2){
    const k=(y*p.width+x)*4,r=p.data[k],g=p.data[k+1],b=p.data[k+2];
    if(Math.min(r,g,b)>175&&Math.max(r,g,b)>195)nBright++;
    if(Math.min(r,g,b)>220&&Math.max(r,g,b)>230)nWhite++;
   }
  return {nBright,nWhite};
 }
 async function open(legacy=false,memory=8){
  const page=await browser.newPage({viewport:{width:1536,height:691}});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",m=>{
   if(m.type()==="error"&&/WebGLProgram|Shader Error|INVALID_OPERATION/i.test(m.text()))
    errors.push(m.text().slice(0,500));
  });
  await page.addInitScript(v=>Object.defineProperty(navigator,"deviceMemory",
   {get:()=>v,configurable:true}),memory);
  await page.goto("http://127.0.0.1:8806/skyshift/?v=0.21.2.5"+
   "&artSmoke=1&whiteCoreSmoke=1&trackRepairSmoke=1&waveSmoke=1&shipWhite=classic"+
   (legacy?"&railBody=classic":""),{waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:75000});
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:35000});
  const art=await page.evaluate(()=>window.__skyshiftArtProbe());
  if(art.status!=="active")throw Error("Tunnel not active "+JSON.stringify(art));
  const active=await page.evaluate(()=>window.__skyshiftWhiteCoreProbe());
  if(active.railBodyContainment!==(legacy?0:1))
   throw Error("Wrong metal variant "+JSON.stringify({active,legacy}));
  if(!active.worldLightsUnchanged||active.shipPbrMaterials<1)
   throw Error("Global lights or ship regressed");
  return {page,art,active};
 }
 async function capture(page,variant,s,stage=0){
  await page.evaluate(v=>window.__skyshiftTrackRepairTeleport(v),s);
  if(stage>0){
   const result=await page.evaluate(st=>window.__skyshiftWaveSmoke(st),stage);
   if(result.palette!==({2:"solar",3:"jade"}[stage]||""))
    throw Error("Palette synchronization regressed "+JSON.stringify(result));
  }
  await page.waitForTimeout(750);
  const bytes=await page.screenshot();
  const f="skyshift-v02124-"+variant+"-"+s+"-zone"+(stage+1)+".png";
  writeFileSync(f,bytes);
  const counts=whiteness(bytes);
  metrics.push({variant,s,stage,...counts});
  return counts;
 }
 const original=await open(true);
 const old165=await capture(original.page,"original",165);
 const old273=await capture(original.page,"original",273);
 await original.page.close();
 const newVersion=await open(false);
 if(newVersion.art.variant!=="rail-body-highlight-contained")
  throw Error("0.21.2.4 rail variant not active "+JSON.stringify(newVersion.art));
 const fresh165=await capture(newVersion.page,"contained",165);
 const fresh273=await capture(newVersion.page,"contained",273);
 // Absolute before/after evidence from *actual*, marked rail-side regions.
 if(old165.nBright<1000)throw Error("Baseline failed to reproduce white hotspot: "+JSON.stringify(old165));
 if(fresh165.nBright>old165.nBright*.40)
  throw Error("Rail white hotspot was not contained: "+JSON.stringify({old165,fresh165}));
 if(fresh165.nWhite>old165.nWhite*.40)
  throw Error("Near-white saturation still excessive "+JSON.stringify({old165,fresh165}));
 await capture(newVersion.page,"contained",165,2);
 await capture(newVersion.page,"contained",273,3);
 await newVersion.page.close();
 const mobile=await open(false,4);
 if(mobile.art.drawBatches!==3)throw Error("Mobile geometry budget changed");
 await capture(mobile.page,"mobile",165);
 await mobile.page.close();
 if(errors.length)throw Error(errors.join(" | "));
 const summary={original:old165,after:fresh165,
  brightReduction:Math.round(100*(1-fresh165.nBright/old165.nBright)),
  whiteReduction:Math.round(100*(1-fresh165.nWhite/old165.nWhite)),
  secondPointOriginal:old273,secondPointAfter:fresh273};
 writeFileSync("skyshift-v02124-rail-body-proof.json",JSON.stringify({summary,metrics},null,2));
 console.log("PASS 0.21.2.4: photometric rail-body source containment "+JSON.stringify(summary));
}finally{await browser?.close();server.kill("SIGTERM")}
