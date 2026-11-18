// SKYSHIFT 0.21.0 / Phase A — cinematic megastructure, geometry-only.
// A replacement environment, NOT decoration over the 0.20.5 corridor.
// Original road coordinates, 120 Hz handling, GRIP, guardrails and camera are untouched.
export const HERO_0210=Object.freeze({
 id:"cinematic-environment-rebuild-0210-a",version:"0.21.0-A",
 start:80,end:368,bayLength:16,bayCount:18,
 physicsChanges:0,colliders:0,dynamicLights:0,extraRenderPasses:0,
 silhouettes:["BREACH","CANYON","CATHEDRAL","PANORAMA","ENGINE","GATE"],
 comparison:"?cinematicHero=classic",roadMeshUntouched:true,
 visualGoal:"Faceted monumental station, 5m wall relief, asymmetric spans and cathedral ribs"
});
const COLORS=Object.freeze({
 void:0x030916,under:0x07111f,outer:0x061528,shadow:0x060f1f,
 face:0x0d2945,lit:0x183f5e,edge:0x295d80,blade:0x071a31,
 roof:0x08172b,coffer:0x030a17,carbon:0x0e2944,
 pink:0xff449f,pinkWhite:0xffd8ef,cyan:0x43d5f8,cyanWhite:0xd6f9ff,
 blueReflection:0x236a87,roseReflection:0x8e295c
});
export const HERO_BAYS_0210=Object.freeze([
 "GATE","BREACH","BREACH","CANYON","CANYON","CATHEDRAL",
 "CATHEDRAL","PANORAMA","PANORAMA","ENGINE","ENGINE","CATHEDRAL",
 "CATHEDRAL","PANORAMA","PANORAMA","CANYON","CANYON","GATE"
]);
export function planCinematicHero(track="skyline"){
 if(track!=="skyline")return {active:false,bays:[]};
 return {active:true,bays:HERO_BAYS_0210.map((kind,i)=>({
  kind,index:i,start:HERO_0210.start+16*i,end:HERO_0210.start+16*(i+1),
  center:HERO_0210.start+16*(i+.5)
 }))};
}
// Three.js BufferGeometry vertex colors are LINEAR, while authored hex swatches
// are sRGB. Without conversion the graphite becomes pale blue slabs.
function color3(hex){const linear=c=>{const v=c/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4};
 return [linear(hex>>16&255),linear(hex>>8&255),linear(hex&255)];}
