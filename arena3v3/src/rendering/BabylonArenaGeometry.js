function color3(BABYLON, hex) {
  return BABYLON.Color3.FromHexString(hex);
}

function material(
  BABYLON,
  scene,
  name,
  diffuse,
  specular = "#1b120d",
  emissive = null,
) {
  const mat = new BABYLON.StandardMaterial(name, scene);
  mat.diffuseColor = color3(BABYLON, diffuse);
  mat.specularColor = color3(BABYLON, specular);
  mat.specularPower = 10;
  if (emissive) mat.emissiveColor = color3(BABYLON, emissive);
  return mat;
}

function pbrMaterial(
  BABYLON,
  scene,
  name,
  albedo,
  {
    metallic=0,
    roughness=.86,
    environmentIntensity=.32,
    directIntensity=1,
    emissive=null,
  }={},
) {
  const mat=new BABYLON.PBRMaterial(name,scene);
  mat.albedoColor=color3(BABYLON,albedo);
  mat.metallic=metallic;
  mat.roughness=roughness;
  mat.environmentIntensity=environmentIntensity;
  mat.directIntensity=directIntensity;
  mat.enableSpecularAntiAliasing=true;
  mat.forceIrradianceInFragment=true;
  if(emissive) mat.emissiveColor=color3(BABYLON,emissive);
  return mat;
}

function seededRandom(seed = 1) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function createBox(BABYLON, scene, name, width, height, depth, position, mat) {
  const mesh = BABYLON.MeshBuilder.CreateBox(
    name,
    { width, height, depth },
    scene,
  );
  mesh.position.set(position.x, position.y, position.z);
  mesh.material = mat;
  return mesh;
}

function createChamferedPrism(
  BABYLON,
  scene,
  name,
  width,
  height,
  depth,
  chamfer,
  position,
  mat,
) {
  const w = Math.max(.05, width);
  const d = Math.max(.05, depth);
  const h = Math.max(.02, height);
  const c = Math.min(
    Math.max(0, chamfer),
    w * .28,
    d * .28,
  );
  const x = w / 2;
  const z = d / 2;
  const polygon = [
    [-x + c, -z],
    [x - c, -z],
    [x, -z + c],
    [x, z - c],
    [x - c, z],
    [-x + c, z],
    [-x, z - c],
    [-x, -z + c],
  ];

  const positions = [];
  const indices = [];
  const normals = [];
  const uvs = [];
  const count = polygon.length;

  for (const y of [-h / 2, h / 2]) {
    for (const [px,pz] of polygon) {
      positions.push(px,y,pz);
      uvs.push(px / w + .5,pz / d + .5);
    }
  }

  for (let i = 1; i < count - 1; i += 1) {
    indices.push(0,i + 1,i);
    indices.push(count,count + i,count + i + 1);
  }

  for (let i = 0; i < count; i += 1) {
    const j = (i + 1) % count;
    indices.push(i,j,count + j);
    indices.push(i,count + j,count + i);
  }

  BABYLON.VertexData.ComputeNormals(positions,indices,normals);

  const mesh = new BABYLON.Mesh(name,scene);
  const data = new BABYLON.VertexData();
  data.positions = positions;
  data.indices = indices;
  data.normals = normals;
  data.uvs = uvs;
  data.applyToMesh(mesh);

  mesh.position.set(position.x,position.y,position.z);
  mesh.material = mat;
  mesh.convertToFlatShadedMesh?.();
  return mesh;
}

function createChamferedFrustum(
  BABYLON,
  scene,
  name,
  bottomWidth,
  bottomDepth,
  topWidth,
  topDepth,
  height,
  chamfer,
  position,
  mat,
) {
  const h=Math.max(.02,height);
  const polygonFor=(w,d)=>{
    const safeW=Math.max(.05,w);
    const safeD=Math.max(.05,d);
    const c=Math.min(Math.max(0,chamfer),safeW*.25,safeD*.25);
    const x=safeW/2;
    const z=safeD/2;
    return [
      [-x+c,-z],[x-c,-z],[x,-z+c],[x,z-c],
      [x-c,z],[-x+c,z],[-x,z-c],[-x,-z+c],
    ];
  };
  const bottom=polygonFor(bottomWidth,bottomDepth);
  const top=polygonFor(topWidth,topDepth);
  const positions=[];
  const indices=[];
  const normals=[];
  const uvs=[];
  const count=bottom.length;

  for(const [x,z] of bottom){
    positions.push(x,-h/2,z);
    uvs.push(x/Math.max(.05,bottomWidth)+.5,z/Math.max(.05,bottomDepth)+.5);
  }
  for(const [x,z] of top){
    positions.push(x,h/2,z);
    uvs.push(x/Math.max(.05,topWidth)+.5,z/Math.max(.05,topDepth)+.5);
  }

  for(let i=1;i<count-1;i+=1){
    indices.push(0,i+1,i);
    indices.push(count,count+i,count+i+1);
  }
  for(let i=0;i<count;i+=1){
    const j=(i+1)%count;
    indices.push(i,j,count+j);
    indices.push(i,count+j,count+i);
  }

  BABYLON.VertexData.ComputeNormals(positions,indices,normals);
  const mesh=new BABYLON.Mesh(name,scene);
  const data=new BABYLON.VertexData();
  data.positions=positions;
  data.indices=indices;
  data.normals=normals;
  data.uvs=uvs;
  data.applyToMesh(mesh);
  mesh.position.set(position.x,position.y,position.z);
  mesh.material=mat;
  mesh.convertToFlatShadedMesh?.();
  return mesh;
}

function createFlameMesh(
  BABYLON,
  scene,
  name,
  width,
  height,
  position,
  mat,
) {
  const w=width/2;
  const h=height;
  const positions=[
    -w,0,0,
    -w*.62,h*.34,0,
    -w*.28,h*.62,0,
    0,h,0,
    w*.30,h*.63,0,
    w*.66,h*.34,0,
    w,0,0,
    0,h*.14,0,
  ];
  const indices=[
    0,1,7,
    1,2,7,
    2,3,7,
    3,4,7,
    4,5,7,
    5,6,7,
  ];
  const normals=[];
  const uvs=[
    0,.95,
    .18,.66,
    .36,.37,
    .50,0,
    .65,.37,
    .82,.66,
    1,.95,
    .50,.82,
  ];
  BABYLON.VertexData.ComputeNormals(positions,indices,normals);

  const mesh=new BABYLON.Mesh(name,scene);
  const data=new BABYLON.VertexData();
  data.positions=positions;
  data.indices=indices;
  data.normals=normals;
  data.uvs=uvs;
  data.applyToMesh(mesh);

  mesh.position.set(position.x,position.y,position.z);
  mesh.material=mat;
  mesh.billboardMode=BABYLON.Mesh.BILLBOARDMODE_ALL;
  return mesh;
}

function createSoftShadowTexture(BABYLON,scene) {
  const size=256;
  const texture=new BABYLON.DynamicTexture(
    "babylon-soft-shadow-texture",
    {width:size,height:size},
    scene,
    false,
  );
  const ctx=texture.getContext();
  ctx.clearRect(0,0,size,size);
  const g=ctx.createRadialGradient(
    size/2,size/2,size*.10,
    size/2,size/2,size*.50,
  );
  g.addColorStop(0,"rgba(0,0,0,.56)");
  g.addColorStop(.52,"rgba(0,0,0,.24)");
  g.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=g;
  ctx.fillRect(0,0,size,size);
  texture.update(false);
  return texture;
}

function addContactShadow(
  BABYLON,
  scene,
  name,
  center,
  width,
  depth,
  materials,
  root,
) {
  const shadow=BABYLON.MeshBuilder.CreateGround(
    name,
    {width,height:depth,subdivisions:1},
    scene,
  );
  shadow.position.set(center.x,.028,center.z+.35);
  shadow.material=materials.contactShadow;
  shadow.parent=root;
  return shadow;
}

function createStoneSurfaceTexture(BABYLON,scene,name,seed=1) {
  const size=512;
  const texture=new BABYLON.DynamicTexture(
    name,
    {width:size,height:size},
    scene,
    false,
  );
  const ctx=texture.getContext();
  const random=seededRandom(seed);

  ctx.fillStyle="#d0c6b9";
  ctx.fillRect(0,0,size,size);

  // Large cloudy variation first so the stone reads painted rather than noisy.
  for(let i=0;i<90;i+=1){
    const x=random()*size;
    const y=random()*size;
    const radius=24+random()*94;
    const dark=random()>.48;
    const gradient=ctx.createRadialGradient(x,y,0,x,y,radius);
    gradient.addColorStop(
      0,
      dark
        ? "rgba(72,61,53,"+(.035+random()*.075)+")"
        : "rgba(255,244,220,"+(.028+random()*.055)+")",
    );
    gradient.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=gradient;
    ctx.beginPath();
    ctx.arc(x,y,radius,0,Math.PI*2);
    ctx.fill();
  }

  // Sparse pores and worn flecks.
  for(let i=0;i<1500;i+=1){
    const bright=random()>.62;
    const alpha=.015+random()*.040;
    ctx.fillStyle=bright
      ? "rgba(255,249,230,"+alpha+")"
      : "rgba(48,40,35,"+alpha+")";
    const x=Math.floor(random()*size);
    const y=Math.floor(random()*size);
    const s=random()>.94?2:1;
    ctx.fillRect(x,y,s,s);
  }

  // A few soft cracks; never enough to look like a procedural crack wallpaper.
  ctx.lineCap="round";
  for(let i=0;i<7;i+=1){
    let x=40+random()*(size-80);
    let y=40+random()*(size-80);
    const angle=random()*Math.PI*2;
    const length=35+random()*72;
    ctx.beginPath();
    ctx.moveTo(x,y);
    for(let p=0;p<3;p+=1){
      x+=Math.cos(angle+(random()-.5)*.55)*length/3;
      y+=Math.sin(angle+(random()-.5)*.55)*length/3;
      ctx.lineTo(x,y);
    }
    ctx.strokeStyle="rgba(48,39,34,"+(.08+random()*.08)+")";
    ctx.lineWidth=.8+random()*.9;
    ctx.stroke();
  }

  texture.update(false);
  texture.wrapU=BABYLON.Texture.WRAP_ADDRESSMODE;
  texture.wrapV=BABYLON.Texture.WRAP_ADDRESSMODE;
  texture.uScale=1.65;
  texture.vScale=1.65;
  texture.anisotropicFilteringLevel=8;
  return texture;
}

function createStoneNormalTexture(BABYLON,scene,name,seed=1) {
  const size=256;
  const texture=new BABYLON.DynamicTexture(
    name,
    {width:size,height:size},
    scene,
    false,
  );
  const ctx=texture.getContext();
  const image=ctx.createImageData(size,size);
  const phase=(seed%97)*.137;

  const heightAt=(x,y)=>{
    const nx=x/size;
    const ny=y/size;
    return (
      Math.sin(nx*Math.PI*7.0+phase)*.30+
      Math.sin(ny*Math.PI*5.2-phase*.7)*.24+
      Math.sin((nx+ny)*Math.PI*10.5+phase*.4)*.18+
      Math.sin((nx*.55-ny)*Math.PI*15.0-phase)*.10
    );
  };

  const strength=1.55;
  for(let y=0;y<size;y+=1){
    for(let x=0;x<size;x+=1){
      const dx=(heightAt(x+1,y)-heightAt(x-1,y))*strength;
      const dy=(heightAt(x,y+1)-heightAt(x,y-1))*strength;
      let nx=-dx;
      let ny=-dy;
      let nz=1;
      const inv=1/Math.hypot(nx,ny,nz);
      nx*=inv;
      ny*=inv;
      nz*=inv;
      const i=(y*size+x)*4;
      image.data[i]=Math.round((nx*.5+.5)*255);
      image.data[i+1]=Math.round((ny*.5+.5)*255);
      image.data[i+2]=Math.round((nz*.5+.5)*255);
      image.data[i+3]=255;
    }
  }

  ctx.putImageData(image,0,0);
  texture.update(false);
  texture.gammaSpace=false;
  texture.wrapU=BABYLON.Texture.WRAP_ADDRESSMODE;
  texture.wrapV=BABYLON.Texture.WRAP_ADDRESSMODE;
  texture.uScale=3.2;
  texture.vScale=3.2;
  texture.anisotropicFilteringLevel=8;
  return texture;
}

function createEmberParticleTexture(BABYLON,scene) {
  const size=64;
  const texture=new BABYLON.DynamicTexture(
    "windscar-ember-particle",
    {width:size,height:size},
    scene,
    false,
  );
  const ctx=texture.getContext();
  ctx.clearRect(0,0,size,size);
  const g=ctx.createRadialGradient(
    size*.5,size*.5,0,
    size*.5,size*.5,size*.48,
  );
  g.addColorStop(0,"rgba(255,255,236,1)");
  g.addColorStop(.18,"rgba(255,209,105,.95)");
  g.addColorStop(.52,"rgba(255,96,24,.58)");
  g.addColorStop(1,"rgba(255,55,0,0)");
  ctx.fillStyle=g;
  ctx.fillRect(0,0,size,size);
  texture.update(false);
  texture.hasAlpha=true;
  return texture;
}

