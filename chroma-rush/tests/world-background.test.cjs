const test=require('node:test');
const assert=require('node:assert/strict');
const {drawBackground}=require('../src/render/world-background.js');
function render(overrides={}){
  const calls=[];
  const log=name=>(...args)=>calls.push([name,...args]);
  const ctx={fillRect:log('fillRect'),save:log('save'),restore:log('restore'),
    createLinearGradient(...args){calls.push(['linear',...args]);return {addColorStop:log('stop')}} ,
    createRadialGradient(...args){calls.push(['radial',...args]);return {addColorStop:log('stop')}}};
  drawBackground({ctx,width:1280,height:720,time:15,speed:710,flow:78,
    primary:'#40ffff',secondary:'#ffaaee',shadow:'#173145',glowLine:log('glowLine'),...overrides});
  return calls;
}
test('every main background layer paints edge-to-edge, even beyond lowered terrain',()=>{
  const c=render();
  const fills=c.filter(x=>x[0]==='fillRect');
  assert.ok(fills.length>15);
  assert.deepEqual(fills.slice(0,4),Array.from({length:4},()=>['fillRect',0,0,1280,720]));
  // Later parallax columns and tiny stars are deliberately not fullscreen.
  assert.ok(!fills.slice(0,4).some(x=>x[2]>0||x[4]<720));
});
test('backdrop does not take a fixed floorY or terrain argument',()=>{
  const src=require('node:fs').readFileSync(require.resolve('../src/render/world-background.js'),'utf8');
  const implementation=src.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
  assert.ok(!/floorY|groundAt|terrain\./.test(implementation));
});
test('sky and haze remain full-height at multiple aspect ratios',()=>{
  for(const [width,height] of [[720,720],[1536,720],[980,560]]){
    const c=render({width,height});
    assert.deepEqual(c.filter(x=>x[0]==='fillRect').slice(0,4),
      Array.from({length:4},()=>['fillRect',0,0,width,height]));
  }
});
test('rendering is independent of biome/terrain inputs and never changes gameplay data',()=>{
  const opts={terrain:{segments:[{type:'gap',start:100,end:200}]},floorY:520};
  const before=JSON.stringify(opts);
  assert.doesNotThrow(()=>render(opts));
  assert.equal(JSON.stringify(opts),before);
});
