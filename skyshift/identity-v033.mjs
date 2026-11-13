// SKYSHIFT 0.3.3 – Neon Surface Language & World Identity.
// Gameplay-neutral art direction: all road graphics derive from the *same*
// authored collision intervals as the flight physics. Visual effects never
// create a fake road or obscure actual jump / risk-lane edges.
import {
  TRIAL,GAPS,ISLANDS,SPLITS,RISK_CUTS,GEOMETRY_BREAKS,
  positionAt,poseAt,roadIntervals,sectorAt,clamp
} from "./trial-v03.mjs";

export const IDENTITY_RULES=Object.freeze({
  nav:0x46cadb,energy:0xc66ea9,hazard:0xe4b96d,
  deckPlate:0x17283f,deckSeam:0x334d65,
  navLuminance:.71,energyLuminance:.84,hazardLuminance:.93,
  backgroundLuminance:.34,landmarkLuminance:1.44,
  railClearance:.68,spacing:15.5,worldFloorOffset:-24
});

function planRect(out,kind,start,end,left,right){
  if(end-start<=.09||right-left<=.09)return;
  const m=(start+end)*.5,lanes=roadIntervals(m);
  if(!lanes.some(([a,b])=>left>=a+.08&&right<=b-.08))return;
  // Do not draw graphics across geometry cuts, missing gaps or split transitions.
  if(GEOMETRY_BREAKS.some(s=>s>start+.001&&s<end-.001))return;
  for(const s of [start+.015,m,end-.015]){
    if(!roadIntervals(s).some(([a,b])=>left>=a+.05&&right<=b-.05))return;
  }
  out.push({kind,start,end,left,right});
}

