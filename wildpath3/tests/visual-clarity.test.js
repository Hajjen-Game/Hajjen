import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');

test('garden fences align tangentially instead of pointing away from posts',()=>{
  const arena=read('../src/arena.js');
  assert.match(arena,/rail\.rotation\.y=-angle-Math\.PI\/2/);
  assert.ok(arena.includes('connected garden fence rail'));
  const radius=18.85,span=.77,count=4;
  const a=.22+(1.5)*span/count,delta=span/count;
  const dx=radius*(Math.cos(a+delta/2)-Math.cos(a-delta/2));
  const dz=radius*(Math.sin(a+delta/2)-Math.sin(a-delta/2));
  const theta=-a-Math.PI/2;
  const railX=Math.cos(theta),railZ=-Math.sin(theta);
  const alignment=Math.abs((dx*railX+dz*railZ)/Math.hypot(dx,dz));
  assert.ok(alignment>.999,'the box length must follow the post chord');
  assert.ok(!arena.includes('short wooden border plank'));
});
test('meadow has broad painted colors and purposeful flower beds',()=>{
  const arena=read('../src/arena.js');
  assert.ok(arena.includes('for(const patch of pigments)'));
  assert.ok(arena.includes('lush meadow patch'));
  assert.ok(arena.includes('readable raised flower petals'));
});
test('growing plants and combined fusion groves are readable in portrait',()=>{
  const mobile=read('../src/mobile-nature.js');
  assert.match(mobile,/plant\.tier==='flower'\?1\.62/);
  assert.match(mobile,/plant\.tier==='bush'\?1\.52/);
  assert.ok(mobile.includes('region.root.scaling.scaleInPlace(k)'));
  assert.ok(mobile.includes('permanent garden fusion halo'));
  assert.ok(mobile.includes("super.rebuildFusionDecor(region)"));
  assert.ok(mobile.includes('this.satelliteCount++'));
  assert.ok(mobile.includes('region.ground.position.y=-.062'));
  assert.ok(mobile.includes('entry.shadow.position.y=-.066'));
});
test('old Wildpath 2.x remains a dependency rather than modified code',()=>{
  const adapter=read('../src/mobile-nature.js');
  assert.ok(adapter.includes("import {NatureGrowth} from '../../wildpath/src/nature-growth.js"));
  assert.ok(adapter.includes('extends NatureGrowth'));
});
