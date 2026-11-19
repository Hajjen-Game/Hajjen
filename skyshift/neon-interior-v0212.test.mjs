import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {installNeonDrivenInterior,NEON_INTERIOR_0212,sampleNeonInteriorLight} from "./neon-interior-v0212.mjs";
import {installTunnelMegastructure} from "./tunnel-megastructure-v0211.mjs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
class Group {
 name="";children=[];parent=null;
 add(x){x.parent=this;this.children.push(x)}
 removeFromParent(){}
 traverse(fn){fn(this);this.children.forEach(x=>x.traverse?.(fn))}
 getObjectByName(n){if(this.name===n)return this;for(const x of this.children){const f=x.getObjectByName?.(n);if(f)return f}return null}
}
class Geo {
 attributes={};index=null;
 setAttribute(k,v){this.attributes[k]=v}
 getAttribute(k){return this.attributes[k]}
 setIndex(a){this.index={array:a,count:a.length}}
 computeVertexNormals(){}computeBoundingSphere(){}dispose(){}
}
class Attr {constructor(a,n){this.array=a;this.itemSize=n;this.count=a.length/n}}
class Mesh {name="";parent=null;constructor(g,m){this.geometry=g;this.material=m}
 traverse(fn){fn(this)}
 removeFromParent(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this)}
}
class Material {constructor(o){Object.assign(this,o)}onBeforeCompile(){}customProgramCacheKey(){return ""}dispose(){}}
class Color {constructor(hex){this.setHex(hex)}setHex(hex){this.hex=hex;return this}}
const THREE={Group,BufferGeometry:Geo,Float32BufferAttribute:Attr,Mesh,
 MeshBasicMaterial:Material,MeshStandardMaterial:Material,Color,DoubleSide:2,AdditiveBlending:2};
const pos=(s,x,y)=>({x,y,z:s});
const load=(impl=installNeonDrivenInterior,opts={})=>{
 const w=new Group(),installed=impl(THREE,w,{positionAt:pos,...opts});
 return {w,installed};
};
const shell=w=>w.children[0].children.find(x=>x.name==="Tunnel / CLOSED_SHELL");
const luma=c=>.2126*c[0]+.7152*c[1]+.0722*c[2];
test("cyan and pink are local illuminators rather than uniform exterior wash",()=>{
 const cyan=sampleNeonInteriorLight(156,22,25),dark=sampleNeonInteriorLight(176,22,25);
 const pink=sampleNeonInteriorLight(80,22,22),far=sampleNeonInteriorLight(101,22,22);
 assert.equal(cyan.dominant,"cyan");
 assert.ok(cyan.cyan>dark.cyan*2);
 assert.ok(luma(cyan.rgb)>luma(dark.rgb)*1.5);
 assert.equal(pink.dominant,"pink");
 assert.ok(pink.pink>far.pink*1.5);
 assert.ok(pink.rgb[0]>far.rgb[0]);
 assert.ok(luma(sampleNeonInteriorLight(176,17,.15).rgb)<luma(pink.rgb)*.38);
});
test("shell and driving geometry identical to 0.21.1.1, light material replaces exterior-lit one",()=>{
 const old=load(installTunnelMegastructure),fresh=load();
 assert.equal(fresh.installed.stats().status,"active",JSON.stringify(fresh.installed.stats()));
 const a=shell(old.w).geometry,b=shell(fresh.w).geometry;
 assert.deepEqual(a.getAttribute("position").array,b.getAttribute("position").array);
 assert.deepEqual(a.index.array,b.index.array);
 assert.equal(fresh.installed.stats().drawBatches,5);
 assert.equal(fresh.installed.stats().exteriorLightInfluence,0);
 assert.equal(fresh.installed.stats().globalLightsChanged,0);
 assert.equal(fresh.installed.stats().dynamicLightsAdded,0);
 assert.equal(fresh.installed.stats().roadMeshUntouched,true);
 assert.equal(fresh.installed.stats().originalGRIPUntouched,true);
 assert.equal(fresh.installed.stats().localNeonRoadResponse,true);
 assert.notDeepEqual(a.getAttribute("color").array.slice(600,650),b.getAttribute("color").array.slice(600,650));
});
test("4GB tier retains neon-lit shell with zero extra batches",()=>{
 const a=load(installNeonDrivenInterior,{lowMemory:true});
 assert.equal(a.installed.stats().status,"active",JSON.stringify(a.installed.stats()));
 assert.equal(a.installed.stats().drawBatches,3);
 assert.equal(a.installed.stats().localNeonRoadResponse,false);
 assert.equal(a.installed.stats().diffuseNeonWallResponse,true);
 assert.equal(a.w.children[0].children.length,3);
});
test("no change to Aurora and original lighting A/B remains available",()=>{
 assert.equal(load(installNeonDrivenInterior,{track:"aurora"}).installed.stats().active,false);
 assert.equal(NEON_INTERIOR_0212.physicsChanged,false);
 assert.equal(NEON_INTERIOR_0212.roadMaterialChanged,false);
 assert.equal(NEON_INTERIOR_0212.globalLightsChanged,0);
 const g=read("./game-v0210.mjs");
 assert.match(g,/exteriorSealEnabled\?installExteriorLightSeal:installNeonDrivenInterior/);
 assert.match(g,/interiorLight"\)!=="classic"/);
 assert.match(g,/compareBeforeNeonInterior:"\?interiorLight=classic"/);
 assert.match(read("./boot-v0210.js"),/game-v0210\.mjs\?v=0\.23\.2/);
});
