// Willowglow 11.0: LOWER TRUNK & SOFTER FORK.
// Reuses v9 leaf geometry and lobe arrangement, lowering the entire crown
// without flattening it. Smooth wood sweeps replace v10's angular forks.
// No imported meshes, paid assets, solid leaf blobs, or new engine.
export const ART_DIRECTION = Object.freeze({
  name: 'Willowglow — lower trunk and softer fork 11.0',
  foliage: ['#153726', '#24553a', '#3b7446', '#6ba358', '#a5c975'],
  blossoms: ['#f6d7c0', '#ffe9cc', '#efb8bb'],
  bark: '#795d4c'
});

function random(seed = 472031) {
  let n = seed >>> 0;
  return () => ((n = (Math.imul(n, 1664525) + 1013904223) >>> 0) / 4294967296);
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export function buildHeroTree(B, scene, shadows) {
  const V = (x,y,z) => new B.Vector3(x,y,z);
  const C = hex => B.Color3.FromHexString(hex);
  const rand = random();
  const pick = a => a[Math.floor(rand() * a.length)];
  const treeRoot = new B.TransformNode('HERO TREE / Willowglow', scene);

  const bark = new B.StandardMaterial('11.0 / soft umber bark', scene);
  bark.diffuseColor = C('#b49a81');
  bark.specularColor = C('#14120f');
  bark.specularPower = 20;
  const barkCanvas = new B.DynamicTexture('bark grain / artist brushstrokes', {width:512,height:512}, scene, false);
  const barkCtx = barkCanvas.getContext();
  barkCtx.fillStyle = '#7b5d46';
  barkCtx.fillRect(0,0,512,512);
  // Fine parallel strokes and soft pale ridges make bark read at game distance.
  for (let i=0; i<300; i++) {
    const x = rand()*512, y = rand()*512, len = 14+rand()*155;
    barkCtx.strokeStyle = rand()<.53 ? 'rgba(44,32,27,'+(0.06+rand()*.15)+')' :
      'rgba(220,188,142,'+(0.05+rand()*.11)+')';
    barkCtx.lineWidth = 1+rand()*4;
    barkCtx.beginPath(); barkCtx.moveTo(x,y);
    barkCtx.bezierCurveTo(x+8*(rand()-.5),y+len*.35,x+12*(rand()-.5),y+len*.7,x+10*(rand()-.5),y+len);
    barkCtx.stroke();
  }
  barkCanvas.update();
  bark.diffuseTexture=barkCanvas;
  bark.backFaceCulling=true;

  // Restore the smooth swept Tube geometry from 9.0: the ring-based wood in
  // 10.0 introduced hard angular seams at branch roots. Keep simple rounded
  // transitions, with no giant junction bulbs or exposed polygonal caps.
  function tube(name,points,startRadius,endRadius,tessellation=14,footFlare=0){
    const path=B.Curve3.CreateCatmullRomSpline(
      points.map(p=>V(...p)),12,false).getPoints();
    const mesh=B.MeshBuilder.CreateTube('11.0 / '+name,{
      path,tessellation,cap:B.Mesh.CAP_ALL,
      radiusFunction:(i)=>{
        const t=i/Math.max(1,path.length-1);
        return startRadius+(endRadius-startRadius)*Math.pow(t,.89)
          +footFlare*Math.exp(-t*18);
      }
    },scene);
    mesh.material=bark;mesh.parent=treeRoot;mesh.isPickable=false;
    shadows?.addShadowCaster(mesh);
    return mesh;
  }

  // The first major fork begins ~0.8 units lower than in 10.0.
  // The upper shaft is tucked behind the canopy rather than a tall exposed
  // stick. Root collar blends into soil with an understated bell-foot.
  const trunkPath=[
    [0,-.075,0],[-.038,.35,.045],[-.085,.96,.068],
    [-.20,1.70,-.067],[-.18,2.48,-.14],
    [-.08,3.18,-.145],[.10,4.50,-.13]
  ];
  tube('short bowed trunk / soft base',trunkPath,.56,.15,18,.115);

  // Three extremely short roots mostly below the soil lip: no claw-like
  // projections. The base flare above supplies most of the rooted silhouette.
  const roots=[
    [[-.035,.20,.06],[-.25,.10,.18],[-.43,-.035,.29]],
    [[.055,.17,-.045],[.24,.075,-.24],[.36,-.055,-.34]],
    [[.04,.18,.08],[.27,.09,.24],[.39,-.050,.34]]
  ];
  roots.forEach((pts,i)=>tube('buried buttress '+(i+1),pts,.14,.025,9));

  // Weighted yet slender forks rooted INSIDE the parent trunk. Their paths
  // curl into the leaves and avoid intersecting big cap-like cylinders.
  const boughs=[
    {name:'left lower',points:[[-.12,2.70,-.055],[-.32,3.30,.06],[-.82,4.19,.18],[-1.35,4.85,.20],[-1.90,5.31,.21]],a:.215,b:.041},
    {name:'left high',points:[[-.13,2.98,-.12],[-.36,3.86,-.21],[-.71,4.97,-.40],[-.99,6.05,-.43],[-1.21,6.78,-.34]],a:.197,b:.035},
    {name:'center crown',points:[[-.11,3.14,-.14],[.06,4.12,-.20],[.16,5.28,-.29],[.19,6.31,-.31],[.31,7.27,-.21]],a:.175,b:.037},
    {name:'right high',points:[[-.08,2.87,-.13],[.40,3.64,-.24],[.92,4.76,-.42],[1.34,5.71,-.48],[1.73,6.55,-.51]],a:.215,b:.041},
    {name:'right lower',points:[[-.06,2.66,.045],[.46,3.21,.22],[.95,4.02,.42],[1.61,4.85,.60],[2.19,5.59,.71]],a:.236,b:.045},
    {name:'front sheltered',points:[[-.13,2.96,.09],[.02,3.68,.40],[.14,4.48,.86],[.23,5.18,1.33],[.34,5.78,1.61]],a:.171,b:.035}
  ];
  for(const b of boughs)
    tube('rounded supporting bough / '+b.name,b.points,b.a,b.b,12);
  // These nine design envelopes define the intended finished silhouette.
  // They are NOT rendered: no hidden sphere, pancake or leaf-mass primitive.
  // Overlap is intentionally modest; valleys remain between crowned groups.
  const crowns = [
    {name:'left droop',x:-2.20,y:5.94,z:.12,rx:1.26,ry:.81,rz:1.09,leaves:298,lean:-.19},
    {name:'left summit',x:-1.44,y:7.02,z:-.66,rx:1.16,ry:.93,rz:1.08,leaves:280,lean:-.13},
    {name:'upper crown',x:-.24,y:7.97,z:-.21,rx:1.33,ry:.92,rz:1.19,leaves:346,lean:.02},
    {name:'right summit',x:1.35,y:7.43,z:-.48,rx:1.23,ry:.90,rz:1.14,leaves:316,lean:.18},
    {name:'right droop',x:2.36,y:6.42,z:.26,rx:1.24,ry:.81,rz:1.05,leaves:294,lean:.20},
    {name:'right front',x:1.57,y:5.93,z:1.06,rx:1.19,ry:.81,rz:1.06,leaves:281,lean:.07},
    {name:'center front',x:.25,y:6.12,z:1.42,rx:1.27,ry:.83,rz:1.16,leaves:310,lean:-.06},
    {name:'left front',x:-1.20,y:5.96,z:1.12,rx:1.16,ry:.82,rz:1.08,leaves:285,lean:-.14},
    {name:'back shoulder',x:.19,y:6.78,z:-1.39,rx:1.19,ry:.85,rz:1.06,leaves:301,lean:.07}
  ];
  // Bring the whole canopy closer to the trunk's branching, matching the
  // reference's compact woody base-to-crown proportion. The nine crown lobes
  // keep their old relative positions, dimensions and leaf counts.
  const crownLowering=.62;
  crowns.forEach(c=>{c.y-=crownLowering;});
  // Four fine secondary branches are attached to actual bough ends only.
  // We deliberately avoid the original 15 trunk-to-tip spokes.
  const shoots=[
    [[-1.20,4.53,.18],[-1.50,4.91,.65],[-1.83,5.37,1.05]],
    [[-.85,5.48,-.38],[-1.22,6.13,.17],[-1.43,6.56,.72]],
    [[1.25,5.69,-.45],[1.68,5.88,.16],[2.00,6.10,.75]],
    [[.19,4.98,1.08],[.60,5.19,1.29],[1.10,5.60,1.44]]
  ];
  shoots.forEach((pts,i)=>tube('thin secondary wood '+i,pts,.069,.013,8));

    // REAL curved leaf blades on THREE separate layers, no solid canopy shell.
  // Their 9 non-rendered envelopes stay identical to 7/8 so this is a clean A/B.
  // Surface leaves are longer, narrower, sharply tapered and directionally
  // staggered; dark inner leaves remain visible between them.
  const deep=C('#102c20'),forest=C('#1c5035'),shade=C('#2c6742'),
    living=C('#447f4b'),spring=C('#78aa5e'),highlight=C('#b5d17c');
  const mix=(a,b,t)=>B.Color3.Lerp(a,b,clamp(t,0,1));
  const layerNames=['dark inner foliage','rich middle foliage','lit exterior foliage'];
  const batches=layerNames.map(name=>({name,positions:[],indices:[],colors:[],uvs:[]}));
  const GOLDEN_ANGLE=2.399963229728653;
  const layers=[
    {ratio:.28,radius:.59,length:.42,width:.122},
    {ratio:.43,radius:.80,length:.49,width:.133},
    {ratio:.70,radius:.96,length:.54,width:.125}
  ];
  function addLeaf(batch,base,growth,length,width,pigment,curve,asymmetry) {
    const {positions,indices,colors,uvs}=batch;
    const forward=growth.normalize();
    let side=B.Vector3.Cross(forward,V(.15+asymmetry,.92,.12)).normalize();
    if(side.lengthSquared()<.01)side=V(1,0,0);
    const lift=B.Vector3.Cross(side,forward).normalize();
    const first=positions.length/3;
    // Willow-like lanceolate blade: widest in its first third, then a long
    // thin tip. A raised midrib and subtle sideways curl keep it truly 3D.
    // Six stations = 20 two-sided triangles per leaf; mobile GPU budget safe.
    for(let k=0;k<=5;k++){
      const t=k/5;
      const taper=t<.36?Math.pow(t/.36,.74):Math.pow(Math.max(0,(1-t)/.64),.96);
      const w=width*taper*(1+.07*Math.sin(t*5+asymmetry*2));
      const spine=base.add(forward.scale(length*t))
        .add(lift.scale(length*(.08*Math.sin(Math.PI*t)+curve*t*t)))
        .add(side.scale(length*asymmetry*.07*Math.sin(t*Math.PI*.9)));
      const left=spine.subtract(side.scale(w*(.92+asymmetry*.11)));
      const right=spine.add(side.scale(w*(1.05-asymmetry*.14)));
      const raised=spine.add(lift.scale(w*.22));
      for(const q of [
        {p:left,c:mix(pigment,deep,.31),u:0},
        {p:raised,c:mix(pigment,highlight,.13+.16*t),u:.5},
        {p:right,c:mix(pigment,forest,.23),u:1}
      ]){
        positions.push(q.p.x,q.p.y,q.p.z);
        colors.push(q.c.r,q.c.g,q.c.b,1);uvs.push(q.u,t);
      }
    }
    for(let k=0;k<5;k++){
      const a=first+k*3,b=a+3;
      indices.push(a,a+1,b,a+1,b+1,b,a+1,a+2,b+1,a+2,b+2,b+1);
    }
  }
  let leafCount=0;
  crowns.forEach((g,ci)=>{
    const origin=V(g.x,g.y,g.z),phase=ci*1.61;
    for(let layer=0;layer<3;layer++){
      const setup=layers[layer],batch=batches[layer];
      const count=Math.round(g.leaves*setup.ratio);
      for(let i=0;i<count;i++){
        const cy=1-2*(i+.5)/count,az=i*GOLDEN_ANGLE+phase+layer*.77;
        const ring=Math.sqrt(Math.max(0,1-cy*cy));
        const n=V(ring*Math.cos(az),cy,ring*Math.sin(az));
        // Minor organic distortion to 3–4 lobes. It changes leaf position,
        // not the approved rounded nine-lobe outer envelope of the tree.
        const leafRipple=1+.036*Math.sin(az*3+ci*.81)+.024*Math.cos(az*5-ci);
        const droop=(ci===0||ci===4||ci===7)&&cy<-.12?-.09*(1-cy):0;
        const radial=setup.radius*leafRipple;
        const x=n.x*g.rx*radial,z=n.z*g.rz*radial;
        const y=n.y*g.ry*radial*(n.y<0?.82:1.02)+droop;
        const base=origin.add(V(x+g.lean*(1-n.y)*.13,y,z));
        const normal=V(n.x/g.rx,n.y/g.ry,n.z/g.rz).normalize();
        const down=V(g.lean*.4,-1,.06);
        let tangent=down.subtract(normal.scale(B.Vector3.Dot(down,normal)));
        if(tangent.lengthSquared()<.03)
          tangent=V(Math.cos(az+Math.PI/2),-.08,Math.sin(az+Math.PI/2));
        tangent=tangent.normalize();
        const lateral=B.Vector3.Cross(normal,tangent).normalize();
        const directionalVariation=(rand()-.5)*(layer===2?.85:.48);
        const direction=tangent.scale(layer===2?.59:.75)
          .add(normal.scale(layer===2?.43:.29))
          .add(lateral.scale(directionalVariation)).normalize();
        // Baked painterly shade pockets plus directional top light:
        // deep leaves stay forest-dark, center reads a rich mid-green,
        // upper/exposed tips catch restrained warm-green sunlight.
        const top=Math.max(0,normal.y);
        const towardLight=Math.max(0,-normal.x*.65+normal.z*.25+.35*normal.y);
        // Boundary AO: darken *actual* leaves wherever one lobe is recessed
        // into a neighbor. Pure one-time baked vertex color, no SSAO cost.
        let overlap=0;
        for(let other=0;other<crowns.length;other++){
          if(other===ci)continue;
          const h=crowns[other];
          const dx=(base.x-h.x)/h.rx,dy=(base.y-h.y)/h.ry,dz=(base.z-h.z)/h.rz;
          const d2=dx*dx+dy*dy+dz*dz;
          if(d2<1.20)overlap=Math.max(overlap,Math.min(.85,(1.20-d2)*1.35));
        }
        const pocket=Math.max(0,Math.sin(az*2.7+ci*.94)*Math.cos(cy*7.4));
        const underside=Math.max(0,-normal.y);
        let pigment;
        if(layer===0) pigment=mix(deep,forest,.16+.20*top+.12*rand());
        else if(layer===1) pigment=mix(forest,living,.29+.23*top+.17*towardLight+.11*rand());
        else {
          pigment=mix(living,spring,.30+.30*top+.20*towardLight+.14*rand());
          pigment=mix(pigment,shade,.04+.18*pocket);
          if(top>.55) pigment=mix(pigment,highlight,.08+.15*(top-.55));
        }
        // Darker undersides, recesses and intersections create depth without
        // flattening every visible blade into the same dark mass.
        const occlusion=clamp(overlap*.55+underside*(layer===2?.27:.35)
          +pocket*.10+(layer===0?.13:0),0,.75);
        pigment=mix(pigment,deep,occlusion);
        // Some individual darker leaves create a fractured, natural boundary
        // between adjacent crown lobes instead of a uniform bright pillow.
        if(layer===2&&(i+ci*7)%9===0)
          pigment=mix(pigment,forest,.36);
        const length=setup.length*(.80+rand()*.44)*(layer===2?1:.92);
        const width=setup.width*(.77+rand()*.41);
        addLeaf(batch,base,direction,length,width,pigment,(rand()-.5)*.14,
          (rand()-.5)*.50);
        leafCount++;
        // Sparse overlapping detail on the *same* local direction: noticeable
        // leaf layers without 7.0's dense wool-like even tessellation.
        // A sparse second leaf breaks the scalloped outline; below the
        // equator slightly drooping blades produce a natural leafy fringe.
        if(layer===2&&i%13===0){
          const edge=normal.y<.25;
          const smallBase=base.add(normal.scale(edge?.06:-.035))
            .add(lateral.scale(.085));
          const smallDir=direction.scale(.68)
            .add(lateral.scale(.24))
            .add(V(0,edge?-.16:.06,0)).normalize();
          addLeaf(batch,smallBase,smallDir,length*(edge?.83:.69),width*.78,
            mix(pigment,forest,.20),-.06,(rand()-.5)*.42);
          leafCount++;
        }
      }
    }
  });
  function finishBatch(batch,layer){
    const mesh=new B.Mesh('11.0 / '+batch.name,scene);
    const vd=new B.VertexData();
    vd.positions=batch.positions;vd.indices=batch.indices;
    vd.colors=batch.colors;vd.uvs=batch.uvs;vd.normals=[];
    B.VertexData.ComputeNormals(batch.positions,batch.indices,vd.normals);
    vd.applyToMesh(mesh);
    mesh.parent=treeRoot;mesh.useVertexColors=true;mesh.hasVertexAlpha=false;
    const mat=new B.StandardMaterial('painterly '+batch.name,scene);
    mat.diffuseColor=C(layer===0?'#d6e2cf':layer===1?'#e6eee0':'#faf8e9');
    mat.ambientColor=C(layer===0?'#152d22':layer===1?'#28452f':'#3b5739');
    mat.specularColor=C('#071b0d');mat.specularPower=15;
    mat.backFaceCulling=false;mat.twoSidedLighting=true;
    mesh.material=mat;
    return mesh;
  }
  const innerMesh=finishBatch(batches[0],0);
  const middleMesh=finishBatch(batches[1],1);
  const outerMesh=finishBatch(batches[2],2);
  const leavesMat=outerMesh.material;
  // Blades remain visibly separate, with no canopy sphere/pancake geometry.
  // Main branch/trunk still cast realistic shadows, while foliage shadows
  // are kept soft to avoid noisy artifacts on mobile.
  // Painted blossom geometry batched into ONE mesh, not hundreds of draw calls.
  const flowerPositions=[],flowerIndices=[],flowerColors=[];
  const cream=ART_DIRECTION.blossoms.map(C),gold=C('#e6bd79');
  let blossomCount=0;
  function flowerVertex(p,c){
    flowerPositions.push(p.x,p.y,p.z);
    flowerColors.push(c.r,c.g,c.b,1);
  }
  for(let i=0;i<10;i++){
    const g=crowns[i%5===0?2:i%3===0?4:6];
    const az=rand()*Math.PI*2,r=.55+rand()*.68;
    const p=V(g.x+Math.cos(az)*g.rx*r,g.y+(rand()-.5)*g.ry*1.6,g.z+Math.sin(az)*g.rz*r);
    const flowerTint=pick(cream);
    for(let a=0;a<5;a++){
      const t=a*Math.PI*2/5,dx=Math.sin(t),dz=Math.cos(t);
      const side=V(dz,0,-dx),out=V(dx,.15,dz);
      const start=flowerPositions.length/3;
      flowerVertex(p, B.Color3.Lerp(flowerTint,gold,.1));
      flowerVertex(p.add(out.scale(.12)).add(side.scale(.052)),flowerTint);
      flowerVertex(p.add(out.scale(.19)).add(V(0,.04,0)),B.Color3.Lerp(flowerTint,C('#fff4d6'),.17));
      flowerVertex(p.add(out.scale(.12)).subtract(side.scale(.052)),flowerTint);
      flowerIndices.push(start,start+1,start+2,start,start+2,start+3);
    }
    // Tiny raised pollen point: center of each five-petal flower.
    const start=flowerPositions.length/3;
    flowerVertex(p.add(V(-.035,.035,-.025)),gold);
    flowerVertex(p.add(V(.035,.035,-.025)),gold);
    flowerVertex(p.add(V(0,.075,.02)),gold);
    flowerIndices.push(start,start+1,start+2);
    blossomCount++;
  }
  const flowerMesh=new B.Mesh('batched sculpted coral blossom geometry',scene);
  const floralData=new B.VertexData();
  floralData.positions=flowerPositions;floralData.indices=flowerIndices;floralData.colors=flowerColors;
  floralData.normals=[];B.VertexData.ComputeNormals(flowerPositions,flowerIndices,floralData.normals);
  floralData.applyToMesh(flowerMesh);flowerMesh.useVertexColors=true;flowerMesh.hasVertexAlpha=false;
  flowerMesh.material=leavesMat;flowerMesh.parent=treeRoot;
  return {root:treeRoot,stats:{leaves:leafCount,blossoms:blossomCount,branches:boughs.length,clusters:crowns.length,triangles:Math.floor(batches.reduce((sum,b)=>sum+b.indices.length,0)/3),source:'9.0 leaf blades and nine-lobe silhouette lowered together; compact smooth trunk and forks'}};
}
