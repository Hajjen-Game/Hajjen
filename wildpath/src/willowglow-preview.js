// Willowglow Tree Production Fit 1.0: live A/B without replacing the forest.
// Both looks occupy ONE shared preview position; only one tree exists at a time.
import {buildHeroTree} from '../tree-study/tree-model-v11.js?v=21.0';
import {buildLowPolyWillowglow,WILLOWGLOW_PALETTES}
  from './willowglow-lowpoly.js?v=1.0.0';
export {WILLOWGLOW_PALETTES} from './willowglow-lowpoly.js?v=1.0.0';

export const WILLOWGLOW_SIZES=Object.freeze({S:1.056,M:1.32,L:1.584});
export const WILLOWGLOW_STYLES=Object.freeze(['lowpoly','original']);
export const WILLOWGLOW_IN_GAME=Object.freeze({
  x:5.25,z:5.8,baseScale:.66,scale:WILLOWGLOW_SIZES.M,
  version:'low-poly-1.0',mode:'tree-production-fit-1.0'
});
export function isWillowglowPreviewRequested(search,openWorld=true){
  return Boolean(openWorld && new URLSearchParams(search).get('willowglow')==='1');
}
function tuneOriginalFoliage(B,tree){
  for(const mesh of tree.root.getChildMeshes(false)){
    mesh.isPickable=false;
    // Preserve Tree Readability 1.0 tuning, without editing Tree Study 11.
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
}
function disposeTree(tree){
  const materials=new Set(tree.root.getChildMeshes(false).map(mesh=>mesh.material));
  tree.root.dispose(false,false);
  for(const material of materials)material?.dispose(false,true);
}
export function mountWillowglowPreview(B,scene,{initialStyle='lowpoly'}={}){
  if(!WILLOWGLOW_STYLES.includes(initialStyle))initialStyle='lowpoly';
  const {x,z,baseScale}=WILLOWGLOW_IN_GAME;
  let selectedSize='M',selectedStyle=initialStyle,selectedPalette='mixed';
  function createTree(style){
    const next=style==='original'
      ? buildHeroTree(B,scene,null)
      : buildLowPolyWillowglow(B,scene,{palette:selectedPalette});
    if(style==='original')tuneOriginalFoliage(B,next);
    next.root.position.set(x,0,z);
    next.root.rotation.y=-.18;
    next.root.scaling.setAll(WILLOWGLOW_SIZES[selectedSize]);
    for(const mesh of next.root.getChildMeshes(false))mesh.isPickable=false;
    return next;
  }
  let tree=createTree(selectedStyle);

  // Single cheap painted contact shadow reused across ALL art comparisons.
  const texture=new B.DynamicTexture('Willowglow / readability contact',
    {width:128,height:128},scene,false);
  const ctx=texture.getContext();
  ctx.clearRect(0,0,128,128);
  const gradient=ctx.createRadialGradient(64,64,4,64,64,63);
  gradient.addColorStop(0,'rgba(255,255,255,.63)');
  gradient.addColorStop(.44,'rgba(255,255,255,.36)');
  gradient.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  texture.hasAlpha=true;texture.update();
  const shadowMat=new B.StandardMaterial('Willowglow / readability shadow',scene);
  shadowMat.diffuseColor=B.Color3.FromHexString('#25382b');
  shadowMat.opacityTexture=texture;shadowMat.alpha=.41;
  shadowMat.disableLighting=true;shadowMat.backFaceCulling=false;
  shadowMat.zOffset=-1;
  const shadow=B.MeshBuilder.CreateGround('Willowglow / ground contact',
    {width:6.7,height:6.0,subdivisions:1},scene);
  shadow.position.set(x,-.098,z);
  shadow.isPickable=false;shadow.receiveShadows=false;shadow.material=shadowMat;
  function setSize(size){
    if(!Object.hasOwn(WILLOWGLOW_SIZES,size))return false;
    selectedSize=size;
    const scale=WILLOWGLOW_SIZES[size];
    tree.root.scaling.setAll(scale);
    shadow.scaling.setAll(scale/baseScale);
    return true;
  }
  function setStyle(style){
    if(!WILLOWGLOW_STYLES.includes(style))return false;
    if(style===selectedStyle)return true;
    const next=createTree(style);
    const old=tree;tree=next;selectedStyle=style;
    disposeTree(old);return true;
  }
  function setPalette(palette){
    if(!WILLOWGLOW_PALETTES.includes(palette))return false;
    if(selectedPalette===palette)return true;
    if(selectedStyle==='lowpoly'){
      // Rebuild ONLY the low-poly tree; palette/geometry are both baked.
      const old=tree;selectedPalette=palette;
      tree=createTree('lowpoly');
      disposeTree(old);
    }else selectedPalette=palette; // Remember choice when returning to LP.
    return true;
  }
  setSize(selectedSize);

  // Decorative, non-collidable and independent of NatureGrowth / fusion.
  // No new mesh on S/M/L, and only one hero tree is ever rendered.
  return Object.freeze({
    position:{x,z},baseScale,
    get version(){return selectedStyle==='original'?'11.0':'low-poly-1.0';},
    get scale(){return WILLOWGLOW_SIZES[selectedSize];},
    get size(){return selectedSize;},
    get style(){return selectedStyle;},
    get palette(){return selectedPalette;},
    get root(){return tree.root;},
    get meshes(){return tree.root.getChildMeshes(false).length;},
    get stats(){return tree.stats;},
    setSize,setStyle,setPalette,shadow
  });
}
