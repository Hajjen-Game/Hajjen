const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const shared=require('../src/core/config.js');
const core=require('../src/gameplay/chroma-clash.js');
const pulse=require('../src/render/chroma-center-pulse.js');

test('Visual Cohesion 1.0 shares the actual Rush pigment palette, not a Clash substitute',()=>{
  assert.equal(core.PALETTES.length,7);
  shared.PALETTES.slice(0,7).forEach((p,index)=>{
    assert.deepEqual(core.paletteForZone(index),[p.primary,p.shadow,p.secondary]);
  });
  assert.deepEqual(core.paletteForZone(7),core.paletteForZone(0));
  assert.equal(core.COLORS[0],'#60ecff','the existing cyan player identity remains');
});

test('Visual pulse grows from screen center toward all edges without moving any obstacle',()=>{
  const rect={x:0,y:0,w:core.WIDTH,h:core.HEIGHT};
  const c=pulse.center(rect);
  assert.deepEqual(c,{x:core.CX,y:core.CY});
  assert.ok(pulse.radiusAt(.6,rect)>pulse.radiusAt(.25,rect));
  assert.ok(pulse.radiusAt(1,rect)>=pulse.maxRadius(rect));
  assert.equal(pulse.reached(c.x,c.y,rect,.2),true);
  assert.equal(pulse.reached(0,0,rect,.25),false);
  assert.equal(pulse.reached(0,0,rect,1),true);
  assert.equal(core.COLOR_FADE_SECONDS,1.10);
  const match=core.createMatch(17);
  match.elapsed=9.995;
  core.updateMatch(match,{x:0,y:0},1/120);
  assert.equal(match.half,198);
  assert.equal(match.stage,0);
  assert.equal(match.zone,1);
  assert.equal(core.speedForZone(match.zone),157);
});

test('Rush world style comes from cached atmospheric artwork and shared glass cube material',()=>{
  const src=read('src/gameplay/chroma-clash.js');
  const identity=read('src/render/chroma-identity.js');
  assert.match(src,/RUSH\.PALETTES\.slice\(0, 7\)/);
  assert.match(src,/IDENTITY\.paintPlayer\(c,/);
  assert.match(identity,/Motion-reactive translucent cube body/);
  assert.match(src,/const spriteCache = Object\.create\(null\)/);
  assert.match(src,/getStaticScene\(active, active\.zone\)/);
  assert.match(src,/ctx\.drawImage\(from, panoramaLeft, 0, panoramaWidth, HEIGHT\)/);
  assert.match(src,/ctx\.drawImage\(to, panoramaLeft, 0, panoramaWidth, HEIGHT\)/);
  assert.match(src,/drawDynamicArena\(active, time\)/);
  assert.match(src,/panoramaWidth = Math.max\(WIDTH,/);
  assert.match(src,/getStaticScene\(active, active.zone\)/);
  assert.doesNotMatch(src,/TIDE\.drawFront[\s\S]*ctx\.filter\s*=\s*'blur/);
  assert.ok(!src.includes('const off = i * 84'),
    'the diagonal wallpaper from the prototype is gone');
});

test('The pulse is a low-cost color seam; movement, quality fallback and run log remain intact',()=>{
  const src=read('src/gameplay/chroma-clash.js');
  const effect=read('src/render/chroma-center-pulse.js');
  const html=read('clash.html');
  assert.ok(src.includes('if (tideSlowFrames >= 4)'));
  assert.ok(src.includes('if (slowFrameStreak >= 8 && renderQuality > .56)'));
  assert.ok(src.includes('const BASE_PIXEL_BUDGET = 750000'));
  assert.ok(src.includes('updateMatch(match, readInput(), 1 / 120)'));
  assert.ok(src.includes('match.audit.noteFrame(frameMs, performance.now() - renderStart)'));
  assert.ok(!effect.includes('shadowBlur'));
  assert.ok(!effect.includes('globalCompositeOperation'));
  assert.match(html,/src="src\/render\/chroma-center-pulse\.js/);
  assert.match(html,/src="src\/core\/config\.js/);
  assert.match(html,/src="src\/render\/chroma-identity\.js/);
  assert.match(html,/id="clash-export"/);
  assert.match(html,/id="clash-export-pause"/);
  assert.doesNotMatch(html,/id="clash-(?:jump|dash)"/);
});

test('Shared Rush hierarchy keeps centered Zone and restrained events across screen sizes',()=>{
  const html=read('clash.html'), css=read('clash.css');
  assert.match(html,/class="hud-center"/);
  assert.match(html,/id="clash-zone"/);
  assert.match(html,/id="clash-phase"/);
  assert.match(css,/\.hud-center\{/);
  assert.match(css,/\.announce\{/);
  assert.match(css,/max-height:450px/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(html,/chroma-clash\.js\?v=chroma-clash-impact-depth-1\.2/);
});
