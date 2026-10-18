// Wildpath / Daisugi Hex Grass 1.0
// One static, vertex-painted mesh of broad hexagons, with soft tonal edges.
// No textures, outlines, shaders, extra draw calls per tile or game collisions.
// Geometry creation is independent of Babylon, for reliable regression tests.
const SQRT3=Math.sqrt(3);
export const HEX_GRASS_SIZE=2.05;
export const HEX_GRASS_SHADES=Object.freeze([
  Object.freeze({r:-.034,g:-.046,b:-.025}),
  Object.freeze({r:-.012,g:-.011,b:.008}),
  Object.freeze({r:.012,g:.012,b:-.006}),
  Object.freeze({r:.028,g:.040,b:.012}),
  Object.freeze({r:-.024,g:.022,b:.018})
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
      const edge=blend(base,tinted,.18); // no strong outlines
      const center=vertex(x,z,tinted),inner=[],outer=[];
      for(let i=0;i<6;i++){
        const a=angle+i*Math.PI/3,cx=Math.cos(a),cz=Math.sin(a);
        inner.push(vertex(x+cx*side*.81,z+cz*side*.81,tinted));
        outer.push(vertex(x+cx*side,z+cz*side,edge));
      }
      for(let i=0;i<6;i++){
        const j=(i+1)%6;
        indices.push(center,inner[i],inner[j]);
        indices.push(inner[i],outer[i],outer[j]);
        indices.push(inner[i],outer[j],inner[j]);
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
  mesh.material=ground.material;
  mesh.useVertexColors=true;
  mesh.isPickable=false;
  ground.isVisible=false;
  return mesh;
}
