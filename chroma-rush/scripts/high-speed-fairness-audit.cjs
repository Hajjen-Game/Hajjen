#!/usr/bin/env node
/* CHROMA RUSH — deterministic offline 180s fairness sweep.
 * This is an IDEAL-CLEAR pacing/visibility simulation, not a bot pretending
 * to have human reaction time and not a real-device FPS benchmark.
 */
const {GAME}=require('../src/core/config.js');
const {AdaptiveRushDirector}=require('../src/director/adaptive-director.js');
const {TerrainSystem}=require('../src/terrain/terrain-system.js');
const {UnifiedTerrainDirector}=require('../src/director/unified-terrain-director.js');
const FAIR=require('../src/director/high-speed-fairness.js');
const {minimumGap}=require('../src/director/movement-awareness.js');
function seeded(seed){
  let x=seed>>>0;
  return ()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296};
}
function simulate({seed=42,seconds=180,viewportWidth=1280,
  startingZone=1,damageEvery=0}={}){
  const director=new AdaptiveRushDirector(seeded(seed+19));
  const terrain=new TerrainSystem({random:seeded(seed)});
  const unified=new UnifiedTerrainDirector({terrain,director});
  terrain.reset(515);director.reset();unified.reset();
  const dt=1/30,playerX=viewportWidth*.265;
  let elapsed=0,distance=0,zone=startingZone,hp=100;
  const pending=[],seenGaps=new Set(),hits={jump:0,duck:0,echo:0},
    minMargins={jump:Infinity,duck:Infinity,echo:Infinity,gap:Infinity,'echo-gap':Infinity};
  let warnings=0,underBudget=0,cuesChecked=0,clears=0,
    normalGaps=0,echoGaps=0,lateGaps=0,gravityFlips=0,
    transitionViolations=0,minTransitionMargin=Infinity,lastArrival=null;
  for(let i=0;i<seconds/dt;i++){
    elapsed+=dt;
    const newZone=startingZone+Math.floor(elapsed/GAME.zoneSeconds);
    const speed=GAME.speedAt((startingZone-1)*GAME.zoneSeconds+elapsed,newZone);
    if(newZone!==zone){
      zone=newZone;
      if(zone>=3&&(zone-3)%2===0){
        gravityFlips++;
        director.noteGravityShift();
        unified.noHazardsBefore=Math.max(unified.noHazardsBefore,
          distance+viewportWidth+speed*1.5);
        unified.noGapsBefore=Math.max(unified.noGapsBefore,
          distance+viewportWidth+speed*1.8);
      }
    }
    distance+=speed*dt;
    const world=distance+playerX;
    const spawnXFor=type=>FAIR.horizonFor(type,{speed,playerX,viewportWidth});
    const added=unified.prepare({right:distance+Math.max(viewportWidth+800,
      spawnXFor('echo')+speed*.48),playerWorld:world,zone,speed,hp});
    for(const g of added){
      if(g.type!=='gap'||seenGaps.has(g.id))continue;
      seenGaps.add(g.id);
      const type=g.echoChallenge?'echo-gap':'gap',m=FAIR.metrics(type,
        {x:g.start-distance,playerX,viewportWidth,speed});
      minMargins[type]=Math.min(minMargins[type],m.marginSeconds);
      if(m.marginSeconds<-.001)lateGaps++;
      if(g.echoChallenge)echoGaps++;else normalGaps++;
    }
    terrain.prune(world,speed);
    unified.tick(dt,{zone,hp,speed,distance,spawnX:viewportWidth+90,
      spawnXFor,playerX},step=>{
      const x=spawnXFor(step.type),worldX=distance+x;
      const width=step.type==='echo'?55:60;
      if(!terrain.canSpawnObstacle(worldX,width,speed))return false;
      if(step.type==='echo'){
        const ground=terrain.groundAt(worldX+width*.5);
        const launch=terrain.groundAt(worldX-speed*.55);
        const land=terrain.groundAt(worldX+width+speed*.20);
        if(ground===null||launch===null||land===null||
          Math.abs(launch-ground)>34||Math.abs(land-ground)>34)return false;
      }
      const m=FAIR.metrics(step.type,{x,playerX,viewportWidth,speed});
      minMargins[step.type]=Math.min(minMargins[step.type],m.marginSeconds);
      if(!m.fair)underBudget++;
      // The arrival-time separation is the REAL interval players experience.
      // Fixed spawn-time separation is not adequate when Echo warning leads
      // differ from normal JUMP/DUCK warning leads.
      const arrival={time:elapsed+m.leadSeconds,type:step.type};
      if(lastArrival){
        const required=minimumGap(lastArrival.type,step.type,speed,width);
        const margin=arrival.time-lastArrival.time-required;
        minTransitionMargin=Math.min(minTransitionMargin,margin);
        if(margin<-.025)transitionViolations++;
      }
      lastArrival=arrival;
      if(m.needsCue){
        warnings++;
        const preview=FAIR.warning({hurdles:[{type:step.type,x,worldX}],
          playerX,viewportWidth,speed});
        if(preview?.type===step.type)cuesChecked++;
      }
      hits[step.type]++;
      pending.push({type:step.type,worldX,width});
      return true;
    });
    for(let j=pending.length-1;j>=0;j--){
      const o=pending[j];
      if(world<o.worldX+o.width)continue;
      pending.splice(j,1);clears++;
      if(damageEvery>0&&clears%damageEvery===0){
        hp=75;director.registerDamage({action:o.type});
      }else{
        director.registerClear({action:o.type});
        hp=100; // reset for a synthetic healthy reference run
      }
    }
    for(const g of terrain.visibleGaps(world-speed*.8,world)){
      if(g.resolved||world<g.end+26)continue;
      if(!terrain.markGap(g,false))continue;
      unified.noteGapOutcome({missed:false,echo:Boolean(g.echoChallenge),worldX:world,speed});
      director.registerClear({action:g.echoChallenge?'echo-gap':'gap'});
    }
  }
  return {seed,seconds,viewportWidth,startingZone,damageEvery,
    finalSpeed:GAME.speedAt((startingZone-1)*12+seconds,startingZone+Math.floor(seconds/12)),
    obstacles:hits,cleared:clears,normalGaps,echoGaps,
    underBudget,lateGaps,warnings,cuesChecked,gravityFlips,
    transitionViolations,minTransitionMargin:Number.isFinite(minTransitionMargin)?
      Number(minTransitionMargin.toFixed(3)):null,
    minMargins:Object.fromEntries(Object.entries(minMargins).map(([k,v])=>
      [k,Number.isFinite(v)?Number(v.toFixed(3)):null])),
    director:{echoClears:director.movement.echoClears,echoMisses:director.movement.echoMisses,
      deferred:director.movement.deferredPatterns,spawns:director.totalSpawned}};
}
function matrix(){
  const rows=[];
  for(const width of [900,1280,1600]){
    for(const seed of [7,42,101,909]){
      rows.push(simulate({seed,seconds:180,viewportWidth:width}));
      rows.push(simulate({seed,seconds:180,viewportWidth:width,
        damageEvery:17}));
    }
  }
  return {kind:'chroma-rush-fairness-sweep',version:1,
    disclaimer:'Deterministic ideal-clear analytic simulation; not human-play or FPS measurement',
    runs:rows.length,totalSeconds:rows.reduce((n,r)=>n+r.seconds,0),
    underBudget:rows.reduce((n,r)=>n+r.underBudget,0),
    lateGaps:rows.reduce((n,r)=>n+r.lateGaps,0),
    transitionViolations:rows.reduce((n,r)=>n+r.transitionViolations,0),
    obstacles:rows.reduce((n,r)=>n+Object.values(r.obstacles).reduce((a,b)=>a+b,0),0),
    cuesChecked:rows.reduce((n,r)=>n+r.cuesChecked,0),
    warnings:rows.reduce((n,r)=>n+r.warnings,0),results:rows};
}
if(require.main===module)console.log(JSON.stringify(matrix(),null,2));
module.exports={seeded,simulate,matrix};
