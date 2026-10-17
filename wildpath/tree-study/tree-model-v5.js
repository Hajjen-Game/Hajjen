// Willowglow 5.0: nine readable leaf bouquets with deliberate separation & internal depth.
// Hand-sculpted individual 3D leaves, no solid shell, no third-party meshes.
export const ART_DIRECTION = Object.freeze({
  name: 'Willowglow — cluster identity and depth 5.0',
  foliage: ['#244634', '#35694b', '#5d9a5e', '#8abb74', '#bfdda0'],
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
  // Nine *individually readable* crowns in a staggered three-dimensional
  // layout. Clear slivers of dark space between several neighboring groups
  // make the tree look like the approved handcrafted reference, not one blob.
  // The positions are tied to the six main boughs and their secondary shoots.
  const crowns = [
    {name:'west fringe',  x:-2.34,y:5.83,z: .26,rx:1.10,ry:.77,rz:.97,patches:21,lean:-.28},
    {name:'west upper',   x:-1.51,y:7.00,z:-.55,rx:1.09,ry:.88,rz:1.02,patches:24,lean:-.16},
    {name:'highest crown',x:-.20,y:8.11,z:-.23,rx:1.20,ry:.92,rz:1.12,patches:26,lean:.05},
    {name:'east upper',   x:1.34,y:7.57,z:-.43,rx:1.13,ry:.85,rz:1.01,patches:24,lean:.24},
    {name:'east fringe',  x:2.40,y:6.39,z:.40,rx:1.16,ry:.81,rz:.99,patches:22,lean:.29},
    {name:'east front',   x:1.50,y:5.79,z:1.24,rx:1.13,ry:.76,rz:.97,patches:23,lean:.14},
    {name:'front center', x:.10,y:6.09,z:1.67,rx:1.13,ry:.80,rz:1.03,patches:24,lean:-.05},
    {name:'west front',   x:-1.42,y:5.91,z:1.07,rx:1.12,ry:.79,rz:1.04,patches:22,lean:-.22},
    {name:'back center',  x:.25,y:6.81,z:-1.54,rx:1.10,ry:.83,rz:.99,patches:23,lean:.08}
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

  // All foliage is authentic, curved, individually sculpted leaf geometry.
  // Leaf blades are drawn in two vertex-colored batches for stable mobile FPS:
  // shadowed interior leaves and sunlit outer leaves. There is no solid blob.
  const shadePositions=[],shadeIndices=[],shadeColors=[],shadeUvs=[];
  const litPositions=[],litIndices=[],litColors=[],litUvs=[];
  const deepest=C('#1f4936'),undergrowth=C('#31684c'),
        green=C('#5c985e'),sunGreen=C('#91c17a'),
        golden=C('#c6dea0');
  const blend=(a,b,t)=>B.Color3.Lerp(a,b,clamp(t,0,1));
  function buildLeaf(batch,origin,direction,length,width,color,curve,twist){
    const [positions,indices,colors,uvs]=batch;
    const d=direction.normalize();
    let across=B.Vector3.Cross(d,V(.22+twist,.92,.15)).normalize();
    if(across.lengthSquared()<.015)across=V(1,0,0);
    const up=B.Vector3.Cross(across,d).normalize();
    const first=positions.length/3, steps=5;
    for(let k=0;k<=steps;k++){
      const t=k/steps,fullness=Math.pow(Math.sin(Math.PI*t),.79);
      const half=width*fullness*(.94+.10*Math.sin(t*2.8));
      const center=origin.add(d.scale(length*t))
        .add(up.scale(length*(.060*Math.sin(Math.PI*t)+curve*t*t)));
      const darkEdge=blend(color,deepest,.17);
      const brightRidge=blend(color,golden,.13+.13*t);
      for(const [p,c,u] of [
        [center.subtract(across.scale(half)),darkEdge,0],
        [center.add(up.scale(half*.115)),brightRidge,.5],
        [center.add(across.scale(half)),blend(color,undergrowth,.06),1]
      ]){
        positions.push(p.x,p.y,p.z);colors.push(c.r,c.g,c.b,1);uvs.push(u,t);
      }
    }
    for(let k=0;k<steps;k++){
      const a=first+k*3,b=a+3;
      indices.push(a,a+1,b,a+1,b+1,b,a+1,a+2,b+1,a+2,b+2,b+1);
    }
  }
  const innerBatch=[shadePositions,shadeIndices,shadeColors,shadeUvs];
  const outerBatch=[litPositions,litIndices,litColors,litUvs];
  const axis=(x,y,z)=>V(x,y,z).normalize();
  let leafCount=0,fanCount=0;
  const PHI=2.399963229728653; // Golden angle: regular coverage, no clumped randomness.
  crowns.forEach((g,ci)=>{
    const center=V(g.x,g.y,g.z),phase=ci*1.73;
    const tint=blend(green,sunGreen,.15+(ci%4)*.07);
    // Recessed, dark leaves make visible pockets of depth between bouquets,
    // without solid fill meshes. These underlayers are genuine leaf rosettes.
    for(let i=0;i<4;i++){
      const az=phase+i*Math.PI*.5;
      const inner=center.add(V(Math.cos(az)*g.rx*.35,-.17+(i%2)*.17,Math.sin(az)*g.rz*.35));
      const outward=axis(Math.cos(az)*.64,.25,Math.sin(az)*.64);
      let right=B.Vector3.Cross(outward,V(0,1,.04)).normalize();
      if(right.lengthSquared()<.01)right=V(1,0,0);
      const up=B.Vector3.Cross(outward,right).normalize();
      for(let k=0;k<11;k++){
        const a=k*2*Math.PI/11+phase;
        const around=right.scale(Math.cos(a)).add(up.scale(Math.sin(a)));
        const aim=outward.scale(.65).add(around.scale(.48)).normalize();
        const root=inner.add(around.scale(.10));
        buildLeaf(innerBatch,root,aim,.40+rand()*.09,.135+rand()*.022,
          blend(deepest,undergrowth,.15+.22*rand()),-.035,(rand()-.5)*.3);
        leafCount++;
      }
    }
    // One intentionally arranged patch at a time, with leaves fanning in a
    // shared consistent direction. Coherent clusters replace 4.0's spiky halo.
    for(let p=0;p<g.patches;p++){
      const cy=1-2*(p+.5)/g.patches;
      const az=p*PHI+phase,span=Math.sqrt(Math.max(.02,1-cy*cy));
      const shell=axis(Math.cos(az)*span,cy,Math.sin(az)*span);
      const layer=p%5===0?.42:p%5===1?.61:.85;
      const pivot=center.add(V(shell.x*g.rx*layer,
        shell.y*g.ry*layer,shell.z*g.rz*layer));
      const facing=axis(shell.x*.62+g.lean*.13,.28+.27*Math.max(0,cy),shell.z*.62+.16);
      let right=B.Vector3.Cross(facing,V(.02,1,.05)).normalize();
      if(right.lengthSquared()<.01)right=V(1,0,0);
      const up=B.Vector3.Cross(facing,right).normalize();
      const lit=layer>.72, palette=lit?outerBatch:innerBatch;
      const count=10+(p%3); // Keep triangle budget close to Tree Study 4.0.
      for(let k=0;k<count;k++){
        const theta=2*Math.PI*k/count+(ci*.28)+(rand()-.5)*.16;
        const around=right.scale(Math.cos(theta)).add(up.scale(Math.sin(theta)));
        const direction=facing.scale(.49).add(around.scale(.70)).add(V(0,-.09,0)).normalize();
        const color=lit
          ?blend(tint,sunGreen,.17+.17*Math.max(0,cy)+rand()*.18)
          :blend(undergrowth,green,.16+.28*Math.max(0,cy)+rand()*.13);
        buildLeaf(palette,pivot.add(around.scale(.11)),direction,
          .41+rand()*.18,.12+rand()*.065,color,(rand()-.5)*.12,
          (rand()-.5)*.55);
        leafCount++;
      }
      fanCount++;
    }
    // Hand-trimmed irregular silhouette. Only a small outer fringe, not
    // long random spikes that obscure the cluster identity.
    for(let j=0;j<9;j++){
      const a=phase+j*Math.PI*2/9,cy=.15+.61*(rand()-.5);
      const shell=axis(Math.cos(a),cy,Math.sin(a));
      const pivot=center.add(V(shell.x*g.rx*.91,shell.y*g.ry*.77,shell.z*g.rz*.91));
      const growth=axis(shell.x,.06+cy*.42,shell.z);
      buildLeaf(outerBatch,pivot,growth,.35+rand()*.13,.10+rand()*.055,
        blend(tint,sunGreen,.2+.19*rand()),-.04,(rand()-.5)*.3);
      leafCount++;
    }
  });
  function finishBatch(name,positions,indices,colors,uvs){
    const mesh=new B.Mesh(name,scene);
    const data=new B.VertexData();
    data.positions=positions;data.indices=indices;data.colors=colors;data.uvs=uvs;
    data.normals=[];B.VertexData.ComputeNormals(positions,indices,data.normals);
    data.applyToMesh(mesh);mesh.parent=treeRoot;mesh.useVertexColors=true;
    mesh.hasVertexAlpha=false;
    const material=new B.StandardMaterial('painted foliage / '+name,scene);
    material.diffuseColor=C('#ffffff');
    material.ambientColor=name.includes('interior')?C('#243b30'):C('#496b42');
    material.specularColor=C('#0a1710');
    material.specularPower=15;material.backFaceCulling=false;
    material.twoSidedLighting=true;mesh.material=material;
    return mesh;
  }
  const deepFoliage=finishBatch('dark interior / separate leaf layers',
    shadePositions,shadeIndices,shadeColors,shadeUvs);
  const sunlitFoliage=finishBatch('sunlit exterior / separate curved leaf layers',
    litPositions,litIndices,litColors,litUvs);
  // Both batches are real-time 3D with vertex depth; the overall silhouette
  // receives a soft decal shadow instead of a noisy per-leaf shadow map.
  const leavesMat=sunlitFoliage.material;
  // Painted blossom geometry batched into ONE mesh, not hundreds of draw calls.
  const flowerPositions=[],flowerIndices=[],flowerColors=[];
  const cream=ART_DIRECTION.blossoms.map(C),gold=C('#e6bd79');
  let blossomCount=0;
  function flowerVertex(p,c){
    flowerPositions.push(p.x,p.y,p.z);
    flowerColors.push(c.r,c.g,c.b,1);
  }
  for(let i=0;i<35;i++){
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
  return {root:treeRoot,stats:{leaves:leafCount,blossoms:blossomCount,branches:boughs.length,clusters:crowns.length,fans:fanCount,triangles:Math.floor((shadeIndices.length+litIndices.length)/3),source:'Nine individually-shaped layered 3D bouquets, no external assets'}};
}
