// Alternative world for Wildpath 2.0; the legacy road world is retained.
import {WILD_RADIUS,WILD_FLOOR_RADIUS} from './open-layout.js';
const B=window.BABYLON;
function rng(seed){return ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);}
function material(scene,name,color,emit=.08){
  const m=new B.StandardMaterial(name,scene),c=B.Color3.FromHexString(color);
  m.diffuseColor=c;m.ambientColor=c.scale(.25);m.emissiveColor=c.scale(emit*.58);
  // Saturated painterly base, with a restrained glossy highlight on lit tops.
  m.specularColor=new B.Color3(.085,.105,.09);
  m.specularPower=64;
  return m;
}
function sphereSource(scene,name,material){
  const mesh=B.MeshBuilder.CreateSphere(name,{diameter:1,segments:10},scene);
  mesh.position.y=-200;mesh.material=material;mesh.isPickable=false;return mesh;
}
function cylinderSource(scene,name,material){
  const mesh=B.MeshBuilder.CreateCylinder(name,{height:1,diameterTop:.7,diameterBottom:1,tessellation:8},scene);
  mesh.position.y=-200;mesh.material=material;mesh.isPickable=false;return mesh;
}
function instance(source,name,x,y,z,sx,sy,sz){
  const m=source.createInstance(name);m.position.set(x,y,z);
  m.scaling.set(sx,sy,sz);m.isPickable=false;return m;
}
export function createOpenWorld(scene,{staticVegetation=true}={}){
  // Daisugi trial: render only Nature Rebirth plants created during combat.
  // The original background scenery remains unchanged unless explicitly opted out.
  const rand=rng(73018),choose=a=>a[Math.floor(rand()*a.length)];
  const turf=material(scene,'enchanted deep moss','#ffffff',.015);
  // Keep the FLOOR matte: glossy highlights belong to characters and foliage,
  // not to puddle-like specular patches on the removed wet terrain.
  turf.specularColor=new B.Color3(.025,.038,.032);
  // The original softly shaded green woodland floor. No hexagon textures.
  const ground=B.MeshBuilder.CreateGround('continuous woodland floor',
    {width:WILD_FLOOR_RADIUS*2,height:WILD_FLOOR_RADIUS*2,subdivisions:20},scene);
  ground.material=turf;ground.isPickable=false;ground.position.y=-.12;
  const positions=ground.getVerticesData(B.VertexBuffer.PositionKind);
  if(positions){
    const colors=[],sun=B.Color3.FromHexString('#44966c'),
      meadow=B.Color3.FromHexString('#388460'),
      perimeter=B.Color3.FromHexString('#245949');
    for(let i=0;i<positions.length;i+=3){
      const x=positions[i],z=positions[i+2];
      const r=Math.min(1,Math.hypot(x,z)/(WILD_RADIUS+22));
      const variation=.08*Math.sin(x*.105+z*.071)*Math.cos(z*.115-x*.044);
      const center=B.Color3.Lerp(sun,meadow,Math.min(1,Math.max(0,r*.86+variation)));
      const c=B.Color3.Lerp(center,perimeter,Math.pow(r,1.55)*.74);
      colors.push(c.r,c.g,c.b,1);
    }
    ground.setVerticesData(B.VertexBuffer.ColorKind,colors);
    ground.useVertexColors=true;
  }
  const leaves=['#279e70','#6fc953','#a4d96b','#268e75','#e0c96a','#4cba9b'].map((c,i)=>
    sphereSource(scene,'canopy template '+i,material(scene,'canopy pigment '+i,c,.13)));
  const bark=cylinderSource(scene,'tree bark source',material(scene,'warm forest wood','#85583c'));
  const shrubs=['#3ead7b','#87cf76','#39a58d'].map((c,i)=>
    sphereSource(scene,'fern source '+i,material(scene,'fern shade '+i,c,.1)));
  const stones=['#829b96','#98b2ad','#6b8e91'].map((c,i)=>
    sphereSource(scene,'rock source '+i,material(scene,'moss stone '+i,c,.06)));
  const flower=['#ff8fc2','#ae89f2','#ffd76c','#7ce7c6'].map((c,i)=>
    sphereSource(scene,'flower source '+i,material(scene,'flower color '+i,c,.12)));
  const glow=sphereSource(scene,'magic firefly source',material(scene,'firefly tint','#4de6ba',.40));
  // The previous shaded, flattened spheres rendered as giant dark blotches on
  // phones. Unlit and nearly transparent layers add gentle turf variation.
  // Soft small grass blades instead of large shadow-colored flattened spheres.
  // The previous 2–7 metre patches looked like dark holes on portrait phones.
  const grass=sphereSource(scene,'tiny meadow grass source',
    material(scene,'meadow green','#80bc79',.10));
  const branchSource=cylinderSource(scene,'background tree fork',
    material(scene,'background bark','#926448',.08));
  const trunk=(x,z,s)=>{
    instance(bark,'woodland trunk',x,.77*s,z-.38*s,.33*s,1.55*s,.35*s);
    const branch=instance(branchSource,'visible woodland branch',x+.39*s,1.27*s,
      z-.26*s,.17*s,.94*s,.18*s);
    branch.rotation.z=-.67;
    const leaf=choose(leaves);
    instance(leaf,'woodland crown left',x-.61*s,2.06*s,z+.36*s,
      1.45*s,1.23*s,1.43*s);
    instance(choose(leaves),'woodland crown center',x+.11*s,2.31*s,z+.54*s,
      1.51*s,1.24*s,1.42*s);
    instance(choose(leaves),'woodland crown right',x+.87*s,2.06*s,z+.31*s,
      1.36*s,1.13*s,1.32*s);
  };
  // Tiny scattered grass flecks create ground texture without giant dark discs.
  if(staticVegetation)for(let i=0;i<160;i++){
    const x=(rand()-.5)*132,z=(rand()-.5)*132;
    const scale=.24+rand()*.25;
    instance(grass,'fine grass blade',x,.065,z,scale,.12,scale*.55);
  }
  // Natural outer forest: dense trees read as a boundary, not an artificial wall.
  if(staticVegetation)for(let ring=0;ring<3;ring++){
    const radius=WILD_RADIUS+5+ring*5.5;
    const count=ring===0?48:ring===1?55:63;
    for(let i=0;i<count;i++){
      const a=(i+rand()*.68)*Math.PI*2/count;
      const r=radius+(rand()-.5)*4.7;
      trunk(Math.cos(a)*r,Math.sin(a)*r,.68+rand()*.53);
    }
  }
  // A recognizable starting glade framed by trees. Open gaps in between keep
  // free movement readable; no continuous wall or forced route.
  if(staticVegetation)for(let i=0;i<15;i++){
    const angle=(i+.28+(rand()-.5)*.37)*Math.PI*2/15;
    const radius=17+rand()*5.7;
    trunk(Math.cos(angle)*radius,Math.sin(angle)*radius,.64+rand()*.22);
  }
  // A few distant woodland islands with breathing room for combat.
  for(let i=0;i<98;i++){
    const a=rand()*Math.PI*2,r=Math.sqrt(rand())*(WILD_RADIUS-5);
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(Math.hypot(x,z)<11)continue;
    const roll=rand();
    if(roll<.18 && r>24){
      if(staticVegetation)trunk(x,z,.59+rand()*.21);
    }else if(roll<.68){
      if(staticVegetation)instance(choose(shrubs),'soft fern cluster',
        x,.17,z,.42+rand()*.44,.24+rand()*.17,.39+rand()*.36);
    }else instance(choose(stones),'rounded stone',x,.22,z,
      .40+rand()*.54,.30+rand()*.24,.35+rand()*.4);
  }
  // Small soft-colored flowers and occasional magical motes.
  if(staticVegetation)for(let i=0;i<195;i++){
    const a=rand()*Math.PI*2,r=Math.sqrt(rand())*(WILD_RADIUS+8);
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    const p=choose(flower);
    instance(p,'meadow flower',x,.04,z,.13+rand()*.14,.13+rand()*.18,.13+rand()*.14);
    if(i%6===0)instance(glow,'quiet woodland light',x,.35+rand()*1.25,z,.08,.10,.08);
  }
  // Three recognizable destinations without forcing the player onto a path.
  const shrineMaterial=material(scene,'ancient glade stone','#829fa1',.18);
  const shrineGlow=material(scene,'shrine turquoise glow','#4bedcf',.66);
  for(const [x,z] of [[-27,16],[25,23],[-3,-31]]){
    const base=B.MeshBuilder.CreateCylinder('ancient hollow marker',
      {height:.26,diameter:2.1,tessellation:12},scene);
    base.position.set(x,.08,z);base.material=shrineMaterial;base.isPickable=false;
    const gem=B.MeshBuilder.CreateSphere('enchanted forest gem',{diameter:.65,segments:10},scene);
    gem.position.set(x,.80,z);gem.material=shrineGlow;gem.isPickable=false;
  }
  return {ground,kind:'open',radius:WILD_RADIUS,staticVegetation};
}
