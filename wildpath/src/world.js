import { STAGE_GATES, random } from './config.js';
const B = window.BABYLON;
const V = (x,y,z) => new B.Vector3(x,y,z);
const colors = { grass:'#a8d79a', path:'#ead9b5', tree:'#79b795', tree2:'#90c49f', tree3:'#a5d3ad', trunk:'#b99f82', moss:'#b9d99f', stone:'#b3b8aa', stone2:'#c4cec0', flowers:'#fff4b9', flowers2:'#e9d1df' };
export function material(scene, name, hex, glow=0, alpha=1) { const m = new B.StandardMaterial(name,scene);m.diffuseColor=B.Color3.FromHexString(hex);m.specularColor=new B.Color3(.06,.07,.06);m.ambientColor=B.Color3.FromHexString(hex).scale(.28);if(glow)m.emissiveColor=B.Color3.FromHexString(hex).scale(glow);m.alpha=alpha;if(alpha<1){m.backFaceCulling=false;m.needDepthPrePass=true;}return m; }
const sphere = (scene,name,pos,scl,mat,segments=14) => {const m=B.MeshBuilder.CreateSphere(name,{diameter:1,segments},scene);m.position=V(...pos);m.scaling=V(...scl);m.material=mat;return m;};
const seedRand = seed => () => {seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
export const pathX = z => Math.sin(z/22)*1.23+Math.sin(z/8)*.28;
function ribbon(scene,halfWidth,mat,y=-.055,edge=0){const positions=[],indices=[],normals=[];for(let z=-18;z<=226;z+=1){let x=pathX(z)+(edge?edge*halfWidth:0);positions.push(x-halfWidth,y,z,x+halfWidth,y,z);}for(let k=0;k<(positions.length/3/2)-1;k++){let p=k*2;indices.push(p,p+2,p+1,p+1,p+2,p+3);}B.VertexData.ComputeNormals(positions,indices,normals);const mesh=new B.Mesh('soft-meandering-trail',scene);let d=new B.VertexData();d.positions=positions;d.indices=indices;d.normals=normals;d.applyToMesh(mesh);mesh.material=mat;return mesh;}
export function createWorld(scene){
  const grass=material(scene,'meadow grass',colors.grass),trail=material(scene,'warm sandy trail',colors.path),grass2=material(scene,'grass accents','#b4df9e');
  const tree=[material(scene,'spring leaf',colors.tree),material(scene,'sage leaf',colors.tree2),material(scene,'sunny leaf',colors.tree3)],trunk=material(scene,'bark',colors.trunk),rock=[material(scene,'warm stone',colors.stone),material(scene,'cool stone',colors.stone2)],bush=material(scene,'flowering shrub',colors.moss),flower=[material(scene,'gold wildflowers',colors.flowers),material(scene,'pink wildflowers',colors.flowers2)],gateMat=material(scene,'milestone', '#d1d8bf'),rune=material(scene,'rune glow','#b0f1d5',.5);
  const floor=B.MeshBuilder.CreateGround('soft rolling meadow',{width:90,height:265,subdivisions:2},scene);floor.position=V(0,-.11,104);floor.material=grass;floor.isPickable=false;
  ribbon(scene,5.7,grass2,-.09);ribbon(scene,4.85,trail,-.072);
  const r=seedRand(27819);
  function addTree(x,z,scale){const root=new B.TransformNode('oak',scene);root.position=V(x,0,z);let tr=B.MeshBuilder.CreateCylinder('tree stem',{diameterTop:.39,diameterBottom:.62,height:2.35,tessellation:12},scene);tr.position.y=1.1;tr.material=trunk;tr.parent=root;let leaf=tree[Math.floor(r()*tree.length)];for(let i=0;i<3;i++){let center=i===0?[0,2.55,0]:i===1?[-.68,2.38,.08]:[.58,2.5,-.15];const c=sphere(scene,'rounded canopy',center,[1.35,1.27,1.2],leaf,20);c.parent=root;}root.scaling=V(scale,scale,scale);}
  function addRock(x,z,scale){const m=sphere(scene,'smooth river stone',[x,.18*scale,z],[scale*1.22,scale*.58,scale*.98],rock[Math.floor(r()*rock.length)],16);m.rotation.y=r()*3.14;}
  function addBush(x,z,scale){let m=sphere(scene,'soft bushes',[x,.27*scale,z],[scale*1.13,scale*.62,scale],bush,16);m.rotation.y=r()*3.14;}
  function addFlower(x,z){sphere(scene,'little wildflower',[x,.05,z],[.13,.10,.13],flower[Math.floor(r()*2)],8);}
  for(let i=0;i<125;i++) {let z=-10+r()*233;let x=(r()<.5?-1:1)*(7.7+r()*19)+pathX(z);if(r()<.64)addTree(x,z,.75+r()*.58);else if(r()<.55)addRock(x,z,.7+r()*.9);else addBush(x,z,.7+r()*.7);}
  for(let i=0;i<78;i++){let z=-8+r()*220,x=pathX(z)+(r()<.5?-1:1)*(5.9+r()*7.4);if(r()<.54)addBush(x,z,.47+r()*.44);else addRock(x,z,.45+r()*.48);}
  for(let i=0;i<195;i++){let z=r()*214,x=pathX(z)+(r()<.5?-1:1)*(5.8+r()*16);addFlower(x,z);}
  const gateMarkers=[];
  STAGE_GATES.forEach((z,i)=> {let x=pathX(z);for(const sign of [-1,1]){const px=x+sign*6.05;const st=B.MeshBuilder.CreateCylinder('milestone',{diameterTop:.77,diameterBottom:.93,height:1.4,tessellation:12},scene);st.position=V(px,.62,z);st.material=gateMat;const orb=sphere(scene,'soft waypoint glow',[px,1.48,z],[.28,.28,.28],rune,16);gateMarkers.push({orb,st,stage:i});}});
  return { gateMarkers,dispose:()=>{scene.meshes.slice().forEach(mesh=>mesh.dispose());} };
}
export function createActor(scene,type,enemy=false){
  const caster=!enemy&&type==='caster',melee=!enemy&&type==='melee';
  const enemyTone=type==='ember'?'#e2a9a3':type==='bramble'?'#bf9984':type==='guardian'?'#8aa99d':'#b0c9a0';
  const bodyMat=material(scene,'outfit',enemy?enemyTone:caster?'#9bbed3':'#e1ae87'),headMat=material(scene,'face',enemy?'#d5cfac':'#f5dcb7'),darkMat=material(scene,'eyes','#44534d'),accentMat=material(scene,'trim',enemy?'#7d9d88':caster?'#d4f5f4':'#f7e1ad',.08),weaponMat=material(scene,'steel','#b9d0d2',.12);
  const root=new B.TransformNode('actor-root',scene);const members=[];
  function ball(name, xyz,scale,mat){const m=sphere(scene,name,xyz,scale,mat,16);m.parent=root;members.push(m);return m;}
  ball('shadow foot',[0,.12,0],[.75,.15,.65],material(scene,'shadow','#678677',0,.4));
  const body=ball('round tunic',[0,1.07,0],[.75,.93,.58],bodyMat);const head=ball('round head',[0,2.05,.08],[.48,.49,.46],headMat);
  ball('left eye',[-.17,2.1,.47],[.07,.095,.07],darkMat);ball('right eye',[.17,2.1,.47],[.07,.095,.07],darkMat);
  const leftArm=ball('left arm',[-.81,1.14,0],[.26,.64,.27],bodyMat);const rightArm=ball('right arm',[.81,1.14,0],[.26,.64,.27],bodyMat);
  if(caster){ball('glint cap',[0,2.44,-.09],[.52,.21,.49],accentMat);const orb=ball('focus stone',[.97,1.44,.22],[.22,.22,.22],material(scene,'focus','#82e4ec',.55));orb.metadata={part:'focus'};}
  if(melee){const pivot=new B.TransformNode('sword-pivot',scene);pivot.parent=rightArm;pivot.position=V(0,-.44,.15);const handle=B.MeshBuilder.CreateCylinder('sword grip',{height:.7,diameter:.13,tessellation:10},scene);handle.position.y=-.15;handle.material=material(scene,'wood grip','#896b55');handle.parent=pivot;const blade=B.MeshBuilder.CreateBox('rounded blade',{width:.24,height:1.03,depth:.11},scene);blade.position.y=-1.0;blade.material=weaponMat;blade.parent=pivot;members.push(handle,blade);root.metadata={sword:pivot};}
  if(enemy){ball('round nose',[0,1.95,.52],[.15,.13,.14],bodyMat);if(type==='guardian'){root.scaling=V(1.35,1.35,1.35);ball('guardian mane',[0,2.2,-.28],[.65,.48,.44],accentMat);}if(type==='ember'){ball('ember crown',[0,2.5,0],[.36,.32,.35],accentMat);}}
  return {root,body,head,leftArm,rightArm,members,dispose(){root.dispose(false,false);for(const m of members)m.dispose(false,false);for(const mat of [bodyMat,headMat,darkMat,accentMat,weaponMat])mat.dispose();}};
}
export function ring(scene,name,hex,radius,thickness=.09){const m=B.MeshBuilder.CreateTorus(name,{diameter:radius*2,thickness,tessellation:48},scene);m.material=material(scene,name+' color',hex,.55,.78);return m;}
export function disc(scene,name,hex,radius,alpha=.26){const m=B.MeshBuilder.CreateDisc(name,{radius,tessellation:36},scene);m.rotation.x=Math.PI/2;m.material=material(scene,name+' color',hex,.35,alpha);return m;}
export function lightOrb(scene,hex,size){const m=B.MeshBuilder.CreateSphere('spell particle',{diameter:size,segments:10},scene);m.material=material(scene,'orb',hex,.8);m.isPickable=false;return m;}
