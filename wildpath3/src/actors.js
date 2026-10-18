// Wildpath 3.0 Pass 1.1 — restore the original Wildpath 2.x capsule identity.
// The shared model builder is intentionally imported, not copied or reinvented.
// Its original root/body/arms/eyes/face silhouettes are already mobile-friendly.
import {createActor} from '../../wildpath/src/actors-v2.js?v=3.1.0';

export function createCharacter(scene,type='hero'){
  const actor=createActor(scene,type==='hero'?'caster':type,type!=='hero');
  actor.root.name='wildpath3 original silhouette '+type;
  return {...actor,torso:actor.body,kind:type,baseY:0};
}
export function setCharacterPose(actor,x,z,t,velocity=0){
  const moving=Math.min(1,Math.max(0,velocity/6));
  actor.root.position.set(x,moving*Math.abs(Math.sin(t*9))*.055,z);
  actor.root.rotation.y=Math.sin(t*2.6)*.028;
  // Subtle readable arm motion without changing hitboxes or gameplay.
  actor.leftArm.rotation.z=Math.sin(t*7.5)*.09*moving;
  actor.rightArm.rotation.z=-Math.sin(t*7.5)*.09*moving;
  // Nonlethal hit squash returns to the original capsule size each frame.
  if(actor.body.scaling.x!==1)actor.body.scaling.x+=(1-actor.body.scaling.x)*.25;
}
