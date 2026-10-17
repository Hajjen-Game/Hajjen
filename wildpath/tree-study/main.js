import {buildHeroTree} from './tree-model.js?v=11.1';
const B=window.BABYLON;
const $=id=>document.getElementById(id);
if(!B){$('error').hidden=false;$('error').textContent='Babylon.js kunde inte laddas. Kontrollera anslutningen.';throw Error('Babylon unavailable');}
const V=(x,y,z)=>new B.Vector3(x,y,z),C=hex=>B.Color3.FromHexString(hex);
const mobile=matchMedia('(pointer:coarse)').matches || innerWidth<720;
const canvas=$('scene'),engine=new B.Engine(canvas,true,{stencil:false,preserveDrawingBuffer:false},true);
engine.setHardwareScalingLevel(mobile?Math.min(1.55,Math.max(1,devicePixelRatio*.65)):1);
const scene=new B.Scene(engine);
scene.clearColor=B.Color4.FromHexString('#e7e9ddff');
scene.ambientColor=C('#a9b7a0');
scene.imageProcessingConfiguration.toneMappingEnabled=true;
scene.imageProcessingConfiguration.toneMappingType=B.ImageProcessingConfiguration.TONEMAPPING_ACES;
scene.imageProcessingConfiguration.exposure=1.20;
scene.imageProcessingConfiguration.contrast=1.10;
const camera=new B.ArcRotateCamera('art directed presentation camera',-Math.PI*.62,1.01,17.8,V(0,4.1,0),scene);
camera.lowerRadiusLimit=12.5;camera.upperRadiusLimit=31;
camera.lowerBetaLimit=.37;camera.upperBetaLimit=1.37;
camera.minZ=.07;camera.fov=.67;
camera.wheelPrecision=32;
camera.pinchPrecision=90;
camera.angularSensibilityX=1700;camera.angularSensibilityY=1750;
camera.panningSensibility=0;camera.inertia=.76;
camera.attachControl(canvas,true);
const hemi=new B.HemisphericLight('bright bounce from soft ivory sky',V(-.12,1,.28),scene);
hemi.diffuse=C('#e2f0d9');hemi.groundColor=C('#898f7c');hemi.intensity=.85;
const sun=new B.DirectionalLight('warm key light / left',V(-.60,-1,.25),scene);
sun.position=V(-11,21,-8);sun.diffuse=C('#ffe0b4');sun.intensity=2.05;
sun.shadowFrustumSize=28;sun.autoCalcShadowZBounds=true;
const shadows=new B.ShadowGenerator(mobile?1024:1536,sun);
shadows.usePercentageCloserFiltering=true;
shadows.filteringQuality=B.ShadowGenerator.QUALITY_HIGH;
shadows.bias=.0008;shadows.normalBias=.035;
shadows.setDarkness(.36);
const fill=new B.PointLight('subtle shadow-side peach fill',V(7,9,5),scene);
fill.diffuse=C('#e9d2a5');fill.intensity=.38;
const makeMat=(name,color,shine='#171c12')=>{
 const m=new B.StandardMaterial(name,scene);
 m.diffuseColor=C(color);m.specularColor=C(shine);
 m.specularPower=42;return m;
};
// Artist's tabletop stage: one tree only, no busy open-world scenery.
const ground=B.MeshBuilder.CreateGround('warm artist test stage',{width:90,height:90},scene);
ground.position.y=-.15;
ground.material=makeMat('warm pale background ground','#b7c8ae');
ground.receiveShadows=true;
const island=B.MeshBuilder.CreateCylinder('single sculpted grassy viewing island',{
 diameterTop:14.8,diameterBottom:15.5,height:.28,tessellation:96
},scene);
island.position.y=-.19;
const earthMat=makeMat('painted meadow base','#a2b89c','#26361e');
island.material=earthMat;island.receiveShadows=true;
const grassTex=new B.DynamicTexture('hand-painted meadow pigment',{width:512,height:512},scene,false);
const ctx=grassTex.getContext();
const grd=ctx.createRadialGradient(240,250,25,256,256,380);
grd.addColorStop(0,'#b7c99f');grd.addColorStop(.55,'#a8bc99');grd.addColorStop(1,'#869d85');
ctx.fillStyle=grd;ctx.fillRect(0,0,512,512);
let s=1911;const rnd=()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);
for(let i=0;i<2400;i++){
 const x=rnd()*512,y=rnd()*512,w=.4+rnd()*2.5;
 ctx.fillStyle=rnd()<.55?'rgba(242,246,213,.11)':'rgba(73,113,88,.12)';
 ctx.beginPath();ctx.ellipse(x,y,w,w*.6,rnd()*7,0,2*Math.PI);ctx.fill();
}
grassTex.update();earthMat.diffuseTexture=grassTex;
const hero=buildHeroTree(B,scene,shadows);
$('count').textContent=hero.stats.leaves.toLocaleString('sv-SE')+' individuella blad · '+hero.stats.branches+' grenar';
// Small sculpted rooted understory; subdued to keep scrutiny on the main object.
const moss=makeMat('emerald understory','#6c9978'),bright=makeMat('ivory grass','#b5c692');
const flowerPetal=[makeMat('peach flower','#e8b9a1'),makeMat('cream flower','#f6ddba'),
 makeMat('lilac flower','#d7c2db')];
