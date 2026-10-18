// Wildpath 3.0 / Visual Restoration 1.1: full-bleed hand-painted arena.
// No raised green circle, glowing ring or empty navy void. The compact combat
// radius remains authoritative in rules.js; scenery is decoration only.
import {ARENA_RADIUS,CAMERA_WIDTH} from './rules.js?v=3.0.2';
const B=window.BABYLON;
const V=(x,y,z)=>new B.Vector3(x,y,z);
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
export function candyMaterial(scene,name,hex,{emission=.025,shine=.13}={}){
  const m=new B.StandardMaterial(name,scene),c=B.Color3.FromHexString(hex);
  m.diffuseColor=c;m.ambientColor=c.scale(.22);m.emissiveColor=c.scale(emission);
  m.specularColor=new B.Color3(shine,shine*.92,shine*.8);
  m.specularPower=72;
  return m;
}
function source(scene,name,kind,material){
  const mesh=kind==='trunk'
    ?B.MeshBuilder.CreateCylinder(name,{height:1,diameterTop:.8,diameterBottom:1,tessellation:10},scene)
    :B.MeshBuilder.CreateSphere(name,{diameter:1,segments:12},scene);
  mesh.position.y=-300;mesh.isPickable=false;mesh.material=material;
  return mesh;
}
function place(src,name,x,y,z,sx,sy,sz){
  const mesh=src.createInstance(name);
  mesh.position.set(x,y,z);mesh.scaling.set(sx,sy,sz);mesh.isPickable=false;
  return mesh;
}
export function createArcadeArena(scene){
  scene.clearColor=B.Color4.FromHexString('#205a4dff');
  scene.ambientColor=new B.Color3(.30,.35,.32);
  const sky=new B.HemisphericLight('arcade daylight',V(0,1,0),scene);
  sky.intensity=.69;sky.diffuse=B.Color3.FromHexString('#e7f6eb');
  sky.groundColor=B.Color3.FromHexString('#47634e');
  const sun=new B.DirectionalLight('warm golden sun',V(-.48,-1,.38),scene);
  sun.intensity=.72;sun.diffuse=B.Color3.FromHexString('#ffe7c8');

  // Vertex painted green meadow continues beneath every camera angle,
  // including the top HUD region: no huge empty dark background.
  const meadow=candyMaterial(scene,'matte painted emerald meadow','#ffffff',
    {emission:0,shine:.012});
  const ground=B.MeshBuilder.CreateGround('continuous richly painted glade',
    {width:88,height:88,subdivisions:44},scene);
  ground.material=meadow;ground.position.y=-.085;ground.isPickable=false;
  const positions=ground.getVerticesData(B.VertexBuffer.PositionKind),colors=[];
  if(positions){
    const center=B.Color3.FromHexString('#48a762'),
      light=B.Color3.FromHexString('#75c260'),
      shade=B.Color3.FromHexString('#2c7c59');
    // A few broad hand-painted green and ochre meadows: intentional color
    // shapes that break the flat surface without adding collidable clutter.
    const pigments=[
      {x:-11,z:3,sx:5.6,sz:9.6,hex:'#7ab65e',weight:.46},
      {x:10,z:-8,sx:7.0,sz:8.1,hex:'#609b51',weight:.43},
      {x:7,z:13,sx:7.0,sz:7.8,hex:'#b3a66c',weight:.29},
      {x:-8,z:-14,sx:6.3,sz:6.7,hex:'#d1ae71',weight:.22},
      {x:17,z:4,sx:5.4,sz:8.4,hex:'#338e5d',weight:.52},
      {x:-17,z:-5,sx:7.1,sz:5.6,hex:'#307f58',weight:.49}
    ].map(p=>({...p,color:B.Color3.FromHexString(p.hex)}));
    for(let i=0;i<positions.length;i+=3){
      const x=positions[i],z=positions[i+2];
      const radius=Math.hypot(x,z);
      const variation=.5+.5*Math.sin(x*.46+z*.22)*Math.cos(z*.58-x*.22);
      let color=B.Color3.Lerp(center,light,.12+variation*.32);
      color=B.Color3.Lerp(color,shade,
        Math.min(.7,Math.max(0,(radius-7)/17)*.48));
      for(const patch of pigments){
        const dx=(x-patch.x)/patch.sx,dz=(z-patch.z)/patch.sz;
        const d=Math.hypot(dx,dz);
        const edge=Math.max(0,1-d);
        const irregular=.86+.14*Math.sin(x*.67+z*.29);
        color=B.Color3.Lerp(color,patch.color,Math.min(.55,
          edge*edge*(3-2*edge)*patch.weight*irregular*2.4));
      }
      colors.push(color.r,color.g,color.b,1);
    }
    ground.setVerticesData(B.VertexBuffer.ColorKind,colors);
    ground.useVertexColors=true;
  }

  const rand=rng(56021);
  const pigments={
    grass:candyMaterial(scene,'lime tall grass','#78cb4d',{shine:.05}),
    grassDark:candyMaterial(scene,'dark green meadow grass','#278c60',{shine:.04}),
    stone:candyMaterial(scene,'rounded garden sandstone','#b5b8a5',{shine:.055}),
    stoneLight:candyMaterial(scene,'sunlight garden sandstone','#d5d1b2',{shine:.06}),
    dirt:candyMaterial(scene,'warm flower soil','#b88c5e',{shine:.02}),
    wood:candyMaterial(scene,'curved warm wood','#925534',{shine:.09}),
    woodTop:candyMaterial(scene,'painted wooden edge','#cc8650',{shine:.10}),
    leafA:candyMaterial(scene,'fresh spring lime','#75cc3e',{shine:.11}),
    leafB:candyMaterial(scene,'deep turquoise evergreen','#27ab85',{shine:.10}),
    leafC:candyMaterial(scene,'yellow green foliage','#a3d347',{shine:.12}),
    leafD:candyMaterial(scene,'coral flowering canopy','#f38a76',{shine:.11}),
    pink:candyMaterial(scene,'pink poppy flower','#fa75ac',{shine:.08}),
    lilac:candyMaterial(scene,'lilac flower','#a782f3',{shine:.08}),
    gold:candyMaterial(scene,'gold flower','#ffd24c',{shine:.09})
  };
  const grass=[source(scene,'grass lime template','sphere',pigments.grass),
    source(scene,'grass moss template','sphere',pigments.grassDark)];
  const petals=[source(scene,'rose petals template','sphere',pigments.pink),
    source(scene,'violet petals template','sphere',pigments.lilac),
    source(scene,'gold petals template','sphere',pigments.gold)];
  const pebble=source(scene,'sandstone pebble template','sphere',pigments.stone);
  const pebbleLight=source(scene,'sandstone highlight template','sphere',pigments.stoneLight);
  const trunk=source(scene,'storybook tree trunk template','trunk',pigments.wood);
  const trunksTop=source(scene,'tree bark cap template','trunk',pigments.woodTop);
  const crowns=[pigments.leafA,pigments.leafB,pigments.leafC,pigments.leafD]
    .map((mat,i)=>source(scene,'leaf shape '+i,'sphere',mat));

  // Painterly color patches, rounded stepping-stones and flowers add visual
  // structure but never interfere with the motion/targeting rules.
  for(let i=0;i<46;i++){
    const x=(rand()-.5)*42,z=(rand()-.5)*54;
    const s=.22+rand()*.32;
    const a=place(grass[i%2],'compact grass tuft',x,.02,z,s,.11,s*.65);
    a.rotation.y=rand()*Math.PI;
    if(i%3===0)place(petals[(i/3)%3|0],'tiny wild meadow flower',
      x+.12,.13,z-.08,.20,.13,.18);
  }
  for(let i=0;i<27;i++){
    const a=rand()*Math.PI*2,r=2.8+rand()*12;
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    const s=.15+rand()*.32;
    place(i%3===0?pebbleLight:pebble,'sunlit small rock',
      x,.08,z,s,.14,s*.82);
  }

  // Broken, deliberate stepping stones along one side: not loose planks
  // floating through the middle of a combat and fusion playfield.
  for(let i=0;i<17;i++){
    const z=-14+i*1.75,x=-11.2+Math.sin(z*.28)*.8;
    if(i%4===1)continue;
    const s=.54+rand()*.23;
    const stone=place(i%2?pebble:pebbleLight,
      'curated Japanese garden stepping stone',x,.035,z,s,.10,s*.68);
    stone.rotation.y=rand()*.4;
  }

  // Small colorful garden flower-beds appear around the fighting arena,
  // leaving the middle open for projectile and enemy silhouettes.
  for(let bed=0;bed<12;bed++){
    const a=bed*2*Math.PI/12+.19,r=11.8+(bed%3)*1.4;
    const cx=Math.cos(a)*r,cz=Math.sin(a)*r;
    for(let i=0;i<5;i++){
      const phi=i*2.399963+bed*.5,dist=.3+Math.sqrt(i+1)*.42;
      const x=cx+Math.cos(phi)*dist,z=cz+Math.sin(phi)*dist;
      place(grass[(i+bed)%2],'lush meadow patch',x,.105,z,
        .46,.24,.38);
      const src=petals[(bed+i)%petals.length];
      place(src,'readable raised flower petals',x,.33,z,
        .21,.20,.22);
      if(i%2===0){
        place(petals[(bed+i+1)%petals.length],
          'twin garden blossoms',x+.20,.39,z-.14,.13,.15,.16);
      }
    }
  }

  // A loose glade perimeter. The bright old neon torus and raised test disc
  // are removed; the field simply extends beneath the trees.
  for(let i=0;i<21;i++){
    const a=i*2*Math.PI/21+rand()*.18;
    const radius=ARENA_RADIUS+1.65+rand()*4.1;
    const x=Math.cos(a)*radius,z=Math.sin(a)*radius;
    const s=.75+rand()*.34;
    const root=place(trunk,'warm tapered visible tree trunk',x,.76*s,z,
      .46*s,1.52*s,.46*s);
    const branch=place(trunksTop,'short curved tree branch',x+.38*s,1.40*s,z-.15*s,
      .19*s,.70*s,.23*s);
    branch.rotation.z=-.55;
    const src=crowns[i%crowns.length];
    place(src,'leafy branching crown middle',x,2.03*s,z+.25*s,
      1.30*s,1.11*s,1.12*s);
    place(crowns[(i+1)%crowns.length],'leafy canopy left',
      x-.67*s,1.85*s,z+.22*s,.88*s,.80*s,.94*s);
    place(crowns[(i+2)%crowns.length],'leafy canopy right',
      x+.72*s,1.84*s,z+.18*s,.86*s,.76*s,.92*s);
    // Small individual leaf and flower tips, not one enormous rubber sphere.
    if(i%2===0)
      place(petals[i%petals.length],'tiny colored canopy buds',
        x+.26*s,2.64*s,z+.20*s,.23*s,.18*s,.22*s);
    if(i%3===0)
      place(grass[i%2],'small undergrowth beside outer tree',
        x+.94,.09,z-.32,.59,.30,.50);
  }

  // The arena is physically readable through a broken sandstone perimeter.
  // All the stones and connected fence pieces are OUTSIDE playable combat bounds.
  // No isolated wooden planks anywhere in the middle of the grass.
  for(let i=0;i<65;i++){
    const a=i*2*Math.PI/65,r=ARENA_RADIUS+.70+(i%5)*.08;
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    const s=.65+(i%4)*.11;
    const stone=place(i%4===0?pebbleLight:pebble,
      'intentional rounded arena stone edging',x,.12,z,s,.30,s*.71);
    stone.rotation.y=-a;
  }
  const postMat=pigments.wood,railMat=pigments.woodTop;
  const railRadius=ARENA_RADIUS+1.35;
  const fenceArcs=[[.22,.77],[1.88,.72],[3.75,.79],[5.35,.73]];
  for(const [begin,span] of fenceArcs){
    const count=4,angleStep=span/count;
    for(let i=0;i<=count;i++){
      const a=begin+i*angleStep;
      const x=Math.cos(a)*railRadius,z=Math.sin(a)*railRadius;
      const post=B.MeshBuilder.CreateCylinder('anchored garden fence post',
        {height:1.06,diameterTop:.39,diameterBottom:.47,tessellation:8},scene);
      post.position.set(x,.52,z);post.material=postMat;post.isPickable=false;
      place(pebbleLight,'stone foundation under fence post',
        x,.15,z,.45,.25,.43);
    }
    for(let i=0;i<count;i++){
      const angle=begin+(i+.5)*angleStep;
      const chord=2*railRadius*Math.sin(angleStep/2)*.95;
      for(const y of [.40,.73]){
        const rail=B.MeshBuilder.CreateBox('connected garden fence rail',
          {width:chord,height:.16,depth:.16},scene);
        rail.position.set(Math.cos(angle)*railRadius,y,
          Math.sin(angle)*railRadius);
        // Box length lies on its local X axis. With Babylon's Y rotation,
        // -angle-PI/2 aligns it tangent to the circular post arc.
        rail.rotation.y=-angle-Math.PI/2;
        rail.material=railMat;rail.isPickable=false;
      }
    }
  }

  const camera=new B.FreeCamera('close portrait follow camera',V(0,19,-10),scene);
  camera.mode=B.Camera.ORTHOGRAPHIC_CAMERA;
  camera.minZ=.08;camera.maxZ=120;scene.activeCamera=camera;
  function resize(engine){
    const w=Math.max(1,engine.getRenderWidth()),h=Math.max(1,engine.getRenderHeight());
    const aspect=w/h,halfWidth=CAMERA_WIDTH*.5;
    camera.orthoLeft=-halfWidth;camera.orthoRight=halfWidth;
    camera.orthoTop=halfWidth/aspect;camera.orthoBottom=-halfWidth/aspect;
  }
  function follow(x,z,dt){
    const rate=1-Math.exp(-Math.max(0,dt)*6.8);
    camera.position=B.Vector3.Lerp(camera.position,V(x,19,z-10),rate);
    camera.setTarget(V(camera.position.x,0,camera.position.z+10.7));
  }
  return {camera,resize,follow,dispose:()=>{}};
}