function createWindscarFloorTexture(BABYLON,scene,arena,mapping) {
  const width=1280;
  const height=Math.max(576,Math.round(width*mapping.height/mapping.width));
  const texture=new BABYLON.DynamicTexture(
    "babylon-windscar-floor-texture",
    {width,height},
    scene,
    false,
  );
  const ctx=texture.getContext();
  const sx=width/mapping.width;
  const sy=height/mapping.height;
  const b=arena.bounds;
  const cx=(b.x+b.w/2)*sx;
  const cy=(b.y+b.h/2)*sy;
  const random=seededRandom(0xa47331);

  // Dark surrounding pit / staging strip. The playable arena is now a clear
  // authored shape instead of a full-screen brown rectangle.
  ctx.fillStyle="#2f211c";
  ctx.fillRect(0,0,width,height);

  const bevel=34;
  const arenaPoly=[
    [(b.x+bevel)*sx,b.y*sy],
    [(b.x+b.w-bevel)*sx,b.y*sy],
    [(b.x+b.w)*sx,(b.y+bevel)*sy],
    [(b.x+b.w)*sx,(b.y+b.h-bevel)*sy],
    [(b.x+b.w-bevel)*sx,(b.y+b.h)*sy],
    [(b.x+bevel)*sx,(b.y+b.h)*sy],
    [b.x*sx,(b.y+b.h-bevel)*sy],
    [b.x*sx,(b.y+bevel)*sy],
  ];

  const pathArena=()=>{
    ctx.beginPath();
    ctx.moveTo(arenaPoly[0][0],arenaPoly[0][1]);
    for(let i=1;i<arenaPoly.length;i+=1){
      ctx.lineTo(arenaPoly[i][0],arenaPoly[i][1]);
    }
    ctx.closePath();
  };

  pathArena();
  const base=ctx.createLinearGradient(
    b.x*sx,b.y*sy,
    (b.x+b.w)*sx,(b.y+b.h)*sy,
  );
  base.addColorStop(0,"#7b5742");
  base.addColorStop(.44,"#704d3b");
  base.addColorStop(1,"#5a3d31");
  ctx.fillStyle=base;
  ctx.fill();

  // Large faceted stone/value planes. No radial target motif.
  ctx.save();
  pathArena();
  ctx.clip();
  const facetPalette=[
    "rgba(224,162,105,.070)",
    "rgba(173,113,76,.072)",
    "rgba(105,70,54,.095)",
    "rgba(238,181,121,.040)",
    "rgba(77,49,40,.070)",
  ];
  for(let i=0;i<24;i+=1){
    const gx=(b.x+65+random()*(b.w-130))*sx;
    const gy=(b.y+55+random()*(b.h-110))*sy;
    const radius=(65+random()*145)*sx;
    const sides=5+Math.floor(random()*3);
    ctx.beginPath();
    for(let p=0;p<sides;p+=1){
      const a=p/sides*Math.PI*2+(random()-.5)*.24;
      const rr=radius*(.56+random()*.48);
      const px=gx+Math.cos(a)*rr;
      const py=gy+Math.sin(a)*rr*(.48+random()*.26);
      if(p===0) ctx.moveTo(px,py);
      else ctx.lineTo(px,py);
    }
    ctx.closePath();
    ctx.fillStyle=facetPalette[i%facetPalette.length];
    ctx.fill();
  }

  // Broad worn combat lane through the center, intentionally non-circular.
  const lane=ctx.createLinearGradient(
    (b.x+b.w*.24)*sx,(b.y+b.h*.30)*sy,
    (b.x+b.w*.76)*sx,(b.y+b.h*.70)*sy,
  );
  lane.addColorStop(0,"rgba(49,31,25,0)");
  lane.addColorStop(.35,"rgba(49,31,25,.055)");
  lane.addColorStop(.65,"rgba(49,31,25,.065)");
  lane.addColorStop(1,"rgba(49,31,25,0)");
  ctx.fillStyle=lane;
  ctx.fillRect(
    (b.x+b.w*.13)*sx,
    (b.y+b.h*.16)*sy,
    b.w*.74*sx,
    b.h*.68*sy,
  );

  // Sparse worn seams. Keep these subtle so they read as surface wear,
  // not branches/twigs scattered across the arena.
  ctx.lineCap="round";
  for(let i=0;i<5;i+=1){
    let x=(b.x+130+random()*(b.w-260))*sx;
    let y=(b.y+105+random()*(b.h-210))*sy;
    const angle=random()*Math.PI*2;
    const length=(18+random()*42)*sx;
    ctx.beginPath();
    ctx.moveTo(x,y);
    for(let p=0;p<2;p+=1){
      x+=Math.cos(angle+(random()-.5)*.28)*length/2;
      y+=Math.sin(angle+(random()-.5)*.28)*length/2;
      ctx.lineTo(x,y);
    }
    ctx.strokeStyle="rgba(42,28,23,"+(.065+random()*.045)+")";
    ctx.lineWidth=(.65+random()*.45)*sx;
    ctx.stroke();
  }

  // Gentle interior vignette keeps the middle readable while the perimeter
  // falls back enough for combat VFX to pop.
  const combatVignette=ctx.createRadialGradient(
    cx,cy,Math.min(width,height)*.20,
    cx,cy,Math.min(width,height)*.66,
  );
  combatVignette.addColorStop(0,"rgba(0,0,0,0)");
  combatVignette.addColorStop(.68,"rgba(35,22,18,.035)");
  combatVignette.addColorStop(1,"rgba(24,15,13,.14)");
  ctx.fillStyle=combatVignette;
  ctx.fillRect(b.x*sx,b.y*sy,b.w*sx,b.h*sy);

  // Warm pools under the two watchfires.
  const firePools=[
    [b.x-8,b.y+b.h*.72],
    [b.x+b.w+8,b.y+b.h*.28],
  ];
  ctx.globalCompositeOperation="screen";
  for(const [gx,gy] of firePools){
    const x=gx*sx;
    const y=gy*sy;
    const r=185*sx;
    const glow=ctx.createRadialGradient(x,y,0,x,y,r);
    glow.addColorStop(0,"rgba(255,157,69,.38)");
    glow.addColorStop(.30,"rgba(244,103,37,.18)");
    glow.addColorStop(.64,"rgba(187,66,27,.055)");
    glow.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=glow;
    ctx.fillRect(x-r,y-r,r*2,r*2);
  }
  ctx.globalCompositeOperation="source-over";

  for(let i=0;i<1200;i+=1){
    const alpha=.006+random()*.015;
    ctx.fillStyle=random()>.58
      ?"rgba(243,203,157,"+alpha+")"
      :"rgba(31,20,17,"+alpha+")";
    ctx.fillRect(
      Math.floor((b.x+random()*b.w)*sx),
      Math.floor((b.y+random()*b.h)*sy),
      1,1,
    );
  }
  ctx.restore();

  // Strong bevel/rim line defines the combat platform without a giant frame.
  pathArena();
  ctx.strokeStyle="rgba(49,31,25,.58)";
  ctx.lineWidth=4.2*sx;
  ctx.stroke();
  pathArena();
  ctx.strokeStyle="rgba(226,166,110,.10)";
  ctx.lineWidth=1.25*sx;
  ctx.stroke();

  texture.update(false);
  texture.wrapU=BABYLON.Texture.CLAMP_ADDRESSMODE;
  texture.wrapV=BABYLON.Texture.CLAMP_ADDRESSMODE;
  texture.anisotropicFilteringLevel=8;
  return texture;
}

function createEmberwatchFloorTexture(BABYLON,scene,arena,mapping) {
  const width=1280;
  const height=Math.max(576,Math.round(width*mapping.height/mapping.width));
  const texture=new BABYLON.DynamicTexture(
    "babylon-emberwatch-floor-texture",
    {width,height},
    scene,
    false,
  );
  const ctx=texture.getContext();
  const sx=width/mapping.width;
  const sy=height/mapping.height;
  const b=arena.bounds;
  const random=seededRandom(0xe8ba5f);

  ctx.fillStyle="#231b18";
  ctx.fillRect(0,0,width,height);

  const bevel=30;
  const poly=[
    [(b.x+bevel)*sx,b.y*sy],
    [(b.x+b.w-bevel)*sx,b.y*sy],
    [(b.x+b.w)*sx,(b.y+bevel)*sy],
    [(b.x+b.w)*sx,(b.y+b.h-bevel)*sy],
    [(b.x+b.w-bevel)*sx,(b.y+b.h)*sy],
    [(b.x+bevel)*sx,(b.y+b.h)*sy],
    [b.x*sx,(b.y+b.h-bevel)*sy],
    [b.x*sx,(b.y+bevel)*sy],
  ];
  const arenaPath=()=>{
    ctx.beginPath();
    ctx.moveTo(poly[0][0],poly[0][1]);
    for(let i=1;i<poly.length;i+=1) ctx.lineTo(poly[i][0],poly[i][1]);
    ctx.closePath();
  };

  arenaPath();
  const base=ctx.createLinearGradient(
    b.x*sx,b.y*sy,
    (b.x+b.w)*sx,(b.y+b.h)*sy,
  );
  base.addColorStop(0,"#735947");
  base.addColorStop(.45,"#665040");
  base.addColorStop(1,"#503f35");
  ctx.fillStyle=base;
  ctx.fill();

  ctx.save();
  arenaPath();
  ctx.clip();

  // Broad hand-painted undertones make the stone feel aged instead of flat.
  const underlay=[
    ["rgba(181,137,94,.055)",.18,.22,.34,.26],
    ["rgba(78,55,44,.095)",.57,.20,.30,.24],
    ["rgba(197,151,102,.045)",.74,.62,.28,.25],
    ["rgba(59,43,37,.085)",.26,.70,.33,.24],
  ];
  for(const [color,nx,ny,nw,nh] of underlay){
    ctx.fillStyle=color;
    ctx.beginPath();
    ctx.ellipse(
      (b.x+b.w*nx)*sx,
      (b.y+b.h*ny)*sy,
      b.w*nw*sx,
      b.h*nh*sy,
      -.22,
      0,
      Math.PI*2,
    );
    ctx.fill();
  }

  // Hand-laid stone courses. Row heights and stone widths vary continuously,
  // with staggered joins and uneven polygon corners: no checkerboard grid.
  const stoneColors=[
    "rgba(188,158,126,.115)",
    "rgba(139,111,90,.095)",
    "rgba(104,82,70,.105)",
    "rgba(210,174,132,.070)",
    "rgba(82,65,58,.085)",
  ];
  const rowCount=6;
  const rowH=b.h/rowCount;
  for(let row=0;row<rowCount;row+=1){
    const y0=b.y+row*rowH;
    const y1=b.y+(row+1)*rowH;
    let x=b.x-(row%2?68:18)+random()*28;

    while(x<b.x+b.w+40){
      const tileW=110+random()*105;
      const x1=x+tileW;
      const topJ=(random()-.5)*14;
      const bottomJ=(random()-.5)*16;
      const leftMid=(random()-.5)*10;
      const rightMid=(random()-.5)*10;
      const yTop0=y0+(random()-.5)*9;
      const yTop1=y0+(random()-.5)*9;
      const yBottom0=y1+(random()-.5)*10;
      const yBottom1=y1+(random()-.5)*10;

      ctx.beginPath();
      ctx.moveTo((x+topJ)*sx,yTop0*sy);
      ctx.lineTo((x1+topJ*.25)*sx,yTop1*sy);
      ctx.lineTo((x1+rightMid)*sx,(y0+rowH*.48)*sy);
      ctx.lineTo((x1+bottomJ*.25)*sx,yBottom1*sy);
      ctx.lineTo((x+bottomJ)*sx,yBottom0*sy);
      ctx.lineTo((x+leftMid)*sx,(y0+rowH*.50)*sy);
      ctx.closePath();

      ctx.fillStyle=stoneColors[Math.floor(random()*stoneColors.length)];
      ctx.fill();
      ctx.strokeStyle="rgba(34,25,22,.20)";
      ctx.lineWidth=(1.0+random()*.65)*sx;
      ctx.stroke();

      // One soft highlight edge per some stones makes the floor look carved.
      if(random()>.58){
        ctx.beginPath();
        ctx.moveTo((x+10)*sx,(yTop0+5)*sy);
        ctx.lineTo((x1-12)*sx,(yTop1+5)*sy);
        ctx.strokeStyle="rgba(230,191,145,.055)";
        ctx.lineWidth=.8*sx;
        ctx.stroke();
      }
      x=x1-2+random()*8;
    }
  }

  // A worn central combat lane breaks the courses and makes the middle feel
  // naturally polished by movement rather than decorated with a target shape.
  const cx=(b.x+b.w/2)*sx;
  const cy=(b.y+b.h/2)*sy;
  const wear=ctx.createRadialGradient(
    cx,cy,20*sx,
    cx,cy,260*sx,
  );
  wear.addColorStop(0,"rgba(226,173,116,.055)");
  wear.addColorStop(.42,"rgba(124,90,67,.035)");
  wear.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=wear;
  ctx.fillRect(cx-300*sx,cy-220*sy,600*sx,440*sy);

  // Sparse hand-cut cracks; short enough to read as masonry damage, not twigs.
  for(let i=0;i<8;i+=1){
    let x=(b.x+90+random()*(b.w-180))*sx;
    let y=(b.y+65+random()*(b.h-130))*sy;
    const angle=random()*Math.PI*2;
    const seg=(12+random()*24)*sx;
    ctx.beginPath();
    ctx.moveTo(x,y);
    for(let p=0;p<2+Math.floor(random()*2);p+=1){
      x+=Math.cos(angle+(random()-.5)*.35)*seg;
      y+=Math.sin(angle+(random()-.5)*.35)*seg;
      ctx.lineTo(x,y);
    }
    ctx.strokeStyle="rgba(31,22,20,.16)";
    ctx.lineWidth=.75*sx;
    ctx.stroke();
  }

  // Local warm fire pools remain subtle: actual point lights do most work.
  ctx.globalCompositeOperation="screen";
  const fires=[
    [b.x+48,b.y+48],
    [b.x+b.w-48,b.y+48],
    [b.x+48,b.y+b.h-48],
    [b.x+b.w-48,b.y+b.h-48],
  ];
  for(const [gx,gy] of fires){
    const x=gx*sx;
    const y=gy*sy;
    const r=92*sx;
    const g=ctx.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,"rgba(255,139,57,.15)");
    g.addColorStop(.42,"rgba(230,86,31,.050)");
    g.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=g;
    ctx.fillRect(x-r,y-r,r*2,r*2);
  }
  ctx.globalCompositeOperation="source-over";

  // Tiny chips add hand-made texture without cluttering combat readability.
  for(let i=0;i<34;i+=1){
    const x=(b.x+45+random()*(b.w-90))*sx;
    const y=(b.y+42+random()*(b.h-84))*sy;
    const r=(.8+random()*2.3)*sx;
    ctx.fillStyle=random()>.5
      ?"rgba(224,188,143,.10)"
      :"rgba(28,20,18,.16)";
    ctx.beginPath();
    ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fill();
  }

  // Slight edge falloff frames the combat area while keeping the center warm.
  const vignette=ctx.createRadialGradient(
    cx,cy,Math.min(width,height)*.24,
    cx,cy,Math.min(width,height)*.68,
  );
  vignette.addColorStop(0,"rgba(0,0,0,0)");
  vignette.addColorStop(.72,"rgba(26,18,16,.025)");
  vignette.addColorStop(1,"rgba(20,14,13,.14)");
  ctx.fillStyle=vignette;
  ctx.fillRect(b.x*sx,b.y*sy,b.w*sx,b.h*sy);
  ctx.restore();

  arenaPath();
  ctx.strokeStyle="rgba(28,20,18,.76)";
  ctx.lineWidth=5*sx;
  ctx.stroke();
  arenaPath();
  ctx.strokeStyle="rgba(230,180,124,.14)";
  ctx.lineWidth=1.15*sx;
  ctx.stroke();

  texture.update(false);
  texture.wrapU=BABYLON.Texture.CLAMP_ADDRESSMODE;
  texture.wrapV=BABYLON.Texture.CLAMP_ADDRESSMODE;
  texture.anisotropicFilteringLevel=8;
  return texture;
}

