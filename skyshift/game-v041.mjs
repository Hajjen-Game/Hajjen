import * as THREE from "three";
import {
 TRIAL,GAPS,ISLANDS,SPLITS,RISK_CUTS,GEOMETRY_BREAKS,ARCHES,CHECKPOINTS,SECTORS,ROAD_CUES,poseAt,positionAt,headingAt,curvatureAt,bankAt,bankDegreesAt,surfaceHeightAt,surfaceNormalAt,
 heightAt,widthAt,roadIntervals,onRoad,sectorAt,speedAt,nextGap,
 newFlightState,stepFlight,clamp,lerp
} from "./trial-v041.mjs";
import { makeFullscreenController } from "./fullscreen-v02.mjs";
import { createPremiumFlightFX } from "./premium-v041.mjs";
import { createNeonPipeline,createNeonKit,NEON_TUNING } from "./neon-v032.mjs";
import { installCleanTrack } from "./identity-v041.mjs";
import { installSpaceBackdrop } from "./space-v04.mjs";
import { refineCraftSilhouette,createContactShadow } from "./ship-v034.mjs";
import { LUMINANCE,validateLuminance } from "./luminance-v0331.mjs";
if(validateLuminance().length)throw new Error("Invalid SKYSHIFT atmosphere balance");

const $=id=>document.getElementById(id);
const UI={
 canvas:$("game"),start:$("start-btn"),retry:$("retry-btn"),
 menu:$("menu"),end:$("end-screen"),pause:$("pause-screen"),
 resume:$("resume-btn"),restart:$("restart-paused-btn"),
 pauseBtn:$("pause-btn"),hud:$("hud"),controls:$("mobile-controls"),
 shieldFill:$("shield-fill"),shieldText:$("shield-text"),
 progress:$("zone-progress-fill"),sector:$("zone-number"),
 sectorName:$("sector-name"),distance:$("distance"),speed:$("speed"),
 flight:$("flight-state"),toast:$("toast"),banner:$("zone-banner"),
 bannerNum:$("zone-banner-number"),bannerName:$("zone-banner-name"),
 flash:$("zone-flash"),stick:$("stick"),knob:$("stick-knob"),
 jump:$("jump-btn"),error:$("error"),finalTitle:$("final-title"),
 finalDistance:$("final-distance"),finalSector:$("final-zone"),
 finalBest:$("personal-best"),finalTime:$("flight-time"),
 finalJumps:$("final-jumps"),finalStyle:$("final-style"),export:$("audit-btn"),
 raceLabel:$("trial-label"),
 fullscreen:$("fullscreen-btn"),menuFullscreen:$("menu-fullscreen-btn"),
 fullscreenHelp:$("fullscreen-help")
};
const COLOR=[
 {color:0x43ddf0,...LUMINANCE.sectors[0],name:"THE LAUNCH"},
 {color:0x9d83ff,...LUMINANCE.sectors[1],name:"SKYBREAK"},
 {color:0xff77ad,...LUMINANCE.sectors[2],name:"FINAL VELOCITY"}
];
const themes=COLOR.map(p=>({
  ...p,skyColor:new THREE.Color(p.sky),fogColor:new THREE.Color(p.fog),
  accent:new THREE.Color(p.color)
}));
const uiState={mode:"menu",inputX:0,jumpPressed:false,jumpHeld:false,stickPointer:null,
 keys:new Set(),bannerTimeout:null,toastTimeout:null,trackHint:-1};
const worldClock={last:performance.now(),accum:0};
let scene,camera,renderer,world,ship,shipGlow,shipShade,roadMat,edgeMat,flight;
let neonKit,neonPipeline,engineLight,identitySurface,spaceBackdrop;
let cameraLook=new THREE.Vector3(),shadowMesh,pylonMesh,premiumFX;
let perfFrames=0,perfTotal=0,perfMin=200;
let renderSamples=0,renderCallTotal=0,renderCallPeak=0,triangleTotal=0;
const telemetry=[];
let previousSector=0,sceneReady=false,fullscreenController=null;
const SHADOW_NORMAL=new THREE.Vector3(),SHADOW_PLANE_NORMAL=new THREE.Vector3(0,0,1);
const reusable=new THREE.Object3D();

