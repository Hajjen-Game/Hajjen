/* Visual Signature 2.0 follow-up: requested rollback of added streaks. */
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {ChromaSurge,WINDOW_SECONDS,MAX_CHAIN}=require('../src/gameplay/chroma-surge.js');
const {drawBackground}=require('../src/render/world-background.js');
const {drawTerrain}=require('../src/render/terrain-renderer.js');
const {paintPlayer}=require('../src/render/chroma-identity.js');
const {GAME,PALETTES}=require('../src/core/config.js');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
function canvas(){
  const trace={gradients:[],strokes:0,clips:0,rects:0,fills:0};
  const ctx={
    save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},
    closePath(){},clip(){trace.clips++},stroke(){trace.strokes++},
    fill(){trace.fills++},fillRect(){trace.rects++},
    createRadialGradient(...args){
      const g={type:'radial',args,stops:[]};trace.gradients.push(g);
      return {addColorStop(offset,color){g.stops.push([offset,color])}};
    },
    createLinearGradient(...args){
      const g={type:'linear',args,stops:[]};trace.gradients.push(g);
      return {addColorStop(offset,color){g.stops.push([offset,color])}};
    },
    arc(){throw Error('No decorative rings')},
    ellipse(){throw Error('No decorative ellipses')}
  };
  return {ctx,trace};
}
test('seven-second skill window remains fully functional without a soundtrack',()=>{
  const s=new ChromaSurge();
  assert.equal(WINDOW_SECONDS,7);
  s.arm({zone:3});assert.equal(s.progress,0);
  assert.equal(s.activate(),true);
  s.tick(2.75);assert.ok(s.progress>.60&&s.progress<.61);
  assert.equal(s.onClear({kind:'jump'}).points,95);
  assert.equal(s.onClear({kind:'duck',precision:true}).points,165);
  assert.equal(s.points,260);assert.equal(s.chain,2);
  assert.equal(s.tick(4.25),'complete');
  assert.equal(s.progress,0);
  assert.equal(s.onClear({kind:'jump'}),null);
  assert.equal(MAX_CHAIN,4);
});
test('all Phase 2 cube wake, screen ground conductors and decorative Surge streaks are removed',()=>{
  const source=read('src/gameplay/chroma-surge.js');
  const game=read('src/gameplay/game.js');
  const s=new ChromaSurge();
  assert.equal(typeof s.drawRunner,'undefined');
  assert.equal(typeof s.draw,'undefined');
  assert.doesNotMatch(source,/drawRunner\(|ctx\.stroke\(|ctx\.lineTo\(/);
  assert.doesNotMatch(game,/surge\.drawRunner\(|surge\.draw\(/);
  const start=game.slice(game.indexOf('  function startSurge(){'),
    game.indexOf('  function awardSurge('));
  assert.doesNotMatch(start,/frameEcho\(|groundPulse\(|burst\(/);
  assert.equal(s.onClear({kind:'jump'}),null);
});
test('ambient relighting uses the existing sky fills: no new streaks or additional full-screen render passes',()=>{
  const p=PALETTES[2],common={width:1200,height:720,time:40,
    speed:1600,primary:p.primary,secondary:p.secondary,shadow:p.shadow,
    flow:75,glowLine(){}};
  const ordinary=canvas(),lit=canvas(),performance=canvas();
  drawBackground({ctx:ordinary.ctx,...common,lighting:0,
    quality:{density:1,glow:1}});
  drawBackground({ctx:lit.ctx,...common,lighting:1,
    quality:{density:1,glow:1}});
  drawBackground({ctx:performance.ctx,...common,lighting:1,
    quality:{density:.36,glow:.24}});
  assert.equal(lit.trace.rects,ordinary.trace.rects,
    'no new full-canvas color overlay');
  assert.equal(lit.trace.strokes,ordinary.trace.strokes,
    'no additional background line sprites');
  assert.equal(lit.trace.gradients.length,ordinary.trace.gradients.length);
  assert.deepEqual(lit.trace.gradients.filter(g=>g.type==='radial').length,2);
  const oldGlow=ordinary.trace.gradients.find(g=>g.type==='radial');
  const newGlow=lit.trace.gradients.find(g=>g.type==='radial');
  assert.notDeepEqual(newGlow.stops,oldGlow.stops);
  assert.equal(oldGlow.args[0],1200*.33,'light is centered behind playable lane');
  assert.ok(newGlow.stops[0][1].includes(p.primary.slice(1).length? 'rgba(':'' ));
  assert.ok(performance.trace.gradients.length===ordinary.trace.gradients.length);
});
test('terrain receives color bounce only within the EXISTING clipped solids; gaps are still transparent',()=>{
  const p=PALETTES[1],terrain={segments:[
    {type:'flat',start:0,end:500,y0:515,y1:515},
    {type:'gap',start:500,end:610,y0:515,y1:515},
    {type:'flat',start:610,end:1500,y0:515,y1:515}]};
  const common={terrain,distance:0,width:1200,height:720,baseY:515,
    primary:p.primary,secondary:p.secondary,glowLine(){},
    quality:{density:1,glow:1,gridStep:105,terrainStep:16}};
  const ordinary=canvas(),lit=canvas();
  drawTerrain({ctx:ordinary.ctx,...common,lighting:0});
  drawTerrain({ctx:lit.ctx,...common,lighting:1});
  assert.equal(ordinary.trace.clips,1);
  assert.equal(lit.trace.clips,1);
  assert.equal(lit.trace.strokes,ordinary.trace.strokes,'no new track lines');
  assert.equal(lit.trace.rects,ordinary.trace.rects,'no extra geometry');
  const normal=ordinary.trace.gradients[0],bright=lit.trace.gradients[0];
  assert.notDeepEqual(normal.stops,bright.stops);
});
test('glass body brightens through its EXISTING shader, never a new cube stripe',()=>{
  const p=PALETTES[0];
  const common={x:250,y:450,w:44,h:44,primary:p.primary,
    secondary:p.secondary,pose:{glow:.2},motion:{},
    quality:{density:1,glow:1},bodyPath(){}};
  const old=canvas(),relit=canvas();
  paintPlayer(old.ctx,{...common,ambientLight:0});
  paintPlayer(relit.ctx,{...common,ambientLight:1});
  assert.equal(relit.trace.strokes,old.trace.strokes);
  assert.equal(relit.trace.fills,old.trace.fills);
  assert.equal(relit.trace.gradients.length,old.trace.gradients.length);
  assert.notDeepEqual(relit.trace.gradients[0].stops,old.trace.gradients[0].stops);
  assert.equal(GAME.damagePerHit,25);
});
test('HUD bonus and Endless Escalation remain intact; original wave is not edited',()=>{
  const html=read('index.html'),game=read('src/gameplay/game.js');
  for(const id of ['surge-indicator','surge-label','surge-bonus','surge-meter','surge-meter-fill'])
    assert.ok(html.includes('id="'+id+'"'));
  assert.match(html,/LATEST UPDATE · AMBIENT LIGHTING 2\.1/);
  assert.match(game,/lighting:surge\.intensity/);
  assert.match(game,/surge\.progress\*100/);
  assert.match(game,/surge\.arm\(\{zone\}\)/);
  assert.match(game,/spectralWave\.draw\(ctx/);
  const director=read('src/director/adaptive-director.js');
  assert.match(director,/function escalationFloor\(/);
  assert.match(director,/this\.escalation\.attacks\+\+/);
  assert.equal(GAME.lateAcceleration,2.3);
  assert.equal(GAME.zoneSeconds,12);
});
