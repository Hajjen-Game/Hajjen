// SKYSHIFT 0.21.5 — identical-frame actual Chrome/WebGL road-material A/B.
// Capture old PBR finish, premium finish, and road-absent view for true
// road-only pixels, with existing native tunnel/wave/rails unchanged.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chrome missing");
const server=spawn("python3",["-m","http.server","8815","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
const errors=[],records=[];
const lum=(v,i)=>.2126*v[i]+.7152*v[i+1]+.0722*v[i+2];
function analyze(pairs,label){
 const images=Object.fromEntries(["baseline","premium","absent"].map(k=>
  [k,PNG.sync.read(Buffer.from(pairs[k],"base64"))]));
 const a=images.baseline,b=images.premium,n=images.absent;
 if(a.width!==b.width||a.height!==b.height||
    a.width!==n.width||a.height!==n.height)
  throw Error("Same-frame screenshots have unequal size");
 let deckPixels=0,changedDeck=0,nearWhiteBefore=0,nearWhiteAfter=0;
 let brightBefore=0,brightAfter=0,changedOutside=0;
 const W=a.width,H=a.height;
 for(let y=Math.floor(H*.30);y<Math.floor(H*.96);y+=3)
  for(let x=Math.floor(W*.04);x<Math.floor(W*.96);x+=3){
   const i=(y*W+x)*4,pa=a.data,pb=b.data,pn=n.data;
   const roadMask=Math.abs(pa[i]-pn[i])+Math.abs(pa[i+1]-pn[i+1])+
    Math.abs(pa[i+2]-pn[i+2]);
   const change=Math.abs(pa[i]-pb[i])+Math.abs(pa[i+1]-pb[i+1])+
    Math.abs(pa[i+2]-pb[i+2]);
   if(roadMask>32){
    deckPixels++;
    brightBefore+=lum(pa,i);
    brightAfter+=lum(pb,i);
    if(change>5)changedDeck++;
    if(Math.min(pa[i],pa[i+1],pa[i+2])>180)nearWhiteBefore++;
    if(Math.min(pb[i],pb[i+1],pb[i+2])>180)nearWhiteAfter++;
   }else if(change>32)changedOutside++;
  }
 const row={label,trackS:pairs.trackS,deckPixels,changedDeck,
  changedOutside,nearWhiteBefore,nearWhiteAfter,
  meanOld:+(brightBefore/Math.max(deckPixels,1)).toFixed(2),
  meanPremium:+(brightAfter/Math.max(deckPixels,1)).toFixed(2)};
 if(deckPixels<300||changedDeck<60)
  throw Error("Integrated road finish invisible or road absent "+JSON.stringify(row));
 if(nearWhiteAfter>nearWhiteBefore*1.2+5)
  throw Error("Unwanted white sunlight returned on deck "+JSON.stringify(row));
 if(changedOutside>changedDeck*2+130)
  throw Error("Premium change escaped road-only geometry "+JSON.stringify(row));
 for(const k of ["baseline","premium","absent"])
  writeFileSync("skyshift-v0215-"+label+"-"+k+".png",Buffer.from(pairs[k],"base64"));
 return row;
}
try{
 await sleep(1300);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 async function load(memory,extra=""){
  const page=await browser.newPage({viewport:{width:1536,height:860}});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",m=>{
   if(m.type()==="error"&&/WebGLProgram|Shader Error|INVALID_OPERATION/i.test(m.text()))
    errors.push(m.text().slice(0,850));
  });
  await page.addInitScript(n=>Object.defineProperty(navigator,"deviceMemory",
   {get:()=>n,configurable:true}),memory);
  await page.goto("http://127.0.0.1:8815/skyshift/?v=0.21.5"+
   "&artSmoke=1&premiumRoadSmoke=1&premiumRoadFrameProof=1"+
   "&trackRepairSmoke=1&waveSmoke=1&"+extra,
   {waitUntil:"domcontentloaded",timeout:65000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:75000});
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:35000});
  return page;
 }
 async function capture(page,s,zone,label){
  await page.evaluate(n=>window.__skyshiftTrackRepairTeleport(n),s);
  if(zone>0)await page.evaluate(n=>window.__skyshiftWaveSmoke(n),zone);
  await page.waitForTimeout(850);
  const art=await page.evaluate(()=>window.__skyshiftArtProbe?.());
  const status=await page.evaluate(()=>window.__skyshiftPremiumRoadProbe?.());
  if(art.status!=="active"||!art.flowEnabled||!art.waveSynchronized||
     !status?.enabled||!status.active||status.solarSeal!==1||
     status.seal!==1||!status.whiteCoreUnchanged||
     status.roadMaterial!=="MeshStandardMaterial"||
     !status.exteriorKeyUnchanged)
   throw Error("Incorrect active tunnel, wave or road seal "+JSON.stringify({art,status}));
  const pair=await page.evaluate(()=>window.__skyshiftPremiumRoadFrameProof());
  const sample=analyze(pair,label);
  records.push({...sample,artDrawBatches:art.drawBatches,lowMemory:status.lowMemory});
  console.log("PREMIUM_ROAD "+JSON.stringify(records.at(-1)));
 }
 const desktop=await load(8);
 await capture(desktop,165,0,"cyan-165");
 await capture(desktop,273,2,"solar-273");
 await capture(desktop,165,3,"jade-165");
 await desktop.close();
 const mobile=await load(4);
 await capture(mobile,165,2,"mobile-solar-165");
 await mobile.close();
 const classic=await load(8,"premiumRoad=classic");
 const previous=await classic.evaluate(()=>window.__skyshiftPremiumRoadProbe?.());
 if(previous.enabled||previous.active)
  throw Error("0.21.4 road A/B mode did not disable new finish "+JSON.stringify(previous));
 await classic.close();
 if(errors.length)throw Error("WebGL shader errors: "+errors.join(" | "));
 writeFileSync("skyshift-v0215-premium-road-proof.json",JSON.stringify(records,null,2));
 console.log("PASS SKYSHIFT 0.21.5: road material appears in real WebGL with all native tunnel waves and white containment");
}finally{await browser?.close();server.kill("SIGTERM")}
