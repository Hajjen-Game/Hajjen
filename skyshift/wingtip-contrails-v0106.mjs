// SKYSHIFT 0.10.6 — Wingtip Contrails.
// Two precise white air-pressure wakes begin at the OUTERMOST WINGTIP,
// not along the trailing edge or at the two inboard engine sockets.
// Main strand per side; two much fainter siblings split off down-stream only
// at higher cruise speed. Pure rendering; no particles, lights or physics.
import {speedPresenceAt} from "./velocity-presence-v0104.mjs";
import {MANTA_WING_OUTLINE} from "./manta-blade-v0484.mjs";
import {STINGRAY_WING} from "./stingray-evo-v0104.mjs";

export const WINGTIP_CONTRAILS=Object.freeze({
 version:"wingtip-contrails-0106",
 emitters:2,maxStrandsPerTip:3,lowMemoryStrandsPerTip:2,
 layers:2,segments:6,maxLengthMeters:14.0,
 addedDrawCalls:1,addedParticles:0,addedLights:0,addedPostPasses:0,
 steeringChanged:false,physicsChanged:false
});
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
const smoothstep=(a,b,x)=>{
 const t=clamp((x-a)/(b-a),0,1);
 return t*t*(3-2*t);
};

// A single point per tip, obtained from the actual wing outlines:
// Manta = +/-2.90m; Stingray = +/-3.20m. At Manta's vertical clipped
// extreme, use the midpoint of its two outline vertices.
export function wingtipAnchor(variant="manta"){
 const stingray=variant==="stingray";
 const outline=stingray?STINGRAY_WING:MANTA_WING_OUTLINE;
 let outerX=-Infinity,minZ=Infinity,maxZ=-Infinity;
 for(const [x,z] of outline){
  if(x>outerX+1e-7){outerX=x;minZ=z;maxZ=z;}
  else if(Math.abs(x-outerX)<1e-7){
   minZ=Math.min(minZ,z);
   maxZ=Math.max(maxZ,z);
  }
 }
 if(!Number.isFinite(outerX))throw Error("No physical wingtip in outline");
 return Object.freeze({x:outerX,z:(minZ+maxZ)*.5,
  y:stingray?.252:.194});
}
export function wingtipEmitters(variant="manta"){
 const p=wingtipAnchor(variant);
 return [{x:-p.x,y:p.y,z:p.z},{x:p.x,y:p.y,z:p.z}];
}

// Based on actual *cruise* speed; boost remains a separate accent. Individual
// strands cannot appear as a row of nozzles: all three have one common origin.
export function contrailEnvelope(speed=44,boostMultiplier=1,grounded=true,
 lowMemory=false){
 const fraction=speedPresenceAt(finite(speed,44));
 const boost=clamp((finite(boostMultiplier,1)-1)/.4,0,1);
 const air=grounded===false;
 const intensity=clamp(fraction+boost*.16,0,1);
 const main=smoothstep(.08,.25,intensity);
 const second=smoothstep(.52,.72,intensity)*.40;
 const third=lowMemory?0:smoothstep(.90,.99,intensity)*.23;
 const weights=[main,second,third];
 const limit=lowMemory?2:3;
 const count=weights.slice(0,limit).filter(x=>x>.015).length;
 const length=clamp(3.0+fraction*8.4+boost*1.8+
  (air?.65:0),0,WINGTIP_CONTRAILS.maxLengthMeters);
 const brightness=clamp(.37+fraction*.43+boost*.24+
  (air?.09:0),0,1.04);
 return {fraction,boost,air,intensity,
  weights,count,length,brightness,
  lowMemory:Boolean(lowMemory)};
}

