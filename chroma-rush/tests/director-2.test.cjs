const test=require('node:test');
const assert=require('node:assert/strict');
const {AdaptiveRushDirector,PHASE,minimumGap}=require('../src/director/adaptive-director.js');
const {PATTERNS,candidates,chooseWeighted}=require('../src/director/patterns.js');
const {GAME,PALETTES}=require('../src/core/config.js');
const GEO=require('../src/core/geometry.js');

function simulate({duration=180,hp=100,zone=8,random=()=>.39}={}){
  const director=new AdaptiveRushDirector(random);
  const spawns=[],phases=new Set(),dt=1/60;
  for(let i=0;i<duration/dt;i++){
    const speed=GAME.speedAt(i*dt,zone);
    director.tick(dt,{speed,zone,hp},o=>spawns.push({...o,time:director.time,speed}));
    phases.add(director.phase);
    if(spawns.length && i%75===0)director.registerClear();
  }
  return {director,spawns,phases};
}

test('authored patterns are supported, unique and short',()=>{
  assert.ok(PATTERNS.length>=10);
  assert.equal(new Set(PATTERNS.map(p=>p.id)).size,PATTERNS.length);
  for(const p of PATTERNS){
    assert.ok(p.steps.length>=1 && p.steps.length<=4);
    assert.ok(p.steps.every(s=>['jump','duck','echo'].includes(s)));
    assert.ok(p.weight>0 && p.minZone>=1);
  }
  assert.ok(candidates(PHASE.BUILD,1,1).every(p=>p.tier<=1));
  assert.ok(candidates(PHASE.FADE,12,3).every(p=>p.tier===0));
  assert.ok(candidates(PHASE.PEAK,1,3).every(p=>!p.steps.includes('echo')));
  assert.ok(candidates(PHASE.PEAK,2,3).some(p=>p.id==='single-echo'));
  assert.ok(candidates(PHASE.PEAK,8,3,{allowEcho:false}).every(p=>!p.steps.includes('echo')));
});

test('patterns vary across a run, not single random obstacles forever',()=>{
  const r=simulate({zone:7,random:(()=>{let i=0;return ()=>((i++*73)%101)/101})()});
  const labels=new Set(r.spawns.map(o=>o.pattern));
  assert.ok(labels.size>=6,`only ${labels.size} patterns: ${[...labels]}`);
  assert.ok(r.spawns.some(o=>o.step>=2),'no authored multi-step pattern used');
  assert.ok(r.spawns.length>35);
});

test('safety gap is enforced between every adjacent obstacle even across motif boundaries',()=>{
  const {spawns}=simulate({duration:180,zone:12,random:()=>.81});
  assert.ok(spawns.length>35);
  for(let i=1;i<spawns.length;i++){
    const prev=spawns[i-1],cur=spawns[i];
    const min=minimumGap(prev.type,cur.type,cur.speed);
    assert.ok(cur.time-prev.time>=min-1/60-1e-6,
      `unsafe gap ${prev.pattern}:${prev.type} -> ${cur.pattern}:${cur.type}: ${(cur.time-prev.time).toFixed(2)} < ${min.toFixed(2)}`);
  }
});

test('all four phases occur with complete no-spawn microbreaks including late zones',()=>{
  const {spawns,phases}=simulate({duration:160,zone:14});
  assert.deepEqual([...phases].sort(),Object.values(PHASE).sort());
  const largestGap=spawns.slice(1).reduce((max,o,i)=>Math.max(max,o.time-spawns[i].time),0);
  assert.ok(largestGap>3.2,`microbreak too short: ${largestGap}`);
});

test('player feedback changes intensity, recent damage prevents a forced motif follow-up',()=>{
  const d=new AdaptiveRushDirector(()=>.4);
  d.stress=.0;d.confidence=.9;
  assert.equal(d.tierFor({zone:10,hp:100}),3);
  d.registerDamage();
  assert.ok(d.stress>=.4 && d.confidence<.9);
  assert.ok(d.tierFor({zone:10,hp:25})<=1);
  assert.equal(d.streak,0);
  assert.equal(d.pending.length,0);
  const recovery=d.durationFor(PHASE.RELAX,{zone:10,hp:25});
  const calm=new AdaptiveRushDirector(()=>.4);
  assert.ok(recovery>calm.durationFor(PHASE.RELAX,{zone:10,hp:100}));
  d.registerClear();assert.equal(d.streak,1);
  d.registerNearMiss();assert.ok(d.stress>.45);
});

test('pattern choice avoids immediate identical repeats when alternatives exist',()=>{
  const p=candidates(PHASE.BUILD,2,1);
  const first=chooseWeighted(p,()=>0);
  const second=chooseWeighted(p,()=>0,first.id);
  assert.notEqual(first.id,second.id);
});

test('shared config and geometry match the original gameplay rules',()=>{
  assert.equal(PALETTES.length,8);
  assert.equal(GAME.speedAt(0,1),370);
  assert.ok(GAME.speedAt(180,16)>GAME.speedAt(60,6));
  const player={x:300,feet:515,landed:true,duck:false};
  assert.deepEqual(GEO.playerBox(player),{x:278,y:471,w:44,h:44});
  player.duck=true;
  assert.deepEqual(GEO.playerBox(player),{x:267,y:494,w:66,h:21});
  const beam=GEO.obstacleBox({type:'duck',x:300,width:60,height:130},515);
  assert.equal(beam.y+beam.h,487);
  assert.equal(GEO.verticalOverlap(GEO.playerBox(player),beam),false);
  player.duck=false;
  assert.equal(GEO.verticalOverlap(GEO.playerBox(player),beam),true);
});
