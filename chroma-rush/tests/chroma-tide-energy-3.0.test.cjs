const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const {SpectralWave}=require('../src/render/spectral-wave.js');
const {drawBackground}=require('../src/render/world-background.js');
const {drawTerrain}=require('../src/render/terrain-renderer.js');
const {paintPlayer,drawContact}=require('../src/render/chroma-identity.js');
const {PALETTES,GAME}=require('../src/core/config.js');
const A=PALETTES[0],B=PALETTES[1];
function tide(){
 const w=new SpectralWave();
 w.start({from:A,to:B,width:1000,duration:.86,chargeDuration:.19});
 w.tick(.53,{playerX:300,playerY:515,height:720});
 return w;
}
function sketch(){
 const trace={radial:0,linear:0,fills:[],strokes:[],clips:0,arcs:0};
 const ctx={
  globalAlpha:1,shadowBlur:0,
  save(){},restore(){},beginPath(){},closePath(){},
  moveTo(){},lineTo(){},clip(){trace.clips++},
  fillRect(...dims){trace.fills.push(dims)},
  fill(){},stroke(){trace.strokes.push({alpha:this.globalAlpha,style:this.strokeStyle})},
  fillText(){},arc(){trace.arcs++;throw Error('ring forbidden')},
  ellipse(){trace.arcs++;throw Error('ring forbidden')},
  createRadialGradient(){trace.radial++;return {addColorStop(){}}},
  createLinearGradient(){trace.linear++;return {addColorStop(){}}}
 };
 return {ctx,trace};
}
test('original background stays one pass, gains deep phase light only on higher tiers',()=>{
 const wave=tide();
 const high=sketch(),low=sketch();
 const common={width:1000,height:720,time:13,speed:670,
  primary:B.primary,secondary:B.secondary,shadow:B.shadow,
  tide:wave,glowLine(){}};
 drawBackground({ctx:high.ctx,...common,quality:{density:1,glow:1}});
 drawBackground({ctx:low.ctx,...common,quality:{density:.35,glow:.24}});
 assert.equal(high.trace.radial,low.trace.radial+1,
  'one bounded radial atmospheric reflection on High');
 assert.equal(low.trace.radial,4,'Performance does not allocate the extra radial');
 assert.equal(high.trace.clips,2,'spatial background masks are unchanged');
 assert.equal(low.trace.clips,2);
 assert.equal(high.trace.arcs,0);
 const sky=high.trace.fills.find(fill=>fill[2]<600&&fill[3]<720);
 assert.ok(sky,'reflection must be spatially bounded, not a flash');
});
test('terrain refraction stays clipped into true existing solids and skips Performance',()=>{
 const wave=tide();
 const terrain={segments:[
  {type:'flat',start:0,end:560,y0:515,y1:515},
  {type:'gap',start:560,end:660,y0:515,y1:515},
  {type:'flat',start:660,end:1400,y0:515,y1:515}]};
 const high=sketch(),low=sketch();
 const common={terrain,distance:0,width:1000,height:720,baseY:515,
  primary:B.primary,secondary:B.secondary,tide:wave,glowLine(){}};
 drawTerrain({ctx:high.ctx,...common,quality:{density:1,glow:1,terrainStep:16,gridStep:105}});
 drawTerrain({ctx:low.ctx,...common,quality:{density:.35,glow:.24,terrainStep:24,gridStep:120}});
 assert.equal(high.trace.clips,1,'only the original one terrain-solid clip is used');
 assert.equal(low.trace.clips,1);
 assert.ok(high.trace.strokes.length>low.trace.strokes.length,
  'High gains a surface-aligned shimmer, Performance does not');
 assert.ok(high.trace.fills.length>low.trace.fills.length,
  'ground phase light is skipped entirely on Performance');
});
test('player becomes a clean white-hot light source only while front crosses',()=>{
 const ordinary=sketch(),crossed=sketch();
 const settings={x:200,y:440,w:44,h:44,primary:B.primary,secondary:B.secondary,
  pose:{glow:.2},motion:{},quality:{density:1,glow:1},
  bodyPath(){}};
 paintPlayer(ordinary.ctx,{...settings,tideResonance:0});
 paintPlayer(crossed.ctx,{...settings,tideResonance:1});
 assert.notEqual(ordinary.trace.strokes[0].style,crossed.trace.strokes[0].style);
 assert.equal(crossed.trace.strokes[0].style,'#f6fdff');
 const contact=sketch();
 drawContact(contact.ctx,{x:300,surface:515,width:44,tideResonance:1,
  primary:B.primary,secondary:B.secondary,motion:{},quality:{density:1,glow:1}});
 assert.ok(contact.trace.fills.length>=1);
 assert.equal(contact.trace.arcs,0);
});
test('wave is singular, player crossing and afterglow expire, reduced motion avoids it',()=>{
 const w=tide();
 const initialFront=w.frontAt(515,720);
 w.tick(.10,{playerX:300,playerY:515,height:720});
 assert.ok(w.frontAt(515,720)<initialFront);
 let passes=0;
 for(let i=0;i<120&&w.active;i++)passes+=Number(w.tick(1/60,{playerX:300,playerY:515,height:720}));
 assert.equal(passes,1);
 assert.equal(w.active,false);
 assert.ok(w.afterglow>0);
 w.tick(1);assert.equal(w.afterglow,0);
 const off=new SpectralWave();
 off.start({from:A,to:B,width:1000,chargeDuration:.19,reducedMotion:true});
 assert.equal(off.active,false);
 assert.equal(off.colorAt(300,'primary'),B.primary);
 const c=sketch();off.draw(c.ctx,{width:1000,height:720});
 assert.equal(c.trace.fills.length,0);
 assert.equal(GAME.zoneSeconds,12);
});
test('source wiring protects original world and makes audit version traceable',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const game=fs.readFileSync(path.join(root,'src/gameplay/game.js'),'utf8');
 const background=fs.readFileSync(path.join(root,'src/render/world-background.js'),'utf8');
 const terrain=fs.readFileSync(path.join(root,'src/render/terrain-renderer.js'),'utf8');
 assert.match(html,/(?:PREMIUM ARCADE UI 4\.0|ARCADE SIMPLIFICATION 1\.0|CORE PACE 1\.1|CHROMA SURGE 1\.0|ACTION DENSITY 2\.0|RUSH CHAINS 3\.0|ENDLESS ESCALATION 4\.0)/);
 assert.match(html,/original-background-restored-1\.0/);
 assert.match(html,/spectral-wave\.js\?v=[^"]*energy-3\.0/);
 assert.match(game,/tideResonance:spectralWave\.resonance/);
 assert.equal((game.match(/worldBackground\.drawBackground\(/g)||[]).length,1);
 assert.equal((game.match(/terrainRender\.drawTerrain\(/g)||[]).length,1);
 assert.match(background,/tide\.frontAt\(sy,H\)/);
 assert.match(terrain,/for\(const run of runs\)traceSurface\(/);
 assert.doesNotMatch(game,/spectralWave\.drawLayer\(/);
});
