import test from 'node:test';
import assert from 'node:assert/strict';
import {MODEL_FILES,MODEL_HOST,MODEL_SOURCE,TREE_LAYOUT,BUSH_LAYOUT} from '../visual-foundation/asset-manifest.js';
test('pass 10 visual lab uses real, pinned glb models instead of sphere trees',()=>{
 assert.match(MODEL_HOST,/^https:\/\/raw\.githubusercontent\.com\/anshaneja5\/skyline-run\/[a-f0-9]{40}\/public\/assets\/models\/$/);
 assert.match(MODEL_SOURCE,/Quaternius/);
 assert.equal(Object.keys(MODEL_FILES).length,4);
 assert.ok(Object.values(MODEL_FILES).every(s=>s.endsWith('.glb')));
 assert.ok(TREE_LAYOUT.length>=10);
 assert.ok(BUSH_LAYOUT.length>=8);
 assert.ok(TREE_LAYOUT.every(p=>MODEL_FILES[p[2]]&&p[3]>4));
});
