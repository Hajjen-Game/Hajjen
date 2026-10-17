// Willowglow 4.0: botanically layered foliage fans made from real curved leaves.
// Built on Tree Study 2.0 trunk and six boughs. No solid canopy spheres/slabs.
export const ART_DIRECTION = Object.freeze({
  name: 'Willowglow — layered sculpted leaf clusters 4.0',
  foliage: ['#284b35', '#3f7449', '#66a45d', '#91c67c', '#c1e39d'],
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
  // Ten large, asymmetrical branch-supported foliage bouquets.
  // Unlike v3's solid flattened blobs, EVERY visible part of the crown is
  // composed of real sculpted leaves with overlapping light/dark layers.
  const crowns = [
    {x:-2.15,y:5.94,z:.17,rx:1.23,ry:.92,rz:1.13,patches:18},
    {x:-1.77,y:6.79,z:-.66,rx:1.20,ry:.91,rz:1.17,patches:18},
    {x:-.72,y:7.56,z:-.24,rx:1.28,ry:1.00,rz:1.24,patches:20},
    {x:.41,y:8.04,z:-.13,rx:1.38,ry:1.02,rz:1.32,patches:22},
    {x:1.55,y:7.50,z:-.53,rx:1.26,ry:.90,rz:1.24,patches:19},
    {x:2.20,y:6.59,z:.25,rx:1.26,ry:.89,rz:1.10,patches:19},
    {x:1.70,y:5.95,z:1.08,rx:1.16,ry:.85,rz:1.11,patches:17},
    {x:.36,y:5.97,z:1.46,rx:1.32,ry:.89,rz:1.22,patches:20},
    {x:-1.17,y:5.96,z:1.22,rx:1.15,ry:.91,rz:1.11,patches:18},
    {x:.09,y:6.91,z:-1.35,rx:1.28,ry:.87,rz:1.08,patches:20}
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

  // Bespoke three-dimensional leaf blade. Raised midrib, thick-looking curl,
  // scalloped silhouette, and tapered pointed tip. The color progression
  // tracks actual positions within each crown (interior -> sunlit exterior).
  // One Babylon mesh for *all* leaves: no draw-call storm on Android.
  const positions=[],indices=[],colors=[],uvs=[];
  const darkest=C('#214e37'),shade=C('#356c45'),
        mid=C('#5a9a58'),outer=C('#85c174'),
        warm=C('#c3e09b'),tip=C('#d8e7a8');
  const mix=(a,b,t)=>B.Color3.Lerp(a,b,Math.max(0,Math.min(1,t)));
  function vertex(position,color,u,v){
    positions.push(position.x,position.y,position.z);
    colors.push(color.r,color.g,color.b,1);
    uvs.push(u,v);
  }
  function leaf(start,growth,length,width,baseShade,fold,jitter){
    const d=growth.normalize();
    let side=B.Vector3.Cross(d,V(.16+jitter,.83,.24)).normalize();
    if(side.lengthSquared()<.01)side=V(1,0,0);
    const lift=B.Vector3.Cross(side,d).normalize();
    const first=positions.length/3;
    const slices=6;
    // Expanded near the mid-leaf with a gently curled tip and central vein.
    for(let i=0;i<=slices;i++){
      const t=i/slices;
      const shape=Math.pow(Math.sin(Math.PI*t),.68)*(1+.10*Math.sin(t*3.6));
      const halfWidth=width*shape;
      const spine=start.add(d.scale(length*t))
        .add(lift.scale(length*(.075*Math.sin(Math.PI*t)+fold*t*t)));
      const shadow=mix(baseShade,darkest,.15+.05*(1-t));
      const lit=mix(baseShade,warm,.09+.17*t);
      vertex(spine.subtract(side.scale(halfWidth)),shadow,0,t);
      vertex(spine.add(lift.scale(halfWidth*.13)),lit,.5,t);
      vertex(spine.add(side.scale(halfWidth)),mix(baseShade,shade,.09),1,t);
    }
    for(let i=0;i<slices;i++){
      const a=first+3*i,b=a+3;
      indices.push(a,a+1,b,a+1,b+1,b,a+1,a+2,b+1,a+2,b+2,b+1);
    }
  }

  const unit=(x,y,z)=>V(x,y,z).normalize();
  let leafCount=0, fanCount=0;
  crowns.forEach((g,ci)=>{
    const origin=V(g.x,g.y,g.z);
    // Alternate between recessed shadowed clusters and upper warm, bright fans.
    // Each radial spray is its OWN 3D bundle, never a flat disk or a shell.
    for(let p=0;p<g.patches;p++){
      const shellTheta=Math.acos(2*rand()-1),phi=rand()*Math.PI*2;
      const shell=unit(
        Math.sin(shellTheta)*Math.cos(phi),
        Math.cos(shellTheta),
        Math.sin(shellTheta)*Math.sin(phi));
      const layer=p%4===0?.36:p%4===1?.56:p%4===2?.77:.90;
      const fanCenter=origin.add(V(shell.x*g.rx*layer,shell.y*g.ry*layer,shell.z*g.rz*layer));
      const upness=Math.max(0,shell.y);
      const darkness=p%4===0?.16:p%4===1?.33:p%4===2?.55:.73;
      // Characterful broad-leaf rosettes grow from branching junctions.
      const rosetteAxis=unit(shell.x*.62+(rand()-.5)*.4,
        .28+upness*.38+(rand()-.5)*.3,
        shell.z*.62+(rand()-.5)*.4);
      let tangent=B.Vector3.Cross(rosetteAxis,V(0,1,.02)).normalize();
      if(tangent.lengthSquared()<.01)tangent=V(1,0,0);
      const bitangent=B.Vector3.Cross(rosetteAxis,tangent).normalize();
      const fanSize=12+(p%3);
      const fanRotation=rand()*Math.PI*2;
      for(let k=0;k<fanSize;k++){
        const angle=fanRotation+2*Math.PI*k/fanSize+(rand()-.5)*.38;
        const az=tangent.scale(Math.cos(angle)).add(bitangent.scale(Math.sin(angle)));
        const growth=rosetteAxis.scale(.49+rand()*.16)
          .add(az.scale(.55+rand()*.37)).normalize();
        const start=fanCenter.add(az.scale(.07+rand()*.14))
          .add(rosetteAxis.scale((k%3===0?-.09:.045)));
        const tone=darkness+.16*upness+rand()*.25;
        const base=tone<.38?mix(darkest,shade,tone*1.3)
         :tone<.68?mix(shade,mid,(tone-.32)*2.0)
         :mix(mid,outer,(tone-.62)*2.15);
        const tipTint=mix(base,outer,.07+Math.max(0,upness)*.1);
        leaf(start,growth,.38+rand()*.21,.112+rand()*.075,tipTint,
          (rand()-.5)*.19,(rand()-.5)*.75);
        leafCount++;
      }
      fanCount++;
    }
    // A sparse fringe of offset leaves breaks any artificial bouquet outline.
    // Their shape is individually curved and their tips point away from center.
    for(let fringe=0;fringe<28;fringe++){
      const angle=rand()*Math.PI*2,cy=rand()*1.8-.75,span=Math.sqrt(Math.max(.02,1-cy*cy));
      const shell=unit(span*Math.cos(angle),cy,span*Math.sin(angle));
      const start=origin.add(V(shell.x*g.rx*.85,shell.y*g.ry*.81,shell.z*g.rz*.85));
      const aim=unit(shell.x+.22*(rand()-.5),.09+shell.y*.65,shell.z+.22*(rand()-.5));
      const pigment=mix(mid,outer,.35+.3*Math.max(0,cy)+rand()*.25);
      leaf(start,aim,.44+rand()*.29,.10+rand()*.08,pigment,.06,(rand()-.5)*.8);
      leafCount++;
    }
  });

  const leafMesh=new B.Mesh('Willowglow 4.0 / layered individually sculpted leaves',scene);
  const vd=new B.VertexData();vd.positions=positions;vd.indices=indices;
  vd.colors=colors;vd.uvs=uvs;vd.normals=[];
  B.VertexData.ComputeNormals(positions,indices,vd.normals);
  vd.applyToMesh(leafMesh);
  leafMesh.parent=treeRoot;leafMesh.useVertexColors=true;
  leafMesh.hasVertexAlpha=false;
  const leavesMat=new B.StandardMaterial('multi-layer painted broadleaf foliage',scene);
  leavesMat.diffuseColor=C('#ffffff');
  leavesMat.ambientColor=C('#314b35');
  leavesMat.specularColor=C('#0c1c10');
  leavesMat.specularPower=22;
  leavesMat.backFaceCulling=false;
  leavesMat.twoSidedLighting=true;
  leafMesh.material=leavesMat;
  // No high-frequency shadow-map alpha pattern on ground: in 4.0 a calibrated,
  // neutral-colored soft canopy shadow provides contact depth. Branches cast.
  // Painted blossom geometry batched into ONE mesh, not hundreds of draw calls.
  const flowerPositions=[],flowerIndices=[],flowerColors=[];
  const cream=ART_DIRECTION.blossoms.map(C),gold=C('#e6bd79');
  let blossomCount=0;
  function flowerVertex(p,c){
    flowerPositions.push(p.x,p.y,p.z);
    flowerColors.push(c.r,c.g,c.b,1);
  }
  for(let i=0;i<42;i++){
    const g=crowns[i%5===0?3:i%3===0?4:7];
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
  return {root:treeRoot,stats:{leaves:leafCount,blossoms:blossomCount,branches:boughs.length,clusters:crowns.length,fans:fanCount,triangles:Math.floor(indices.length/3),source:'Layered original 3D leaf geometry, no external assets'}};
}
