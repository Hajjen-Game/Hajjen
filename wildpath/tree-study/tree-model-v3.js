// Willowglow 3.0: sculpted layered leaf-mass architecture. No sphere crowns.
// Broad hand-shaped foliage volumes + curved exterior leaves, tuned for mobile.
export const ART_DIRECTION = Object.freeze({
  name: 'Willowglow — sculpted foliage study 3.0',
  foliage: ['#355d4c', '#577e5c', '#7aa36e', '#a6c78a', '#d2dea0'],
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
  // Unequal, overlapping foliage pavilions: designed as a connected silhouette,
  // without the 2.0 cloud of spiky, isolated leaves. The ratio rx:ry flattens
  // masses into soft leaf fans rather than balloon-shaped spheres.
  const crowns = [
    {x:-1.98,y:5.81,z:.12,rx:1.34,ry:.56,rz:1.16,n:61},
    {x:-1.70,y:6.67,z:-.59,rx:1.36,ry:.65,rz:1.12,n:64},
    {x:-.86,y:7.34,z:-.31,rx:1.50,ry:.59,rz:1.24,n:70},
    {x:.20,y:7.83,z:-.11,rx:1.55,ry:.65,rz:1.38,n:75},
    {x:1.49,y:7.30,z:-.46,rx:1.49,ry:.63,rz:1.25,n:70},
    {x:2.22,y:6.49,z:.20,rx:1.42,ry:.62,rz:1.16,n:65},
    {x:1.64,y:5.96,z:1.04,rx:1.32,ry:.58,rz:1.12,n:64},
    {x:.44,y:5.94,z:1.36,rx:1.48,ry:.57,rz:1.24,n:64},
    {x:-1.12,y:5.96,z:1.14,rx:1.31,ry:.58,rz:1.17,n:62},
    {x:.29,y:6.89,z:-1.25,rx:1.40,ry:.56,rz:1.09,n:66},
    {x:.20,y:6.90,z:1.00,rx:1.49,ry:.62,rz:1.36,n:77},
    {x:.42,y:8.33,z:.08,rx:.84,ry:.45,rz:.84,n:37}
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

  // Each canopy mass is a gently undulating sculpted shell with hand-colored
  // 3D volume. Its silhouette is scalloped in 5-7 uneven waves; flattened at
  // the top and fitted to an asymmetric crown shape, NOT a sphere primitive.
  const Cdark=C('#3e6651'),Cmid=C('#648d69'),Csun=C('#a8c889'),Ctip=C('#dce6b3');
  const massPositions=[],massIndices=[],massColors=[];
  function massVertex(p,c){massPositions.push(p.x,p.y,p.z);massColors.push(c.r,c.g,c.b,1);}
  const WIDTH_SEG=32,LAT_SEG=13;
  for(let ci=0;ci<crowns.length;ci++){
    const g=crowns[ci];
    const offset=massPositions.length/3,shift=ci*.81;
    for(let ti=0;ti<=LAT_SEG;ti++){
      const theta=Math.PI*ti/LAT_SEG;
      const ring=Math.sin(theta),height=Math.cos(theta);
      for(let ai=0;ai<=WIDTH_SEG;ai++){
        const phi=2*Math.PI*ai/WIDTH_SEG;
        const shape=1+.067*Math.sin(phi*5+shift)+.038*Math.cos(phi*7-shift*.7)+.035*Math.sin(phi*3+ci);
        const scallop=ring*shape;
        const p=V(
          g.x+g.rx*scallop*Math.cos(phi),
          g.y+g.ry*height*(height>0?.88:.66)+ring*.045*Math.sin(phi*4+shift),
          g.z+g.rz*scallop*Math.sin(phi));
        const sunFactor=Math.max(0,height);
        // Sides and undersides stay dark, with warmer illuminated top facets.
        let tone=B.Color3.Lerp(Cdark,Cmid,.24+.34*sunFactor);
        tone=B.Color3.Lerp(tone,Csun,Math.max(0,sunFactor)*(.20+.20*Math.sin(phi*2+shift)**2));
        tone=B.Color3.Lerp(tone,Ctip,Math.max(0,sunFactor)*.07);
        const v=.91+.07*Math.sin(phi*6.8+shift)+.035*Math.cos(theta*7+ci);
        massVertex(p,tone.scale(v));
      }
    }
    for(let ti=0;ti<LAT_SEG;ti++)for(let ai=0;ai<WIDTH_SEG;ai++){
      const a=offset+ti*(WIDTH_SEG+1)+ai,b=a+WIDTH_SEG+1;
      massIndices.push(a,b,a+1,a+1,b,b+1);
    }
  }
  const volume=new B.Mesh('sculpted foliage pavilions / connected painted masses',scene);
  const massData=new B.VertexData();massData.positions=massPositions;
  massData.indices=massIndices;massData.colors=massColors;massData.normals=[];
  B.VertexData.ComputeNormals(massPositions,massIndices,massData.normals);
  massData.applyToMesh(volume);volume.parent=treeRoot;
  volume.hasVertexAlpha=false;volume.useVertexColors=true;
  const canopyMat=new B.StandardMaterial('matte painted foliage mass / warm sculpted volumes',scene);
  canopyMat.diffuseColor=C('#fffdf0');canopyMat.specularColor=C('#101c12');
  canopyMat.ambientColor=C('#526c4e');canopyMat.backFaceCulling=false;
  canopyMat.twoSidedLighting=true;volume.material=canopyMat;
  // The large masses carry their own painted shade. Deliberately DO NOT cast
  // thousands of hard-edged shadow polygons onto the ground at mobile quality.
  // A blurred silhouette shadow is drawn as a separate soft decal in main.js.

  // Distinct raised, curved leaves decorate outer layers and break up the
  // chunky shell edges. Hundreds of leaves, rather than an all-spikes canopy.
  const positions=[],indices=[],colors=[],uvs=[];
  function leafVertex(p,c,uv){positions.push(p.x,p.y,p.z);colors.push(c.r,c.g,c.b,1);uvs.push(uv[0],uv[1]);}
  function blade(center,direction,length,width,color,twist){
    const f=direction.normalize();
    let side=B.Vector3.Cross(f,V(.1+twist,.9,.18)).normalize();
    if(side.lengthSquared()<.001)side=V(1,0,0);
    const n=B.Vector3.Cross(side,f).normalize();
    const base=positions.length/3;
    for(let j=0;j<=6;j++){
      const t=j/6;
      const spread=Math.sin(Math.PI*t)**.72*width;
      const spine=center.add(f.scale(length*t)).add(n.scale(.07*length*Math.sin(Math.PI*t)));
      const tint=B.Color3.Lerp(color,Ctip,t*.17);
      leafVertex(spine.subtract(side.scale(spread)),B.Color3.Lerp(tint,Cdark,.13),[0,t]);
      leafVertex(spine.add(n.scale(spread*.13)),B.Color3.Lerp(tint,Ctip,.16),[.5,t]);
      leafVertex(spine.add(side.scale(spread)),B.Color3.Lerp(tint,Cdark,.09),[1,t]);
    }
    for(let j=0;j<6;j++){
      const a=base+j*3,b=a+3;
      indices.push(a,a+1,b,a+1,b+1,b,a+1,a+2,b+1,a+2,b+2,b+1);
    }
  }
  let leafCount=0;
  for(let ci=0;ci<crowns.length;ci++){
    const g=crowns[ci],count=g.n;
    for(let li=0;li<count;li++){
      const phi=rand()*2*Math.PI,ct=2*rand()-1;
      const theta=Math.acos(ct);
      const radius=.72+.24*rand(),bulge=1+.06*Math.sin(phi*5+ci*.81);
      const center=V(
        g.x+g.rx*Math.sin(theta)*Math.cos(phi)*radius*bulge,
        g.y+g.ry*ct*(ct>0?.88:.66)*radius,
        g.z+g.rz*Math.sin(theta)*Math.sin(phi)*radius*bulge);
      const tangent=V(Math.cos(phi),-.16+(rand()-.5)*.50,Math.sin(phi));
      const lightness=Math.max(0,ct);
      const color=B.Color3.Lerp(Cmid,Csun,.20+.53*lightness+.16*rand());
      blade(center,tangent,.34+rand()*.25,.12+rand()*.085,color,(rand()-.5)*.9);
      leafCount++;
    }
  }
  const leafMesh=new B.Mesh('curved painted leaves / refined perimeter detail',scene);
  const vd=new B.VertexData();vd.positions=positions;vd.indices=indices;vd.colors=colors;vd.uvs=uvs;vd.normals=[];
  B.VertexData.ComputeNormals(positions,indices,vd.normals);
  vd.applyToMesh(leafMesh);leafMesh.parent=treeRoot;
  leafMesh.useVertexColors=true;leafMesh.hasVertexAlpha=false;
  const leavesMat=new B.StandardMaterial('matte leaflets with warm tips',scene);
  leavesMat.diffuseColor=C('#ffffff');leavesMat.ambientColor=C('#41563e');
  leavesMat.specularColor=C('#081109');leavesMat.backFaceCulling=false;
  leavesMat.twoSidedLighting=true;leafMesh.material=leavesMat;
  // Preserve branch/trunk real-time shadows while foliage is a shaded volume,
  // for a cleaner and more stable shadow on mobile.
  // Painted blossom geometry batched into ONE mesh, not hundreds of draw calls.
  const flowerPositions=[],flowerIndices=[],flowerColors=[];
  const cream=ART_DIRECTION.blossoms.map(C),gold=C('#e6bd79');
  let blossomCount=0;
  function flowerVertex(p,c){
    flowerPositions.push(p.x,p.y,p.z);
    flowerColors.push(c.r,c.g,c.b,1);
  }
  for(let i=0;i<32;i++){
    const g=crowns[i%5===0?3:i%3===0?4:11];
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
  return {root:treeRoot,stats:{leaves:leafCount,blossoms:blossomCount,branches:boughs.length,clusters:crowns.length,source:'Layered hand-sculpted canopy, no external model'}};
}