function rectanglesInLane(out,kind,s,len,leftPad=.7,rightPad=.7){
  const end=Math.min(TRIAL.length-.01,s+len);
  const samples=[roadIntervals(s+.025),roadIntervals((s+end)*.5),roadIntervals(end-.025)];
  if(samples.some(x=>x.length===0)||samples[0].length!==samples[1].length||
      samples[1].length!==samples[2].length)return;
  for(let i=0;i<samples[1].length;i++){
    const left=Math.max(...samples.map(x=>x[i][0]))+leftPad;
    const right=Math.min(...samples.map(x=>x[i][1]))-rightPad;
    planRect(out,kind,s,end,left,right);
  }
}
const nearLeap=s=>GAPS.some(g=>s>g.start-20&&s<g.end+7);
const nearRiskCut=s=>RISK_CUTS.some(g=>s>g.start-12&&s<g.end+5);
function riskSide(s,left,right){
  const split=SPLITS[0];
  return s>=split.start&&s<split.end&&left>split.innerRight;
}
export function createSurfacePlan(){
  const result=[];
  // 80 understated dark deck plates: material richness, *not* another bright grid.
  for(let s=28;s<TRIAL.length-22;s+=IDENTITY_RULES.spacing){
    if(nearLeap(s)||nearRiskCut(s))continue;
    const end=Math.min(s+5.8,TRIAL.length-.02);
    const bands=roadIntervals((s+end)*.5);
    for(const [a,b] of bands){
      const right=b-IDENTITY_RULES.railClearance;
      const left=a+IDENTITY_RULES.railClearance;
      const span=right-left;
      if(span<3.2)continue;
      planRect(result,"plate",s,end,left,left+span*.24);
      planRect(result,"plate",s,end,right-span*.24,right);
      // Tiny recessed cyan guide chips. Only risk lane gets magenta.
      const type=riskSide(s,a,b)?"energy":"nav";
      const chipS=s+2.25,chipE=Math.min(s+3.8,end);
      planRect(result,type,chipS,chipE,left+span*.17,left+span*.23);
      planRect(result,type,chipS,chipE,right-span*.23,right-span*.17);
    }
  }
  // Cross-joints on stable asphalt: spaced, thin, dark and asymmetrical.
  for(let s=35;s<TRIAL.length-24;s+=33){
    if(nearLeap(s)||nearRiskCut(s))continue;
    rectanglesInLane(result,"seam",s,.15,.84,.84);
  }
  // Dedicated island landing visual grammar – inset "braces", not painted road
  // across the gap. They make lateral platform positioning readable.
  for(const island of ISLANDS){
    for(let s=island.start+4;s<island.end-4;s+=6.3){
      const candidates=roadIntervals(s+.35);
      for(const [a,b] of candidates){
        const span=b-a;
        if(span<3.6)continue;
        planRect(result,"island",s,s+1.1,a+.95,a+1.22);
        planRect(result,"island",s,s+1.1,b-1.22,b-.95);
        if(Math.floor((s-island.start)/6)%2===0)
          planRect(result,"energy",s+.38,s+.75,a+span*.46,a+span*.54);
      }
    }
  }
  // Split: magenta only for the optional right-hand risk path.
  // Safe route retains turquoise navigation and the existing gold gap warnings.
  for(let s=SPLITS[0].start+12;s<SPLITS[0].end-6;s+=11){
    if(nearRiskCut(s))continue;
    const lanes=roadIntervals(s+.2);
    for(const [a,b] of lanes){
      const c=(a+b)*.5;
      planRect(result,a>0?"energy":"nav",s,s+2.3,c-.22,c+.22);
    }
  }
  // Signatures: layered "circuit chevrons" on the approach/finish,
  // kept away from leap windows and gaps to avoid ambiguous obstacles.
  for(const base of [68,242,484,742,985,1200,1236]){
    for(let n=0;n<3;n++){
      const d=base+n*2.0;
      if(nearLeap(d))continue;
      const lanes=roadIntervals(d+.3);
      for(const [a,b] of lanes){
        const span=b-a;
        const kind=base>1150?"energy":"nav";
        planRect(result,kind,d,d+.54,a+span*.22,a+span*.32);
        planRect(result,kind,d,d+.54,a+span*.68,a+span*.78);
      }
    }
  }
  return result;
}
export function validateSurfacePlan(plan=createSurfacePlan()){
  const errors=[];
  for(const [i,p] of plan.entries()){
    if(!(p.start<p.end&&p.left<p.right))errors.push(i+": bad dimensions");
    if(!["plate","seam","nav","energy","island"].includes(p.kind))
      errors.push(i+": unknown material");
    if(GEOMETRY_BREAKS.some(s=>s>p.start+.001&&s<p.end-.001))
      errors.push(i+": crosses a track transition");
    for(const s of [p.start+.01,(p.start+p.end)/2,p.end-.01]){
      if(!roadIntervals(s).some(([a,b])=>p.left>=a+.04&&p.right<=b-.04))
        errors.push(i+": graphic outside a real platform at "+s);
    }
  }
  return errors;
}
const createMaterial=(THREE,hex,intensity=1,emissive=false)=>{
  return new THREE.MeshBasicMaterial({
    color:new THREE.Color(hex).multiplyScalar(intensity),
    toneMapped:!emissive,side:THREE.DoubleSide
  });
};
function quad(points,a,b,c,d){
  for(const p of [a,b,c,a,c,d])points.push(p.x,p.y,p.z);
}
function surfaceMesh(THREE,vertices,mat){
  if(!vertices.length)return null;
  const geo=new THREE.BufferGeometry();
  geo.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));
  geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,mat);
  mesh.frustumCulled=false;
  return mesh;
}
function roadPoint(THREE,s,lateral,y){
  const p=positionAt(s,lateral,y);
  return new THREE.Vector3(p.x,p.y,p.z);
}
export function installSurfaceLanguage(THREE,world){
  const plan=createSurfacePlan();
  const batches={plate:[],seam:[],nav:[],energy:[],island:[]};
  const y={plate:.035,seam:.052,nav:.072,energy:.074,island:.070};
  for(const p of plan){
    quad(batches[p.kind],roadPoint(THREE,p.start,p.left,y[p.kind]),
      roadPoint(THREE,p.start,p.right,y[p.kind]),
      roadPoint(THREE,p.end,p.right,y[p.kind]),
      roadPoint(THREE,p.end,p.left,y[p.kind]));
  }
  const mats={
    plate:new THREE.MeshStandardMaterial({color:IDENTITY_RULES.deckPlate,metalness:.72,
      roughness:.36,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1}),
    seam:createMaterial(THREE,IDENTITY_RULES.deckSeam,.66),
    nav:createMaterial(THREE,IDENTITY_RULES.nav,IDENTITY_RULES.navLuminance),
    energy:createMaterial(THREE,IDENTITY_RULES.energy,IDENTITY_RULES.energyLuminance),
    island:createMaterial(THREE,0x7a9fc4,.69)
  };
  for(const kind of Object.keys(batches)){
    const mesh=surfaceMesh(THREE,batches[kind],mats[kind]);
    if(mesh)world.add(mesh);
  }
  return {plan,materials:mats};
}

