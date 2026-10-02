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
  mesh.billboardMode=BABYLON.Mesh.BILLBOARDMODE_Y;
  return mesh;
}

function createFloorTexture(BABYLON,scene,arena,mapping) {
  const width=1280;
  const height=Math.max(576,Math.round(width*mapping.height/mapping.width));
  const texture=new BABYLON.DynamicTexture(
    "babylon-stone-floor-texture",
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
  const random=seededRandom(
    arena.id==="windscar-proving-grounds"?0x51a7c3:0x736f6c,
  );

  const palette=[
    "#7d6958","#846e5b","#8a725e","#746151",
    "#907762","#6f5c4e","#816a58","#796555",
  ];
  const grout="#342820";

  // Start from neutral brown-grey stone. Warmth should come mainly from the
  // braziers, not from tinting the entire arena orange.
  const radial=ctx.createRadialGradient(
    cx,cy,0,
    cx,cy,Math.max(width,height)*.72,
  );
  radial.addColorStop(0,"#8a735f");
  radial.addColorStop(.42,"#786452");
  radial.addColorStop(.78,"#665448");
  radial.addColorStop(1,"#50443b");
  ctx.fillStyle=radial;
  ctx.fillRect(0,0,width,height);

  // Large irregular masonry in the outer field. Variable row heights, widths
  // and corner jitter avoid the wallpaper/grid look from Milestone 2A.
  let logicalY=b.y-40;
  let row=0;
  while(logicalY<b.y+b.h+50){
    const rowH=58+random()*42;
    let logicalX=b.x-75-(row%2)*(35+random()*25);
    while(logicalX<b.x+b.w+80){
      const tileW=78+random()*76;
      const jitter=7+random()*8;
      const x0=logicalX*sx;
      const y0=logicalY*sy;
      const x1=(logicalX+tileW)*sx;
      const y1=(logicalY+rowH)*sy;

      const centerLX=logicalX+tileW/2;
      const centerLY=logicalY+rowH/2;
      const dist=Math.hypot(centerLX-(b.x+b.w/2),centerLY-(b.y+b.h/2));

      // Leave the central authored ring zone for radial masonry.
      if(dist>350){
        ctx.beginPath();
        ctx.moveTo(x0+(random()-.5)*jitter*sx,y0+(random()-.5)*jitter*sy);
        ctx.lineTo(x1+(random()-.5)*jitter*sx,y0+(random()-.5)*jitter*sy);
        ctx.lineTo(x1+(random()-.5)*jitter*sx,y1+(random()-.5)*jitter*sy);
        ctx.lineTo(x0+(random()-.5)*jitter*sx,y1+(random()-.5)*jitter*sy);
        ctx.closePath();
        ctx.fillStyle=palette[Math.floor(random()*palette.length)];
        ctx.globalAlpha=.40+random()*.18;
        ctx.fill();
        ctx.globalAlpha=1;
        ctx.strokeStyle="rgba(49,39,33,.42)";
        ctx.lineWidth=(1.35+random()*.9)*sx;
        ctx.stroke();

        // One soft worn edge per some slabs.
        if(random()>.56){
          ctx.strokeStyle="rgba(160,132,104,.11)";
          ctx.lineWidth=1.2*sx;
          ctx.beginPath();
          ctx.moveTo(x0+7*sx,y0+7*sy);
          ctx.lineTo(x1-7*sx,y0+7*sy);
          ctx.stroke();
        }
      }

      logicalX+=tileW-4+random()*9;
    }
    logicalY+=rowH-3+random()*7;
    row+=1;
  }

  // Radial stone bands. Each wedge is filled separately so the ring floor reads
  // like heavy cut slabs rather than circles painted on top of a grid.
  const rings=[0,72,132,202,278,352];
  for(let band=0;band<rings.length-1;band+=1){
    const inner=rings[band];
    const outer=rings[band+1];
    const count=band===0?10:12+band*4;
    const phase=(band%2?0.5:0)/count*Math.PI*2;

    for(let i=0;i<count;i+=1){
      const a0=i/count*Math.PI*2+phase;
      const a1=(i+1)/count*Math.PI*2+phase;
      const insetA=.012+random()*.015;
      const innerJ=inner+(band===0?0:4+random()*5);
      const outerJ=outer-(4+random()*5);

      ctx.beginPath();
      ctx.moveTo(
        cx+Math.cos(a0+insetA)*innerJ*sx,
        cy+Math.sin(a0+insetA)*innerJ*sy,
      );
      ctx.lineTo(
        cx+Math.cos(a1-insetA)*innerJ*sx,
        cy+Math.sin(a1-insetA)*innerJ*sy,
      );
      ctx.lineTo(
        cx+Math.cos(a1-insetA*.65)*outerJ*sx,
        cy+Math.sin(a1-insetA*.65)*outerJ*sy,
      );
      ctx.lineTo(
        cx+Math.cos(a0+insetA*.65)*outerJ*sx,
        cy+Math.sin(a0+insetA*.65)*outerJ*sy,
      );
      ctx.closePath();

      const baseIndex=(band*2+i)%palette.length;
      ctx.fillStyle=palette[baseIndex];
      ctx.globalAlpha=.48+random()*.18;
      ctx.fill();
      ctx.globalAlpha=1;
      ctx.strokeStyle="rgba(52,41,34,.50)";
      ctx.lineWidth=(1.35+(band<2?.45:0))*sx;
      ctx.stroke();
    }
  }

  // Fewer, stronger ring joints than before.
  ctx.strokeStyle="rgba(50,39,32,.52)";
  ctx.lineWidth=2.45*sx;
  for(const r of [72,132,202,278,352]){
    ctx.beginPath();
    ctx.ellipse(cx,cy,r*sx,r*sy,0,0,Math.PI*2);
    ctx.stroke();
  }

  // Center disc with broad slabs.
  ctx.fillStyle="#88705c";
  ctx.globalAlpha=.76;
  ctx.beginPath();
  ctx.ellipse(cx,cy,58*sx,58*sy,0,0,Math.PI*2);
  ctx.fill();
  ctx.globalAlpha=1;
  ctx.strokeStyle="rgba(50,39,32,.58)";
  ctx.lineWidth=2.7*sx;
  ctx.stroke();

  // Sparse authored cracks instead of noisy linework everywhere.
  ctx.lineCap="round";
  for(let i=0;i<14;i+=1){
    const a=random()*Math.PI*2;
    const radius=(370+random()*155);
    const startX=cx+Math.cos(a)*radius*sx;
    const startY=cy+Math.sin(a)*radius*sy;
    const angle=a+(random()-.5)*1.35;
    const length=(28+random()*54)*sx;
    ctx.strokeStyle="rgba(37,26,21,"+(.46+random()*.20)+")";
    ctx.lineWidth=(1.5+random()*1.3)*sx;
    ctx.beginPath();
    ctx.moveTo(startX,startY);
    let px=startX;
    let py=startY;
    for(let p=1;p<=3;p+=1){
      px+=Math.cos(angle+(random()-.5)*.42)*length/3;
      py+=Math.sin(angle+(random()-.5)*.42)*length/3;
      ctx.lineTo(px,py);
    }
    ctx.stroke();
  }

  // Fine material noise is deliberately subtle.
  for(let i=0;i<3000;i+=1){
    const bright=random()>.58;
    const alpha=.012+random()*.026;
    ctx.fillStyle=bright
      ?"rgba(213,184,150,"+alpha+")"
      :"rgba(23,18,15,"+alpha+")";
    const x=Math.floor(random()*width);
    const y=Math.floor(random()*height);
    ctx.fillRect(x,y,random()>.93?2:1,1);
  }

  // Soft edge darkening inside the combat boundary.
  const vignette=ctx.createRadialGradient(
    cx,cy,Math.min(width,height)*.24,
    cx,cy,Math.min(width,height)*.73,
  );
  vignette.addColorStop(0,"rgba(0,0,0,0)");
  vignette.addColorStop(.72,"rgba(0,0,0,.04)");
  vignette.addColorStop(1,"rgba(18,14,12,.18)");
  ctx.fillStyle=vignette;
  ctx.fillRect(0,0,width,height);

  ctx.strokeStyle="rgba(34,28,24,.44)";
  ctx.lineWidth=4.5*sx;
  ctx.strokeRect(
    (b.x+7)*sx,
    (b.y+7)*sy,
    (b.w-14)*sx,
    (b.h-14)*sy,
  );

  texture.update(false);
  texture.wrapU=BABYLON.Texture.CLAMP_ADDRESSMODE;
  texture.wrapV=BABYLON.Texture.CLAMP_ADDRESSMODE;
  texture.anisotropicFilteringLevel=8;
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

  // Keep physical relief restrained. The masonry pattern should read from
  // slab value and lighting, not from thick black rings.
  const centerLip=BABYLON.MeshBuilder.CreateTorus(
    "babylon-center-lip",
    {
      diameter:maxRing*.165,
      thickness:.055,
      tessellation:72,
    },
    scene,
  );
  centerLip.position.y=.075;
  centerLip.material=materials.seamSoft;
  centerLip.parent=root;

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
  const borderPx=17;
  const borderWorld=borderPx*mapping.scale;
  const wallHeight=1.32;
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
      .30,
      p,
      materials.border,
    );
    base.parent=root;
    base.receiveShadows=true;
    shadowCasters.push(base);

    const capP=mapping.gameToWorld(edge.x,edge.y,wallHeight+.12);
    const cap=createChamferedPrism(
      BABYLON,scene,
      "babylon-border-cap-"+edge.id,
      Math.max(.3,edge.w*mapping.scale-.12),
      .24,
      Math.max(.3,edge.h*mapping.scale-.12),
      .24,
      capP,
      materials.borderCap,
    );
    cap.parent=root;
    cap.receiveShadows=true;
    shadowCasters.push(cap);
  }

  // Low warm inner curb, much less visually dominant than the former black rail.
  const curbPx=7;
  const curbHeight=.26;
  const curbs=[
    {id:"top",x:centerX,y:b.y+curbPx/2,w:b.w,h:curbPx},
    {id:"bottom",x:centerX,y:b.y+b.h-curbPx/2,w:b.w,h:curbPx},
    {id:"left",x:b.x+curbPx/2,y:centerY,w:curbPx,h:b.h},
    {id:"right",x:b.x+b.w-curbPx/2,y:centerY,w:curbPx,h:b.h},
  ];
  for(const edge of curbs){
    const p=mapping.gameToWorld(edge.x,edge.y,curbHeight/2+.03);
    const curb=createBox(
      BABYLON,scene,
      "babylon-inner-curb-"+edge.id,
      edge.w*mapping.scale,
      curbHeight,
      edge.h*mapping.scale,
      p,
      materials.innerLip,
    );
    curb.parent=root;
    curb.receiveShadows=true;
  }

  // Chunky corner architecture is now concentrated near the braziers instead
  // of turning the whole arena into a heavy rectangular frame.
  const cornerSize=borderWorld*3.95;
  const corners=[
    [b.x-6,b.y-6],
    [b.x+b.w+6,b.y-6],
    [b.x-6,b.y+b.h+6],
    [b.x+b.w+6,b.y+b.h+6],
  ];
  corners.forEach(([x,y],index)=>{
    const p=mapping.gameToWorld(x,y,2.18);
    const tower=createChamferedPrism(
      BABYLON,scene,
      "babylon-corner-buttress-"+index,
      cornerSize,
      4.35,
      cornerSize,
      cornerSize*.18,
      p,
      materials.borderTower,
    );
    tower.parent=root;
    tower.receiveShadows=true;
    shadowCasters.push(tower);

    const stepP=mapping.gameToWorld(x,y,4.56);
    const step=createChamferedPrism(
      BABYLON,scene,
      "babylon-corner-step-"+index,
      cornerSize*.78,
      .48,
      cornerSize*.78,
      cornerSize*.12,
      stepP,
      materials.borderCap,
    );
    step.parent=root;
    step.receiveShadows=true;
    shadowCasters.push(step);
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
  flames,
  phase,
) {
  const baseWorld=mapping.gameToWorld(gameX,gameY,0);
  const pedestal=createChamferedPrism(
    BABYLON,scene,
    name+"-base",
    6.4,2.35,6.4,1.0,
    {x:baseWorld.x,y:1.18,z:baseWorld.z},
    materials.torchBase,
  );
  pedestal.parent=root;
  pedestal.receiveShadows=true;
  shadowCasters.push(pedestal);

  const mid=createChamferedPrism(
    BABYLON,scene,
    name+"-mid",
    4.8,2.1,4.8,.76,
    {x:baseWorld.x,y:3.02,z:baseWorld.z},
    materials.torchStone,
  );
  mid.parent=root;
  mid.receiveShadows=true;
  shadowCasters.push(mid);

  const crown=createChamferedPrism(
    BABYLON,scene,
    name+"-crown",
    5.35,.58,5.35,.72,
    {x:baseWorld.x,y:4.25,z:baseWorld.z},
    materials.stoneTop,
  );
  crown.parent=root;
  crown.receiveShadows=true;
  shadowCasters.push(crown);

  const bowl=BABYLON.MeshBuilder.CreateCylinder(
    name+"-bowl",
    {
      diameterTop:3.25,
      diameterBottom:2.05,
      height:1.05,
      tessellation:8,
    },
    scene,
  );
  bowl.position.set(baseWorld.x,5.08,baseWorld.z);
  bowl.material=materials.brazier;
  bowl.parent=root;
  shadowCasters.push(bowl);

  const outer=createFlameMesh(
    BABYLON,scene,
    name+"-flame-outer",
    3.4,5.0,
    {x:baseWorld.x,y:5.22,z:baseWorld.z},
    materials.flameOuter,
  );
  outer.parent=root;

  const midFlame=createFlameMesh(
    BABYLON,scene,
    name+"-flame-mid",
    2.45,4.05,
    {x:baseWorld.x-.14,y:5.25,z:baseWorld.z-.02},
    materials.flameMid,
  );
  midFlame.position.z-=.025;
  midFlame.parent=root;

  const inner=createFlameMesh(
    BABYLON,scene,
    name+"-flame-inner",
    1.45,3.05,
    {x:baseWorld.x+.10,y:5.29,z:baseWorld.z-.05},
    materials.flameInner,
  );
  inner.position.z-=.050;
  inner.parent=root;

  const emberGlow=BABYLON.MeshBuilder.CreateDisc(
    name+"-ember-glow",
    {radius:2.4,tessellation:32,sideOrientation:BABYLON.Mesh.DOUBLESIDE},
    scene,
  );
  emberGlow.position.set(baseWorld.x,5.32,baseWorld.z+.05);
  emberGlow.rotation.x=Math.PI/2;
  emberGlow.material=materials.emberGlow;
  emberGlow.parent=root;

  flames.push({
    outer,
    mid:midFlame,
    inner,
    glow:emberGlow,
    baseY:5.22,
    phase,
  });

  const light=new BABYLON.PointLight(
    name+"-light",
    new BABYLON.Vector3(baseWorld.x,7.15,baseWorld.z),
    scene,
  );
  light.diffuse=new BABYLON.Color3(1.0,.43,.13);
  light.specular=new BABYLON.Color3(.62,.28,.10);
  light.intensity=3.10;
  light.range=42;
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
  flames,
) {
  const b=arena.bounds;
  // Keep the braziers just outside gameplay bounds but well inside the visual
  // frame, so their flames are a major composition element like the reference.
  const margin=-18;
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
    floor:material(BABYLON,scene,"mat-floor","#7c6857","#1f1915"),
    floorLift:material(BABYLON,scene,"mat-floor-lift","#907662","#2a211a"),
    seam:material(BABYLON,scene,"mat-floor-seam","#4a3b31","#17120f"),
    seamSoft:material(BABYLON,scene,"mat-floor-seam-soft","#675448","#1d1713"),
    crack:material(BABYLON,scene,"mat-crack","#211a16","#090706"),
    stoneBase:material(BABYLON,scene,"mat-stone-base","#4e4640","#181512"),
    stoneSide:material(BABYLON,scene,"mat-stone-side","#71665c","#201a16"),
    stoneShoulder:material(BABYLON,scene,"mat-stone-shoulder","#807266","#261f1a"),
    stoneTop:material(BABYLON,scene,"mat-stone-top","#a18c77","#35291f"),
    stoneTopAlt:material(BABYLON,scene,"mat-stone-top-alt","#927d6b","#30251e"),
    border:material(BABYLON,scene,"mat-border","#4d433c","#171310"),
    borderCap:material(BABYLON,scene,"mat-border-cap","#7e6c5b","#261e18"),
    borderTower:material(BABYLON,scene,"mat-border-tower","#554b43","#181512"),
    innerLip:material(BABYLON,scene,"mat-inner-lip","#675548","#1c1713"),
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
  };

  materials.seam.alpha=.90;
  materials.seamSoft.alpha=.48;
  materials.flameOuter.disableLighting=true;
  materials.flameMid.disableLighting=true;
  materials.flameInner.disableLighting=true;
  materials.emberGlow.disableLighting=true;
  materials.emberGlow.alpha=.24;
  materials.banner.specularColor=new BABYLON.Color3(.08,.03,.02);
  materials.bannerGold.specularColor=new BABYLON.Color3(.18,.10,.04);

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

  addRubble(
    BABYLON,scene,arena,mapping,materials,root,shadowCasters,
  );
  addBanners(
    BABYLON,scene,arena,mapping,materials,root,
  );
  addTorches(
    BABYLON,scene,arena,mapping,materials,root,shadowCasters,lights,flames,
  );

  return {
    root,
    ground,
    shadowCasters,
    lights,
    flames,
    animate(timeSeconds=0) {
      for(const flame of flames){
        const t=timeSeconds+flame.phase;
        const sway=Math.sin(t*3.1)*.09+Math.sin(t*5.7)*.035;
        const pulse=1+Math.sin(t*4.6)*.07;
        flame.outer.scaling.x=pulse;
        flame.outer.scaling.y=1+Math.sin(t*3.8)*.08;
        flame.outer.position.y=flame.baseY+Math.sin(t*4.2)*.09;
        flame.outer.rotation.z=sway;
        flame.mid.scaling.x=1+Math.sin(t*5.1+1)*.07;
        flame.mid.scaling.y=1+Math.sin(t*4.9)*.10;
        flame.mid.position.y=flame.baseY+.03+Math.sin(t*4.8+.8)*.07;
        flame.inner.scaling.x=1+Math.sin(t*5.7+.2)*.05;
        flame.inner.scaling.y=1+Math.sin(t*6.1+.4)*.11;
        flame.inner.position.y=flame.baseY+.07+Math.sin(t*5.3)*.06;
        flame.glow.scaling.x=1+Math.sin(t*3.6)*.08;
        flame.glow.scaling.y=1+Math.sin(t*3.6)*.08;
      }
      for(let i=0;i<lights.length;i+=1){
        const light=lights[i];
        light.intensity=3.00+Math.sin(timeSeconds*4.2+i*1.7)*.24;
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
