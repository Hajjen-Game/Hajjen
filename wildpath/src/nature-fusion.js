// Wildpath 2.6 — pure spatial grouping for Living World & Nature Fusion.
// Group only settled minor plants; preserve individual trees and rare blossoms.
// The rendering layer owns mesh disposal and scenery, not this planner.
export const FUSION_SETTLE=2.7;
export const FUSION_GROUP_RADIUS=5.3;
export const FUSION_MAX_MEMBERS=9;
export const FUSION_MAX_REGIONS=22;
export const FUSION_MAX_RADIUS=7.8;

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const isSmall=p=>p.tier==='flower'||p.tier==='bush';
export function fusionKind(members,trees=[]){
  if(trees.some(t=>t.tier==='blossom'))return 'enchanted';
  if(trees.length)return 'grove';
  if(members.filter(p=>p.tier==='bush').length>=2)return 'thicket';
  return 'meadow';
}
export function fusionRadius(count,kind){
  const start=kind==='enchanted'?4.3:kind==='grove'?3.9:kind==='thicket'?3.15:2.9;
  return Math.min(FUSION_MAX_RADIUS,start+Math.sqrt(Math.max(0,count-2))*.62);
}
export function planNatureFusions(plants,regions,now){
  // A pending combo remains visually intact until its last potential tier
  // evolution has finished; this avoids erasing a newly generated bush/tree.
  const available=plants.filter(p=>isSmall(p) && Number.isFinite(p.x) &&
    Number.isFinite(p.z) && now-p.lastBloom>=FUSION_SETTLE);
  const used=new Set(),actions=[];
  const trees=plants.filter(p=>p.tier==='tree'||p.tier==='blossom');
  // Existing regions absorb new nearby foliage before new patches are made.
  for(const region of regions){
    const candidates=available.filter(p=>!used.has(p.id) &&
      distance(p,region)<=Math.min(FUSION_MAX_RADIUS+1,region.radius+2.4))
      .sort((a,b)=>distance(a,region)-distance(b,region) || a.id-b.id)
      .slice(0,FUSION_MAX_MEMBERS);
    if(!candidates.length)continue;
    for(const p of candidates)used.add(p.id);
    const nearby=trees.filter(p=>distance(p,region)<region.radius+2);
    actions.push({regionId:region.id,sourceIds:candidates.map(p=>p.id),
      x:region.x,z:region.z,kind:fusionKind(candidates,nearby),
      count:candidates.length,colors:candidates.map(p=>p.look?.palette||'mint')});
  }
  for(const seed of available){
    if(used.has(seed.id))continue;
    const members=[seed],queue=[seed],inGroup=new Set([seed.id]);
    // Local connected component, capped for stable work per frame.
    while(queue.length&&members.length<FUSION_MAX_MEMBERS){
      const current=queue.shift();
      for(const p of available){
        if(used.has(p.id)||inGroup.has(p.id)||distance(p,current)>FUSION_GROUP_RADIUS)
          continue;
        members.push(p);queue.push(p);inGroup.add(p.id);
        if(members.length>=FUSION_MAX_MEMBERS)break;
      }
    }
    const x=members.reduce((n,p)=>n+p.x,0)/members.length;
    const z=members.reduce((n,p)=>n+p.z,0)/members.length;
    const treeNear=trees.filter(p=>Math.hypot(p.x-x,p.z-z)<6.5);
    if(members.length<3 && !(members.length>=2&&treeNear.length))continue;
    for(const p of members)used.add(p.id);
    actions.push({regionId:null,sourceIds:members.map(p=>p.id),
      x,z,kind:fusionKind(members,treeNear),count:members.length,
      colors:members.map(p=>p.look?.palette||'mint')});
  }
  return actions;
}
export function regionSummary(regions){
  const kinds={meadow:0,thicket:0,grove:0,enchanted:0};
  let absorbed=0;
  for(const r of regions){
    kinds[r.kind]=(kinds[r.kind]||0)+1;
    absorbed+=r.count;
  }
  return {regions:regions.length,absorbed,kinds};
}
