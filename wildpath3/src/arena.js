// Wildpath 3.0 / Visual Restoration 1.1: full-bleed hand-painted arena.
// No raised green circle, glowing ring or empty navy void. The compact combat
// radius remains authoritative in rules.js; scenery is decoration only.
import {ARENA_RADIUS,CAMERA_WIDTH} from './rules.js';
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
    const center=B.Color3.FromHexString('#4bad6c'),
      light=B.Color3.FromHexString('#5abb6b'),
      shade=B.Color3.FromHexString('#2f885f');
    for(let i=0;i<positions.length;i+=3){
      const x=positions[i],z=positions[i+2];
      const radius=Math.hypot(x,z);
      const variation=.5+.5*Math.sin(x*.46+z*.22)*Math.cos(z*.58-x*.22);
      let color=B.Color3.Lerp(center,light,.12+variation*.32);
      color=B.Color3.Lerp(color,shade,
        Math.min(.7,Math.max(0,(radius-8)/23)*.52));
      colors.push(color.r,color.g,color.b,1);
    }
    ground.setVerticesData(B.VertexBuffer.ColorKind,colors);
    ground.useVertexColors=true;
  }

  const rand=rng(56021);
  const pigments={
    grass:candyMaterial(scene,'lime tall grass','#78cb4d',{shine:.05}),
    grassDark:candyMaterial(scene,'dark green meadow grass','#278c60',{shine:.04}),
    stone:candyMaterial(scene,'warm worn stepping stones','#dab47d',{shine:.055}),
    stoneLight:candyMaterial(scene,'stone bevel sunshine','#f1d19a',{shine:.06}),
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

  // A subtle broken ochre trail guides the eye across the field. No
  // opaque circular stains or gameplay collisions.
  for(let i=0;i<14;i++){
    const z=-10+i*1.66,x=-6.5+Math.sin(z*.28)*1.22;
    if(i%4===1)continue;
    const s=.50+rand()*.32;
    const stone=place(i%2?pebble:pebbleLight,
      'warm trail stepping stone',x,.048,z,s,.11,s*.68);
    stone.rotation.y=rand()*.4;
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

  // Low wooden fences define only short sections of the combat area's edge.
  // Open gaps keep the arena from looking like a perfect green circle.
  for(const [start,count] of [[.39,3],[2.12,3],[3.95,3],[5.62,3]]){
    for(let i=0;i<count;i++){
      const a=start+i*.17,r=ARENA_RADIUS+.85;
      const x=Math.cos(a)*r,z=Math.sin(a)*r;
      const wood=B.MeshBuilder.CreateBox('short wooden border plank',
        {width:1.85,height:.39,depth:.19},scene);
      wood.position.set(x,.30,z);wood.rotation.y=-a;
      wood.material=pigments.woodTop;wood.isPickable=false;
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
