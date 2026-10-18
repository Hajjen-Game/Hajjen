// Wildpath / Daisugi Hex Grass 1.1 — visibility and contrast correction.
// One static, vertex-painted mesh of broad hexagons, with soft tonal edges.
// No textures, outlines, shaders, extra draw calls per tile or game collisions.
// Geometry creation is independent of Babylon, for reliable regression tests.
const SQRT3=Math.sqrt(3);
export const HEX_GRASS_SIZE=2.05;
export const HEX_GRASS_SHADES=Object.freeze([
  Object.freeze({r:-.105,g:-.128,b:-.088}), // forest green
  Object.freeze({r:-.052,g:-.061,b:-.035}), // deep leaf
  Object.freeze({r:.012,g:.010,b:.008}),    // baseline meadow
  Object.freeze({r:.069,g:.069,b:.033}),    // lime meadow
  Object.freeze({r:.132,g:.119,b:.064})     // bright fresh grass
]);
const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const blend=(a,b,t)=>({
  r:a.r+(b.r-a.r)*t,
  g:a.g+(b.g-a.g)*t,
  b:a.b+(b.b-a.b)*t
});
function baseMeadow(x,z,playRadius){
  // Matches the original woodland floor gradient without touching its logic.
  const sun={r:68/255,g:150/255,b:108/255},
    meadow={r:56/255,g:132/255,b:96/255},
    perimeter={r:36/255,g:89/255,b:73/255};
  const r=Math.min(1,Math.hypot(x,z)/(playRadius+22));
  const variation=.08*Math.sin(x*.105+z*.071)*Math.cos(z*.115-x*.044);
  return blend(blend(sun,meadow,clamp(r*.86+variation)),
    perimeter,Math.pow(r,1.55)*.74);
}
function shadeId(q,r){
  let n=(Math.imul(q,374761393)+Math.imul(r,668265263)+0x9e3779b9)|0;
  n=Math.imul(n^(n>>>13),1274126177);
  return ((n^(n>>>16))>>>0)%HEX_GRASS_SHADES.length;
}
export function buildHexGrassGeometry({floorWidth,playRadius,side=HEX_GRASS_SIZE}){
  if(!(floorWidth>0&&playRadius>0&&side>0))
    throw new RangeError('Hex Grass requires positive map measurements');
  const positions=[],colors=[],normals=[],indices=[];
  const shades=Array(HEX_GRASS_SHADES.length).fill(0);
  const half=floorWidth/2,stepX=SQRT3*side,stepZ=1.5*side;
  const rowMax=Math.ceil((half+side)/stepZ),angle=Math.PI/6;
  let count=0;
  const vertex=(x,z,c)=>{
    positions.push(x,0,z);
    normals.push(0,1,0);
    colors.push(clamp(c.r),clamp(c.g),clamp(c.b),1);
    return positions.length/3-1;
  };
  for(let r=-rowMax;r<=rowMax;r++){
    const z=r*stepZ;
    const colMin=Math.floor((-half-side*2)/stepX-r/2);
    const colMax=Math.ceil((half+side*2)/stepX-r/2);
    for(let q=colMin;q<=colMax;q++){
      const x=stepX*(q+r/2);
      if(Math.abs(x)>half+side||Math.abs(z)>half+side)continue;
      const shade=shadeId(q,r),d=HEX_GRASS_SHADES[shade];
      const base=baseMeadow(x,z,playRadius);
      const tinted={r:base.r+d.r,g:base.g+d.g,b:base.b+d.b};
      // Most of the cell keeps its own shade; the final 15% is
      // feathered towards the shared meadow color. 1.0 used .18 and
      // washed out nearly every hex on the actual phone screenshot.
      const edge=blend(base,tinted,.62);
      const center=vertex(x,z,tinted),inner=[],outer=[];
      for(let i=0;i<6;i++){
        const a=angle+i*Math.PI/3,cx=Math.cos(a),cz=Math.sin(a);
        inner.push(vertex(x+cx*side*.81,z+cz*side*.81,tinted));
        outer.push(vertex(x+cx*side,z+cz*side,edge));
      }
      for(let i=0;i<6;i++){
        const j=(i+1)%6;
        // Winding is counterclockwise when viewed from +Y in Babylon.
        // The original X/Z ring order otherwise faces DOWN and gets culled.
        indices.push(center,inner[j],inner[i]);
        indices.push(inner[i],outer[j],outer[i]);
        indices.push(inner[i],inner[j],outer[j]);
      }
      shades[shade]++;count++;
    }
  }
  return {positions,normals,colors,indices,count,shadeCounts:shades,side};
}
export function createHexGrass(scene,ground,{floorWidth,playRadius}){
  const B=window.BABYLON;
  const data=buildHexGrassGeometry({floorWidth,playRadius});
  const mesh=new B.Mesh('daisugi subtle green hex-grass field',scene);
  const vertices=new B.VertexData();
  vertices.positions=data.positions;
  vertices.normals=data.normals;
  vertices.colors=data.colors;
  vertices.indices=data.indices;
  vertices.applyToMesh(mesh,false);
  // This replaces only the *visual floor*. The underlying Babylon ground
  // and existing movement/collisions remain unchanged and are not disposed.
  mesh.position.y=ground.position.y;
  // Dedicated matte, UNLIT material: shared scene lighting was heavily
  // darkening vertex-colored grass on Android. Render palette faithfully.
  const material=new B.StandardMaterial('daisugi hex grass clear green',scene);
  material.diffuseColor=new B.Color3(1,1,1);
  material.ambientColor=new B.Color3(0,0,0);
  material.emissiveColor=new B.Color3(0,0,0);
  material.specularColor=new B.Color3(0,0,0);
  material.disableLighting=true;
  // Robust against driver/winding differences. This field replaces the
  // old floor, so backface culling must never leave an empty dark void.
  material.backFaceCulling=false;
  mesh.material=material;
  mesh.useVertexColors=true;
  mesh.isPickable=false;
  ground.isVisible=false;
  return mesh;
}
