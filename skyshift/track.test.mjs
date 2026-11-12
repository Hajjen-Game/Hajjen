import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrack, centerAt, roadIntervals, surfaceAt, zoneAt, speedAtZone, isGapTheoreticallyFair } from './track.mjs';

test('first segments give distinct flow, jump and surge experiences', () => {
  const p = createTrack(42);
  p.ensureTo(1100);
  assert.deepEqual(p.segments.slice(0, 5).map(s => s.type),
    ['flow', 'precision', 'flow', 'surge', 'split']);
});
test('all segments connect continuously in position', () => {
  const p = createTrack(7);
  p.ensureTo(5000);
  for (let i=1;i<p.segments.length;i++) {
    const a=p.segments[i-1],b=p.segments[i];
    assert.equal(a.end,b.start);
    assert.ok(Math.abs(centerAt(a,a.end).x-centerAt(b,b.start).x)<1e-8);
    assert.ok(Math.abs(centerAt(a,a.end).y-centerAt(b,b.start).y)<1e-8);
  }
});
test('planned gaps stay inside conservative same-height jump envelope', () => {
  const p = createTrack(1337);
  p.ensureTo(10000);
  assert.ok(p.segments.every(isGapTheoreticallyFair));
});
test('solid, gap, edge and split collision masks are distinct', () => {
  const p=createTrack(9);p.ensureTo(900);
  const precision=p.segments[1];
  const gap=(precision.gapStart+precision.gapEnd)/2;
  assert.equal(surfaceAt(p,gap,centerAt(precision,gap).x).solid,false);
  const before=precision.gapStart-4;
  assert.equal(surfaceAt(p,before,centerAt(precision,before).x).solid,true);
  assert.equal(surfaceAt(p,before,centerAt(precision,before).x+100).solid,false);
  const split=p.segments[4], mid=(split.splitStart+split.splitEnd)/2,c=centerAt(split,mid).x;
  assert.equal(surfaceAt(p,mid,c).solid,false);
  assert.equal(surfaceAt(p,mid,c+4).solid,true);
  assert.equal(roadIntervals(split,mid).length,2);
});
test('zone and speed progress sensibly and cap', () => {
  assert.equal(zoneAt(0),1);
  assert.equal(zoneAt(320),2);
  assert.ok(speedAtZone(2)>speedAtZone(1));
  assert.equal(speedAtZone(999),61);
});
test('seeded tracks are deterministic', () => {
 const a=createTrack(211),b=createTrack(211);a.ensureTo(3000);b.ensureTo(3000);
 assert.deepEqual(a.segments,b.segments);
});
