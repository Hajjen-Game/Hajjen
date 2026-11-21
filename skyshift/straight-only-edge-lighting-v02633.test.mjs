import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {COURSE_SEGMENTS} from "./trial-v0165.mjs";
import {createConnectedFootBands02632} from "./edge-source-floor-bands-v02632.mjs";
import {
 STRAIGHT_EDGE_02633,straightRanges02633,straightEdgeMask02633,
 buildStraightCyanEmitters02633,buildStraightRoadMasks02633,
 patchStraightEdgeShader02633,installStraightOnlyEdgeLighting02633
} from "./straight-only-edge-lighting-v02633.mjs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
class Attr{
 constructor(a,size){this.array=a;this.itemSize=size;this.count=a.length/size;}
 getX(i){return this.array[this.itemSize*i];}
}
class Geometry{
 constructor(){this.attributes={};}
 getAttribute(name){return this.attributes[name]??null;}
 setAttribute(name,attr){this.attributes[name]=attr;}
 deleteAttribute(name){delete this.attributes[name];}
 computeBoundingSphere(){} dispose(){}
}
const THREE={
 BufferGeometry:Geometry,Float32BufferAttribute:Attr,
 MeshBasicMaterial:class{constructor(p){Object.assign(this,p);}dispose(){}},
 Mesh:class{constructor(g,m){this.geometry=g;this.material=m;this.visible=true;}
  removeFromParent(){this.parent?.remove(this);}},
 DoubleSide:2,AdditiveBlending:3
};
const positionAt=(s,l,y)=>({x:l,y,z:s});
test("0.26.3.3 is purely a straight/corner light mask with warm bands unchanged",()=>{
 assert.equal(STRAIGHT_EDGE_02633.version,"0.26.3.3");
 assert.equal(STRAIGHT_EDGE_02633.base,"0.26.3.2");
 assert.equal(STRAIGHT_EDGE_02633.turnApproachClearanceMeters,12);
 assert.equal(STRAIGHT_EDGE_02633.extraDrawBatches,0);
 assert.equal(STRAIGHT_EDGE_02633.extraColliders,0);
 assert.equal(STRAIGHT_EDGE_02633.amberConnectedBandsUntouched,true);
 for(const x of ["GRIPUnchanged","physicsUnchanged","shipUnchanged",
  "roadGeometryUnchanged","railCollisionUnchanged","nativeWaveUnchanged",
  "solarSealUntouched","roadReflectionsMaskedInTurns"])
  assert.equal(STRAIGHT_EDGE_02633[x],true,x);
});
test("authoritative Skyline sections classify turn arrows and 12m approach as forbidden",()=>{
 const turn=COURSE_SEGMENTS.find(x=>x.type==="turn");
 const straight=COURSE_SEGMENTS[0];
 assert.equal(straight.type,"straight");
 assert.equal(turn.id,"high-speed-sweep");
 assert.ok(turn.start>155&&turn.start<170);
 const safe=straightRanges02633();
 assert.ok(safe[0].from<=0.01);
 assert.ok(safe[0].to<=turn.start-11.99);
 for(const s of [160,165,175,200,220,290,320,350])
  assert.equal(straightEdgeMask02633(s),0,"turn arrows at s="+s);
 for(const s of [20,30,78,100,125])
  assert.ok(straightEdgeMask02633(s)>.98,"straight at "+s);
 assert.equal(straightEdgeMask02633(turn.start-7),0);
 assert.equal(straightEdgeMask02633(-1),0);
 assert.equal(straightEdgeMask02633(370),0);
});
test("safe cyan source geometry stays fully in straight; no lights in the corner",()=>{
 for(const lowMemory of [false,true]){
  const g=buildStraightCyanEmitters02633(THREE,positionAt,lowMemory);
  const p=g.geometry.getAttribute("position");
  const c=g.geometry.getAttribute("color");
  assert.equal(p.count,c.count);
  assert.equal(c.itemSize,3);
  assert.ok(g.segments>7&&g.segments<16,g.segments);
  assert.ok(g.litMeters<120);
  assert.ok(g.quads>0);
  for(let i=0;i<p.count;i++){
   const s=p.array[i*3+2],y=p.array[i*3+1];
   assert.ok(s<=COURSE_SEGMENTS[0].end-11.99,
    "cyan source must not enter corner "+s);
   assert.ok(straightEdgeMask02633(s)>.001||
    Math.abs(s-straightRanges02633()[0].to)<.001,
    "source crosses forbidden corner area "+s);
   assert.ok(y>=.03&&y<.25,"keep original low rail mount");
  }
 }
});
test("banked road shader masks NEW cyan specular while retaining AMBER floor glow",()=>{
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
 for(const mobile of [true,false]){
  const shader=patchStraightEdgeShader02633(v,f,{mobile});
  assert.match(shader.vertexShader,/attribute float edgeStraightMask02633/);
  assert.match(shader.vertexShader,/vEdgeStraight02633=edgeStraightMask02633/);
  assert.match(shader.fragmentShader,/float e31Power=uEdgeFloor02631\*e31In\*e31Bay\*e31Safe\*clamp\(vEdgeStraight02633,0.0,1.0\)/);
  assert.match(shader.fragmentShader,/vec3 e31Warm=/);
  assert.match(shader.fragmentShader,/reflectedLight.directDiffuse=e31DiffuseBackup/);
  assert.match(shader.fragmentShader,/roadSolarMask/);
  assert.match(shader.fragmentShader,/whiteCore/);
  assert.equal((shader.fragmentShader.match(/RE_Direct\(e31Light,/g)||[]).length,mobile?1:2);
 }
 assert.throws(()=>patchStraightEdgeShader02633(v,"#include <common>"));
});
test("original road index intact, source masks suppress curvature; warm bands identical",()=>{
 const geo=new Geometry();
 geo.setAttribute("aTrackCoord",new Attr([85,0,130,0,155,0,165,0,225,0],2));
 geo.setAttribute("position",new Attr(Array(15).fill(0),3));
 geo.index={count:15};
 const mask=buildStraightRoadMasks02633(geo);
 assert.equal(mask.vertices,5);
 assert.ok(mask.values[0]>.98);
 assert.ok(mask.values[1]>.98);
 assert.equal(mask.values[2],0);
 assert.equal(mask.values[3],0);
 assert.equal(mask.values[4],0);
 assert.equal(geo.index.count,15);
 const warm=createConnectedFootBands02632(THREE,positionAt,false);
 assert.equal(warm.bands,20);
 assert.equal(warm.footSources,20);
});
test("runtime mounts exactly two visual meshes and restores previous chain",()=>{
 const mat={isMeshStandardMaterial:true,onBeforeCompile(){},
  customProgramCacheKey(){return "original-road";},needsUpdate:false};
 const old=mat.onBeforeCompile;
 const geo=new Geometry();
 geo.setAttribute("aTrackCoord",new Attr([75,0,95,0,165,0],2));
 geo.setAttribute("position",new Attr(Array(9).fill(0),3));
 const world={children:[],add(x){this.children.push(x);x.parent=this;},
  remove(x){this.children=this.children.filter(y=>y!==x);}};
 const module=installStraightOnlyEdgeLighting02633(THREE,world,
  {geometry:geo,material:mat},{positionAt,roadRebuild:{stats(){
   return {roadRebuild0263Active:true};
  }}});
 const stats=module.stats();
 assert.equal(stats.straightEdges02633Active,true,JSON.stringify(stats));
 assert.equal(stats.straightEdges02633AmberSources,20);
 assert.equal(stats.straightEdges02633GGXSamples,2);
 assert.equal(world.children.length,2);
 module.setComparison(0);
 assert.ok(world.children.every(x=>!x.visible));
 module.setComparison(1);
 assert.ok(world.children.every(x=>x.visible));
 module.dispose();
 assert.equal(world.children.length,0);
 assert.equal(geo.getAttribute("edgeStraightMask02633"),null);
 assert.equal(mat.onBeforeCompile,old);
});
test("game defaults to straight-only after 0.26.3.2, classic remains selectable",()=>{
 const game=read("./game-v0210.mjs");
 assert.ok(game.includes('get("straightEdges")!=="classic"'));
 assert.match(game,/installStraightOnlyEdgeLighting02633/);
 assert.match(game,/installRepositionedEdgeAndConnectedFoot02632/);
 assert.match(game,/__skyshiftStraightEdgeFrameProof/);
 assert.match(game,/createRoadSolarSpillController/);
 assert.match(read("./boot-v0210.js"),/game-v0210\.mjs\?v=0\.26\.(?:3\.3|4|5)/);
});
