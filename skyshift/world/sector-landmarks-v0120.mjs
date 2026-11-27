// SKYSHIFT 0.12.0 — two deliberately authored roadside monuments.
// Distinct S-COMPLEX and FINALE silhouettes, not an endless row of identical
// pillars or gameplay obstacles. One merged PBR body, one merged white core.
// All geometry stays OUTSIDE the physical 23.2m road and guardrails.
export const LANDMARKS_0120=Object.freeze({
 version:"sector-monuments-0120",
 sites:Object.freeze([
  Object.freeze({id:"s-complex",s:1097,height:13.8,sweep:11.2}),
  Object.freeze({id:"finale",s:2864,height:17.1,sweep:15.8})
 ]),
 clearanceBeyondRoadMeters:3.9,
 drawCalls:2,lights:0,extraPasses:0,textures:0,
 nonColliding:true,insideRacingLane:false,instancedPillars:0
});
function point(p,s,lat,height){
 const v=p(s,lat,height);return [v.x,v.y,v.z];
}
function triangles(out,a,b,c){
 out.push(...a,...b,...c);
}
function face(out,a,b,c,d){
 triangles(out,a,b,c);triangles(out,a,c,d);
}
function geometry(THREE,positions){
 const g=new THREE.BufferGeometry();
 g.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
 g.computeVertexNormals();g.computeBoundingSphere();
 return g;
}
export function createSectorLandmarkData(positionAt,widthAt){
 const body=[],light=[];
 const specs=LANDMARKS_0120.sites;
 for(const site of specs){
  for(const side of [-1,1]){
   const edge=(s,extra)=>side*(widthAt(s)*.5+
      LANDMARKS_0120.clearanceBeyondRoadMeters+extra);
   const a=point(positionAt,site.s-7,edge(site.s-7,.25),.45);
   const b=point(positionAt,site.s+6,edge(site.s+6,.25),.45);
   const c=point(positionAt,site.s+site.sweep,
      edge(site.s+site.sweep,2.15),site.height);
   const d=point(positionAt,site.s+site.sweep-3.7,
      edge(site.s+site.sweep-3.7,2.0),site.height*.88);
   const e=point(positionAt,site.s+3.8,edge(site.s+3.8,1.2),5.7);
   const back=point(positionAt,site.s+1,edge(site.s+1,2.75),.60);
   // A large sculptural swept blade: broad foot, sharp forward tip.
   face(body,a,b,e,d);
   triangles(body,d,e,c);
   triangles(body,a,back,e);
   triangles(body,back,b,e);
   // Narrow physically grounded luminous leading edge, not a long
   // repeating track stripe or obstacle across the road.
   const f=point(positionAt,site.s+site.sweep-3.9,
     edge(site.s+site.sweep-3.9,2.13),site.height*.87);
   const g=point(positionAt,site.s+site.sweep+.1,
     edge(site.s+site.sweep+.1,2.27),site.height);
   triangles(light,d,f,c);
   triangles(light,f,g,c);
  }
 }
 return {body,light,bodyTriangles:body.length/9,
  lightTriangles:light.length/9,siteCount:specs.length,
  minLateralClearance:LANDMARKS_0120.clearanceBeyondRoadMeters};
}
export function installSectorLandmarks(THREE,world,{positionAt,widthAt}){
 const data=createSectorLandmarkData(positionAt,widthAt);
 const body=new THREE.Mesh(geometry(THREE,data.body),
  new THREE.MeshStandardMaterial({
   color:0x23334a,metalness:.76,roughness:.30,
   emissive:0x071e36,emissiveIntensity:.13,
   side:THREE.DoubleSide
  }));
 body.name="Racing Experience · swept sector architecture";
 const glow=new THREE.Mesh(geometry(THREE,data.light),
  new THREE.MeshBasicMaterial({
   color:0xd1f7ff,transparent:true,opacity:.76,depthWrite:false,
   toneMapped:false,side:THREE.DoubleSide
  }));
 glow.name="Racing Experience · blade white-core edge";
 world.add(body);world.add(glow);
 return {stats:()=>({
  version:LANDMARKS_0120.version,siteCount:data.siteCount,
  sites:LANDMARKS_0120.sites.map(s=>s.id),
  bodyTriangles:data.bodyTriangles,lightTriangles:data.lightTriangles,
  totalTriangles:data.bodyTriangles+data.lightTriangles,
  drawCalls:2,colliders:0,addedLights:0,addedPostPasses:0,
  minimumClearanceMeters:data.minLateralClearance
 }),dispose(){
  body.removeFromParent();glow.removeFromParent();
  body.geometry.dispose();glow.geometry.dispose();
  body.material.dispose();glow.material.dispose();
 }};
}
