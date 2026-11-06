const test=require('node:test');
const assert=require('node:assert/strict');
const {ArcadeProgression,MILESTONES,KEY,PREVIOUS_SCORE_KEY}=require('../src/progression/arcade-progress.js');
const UI=require('../src/ui/arcade-ui.js');
function storage(seed={}){
  const data={...seed},writes=[];
  return {data,writes,getItem:key=>data[key]??null,
    setItem:(key,value)=>{data[key]=value;writes.push(key)}};
}
test('clean profile tracks first zone, empty achievements and locked practice',()=>{
  const p=new ArcadeProgression(storage());
  assert.deepEqual(p.snapshot(),{bestScore:0,bestZone:1,bestStreak:0,perfectZones:0,completedRuns:0});
  assert.equal(p.milestoneCount,0);
  assert.deepEqual(p.unlockedZones,[]);
  assert.equal(p.canPracticeZone(2),false);
});
test('prior Flow 1.0 score is retained without inventing old zones or streaks',()=>{
  const s=storage({[PREVIOUS_SCORE_KEY]:'12540'});
  const p=new ArcadeProgression(s);
  assert.equal(p.bestScore,12540);
  assert.equal(p.bestZone,1);
  assert.equal(p.bestStreak,0);
  p.finishRankedRun({score:1200,zone:2,bestStreak:3});
  assert.equal(p.bestScore,12540);
  assert.equal(p.bestZone,2);
  const reloaded=new ArcadeProgression(s);
  assert.equal(reloaded.bestScore,12540);
  assert.equal(reloaded.bestZone,2);
});
test('practice only unlocks reached zones and rejecting invalid selections',()=>{
  const p=new ArcadeProgression(storage());
  p.reachedZone(5);
  assert.deepEqual(p.unlockedZones,[2,3,4,5]);
  for(const z of [2,3,5])assert.equal(p.canPracticeZone(z),true);
  for(const z of [1,6,0,-1,3.3,'3',NaN])assert.equal(p.canPracticeZone(z),false);
  p.reachedZone(2);assert.equal(p.bestZone,5);
});
test('zone, streak and flawless milestones earn only once and survive reload',()=>{
  const s=storage(),p=new ArcadeProgression(s);
  assert.deepEqual(p.reachedZone(3).earned.map(x=>x.id),['ignite']);
  assert.deepEqual(p.reachedZone(3).earned,[]);
  assert.deepEqual(p.reachedZone(5).earned.map(x=>x.id),['neon']);
  assert.deepEqual(p.reachedStreak(10).earned.map(x=>x.id),['streak']);
  assert.deepEqual(p.perfectZone().earned.map(x=>x.id),['perfect']);
  assert.deepEqual(p.reachedZone(12).earned.map(x=>x.id),['chroma','redline']);
  assert.equal(p.milestoneCount,MILESTONES.length);
  assert.equal(p.nextMilestone,null);
  const again=new ArcadeProgression(s);
  assert.equal(again.milestoneCount,MILESTONES.length);
  assert.equal(again.bestZone,12);
  assert.equal(again.bestStreak,10);
  assert.equal(again.perfectZones,1);
});
test('scoring and completed-run stats are ranked-only API, not silently changed on reads',()=>{
  const s=storage(),p=new ArcadeProgression(s);
  const before=s.writes.length;
  p.snapshot();p.milestones;p.canPracticeZone(3);
  assert.equal(s.writes.length,before);
  const finish=p.finishRankedRun({score:2430.6,zone:4,bestStreak:7});
  assert.ok(finish.changed);
  assert.equal(p.bestScore,2430);
  assert.equal(p.snapshot().completedRuns,1);
  p.finishRankedRun({score:100,zone:1,bestStreak:2});
  assert.equal(p.bestScore,2430);
  assert.equal(p.snapshot().completedRuns,2);
  assert.equal(JSON.parse(s.data[KEY]).bestScore,2430);
});
test('corrupt data and unavailable storage fail safely without preventing gameplay',()=>{
  const broken=storage({[KEY]:'{bad',[PREVIOUS_SCORE_KEY]:'3410'});
  assert.equal(new ArcadeProgression(broken).bestScore,3410);
  const rejects={getItem(){throw Error('storage blocked')},setItem(){throw Error('storage blocked')}};
  const p=new ArcadeProgression(rejects);
  assert.equal(p.reachedZone(3).earned.length,1);
  assert.equal(p.bestZone,3);
  assert.equal(p.persist(),false);
  const malformed=storage({[KEY]:JSON.stringify({bestZone:99999,bestScore:-22,bestStreak:NaN,perfectZones:'no'})});
  const bad=new ArcadeProgression(malformed);
  assert.equal(bad.bestZone,120);
  assert.equal(bad.bestScore,0);
  assert.equal(bad.bestStreak,0);
});
test('menu and milestone gallery reflect progress while displaying no false achievements',()=>{
  const p=new ArcadeProgression(storage()),elements={};
  const names=['recordScore','recordZone','recordStreak','milestoneProgress','milestoneNext','practiceHint','milestoneGrid'];
  for(const name of names)elements[name]={textContent:'',innerHTML:''};
  elements.practiceSelect={value:'',disabled:false,innerHTML:''};
  elements.practiceButton={disabled:false};
  UI.menu(elements,p);
  assert.equal(elements.recordZone.textContent,'01');
  assert.equal(elements.practiceButton.disabled,true);
  assert.match(elements.practiceHint.textContent,/ZONE 02/);
  p.reachedZone(4);UI.menu(elements,p);UI.milestones(elements,p);
  assert.equal(elements.practiceSelect.disabled,false);
  assert.match(elements.practiceSelect.innerHTML,/ZONE 04/);
  assert.match(elements.milestoneGrid.innerHTML,/✓ UNLOCKED/);
  assert.match(elements.milestoneGrid.innerHTML,/◇ LOCKED/);
});
