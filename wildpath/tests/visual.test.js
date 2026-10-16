import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGE_GATES } from '../src/config.js';
import { widthLockedFrustum,visibleTrailAhead } from '../src/framing.js';
import { ROAD_SEGMENTS,WAYPOINTS,BOARD_HALF_WIDTH,BOARD_END,BOARD_START,ROAD_HALF_WIDTH,
  isOnRoad,moveOnRoad,rectsForRoad,pathX } from '../src/layout-v5.js';

test('compact portrait map remains within the mobile viewport',()=>{
  for(const [width,height] of [[360,780],[390,844],[412,915],[650,1080]]){
    const frustum=widthLockedFrustum(width,height,33.2);
    assert.ok(frustum.left<-BOARD_HALF_WIDTH&&frustum.right>BOARD_HALF_WIDTH);
    assert.equal(frustum.right-frustum.left,33.2);
  }
  assert.ok(visibleTrailAhead(390,844,33.2)>33);
  assert.ok(BOARD_END>STAGE_GATES.at(-1));
});

test('shorter glades replace the long 40-unit transport sections',()=>{
  assert.deepEqual(STAGE_GATES,[26,52,78,104]);
  for(let i=1;i<STAGE_GATES.length;i++)assert.equal(STAGE_GATES[i]-STAGE_GATES[i-1],26);
  assert.equal(BOARD_END,112);
});

test('hero can traverse the first encounter and reverse all turns',()=>{
  assert.ok(ROAD_SEGMENTS.every(s=>s.a.x===s.b.x||s.a.z===s.b.z));
  assert.ok(rectsForRoad().every(s=>s.w+1e-6>=ROAD_HALF_WIDTH*2&&s.d+1e-6>=ROAD_HALF_WIDTH*2));
  assert.ok(!isOnRoad(12,17));
  assert.ok(isOnRoad(-4,2));
  let hero={x:pathX(2),z:2};
  const turns=WAYPOINTS.filter(p=>p.z>=7&&p.z<=26);
  assert.ok(turns.length>=5);
  function walk(target){
    for(let tick=0;tick<900;tick++){
      const dx=target.x-hero.x,dz=target.z-hero.z,distance=Math.hypot(dx,dz);
      if(distance<.12)break;
      hero=moveOnRoad(hero.x,hero.z,dx/distance*.14,dz/distance*.14);
      assert.ok(isOnRoad(hero.x,hero.z));
    }
    assert.ok(Math.hypot(hero.x-target.x,hero.z-target.z)<.17,
      'reachable position '+target.x+','+target.z);
  }
  for(const point of turns)walk(point);
  assert.ok(hero.z>=25.9);
  for(const point of turns.slice().reverse())walk(point);
  walk({x:-4,z:2});
  assert.ok(hero.z<2.15);
  assert.ok(hero.z>BOARD_START);
});

test('invalid canvas sizes are rejected',()=>{
  assert.throws(()=>widthLockedFrustum(0,900),RangeError);
});
