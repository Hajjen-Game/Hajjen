// Alternative world for Wildpath 2.0; the legacy road world is retained.
import {WILD_RADIUS,WILD_FLOOR_RADIUS} from './open-layout.js';
const B=window.BABYLON;
function rng(seed){return ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);}
function material(scene,name,color,emit=.08){
  const m=new B.StandardMaterial(name,scene),c=B.Color3.FromHexString(color);
  m.diffuseColor=c;m.ambientColor=c.scale(.31);m.emissiveColor=c.scale(emit);
  m.specularColor=new B.Color3(.015,.02,.018);return m;
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
export function createOpenWorld(scene){
  const rand=rng(73018),choose=a=>a[Math.floor(rand()*a.length)];
  const turf=material(scene,'enchanted deep moss','#516e5c',.11);
  const ground=B.MeshBuilder.CreateGround('continuous woodland floor',
    {width:WILD_FLOOR_RADIUS*2,height:WILD_FLOOR_RADIUS*2,subdivisions:1},scene);
  ground.material=turf;ground.isPickable=false;ground.position.y=-.12;
  const leaves=['#527f60','#69916e','#7b9c79','#416f5f','#88a481','#608775'].map((c,i)=>
    sphereSource(scene,'canopy template '+i,material(scene,'canopy pigment '+i,c,.14)));
  const bark=cylinderSource(scene,'tree bark source',material(scene,'warm forest wood','#6c5b4f'));
  const shrubs=['#6e927c','#789985','#658573'].map((c,i)=>
    sphereSource(scene,'fern source '+i,material(scene,'fern shade '+i,c,.1)));
  const stones=['#7a8681','#778c90','#6c7d80'].map((c,i)=>
    sphereSource(scene,'rock source '+i,material(scene,'moss stone '+i,c,.06)));
  const flower=['#f6bcb9','#c4b6de','#e8cf9c','#b5d7c9'].map((c,i)=>
    sphereSource(scene,'flower source '+i,material(scene,'flower color '+i,c,.23)));
  const glow=sphereSource(scene,'magic firefly source',material(scene,'firefly tint','#a5e5da',.9));
  // The previous shaded, flattened spheres rendered as giant dark blotches on
  // phones. Unlit and nearly transparent layers add gentle turf variation.
  const sunny=material(scene,'pale grass variation','#b8c69a',.0);
  sunny.disableLighting=true;sunny.alpha=.075;
  const shadowy=material(scene,'soft moss variation','#264336',.0);
  shadowy.disableLighting=true;shadowy.alpha=.075;
  const dirt=sphereSource(scene,'soft ground light',sunny);
  const darker=sphereSource(scene,'woodland mottling',shadowy);
  const trunk=(x,z,s)=>{
    instance(bark,'slender trunk',x,.65*s,z,.38*s,1.3*s,.39*s);
    const leaf=choose(leaves);
    instance(leaf,'rounded canopy',x,1.75*s,z,2.15*s,1.50*s,2.10*s);
    instance(choose(leaves),'lighter canopy lobe',x+.52*s,1.60*s,z-.32*s,1.45*s,1.32*s,1.53*s);
  };
  // Gentle broad color variation rather than a rectangular road.
  for(let i=0;i<90;i++){
    const x=(rand()-.5)*143,z=(rand()-.5)*143;
    const s=2.2+rand()*4.5;
    instance(rand()<.62?dirt:darker,'subtle meadow color patch',x,-.107,z,s,.012,s*.83);
  }
  // Natural outer forest: dense trees read as a boundary, not an artificial wall.
  for(let ring=0;ring<3;ring++){
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
  for(let i=0;i<15;i++){
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
    if(roll<.18 && r>24)trunk(x,z,.59+rand()*.21);
    else if(roll<.68)instance(choose(shrubs),'soft fern cluster',x,.17,z,.42+rand()*.44,.24+rand()*.17,.39+rand()*.36);
    else instance(choose(stones),'rounded stone',x,.22,z,.40+rand()*.54,.30+rand()*.24,.35+rand()*.4);
  }
  // Small soft-colored flowers and occasional magical motes.
  for(let i=0;i<195;i++){
    const a=rand()*Math.PI*2,r=Math.sqrt(rand())*(WILD_RADIUS+8);
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    const p=choose(flower);
    instance(p,'meadow flower',x,.04,z,.13+rand()*.14,.13+rand()*.18,.13+rand()*.14);
    if(i%6===0)instance(glow,'quiet woodland light',x,.35+rand()*1.25,z,.08,.10,.08);
  }
  // Three recognizable destinations without forcing the player onto a path.
  const shrineMaterial=material(scene,'ancient glade stone','#84978e',.17);
  const shrineGlow=material(scene,'shrine turquoise glow','#75dac5',.58);
  for(const [x,z] of [[-27,16],[25,23],[-3,-31]]){
    const base=B.MeshBuilder.CreateCylinder('ancient hollow marker',
      {height:.26,diameter:2.1,tessellation:12},scene);
    base.position.set(x,.08,z);base.material=shrineMaterial;base.isPickable=false;
    const gem=B.MeshBuilder.CreateSphere('enchanted forest gem',{diameter:.65,segments:10},scene);
    gem.position.set(x,.80,z);gem.material=shrineGlow;gem.isPickable=false;
  }
  return {ground,kind:'open',radius:WILD_RADIUS};
}
