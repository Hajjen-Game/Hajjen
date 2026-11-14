// SKYSHIFT 0.4.9.8 — HDR-preserving, real postprocess anti-aliasing.
// Three.js r180 SMAAPass blends edges in linear-sRGB BEFORE OutputPass.
// Renderer canvas MSAA cannot resolve the offscreen EffectComposer scene.
import {EffectComposer} from "three/addons/postprocessing/EffectComposer.js";
import {RenderPass} from "three/addons/postprocessing/RenderPass.js";
import {UnrealBloomPass} from "three/addons/postprocessing/UnrealBloomPass.js";
import {SMAAPass} from "three/addons/postprocessing/SMAAPass.js";
import {OutputPass} from "three/addons/postprocessing/OutputPass.js";
import {createNeonKit,NEON_TUNING,brightnessHierarchy} from "./neon-v032.mjs";
export {createNeonKit,NEON_TUNING,brightnessHierarchy};
export const CLARITY_PASS_ORDER=Object.freeze([
 "RenderPass","UnrealBloomPass","SMAAPass","OutputPass"
]);
export function createNeonPipeline(THREE,renderer,scene,camera){
 const composer=new EffectComposer(renderer);
 composer.setPixelRatio(renderer.getPixelRatio());
 const scenePass=new RenderPass(scene,camera);
 const bloom=new UnrealBloomPass(new THREE.Vector2(1,1),
  NEON_TUNING.bloomStrength,NEON_TUNING.bloomRadius,
  NEON_TUNING.bloomThreshold);
 const smaa=new SMAAPass();
 const output=new OutputPass();
 composer.addPass(scenePass);
 composer.addPass(bloom);
 composer.addPass(smaa);
 composer.addPass(output);
 const pipeline={
  composer,bloom,smaa,output,
  antialiasing:"SMAA",
  passOrder:CLARITY_PASS_ORDER,
  internalPixelRatio:renderer.getPixelRatio(),
  resize(width,height){
   composer.setSize(width,height);
  },
  setInternalPixelRatio(ratio,width,height){
   // Canvas stays at selected device DPR, but all post FX and SMAA
   // resolution uniforms resize together, avoiding blurry resampling.
   const safe=Math.max(1,Math.min(renderer.getPixelRatio(),ratio));
   if(Math.abs(safe-this.internalPixelRatio)<.001)return;
   this.internalPixelRatio=safe;
   composer.setPixelRatio(safe);
   composer.setSize(width,height);
  },
  render(deltaTime){composer.render(deltaTime);},
  dispose(){
   composer.dispose();
   bloom.dispose();
   smaa.dispose();
   output.dispose?.();
  }
 };
 return pipeline;
}
