import test from 'node:test';
import assert from 'node:assert/strict';
import {SLIM_GLINT,slimGlintGeometry,drawSlimGlint} from '../src/slim-projectile.js';

test('compact glint has exactly two filled layers and no lines',()=>{
  const log=[];
  const g={moveTo(x,y){log.push('move');return this;},
    lineTo(x,y){log.push('line');return this;},
    closePath(){log.push('close');return this;},
    fill(a){log.push(['fill',a]);return this;}};
  assert.equal(drawSlimGlint(g,{x:10,y:20},{x:40,y:20}),true);
  assert.equal(log.filter(a=>Array.isArray(a)&&a[0]==='fill').length,2);
  assert.equal(log.filter(a=>a==='close').length,2);
  assert.equal(log.filter(a=>a==='stroke').length,0);
});

test('tail remains short and narrow at both zoom extremes',()=>{
  for(const scale of [.05,.8,1,3,20]){
    const shape=slimGlintGeometry({x:20,y:20},{x:120,y:20},scale);
    assert.ok(shape.tailLength<=SLIM_GLINT.tailPx*1.1);
    assert.ok(shape.coreLength<=SLIM_GLINT.coreLengthPx*1.1);
    assert.ok(shape.core[1].y-shape.core[3].y<=SLIM_GLINT.coreHalfWidthPx*2*1.1);
  }
});

test('glint follows target direction, including left and vertical shots',()=>{
  const right=slimGlintGeometry({x:0,y:0},{x:30,y:0});
  const left=slimGlintGeometry({x:30,y:0},{x:0,y:0});
  const up=slimGlintGeometry({x:0,y:30},{x:0,y:0});
  assert.ok(right.trail[1].x<right.core[0].x);
  assert.ok(left.trail[1].x>left.core[0].x);
  assert.ok(up.trail[1].y>up.core[0].y);
  assert.equal(slimGlintGeometry({x:1,y:1},{x:1,y:1}),null);
});

test('glint core and tail preserve single-hit visual budget',()=>{
  const g=slimGlintGeometry({x:-100,y:-100},{x:200,y:200});
  assert.equal(g.trail.length,4);
  assert.equal(g.core.length,4);
  assert.ok(SLIM_GLINT.maxVisualLengthPx>=g.tailLength+g.coreLength);
});