function bestForTrial(){
 try{return Number(localStorage.getItem("skyshift-first-flight-best-v041"))||0;}
 catch{return 0;}
}
function saveBest(time){
 try{localStorage.setItem("skyshift-first-flight-best-v041",String(time));}catch{}
}
function flashToast(message,time=1350){
 UI.toast.textContent=message;UI.toast.classList.remove("hidden");
 clearTimeout(uiState.toastTimeout);
 uiState.toastTimeout=setTimeout(()=>UI.toast.classList.add("hidden"),time);
}
function event(kind,properties={}){
 telemetry.push({type:kind,s:Math.round(flight.s),t:+flight.elapsed.toFixed(3),...properties});
}
function colorFor(s){
 const index=sectorAt(s),base=themes[index].accent;
 const color=new THREE.Color(base);
 if(index>0){
   const fade=clamp((s-SECTORS[index].s)/38,0,1);
   color.copy(themes[index-1].accent).lerp(base,fade);
 }
 return color;
}
function surfaceColor(s){
 const tint=colorFor(s);
 const base=new THREE.Color(LUMINANCE.roadBase);
 // Lift playable midtones without lifting the emissive rails.
 return base.lerp(tint,LUMINANCE.roadTintMix).multiplyScalar(
   (Math.floor(s/4)%2)? .975:1.025
 );
}
function addQuad(points,colors,a,b,c,d,tint){
 for(const p of [a,b,c,a,c,d]){
   points.push(p.x,p.y,p.z);
   if(colors)colors.push(tint.r,tint.g,tint.b);
 }
}
function toVec(s,lateral,offset=0){
 const p=positionAt(s,lateral,offset);
 return new THREE.Vector3(p.x,p.y,p.z);
}
function buildGeometry(points,colors=null){
 const geo=new THREE.BufferGeometry();
 geo.setAttribute("position",new THREE.Float32BufferAttribute(points,3));
 if(colors)geo.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));
 geo.computeVertexNormals();geo.computeBoundingSphere();
 return geo;
}
function buildRoad(){
 const deck=[],colors=[],rim=[],rimHalo=[],rimCore=[],underRail=[],jumpMarks=[],laneGuides=[],padFaces=[];
 const boundaries=GEOMETRY_BREAKS;
 const tintSide=new THREE.Color(0x091222);
 for(let k=0;k<boundaries.length-1;k++){
   let from=boundaries[k],to=boundaries[k+1];
   for(let d=from;d<to-.001;d+=.8) {
     const e=Math.min(to,d+.8),mid=(d+e)*.5;
     const intervals=roadIntervals(mid);
     for(const [a,b] of intervals) {
       const p1=toVec(d,a),p2=toVec(d,b),p3=toVec(e,b),p4=toVec(e,a);
       addQuad(deck,colors,p1,p2,p3,p4,surfaceColor(mid));
       const drop=new THREE.Vector3(0,-1.05,0);
       addQuad(deck,colors,p1.clone().add(drop),p1,p4,p4.clone().add(drop),tintSide);
       addQuad(deck,colors,p2,p2.clone().add(drop),p3.clone().add(drop),p3,tintSide);
       // Slim structural line inside the sidewall, not on the playing deck.
       for(const outer of [a,b]){
         addQuad(underRail,null,toVec(d,outer,-.30),toVec(d,outer,-.40),
           toVec(e,outer,-.40),toVec(e,outer,-.30));
       }
       for(const off of [a+.10,b-.23]) {
         // Spatially narrow neon: soft tint, readable colored body, needle-thin core.
         // Broad 0.56m halos in 0.3.1 made the whole near road look illuminated.
         addQuad(rimHalo,null,toVec(d,off-.072,.045),toVec(d,off+.203,.045),
           toVec(e,off+.203,.045),toVec(e,off-.072,.045));
         addQuad(rim,null,toVec(d,off+.016,.078),toVec(d,off+.114,.078),
           toVec(e,off+.114,.078),toVec(e,off+.016,.078));
         addQuad(rimCore,null,toVec(d,off+.052,.102),toVec(d,off+.078,.102),
           toVec(e,off+.078,.102),toVec(e,off+.052,.102));
       }
     }
     // A subtle dashed road centreline supports speed perception.
     if(intervals.length===1&&Math.floor(mid/5)%2===0&&intervals[0][0]<0&&intervals[0][1]>0) {
       addQuad(laneGuides,null,toVec(d,-.042,.051),toVec(d,.042,.051),
         toVec(e,.042,.051),toVec(e,-.042,.051));
     }
     // Runway paint in the last metres before each mandatory jump.
     for(const gap of GAPS)if(mid>=gap.start-17&&mid<gap.start-.8){
       const band=(Math.floor((gap.start-mid)/2.8)%2)===0;
       if(band){
         for(const [a,b] of intervals){
           for(const lateral of [a+(b-a)*.32,a+(b-a)*.68]){
             addQuad(jumpMarks,null,toVec(d,lateral-.38,.073),toVec(d,lateral+.38,.073),
               toVec(e,lateral+.38,.073),toVec(e,lateral-.38,.073));
           }
         }
       }
     }
   }
 }
 // The optional right-hand route gets its own readable advance markings.
 for(const cut of RISK_CUTS){
   for(let d=cut.start-12;d<cut.start-1;d+=1.4){
     const e=Math.min(cut.start-1,d+1.4);
     if(Math.floor((cut.start-d)/2.8)%2!==0)continue;
     for(const [a,b] of roadIntervals((d+e)*.5)){
       if(a<0)continue;
       const m=(a+b)*.5;
       addQuad(jumpMarks,null,toVec(d,m-.64,.084),toVec(d,m+.64,.084),
         toVec(e,m+.64,.084),toVec(e,m-.64,.084));
     }
   }
 }
 // Highlight each separate landing island at its front and rear edge.
 for(const gap of GAPS){
   for(const spot of [gap.start-1.0,gap.end+.2]){
     for(const [a,b] of roadIntervals(spot)){
       addQuad(padFaces,null,toVec(spot,a+.17,.085),toVec(spot,b-.17,.085),
         toVec(spot+.32,b-.17,.085),toVec(spot+.32,a+.17,.085));
     }
   }
 }
 roadMat=new THREE.MeshStandardMaterial({
   color:LUMINANCE.roadColor,vertexColors:true,
   metalness:LUMINANCE.roadMetalness,roughness:LUMINANCE.roadRoughness,
   emissive:LUMINANCE.roadEmissive,
   emissiveIntensity:LUMINANCE.roadEmissiveIntensity,
   side:THREE.DoubleSide
 });
 edgeMat=neonKit.edgeBody;
 const road=new THREE.Mesh(buildGeometry(deck,colors),roadMat);
 road.frustumCulled=false;world.add(road);
 const bloomHalo=new THREE.Mesh(buildGeometry(rimHalo),neonKit.edgeHalo);
 bloomHalo.frustumCulled=false;bloomHalo.renderOrder=1;world.add(bloomHalo);
 const edge=new THREE.Mesh(buildGeometry(rim),edgeMat);
 edge.frustumCulled=false;edge.renderOrder=2;world.add(edge);
 const whiteHot=new THREE.Mesh(buildGeometry(rimCore),neonKit.edgeCore);
 whiteHot.frustumCulled=false;whiteHot.renderOrder=3;world.add(whiteHot);
 const skirtTrim=new THREE.Mesh(buildGeometry(underRail),
   new THREE.MeshBasicMaterial({
     color:0x3d779a,transparent:true,opacity:.63,depthWrite:false,side:THREE.DoubleSide
   }));
 skirtTrim.frustumCulled=false;world.add(skirtTrim);
 const gold=neonKit.warning;
 const jumps=new THREE.Mesh(buildGeometry(jumpMarks),gold);
 jumps.frustumCulled=false;world.add(jumps);
 const guides=new THREE.Mesh(buildGeometry(laneGuides),new THREE.MeshBasicMaterial({
   color:0xc3e6ff,transparent:true,opacity:.40,depthWrite:false,side:THREE.DoubleSide
 }));
 guides.frustumCulled=false;world.add(guides);
 const caps=new THREE.Mesh(buildGeometry(padFaces),neonKit.landing);
 caps.frustumCulled=false;world.add(caps);
}
function makeBillboard(text,s,height=6.7,scale=8,lateral=0){
 const canvas=document.createElement("canvas");
 canvas.width=512;canvas.height=128;
 const ctx=canvas.getContext("2d");
 ctx.clearRect(0,0,512,128);
 ctx.font="900 58px Arial, sans-serif";ctx.textAlign="center";
 ctx.shadowColor="#55dffb";ctx.shadowBlur=20;ctx.fillStyle="#e6f8ff";
 ctx.fillText(text,256,78);
 const texture=new THREE.CanvasTexture(canvas);
 texture.colorSpace=THREE.SRGBColorSpace;
 const mat=new THREE.MeshBasicMaterial({
   map:texture,color:new THREE.Color(0xf1faff).multiplyScalar(1.10),
   transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false
 });
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(scale,scale*.25),mat);
 const p=poseAt(s);
 const place=positionAt(s,lateral,height);
 sign.position.set(place.x,place.y,place.z);
 sign.rotation.y=-p.heading;
 world.add(sign);
 return sign;
}
function makeArch(s,label,color,wide=16){
 const group=new THREE.Group(),p=poseAt(s);
 group.position.set(p.x,p.y,p.z);group.rotation.y=-p.heading;
 const metal=new THREE.MeshStandardMaterial({color:0x15253c,metalness:.7,
   roughness:.35});
 const lightBody=new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(NEON_TUNING.archBodyLuminance),
   toneMapped:false,side:THREE.DoubleSide});
 const lightCore=new THREE.MeshBasicMaterial({color:new THREE.Color(0xe9faff).multiplyScalar(NEON_TUNING.archCoreLuminance),
   toneMapped:false,side:THREE.DoubleSide});
 const halo=new THREE.MeshBasicMaterial({color,
   transparent:true,opacity:NEON_TUNING.archHaloOpacity,blending:THREE.AdditiveBlending,
   depthWrite:false,toneMapped:false});
 function buildBar(width,height,depth,x,y,z,material){
   const mesh=new THREE.Mesh(new THREE.BoxGeometry(width,height,depth),material);
   mesh.position.set(x,y,z);group.add(mesh);return mesh;
 }
 for(const side of [-1,1]){
   const x=side*(wide/2+.36);
   buildBar(.56,7.5,.83,x,3.75,0,metal);
   buildBar(.24,7.37,.88,x,3.75,-.25,halo);
   buildBar(.12,7.16,.89,x,3.75,-.30,lightBody);
   buildBar(.028,7.0,.92,x,3.75,-.33,lightCore);
 }
 buildBar(wide+1.25,.46,.85,0,7.5,0,metal);
 buildBar(wide+1.2,.25,.95,0,7.66,-.25,halo);
 buildBar(wide+1.15,.10,.91,0,7.67,-.32,lightBody);
 buildBar(wide+1.08,.026,.95,0,7.7,-.34,lightCore);
 world.add(group);
 makeBillboard(label,s,9.0,13);
}

