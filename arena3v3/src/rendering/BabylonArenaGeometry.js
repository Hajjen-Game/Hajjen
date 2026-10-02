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

function createIrregularSandstoneBlock(
  BABYLON,
  scene,
  name,
  width,
  height,
  depth,
  position,
  mat,
  seed=1,
  {
    corner=.18,
    topInset=.06,
    topWarp=.08,
    sideJitter=.06,
  }={},
) {
  const random=seededRandom(seed);
  const w=Math.max(.12,width);
  const d=Math.max(.12,depth);
  const h=Math.max(.08,height);
  const hw=w/2;
  const hd=d/2;
  const c=Math.min(Math.max(.02,corner),w*.22,d*.22);
  const base=[
    [-hw+c,-hd],[hw-c,-hd],[hw,-hd+c],[hw,hd-c],
    [hw-c,hd],[-hw+c,hd],[-hw,hd-c],[-hw,-hd+c],
  ];

  const bottom=[];
  const top=[];
  for(let i=0;i<base.length;i+=1){
    const [bx,bz]=base[i];
    const edgeScale=1+(random()-.5)*sideJitter;
    bottom.push([
      bx*edgeScale+(random()-.5)*w*.012,
      -h/2,
      bz*edgeScale+(random()-.5)*d*.012,
    ]);
    const inset=1-topInset+(random()-.5)*sideJitter*.78;
    top.push([
      bx*inset+(random()-.5)*w*.032,
      h/2+(random()-.5)*topWarp,
      bz*inset+(random()-.5)*d*.032,
    ]);
  }

  const positions=[];
  const indices=[];
  const normals=[];
  const uvs=[];
  const colors=[];
  const pushColor=(shade,count)=>{
    for(let i=0;i<count;i+=1){
      colors.push(shade,shade*.985,shade*.955,1);
    }
  };

  for(let i=0;i<8;i+=1){
    const j=(i+1)%8;
    const start=positions.length/3;
    for(const p of [bottom[i],bottom[j],top[j],top[i]]){
      positions.push(p[0],p[1],p[2]);
      uvs.push((p[0]/w)+.5,(p[1]/h)+.5);
    }
    const directionalBias=(i===1||i===2||i===3)?.075:0;
    pushColor(.76+directionalBias+random()*.16,4);
    indices.push(start,start+1,start+2,start,start+2,start+3);
  }

  const topCenter=[
    (random()-.5)*w*.05,
    h/2+topWarp*.16,
    (random()-.5)*d*.05,
  ];
  for(let i=0;i<8;i+=1){
    const j=(i+1)%8;
    const start=positions.length/3;
    for(const p of [topCenter,top[i],top[j]]){
      positions.push(p[0],p[1],p[2]);
      uvs.push((p[0]/w)+.5,(p[2]/d)+.5);
    }
    pushColor(.91+random()*.085,3);
    indices.push(start,start+1,start+2);
  }

  const bottomCenter=[0,-h/2,0];
  for(let i=0;i<8;i+=1){
    const j=(i+1)%8;
    const start=positions.length/3;
    for(const p of [bottomCenter,bottom[j],bottom[i]]){
      positions.push(p[0],p[1],p[2]);
      uvs.push((p[0]/w)+.5,(p[2]/d)+.5);
    }
    pushColor(.68,3);
    indices.push(start,start+1,start+2);
  }

  BABYLON.VertexData.ComputeNormals(positions,indices,normals);
  const mesh=new BABYLON.Mesh(name,scene);
  const data=new BABYLON.VertexData();
  data.positions=positions;
  data.indices=indices;
  data.normals=normals;
  data.uvs=uvs;
  data.colors=colors;
  data.applyToMesh(mesh);
  mesh.position.set(position.x,position.y,position.z);
  mesh.material=mat;
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
  const random=seededRandom(0xeab731);

  // Warm canyon earth outside the actual combat rectangle so there is no
  // black moat between the floor and the surrounding rocks.
  ctx.fillStyle="#70412f";
  ctx.fillRect(0,0,width,height);

  const base=ctx.createLinearGradient(
    b.x*sx,b.y*sy,
    (b.x+b.w)*sx,(b.y+b.h)*sy,
  );
  base.addColorStop(0,"#d08a52");
  base.addColorStop(.36,"#c27648");
  base.addColorStop(.70,"#ad633f");
  base.addColorStop(1,"#98533a");
  ctx.fillStyle=base;
  ctx.fillRect(b.x*sx,b.y*sy,b.w*sx,b.h*sy);

  // Broad painted warmth beneath the actual mesh facets.
  for(let i=0;i<14;i+=1){
    const x=(b.x+random()*b.w)*sx;
    const y=(b.y+random()*b.h)*sy;
    const r=(110+random()*230)*sx;
    const patch=ctx.createRadialGradient(x,y,0,x,y,r);
    patch.addColorStop(
      0,
      random()>.48
        ?"rgba(255,198,125,.055)"
        :"rgba(112,57,39,.045)",
    );
    patch.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=patch;
    ctx.fillRect(x-r,y-r,r*2,r*2);
  }

  // Sparse seams and little stones keep it handmade without becoming noisy.
  ctx.lineCap="round";
  ctx.lineJoin="round";
  for(let i=0;i<12;i+=1){
    let x=(b.x+58+random()*(b.w-116))*sx;
    let y=(b.y+48+random()*(b.h-96))*sy;
    const baseAngle=random()*Math.PI*2;
    const length=(28+random()*58)*sx;
    ctx.beginPath();
    ctx.moveTo(x,y);
    for(let p=0;p<2;p+=1){
      const a=baseAngle+(random()-.5)*.44;
      x+=Math.cos(a)*length*.48;
      y+=Math.sin(a)*length*.34;
      ctx.lineTo(x,y);
    }
    ctx.strokeStyle="rgba(86,43,31,"+(.075+random()*.035)+")";
    ctx.lineWidth=(.65+random()*.40)*sx;
    ctx.stroke();
  }

  for(let i=0;i<62;i+=1){
    const x=(b.x+24+random()*(b.w-48))*sx;
    const y=(b.y+22+random()*(b.h-44))*sy;
    const r=(.7+random()*2.1)*sx;
    ctx.beginPath();
    ctx.ellipse(
      x,y,r,r*(.38+random()*.28),
      random()*Math.PI,0,Math.PI*2,
    );
    ctx.fillStyle=random()>.52
      ?"rgba(67,42,34,.17)"
      :"rgba(248,188,119,.12)";
    ctx.fill();
  }

  const cx=(b.x+b.w/2)*sx;
  const cy=(b.y+b.h/2)*sy;
  const edgeShade=ctx.createRadialGradient(
    cx,cy,Math.min(width,height)*.38,
    cx,cy,Math.min(width,height)*.79,
  );
  edgeShade.addColorStop(0,"rgba(0,0,0,0)");
  edgeShade.addColorStop(.80,"rgba(40,22,17,.018)");
  edgeShade.addColorStop(1,"rgba(32,18,15,.08)");
  ctx.fillStyle=edgeShade;
  ctx.fillRect(0,0,width,height);

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

function createEmberwatchTerrainMesh(
  BABYLON,scene,arena,mapping,material,root,
) {
  const cols=12;
  const rows=7;
  const random=seededRandom(0xf10c82);
  const worldW=mapping.worldWidth;
  const worldH=mapping.worldHeight;
  const x0=-worldW/2;
  const z0=-worldH/2;
  const stepX=worldW/cols;
  const stepZ=worldH/rows;

  const grid=[];
  for(let r=0;r<=rows;r+=1){
    const line=[];
    for(let c=0;c<=cols;c+=1){
      const edge=c===0||c===cols||r===0||r===rows;
      const x=x0+c*stepX+(edge?0:(random()-.5)*stepX*.30);
      const z=z0+r*stepZ+(edge?0:(random()-.5)*stepZ*.28);
      const wave=
        Math.sin((c*.78)+(r*.51))*.065+
        Math.cos((r*.88)-(c*.37))*.045;
      const y=edge?-.045:wave+(random()-.5)*.085;
      line.push({x,y,z});
    }
    grid.push(line);
  }

  const positions=[];
  const indices=[];
  const normals=[];
  const uvs=[];
  const colors=[];
  const facetTones=[.83,.87,.90,.93,.96,1.00];

  const pushTri=(a,b,c)=>{
    const start=positions.length/3;
    const shade=facetTones[Math.floor(random()*facetTones.length)];
    for(const p of [a,b,c]){
      positions.push(p.x,p.y,p.z);
      uvs.push(
        (p.x+worldW/2)/worldW,
        1-(p.z+worldH/2)/worldH,
      );
      colors.push(shade,shade*.985,shade*.95,1);
    }
    indices.push(start,start+1,start+2);
  };

  for(let r=0;r<rows;r+=1){
    for(let c=0;c<cols;c+=1){
      const a=grid[r][c];
      const b=grid[r][c+1];
      const d=grid[r+1][c];
      const e=grid[r+1][c+1];
      if((r+c)%2===0){
        pushTri(a,d,e);
        pushTri(a,e,b);
      }else{
        pushTri(a,d,b);
        pushTri(b,d,e);
      }
    }
  }

  BABYLON.VertexData.ComputeNormals(positions,indices,normals);
  const mesh=new BABYLON.Mesh("babylon-emberwatch-lowpoly-terrain",scene);
  const data=new BABYLON.VertexData();
  data.positions=positions;
  data.indices=indices;
  data.normals=normals;
  data.uvs=uvs;
  data.colors=colors;
  data.applyToMesh(mesh);
  mesh.material=material;
  mesh.receiveShadows=true;
  mesh.parent=root;
  return mesh;
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

  if(arena.id==="emberwatch-bastion"){
    return createEmberwatchTerrainMesh(
      BABYLON,scene,arena,mapping,floorMat,root,
    );
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

function addBastionGrassClump(
  BABYLON,scene,name,p,materials,root,seed=1,
) {
  const random=seededRandom(seed);
  const count=5+Math.floor(random()*3);
  for(let i=0;i<count;i+=1){
    const h=.28+random()*.42;
    const blade=BABYLON.MeshBuilder.CreateCylinder(
      name+"-blade-"+i,
      {
        diameterTop:.012,
        diameterBottom:.07+random()*.045,
        height:h,
        tessellation:3,
      },
      scene,
    );
    blade.position.set(
      p.x+(random()-.5)*.38,
      h*.50+.025,
      p.z+(random()-.5)*.38,
    );
    blade.rotation.z=(random()-.5)*.40;
    blade.rotation.x=(random()-.5)*.24;
    blade.rotation.y=random()*Math.PI;
    blade.material=i%3===0?materials.bastionGrassDark:materials.bastionGrass;
    blade.convertToFlatShadedMesh?.();
    blade.parent=root;
  }
}

function addBastionCactus(
  BABYLON,scene,name,p,materials,root,seed=1,
) {
  const random=seededRandom(seed);
  const stemH=.70+random()*.42;
  const stem=BABYLON.MeshBuilder.CreateCylinder(
    name+"-stem",
    {
      diameterTop:.15,
      diameterBottom:.22,
      height:stemH,
      tessellation:6,
    },
    scene,
  );
  stem.position.set(p.x,stemH*.5,p.z);
  stem.material=materials.bastionCactus;
  stem.convertToFlatShadedMesh?.();
  stem.parent=root;

  if(random()>.28){
    const side=random()>.5?1:-1;
    const arm=BABYLON.MeshBuilder.CreateCylinder(
      name+"-arm",
      {
        diameterTop:.08,
        diameterBottom:.11,
        height:.34,
        tessellation:6,
      },
      scene,
    );
    arm.position.set(p.x+side*.14,stemH*.52,p.z);
    arm.rotation.z=side*Math.PI*.43;
    arm.material=materials.bastionCactusLight;
    arm.convertToFlatShadedMesh?.();
    arm.parent=root;
  }
}

function addBastionTopCrack(
  BABYLON,scene,name,x,z,y,length,angle,materials,root,
) {
  const crack=createBox(
    BABYLON,scene,name,
    .045,.025,length,
    {x,y,z},
    materials.bastionCrack,
  );
  crack.rotation.y=angle;
  crack.parent=root;
  return crack;
}

function decorateBastionObstacleBase(
  BABYLON,scene,index,rect,materials,root,shadowCasters,
) {
  const random=seededRandom(0xbc90+index*131);
  const anchors=[
    [-.43,.39],[.42,.36],[-.38,-.40],[.40,-.37],
  ];
  anchors.forEach(([nx,nz],i)=>{
    const p={
      x:rect.center.x+nx*rect.width+(random()-.5)*.22,
      y:0,
      z:rect.center.z+nz*rect.depth+(random()-.5)*.22,
    };
    if(i===0||i===3){
      addBastionGrassClump(
        BABYLON,scene,
        "bastion-base-grass-"+index+"-"+i,
        p,materials,root,0x8220+index*31+i,
      );
    }else{
      for(let r=0;r<2;r+=1){
        const rock=addLowPolyRock(
          BABYLON,scene,
          "bastion-base-rubble-"+index+"-"+i+"-"+r,
          {
            x:p.x+(random()-.5)*.40,
            y:.11+random()*.05,
            z:p.z+(random()-.5)*.36,
          },
          {
            x:.16+random()*.22,
            y:.11+random()*.13,
            z:.16+random()*.22,
          },
          r?materials.bastionRock:materials.bastionStoneDark,
          root,shadowCasters,
        );
        rock.rotation.y=random()*Math.PI;
      }
    }
  });

  if(index===0||index===3){
    addBastionCactus(
      BABYLON,scene,
      "bastion-base-cactus-"+index,
      {
        x:rect.center.x+rect.width*.35,
        y:0,
        z:rect.center.z+rect.depth*.29,
      },
      materials,root,0xca80+index*37,
    );
  }
}

function addBastionSpire(
  BABYLON,scene,obstacle,index,rect,materials,root,shadowCasters,
) {
  const random=seededRandom(0x5d10+index*181);
  const w=rect.width;
  const d=rect.depth;

  for(let i=0;i<7;i+=1){
    const a=i/7*Math.PI*2+random()*.28;
    const rock=addLowPolyRock(
      BABYLON,scene,
      "bastion-pillar-rubble-"+index+"-"+i,
      {
        x:rect.center.x+Math.cos(a)*w*.42,
        y:.13+random()*.07,
        z:rect.center.z+Math.sin(a)*d*.40,
      },
      {
        x:.20+random()*.28,
        y:.13+random()*.15,
        z:.20+random()*.28,
      },
      i%3===0?materials.bastionStoneWarm:materials.bastionRock,
      root,shadowCasters,
    );
    rock.rotation.y=random()*Math.PI;
  }

  const courses=[
    {y:.55,h:1.10,ws:1.00,ds:1.00,mat:materials.bastionStoneDark},
    {y:1.72,h:1.34,ws:.94,ds:.91,mat:materials.bastionStone},
    {y:2.93,h:1.18,ws:.88,ds:.92,mat:materials.bastionStoneWarm},
    {y:3.92,h:.80,ws:.93,ds:.88,mat:materials.bastionStoneTop},
  ];

  courses.forEach((course,i)=>{
    const block=createIrregularSandstoneBlock(
      BABYLON,scene,
      "bastion-irregular-pillar-"+index+"-"+i,
      w*course.ws,
      course.h,
      d*course.ds,
      {
        x:rect.center.x+(random()-.5)*.32,
        y:course.y,
        z:rect.center.z+(random()-.5)*.30,
      },
      course.mat,
      0x6200+index*89+i*17,
      {
        corner:Math.min(.92,Math.min(w,d)*.14),
        topInset:.075+random()*.045,
        topWarp:.14+random()*.08,
        sideJitter:.10+random()*.045,
      },
    );
    block.rotation.y=(random()-.5)*.085;
    block.parent=root;
    block.receiveShadows=true;
    shadowCasters.push(block);
  });

  const topY=4.33;
  addBastionTopCrack(
    BABYLON,scene,
    "bastion-pillar-crack-a-"+index,
    rect.center.x-w*.08,
    rect.center.z+d*.04,
    topY,
    Math.max(.72,d*.45),
    -.62+random()*.22,
    materials,root,
  );
  addBastionTopCrack(
    BABYLON,scene,
    "bastion-pillar-crack-b-"+index,
    rect.center.x+w*.13,
    rect.center.z-d*.09,
    topY+.006,
    Math.max(.54,d*.33),
    .74+random()*.18,
    materials,root,
  );

  decorateBastionObstacleBase(
    BABYLON,scene,index,rect,materials,root,shadowCasters,
  );
}

function addBastionRampart(
  BABYLON,scene,obstacle,index,rect,materials,root,shadowCasters,
) {
  const horizontal=rect.width>=rect.depth;
  const longSide=horizontal?rect.width:rect.depth;
  const shortSide=horizontal?rect.depth:rect.width;
  const random=seededRandom(0x7e10+index*199);
  const count=3;
  const gap=.14;
  const segLong=(longSide-gap*(count-1))/count;

  for(let i=0;i<count;i+=1){
    const off=-longSide/2+segLong/2+i*(segLong+gap);
    const cx=rect.center.x+(horizontal?off:0);
    const cz=rect.center.z+(horizontal?0:off);
    const width=horizontal?segLong:shortSide;
    const depth=horizontal?shortSide:segLong;
    const blockScale=.93+random()*.09;

    const lower=createIrregularSandstoneBlock(
      BABYLON,scene,
      "bastion-irregular-wall-"+index+"-"+i+"-lower",
      width*blockScale,
      1.22+(i===1?.08:0),
      depth*(.96+random()*.05),
      {
        x:cx+(random()-.5)*.13,
        y:.61+(i===1?.04:0),
        z:cz+(random()-.5)*.12,
      },
      i===1?materials.bastionStoneWarm:materials.bastionStoneDark,
      0x7520+index*101+i*23,
      {
        corner:Math.min(.58,Math.min(width,depth)*.13),
        topInset:.07+random()*.035,
        topWarp:.11+random()*.05,
        sideJitter:.09+random()*.035,
      },
    );
    lower.rotation.y=(random()-.5)*.055;
    lower.parent=root;
    lower.receiveShadows=true;
    shadowCasters.push(lower);

    const upper=createIrregularSandstoneBlock(
      BABYLON,scene,
      "bastion-irregular-wall-"+index+"-"+i+"-upper",
      width*(.90+random()*.05),
      1.30+(i===1?.10:0),
      depth*(.88+random()*.05),
      {
        x:cx+(random()-.5)*.15,
        y:1.88+(i===1?.08:0),
        z:cz+(random()-.5)*.13,
      },
      i===1?materials.bastionStoneTop:materials.bastionAccentStone,
      0x7820+index*109+i*29,
      {
        corner:Math.min(.55,Math.min(width,depth)*.13),
        topInset:.08+random()*.04,
        topWarp:.13+random()*.06,
        sideJitter:.095+random()*.04,
      },
    );
    upper.rotation.y=(random()-.5)*.065;
    upper.parent=root;
    upper.receiveShadows=true;
    shadowCasters.push(upper);

    addBastionTopCrack(
      BABYLON,scene,
      "bastion-wall-crack-"+index+"-"+i,
      cx+(random()-.5)*width*.12,
      cz+(random()-.5)*depth*.10,
      2.55+(i===1?.13:0),
      Math.max(.42,Math.min(width,depth)*.46),
      random()*Math.PI,
      materials,root,
    );
  }

  decorateBastionObstacleBase(
    BABYLON,scene,index,rect,materials,root,shadowCasters,
  );
}

function addBastionObstacle(
  BABYLON,scene,obstacle,index,mapping,materials,root,shadowCasters,
) {
  const rect=mapping.rectToWorld(obstacle);
  addContactShadow(
    BABYLON,scene,
    "bastion-los-shadow-"+(obstacle.id||index),
    rect.center,
    rect.width+2.7,
    rect.depth+2.8,
    materials,
    root,
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
  const random=seededRandom(Math.floor(Math.abs((gx+gy)*31))+91);

  const base=createIrregularSandstoneBlock(
    BABYLON,scene,name+"-base",
    4.05,.72,4.05,
    {x:p.x,y:.36,z:p.z},
    materials.bastionStoneDark,
    0xb920+Math.floor(Math.abs(gx+gy)),
    {corner:.62,topInset:.075,topWarp:.08,sideJitter:.065},
  );
  base.parent=root;
  base.receiveShadows=true;
  shadowCasters.push(base);

  const middle=createIrregularSandstoneBlock(
    BABYLON,scene,name+"-middle",
    3.32,.76,3.32,
    {x:p.x+(random()-.5)*.10,y:1.04,z:p.z+(random()-.5)*.10},
    materials.bastionStoneWarm,
    0xba20+Math.floor(Math.abs(gx-gy)),
    {corner:.54,topInset:.08,topWarp:.07,sideJitter:.065},
  );
  middle.parent=root;
  middle.receiveShadows=true;
  shadowCasters.push(middle);

  const bowl=BABYLON.MeshBuilder.CreateCylinder(
    name+"-bowl",
    {
      diameterTop:2.48,
      diameterBottom:1.48,
      height:.56,
      tessellation:8,
    },
    scene,
  );
  bowl.position.set(p.x,1.72,p.z);
  bowl.material=materials.bastionBronze;
  bowl.convertToFlatShadedMesh?.();
  bowl.parent=root;
  shadowCasters.push(bowl);

  const defs=[
    ["outer",1.78,.10,2.72,2.95,materials.flameOuter,.08],
    ["mid",1.18,.08,2.18,2.73,materials.flameMid,-.08],
    ["inner",.66,.05,1.60,2.52,materials.flameInner,.05],
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
    baseY:2.86,
    phase,
  });

  const light=new BABYLON.PointLight(
    name+"-light",
    new BABYLON.Vector3(p.x,3.65,p.z),
    scene,
  );
  light.diffuse=new BABYLON.Color3(1.0,.43,.11);
  light.specular=new BABYLON.Color3(.96,.27,.05);
  light.intensity=6.8;
  light.range=30;
  light.radius=1.20;
  light.metadata={baseIntensity:6.8};
  lights.push(light);

  if(particleTexture && BABYLON.ParticleSystem){
    const sparks=new BABYLON.ParticleSystem(name+"-embers",110,scene);
    sparks.particleTexture=particleTexture;
    sparks.emitter=new BABYLON.Vector3(p.x,2.25,p.z);
    sparks.minEmitBox=new BABYLON.Vector3(-.34,0,-.34);
    sparks.maxEmitBox=new BABYLON.Vector3(.34,.20,.34);
    sparks.color1=new BABYLON.Color4(1,.46,.07,1);
    sparks.color2=new BABYLON.Color4(1,.86,.28,.98);
    sparks.colorDead=new BABYLON.Color4(.32,.04,.01,0);
    sparks.minSize=.055;
    sparks.maxSize=.17;
    sparks.minLifeTime=.30;
    sparks.maxLifeTime=.96;
    sparks.emitRate=38;
    sparks.blendMode=BABYLON.ParticleSystem.BLENDMODE_ADD;
    sparks.direction1=new BABYLON.Vector3(-.19,1.50,-.19);
    sparks.direction2=new BABYLON.Vector3(.19,2.65,.19);
    sparks.minEmitPower=.64;
    sparks.maxEmitPower=1.20;
    sparks.updateSpeed=.017;
    sparks.start();
    particleSystems.push(sparks);
  }
}

function addBastionCanyonFormation(
  BABYLON,scene,name,p,w,h,d,materials,root,seed,
) {
  const random=seededRandom(seed);

  // One broad shelf plus one rear shoulder gives a canyon silhouette instead
  // of a row of repeated stacked columns.
  const shelf=createIrregularSandstoneBlock(
    BABYLON,scene,name+"-shelf",
    w,h*.55,d,
    {
      x:p.x+(random()-.5)*w*.06,
      y:h*.275,
      z:p.z+(random()-.5)*d*.06,
    },
    materials.bastionCliff,
    seed,
    {
      corner:Math.min(1.45,Math.min(w,d)*.16),
      topInset:.15+random()*.06,
      topWarp:.22+random()*.14,
      sideJitter:.14+random()*.06,
    },
  );
  shelf.rotation.y=(random()-.5)*.11;
  shelf.parent=root;
  shelf.receiveShadows=true;

  const shoulder=createIrregularSandstoneBlock(
    BABYLON,scene,name+"-shoulder",
    w*(.50+random()*.16),
    h*(.50+random()*.18),
    d*(.52+random()*.16),
    {
      x:p.x+(random()-.5)*w*.24,
      y:h*.47,
      z:p.z+(random()-.5)*d*.18,
    },
    materials.bastionCliffLight,
    seed+17,
    {
      corner:Math.min(1.20,Math.min(w,d)*.18),
      topInset:.18+random()*.07,
      topWarp:.24+random()*.14,
      sideJitter:.16+random()*.07,
    },
  );
  shoulder.rotation.y=(random()-.5)*.16;
  shoulder.parent=root;
  shoulder.receiveShadows=true;

  for(let i=0;i<2;i+=1){
    const rock=addLowPolyRock(
      BABYLON,scene,name+"-boulder-"+i,
      {
        x:p.x+(i?1:-1)*w*(.28+random()*.09),
        y:.34+random()*.24,
        z:p.z+(random()-.5)*d*.55,
      },
      {
        x:.70+random()*.70,
        y:.46+random()*.46,
        z:.62+random()*.68,
      },
      i?materials.bastionRock:materials.bastionStoneWarm,
      root,
      null,
    );
    rock.rotation.y=random()*Math.PI;
  }
}

function addBastionCanyonRim(
  BABYLON,scene,arena,mapping,materials,root,shadowCasters,
) {
  const b=arena.bounds;
  const defs=[
    [b.x+b.w*.07,b.y-24,12.0,4.2,6.8,0x101],
    [b.x+b.w*.27,b.y-29,15.0,5.0,7.5,0x102],
    [b.x+b.w*.51,b.y-26,14.0,4.5,7.0,0x103],
    [b.x+b.w*.74,b.y-30,16.0,5.2,7.8,0x104],
    [b.x+b.w*.94,b.y-23,11.0,4.0,6.4,0x105],

    [b.x+b.w*.06,b.y+b.h+23,11.5,4.0,6.6,0x201],
    [b.x+b.w*.25,b.y+b.h+29,15.5,5.2,7.6,0x202],
    [b.x+b.w*.49,b.y+b.h+27,14.0,4.7,7.1,0x203],
    [b.x+b.w*.73,b.y+b.h+30,16.0,5.3,7.7,0x204],
    [b.x+b.w*.94,b.y+b.h+22,10.6,3.9,6.2,0x205],

    [b.x-25,b.y+b.h*.18,6.8,4.3,10.5,0x301],
    [b.x-29,b.y+b.h*.78,7.2,4.8,11.0,0x302],
    [b.x+b.w+25,b.y+b.h*.20,6.9,4.4,10.6,0x303],
    [b.x+b.w+29,b.y+b.h*.80,7.3,4.9,11.1,0x304],
  ];

  defs.forEach(([gx,gy,w,h,d,seed],i)=>{
    const p=mapping.gameToWorld(gx,gy,0);
    addBastionCanyonFormation(
      BABYLON,scene,
      "bastion-canyon-"+i,
      p,w,h,d,materials,root,seed,
    );
  });
}

function addBastionEdgeDressing(
  BABYLON,scene,arena,mapping,materials,root,shadowCasters,
) {
  const b=arena.bounds;
  const defs=[
    [b.x+36,b.y+32,0x410],
    [b.x+118,b.y+24,0x411],
    [b.x+b.w-112,b.y+26,0x412],
    [b.x+b.w-38,b.y+38,0x413],
    [b.x+48,b.y+b.h-36,0x414],
    [b.x+148,b.y+b.h-27,0x415],
    [b.x+b.w-140,b.y+b.h-29,0x416],
    [b.x+b.w-46,b.y+b.h-40,0x417],
  ];

  defs.forEach(([gx,gy,seed],i)=>{
    const p=mapping.gameToWorld(gx,gy,0);
    addBastionGrassClump(
      BABYLON,scene,
      "bastion-rim-grass-"+i,
      p,materials,root,seed,
    );
    if(i===1||i===3||i===6){
      addBastionCactus(
        BABYLON,scene,
        "bastion-rim-cactus-"+i,
        {x:p.x+.28,y:0,z:p.z-.12},
        materials,root,seed+33,
      );
    }

    const random=seededRandom(seed+99);
    for(let r=0;r<3;r+=1){
      const rock=addLowPolyRock(
        BABYLON,scene,
        "bastion-rim-pebble-"+i+"-"+r,
        {
          x:p.x+(random()-.5)*1.30,
          y:.09,
          z:p.z+(random()-.5)*.90,
        },
        {
          x:.13+random()*.22,
          y:.10+random()*.15,
          z:.13+random()*.24,
        },
        r===1?materials.bastionStoneWarm:materials.bastionRock,
        root,shadowCasters,
      );
      rock.rotation.y=random()*Math.PI;
    }
  });
}

function addBastionScenery(
  BABYLON,scene,arena,mapping,materials,root,shadowCasters,
  lights,flames,particleSystems,particleTexture,
) {
  const b=arena.bounds;

  addBastionCanyonRim(
    BABYLON,scene,arena,mapping,materials,root,shadowCasters,
  );
  addBastionEdgeDressing(
    BABYLON,scene,arena,mapping,materials,root,shadowCasters,
  );

  const fires=[
    ["nw",b.x-4,b.y-5,.2],
    ["ne",b.x+b.w+4,b.y-5,1.6],
    ["sw",b.x-4,b.y+b.h+5,2.8],
    ["se",b.x+b.w+4,b.y+b.h+5,4.0],
  ];
  for(const [id,x,y,phase] of fires){
    addBastionBrazier(
      BABYLON,scene,"bastion-brazier-"+id,
      x,y,mapping,materials,root,shadowCasters,
      lights,flames,particleSystems,particleTexture,phase,
    );
  }
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
  if(Array.isArray(shadowCasters)){
    shadowCasters.push(rock);
  }
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
    bastionFloor:pbrMaterial(BABYLON,scene,"mat-bastion-floor","#bd7044",{
      metallic:0,roughness:.95,environmentIntensity:.24,directIntensity:1.13,
    }),
    bastionGroundLight:pbrMaterial(BABYLON,scene,"mat-bastion-ground-light","#c47a48",{
      metallic:0,roughness:.96,environmentIntensity:.20,directIntensity:1.06,
    }),
    bastionGroundWarm:pbrMaterial(BABYLON,scene,"mat-bastion-ground-warm","#9c5737",{
      metallic:0,roughness:.97,environmentIntensity:.18,directIntensity:1.06,
    }),
    bastionGroundDark:pbrMaterial(BABYLON,scene,"mat-bastion-ground-dark","#70402f",{
      metallic:0,roughness:.98,environmentIntensity:.16,directIntensity:1.04,
    }),
    bastionStoneDark:pbrMaterial(BABYLON,scene,"mat-bastion-stone-dark","#70422f",{
      metallic:0,roughness:.90,environmentIntensity:.31,directIntensity:1.08,
    }),
    bastionStone:pbrMaterial(BABYLON,scene,"mat-bastion-stone","#9f5837",{
      metallic:0,roughness:.80,environmentIntensity:.42,directIntensity:1.12,
    }),
    bastionStoneTrim:pbrMaterial(BABYLON,scene,"mat-bastion-stone-trim","#ac633d",{
      metallic:.04,roughness:.72,environmentIntensity:.48,directIntensity:1.15,
    }),
    bastionStoneTop:pbrMaterial(BABYLON,scene,"mat-bastion-stone-top","#b96b40",{
      metallic:.02,roughness:.67,environmentIntensity:.52,directIntensity:1.16,
    }),
    bastionMetal:pbrMaterial(BABYLON,scene,"mat-bastion-metal","#684025",{
      metallic:.70,roughness:.34,environmentIntensity:.72,directIntensity:1.18,
    }),
    bastionInset:material(BABYLON,scene,"mat-bastion-inset","#6e412e","#1d120e"),
    bastionRune:material(
      BABYLON,scene,"mat-bastion-rune","#ff9b42","#5f2c10","#ff7228"
    ),
    bastionBanner:material(BABYLON,scene,"mat-bastion-banner","#651f25","#15090b"),
    bastionBannerTrim:material(BABYLON,scene,"mat-bastion-banner-trim","#d9a55b","#39210d"),
    bastionRock:pbrMaterial(BABYLON,scene,"mat-bastion-rock","#654034",{
      metallic:0,roughness:.96,environmentIntensity:.28,directIntensity:1.05,
    }),
    bastionAccentStone:pbrMaterial(BABYLON,scene,"mat-bastion-accent-stone","#a65c38",{
      metallic:.02,roughness:.72,environmentIntensity:.48,directIntensity:1.16,
    }),
    bastionStoneWarm:pbrMaterial(BABYLON,scene,"mat-bastion-stone-warm","#b8663b",{
      metallic:0,roughness:.84,environmentIntensity:.28,directIntensity:1.12,
    }),
    bastionCliff:pbrMaterial(BABYLON,scene,"mat-bastion-cliff","#713d2e",{
      metallic:0,roughness:.97,environmentIntensity:.15,directIntensity:1.05,
    }),
    bastionCliffLight:pbrMaterial(BABYLON,scene,"mat-bastion-cliff-light","#8f4b31",{
      metallic:0,roughness:.95,environmentIntensity:.18,directIntensity:1.07,
    }),
    bastionGrass:material(BABYLON,scene,"mat-bastion-grass","#c08a39","#281a0c"),
    bastionGrassDark:material(BABYLON,scene,"mat-bastion-grass-dark","#8e642f","#21150b"),
    bastionCactus:material(BABYLON,scene,"mat-bastion-cactus","#61713c","#17200f"),
    bastionCactusLight:material(BABYLON,scene,"mat-bastion-cactus-light","#829146","#1b2411"),
    bastionCrack:material(BABYLON,scene,"mat-bastion-crack","#4a2d25","#120b09"),
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
  materials.bastionGrass.specularColor=new BABYLON.Color3(.02,.015,.008);
  materials.bastionGrassDark.specularColor=new BABYLON.Color3(.02,.015,.008);
  materials.bastionCactus.specularColor=new BABYLON.Color3(.02,.03,.01);
  materials.bastionCactusLight.specularColor=new BABYLON.Color3(.02,.03,.01);
  materials.bastionCrack.specularColor=new BABYLON.Color3(0,0,0);
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
  materials.contactShadow.alpha=.14;

  [
    materials.bastionFloor,
    materials.bastionGroundLight,
    materials.bastionGroundWarm,
    materials.bastionGroundDark,
    materials.bastionStoneDark,
    materials.bastionStone,
    materials.bastionStoneTrim,
    materials.bastionStoneTop,
    materials.bastionStoneWarm,
    materials.bastionAccentStone,
    materials.bastionRock,
    materials.bastionCliff,
    materials.bastionCliffLight,
  ].forEach(mat=>{
    if(mat) mat.useVertexColors=true;
  });

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

  // Emberwatch intentionally stays clean and flat-shaded. The reference look
  // comes from geometry + light, not noisy surface maps.
  [
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
        const base=Number(lights[i]?.metadata?.baseIntensity)||3.72;
        lights[i].intensity=base+Math.sin(timeSeconds*4.0+i*1.7)*.28;
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
