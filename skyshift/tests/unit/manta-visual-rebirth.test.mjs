import test from 'node:test';
import assert from 'node:assert/strict';
import {MANTA_REBIRTH,mantaWingSurfaces,buildMantaRebirthData,buildMantaVisualRebirth} from '../../ships/manta-visual-rebirth.mjs';
import {ENGINE_SOCKETS} from '../../ships/manta-blade-v0484.mjs';
test('rebirth is finite, mirrored and within original wing beam, with genuinely volumetric facets',()=>{
 const w=mantaWingSurfaces();
 for(const a of [w.top,w.bevel,w.underside]){assert.ok(a.length>0&&a.length%9===0);assert.ok(a.every(Number.isFinite));}
 const xs=w.bevel.filter((_,i)=>i%3===0),ys=w.bevel.filter((_,i)=>i%3===1);
 assert.equal(Math.max(...xs),2.9);assert.equal(Math.min(...xs),-2.9);assert.ok(Math.max(...ys)-Math.min(...ys)>.08);
 const d=buildMantaRebirthData();let triangles=0;
 for(const a of Object.values(d)){assert.ok(a.length>0&&a.length%9===0);assert.ok(a.every(Number.isFinite));triangles+=a.length/9;}
 assert.ok(triangles+124<=MANTA_REBIRTH.maxGeometryTriangles);
 assert.equal(MANTA_REBIRTH.visualBeamMeters,5.8);assert.equal(MANTA_REBIRTH.engineHousings,2);
 assert.equal(MANTA_REBIRTH.physicsChanged,false);assert.equal(MANTA_REBIRTH.addedLights,0);
 assert.deepEqual(ENGINE_SOCKETS.map(s=>[s.x,s.y,s.z]),[[-1.99,.035,2.52],[1.99,.035,2.52]]);
});

import {separateBladeTipMaterial,createTunnelBlackoutController} from '../../tunnel/tunnel-blackout-v0160.mjs';
// Minimal Three API doubles instantiate the actual builder, not a fabricated
// ship fixture. Native WebGL coverage remains in vault-jump-browser.
test('rebirth integrates with the real two-tip blackout contract without dimming the permanent inlays',()=>{
 class Color{clone(){return new Color()}copy(){return this}multiplyScalar(){return this}}
 class Material{constructor(options={}){Object.assign(this,options);this.color=new Color();this.opacity=options.opacity??1;}clone(){return new Material(this)}}
 class Geometry{constructor(){this.index={count:168};this.attributes={};}setAttribute(k,v){this.attributes[k]=v;return this}computeVertexNormals(){}computeBoundingSphere(){}}
 class Mesh{constructor(geometry,material){this.geometry=geometry;this.material=material;this.rotation={};this.position={set(){}};this.isMesh=true;}}
 class Group{constructor(){this.children=[]}add(o){this.children.push(o)}traverse(fn){fn(this);for(const o of this.children)fn(o);}}
 const THREE={Group,Mesh,BufferGeometry:Geometry,Float32BufferAttribute:class{constructor(a,n){this.count=a.length/n}},MeshPhysicalMaterial:Material,MeshBasicMaterial:Material,CylinderGeometry:Geometry,BoxGeometry:Geometry,DoubleSide:2};
 const glow=new Material(),craft=buildMantaVisualRebirth(THREE,glow);
 const tips=craft.ship.children.filter(o=>o.name==='Manta blade tip luminescence');
 const inlays=craft.ship.children.find(o=>o.name==='Precision cyan inlays and twin nozzle rims');
 assert.equal(tips.length,2);
 for(const tip of tips){assert.ok(tip.geometry.attributes.position.count>0);assert.equal(tip.material,craft.materials.cyan);}
 assert.notEqual(inlays.material,craft.materials.cyan);
 const tip=separateBladeTipMaterial(craft.ship,craft.materials.cyan);
 assert.equal(tip.count,2);assert.equal(tip.baseOpacity,.63);
 assert.equal(tips[0].material,tips[1].material);assert.notEqual(tips[0].material,craft.materials.cyan);
 assert.equal(tips[0].material.transparent,true);
 const lights={ambient:{intensity:1},key:{intensity:1},fill:{intensity:1}};
 const ctrl=createTunnelBlackoutController({worldLights:lights,camera:{children:[]},bladeTips:tip,levelsAt:()=>({darkness:1,ambient:.1,key:.1,fill:.1,bladeTip:.25,background:0})});
 ctrl.apply(1200);
 assert.equal(tip.material.opacity,.63*.25);assert.equal(inlays.material.opacity,1);
 assert.equal(craft.materials.cyan.opacity,.63);assert.equal(craft.enginePlumes[0].material,glow);
 ctrl.reset();assert.equal(tip.material.opacity,.63);
 assert.equal(craft.polishStats().baseHullDrawCalls,11);
});
