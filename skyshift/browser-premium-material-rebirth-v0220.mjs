// SKYSHIFT 0.22.0 — Pass 1 real WebGL premium-material visual proof.
// Exact same camera, same wave, same boost and same geometry, with only
// uRebirthMaterial toggled between original 0.21.6 and new metal finish.
// Preserve iPhone-first quality, 4GB safety, no neutral-white solar return.
import {spawn} from "node:child_process";
import {existsSync,writeFileSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
import {PNG} from "pngjs";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chrome unavailable");
const server=spawn("python3",["-m","http.server","8820","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;const errors=[],results=[];
function inspect(pair,label){
 const a=PNG.sync.read(Buffer.from(pair.classic,"base64"));
 const b=PNG.sync.read(Buffer.from(pair.rebirth,"base64"));
 if(a.width!==b.width||a.height!==b.height)
  throw Error("Identical-frame material screenshots have different resolution");
 const W=a.width,H=a.height;
 const stats={label,s:pair.position,width:W,height:H,changed:0,
  upperWall:0,lowerSides:0,centerRoad:0,whiteOriginal:0,whiteRebirth:0};
 let avgOld=0,avgNew=0;
 for(let y=Math.floor(H*.07);y<Math.floor(H*.94);y+=2)
  for(let x=Math.floor(W*.04);x<Math.floor(W*.96);x+=2){
   const i=4*(y*W+x),old=a.data,newer=b.data;
   const diff=Math.abs(old[i]-newer[i])+Math.abs(old[i+1]-newer[i+1])+
    Math.abs(old[i+2]-newer[i+2]);
   const whiteOld=Math.min(old[i],old[i+1],old[i+2])>184;
   const whiteNew=Math.min(newer[i],newer[i+1],newer[i+2])>184;
   if(whiteOld)stats.whiteOriginal++;
   if(whiteNew)stats.whiteRebirth++;
   if(diff<12)continue;
   stats.changed++;
   if(y<H*.53)stats.upperWall++;
   if((x<W*.33||x>W*.67)&&y>H*.28)stats.lowerSides++;
   if(x>W*.43&&x<W*.57&&y>H*.78)stats.centerRoad++;
   avgOld+=(old[i]+old[i+1]+old[i+2])/3;
   avgNew+=(newer[i]+newer[i+1]+newer[i+2])/3;
  }
 stats.averageBefore=+(avgOld/Math.max(1,stats.changed)).toFixed(2);
 stats.averageAfter=+(avgNew/Math.max(1,stats.changed)).toFixed(2);
 if(stats.changed<300||stats.upperWall<100||stats.lowerSides<65)
  throw Error("Premium structural material is not clearly visible "+JSON.stringify(stats));
 // The road has no new shader or geometry; visual changes concentrate on
 // the walls/roof. No white/neutral sun glare should reappear.
 if(stats.centerRoad>stats.changed*.24+60)
  throw Error("Material rebuild leaked too far into driving lane "+JSON.stringify(stats));
 if(stats.whiteRebirth>stats.whiteOriginal*1.22+30)
  throw Error("Exterior-looking white solar pixels reappeared "+JSON.stringify(stats));
 for(const [kind,bytes] of [["classic",pair.classic],["rebirth",pair.rebirth]])
  writeFileSync("skyshift-v0220-"+label+"-"+kind+".png",Buffer.from(bytes,"base64"));
 return stats;
}
try{
 await sleep(1200);
 browser=await chromium.launch({headless:true,executablePath:chrome,args:[
  "--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 async function load(memory,opts=""){
  const page=await browser.newPage({viewport:{width:1536,height:870}});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",m=>{
   if(m.type()==="error"&&/WebGLProgram|Shader Error|INVALID_OPERATION/i.test(m.text()))
    errors.push(m.text().slice(0,950));
  });
  await page.addInitScript(n=>Object.defineProperty(navigator,"deviceMemory",
   {get:()=>n,configurable:true}),memory);
  await page.goto("http://127.0.0.1:8820/skyshift/?v=0.22.0"+
   "&artSmoke=1&materialRebirthSmoke=1&materialRebirthFrameProof=1"+
   "&trackRepairSmoke=1&waveSmoke=1&"+opts,
   {waitUntil:"domcontentloaded",timeout:65000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:80000});
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:35000});
  return page;
 }
 async function sample(page,s,palette,label,memory){
  await page.evaluate(n=>window.__skyshiftTrackRepairTeleport(n),s);
  if(palette>0)await page.evaluate(i=>window.__skyshiftWaveSmoke(i),palette);
  await page.waitForTimeout(840);
  const state=await page.evaluate(()=>window.__skyshiftMaterialRebirthProbe());
  if(!state.enabled||!state.rebirthMaterialEnabled||
     state.rebirthMaterialStatus!=="active"||
     state.rebirthMaterialBlend!==1||
     state.rebirthMaterials!==(memory===4?3:4)||
     state.drawBatches!==(memory===4?5:9)||
     state.roadSolarSeal!==1||!state.roadPremiumEnabled||
     !state.rebirthWorldSunSealed||
     !state.rebirthPhysicsUntouched||
     !state.fullSceneLightsUnchanged)
   throw Error("Premium materials not installed safely "+JSON.stringify(state));
  const proof=await page.evaluate(()=>window.__skyshiftMaterialRebirthFrameProof());
  const measure=inspect(proof,label);
  results.push({...measure,drawBatches:state.drawBatches,
   materials:state.rebirthMaterials,mobile:memory===4});
  console.log("MATERIAL_REBIRTH "+JSON.stringify(results.at(-1)));
 }
 const desktop=await load(8);
 await sample(desktop,165,0,"cyan-165",8);
 await sample(desktop,165,2,"solar-165",8);
 await sample(desktop,273,3,"jade-273",8);
 await desktop.close();
 const mobile=await load(4);
 await sample(mobile,165,2,"mobile-solar-165",4);
 await mobile.close();
 const legacy=await load(8,"rebirthMaterial=classic");
 const state=await legacy.evaluate(()=>window.__skyshiftMaterialRebirthProbe());
 if(state.enabled||state.rebirthMaterialEnabled||state.drawBatches!==9)
  throw Error("Original 0.21.6 material A/B regressed "+JSON.stringify(state));
 await legacy.close();
 if(errors.length)throw Error("WebGL shader errors "+errors.join(" | "));
 writeFileSync("skyshift-v0220-premium-material-proof.json",
  JSON.stringify(results,null,2));
 console.log("PASS SKYSHIFT 0.22.0 Pass 1: real WebGL brushed metal + 4GB");
}finally{await browser?.close();server.kill("SIGTERM")}
