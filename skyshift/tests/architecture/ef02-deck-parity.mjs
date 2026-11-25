// EF02A/EF02J: compare actual API outputs to the immutable pre-refactor code.
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
const [before,track]=process.argv.slice(2);
assert.ok(before&&['vault','skyline','aurora'].includes(track));
globalThis.location={search:'?track='+track};
const root=fileURLToPath(new URL('../../',import.meta.url));
const load=(dir,path)=>import(pathToFileURL(resolve(dir,path)));
const mockTHREE={
 BufferGeometry:class{
  constructor(){this.attributes={};}
  setAttribute(name,value){this.attributes[name]=value;}
  setIndex(indices){this.index=indices;}
  computeVertexNormals(){this.normalsComputed=true;}
  computeBoundingSphere(){this.boundsComputed=true;}
 },
 Float32BufferAttribute:class{
  constructor(values,itemSize){this.array=Float32Array.from(values);this.itemSize=itemSize;}
 }
};
const colorAt=s=>({r:(s%17)/17,g:(s%29)/29,b:.6});
let oldBytes=0,newBytes=0;
for(const version of ['046','049','050','051','060','070','071','072','081','082','083','084','0901','0160']){
 const name='smooth-track-v'+version+'.mjs';
 const old=await load(resolve(before,'skyshift'),name),now=await load(root,name);
 oldBytes+=readFileSync(resolve(before,'skyshift',name)).length;
 newBytes+=readFileSync(resolve(root,name)).length;
 assert.deepEqual(Object.keys(now).sort(),Object.keys(old).sort());
 assert.deepEqual(now.MESH_SPEC,old.MESH_SPEC);
 for(const step of [undefined,2.3,20]){
  assert.deepEqual(now.sampleDeckRows(step),old.sampleDeckRows(step));
  assert.deepEqual(now.createSmoothDeckData(step),old.createSmoothDeckData(step));
 }
 assert.deepEqual(now.createSmoothDeckGeometry(mockTHREE,colorAt),old.createSmoothDeckGeometry(mockTHREE,colorAt));
 const deck=now.createSmoothDeckData();
 console.log('SKYSHIFT_EF02_DECK_PARITY '+JSON.stringify({track,version,rows:deck.rows,cols:deck.cols,triangles:deck.triangles}));
}
newBytes+=readFileSync(resolve(root,'tracks/shared/smooth-deck.mjs')).length;
assert.ok(newBytes<oldBytes,'The shared implementation must actually reduce source bytes');
console.log('SKYSHIFT_EF02_DECK_BYTES '+JSON.stringify({oldBytes,newBytes,reduction:oldBytes-newBytes}));
