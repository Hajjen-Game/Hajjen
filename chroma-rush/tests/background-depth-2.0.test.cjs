const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {drawBackground,drawLandscape,landscapeHeight,THEMES,LAYERS,PARALLAX,projectX}=
  require('../src/render/world-background.js');
const {PALETTES,GAME}=require('../src/core/config.js');

function canvas(){
  const calls={rects:[],paths:[],lines:[],fills:0,strokes:0,radials:0,linear:0};
  const ctx={
    fillRect(...args){calls.rects.push(args)},
    beginPath(){calls.paths.push('begin')},closePath(){calls.paths.push('close')},
    moveTo(...args){calls.lines.push(['move',...args])},
    lineTo(...args){calls.lines.push(['line',...args])},
    stroke(){calls.strokes++},fill(){calls.fills++},save(){},restore(){},
    createLinearGradient(){calls.linear++;return{addColorStop(){}}},
    createRadialGradient(){calls.radials++;return{addColorStop(){}}},
    arc(){throw Error('Landscape background must not draw obstacle-shaped rings')},
    ellipse(){throw Error('Landscape background cannot draw elliptical halos')}
  };
  return {ctx,calls};
}
const palettes=PALETTES;
const Q={
  high:{density:1,glow:1,name:'high'},
  balanced:{density:.65,glow:.64,name:'balanced'},
  performance:{density:.36,glow:.24,name:'performance'}
};
function render(overrides={}){
  const {ctx,calls}=canvas();
  const palette=palettes.find(p=>p.name===(overrides.motif||'CYAN'))||palettes[0];
  drawBackground({ctx,width:1280,height:720,time:12,speed:980,scroll:2450,flow:75,
    primary:palette.primary,secondary:palette.secondary,shadow:palette.shadow,
    motif:palette.name,quality:Q.high,glowLine:(...args)=>calls.lines.push(['glow',...args]),
    ...overrides});
  return calls;
}
const contours=c=>c.lines.filter(v=>v[0]==='move'||v[0]==='line');

