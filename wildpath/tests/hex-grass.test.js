import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('the live world has no hex texture or hex flag',()=>{
 const world=read('../src/world-open.js'),main=read('../src/main.js');
 assert.ok(!world.includes('hexGrass'));
 assert.ok(!world.includes('hex-grass.js'));
 assert.ok(!main.includes('hexGrass:'));
 assert.ok(world.includes('subdivisions:20'));
 assert.ok(world.includes('continuous woodland floor'));
 assert.ok(world.includes('return {ground,kind:'));
});
test('normal woodland and Daisugi share the original ground',()=>{
 const world=read('../src/world-open.js'),main=read('../src/main.js');
 assert.ok(world.includes('staticVegetation=true'));
 assert.ok(main.includes('staticVegetation:!DAISUGI_MODE'));
 assert.ok(main.includes('const DAISUGI_CAMERA_WORLD_WIDTH=24.5'));
});