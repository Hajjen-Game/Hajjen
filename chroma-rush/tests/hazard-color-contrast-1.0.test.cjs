const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {PALETTES,paletteForZone}=require('../src/core/config.js');
const {SpectralWave}=require('../src/render/spectral-wave.js');
const root=path.join(__dirname,'..');
function oklab(hex){
  const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)
    .map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
  const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b);
  const m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b);
  const s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
  return [.2104542553*l+.793617785*m-.0040720468*s,
    1.9779984951*l-2.428592205*m+.4505937099*s,
    .0259040371*l+.7827717662*m-.808675766*s];
}
const delta=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));

test('all 24 palettes give Jump/Duck distinct bright action colors',()=>{
  assert.equal(PALETTES.length,24);
  for(let i=0;i<PALETTES.length;i++){
    const p=PALETTES[i];
    assert.equal(paletteForZone(i*2+1),p);
    assert.equal(paletteForZone(i*2+2),p);
    assert.ok(Object.isFrozen(p));
    assert.match(p.hazardDuck,/^#[0-9a-f]{6}$/);
    assert.match(p.hazardJump,/^#[0-9a-f]{6}$/);
    assert.ok(delta(oklab(p.hazardDuck),oklab(p.hazardJump))>=.22,
      p.name+' must separate Jump from Duck visibly');
  }
  const redline=PALETTES.find(p=>p.name==='REDLINE');
  assert.equal(redline.hazardDuck,'#ff466c');
  assert.equal(redline.hazardJump,'#ffe25b');
});

test('24 real Chroma Tide transitions keep the two actions distinct',()=>{
  for(let i=0;i<PALETTES.length;i++){
    const a=PALETTES[i],b=PALETTES[(i+1)%PALETTES.length];
    const w=new SpectralWave();
    w.start({from:a,to:b,width:1280,duration:.86});
    for(const role of ['primary','secondary','shadow','hazardDuck','hazardJump']){
      assert.equal(w.ramps[role].length,65,a.name+' '+role);
      assert.equal(w.ramps[role][0],a[role]);
      assert.equal(w.ramps[role][64],b[role]);
      assert.ok(w.ramps[role].every(color=>/^#[0-9a-f]{6}$/.test(color)));
    }
    for(let step=0;step<=64;step++){
      const d=delta(oklab(w.ramps.hazardDuck[step]),
        oklab(w.ramps.hazardJump[step]));
      assert.ok(d>=.18,a.name+' -> '+b.name+' step '+step+' contrast '+d);
    }
    w.tick(.45,{playerX:340,playerY:515,height:720});
    assert.equal(w.colorAt(0,'hazardDuck',515,720),a.hazardDuck);
    assert.equal(w.colorAt(1250,'hazardJump',515,720),b.hazardJump);
  }
});

test('actual obstacle renderer shares material geometry with Duck but strengthens Jump inset',()=>{
  const game=fs.readFileSync(path.join(root,'src/gameplay/game.js'),'utf8');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const block=game.slice(game.indexOf('  function drawObstacle(o){'),
    game.indexOf('  function drawPlayer(){'));
  assert.match(block,/\(isLow\|\|isEcho\)\?'hazardJump':'hazardDuck'/);
  assert.match(block,/const jumpInset=Math\.min\(\.34,\(material\?\.inset\?\?\.18\)\+\.10\)/);
  assert.match(block,/shell\(b\.y,b\.h,\.30\)/);
  assert.match(block,/shell\(core\.y,core\.h,\.30\)/);
  assert.match(block,/roundRectPath\(b\.x\+6,b\.y\+8,b\.w-12,b\.h-15,2\)/);
  assert.match(block,/roundRectPath\(core\.x\+6,core\.y\+8,core\.w-12,core\.h-15,2\)/);
  assert.match(html,/hazard-contrast-1\.0-jump-material-1\.1/);
  assert.ok(html.indexOf('src/core/config.js')<html.indexOf('src/render/spectral-wave.js'));
  assert.ok(html.indexOf('src/render/spectral-wave.js')<html.indexOf('src/gameplay/game.js'));
});
