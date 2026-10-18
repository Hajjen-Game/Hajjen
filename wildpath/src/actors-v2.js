// Wildpath 0.7 — rounded, readable capsule silhouettes inspired by the VFX reference.
// Meshes are deliberately simple so dozens of actors work on mobile.
const B=window.BABYLON;
const v=(x,y,z)=>new B.Vector3(x,y,z);
function colorMat(scene,name,color,glow=.08,alpha=1){
  const m=new B.StandardMaterial(name,scene),c=B.Color3.FromHexString(color);
  // Glossy candy-shell highlight, with no expensive per-actor postprocess.
  m.diffuseColor=c;m.ambientColor=c.scale(.27);
  m.specularColor=new B.Color3(.55,.64,.60);
  m.specularPower=74;
  m.emissiveColor=c.scale(glow);m.alpha=alpha;
  if(alpha<1)m.backFaceCulling=false;
  return m;
}
function capsule(scene,name,height,radius){
  if(B.MeshBuilder.CreateCapsule) return B.MeshBuilder.CreateCapsule(name,{height,radius,tessellation:20,capSubdivisions:8},scene);
  return B.MeshBuilder.CreateSphere(name,{diameter:1,segments:20},scene);
}
export function createActor(scene,type,enemy=false){
  const caster=!enemy&&type==='caster',melee=!enemy&&type==='melee';
  const palette=enemy?({
    mossling:['#70c65a','#c3f47d','#386b38'],
    bramble:['#e28772','#ffbb98','#934d55'],
    ember:['#ff9450','#ffe088','#b9473b'],
    guardian:['#a17adf','#d7b5ff','#62488b']
  }[type]||['#77cd8f','#d3f6a2','#486d53']):caster?
    ['#19c9e5','#d8ffff','#056c91']:['#f6a457','#ffe5a0','#82533f'];
  const root=new B.TransformNode('hero capsule root',scene),members=[],mats=[];
  function material(n,h,g=.1,a=1){const m=colorMat(scene,n,h,g,a);mats.push(m);return m;}
  const bodyMat=material(type+' satin capsule',palette[0],caster?.27:.16);
  const faceMat=material(type+' bright front',palette[1],caster?.32:.21);
  const trimMat=material(type+' details',palette[2],.10);
  const shadowMat=material('soft contact shadow','#263d36',.04,.42);
  const metalMat=material('rounded steel sword','#d3e9e1',.38);
  const gripMat=material('warm sword grip','#815d47',.08);
  const eyeMat=material('small eye highlights','#24484a',.12);
  function add(mesh,name,x,y,z,mat){
    mesh.name=name;mesh.parent=root;mesh.position=v(x,y,z);
    mesh.material=mat;mesh.isPickable=true;members.push(mesh);return mesh;
  }
  const shadow=B.MeshBuilder.CreateSphere('contact-shadow',{diameter:1,segments:12},scene);
  add(shadow,'soft round contact shadow',0,.09,0,shadowMat);shadow.scaling=v(.92,.07,.68);shadow.isPickable=false;
  const h=enemy&&type==='guardian'?2.55:2.22,rad=enemy&&type==='guardian'?.73:.58;
  const body=add(capsule(scene,'capsule body',h,rad),type+' rounded capsule',0,h*.5+.15,0,bodyMat);
  if(!B.MeshBuilder.CreateCapsule)body.scaling=v(rad*2,h,rad*2);
  // Small front-facing light patch and two eyes establish direction at zoom.
  const patch=B.MeshBuilder.CreateSphere('front-tint',{diameter:1,segments:14},scene);
  add(patch,'front facing color patch',0,1.38,rad-.06,faceMat);
  patch.scaling=v(.41,.57,.115);
  // One restrained hero-only pearl highlight visible to the high top-down
  // camera; enemies stay on the old mesh budget.
  if(!enemy){
    const glint=B.MeshBuilder.CreateSphere('hero polished crown highlight',
      {diameter:1,segments:10},scene);
    add(glint,'hero top pearl glint',-.15,h+.13,.11,
      material('hero pearl sheen',caster?'#ebffff':'#fff1c9',.35));
    glint.scaling=v(.21,.07,.16);glint.isPickable=false;
  }
  for(const sign of [-1,1]){
    const eye=B.MeshBuilder.CreateSphere('small eye',{diameter:1,segments:10},scene);
    add(eye,'small direction eye',sign*.19,1.67,rad+.035,eyeMat);
    eye.scaling=v(.075,.085,.055);
  }
  const leftArm=new B.TransformNode('left action pivot',scene);
  leftArm.parent=root;leftArm.position=v(-rad*.91,1.25,.01);
  const rightArm=new B.TransformNode('right action pivot',scene);
  rightArm.parent=root;rightArm.position=v(rad*.91,1.25,.01);
  for(const [pivot,name] of [[leftArm,'left'],[rightArm,'right']]){
    const arm=B.MeshBuilder.CreateSphere(name+' tiny arm',{diameter:1,segments:12},scene);
    arm.parent=pivot;arm.scaling=v(.21,.41,.25);arm.material=bodyMat;
    arm.isPickable=true;members.push(arm);
  }
  if(caster){
    const focus=B.MeshBuilder.CreateSphere('floating spell focus',{diameter:.34,segments:14},scene);
    focus.parent=rightArm;focus.position=v(.07,-.17,.42);focus.material=material('caster focus','#dfffff',1.20);
    members.push(focus);
  }
  if(melee){
    const pivot=new B.TransformNode('sword-swing pivot',scene);
    pivot.parent=rightArm;pivot.position=v(.12,-.17,.26);
    const handle=B.MeshBuilder.CreateCylinder('small sword grip',{height:.53,diameter:.15,tessellation:12},scene);
    handle.parent=pivot;handle.position=v(0,-.17,0);handle.material=gripMat;members.push(handle);
    const blade=capsule(scene,'simple bright blade',1.13,.16);
    blade.parent=pivot;blade.position=v(0,-.94,0);
    if(!B.MeshBuilder.CreateCapsule)blade.scaling=v(.28,1.12,.16);
    blade.material=metalMat;members.push(blade);
    const guard=B.MeshBuilder.CreateBox('sword guard',{width:.52,height:.13,depth:.17},scene);
    guard.parent=pivot;guard.position=v(0,-.48,0);guard.material=trimMat;members.push(guard);
    root.metadata={sword:pivot};
  }
  if(enemy&&type==='ember'){
    const ember=B.MeshBuilder.CreateSphere('warm halo core',{diameter:.57,segments:14},scene);
    add(ember,'ember wisp crown',0,2.28,0,material('orange flame','#ffcf76',.72));
  }
  if(enemy&&type==='bramble'){
    for(const sign of [-1,1]){
      const horn=B.MeshBuilder.CreateSphere('rounded shoulder thorn',{diameter:1,segments:12},scene);
      add(horn,'bramble shoulder',sign*.51,1.75,-.08,trimMat);horn.scaling=v(.29,.35,.27);
    }
  }
  if(enemy&&type==='guardian'){
    const crest=B.MeshBuilder.CreateSphere('guardian crest',{diameter:1,segments:14},scene);
    add(crest,'guardian head crest',0,2.55,-.2,faceMat);crest.scaling=v(.57,.3,.48);
  }
  return {root,body,leftArm,rightArm,members,
    dispose(){
      root.dispose(false,false);
      for(const mesh of members)mesh.dispose(false,false);
      leftArm.dispose(false,false);rightArm.dispose(false,false);
      for(const mat of mats)mat.dispose();
    }
  };
}
