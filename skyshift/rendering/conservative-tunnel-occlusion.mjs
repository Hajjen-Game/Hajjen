// Experimental conservative CPU occlusion: ONLY hide a static target when
// every tile it could cover is fully covered by a nearer real opaque shell
// triangle. No heuristic track-distance hiding, no previous-frame queries,
// no added GPU render pass. Missing coverage or near-plane ambiguity -> draw.
// Kept opt-in until real-device benefit and full-lap visual parity are proven.
const EDGE_EPS=1e-8,DEPTH_EPS=0.00005;
const edge=(a,b,x,y)=>(b.x-a.x)*(y-a.y)-(b.y-a.y)*(x-a.x);
const finite=v=>Number.isFinite(v.x)&&Number.isFinite(v.y)&&Number.isFinite(v.z);
export function createConservativeDepthTiles(width=64,height=36){
 const depths=new Float64Array(width*height);
 function clear(){depths.fill(Infinity);}
 clear();
 function range(min,max,n){
  return [Math.max(0,Math.floor((min+1)*.5*n)),Math.min(n-1,Math.floor((max+1)*.5*n))];
 }
 function cover(a,b,c){
  if(![a,b,c].every(p=>finite(p)&&p.z>-1&&p.z<1))return 0;
  const area=edge(a,b,c.x,c.y);if(Math.abs(area)<EDGE_EPS)return 0;
  const sign=Math.sign(area),maxZ=Math.max(a.z,b.z,c.z)+DEPTH_EPS;
  const [x0,x1]=range(Math.min(a.x,b.x,c.x),Math.max(a.x,b.x,c.x),width);
  const [y0,y1]=range(Math.min(a.y,b.y,c.y),Math.max(a.y,b.y,c.y),height);
  let count=0;
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
   const l=2*x/width-1,r=2*(x+1)/width-1,t=2*y/height-1,d=2*(y+1)/height-1;
   // Strict inward coverage. Border tiles shared by adjacent triangles
   // remain unknown rather than assuming a watertight projected surface.
   let inside=true;
   for(const [u,v] of [[l,t],[r,t],[l,d],[r,d]])
    if(sign*edge(a,b,u,v)<=EDGE_EPS||sign*edge(b,c,u,v)<=EDGE_EPS||sign*edge(c,a,u,v)<=EDGE_EPS){inside=false;break;}
   if(inside){const i=y*width+x;depths[i]=Math.min(depths[i],maxZ);count++;}
  }
  return count;
 }
 function occludes(points){
  if(!points.length||!points.every(p=>finite(p)&&p.z>-1&&p.z<1))return false;
  const minZ=Math.min(...points.map(p=>p.z))-DEPTH_EPS;
  const l=Math.max(-1,Math.min(...points.map(p=>p.x))),r=Math.min(1,Math.max(...points.map(p=>p.x)));
  const t=Math.max(-1,Math.min(...points.map(p=>p.y))),b=Math.min(1,Math.max(...points.map(p=>p.y)));
  if(l>r||t>b)return false;
  const [x0,x1]=range(l,r,width),[y0,y1]=range(t,b,height);
  if(x0>x1||y0>y1)return false;
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(!(depths[y*width+x]<minZ))return false;
  return true;
 }
 return {clear,cover,occludes,coveredTiles:()=>depths.reduce((n,d)=>n+Number(Number.isFinite(d)),0)};
}
function visibleChain(obj){for(let o=obj;o;o=o.parent)if(!o.visible)return false;return true;}
function eligible(THREE,mesh){
 const m=mesh.material;
 return mesh.isMesh&&mesh.name==="Tunnel / CLOSED_SHELL"&&m?.isMeshStandardMaterial&&
  !Array.isArray(m)&&m.visible&&m.side===THREE.DoubleSide&&!m.transparent&&m.opacity===1&&m.depthWrite&&m.depthTest&&
  m.depthFunc===THREE.LessEqualDepth&&!m.alphaTest&&!m.alphaMap&&!m.displacementMap&&!m.wireframe&&!m.polygonOffset&&
  !m.clippingPlanes?.length&&!m.stencilWrite&&m.colorWrite&&mesh.geometry?.index;
}
export function createTunnelOcclusion(THREE,tunnelRoot,{triangleBudget=12000}={}){
 const tiles=createConservativeDepthTiles(),shells=[],clip=new THREE.Matrix4(),v=new THREE.Vector4();
 let tested=0,covered=0,eligibleShells=0,hidden=0;
 tunnelRoot?.updateMatrixWorld(true);
 tunnelRoot?.traverse(mesh=>{
  if(!eligible(THREE,mesh))return;
  const g=mesh.geometry,p=g.getAttribute("position"),idx=g.index;
  if(!p||idx.count%3||g.groups.length||g.drawRange.start!==0||g.drawRange.count<idx.count)return;
  // Actual authored shell vertices only; no synthetic occluders.
  const positions=new Float32Array(p.count*3),tmp=new THREE.Vector3();
  for(let i=0;i<p.count;i++){tmp.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);tmp.toArray(positions,i*3);}
  const projected=Array.from({length:p.count},()=>({x:0,y:0,z:0,valid:false}));
  shells.push({mesh,positions,projected,indices:idx.array,bounds:new THREE.Box3().setFromObject(mesh)});
 });
 function project(x,y,z,out){
  v.set(x,y,z,1).applyMatrix4(clip);
  out.valid=v.w>0.0001&&Number.isFinite(v.w);
  if(out.valid){out.x=v.x/v.w;out.y=v.y/v.w;out.z=v.z/v.w;}
  return out;
 }
 function begin(camera,frustum){
  tiles.clear();tested=covered=eligibleShells=hidden=0;
  clip.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
  // Sort nearest actual shell bounds first, limit CPU effort. Budget
  // exhaustion never makes an unproven tile opaque.
  const eye=new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
  const candidates=shells.filter(s=>eligible(THREE,s.mesh)&&visibleChain(s.mesh)&&
   camera.layers.test(s.mesh.layers)&&frustum.intersectsBox(s.bounds))
   .map(s=>({s,d:s.bounds.distanceToPoint(eye)})).sort((a,b)=>a.d-b.d);
  for(const {s} of candidates){
   if(tested>=triangleBudget)break;eligibleShells++;
   for(let i=0;i<s.projected.length;i++)project(s.positions[i*3],s.positions[i*3+1],s.positions[i*3+2],s.projected[i]);
   const idx=s.indices;
   for(let i=0;i<idx.length&&tested<triangleBudget;i+=3){
    tested++;const a=s.projected[idx[i]],b=s.projected[idx[i+1]],c=s.projected[idx[i+2]];
    if(a.valid&&b.valid&&c.valid)tiles.cover(a,b,c);
   }
  }
  covered=tiles.coveredTiles();
 }
 const corners=Array.from({length:8},()=>({x:0,y:0,z:0,valid:false}));
 function occluded(bounds){
  if(!covered)return false;
  for(let i=0;i<8;i++){
   const p=project(i&1?bounds.max.x:bounds.min.x,i&2?bounds.max.y:bounds.min.y,i&4?bounds.max.z:bounds.min.z,corners[i]);
   if(!p.valid)return false;
  }
  if(!tiles.occludes(corners))return false;
  hidden++;return true;
 }
 return {begin,occluded,stats:()=>({eligibleShells,trianglesTested:tested,coveredTiles:covered,tiles:64*36,hiddenSections:hidden,triangleBudget})};
}
