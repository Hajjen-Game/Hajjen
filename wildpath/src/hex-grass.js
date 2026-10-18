// Wildpath / Daisugi Hex Grass 1.3 — crisp hexagons on the ORIGINAL floor.
// Draw a small, one-time color atlas on a canvas and apply to the established
// Babylon StandardMaterial. Never hide, replace or raise the actual ground.
// If texture generation fails: leave the original green grass untouched.
const SQRT3=Math.sqrt(3);
export const HEX_GRASS_SIZE=3.2;
export const HEX_GRASS_TEXTURE_SIZE=2048;
// Moderately contrasting transparent-ish pigment TINTS. These are multiplied
// by the original woodland vertex colors, keeping its radial green gradient.
export const HEX_GRASS_TINTS=Object.freeze([
  '#91c797', // dark moss
  '#b0d79e', // clover green
  '#c9eaae', // warm meadow
  '#e0f3c8', // soft lime
  '#f4ffe0'  // pale sunlit green
]);
function shadeId(q,r){
  let n=(Math.imul(q,374761393)+Math.imul(r,668265263)+0x9e3779b9)|0;
  n=Math.imul(n^(n>>>13),1274126177);
  return ((n^(n>>>16))>>>0)%HEX_GRASS_TINTS.length;
}
export function hexVertices(cx,cy,radius){
  const result=[];
  for(let i=0;i<6;i++){
    const a=Math.PI/6+i*Math.PI/3;
    result.push({x:cx+Math.cos(a)*radius,y:cy+Math.sin(a)*radius});
  }
  return result;
}
export function hexTileLayout(floorWidth,side=HEX_GRASS_SIZE){
  if(!(floorWidth>0&&side>0))throw new RangeError('Positive floor width and hex size required');
  const half=floorWidth/2,dx=SQRT3*side,dz=1.5*side,tiles=[];
  const rowLimit=Math.ceil((half+side)/dz);
  for(let r=-rowLimit;r<=rowLimit;r++){
    const z=dz*r;
    const start=Math.floor((-half-side*2)/dx-r/2);
    const end=Math.ceil((half+side*2)/dx-r/2);
    for(let q=start;q<=end;q++){
      const x=dx*(q+r/2);
      if(Math.abs(x)>half+side||Math.abs(z)>half+side)continue;
      tiles.push({q,r,x,z,shade:shadeId(q,r)});
    }
  }
  return tiles;
}
// This is intentionally plain Canvas 2D. It avoids glsl custom shaders,
// z-fighting, extra 3D meshes and interpolation-induced green blobs.
export function paintHexGrass(ctx,{textureSize=HEX_GRASS_TEXTURE_SIZE,
  floorWidth,side=HEX_GRASS_SIZE}){
  if(!ctx||!(textureSize>0))throw new TypeError('Canvas context required');
  const scale=textureSize/floorWidth,half=floorWidth/2;
  ctx.fillStyle='#e3f2d8';
  ctx.fillRect(0,0,textureSize,textureSize);
  const cells=hexTileLayout(floorWidth,side);
  for(const tile of cells){
    const x=(tile.x+half)*scale,y=(tile.z+half)*scale;
    const vertices=hexVertices(x,y,side*scale);
    const shade=HEX_GRASS_TINTS[tile.shade];
    ctx.beginPath();
    ctx.moveTo(vertices[0].x,vertices[0].y);
    for(let k=1;k<6;k++)ctx.lineTo(vertices[k].x,vertices[k].y);
    ctx.closePath();
    ctx.fillStyle=shade;
    ctx.fill();
    // Seal subpixel joins using the same shade — no visible dark outlines.
    ctx.strokeStyle=shade;
    ctx.lineWidth=1.1;
    ctx.stroke();
  }
  return {cells:cells.length,shades:HEX_GRASS_TINTS.length,
    textureSize,side,scale};
}
// Call AFTER the original ground was constructed/material assigned.
// Never mutate ground mesh geometry or visibility, and fall back safely.
export function applyHexGrassToGround(scene,ground,{floorWidth}){
  const B=window.BABYLON;
  if(!B.DynamicTexture) return {applied:false,reason:'texture-unsupported'};
  const material=ground?.material;
  if(!material)return {applied:false,reason:'material-missing'};
  const previous=material.diffuseTexture??null;
  let atlas=null;
  try{
    atlas=new B.DynamicTexture('wildpath daisugi hex grass atlas',
      {width:HEX_GRASS_TEXTURE_SIZE,height:HEX_GRASS_TEXTURE_SIZE},
      scene,false,B.Texture?.BILINEAR_SAMPLINGMODE);
    const ctx=atlas.getContext();
    const report=paintHexGrass(ctx,{floorWidth});
    atlas.hasAlpha=false;
    atlas.update(false);
    if(typeof atlas.isReady==='function'&&!atlas.isReady())
      throw new Error('Hex atlas was not ready');
    material.diffuseTexture=atlas;
    // Retain all existing material lighting and original vertex colors.
    // UV sampling modifies only the surface pigment, never the world.
    return {applied:true,...report};
  }catch(error){
    material.diffuseTexture=previous;
    try{atlas?.dispose()}catch{}
    console.warn('Hex Grass texture fallback to original meadow:',error);
    return {applied:false,reason:'atlas-failed'};
  }
}
