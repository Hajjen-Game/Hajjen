// SKYSHIFT 0.10.5 — Wing Vapor & Speed Pressure.
// Optical airflow *from the trailing edges of the wings*, not engine exhaust.
// One batched, preallocated dynamic mesh, white core + feather per stream.
// No particles, camera overlays, textures, lights, collision or control edits.
import {speedPresenceAt} from "./velocity-presence-v0104.mjs";
import {MANTA_WING_OUTLINE} from "./manta-blade-v0484.mjs";
import {STINGRAY_WING} from "./stingray-evo-v0104.mjs";

export const WING_VAPOR=Object.freeze({
 version:"wing-vapor-speed-pressure-0105",
 perWing:7,wingCount:2,layers:2,segments:5,
 maxAdditionalDrawCalls:1,
 maxLengthMeters:10.8,
 addedLights:0,addedParticles:0,addedPostPasses:0,
 physicsChanged:false
});
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const safe=(x,d=0)=>Number.isFinite(x)?x:d;

// Return aft-most actual polygon intersection at x. This anchors trails to
// either ship's real trailing wing edge instead of fictitious engine sockets.
export function trailingWingZ(outline,x){
 let aft=-Infinity;
 for(let i=0;i<outline.length;i++){
  const a=outline[i],b=outline[(i+1)%outline.length];
  const lo=Math.min(a[0],b[0]),hi=Math.max(a[0],b[0]);
  if(x<lo-1e-6||x>hi+1e-6)continue;
  const dx=b[0]-a[0];
  if(Math.abs(dx)<1e-7){
   aft=Math.max(aft,a[1],b[1]);
  }else{
   const t=clamp((x-a[0])/dx,0,1);
   aft=Math.max(aft,a[1]+t*(b[1]-a[1]));
  }
 }
 return Number.isFinite(aft)?aft:null;
}
export function vaporWingAnchors(variant="manta"){
 const stingray=variant==="stingray";
 const outline=stingray?STINGRAY_WING:MANTA_WING_OUTLINE;
 const xMin=stingray?1.30:1.14;
 const xMax=stingray?2.94:2.68;
 const result=[];
 for(let i=0;i<WING_VAPOR.perWing;i++){
  const x=xMin+(xMax-xMin)*i/(WING_VAPOR.perWing-1);
  const z=trailingWingZ(outline,x);
  if(z===null)throw Error("Wing vapor anchor outside physical wing");
  result.push(Object.freeze({x,z:z+.07,y:.30}));
 }
 return result;
}

