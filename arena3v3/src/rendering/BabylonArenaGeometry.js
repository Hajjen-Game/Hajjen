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

function createFloorTexture(BABYLON,scene,arena,mapping) {
  const width = 1024;
  const height = Math.max(512,Math.round(width * mapping.height / mapping.width));
  const texture = new BABYLON.DynamicTexture(
    "babylon-stone-floor-texture",
    {width,height},
    scene,
    false,
  );
  const ctx = texture.getContext();
  const sx = width / mapping.width;
  const sy = height / mapping.height;
  const b = arena.bounds;
  const cx = (b.x + b.w / 2) * sx;
  const cy = (b.y + b.h / 2) * sy;
  const minLogical = Math.min(b.w,b.h);
  const random = seededRandom(
    arena.id === "windscar-proving-grounds" ? 0x51a7c3 : 0x736f6c,
  );

  const radial = ctx.createRadialGradient(
    cx,cy,0,
    cx,cy,Math.max(width,height) * .68,
  );
  radial.addColorStop(0,"#77513a");
  radial.addColorStop(.42,"#68442f");
  radial.addColorStop(.78,"#563727");
  radial.addColorStop(1,"#3d281e");
  ctx.fillStyle = radial;
  ctx.fillRect(0,0,width,height);

  // Large, cloudy stone variation.
  for(let i=0;i<150;i+=1){
    const x=random()*width;
    const y=random()*height;
    const rx=24+random()*88;
    const ry=18+random()*58;
    const warm=random()>.5;
    const g=ctx.createRadialGradient(x,y,0,x,y,rx);
    g.addColorStop(
      0,
      warm
        ? "rgba(177,111,63,"+(0.018+random()*.035)+")"
        : "rgba(33,23,19,"+(0.025+random()*.040)+")",
    );
    g.addColorStop(1,"rgba(0,0,0,0)");
    ctx.save();
    ctx.translate(x,y);
    ctx.scale(1,ry/rx);
    ctx.translate(-x,-y);
    ctx.fillStyle=g;
    ctx.beginPath();
    ctx.arc(x,y,rx,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  // Fine stone grain.
  for(let i=0;i<4200;i+=1){
    const light=random()>.54;
    const alpha=.018+random()*.035;
    ctx.fillStyle=light
      ? "rgba(225,170,118,"+alpha+")"
      : "rgba(23,15,12,"+alpha+")";
    const x=Math.floor(random()*width);
    const y=Math.floor(random()*height);
    const s=random()<.9?1:2;
    ctx.fillRect(x,y,s,s);
  }

  // Subtle large rectangular masonry outside the central ring.
  const tileW = 82 * sx;
  const tileH = 64 * sy;
  ctx.lineWidth=Math.max(1.1,2.2*sx);
  ctx.strokeStyle="rgba(38,24,18,.40)";
  for(let row=-1;row<Math.ceil(height/tileH)+1;row+=1){
    const offset=(row&1)?tileW*.48:0;
    for(let col=-1;col<Math.ceil(width/tileW)+1;col+=1){
      const x=col*tileW-offset;
      const y=row*tileH;
      const px=x+tileW*.06;
      const py=y+tileH*.08;
      const pw=tileW*.88;
      const ph=tileH*.84;
      ctx.beginPath();
      ctx.roundRect(px,py,pw,ph,Math.min(8*sx,7));
      ctx.stroke();
    }
  }

  // Central ring masonry, much closer to the reference image than the former
  // five thin vector circles.
  const ringLogical=[68,122,184,248,316];
  ctx.lineCap="round";
  for(let rIndex=0;rIndex<ringLogical.length;rIndex+=1){
    const logicalR=ringLogical[rIndex];
    const rx=logicalR*sx;
    const ry=logicalR*sy;
    ctx.strokeStyle=rIndex<2
      ?"rgba(39,24,18,.72)"
      :"rgba(42,26,19,.58)";
    ctx.lineWidth=(rIndex<2?4.4:3.2)*sx;
    ctx.beginPath();
    ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);
    ctx.stroke();

    const previous=rIndex===0?0:ringLogical[rIndex-1];
    const segmentCount=10+rIndex*4;
    const offset=(rIndex&1)?Math.PI/segmentCount:0;
    for(let i=0;i<segmentCount;i+=1){
      const a=i/segmentCount*Math.PI*2+offset;
      const inner=(previous+8);
      const outer=(logicalR-7);
      if(outer<=inner) continue;
      ctx.strokeStyle="rgba(45,27,20,.44)";
      ctx.lineWidth=2*sx;
      ctx.beginPath();
      ctx.moveTo(
        cx+Math.cos(a)*inner*sx,
        cy+Math.sin(a)*inner*sy,
      );
      ctx.lineTo(
        cx+Math.cos(a)*outer*sx,
        cy+Math.sin(a)*outer*sy,
      );
      ctx.stroke();
    }
  }

  // Center medallion and inner plate seams.
  ctx.fillStyle="rgba(126,79,50,.40)";
  ctx.beginPath();
  ctx.ellipse(cx,cy,56*sx,56*sy,0,0,Math.PI*2);
  ctx.fill();
  ctx.strokeStyle="rgba(39,24,18,.72)";
  ctx.lineWidth=4*sx;
  ctx.stroke();
  for(let i=0;i<8;i+=1){
    const a=i/8*Math.PI*2;
    ctx.strokeStyle="rgba(47,28,20,.40)";
    ctx.lineWidth=1.7*sx;
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.lineTo(
      cx+Math.cos(a)*54*sx,
      cy+Math.sin(a)*54*sy,
    );
    ctx.stroke();
  }

  // Authored cracks mostly in the quieter outer area.
  ctx.lineCap="round";
  for(let i=0;i<12;i+=1){
    const a=random()*Math.PI*2;
    const radius=(365+random()*150);
    const startX=cx+Math.cos(a)*radius*sx;
    const startY=cy+Math.sin(a)*radius*sy;
    const angle=a+(random()-.5)*1.5;
    const length=(26+random()*58)*sx;
    ctx.strokeStyle="rgba(31,19,15,"+(.38+random()*.22)+")";
    ctx.lineWidth=(1.2+random()*1.2)*sx;
    ctx.beginPath();
    ctx.moveTo(startX,startY);
    let x=startX;
    let y=startY;
    for(let p=1;p<=3;p+=1){
      x+=Math.cos(angle+(random()-.5)*.45)*length/3;
      y+=Math.sin(angle+(random()-.5)*.45)*length/3;
      ctx.lineTo(x,y);
    }
    ctx.stroke();
  }

  // Dark inner frame shadow printed into the ground texture.
  ctx.strokeStyle="rgba(28,18,14,.54)";
  ctx.lineWidth=10*sx;
  ctx.strokeRect(
    (b.x+5)*sx,
    (b.y+5)*sy,
    (b.w-10)*sx,
    (b.h-10)*sy,
  );

  texture.update(false);
  texture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
  texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
  texture.anisotropicFilteringLevel = 8;
  return texture;
}

function addFloor(BABYLON,scene,arena,mapping,materials,root,ownedTextures) {
  const floorTexture=createFloorTexture(BABYLON,scene,arena,mapping);
  ownedTextures.push(floorTexture);
  materials.floor.diffuseTexture=floorTexture;
  materials.floor.diffuseColor=new BABYLON.Color3(1,1,1);
  materials.floor.specularColor=new BABYLON.Color3(.055,.038,.03);

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
  ground.material=materials.floor;
  ground.receiveShadows=true;
  ground.parent=root;

  const maxRing=Math.min(mapping.worldWidth,mapping.worldHeight);
  const centerDisc=BABYLON.MeshBuilder.CreateCylinder(
    "babylon-center-medallion",
    {
      diameter:maxRing*.155,
      height:.12,
      tessellation:64,
    },
    scene,
  );
  centerDisc.position.y=.06;
  centerDisc.material=materials.floorLift;
  centerDisc.receiveShadows=true;
  centerDisc.parent=root;

  // Small raised lips give the floor some actual 3D read without creating
  // gameplay-affecting height.
  [0.34,0.53,0.72].forEach((ratio,index)=>{
    const ring=BABYLON.MeshBuilder.CreateTorus(
      "babylon-floor-lip-"+index,
      {
        diameter:maxRing*ratio,
        thickness:index===0?.11:.08,
        tessellation:96,
      },
      scene,
    );
    ring.position.y=.07;
    ring.material=index===0?materials.seam:materials.seamSoft;
    ring.parent=root;
  });

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
  const borderPx=22;
  const borderWorld=borderPx*mapping.scale;
  const wallHeight=3.1;
  const centerX=b.x+b.w/2;
  const centerY=b.y+b.h/2;
  const defs=[
    {id:"top",x:centerX,y:b.y-borderPx/2,w:b.w+borderPx*2,h:borderPx},
    {id:"bottom",x:centerX,y:b.y+b.h+borderPx/2,w:b.w+borderPx*2,h:borderPx},
    {id:"left",x:b.x-borderPx/2,y:centerY,w:borderPx,h:b.h},
    {id:"right",x:b.x+b.w+borderPx/2,y:centerY,w:borderPx,h:b.h},
  ];

  for(const edge of defs){
    const p=mapping.gameToWorld(edge.x,edge.y,wallHeight/2);
    const base=createChamferedPrism(
      BABYLON,scene,
      "babylon-border-"+edge.id,
      edge.w*mapping.scale,
      wallHeight,
      edge.h*mapping.scale,
      .42,
      p,
      materials.border,
    );
    base.parent=root;
    base.receiveShadows=true;
    shadowCasters.push(base);

    const capP=mapping.gameToWorld(edge.x,edge.y,wallHeight+.18);
    const cap=createChamferedPrism(
      BABYLON,scene,
      "babylon-border-cap-"+edge.id,
      Math.max(.3,edge.w*mapping.scale-.18),
      .36,
      Math.max(.3,edge.h*mapping.scale-.18),
      .32,
      capP,
      materials.borderCap,
    );
    cap.parent=root;
    cap.receiveShadows=true;
    shadowCasters.push(cap);
  }

  // Low inner lip catches warm light and separates the combat floor from the
  // heavy outer architecture.
  const lipPx=10;
  const lipHeight=.62;
  const lipDefs=[
    {id:"top",x:centerX,y:b.y+lipPx/2,w:b.w,h:lipPx},
    {id:"bottom",x:centerX,y:b.y+b.h-lipPx/2,w:b.w,h:lipPx},
    {id:"left",x:b.x+lipPx/2,y:centerY,w:lipPx,h:b.h},
    {id:"right",x:b.x+b.w-lipPx/2,y:centerY,w:lipPx,h:b.h},
  ];
  for(const edge of lipDefs){
    const p=mapping.gameToWorld(edge.x,edge.y,lipHeight/2+.03);
    const lip=createBox(
      BABYLON,scene,
      "babylon-inner-lip-"+edge.id,
      edge.w*mapping.scale,
      lipHeight,
      edge.h*mapping.scale,
      p,
      materials.innerLip,
    );
    lip.parent=root;
    lip.receiveShadows=true;
  }

  const cornerSize=borderWorld*2.65;
  const corners=[
    [b.x-borderPx,b.y-borderPx],
    [b.x+b.w+borderPx,b.y-borderPx],
    [b.x-borderPx,b.y+b.h+borderPx],
    [b.x+b.w+borderPx,b.y+b.h+borderPx],
  ];
  corners.forEach(([x,y],index)=>{
    const p=mapping.gameToWorld(x,y,wallHeight*.88);
    const tower=createChamferedPrism(
      BABYLON,scene,
      "babylon-corner-tower-"+index,
      cornerSize,
      wallHeight*1.76,
      cornerSize,
      cornerSize*.16,
      p,
      materials.borderTower,
    );
    tower.parent=root;
    tower.receiveShadows=true;
    shadowCasters.push(tower);

    const topP=mapping.gameToWorld(x,y,wallHeight*1.76+.22);
    const top=createChamferedPrism(
      BABYLON,scene,
      "babylon-corner-top-"+index,
      cornerSize*.82,
      .44,
      cornerSize*.82,
      cornerSize*.12,
      topP,
      materials.borderCap,
    );
    top.parent=root;
    top.receiveShadows=true;
    shadowCasters.push(top);
  });
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
  const baseHeight=8.4+Math.min(2.2,longSide*.035);
  const wallScale=aspect>2
    ? Math.max(.68,1-(aspect-2)*.17)
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
    ? Math.max(3,Math.min(5,Math.round(longSide/6.8)))
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
  const shortSide=Math.min(rect.width,rect.depth);
  const chamfer=Math.min(1.05,shortSide*.11);
  const baseHeight=.82;

  const base=createChamferedPrism(
    BABYLON,scene,
    "babylon-los-base-"+(obstacle.id||index),
    rect.width,
    baseHeight,
    rect.depth,
    chamfer*.82,
    {
      x:rect.center.x,
      y:baseHeight/2,
      z:rect.center.z,
    },
    materials.stoneBase,
  );
  base.parent=root;
  base.receiveShadows=true;
  shadowCasters.push(base);

  const bodyInset=.34;
  const body=createChamferedPrism(
    BABYLON,scene,
    "babylon-los-body-"+(obstacle.id||index),
    Math.max(.5,rect.width-bodyInset),
    Math.max(.5,height-.28),
    Math.max(.5,rect.depth-bodyInset),
    Math.max(.12,chamfer*.72),
    {
      x:rect.center.x,
      y:baseHeight*.38+(height-.28)/2,
      z:rect.center.z,
    },
    materials.stoneSide,
  );
  body.parent=root;
  body.receiveShadows=true;
  shadowCasters.push(body);

  // Shoulder band gives the block a built, stacked silhouette.
  const shoulderHeight=.42;
  const shoulder=createChamferedPrism(
    BABYLON,scene,
    "babylon-los-shoulder-"+(obstacle.id||index),
    Math.max(.5,rect.width-.14),
    shoulderHeight,
    Math.max(.5,rect.depth-.14),
    Math.max(.12,chamfer*.84),
    {
      x:rect.center.x,
      y:height-1.05,
      z:rect.center.z,
    },
    materials.stoneShoulder,
  );
  shoulder.parent=root;
  shoulder.receiveShadows=true;
  shadowCasters.push(shoulder);

  const capHeight=.48;
  const cap=createChamferedPrism(
    BABYLON,scene,
    "babylon-los-cap-"+(obstacle.id||index),
    Math.max(.5,rect.width-.08),
    capHeight,
    Math.max(.5,rect.depth-.08),
    Math.max(.12,chamfer*.90),
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
) {
  const baseWorld=mapping.gameToWorld(gameX,gameY,0);
  const pedestal=createChamferedPrism(
    BABYLON,scene,
    name+"-base",
    4.4,2.5,4.4,.72,
    {x:baseWorld.x,y:1.25,z:baseWorld.z},
    materials.torchBase,
  );
  pedestal.parent=root;
  pedestal.receiveShadows=true;
  shadowCasters.push(pedestal);

  const mid=createChamferedPrism(
    BABYLON,scene,
    name+"-mid",
    3.45,1.7,3.45,.54,
    {x:baseWorld.x,y:3.1,z:baseWorld.z},
    materials.torchStone,
  );
  mid.parent=root;
  mid.receiveShadows=true;
  shadowCasters.push(mid);

  const bowl=BABYLON.MeshBuilder.CreateCylinder(
    name+"-bowl",
    {
      diameterTop:2.45,
      diameterBottom:1.65,
      height:.8,
      tessellation:8,
    },
    scene,
  );
  bowl.position.set(baseWorld.x,4.35,baseWorld.z);
  bowl.material=materials.brazier;
  bowl.parent=root;
  shadowCasters.push(bowl);

  const flameOuter=BABYLON.MeshBuilder.CreateSphere(
    name+"-flame-outer",
    {diameter:1.7,segments:12},
    scene,
  );
  flameOuter.position.set(baseWorld.x,5.55,baseWorld.z);
  flameOuter.scaling.set(.68,1.25,.68);
  flameOuter.material=materials.flameOuter;
  flameOuter.parent=root;

  const flameInner=BABYLON.MeshBuilder.CreateSphere(
    name+"-flame-inner",
    {diameter:1.05,segments:10},
    scene,
  );
  flameInner.position.set(baseWorld.x,5.50,baseWorld.z);
  flameInner.scaling.set(.62,1.18,.62);
  flameInner.material=materials.flameInner;
  flameInner.parent=root;

  const light=new BABYLON.PointLight(
    name+"-light",
    new BABYLON.Vector3(baseWorld.x,6.2,baseWorld.z),
    scene,
  );
  light.diffuse=new BABYLON.Color3(1.0,.43,.13);
  light.specular=new BABYLON.Color3(.48,.20,.08);
  light.intensity=1.25;
  light.range=23;
  lights.push(light);
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
) {
  const b=arena.bounds;
  const margin=27;
  const points=[
    ["nw",b.x-margin,b.y-margin],
    ["ne",b.x+b.w+margin,b.y-margin],
    ["sw",b.x-margin,b.y+b.h+margin],
    ["se",b.x+b.w+margin,b.y+b.h+margin],
  ];
  for(const [id,x,y] of points){
    addTorchPedestal(
      BABYLON,scene,
      "babylon-torch-"+id,
      x,y,mapping,materials,root,shadowCasters,lights,
    );
  }
}

export function buildBabylonArenaGeometry(BABYLON,scene,arena,mapping) {
  const root=new BABYLON.TransformNode("babylon-arena-root",scene);
  const shadowCasters=[];
  const lights=[];
  const ownedTextures=[];

  const materials={
    floor:material(BABYLON,scene,"mat-floor","#6b4631","#1a100c"),
    floorLift:material(BABYLON,scene,"mat-floor-lift","#855a3d","#25160f"),
    seam:material(BABYLON,scene,"mat-floor-seam","#2a1812","#120b08"),
    seamSoft:material(BABYLON,scene,"mat-floor-seam-soft","#40281d","#120b08"),
    crack:material(BABYLON,scene,"mat-crack","#21120e","#090605"),
    stoneBase:material(BABYLON,scene,"mat-stone-base","#2f211b","#120c09"),
    stoneSide:material(BABYLON,scene,"mat-stone-side","#574033","#1b120d"),
    stoneShoulder:material(BABYLON,scene,"mat-stone-shoulder","#674b3a","#21150f"),
    stoneTop:material(BABYLON,scene,"mat-stone-top","#80604a","#2c1c14"),
    stoneTopAlt:material(BABYLON,scene,"mat-stone-top-alt","#735440","#281a13"),
    border:material(BABYLON,scene,"mat-border","#34231d","#120c09"),
    borderCap:material(BABYLON,scene,"mat-border-cap","#624535","#21150f"),
    borderTower:material(BABYLON,scene,"mat-border-tower","#3d2a22","#150e0b"),
    innerLip:material(BABYLON,scene,"mat-inner-lip","#493125","#160e0a"),
    torchBase:material(BABYLON,scene,"mat-torch-base","#30221c","#120c09"),
    torchStone:material(BABYLON,scene,"mat-torch-stone","#5a4032","#1b120d"),
    brazier:material(BABYLON,scene,"mat-brazier","#261a15","#28170e"),
    flameOuter:material(
      BABYLON,scene,"mat-flame-outer","#ff6b1b","#331307","#ff4e0c"
    ),
    flameInner:material(
      BABYLON,scene,"mat-flame-inner","#ffd268","#4a2408","#ffb52e"
    ),
  };

  materials.seam.alpha=.90;
  materials.seamSoft.alpha=.48;
  materials.flameOuter.disableLighting=true;
  materials.flameInner.disableLighting=true;

  const ground=addFloor(
    BABYLON,scene,arena,mapping,materials,root,ownedTextures,
  );
  addBorder(
    BABYLON,scene,arena,mapping,materials,root,shadowCasters,
  );

  for(let index=0;index<arena.obstacles.length;index+=1){
    addObstacle(
      BABYLON,scene,arena.obstacles[index],index,
      mapping,materials,root,shadowCasters,
    );
  }

  addTorches(
    BABYLON,scene,arena,mapping,materials,root,shadowCasters,lights,
  );

  return {
    root,
    ground,
    shadowCasters,
    lights,
    dispose() {
      for(const light of lights) light?.dispose?.();
      root.dispose(false,true);
      for(const texture of ownedTextures) texture?.dispose?.();
      Object.values(materials).forEach(mat=>mat?.dispose?.());
    },
  };
}
