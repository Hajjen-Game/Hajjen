// SKYSHIFT 0.4.1 – physically banked clean track: wide-space flow edition.
// Decoration is strictly functional. NO repeated deck panels, floor squares,
// glowing tiles, false bridges or large emissive surface meshes.
import {
  TRIAL,GAPS,ISLANDS,SPLITS,RISK_CUTS,GEOMETRY_BREAKS,
  roadIntervals,positionAt
} from "./trial-v041.mjs";

export const TRACK_ART=Object.freeze({
  nav:0x77d5e6,risk:0xd48ebc,landing:0xa6b9cc,
  maxPanelCount:0,plateCount:0
});

function addMark(plan,kind,start,end,left,right) {
  if(!(start<end&&left<right)||start<0||end>=TRIAL.length)return;
  if(GEOMETRY_BREAKS.some(v=>v>start+.0001&&v<end-.0001))return;
  // Each decorative stripe must stay INSIDE the same physical lane at
  // every point sampled; nothing is permitted above actual void geometry.
  for(const s of [start+.012,(start+end)*.5,end-.012]) {
    if(!roadIntervals(s).some(([a,b])=>left>a+.08&&right<b-.08))return;
  }
  plan.push({kind,start,end,left,right});
}

export function createSurfacePlan(){
  const plan=[];
  // Offset landing islands: an inset bracket near each edge provides landing
  // scale and lateral position without mimicking a missing-platform cut.
  for(const island of ISLANDS) {
    for(const s of [island.start+4,island.end-5.2]) {
      const lanes=roadIntervals(s+.3);
      for(const [a,b] of lanes){
        addMark(plan,"landing",s,s+.55,a+1.05,a+1.22);
        addMark(plan,"landing",s,s+.55,b-1.22,b-1.05);
      }
    }
  }
  // Risk choice: a few inset directional accents ONLY, no repeated pattern.
  const split=SPLITS[0];
  for(const s of [split.start+16,split.start+76,split.end-11]){
    if(RISK_CUTS.some(g=>s>g.start-12&&s<g.end+3))continue;
    for(const [a,b] of roadIntervals(s+.4)){
      const c=(a+b)*.5;
      addMark(plan,a>0?"risk":"nav",s,s+1.6,c-.10,c+.10);
    }
  }
  // Two tiny navigation guide pairs at designed open road moments. The
  // essential amber jump warnings are part of buildRoad(), not this layer.
  for(const s of [83,505,993,1220]){
    if(GAPS.some(g=>s>g.start-15&&s<g.end+5))continue;
    for(const [a,b] of roadIntervals(s+.2)){
      const w=b-a;
      addMark(plan,"nav",s,s+.85,a+w*.24-.11,a+w*.24+.11);
      addMark(plan,"nav",s,s+.85,a+w*.76-.11,a+w*.76+.11);
    }
  }
  return plan;
}

export function validateSurfacePlan(plan=createSurfacePlan()){
  const issues=[];
  for(const [i,p] of plan.entries()){
    if(!["landing","nav","risk"].includes(p.kind))
      issues.push(i+": extraneous surface material "+p.kind);
    if(GEOMETRY_BREAKS.some(s=>s>p.start+.0001&&s<p.end-.0001))
      issues.push(i+": spans a real gap or track join");
    for(const s of [p.start+.015,(p.start+p.end)*.5,p.end-.015]){
      if(!roadIntervals(s).some(([a,b])=>p.left>a+.07&&p.right<b-.07))
        issues.push(i+": painted outside playable geometry at "+s);
    }
  }
  if(plan.some(p=>p.kind==="plate"||p.kind==="seam"||p.kind==="energy"))
    issues.push("decommissioned surface rectangles were reintroduced");
  return issues;
}

function point(s,l,y) { return positionAt(s,l,y); }

export function installCleanTrack(THREE,world){
  const plan=createSurfacePlan();
  const groups={nav:[],risk:[],landing:[]};
  for(const p of plan) {
    const y=p.kind==="landing"?.062:.057;
    const a=point(p.start,p.left,y),b=point(p.start,p.right,y);
    const c=point(p.end,p.right,y),d=point(p.end,p.left,y);
    for(const v of [a,b,c,a,c,d])groups[p.kind].push(v.x,v.y,v.z);
  }
  const mats={
    nav:new THREE.MeshBasicMaterial({color:TRACK_ART.nav,transparent:true,
      opacity:.54,depthWrite:false,side:THREE.DoubleSide}),
    risk:new THREE.MeshBasicMaterial({color:TRACK_ART.risk,transparent:true,
      opacity:.65,depthWrite:false,side:THREE.DoubleSide}),
    landing:new THREE.MeshBasicMaterial({color:TRACK_ART.landing,transparent:true,
      opacity:.62,depthWrite:false,side:THREE.DoubleSide})
  };
  let drawBatches=0;
  for(const [name,verts] of Object.entries(groups)){
    if(!verts.length)continue;
    const g=new THREE.BufferGeometry();
    g.setAttribute("position",new THREE.Float32BufferAttribute(verts,3));
    g.computeVertexNormals();
    const mesh=new THREE.Mesh(g,mats[name]);
    mesh.frustumCulled=false;world.add(mesh);drawBatches++;
  }
  return {plan,drawBatches,removedPanelDraws:true};
}
