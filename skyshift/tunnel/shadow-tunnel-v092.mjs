// SKYSHIFT 0.9.2 — Shadow Tunnel: an authored dark/glow driving sequence.
// All geometry follows the existing PBR deck centerline; no vehicle collision,
// steering, air trick, camera, checkpoint or speed changes. Fixed geometry only.
import {CIRCUIT,positionAt} from "../tracks/trials/trial-v0901.mjs";
export const SHADOW_TUNNEL=Object.freeze({
 version:"shadow-tunnel-092",
 name:"SHADOW TUNNEL",start:2050,end:2810,lengthMeters:760,
 fadeMeters:30,sampleStepMeters:4,ribSpacingMeters:38,
 halfClearanceMeters:16.6,ceilingClearanceMeters:18.4,
 shellHex:0x02050b,voidHex:0x010207,
 trimLuminance:2.55,portalLuminance:3.65,
 noNewColliders:true,steeringUnchanged:true,physicsUnchanged:true,
 dynamicLightsAdded:0,particlesAdded:0,extraRenderPasses:0,
 drawBatches:4
});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(x)=>{const t=clamp(x,0,1);return t*t*(3-2*t)};
const localS=(s)=>((s%CIRCUIT.lapLength)+CIRCUIT.lapLength)%CIRCUIT.lapLength;
export function inShadowTunnel(s,c=SHADOW_TUNNEL){
 const d=localS(s);return d>=c.start&&d<c.end;
}
export function tunnelIntensityAt(s,c=SHADOW_TUNNEL){
 const d=localS(s);
 if(d<c.start||d>=c.end)return 0;
 return smooth((d-c.start)/c.fadeMeters)*
  smooth((c.end-d)/c.fadeMeters);
}
export const TUNNEL_SECTION=Object.freeze([
 [-16.0,1.3],[-16.6,5.2],[-15.8,10.2],[-12.6,14.4],
 [-7.4,17.6],[0,18.4],[7.4,17.6],[12.6,14.4],
 [15.8,10.2],[16.6,5.2],[16.0,1.3]
].map(p=>Object.freeze(p)));
function xyz(s,l,h){
 const p=positionAt(s,l,h);return [p.x,p.y,p.z];
}
function quad(out,a,b,c,d){
 out.push(...a,...b,...c,...a,...c,...d);
}
function tunnelSamples(c=SHADOW_TUNNEL){
 const n=Math.ceil(c.lengthMeters/c.sampleStepMeters);
 return Array.from({length:n+1},(_,i)=>
  i===n?c.end:c.start+i*c.lengthMeters/n);
}
// Deterministic, inspectable centerline-following tunnel structure.
// Each rigid section uses the exact authoritative positionAt(s,lateral,height).
export function createShadowTunnelData(c=SHADOW_TUNNEL){
 const shell=[],trim=[],ribs=[],portals=[];
 const samples=tunnelSamples(c);
 for(let i=0;i<samples.length-1;i++){
  const a=samples[i],b=samples[i+1];
  for(let k=0;k<TUNNEL_SECTION.length-1;k++){
   const p=TUNNEL_SECTION[k],q=TUNNEL_SECTION[k+1];
   quad(shell,xyz(a,p[0],p[1]),xyz(a,q[0],q[1]),
    xyz(b,q[0],q[1]),xyz(b,p[0],p[1]));
  }
  // Roof-edge light pipes point along the racing direction. Never draw
  // bars through the driving lane or overtake the real guardrail lights.
  for(const side of [-1,1]){
   const l=side*12.48,h=14.30;
   quad(trim,xyz(a,l-.055,h),xyz(a,l+.055,h),
    xyz(b,l+.055,h),xyz(b,l-.055,h));
   const low=side*16.24,lowH=5.10;
   quad(trim,xyz(a,low-.048,lowH),xyz(a,low+.048,lowH),
    xyz(b,low+.048,lowH),xyz(b,low-.048,lowH));
  }
 }
 // Slim illuminated cross ribs 38m apart break up the dark perspective.
 // They are *above the track*, never an obstacle inside the pilot envelope.
 for(let s=c.start+c.ribSpacingMeters;s<c.end-5;s+=c.ribSpacingMeters){
  const a=s,b=s+.22;
  for(let k=1;k<TUNNEL_SECTION.length-2;k++){
   const p=TUNNEL_SECTION[k],q=TUNNEL_SECTION[k+1];
   quad(ribs,xyz(a,p[0]*.995,p[1]-.10),
    xyz(a,q[0]*.995,q[1]-.10),
    xyz(b,q[0]*.995,q[1]-.10),
    xyz(b,p[0]*.995,p[1]-.10));
  }
 }
 // Entrance and exit are visibly recognizable as architectural portals.
 for(const s of [c.start,c.end-.32]){
  for(let k=0;k<TUNNEL_SECTION.length-1;k++){
   const p=TUNNEL_SECTION[k],q=TUNNEL_SECTION[k+1];
   quad(portals,xyz(s,p[0]*.992,p[1]-.13),
    xyz(s,q[0]*.992,q[1]-.13),
    xyz(s+.32,q[0]*.992,q[1]-.13),
    xyz(s+.32,p[0]*.992,p[1]-.13));
  }
 }
 return {shell,trim,ribs,portals,
  segments:samples.length-1,sectionVertices:TUNNEL_SECTION.length,
  ribCount:Math.floor((c.lengthMeters-5-1)/c.ribSpacingMeters),
  shellTriangles:shell.length/9,
  totalTriangles:(shell.length+trim.length+ribs.length+portals.length)/9};
}
function mesh(THREE,positions,material,name){
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
 geometry.computeBoundingSphere();
 const obj=new THREE.Mesh(geometry,material);
 obj.frustumCulled=false;obj.name=name;return obj;
}
// Decorator of the existing premium deck onBeforeCompile. Only replaces road
// diffuse base INSIDE the tunnel: preserved line/boost/wave emissive signals
// remain bright. No shader changes to the rail material or render pipeline.
export function shadeTunnelRoadGLSL(fragment,c=SHADOW_TUNNEL){
 const diffuse="diffuseColor.rgb = road;";
 const emissive="+ zoneGuide*velocityGlint*.35";
 if(!fragment.includes(diffuse)||!fragment.includes(emissive))
  throw new Error("Shadow Tunnel: unsupported premium road shader layout");
 const from=c.start.toFixed(1),to=c.end.toFixed(1),fade=c.fadeMeters.toFixed(1);
 const darkness=`float tunnelShade = smoothstep(${from},${(c.start+c.fadeMeters).toFixed(1)},trackS) *
   (1.0 - smoothstep(${(c.end-c.fadeMeters).toFixed(1)},${to},trackS));
  float tunnelGuide = clamp(guided * .98 + insetGold * .92 +
   spine * .33 + whiteCore * .94 + whiteBloom * .61,0.0,1.0);
  diffuseColor.rgb = road * (1.0 - tunnelShade * (.88 - .82 * tunnelGuide));`;
 let output=fragment.replace(diffuse,darkness);
 const idx=output.indexOf(emissive);
 // Insert inside the existing road-emission expression, before its semicolon.
 const end=output.indexOf(";",idx+emissive.length);
 if(end<0)throw new Error("Shadow Tunnel: road emission terminator missing");
 output=output.slice(0,end)+
  "\n  + zoneGuide * guided * tunnelShade * .64"+
  "\n  + uTrackBoost * insetGold * tunnelShade * .18"+
  output.slice(end);
 return output;
}
export function installTunnelRoadShading(material,c=SHADOW_TUNNEL){
 const before=material.onBeforeCompile,originalKey=material.customProgramCacheKey;
 material.onBeforeCompile=function(shader,renderer){
  before.call(this,shader,renderer);
  shader.fragmentShader=shadeTunnelRoadGLSL(shader.fragmentShader,c);
 };
 material.customProgramCacheKey=()=>originalKey.call(material)+"-shadow-tunnel-092";
 material.needsUpdate=true;
}
export function installShadowTunnel(THREE,world,c=SHADOW_TUNNEL){
 const data=createShadowTunnelData(c);
 // Opaque, fog-free near-black shell occludes distant stars and sky through
 // normal depth-testing: this is a tunnel, not a full-screen dark filter.
 const shellMaterial=new THREE.MeshBasicMaterial({
  color:c.shellHex,side:THREE.DoubleSide,toneMapped:false,fog:false
 });
 const neonMaterial=new THREE.MeshBasicMaterial({
  color:0x77dfff,side:THREE.DoubleSide,toneMapped:false,fog:false
 });
 const portalMaterial=new THREE.MeshBasicMaterial({
  color:0xf1fbff,side:THREE.DoubleSide,toneMapped:false,fog:false
 });
 const shell=mesh(THREE,data.shell,shellMaterial,"Shadow Tunnel · light-occluding vault");
 const trim=mesh(THREE,data.trim,neonMaterial,"Shadow Tunnel · roof and wall edge light-pipes");
 const ribs=mesh(THREE,data.ribs,neonMaterial,"Shadow Tunnel · spaced dark-chamber luminescent ribs");
 const portals=mesh(THREE,data.portals,portalMaterial,"Shadow Tunnel · white-core entry and exit thresholds");
 for(const obj of [shell,trim,ribs,portals])world.add(obj);
 const neutral=new THREE.Color(0xf3fcff);
 return {start:c.start,end:c.end,lengthMeters:c.lengthMeters,
  shellTriangles:data.shellTriangles,totalTriangles:data.totalTriangles,
  rings:data.ribCount,batches:c.drawBatches,
  setAccent(color){
   neonMaterial.color.copy(color).multiplyScalar(c.trimLuminance);
   portalMaterial.color.copy(neutral).lerp(color,.12)
    .multiplyScalar(c.portalLuminance);
  },
  getStats(){return {version:c.version,start:c.start,end:c.end,
   lengthMeters:c.lengthMeters,sections:data.segments,
   rings:data.ribCount,triangles:data.totalTriangles,
   drawBatches:c.drawBatches,additionalLights:0,
   noNewColliders:true,physicsChanged:false};}
 };
}
