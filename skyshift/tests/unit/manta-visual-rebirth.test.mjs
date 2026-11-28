import test from 'node:test';
import assert from 'node:assert/strict';
import {MANTA_REBIRTH,mantaWingSurfaces,buildMantaRebirthData} from '../../ships/manta-visual-rebirth.mjs';
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
