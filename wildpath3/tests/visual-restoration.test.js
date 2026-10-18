import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');

test('Wildpath 3 restores the original actors without copying legacy source',()=>{
  const actors=read('../src/actors.js');
  assert.match(actors,/import \{createActor\} from '\.\.\/\.\.\/wildpath\/src\/actors-v2\.js\?v=3\.1\.0'/);
  assert.match(actors,/createActor\(scene,type==='hero'\?'caster':type,type!=='hero'\)/);
  assert.match(actors,/torso:actor\.body/);
});
test('full-bleed green world replaces raised neon test circle',()=>{
  const arena=read('../src/arena.js');
  assert.ok(arena.includes("CreateGround('continuous richly painted glade'"));
  assert.ok(arena.includes('B.VertexBuffer.ColorKind'));
  assert.ok(!arena.includes("'arena raised lime rim'"));
  assert.ok(!arena.includes("'arena raised meadow'"));
  assert.ok(arena.includes("'short wooden border plank'"));
});
test('old water effects restored optionally, never control gameplay',()=>{
  const vfx=read('../src/vfx.js'),game=read('../src/game.js');
  assert.match(vfx,/from '\.\.\/\.\.\/wildpath\/src\/water-pixi\.js\?v=3\.1\.0'/);
  assert.ok(vfx.includes('drawWaterProjectile(g,from,head'));
  assert.ok(vfx.includes('drawWaterSpell(g,e,pos,16)'));
  assert.ok(game.includes('this.scene.render();'));
  assert.ok(game.includes('this.vfx.update(dt,this.projectiles'));
  assert.ok(game.includes('this.makeRipple('));
});
test('mobile HUD exposes scores, nature feedback and end-of-round total',()=>{
  const html=read('../index.html'),css=read('../styles.css');
  for(const id of ['scoreText','comboText','bestText','resultScore','resultBest','resultCombo','floaters'])
    assert.ok(html.includes('id="'+id+'"'),id);
  assert.ok(css.includes('@keyframes wildpathScoreRise'));
  assert.ok(html.includes('3.0.2-garden-fusion'));
  const game=read('../src/game.js');
  for(const category of ['enemy.type','seed','event.tier','event.kind','wave'])
    assert.ok(game.includes(category),category);
  assert.ok(game.includes("localStorage.setItem('wildpath3.best.score'"));
  assert.ok(!html.includes('data-slot='));
});