function addBar(THREE,group,material,position,size,rotation=0){
  const obj=new THREE.Mesh(new THREE.BoxGeometry(...size),material);
  obj.position.set(...position);obj.rotation.y=rotation;group.add(obj);return obj;
}

export function installWorldIdentity(THREE,world){
  const dark=new THREE.MeshStandardMaterial({color:0x101d32,metalness:.57,
    roughness:.53,flatShading:true});
  const inset=new THREE.MeshStandardMaterial({color:0x25334e,metalness:.58,
    roughness:.4});
  const energy=createMaterial(THREE,IDENTITY_RULES.energy,IDENTITY_RULES.backgroundLuminance);
  const cyan=createMaterial(THREE,IDENTITY_RULES.nav,IDENTITY_RULES.backgroundLuminance);
  const bright=createMaterial(THREE,IDENTITY_RULES.energy,IDENTITY_RULES.landmarkLuminance,true);
  // A sparse far-below-deck architectural grid gives depth without mimicking a
  // hazardous bridge and without heavy global postprocessing.
  const grid=[];
  for(let s=50;s<TRIAL.length-48;s+=68){
    for(const side of [-1,1]){
      for(const lane of [24,35,46]){
        const a=side*(lane-.08),b=side*(lane+.08);
        quad(grid,roadPoint(THREE,s,a,-24),roadPoint(THREE,s,b,-24),
          roadPoint(THREE,s+29,b,-24),roadPoint(THREE,s+29,a,-24));
      }
    }
  }
  const distant=surfaceMesh(THREE,grid,energy);
  if(distant)world.add(distant);
  // Repeated triangular-diamond silhouettes. Geometry is instanced in two
  // batches rather than many hundreds of separate draw calls.
  const towerGeo=new THREE.OctahedronGeometry(1,0);
  const towerBody=new THREE.InstancedMesh(towerGeo,dark,30);
  const towerInlay=new THREE.InstancedMesh(
    new THREE.BoxGeometry(.16,5.8,.22),energy,30);
  const proxy=new THREE.Object3D();
  let j=0;
  for(let s=60;s<TRIAL.length-80;s+=102){
    for(const side of [-1,1]){
      if(j>=30)break;
      const p=positionAt(s,side*(33+(j%3)*6),-14);
      proxy.position.set(p.x,p.y,p.z);
      proxy.scale.set(6.5,13.5+(j%4)*2,6);
      proxy.rotation.set(0,poseAt(s).heading,0);
      proxy.updateMatrix();towerBody.setMatrixAt(j,proxy.matrix);
      const accent=positionAt(s,side*(33+(j%3)*6),-8.4);
      proxy.position.set(accent.x,accent.y,accent.z);
      proxy.scale.set(1,1,1);proxy.updateMatrix();
      towerInlay.setMatrixAt(j,proxy.matrix);
      j++;
    }
  }
  for(const t of [towerBody,towerInlay]){
    t.count=j;t.instanceMatrix.needsUpdate=true;world.add(t);
  }
  // Each landmark has architectural shoulders outside the real road width.
  // No new geometry touches the playable corridor.
  const places=[
    {s:307,scale:1,accent:energy},
    {s:545,scale:1.24,accent:cyan},
    {s:782,scale:1.1,accent:energy},
    {s:1039,scale:1.18,accent:cyan},
    {s:1272,scale:1.40,accent:bright}
  ];
  for(const item of places){
    const pose=poseAt(item.s);
    for(const sign of [-1,1]){
      const offset=sign*(14.5*item.scale);
      const p=positionAt(item.s,offset,-1);
      const g=new THREE.Group();
      g.position.set(p.x,p.y,p.z);
      g.rotation.y=-pose.heading;
      addBar(THREE,g,dark,[0,3.2,0],[2.0,7.0,2.25]);
      addBar(THREE,g,inset,[0,6.35,-.05],[2.6,.7,2.5]);
      addBar(THREE,g,item.accent,[sign*.75,3.7,-1.18],[.09,5.4,.08]);
      addBar(THREE,g,item.accent,[0,6.38,-1.24],[1.85,.08,.06]);
      // A separate, slightly taller shard creates recognizable skyline rhythm.
      addBar(THREE,g,dark,[sign*1.8,8.1,1.3],[.9,3.8,1]);
      world.add(g);
    }
  }
  return {worldGrid:distant,towers:j,landmarks:places.length};
}

