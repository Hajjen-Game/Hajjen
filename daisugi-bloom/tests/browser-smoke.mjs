import fs from "node:fs";
import assert from "node:assert/strict";
import puppeteer from "puppeteer-core";
const browserPaths=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"];
const executablePath=browserPaths.find(p=>fs.existsSync(p));
if(!executablePath)throw new Error("Chrome/Chromium missing");
const browser=await puppeteer.launch({executablePath,headless:true,args:["--no-sandbox","--disable-setuid-sandbox","--enable-webgl","--use-gl=angle","--use-angle=swiftshader"]});
const page=await browser.newPage();
const errors=[];
page.on("pageerror",e=>errors.push(e.message));
page.on("console",msg=>{if(msg.type()==="error")errors.push(msg.text());});
try{
 await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await page.goto("http://127.0.0.1:8000/daisugi-bloom/",{waitUntil:"networkidle2",timeout:40000});
 await page.waitForFunction(()=>window.BABYLON&&window.DaisugiRules&&window.DaisugiVisuals,{timeout:20000});
 await page.waitForSelector(".level-tile");
 assert.equal(await page.$$eval(".level-tile",xs=>xs.length),5);

 await page.click("#openPlantLab");
 await page.waitForFunction(()=>!document.querySelector("#plantLabModal").hidden,{timeout:10000});
 assert.equal(await page.evaluate(()=>document.querySelectorAll(".plant-cell").length),20,"Plant Art Lab should have exactly twenty artworks");
 const artwork=await page.evaluate(()=>({
   imagePaths:new Set(Array.from(document.querySelectorAll(".plant-cell")).map(x=>x.style.backgroundImage)).size,
   stages:window.DaisugiPlantArt.families.map(f=>window.DaisugiPlantArt.entry(f,5)?.u1),
   selected:document.querySelector(".plant-preview-art").style.backgroundImage
 }));
 assert.equal(artwork.imagePaths,4,"Each family should use its own transparent image atlas");
 assert(artwork.stages.every(x=>x===1),"Missing final tree stage");
 fs.mkdirSync("/tmp/daisugi-bloom",{recursive:true});
 await page.screenshot({path:"/tmp/daisugi-bloom/plant-art-lab-mobile.png",fullPage:true});
 await page.click("#labPlay");
 await page.waitForFunction(()=>document.querySelector("#labStageTitle").textContent.includes("5/5"),{timeout:6000});
 await page.click("#closePlantLab");
  await page.click("#continueButton");

 await page.waitForFunction(()=>!document.querySelector("#gameView").hidden,{timeout:10000});
 await new Promise(resolve=>setTimeout(resolve,1200));
 const state=await page.evaluate(()=>({
  error:document.querySelector("#loadError").hidden,
  title:document.querySelector("#levelTitle").textContent,
  canvas:document.querySelector("#boardCanvas").getBoundingClientRect().width,
  engineCount:window.BABYLON.EngineStore.Instances.length,
  levelCount:window.DaisugiRules.levels.length,
  ruleCheck:(()=>{const g=new window.DaisugiRules.Game(3);return !g.complete&&g.board.every(p=>p.stage<=3)&&g.config.goal.trees>=4;})(),
  scoreHud:document.querySelector("#scoreCount").textContent.trim()==="0",
  scoreBoard:document.querySelector(".score-ribbon").getBoundingClientRect().height>40,
  celebration:!!document.querySelector("#treeCelebration"),
  version:document.querySelector(".hero-copy .eyebrow").textContent,
  bodyStyle:getComputedStyle(document.body).backgroundImage,
  resultScore:!!document.querySelector("#resultScore"),
  engineRules:(()=>{const g=new window.DaisugiRules.Game(0);return g.score===0&&g.save().score===0;})(),
  textures:(()=>{const scene=window.BABYLON.EngineStore.Instances[0].scenes[0];return scene.materials.filter(m=>m.name.startsWith("plant-art-")).length;})(),
  plantPixels:(()=>{const el=document.querySelector("#boardCanvas");return {cssWidth:el.clientWidth,backingWidth:el.width};})(),
  bounds:(()=>{const cam=window.BABYLON.EngineStore.Instances[0].scenes[0].activeCamera;return {left:cam.orthoLeft,right:cam.orthoRight};})()
 }));
 assert(state.error,"fatal error dialog shown");
 assert.equal(state.title,"First Petals");
 assert(state.canvas>=370,"The mobile board should span nearly the entire 390px screen: "+state.canvas);
 assert(state.plantPixels.backingWidth>=state.plantPixels.cssWidth*1.8,
   "Mobile WebGL must render at high-DPI backing resolution: "+JSON.stringify(state.plantPixels));
 assert(state.bounds.right<=3.68&&state.bounds.left>=-3.68,
   "Camera is still too far zoomed out: "+JSON.stringify(state.bounds));
 assert(state.engineCount>=1,"Babylon engine missing");
 assert.equal(state.textures,4,"Missing plant atlas textures in Babylon");
 await page.waitForFunction(()=>{const scene=window.BABYLON.EngineStore.Instances[0].scenes[0];const materials=scene.materials.filter(m=>m.name.startsWith("plant-art-"));return materials.length===4&&materials.every(m=>m.diffuseTexture&&m.diffuseTexture.isReady());},{timeout:20000});
 assert(state.ruleCheck,"Rebalanced puzzle layout failed in browser");
 assert(state.scoreHud&&state.scoreBoard&&state.celebration&&state.resultScore&&state.engineRules,"Score/celebration HUD failed");
 assert(state.version.includes("1.3"),"Old version label still visible");
 assert(state.bodyStyle.includes("gradient"),"Japanese visual theme not applied");

 // Regression: Plant Art Lab is regular CSS and can look perfect while the
 // Babylon board renders every plant as a black silhouette. Verify visible
 // pixel colours on the actual WebGL board, not only loaded texture flags.
 const matState=await page.evaluate(()=>{
   const scene=window.BABYLON.EngineStore.Instances[0].scenes[0];
   return scene.materials.filter(m=>m.name.startsWith("plant-art-")).map(m=>({
     family:m.name,
     hasEmissiveTexture:!!m.emissiveTexture,
     emissiveWhite:m.emissiveColor.r>.95&&m.emissiveColor.g>.95&&m.emissiveColor.b>.95,
     imageUpright:m.diffuseTexture._invertY===true,
     bilinear:m.diffuseTexture.samplingMode===window.BABYLON.Texture.BILINEAR_SAMPLINGMODE,
     noMipmaps:m.diffuseTexture._noMipmap,
     alpha:m.useAlphaFromDiffuseTexture
   }));
 });
 assert(matState.length===4&&matState.every(m=>m.hasEmissiveTexture&&m.emissiveWhite&&m.alpha&&m.imageUpright&&m.noMipmaps&&m.bilinear),
   "Plant sprites must use their actual colour as an unlit emissive texture: "+JSON.stringify(matState));
 const boardPng=await (await page.$("#boardCanvas")).screenshot({type:"png"});
 const boardPixels=await page.evaluate(async base64=>{
   const img=new Image();
   img.src="data:image/png;base64,"+base64;
   await img.decode();
   const c=document.createElement("canvas");
   c.width=img.width;c.height=img.height;
   const ctx=c.getContext("2d",{willReadFrequently:true});
   ctx.drawImage(img,0,0);
   const data=ctx.getImageData(0,0,c.width,c.height).data;
   let black=0,total=0,notSoil=0;
   // The 7x7 board now occupies 7 / 7.28 of the orthographic scene.
   for(let row=0;row<7;row++)for(let col=0;col<7;col++){
     const cx=Math.floor(c.width*(.14+col+.5)/7.28);
     const cy=Math.floor(c.height*(.14+row+.5)/7.28);
     const radius=Math.max(2,Math.round(Math.min(c.width,c.height)/7.28*.26));
     for(let y=Math.max(0,cy-radius);y<Math.min(c.height,cy+radius);y+=2)
       for(let x=Math.max(0,cx-radius);x<Math.min(c.width,cx+radius);x+=2){
         const idx=(y*c.width+x)*4;
         const r=data[idx],g=data[idx+1],b=data[idx+2];
         if(r<48&&g<48&&b<48)black++;
         if(Math.abs(r-207)>32||Math.abs(g-190)>32||Math.abs(b-165)>32)notSoil++;
         total++;
       }
   }
   return {blackRatio:black/total,colouredRatio:notSoil/total,width:c.width,height:c.height};
 },Buffer.from(boardPng).toString("base64"));
 console.log("Rendered plant colour check 1.3.2",boardPixels);
 assert(boardPixels.blackRatio<.04,
   "Black silhouettes detected on Babylon board: "+JSON.stringify(boardPixels));
 assert(boardPixels.colouredRatio>.08,
   "Plant assets look blank on Babylon board: "+JSON.stringify(boardPixels));

 fs.mkdirSync("/tmp/daisugi-bloom",{recursive:true});
 await page.screenshot({path:"/tmp/daisugi-bloom/first-playable-mobile.png",fullPage:true});
 assert.equal(errors.filter(e=>!/favicon|AudioContext|WebGL|GPU|CDN/.test(e)).length,0,"Unexpected page errors: "+errors.join("; "));
 console.log("PASS Daisugi Bloom mobile smoke + 20 atlas plant assets",state);
}finally{await browser.close();}
