const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const visuals=require('../src/render/chroma-identity.js');
const {PlayerMotion}=require('../src/render/player-motion.js');
function context(){
  const calls=[];
  const ctx={save(){calls.push('save')},restore(){calls.push('restore')},
    fill(){calls.push('fill')},stroke(){calls.push('stroke')},
    fillRect(...args){calls.push(['fillRect',...args])},
    createLinearGradient(){calls.push('gradient');return {addColorStop(){}}}};
  return {ctx,calls};
}
test('Pass 2 removes every interior player/hazard glyph and chevron',()=>{
  const game=fs.readFileSync(path.join(root,'src/gameplay/game.js'),'utf8');
  const identity=fs.readFileSync(path.join(root,'src/render/chroma-identity.js'),'utf8');
  assert.doesNotMatch(game,/identity\.draw(?:PlayerMark|HazardMark)\(/);
  assert.doesNotMatch(game,/Three chevrons embedded/);
  assert.ok(!game.includes('ctx.lineTo(sealX-4,yy)'), 'no inset Dash arrows');
  assert.doesNotMatch(identity,/drawPlayerMark|drawHazardMark/);
  assert.doesNotMatch(identity,/ctx\.(?:moveTo|lineTo|fillText)\(/);
});
test('High has two continuous material coats; Performance receives one',()=>{
  const p=new PlayerMotion();
  for(const density of [.32,1]){
    const {ctx,calls}=context();
    const paths=[];
    visuals.paintPlayer(ctx,{x:100,y:50,w:46,h:45,
      primary:'#4bf0ff',secondary:'#fa49b2',motion:p,
      pose:p.sample({landed:true}),quality:{density,glow:1},
      bodyPath(...args){paths.push(args)}});
    assert.equal(paths.length,density>.5?2:1);
    assert.equal(calls.filter(x=>x==='stroke').length,1);
    assert.equal(calls.filter(x=>x==='gradient').length,density>.5?2:1);
    assert.equal(calls.filter(x=>x==='save').length,1);
    assert.equal(calls.filter(x=>x==='restore').length,1);
  }
});
test('motion clocks modulate only presentational light, never movement',()=>{
  const m=new PlayerMotion();
  const rest=visuals.expression(m);
  assert.deepEqual(rest,{launch:0,echo:0,landing:0,duck:0,release:0,dash:0});
  m.jump();assert.ok(visuals.expression(m).launch>.9);
  m.echoJump();assert.ok(visuals.expression(m).echo>.9);
  m.duckStart();assert.ok(visuals.expression(m).duck>.9);
  m.land(700);assert.ok(visuals.expression(m).landing>0);
  assert.deepEqual(visuals.expression(m,true),rest);
});
test('contact glow reacts to landing without creating a fake obstacle',()=>{
 const m=new PlayerMotion();m.land(900);
 for(const density of [.3,1]){
  const {ctx,calls}=context();
  visuals.drawContact(ctx,{x:300,surface:515,width:44,primary:'#4bf0ff',
    secondary:'#fa49b2',motion:m,quality:{density,glow:1}});
  assert.equal(calls.filter(Array.isArray).length,density<.5?1:2);
  for(const c of calls.filter(Array.isArray)){
   assert.ok(c[1]>=255&&c[1]+c[3]<=345);
   assert.ok(c[2]>=518&&c[2]<=522);
  }
 }
});
test('new asset versions protect background and avoid stale legacy glyphs',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const game=fs.readFileSync(path.join(root,'src/gameplay/game.js'),'utf8');
 assert.match(html,/chroma-identity\.js\?v=player-movement-identity-2\.0/);
 assert.match(html,/world-background\.js\?v=original-background-restored-1\.0/);
 assert.match(html,/(?:PREMIUM ARCADE UI 4\.0|ARCADE SIMPLIFICATION 1\.0|CORE PACE 1\.1|CHROMA SURGE 1\.0|ACTION DENSITY 2\.0|RUSH CHAINS 3\.0|ENDLESS ESCALATION 4\.0)/);
 assert.match(game,/identity\.paintPlayer\(ctx/);
 assert.match(game,/identity\.drawContact\(ctx/);
 assert.doesNotMatch(game,/identity\.(?:update|tick|collide|spawn)\(/);
});

test('more expressive motion squash is bounded and deterministic',()=>{
  const m=new PlayerMotion();
  m.duckStart();const duck=m.sample({landed:true,duck:true});
  assert.ok(duck.scaleX>1.23 && duck.scaleY<.8);
  m.duckCancel();m.land(1000);
  const land=m.sample({landed:true});
  assert.ok(land.scaleY<.84 && land.scaleY>.78);
  m.tick(m.rules.landingAnimationSeconds*.7);
  assert.ok(m.sample({landed:true}).scaleY>1);
  m.tick(.5);
  assert.equal(m.sample({landed:true}).scaleY,1);
});
