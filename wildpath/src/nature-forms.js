// Nature Forms & Depth — deterministic 3D plant anatomy, no Babylon dependency.
// Shared instances are created by NatureGrowth from these lightweight descriptors.
// Categories: bark, branch, foliage clusters, individual leaves, petals, pollen.
const part=(kind,x,y,z,sx,sy,sz,rx=0,rz=0)=>({
  kind,x,y,z,sx,sy,sz,rx,rz
});
const flower=(out,x,y,z,size=1,petals=5)=>{
  // Petals radiate from a distinct center instead of becoming a single orb.
  for(let i=0;i<petals;i++){
    const a=2*Math.PI*i/petals;
    out.push(part(i%2?'accent':'petal',x+Math.cos(a)*.19*size,y,
      z+Math.sin(a)*.19*size,.24*size,.085*size,.15*size,0,-a));
  }
  out.push(part('center',x,y+.055*size,z,.15*size,.13*size,.15*size));
};
function shrub(out,variant,seed){
  const count=variant==='wide'?5:variant==='flowered'?4:3;
  for(let i=0;i<count;i++){
    const a=i*2.39996+seed;
    const rad=(variant==='wide'?.84:.53)*(i%2?.85:1);
    const x=Math.cos(a)*rad,z=Math.sin(a)*rad;
    out.push(part(i%3===0?'light':'leaf',x,.28+(i%2)*.17,z,
      variant==='wide'?.57:.66,.48+(i%3)*.06,.47));
    out.push(part('blade',x*1.35,.18,z*1.3,.18,.40,.36,0,a));
  }
  const buds=variant==='flowered'?4:variant==='wide'?3:2;
  for(let i=0;i<buds;i++){
    const a=i*2*Math.PI/buds+.37;
    const r=variant==='wide'?.74:.42;
    flower(out,Math.cos(a)*r,.65+(i%2)*.11,Math.sin(a)*r*.8,.61,4);
  }
}
function tree(out,variant,big,seed){
  // View is top-down/slightly tilted: crown mass is shifted behind the
  // trunk (positive Z), leaving the fork and lower trunk visible in front.
  const h=big?1.90:1.63;
  const bend=Math.sin(seed)*.22;
  out.push(part('bark',0,h*.29,-.32,.33,h*.64,.31,0,bend*.22));
  out.push(part('bark',bend*.18,h*.73,-.23,.27,h*.54,.25,-.10,-bend*.25));
  for(const [x,z,tilt] of [[-.60,-.02,.53],[.62,.12,-.53],[.07,.42,-.12]]){
    // Short, sloping Y-forks join the underside of the nearby crown.
    out.push(part('branch',x*.49+bend*.1,h*.99,z*.42-.07,
      .16,1.08,.17,-z*.30,tilt));
  }
  const wide=variant==='wide',tall=variant==='tall',grove=variant==='grove';
  const grand=variant==='grand';
  const clusters=grand?10:grove?9:wide?9:8;
  const baseY=h+(tall?1.04:.70);
  const spread=wide?1.48:tall?.89:grand?1.18:1.05;
  for(let i=0;i<clusters;i++){
    const a=2*Math.PI*i/clusters+seed*.16;
    const r=(i%3===0?.30:i%3===1?.76:1.04)*spread;
    const x=Math.cos(a)*r,z=.53+Math.sin(a)*r*.76;
    const lift=(i%3)*.23+(tall?i*.13:0);
    const s=(big?.95:.79)*(grand?1.10:1);
    out.push(part(i%3===0?'accent':i%2===0?'light':'leaf',
      x,baseY+lift,z,s*(wide?1.10:.91),s*(tall?1.03:.69),
      s*(wide?1.03:.87)));
    if(i%3===0){
      // Small ovoid leaf tips break up the balloon silhouette.
      out.push(part('blade',x*1.34,baseY+lift-.11,
        .53+(z-.53)*1.30,.27,.18,.46,0,a));
    }
  }
  // Floral caps break up the canopy surface without creating huge balls.
  const n=big?6:3;
  for(let i=0;i<n;i++){
    const a=i*2.399963+seed*.1;
    const r=.39+(i%3)*.29;
    const x=Math.cos(a)*r*(wide?1.25:1);
    const z=.54+Math.sin(a)*r*.67;
    out.push(part(i%3===0?'accent':'petal',x,
      baseY+.50+(i%3)*.16,z,
      big?.31:.23,.17,big?.29:.20));
  }
}
export function makePlantForm(look,seed=1){
  const {tier,variant}=look;
  const out=[];
  if(tier==='flower'){
    const tall=variant==='tall',cluster=variant==='cluster';
    if(cluster){
      for(const [x,z,y] of [[-.24,-.08,.48],[.23,.12,.63],[0,-.29,.53]]){
        out.push(part('stem',x,y*.5,z,.055,y,.055));
        flower(out,x,y+.11,z,.77,5);
      }
    }else{
      const h=tall?.84:.56;
      out.push(part('stem',0,h*.5,0,.065,h,.065,0,.10));
      out.push(part('blade',-.20,.21,0,.25,.12,.12,0,-.34));
      out.push(part('blade',.22,.34,.04,.26,.14,.12,0,.35));
      flower(out,0,h+.12,0,tall?1.10:1.08,5);
      if(tall)flower(out,-.19,h*.74,.16,.61,4);
    }
  }else if(tier==='bush'){
    shrub(out,variant,seed);
  }else if(tier==='tree'||tier==='blossom'){
    tree(out,variant,tier==='blossom',seed);
  }
  return out;
}
export function describePlantForm(look,seed=1){
  const parts=makePlantForm(look,seed);
  const count=kind=>parts.filter(p=>p.kind===kind).length;
  return {parts:parts.length,branches:count('branch'),
    trunkSections:count('bark'),leafClusters:count('leaf')+
      count('light')+count('accent'),
    flowers:count('petal')+count('accent')+count('center'),
    extentY:Math.max(0,...parts.map(p=>p.y+p.sy/2))};
}
