// SKYSHIFT 0.8.4 – one 3D indexed road ribbon with a genuine missing LEAP span.
// Deliberately NO detached 0.8m road quads with independent face normals.
// Geometry and bank still come from the authoritative trial model.
// A deck builder depends on a supplied track sampler, not a named track.

export const MESH_SPEC=Object.freeze({
  sampleStep:.80,
  lateralColumns:7,
  sharedLongitudinalVertices:true,
  flatShadedSegments:0,
  topSurfaceCount:1
});

export function createSmoothDeckBuilder({TRIAL,positionAt,widthAt,gapAt}){
function sampleDeckRows(step=MESH_SPEC.sampleStep){
  const count=Math.ceil(TRIAL.length/step);
  // Fixed n rows prevents a short irregular last strip.
  step=TRIAL.length/count;
  const rows=[];
  for(let i=0;i<=count;i++){
    const s=i===count?TRIAL.length:i*step;
    const width=widthAt(s);
    const points=[];
    for(let col=0;col<MESH_SPEC.lateralColumns;col++){
      const lateral=width*(col/(MESH_SPEC.lateralColumns-1)-.5);
      const p=positionAt(s,lateral,0);
      points.push(p);
    }
    rows.push({s,points});
  }
  return rows;
}

function createSmoothDeckData(step=MESH_SPEC.sampleStep){
  const rows=sampleDeckRows(step),positions=[],indices=[];
  for(const row of rows)
    for(const p of row.points)positions.push(p.x,p.y,p.z);
  const n=MESH_SPEC.lateralColumns;
  for(let i=0;i<rows.length-1;i++){
    // Deliberately omit all top-surface triangles over any authored leap.
    // There is no invisible deck spanning the flight.
    if(gapAt((rows[i].s+rows[i+1].s)*.5))continue;
    for(let j=0;j<n-1;j++){
      const a=i*n+j,b=a+1,c=(i+1)*n+j+1,d=(i+1)*n+j;
      // Counterclockwise viewed from above: mesh normals face upward.
      indices.push(a,b,c,a,c,d);
    }
  }
  return {positions,indices,rows:rows.length,cols:n,triangles:indices.length/3};
}

function createSmoothDeckGeometry(THREE,colorAt){
  const data=createSmoothDeckData();
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute("position",new THREE.Float32BufferAttribute(data.positions,3));
  geometry.setIndex(data.indices);
  const colors=[];
  for(let i=0;i<data.rows;i++){
    const s=i*TRIAL.length/(data.rows-1);
    const tint=colorAt(s);
    for(let c=0;c<data.cols;c++)colors.push(tint.r,tint.g,tint.b);
  }
  geometry.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));
  // All triangles at adjoining longitudinal samples share indices, so Three
  // computes averaged lighting normals instead of isolated per-quad lighting.
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

 return {sampleDeckRows,createSmoothDeckData,createSmoothDeckGeometry};
}
