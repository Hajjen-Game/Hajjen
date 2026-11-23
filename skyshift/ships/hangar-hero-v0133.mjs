// SKYSHIFT 0.13.3 — restrained 3/4 Stingray showroom camera and two
// hangar-only rim/key lights. Uses the ACTUAL existing world track backdrop;
// no artificial platform, orbiting props, new menu buttons or gameplay lights.
export const HANGAR_HERO_0133=Object.freeze({
 version:"stingray-hero-showroom-0133",
 localEye:Object.freeze([3.55,2.70,7.55]),
 localLook:Object.freeze([-4.35,.29,.26]),
 heroFov:61.5,
 keyColor:0xd0eeff,keyIntensity:1.15,
 rimColor:0xa879fb,rimIntensity:.70,
 showroomLights:2,gameplayLights:0,extraRenderPasses:0,
 originalRaceCameraUnchanged:true,originalTrackVisible:true,
 rotationPerSecond:.0,additionalCameraShake:false,
 playerPhysicsUnchanged:true
});
export function createStingrayHeroShowroom(THREE,scene){
 const focus=new THREE.Object3D();
 focus.name="Hangar Stingray art focus — no geometry";
 scene.add(focus);
 const key=new THREE.DirectionalLight(
  HANGAR_HERO_0133.keyColor,HANGAR_HERO_0133.keyIntensity);
 const rim=new THREE.DirectionalLight(
  HANGAR_HERO_0133.rimColor,HANGAR_HERO_0133.rimIntensity);
 key.name="Hangar only · sculpted wing highlight";
 rim.name="Hangar only · Stingray canopy and tail rim";
 key.castShadow=false;rim.castShadow=false;
 key.target=focus;rim.target=focus;
 key.visible=false;rim.visible=false;
 scene.add(key,rim);
 const eye=new THREE.Vector3(),look=new THREE.Vector3(),
  lightPos=new THREE.Vector3();
 let frames=0,shownFrames=0,enabled=false,peakFov=0;
 function frame({hangar=false,ship=null,shipId="",camera=null,time=0}={}){
  frames++;
  const shouldShow=hangar&&shipId==="stingray"&&!!ship&&!!camera;
  if(!shouldShow){
   key.visible=false;rim.visible=false;enabled=false;
   return false;
  }
  key.visible=true;rim.visible=true;enabled=true;shownFrames++;
  // CAMERA: stable rear-three-quarter hero view, relative to the actual
  // ship heading. Full manta wing span and raised canopy remain legible.
  const arc=.13*Math.sin(time*.24);
  eye.set(HANGAR_HERO_0133.localEye[0]+arc,
   HANGAR_HERO_0133.localEye[1]+.04*Math.sin(time*.19),
   HANGAR_HERO_0133.localEye[2]+.12*Math.cos(time*.17));
  ship.localToWorld(eye);
  look.set(...HANGAR_HERO_0133.localLook);
  ship.localToWorld(look);
  camera.position.copy(eye);
  camera.lookAt(look);
  if(Math.abs(camera.fov-HANGAR_HERO_0133.heroFov)>.01){
   camera.fov=HANGAR_HERO_0133.heroFov;
   camera.updateProjectionMatrix();
  }
  peakFov=Math.max(peakFov,camera.fov);
  // Lighting reveals the actual surface curvature and cockpit; both
  // directional lights are completely disabled during real racing.
  ship.localToWorld(lightPos.set(0,.34,.25));
  focus.position.copy(lightPos);
  ship.localToWorld(lightPos.set(-2.9,5.2,3.4));
  key.position.copy(lightPos);
  ship.localToWorld(lightPos.set(3.9,2.9,-2.5));
  rim.position.copy(lightPos);
  key.target.updateMatrixWorld();rim.target.updateMatrixWorld();
  return true;
 }
 return {frame,disable(){key.visible=false;rim.visible=false;enabled=false},
  stats(){return {version:HANGAR_HERO_0133.version,enabled,
   frames,shownFrames,peakFov:+peakFov.toFixed(2),
   lightsVisible:(key.visible?1:0)+(rim.visible?1:0),
   extraLightsInRace:0,physicalFlightUnchanged:true,
   worldTrackVisible:true,profile:"three-quarter"};},
  dispose(){scene.remove(key,rim,focus);key.dispose?.();rim.dispose?.();}};
}
