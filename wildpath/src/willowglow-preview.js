// Willowglow in-game art review. Only enabled through ?willowglow=1 in
// Wildpath's real open-world mode; the production nature system stays intact.
// Uses the EXACT same 11.0 mesh, with no copy of the 79k-triangle canopy.
import {buildHeroTree} from '../tree-study/tree-model-v11.js?v=21.0';

export const WILLOWGLOW_IN_GAME=Object.freeze({
  x:5.25, z:5.8, scale:.66,
  version:'11.0', mode:'single-preview-only'
});

export function isWillowglowPreviewRequested(search,openWorld=true){
  return Boolean(openWorld && new URLSearchParams(search).get('willowglow')==='1');
}

export function mountWillowglowPreview(B,scene){
  const tree=buildHeroTree(B,scene,null);
  const {x,z,scale}=WILLOWGLOW_IN_GAME;
  tree.root.position.set(x,0,z);
  tree.root.scaling.setAll(scale);
  tree.root.rotation.y=-.18;
  const meshes=tree.root.getChildMeshes(false);
  for(const mesh of meshes)mesh.isPickable=false;

  // A single cheap painted contact shade. The production world has no
  // expensive per-tree ShadowGenerator; foliage keeps its authored dark cores.
  const texture=new B.DynamicTexture('Willowglow art test / contact shade',
    {width:128,height:128},scene,false);
  const ctx=texture.getContext();
  ctx.clearRect(0,0,128,128);
  const gradient=ctx.createRadialGradient(64,64,4,64,64,63);
  gradient.addColorStop(0,'rgba(255,255,255,.58)');
  gradient.addColorStop(.40,'rgba(255,255,255,.31)');
  gradient.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=gradient;
  ctx.fillRect(0,0,128,128);
  texture.hasAlpha=true;
  texture.update();
  const shadowMat=new B.StandardMaterial('Willowglow art test / soft ground shade',scene);
  shadowMat.diffuseColor=B.Color3.FromHexString('#24382d');
  shadowMat.opacityTexture=texture;
  shadowMat.alpha=.37;
  shadowMat.disableLighting=true;
  shadowMat.backFaceCulling=false;
  shadowMat.zOffset=-1;
  const shadow=B.MeshBuilder.CreateGround('Willowglow art test / ground contact',
    {width:6.7,height:6.0,subdivisions:1},scene);
  shadow.position.set(x,-.098,z);
  shadow.isPickable=false;
  shadow.receiveShadows=false;
  shadow.material=shadowMat;

  // Remains a single static decoration across restarts, not a plant in
  // NatureGrowth. No collider, no new spell target, no fusion/progression edits.
  return Object.freeze({
    position:{x,z},scale,version:WILLOWGLOW_IN_GAME.version,
    root:tree.root,meshes:meshes.length,stats:tree.stats,
    shadow
  });
}
