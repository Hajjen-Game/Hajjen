import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGE_GATES } from '../src/config.js';
import { widthLockedFrustum,visibleTrailAhead } from '../src/framing.js';
import { ROAD_SEGMENTS,WAYPOINTS,BOARD_HALF_WIDTH,BOARD_END,ROAD_HALF_WIDTH,
  isOnRoad,moveOnRoad,rectsForRoad,pathX } from '../src/layout-v5.js';

test('compact portrait map stays within one phone width',()=>{
  for(const [width,height] of [[360,780],[390,844],[412,915],[650,1080]]){
    const frustum=widthLockedFrustum(width,height,33.2);
    assert.ok(frustum.left<-BOARD_HALF_WIDTH&&frustum.right>BOARD_HALF_WIDTH);
    assert.equal(frustum.right-frustum.left,33.2);
  }
  assert.ok(visibleTrailAhead(390,844,33.2)>33);
  assert.ok(visibleTrailAhead(390,844,33.2)<60);
  assert.ok(BOARD_END>STAGE_GATES.at(-1));
});
test('short glades replace long empty walks',()=>{
  assert.deepEqual(STAGE_GATES,[40,80,120,160]);
  for(let i=1;i<STAGE_GATES.length;i++)assert.equal(STAGE_GATES[i]-STAGE_GATES[i-1],40);
});
test('first glade is a recognizable, navigable winding TD-style path',()=>{
  assert.ok(ROAD_SEGMENTS.every(s=>s.a.x===s.b.x||s.a.z===s.b.z));
  assert.ok(rectsForRoad().every(s=>s.w>=ROAD_HALF_WIDTH*2&&s.d>=ROAD_HALF_WIDTH*2));
  assert.ok(!isOnRoad(12,17));
  assert.ok(isOnRoad(-4,2));
  assert.ok(isOnRoad(5,18));
  let hero={x:pathX(2),z:2};
  const firstTurns=WAYPOINTS.filter(p=>p.z>=11&&p.z<=40);
  assert.ok(firstTurns.length>=5);
  for(const point of firstTurns){
    for(let tick=0;tick<900;tick++){
      const dx=point.x-hero.x,dz=point.z-hero.z,distance=Math.hypot(dx,dz);
      if(distance<.12)break;
      hero=moveOnRoad(hero.x,hero.z,dx/distance*.14,dz/distance*.14);
      assert.ok(isOnRoad(hero.x,hero.z));
    }
    assert.ok(Math.hypot(hero.x-point.x,hero.z-point.z)<.17);
  }
  assert.ok(hero.z>=39.9);
});
test('invalid canvas sizes are rejected',()=>{
  assert.throws(()=>widthLockedFrustum(0,900),RangeError);
});
