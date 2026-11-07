/* CHROMA RUSH — shared, dependency-free game configuration. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaConfig=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const PALETTES=Object.freeze([
    {name:'CYAN', primary:'#3feeff', secondary:'#53b5ff', shadow:'#061a30'},
    {name:'VIOLET', primary:'#a06bff',secondary:'#e265ff',shadow:'#1b0d39'},
    {name:'MAGENTA',primary:'#ff4aa2',secondary:'#ff8ada',shadow:'#310d27'},
    {name:'LIME',primary:'#b6ff4e',secondary:'#3ef5d3',shadow:'#183016'},
    {name:'AMBER',primary:'#ffc25d',secondary:'#ff5d7e',shadow:'#32200f'},
    {name:'ELECTRIC',primary:'#6078ff',secondary:'#30fdce',shadow:'#111335'},
    {name:'REDLINE',primary:'#ff466c',secondary:'#ffb151',shadow:'#330d1a'},
    {name:'WHITEOUT',primary:'#f1fbff',secondary:'#72dfff',shadow:'#0d2133'}
  ].map(p=>Object.freeze(p)));
  const GAME=Object.freeze({
    floorRatio:.715,
    baseSpeed:370,
    acceleration:11.5,
    zoneSpeedBonus:12,
    zoneSeconds:12,
    jumpVelocity:-870,
    // Echo Jump is deliberately weaker and can be used only once per flight.
    echoJumpVelocity:-650,
    // Early second taps add a real upward boost rather than slowing an ascent.
    echoUpwardBoost:150,
    gravity:2140,
    duckDuration:.55,
    duckRecovery:.12,
    startingHP:100,
    damagePerHit:25,
    speedAt(time,zone){return this.baseSpeed+time*this.acceleration+Math.max(0,zone-1)*this.zoneSpeedBonus}
  });
  const FLOW=Object.freeze({
    thresholds:Object.freeze([30,65,90]),
    multipliers:Object.freeze([1,1.25,1.5,2]),
    clearPoints:135,
    clearGain:5,
    precisionGain:8,
    damagePenalty:35,
    decayDelay:3.5,
    decayPerSecond:1.5,
    // Flow Balance 1.2: gentler exponential pressure in high tiers.
    // At 100 Flow the full-pressure initial loss is 2.5/s (previously 4.5/s).
    highFlowPressureStart:65,
    highFlowPressurePerSecond:2.5,
    // Director recovery creates breathing room, not a Flow punishment.
    fadePressureScale:0.75,
    relaxPressureScale:0.4,
    relaxIdleDecayScale:0.5,
    // Enter Chroma at 90; leave only below 87 to avoid oscillation.
    chromaExitThreshold:87,
    minPerfectClears:3,
    perfectHeal:10,
    perfectPoints:350,
    perfectFlowGain:5
  });
  const AUDIO=Object.freeze({
    startBpm:110,maxBpm:156,bpmPerSpeed:.026,
    lookaheadSeconds:.09,maxStepsPerFrame:3,
    masterGain:.76,musicGain:.58,effectsGain:.40
  });
  const ECHO_SPIRE=Object.freeze({
    firstZone:4,
    minWidth:49,maxWidth:58,
    // At g=2140 and launch v=-870 the standard jump rises ~177px.
    // These pillars require an intentional second airborne impulse.
    minHeight:204,maxHeight:216
  });
  const TERRAIN=Object.freeze({
    slopeFromZone:2,
    gapFromZone:3,
    firstGapWorld:2600,
    gapChance:.23,
    slopeChance:.62,
    maxHeightChange:65,
    maxOffset:70,
    minSlopeWidth:410,
    maxSlopeWidth:570,
    minLandingFlat:680,
    minGapWidth:132,
    maxGapWidth:500,
    minGapSeparation:1250,
    fallThreshold:125
  });
  const JUMP_FEEL=Object.freeze({
    coyoteSeconds:.080,
    maxCoyoteDistance:48,
    bufferSeconds:.110,
    landingAnimationSeconds:.230,
    echoUnlockZone:2,
    echoMinAirSeconds:.095
  });
  return {PALETTES,GAME,FLOW,AUDIO,TERRAIN,JUMP_FEEL,ECHO_SPIRE};
});
