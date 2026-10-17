import {buildHeroTree as buildV1} from './tree-model-v1.js?v=11.1';
import {buildHeroTree as buildV2} from './tree-model.js?v=12.0';
import {buildHeroTree as buildV3} from './tree-model-v3.js?v=13.0';
import {buildHeroTree as buildV4} from './tree-model-v4.js?v=14.0';
const selectedVersion=new URLSearchParams(location.search).get('tree');
const compareV1=selectedVersion==='v1';
const compareV2=selectedVersion==='v2';
const compareV3=selectedVersion==='v3';
const version=compareV1?'v1':compareV2?'v2':compareV3?'v3':'v4';
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
scene.imageProcessingConfiguration.exposure=1.09;
scene.imageProcessingConfiguration.contrast=1.17;
const camera=new B.ArcRotateCamera('art directed presentation camera',-Math.PI*.62,1.01,mobile?25:17.8,V(0,4.1,0),scene);
camera.lowerRadiusLimit=mobile?20:12.5;camera.upperRadiusLimit=mobile?43:31;
camera.lowerBetaLimit=.37;camera.upperBetaLimit=1.37;
camera.minZ=.07;camera.fov=mobile?.73:.67;
camera.wheelPrecision=32;
camera.pinchPrecision=90;
camera.angularSensibilityX=1700;camera.angularSensibilityY=1750;
camera.panningSensibility=0;camera.inertia=.76;
camera.attachControl(canvas,true);
const hemi=new B.HemisphericLight('bright bounce from soft ivory sky',V(-.12,1,.28),scene);
hemi.diffuse=C('#dfead4');hemi.groundColor=C('#6c7967');hemi.intensity=.76;
const sun=new B.DirectionalLight('warm key light / left',V(-.60,-1,.25),scene);
sun.position=V(-11,21,-8);sun.diffuse=C('#ffe0b4');sun.intensity=1.90;
sun.shadowFrustumSize=28;sun.autoCalcShadowZBounds=true;
const shadows=new B.ShadowGenerator(mobile?1024:1536,sun);
shadows.usePercentageCloserFiltering=true;
shadows.filteringQuality=B.ShadowGenerator.QUALITY_HIGH;
shadows.bias=.0008;shadows.normalBias=.035;
shadows.setDarkness(.28);
const fill=new B.PointLight('subtle shadow-side peach fill',V(7,9,5),scene);
fill.diffuse=C('#eed4bb');fill.intensity=.28;
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
const hero=(compareV1?buildV1:compareV2?buildV2:compareV3?buildV3:buildV4)(B,scene,shadows);
$('count').textContent=hero.stats.leaves.toLocaleString('sv-SE')+' formade blad · '+hero.stats.branches+' huvudgrenar';
$('versionTitle').textContent='Tree Study '+(version==='v4'?'4.0':version==='v3'?'3.0':version==='v2'?'2.0':'1.0');
$('studyDescription').textContent=version==='v4'
 ?'Tio fylliga 3D-bladknippen byggda helt av överlappande formade blad.'
 :version==='v3'?'Skulpterade lövvolymer, mjukare silhuett och färgskiftningar.'
 :version==='v2'?'Tätare krona, tydliga huvudgrenar och rikare bladfärger.'
 :'Originalträdet med individuella blad och 15 grenarmar.';
$('compareLink').href=version==='v4'?'./?tree=v2':'./?tree=v4';
$('compareLink').textContent=version==='v4'?'Jämför mot 2.0 ↗':'Till Tree Study 4.0 ↗';
$('compareOldLink').href=version==='v4'?'./?tree=v3':'./?tree=v1';
$('compareOldLink').textContent=version==='v4'?'Visa 3.0':'Visa 1.0';
$('compareOldLink').hidden=version==='v1';
$('count').title=version==='v4'
 ?'Tio bladknippen med mörka innerlager och färgstarka yttre blad; inga solida lövklumpar'
 :version==='v3'?'Tolv skulpterade bladvolymer'
 :version==='v2'?'Blad och sex huvudgrenar från pass 12':'Originalet från pass 11';
// Small sculpted rooted understory; subdued to keep scrutiny on the main object.
const moss=makeMat('emerald understory','#6c9978'),bright=makeMat('ivory grass','#b5c692');
const flowerPetal=[makeMat('peach flower','#e8b9a1'),makeMat('cream flower','#f6ddba'),
 makeMat('lilac flower','#d7c2db')];
const centers=makeMat('butter yellow flower centers','#e2ba72');
const stoneMat=makeMat('pale round river rock','#bdbea6','#272922');
for(let i=0;i<16;i++){
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
// Soft foliage shadow, painted as a broad radial transparency instead of
// the previous harsh polygon mosaic cast by hundreds of individual leaves.
// Only used for the V3 canopy: its trunk and branches still cast real shadows.
if(version==='v3'||version==='v4'){
 function softGroundShade(name,w,d,x,z,centerAlpha){
   const tex=new B.DynamicTexture(name+' / alpha gradient',{width:256,height:256},scene,false);
   tex.hasAlpha=true;
   const brush=tex.getContext();
   brush.clearRect(0,0,256,256);
   const grad=brush.createRadialGradient(128,128,5,128,128,125);
   const isFourth=version==='v4';
   const dark=isFourth?'25,37,29':'27,63,47';
   grad.addColorStop(0,'rgba('+dark+','+centerAlpha+')');
   grad.addColorStop(.45,'rgba('+dark+','+(centerAlpha*.50)+')');
   grad.addColorStop(.74,'rgba('+dark+','+(centerAlpha*.14)+')');
   grad.addColorStop(1,'rgba('+dark+',0)');
   brush.fillStyle=grad;brush.fillRect(0,0,256,256);tex.update();
   const mat=new B.StandardMaterial(name+' / matte shadow',scene);
   mat.diffuseTexture=tex;mat.useAlphaFromDiffuseTexture=true;mat.alpha=1;
   mat.disableLighting=true;mat.backFaceCulling=false;
   mat.transparencyMode=B.Material.MATERIAL_ALPHABLEND;
   mat.zOffset=-1;
   const shadow=B.MeshBuilder.CreateGround(name,{width:w,height:d,subdivisions:1},scene);
   shadow.position=V(x,-.044,z);shadow.material=mat;shadow.isPickable=false;
   shadow.receiveShadows=false;
 }
 softGroundShade('soft broad canopy shade',version==='v4'?9.5:8.7,version==='v4'?8.0:6.6,
   .70,-.30,version==='v4'?.19:.30);
 softGroundShade('root contact shade',2.1,1.65,.09,.04,version==='v4'?.32:.48);
}
scene.environmentIntensity=.7;
const modes=[
 {name:'varmt',sky:'#e4e9dd',sun:'#ffdfb6',s:1.82,hemi:'#dce9db',h:.82},
 {name:'mjukt',sky:'#e1e9e8',sun:'#fff1d9',s:1.55,hemi:'#d9e8e7',h:.92}
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
 camera.radius=isHigh?(mobile?30:21.5):(mobile?25:17.8);
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
