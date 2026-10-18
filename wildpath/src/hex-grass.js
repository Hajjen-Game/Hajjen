// Wildpath / Daisugi Hex Grass 1.2 — robust, baked into proven original floor.
// NO replacement mesh and NO hidden ground. This is only a color sampler:
// Babylon's original CreateGround and original material remain on screen.
const SQRT3=Math.sqrt(3);
export const HEX_GRASS_SIZE=3.2;
export const HEX_GRASS_SUBDIVISIONS=160;
// Five grounded, clearly different green pigments. Natural, no black outlines.
// Exact base colour still comes from the original woodland radial gradient.
export const HEX_GRASS_COLORS=Object.freeze([
  '#317e5d', // deep fern
  '#408e61', // moss
  '#4f9f61', // clover
  '#60af6c', // fresh green
  '#74bd75'  // sunlit grass
]);
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const rgb=h=>({r:parseInt(h.slice(1,3),16)/255,
  g:parseInt(h.slice(3,5),16)/255,
  b:parseInt(h.slice(5,7),16)/255});
const PIGMENTS=HEX_GRASS_COLORS.map(rgb);
function shadeId(q,r){
  let n=(Math.imul(q,374761393)+Math.imul(r,668265263)+0x9e3779b9)|0;
  n=Math.imul(n^(n>>>13),1274126177);
  return ((n^(n>>>16))>>>0)%PIGMENTS.length;
}
// Pointy-top hex axial coordinates. Cube-rounding gives a unique tile.
// Its sample always spans the existing 180 x 180 m floor: no extra mesh.
export function hexGrassCell(x,z,side=HEX_GRASS_SIZE){
  const q0=(SQRT3*x/3-z/3)/side,r0=(2*z/3)/side;
  const a=q0,b=-q0-r0,c=r0;
  let q=Math.round(a),y=Math.round(b),r=Math.round(c);
  const da=Math.abs(q-a),db=Math.abs(y-b),dc=Math.abs(r-c);
  if(da>db&&da>dc)q=-y-r;
  else if(db>dc)y=-q-r;
  else r=-q-y;
  return {q,r,shade:shadeId(q,r),
    x:SQRT3*side*(q+r/2),z:1.5*side*r};
}
export function sampleHexGrass(x,z,base,side=HEX_GRASS_SIZE){
  const cell=hexGrassCell(x,z,side);
  const dx=x-cell.x,dz=z-cell.z;
  // Distance inside the six edges. Blend toward underlying meadow only
  // at boundaries; full coloured hex bodies stay readable on a phone.
  let nearest=Infinity;
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3;
    nearest=Math.min(nearest,SQRT3*side/2-
      (dx*Math.cos(a)+dz*Math.sin(a)));
  }
  const smooth=clamp(nearest/.76);
  const fade=smooth*smooth*(3-2*smooth);
  const strength=.25+.72*fade;
  const tint=PIGMENTS[cell.shade];
  return {
    r:clamp(base.r+(tint.r-base.r)*strength),
    g:clamp(base.g+(tint.g-base.g)*strength),
    b:clamp(base.b+(tint.b-base.b)*strength)
  };
}
