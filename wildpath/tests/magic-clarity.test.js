import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BOOSTS} from '../src/config.js';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const main=read('../src/main.js'),pixi=read('../src/pixi-combat.js');
const html=read('../index.html'),css=read('../styles.css');
test('magical pickups have coherent drop, homing, collection and HUD response',()=>{
  assert.match(main,/function dropGlint\(enemy\)/);
  assert.match(main,/value:enemy\.type==='guardian'\?3:1/);
  assert.match(main,/p\.magnet=dist<9\.2\|\|p\.age>10/);
  assert.match(main,/if\(Math\.hypot\(game\.x-p\.x,game\.z-p\.z\)<1\.12\)/);
  assert.match(main,/absorbMagic\(p\.value\)/);
  assert.match(main,/function absorbMagic\(value\)/);
  assert.match(main,/floatingText\(\{x:game\.x,y:3\.25,z:game\.z\},'✦ \+'/);
  assert.match(main,/label\('energyText',game\.energy\+'/);
  assert.match(html,/id="energyPanel"/);
  assert.match(html,/id="energyFill"/);
  assert.match(css,/\.energy-track\{\s*height:12px/);
});
test('Power Surge is celebrated once, then resets after claiming a blessing',()=>{
  assert.match(main,/!game\.surgeCelebrated/);
  assert.match(main,/game\.surgeCelebrated=true/);
  assert.match(main,/spellStage\('Magic Surge','burst'/);
  assert.match(main,/game\.surgeCelebrated=false/);
  assert.match(main,/game\.energy=0/);
  assert.match(main,/game\.invulnerable=Math\.max/);
  assert.match(html,/id="surgeBanner"/);
  assert.match(css,/@keyframes surgeCelebrate/);
});
test('Pixi makes the energy visible without heavy in-flight beams',()=>{
  assert.match(pixi,/function drawMagicPickups\(/);
  assert.match(pixi,/drawMagicPickups\(g,game\.pickups\?\?\[\]/);
  assert.match(pixi,/e\.name==='Magic Pickup'/);
  assert.match(pixi,/e\.name==='Magic Surge'/);
  assert.match(pixi,/drawSlimGlint\(g,from,head/);
  assert.doesNotMatch(pixi,/drawEnergyProjectile\(/);
});
test('caster visuals each have a distinct readable combat signature',()=>{
  for(const name of ['Glint Dart','Winter Pool','Crystal Bloom','Pale Guard']){
    assert.match(pixi,new RegExp("e.name==='"+name+"'"));
  }
  assert.match(pixi,/e\.name==='Guard Block'/);
  assert.match(main,/blocked\?'✦ BLOCK'/);
});
test('Crystal Cascade is new and limited to open world with bounded nonrecursive hit spread',()=>{
  const upgrade=BOOSTS.find(x=>x.id==='cascade');
  assert.ok(upgrade);
  assert.equal(upgrade.onlyOpen,true);
  assert.deepEqual(upgrade.classes,['caster']);
  assert.match(main,/!b\.onlyOpen\|\|OPEN_WORLD/);
  assert.match(main,/!options\.fromCascade/);
  assert.match(main,/fromCascade:true/);
  assert.match(main,/if\(\+\+hits===4\)break/);
});
