const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {drawBackground,drawArchitecture,THEMES,PARALLAX,projectX}=
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
    createLinearGradient(...args){calls.linear++;return{addColorStop(){}}},
    createRadialGradient(...args){calls.radials++;return{addColorStop(){}}},
    arc(){throw Error('Background Depth 2.0 does not draw circular obstacle lookalikes')},
    ellipse(){throw Error('No ring shapes in background')}
  };
  return{ctx,calls};
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
test('eight zones have unique skyline identities, not only a palette swap',()=>{
  assert.deepEqual(Object.keys(THEMES).sort(),palettes.map(p=>p.name).sort());
  const shapeNames=new Set(Object.values(THEMES).map(v=>v.shape));
  assert.equal(shapeNames.size,8,'each zone should have its own architecture silhouette family');
  for(const key of Object.keys(THEMES)){
    const result=render({motif:key});
    assert.ok(result.fills>5,'architecture must use proper polygons and structural forms');
  }
});
test('parallax planes travel at increasing real world-space rates',()=>{
  const speeds=Object.values(PARALLAX);
  assert.equal(speeds.length,5);
  for(let i=1;i<speeds.length;i++)assert.ok(speeds[i]>speeds[i-1]);
  const base=projectX(2,180,250,1280,PARALLAX.distant);
  const mid=projectX(2,180,250,1280,PARALLAX.middle);
  const near=projectX(2,180,250,1280,PARALLAX.near);
  assert.ok(base>mid&&mid>near,'near structures should scroll faster');
  for(const distance of [0,123.5,4444,98000]){
    const x=projectX(7,180,distance,980,PARALLAX.middle);
    assert.ok(x>=-180&&x<980+2*180,'projected geometry must stay inside bounded wrap');
  }
});
test('deep sky still paints the ENTIRE framebuffer before any architecture',()=>{
  for(const [width,height] of [[720,720],[1280,720],[1650,720],[900,560]]){
    const c=render({width,height});
    assert.deepEqual(c.rects.slice(0,4),Array.from({length:4},()=>[0,0,width,height]));
    assert.ok(c.radials>=2&&c.linear>=1);
  }
});
test('higher graphics tiers spend more architecture and detail work than performance',()=>{
  const high=render({quality:Q.high}),middle=render({quality:Q.balanced}),
        low=render({quality:Q.performance});
  assert.ok(high.fills>middle.fills&&middle.fills>low.fills,
    'silhouette count must scale with the existing graphics quality tiers');
  assert.ok(high.rects.length>low.rects.length);
  assert.ok(high.strokes>low.strokes);
  assert.ok(low.fills>0,'low-end phones must retain architectural depth');
});
test('true world distance drives parallax; speed does not shift background placement',()=>{
  const a=render({speed:370,scroll:2400}),b=render({speed:2500,scroll:2400});
  const silhouettes=c=>c.lines.filter(v=>v[0]==='move' || v[0]==='line');
  assert.deepEqual(silhouettes(a),silhouettes(b));
  assert.deepEqual(a.rects,b.rects,'at the same distance the architecture is identical');
  const c=render({speed:370,scroll:3250});
  assert.notDeepEqual(silhouettes(a),silhouettes(c),'movement changes the parallax positions');
});
test('changing motif changes actual structure shapes at identical position, not physics',()=>{
  const a=render({motif:'CYAN'}),b=render({motif:'VIOLET'});
  const firstPoints=c=>c.lines.filter(v=>v[0]==='line').slice(0,30);
  assert.notDeepEqual(firstPoints(a),firstPoints(b));
  assert.equal(GAME.baseSpeed,370);
  const source=fs.readFileSync(path.join(__dirname,'../src/render/world-background.js'),'utf8');
  assert.doesNotMatch(source,/Math\.random\s*\(/);
  const uncommented=source.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
  assert.doesNotMatch(uncommented,/groundAt|floorY|collision|terrain\./);
});
test('reduced motion preserves static architecture and eliminates moving streaks',()=>{
  const stopped=render({reducedMotion:true,scroll:2500});
  const stoppedNext=render({reducedMotion:true,scroll:9000});
  assert.deepEqual(stopped,stoppedNext);
  const motion=render({reducedMotion:false,scroll:9000});
  assert.notDeepEqual(stopped.lines,motion.lines);
});
test('stable deterministic rendering: no PRNG, timers, buffers, or dynamic image loading',()=>{
  const a=render(),b=render();
  assert.deepEqual(a,b);
  const source=fs.readFileSync(path.join(__dirname,'../src/render/world-background.js'),'utf8');
  assert.doesNotMatch(source,/setTimeout|setInterval|Image\(|OffscreenCanvas|drawImage|Math\.random/);
});
test('full-height gap background remains independent from track and its geometry',()=>{
  const stage={terrain:{segments:[{type:'gap',start:50,end:900}]},floorY:515};
  const before=JSON.stringify(stage);
  const calls=render(stage);
  assert.equal(JSON.stringify(stage),before);
  assert.deepEqual(calls.rects.slice(0,4),Array.from({length:4},()=>[0,0,1280,720]));
});
test('game uses shared palette identity inside BOTH halves of Spectral Wave',()=>{
  const game=fs.readFileSync(path.join(__dirname,'../src/gameplay/game.js'),'utf8');
  assert.match(game,/scroll:distance,motif:p\.name,reducedMotion/);
  assert.match(game,/spectralWave\.drawLayer\(ctx,W,H,/);
  assert.match(game,/paint\(spectralWave\.from\).*paint\(spectralWave\.to\)/s);
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  assert.match(html,/background-depth-2\.0/);
});
