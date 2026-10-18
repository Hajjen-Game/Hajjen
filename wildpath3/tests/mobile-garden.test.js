import test from 'node:test';
import assert from 'node:assert/strict';
import {ARENA_RADIUS,CAMERA_WIDTH,BOOSTS,moveInsideArena} from '../src/rules.js';
import {natureSpawnRadius,mobilePlantSite,comboSeedling} from '../src/mobile-nature-rules.js';
import {readFileSync} from 'node:fs';
const source=p=>readFileSync(new URL(p,import.meta.url),'utf8');

test('larger mobile garden is deliberately bounded and still closely framed',()=>{
  assert.equal(ARENA_RADIUS,17.5);
  assert.equal(CAMERA_WIDTH,18.5);
  assert.ok(Math.hypot(...Object.values(moveInsideArena(17,0,60,0)))
    <=ARENA_RADIUS-.59);
  const arena=source('../src/arena.js');
  assert.match(arena,/anchored garden fence post/);
  assert.match(arena,/connected garden fence rail/);
  assert.match(arena,/intentional rounded arena stone edging/);
  assert.ok(!arena.includes('short wooden border plank'));
  assert.ok(!arena.includes('arena raised lime rim'));
});
test('mobile plants remain within the actual garden and close to kill site',()=>{
  const hero={x:0,z:0};
  for(const tier of ['flower','bush','tree','blossom']){
    const site=mobilePlantSite(.5,0,hero,tier);
    assert.ok(Math.hypot(site.x,site.z)<4,
      tier+' moved too far from kill');
    assert.ok(Math.hypot(site.x,site.z)>=natureSpawnRadius(tier)-.001);
  }
  const edge=mobilePlantSite(100,100,hero,'tree');
  assert.ok(Math.hypot(edge.x,edge.z)<=ARENA_RADIUS-1.54);
});
test('every extra kill in a nature combo becomes distinct visible biomass',()=>{
  const first={kind:'create',id:8,count:1,x:4,z:1};
  assert.equal(comboSeedling(first),null);
  const second=comboSeedling({...first,kind:'grow',count:2});
  const third=comboSeedling({...first,kind:'grow',count:3});
  assert.equal(second.tier,'flower');
  assert.equal(second.kind,'create');
  assert.notEqual(second.id,third.id);
  assert.ok(Math.hypot(second.x-4,second.z-1)<3);
  assert.ok(Math.hypot(third.x-4,third.z-1)<3);
});
test('real AoE attacks and strong meaningful boost paths are wired in combat',()=>{
  const game=source('../src/game.js');
  assert.ok(game.includes("this.splashAt(p.x,p.z,this.splashRadius"));
  assert.ok(game.includes('this.pulseDamage'));
  assert.ok(game.includes('this.nature.apply(event,this.hero)'));
  assert.ok(game.includes("this.splashAt(x,z,2.35"));
  for(const key of ['torrent','deluge','cascade','splash'])
    assert.ok(BOOSTS.some(b=>b.id===key));
  const adapter=source('../src/mobile-nature.js');
  assert.ok(adapter.includes('this.satelliteCount++'));
  assert.ok(adapter.includes('rebuildFusionDecor(region)'));
  assert.ok(adapter.includes('super.rebuildFusionDecor(region)'));
  assert.ok(adapter.includes('this.order.length>=cap'));
});
