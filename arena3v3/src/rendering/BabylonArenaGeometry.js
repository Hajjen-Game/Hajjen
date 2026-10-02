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
  const random=seededRandom(0x93af21);

  const base=ctx.createRadialGradient(
    cx,cy,Math.min(width,height)*.08,
    cx,cy,Math.min(width,height)*.80,
  );
  base.addColorStop(0,"#936a4c");
  base.addColorStop(.42,"#815b43");
  base.addColorStop(.76,"#6b4938");
  base.addColorStop(1,"#52382e");
  ctx.fillStyle=base;
  ctx.fillRect(0,0,width,height);

  const facetPalette=[
    "rgba(210,147,92,.105)",
    "rgba(123,79,57,.115)",
    "rgba(235,174,109,.060)",
    "rgba(74,47,39,.105)",
    "rgba(164,103,69,.075)",
  ];
  for(let i=0;i<18;i+=1){
    const gx=(b.x+70+random()*(b.w-140))*sx;
    const gy=(b.y+60+random()*(b.h-120))*sy;
    const radius=(72+random()*145)*sx;
    const sides=5+Math.floor(random()*3);
    ctx.beginPath();
    for(let p=0;p<sides;p+=1){
      const angle=p/sides*Math.PI*2+(random()-.5)*.20;
      const rr=radius*(.58+random()*.48);
      const px=gx+Math.cos(angle)*rr;
      const py=gy+Math.sin(angle)*rr*(.52+random()*.22);
      if(p===0) ctx.moveTo(px,py);
      else ctx.lineTo(px,py);
    }
    ctx.closePath();
    ctx.fillStyle=facetPalette[i%facetPalette.length];
    ctx.fill();
  }

  const wearZones=[
    [b.x+b.w*.50,b.y+b.h*.50,230,.10],
    [b.x+b.w*.29,b.y+b.h*.35,120,.065],
    [b.x+b.w*.71,b.y+b.h*.65,120,.065],
    [b.x+b.w*.16,b.y+b.h*.52,95,.050],
    [b.x+b.w*.84,b.y+b.h*.48,95,.050],
  ];
  for(const [gx,gy,radius,alpha] of wearZones){
    const x=gx*sx;
    const y=gy*sy;
    const r=radius*sx;
    const g=ctx.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,"rgba(40,27,22,"+alpha+")");
    g.addColorStop(.68,"rgba(54,35,27,"+(alpha*.34)+")");
    g.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=g;
    ctx.fillRect(x-r,y-r,r*2,r*2);
  }

  ctx.save();
  ctx.translate(cx,cy);
  ctx.strokeStyle="rgba(223,173,119,.105)";
  ctx.lineWidth=2.1*sx;
  ctx.lineCap="round";
  const ringR=145*sx;
  for(const [a0,a1] of [
    [-2.82,-1.54],
    [-1.18,.08],
    [.46,1.60],
    [1.98,2.66],
  ]){
    ctx.beginPath();
    ctx.arc(0,0,ringR,a0,a1);
    ctx.stroke();
  }
  ctx.strokeStyle="rgba(45,30,24,.12)";
  ctx.lineWidth=3.6*sx;
  ctx.beginPath();
  ctx.arc(0,0,ringR+10*sx,.18,2.18);
  ctx.stroke();
  ctx.restore();

  ctx.lineCap="round";
  for(let i=0;i<11;i+=1){
    let x=(b.x+105+random()*(b.w-210))*sx;
    let y=(b.y+80+random()*(b.h-160))*sy;
    const angle=random()*Math.PI*2;
    const length=(22+random()*62)*sx;
    ctx.beginPath();
    ctx.moveTo(x,y);
    for(let p=0;p<2+Math.floor(random()*2);p+=1){
      x+=Math.cos(angle+(random()-.5)*.55)*length/3;
      y+=Math.sin(angle+(random()-.5)*.55)*length/3;
      ctx.lineTo(x,y);
    }
    ctx.strokeStyle="rgba(42,28,23,"+(.13+random()*.10)+")";
    ctx.lineWidth=(.9+random()*.8)*sx;
    ctx.stroke();
  }

  const firePools=[
    [b.x-7,b.y+b.h*.72],
    [b.x+b.w+7,b.y+b.h*.28],
  ];
  ctx.save();
  ctx.globalCompositeOperation="screen";
  for(const [gx,gy] of firePools){
    const x=gx*sx;
    const y=gy*sy;
    const r=180*sx;
    const glow=ctx.createRadialGradient(x,y,0,x,y,r);
    glow.addColorStop(0,"rgba(255,151,61,.34)");
    glow.addColorStop(.28,"rgba(245,102,34,.16)");
    glow.addColorStop(.62,"rgba(195,68,25,.055)");
    glow.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=glow;
    ctx.fillRect(x-r,y-r,r*2,r*2);
  }
  ctx.restore();

  for(let i=0;i<1450;i+=1){
    const alpha=.007+random()*.016;
    ctx.fillStyle=random()>.56
      ?"rgba(238,192,145,"+alpha+")"
      :"rgba(28,18,15,"+alpha+")";
    ctx.fillRect(
      Math.floor(random()*width),
      Math.floor(random()*height),
      1,1,
    );
  }

  const edge=ctx.createRadialGradient(
    cx,cy,Math.min(width,height)*.32,
    cx,cy,Math.min(width,height)*.83,
  );
  edge.addColorStop(0,"rgba(0,0,0,0)");
  edge.addColorStop(.72,"rgba(0,0,0,.025)");
  edge.addColorStop(1,"rgba(17,11,9,.24)");
  ctx.fillStyle=edge;
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
  return arena.id==="windscar-proving-grounds"
    ? createWindscarFloorTexture(BABYLON,scene,arena,mapping)
    : createGrandRingFloorTexture(BABYLON,scene,arena,mapping);
}

