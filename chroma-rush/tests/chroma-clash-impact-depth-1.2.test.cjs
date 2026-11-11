const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const core=require('../src/gameplay/chroma-clash.js');
const file=fs.readFileSync(path.join(__dirname,'../src/gameplay/chroma-clash.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../clash.html'),'utf8');
test('Edge segments fall into world depth, never move downward or outward on screen',()=>{
  assert.equal(core.DEPTH_FALL_SECONDS,1);
  let lastScale=1,lastOpacity=1;
  for(const time of [0,.12,.25,.4,.6,.8,1]){
    const p=core.depthFall(time,2);
    assert.deepEqual([p.x,p.y,p.rotation],[0,0,0]);
    assert.ok(p.scale<=lastScale+1e-7&&p.scale>0);
    assert.ok(p.opacity<=lastOpacity+1e-7);
    lastScale=p.scale;lastOpacity=p.opacity;
  }
  assert.ok(lastScale<.11);
  assert.equal(lastOpacity,0);
  const draw=file.slice(file.indexOf('function drawFallenRims('),file.indexOf('function drawArena('));
  assert.match(draw,/ctx\.translate\(centerX, centerY\)/);
  assert.match(draw,/ctx\.scale\(fall\.scale, fall\.scale\)/);
  assert.doesNotMatch(draw,/drop\s*=\s*rim\.age/);
  assert.doesNotMatch(draw,/ctx\.rotate\(/);
  assert.doesNotMatch(draw,/rim\.age\s*\*\s*24/);
});
test('Collision effects use the Rush straight-cut language, not an on-screen ring',()=>{
  const draw=file.slice(file.indexOf('function drawImpact('),file.indexOf('function getStaticScene('));
  assert.match(draw,/ctx\.moveTo\(/);
  assert.match(draw,/ctx\.lineTo\(/);
  assert.doesNotMatch(draw,/ctx\.arc\(/);
  assert.doesNotMatch(draw,/ctx\.shadowBlur\s*=/);
  assert.doesNotMatch(draw,/globalCompositeOperation/);
  assert.ok(core.IMPACT_VISUAL_LIFE<.3);
  const m=core.createMatch(21),a=m.cubes[0],b=m.cubes[1];
  a.x=470;a.y=270;a.vx=145;b.x=495;b.y=270;b.vx=-55;
  core.collide(a,b,m);
  assert.equal(m.audit.totalContacts,1);
  assert.ok(m.impacts.length===1);
  assert.ok(Number.isFinite(m.impacts[0].nx));
  assert.equal(m.impacts[0].life,core.IMPACT_VISUAL_LIFE);
  assert.ok(b.knockVx>200);
});
test('Match physics and end-of-life fall timing remain untouched',()=>{
  const m=core.createMatch(9);
  assert.equal(m.stage,0);
  m.elapsed=13.995;
  core.updateMatch(m,{x:0,y:0},1/120);
  assert.equal(m.stage,1);
  assert.equal(m.falling.length,1);
  assert.equal(m.falling[0].oldHalf,198);
  assert.equal(m.falling[0].newHalf,166);
  core.updateMatch(m,{x:0,y:0},1/120);
  assert.ok(m.falling[0].age>0);
});
test('New file version reaches mobile browsers',()=>{
  assert.match(html,/chroma-clash\.js\?v=chroma-clash-impact-depth-1\.2/);
});