function createGrandRingFloorTexture(BABYLON,scene,arena,mapping) {
  const width=1024;
  const height=Math.max(512,Math.round(width*mapping.height/mapping.width));
  const texture=new BABYLON.DynamicTexture(
    "babylon-grand-ring-placeholder-floor",
    {width,height},
    scene,
    false,
  );
  const ctx=texture.getContext();
  const random=seededRandom(0x4a77c1);

  const g=ctx.createLinearGradient(0,0,width,height);
  g.addColorStop(0,"#42513b");
  g.addColorStop(.48,"#3a4936");
  g.addColorStop(1,"#303d30");
  ctx.fillStyle=g;
  ctx.fillRect(0,0,width,height);

  for(let i=0;i<38;i+=1){
    const x=random()*width;
    const y=random()*height;
    const r=30+random()*120;
    const patch=ctx.createRadialGradient(x,y,0,x,y,r);
    patch.addColorStop(
      0,
      random()>.5
        ?"rgba(103,122,77,.06)"
        :"rgba(28,35,27,.07)",
    );
    patch.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=patch;
    ctx.fillRect(x-r,y-r,r*2,r*2);
  }

  texture.update(false);
  texture.wrapU=BABYLON.Texture.CLAMP_ADDRESSMODE;
  texture.wrapV=BABYLON.Texture.CLAMP_ADDRESSMODE;
  return texture;
}

function createFloorTexture(BABYLON,scene,arena,mapping) {
  if(arena.id==="emberwatch-bastion"){
    return createEmberwatchFloorTexture(BABYLON,scene,arena,mapping);
  }
  return arena.id==="windscar-proving-grounds"
    ? createWindscarFloorTexture(BABYLON,scene,arena,mapping)
    : createGrandRingFloorTexture(BABYLON,scene,arena,mapping);
}

function addFloor(BABYLON,scene,arena,mapping,materials,root,ownedTextures) {
  const floorTexture=createFloorTexture(BABYLON,scene,arena,mapping);
  ownedTextures.push(floorTexture);

  const floorMat=arena.id==="emberwatch-bastion"
    ? materials.bastionFloor
    : arena.id==="windscar-proving-grounds"
      ? materials.floor
      : materials.grandFloor;
  if(floorMat instanceof BABYLON.PBRMaterial){
    floorMat.albedoTexture=floorTexture;
    floorMat.albedoColor=new BABYLON.Color3(1,1,1);
  }else{
    floorMat.diffuseTexture=floorTexture;
    floorMat.diffuseColor=new BABYLON.Color3(1,1,1);
    floorMat.specularColor=new BABYLON.Color3(.035,.03,.025);
  }

  const ground=BABYLON.MeshBuilder.CreateGround(
    "babylon-arena-floor",
    {
      width:mapping.worldWidth,
      height:mapping.worldHeight,
      subdivisions:1,
    },
    scene,
  );
  ground.position.y=0;
  ground.material=floorMat;
  ground.receiveShadows=true;
  ground.parent=root;
  return ground;
}

function addBorder(
  BABYLON,
  scene,
  arena,
  mapping,
  materials,
  root,
  shadowCasters,
) {
  const b=arena.bounds;
  const edgePx=10;
  const edgeHeight=.48;
  const cx=b.x+b.w/2;
  const cy=b.y+b.h/2;
  const defs=[
    {id:"top",x:cx,y:b.y-edgePx/2,w:b.w+edgePx*2,h:edgePx},
    {id:"bottom",x:cx,y:b.y+b.h+edgePx/2,w:b.w+edgePx*2,h:edgePx},
    {id:"left",x:b.x-edgePx/2,y:cy,w:edgePx,h:b.h},
    {id:"right",x:b.x+b.w+edgePx/2,y:cy,w:edgePx,h:b.h},
  ];

  for(const edge of defs){
    const p=mapping.gameToWorld(edge.x,edge.y,edgeHeight/2);
    const lip=createChamferedPrism(
      BABYLON,scene,
      "babylon-boundary-lip-"+edge.id,
      edge.w*mapping.scale,
      edgeHeight,
      edge.h*mapping.scale,
      .16,
      p,
      materials.borderCap,
    );
    lip.parent=root;
    lip.receiveShadows=true;
  }
}

function addOuterWallArchitecture(
  BABYLON,
  scene,
  arena,
  mapping,
  materials,
  root,
  shadowCasters,
) {
  const b=arena.bounds;
  const wallHeight=4.15;
  const capHeight=.40;
  const depthPx=20;

  const addSegment=(name,gx,gy,wPx,dPx,index)=>{
    const bodyPos=mapping.gameToWorld(gx,gy,wallHeight/2);
    const body=createChamferedPrism(
      BABYLON,scene,
      name+"-body",
      wPx*mapping.scale,
      wallHeight,
      dPx*mapping.scale,
      .30,
      bodyPos,
      index%3===1?materials.outerWallAlt:materials.outerWall,
    );
    body.parent=root;
    body.receiveShadows=true;
    shadowCasters.push(body);

    const capPos=mapping.gameToWorld(gx,gy,wallHeight+capHeight/2);
    const cap=createChamferedPrism(
      BABYLON,scene,
      name+"-cap",
      Math.max(.4,wPx*mapping.scale-.15),
      capHeight,
      Math.max(.4,dPx*mapping.scale-.15),
      .22,
      capPos,
      index%2?materials.outerWallTopAlt:materials.outerWallTop,
    );
    cap.parent=root;
    cap.receiveShadows=true;
    shadowCasters.push(cap);
  };

  const horizontalSegments=8;
  const hSegW=b.w/horizontalSegments;
  for(let i=0;i<horizontalSegments;i+=1){
    const gx=b.x+hSegW*(i+.5);
    addSegment(
      "babylon-outer-top-"+i,
      gx,
      b.y-depthPx/2-4,
      hSegW-4,
      depthPx,
      i,
    );
    addSegment(
      "babylon-outer-bottom-"+i,
      gx,
      b.y+b.h+depthPx/2+4,
      hSegW-4,
      depthPx,
      i+10,
    );
  }

  const verticalSegments=4;
  const vSegH=b.h/verticalSegments;
  for(let i=0;i<verticalSegments;i+=1){
    const gy=b.y+vSegH*(i+.5);
    addSegment(
      "babylon-outer-left-"+i,
      b.x-depthPx/2-5,
      gy,
      depthPx,
      vSegH-5,
      i+20,
    );
    addSegment(
      "babylon-outer-right-"+i,
      b.x+b.w+depthPx/2+5,
      gy,
      depthPx,
      vSegH-5,
      i+30,
    );
  }
}

function addGroundDebris(
  BABYLON,
  scene,
  arena,
  mapping,
  materials,
  root,
) {
  const b=arena.bounds;
  const random=seededRandom(
    arena.id==="windscar-proving-grounds"?0x6bc22:0x9231a,
  );
  const anchors=[
    [b.x+170,b.y+105],
    [b.x+b.w-185,b.y+112],
    [b.x+225,b.y+b.h-105],
    [b.x+b.w-235,b.y+b.h-102],
    [b.x+370,b.y+70],
    [b.x+b.w-390,b.y+b.h-72],
  ];

  let index=0;
  for(const [ax,ay] of anchors){
    const pieces=2+Math.floor(random()*2);
    for(let i=0;i<pieces;i+=1){
      const p=mapping.gameToWorld(
        ax+(random()-.5)*34,
        ay+(random()-.5)*22,
        0,
      );
      const length=1.6+random()*2.5;
      const timber=createChamferedPrism(
        BABYLON,scene,
        "babylon-ground-timber-"+index++,
        .15,.07,length,.035,
        {x:p.x,y:.045,z:p.z},
        materials.timber,
      );
      timber.rotation.y=random()*Math.PI;
      timber.parent=root;
    }
  }
}

function addCornerArchitecture(
  BABYLON,
  scene,
  arena,
  mapping,
  materials,
  root,
  shadowCasters,
) {
  const b=arena.bounds;

  // Logical bounds begin only 58 px from the canvas edge, so these structures
  // are intentionally compact and centered outside the playable rectangle.
  // They can be clipped by the screen edge; they must never visually occupy
  // legal walkable ground.
  const outside=34;
  const corners=[
    {id:"nw",x:b.x-outside,y:b.y-outside,sx:1,sy:1},
    {id:"ne",x:b.x+b.w+outside,y:b.y-outside,sx:-1,sy:1},
    {id:"sw",x:b.x-outside,y:b.y+b.h+outside,sx:1,sy:-1},
    {id:"se",x:b.x+b.w+outside,y:b.y+b.h+outside,sx:-1,sy:-1},
  ];

  for(const corner of corners){
    const p=mapping.gameToWorld(corner.x,corner.y,0);

    const terraceSpecs=[
      {w:5.0,d:5.0,h:.38,y:.19},
      {w:4.25,d:4.25,h:.48,y:.61},
      {w:3.45,d:3.45,h:.52,y:1.11},
    ];

    terraceSpecs.forEach((spec,index)=>{
      const terrace=createChamferedPrism(
        BABYLON,scene,
        "babylon-corner-terrace-"+corner.id+"-"+index,
        spec.w,spec.h,spec.d,
        .52,
        {x:p.x,y:spec.y,z:p.z},
        index===2?materials.shrineTop:materials.shrineStone,
      );
      terrace.parent=root;
      terrace.receiveShadows=true;
      shadowCasters.push(terrace);
    });

    // Narrow buttresses fit in the non-playable margin and frame the flame.
    for(const side of [-1,1]){
      const brace=createChamferedPrism(
        BABYLON,scene,
        "babylon-corner-brace-"+corner.id+"-"+side,
        1.0,2.35,2.75,.24,
        {
          x:p.x+side*2.15,
          y:1.30,
          z:p.z+.25*corner.sy,
        },
        materials.shrineDark,
      );
      brace.parent=root;
      brace.receiveShadows=true;
      shadowCasters.push(brace);
    }
  }
}


export function babylonObstacleVisualHeight(rect) {
  const longSide=Math.max(
    .01,
    Number(rect?.width)||0,
    Number(rect?.depth)||0,
  );
  const shortSide=Math.max(
    .01,
    Math.min(
      Number(rect?.width)||longSide,
      Number(rect?.depth)||longSide,
    ),
  );
  const aspect=longSide/shortSide;
  const baseHeight=6.55+Math.min(1.25,longSide*.018);
  const wallScale=aspect>2
    ? Math.max(.74,1-(aspect-2)*.12)
    : 1;
  return baseHeight*wallScale;
}

function addObstacleTopBlocks(
  BABYLON,
  scene,
  obstacle,
  index,
  rect,
  height,
  capHeight,
  materials,
  root,
  shadowCasters,
) {
  const horizontal=rect.width>=rect.depth;
  const longSide=horizontal?rect.width:rect.depth;
  const shortSide=horizontal?rect.depth:rect.width;
  const aspect=longSide/Math.max(.01,shortSide);
  const count=aspect>2.05
    ? Math.max(3,Math.min(4,Math.round(longSide/8.2)))
    : 1;
  const gap=.14;
  const segmentLong=(longSide-gap*(count-1))/count;

  for(let i=0;i<count;i+=1){
    const offset=-longSide/2+segmentLong/2+i*(segmentLong+gap);
    const width=horizontal?segmentLong:Math.max(.4,rect.width-.22);
    const depth=horizontal?Math.max(.4,rect.depth-.22):segmentLong;
    const px=rect.center.x+(horizontal?offset:0);
    const pz=rect.center.z+(horizontal?0:offset);
    const block=createChamferedPrism(
      BABYLON,scene,
      "babylon-los-top-block-"+(obstacle.id||index)+"-"+i,
      width,
      .24,
      depth,
      Math.min(.28,Math.min(width,depth)*.08),
      {
        x:px,
        y:height+capHeight+.12+(i%2)*.025,
        z:pz,
      },
      i%3===1?materials.stoneTopAlt:materials.stoneTop,
    );
    block.parent=root;
    block.receiveShadows=true;
    shadowCasters.push(block);
  }
}

function addTopCracks(
  BABYLON,
  scene,
  obstacle,
  index,
  rect,
  height,
  materials,
  root,
) {
  const random=seededRandom(0x91d3+index*173);
  const horizontal=rect.width>=rect.depth;
  const count=Math.max(1,Math.min(3,Math.round(Math.max(rect.width,rect.depth)/9)));
  for(let i=0;i<count;i+=1){
    const along=(random()-.5)*(horizontal?rect.width:rect.depth)*.55;
    const across=(random()-.5)*(horizontal?rect.depth:rect.width)*.22;
    const length=.9+random()*1.8;
    const crack=createBox(
      BABYLON,scene,
      "babylon-los-crack-"+(obstacle.id||index)+"-"+i,
      .075,
      .035,
      length,
      {
        x:rect.center.x+(horizontal?along:across),
        y:height+.75,
        z:rect.center.z+(horizontal?across:along),
      },
      materials.crack,
    );
    crack.rotation.y=(horizontal?Math.PI/2:0)+(random()-.5)*.6;
    crack.parent=root;
  }
}

function addWindscarFrontRune(
  BABYLON,
  scene,
  name,
  rect,
  elevation,
  width,
  height,
  materials,
  root,
) {
  const z=rect.center.z-rect.depth/2;

  const backing=BABYLON.MeshBuilder.CreatePlane(
    name+"-backing",
    {
      width:width*1.25,
      height:height*1.22,
      sideOrientation:BABYLON.Mesh.DOUBLESIDE,
    },
    scene,
  );
  backing.position.set(rect.center.x,elevation,z-.026);
  backing.material=materials.windscarInset;
  backing.parent=root;

  const rune=BABYLON.MeshBuilder.CreateDisc(
    name+"-diamond",
    {
      radius:Math.min(width,height)*.31,
      tessellation:4,
      sideOrientation:BABYLON.Mesh.DOUBLESIDE,
    },
    scene,
  );
  rune.position.set(rect.center.x,elevation,z-.032);
  rune.rotation.z=Math.PI/4;
  rune.material=materials.windscarRune;
  rune.parent=root;
  return rune;
}

