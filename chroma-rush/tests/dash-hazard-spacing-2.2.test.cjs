const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const H=require('../src/gameplay/dash-hazards.js');
const M=require('../src/director/movement-awareness.js');
const {GAME}=require('../src/core/config.js');
const root=path.join(__dirname,'..');
const air='dash-jump',ground='dash-duck';

test('recovery starts at the END of the full energy bridge, not its spawn',()=>{
 for(const speed of [570,800,1100,1450,1812,2300]){
  const width=H.widthFor(air,speed);
  const previous={type:air,endWorld:10000+width,intro:true};
  const seconds=H.recoveryAfter(air,ground,{prevIntro:true,nextIntro:true});
  assert.equal(seconds,3.2);
  // A second advanced hazard can look "far enough" from the first START
  // while actually beginning before the first long structure even ends.
  const wrongStart=10000+speed*1.85;
  assert.equal(H.placementAfter(previous,ground,{
    speed,worldX:wrongStart,intro:true}).allowed,false);
  const edge=previous.endWorld+speed*(seconds+.15);
  const allowed=H.placementAfter(previous,ground,{
    speed,worldX:edge,intro:true});
  assert.ok(allowed.allowed,JSON.stringify({speed,allowed}));
  assert.ok(Math.abs(allowed.actualWorldGap/speed-3.35)<1e-9);
  assert.equal(H.placementAfter(previous,ground,{
    speed,worldX:edge-.1,intro:true}).allowed,false);
 }
});

test('both kinds of advanced hazard are recovery protected in both orders',()=>{
 for(const previousType of [air,ground]){
  for(const nextType of [air,ground]){
   const previous={type:previousType,endWorld:5000,intro:false};
   const v=900;
   const seconds=H.recoveryAfter(previousType,nextType);
   assert.equal(seconds,2.6);
   assert.equal(H.placementAfter(previous,nextType,{
      worldX:5000+v*2.5,speed:v}).allowed,false);
   assert.equal(H.placementAfter(previous,nextType,{
      worldX:5000+v*(2.6+.15),speed:v}).allowed,true);
  }
 }
});

test('ordinary hazards after a Vault are also given time to land',()=>{
 for(const prevType of [air,ground]){
  const previous={type:prevType,endWorld:8500,intro:true};
  const sec=H.recoveryAfter(prevType,'jump',{prevIntro:true});
  assert.equal(sec,2.1);
  assert.equal(H.placementAfter(previous,'jump',{
    speed:820,worldX:8500+820*1.1}).allowed,false);
  assert.equal(H.placementAfter(previous,'duck',{
    speed:820,worldX:8500+820*2.25}).allowed,true);
 }
});

test('a new advanced gate gets breathing room after an ordinary obstacle',()=>{
 for(const nextType of [air,ground]){
  const previous={type:'jump',endWorld:10000,intro:false};
  assert.equal(H.recoveryAfter('jump',nextType,{nextIntro:true}),1.6);
  assert.equal(H.recoveryAfter('jump',nextType),1.25);
  assert.equal(H.placementAfter(previous,nextType,{
    worldX:10000+150,speed:950,intro:true}).allowed,false);
  assert.equal(H.placementAfter(previous,nextType,{
    worldX:10000+950*1.75,speed:950,intro:true}).allowed,true);
 }
});

test('ordinary-to-ordinary spacing and first obstacle are unchanged',()=>{
 assert.equal(H.recoveryAfter('jump','duck'),0);
 assert.equal(H.placementAfter(null,air,{worldX:1000,speed:600,intro:true}).allowed,true);
 assert.equal(H.placementAfter({type:'duck',endWorld:4000},'jump',{
  worldX:4020,speed:900}).allowed,true,
 'existing ordinary cadence remains handled by the original Director');
});

test('Directors account for long physical span before advanced recovery',()=>{
 for(const speed of [600,800,1450,1812,2300]){
  const previousSpan=H.widthFor(air,speed)/speed;
  const min=M.minimumGap(air,ground,speed);
  assert.ok(min>previousSpan+2.5,JSON.stringify({speed,min,previousSpan}),
    'spawn/arrival safety must allow the whole Vault plus recovery');
  assert.ok(M.minimumGap(ground,air,speed)>
    Math.min(530/speed,.68)+2.5);
  assert.ok(M.minimumGap(air,'duck',speed)>
    previousSpan+1.6);
  assert.ok(M.minimumGap('duck',ground,speed)>1.25);
 }
});

test('game resets persistent placement on restart and uses world edge even after pruning',()=>{
 const source=fs.readFileSync(path.join(root,'src/gameplay/game.js'),'utf8');
 assert.match(source,/let lastPlacedHazard=null;/);
 assert.match(source,/hurdles=\[\];motes=\[\];streaks=\[\];lastPlacedHazard=null;/);
 assert.match(source,/const recovery=DASH_HAZARDS\.placementAfter\(lastPlacedHazard,data\.type/);
 assert.match(source,/if\(!recovery\.allowed\)return deferDash\('advanced_recovery'\)/);
 assert.match(source,/lastPlacedHazard=\{type:data\.type,endWorld:worldX\+width/);
 assert.ok(source.indexOf('lastPlacedHazard={type:data.type')<
   source.indexOf('const fairness=FAIR.metrics(data.type'));
 assert.doesNotMatch(source,/const minDistance=\s*\d+\s*;\/\/ hardcoded camera/);
});
