// SKYSHIFT 0.3.1 – premium neon identity.
// Three.js WebGL HDR bloom: a narrow white core, saturated colored body,
// restrained geometry halo and physically blurred light. The gameplay surface
// stays below the bloom threshold so dangerous gaps remain sharply legible.
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export const NEON_TUNING=Object.freeze({
  // Intentionally target modern phones instead of optimizing around Galaxy A51.
  maxPixelRatio:2,
  bloomStrength:1.18,
  bloomRadius:.48,
  bloomThreshold:1.06,
  edgeBodyLuminance:2.05,
  edgeCoreLuminance:3.6,
  jumpLuminance:2.1,
  haloOpacity:.16
});

export function createNeonPipeline(THREE,renderer,scene,camera){
  const composer=new EffectComposer(renderer);
  composer.setPixelRatio(renderer.getPixelRatio());
  const render=new RenderPass(scene,camera);
  const bloom=new UnrealBloomPass(new THREE.Vector2(1,1),
    NEON_TUNING.bloomStrength,NEON_TUNING.bloomRadius,NEON_TUNING.bloomThreshold);
  const output=new OutputPass();
  composer.addPass(render);
  composer.addPass(bloom);
  composer.addPass(output);
  const pipeline={
    composer,bloom,
    resize(width,height){
      composer.setSize(width,height);
    },
    render(deltaTime){
      composer.render(deltaTime);
    },
    dispose(){
      composer.dispose();
      bloom.dispose();
      output.dispose?.();
    }
  };
  return pipeline;
}

function emit(THREE,hex,intensity,extras={}){
  const c=new THREE.Color(hex).multiplyScalar(intensity);
  return new THREE.MeshBasicMaterial({
    color:c,side:THREE.DoubleSide,toneMapped:false,...extras
  });
}
export function createNeonKit(THREE){
  const kit={
    // Light hierarchy: subtle halo / rich color body / high-luminance pale core.
    edgeBody:emit(THREE,0x43ddf0,NEON_TUNING.edgeBodyLuminance),
    edgeCore:emit(THREE,0xe1fbff,NEON_TUNING.edgeCoreLuminance),
    edgeHalo:emit(THREE,0x43ddf0,.88,{
      transparent:true,opacity:NEON_TUNING.haloOpacity,
      blending:THREE.AdditiveBlending,depthWrite:false
    }),
    warning:emit(THREE,0xffbe6b,NEON_TUNING.jumpLuminance),
    landing:emit(THREE,0xd7faff,2.6,{
      transparent:true,opacity:.95,depthWrite:false
    }),
    beacon:emit(THREE,0x43ddf0,2.45),
    beaconCore:emit(THREE,0xf4fdff,3.9),
    beaconHalo:emit(THREE,0x43ddf0,.84,{
      transparent:true,opacity:.13,
      blending:THREE.AdditiveBlending,depthWrite:false
    }),
    ship:emit(THREE,0x43ddf0,3.0),
    worldAccent:new THREE.Color(0x43ddf0),
    colorFromAccent(hex){
      return new THREE.Color(hex);
    },
    updateAccent(hex,blend=.12){
      const target=new THREE.Color(hex);
      const soften=THREE.MathUtils.clamp(blend,0,1);
      kit.worldAccent.lerp(target,soften);
      kit.edgeBody.color.copy(kit.worldAccent).multiplyScalar(NEON_TUNING.edgeBodyLuminance);
      kit.edgeHalo.color.copy(kit.worldAccent).multiplyScalar(.88);
      kit.beacon.color.copy(kit.worldAccent).multiplyScalar(2.45);
      kit.beaconHalo.color.copy(kit.worldAccent).multiplyScalar(.84);
      kit.ship.color.copy(kit.worldAccent).multiplyScalar(3.0);
      kit.edgeCore.color.copy(new THREE.Color(0xf4fdff).lerp(kit.worldAccent,.18))
        .multiplyScalar(NEON_TUNING.edgeCoreLuminance);
      kit.beaconCore.color.copy(new THREE.Color(0xffffff).lerp(kit.worldAccent,.13))
        .multiplyScalar(3.9);
    },
    dispose(){
      for(const [key,mat] of Object.entries(kit)){
        if(mat?.isMaterial)mat.dispose();
      }
    }
  };
  return kit;
}

// HDR glow should be strong enough to radiate, but not oversaturate the entire
// platform. These formulas are shared with the regression tests.
export function brightnessHierarchy(){
  return {
    background:0.15,
    road:0.42,
    halo:0.88*NEON_TUNING.haloOpacity,
    body:NEON_TUNING.edgeBodyLuminance,
    core:NEON_TUNING.edgeCoreLuminance,
    bloomThreshold:NEON_TUNING.bloomThreshold
  };
}
