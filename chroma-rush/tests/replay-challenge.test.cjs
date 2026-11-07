const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {ReplayChallenge,KEY}=require('../src/progression/replay-challenge.js');
const UI=require('../src/ui/replay-ui.js');
function store(init={}){const data={...init},writes=[];return {data,writes,getItem:k=>data[k]??null,
 setItem:(k,v)=>{data[k]=v;writes.push(k)}};}
test('first ranked run saves distance but does not invent an old record',()=>{
 const s=store(),r=new ReplayChallenge(s);
 assert.equal(r.start({bestScore:0,bestZone:1}),'REACH ZONE 03');
 assert.deepEqual(r.watch({score:100,distance:500}),[]);
 const done=r.finish({score:100,distance:501.8,zone:2,peakFlow:40,bestScore:100,bestZone:2});
 assert.equal(done.newScore,true);assert.equal(done.newDistance,true);
 assert.equal(r.bestDistance,501);assert.deepEqual(s.writes,[KEY]);
 assert.equal(new ReplayChallenge(s).bestDistance,501);
});
test('record baseline stays fixed and notifications fire only once',()=>{
 const s=store({[KEY]:JSON.stringify({bestDistance:1400,bestPeakFlow:75,bestPerfectRun:1})});
 const r=new ReplayChallenge(s);r.start({bestScore:1000,bestZone:6});
 assert.deepEqual(r.watch({score:1000,distance:1400}),[]);
 assert.deepEqual(r.watch({score:1001,distance:1401}),['score','distance']);
 assert.deepEqual(r.watch({score:1600,distance:2000}),[]);
 const done=r.finish({score:1600,distance:2000,zone:4,bestScore:1600,bestZone:6});
 assert.equal(done.previousScore,1000);assert.equal(done.previousDistance,1400);
 assert.equal(done.nextChallenge,'BEAT 1,600 SCORE');
 assert.equal(r.snapshot().lastRun.distance,2000);
});
test('unranked practice cannot save or announce records',()=>{
 const s=store(),r=new ReplayChallenge(s);r.start({practice:true,bestScore:100,bestZone:5});
 assert.deepEqual(r.watch({score:9000,distance:9000}),[]);
 assert.equal(r.finish({score:9000,distance:9000,peakFlow:90}).ranked,false);
 assert.equal(r.bestDistance,0);assert.deepEqual(s.writes,[]);
 r.start({bestScore:100,bestZone:5});
 assert.deepEqual(r.watch({score:101,distance:200}),['score']);
});
test('next challenge follows observed Flow and Perfect Zone skill',()=>{
 const r=new ReplayChallenge(store());
 assert.equal(r.nextChallenge({bestZone:3}),'HIT 65% FLOW');
 r.start({bestZone:3});
 assert.equal(r.finish({zone:3,peakFlow:70,bestZone:3}).nextChallenge,'CLEAR 1 PERFECT ZONE');
 r.start({bestZone:3});
 assert.equal(r.finish({zone:3,peakFlow:72,perfectZones:1,bestZone:3}).nextChallenge,'REACH ZONE 05');
});
test('corrupt or denied storage fails safely; impossible stats are clamped',()=>{
 assert.equal(new ReplayChallenge(store({[KEY]:'{bad'})).bestDistance,0);
 const blocked={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}};
 const r=new ReplayChallenge(blocked);
 assert.doesNotThrow(()=>r.finish({distance:99}));assert.equal(r.bestDistance,99);
 const c=new ReplayChallenge(store({[KEY]:JSON.stringify({bestDistance:-3,bestPeakFlow:900})}));
 assert.equal(c.bestDistance,0);assert.equal(c.snapshot().bestPeakFlow,100);
});
function element(){const c=new Set(['hidden']);return {textContent:'',style:{},classList:{
 toggle:(k,v)=>v?c.add(k):c.delete(k),add:k=>c.add(k),remove:k=>c.delete(k),contains:k=>c.has(k)}}}
test('HUD and result presenters distinguish ranked and practice runs',()=>{
 const ids=['recordDistance','replayProgress','replayTarget','replayPercent','replayFill','replayToast',
 'finalDistance','finalComparison','finalChallenge'];const e=Object.fromEntries(ids.map(id=>[id,element()]));
 UI.menu(e,{bestDistance:5200});assert.equal(e.recordDistance.textContent,'5,200');
 UI.hud(e,{practice:true,score:500,previousScore:100});
 assert.equal(e.replayProgress.classList.contains('hidden'),true);
 UI.hud(e,{score:50,previousScore:100});assert.equal(e.replayPercent.textContent,'50%');
 UI.hud(e,{score:101,previousScore:100});assert.equal(e.replayPercent.textContent,'BEATEN');
 UI.toast(e,'score');assert.match(e.replayToast.textContent,/SCORE/);
 UI.results(e,{practice:false,score:120,distance:180,previousScore:100,
  previousDistance:140,newScore:true,newDistance:true,nextChallenge:'REACH ZONE 05'});
 assert.match(e.finalComparison.textContent,/SCORE \+20/);
 assert.match(e.finalComparison.textContent,/DIST \+40/);
 UI.results(e,{practice:true,score:8000,distance:8000});
 assert.match(e.finalComparison.textContent,/UNCHANGED/);
 assert.equal(e.finalChallenge.classList.contains('hidden'),true);
});
test('HTML loads replay modules before game and provides required IDs',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 for(const id of ['record-distance','final-distance','final-comparison','final-challenge',
  'replay-progress','replay-toast','replay-target','replay-percent','replay-fill'])
  assert.ok(html.includes('id="'+id+'"'),id);
 const a=html.indexOf('src/progression/replay-challenge.js?v=replay-1.0');
 const b=html.indexOf('src/ui/replay-ui.js?v=replay-1.0');
 const c=html.indexOf('src/gameplay/game.js?v=background-depth-2.0');
 assert.ok(a>0&&a<b&&b<c);
});
