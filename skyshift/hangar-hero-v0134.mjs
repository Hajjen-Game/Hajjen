// SKYSHIFT 0.13.4 — restrained 3/4 Stingray showroom camera and two
// hangar-only rim/key lights. Uses the ACTUAL existing world track backdrop;
// no artificial platform, orbiting props, new menu buttons or gameplay lights.
export const HANGAR_HERO_0134=Object.freeze({
 version:"stingray-full-silhouette-showroom-0134",
 localEye:Object.freeze([3.50,4.10,13.50]),
 localLook:Object.freeze([-5.0,.15,1.25]),
 heroFov:50.5,
 keyColor:0xaacbf0,keyIntensity:.68,
 rimColor:0x9a80e7,rimIntensity:.34,
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
  HANGAR_HERO_0134.keyColor,HANGAR_HERO_0134.keyIntensity);
 const rim=new THREE.DirectionalLight(
  HANGAR_HERO_0134.rimColor,HANGAR_HERO_0134.rimIntensity);
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
  // At 1536×690 landscape, nose, wing tips and final tail plate project
  // into the right-side showcase (x≈800–1300, y≈330–555). No cropped tail.
  // Stable ship-local camera, not an orbit causing disorienting scale.
  const arc=.08*Math.sin(time*.24);
  eye.set(HANGAR_HERO_0134.localEye[0]+arc,
   HANGAR_HERO_0134.localEye[1]+.025*Math.sin(time*.19),
   HANGAR_HERO_0134.localEye[2]+.055*Math.cos(time*.17));
  ship.localToWorld(eye);
  look.set(...HANGAR_HERO_0134.localLook);
  ship.localToWorld(look);
  camera.position.copy(eye);
  camera.lookAt(look);
  if(Math.abs(camera.fov-HANGAR_HERO_0134.heroFov)>.01){
   camera.fov=HANGAR_HERO_0134.heroFov;
   camera.updateProjectionMatrix();
  }
  peakFov=Math.max(peakFov,camera.fov);
  // Lighting reveals the actual surface curvature and cockpit; both
  // directional lights are completely disabled during real racing.
  ship.localToWorld(lightPos.set(0,.34,.25));
  focus.position.copy(lightPos);
  ship.localToWorld(lightPos.set(-3.7,6.0,4.6));
  key.position.copy(lightPos);
  ship.localToWorld(lightPos.set(3.8,3.8,-3.7));
  rim.position.copy(lightPos);
  key.target.updateMatrixWorld();rim.target.updateMatrixWorld();
  return true;
 }
 return {frame,disable(){key.visible=false;rim.visible=false;enabled=false},
  stats(){return {version:HANGAR_HERO_0134.version,enabled,
   frames,shownFrames,peakFov:+peakFov.toFixed(2),
   lightsVisible:(key.visible?1:0)+(rim.visible?1:0),
   extraLightsInRace:0,physicalFlightUnchanged:true,
   worldTrackVisible:true,profile:"full-silhouette-three-quarter"};},
  dispose(){scene.remove(key,rim,focus);key.dispose?.();rim.dispose?.();}};
}