test('eight zones retain unique LANDSCAPE identities, not different buildings',()=>{
  assert.deepEqual(Object.keys(THEMES).sort(),palettes.map(p=>p.name).sort());
  const shapeNames=new Set(Object.values(THEMES).map(v=>v.shape));
  assert.equal(shapeNames.size,8);
  for(const key of Object.keys(THEMES)){
    const result=render({motif:key});
    assert.equal(result.fills,3,'each environment has exactly three uninterrupted mountain planes');
    assert.ok(result.paths.filter(x=>x==='close').length>=3);
  }
  const source=fs.readFileSync(path.join(__dirname,'../src/render/world-background.js'),'utf8');
  assert.ok(!source.includes('function silhouette('),'2.0 tower silhouette builder should be retired');
  assert.ok(!source.includes('function drawArchitecture('),'2.0 building painter should be retired');
});
test('parallax layers preserve independent world-space drift and correct depth',()=>{
  const speeds=Object.values(PARALLAX);
  assert.equal(speeds.length,5);
  for(let i=1;i<speeds.length;i++)assert.ok(speeds[i]>speeds[i-1]);
  assert.deepEqual(Object.keys(LAYERS),['distant','middle','near']);
  const far=projectX(2,180,250,1280,PARALLAX.distant);
  const mid=projectX(2,180,250,1280,PARALLAX.middle);
  const near=projectX(2,180,250,1280,PARALLAX.near);
  assert.ok(far>mid&&mid>near);
  for(const distance of [0,123.5,4444,98000]){
    const x=projectX(7,180,distance,980,PARALLAX.middle);
    assert.ok(x>=-180&&x<980+360);
  }
});
test('mountain layers are contiguous, soft and vertically separated',()=>{
  const H=720;
  for(const motif of Object.keys(THEMES)){
    let previous=null;
    for(let x=-15;x<=1450;x+=12){
      const sample={};
      for(const layer of Object.keys(LAYERS)){
        sample[layer]=landscapeHeight(x,{height:H,travel:5400,motif,layer});
        assert.ok(sample[layer]>=H*.31&&sample[layer]<=H*.76);
        if(previous)assert.ok(Math.abs(sample[layer]-previous[layer])<H*.11,
          'landscape profile must not introduce cliff-like vertical jumps');
      }
      previous=sample;
    }
  }
  const far=landscapeHeight(300,{height:H,travel:2400,layer:'distant'});
  const mid=landscapeHeight(300,{height:H,travel:2400,layer:'middle'});
  const near=landscapeHeight(300,{height:H,travel:2400,layer:'near'});
  assert.ok(far<mid&&mid<near,'layers should deepen progressively towards the track');
});
test('sky and atmosphere paint the entire canvas behind gaps at every ratio',()=>{
  for(const [width,height] of [[720,720],[1280,720],[1650,720],[900,560]]){
    const c=render({width,height});
    assert.deepEqual(c.rects.slice(0,4),Array.from({length:4},()=>[0,0,width,height]));
    assert.ok(c.radials>=2&&c.linear>=1);
  }
});
test('HIGH draws more ridge samples than BALANCED and PERFORMANCE',()=>{
  const a=render({quality:Q.high});
  const b=render({quality:Q.balanced});
  const c=render({quality:Q.performance});
  assert.ok(contours(a).length>contours(b).length);
  assert.ok(contours(b).length>contours(c).length);
  assert.equal(a.fills,3);assert.equal(b.fills,3);assert.equal(c.fills,3);
  assert.ok(a.rects.length>c.rects.length,'stars and optional details are bounded');
  assert.ok(a.strokes>c.strokes,'far ridge crest omitted on performance preset');
});
test('actual traveled distance moves ridges independent of instantaneous speed',()=>{
  const a=render({speed:370,scroll:2400}),b=render({speed:2500,scroll:2400});
  assert.deepEqual(contours(a),contours(b));
  assert.deepEqual(a.rects,b.rects,'no speed-driven geometry change');
  const c=render({speed:370,scroll:3250});
  assert.notDeepEqual(contours(a),contours(c),'parallax must advance after player travels');
});
test('motif changes actual mountain shape, not only palette colors',()=>{
  const keys=Object.keys(THEMES);
  const originals=keys.map(motif=>contours(render({motif})).slice(0,50));
  for(let i=1;i<originals.length;i++)assert.notDeepEqual(originals[i-1],originals[i]);
  assert.equal(GAME.baseSpeed,370);
  const source=fs.readFileSync(path.join(__dirname,'../src/render/world-background.js'),'utf8');
  assert.doesNotMatch(source,/Math\.random\s*\(/);
  const noComments=source.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
  assert.doesNotMatch(noComments,/groundAt|floorY|terrain\./);
});
test('reduced motion freezes drift but still displays all static mountain planes',()=>{
  const a=render({reducedMotion:true,scroll:2500});
  const b=render({reducedMotion:true,scroll:9000});
  assert.deepEqual(a,b);
  assert.equal(a.fills,3);
  const c=render({reducedMotion:false,scroll:9000});
  assert.notDeepEqual(contours(a),contours(c));
});
test('background is deterministic, bounded, no timers, heavy textures or gameplay RNG',()=>{
  const a=render(),b=render();
  assert.deepEqual(a,b);
  const source=fs.readFileSync(path.join(__dirname,'../src/render/world-background.js'),'utf8');
  assert.doesNotMatch(source,/setTimeout|setInterval|Image\(|OffscreenCanvas|drawImage|Math\.random/);
});
test('an open gap renders untouched background; no terrain-dependent masks',()=>{
  const world={terrain:{segments:[{type:'gap',start:50,end:900}]},floorY:515};
  const before=JSON.stringify(world);
  const c=render(world);
  assert.equal(JSON.stringify(world),before);
  assert.deepEqual(c.rects.slice(0,4),Array.from({length:4},()=>[0,0,1280,720]));
});
test('Spectral Wave still spatially clips old/new landscape identity',()=>{
  const game=fs.readFileSync(path.join(__dirname,'../src/gameplay/game.js'),'utf8');
  assert.match(game,/scroll:distance,motif:p\.name,reducedMotion/);
  assert.match(game,/spectralWave\.drawLayer\(ctx,W,H,/);
  assert.match(game,/paint\(spectralWave\.from\).*paint\(spectralWave\.to\)/s);
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  assert.match(html,/name="chroma-build" content="arcade-animation-2\.0"/);
  assert.match(html,/world-background\.js\?v=background-depth-2\.1/);
});
