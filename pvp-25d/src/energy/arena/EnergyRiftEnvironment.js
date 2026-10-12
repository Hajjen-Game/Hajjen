// Rift Expedition world art 1.0: actual 3D terrain composition, traversal
// language, ruins, crystalline landmarks and objective portals.
// Geometry is decorative except arena.obstacles, which use the same shapes for
// collision/LOS/AI. No Planet Defense floor grid and no external asset loading.
const TWO_PI=Math.PI*2;
const C=hex=>BABYLON.Color3.FromHexString(hex);
export function createRiftEnvironment(scene,arena,scale=.02){
  const mats=new Map();
  function mat(name,diffuse,emission=null,alpha=1){
    if(mats.has(name))return mats.get(name);
    const m=new BABYLON.StandardMaterial("rift-"+name,scene);
    m.diffuseColor=C(diffuse);
    m.emissiveColor=C(emission||"#070b16");
    m.specularColor=C("#151829");
    m.alpha=alpha;
    mats.set(name,m);return m;
  }
  const stone=mat("stone","#36394f"),stoneLight=mat("stone-face","#625f80"),
    deep=mat("deep","#171c33"),copper=mat("copper","#544768"),
    violet=mat("violet","#6a47a0","#3d2265"),cyan=mat("cyan","#3b8995","#236875"),
    bloom=mat("bloom","#ad74ff","#8454da"),ember=mat("ember","#ba86f4","#75439e"),
    floor=mat("path","#353044","#1e1c31"),rubble=mat("rubble","#29283c");
  const tones=[
    ["#714b98","#3c295f"],["#7385b5","#425978"],
    ["#40b8b6","#1c736e"],["#af84c4","#653d8c"],["#cc8cda","#7747b0"]
  ];
  const isPickable=mesh=>{mesh.isPickable=false;return mesh;};
  function cylinder(name,x,z,r,height,material,tess=6){
    const mesh=BABYLON.MeshBuilder.CreateCylinder(name,{
      diameter:r*2,height,tessellation:tess},scene);
    mesh.position.set(x,height/2,z);mesh.material=material;
    return isPickable(mesh);
  }
  function box(name,x,z,w,d,height,material){
    const mesh=BABYLON.MeshBuilder.CreateBox(name,{
      width:w,depth:d,height},scene);
    mesh.position.set(x,height/2,z);mesh.material=material;
    return isPickable(mesh);
  }
  function crystal(name,x,z,height,r,material,tilt=0){
    const mesh=BABYLON.MeshBuilder.CreateCylinder(name,{
      diameterTop:0,diameterBottom:r*2,height,tessellation:5},scene);
    mesh.position.set(x,height/2,z);mesh.rotation.z=tilt;
    mesh.rotation.y=(x+z)*.13;mesh.material=material;
    return isPickable(mesh);
  }
  function ring(name,x,z,r,material,thickness=.045,y=.07){
    const mesh=BABYLON.MeshBuilder.CreateTorus(name,{
      diameter:r*2,thickness,tessellation:44},scene);
    mesh.position.set(x,y,z);mesh.material=material;
    return isPickable(mesh);
  }
  function pathLine(name,points,r,material){
    const mesh=BABYLON.MeshBuilder.CreateTube(name,{
      path:points.map(([x,z])=>new BABYLON.Vector3(x,.026,z)),
      radius:r,tessellation:7},scene);
    mesh.material=material;return isPickable(mesh);
  }
  // Walkable road is physically continuous but meanders through five
  // differently-shaped encounter courts. A dim stone lane is contrasted by
  // thin energy veins; real obstacles never sit on the centre line.
  const centers=arena.route.map(r=>[r.center.x*scale,r.center.y*scale]);
  const routePoints=[[7.1,17.3],...centers,[arena.width*scale-3.7,17.4]];
  pathLine("rift-long-path",routePoints,.88,floor);
  pathLine("rift-energy-spine",routePoints,.043,violet);
  for(let i=0;i<routePoints.length-1;i++){
    const a=routePoints[i],b=routePoints[i+1];
    const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz)||1;
    const nx=-dz/len,nz=dx/len;
    for(const side of [-1,1]){
      pathLine("rift-road-seam-"+i+"-"+side,[
        [a[0]+nx*.73*side,a[1]+nz*.73*side],
        [b[0]+nx*.73*side,b[1]+nz*.73*side]],.021,copper);
    }
  }
  const portals=[],bossRings=[];
  for(let i=0;i<arena.route.length;i++){
    const sector=arena.route[i],x=sector.center.x*scale,z=sector.center.y*scale;
    const coreMat=mat("sect-"+i,tones[i][0],tones[i][1]);
    // Deliberately irregular floor architecture rather than flat grid tiles.
    const base=cylinder("rift-arena-island-"+i,x,z,5.4+i%2*.5,.11,deep,10);
    base.position.y=-.079;
    ring("rift-court-engraving-"+i,x,z,4.15,coreMat,.028,.014);
    ring("rift-court-inner-"+i,x,z,2.45,copper,.021,.018);
    for(let n=0;n<8;n++){
      const angle=TWO_PI*n/8+i*.31;
      const rx=x+Math.cos(angle)*4.76,rz=z+Math.sin(angle)*4.76;
      // Debris along the outer court. No mesh colliders: decoration only.
      const piece=cylinder("rift-court-debris-"+i+"-"+n,rx,rz,
        .20+(n%3)*.10,.13+n%2*.15,n%2?stone:rubble,5);
      piece.rotation.y=angle;
    }
    // Tall silhouettes along edges make the biome legible at gameplay zoom.
    const side=i%2===0?1:-1;
    for(const n of [-1,1]){
      const px=x+(n*.95),pz=z+side*(5.5+.24*i);
      box("rift-ruined-base-"+i+"-"+n,px,pz,.86,.82,.30,stone);
      crystal("rift-signature-spire-"+i+"-"+n,px,pz,
        2.6+.5*(i%3),.43,coreMat,n*.13);
      ring("rift-spire-sigil-"+i+"-"+n,px,pz,.8,coreMat,.025,.10);
    }
    if(i===2){
      // Glasswound Grove: denser translucent crystal grove, kept beyond the
      // main movement route.
      for(let n=0;n<14;n++){
        const a=n*2.4,rad=5.5+(n%4)*.42;
        const xx=x+Math.cos(a)*rad,zz=z+Math.sin(a)*rad;
        crystal("rift-grove-shard-"+n,xx,zz,1.1+(n%5)*.29,
          .19+(n%3)*.06,n%3?cyan:coreMat,.06*(n%4));
      }
    }
    if(i===4){
      // Final boss room: a ringed, layered Rift heart and ruined buttresses.
      for(let n=0;n<8;n++){
        const a=n*TWO_PI/8+.2;
        crystal("rift-heart-spire-"+n,x+Math.cos(a)*6.1,z+Math.sin(a)*6.1,
          2.6+(n%3)*.4,.34,n%2?bloom:stoneLight,.06);
      }
      bossRings.push(ring("rift-heart-boundary",x,z,6.45,bloom,.07,.08));
      bossRings.push(ring("rift-heart-circuit",x,z,3.1,ember,.07,.06));
    }
    // Rune gates do not block pathfinding; their glowing ring remains dim
    // until the entire sector is cleared. The player physically crosses.
    if(sector.gate){
      const gx=sector.gate.x*scale,gz=sector.gate.y*scale;
      const pair=mat("gate-"+i,tones[i][0],tones[i][1]);
      const portal=ring("rift-portal-active-"+i,gx,gz,2.25,pair,.13,.07);
      const inner=ring("rift-portal-inner-"+i,gx,gz,1.55,cyan,.045,.055);
      for(const side of [-1,1]){
        const px=gx+side*1.7;
        box("rift-portal-pedestal-"+i+"-"+side,px,gz,.9,.9,.6,stone);
        crystal("rift-portal-column-"+i+"-"+side,px,gz,2.15,.37,pair);
      }
      portals.push({stage:i+1,meshes:[portal,inner],x:gx,z:gz});
    }
  }
  // True solid collision/LOS obstacles are rendered as layered, irregular
  // stone ruins or clustered shards — not Planet Defense's simple grey boxes.
  for(const o of arena.obstacles){
    const x=(o.x+o.w/2)*scale,z=(o.y+o.h/2)*scale;
    const w=o.w*scale,d=o.h*scale;
    const height=o.kind==="monolith"?2.5:o.kind==="crystal"?1.85:1.35;
    const material=o.kind==="crystal"?violet:o.kind==="monolith"?deep:stone;
    const base=box("rift-solid-"+o.id,x,z,w,d,height,material);
    base.rotation.y=0; // match real axis-aligned collision rectangle
    box("rift-solid-crown-"+o.id,x,z,w*.84,d*.82,.17,
      o.kind==="crystal"?bloom:stoneLight).position.y=height+.07;
    if(o.kind==="crystal"||o.kind==="monolith"){
      for(let n=0;n<3;n++){
        const side=n-1;
        crystal("rift-solid-crystal-"+o.id+"-"+n,
          x+side*w*.29,z+(n%2?.21:-.16)*d,height*.78+1.0,
          .23+(n%2)*.10,n%2?cyan:bloom,side*.14);
      }
    }else{
      for(let n=0;n<2;n++)
        box("rift-ruin-split-"+o.id+"-"+n,x+(n?-.25:.28)*w,
          z+(n?.23:-.20)*d,w*.31,d*.36,height*.24,
          n?stoneLight:rubble).position.y=height+.12;
    }
  }
  // Sparse background sculpture frames the route without littering the
  // combat lane or introducing hundreds of tiny expensive meshes.
  for(let i=0;i<arena.route.length;i++){
    const {center}=arena.route[i];const x=center.x*scale,z=center.y*scale;
    for(let n=0;n<12;n++){
      const a=n*TWO_PI/12+i*.7,rad=7.5+n%3*1.2;
      const px=x+Math.cos(a)*rad,pz=z+Math.sin(a)*rad;
      if(px<.8||px>arena.width*scale-.8||pz<.8||pz>arena.height*scale-.8)continue;
      crystal("rift-background-glass-"+i+"-"+n,px,pz,
        .6+(n%4)*.23,.12+(n%3)*.06,
        n%4===0?cyan:n%3===0?violet:stone,.11);
    }
  }
  return {
    update(match,now){
      const gateIndex=match?.waveState==="advance"?match.wave:-1;
      for(const portal of portals){
        const active=portal.stage===gateIndex;
        for(const [j,mesh] of portal.meshes.entries()){
          mesh.scaling.setAll(active?1+.08*Math.sin(now*.003+j):.84);
          mesh.visibility=active?1:.32;
          mesh.rotation.y=active?now*.0003*(j?-.8:1):0;
        }
      }
      for(const [i,mesh] of bossRings.entries()){
        mesh.rotation.y=now*.00013*(i?-.8:1);
        mesh.visibility=match?.wave>=5?0.75:0.25;
      }
    }
  };
}