function addWindscarPillar(
  BABYLON,
  scene,
  obstacle,
  index,
  rect,
  materials,
  root,
  shadowCasters,
) {
  const height=5.45;
  const chamfer=Math.min(.84,Math.min(rect.width,rect.depth)*.11);

  const plinth=createChamferedPrism(
    BABYLON,scene,
    "windscar-pillar-plinth-"+index,
    rect.width,
    .52,
    rect.depth,
    chamfer,
    {x:rect.center.x,y:.26,z:rect.center.z},
    materials.windscarStoneDark,
  );
  plinth.parent=root;
  plinth.receiveShadows=true;
  shadowCasters.push(plinth);

  const lower=createChamferedPrism(
    BABYLON,scene,
    "windscar-pillar-lower-"+index,
    rect.width-.42,
    .48,
    rect.depth-.42,
    chamfer*.92,
    {x:rect.center.x,y:.76,z:rect.center.z},
    materials.windscarStoneAlt,
  );
  lower.parent=root;
  lower.receiveShadows=true;
  shadowCasters.push(lower);

  const body=createChamferedFrustum(
    BABYLON,scene,
    "windscar-pillar-body-"+index,
    rect.width-1.00,
    rect.depth-1.00,
    rect.width-1.72,
    rect.depth-1.72,
    3.35,
    chamfer*.74,
    {x:rect.center.x,y:2.55,z:rect.center.z},
    materials.windscarStone,
  );
  body.parent=root;
  body.receiveShadows=true;
  shadowCasters.push(body);

  const shoulder=createChamferedPrism(
    BABYLON,scene,
    "windscar-pillar-shoulder-"+index,
    rect.width-1.18,
    .44,
    rect.depth-1.18,
    chamfer*.78,
    {x:rect.center.x,y:4.38,z:rect.center.z},
    materials.windscarStoneTopAlt,
  );
  shoulder.parent=root;
  shoulder.receiveShadows=true;
  shadowCasters.push(shoulder);

  const capital=createChamferedPrism(
    BABYLON,scene,
    "windscar-pillar-capital-"+index,
    rect.width-.72,
    .38,
    rect.depth-.72,
    chamfer*.86,
    {x:rect.center.x,y:4.79,z:rect.center.z},
    materials.windscarStoneTop,
  );
  capital.parent=root;
  capital.receiveShadows=true;
  shadowCasters.push(capital);

  // Babylon 4-sided cone gives a strong arena monument silhouette.
  const roof=BABYLON.MeshBuilder.CreateCylinder(
    "windscar-pillar-roof-"+index,
    {
      diameterTop:.18,
      diameterBottom:Math.min(rect.width,rect.depth)-1.72,
      height:1.10,
      tessellation:4,
    },
    scene,
  );
  roof.position.set(rect.center.x,5.53,rect.center.z);
  roof.rotation.y=Math.PI/4;
  roof.material=materials.windscarStoneTop;
  roof.convertToFlatShadedMesh?.();
  roof.parent=root;
  roof.receiveShadows=true;
  shadowCasters.push(roof);

  addWindscarFrontRune(
    BABYLON,scene,
    "windscar-pillar-rune-"+index,
    rect,
    2.65,
    1.18,
    .72,
    materials,
    root,
  );
}

function addWindscarCenterWall(
  BABYLON,
  scene,
  obstacle,
  rect,
  materials,
  root,
  shadowCasters,
) {
  const wallHeight=3.95;
  const chamfer=.54;

  const base=createChamferedPrism(
    BABYLON,scene,
    "windscar-wall-plinth",
    rect.width,
    .50,
    rect.depth,
    chamfer,
    {x:rect.center.x,y:.25,z:rect.center.z},
    materials.windscarStoneDark,
  );
  base.parent=root;
  base.receiveShadows=true;
  shadowCasters.push(base);

  const body=createChamferedFrustum(
    BABYLON,scene,
    "windscar-wall-body",
    rect.width-.38,
    rect.depth-.38,
    rect.width-.92,
    rect.depth-.88,
    2.85,
    .46,
    {x:rect.center.x,y:1.87,z:rect.center.z},
    materials.windscarStone,
  );
  body.parent=root;
  body.receiveShadows=true;
  shadowCasters.push(body);

  const parapet=createChamferedPrism(
    BABYLON,scene,
    "windscar-wall-parapet",
    rect.width-.56,
    .40,
    rect.depth-.62,
    .42,
    {x:rect.center.x,y:3.50,z:rect.center.z},
    materials.windscarStoneTopAlt,
  );
  parapet.parent=root;
  parapet.receiveShadows=true;
  shadowCasters.push(parapet);

  // Heavy end towers turn the flat collision bar into an arena rampart.
  const endX=rect.width/2-2.75;
  for(const side of [-1,1]){
    const towerX=rect.center.x+side*endX;
    const tower=createChamferedFrustum(
      BABYLON,scene,
      "windscar-wall-tower-"+side,
      4.90,
      Math.max(4.7,rect.depth-.42),
      4.28,
      Math.max(4.2,rect.depth-.92),
      1.55,
      .42,
      {x:towerX,y:4.15,z:rect.center.z},
      materials.windscarStoneAlt,
    );
    tower.parent=root;
    tower.receiveShadows=true;
    shadowCasters.push(tower);

    const towerCap=BABYLON.MeshBuilder.CreateCylinder(
      "windscar-wall-tower-cap-"+side,
      {
        diameterTop:.16,
        diameterBottom:3.90,
        height:.82,
        tessellation:4,
      },
      scene,
    );
    towerCap.position.set(towerX,5.30,rect.center.z);
    towerCap.rotation.y=Math.PI/4;
    towerCap.material=materials.windscarStoneTop;
    towerCap.convertToFlatShadedMesh?.();
    towerCap.parent=root;
    towerCap.receiveShadows=true;
    shadowCasters.push(towerCap);
  }

  // Recessed near-face plate with a warm metal frame and twin ember slits.
  const frame=BABYLON.MeshBuilder.CreatePlane(
    "windscar-wall-front-frame",
    {width:7.72,height:1.72,sideOrientation:BABYLON.Mesh.DOUBLESIDE},
    scene,
  );
  frame.position.set(
    rect.center.x,
    2.03,
    rect.center.z-rect.depth/2-.026,
  );
  frame.material=materials.windscarTrim;
  frame.parent=root;

  const plate=BABYLON.MeshBuilder.CreatePlane(
    "windscar-wall-front-plate",
    {width:7.2,height:1.42,sideOrientation:BABYLON.Mesh.DOUBLESIDE},
    scene,
  );
  plate.position.set(
    rect.center.x,
    2.03,
    rect.center.z-rect.depth/2-.032,
  );
  plate.material=materials.windscarInset;
  plate.parent=root;

  for(const xOffset of [-1.55,1.55]){
    const slit=BABYLON.MeshBuilder.CreatePlane(
      "windscar-wall-ember-slit-"+xOffset,
      {width:.24,height:.80,sideOrientation:BABYLON.Mesh.DOUBLESIDE},
      scene,
    );
    slit.position.set(
      rect.center.x+xOffset,
      2.03,
      rect.center.z-rect.depth/2-.039,
    );
    slit.material=materials.windscarRune;
    slit.parent=root;
  }
}

function addWindscarObstacle(
  BABYLON,
  scene,
  obstacle,
  index,
  mapping,
  materials,
  root,
  shadowCasters,
) {
  const rect=mapping.rectToWorld(obstacle);

  addContactShadow(
    BABYLON,scene,
    "windscar-los-shadow-"+(obstacle.id||index),
    rect.center,
    rect.width+2.75,
    rect.depth+2.9,
    materials,
    root,
  );

  if(obstacle.id==="center-wall"){
    addWindscarCenterWall(
      BABYLON,scene,obstacle,rect,materials,root,shadowCasters,
    );
    return;
  }

  addWindscarPillar(
    BABYLON,scene,obstacle,index,rect,materials,root,shadowCasters,
  );
}

function addBastionSpire(
  BABYLON,scene,obstacle,index,rect,materials,root,shadowCasters,
) {
  const w=rect.width;
  const d=rect.depth;
  const c=Math.min(.72,Math.min(w,d)*.10);

  // Wide stepped base like a hand-built arena monument.
  const base=createChamferedPrism(
    BABYLON,scene,"bastion-pillar-base-"+index,
    w,.48,d,c,
    {x:rect.center.x,y:.24,z:rect.center.z},
    materials.bastionStoneDark,
  );
  base.parent=root; base.receiveShadows=true; shadowCasters.push(base);

  const lower=createChamferedPrism(
    BABYLON,scene,"bastion-pillar-lower-"+index,
    w-.42,.40,d-.42,c*.88,
    {x:rect.center.x,y:.68,z:rect.center.z},
    materials.bastionAccentStone,
  );
  lower.parent=root; lower.receiveShadows=true; shadowCasters.push(lower);

  // Square tapered shaft – much closer to a carved fantasy pillar than a tower.
  const shaft=createChamferedFrustum(
    BABYLON,scene,"bastion-pillar-shaft-"+index,
    w-1.18,d-1.18,
    w-1.72,d-1.72,
    3.02,c*.70,
    {x:rect.center.x,y:2.38,z:rect.center.z},
    materials.bastionStone,
  );
  shaft.parent=root; shaft.receiveShadows=true; shadowCasters.push(shaft);

  // Slightly oversized hand-cut shoulder/capital.
  const shoulder=createChamferedPrism(
    BABYLON,scene,"bastion-pillar-shoulder-"+index,
    w-1.06,.42,d-1.06,c*.78,
    {x:rect.center.x,y:4.12,z:rect.center.z},
    materials.bastionStoneTrim,
  );
  shoulder.parent=root; shoulder.receiveShadows=true; shadowCasters.push(shoulder);

  const cap=createChamferedPrism(
    BABYLON,scene,"bastion-pillar-cap-"+index,
    w-.72,.30,d-.72,c*.84,
    {x:rect.center.x,y:4.48,z:rect.center.z},
    materials.bastionStoneTop,
  );
  cap.parent=root; cap.receiveShadows=true; shadowCasters.push(cap);

  // Broad truncated pyramid top, inspired by carved arena/temple pillars.
  const crown=BABYLON.MeshBuilder.CreateCylinder(
    "bastion-pillar-crown-"+index,
    {
      diameterTop:Math.min(w,d)*.46,
      diameterBottom:Math.min(w,d)*.70,
      height:.86,
      tessellation:4,
    },
    scene,
  );
  crown.position.set(rect.center.x,5.06,rect.center.z);
  crown.rotation.y=Math.PI/4;
  crown.material=materials.bastionStoneTop;
  crown.convertToFlatShadedMesh?.();
  crown.parent=root; crown.receiveShadows=true; shadowCasters.push(crown);

  // A shallow pyramidal relief gives the top a handmade focal shape.
  const relief=BABYLON.MeshBuilder.CreateCylinder(
    "bastion-pillar-relief-"+index,
    {
      diameterTop:.08,
      diameterBottom:Math.min(w,d)*.40,
      height:.44,
      tessellation:4,
    },
    scene,
  );
  relief.position.set(rect.center.x,5.66,rect.center.z);
  relief.rotation.y=Math.PI/4;
  relief.material=materials.bastionAccentStone;
  relief.convertToFlatShadedMesh?.();
  relief.parent=root; relief.receiveShadows=true; shadowCasters.push(relief);

  // Small carved face plaque instead of a hanging banner.
  const plaque=BABYLON.MeshBuilder.CreatePlane(
    "bastion-pillar-plaque-"+index,
    {width:1.42,height:1.18,sideOrientation:BABYLON.Mesh.DOUBLESIDE},
    scene,
  );
  plaque.position.set(
    rect.center.x,
    2.42,
    rect.center.z-d/2-.028,
  );
  plaque.material=materials.bastionInset;
  plaque.parent=root;

  const mark=BABYLON.MeshBuilder.CreateDisc(
    "bastion-pillar-mark-"+index,
    {radius:.30,tessellation:4,sideOrientation:BABYLON.Mesh.DOUBLESIDE},
    scene,
  );
  mark.position.set(
    rect.center.x,
    2.44,
    rect.center.z-d/2-.034,
  );
  mark.rotation.z=Math.PI/4;
  mark.material=materials.bastionBannerTrim;
  mark.parent=root;
}

function addBastionRampart(
  BABYLON,scene,obstacle,index,rect,materials,root,shadowCasters,
) {
  const horizontal=rect.width>=rect.depth;
  const c=.38;
  const longSide=horizontal?rect.width:rect.depth;

  const base=createChamferedPrism(
    BABYLON,scene,"bastion-rampart-base-"+index,
    rect.width,.46,rect.depth,c,
    {x:rect.center.x,y:.23,z:rect.center.z},
    materials.bastionStoneDark,
  );
  base.parent=root; base.receiveShadows=true; shadowCasters.push(base);

  const body=createChamferedFrustum(
    BABYLON,scene,"bastion-rampart-body-"+index,
    rect.width-.26,rect.depth-.26,
    rect.width-.70,rect.depth-.66,
    2.46,c*.82,
    {x:rect.center.x,y:1.69,z:rect.center.z},
    materials.bastionStone,
  );
  body.parent=root; body.receiveShadows=true; shadowCasters.push(body);

  // Three slightly varied top stones stop the wall from feeling machine-made.
  const moduleCount=3;
  const gap=.12;
  const moduleLong=(longSide-1.20-gap*(moduleCount-1))/moduleCount;
  for(let i=0;i<moduleCount;i+=1){
    const offset=-longSide/2+.60+moduleLong/2+i*(moduleLong+gap);
    const y=3.12+(i===1?.10:(i===2?-.04:0));
    const cap=createChamferedPrism(
      BABYLON,scene,
      "bastion-rampart-cap-"+index+"-"+i,
      horizontal?moduleLong:Math.max(.8,rect.width-.72),
      .46,
      horizontal?Math.max(.8,rect.depth-.72):moduleLong,
      .25,
      {
        x:rect.center.x+(horizontal?offset:0),
        y,
        z:rect.center.z+(horizontal?0:offset),
      },
      i===1?materials.bastionStoneTop:materials.bastionAccentStone,
    );
    cap.parent=root; cap.receiveShadows=true; shadowCasters.push(cap);
  }

  // Heavy square end stones echo the pillar language instead of castle turrets.
  const endOffset=longSide/2-1.90;
  for(const side of [-1,1]){
    const px=rect.center.x+(horizontal?side*endOffset:0);
    const pz=rect.center.z+(horizontal?0:side*endOffset);

    const endBase=createChamferedPrism(
      BABYLON,scene,
      "bastion-rampart-end-"+index+"-"+side,
      horizontal?3.35:Math.max(.9,rect.width-.54),
      3.15,
      horizontal?Math.max(.9,rect.depth-.54):3.35,
      .34,
      {x:px,y:1.85,z:pz},
      materials.bastionStoneTrim,
    );
    endBase.parent=root; endBase.receiveShadows=true; shadowCasters.push(endBase);

    const endTop=BABYLON.MeshBuilder.CreateCylinder(
      "bastion-rampart-endtop-"+index+"-"+side,
      {
        diameterTop:1.30,
        diameterBottom:2.58,
        height:.72,
        tessellation:4,
      },
      scene,
    );
    endTop.position.set(px,3.78,pz);
    endTop.rotation.y=Math.PI/4;
    endTop.material=materials.bastionStoneTop;
    endTop.convertToFlatShadedMesh?.();
    endTop.parent=root; endTop.receiveShadows=true; shadowCasters.push(endTop);
  }

  // Recessed carved face with two restrained gold details.
  const inset=BABYLON.MeshBuilder.CreatePlane(
    "bastion-rampart-inset-"+index,
    {
      width:horizontal?Math.min(7.5,rect.width-4.6):1.34,
      height:horizontal?1.20:Math.min(7.5,rect.depth-4.6),
      sideOrientation:BABYLON.Mesh.DOUBLESIDE,
    },
    scene,
  );
  if(horizontal){
    inset.position.set(rect.center.x,1.82,rect.center.z-rect.depth/2-.030);
  }else{
    inset.position.set(rect.center.x-rect.width/2-.030,1.82,rect.center.z);
    inset.rotation.y=Math.PI/2;
  }
  inset.material=materials.bastionInset;
  inset.parent=root;

  if(horizontal){
    for(const off of [-1.45,1.45]){
      const mark=BABYLON.MeshBuilder.CreateDisc(
        "bastion-rampart-mark-"+index+"-"+off,
        {radius:.23,tessellation:4,sideOrientation:BABYLON.Mesh.DOUBLESIDE},
        scene,
      );
      mark.position.set(
        rect.center.x+off,
        1.84,
        rect.center.z-rect.depth/2-.036,
      );
      mark.rotation.z=Math.PI/4;
      mark.material=materials.bastionBannerTrim;
      mark.parent=root;
    }
  }
}