function buildDecor(){
 // Track beacons, arches and signs only. World scenery lives in world-v034.
 const beaconGeo=new THREE.BoxGeometry(.17,1.78,.21);
 const beacon=new THREE.InstancedMesh(beaconGeo,neonKit.beacon,210);
 const beaconCore=new THREE.InstancedMesh(
   new THREE.BoxGeometry(.038,1.62,.065),neonKit.beaconCore,210);
 const beaconGlow=new THREE.InstancedMesh(
   new THREE.BoxGeometry(.34,2.04,.38),neonKit.beaconHalo,210);
 // Dark hardware makes the small luminous elements feel *embedded* in a product.
 const beaconHousing=new THREE.InstancedMesh(
   new THREE.BoxGeometry(.30,2.12,.34),
   new THREE.MeshStandardMaterial({
      color:LUMINANCE.housingColor,metalness:.61,roughness:.44
    }),210);
 let i=0;
 for(let s=12;s<TRIAL.length-8;s+=18){
   if(!roadIntervals(s).length)continue;
   for(const dir of [-1,1]){
     const lanes=roadIntervals(s);
     const offset=dir<0?lanes[0][0]-1.0:lanes[lanes.length-1][1]+1.0;
     const p=positionAt(s,offset,.92);
     reusable.position.set(p.x,p.y,p.z);
     reusable.rotation.set(0,-poseAt(s).heading,0);
     reusable.scale.set(1,1,1);reusable.updateMatrix();
     beacon.setMatrixAt(i,reusable.matrix);
     beaconCore.setMatrixAt(i,reusable.matrix);
     beaconGlow.setMatrixAt(i,reusable.matrix);
     beaconHousing.setMatrixAt(i,reusable.matrix);
     i++;
   }
 }
 for(const mesh of [beaconHousing,beaconGlow,beacon,beaconCore]){
   mesh.count=i;mesh.instanceMatrix.needsUpdate=true;world.add(mesh);
 }
 pylonMesh=beacon;
 for(const arch of ARCHES)makeArch(arch.s,arch.label,arch.color,widthAt(arch.s)+.5);
 makeBillboard("SAFE",547,4.15,7,-4.3);
 makeBillboard("RISK",547,4.15,7,4.3);
}
function makeShip(){
 const hullMat=new THREE.MeshPhysicalMaterial({
   color:0xbacddd,metalness:.72,roughness:.26,clearcoat:.84,
   clearcoatRoughness:.13,flatShading:true,
   emissive:0x071928,emissiveIntensity:.20,side:THREE.DoubleSide
 });
 const dark=new THREE.MeshPhysicalMaterial({color:0x142239,
   metalness:.79,roughness:.32,clearcoat:.65,clearcoatRoughness:.17,
   flatShading:true});
 const canopy=new THREE.MeshPhysicalMaterial({
   color:0x09263d,metalness:.37,roughness:.13,clearcoat:1,
   clearcoatRoughness:.08,emissive:0x0a456b,emissiveIntensity:.76
 });
 shipGlow=neonKit.ship;
 ship=new THREE.Group();
 const hull=new THREE.Mesh(new THREE.BoxGeometry(1.55,.52,3.85),hullMat);
 hull.position.y=.05;ship.add(hull);
 const tip=new THREE.Mesh(new THREE.ConeGeometry(.84,1.8,4),hullMat);
 tip.rotation.x=-Math.PI/2;tip.position.set(0,.05,-2.65);ship.add(tip);
 const glass=new THREE.Mesh(new THREE.BoxGeometry(.91,.3,1.36),canopy);
 glass.position.set(0,.48,-.47);ship.add(glass);
 for(const sign of [-1,1]){
   const verts=[
     sign*.64,.14,-1.2,sign*3.0,.02,.82,sign*2.47,.02,1.9,
     sign*.64,.14,-1.2,sign*2.47,.02,1.9,sign*.66,.16,1.14
   ];
   const geo=new THREE.BufferGeometry();
   geo.setAttribute("position",new THREE.Float32BufferAttribute(verts,3));
   geo.computeVertexNormals();
   ship.add(new THREE.Mesh(geo,hullMat));
   const intake=new THREE.Mesh(new THREE.BoxGeometry(.44,.26,1.4),dark);
   intake.position.set(sign*1.36,.14,.7);ship.add(intake);
   // Thin leading-edge light: restrained, precise, follows the wing geometry.
   const wingLed=new THREE.Mesh(new THREE.BoxGeometry(.076,.055,1.07),shipGlow);
   wingLed.position.set(sign*1.55,.205,-.26);
   wingLed.rotation.y=sign*.64;ship.add(wingLed);
   const engine=new THREE.Mesh(new THREE.BoxGeometry(.38,.18,.46),shipGlow);
   engine.position.set(sign*.76,-.11,2.1);ship.add(engine);
 }
 const engineCore=new THREE.Mesh(new THREE.BoxGeometry(.82,.13,.46),shipGlow);
 engineCore.position.set(0,-.08,2.06);ship.add(engineCore);
 const thrusterWhite=new THREE.Mesh(new THREE.BoxGeometry(.62,.055,.49),
   neonKit.edgeCore);
 thrusterWhite.position.set(0,-.045,2.06);ship.add(thrusterWhite);
 const spine=new THREE.Mesh(new THREE.BoxGeometry(.28,.22,2.2),dark);
 spine.position.set(0,.42,.68);ship.add(spine);
 refineCraftSilhouette(THREE,ship);
 engineLight=new THREE.PointLight(0x43ddf0,NEON_TUNING.enginePointIntensity,5.0,1.7);
 engineLight.position.set(0,-.52,1.8);
 ship.add(engineLight);
 scene.add(ship);
 premiumFX=createPremiumFlightFX(THREE,scene);
 shadowMesh=createContactShadow(THREE,scene);
}
function initScene(){
 scene=new THREE.Scene();
 scene.background=new THREE.Color(COLOR[0].sky);
 scene.fog=new THREE.FogExp2(COLOR[0].fog,LUMINANCE.fogDensity*.57);
 camera=new THREE.PerspectiveCamera(67,innerWidth/Math.max(1,innerHeight),.1,650);
 scene.add(camera);
 renderer=new THREE.WebGLRenderer({canvas:UI.canvas,antialias:true,
   powerPreference:"high-performance"});
 // Native-resolution modern-phone target: NOT constrained by the older A51.
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,NEON_TUNING.maxPixelRatio));
 renderer.setSize(innerWidth,innerHeight,false);
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 // Sum renderer workload across all composer passes (last pass alone=1 call).
 renderer.info.autoReset=false;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=LUMINANCE.exposure;
 neonKit=createNeonKit(THREE);
 scene.add(new THREE.HemisphereLight(
   LUMINANCE.ambientSky,LUMINANCE.ambientGround,LUMINANCE.ambientIntensity
 ));
 const key=new THREE.DirectionalLight(0xb5d6ff,LUMINANCE.keyIntensity);
 key.position.set(12,28,18);scene.add(key);
 const edgeFill=new THREE.DirectionalLight(0xf87ac6,LUMINANCE.fillIntensity);
 edgeFill.position.set(-18,11,-22);scene.add(edgeFill);
 world=new THREE.Group();scene.add(world);
 buildRoad();
 identitySurface=installCleanTrack(THREE,world);
 buildDecor();
 // Open space, no geological scenery, distant monuments or 3D floor.
 makeShip();
 spaceBackdrop=installSpaceBackdrop(THREE,camera);
 // HDR multilayer bloom renders *after* the beauty pass and before tone mapping.
 neonPipeline=createNeonPipeline(THREE,renderer,scene,camera);
 neonPipeline.resize(innerWidth,innerHeight);
 addEventListener("resize",resize);
 sceneReady=true;
}
function resize(){
 if(!renderer)return;
 const rect=UI.canvas.getBoundingClientRect();
 const width=Math.max(1,Math.round(rect.width||innerWidth));
 const height=Math.max(1,Math.round(rect.height||innerHeight));
 camera.aspect=width/height;camera.updateProjectionMatrix();
 renderer.setSize(width,height,false);
 neonPipeline?.resize(width,height);
}
function syncFullscreenUi(active){
 UI.fullscreen.setAttribute("aria-label",active?"Exit fullscreen":"Enter fullscreen");
 UI.fullscreen.setAttribute("aria-pressed",String(active));
 UI.fullscreen.title=active?"Exit fullscreen":"Fullscreen";
 UI.fullscreen.classList.toggle("active",active);
 UI.menuFullscreen.textContent=active?"⛶ EXIT FULLSCREEN":"⛶ FULLSCREEN";
 UI.menuFullscreen.setAttribute("aria-pressed",String(active));
 if(active)UI.fullscreenHelp.classList.add("hidden");
}
function fullscreenBlocked(){
 UI.fullscreenHelp.classList.remove("hidden");
 if(uiState.mode!=="menu")flashToast("FULLSCREEN BLOCKED · OPEN IN CHROME",2600);
}
function installFullscreen(){
 fullscreenController=makeFullscreenController({
   doc:document,root:$("app"),deviceScreen:screen,
   onChange:syncFullscreenUi,
   onBlocked:fullscreenBlocked,
   onResize:()=>{resize();requestAnimationFrame(resize);}
 });
 fullscreenController.sync();
}
function startImmersiveTrial(){
 // Must request fullscreen inside the originating user-gesture click.
 if(!fullscreenController.active())fullscreenController.request(true);
 enterPlaying();
}
function clearInput(){
 uiState.inputX=0;uiState.jumpPressed=false;uiState.jumpHeld=false;
 uiState.keys.clear();uiState.stickPointer=null;
 UI.knob.style.transform="translateX(0px)";
 UI.jump.classList.remove("held");
}
function resetFlight(){
 flight=newFlightState();previousSector=0;
 premiumFX?.reset();
 perfFrames=0;perfTotal=0;perfMin=200;
 renderSamples=0;renderCallTotal=0;renderCallPeak=0;triangleTotal=0;
 document.documentElement.style.setProperty("--neon","#43dff3");
 telemetry.length=0;uiState.trackHint=-1;clearInput();
 event("trial_start",{trial:TRIAL.id});
 UI.banner.classList.add("hidden");
 UI.flash.classList.remove("active");
 UI.toast.classList.add("hidden");
 UI.finalTitle.textContent="FLIGHT ENDED";
 // Initialize camera on authored track axis rather than on craft's X position.
 const initial=positionAt(5,0,0),yaw=flight.heading;
 camera.position.set(initial.x-Math.sin(yaw)*19,initial.y+10,
   initial.z+Math.cos(yaw)*19);
 cameraLook.set(initial.x+Math.sin(yaw)*33,initial.y+1.5,
   initial.z-Math.cos(yaw)*33);
 camera.lookAt(cameraLook);
 worldClock.last=performance.now();worldClock.accum=0;
}
function enterPlaying(){
 if(!sceneReady)return;
 resetFlight();uiState.mode="playing";
 UI.menu.classList.add("hidden");UI.end.classList.add("hidden");
 UI.pause.classList.add("hidden");
 UI.hud.classList.remove("hidden");UI.controls.classList.remove("hidden");
 UI.pauseBtn.classList.remove("hidden");
 UI.fullscreen.classList.remove("hidden");
 refreshHud();
}
function pause(){
 if(uiState.mode!=="playing")return;
 uiState.mode="paused";clearInput();
 UI.pause.classList.remove("hidden");UI.pauseBtn.classList.add("hidden");
}
function resume(){
 if(uiState.mode!=="paused")return;
 uiState.mode="playing";UI.pause.classList.add("hidden");
 UI.pauseBtn.classList.remove("hidden");
 worldClock.last=performance.now();worldClock.accum=0;
}
function endRun(won){
 uiState.mode="ended";clearInput();
 UI.finalTitle.textContent=won?"TRIAL CLEAR":"FLIGHT ENDED";
 UI.finalTitle.classList.toggle("success",won);
 UI.finalDistance.textContent=Math.floor(flight.s)+" M";
 UI.finalSector.textContent=String(sectorAt(flight.s)+1).padStart(2,"0");
 UI.finalTime.textContent=Math.floor(flight.elapsed/60)+":"+
   String(Math.floor(flight.elapsed%60)).padStart(2,"0");
 UI.finalJumps.textContent=String(flight.jumps)+" / "+String(flight.clearedGaps.length);
 UI.finalStyle.textContent=flight.routeRewarded?"+500":"0";
 let best=bestForTrial();
 if(won && (!best||flight.elapsed<best)){saveBest(flight.elapsed);best=flight.elapsed;}
 UI.finalBest.textContent=best?best.toFixed(1)+" S":"—";
 event(won?"trial_clear":"trial_failed",{shield:flight.shield});
 UI.hud.classList.add("hidden");UI.controls.classList.add("hidden");
 UI.pauseBtn.classList.add("hidden");UI.end.classList.remove("hidden");
}
function announceSector(index){
 const sector=SECTORS[index];const color=COLOR[index].color;
 document.documentElement.style.setProperty("--neon","#"+color.toString(16).padStart(6,"0"));
 premiumFX?.onZone();
 if(index===0)return;
 UI.bannerNum.textContent=String(index+1).padStart(2,"0");
 UI.bannerName.textContent=sector.name;
 UI.banner.classList.remove("hidden");
 UI.banner.style.animation="none";void UI.banner.offsetWidth;UI.banner.style.animation="";
 UI.flash.classList.add("active");
 clearTimeout(uiState.bannerTimeout);
 uiState.bannerTimeout=setTimeout(()=>{
   UI.banner.classList.add("hidden");UI.flash.classList.remove("active");
 },1750);
 event("sector",{sector:sector.name});
}
function refreshHud(){
 const sector=sectorAt(flight.s);
 UI.sector.textContent=String(sector+1).padStart(2,"0");
 UI.sectorName.textContent=SECTORS[sector].name;
 UI.shieldFill.style.width=flight.shield+"%";
 UI.shieldText.textContent=flight.shield+"%";
 UI.distance.innerHTML=String(Math.floor(flight.s)).padStart(4,"0")+
   ' <small>/ '+TRIAL.length+' M</small>';
 UI.speed.textContent="SPEED "+(speedAt(flight.s)/TRIAL.startSpeed).toFixed(2)+"×";
 UI.progress.style.width=(flight.s/TRIAL.length*100).toFixed(1)+"%";
 UI.flight.textContent=flight.s>=545&&flight.s<=680?
   (flight.lateral>2.6?"RISK ROUTE":"SAFE ROUTE"):
   flight.grounded?"GLIDING":
   flight.vy>0?"AIRBORNE · RISING":"AIRBORNE · DESCENDING";
}
function maybeShowCue(){
 if(uiState.mode!=="playing")return;
 const gap=nextGap(flight.s);
 if(gap&&flight.s>=gap.start-28&&flight.s<gap.start-23 &&
   uiState.trackHint!==gap.id){
   uiState.trackHint=gap.id;
   flashToast(gap.kind==="island"?"SKY ISLAND · STEER AND JUMP":
     "GAP AHEAD · TIME YOUR JUMP",1350);
 }
 const risky=RISK_CUTS.find(c=>flight.s<c.start &&
   flight.s>=c.start-20&&flight.lateral>2.6&&
   uiState.trackHint!=="risk-"+c.start);
 if(risky){
   uiState.trackHint="risk-"+risky.start;
   flashToast("RISK LANE · JUMP AHEAD",1100);
 }
 const split=SPLITS[0];
 if(flight.s>=split.start-48&&flight.s<split.start-43 && uiState.trackHint!=="split"){
   uiState.trackHint="split";
   flashToast("LEFT SAFE  /  RIGHT RISK +500",1850);
 }
}
function integrate(dt){
 const keyRight=uiState.keys.has("ArrowRight")||uiState.keys.has("KeyD");
 const keyLeft=uiState.keys.has("ArrowLeft")||uiState.keys.has("KeyA");
 const steer=clamp((keyRight?1:0)-(keyLeft?1:0)+uiState.inputX,-1,1);
 const result=stepFlight(flight,dt,{
   steer,jumpPressed:uiState.jumpPressed,
   jumpHeld:uiState.jumpHeld
 });
 uiState.jumpPressed=false;
 if(result.jumped){
   premiumFX?.onJump();
   event("jump",{lateral:+flight.lateral.toFixed(2)});
 }
 if(result.landed){
   const p=positionAt(flight.s,flight.lateral,0);
   premiumFX?.onLand({...p,heading:flight.heading});
   event("landing",{impact:+result.landImpact.toFixed(2)});
 }
 if(result.cleared)event("gap_cleared",{count:flight.clearedGaps.length});
 if(result.routeChoice)event("route_choice",{route:result.routeChoice});
 if(result.routeReward){
   event("risk_route_clear",{styleBonus:500});
   flashToast("RISK ROUTE CLEAR · +500 STYLE",1700);
 }
 if(result.crashed){
   event("fall",{at:Math.round(flight.lastCrashS),shield:flight.shield});
   flashToast("SKYSHIELD -35 · CHECKPOINT",1350);
 }
 const sector=sectorAt(flight.s);
 if(sector!==previousSector){previousSector=sector;announceSector(sector);}
 maybeShowCue();
 if(result.finished)endRun(true);
 else if(flight.failed)endRun(false);
}
function updatePalette(dt){
 const index=sectorAt(flight.s),palette=themes[index],k=1-Math.exp(-dt*1.12);
 scene.background.lerp(palette.skyColor,k);
 scene.fog.color.lerp(palette.fogColor,k);
 neonKit.updateAccent(palette.color,k);
 if(engineLight)engineLight.color.copy(neonKit.worldAccent);
}
function placeShip(time,dt){
 // Independent pilot-owned world pose, with no centreline yaw or position help.
 const ground=surfaceHeightAt(flight.s,flight.lateral);
 const clearance=flight.y-TRIAL.hoverHeight-ground;
 const bank=bankAt(flight.s);
 const solid=onRoad(flight.s,flight.lateral);
 ship.position.set(flight.worldX,flight.y+Math.sin(time*4.2)*.025,flight.worldZ);
 ship.rotation.y=-flight.heading;
 const deckRoll=flight.grounded?bank:bank*.33;
 ship.rotation.z=lerp(ship.rotation.z,
   clamp(-deckRoll-flight.steering*.13,-.58,.58),
   1-Math.exp(-dt*7));
 ship.rotation.x=lerp(ship.rotation.x,clamp(flight.vy/28,-.19,.21),
   1-Math.exp(-dt*7));
 if(shadowMesh){
   shadowMesh.visible=solid&&clearance<4.2;
   if(shadowMesh.visible){
     const contact=positionAt(flight.s,flight.lateral,.032);
     shadowMesh.position.set(contact.x,contact.y,contact.z);
     const normal=surfaceNormalAt(flight.s);
     SHADOW_NORMAL.set(normal.x,normal.y,normal.z);
     shadowMesh.quaternion.setFromUnitVectors(SHADOW_PLANE_NORMAL,SHADOW_NORMAL);
     shadowMesh.material.opacity=clamp(.62-Math.max(0,clearance)*.16,0,.62);
   }
 }
 // Third person camera follows craft WORLD heading, never authored headingAt().
 const fx=Math.sin(flight.heading),fz=-Math.cos(flight.heading);
 const air=Math.max(0,clearance);
 const targetCamera=new THREE.Vector3(
   flight.worldX-fx*17.8,flight.y+8.8+air*.13,flight.worldZ-fz*17.8
 );
 const targetLook=new THREE.Vector3(
   flight.worldX+fx*33,flight.y+1.15,flight.worldZ+fz*33
 );
 camera.position.lerp(targetCamera,1-Math.exp(-dt*4.5));
 cameraLook.lerp(targetLook,1-Math.exp(-dt*5.2));
 camera.lookAt(cameraLook);
 // The actual surface tilts up to 25°; modest camera roll protects readability.
 camera.rotateZ(-bank*.14);
 const targetFov=66+Math.min(5,(speedAt(flight.s)-TRIAL.startSpeed)*.9);
 camera.fov=lerp(camera.fov,targetFov,1-Math.exp(-dt*2));
 camera.updateProjectionMatrix();
}
function loop(now){
 requestAnimationFrame(loop);
 const dt=Math.min(.05,Math.max(0,(now-worldClock.last)/1000));
 worldClock.last=now;
 if(uiState.mode==="playing"){
   if(dt>0&&dt<.17){perfFrames++;perfTotal+=1/dt;perfMin=Math.min(perfMin,1/dt);}
   worldClock.accum+=dt;
   let count=0;
   while(worldClock.accum>=1/120 && count<7 && uiState.mode==="playing"){
     integrate(1/120);worldClock.accum-=1/120;count++;
   }
   if(count>=7)worldClock.accum=0;
   refreshHud();
 }
 if(flight){
   updatePalette(dt);placeShip(now/1000,dt);
   premiumFX?.frame({
     dt,playing:uiState.mode==="playing",flight,poseAt,positionAt,
     ship,shipGlow,sectorColor:COLOR[sectorAt(flight.s)].color
   });
 }
 // Capture all HDR composer pass draw calls in the current frame.
 renderer.info?.reset();
 if(neonPipeline)neonPipeline.render(dt);
 else renderer.render(scene,camera);
 if(uiState.mode==="playing"&&renderer.info){
   // Renderer workload is indicative; not GPU milliseconds.
   const work=renderer.info.render;
   renderSamples++;
   renderCallTotal+=work.calls;renderCallPeak=Math.max(renderCallPeak,work.calls);
   triangleTotal+=work.triangles;
 }
}
function exportAudit(){
 const data={
   game:"SKYSHIFT",version:"0.4.1",trial:TRIAL.id,exportedAt:new Date().toISOString(),
   visual:{pipeline:"HDR UnrealBloom",tier:"Space Track Flow",
     renderDpr:renderer.getPixelRatio(),
     surfaceAccents:identitySurface.plan.length,decorativePlates:0,
     worldFormations:0,worldLandmarks:0,
     spaceStars:spaceBackdrop.stars,spaceNebulae:spaceBackdrop.nebulae,
     rendererDrawCallsAverage:renderSamples?Math.round(renderCallTotal/renderSamples):null,
     rendererDrawCallsPeak:renderSamples?renderCallPeak:null,
     rendererTrianglesAverage:renderSamples?Math.round(triangleTotal/renderSamples):null,
     banking:"Physical 3D geometry with matched collision",
     maxBankDegrees:25,
     exposure:LUMINANCE.exposure,fogDensity:LUMINANCE.fogDensity,
     bloomStrength:NEON_TUNING.bloomStrength,
     bloomThreshold:NEON_TUNING.bloomThreshold},

   run:{
     status:flight.finished?"clear":"failed",distanceMeters:+flight.s.toFixed(1),
     durationSeconds:+flight.elapsed.toFixed(2),shield:flight.shield,
     jumps:flight.jumps,landings:flight.landings,falls:flight.falls,
     steerSeconds:+flight.steerSeconds.toFixed(2),
     steerReversals:flight.steerReversals,
     maxBankDegrees:+flight.peakBankDeg.toFixed(2),
     maxHeadingErrorDegrees:+flight.maxHeadingErrorDeg.toFixed(1),
     averageHeadingErrorDegrees:flight.headingSamples?
       +(flight.totalHeadingError/flight.headingSamples).toFixed(1):null,
     offRoadSeconds:+flight.offRoadSeconds.toFixed(2),
     manualSteering:true,
     routeChoice:flight.routeChoice,
     riskRouteStyleBonus:flight.routeRewarded?500:0,
     fpsAverage:perfFrames?Math.round(perfTotal/perfFrames):null,
     fpsMinimum:perfFrames?Math.round(perfMin):null,
     gapClears:[...flight.clearedGaps],failedJumpEdges:flight.failedJumps
   },events:telemetry
 };
 const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="skyshift-first-flight-v041-audit.json";
 document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1800);
}
function installControls(){
 UI.start.addEventListener("click",startImmersiveTrial);
 UI.retry.addEventListener("click",startImmersiveTrial);
 UI.restart.addEventListener("click",enterPlaying);
 UI.resume.addEventListener("click",resume);
 UI.pauseBtn.addEventListener("click",pause);
 UI.fullscreen.addEventListener("click",()=>fullscreenController.toggle());
 UI.menuFullscreen.addEventListener("click",()=>fullscreenController.toggle());
 UI.export.addEventListener("click",exportAudit);
 addEventListener("keydown",e=>{
   if(["Space","ArrowUp","ArrowRight","ArrowLeft","KeyA","KeyD"].includes(e.code))
     e.preventDefault();
   if(e.code==="Space"&&!e.repeat && uiState.mode==="playing"){
     uiState.jumpPressed=true;uiState.jumpHeld=true;
   }
   if(e.code==="KeyP"||e.code==="Escape") {
     if(uiState.mode==="playing")pause();
     else if(uiState.mode==="paused")resume();
   }
   if(e.code==="Enter"&&uiState.mode==="menu")enterPlaying();
   uiState.keys.add(e.code);
 });
 addEventListener("keyup",e=>{
   uiState.keys.delete(e.code);
   if(e.code==="Space")uiState.jumpHeld=false;
 });
 function jumpRelease(){
   uiState.jumpHeld=false;UI.jump.classList.remove("held");
 }
 UI.jump.addEventListener("pointerdown",e=>{
   e.preventDefault();UI.jump.setPointerCapture(e.pointerId);
   uiState.jumpPressed=true;uiState.jumpHeld=true;
   UI.jump.classList.add("held");
 });
 UI.jump.addEventListener("pointerup",jumpRelease);
 UI.jump.addEventListener("pointercancel",jumpRelease);
 UI.jump.addEventListener("lostpointercapture",jumpRelease);
 function steer(e){
   const rect=UI.stick.getBoundingClientRect();
   uiState.inputX=clamp((e.clientX-(rect.left+rect.width*.5))/59,-1,1);
   UI.knob.style.transform="translateX("+(uiState.inputX*49).toFixed(1)+"px)";
 }
 function steerRelease(e){
   if(uiState.stickPointer!==e.pointerId)return;
   uiState.stickPointer=null;uiState.inputX=0;
   UI.knob.style.transform="translateX(0px)";
 }
 UI.stick.addEventListener("pointerdown",e=>{
   e.preventDefault();uiState.stickPointer=e.pointerId;
   UI.stick.setPointerCapture(e.pointerId);steer(e);
 });
 UI.stick.addEventListener("pointermove",e=>{
   if(e.pointerId===uiState.stickPointer)steer(e);
 });
 UI.stick.addEventListener("pointerup",steerRelease);
 UI.stick.addEventListener("pointercancel",steerRelease);
 UI.stick.addEventListener("lostpointercapture",steerRelease);
 addEventListener("blur",()=>{if(uiState.mode==="playing")pause();});
 document.addEventListener("visibilitychange",()=>{
   if(document.hidden&&uiState.mode==="playing")pause();
 });
}
try{
 initScene();installFullscreen();installControls();resetFlight();
 requestAnimationFrame(loop);
}catch(error){
 console.error("SKYSHIFT startup failed",error);
 UI.error.classList.remove("hidden");
 UI.error.textContent="SKYSHIFT could not start: "+(error?.message||"Unknown startup error");
}