// One permanently allocated triangle buffer for every possible core+halo.
// The order is tip, sibling strand, layer, segment, vertex.
// No per-quad objects/arrays allocated during a gameplay frame.
function quad(pos,rgb,offset,
 xa,ya,za,xb,yb,zb,widthA,widthB,strengthA,strengthB,core){
 for(let i=0;i<6;i++){
  const far=i===2||i===4||i===5;
  const right=i===1||i===2||i===4;
  const p=offset+i*3;
  const w=far?widthB:widthA;
  const energy=far?strengthB:strengthA;
  pos[p]=(far?xb:xa)+(right?w:-w);
  pos[p+1]=far?yb:ya;
  pos[p+2]=far?zb:za;
  // Cold-neutral white light, no zone color or engine flame palette.
  rgb[p]=energy*(core?1.07:.94);
  rgb[p+1]=energy*(core?1.08:.97);
  rgb[p+2]=energy*(core?1.10:1.0);
 }
}
export function createWingtipContrails(THREE,ship,
 {variant="manta",lowMemory=false}={}){
 const tips=wingtipEmitters(variant);
 const spec=WINGTIP_CONTRAILS;
 const vertices=spec.emitters*spec.maxStrandsPerTip*
  spec.layers*spec.segments*6;
 const points=new Float32Array(vertices*3),colors=new Float32Array(vertices*3);
 const geo=new THREE.BufferGeometry();
 const position=new THREE.BufferAttribute(points,3);
 const color=new THREE.BufferAttribute(colors,3);
 position.setUsage(THREE.DynamicDrawUsage);
 color.setUsage(THREE.DynamicDrawUsage);
 geo.setAttribute("position",position);geo.setAttribute("color",color);
 geo.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,.22,6.3),17);
 const material=new THREE.MeshBasicMaterial({
  color:0xffffff,vertexColors:true,transparent:true,opacity:1,
  blending:THREE.AdditiveBlending,toneMapped:false,
  depthTest:true,depthWrite:false,side:THREE.DoubleSide
 });
 const mesh=new THREE.Mesh(geo,material);
 mesh.name="Two true wingtip contrails · clean white air-pressure streaks";
 mesh.renderOrder=4;mesh.frustumCulled=false;mesh.visible=false;
 ship.add(mesh);
 let time=0,lengthFiltered=0,brightnessFiltered=0;
 let last=contrailEnvelope(),peakStrands=0,peakLength=0;
 let peakAirborne=0,boostFrames=0;
 const low=Boolean(lowMemory);
 const maxStrands=low?spec.lowMemoryStrandsPerTip:spec.maxStrandsPerTip;
 function sample(side,tip,i,t,env,axis){
  const wingSign=side===0?-1:1;
  const curl=Math.sin(time*(2.2+env.fraction*1.6)+side*.32-t*5.4)*t*t;
  const separation=i===0?0:i===1?.22:-.23;
  if(axis===0)return tip.x+wingSign*(
   (.085+.12*env.fraction+.07*(env.air?1:0))*t*t+
   separation*t*t +.027*curl);
  if(axis===1)return tip.y+.028+
   (env.air?.22:.035)*t+.016*Math.sin(time*2.3+t*4.7+i)*t;
  return tip.z+.025+t*lengthFiltered*(1-.13*i);
 }
 return {
  mesh,
  frame(dt,{playing=false,speed=44,boostMultiplier=1,grounded=true}={}){
   if(!playing){mesh.visible=false;return;}
   const h=clamp(finite(dt),0,.08);
   if(h<=0){mesh.visible=false;return;}
   time+=h;
   const target=contrailEnvelope(speed,boostMultiplier,grounded,low);
   lengthFiltered+=(target.length-lengthFiltered)*(1-Math.exp(-h*11));
   brightnessFiltered+=(target.brightness-brightnessFiltered)*
    (1-Math.exp(-h*13));
   last=target;mesh.visible=target.count>0&&brightnessFiltered>.015;
   if(!mesh.visible)return;
   const strength=(low?.85:1)*brightnessFiltered;
   for(let side=0;side<2;side++){
    const tip=tips[side];
    for(let i=0;i<spec.maxStrandsPerTip;i++){
     const weight=i<maxStrands?target.weights[i]:0;
     for(let layer=0;layer<spec.layers;layer++){
      const core=layer===1;
      const width=core?(i===0?.032:.020):(i===0?.105:.068);
      const light=core?1.35:.33;
      for(let j=0;j<spec.segments;j++){
       const a=j/spec.segments,b=(j+1)/spec.segments;
       // A softly tapered white center, never a solid energy bridge.
       const fade=t=>(.72+.28*Math.sin(Math.PI*t))*
        Math.pow(1-t,.65);
       const brightnessA=strength*weight*light*fade(a);
       const brightnessB=strength*weight*light*fade(b);
       const index=(((side*spec.maxStrandsPerTip+i)*spec.layers+layer)*
        spec.segments+j)*18;
       const wa=width*(1-.55*a),wb=width*(1-.55*b);
       quad(points,colors,index,
        sample(side,tip,i,a,target,0),sample(side,tip,i,a,target,1),
        sample(side,tip,i,a,target,2),
        sample(side,tip,i,b,target,0),sample(side,tip,i,b,target,1),
        sample(side,tip,i,b,target,2),
        wa,wb,brightnessA,brightnessB,core);
      }
     }
    }
   }
   position.needsUpdate=true;color.needsUpdate=true;
   peakStrands=Math.max(peakStrands,target.count*2);
   peakLength=Math.max(peakLength,lengthFiltered);
   if(target.air)peakAirborne=Math.max(peakAirborne,target.brightness);
   if(target.boost>.1)boostFrames++;
  },
  reset(){
   time=0;lengthFiltered=0;brightnessFiltered=0;
   peakStrands=0;peakLength=0;peakAirborne=0;boostFrames=0;
   last=contrailEnvelope();mesh.visible=false;
  },
  stats(){
   return {version:spec.version,model:variant,lowMemory:low,
    activeEmitters:mesh.visible?spec.emitters:0,
    currentStrands:mesh.visible?last.count*2:0,
    peakStrands,tipX:+tips[1].x.toFixed(3),
    tipZ:+tips[1].z.toFixed(3),
    lastLengthMeters:+lengthFiltered.toFixed(2),
    peakLengthMeters:+peakLength.toFixed(2),
    peakAirborneBrightness:+peakAirborne.toFixed(3),
    boostFrames,drawCallsAdded:1,particlesAdded:0,
    physicsUnchanged:true};
  },
  dispose(){mesh.removeFromParent();geo.dispose();material.dispose();}
 };
}
