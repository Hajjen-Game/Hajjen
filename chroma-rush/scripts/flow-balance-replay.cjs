/* CHROMA RUSH — local-only Flow Balance replay.
 * Evaluates existing exported game events without changing user inputs.
 */
'use strict';
const fs=require('node:fs');
const {FlowSystem}=require('../src/gameplay/flow.js');
const {FLOW}=require('../src/core/config.js');
const LEGACY=Object.freeze({...FLOW,clearGain:6,precisionGain:10,perfectFlowGain:8,highFlowPressurePerSecond:0});
function replay(log,rules=FLOW){
  if(!log||log.format!=='chroma-rush-round-audit'||!Array.isArray(log.events))
    throw Error('Expected a CHROMA RUSH round audit JSON');
  const flow=new FlowSystem(rules);
  let time=0,chromaSeconds=0,highFlowSeconds=0,atMaxSeconds=0,firstChromaAt=null;
  const tickUntil=target=>{
    while(time<target-1e-8){
      const dt=Math.min(1/60,target-time);flow.tick(dt);time+=dt;
      if(flow.value>=90){chromaSeconds+=dt;if(firstChromaAt===null)firstChromaAt=time;}
      if(flow.value>=65)highFlowSeconds+=dt;
      if(flow.value>=99.5)atMaxSeconds+=dt;
    }
  };
  for(const event of log.events){
    tickUntil(Math.max(time,Number(event.time)||0));
    if(event.type==='start')flow.reset();
    else if(event.type==='obstacle_clear'||event.type==='gap_clear')
      flow.registerClear({precision:event.precision===true});
    else if(event.type==='obstacle_hit'||event.type==='gap_miss'){
      if(event.shieldCharged===false)flow.registerCollision();
      else flow.registerDamage();
    }else if(event.type==='invulnerable_contact')flow.registerCollision();
    else if(event.type==='perfect_zone')
      flow.value=Math.min(100,flow.value+rules.perfectFlowGain);
  }
  tickUntil(Math.max(time,log.durationSeconds||0));
  return {chromaSeconds:+chromaSeconds.toFixed(2),highFlowSeconds:+highFlowSeconds.toFixed(2),
    maxedSeconds:+atMaxSeconds.toFixed(2),
    firstChromaAt:firstChromaAt===null?null:+firstChromaAt.toFixed(1)};
}
if(require.main===module){
  const files=process.argv.slice(2);
  if(!files.length){
    console.error('Usage: node scripts/flow-balance-replay.cjs <run-audit.json> [...more.json]');
    process.exitCode=1;
  }
  for(const file of files){
    const log=JSON.parse(fs.readFileSync(file,'utf8'));
    console.log(JSON.stringify({file,recorded:{chromaSeconds:log.summary?.chromaSeconds,
      highFlowSeconds:log.summary?.flowAbove65Seconds},
      legacy:replay(log,LEGACY),balanced:replay(log)},null,2));
  }
}
module.exports={replay,LEGACY};
