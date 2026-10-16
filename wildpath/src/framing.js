// Pure camera framing helpers. Do not couple field-of-view to device height:
 // every phone must show the COMPLETE physical width of the level.
export function widthLockedFrustum(renderWidth,renderHeight,worldWidth=29.4){
  if(!(renderWidth>0&&renderHeight>0&&worldWidth>0)) throw new RangeError('Invalid viewport');
  const halfWidth=worldWidth/2;
  const halfHeight=halfWidth*renderHeight/renderWidth;
  return {left:-halfWidth,right:halfWidth,top:halfHeight,bottom:-halfHeight};
}
export const CAMERA_HEIGHT=56;
export const CAMERA_BEHIND=18;
export const CAMERA_AIM_AHEAD=12;
export const CAMERA_LOOK_DISTANCE=CAMERA_BEHIND+CAMERA_AIM_AHEAD;
// Pure estimate of forward-visible trail length at the ground plane.
export function visibleTrailAhead(renderWidth,renderHeight,worldWidth=29.4){
  const f=widthLockedFrustum(renderWidth,renderHeight,worldWidth);
  const tilt=Math.atan2(CAMERA_HEIGHT,CAMERA_LOOK_DISTANCE);
  return CAMERA_AIM_AHEAD+f.top/Math.sin(tilt);
}
