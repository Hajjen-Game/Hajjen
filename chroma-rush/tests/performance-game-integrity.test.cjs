const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const modules={
 ChromaDirector:require('../src/director/adaptive-director.js'),
 ChromaConfig:require('../src/core/config.js'),
 ChromaGeometry:require('../src/core/geometry.js'),
 ChromaHud:require('../src/ui/hud.js'),
 ChromaFlow:require('../src/gameplay/flow.js'),
 ChromaAudio:require('../src/audio/reactive-audio.js'),
 ChromaProgress:require('../src/progression/arcade-progress.js'),
 ChromaArcadeUI:require('../src/ui/arcade-ui.js'),
 ChromaTerrain:require('../src/terrain/terrain-system.js'),
 ChromaJump:require('../src/gameplay/jump-controller.js'),
 ChromaMotion:require('../src/render/player-motion.js'),
 ChromaEffects:require('../src/render/effect-language.js'),
 ChromaTerrainRender:require('../src/render/terrain-renderer.js'),
 ChromaWorldBackground:require('../src/render/world-background.js'),
 ChromaRoundAudit:require('../src/diagnostics/round-audit.js'),
 ChromaUnifiedTerrainDirector:require('../src/director/unified-terrain-director.js'),
 ChromaQuality:require('../src/performance/quality-manager.js'),
 ChromaFrameClock:require('../src/performance/frame-clock.js'),
 ChromaMobilePreferences:require('../src/ui/mobile-preferences.js'),
 ChromaReplay:require('../src/progression/replay-challenge.js'),
 ChromaReplayUI:require('../src/ui/replay-ui.js'),
};
function run(mode){
 const els=new Map();
 const el=id=>{
  if(!els.has(id)){
   const ev={},tags=new Set(['hidden']);
   els.set(id,{id,value:'',textContent:'',style:{},dataset:{},clientWidth:900,clientHeight:410,
    classList:{add:k=>tags.add(k),remove:k=>tags.delete(k),contains:k=>tags.has(k),
      toggle:(k,v)=>{const next=v===undefined?!tags.has(k):v;next?tags.add(k):tags.delete(k);return next;}},
    setAttribute(){},addEventListener:(k,fn)=>(ev[k]??=[]).push(fn),click(){for(const fn of ev.click??[])fn()},
    setPointerCapture(){},events:ev});
  }
  return els.get(id);
 };
 const noop=()=>{};const grad=()=>({addColorStop:noop});
 el('game').getContext=()=>({fillRect:noop,strokeRect:noop,setTransform:noop,save:noop,restore:noop,
  translate:noop,beginPath:noop,clip:noop,moveTo:noop,lineTo:noop,arcTo:noop,closePath:noop,
  fill:noop,stroke:noop,arc:noop,ellipse:noop,fillText:noop,
  createLinearGradient:grad,createRadialGradient:grad});
 let raf;
 const storage={chromaRushGraphicsV1:mode};
 const world={...modules,devicePixelRatio:2,location:{search:''},addEventListener:noop,AudioContext:undefined};
 const browser=vm.createContext({window:world,document:{getElementById:el,addEventListener:noop,hidden:false},
   navigator:{deviceMemory:8,hardwareConcurrency:8},localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v},
   Math,performance:{now:()=>0},navigator:{deviceMemory:8,hardwareConcurrency:8},
   requestAnimationFrame:fn=>{raf=fn},setTimeout:noop,console});
 const source=fs.readFileSync(path.join(root,'src/gameplay/game.js'),'utf8');
 const marker='  requestAnimationFrame(frame);\n})();';
 assert.equal(source.split(marker).length,2);
 vm.runInContext(source.replace(marker,`  window.__integrity={snapshot:()=>({time,zone,hp,score,flow:flow.value,streak:flow.streak,distance,
   director:director.patternHistory.slice(),terrain:terrain.segments.map(s=>[s.type,s.start,s.end,s.y0,s.y1]),
   obstacles:hurdles.map(o=>[o.type,o.worldX,o.width,o.height]),quality:quality.tier})};\n${marker}`),browser);
 raf(0);el('start-btn').click();
 for(let i=1;i<=1500;i++)raf(i*1000/60);
 const result=JSON.parse(JSON.stringify(world.__integrity.snapshot()));
 return result;
}
test('same seed generates the SAME game with High and Performance quality',()=>{
 const original=Math.random;
 const seedRandom=()=>{let seed=0x12345678;return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};};
 try{
  Math.random=seedRandom();const high=run('high');
  Math.random=seedRandom();const low=run('performance');
  assert.equal(high.quality,'high');assert.equal(low.quality,'performance');
  delete high.quality;delete low.quality;
  assert.deepEqual(high,low);
  assert.ok(high.terrain.length>=2);
  assert.ok(high.director.length>=1);
 }finally{Math.random=original;}
});