export function decorateHeroShip(THREE,ship){
  const armor=new THREE.MeshPhysicalMaterial({color:0x24354d,metalness:.83,
    roughness:.26,clearcoat:.9,clearcoatRoughness:.13});
  const inset=new THREE.MeshPhysicalMaterial({color:0x071827,metalness:.53,
    roughness:.26,clearcoat:.75});
  const cyan=createMaterial(THREE,IDENTITY_RULES.nav,1.18,true);
  const magenta=createMaterial(THREE,IDENTITY_RULES.energy,1.34,true);
  const trim=createMaterial(THREE,0xc5e9fa,1.14,true);
  const bar=(m,pos,scale,angle=0)=>{
    const obj=new THREE.Mesh(new THREE.BoxGeometry(...scale),m);
    obj.position.set(...pos);obj.rotation.y=angle;ship.add(obj);return obj;
  };
  // Distinctive split dorsal fin + two elongated swept shoulder vanes.
  bar(armor,[0,.55,.95],[.64,.18,1.5]);
  bar(inset,[0,.661,-.66],[.63,.025,1.15]);
  bar(trim,[0,.68,-.67],[.075,.037,1.0]);
  for(const sign of [-1,1]){
    bar(armor,[sign*2.13,.12,1.35],[.54,.16,1.55],sign*.29);
    bar(inset,[sign*1.70,.25,.58],[.26,.025,.92],sign*.40);
    bar(magenta,[sign*2.54,.243,1.11],[.075,.038,.82],sign*.28);
    bar(cyan,[sign*1.04,-.16,.06],[.065,.07,1.35],sign*.08);
    // Thruster nozzles read as real hardware around an illuminated slit.
    bar(inset,[sign*.8,-.06,2.27],[.55,.31,.27]);
    bar(trim,[sign*.8,-.068,2.418],[.29,.07,.055]);
    bar(armor,[sign*1.56,.32,1.86],[.20,.42,.86],sign*.16);
  }
  // Restrained magenta underside is visible in jumps; not a bloom floodlight.
  bar(magenta,[0,-.292,.87],[.45,.06,1.1]);
  return {armor,inset,cyan,magenta,trim};
}
