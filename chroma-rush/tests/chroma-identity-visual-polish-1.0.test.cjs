const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const identity=require('../src/render/chroma-identity.js');
function sketch(){
 const points=[],ctx={save(){},restore(){},beginPath(){},stroke(){},
  moveTo(x,y){points.push([x,y])},lineTo(x,y){points.push([x,y])}};
 return {ctx,points};
}
test('quality scales identity marks without adding Performance glow',()=>{
 assert.deepEqual(identity.visualBudget({density:.3,glow:1}),{density:.3,detail:1,glow:0});
 assert.deepEqual(identity.visualBudget({density:1,glow:1}),{density:1,detail:2,glow:1});
});
test('player signature stays inside squash/stretched painted body',()=>{
 for(const p of [{x:100,y:60,w:46,h:46,offset:12},{x:100,y:92,w:49,h:17,offset:-5,duck:true}]){
  const {ctx,points}=sketch();identity.drawPlayerMark(ctx,{...p,quality:{density:1,glow:1}});
  assert.ok(points.length>=4);
  for(const [x,y] of points){assert.ok(x>=p.x&&x<=p.x+p.w);assert.ok(y>=p.y&&y<=p.y+p.h);}
 }
});
test('all obstacle family insets remain within the existing collision rectangle',()=>{
 for(const type of ['jump','duck','echo','dash-jump','dash-duck']){
  const {ctx,points}=sketch();
  identity.drawHazardMark(ctx,{x:20,y:40,w:70,h:120,type,charged:true,quality:{density:1,glow:1}});
  assert.ok(points.length>=2);
  for(const [x,y] of points){assert.ok(x>=20&&x<=90);assert.ok(y>=40&&y<=160);}
 }
});
test('index assets and gameplay wiring preserve original background and cosmetic-only API',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const game=fs.readFileSync(path.join(root,'src/gameplay/game.js'),'utf8');
 const wave=fs.readFileSync(path.join(root,'src/render/spectral-wave.js'),'utf8');
 const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
 assert.match(html,/chroma-identity\.js\?v=chroma-identity-visual-polish-1\.0/);
 assert.match(html,/world-background\.js\?v=original-background-restored-1\.0/);
 assert.match(game,/identity\.drawPlayerMark\(ctx/);
 assert.match(game,/identity\.drawHazardMark\(ctx/);
 assert.match(wave,/if\(intensity>=\.8\)/);
 assert.match(css,/#menu h1::after/);
 assert.match(css,/#gameover \.result-score::after/);
 assert.doesNotMatch(game,/identity\.(?:update|tick|collide|spawn)\(/);
});
