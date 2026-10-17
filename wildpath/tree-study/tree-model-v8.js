// Willowglow 8.0: LEAF LAYERING & RICHER SHADING.
// Retain the successful non-rendered 7.0 silhouette envelopes while giving
// every lobe genuine deep, middle and exposed leaf layers and natural leaf shapes.
// Zero solid canopy blobs, billboard leaves, purchased textures or new engines.
export const ART_DIRECTION = Object.freeze({
  name: 'Willowglow — leaf layering and richer shading 8.0',
  foliage: ['#1c432e', '#306547', '#538a50', '#7bad65', '#afd081'],
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
  bark.diffuseColor = C('#a77d68');
  bark.specularColor = C('#16110c');
  bark.specularPower = 20;
  const barkCanvas = new B.DynamicTexture('bark grain / artist brushstrokes', {width:512,height:512}, scene, false);
  const barkCtx = barkCanvas.getContext();
  barkCtx.fillStyle = '#865844';
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
  // Four fine secondary branches are attached to actual bough ends only.
  // We deliberately avoid the original 15 trunk-to-tip spokes.
  const shoots=[
    [[-1.16,5.17,.14],[-1.66,5.52,.85],[-1.92,5.91,1.14]],
    [[-1.03,6.40,-.41],[-1.32,6.88,.29],[-1.46,7.23,.72]],
    [[1.36,6.13,-.48],[1.77,6.39,.27],[2.09,6.69,.83]],
    [[.21,5.69,1.12],[.72,5.87,1.31],[1.21,6.20,1.45]]
  ];
  shoots.forEach((pts,i)=>tube('hidden curved secondary twig '+i,pts,.080,.017,7));

  // THREE leaf depths are real geometry, not a hidden green volume. Shaded
  // undergrowth fills deep pockets; a mid-layer defines overlapping blades;
  // sun-facing surface leaves provide the readable leaf tips in the reference.
  // The nine non-rendered crown guides are intentionally unchanged from 7.0.
  const deep=C('#183a2a'),forest=C('#26583b'),shade=C('#386e45'),
    living=C('#538950'),spring=C('#81af65'),highlight=C('#b4d084');
  const mix=(a,b,t)=>B.Color3.Lerp(a,b,clamp(t,0,1));
  const layerNames=['dark inner foliage','rich middle foliage','lit exterior foliage'];
  const batches=layerNames.map(name=>({name,positions:[],indices:[],colors:[],uvs:[]}));
  const GOLDEN_ANGLE=2.399963229728653;
  const layers=[
    {ratio:.24,radius:.58,length:.40,width:.131},
    {ratio:.37,radius:.80,length:.45,width:.149},
    {ratio:.78,radius:.96,length:.46,width:.154}
  ];
  function addLeaf(batch,base,growth,length,width,pigment,curve,asymmetry) {
    const {positions,indices,colors,uvs}=batch;
    const forward=growth.normalize();
    let side=B.Vector3.Cross(forward,V(.15+asymmetry,.92,.12)).normalize();
    if(side.lengthSquared()<.01)side=V(1,0,0);
    const lift=B.Vector3.Cross(side,forward).normalize();
    const first=positions.length/3;
    // Real curved surface, raised center rib, asymmetric margins and a
    // gracefully swept, tapered tip. Not a single flat leaf quad.
    for(let k=0;k<=5;k++){
      const t=k/5;
      const taper=Math.pow(Math.sin(Math.PI*t),.68);
      const w=width*taper*(1+.06*Math.sin(t*4+asymmetry*2));
      const spine=base.add(forward.scale(length*t))
        .add(lift.scale(length*(.064*Math.sin(Math.PI*t)+curve*t*t)));
      const left=spine.subtract(side.scale(w*(.93+asymmetry*.13)));
      const right=spine.add(side.scale(w*(1.04-asymmetry*.12)));
      const raised=spine.add(lift.scale(w*.15));
      for(const q of [
        {p:left,c:mix(pigment,deep,.17),u:0},
        {p:raised,c:mix(pigment,highlight,.13+.13*t),u:.5},
        {p:right,c:mix(pigment,forest,.12),u:1}
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
        const leafRipple=1+.031*Math.sin(az*3+ci*.81)+.019*Math.cos(az*5-ci);
        const droop=(ci===0||ci===4||ci===7)&&cy<-.12?-.08*(1-cy):0;
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
        const directionalVariation=(rand()-.5)*(layer===2?.70:.40);
        const direction=tangent.scale(layer===2?.60:.77)
          .add(normal.scale(layer===2?.37:.25))
          .add(lateral.scale(directionalVariation)).normalize();
        // Baked painterly shade pockets plus directional top light:
        // deep leaves stay forest-dark, center reads a rich mid-green,
        // upper/exposed tips catch restrained warm-green sunlight.
        const top=Math.max(0,normal.y);
        const towardLight=Math.max(0,-normal.x*.65+normal.z*.25+.35*normal.y);
        const pocket=Math.max(0,Math.sin(az*2.7+ci*.94)*Math.cos(cy*7.4));
        let pigment;
        if(layer===0) pigment=mix(deep,forest,.24+.23*top+.15*rand());
        else if(layer===1) pigment=mix(forest,living,.36+.28*top+.14*towardLight+.10*rand());
        else {
          pigment=mix(living,spring,.22+.34*top+.20*towardLight+.10*rand());
          pigment=mix(pigment,shade,.10+.18*pocket);
          if(top>.44) pigment=mix(pigment,highlight,.05+.15*(top-.44));
        }
        // Some individual darker leaves create a fractured, natural boundary
        // between adjacent crown lobes instead of a uniform bright pillow.
        if(layer===2&&(i+ci*7)%11===0)
          pigment=mix(pigment,forest,.33);
        const length=setup.length*(.81+rand()*.38)*(layer===2?1:0.91);
        const width=setup.width*(.85+rand()*.34);
        addLeaf(batch,base,direction,length,width,pigment,(rand()-.5)*.14,
          (rand()-.5)*.50);
        leafCount++;
        // Sparse overlapping detail on the *same* local direction: noticeable
        // leaf layers without 7.0's dense wool-like even tessellation.
        if(layer===2&&i%9===0){
          const smallBase=base.subtract(normal.scale(.068))
            .add(lateral.scale(.09));
          const smallDir=direction.scale(.85).add(lateral.scale(.22)).normalize();
          addLeaf(batch,smallBase,smallDir,length*.68,width*.75,
            mix(pigment,forest,.21),-.05,(rand()-.5)*.38);
          leafCount++;
        }
      }
    }
  });
  function finishBatch(batch,layer){
    const mesh=new B.Mesh('8.0 / '+batch.name,scene);
    const vd=new B.VertexData();
    vd.positions=batch.positions;vd.indices=batch.indices;
    vd.colors=batch.colors;vd.uvs=batch.uvs;vd.normals=[];
    B.VertexData.ComputeNormals(batch.positions,batch.indices,vd.normals);
    vd.applyToMesh(mesh);
    mesh.parent=treeRoot;mesh.useVertexColors=true;mesh.hasVertexAlpha=false;
    const mat=new B.StandardMaterial('painterly '+batch.name,scene);
    mat.diffuseColor=C(layer===0?'#e5f1de':'#fffaf0');
    mat.ambientColor=C(layer===0?'#223b29':layer===1?'#385238':'#4a6841');
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
  return {root:treeRoot,stats:{leaves:leafCount,blossoms:blossomCount,branches:boughs.length,clusters:crowns.length,triangles:Math.floor(batches.reduce((sum,b)=>sum+b.indices.length,0)/3),source:'Silhouette-guided real leaves in three shaded layers; no crown fillers'}};
}
