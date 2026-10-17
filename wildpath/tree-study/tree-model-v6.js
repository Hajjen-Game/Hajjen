// Willowglow 6.0: organic foliage grown along gently drooping branchlets.
// Nine overlapping natural crowns; no repeated radial rosettes or solid green blobs.
export const ART_DIRECTION = Object.freeze({
  name: 'Willowglow — organic foliage massing 6.0',
  foliage: ['#214732', '#336c48', '#55965a', '#83b66d', '#b4d68a'],
  blossoms: ['#f6d7c0', '#ffe9cc', '#efb8bb'],
  bark: '#815744'
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

  const bark = new B.StandardMaterial('warm painted bark', scene);
  bark.diffuseColor = C('#b58b72');
  bark.specularColor = C('#16110c');
  bark.specularPower = 20;
  const barkCanvas = new B.DynamicTexture('bark grain / artist brushstrokes', {width:512,height:512}, scene, false);
  const barkCtx = barkCanvas.getContext();
  barkCtx.fillStyle = '#95634e';
  barkCtx.fillRect(0,0,512,512);
  // Fine parallel strokes and soft pale ridges make bark read at game distance.
  for (let i=0; i<300; i++) {
    const x = rand()*512, y = rand()*512, len = 14+rand()*155;
    barkCtx.strokeStyle = rand()<.50 ? 'rgba(65,36,30,'+(0.06+rand()*.16)+')' :
      'rgba(241,198,139,'+(0.05+rand()*.16)+')';
    barkCtx.lineWidth = 1+rand()*4;
    barkCtx.beginPath(); barkCtx.moveTo(x,y);
    barkCtx.bezierCurveTo(x+8*(rand()-.5),y+len*.35,x+12*(rand()-.5),y+len*.7,x+10*(rand()-.5),y+len);
    barkCtx.stroke();
  }
  barkCanvas.update();
  bark.diffuseTexture=barkCanvas;
  bark.backFaceCulling=true;

  function tube(name, points, startRadius, endRadius, tessellation=12) {
    const path = B.Curve3.CreateCatmullRomSpline(points.map(p=>V(...p)),8,false).getPoints();
    const mesh = B.MeshBuilder.CreateTube(name,{
      path, tessellation, cap:B.Mesh.CAP_ALL,
      radiusFunction:(i)=>startRadius+(endRadius-startRadius)*Math.pow(i/Math.max(1,path.length-1),.82)
    },scene);
    mesh.material=bark; mesh.parent=treeRoot; mesh.isPickable=false;
    shadows?.addShadowCaster(mesh);
    return mesh;
  }

  // Distinct root buttresses and a curved asymmetrical trunk.
  tube('continuous tapered trunk',[
    [0,-.05,0],[-.08,.85,.08],[-.19,1.9,-.10],[-.11,3.16,-.20],
    [.16,4.29,-.07],[.22,5.28,-.06]
  ],.49,.16,16);
  const roots = [
    [[-.05,.40,.12],[-.57,.21,.24],[-.95,.10,.40],[-1.15,.02,.58]],
    [[.09,.38,-.14],[.48,.22,-.54],[.8,.09,-.84]],
    [[.23,.38,.11],[.68,.17,.31],[.99,.08,.42]],
    [[-.15,.36,-.12],[-.47,.16,-.61],[-.55,.04,-.98]]
  ];
  roots.forEach((p,i)=>tube('sculpted root '+(i+1),p,.15,.025,8));

  // Six major branches, not fifteen straight spikes. Deliberate branching
  // gives a readable fork silhouette when camera rotates down to eye level.
  const boughs = [
    {name:'left lower',points:[[.00,3.50,.02],[-.40,4.12,.05],[-1.05,4.95,.22],[-1.83,5.90,.20]],a:.24,b:.048},
    {name:'left high',points:[[-.05,4.10,-.04],[-.40,5.02,-.17],[-.80,6.35,-.46],[-1.11,7.42,-.32]],a:.21,b:.040},
    {name:'center crown',points:[[.12,4.55,-.08],[.17,5.65,-.22],[.24,6.67,-.35],[.34,7.85,-.21]],a:.21,b:.041},
    {name:'right high',points:[[.13,4.06,-.08],[.72,5.01,-.28],[1.16,6.13,-.49],[1.73,7.20,-.50]],a:.23,b:.045},
    {name:'right low',points:[[.15,3.64,.06],[.72,4.42,.29],[1.55,5.10,.55],[2.13,6.23,.72]],a:.25,b:.048},
    {name:'front sheltered',points:[[-.06,3.93,.10],[.08,4.72,.69],[.18,5.45,1.24],[.34,6.40,1.65]],a:.18,b:.039}
  ];
  for(const b of boughs)tube('sculpted main bough / '+b.name,b.points,b.a,b.b,11);
  // Nine recognizable but naturally interlocking crowns: overlapping foliage
  // edges unite the canopy; asymmetrical silhouettes prevent nine discrete
  // flower heads. Cluster-specific inclination and density are art-directed.
  const crowns = [
    {name:'west hanging', x:-2.18,y:5.84,z:.25,rx:1.22,ry:.84,rz:1.05,sprays:20,sweep:-.25,hang:.34},
    {name:'west canopy',  x:-1.58,y:6.93,z:-.48,rx:1.17,ry:.91,rz:1.08,sprays:23,sweep:-.18,hang:.13},
    {name:'highest',      x:-.26,y:8.05,z:-.15,rx:1.26,ry:.91,rz:1.19,sprays:26,sweep:.09,hang:.04},
    {name:'sunward upper',x:1.28,y:7.49,z:-.39,rx:1.27,ry:.82,rz:1.15,sprays:23,sweep:.23,hang:.08},
    {name:'east hanging', x:2.27,y:6.47,z:.30,rx:1.25,ry:.85,rz:1.07,sprays:21,sweep:.28,hang:.31},
    {name:'east front',   x:1.53,y:5.82,z:1.07,rx:1.25,ry:.79,rz:1.08,sprays:22,sweep:.19,hang:.29},
    {name:'front center', x:.20,y:6.10,z:1.43,rx:1.25,ry:.82,rz:1.10,sprays:23,sweep:-.04,hang:.25},
    {name:'west front',   x:-1.28,y:5.94,z:1.07,rx:1.20,ry:.85,rz:1.07,sprays:22,sweep:-.20,hang:.21},
    {name:'back shoulder',x:.28,y:6.89,z:-1.32,rx:1.16,ry:.86,rz:1.08,sprays:21,sweep:.10,hang:.11}
  ];
  // Four fine secondary branches are attached to actual bough ends only.
  // We deliberately avoid the original 15 trunk-to-tip spokes.
  const shoots=[
    [[-1.16,5.17,.14],[-1.66,5.52,.85],[-1.92,5.91,1.14]],
    [[-1.03,6.40,-.41],[-1.32,6.88,.29],[-1.46,7.23,.72]],
    [[1.36,6.13,-.48],[1.77,6.39,.27],[2.09,6.69,.83]],
    [[.21,5.69,1.12],[.72,5.87,1.31],[1.21,6.20,1.45]]
  ];
  shoots.forEach((pts,i)=>tube('hidden curved secondary twig '+i,pts,.080,.017,7));

  // Biology-inspired foliage: leaves follow small curved twigs and form
  // staggered alternate pairs along each growth axis. In contrast to 5.0,
  // absolutely no circular/radial "flower-head" arrangement is generated.
  const shadePositions=[],shadeIndices=[],shadeColors=[],shadeUvs=[];
  const litPositions=[],litIndices=[],litColors=[],litUvs=[];
  const deepest=C('#1e4331'),forest=C('#306747'),
    living=C('#568f54'),olive=C('#82b36b'),sunlit=C('#b6d58e');
  const blend=(a,b,t)=>B.Color3.Lerp(a,b,clamp(t,0,1));
  const norm=(x,y,z)=>V(x,y,z).normalize();
  function buildLeaf(batch,base,direction,length,width,baseColor,hang,curl) {
    const [positions,indices,colors,uvs]=batch;
    const f=direction.normalize();
    let right=B.Vector3.Cross(f,V(.14+curl,.85,.2)).normalize();
    if(right.lengthSquared()<.008)right=V(1,0,0);
    const lift=B.Vector3.Cross(right,f).normalize();
    const first=positions.length/3;
    const divisions=5;
    for(let j=0;j<=divisions;j++){
      const t=j/divisions;
      const envelope=Math.sin(Math.PI*t)**.78;
      const half=width*envelope*(.91+.12*Math.sin(t*3.4));
      const midrib=base.add(f.scale(length*t))
        .add(lift.scale(.06*length*Math.sin(Math.PI*t)))
        .add(V(0,-hang*length*t*t,0));
      const edgeShade=blend(baseColor,deepest,.12+.04*(1-t));
      const midHighlight=blend(baseColor,sunlit,.10+.14*t);
      for(const [pos,color,u] of [
        [midrib.subtract(right.scale(half)),edgeShade,0],
        [midrib.add(lift.scale(half*.12)),midHighlight,.5],
        [midrib.add(right.scale(half)),blend(baseColor,forest,.07),1]
      ]){ positions.push(pos.x,pos.y,pos.z);colors.push(color.r,color.g,color.b,1);uvs.push(u,t);}
    }
    for(let j=0;j<divisions;j++){
      const a=first+3*j,b=a+3;
      indices.push(a,a+1,b,a+1,b+1,b,a+1,a+2,b+1,a+2,b+2,b+1);
    }
  }
  const darkBatch=[shadePositions,shadeIndices,shadeColors,shadeUvs];
  const brightBatch=[litPositions,litIndices,litColors,litUvs];
  let leafCount=0,sprayCount=0;
  const PHI=2.399963229728653;
  // Build each twig as a staggered sequence of leafy nodes. Each neighboring
  // node points the leaf pair in a related direction, with gentle droop.
  function leafyTwig(crown,anchor,toward,brightness,twist,layer) {
    let sideways=B.Vector3.Cross(toward,V(0,1,.03)).normalize();
    if(sideways.lengthSquared()<.01)sideways=V(1,0,0);
    const up=B.Vector3.Cross(sideways,toward).normalize();
    const sideBias=(rand()-.5)*.17;
    const extent=.78+rand()*.27;
    const isBright=brightness>.45;
    const batch=isBright?brightBatch:darkBatch;
    const tilt=crown.hang*(.25+.74*(1-layer));
    const rootColor=isBright
      ?blend(living,olive,clamp(.26+brightness*.45+(rand()-.5)*.16,0,1))
      :blend(deepest,forest,.24+.25*rand());
    // Leaves attached alternatingly along a curving twig: non-radial.
    const nodes=5+(sprayCount%2);
    for(let node=0;node<nodes;node++){
      const progress=(node+.46)/(nodes+.50);
      const curved=anchor.add(toward.scale(extent*progress))
        .add(sideways.scale(sideBias*Math.sin(Math.PI*progress)))
        .add(V(0,-.11*tilt*progress*progress,0));
      const stagger=(node%2===0?1:-1);
      const angleOffset=(rand()-.5)*.28+twist*.2;
      const naturalSide=sideways.scale(stagger*(.70+rand()*.28))
        .add(up.scale(.23+angleOffset));
      const leafGrowth=toward.scale(.53+rand()*.18)
        .add(naturalSide.scale(.76))
        .add(V(0,-tilt*.60,0)).normalize();
      const tint=blend(rootColor,olive,Math.max(0,.10*(progress+.5)+brightness*.11));
      buildLeaf(batch,curved,leafGrowth,
        .39+rand()*.15,.105+rand()*.053,tint,tilt*.31,(rand()-.5)*.28);
      leafCount++;
      // A smaller secondary leaf beside the alternation makes richer
      // *non-symmetric* bunches without creating a many-petal star.
      const smallerDir=toward.scale(.71)
        .add(naturalSide.scale(-.51))
        .add(V(0,-tilt*.39,0)).normalize();
      buildLeaf(batch,curved.add(up.scale(.025)),smallerDir,
        .29+rand()*.10,.083+rand()*.032,
        blend(tint,forest,.09),tilt*.34,(rand()-.5)*.22);
      leafCount++;
    }
    // One hanging terminal leaf at the end rather than an even radial fan.
    const tip=anchor.add(toward.scale(extent)).add(V(0,-.10*tilt,0));
    const finish=toward.add(V(0,-.14-tilt*.75,0)).normalize();
    buildLeaf(batch,tip,finish,.37+rand()*.13,.115,
      blend(rootColor,olive,.13),tilt*.50,twist*.2);
    leafCount++;sprayCount++;
  }

  crowns.forEach((g,ci)=>{
    const center=V(g.x,g.y,g.z);
    const phase=ci*1.71;
    // Laced, darker inner sprigs, arranged in depth layers, not a black blob.
    for(let inner=0;inner<7;inner++){
      const a=phase+inner*PHI;
      const y=(inner%3-1)*.19;
      const root=center.add(V(Math.cos(a)*g.rx*.27,y,Math.sin(a)*g.rz*.27));
      const aim=norm(Math.cos(a)*.58,.16+(rand()-.5)*.24,Math.sin(a)*.58);
      leafyTwig(g,root,aim,.10,(rand()-.5),.28);
    }
    // Distributed asymmetrically through different 3D radial layers.
    // Cluster outlines overlap slightly, but do not become separate balls.
    for(let p=0;p<g.sprays;p++){
      const theta=p*PHI+phase;
      const cy=1-2*((p+.5)/g.sprays);
      const radius=Math.sqrt(Math.max(.03,1-cy*cy));
      const orientation=norm(Math.cos(theta)*radius,cy,Math.sin(theta)*radius);
      const layer=p%4===0?.39:p%4===1?.63:.82;
      const place=center.add(V(
        orientation.x*g.rx*layer,
        orientation.y*g.ry*layer,
        orientation.z*g.rz*layer));
      // Gentle common prevailing sweep, branches get heavier downward.
      const heading=norm(
        orientation.x*.67+g.sweep*.30+(rand()-.5)*.18,
        .26+orientation.y*.32-g.hang*.18+(rand()-.5)*.14,
        orientation.z*.67+(rand()-.5)*.17);
      const brightness=clamp(.16+.36*layer+.31*Math.max(0,orientation.y)
        +.17*Math.max(0,-orientation.x)+rand()*.12,0,1);
      leafyTwig(g,place,heading,brightness,(rand()-.5),layer);
    }
    // A small non-repeating pendant fringe defines gravity and silhouette.
    for(let j=0;j<5;j++){
      const a=phase+j*Math.PI*2/5+(rand()-.5)*.45;
      const root=center.add(V(Math.cos(a)*g.rx*.78,
        g.ry*(-.24+(rand()-.5)*.23),Math.sin(a)*g.rz*.80));
      const aim=norm(Math.cos(a)*.65,-.19-g.hang*.39,Math.sin(a)*.67);
      leafyTwig(g,root,aim,.45,(rand()-.5),.91);
    }
  });

  function createBatch(name,positions,indices,colors,uvs){
    const mesh=new B.Mesh(name,scene),data=new B.VertexData();
    data.positions=positions;data.indices=indices;data.colors=colors;data.uvs=uvs;
    data.normals=[];B.VertexData.ComputeNormals(positions,indices,data.normals);
    data.applyToMesh(mesh);
    mesh.parent=treeRoot;mesh.useVertexColors=true;mesh.hasVertexAlpha=false;
    const mat=new B.StandardMaterial('matte leaves / '+name,scene);
    mat.diffuseColor=C('#ffffff');
    mat.ambientColor=name.includes('interior')?C('#253b2d'):C('#496c42');
    mat.specularColor=C('#0d1c10');mat.specularPower=14;
    mat.backFaceCulling=false;mat.twoSidedLighting=true;
    mesh.material=mat;
    return mesh;
  }
  const innerLeaves=createBatch('shaded hanging undergrowth / leaf twigs',
    shadePositions,shadeIndices,shadeColors,shadeUvs);
  const litLeaves=createBatch('natural sunlit layered foliage / leaf twigs',
    litPositions,litIndices,litColors,litUvs);
  const leavesMat=litLeaves.material;
  // Canopy uses neutral soft shadow decal; real branches and trunk cast shadow.
  // Painted blossom geometry batched into ONE mesh, not hundreds of draw calls.
  const flowerPositions=[],flowerIndices=[],flowerColors=[];
  const cream=ART_DIRECTION.blossoms.map(C),gold=C('#e6bd79');
  let blossomCount=0;
  function flowerVertex(p,c){
    flowerPositions.push(p.x,p.y,p.z);
    flowerColors.push(c.r,c.g,c.b,1);
  }
  for(let i=0;i<14;i++){
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
  return {root:treeRoot,stats:{leaves:leafCount,blossoms:blossomCount,branches:boughs.length,clusters:crowns.length,fans:sprayCount,triangles:Math.floor((shadeIndices.length+litIndices.length)/3),source:'Organic twig foliage, original procedural geometry, no external assets'}};
}