function addBastionObstacle(
  BABYLON,scene,obstacle,index,mapping,materials,root,shadowCasters,
) {
  const rect=mapping.rectToWorld(obstacle);
  addContactShadow(
    BABYLON,scene,
    "bastion-los-shadow-"+(obstacle.id||index),
    rect.center,rect.width+2.6,rect.depth+2.8,
    materials,root,
  );
  if(obstacle.id.includes("rampart")){
    addBastionRampart(
      BABYLON,scene,obstacle,index,rect,materials,root,shadowCasters,
    );
  }else{
    addBastionSpire(
      BABYLON,scene,obstacle,index,rect,materials,root,shadowCasters,
    );
  }
}

function addBastionBrazier(
  BABYLON,scene,name,gx,gy,mapping,materials,root,shadowCasters,
  lights,flames,particleSystems,particleTexture,phase,
) {
  const p=mapping.gameToWorld(gx,gy,0);

  const dais=BABYLON.MeshBuilder.CreateCylinder(
    name+"-dais",
    {diameterTop:3.65,diameterBottom:4.15,height:.62,tessellation:8},
    scene,
  );
  dais.position.set(p.x,.31,p.z);
  dais.material=materials.bastionStoneDark;
  dais.convertToFlatShadedMesh?.();
  dais.parent=root; dais.receiveShadows=true; shadowCasters.push(dais);

  const metalRing=BABYLON.MeshBuilder.CreateTorus(
    name+"-ring",
    {diameter:2.15,thickness:.20,tessellation:10},
    scene,
  );
  metalRing.position.set(p.x,.84,p.z);
  metalRing.material=materials.bastionBronze;
  metalRing.parent=root;

  const bowl=BABYLON.MeshBuilder.CreateCylinder(
    name+"-bowl",
    {diameterTop:1.95,diameterBottom:1.22,height:.58,tessellation:8},
    scene,
  );
  bowl.position.set(p.x,.91,p.z);
  bowl.material=materials.bastionMetal;
  bowl.convertToFlatShadedMesh?.();
  bowl.parent=root; shadowCasters.push(bowl);

  const defs=[
    ["outer",1.54,.08,2.50,2.18,materials.flameOuter,.08],
    ["mid",1.00,.05,1.98,1.98,materials.flameMid,-.08],
    ["inner",.54,.03,1.45,1.80,materials.flameInner,.05],
  ];
  const parts={};
  for(const [key,bottom,top,height,y,mat,tilt] of defs){
    const flame=BABYLON.MeshBuilder.CreateCylinder(
      name+"-flame-"+key,
      {diameterTop:top,diameterBottom:bottom,height,tessellation:5},
      scene,
    );
    flame.position.set(p.x,y,p.z);
    flame.rotation.z=tilt;
    flame.material=mat;
    flame.convertToFlatShadedMesh?.();
    flame.parent=root;
    parts[key]=flame;
  }
  flames.push({
    outer:parts.outer,mid:parts.mid,inner:parts.inner,
    glow:null,baseY:2.12,phase,
  });

  const glow=BABYLON.MeshBuilder.CreateDisc(
    name+"-glow",
    {radius:3.0,tessellation:28,sideOrientation:BABYLON.Mesh.DOUBLESIDE},
    scene,
  );
  glow.position.set(p.x,.025,p.z);
  glow.rotation.x=Math.PI/2;
  glow.material=materials.bastionFloorGlow;
  glow.parent=root;

  const light=new BABYLON.PointLight(
    name+"-light",new BABYLON.Vector3(p.x,3.1,p.z),scene,
  );
  light.diffuse=new BABYLON.Color3(1.0,.50,.19);
  light.specular=new BABYLON.Color3(.78,.33,.12);
  light.intensity=4.15;
  light.range=27;
  light.radius=.90;
  lights.push(light);

  if(particleTexture && BABYLON.ParticleSystem){
    const sparks=new BABYLON.ParticleSystem(name+"-embers",70,scene);
    sparks.particleTexture=particleTexture;
    sparks.emitter=new BABYLON.Vector3(p.x,1.40,p.z);
    sparks.minEmitBox=new BABYLON.Vector3(-.28,0,-.28);
    sparks.maxEmitBox=new BABYLON.Vector3(.28,.15,.28);
    sparks.color1=new BABYLON.Color4(1,.48,.10,1);
    sparks.color2=new BABYLON.Color4(1,.80,.28,.94);
    sparks.colorDead=new BABYLON.Color4(.28,.05,.01,0);
    sparks.minSize=.07; sparks.maxSize=.20;
    sparks.minLifeTime=.32; sparks.maxLifeTime=.80;
    sparks.emitRate=24;
    sparks.blendMode=BABYLON.ParticleSystem.BLENDMODE_ADD;
    sparks.direction1=new BABYLON.Vector3(-.16,1.5,-.16);
    sparks.direction2=new BABYLON.Vector3(.16,2.3,.16);
    sparks.minEmitPower=.65; sparks.maxEmitPower=1.1;
    sparks.updateSpeed=.017;
    sparks.start();
    particleSystems.push(sparks);
  }
}

function addBastionPerimeterTower(
  BABYLON,scene,name,gx,gy,mapping,materials,root,shadowCasters,
) {
  const p=mapping.gameToWorld(gx,gy,0);

  const base=BABYLON.MeshBuilder.CreateCylinder(
    name+"-base",
    {diameterTop:5.0,diameterBottom:5.6,height:.72,tessellation:8},
    scene,
  );
  base.position.set(p.x,.36,p.z);
  base.material=materials.bastionStoneDark;
  base.convertToFlatShadedMesh?.();
  base.parent=root; base.receiveShadows=true; shadowCasters.push(base);

  const body=BABYLON.MeshBuilder.CreateCylinder(
    name+"-body",
    {diameterTop:4.0,diameterBottom:4.55,height:3.55,tessellation:8},
    scene,
  );
  body.position.set(p.x,2.46,p.z);
  body.rotation.y=Math.PI/8;
  body.material=materials.bastionStoneTrim;
  body.convertToFlatShadedMesh?.();
  body.parent=root; body.receiveShadows=true; shadowCasters.push(body);

  const band=BABYLON.MeshBuilder.CreateCylinder(
    name+"-band",
    {diameterTop:4.34,diameterBottom:4.34,height:.36,tessellation:8},
    scene,
  );
  band.position.set(p.x,4.16,p.z);
  band.rotation.y=Math.PI/8;
  band.material=materials.bastionBronze;
  band.convertToFlatShadedMesh?.();
  band.parent=root; shadowCasters.push(band);

  const cap=BABYLON.MeshBuilder.CreateCylinder(
    name+"-cap",
    {diameterTop:.14,diameterBottom:4.70,height:1.52,tessellation:4},
    scene,
  );
  cap.position.set(p.x,5.02,p.z);
  cap.rotation.y=Math.PI/4;
  cap.material=materials.bastionRoof;
  cap.convertToFlatShadedMesh?.();
  cap.parent=root; cap.receiveShadows=true; shadowCasters.push(cap);
}

function addBastionPerimeterWall(
  BABYLON,scene,arena,mapping,side,materials,root,shadowCasters,
) {
  const b=arena.bounds;
  const segmentCount=7;
  const segmentW=b.w/segmentCount;
  const gy=side<0?b.y-18:b.y+b.h+18;

  for(let i=0;i<segmentCount;i+=1){
    const gx=b.x+segmentW*(i+.5);
    const p=mapping.gameToWorld(gx,gy,0);
    const body=createChamferedPrism(
      BABYLON,scene,
      "bastion-perimeter-wall-"+side+"-"+i,
      (segmentW-5)*mapping.scale,
      1.85,
      16*mapping.scale,
      .20,
      {x:p.x,y:.925,z:p.z},
      i%2?materials.bastionStoneDark:materials.bastionStone,
    );
    body.parent=root; body.receiveShadows=true; shadowCasters.push(body);

    const cap=createChamferedPrism(
      BABYLON,scene,
      "bastion-perimeter-cap-"+side+"-"+i,
      (segmentW-7)*mapping.scale,
      .30,
      13*mapping.scale,
      .15,
      {x:p.x,y:2.00,z:p.z},
      materials.bastionAccentStone,
    );
    cap.parent=root; cap.receiveShadows=true; shadowCasters.push(cap);

    for(const local of [-.34,0,.34]){
      const merlon=createChamferedPrism(
        BABYLON,scene,
        "bastion-perimeter-merlon-"+side+"-"+i+"-"+local,
        1.05,.70,.70,.12,
        {
          x:p.x+local*(segmentW*mapping.scale*.78),
          y:2.42,
          z:p.z,
        },
        materials.bastionStoneTop,
      );
      merlon.parent=root; merlon.receiveShadows=true; shadowCasters.push(merlon);
    }
  }
}

function addBastionScenery(
  BABYLON,scene,arena,mapping,materials,root,shadowCasters,
  lights,flames,particleSystems,particleTexture,
) {
  const b=arena.bounds;

  addBastionPerimeterWall(
    BABYLON,scene,arena,mapping,-1,materials,root,shadowCasters,
  );
  addBastionPerimeterWall(
    BABYLON,scene,arena,mapping,1,materials,root,shadowCasters,
  );

  const towers=[
    ["nw",b.x-8,b.y-10],
    ["ne",b.x+b.w+8,b.y-10],
    ["sw",b.x-8,b.y+b.h+10],
    ["se",b.x+b.w+8,b.y+b.h+10],
  ];
  for(const [id,x,y] of towers){
    addBastionPerimeterTower(
      BABYLON,scene,"bastion-corner-"+id,
      x,y,mapping,materials,root,shadowCasters,
    );
  }

  const fires=[
    ["nw",b.x+48,b.y+48,.2],
    ["ne",b.x+b.w-48,b.y+48,1.6],
    ["sw",b.x+48,b.y+b.h-48,2.8],
    ["se",b.x+b.w-48,b.y+b.h-48,4.0],
  ];
  for(const [id,x,y,phase] of fires){
    addBastionBrazier(
      BABYLON,scene,"bastion-brazier-"+id,
      x,y,mapping,materials,root,shadowCasters,
      lights,flames,particleSystems,particleTexture,phase,
    );
  }

  // Low-poly rubble clusters live in the non-playable apron and help the
  // fortress read as a place, not a clean test chamber.
  const rubble=[
    [b.x+115,b.y-4,1.2,.70,1.0],
    [b.x+180,b.y-7,.75,.48,.62],
    [b.x+b.w-120,b.y-5,1.15,.72,.95],
    [b.x+b.w-188,b.y-8,.72,.46,.60],
    [b.x+132,b.y+b.h+5,1.08,.66,.90],
    [b.x+b.w-142,b.y+b.h+6,1.20,.74,1.0],
  ];
  rubble.forEach((entry,index)=>{
    const [gx,gy,sx,sy,sz]=entry;
    const p=mapping.gameToWorld(gx,gy,0);
    addLowPolyRock(
      BABYLON,scene,
      "bastion-rubble-"+index,
      {x:p.x,y:sy*.42,z:p.z},
      {x:sx,y:sy,z:sz},
      materials.bastionRock,
      root,
      shadowCasters,
    );
  });
}


function addGrandRingObstacle(
  BABYLON,
  scene,
  obstacle,
  index,
  mapping,
  materials,
  root,
  shadowCasters,
) {
  const rect=mapping.rectToWorld(obstacle);
  const height=Math.max(4.2,babylonObstacleVisualHeight(rect)*.82);
  const chamfer=Math.min(.85,Math.min(rect.width,rect.depth)*.12);

  addContactShadow(
    BABYLON,scene,
    "babylon-grand-shadow-"+(obstacle.id||index),
    rect.center,
    rect.width+2.2,
    rect.depth+2.4,
    materials,
    root,
  );

  const body=createChamferedPrism(
    BABYLON,scene,
    "babylon-grand-body-"+(obstacle.id||index),
    rect.width,
    height,
    rect.depth,
    chamfer,
    {x:rect.center.x,y:height/2,z:rect.center.z},
    materials.grandStone,
  );
  body.parent=root;
  body.receiveShadows=true;
  shadowCasters.push(body);

  const top=createChamferedPrism(
    BABYLON,scene,
    "babylon-grand-top-"+(obstacle.id||index),
    Math.max(.5,rect.width-.10),
    .34,
    Math.max(.5,rect.depth-.10),
    Math.max(.12,chamfer*.8),
    {x:rect.center.x,y:height+.17,z:rect.center.z},
    materials.grandStoneTop,
  );
  top.parent=root;
  top.receiveShadows=true;
  shadowCasters.push(top);
}

