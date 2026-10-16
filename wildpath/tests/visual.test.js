import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGE_GATES } from '../src/config.js';
import { widthLockedFrustum, visibleTrailAhead } from '../src/framing.js';
import { ROAD_SEGMENTS, WAYPOINTS, BOARD_HALF_WIDTH, BOARD_END,
  ROAD_HALF_WIDTH, isOnRoad, moveOnRoad, rectsForRoad, pathX } from '../src/layout-v4.js';

test('Level 1 street network has ONLY straight streets and square 90-degree bends',()=>{
  assert.ok(ROAD_SEGMENTS.length>10);
  for(const seg of ROAD_SEGMENTS){
    assert.ok(seg.a.x===seg.b.x || seg.a.z===seg.b.z);
    assert.ok(seg.maxX>seg.minX && seg.maxZ>seg.minZ);
    assert.ok(seg.horizontal ? seg.a.z===seg.b.z : seg.a.x===seg.b.x);
  }
  assert.ok(ROAD_SEGMENTS.filter(s=>s.horizontal&&s.a.z<=STAGE_GATES[0]).length>=4);
  assert.ok(rectsForRoad().every(r=>r.w>=ROAD_HALF_WIDTH*2 || r.d>=ROAD_HALF_WIDTH*2));
});

test('player can negotiate every right-angle turn through the first glade',()=>{
  let p={x:pathX(2),z:2};
  for(const point of WAYPOINTS.filter(t=>t.z>=12&&t.z<=STAGE_GATES[0])){
    for(let tick=0;tick<2000;tick++){
      const dx=point.x-p.x,dz=point.z-p.z,dist=Math.hypot(dx,dz);
      if(dist<.12)break;
      p=moveOnRoad(p.x,p.z,dx/Math.max(dist,.001)*.13,dz/Math.max(dist,.001)*.13);
      assert.ok(isOnRoad(p.x,p.z));
    }
    assert.ok(Math.hypot(p.x-point.x,p.z-point.z)<.2, 'waypoint '+point.x+','+point.z+' reachable');
  }
  assert.ok(p.z>=STAGE_GATES[0]-.1);
});

test('first glade has visible meadow lots, not one large smooth asphalt strip',()=>{
  assert.equal(isOnRoad(-7,2),true);
  assert.equal(isOnRoad(12,19),false);
  assert.equal(isOnRoad(7,24),true);
  assert.ok(Math.abs(pathX(35)-pathX(42))>10);
});

test('portrait camera can see main island width but only part of the level length',()=>{
  for(const [width,height] of [[360,780],[390,844],[412,915],[768,1024]]){
    const f=widthLockedFrustum(width,height,36.8);
    assert.ok(f.left<=-BOARD_HALF_WIDTH&&f.right>=BOARD_HALF_WIDTH);
    assert.equal(f.right-f.left,36.8);
  }
  const ahead=visibleTrailAhead(390,844,36.8);
  assert.ok(ahead>43&&ahead<74);
  assert.ok(STAGE_GATES[0]>ahead);
  assert.ok(BOARD_END>STAGE_GATES.at(-1));
});

test('desktop and mobile maintain consistent world width',()=>{
  const a=widthLockedFrustum(390,844,36.8);
  const b=widthLockedFrustum(650,1080,36.8);
  assert.equal(a.right-a.left,b.right-b.left);
  assert.throws(()=>widthLockedFrustum(0,900,36.8),RangeError);
});
