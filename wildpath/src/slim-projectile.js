/**
 * Wildpath mobile projectile: deliberately only TWO colored surfaces.
 * 1. One tapered cyan tail; 2. one bright, narrow diamond core.
 * All dimensions are CSS pixels. No glow stacks, particles, wobble or ribbon meshes.
 * Combat is unchanged; called by Pixi in the existing Babylon/Pixi hybrid.
 */
export const SLIM_GLINT = Object.freeze({
  tailPx: 17.5,
  tailHalfWidthPx: 1.35,
  coreLengthPx: 4.8,
  coreHalfWidthPx: 1.75,
  maxVisualLengthPx: 23
});
export function slimGlintGeometry(from,to,scale=1){
  if(!from||!to)return null;
  const dx=to.x-from.x,dy=to.y-from.y,d=Math.hypot(dx,dy);
  if(!Number.isFinite(d)||d<1e-5)return null;
  const k=Math.max(.72,Math.min(1.1,Number.isFinite(scale)?scale:1));
  const ux=dx/d,uy=dy/d,nx=-uy,ny=ux;
  const point=(back,side=0)=>({x:to.x-ux*back+nx*side,y:to.y-uy*back+ny*side});
  const coreLen=SLIM_GLINT.coreLengthPx*k,coreW=SLIM_GLINT.coreHalfWidthPx*k;
  const tailLen=Math.min(SLIM_GLINT.tailPx*k,d+2);
  // Start is subpixel-thin; the front blends into the bright core.
  const trail=[
    point(coreLen*.53,-SLIM_GLINT.tailHalfWidthPx*k),
    point(tailLen,-.13*k),
    point(tailLen,.13*k),
    point(coreLen*.53,SLIM_GLINT.tailHalfWidthPx*k)
  ];
  const core=[
    point(-.55*k),
    point(coreLen*.49,-coreW),
    point(coreLen),
    point(coreLen*.49,coreW)
  ];
  return {trail,core,tailLength:tailLen,coreLength:coreLen};
}
function polygon(g,points,color,alpha){
  g.moveTo(points[0].x,points[0].y);
  for(let i=1;i<points.length;i++)g.lineTo(points[i].x,points[i].y);
  g.closePath().fill({color,alpha});
}
/** Exactly two draw calls, regardless of zoom or the number of targets. */
export function drawSlimGlint(g,from,to,scale=1){
  const shape=slimGlintGeometry(from,to,scale);
  if(!shape)return false;
  polygon(g,shape.trail,0x62c9eb,.77);
  polygon(g,shape.core,0xedffff,.99);
  return true;
}