function addObstacle(
  BABYLON,
  scene,
  obstacle,
  index,
  mapping,
  materials,
  root,
  shadowCasters,
) {
  const rect=mapping.rectToWorld(obstacle);
  const height=babylonObstacleVisualHeight(rect);

  addContactShadow(
    BABYLON,scene,
    "babylon-los-shadow-"+(obstacle.id||index),
    rect.center,
    rect.width+2.4,
    rect.depth+2.7,
    materials,
    root,
  );
  const horizontal=rect.width>=rect.depth;
  const longSide=Math.max(rect.width,rect.depth);
  const shortSide=Math.min(rect.width,rect.depth);
  const aspect=longSide/Math.max(.01,shortSide);
  const chamfer=Math.min(1.05,shortSide*.11);
  const baseHeight=.86;

  const plinth=createChamferedPrism(
    BABYLON,scene,
    "babylon-los-plinth-"+(obstacle.id||index),
    rect.width,
    baseHeight,
    rect.depth,
    chamfer*.86,
    {
      x:rect.center.x,
      y:baseHeight/2,
      z:rect.center.z,
    },
    materials.windscarStoneDark,
    materials.windscarStone,
    materials.windscarStoneTop,
    materials.windscarRock,
    materials.windscarRockDark,
    materials.grandStone,
    materials.grandStoneTop,
    materials.stoneBase,
  );
  plinth.parent=root;
  plinth.receiveShadows=true;
  shadowCasters.push(plinth);

  const foot=createChamferedPrism(
    BABYLON,scene,
    "babylon-los-foot-"+(obstacle.id||index),
    Math.max(.6,rect.width-.22),
    .48,
    Math.max(.6,rect.depth-.22),
    Math.max(.14,chamfer*.76),
    {
      x:rect.center.x,
      y:baseHeight+.24,
      z:rect.center.z,
    },
    materials.stoneShoulder,
  );
  foot.parent=root;
  foot.receiveShadows=true;
  shadowCasters.push(foot);

  const bodyBottom=baseHeight+.48;
  const capReserve=1.18;
  const bodyHeight=Math.max(1.2,height-bodyBottom-capReserve);
  const courseCount=aspect>2.05?2:3;
  const courseGap=.055;
  const courseHeight=(bodyHeight-courseGap*(courseCount-1))/courseCount;

  for(let course=0;course<courseCount;course+=1){
    const courseY=bodyBottom+courseHeight/2+course*(courseHeight+courseGap);
    const alternate=course%2===1;
    const inset=.30+(alternate?.07:0);
    const mat=course%3===1?materials.stoneSideAlt:materials.stoneSide;

    if(aspect>2.05){
      // Long walls are composed from 3–5 visible masonry blocks per course.
      const segments=Math.max(3,Math.min(5,Math.round(longSide/7.0)));
      const segmentGap=.12;
      const segmentLong=(longSide-.58-segmentGap*(segments-1))/segments;

      for(let seg=0;seg<segments;seg+=1){
        const offset=-longSide/2+.29+segmentLong/2+seg*(segmentLong+segmentGap);
        const shift=(alternate?(seg%2?.07:-.07):0);
        const w=horizontal?segmentLong:Math.max(.6,rect.width-inset);
        const d=horizontal?Math.max(.6,rect.depth-inset):segmentLong;
        const block=createChamferedPrism(
          BABYLON,scene,
          "babylon-los-course-"+(obstacle.id||index)+"-"+course+"-"+seg,
          w,
          courseHeight,
          d,
          Math.min(.30,Math.min(w,d)*.075),
          {
            x:rect.center.x+(horizontal?offset:shift),
            y:courseY,
            z:rect.center.z+(horizontal?shift:offset),
          },
          (seg+course)%4===2?materials.stoneSideAlt:mat,
        );
        block.parent=root;
        block.receiveShadows=true;
      }
    }else{
      // Square pillars use broad stacked stones with tiny offsets so the
      // silhouette feels hand-laid rather than extruded from one primitive.
      const offsetX=(course===1?.10:course===2?-.08:0);
      const offsetZ=(course===2?.08:course===3?-.07:0);
      const block=createChamferedPrism(
        BABYLON,scene,
        "babylon-los-course-"+(obstacle.id||index)+"-"+course,
        Math.max(.6,rect.width-inset),
        courseHeight,
        Math.max(.6,rect.depth-inset),
        Math.max(.16,chamfer*.72),
        {
          x:rect.center.x+offsetX,
          y:courseY,
          z:rect.center.z+offsetZ,
        },
        mat,
      );
      block.parent=root;
      block.receiveShadows=true;
    }
  }

  // Broad shoulder/cornice separates wall body from the top stones.
  const corniceY=height-.72;
  const cornice=createChamferedPrism(
    BABYLON,scene,
    "babylon-los-cornice-"+(obstacle.id||index),
    Math.max(.5,rect.width-.10),
    .55,
    Math.max(.5,rect.depth-.10),
    Math.max(.15,chamfer*.90),
    {x:rect.center.x,y:corniceY,z:rect.center.z},
    materials.stoneShoulder,
  );
  cornice.parent=root;
  cornice.receiveShadows=true;
  shadowCasters.push(cornice);

  const capHeight=.52;
  const cap=createChamferedPrism(
    BABYLON,scene,
    "babylon-los-cap-"+(obstacle.id||index),
    Math.max(.5,rect.width-.03),
    capHeight,
    Math.max(.5,rect.depth-.03),
    Math.max(.16,chamfer*.94),
    {
      x:rect.center.x,
      y:height+capHeight/2,
      z:rect.center.z,
    },
    materials.stoneTop,
  );
  cap.parent=root;
  cap.receiveShadows=true;
  shadowCasters.push(cap);

  addObstacleTopBlocks(
    BABYLON,scene,obstacle,index,rect,height,capHeight,
    materials,root,shadowCasters,
  );
  addTopCracks(
    BABYLON,scene,obstacle,index,rect,height,
    materials,root,
  );

  // Small fallen chips near the obstacle base add asymmetry without altering
  // the logical collision footprint.
  const random=seededRandom(0xa21f+index*91);
  const chipCount=aspect>2.05?3:2;
  for(let i=0;i<chipCount;i+=1){
    const edge=(i%2?1:-1);
    const chipW=.45+random()*.52;
    const chipD=.38+random()*.46;
    const chipH=.22+random()*.34;
    const chip=createChamferedPrism(
      BABYLON,scene,
      "babylon-los-chip-"+(obstacle.id||index)+"-"+i,
      chipW,chipH,chipD,.10,
      {
        x:rect.center.x+(horizontal?(random()-.5)*(rect.width*.68):edge*(rect.width*.34)),
        y:chipH/2,
        z:rect.center.z+(horizontal?edge*(rect.depth*.34):(random()-.5)*(rect.depth*.68)),
      },
      i%2?materials.rubble:materials.rubbleDark,
    );
    chip.rotation.y=random()*Math.PI;
    chip.parent=root;
    chip.receiveShadows=true;
  }
}

function addTorchPedestal(
  BABYLON,
  scene,
  name,
  gameX,
  gameY,
  mapping,
  materials,
  root,
  shadowCasters,
  lights,
  flames,
  phase,
) {
  const baseWorld=mapping.gameToWorld(gameX,gameY,0);

  const backplate=createChamferedPrism(
    BABYLON,scene,
    name+"-backplate",
    4.9,3.55,1.45,.38,
    {x:baseWorld.x,y:2.15,z:baseWorld.z+1.55},
    materials.shrineDark,
  );
  backplate.parent=root;
  backplate.receiveShadows=true;
  shadowCasters.push(backplate);

  for(const side of [-1,1]){
    const sideBlock=createChamferedPrism(
      BABYLON,scene,
      name+"-side-"+side,
      1.15,2.75,2.45,.28,
      {x:baseWorld.x+side*2.25,y:1.73,z:baseWorld.z+.65},
      materials.shrineStone,
    );
    sideBlock.parent=root;
    sideBlock.receiveShadows=true;
    shadowCasters.push(sideBlock);
  }

  const pedestal=createChamferedPrism(
    BABYLON,scene,
    name+"-base",
    4.75,1.95,4.75,.65,
    {x:baseWorld.x,y:1.18,z:baseWorld.z},
    materials.torchBase,
  );
  pedestal.parent=root;
  pedestal.receiveShadows=true;
  shadowCasters.push(pedestal);

  const mid=createChamferedPrism(
    BABYLON,scene,
    name+"-mid",
    3.65,1.65,3.65,.52,
    {x:baseWorld.x,y:3.02,z:baseWorld.z},
    materials.torchStone,
  );
  mid.parent=root;
  mid.receiveShadows=true;
  shadowCasters.push(mid);

  const crown=createChamferedPrism(
    BABYLON,scene,
    name+"-crown",
    4.05,.48,4.05,.48,
    {x:baseWorld.x,y:4.25,z:baseWorld.z},
    materials.stoneTop,
  );
  crown.parent=root;
  crown.receiveShadows=true;
  shadowCasters.push(crown);

  const bowl=BABYLON.MeshBuilder.CreateCylinder(
    name+"-bowl",
    {
      diameterTop:2.65,
      diameterBottom:1.72,
      height:1.05,
      tessellation:8,
    },
    scene,
  );
  bowl.position.set(baseWorld.x,5.08,baseWorld.z);
  bowl.material=materials.brazier;
  bowl.parent=root;
  shadowCasters.push(bowl);

  const outer=BABYLON.MeshBuilder.CreateCylinder(
    name+"-flame-outer",
    {
      diameterTop:.12,
      diameterBottom:2.05,
      height:3.35,
      tessellation:5,
    },
    scene,
  );
  outer.position.set(baseWorld.x,6.55,baseWorld.z);
  outer.rotation.z=.08;
  outer.material=materials.flameOuter;
  outer.convertToFlatShadedMesh?.();
  outer.parent=root;

  const midFlame=BABYLON.MeshBuilder.CreateCylinder(
    name+"-flame-mid",
    {
      diameterTop:.08,
      diameterBottom:1.42,
      height:2.70,
      tessellation:5,
    },
    scene,
  );
  midFlame.position.set(baseWorld.x-.12,6.38,baseWorld.z-.08);
  midFlame.rotation.z=-.10;
  midFlame.material=materials.flameMid;
  midFlame.convertToFlatShadedMesh?.();
  midFlame.parent=root;

  const inner=BABYLON.MeshBuilder.CreateCylinder(
    name+"-flame-inner",
    {
      diameterTop:.05,
      diameterBottom:.82,
      height:2.10,
      tessellation:5,
    },
    scene,
  );
  inner.position.set(baseWorld.x+.10,6.20,baseWorld.z-.15);
  inner.rotation.z=.07;
  inner.material=materials.flameInner;
  inner.convertToFlatShadedMesh?.();
  inner.parent=root;

  flames.push({
    outer,
    mid:midFlame,
    inner,
    glow:null,
    baseY:6.45,
    phase,
  });

  const emberGlow=BABYLON.MeshBuilder.CreateDisc(
    name+"-ember-glow",
    {radius:2.4,tessellation:32,sideOrientation:BABYLON.Mesh.DOUBLESIDE},
    scene,
  );
  emberGlow.position.set(baseWorld.x,5.32,baseWorld.z+.05);
  emberGlow.rotation.x=Math.PI/2;
  emberGlow.material=materials.emberGlow;
  emberGlow.parent=root;

  const light=new BABYLON.PointLight(
    name+"-light",
    new BABYLON.Vector3(baseWorld.x,7.15,baseWorld.z),
    scene,
  );
  light.diffuse=new BABYLON.Color3(1.0,.43,.13);
  light.specular=new BABYLON.Color3(.62,.28,.10);
  light.intensity=3.25;
  light.range=46;
  lights.push(light);

  const glowDisc=BABYLON.MeshBuilder.CreateDisc(
    name+"-floor-glow",
    {radius:8.6,tessellation:48,sideOrientation:BABYLON.Mesh.DOUBLESIDE},
    scene,
  );
  glowDisc.position.set(baseWorld.x,.035,baseWorld.z-1.2);
  glowDisc.rotation.x=Math.PI/2;
  glowDisc.material=materials.floorGlow;
  glowDisc.parent=root;
}

function addLowPolyRock(
  BABYLON,
  scene,
  name,
  position,
  scale,
  mat,
  root,
  shadowCasters,
) {
  const rock=BABYLON.MeshBuilder.CreateSphere(
    name,
    {diameter:2,segments:5},
    scene,
  );
  rock.position.set(position.x,position.y,position.z);
  rock.scaling.set(scale.x,scale.y,scale.z);
  rock.rotation.y=(scale.x+scale.z)*.63;
  rock.material=mat;
  rock.convertToFlatShadedMesh?.();
  rock.parent=root;
  rock.receiveShadows=true;
  shadowCasters.push(rock);
  return rock;
}

