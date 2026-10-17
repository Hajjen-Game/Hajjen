// Nature Rebirth 1.0 — pure, testable kill clustering. No combat changes.
// Immediate flower on first kill; nearby kills within 1.6 s upgrade that plant.
export const NATURE_WINDOW=1.6;
export const NATURE_RADIUS=7.2;
export const NATURE_MAX_PLANTS=112;
export const NATURE_MAX_TREES=18;
export const NATURE_TIERS=Object.freeze([
  Object.freeze({id:'flower',at:1,label:'WILDFLOWER'}),
  Object.freeze({id:'bush',at:3,label:'BLOOMING BUSH'}),
  Object.freeze({id:'tree',at:6,label:'YOUNG TREE'}),
  Object.freeze({id:'blossom',at:10,label:'BLOSSOM TREE'})
]);
const TYPES=['mossling','bramble','ember','guardian'];
export function natureTier(kills){
  if(kills>=10)return 'blossom';
  if(kills>=6)return 'tree';
  if(kills>=3)return 'bush';
  return 'flower';
}
export function natureSpecies(counts){
  let top='mossling',best=-1;
  for(const type of TYPES){
    const n=counts[type]||0;
    if(n>best){top=type;best=n;}
  }
  return top;
}
export function makeNatureLedger(){return {clusters:[],nextId:1,totalKills:0};}
export function recordNatureKill(ledger,{x,z,type='mossling',time}){
  if(![x,z,time].every(Number.isFinite))return null;
  const now=time;
  // This is just the short-lived grouping ledger: the scenery persists
  // independently, until the render budget requires recycling older plants.
  ledger.clusters=ledger.clusters.filter(g=>now-g.last<=NATURE_WINDOW);
  let cluster=null,nearest=NATURE_RADIUS;
  for(const g of ledger.clusters){
    const d=Math.hypot(g.x-x,g.z-z);
    if(d<=nearest){nearest=d;cluster=g;}
  }
  let kind='grow';
  if(!cluster){
    cluster={id:ledger.nextId++,x,z,last:now,count:0,
      counts:{mossling:0,bramble:0,ember:0,guardian:0},tier:'flower'};
    ledger.clusters.push(cluster);kind='create';
  }
  const before=cluster.tier;
  cluster.count++;
  cluster.last=now;
  const variant=TYPES.includes(type)?type:'mossling';
  cluster.counts[variant]++;
  cluster.tier=natureTier(cluster.count);
  ledger.totalKills++;
  if(kind!=='create'&&cluster.tier!==before)kind='upgrade';
  return {kind,id:cluster.id,x:cluster.x,z:cluster.z,
    count:cluster.count,tier:cluster.tier,
    species:natureSpecies(cluster.counts),totalKills:ledger.totalKills};
}
