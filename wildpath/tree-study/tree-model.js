// Willowglow 2.0: authored layered leaf geometry and six organic main boughs.
// Keeps the Tree Study 1.0 shape language; no sphere foliage or paid assets.
export const ART_DIRECTION = Object.freeze({
  name: 'Willowglow — hand-shaped forest elder 2.0',
  foliage: ['#365a4c', '#628a67', '#87b579', '#b5cc8f', '#d9e0ac'],
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
  // Cluster centers describe asymmetric layered foliage, not individual tree trunks.
  // Increased internal density and overlap preserves foliage mass from all viewpoints.
  const crowns = [
    {x:-2.12,y:5.58,z:.22,rx:1.22,ry:.80,rz:1.05,n:120},
    {x:-1.92,y:6.33,z:-.71,rx:1.18,ry:.86,rz:1.04,n:100},
    {x:-1.06,y:7.26,z:-.32,rx:1.25,ry:.84,rz:1.08,n:118},
    {x:.26,y:7.85,z:-.16,rx:1.29,ry:.91,rz:1.24,n:139},
    {x:1.48,y:7.27,z:-.53,rx:1.22,ry:.85,rz:1.16,n:118},
    {x:2.18,y:6.48,z:.31,rx:1.28,ry:.81,rz:1.12,n:124},
    {x:1.78,y:5.84,z:1.12,rx:1.16,ry:.78,rz:1.02,n:90},
    {x:.42,y:5.84,z:1.50,rx:1.15,ry:.82,rz:1.04,n:93},
    {x:-1.15,y:5.80,z:1.30,rx:1.13,ry:.83,rz:1.00,n:96},
    {x:.28,y:6.91,z:-1.58,rx:1.21,ry:.91,rz:.94,n:99},
    {x:-.90,y:7.08,z:1.13,rx:1.11,ry:.83,rz:.98,n:106},
    {x:1.02,y:6.98,z:1.16,rx:1.16,ry:.82,rz:1.01,n:109},
    {x:.40,y:8.51,z:.05,rx:.83,ry:.58,rz:.76,n:61}
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

  // Leaf = curved ribbon with real sculpted edges, tapered end and raised midrib.
  // Drawn into one batch with individually shaded vertices for performance.
  const positions=[],indices=[],colors=[],uvs=[];
  const dark=C('#315c49'),mid=C('#608d68'),sun=C('#9fc481'),light=C('#cbdc9c');
  function put(position, color, uv) {
    positions.push(position.x,position.y,position.z);
    colors.push(color.r,color.g,color.b,1);
    uvs.push(uv[0],uv[1]);
  }
  function blade(center, direction, length, width, tcolor, twist=0) {
    let forward=direction.normalize();
    let side=B.Vector3.Cross(forward,V(.07+twist,1,.12)).normalize();
    if(side.lengthSquared()<.001)side=V(1,0,0);
    let up=B.Vector3.Cross(side,forward).normalize();
    const i0=positions.length/3;
    for(let k=0;k<=5;k++) {
      const t=k/5;
      const w=Math.pow(Math.sin(Math.PI*t),.75)*width;
      const axial=forward.scale(length*t);
      const bow=up.scale(Math.sin(Math.PI*t)*.10*length);
      const midrib=center.add(axial).add(bow);
      const c=B.Color3.Lerp(tcolor,light,.10+(t*.17));
      put(midrib.subtract(side.scale(w)),B.Color3.Lerp(c,dark,.17),[0,t]);
      put(midrib.add(up.scale(w*.10)),B.Color3.Lerp(c,sun,.24),[.5,t]);
      put(midrib.add(side.scale(w)),B.Color3.Lerp(c,dark,.09),[1,t]);
    }
    for(let k=0;k<5;k++){
      const a=i0+k*3,b=a+3;
      indices.push(a,a+1,b,a+1,b+1,b,a+1,a+2,b+1,a+2,b+2,b+1);
    }
  }
  let leafCount=0;
  crowns.forEach((g,gi)=>{
    const point=V(g.x,g.y,g.z);
    for(let i=0;i<g.n;i++) {
      const az=rand()*Math.PI*2,co=rand()*2-1;
      const radius=.17+.78*Math.sqrt(rand());
      const shell=V(Math.cos(az)*Math.sqrt(1-co*co),co,Math.sin(az)*Math.sqrt(1-co*co));
      const center=point.add(V(shell.x*g.rx*radius,shell.y*g.ry*radius,shell.z*g.rz*radius));
      const outward=V(shell.x*.72+(rand()-.5)*.58,shell.y*.43+.08+(rand()-.5)*.48,shell.z*.72+(rand()-.5)*.58);
      const hue=clamp(.39+.33*shell.y+.13*center.y/9+(rand()-.5)*.58,0,1);
      const base=B.Color3.Lerp(hue<.5?dark:mid,hue<.5?mid:sun,hue<.5?hue*2:(hue-.5)*2);
      // Dark underside, colorful sunlit crown, but never uniform flat green.
      blade(center,outward,.39+rand()*.22,.116+rand()*.095,base,(rand()-.5)*1.0);
      leafCount++;
    }
  });
  const leafMesh=new B.Mesh('distinct curved, tapered individual leaves',scene);
  const vd=new B.VertexData();vd.positions=positions;vd.indices=indices;vd.colors=colors;vd.uvs=uvs;
  vd.normals=[];B.VertexData.ComputeNormals(positions,indices,vd.normals);
  vd.applyToMesh(leafMesh);leafMesh.parent=treeRoot;
  leafMesh.useVertexColors=true;leafMesh.hasVertexAlpha=false;
  const leavesMat=new B.StandardMaterial('matte hand-colored foliage with leaf gradients',scene);
  leavesMat.diffuseColor=C('#ffffff');
  leavesMat.ambientColor=C('#334d35');
  leavesMat.specularColor=C('#0b160e');
  leavesMat.backFaceCulling=false;
  leavesMat.twoSidedLighting=true;
  leafMesh.material=leavesMat;shadows?.addShadowCaster(leafMesh);
  leafMesh.receiveShadows = true; // Leaf clusters shade one another for dimensional depth.

  // Painted blossom geometry batched into ONE mesh, not hundreds of draw calls.
  const flowerPositions=[],flowerIndices=[],flowerColors=[];
  const cream=ART_DIRECTION.blossoms.map(C),gold=C('#e6bd79');
  let blossomCount=0;
  function flowerVertex(p,c){
    flowerPositions.push(p.x,p.y,p.z);
    flowerColors.push(c.r,c.g,c.b,1);
  }
  for(let i=0;i<55;i++){
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
  return {root:treeRoot,stats:{leaves:leafCount,blossoms:blossomCount,branches:boughs.length,clusters:crowns.length,source:'Custom geometry, no external model'}};
}