function addFloor(BABYLON,scene,arena,mapping,materials,root,ownedTextures) {
  const floorTexture=createFloorTexture(BABYLON,scene,arena,mapping);
  ownedTextures.push(floorTexture);

  const floorMat=arena.id==="windscar-proving-grounds"
    ? materials.floor
    : materials.grandFloor;
  floorMat.diffuseTexture=floorTexture;
  floorMat.diffuseColor=new BABYLON.Color3(1,1,1);
  floorMat.specularColor=new BABYLON.Color3(.035,.03,.025);

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

function addWindscarRunePlate(
  BABYLON,
  scene,
  name,
  rect,
  elevation,
  horizontal,
  materials,
  root,
) {
  const plate=BABYLON.MeshBuilder.CreatePlane(
    name,
    {
      width:horizontal?1.6:1.15,
      height:horizontal?.56:.90,
      sideOrientation:BABYLON.Mesh.DOUBLESIDE,
    },
    scene,
  );
  if(horizontal){
    plate.position.set(
      rect.center.x,
      elevation,
      rect.center.z-rect.depth/2-.022,
    );
  }else{
    plate.position.set(
      rect.center.x-rect.width/2-.022,
      elevation,
      rect.center.z,
    );
    plate.rotation.y=Math.PI/2;
  }
  plate.material=materials.windscarRune;
  plate.parent=root;
  return plate;
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
  const logicalHeight=babylonObstacleVisualHeight(rect);
  const isWall=obstacle.id==="center-wall";
  const height=isWall
    ? Math.max(4.25,logicalHeight*.72)
    : Math.max(4.85,logicalHeight*.78);
  const horizontal=rect.width>=rect.depth;
  const chamfer=Math.min(.78,Math.min(rect.width,rect.depth)*.12);

  addContactShadow(
    BABYLON,scene,
    "babylon-windscar-shadow-"+(obstacle.id||index),
    rect.center,
    rect.width+2.5,
    rect.depth+2.65,
    materials,
    root,
  );

  if(isWall){
    const base=createChamferedPrism(
      BABYLON,scene,
      "babylon-windscar-wall-base",
      rect.width,
      .46,
      rect.depth,
      chamfer,
      {x:rect.center.x,y:.23,z:rect.center.z},
      materials.windscarStoneDark,
    );
    base.parent=root;
    base.receiveShadows=true;
    shadowCasters.push(base);

    const count=3;
    const gap=.10;
    const longSide=horizontal?rect.width:rect.depth;
    const moduleLong=(longSide-gap*(count-1))/count;
    const heights=[height*.91,height,height*.87];

    for(let i=0;i<count;i+=1){
      const offset=-longSide/2+moduleLong/2+i*(moduleLong+gap);
      const moduleH=heights[i];
      const bottomW=horizontal?moduleLong:Math.max(.6,rect.width-.34);
      const bottomD=horizontal?Math.max(.6,rect.depth-.34):moduleLong;
      const topW=horizontal?Math.max(.55,moduleLong-.22):Math.max(.55,rect.width-.66);
      const topD=horizontal?Math.max(.55,rect.depth-.66):Math.max(.55,moduleLong-.22);

      const body=createChamferedFrustum(
        BABYLON,scene,
        "babylon-windscar-wall-module-"+i,
        bottomW,bottomD,
        topW,topD,
        moduleH-.78,
        Math.min(.50,chamfer*.74),
        {
          x:rect.center.x+(horizontal?offset:0),
          y:.46+(moduleH-.78)/2,
          z:rect.center.z+(horizontal?0:offset),
        },
        i===1?materials.windscarStone:materials.windscarStoneAlt,
      );
      body.parent=root;
      body.receiveShadows=true;
      shadowCasters.push(body);

      const top=createChamferedPrism(
        BABYLON,scene,
        "babylon-windscar-wall-cap-"+i,
        Math.max(.5,topW+.18),
        .34,
        Math.max(.5,topD+.18),
        Math.min(.46,chamfer*.70),
        {
          x:rect.center.x+(horizontal?offset:0),
          y:moduleH-.18,
          z:rect.center.z+(horizontal?0:offset),
        },
        i===1?materials.windscarStoneTop:materials.windscarStoneTopAlt,
      );
      top.parent=root;
      top.receiveShadows=true;
      shadowCasters.push(top);
    }

    for(const offset of [-.95,.95]){
      const plate=BABYLON.MeshBuilder.CreatePlane(
        "babylon-windscar-wall-ember-"+offset,
        {
          width:horizontal?.16:1.12,
          height:horizontal?1.10:.16,
          sideOrientation:BABYLON.Mesh.DOUBLESIDE,
        },
        scene,
      );
      if(horizontal){
        plate.position.set(
          rect.center.x+offset*(rect.width*.28),
          height*.48,
          rect.center.z-rect.depth/2-.025,
        );
      }else{
        plate.position.set(
          rect.center.x-rect.width/2-.025,
          height*.48,
          rect.center.z+offset*(rect.depth*.28),
        );
        plate.rotation.y=Math.PI/2;
      }
      plate.material=materials.windscarRune;
      plate.parent=root;
    }
    return;
  }

  const base=createChamferedPrism(
    BABYLON,scene,
    "babylon-windscar-pillar-base-"+index,
    rect.width,
    .52,
    rect.depth,
    chamfer,
    {x:rect.center.x,y:.26,z:rect.center.z},
    materials.windscarStoneDark,
  );
  base.parent=root;
  base.receiveShadows=true;
  shadowCasters.push(base);

  const step=createChamferedPrism(
    BABYLON,scene,
    "babylon-windscar-pillar-step-"+index,
    Math.max(.6,rect.width-.34),
    .42,
    Math.max(.6,rect.depth-.34),
    Math.max(.15,chamfer*.84),
    {x:rect.center.x,y:.73,z:rect.center.z},
    materials.windscarStoneAlt,
  );
  step.parent=root;
  step.receiveShadows=true;
  shadowCasters.push(step);

  const bodyHeight=Math.max(2.4,height-1.24);
  const body=createChamferedFrustum(
    BABYLON,scene,
    "babylon-windscar-pillar-body-"+index,
    Math.max(.6,rect.width-.58),
    Math.max(.6,rect.depth-.58),
    Math.max(.55,rect.width-1.06),
    Math.max(.55,rect.depth-1.06),
    bodyHeight,
    Math.max(.16,chamfer*.70),
    {x:rect.center.x,y:.94+bodyHeight/2,z:rect.center.z},
    materials.windscarStone,
  );
  body.parent=root;
  body.receiveShadows=true;
  shadowCasters.push(body);

  const crown=createChamferedPrism(
    BABYLON,scene,
    "babylon-windscar-pillar-crown-"+index,
    Math.max(.6,rect.width-.42),
    .38,
    Math.max(.6,rect.depth-.42),
    Math.max(.15,chamfer*.80),
    {x:rect.center.x,y:height-.08,z:rect.center.z},
    materials.windscarStoneTop,
  );
  crown.parent=root;
  crown.receiveShadows=true;
  shadowCasters.push(crown);

  const keystone=BABYLON.MeshBuilder.CreateCylinder(
    "babylon-windscar-pillar-keystone-"+index,
    {
      diameterTop:1.30,
      diameterBottom:1.55,
      height:.24,
      tessellation:4,
    },
    scene,
  );
  keystone.position.set(rect.center.x,height+.18,rect.center.z);
  keystone.rotation.y=Math.PI/4;
  keystone.material=materials.windscarStoneTopAlt;
  keystone.parent=root;
  keystone.receiveShadows=true;
  shadowCasters.push(keystone);

  addWindscarRunePlate(
    BABYLON,scene,
    "babylon-windscar-rune-"+index,
    rect,
    height*.47,
    true,
    materials,
    root,
  );
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
  phase,
) {
  const p=mapping.gameToWorld(gameX,gameY,0);

  const plinth=BABYLON.MeshBuilder.CreateCylinder(
    name+"-plinth",
    {
      diameterTop:3.35,
      diameterBottom:3.75,
      height:.72,
      tessellation:8,
    },
    scene,
  );
  plinth.position.set(p.x,.36,p.z);
  plinth.material=materials.windscarStoneDark;
  plinth.convertToFlatShadedMesh?.();
  plinth.parent=root;
  plinth.receiveShadows=true;
  shadowCasters.push(plinth);

  const bowl=BABYLON.MeshBuilder.CreateCylinder(
    name+"-bowl",
    {
      diameterTop:2.20,
      diameterBottom:1.45,
      height:.58,
      tessellation:8,
    },
    scene,
  );
  bowl.position.set(p.x,1.00,p.z);
  bowl.material=materials.windscarMetal;
  bowl.convertToFlatShadedMesh?.();
  bowl.parent=root;
  shadowCasters.push(bowl);

  const defs=[
    ["outer",1.42,.08,2.25,2.18,materials.flameOuter,.08],
    ["mid",.96,.06,1.80,2.02,materials.flameMid,-.08],
    ["inner",.52,.04,1.35,1.86,materials.flameInner,.06],
  ];
  const parts={};
  for(const [key,bottom,top,height,y,mat,tilt] of defs){
    const flame=BABYLON.MeshBuilder.CreateCylinder(
      name+"-flame-"+key,
      {
        diameterTop:top,
        diameterBottom:bottom,
        height,
        tessellation:5,
      },
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
    baseY:2.13,
    phase,
  });

  const glow=BABYLON.MeshBuilder.CreateDisc(
    name+"-floor-glow",
    {
      radius:5.9,
      tessellation:40,
      sideOrientation:BABYLON.Mesh.DOUBLESIDE,
    },
    scene,
  );
  glow.position.set(p.x,.025,p.z);
  glow.rotation.x=Math.PI/2;
  glow.material=materials.floorGlow;
  glow.parent=root;

  const light=new BABYLON.PointLight(
    name+"-light",
    new BABYLON.Vector3(p.x,3.3,p.z),
    scene,
  );
  light.diffuse=new BABYLON.Color3(1.0,.46,.16);
  light.specular=new BABYLON.Color3(.72,.30,.10);
  light.intensity=3.05;
  light.range=35;
  lights.push(light);
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
) {
  const b=arena.bounds;

  addWindscarWatchfire(
    BABYLON,scene,
    "babylon-windscar-watchfire-west",
    b.x-27,b.y+b.h*.72,
    mapping,materials,root,shadowCasters,lights,flames,.35,
  );
  addWindscarWatchfire(
    BABYLON,scene,
    "babylon-windscar-watchfire-east",
    b.x+b.w+27,b.y+b.h*.28,
    mapping,materials,root,shadowCasters,lights,flames,2.65,
  );

  const rockPoints=[
    [b.x-29,b.y+102,2.0,1.25,1.75],
    [b.x-28,b.y+b.h-102,2.25,1.35,1.90],
    [b.x+b.w+29,b.y+108,2.15,1.30,1.80],
    [b.x+b.w+28,b.y+b.h-108,2.35,1.42,2.00],
  ];

  rockPoints.forEach((entry,index)=>{
    const [gx,gy,sx,sy,sz]=entry;
    const p=mapping.gameToWorld(gx,gy,0);
    addLowPolyRock(
      BABYLON,scene,
      "babylon-windscar-outcrop-"+index,
      {x:p.x,y:sy*.46,z:p.z},
      {x:sx,y:sy,z:sz},
      index%2?materials.windscarRockDark:materials.windscarRock,
      root,
      shadowCasters,
    );
  });

  addGroundDebris(
    BABYLON,scene,arena,mapping,materials,root,
  );
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
  const ownedTextures=[];

  const materials={
    floor:material(BABYLON,scene,"mat-floor","#6b4d3b","#1f1915"),
    grandFloor:material(BABYLON,scene,"mat-grand-floor","#3c4a36","#172016"),
    windscarStoneDark:material(BABYLON,scene,"mat-windscar-stone-dark","#4b3a31","#1a120f"),
    windscarStone:material(BABYLON,scene,"mat-windscar-stone","#765c49","#2a1d15"),
    windscarStoneTop:material(BABYLON,scene,"mat-windscar-stone-top","#a98265","#3d291b"),
    windscarStoneAlt:material(BABYLON,scene,"mat-windscar-stone-alt","#6b5242","#251912"),
    windscarStoneTopAlt:material(BABYLON,scene,"mat-windscar-stone-top-alt","#98745b","#362319"),
    windscarMetal:material(BABYLON,scene,"mat-windscar-metal","#2d1e19","#714021"),
    windscarRune:material(
      BABYLON,scene,"mat-windscar-rune","#ff8b37","#5b220b","#ff5c19"
    ),
    windscarSeam:material(BABYLON,scene,"mat-windscar-seam","#3e3027","#150f0c"),
    windscarRock:material(BABYLON,scene,"mat-windscar-rock","#684c3b","#21160f"),
    windscarRockDark:material(BABYLON,scene,"mat-windscar-rock-dark","#49352c","#18100d"),
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

  materials.windscarRune.disableLighting=true;
  materials.windscarRune.alpha=.82;
  materials.windscarMetal.specularPower=22;
  materials.seam.alpha=.90;
  materials.seamSoft.alpha=.48;
  materials.flameOuter.disableLighting=true;
  materials.flameMid.disableLighting=true;
  materials.flameInner.disableLighting=true;
  materials.emberGlow.disableLighting=true;
  materials.emberGlow.alpha=.24;
  materials.floorGlow.disableLighting=true;
  materials.floorGlow.alpha=.14;

  const softShadow=createSoftShadowTexture(BABYLON,scene);
  ownedTextures.push(softShadow);
  materials.contactShadow.disableLighting=true;
  materials.contactShadow.diffuseColor=new BABYLON.Color3(0,0,0);
  materials.contactShadow.opacityTexture=softShadow;
  materials.contactShadow.alpha=.18;

  const stoneSurface=createStoneSurfaceTexture(
    BABYLON,scene,
    "babylon-handbuilt-stone-surface",
    arena.id==="windscar-proving-grounds"?0x2177:0x7712,
  );
  ownedTextures.push(stoneSurface);
  [
    materials.windscarStoneDark,
    materials.windscarStone,
    materials.windscarStoneAlt,
    materials.windscarStoneTop,
    materials.windscarStoneTopAlt,
    materials.windscarRock,
    materials.windscarRockDark,
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
    mat.emissiveColor=mat.diffuseColor.scale(.045);
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

  if(arena.id==="windscar-proving-grounds"){
    // Windscar is the only arena receiving the new stylized desert/stone art
    // direction. Keep scenery outside gameplay bounds.
    for(let index=0;index<arena.obstacles.length;index+=1){
      addWindscarObstacle(
        BABYLON,scene,arena.obstacles[index],index,
        mapping,materials,root,shadowCasters,
      );
    }
    addWindscarScenery(
      BABYLON,scene,arena,mapping,materials,root,shadowCasters,lights,flames,
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
        lights[i].intensity=3.02+Math.sin(timeSeconds*4.0+i*1.7)*.22;
      }
    },
    dispose() {
      for(const light of lights) light?.dispose?.();
      root.dispose(false,true);
      for(const texture of ownedTextures) texture?.dispose?.();
      Object.values(materials).forEach(mat=>mat?.dispose?.());
    },
  };
}
