const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const root=path.join(__dirname,'..');
const modules={
 ChromaDirector:require('../src/director/adaptive-director.js'),
 ChromaMovementAwareness:require('../src/director/movement-awareness.js'),
 ChromaHighSpeedFairness:require('../src/director/high-speed-fairness.js'),
 ChromaConfig:require('../src/core/config.js'),
 ChromaGeometry:require('../src/core/geometry.js'),
 ChromaHud:require('../src/ui/hud.js'),
 ChromaFlow:require('../src/gameplay/flow.js'),
 ChromaPrecisionCombo:require('../src/gameplay/precision-combo.js'),
 ChromaAudio:require('../src/audio/reactive-audio.js'),
 ChromaProgress:require('../src/progression/arcade-progress.js'),
 ChromaArcadeUI:require('../src/ui/arcade-ui.js'),
 ChromaTerrain:require('../src/terrain/terrain-system.js'),
 ChromaJump:require('../src/gameplay/jump-controller.js'),
 ChromaDash:require('../src/gameplay/contextual-dash.js'),
 ChromaMotion:require('../src/render/player-motion.js'),
 ChromaEffects:require('../src/render/effect-language.js'),
 ChromaTerrainRender:require('../src/render/terrain-renderer.js'),
 ChromaWorldBackground:require('../src/render/world-background.js'),
 ChromaSpectralWave:require('../src/render/spectral-wave.js'),
 ChromaStateVFX:require('../src/render/chroma-state-vfx.js'),
 ChromaSpeedTrails:require('../src/render/speed-trails.js'),
 ChromaGravityShift:require('../src/gameplay/gravity-shift.js'),
 ChromaRoundAudit:require('../src/diagnostics/round-audit.js'),
 ChromaUnifiedTerrainDirector:require('../src/director/unified-terrain-director.js'),
 ChromaQuality:require('../src/performance/quality-manager.js'),
 ChromaFrameClock:require('../src/performance/frame-clock.js'),
 ChromaMobilePreferences:require('../src/ui/mobile-preferences.js'),
 ChromaReplay:require('../src/progression/replay-challenge.js'),
 ChromaReplayUI:require('../src/ui/replay-ui.js'),
};
function harness(){
 const elements=new Map(),events={};
 function el(id){
  if(!elements.has(id)){
   const listeners={},classes=new Set(['hidden']);
   elements.set(id,{id,textContent:'',style:{},dataset:{},value:'',disabled:false,
    clientWidth:1280,clientHeight:720,
    classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x)},
    setAttribute(){},addEventListener:(name,fn)=>(listeners[name]??=[]).push(fn),
    click(){for(const fn of listeners.click??[])fn()},setPointerCapture(){},listeners});
  }return elements.get(id);
 }
 const noop=()=>{},gradient=()=>({addColorStop:noop});
 const draw={setTransform:noop,save:noop,restore:noop,translate:noop,scale:noop,
  fillRect:noop,strokeRect:noop,clip:noop,beginPath:noop,moveTo:noop,lineTo:noop,arcTo:noop,
  closePath:noop,fill:noop,stroke:noop,arc:noop,ellipse:noop,fillText:noop,
  createLinearGradient:gradient,createRadialGradient:gradient};
 el('game').getContext=()=>draw;
 let frame=null;
 const world={...modules,devicePixelRatio:1,AudioContext:undefined,
  addEventListener:(name,fn)=>(events[name]??=[]).push(fn)};
 const ctx=vm.createContext({window:world,document:{getElementById:el,hidden:false,addEventListener:noop},
  navigator:{},localStorage:{getItem:()=>null,setItem:noop},Math,console,
  setTimeout:noop,performance:{now:()=>0},requestAnimationFrame:fn=>{frame=fn}});
 let code=fs.readFileSync(path.join(root,'src/gameplay/game.js'),'utf8');
 code=code.replace('  requestAnimationFrame(frame);\n})();',
   "  window.__terrainTest={terrain,director,player:()=>player,distance:()=>distance,hp:()=>hp,flow,zone:()=>zone,runMode:()=>runMode,jumpControl,motion,gapRecovery:()=>gapRecovery};\n  requestAnimationFrame(frame);\n})();");
 vm.runInContext(code,ctx);
 let elapsed=0;
 function advance(n){for(let i=0;i<n;i++){elapsed+=1000/60;frame(elapsed)}}
 return {world,el,advance,events,
  jump(){for(const fn of events.keydown??[])fn({code:'Space',repeat:false,preventDefault:noop})},
  start(){frame(0);el('start-btn').click();world.__terrainTest.director.tick=()=>{};
   const state=world.__terrainTest,first=state.player().x+400;
   const gap={type:'gap',id:1,start:first,end:first+140,y0:515,y1:515,resolved:false,missed:false};
   state.terrain.segments=[{type:'flat',start:0,end:first,y0:515,y1:515},gap,
       {type:'flat',start:gap.end,end:12000,y0:515,y1:515}];
   state.terrain.gaps=[gap];state.terrain.generated=12000;
   state.terrain.lastGapEnd=gap.end;
   return {state,gap};}
 };
}

test('coyote jump just after a gap edge launches with normal velocity',()=>{
 const h=harness(),{state,gap}=h.start();
 let frames=0;
 while(state.player().landed&&frames++<120)h.advance(1);
 assert.ok(frames<120,'did not run off ledge');
 assert.equal(state.player().landed,false);
 assert.ok(state.jumpControl.coyote>0);
 h.jump();
 assert.equal(state.player().vy,modules.ChromaConfig.GAME.jumpVelocity);
 assert.equal(state.jumpControl.coyote,0);
 h.advance(120);
 assert.equal(state.hp(),100);
 assert.equal(gap.resolved,true);assert.equal(gap.missed,false);
});
test('running too far past an edge cannot start a late coyote jump',()=>{
 const h=harness(),{state,gap}=h.start();
 for(let i=0;i<120&&state.player().landed;i++)h.advance(1);
 h.advance(8);
 const before=state.player().vy;
 h.jump();
 assert.ok(state.player().vy>=before,'expired coyote must not launch');
 h.advance(140);
 assert.equal(gap.missed,true);assert.equal(state.hp(),75);
});
test('tapping jump just before landing buffers and immediately launches a second jump',()=>{
 const h=harness(),{state}=h.start();
 h.jump();h.advance(47);
 assert.equal(state.player().landed,false);
 h.jump();
 assert.ok(state.jumpControl.buffer>0);
 h.advance(4);
 assert.equal(state.player().landed,false);
 assert.ok(state.player().vy<-700,'buffered second jump should be freshly ascending');
 assert.equal(state.jumpControl.buffer,0);
});
test('buffer is cancelled after a missed gap enters spectral recovery',()=>{
 const h=harness(),{state}=h.start();
 for(let i=0;i<120&&state.player().landed;i++)h.advance(1);
 h.advance(6);h.jump();
 assert.ok(state.jumpControl.buffer>0);
 h.advance(125);
 assert.equal(state.jumpControl.buffer,0);
 assert.equal(state.hp(),75);
});
test('touch jump input still launches with no additional gameplay button',()=>{
 const h=harness(),{state}=h.start();
 const jumpButton=h.el('jump-btn');
 for(const fn of jumpButton.listeners.pointerdown??[])fn({pointerId:7,preventDefault(){}});
 assert.equal(state.player().vy,modules.ChromaConfig.GAME.jumpVelocity);
});