// Fractional staged activation: each new zone introduces another fine strand
// per wing, with an optical crossfade rather than all seven appearing at once.
export function wingVaporEnvelope(speed,boost=1,grounded=true,lowMemory=false){
 const fraction=speedPresenceAt(safe(speed,44));
 const extra=clamp((safe(boost,1)-1)/.40,0,1);
 const airborne=grounded===false;
 const stages=clamp((fraction-.08)/.12+extra*.65,0,WING_VAPOR.perWing);
 const count=clamp(Math.ceil(stages-.0001),0,
  lowMemory?4:WING_VAPOR.perWing);
 const length=clamp(2.45+fraction*6.55+extra*1.35+
  (airborne?.52:0),0,WING_VAPOR.maxLengthMeters);
 const opacity=clamp(.26+fraction*.36+extra*.20+
  (airborne?.11:0),0,.82);
 const pressure=clamp(.24+fraction*.46+extra*.26+
  (airborne?.13:0),0,1);
 return {fraction,boost:extra,airborne,stages,count,
  length,opacity,pressure,lowMemory:Boolean(lowMemory)};
}
function writeQuad(position,color,offset,x0,x1,y0,y1,z0,z1,
 width0,width1,brightness0,brightness1){
 // No temporary arrays or GC inside the 60/120 FPS geometry update.
 // Two triangles: near-left, near-right, far-right, near-left,
 // far-right, far-left.
 for(let i=0;i<6;i++){
  const far=i===2||i===4||i===5;
  const right=i===1||i===2||i===4;
  const o=offset+i*3;
  const w=far?width1:width0;
  const c=far?brightness1:brightness0;
  position[o]=(far?x1:x0)+(right?w:-w);
  position[o+1]=far?y1:y0;
  position[o+2]=far?z1:z0;
  color[o]=c*.94;color[o+1]=c*.985;color[o+2]=c;
 }
}
export function createWingVaporFX(THREE,ship,{variant="manta",lowMemory=false}={}){
 const anchors=vaporWingAnchors(variant);
 const count=WING_VAPOR.wingCount*WING_VAPOR.perWing*
  WING_VAPOR.layers*WING_VAPOR.segments;
 const positions=new Float32Array(count*18),colors=new Float32Array(count*18);
 const geometry=new THREE.BufferGeometry();
 const pos=new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage);
 const rgb=new THREE.BufferAttribute(colors,3).setUsage(THREE.DynamicDrawUsage);
 geometry.setAttribute("position",pos);
 geometry.setAttribute("color",rgb);
 // Dynamic lengths are bounded and the entire craft is under this sphere.
 geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,.35,5),17);
 const material=new THREE.MeshBasicMaterial({
  color:0xffffff,vertexColors:true,transparent:true,opacity:1,
  blending:THREE.AdditiveBlending,depthTest:true,depthWrite:false,
  side:THREE.DoubleSide,toneMapped:false
 });
 const mesh=new THREE.Mesh(geometry,material);
 mesh.name="White wing pressure vapor · speed-dependent individual strands";
 mesh.renderOrder=4;
 mesh.frustumCulled=false;
 mesh.visible=false;
 ship.add(mesh);
 let clock=0,visualLength=0,visualOpacity=0;
 let maxStrands=0,maxLength=0,peakAirborne=0,boostFrames=0;
 let last=wingVaporEnvelope(44);
 const qualityLow=Boolean(lowMemory);
 return {
  mesh,
  frame(dt,{playing=false,speed=44,boostMultiplier=1,grounded=true,
   steering=0,yawRate=0}={}){
   if(!playing){mesh.visible=false;return;}
   const h=clamp(safe(dt),0,.08);
   const target=wingVaporEnvelope(speed,boostMultiplier,grounded,qualityLow);
   // Even one frame has valid geometry; flight/pause does not keep moving FX.
   if(h>0){
    clock+=h;
    visualLength+=(target.length-visualLength)*(1-Math.exp(-h*9));
    visualOpacity+=(target.opacity-visualOpacity)*(1-Math.exp(-h*12));
   }
   const active=h>0&&target.count>0&&visualOpacity>.018;
   mesh.visible=active;
   last=target;
   if(!active)return;
   const steer=clamp(safe(steering),-1,1);
   const yaw=clamp(safe(yawRate)/1.24,-1,1);
   const air=target.airborne?1:0;
   const maxPerWing=qualityLow?4:WING_VAPOR.perWing;
   const length=Math.min(visualLength,WING_VAPOR.maxLengthMeters);
   const optical=visualOpacity*(qualityLow?.76:1);
   for(let sideIndex=0;sideIndex<2;sideIndex++){
    const side=sideIndex===0?-1:1;
    for(let i=0;i<WING_VAPOR.perWing;i++){
     const anchor=anchors[i];
     const level=clamp(target.stages-i,0,1);
     const enabled=i<maxPerWing?level:0;
     const base=optical*enabled;
     // Directly behind the shell; speed pressure releases a wider fan aloft.
     const spread=.038+.085*target.fraction+.07*air;
     const curl=(steer*.10+yaw*.10)*target.fraction;
     const extent=length*(.86+.025*i);
     for(let layer=0;layer<WING_VAPOR.layers;layer++){
      const core=layer===1;
      for(let segment=0;segment<WING_VAPOR.segments;segment++){
       const a=segment/WING_VAPOR.segments;
       const b=(segment+1)/WING_VAPOR.segments;
       const xAt=t=>side*(anchor.x+
        spread*t+.038*Math.sin(clock*(2.8+target.fraction*2)+i*.81-t*5)*t+
        curl*t);
       const yAt=t=>anchor.y+.03+
        t*(air?.22:.055)+.027*Math.sin(clock*3+i+t*4)*t;
       const zAt=t=>anchor.z+t*extent;
       const widthAt=t=>(core?.019:.075)*(1-.77*t)*
        (1+.20*target.fraction);
       // Taper near root and at wake end; never create opaque laser bars.
       const strength=t=>Math.pow(Math.sin(Math.PI*(.07+.88*t)),.62)*
        (1-.32*t);
       const brightness=core?1.12:.27;
       const front=base*strength(a)*brightness;
       const back=base*strength(b)*brightness;
       const idx=((((sideIndex*WING_VAPOR.perWing+i)*
        WING_VAPOR.layers+layer)*WING_VAPOR.segments)+segment)*18;
       writeQuad(positions,colors,idx,xAt(a),xAt(b),yAt(a),yAt(b),
        zAt(a),zAt(b),widthAt(a),widthAt(b),front,back);
      }
     }
    }
   }
   pos.needsUpdate=true;rgb.needsUpdate=true;
   maxStrands=Math.max(maxStrands,target.count*2);
   maxLength=Math.max(maxLength,length);
   if(air)peakAirborne=Math.max(peakAirborne,target.opacity);
   if(target.boost>.1)boostFrames++;
  },
  reset(){clock=0;visualLength=0;visualOpacity=0;
   maxStrands=0;maxLength=0;peakAirborne=0;boostFrames=0;
   last=wingVaporEnvelope(44);mesh.visible=false;},
  stats(){return {version:WING_VAPOR.version,
   model:variant,lowMemory:qualityLow,
   currentStrands:mesh.visible?last.count*2:0,
   peakStrands:maxStrands,
   lastLengthMeters:+visualLength.toFixed(2),
   peakLengthMeters:+maxLength.toFixed(2),
   peakAirborneOpacity:+peakAirborne.toFixed(3),
   boostFrames,drawCallsAdded:1,particlesAdded:0,
   physicsUnchanged:true};},
  dispose(){mesh.removeFromParent();geometry.dispose();material.dispose();}
 };
}