function addWindscarWatchfire(
  BABYLON,
  scene,
  name,
  gameX,
  gameY,
  mapping,
  materials,
  root,
  shadowCasters,
  lights,
  flames,
  particleSystems,
  particleTexture,
  phase,
) {
  const p=mapping.gameToWorld(gameX,gameY,0);

  const plinth=createChamferedPrism(
    BABYLON,scene,
    name+"-plinth",
    3.55,.54,3.55,.52,
    {x:p.x,y:.27,z:p.z},
    materials.windscarStoneDark,
  );
  plinth.parent=root;
  plinth.receiveShadows=true;
  shadowCasters.push(plinth);

  const bowl=BABYLON.MeshBuilder.CreateCylinder(
    name+"-bowl",
    {
      diameterTop:2.18,
      diameterBottom:1.38,
      height:.62,
      tessellation:8,
    },
    scene,
  );
  bowl.position.set(p.x,.88,p.z);
  bowl.material=materials.windscarMetal;
  bowl.convertToFlatShadedMesh?.();
  bowl.parent=root;
  shadowCasters.push(bowl);

  const defs=[
    ["outer",1.34,.08,2.18,2.00,materials.flameOuter,.08],
    ["mid",.90,.06,1.74,1.85,materials.flameMid,-.08],
    ["inner",.48,.04,1.28,1.70,materials.flameInner,.06],
  ];
  const parts={};
  for(const [key,bottom,top,h,y,mat,tilt] of defs){
    const flame=BABYLON.MeshBuilder.CreateCylinder(
      name+"-flame-"+key,
      {diameterTop:top,diameterBottom:bottom,height:h,tessellation:5},
      scene,
    );
    flame.position.set(p.x,y,p.z);
    flame.rotation.z=tilt;
    flame.material=mat;
    flame.convertToFlatShadedMesh?.();
    flame.parent=root;
    parts[key]=flame;
  }

  flames.push({
    outer:parts.outer,
    mid:parts.mid,
    inner:parts.inner,
    glow:null,
    baseY:1.95,
    phase,
  });

  const glow=BABYLON.MeshBuilder.CreateDisc(
    name+"-floor-glow",
    {radius:6.2,tessellation:40,sideOrientation:BABYLON.Mesh.DOUBLESIDE},
    scene,
  );
  glow.position.set(p.x,.025,p.z);
  glow.rotation.x=Math.PI/2;
  glow.material=materials.floorGlow;
  glow.parent=root;

  const light=new BABYLON.PointLight(
    name+"-light",
    new BABYLON.Vector3(p.x,3.0,p.z),
    scene,
  );
  light.diffuse=new BABYLON.Color3(1.0,.48,.16);
  light.specular=new BABYLON.Color3(.72,.30,.10);
  light.intensity=3.85;
  light.range=34;
  light.radius=.85;
  lights.push(light);

  if(particleTexture && BABYLON.ParticleSystem){
    const sparks=new BABYLON.ParticleSystem(name+"-embers",70,scene);
    sparks.particleTexture=particleTexture;
    sparks.emitter=new BABYLON.Vector3(p.x,1.35,p.z);
    sparks.minEmitBox=new BABYLON.Vector3(-.34,0,-.34);
    sparks.maxEmitBox=new BABYLON.Vector3(.34,.18,.34);
    sparks.color1=new BABYLON.Color4(1,.46,.10,1);
    sparks.color2=new BABYLON.Color4(1,.78,.22,.92);
    sparks.colorDead=new BABYLON.Color4(.38,.08,.01,0);
    sparks.minSize=.08;
    sparks.maxSize=.20;
    sparks.minLifeTime=.32;
    sparks.maxLifeTime=.82;
    sparks.emitRate=24;
    sparks.blendMode=BABYLON.ParticleSystem.BLENDMODE_ADD;
    sparks.direction1=new BABYLON.Vector3(-.18,1.55,-.18);
    sparks.direction2=new BABYLON.Vector3(.18,2.35,.18);
    sparks.minEmitPower=.65;
    sparks.maxEmitPower=1.15;
    sparks.updateSpeed=.017;
    sparks.gravity=new BABYLON.Vector3(0,.18,0);
    sparks.start();
    particleSystems.push(sparks);
  }
}

function addWindscarGatePylon(
  BABYLON,
  scene,
  name,
  p,
  materials,
  root,
  shadowCasters,
) {
  const base=createChamferedPrism(
    BABYLON,scene,
    name+"-base",
    3.15,.46,3.15,.46,
    {x:p.x,y:.23,z:p.z},
    materials.windscarStoneDark,
  );
  base.parent=root;
  base.receiveShadows=true;
  shadowCasters.push(base);

  const body=createChamferedFrustum(
    BABYLON,scene,
    name+"-body",
    2.65,2.65,
    2.05,2.05,
    3.20,.38,
    {x:p.x,y:2.02,z:p.z},
    materials.windscarStoneAlt,
  );
  body.parent=root;
  body.receiveShadows=true;
  shadowCasters.push(body);

  const cap=BABYLON.MeshBuilder.CreateCylinder(
    name+"-cap",
    {
      diameterTop:.12,
      diameterBottom:2.58,
      height:.78,
      tessellation:4,
    },
    scene,
  );
  cap.position.set(p.x,4.00,p.z);
  cap.rotation.y=Math.PI/4;
  cap.material=materials.windscarStoneTop;
  cap.convertToFlatShadedMesh?.();
  cap.parent=root;
  cap.receiveShadows=true;
  shadowCasters.push(cap);
}

function addWindscarSpawnGate(
  BABYLON,
  scene,
  arena,
  mapping,
  side,
  materials,
  root,
  shadowCasters,
) {
  const b=arena.bounds;
  const gx=side<0?b.x-30:b.x+b.w+30;
  const centerY=b.y+b.h/2;
  const pA=mapping.gameToWorld(gx,centerY-74,0);
  const pB=mapping.gameToWorld(gx,centerY+74,0);

  addWindscarGatePylon(
    BABYLON,scene,
    "windscar-gate-"+side+"-a",
    pA,materials,root,shadowCasters,
  );
  addWindscarGatePylon(
    BABYLON,scene,
    "windscar-gate-"+side+"-b",
    pB,materials,root,shadowCasters,
  );

  const mid=mapping.gameToWorld(gx,centerY,0);
  const lintel=createChamferedPrism(
    BABYLON,scene,
    "windscar-gate-"+side+"-lintel",
    1.50,.42,13.8,.20,
    {x:mid.x,y:3.78,z:mid.z},
    materials.windscarStoneTopAlt,
  );
  lintel.parent=root;
  lintel.receiveShadows=true;
  shadowCasters.push(lintel);

  const banner=BABYLON.MeshBuilder.CreatePlane(
    "windscar-gate-"+side+"-banner",
    {width:3.05,height:5.4,sideOrientation:BABYLON.Mesh.DOUBLESIDE},
    scene,
  );
  banner.position.set(
    mid.x+(side<0?.34:-.34),
    2.35,
    mid.z,
  );
  banner.rotation.y=side<0?Math.PI/2:-Math.PI/2;
  banner.material=materials.windscarBanner;
  banner.parent=root;

  const stripe=BABYLON.MeshBuilder.CreatePlane(
    "windscar-gate-"+side+"-banner-stripe",
    {width:.52,height:3.9,sideOrientation:BABYLON.Mesh.DOUBLESIDE},
    scene,
  );
  stripe.position.set(
    mid.x+(side<0?.325:-.325),
    2.48,
    mid.z,
  );
  stripe.rotation.y=side<0?Math.PI/2:-Math.PI/2;
  stripe.material=materials.windscarBannerTrim;
  stripe.parent=root;
}

function addWindscarScenery(
  BABYLON,
  scene,
  arena,
  mapping,
  materials,
  root,
  shadowCasters,
  lights,
  flames,
  particleSystems,
  particleTexture,
) {
  const b=arena.bounds;

  addWindscarSpawnGate(
    BABYLON,scene,arena,mapping,-1,
    materials,root,shadowCasters,
  );
  addWindscarSpawnGate(
    BABYLON,scene,arena,mapping,1,
    materials,root,shadowCasters,
  );

  addWindscarWatchfire(
    BABYLON,scene,
    "windscar-watchfire-west",
    b.x-24,b.y+b.h*.73,
    mapping,materials,root,shadowCasters,lights,flames,
    particleSystems,particleTexture,.35,
  );
  addWindscarWatchfire(
    BABYLON,scene,
    "windscar-watchfire-east",
    b.x+b.w+24,b.y+b.h*.27,
    mapping,materials,root,shadowCasters,lights,flames,
    particleSystems,particleTexture,2.65,
  );

  const rockPoints=[
    [b.x-30,b.y+92,1.75,1.05,1.55],
    [b.x-31,b.y+b.h-90,2.05,1.20,1.72],
    [b.x+b.w+31,b.y+94,1.85,1.10,1.60],
    [b.x+b.w+30,b.y+b.h-92,2.10,1.22,1.78],
  ];
  rockPoints.forEach((entry,index)=>{
    const [gx,gy,sx,sy,sz]=entry;
    const p=mapping.gameToWorld(gx,gy,0);
    addLowPolyRock(
      BABYLON,scene,
      "windscar-perimeter-rock-"+index,
      {x:p.x,y:sy*.44,z:p.z},
      {x:sx,y:sy,z:sz},
      index%2?materials.windscarRockDark:materials.windscarRock,
      root,
      shadowCasters,
    );
  });

}

function addTorches(
  BABYLON,
  scene,
  arena,
  mapping,
  materials,
  root,
  shadowCasters,
  lights,
  flames,
) {
  const b=arena.bounds;
  // Keep the braziers just outside gameplay bounds but well inside the visual
  // frame, so their flames are a major composition element like the reference.
  const margin=24;
  const points=[
    ["nw",b.x-margin,b.y-margin,0.0],
    ["ne",b.x+b.w+margin,b.y-margin,1.4],
    ["sw",b.x-margin,b.y+b.h+margin,2.5],
    ["se",b.x+b.w+margin,b.y+b.h+margin,3.7],
  ];
  for(const [id,x,y,phase] of points){
    addTorchPedestal(
      BABYLON,scene,
      "babylon-torch-"+id,
      x,y,mapping,materials,root,shadowCasters,lights,flames,phase,
    );
  }
}

function addBanners(BABYLON,scene,arena,mapping,materials,root) {
  const b=arena.bounds;
  const placements=[
    ["left-upper",b.x-10,b.y+118,-Math.PI/2],
    ["left-lower",b.x-10,b.y+b.h-118,-Math.PI/2],
    ["right-upper",b.x+b.w+10,b.y+118,Math.PI/2],
    ["right-lower",b.x+b.w+10,b.y+b.h-118,Math.PI/2],
  ];

  for(const [id,x,y,rotationY] of placements){
    const p=mapping.gameToWorld(x,y,3.7);
    const cloth=BABYLON.MeshBuilder.CreatePlane(
      "babylon-banner-"+id,
      {width:4.2,height:6.7,sideOrientation:BABYLON.Mesh.DOUBLESIDE},
      scene,
    );
    cloth.position.set(p.x,3.7,p.z);
    cloth.rotation.y=rotationY;
    cloth.material=materials.banner;
    cloth.parent=root;

    const stripe=BABYLON.MeshBuilder.CreatePlane(
      "babylon-banner-stripe-"+id,
      {width:1.0,height:4.7,sideOrientation:BABYLON.Mesh.DOUBLESIDE},
      scene,
    );
    stripe.position.set(
      p.x+(rotationY<0?.035:-.035),
      3.8,
      p.z+(Math.abs(rotationY)>.1?0:.035),
    );
    stripe.rotation.y=rotationY;
    stripe.material=materials.bannerGold;
    stripe.parent=root;
  }
}

function addRubble(
  BABYLON,
  scene,
  arena,
  mapping,
  materials,
  root,
  shadowCasters,
) {
  const b=arena.bounds;
  const random=seededRandom(
    arena.id==="windscar-proving-grounds"?0x88c125:0x5f22ab,
  );
  const clusters=[
    [b.x+42,b.y+46],
    [b.x+b.w-42,b.y+46],
    [b.x+42,b.y+b.h-46],
    [b.x+b.w-42,b.y+b.h-46],
  ];

  let rubbleIndex=0;
  for(const [cx,cy] of clusters){
    const pieces=6+Math.floor(random()*4);
    for(let i=0;i<pieces;i+=1){
      const angle=random()*Math.PI*2;
      const radius=14+random()*62;
      const gx=cx+Math.cos(angle)*radius;
      const gy=cy+Math.sin(angle)*radius;
      const p=mapping.gameToWorld(gx,gy,0);
      const w=.55+random()*1.30;
      const d=.55+random()*1.15;
      const h=.28+random()*.72;
      const rock=createChamferedPrism(
        BABYLON,scene,
        "babylon-rubble-"+rubbleIndex++,
        w,h,d,
        Math.min(.18,w*.16,d*.16),
        {x:p.x,y:h/2,z:p.z},
        random()>.52?materials.rubble:materials.rubbleDark,
      );
      rock.rotation.y=random()*Math.PI;
      rock.parent=root;
      rock.receiveShadows=true;
      if(h>.55) shadowCasters.push(rock);
    }
  }
}

