// Wildpath Visual Pass 0.2 - softly rounded dark-fantasy forest.
// A separate environment module keeps the original prototype recoverable.
import { STAGE_GATES } from './config.js';
export { createActor, ring, disc, lightOrb } from './world.js';
const B=window.BABYLON;
const V=(x,y,z)=>new B.Vector3(x,y,z);
const rng=(s)=>()=>((s=(1664525*s+1013904223)>>>0)/4294967296);
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};

// The same mathematical trail curve is used for movement, scenery and milestones.
export const pathX=z=>3.25*Math.sin(z/19)+1.18*Math.sin(z/7.5)+0.48*Math.sin(z/43);
const pathWidth=z=>4.45+0.28*Math.sin(z/11)+0.19*Math.sin(z/5.3);
const side=(z)=>{const d=(pathX(z+.1)-pathX(z-.1))/.2,inv=1/Math.hypot(1,d);return [inv,-d*inv];};
const terrainY=(x,z)=>{const dist=Math.abs(x-pathX(z));const rise=smooth(6.7,26,dist);return -.29+rise*(1.75+0.55*Math.sin(z/14+x/9))+0.065*Math.sin(x*.53+z*.24)*rise;};
const fromHex=hex=>B.Color3.FromHexString(hex);
function mat(scene,name,hex,{emissive=0,alpha=1}={}){
  const m=new B.StandardMaterial(name,scene),col=fromHex(hex);
  m.diffuseColor=col;m.specularColor=new B.Color3(.025,.036,.03);
  m.ambientColor=col.scale(.16);m.alpha=alpha;
  if(emissive)m.emissiveColor=col.scale(emissive);
  return m;
}
function template(scene,name,shape,material){
  let mesh;
  if(shape.kind==='sphere')mesh=B.MeshBuilder.CreateSphere(name,{diameter:1,segments:shape.segments||12},scene);
  else if(shape.kind==='cylinder')mesh=B.MeshBuilder.CreateCylinder(name,{height:1,diameterTop:shape.top||.75,diameterBottom:1,tessellation:11},scene);
  else mesh=B.MeshBuilder.CreateDisc(name,{radius:.5,tessellation:24},scene);
  mesh.material=material;mesh.position.y=-300;mesh.isPickable=false;
  return mesh;
}
function spawn(base,name,x,y,z,sx,sy,sz,rotation=0){
  const m=base.createInstance(name);m.position.set(x,y,z);m.scaling.set(sx,sy,sz);
  m.rotation.y=rotation;m.isPickable=false;
  return m;
}
function curvedStrip(scene,name,widthOffset,material,zStart=-22,zEnd=227,step=.85){
  const positions=[],indices=[],normals=[];
  for(let z=zStart;z<=zEnd+step*.5;z+=step){
    const zz=Math.min(z,zEnd),[nx,nz]=side(zz),cx=pathX(zz),w=pathWidth(zz)+widthOffset;
    positions.push(cx-nx*w,.028,zz-nz*w,cx+nx*w,.028,zz+nz*w);
  }
  for(let i=0;i<positions.length/6-1;i++){
    const p=i*2;indices.push(p,p+2,p+1,p+1,p+2,p+3);
  }
  B.VertexData.ComputeNormals(positions,indices,normals);
  const v=new B.VertexData();v.positions=positions;v.indices=indices;v.normals=normals;
  const m=new B.Mesh(name,scene);v.applyToMesh(m);m.material=material;m.isPickable=false;
  return m;
}
function terrain(scene){
  const positions=[],indices=[],colors=[],normals=[],cell=2,cols=49,rows=143;
  const deep=fromHex('#3e6455'),moss=fromHex('#557965'),sage=fromHex('#6c8065');
  for(let iz=0;iz<=rows;iz++){
    const z=-32+iz*cell;
    for(let ix=0;ix<=cols;ix++){
      const x=-49+ix*cell,dist=Math.abs(x-pathX(z)),h=terrainY(x,z);
      positions.push(x,h,z);
      const variation=.5+.5*Math.sin(x*.25+Math.cos(z*.28)*2.3)*Math.cos(z*.23-x*.17);
      const c=B.Color3.Lerp(deep,moss,Math.max(0,Math.min(1,variation*.72+.13)));
      const value=Math.max(0,Math.min(1,(dist-12)/25));
      const shade=B.Color3.Lerp(c,sage,value*.27);
      colors.push(shade.r,shade.g,shade.b,1);
    }
  }
  for(let iz=0;iz<rows;iz++)for(let ix=0;ix<cols;ix++){
    const p=iz*(cols+1)+ix;indices.push(p,p+cols+1,p+1,p+1,p+cols+1,p+cols+2);
  }
  B.VertexData.ComputeNormals(positions,indices,normals);
  const data=new B.VertexData();data.positions=positions;data.indices=indices;data.normals=normals;data.colors=colors;
  const mesh=new B.Mesh('rolling mossy valley',scene);data.applyToMesh(mesh);
  const m=mat(scene,'muted forest ground','#ffffff');m.useVertexColors=true;m.backFaceCulling=false;
  mesh.material=m;mesh.isPickable=false;
  mesh.freezeWorldMatrix();return mesh;
}
export function createWorld(scene){
  const r=rng(251016),choose=a=>a[Math.floor(r()*a.length)];
  terrain(scene);
  const outer=mat(scene,'soft trail verge','#374f45');
  const shoulder=mat(scene,'rounded trail shoulder','#526650');
  const path=mat(scene,'earth and slate trail','#8a786b');
  const center=mat(scene,'trodden soil','#958377');
  // Carefully layered ribbons make the path visible rather than blending into the grass.
  curvedStrip(scene,'woodland shadow bordering trail',3.05,outer);
  const fringe=curvedStrip(scene,'soft moss bank',1.54,shoulder);fringe.position.y=.014;
  const road=curvedStrip(scene,'winding earthen path',.18,path);road.position.y=.036;
  const tread=curvedStrip(scene,'inner worn trail',-1.35,center);tread.position.y=.043;

  const bark=mat(scene,'warm cedar bark','#66564f');
  const foliage=[
    mat(scene,'midnight sage foliage','#456c64'),
    mat(scene,'dusk teal foliage','#42796c'),
    mat(scene,'muted jade foliage','#598473'),
    mat(scene,'lavender-green foliage','#62776f'),
    mat(scene,'forest spruce foliage','#375e5b'),
  ];
  const stones=[mat(scene,'riverstone','#738080'),mat(scene,'old slate','#586b6f'),mat(scene,'moss grey','#848b79')];
  const shrubs=[mat(scene,'dark heather','#587867'),mat(scene,'blue-green shrubs','#476e65'),mat(scene,'soft purple shrubs','#706b83')];
  const petals=[mat(scene,'lavender wildflowers','#9c96b8'),mat(scene,'orchid wildflowers','#b48b9b'),mat(scene,'gold buds','#bdac79')];
  const roots=template(scene,'bark trunk source',{kind:'cylinder',top:.6},bark);
  const treeCrowns=foliage.map((c,i)=>template(scene,'canopy template '+i,{kind:'sphere',segments:12},c));
  const rockTemplates=stones.map((c,i)=>template(scene,'rounded boulder source '+i,{kind:'sphere',segments:12},c));
  const shrubTemplates=shrubs.map((c,i)=>template(scene,'round shrub source '+i,{kind:'sphere',segments:10},c));
  const petalsT=petals.map((c,i)=>template(scene,'wildflower source '+i,{kind:'sphere',segments:8},c));
  const canopyShade=mat(scene,'forest footprint','#273f38',{alpha:.55});
  canopyShade.disableLighting=true;
  const shadeBase=template(scene,'forest shade source',{kind:'sphere',segments:9},canopyShade);

  const tree=(x,z,scale)=>{
    const y=terrainY(x,z),kind=Math.floor(r()*treeCrowns.length);
    spawn(shadeBase,'leaf shadow',x,y+.025,z,3.1*scale,.045,2.4*scale);
    spawn(roots,'curved tree trunk',x,y+1.04*scale,z,.47*scale,2.18*scale,.47*scale,r()*6.28);
    const crown=treeCrowns[kind],c2=treeCrowns[(kind+1)%treeCrowns.length];
    spawn(crown,'big rounded leaf canopy',x,y+2.7*scale,z,2.8*scale,2.15*scale,2.7*scale,r()*6.28);
    spawn(crown,'lobe of leaf canopy',x-.79*scale,y+2.5*scale,z+.25*scale,2.05*scale,1.92*scale,1.95*scale);
    spawn(c2,'soft outer bough',x+.73*scale,y+2.6*scale,z-.3*scale,1.8*scale,1.77*scale,1.9*scale);
    if(r()<.32)spawn(crown,'upper treetop',x,y+3.4*scale,z-.12*scale,1.52*scale,1.37*scale,1.43*scale);
  };
  const stone=(x,z,s)=>spawn(choose(rockTemplates),'weathered smooth stone',x,terrainY(x,z)+.28*s,z,1.28*s,.64*s,s,r()*6.28);
  const bush=(x,z,s)=>{const y=terrainY(x,z);
    spawn(choose(shrubTemplates),'round moss bush',x,y+.24*s,z,1.26*s,.56*s,1.02*s,r()*6.28);
    if(r()<.4)spawn(choose(shrubTemplates),'side bush',x+s*.55,y+s*.21,z+s*.22,.8*s,.46*s,.74*s);
  };
  // Denser silhouettes close to the route. Both sides get a forest wall, not a bare field.
  for(let z=-15;z<230;z+=3.1+r()*3.2){
    for(let sideSign of [-1,1]){
      const x=pathX(z)+sideSign*(8.2+r()*2.7);
      if(r()<.79)tree(x,z+(r()-.5)*2.1,.79+r()*.47);
      else if(r()<.56)stone(x,z,.9+r()*.8);
      else bush(x,z,1.0+r()*.6);
    }
  }
  // Distant trees fill the skyline but are still inexpensive instances.
  for(let i=0;i<90;i++){
    const z=-18+r()*255,sideSign=r()<.5?-1:1,x=pathX(z)+sideSign*(13.7+r()*19);
    if(r()<.8)tree(x,z,.9+r()*.72);else stone(x,z,1.1+r()*.9);
  }
  for(let i=0;i<170;i++){
    const z=-7+r()*230,sign=r()<.5?-1:1,x=pathX(z)+sign*(5.7+r()*8.3);
    if(r()<.73)bush(x,z,.42+r()*.7);else stone(x,z,.48+r()*.68);
  }
  for(let i=0;i<190;i++){
    const z=-8+r()*229,x=pathX(z)+(r()<.5?-1:1)*(5.3+r()*9);
    const s=.11+r()*.12,y=terrainY(x,z);
    spawn(choose(petalsT),'tiny woodland blossom',x,y+.10,z,s*1.2,s,s*1.2,r()*6);
  }
  // Quiet landmarks - ancient mossy stones and tiny glowing fairy lights.
  const standing=mat(scene,'weatherworn standing stones','#596c6b');
  const rune=mat(scene,'faint turquoise waylight','#78acaa',{emissive:.27});
  const pillar=template(scene,'standing stone source',{kind:'sphere',segments:14},standing);
  const runeBase=template(scene,'waylight source',{kind:'sphere',segments:10},rune);
  for(const z of [17,39,67,97,131,164,190]){
    const dir=z%2?1:-1,x=pathX(z)+dir*(7.1+r()*.8),y=terrainY(x,z);
    spawn(pillar,'ancient round menhir',x,y+1.05,z,.72,2.32,.6,.15);
    spawn(runeBase,'glowing forest glyph',x,y+2.37,z,.29,.29,.29);
    stone(x+dir*1.2,z-1,.8);
  }
  const gateMarkers=[];
  for(let i=0;i<STAGE_GATES.length;i++){
    const z=STAGE_GATES[i],cx=pathX(z);
    for(const sign of [-1,1]){
      const x=cx+sign*6.3,y=terrainY(x,z);
      const st=spawn(pillar,'curved gate stone',x,y+.98,z,.72,1.92,.73);
      const orb=spawn(runeBase,'trail milestone light',x,y+2.05,z,.40,.40,.40);
      gateMarkers.push({st,orb,stage:i});
    }
  }
  return {gateMarkers,dispose:()=>scene.meshes.slice().forEach(m=>m.dispose())};
}
