// SKYSHIFT 0.4.3 – HDR pipeline with gently adaptive INTERNAL resolution.
// The visible canvas retains native device DPR. Only the expensive offscreen
// composer targets scale after sustained slow frames. Original neon tuning stays.
import {
  createNeonPipeline as createOriginalPipeline,
  createNeonKit,NEON_TUNING,brightnessHierarchy
} from "./neon-v032.mjs";
export {createNeonKit,NEON_TUNING,brightnessHierarchy};

export function createNeonPipeline(THREE,renderer,scene,camera){
  const pipeline=createOriginalPipeline(THREE,renderer,scene,camera);
  pipeline.internalPixelRatio=renderer.getPixelRatio();
  pipeline.setInternalPixelRatio=(ratio,width,height)=>{
    const safe=Math.max(1,Math.min(renderer.getPixelRatio(),ratio));
    if(Math.abs(safe-pipeline.internalPixelRatio)<.001)return;
    pipeline.internalPixelRatio=safe;
    pipeline.composer.setPixelRatio(safe);
    pipeline.composer.setSize(width,height);
  };
  return pipeline;
}
