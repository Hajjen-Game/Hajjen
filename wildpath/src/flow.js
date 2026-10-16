// Gameplay Flow 0.6: short stages, local wave transitions and full backtracking.
export function nextTravelZ(z,dz,stage,stageReady,stageGates,boardStart){
  const upper=stageGates[Math.min(stage,stageGates.length-1)]-(stageReady?0:.8);
  return Math.max(boardStart+1,Math.min(upper,z+dz));
}
// A boost changes the wave, not the player's position.
// This deliberately avoids invisible long-distance teleports.
export function positionAfterBlessing({x,z}){
  return {x,z};
}
// Camera follows the actual hero even when retreating into an earlier glade.
export function cameraAnchorZ(z,behind){return z-behind;}