export function buildBabylonArenaGeometry(BABYLON,scene,arena,mapping) {
  const root=new BABYLON.TransformNode("babylon-arena-root",scene);
  const shadowCasters=[];
  const lights=[];
  const flames=[];
  const particleSystems=[];
  const ownedTextures=[];

  const materials={
    bastionFloor:pbrMaterial(BABYLON,scene,"mat-bastion-floor","#655044",{
      metallic:0,roughness:.93,environmentIntensity:.34,directIntensity:1.08,
    }),
    bastionStoneDark:pbrMaterial(BABYLON,scene,"mat-bastion-stone-dark","#43342c",{
      metallic:0,roughness:.90,environmentIntensity:.31,directIntensity:1.08,
    }),
    bastionStone:pbrMaterial(BABYLON,scene,"mat-bastion-stone","#78614f",{
      metallic:0,roughness:.80,environmentIntensity:.42,directIntensity:1.12,
    }),
    bastionStoneTrim:pbrMaterial(BABYLON,scene,"mat-bastion-stone-trim","#8d7158",{
      metallic:.04,roughness:.72,environmentIntensity:.48,directIntensity:1.15,
    }),
    bastionStoneTop:pbrMaterial(BABYLON,scene,"mat-bastion-stone-top","#b79572",{
      metallic:.02,roughness:.67,environmentIntensity:.52,directIntensity:1.16,
    }),
    bastionMetal:pbrMaterial(BABYLON,scene,"mat-bastion-metal","#684025",{
      metallic:.70,roughness:.34,environmentIntensity:.72,directIntensity:1.18,
    }),
    bastionInset:material(BABYLON,scene,"mat-bastion-inset","#1c2229","#090c10"),
    bastionRune:material(
      BABYLON,scene,"mat-bastion-rune","#ff9b42","#5f2c10","#ff7228"
    ),
    bastionBanner:material(BABYLON,scene,"mat-bastion-banner","#651f25","#15090b"),
    bastionBannerTrim:material(BABYLON,scene,"mat-bastion-banner-trim","#d39a4a","#331e0b"),
    bastionRock:pbrMaterial(BABYLON,scene,"mat-bastion-rock","#5d4a40",{
      metallic:0,roughness:.96,environmentIntensity:.28,directIntensity:1.05,
    }),
    bastionAccentStone:pbrMaterial(BABYLON,scene,"mat-bastion-accent-stone","#9d7f60",{
      metallic:.02,roughness:.72,environmentIntensity:.48,directIntensity:1.16,
    }),
    bastionBronze:pbrMaterial(BABYLON,scene,"mat-bastion-bronze","#7c4d28",{
      metallic:.78,roughness:.31,environmentIntensity:.78,directIntensity:1.20,
    }),
    bastionRoof:pbrMaterial(BABYLON,scene,"mat-bastion-roof","#51413b",{
      metallic:.10,roughness:.66,environmentIntensity:.52,directIntensity:1.12,
    }),
    bastionFloorGlow:material(
      BABYLON,scene,"mat-bastion-floor-glow","#ff8a2c","#241008","#ff6b20"
    ),
    floor:pbrMaterial(BABYLON,scene,"mat-floor","#76513d",{
      metallic:0,roughness:.96,environmentIntensity:.22,directIntensity:1.08,
    }),
    grandFloor:material(BABYLON,scene,"mat-grand-floor","#3c4a36","#172016"),
    windscarStoneDark:pbrMaterial(BABYLON,scene,"mat-windscar-stone-dark","#4b382f",{
      metallic:0,roughness:.93,environmentIntensity:.24,directIntensity:1.08,
    }),
    windscarStone:pbrMaterial(BABYLON,scene,"mat-windscar-stone","#81634d",{
      metallic:0,roughness:.86,environmentIntensity:.30,directIntensity:1.10,
    }),
    windscarStoneTop:pbrMaterial(BABYLON,scene,"mat-windscar-stone-top","#ae8465",{
      metallic:0,roughness:.78,environmentIntensity:.36,directIntensity:1.12,
    }),
    windscarStoneAlt:pbrMaterial(BABYLON,scene,"mat-windscar-stone-alt","#6f5544",{
      metallic:0,roughness:.89,environmentIntensity:.28,directIntensity:1.08,
    }),
    windscarStoneTopAlt:pbrMaterial(BABYLON,scene,"mat-windscar-stone-top-alt","#987259",{
      metallic:0,roughness:.82,environmentIntensity:.34,directIntensity:1.10,
    }),
    windscarMetal:pbrMaterial(BABYLON,scene,"mat-windscar-metal","#3f291e",{
      metallic:.62,roughness:.42,environmentIntensity:.62,directIntensity:1.15,
    }),
    windscarRune:material(
      BABYLON,scene,"mat-windscar-rune","#ff8b37","#5b220b","#ff5c19"
    ),
    windscarInset:material(BABYLON,scene,"mat-windscar-inset","#2f211c","#120c0a"),
    windscarTrim:material(BABYLON,scene,"mat-windscar-trim","#8d5a32","#3b1d0d","#9c491b"),
    windscarBanner:material(BABYLON,scene,"mat-windscar-banner","#5a2018","#120908"),
    windscarBannerTrim:material(BABYLON,scene,"mat-windscar-banner-trim","#a3652b","#26150a"),
    windscarSeam:material(BABYLON,scene,"mat-windscar-seam","#3e3027","#150f0c"),
    windscarRock:pbrMaterial(BABYLON,scene,"mat-windscar-rock","#5f4638",{
      metallic:0,roughness:.96,environmentIntensity:.22,directIntensity:1.05,
    }),
    windscarRockDark:pbrMaterial(BABYLON,scene,"mat-windscar-rock-dark","#44312a",{
      metallic:0,roughness:.98,environmentIntensity:.20,directIntensity:1.04,
    }),
    grandStone:material(BABYLON,scene,"mat-grand-stone","#65705c","#1d251b"),
    grandStoneTop:material(BABYLON,scene,"mat-grand-stone-top","#849079","#293126"),
    floorLift:material(BABYLON,scene,"mat-floor-lift","#907662","#2a211a"),
    seam:material(BABYLON,scene,"mat-floor-seam","#4a3b31","#17120f"),
    seamSoft:material(BABYLON,scene,"mat-floor-seam-soft","#675448","#1d1713"),
    crack:material(BABYLON,scene,"mat-crack","#211a16","#090706"),
    stoneBase:material(BABYLON,scene,"mat-stone-base","#655b53","#201b17"),
    stoneSide:material(BABYLON,scene,"mat-stone-side","#796e64","#251f1a"),
    stoneSideAlt:material(BABYLON,scene,"mat-stone-side-alt","#85786d","#2b231d"),
    stoneShoulder:material(BABYLON,scene,"mat-stone-shoulder","#8b7c6e","#2c241e"),
    stoneTop:material(BABYLON,scene,"mat-stone-top","#aa9580","#3b2d22"),
    stoneTopAlt:material(BABYLON,scene,"mat-stone-top-alt","#9c8774","#35291f"),
    border:material(BABYLON,scene,"mat-border","#4d433c","#171310"),
    borderCap:material(BABYLON,scene,"mat-border-cap","#7e6c5b","#261e18"),
    borderTower:material(BABYLON,scene,"mat-border-tower","#554b43","#181512"),
    innerLip:material(BABYLON,scene,"mat-inner-lip","#5f5146","#1c1713"),
    shrineDark:material(BABYLON,scene,"mat-shrine-dark","#49423d","#171310"),
    shrineStone:material(BABYLON,scene,"mat-shrine-stone","#655b52","#201a16"),
    shrineTop:material(BABYLON,scene,"mat-shrine-top","#8b7a69","#30251e"),
    outerWall:material(BABYLON,scene,"mat-outer-wall","#665c53","#211b17"),
    outerWallAlt:material(BABYLON,scene,"mat-outer-wall-alt","#70645a","#251f1a"),
    outerWallTop:material(BABYLON,scene,"mat-outer-wall-top","#9b8876","#342920"),
    outerWallTopAlt:material(BABYLON,scene,"mat-outer-wall-top-alt","#8e7c6c","#30261f"),
    timber:material(BABYLON,scene,"mat-timber","#34231c","#120b08"),
    torchBase:material(BABYLON,scene,"mat-torch-base","#504740","#181411"),
    torchStone:material(BABYLON,scene,"mat-torch-stone","#76685c","#211b17"),
    brazier:material(BABYLON,scene,"mat-brazier","#33231a","#7a3c16"),
    rubble:material(BABYLON,scene,"mat-rubble","#7c6b5d","#221b16"),
    rubbleDark:material(BABYLON,scene,"mat-rubble-dark","#5d524a","#181512"),
    banner:material(BABYLON,scene,"mat-banner","#5e1f18","#160a08"),
    bannerGold:material(BABYLON,scene,"mat-banner-gold","#a56629","#26160b"),
    flameOuter:material(
      BABYLON,scene,"mat-flame-outer","#ff5b10","#3b1506","#ff3f08"
    ),
    flameMid:material(
      BABYLON,scene,"mat-flame-mid","#ff9426","#4a2207","#ff7b13"
    ),
    flameInner:material(
      BABYLON,scene,"mat-flame-inner","#fff0a8","#6a370d","#ffd85a"
    ),
    emberGlow:material(
      BABYLON,scene,"mat-ember-glow","#ff8b1f","#311206","#ff6a12"
    ),
    floorGlow:material(
      BABYLON,scene,"mat-floor-glow","#ff8a2c","#2b1208","#ff7130"
    ),
    contactShadow:material(
      BABYLON,scene,"mat-contact-shadow","#000000","#000000"
    ),
  };

  materials.bastionRune.disableLighting=true;
  materials.bastionRune.alpha=.96;
  materials.bastionFloorGlow.disableLighting=true;
  materials.bastionFloorGlow.alpha=.055;
  materials.bastionInset.specularColor=new BABYLON.Color3(.03,.04,.05);
  materials.bastionBanner.specularColor=new BABYLON.Color3(.04,.02,.035);
  materials.bastionBannerTrim.specularColor=new BABYLON.Color3(.16,.11,.04);
  materials.windscarRune.disableLighting=true;
  materials.windscarRune.alpha=.94;
  materials.windscarStoneTop.emissiveColor=
    materials.windscarStoneTop.albedoColor.scale(.020);
  materials.windscarStoneTopAlt.emissiveColor=
    materials.windscarStoneTopAlt.albedoColor.scale(.014);
  materials.windscarTrim.disableLighting=true;
  materials.windscarBanner.specularColor=new BABYLON.Color3(.05,.018,.012);
  materials.windscarBannerTrim.specularColor=new BABYLON.Color3(.16,.085,.028);
  materials.seam.alpha=.90;
  materials.seamSoft.alpha=.48;
  materials.flameOuter.disableLighting=true;
  materials.flameMid.disableLighting=true;
  materials.flameInner.disableLighting=true;
  materials.emberGlow.disableLighting=true;
  materials.emberGlow.alpha=.24;
  materials.floorGlow.disableLighting=true;
  materials.floorGlow.alpha=.12;

  const softShadow=createSoftShadowTexture(BABYLON,scene);
  ownedTextures.push(softShadow);
  materials.contactShadow.disableLighting=true;
  materials.contactShadow.diffuseColor=new BABYLON.Color3(0,0,0);
  materials.contactShadow.opacityTexture=softShadow;
  materials.contactShadow.alpha=.20;

  const stoneSurface=createStoneSurfaceTexture(
    BABYLON,scene,
    "babylon-handbuilt-stone-surface",
    arena.id==="windscar-proving-grounds"?0x2177:0x7712,
  );
  ownedTextures.push(stoneSurface);

  const stoneNormal=createStoneNormalTexture(
    BABYLON,scene,
    "babylon-windscar-stone-normal",
    arena.id==="windscar-proving-grounds"?0x43a1:0x8122,
  );
  ownedTextures.push(stoneNormal);

  [
    materials.bastionStoneDark,
    materials.bastionStone,
    materials.bastionStoneTrim,
    materials.bastionStoneTop,
    materials.bastionAccentStone,
    materials.bastionRoof,
    materials.bastionRock,
    materials.windscarStoneDark,
    materials.windscarStone,
    materials.windscarStoneAlt,
    materials.windscarStoneTop,
    materials.windscarStoneTopAlt,
    materials.windscarRock,
    materials.windscarRockDark,
  ].forEach(mat=>{
    mat.albedoTexture=stoneSurface;
    mat.bumpTexture=stoneNormal;
    mat.forceIrradianceInFragment=true;
  });

  materials.bastionFloor.bumpTexture=stoneNormal;
  materials.bastionFloor.forceIrradianceInFragment=true;
  materials.floor.bumpTexture=stoneNormal;
  materials.floor.forceIrradianceInFragment=true;

  [
    materials.stoneBase,
    materials.stoneSide,
    materials.stoneSideAlt,
    materials.stoneShoulder,
    materials.stoneTop,
    materials.stoneTopAlt,
    materials.border,
    materials.borderCap,
    materials.borderTower,
    materials.shrineDark,
    materials.shrineStone,
    materials.shrineTop,
    materials.outerWall,
    materials.outerWallAlt,
    materials.outerWallTop,
    materials.outerWallTopAlt,
    materials.torchBase,
    materials.torchStone,
    materials.rubble,
    materials.rubbleDark,
  ].forEach(mat=>{
    mat.diffuseTexture=stoneSurface;
  });

  [
    materials.windscarStoneDark,
    materials.windscarStone,
    materials.windscarStoneAlt,
    materials.windscarRock,
    materials.windscarRockDark,
  ].forEach(mat=>{
    mat.emissiveColor=mat.albedoColor.scale(.012);
  });

  [
    materials.stoneBase,
    materials.stoneSide,
    materials.stoneSideAlt,
    materials.stoneShoulder,
    materials.outerWall,
    materials.outerWallAlt,
    materials.shrineDark,
    materials.shrineStone,
    materials.torchBase,
    materials.torchStone,
  ].forEach(mat=>{
    mat.emissiveColor=mat.diffuseColor.scale(.055);
  });

  materials.banner.specularColor=new BABYLON.Color3(.08,.03,.02);
  materials.bannerGold.specularColor=new BABYLON.Color3(.18,.10,.04);

  const ground=addFloor(
    BABYLON,scene,arena,mapping,materials,root,ownedTextures,
  );

  let emberParticleTexture=null;
  if(arena.id==="emberwatch-bastion"){
    emberParticleTexture=createEmberParticleTexture(BABYLON,scene);
    ownedTextures.push(emberParticleTexture);

    for(let index=0;index<arena.obstacles.length;index+=1){
      addBastionObstacle(
        BABYLON,scene,arena.obstacles[index],index,
        mapping,materials,root,shadowCasters,
      );
    }
    addBastionScenery(
      BABYLON,scene,arena,mapping,materials,root,shadowCasters,
      lights,flames,particleSystems,emberParticleTexture,
    );
  }else if(arena.id==="windscar-proving-grounds"){
    emberParticleTexture=createEmberParticleTexture(BABYLON,scene);
    ownedTextures.push(emberParticleTexture);

    for(let index=0;index<arena.obstacles.length;index+=1){
      addWindscarObstacle(
        BABYLON,scene,arena.obstacles[index],index,
        mapping,materials,root,shadowCasters,
      );
    }
    addWindscarScenery(
      BABYLON,scene,arena,mapping,materials,root,shadowCasters,lights,flames,
      particleSystems,emberParticleTexture,
    );
  }else{
    // The Grand Ring intentionally stays a separate green placeholder theme.
    // Do not let future Windscar art passes leak into it.
    addBorder(
      BABYLON,scene,arena,mapping,materials,root,shadowCasters,
    );
    for(let index=0;index<arena.obstacles.length;index+=1){
      addGrandRingObstacle(
        BABYLON,scene,arena.obstacles[index],index,
        mapping,materials,root,shadowCasters,
      );
    }
  }

  return {
    root,
    ground,
    shadowCasters,
    lights,
    flames,
    particleSystems,
    animate(timeSeconds=0) {
      for(const flame of flames){
        const t=timeSeconds+flame.phase;
        const pulse=1+Math.sin(t*4.7)*.055;
        flame.outer.scaling.x=pulse;
        flame.outer.scaling.z=pulse;
        flame.outer.scaling.y=1+Math.sin(t*3.9)*.08;
        flame.outer.position.y=flame.baseY+Math.sin(t*4.1)*.055;
        flame.outer.rotation.z=.08+Math.sin(t*3.0)*.055;

        flame.mid.scaling.x=1+Math.sin(t*5.2+1)*.05;
        flame.mid.scaling.z=1+Math.sin(t*4.5+.7)*.05;
        flame.mid.scaling.y=1+Math.sin(t*4.8)*.085;
        flame.mid.position.y=flame.baseY-.16+Math.sin(t*4.9+.8)*.05;

        flame.inner.scaling.y=1+Math.sin(t*6.0+.4)*.075;
        flame.inner.position.y=flame.baseY-.34+Math.sin(t*5.4)*.045;
      }

      for(let i=0;i<lights.length;i+=1){
        lights[i].intensity=3.72+Math.sin(timeSeconds*4.0+i*1.7)*.26;
      }
    },
    dispose() {
      for(const system of particleSystems) {
        system?.stop?.();
        system?.dispose?.();
      }
      for(const light of lights) light?.dispose?.();
      root.dispose(false,true);
      for(const texture of ownedTextures) texture?.dispose?.();
      Object.values(materials).forEach(mat=>mat?.dispose?.());
    },
  };
}
