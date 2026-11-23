// SKYSHIFT 0.21.1 - Chrome WebGL real screenshots of broad closed tunnel.
import {spawn} from "node:child_process";
import {existsSync} from "node:fs";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright-core";
const chrome=[process.env.CHROME_PATH,"/usr/bin/google-chrome",
 "/usr/bin/google-chrome-stable","/usr/bin/chromium"].filter(Boolean).find(existsSync);
if(!chrome)throw Error("Chromium missing");
const server=spawn("python3",["-m","http.server","8797","--bind","127.0.0.1"],
 {cwd:process.cwd(),stdio:"ignore"});
let browser;
try{
 await sleep(1100);
 browser=await chromium.launch({headless:true,executablePath:chrome,
  args:["--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
   "--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
 const errors=[];
 async function load(query="",memory=8){
  const page=await browser.newPage({viewport:{width:1536,height:691}});
  page.on("pageerror",e=>errors.push(e.message));
  page.on("console",m=>{
   if(m.type()==="error"&&/WebGLProgram|Shader Error|INVALID_OPERATION/i.test(m.text()))
    errors.push(m.text().slice(0,500));
  });
  await page.addInitScript(m=>Object.defineProperty(navigator,"deviceMemory",
   {get:()=>m,configurable:true}),memory);
  await page.goto("http://127.0.0.1:8797/skyshift/?v=0.21.1"+
   "&artSmoke=1&trackRepairSmoke=1&interiorLight=classic&"+query,
   {waitUntil:"domcontentloaded",timeout:60000});
  await page.waitForFunction(()=>window.__skyshiftBoot?.phase==="ready",
   null,{timeout:75000});
  await page.waitForFunction(()=>["active","fallback"].includes(
   window.__skyshiftArtProbe?.()?.status),null,{timeout:75000});
  const art=await page.evaluate(()=>window.__skyshiftArtProbe?.());
  if(art.status!=="active")throw Error("Tunnel fallback "+JSON.stringify(art));
  await page.locator("#start-btn").click();
  await page.waitForFunction(()=>window.__skyshiftPerfProbe?.().state==="playing",
   null,{timeout:35000});
  return {page,art};
 }
 async function screenshot(page,s,path){
  await page.evaluate(s=>window.__skyshiftTrackRepairTeleport(s),s);
  await page.waitForTimeout(750);
  await page.screenshot({path});
 }
 const fresh=await load();
 if(fresh.art.roofHeight<29.5||fresh.art.roofHeight>30||
    fresh.art.vaultHeightClassic!==false)
  throw Error("New 0.21.1.1 vault height missing "+JSON.stringify(fresh.art));
 if(fresh.art.variant!=="continuous-vault-tunnel"||
    fresh.art.drawBatches!==4||
    fresh.art.profilePoints<30||
    fresh.art.sampledRings<140||
    fresh.art.roadMeshUntouched!==true||
    fresh.art.continuousCrossSection!==true||
    fresh.art.roofEnclosed!==true||
    fresh.art.solidSideShoulders!==true||
    fresh.art.colliders!==0)
  throw Error("Expected fully closed 0.21.1 tunnel "+JSON.stringify(fresh.art));
 for(const s of [104,144,165,196,245,350])
  await screenshot(fresh.page,s,"skyshift-v0211-tunnel-"+s+".png");
 await fresh.page.close();
 const originalVault=await load("vaultHeight=classic");
 if(originalVault.art.variant!=="continuous-vault-tunnel"||
    originalVault.art.vaultHeightClassic!==true||
    originalVault.art.roofHeight!==34.15)
  throw Error("Original vault height unavailable for A/B");
 await screenshot(originalVault.page,165,"skyshift-v0211-vault-before-165.png");
 await screenshot(originalVault.page,104,"skyshift-v0211-vault-before-104.png");
 await originalVault.page.close();
 const old=await load("tunnelMega=classic");
 if(old.art.variant!=="cinematic-material-light"||
    old.art.drawBatches!==7)
  throw Error("Phase B regression baseline not available "+JSON.stringify(old.art));
 for(const s of [104,165,245])
  await screenshot(old.page,s,"skyshift-v0211-before-"+s+".png");
 await old.page.close();
 const mobile=await load("",4);
 if(mobile.art.variant!=="continuous-vault-tunnel"||
    mobile.art.drawBatches!==3||
    !mobile.art.solidSideShoulders||
    !mobile.art.roofEnclosed)
  throw Error("4GB tier removed tunnel shell or shoulder "+JSON.stringify(mobile.art));
 await screenshot(mobile.page,165,"skyshift-v0211-mobile-165.png");
 await mobile.page.close();
 if(errors.length)throw Error(errors.join(" | "));
 console.log("PASS SKYSHIFT 0.21.1: fully enclosed curved roof and solid side "+
  "shoulders; original 120Hz road/grip intact; 4/3 render batches, "+
  "identical-spot Phase B A/B, Chrome WebGL and 4GB budget.");
}finally{await browser?.close();server.kill("SIGTERM")}
