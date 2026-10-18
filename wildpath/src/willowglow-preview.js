// Wildpath Tree Readability 1.0 — opt-in Willowglow art experiment.
// One V11 model at a time (S/M/L), not three 80k-triangle copies on an A51.
import {buildHeroTree} from '../tree-study/tree-model-v11.js?v=21.0';

export const WILLOWGLOW_SIZES=Object.freeze({S:1.056,M:1.32,L:1.584});
export const WILLOWGLOW_IN_GAME=Object.freeze({
  x:5.25,z:5.8,baseScale:.66,scale:WILLOWGLOW_SIZES.M,
  version:'11.0',mode:'tree-readability-1.0'
});

export function isWillowglowPreviewRequested(search,openWorld=true){
  return Boolean(openWorld && new URLSearchParams(search).get('willowglow')==='1');
}

export function mountWillowglowPreview(B,scene){
  // The production Wildpath camera and nature system are not touched.
  const tree=buildHeroTree(B,scene,null);
  const {x,z,baseScale}=WILLOWGLOW_IN_GAME;
  tree.root.position.set(x,0,z);
  tree.root.rotation.y=-.18;
  const meshes=tree.root.getChildMeshes(false);
  for(const mesh of meshes){
    mesh.isPickable=false;
    // Contrast tuned only on THIS preview's unique foliage materials.
    // Baked leaf/overlap geometry and Tree Study remain identical to V11.
    const mat=mesh.material;
    if(!mat)continue;
    if(mesh.name.includes('dark inner foliage')){
      mat.diffuseColor=B.Color3.FromHexString('#9aaf97');
      mat.ambientColor=B.Color3.FromHexString('#122b1e');
    }else if(mesh.name.includes('rich middle foliage')){
      mat.diffuseColor=B.Color3.FromHexString('#d0e4b7');
      mat.ambientColor=B.Color3.FromHexString('#263d2a');
    }else if(mesh.name.includes('lit exterior foliage')){
      mat.diffuseColor=B.Color3.FromHexString('#fff8d3');
      mat.ambientColor=B.Color3.FromHexString('#50673b');
    }
  }

  // Cheap painted contact instead of an expensive real-time ShadowGenerator.
  const texture=new B.DynamicTexture('Willowglow / readability contact',
    {width:128,height:128},scene,false);
  const ctx=texture.getContext();
  ctx.clearRect(0,0,128,128);
  const gradient=ctx.createRadialGradient(64,64,4,64,64,63);
  gradient.addColorStop(0,'rgba(255,255,255,.63)');
  gradient.addColorStop(.44,'rgba(255,255,255,.36)');
  gradient.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=gradient;
  ctx.fillRect(0,0,128,128);
  texture.hasAlpha=true;
  texture.update();
  const shadowMat=new B.StandardMaterial('Willowglow / readability shadow',scene);
  shadowMat.diffuseColor=B.Color3.FromHexString('#25382b');
  shadowMat.opacityTexture=texture;
  shadowMat.alpha=.41;
  shadowMat.disableLighting=true;
  shadowMat.backFaceCulling=false;
  shadowMat.zOffset=-1;
  const shadow=B.MeshBuilder.CreateGround('Willowglow / ground contact',
    {width:6.7,height:6.0,subdivisions:1},scene);
  shadow.position.set(x,-.098,z);
  shadow.isPickable=false;
  shadow.receiveShadows=false;
  shadow.material=shadowMat;

  let selectedSize='M';
  function setSize(size){
    if(!Object.hasOwn(WILLOWGLOW_SIZES,size))return false;
    selectedSize=size;
    const scale=WILLOWGLOW_SIZES[size];
    tree.root.scaling.setAll(scale);
    shadow.scaling.setAll(scale/baseScale);
    return true;
  }
  setSize(selectedSize);

  // Never enters NatureGrowth: no gameplay collision, XP, targeting, fusion,
  // duplicate trees on restart, or extra geometry on size switch.
  return Object.freeze({
    position:{x,z},baseScale,version:WILLOWGLOW_IN_GAME.version,
    get scale(){return WILLOWGLOW_SIZES[selectedSize];},
    get size(){return selectedSize;},setSize,
    root:tree.root,meshes:meshes.length,stats:tree.stats,shadow
  });
}
