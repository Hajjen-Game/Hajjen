const test=require('node:test');
const assert=require('node:assert/strict');
const {drawTerrain,visibleRuns,surface}=require('../src/render/terrain-renderer.js');
const segments=[
 {type:'flat',start:0,end:300,y0:515,y1:515},
 {type:'slope',start:300,end:600,y0:515,y1:460},
 {type:'flat',start:600,end:850,y0:460,y1:460},
 {type:'gap',start:850,end:1000,y0:460,y1:460},
 {type:'flat',start:1000,end:1450,y0:460,y1:460}
];
function fake(){
 const calls=[],fn=name=>(...args)=>calls.push([name,...args]);
 const ctx={save:fn('save'),restore:fn('restore'),beginPath:fn('beginPath'),
  clip:fn('clip'),moveTo:fn('moveTo'),lineTo:fn('lineTo'),
  closePath:fn('closePath'),fillRect:fn('fillRect'),stroke:fn('stroke'),fillText:fn('fillText'),
  createLinearGradient(...args){calls.push(['gradient',...args]);return {addColorStop:fn('addColorStop')}}};
 return {ctx,calls};
}
function opts(ctx,glowLine=()=>{}){return {ctx,terrain:{segments},distance:0,width:1400,height:720,baseY:515,primary:'#ff4aa2',secondary:'#fe84e3',flow:70,glowLine}}
test('slope and adjacent flats form one uninterrupted surface run',()=>{
 const runs=visibleRuns(segments,0,1400);
 assert.equal(runs.length,2);assert.equal(runs[0].length,3);
 assert.equal(surface(segments[0],300),surface(segments[1],300));
 assert.equal(surface(segments[1],600),surface(segments[2],600));
});
test('single gradient and clipped island mask have no black gap rectangle',()=>{
 const {ctx,calls}=fake();drawTerrain(opts(ctx));
 assert.equal(calls.filter(c=>c[0]==='clip').length,1);
 assert.equal(calls.filter(c=>c[0]==='gradient').length,1);
 assert.deepEqual(calls.filter(c=>c[0]==='fillRect').map(c=>c.slice(1)),[[-36,0,1472,728]]);
 assert.ok(calls.filter(c=>c[0]==='closePath').length>=2);
});
test('grid lines do not originate from within a gap',()=>{
 const {ctx}=fake(),lines=[];drawTerrain(opts(ctx,(...args)=>lines.push(args)));
 const from=lines.filter(x=>x[4]===1&&x[7]===.17).map(x=>x[0]);
 assert.ok(from.every(x=>x<850||x>=1000));
});
test('renderer never changes terrain data or collision state',()=>{
 const {ctx}=fake(),terrain={segments:JSON.parse(JSON.stringify(segments))};
 const before=JSON.stringify(terrain);drawTerrain({...opts(ctx),terrain});
 assert.equal(JSON.stringify(terrain),before);
});