function artBatches(positionAt){
 const data=Object.fromEntries(["HULL","FACET","LIGHT","HALO"].map(k=>[k,{p:[],c:[]}]));
 let rejected=0;
 function addTriangle(kind,a,b,c,hex){
  for(const v of [a,b,c]){
   const [x,y,s]=v;
   // The visual mesh cannot reach the original protected driving space.
   if(!Number.isFinite(x+y+s)||Math.abs(x)<14.35&&y<25.6&&y>-6.25)
    {rejected++;throw Error("0.21.0 architectural clearance: "+JSON.stringify(v))}
   const p=positionAt(s,x,y);
   if(!Number.isFinite(p.x+p.y+p.z))throw Error("Invalid road-conforming architecture");
   data[kind].p.push(p.x,p.y,p.z);
   data[kind].c.push(...color3(hex));
  }
 }
 const quad=(kind,a,b,c,d,col)=>{
  addTriangle(kind,a,b,c,col);addTriangle(kind,a,c,d,col);
 };
 const face=(kind,side,x0,y0,x1,y1,s0,s1,col)=>
  quad(kind,[side*x0,y0,s0],[side*x1,y1,s0],
   [side*x1,y1,s1],[side*x0,y0,s1],col);
 // Every single shape is in real road-local metres; separate bays share
 // exactly the same boundary because their longitudinal positions coincide.
 function solid(kind,side,outline,s0,s1,col){
  const a=outline.map(([x,y])=>[side*x,y,s0]);
  const b=outline.map(([x,y])=>[side*x,y,s1]);
  for(let j=0;j<a.length;j++){
   const k=(j+1)%a.length;
   quad(kind,a[j],a[k],b[k],b[j],col);
  }
  for(let j=1;j<a.length-1;j++){
   addTriangle(kind,a[0],a[j],a[j+1],col);
   addTriangle(kind,b[0],b[j+1],b[j],col);
  }
 }
 function lowerWall(side,a,b,kind,i){
  // Real 5m+ relief: the background pressure hull is 20m from centre;
  // light-catching faceted inner surfaces fold inward to 14.5m.
  const w=kind==="PANORAMA";
  face("HULL",side,20.8,-11,20.8,9,a,b,COLORS.outer);
  face("HULL",side,20.8,23.8,20.8,35.3,a,b,COLORS.outer);
  if(w){
   // A real 32m open gallery: only lintel and sill; no fake square windows.
   face("HULL",side,14.85,9.3,15.9,13.65,a,b,COLORS.carbon);
   face("FACET",side,15.8,24.15,18.65,26.2,a,b,COLORS.lit);
   face("LIGHT",side,14.76,13.8,14.76,14.04,a,b,COLORS.cyan);
   return;
  }
  // Stagger wall depth around a dark recessed reveal; avoid a 19m flat slab.
  face("HULL",side,17.65,7.5,17.85,15.1,a,b,COLORS.shadow);
  face("HULL",side,18.65,15.1,18.95,25.8,a,b,COLORS.outer);
  const split=a+((i%3)+1)*3.05;
  // Two broad, genuinely angled pieces, not decorative rectangle borders.
  quad("FACET",[side*14.55,8.1,a],[side*17.6,10.2,split],
   [side*17.6,23.5,split],[side*14.55,22.7,a],
   kind==="CANYON"?COLORS.lit:COLORS.face);
  quad("FACET",[side*17.65,10.3,split],[side*14.6,8.1,b],
   [side*14.6,22.75,b],[side*17.65,23.5,split],
   kind==="BREACH"?COLORS.blade:COLORS.lit);
  // A deep exposed inset at 19m, not another sealed "window".
  face("HULL",side,19.35,11.5,19.35,22.55,a+2.6,b-2.0,COLORS.void);
  if(kind==="CANYON"||kind==="ENGINE"){
   solid("HULL",side,[
    [15.1,8.8],[17.6,8.8],[18.9,13.7],[18.9,22.8],
    [15.2,25.7],[14.65,25.7],[16.8,21.8],[16.3,13.3]
   ],a+(kind==="CANYON"?1:9),a+(kind==="CANYON"?4.2:12),COLORS.blade);
  }
  // Original road-near guide channel: now recessed into the hull.
  face("HULL",side,14.53,9.1,14.53,9.85,a,b,COLORS.void);
  face("LIGHT",side,14.49,9.33,14.49,9.53,a,b,COLORS.pink);
  face("LIGHT",side,14.474,9.404,14.474,9.437,a,b,COLORS.pinkWhite);
  if(i%4===0)face("HALO",side,14.455,9.05,14.455,10.0,a,b,COLORS.roseReflection);
 }
 function arch(side,s,variant){
  // Heavy asymmetric 3D ribs reach 12m across the upper tunnel span.
  // Above 25.6m the structure folds over the track, but never into GRIP space.
  const wide=variant==="GATE"?2.8:variant==="CATHEDRAL"?2.6:1.7;
  const long=variant==="GATE"?5.0:2.4;
  solid("HULL",side,[
   [14.72,13.3],[16.2,13.3],[16.4,23.9],[17.15,26.2],
   [11.85,32.85],[7.65,32.85],[7.65,31.6],
   [11.08,31.6],[14.55,26.15],[14.72,24.8]
  ],s,s+long,COLORS.void);
  solid("FACET",side,[
   [14.82,16.0],[15.84,16.0],[16.05,23.9],
   [11.67,32.4],[8.10,32.4],[8.10,31.96],
   [11.40,31.96],[14.46,26.22],[14.82,24.9]
  ],s+.18,s+Math.min(1.35,long-.28),variant==="GATE"?COLORS.lit:COLORS.face);
  // A broad angled architectural edge catches the cyan light.
  face("LIGHT",side,14.38,26.40,10.70,32.12,s+.10,s+wide,
   variant==="GATE"?COLORS.pink:COLORS.cyan);
  face("LIGHT",side,14.32,26.52,10.64,32.25,s+.22,s+.34,
   variant==="GATE"?COLORS.pinkWhite:COLORS.cyanWhite);
  // Integrated high-rib glow, restrained but visible from cockpit.
  face("HALO",side,14.34,26.16,10.60,32.38,s,s+wide,
   variant==="GATE"?COLORS.roseReflection:COLORS.blueReflection);
 }
 const bays=planCinematicHero().bays;
 for(const bay of bays){
  const {start:a,end:b,kind,index:i}=bay;
  // Huge underside and continuous high crown; real continuous surfaces.
  for(const side of [-1,1]){
   face("HULL",side,14.8,-10.5,26.0,-10.5,a,b,COLORS.under);
   face("HULL",side,20.8,-9,27.0,8.0,a,b,COLORS.void);
   face("HULL",side,21.4,29.2,24.0,35.8,a,b,COLORS.roof);
   lowerWall(side,a,b,kind,i);
   // The ceiling is sloped and vaulted rather than a flat crossbar stack.
   face("HULL",side,20.7,35.5,7.8,34.1,a,b,COLORS.roof);
   face("FACET",side,15.9,30.55,10.1,33.40,a,b,
    kind==="CATHEDRAL"?COLORS.lit:COLORS.blade);
   face("HULL",side,10.0,34.20,.15,34.80,a,b,COLORS.coffer);
   // Continuous luminous cornice: the 0.20.5 ceiling was unlit from cockpit.
   face("LIGHT",side,9.86,33.76,9.86,34.02,a,b,COLORS.cyan);
   face("LIGHT",side,9.80,33.855,9.80,33.908,a,b,COLORS.cyanWhite);
   face("HALO",side,9.73,33.40,9.73,34.28,a,b,COLORS.blueReflection);
  }
  // Large-scale room rhythm changes every ~32-64m: not a rib on every bay.
  if([0,2,5,7,9,12,15,17].includes(i)){
   const offset=i===0?0:kind==="PANORAMA"?1.3:3.3;
   arch(1,a+offset,kind);arch(-1,a+offset,kind);
  }
  // Signature structural neon follows genuine 3D joints, with breathing room.
  if([0,2,5,9,12,15,17].includes(i)){
   for(const side of [-1,1]){
    const s=a+4.2;
    face("LIGHT",side,14.44,15.0,14.44,25.45,s,s+.78,COLORS.pink);
    face("LIGHT",side,14.405,15.7,14.405,24.8,s+.22,s+.34,COLORS.pinkWhite);
    face("HALO",side,14.38,14.5,14.38,25.8,s-.18,s+.90,COLORS.roseReflection);
   }
  }
  // Panoramic galleries and machine naves have distinctive overhead geometry.
  if(kind==="PANORAMA"){
   for(const side of [-1,1]){
    // Long diagonal exterior visor over genuine open space.
    solid("FACET",side,[
     [16.4,25.9],[20.2,25.9],[14.8,31.9],
     [11.25,31.9],[12.5,30.45]
    ],a+.7,b-.7,COLORS.face);
   }
  }else if(kind==="ENGINE"){
   for(const side of [-1,1]){
    // A visible wide engine-bay overhang, hanging only above safe height.
    solid("FACET",side,[
     [15.7,26.15],[19.2,26.15],[14.3,32.0],
     [9.5,32.0],[10.3,30.9]
    ],a+3,b-3,COLORS.lit);
   }
  }else if(kind==="BREACH"){
   // Broad cantilevered upper cliffs lead the eye into the first 48m.
   for(const side of [-1,1]){
    solid("FACET",side,[
     [15.8,25.9],[19.9,25.9],[15.3,32.7],
     [9.7,32.7],[10.9,31.35]
    ],a+2,b-1.7,i%2?COLORS.face:COLORS.lit);
   }
  }
 }
 return {data,rejected};
}
export function installCinematicHero(THREE,world,{
 track="skyline",lowMemory=false,positionAt
}={}){
 if(!THREE||!world||typeof positionAt!=="function")
  throw Error("0.21.0 cinematic hero requires original road positionAt");
 const plan=planCinematicHero(track);
 const state={version:HERO_0210.version,variant:"cinematic-megastructure",
  active:false,status:plan.active?"loading":"inactive",
  bayCount:plan.bays.length,installedBays:0,meters:HERO_0210.end-HERO_0210.start,
  architectureProfiles:HERO_0210.silhouettes,drawBatches:0,trianglesRendered:0,
  geometryResources:0,materialResources:0,physicsChanges:0,colliders:0,
  dynamicLights:0,extraRenderPasses:0,roadMeshUntouched:true,
  originalGRIPUntouched:true,track,lowMemory,geometryFromGltf:false,
  authoredGeometry:true,renderedHeroStart:HERO_0210.start,
  renderedHeroEnd:HERO_0210.end,comparison:HERO_0210.comparison};
 if(!plan.active)return {ready:Promise.resolve(),stats:()=>({...state}),dispose(){}};
 const group=new THREE.Group();
 group.name="SKYSHIFT · Cinematic Megastructure 0.21.0-A";
 try{
  const {data}=artBatches(positionAt);
  for(const kind of ["HULL","FACET","LIGHT","HALO"]){
   if(kind==="HALO"&&lowMemory)continue;
   const src=data[kind],geo=new THREE.BufferGeometry();
   geo.setAttribute("position",new THREE.Float32BufferAttribute(src.p,3));
   geo.setAttribute("color",new THREE.Float32BufferAttribute(src.c,3));
   geo.computeVertexNormals();geo.computeBoundingSphere();
   let material;
   if(kind==="LIGHT")material=new THREE.MeshBasicMaterial({
    vertexColors:true,side:THREE.DoubleSide,toneMapped:false
   });
   else if(kind==="HALO")material=new THREE.MeshBasicMaterial({
    vertexColors:true,side:THREE.DoubleSide,toneMapped:false,
    transparent:true,opacity:.12,depthWrite:false,
    blending:THREE.AdditiveBlending
   });
   else material=new THREE.MeshBasicMaterial({
    color:0xffffff,vertexColors:true,side:THREE.DoubleSide,toneMapped:true
   });
   const mesh=new THREE.Mesh(geo,material);
   mesh.name="Cinematic megastructure / "+kind;
   mesh.castShadow=false;mesh.receiveShadow=false;mesh.frustumCulled=true;
   if(kind==="HALO")mesh.renderOrder=3;
   group.add(mesh);
   state.trianglesRendered+=src.p.length/9;
   state.drawBatches++;
  }
  world.add(group);
  state.status="active";state.active=true;
  state.installedBays=plan.bays.length;
  state.geometryResources=state.drawBatches;
  state.materialResources=state.drawBatches;
 }catch(error){
  state.status="fallback";state.loadError=String(error?.message??error);
  group.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});
 }
 return {ready:Promise.resolve(),stats:()=>({...state}),
  dispose(){group.removeFromParent();
   group.traverse(o=>{o.geometry?.dispose();o.material?.dispose()})}};
}
