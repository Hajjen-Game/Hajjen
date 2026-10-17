import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ART_DIRECTION} from '../tree-study/tree-model.js';
import {ART_DIRECTION as ORIGINAL} from '../tree-study/tree-model-v1.js';

const source = path => readFileSync(new URL(path,import.meta.url),'utf8');
test('Pass 12 keeps original tree study intact for independent comparison',()=>{
 assert.equal(ORIGINAL.name,'Willowglow — hand-shaped forest elder');
 assert.equal(ART_DIRECTION.name,'Willowglow — hand-shaped forest elder 2.0');
 assert.ok(ART_DIRECTION.foliage.length >= 4);
 assert.ok(ART_DIRECTION.blossoms.length >= 2);
 assert.match(source('../tree-study/main.js'),/compareV1\?buildV1:buildV2/);
 assert.match(source('../tree-study/index.html'),/id="compareLink"/);
});
test('Pass 12 changes the tree geometry rather than just text and CSS',()=>{
 const old=source('../tree-study/tree-model-v1.js');
 const next=source('../tree-study/tree-model.js');
 assert.match(old,/visible forking limb/);
 assert.match(next,/const boughs = \[/);
 assert.match(next,/front sheltered/);
 assert.match(next,/leafMesh\.receiveShadows = true/);
 assert.match(next,/\.116\+rand\(\)\*\.095/);
 assert.doesNotMatch(next,/visible forking limb/);
});
