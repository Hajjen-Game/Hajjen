// Wildpath VFX 0.7 — small but punchy, phone-readable Babylon meshes.
const B=window.BABYLON;
function mat(scene,name,hex,glow=1,alpha=1){
  const m=new B.StandardMaterial(name,scene),c=B.Color3.FromHexString(hex);
  m.diffuseColor=c;m.emissiveColor=c.scale(glow);
  m.specularColor=B.Color3.Black();m.disableLighting=true;
  m.alpha=alpha;m.backFaceCulling=false;
  if(alpha<1)m.needDepthPrePass=true;
  return m;
}
export function magicProjectile(scene,color='#9be9f5',size=.56){
  const main=B.MeshBuilder.CreateSphere('bright projectile nucleus',{diameter:size,segments:12},scene);
  main.material=mat(scene,'hot spell core','#ffffff',.95);
  const surround=B.MeshBuilder.CreateSphere('colored magic shell',{diameter:size*1.6,segments:12},scene);
  surround.parent=main;surround.material=mat(scene,'soft spell aura',color,1.4,.30);
  const spark=B.MeshBuilder.CreateSphere('color gleam',{diameter:size*.65,segments:10},scene);
  spark.parent=main;spark.position.y=.03;spark.material=mat(scene,'glowing spell color',color,1.2);
  main.isPickable=false;surround.isPickable=false;spark.isPickable=false;
  return main;
}
export function vfxRing(scene,color,radius=1,width=.12){
  const ring=B.MeshBuilder.CreateTorus('clear radial magic wave',{diameter:radius*2,thickness:width,tessellation:56},scene);
  ring.material=mat(scene,'sharp glowing ring',color,1.1,.94);
  ring.isPickable=false;return ring;
}
export function crystal(scene,color='#b6f6ff',size=1){
  const m=B.MeshBuilder.CreatePolyhedron('crystal shard',{type:1,size:size},scene);
  m.material=mat(scene,'shimmering crystal',color,.85,.9);m.isPickable=false;
  return m;
}
export function visibleGroundPool(scene,color,radius){
  const floor=B.MeshBuilder.CreateDisc('winter spell ground', {radius,tessellation:48},scene);
  floor.rotation.x=Math.PI/2;
  floor.material=mat(scene,'winter mist floor',color,.6,.46);
  floor.isPickable=false;
  const edge=vfxRing(scene,'#dcfbff',radius,.15);edge.position.y=.065;
  return {floor,edge};
}
export function shieldDome(scene,radius=1.8){
  const dome=B.MeshBuilder.CreateSphere('shield force field',{diameter:radius*2,segments:20},scene);
  dome.material=mat(scene,'soft shield glow','#91f5d5',1.1,.23);
  dome.isPickable=false;
  return dome;
}