const centers=makeMat('butter yellow flower centers','#e2ba72');
const stoneMat=makeMat('pale round river rock','#bdbea6','#272922');
for(let i=0;i<30;i++){
 const angle=rnd()*Math.PI*2,radius=1.5+Math.sqrt(rnd())*5.0,x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;
 const blades=2+(i%3);
 for(let j=0;j<blades;j++){
   const t=B.MeshBuilder.CreateCylinder('grass blade',{height:.18+rnd()*.26,diameterTop:0,diameterBottom:.042,tessellation:5},scene);
   t.position=V(x+(rnd()-.5)*.25,.09,z+(rnd()-.5)*.25);
   t.rotation.z=(rnd()-.5)*.5;t.material=i%5===0?bright:moss;
 }
 if(i%4===0){
   const p=B.MeshBuilder.CreateSphere('hand placed smooth river pebble',{diameter:1,segments:12},scene);
   p.scaling=V(.18+rnd()*.3,.10+rnd()*.12,.22+rnd()*.18);
   p.position=V(x,.09,z);p.material=stoneMat;p.receiveShadows=true;
 }
 if(i%3===0){
   const color=flowerPetal[i%3===0?(i/3)%3:0|0];
   const stem=B.MeshBuilder.CreateCylinder('flower stem',{height:.23,diameterTop:.015,diameterBottom:.03,tessellation:5},scene);
   stem.position=V(x,.16,z);stem.material=moss;
   const core=B.MeshBuilder.CreateSphere('flower pollen',{diameter:.085,segments:8},scene);
   core.position=V(x,.31,z);core.material=centers;
   for(let k=0;k<5;k++){
     const a=k*2*Math.PI/5;
     const petal=B.MeshBuilder.CreateSphere('small ground petal',{diameter:1,segments:8},scene);
     petal.position=V(x+Math.sin(a)*.085,.31,z+Math.cos(a)*.085);
     petal.scaling=V(.105,.035,.065);petal.rotation.y=a;petal.material=color;
   }
 }
}
scene.environmentIntensity=.7;
const modes=[
 {name:'varmt',sky:'#e7e9dd',sun:'#ffe0b4',s:2.05,hemi:'#e2f0d9',h:.85},
 {name:'mjukt',sky:'#dee7e3',sun:'#fff5dc',s:1.55,hemi:'#e1e9f8',h:1.04}
];
let mode=0,isHigh=false,hasShadows=true;
function apply(){
 const m=modes[mode];
 scene.clearColor=B.Color4.FromHexString(m.sky+'ff');
 sun.diffuse=C(m.sun);sun.intensity=m.s;hemi.diffuse=C(m.hemi);hemi.intensity=m.h;
 $('time').textContent=mode?'☀ Ljus: mjukt':'☀ Ljus: varmt';
}
$('time').addEventListener('click',()=>{mode=(mode+1)%2;apply();});
$('angle').addEventListener('click',()=>{
 isHigh=!isHigh;camera.beta=isHigh?.63:1.01;
 camera.radius=isHigh?21.5:17.8;
 $('angle').textContent=isHigh?'◈ Kameravy: Wildpath':'◈ Kameravy: nära';
});
$('shadows').addEventListener('click',()=>{
 hasShadows=!hasShadows;sun.shadowEnabled=hasShadows;island.receiveShadows=hasShadows;ground.receiveShadows=hasShadows;
 $('shadows').textContent=hasShadows?'◉ Skuggor: på':'○ Skuggor: av';
});
apply();
let accumulator=0,frames=0;
engine.runRenderLoop(()=>{
 scene.render();
 frames++;accumulator+=engine.getDeltaTime();
 if(accumulator>1200){
   $('fps').textContent=Math.round(frames*1000/accumulator)+' FPS';
   frames=0;accumulator=0;
 }
});
window.addEventListener('resize',()=>engine.resize());
