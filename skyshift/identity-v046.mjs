// SKYSHIFT 0.4.6 — premium ribbon rails and colour-ready track surface.
// All geometry uses the SAME authoritative positionAt/widthAt as collisions.
import {TRIAL,GUARDRAIL,positionAt,widthAt,curvatureAt} from "./trial-v046.mjs";
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
export const TRACK_IDENTITY=Object.freeze({
 railStep:.55,
 railHeight:GUARDRAIL.height,
 railCrossColumns:5,
 rails:2,
 arrowPitch:17,
 shoulderPitch:24,
 raisedCollision:true,
 sharedRailVertices:true,
 colorReactiveAccents:true
});
const PROFILE=Object.freeze([
 [-.88,.04],[-.65,.42],[-.37,.77],[.07,.72],[.11,.04]
]);
const SHADES=Object.freeze([
 [.095,.21,.30],[.18,.31,.39],[.32,.47,.55],
 [.20,.33,.42],[.07,.14,.22]
]);
export function sampleRailSection(s,side){
 const half=widthAt(s)/2;
 return PROFILE.map(([offset,height])=>
  positionAt(s,side*(half+offset),height));
}
export function createRailData(step=TRACK_IDENTITY.railStep){
 const count=Math.ceil(TRIAL.length/step),positions=[],colors=[],indices=[];
 const n=PROFILE.length;
 for(const side of [-1,1]){
  const base=positions.length/3;
  for(let row=0;row<=count;row++){
   const s=TRIAL.length*row/count;
   const samples=sampleRailSection(s,side);
   for(let col=0;col<n;col++){
    const p=samples[col];positions.push(p.x,p.y,p.z);
    colors.push(...SHADES[col]);
   }
  }
  for(let row=0;row<count;row++)
   for(let col=0;col<n-1;col++){
    const a=base+row*n+col,b=a+1,c=b+n,d=a+n;
    indices.push(a,b,c,a,c,d);
   }
 }
 return {positions,colors,indices,rowCount:count+1,columns:n,
  triangleCount:indices.length/3};
}
function quad(out,p1,p2,p3,p4,strength=1){
 for(const p of [p1,p2,p3,p1,p3,p4])
  out.positions.push(p.x,p.y,p.z);
 for(let i=0;i<6;i++)out.colors.push(strength,strength,strength);
 out.triangles+=2;out.quads++;
}
function edgePoint(s,side,off,height){
 return positionAt(s,side*(widthAt(s)/2+off),height);
}
function facePoint(s,side,t){
 const off=mix(-.86,-.65,t),height=mix(.095,.425,t)+.014;
 return edgePoint(s,side,off,height);
}
export function createSurfaceIdentityData(){
 const out={positions:[],colors:[],triangles:0,quads:0,
  chevrons:0,shoulderMarks:0,accentAnchors:[]};
 // An uninterrupted, slim apex line across both rails.
 const count=Math.ceil(TRIAL.length/.8);
 for(let i=0;i<count;i++){
  const a=TRIAL.length*i/count,b=TRIAL.length*(i+1)/count;
  for(const side of [-1,1]){
   quad(out,edgePoint(a,side,-.32,.797),edgePoint(a,side,-.20,.79),
    edgePoint(b,side,-.20,.79),edgePoint(b,side,-.32,.797),.68);
  }
 }
 // 2D chevron inlays in the RAISED inner rail face, not opaque obstacles.
 // Each chevron consists of two narrow diagonal strokes.
 for(let s=20;s<TRIAL.length-10;s+=TRACK_IDENTITY.arrowPitch)
  for(const side of [-1,1]){
   const f=(u,t)=>facePoint(u,side,t);
   for(const t of [.16,.84]){
    quad(out,f(s-1.6-.22,t),f(s-1.6+.22,t),
      f(s+1.5+.22,.50),f(s+1.5-.22,.50),.90);
   }
   out.chevrons++;
  }
 // Restrained interrupted shoulder inlays. Nothing across the centerline,
 // no repeated chessboard panels, no flashing obstacle-like blocks.
 for(let s=15;s<TRIAL.length-15;s+=TRACK_IDENTITY.shoulderPitch){
  for(const side of [-1,1]){
   const lane=side*(widthAt(s)*.5-2.4);
   const width=.085;
   quad(out,positionAt(s, lane-width,.042),
      positionAt(s,lane+width,.042),
      positionAt(s+6.6,lane+width,.042),
      positionAt(s+6.6,lane-width,.042),.31);
   out.shoulderMarks++;
   // Two diagonal precision ticks toward the outer shoulder.
   for(let j=0;j<2;j++){
    const a=s+j*1.25,b=a+2.0;
    const inner=side*(widthAt(s)/2-3.25);
    const outer=side*(widthAt(s)/2-2.74);
    quad(out,positionAt(a,inner-.085,.046),positionAt(a,inner+.085,.046),
     positionAt(b,outer+.085,.046),positionAt(b,outer-.085,.046),.24);
   }
  }
 }
 // Logical anchors for future color-wave propagation; do not emit a wave yet.
 out.accentAnchors=[0,95,222,292,424,TRIAL.length];
 return out;
}
function geometry(THREE,positions,colors,indices=null){
 const g=new THREE.BufferGeometry();
 g.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
 g.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));
 if(indices)g.setIndex(indices);
 g.computeVertexNormals();g.computeBoundingSphere();
 return g;
}
export function installPremiumTrack(THREE,world){
 const rail=createRailData(),paint=createSurfaceIdentityData();
 const railMaterial=new THREE.MeshStandardMaterial({
  color:0xffffff,vertexColors:true,metalness:.66,roughness:.31,
  emissive:0x092132,emissiveIntensity:.22,side:THREE.DoubleSide
 });
 const accentMaterial=new THREE.MeshBasicMaterial({
  color:0x43ddf0,vertexColors:true,transparent:true,
  opacity:.64,depthWrite:false,side:THREE.DoubleSide,toneMapped:true
 });
 const railMesh=new THREE.Mesh(geometry(THREE,rail.positions,rail.colors,rail.indices),railMaterial);
 railMesh.name="Continuous raised anti-gravity guardrails";railMesh.frustumCulled=false;
 world.add(railMesh);
 const accentMesh=new THREE.Mesh(geometry(THREE,paint.positions,paint.colors),accentMaterial);
 accentMesh.name="Chevron and shoulder speed inlays";accentMesh.frustumCulled=false;
 accentMesh.renderOrder=2;world.add(accentMesh);
 return {
  plan:["raised-rails","guardrail-chevron-language","shoulder-inlays","future-zone-accent-anchors"],
  drawBatches:2,railTriangles:rail.triangleCount,paintTriangles:paint.triangles,
  chevrons:paint.chevrons,shoulderMarks:paint.shoulderMarks,
  accentAnchors:paint.accentAnchors,
  updateAccent(color){accentMaterial.color.copy(color);},
  dispose(){railMesh.removeFromParent();accentMesh.removeFromParent();
   railMesh.geometry.dispose();accentMesh.geometry.dispose();
   railMaterial.dispose();accentMaterial.dispose();}
 };
}
