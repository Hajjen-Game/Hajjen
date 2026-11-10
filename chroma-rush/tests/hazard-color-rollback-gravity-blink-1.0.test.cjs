const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {PALETTES,paletteForZone}=require('../src/core/config.js');
const {SpectralWave}=require('../src/render/spectral-wave.js');
const game=fs.readFileSync(path.join(__dirname,'../src/gameplay/game.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');

test('restore all 24 previously approved Jump/Duck theme colors, not the new custom palette',()=>{
  const expected=[
    ['CYAN','#3feeff','#53b5ff'],['VIOLET','#a06bff','#e265ff'],
    ['MAGENTA','#ff4aa2','#ff8ada'],['LIME','#b6ff4e','#3ef5d3'],
    ['AMBER','#ffc25d','#ff5d7e'],['ELECTRIC','#6078ff','#30fdce'],
    ['REDLINE','#ff466c','#ffb151'],['WHITEOUT','#f1fbff','#72dfff'],
    ['ROSESHIFT','#ff789f','#a858ff'],['SOLAR','#ffe067','#ff814c'],
    ['AQUAFLARE','#39ffc8','#2f91ff'],['COBALT','#3c9aff','#a0d7ff'],
    ['HOTPINK','#ff4fce','#ffd0f2'],['JADE','#58ffa8','#d4ff68'],
    ['ULTRAVIOLET','#ba55ff','#68a0ff'],['COPPER','#ff9a53','#ffc37d'],
    ['ICEBLUE','#77e9ff','#bbfaff'],['SCARLET','#ff5262','#fc82c2'],
    ['CITRUS','#ecff5d','#ffbb49'],['NOVA','#b7afff','#58c9ff'],
    ['FUCHSIA','#ff3cb5','#ff7077'],['CERULEAN','#45b5ff','#72f2df'],
    ['VERDANT','#81ff69','#35ffc0'],['PLASMA','#aa64ff','#ffac6e']
  ];
  assert.equal(PALETTES.length,24);
  for(let i=0;i<expected.length;i++){
    const p=PALETTES[i],e=expected[i];
    assert.equal(p.name,e[0]);
    assert.equal(p.primary,e[1]);
    assert.equal(p.secondary,e[2]);
    assert.deepEqual(Object.keys(p),['name','primary','secondary','shadow']);
    assert.ok(Object.isFrozen(p));
    assert.equal(paletteForZone(i*2+1),p);
    assert.equal(paletteForZone(i*2+2),p);
  }
  const draw=game.slice(game.indexOf('  function drawObstacle(o){'),
    game.indexOf('  function drawPlayer(){'));
  assert.match(draw,/\(isLow\|\|isEcho\)\?'secondary':'primary'/,
    'ordinary Jump restores secondary and Duck restores primary');
  assert.doesNotMatch(draw,/'hazardJump'|'hazardDuck'/);
  assert.match(draw,/const jumpInset=Math\.min\(\.34,\(material\?\.inset\?\?\.18\)\+\.10\)/,
    'KEEP the user-approved richer Jump inner fill');
});

test('Chroma Tide returns to three original channels, with smooth color transitions',()=>{
  const a=PALETTES[0],b=PALETTES[1],wave=new SpectralWave();
  wave.start({from:a,to:b,width:1280,duration:.86});
  assert.deepEqual(Object.keys(wave.ramps),['primary','secondary','shadow']);
  for(const role of ['primary','secondary','shadow']){
    assert.equal(wave.ramps[role].length,65);
    assert.equal(wave.ramps[role][0],a[role]);
    assert.equal(wave.ramps[role][64],b[role]);
  }
  wave.tick(.5,{playerX:350,playerY:515,height:720});
  assert.equal(wave.colorAt(0,'primary'),a.primary);
  assert.equal(wave.colorAt(1250,'secondary'),b.secondary);
  assert.match(html,/hazard-color-rollback-1\.0-gravity-blink-fix-1\.0/);
});

test('Gravity Shift immunity does not cause fake damage blinking of the cube',()=>{
  // A flip still grants real collision immunity, without a visual damage cue.
  const begin=game.slice(game.indexOf("    if(gravityEvent==='begin'){"),
    game.indexOf("    const ground=terrain.groundAt(playerWorld);"));
  assert.match(begin,/player\.invulnerable=Math\.max\(player\.invulnerable,\.58\+\.28\)/);
  assert.match(begin,/player\.invulnerable=Math\.max\(player\.invulnerable,\.28\)/);
  assert.doesNotMatch(begin,/damageBlinkRemaining|hitFlash=/);
  const player=game.slice(game.indexOf('  function drawPlayer(){'),
    game.indexOf('  function drawFx(',game.indexOf('  function drawPlayer(){')));
  assert.match(player,/if\(damageBlinkRemaining>0&&Math\.floor\(worldTime\*16\)%2===0\)ctx\.globalAlpha=\.32/);
  assert.doesNotMatch(player,/if\(player\.invulnerable>0&&Math\.floor/);
  assert.match(game,/damageBlinkRemaining=Math\.max\(0,damageBlinkRemaining-dt\)/);
  assert.match(game,/hitFlash=0;damageBlinkRemaining=0;/,
    'new runs reset visual damage state');
});

test('genuine obstacles and missed gaps retain the blinking hit feedback',()=>{
  const hit=game.slice(game.indexOf('  function onHit(o){'),
    game.indexOf('  function failGap(gap){'));
  const gap=game.slice(game.indexOf('  function failGap(gap){'),
    game.indexOf('  function clearGap(gap){'));
  assert.match(hit,/player\.invulnerable=\.96;damageBlinkRemaining=\.96;shake=12;hitFlash=\.38/);
  assert.match(gap,/player\.invulnerable=Math\.max\(player\.invulnerable,1\.15\);damageBlinkRemaining=Math\.max\(damageBlinkRemaining,1\.15\)/);
  assert.match(hit,/if\(gravityShift\.protected\)/,
    'protected contacts still cannot count as damage');
  assert.match(gap,/if\(absorbed\)flow\.registerCollision\(\)/,
    'missed gaps still protect shield from repeated damage');
});
