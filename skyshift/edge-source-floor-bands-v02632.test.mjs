import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {EDGE_SOURCE_02632,railBayWeight02632,railLipPosition02632,
 createLowerEdgeSources02632,createConnectedFootBands02632,
 createLowRailSourcesData02632,patchConnectedEdgeShader02632,
 installRepositionedEdgeAndConnectedFoot02632}
 from "./edge-source-floor-bands-v02632.mjs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
class Attr{
 constructor(array,size){this.array=array;this.itemSize=size;this.count=array.length/size;}
 getX(i){return this.array[i*this.itemSize];}
}
class Geometry{
 constructor(){this.attributes={};}
 getAttribute(name){return this.attributes[name]??null;}
 setAttribute(name,a){this.attributes[name]=a;}
 deleteAttribute(name){delete this.attributes[name];}
 computeBoundingSphere(){}
 dispose(){}
}
const THREE={
 BufferGeometry:Geometry,Float32BufferAttribute:Attr,
 MeshBasicMaterial:class{constructor(p){Object.assign(this,p);}dispose(){}},
 Mesh:class{constructor(g,m){this.geometry=g;this.material=m;this.visible=true;}
  removeFromParent(){this.parent?.remove(this);}},
 DoubleSide:2,AdditiveBlending:3
};
const positionAt=(s,l,y)=>({x:l,y,z:s});
test("Pass 0.26.3.2 corrects only missing lower light geometry",()=>{
 const p=EDGE_SOURCE_02632;
 assert.equal(p.version,"0.26.3.2");
 assert.equal(p.comparison,"?edgeSources=classic");
 assert.equal(p.cyanSegmentPitchMeters,24);
 assert.equal(p.cyanLitLengthMeters,6.5);
 assert.equal(p.cyanDarkGapMeters,17.5);
 assert.equal(p.connectedFloorAndFootGeometry,true);
 assert.equal(p.amberFootBands,20);
 assert.equal(p.addedDrawBatches,2);
 assert.equal(p.addedDynamicLights,0);
 for(const key of ["physicsUnchanged","GRIPUnchanged","cameraUnchanged",
  "shipUnchanged","originalRoadUnchanged","originalRailUnchanged",
  "tunnelUnchanged","whiteCoreUnchanged","nativeWaveUnchanged",
  "externalSunDisabled","roofLightsUnchanged"])assert.equal(p[key],true,key);
 const source=read("./edge-source-floor-bands-v02632.mjs");
 assert.doesNotMatch(source,/new THREE\.(PointLight|DirectionalLight|SpotLight|RectAreaLight|WebGLRenderTarget|PMREMGenerator)/);
});
test("new lower cyan lights are SHORT islands with real dark gaps",()=>{
 for(const s of [5.3,6,7.5,10.2,29.5,30,32]){
  assert.ok(railBayWeight02632(s)>.05,s);
 }
 for(const s of [0,3,12,17,21,24,26,39,45,69,370])
  assert.equal(railBayWeight02632(s),0,s);
 assert.ok(railBayWeight02632(5.6)>.9);
});
test("fixture moved DOWN to physically correct bottom shoulder slope",()=>{
 const low=railLipPosition02632(165,-1,-1.018,positionAt);
 const high=railLipPosition02632(165,-1,-.810,positionAt);
 const center=railLipPosition02632(165,1,-.91,positionAt);
 assert.ok(low.y<.09,low.y);
 assert.ok(high.y<.24,high.y);
 assert.ok(high.y>low.y);
 assert.ok(center.y<.17,center.y);
 assert.ok(Math.abs(low.x)>Math.abs(high.x));
 assert.throws(()=>railLipPosition02632(165,1,-.6,positionAt));
});
test("short 18cm broad strips share real rail surface and 4GB batching",()=>{
 const high=createLowerEdgeSources02632(THREE,positionAt,false);
 const low=createLowerEdgeSources02632(THREE,positionAt,true);
 assert.equal(high.segments,low.segments);
 assert.ok(high.segments>=20&&high.segments<=40);
 assert.ok(high.litMeters<250);
 assert.ok(high.quads>low.quads);
 const position=high.geometry.getAttribute("position");
 const color=high.geometry.getAttribute("color");
 assert.equal(position.count,color.count);
 assert.equal(color.itemSize,3);
 for(let i=0;i<position.count;i++){
  const y=position.array[i*3+1];
  assert.ok(y>=.035&&y<.25,"rail must stay near ground "+y);
 }
});
test("20 amber practicals and the floor band are ONE joined surface",()=>{
 for(const mobile of [false,true]){
  const x=createConnectedFootBands02632(THREE,positionAt,mobile);
  assert.equal(x.footSources,20);
  assert.equal(x.bands,20);
  assert.equal(x.geometry.getAttribute("color").itemSize,4);
  const a=x.geometry.getAttribute("position");
  const c=x.geometry.getAttribute("color");
  assert.equal(a.count,c.count);
  assert.ok(x.triangles>900);
  assert.ok(a.array.every(Number.isFinite));
  // The foot is rooted at the same x-coordinate and s as the floor band.
  // The joined mesh is not two disconnected draw batches.
  assert.equal(x.geometry.getAttribute("position").count%3,0);
  const max=Math.max(...Array.from(c.array).filter((_,i)=>i%4===3));
  assert.ok(max>.75);
 }
});
test("native road geometry unchanged and uses same lower cyan source locations",()=>{
 const g=new Geometry();
 g.setAttribute("aTrackCoord",new Attr([165,-9,165,9,168,0,500,0],2));
 g.setAttribute("position",new Attr(Array(12).fill(0),3));
 const d=createLowRailSourcesData02632(g,positionAt);
 assert.equal(d.vertices,4);
 assert.equal(d.inside,3);
 assert.ok(d.arrays.edgeLeft02631[0]<0);
 assert.ok(d.arrays.edgeRight02631[0]>0);
 assert.ok(d.arrays.edgeLeft02631[11]===0);
 assert.equal(g.getAttribute("edgeLeft02631"),null);
});
test("native GGX micro reflections respect new 6.5m segments and old solar seal",()=>{
 const v="#include <common>\n#include <project_vertex>";
 const f=[
  "#include <common>","varying vec2 vTrackCoord;",
  "float roadSolarMask=0.0;",
  "float whiteCore=0.0;","float guided=0.0;",
  "float padCoverage=0.0;","float r263Keep=0.0;",
  "float r263Fresnel=0.0;",
  "RE_Direct(r263Lamp,geometryPosition,geometryNormal,geometryViewDir,geometryClearcoatNormal,material,reflectedLight);",
  "  (r263Keep*r263Fresnel*r263Surface);"
 ].join("\n");
 for(const mobile of [false,true]){
  const r=patchConnectedEdgeShader02632(v,f,{mobile});
  assert.match(r.fragmentShader,/smoothstep\(4\.50,5\.15,e31Pitch\)/);
  assert.match(r.fragmentShader,/smoothstep\(10\.35,11\.0,e31Pitch\)/);
  assert.match(r.fragmentShader,/r263Keep/);
  assert.match(r.fragmentShader,/roadSolarMask/);
  assert.match(r.fragmentShader,/reflectedLight.directDiffuse=e31DiffuseBackup/);
  assert.match(r.fragmentShader,/reflectedLight.directSpecular\+=e31Cool\+e31Warm/);
  assert.equal((r.fragmentShader.match(/RE_Direct\(e31Light,/g)||[]).length,
   mobile?1:2);
 }
 assert.throws(()=>patchConnectedEdgeShader02632(v,"#include <common>"));
});
test("new renderer preserves original MeshStandard, and A/B restores its shader",()=>{
 const m={isMeshStandardMaterial:true,onBeforeCompile(){},
  customProgramCacheKey(){return "road-ggx-0263";},needsUpdate:false};
 const old=m.onBeforeCompile;
 const geo=new Geometry();
 geo.setAttribute("aTrackCoord",new Attr([155,-9,155,9,165,0],2));
 geo.setAttribute("position",new Attr(Array(9).fill(0),3));
 const w={children:[],add(m){this.children.push(m);m.parent=this;},
  remove(m){this.children=this.children.filter(x=>x!==m);}};
 const run=installRepositionedEdgeAndConnectedFoot02632(THREE,w,
  {geometry:geo,material:m},{positionAt,roadRebuild:{
   stats(){return {roadRebuild0263Active:true};}
  }});
 const st=run.stats();
 assert.equal(st.edgeSources02632Active,true,JSON.stringify(st));
 assert.equal(st.edgeSources02632ConnectedBands,20);
 assert.equal(w.children.length,2);
 run.setComparison(0);
 assert.equal(run.stats().edgeSources02632Strength,0);
 assert.ok(w.children.every(mesh=>!mesh.visible));
 run.setComparison(1);
 assert.ok(w.children.every(mesh=>mesh.visible));
 assert.match(m.customProgramCacheKey(),/connected-low-edge-02632-high/);
 run.dispose();
 assert.equal(w.children.length,0);
 assert.equal(m.onBeforeCompile,old);
 assert.equal(geo.getAttribute("edgeLeft02631"),null);
});
test("live boot selects 0.26.3.2 but allows exact 0.26.3.1 classic",()=>{
 const game=read("./game-v0210.mjs");
 assert.ok(game.includes('get("edgeSources")!=="classic"'));
 assert.match(game,/installRepositionedEdgeAndConnectedFoot02632/);
 assert.match(game,/installEdgeLightingFloorPools02631/);
 assert.match(game,/__skyshiftEdgeSourceProbe/);
 assert.match(game,/__skyshiftEdgeSourceFrameProof/);
 assert.match(read("./boot-v0210.js"),/game-v0210\.mjs\?v=0\.26\.3\.2/);
 assert.match(read("./index.html"),/Connected Floor Light Bands/);
});
