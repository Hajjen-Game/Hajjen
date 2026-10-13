// Rift Expedition 1.1: natural low-poly cliff formations, crystalline
// landmarks and objective portals. No raised road/tube or luminous cube lids.
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
    rubble=mat("rubble","#29283c");
  // Matte earth/stone: no bright emissive white tops, even under the shared
  // scene glow pass. Slightly varied faces give the cliffs readable facets.
  const cliffBase=mat("cliff-base","#292c40","#080b14"),
    cliffShadow=mat("cliff-shadow","#23283a","#060916"),
    cliffFace=mat("cliff-face","#414159","#090d1a"),
    cliffSlate=mat("cliff-slate","#34394e","#080d18"),
    cliffViolet=mat("cliff-violet","#393248","#0d0919");
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
  // No rendered road. Distinct court silhouettes signal changes of biome,
  // while spell telegraphs always stay higher contrast than environment art.
  function polygon(name,x,z,r,sides,material,turn=0){
    const points=[];
    for(let j=0;j<=sides;j++){
      const angle=j*TWO_PI/sides+turn;
      points.push(new BABYLON.Vector3(x+Math.cos(angle)*r,.012,
        z+Math.sin(angle)*r));
    }
    const mesh=BABYLON.MeshBuilder.CreateTube(name,{
      path:points,radius:.025,tessellation:5},scene);
    mesh.material=material;return isPickable(mesh);
  }
  const portals=[],bossRings=[],hazardRings=[];
  for(let i=0;i<arena.route.length;i++){
    const sector=arena.route[i],x=sector.center.x*scale,z=sector.center.y*scale;
    const coreMat=mat("sect-"+i,tones[i][0],tones[i][1]);
    // Rift 1.2b: bring back the clean, COMPLETE 1.1 combat circles.
    // World accents live around the courts, not instead of their outlines.
    // The Sanctum's large hexagon is intentionally retained as its identity.
    const isHeart=sector.shape==="heart";
    const isSanctum=sector.shape==="sanctum";
    const base=cylinder("rift-arena-island-"+i,x,z,
      5.4+i%2*.5,.11,deep,10);
    base.position.y=-.079;
    if(!isSanctum){
      ring("rift-court-engraving-"+i,x,z,4.15,coreMat,.041,.019);
      ring("rift-court-inner-"+i,x,z,2.45,copper,.027,.023);
    }else{
      // A quiet round perimeter frames the beloved bright hexagon without
      // replacing its six-sided silhouette or cluttering the fight center.
      ring("rift-sanctum-circle-frame",x,z,5.12,copper,.029,.018);
      polygon("rift-sanctum-hex",x,z,4.45,6,coreMat,.52);
      polygon("rift-sanctum-inner",x,z,2.35,6,copper,.52);
      for(let n=0;n<4;n++){
        const a=n*TWO_PI/4+.58;
        const px=x+Math.cos(a)*5.45,pz=z+Math.sin(a)*5.45;
        cylinder("rift-sanctum-pedestal-"+n,px,pz,.38,.24,stone,6);
        crystal("rift-sanctum-keystone-"+n,px,pz,1.1,.21,coreMat);
      }
    }
    // Restore sparse 1.1-like perimeter rubble. None of the following
    // geometry creates new collision, roads, sigil squares or empty arcs.
    for(let n=0;n<8;n++){
      const angle=TWO_PI*n/8+i*.31;
      const rx=x+Math.cos(angle)*4.76,rz=z+Math.sin(angle)*4.76;
      const piece=cylinder("rift-court-debris-"+i+"-"+n,rx,rz,
        .20+(n%3)*.10,.13+(n%2)*.15,n%2?stone:rubble,5);
      piece.rotation.y=angle;
    }
    // Signature landmarks distinguish each sector without filling the
    // center of its actual playable combat space with collisionless props.
    const side=i%2===0?1:-1;
    for(const n of [-1,1]){
      const px=x+n*.95,pz=z+side*(5.5+.24*i);
      if(sector.shape==="bastion"||sector.shape==="fractured"){
        cylinder("rift-ruined-base-"+i+"-"+n,px,pz,.53,.23,stone,5);
        crystal("rift-signature-spire-"+i+"-"+n,px,pz,
          1.65+.2*(i%3),.31,sector.shape==="fractured"?stoneLight:coreMat,n*.13);
      }else{
        box("rift-ruined-base-"+i+"-"+n,px,pz,.70,.65,.18,stone);
        crystal("rift-signature-spire-"+i+"-"+n,px,pz,
          2.1+.4*(i%3),.36,coreMat,n*.13);
        ring("rift-spire-sigil-"+i+"-"+n,px,pz,.7,coreMat,.022,.08);
      }
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
  // Sector-specific positional mechanics: telegraphed ground rings belong
  // to the exact radius used by the combat simulation. No hidden hotspots.
  for(const hazard of arena.hazards||[]){
    const x=hazard.x*scale,z=hazard.y*scale,r=hazard.radius*scale;
    const material=hazard.kind==="flux"?cyan:violet;
    const outer=ring("rift-hazard-outer-"+hazard.id,x,z,r,material,.075,.075);
    const inner=ring("rift-hazard-inner-"+hazard.id,x,z,r*.72,
      hazard.kind==="flux"?cyan:ember,.035,.085);
    outer.visibility=0;inner.visibility=0;
    hazardRings.push({hazard,meshes:[outer,inner]});
  }
  // The existing rectangles remain the authoritative collisions for AI,
  // player movement and LOS. Every visible cliff piece sits INSIDE its
  // rectangle, so we do not introduce invisible surprise path blockers.
  function rock(name,x,z,width,depth,height,material,facets=6){
    const mesh=BABYLON.MeshBuilder.CreateCylinder(name,{
      diameterBottom:1,diameterTop:.47,height,tessellation:facets},scene);
    mesh.scaling.x=width;mesh.scaling.z=depth;
    mesh.position.set(x,height*.5-.025,z);
    mesh.material=material;return isPickable(mesh);
  }
  function createCliffCluster(obstacle,index){
    const {id,kind}=obstacle;
    const x=(obstacle.x+obstacle.w*.5)*scale;
    const z=(obstacle.y+obstacle.h*.5)*scale;
    const w=obstacle.w*scale,d=obstacle.h*scale;
    const tall=kind==="monolith"?2.45:
      kind==="column"?2.05:kind==="crystal"?1.85:1.48;
    const variant=(index*7+3)%5;
    const dark=kind==="monolith"?cliffShadow:
      kind==="crystal"?cliffViolet:cliffBase;
    // Three overlapping tapered 5–7 sided volumes form uneven rock strata.
    // No square caps; no glowing white top surfaces; no giant needle spires.
    rock("rift-cliff-base-"+id,x,z,w*.84,d*.83,tall*.64,dark,7);
    rock("rift-cliff-crest-"+id,
      x-w*.15,z+d*.09,w*.52,d*.62,tall*(.85+variant*.045),
      variant%2?cliffFace:cliffSlate,5);
    rock("rift-cliff-shoulder-"+id,
      x+w*.21,z-d*.15,w*.39,d*.53,tall*(.64+variant*.035),
      kind==="monolith"?cliffShadow:cliffBase,6);
    rock("rift-cliff-outcrop-"+id,
      x-w*.19,z-d*.24,w*.37,d*.31,tall*(.38+(index%3)*.06),
      cliffShadow,5);
    // A few small low-poly fragments reinforce the rocky silhouette,
    // restrained enough to keep projectile and boss telegraphs readable.
    rock("rift-cliff-rubble-"+id,x+w*.24,z+d*.27,
      w*.19,d*.16,.20+(index%2)*.07,cliffSlate,5);
  }
  for(const [index,o] of arena.obstacles.entries())
    createCliffCluster(o,index);
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
      for(const zone of hazardRings){
        const current=match?.riftHazard;
        const active=match?.wave===zone.hazard.sector&&
          current?.id===zone.hazard.id;
        for(const [i,mesh] of zone.meshes.entries()){
          mesh.visibility=active?(current.phase==="warning"?.85:1):0;
          if(active)mesh.scaling.setAll(1+
            (current.phase==="warning"?.035*Math.sin(now*.008+i):.08));
        }
      }
    }
  };
}
