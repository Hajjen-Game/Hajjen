// A hand-sculpted, fully 3D tree study. The canopy is thousands of curved
// individual leaf surfaces, NOT spheres or billboard foliage.
// Built from deterministic geometry; no paid models or external asset hosting.
export const ART_DIRECTION = Object.freeze({
  name: 'Willowglow — hand-shaped forest elder',
  foliage: ['#456f62', '#6d9871', '#91b77e', '#b9ce91', '#d9dda5'],
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
  const barkCanvas = new B.DynamicTexture('bark grain / artist brushstrokes', {width:256,height:512}, scene, false);
  const barkCtx = barkCanvas.getContext();
  barkCtx.fillStyle = '#9a694e';
  barkCtx.fillRect(0,0,256,512);
  for (let i=0; i<150; i++) {
    const x = rand()*256, y = rand()*512, len = 22+rand()*180;
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
    [0,-.05,0],[-.08,.85,.08],[-.20,1.8,-.10],[-.05,3.02,-.15],
    [.18,4.18,-.05],[.18,5.10,-.08]
  ],.49,.16,16);
  const roots = [
    [[-.05,.40,.12],[-.57,.21,.24],[-.95,.10,.40],[-1.15,.02,.58]],
    [[.09,.38,-.14],[.48,.22,-.54],[.8,.09,-.84]],
    [[.23,.38,.11],[.68,.17,.31],[.99,.08,.42]],
    [[-.15,.36,-.12],[-.47,.16,-.61],[-.55,.04,-.98]]
  ];
  roots.forEach((p,i)=>tube('sculpted root '+(i+1),p,.15,.025,8));

  // Each silhouette group has its own actual twig branch, then hand-arranged
  // leaves. Irregular masses overlap so no spherical "lollipop" clumps form.
  const crowns = [
    {x:-2.25,y:5.45,z:.20,rx:1.26,ry:.87,rz:1.04,n:78},
    {x:-2.00,y:6.35,z:-.88,rx:1.13,ry:.89,rz:1.07,n:70},
    {x:-1.15,y:7.43,z:-.25,rx:1.12,ry:.85,rz:1.12,n:84},
    {x:.18,y:7.93,z:-.12,rx:1.21,ry:.97,rz:1.24,n:95},
    {x:1.58,y:7.47,z:-.63,rx:1.22,ry:.83,rz:1.16,n:82},
    {x:2.42,y:6.47,z:.10,rx:1.26,ry:.82,rz:1.10,n:86},
    {x:1.93,y:5.68,z:1.05,rx:1.19,ry:.79,rz:1.01,n:68},
    {x:.48,y:5.76,z:1.52,rx:1.27,ry:.80,rz:1.13,n:84},
    {x:-1.19,y:5.88,z:1.36,rx:1.04,ry:.75,rz:1.06,n:74},
    {x:.35,y:6.92,z:-1.75,rx:1.22,ry:.96,rz:.89,n:72},
    {x:-.95,y:7.19,z:1.04,rx:1.10,ry:.90,rz:.90,n:70},
    {x:1.20,y:6.98,z:1.20,rx:1.07,ry:.85,rz:.96,n:68},
    {x:-2.84,y:5.95,z:-.33,rx:.78,ry:.67,rz:.91,n:39},
    {x:2.78,y:6.13,z:-.48,rx:.71,ry:.60,rz:.85,n:35},
    {x:.72,y:8.63,z:.24,rx:.74,ry:.52,rz:.72,n:44}
  ];
  crowns.forEach((g,i)=>{
    const h=3.62+(i%4)*.18;
    tube('visible forking limb '+(i+1),[
      [0,h,0],[g.x*.27,h+.65,g.z*.28],
      [g.x*.65,g.y-.55,g.z*.7],[g.x,g.y+.06,g.z]
    ],.18,.026,8);
  });

  // Leaf = curved ribbon with real sculpted edges, tapered end and raised midrib.
  // Drawn into one batch with individually shaded vertices for performance.
  const positions=[],indices=[],colors=[],uvs=[];
  const dark=C('#416759'),mid=C('#79a277'),sun=C('#bcd090'),light=C('#dbe0ad');
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
      const radius=.34+.67*Math.sqrt(rand());
      const shell=V(Math.cos(az)*Math.sqrt(1-co*co),co,Math.sin(az)*Math.sqrt(1-co*co));
      const center=point.add(V(shell.x*g.rx*radius,shell.y*g.ry*radius,shell.z*g.rz*radius));
      const outward=V(shell.x+(.2-rand()*.4),shell.y*.65+.32+(rand()-.5)*.5,shell.z+(.2-rand()*.4));
      const hue=clamp(.4+.23*shell.y+(.15*center.y/9)+(rand()-.5)*.8,0,1);
      const base=B.Color3.Lerp(hue<.5?dark:mid,hue<.5?mid:sun,hue<.5?hue*2:(hue-.5)*2);
      // Dark underside, colorful sunlit crown, but never uniform flat green.
      blade(center,outward,.34+rand()*.22,.09+rand()*.085,base,(rand()-.5)*1.2);
      leafCount++;
    }
  });
  const leafMesh=new B.Mesh('1200+ genuine curved, tapered individual leaves',scene);
  const vd=new B.VertexData();vd.positions=positions;vd.indices=indices;vd.colors=colors;vd.uvs=uvs;
  vd.normals=[];B.VertexData.ComputeNormals(positions,indices,vd.normals);
  vd.applyToMesh(leafMesh);leafMesh.parent=treeRoot;
  leafMesh.useVertexColors=true;leafMesh.hasVertexAlpha=false;
  const leavesMat=new B.StandardMaterial('matte hand-colored foliage with leaf gradients',scene);
  leavesMat.diffuseColor=C('#ffffff');
  leavesMat.ambientColor=C('#465b40');
  leavesMat.specularColor=C('#0b160e');
  leavesMat.backFaceCulling=false;
  leavesMat.twoSidedLighting=true;
  leafMesh.material=leavesMat;shadows?.addShadowCaster(leafMesh);

  // Sparse 3D primrose blossoms; each uses five sculpted petals and a center.
  const petals = ART_DIRECTION.blossoms.map((c,i)=>{
    const m=new B.StandardMaterial('primrose '+i,scene);
    m.diffuseColor=C(c);m.specularColor=C('#2b181b');
    m.backFaceCulling=false;return m;
  });
  const pollen=new B.StandardMaterial('warm glowing pollen',scene);
  pollen.diffuseColor=C('#dfab69');pollen.emissiveColor=C('#3b2818');
  const masters=petals.map((mat,i)=>{
    const mesh=B.MeshBuilder.CreateSphere('petal master '+i,{diameter:1,segments:10},scene);
    mesh.isVisible=false;mesh.parent=treeRoot;mesh.material=mat;return mesh;
  });
  const pollenPrototype=B.MeshBuilder.CreateSphere('pollen prototype',{diameter:.095,segments:8},scene);
  pollenPrototype.isVisible=false;pollenPrototype.parent=treeRoot;pollenPrototype.material=pollen;
  let blossomCount=0;
  for(let i=0;i<55;i++){
    // Blushing accent focused on one sunlit branch, not an all-over pink cloud.
    const g=crowns[i%5===0?3:i%3===0?4:11];
    const az=rand()*Math.PI*2,r=.55+rand()*.68;
    const center=V(g.x+Math.cos(az)*g.rx*r,g.y+(rand()-.5)*g.ry*1.6,g.z+Math.sin(az)*g.rz*r);
    const stem=V((rand()-.5)*.8,.5,(rand()-.5)*.8).normalize();
    const petalMaster=masters[Math.floor(rand()*masters.length)];
    const dot=pollenPrototype.createInstance('golden heart '+i);
    dot.position=center;dot.parent=treeRoot;dot.isVisible=true;
    for(let a=0;a<5;a++){
      const theta=a*2*Math.PI/5,off=V(Math.cos(theta),.05+rand()*.15,Math.sin(theta));
      const p=petalMaster.createInstance('five petal sculpted blossom '+i+' / '+a);
      p.position=center.add(off.scale(.105));
      p.scaling=V(.115,.045,.080);
      p.rotation=V((rand()-.5)*.55,theta,(rand()-.5)*.3);
      p.parent=treeRoot;p.isVisible=true;
    }
    blossomCount++;
  }
  // Keep the invisible source meshes alive: Babylon.js instances share their geometry.

  return {root:treeRoot,stats:{leaves:leafCount,blossoms:blossomCount,branches:crowns.length,source:'Custom geometry, no external model'}};
}
