import test from 'node:test';
import assert from 'node:assert/strict';
import {ART_DIRECTION} from '../tree-study/tree-model.js';

test('Tree Study is a zero-cost bespoke object study',()=>{
 assert.equal(ART_DIRECTION.name,'Willowglow — hand-shaped forest elder');
 assert.ok(ART_DIRECTION.foliage.length>=4);
 assert.ok(ART_DIRECTION.blossoms.length>=2);
});
