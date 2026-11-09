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
    {name:'WHITEOUT',primary:'#f1fbff',secondary:'#72dfff',shadow:'#0d2133'},
    // Chroma Spectrum 2.0: curated new zones 9–24, not a modulo replay
    // of the eight launch palettes. Keep each pair luminous against deep
    // backgrounds for readable barriers at high speed and on older phones.
    {name:'ROSESHIFT',primary:'#ff789f',secondary:'#a858ff',shadow:'#2c1235'},
    {name:'SOLAR',primary:'#ffe067',secondary:'#ff814c',shadow:'#30210c'},
    {name:'AQUAFLARE',primary:'#39ffc8',secondary:'#2f91ff',shadow:'#082c28'},
    {name:'COBALT',primary:'#3c9aff',secondary:'#a0d7ff',shadow:'#071b3d'},
    {name:'HOTPINK',primary:'#ff4fce',secondary:'#ffd0f2',shadow:'#300b2c'},
    {name:'JADE',primary:'#58ffa8',secondary:'#d4ff68',shadow:'#0c3020'},
    {name:'ULTRAVIOLET',primary:'#ba55ff',secondary:'#68a0ff',shadow:'#1b1034'},
    {name:'COPPER',primary:'#ff9a53',secondary:'#ffc37d',shadow:'#2e170d'},
    {name:'ICEBLUE',primary:'#77e9ff',secondary:'#bbfaff',shadow:'#0a2935'},
    {name:'SCARLET',primary:'#ff5262',secondary:'#fc82c2',shadow:'#300d21'},
    {name:'CITRUS',primary:'#ecff5d',secondary:'#ffbb49',shadow:'#2a2709'},
    {name:'NOVA',primary:'#b7afff',secondary:'#58c9ff',shadow:'#17113b'},
    {name:'FUCHSIA',primary:'#ff3cb5',secondary:'#ff7077',shadow:'#320d23'},
    {name:'CERULEAN',primary:'#45b5ff',secondary:'#72f2df',shadow:'#08263b'},
    {name:'VERDANT',primary:'#81ff69',secondary:'#35ffc0',shadow:'#123010'},
    {name:'PLASMA',primary:'#aa64ff',secondary:'#ffac6e',shadow:'#241331'}
  ].map(p=>Object.freeze(p)));
  const GAME=Object.freeze({
    floorRatio:.715,
    baseSpeed:370,
    // Speed Curve 3.2: faster early momentum based on consecutive player audits.
    // Smoothly decaying acceleration; strictly rising speed with no zone spikes.
    speedRise:1350,
    speedEaseSeconds:170,
    cruiseAcceleration:.9,
    zoneSpeedBonus:0,
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
    speedAt(time,zone){
      const elapsed=Math.max(0,time);
      // Public time/zone API retained for arcade and practice. Velocity is
      // continuous in elapsed time; zones trigger visuals, not speed steps.
      return this.baseSpeed+this.speedRise*(1-Math.exp(-elapsed/this.speedEaseSeconds))+
        elapsed*this.cruiseAcceleration;
    }
  });
  const FLOW=Object.freeze({
    thresholds:Object.freeze([30,65,90]),
    multipliers:Object.freeze([1,1.25,1.5,2]),
    clearPoints:135,
    clearGain:5,
    precisionGain:8,
    // Small, capped bonuses on REAL alternating movement chains only.
    // They reuse Flow tiers and never multiply a separate combo meter.
    comboBonusPoints:Object.freeze({2:20,3:35,4:55}),
    comboFlowGain:Object.freeze({2:0,3:1,4:1}),
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
    // Director-created quiet windows cannot consume full idle grace.
    fadeIdleClockScale:0.5,
    relaxReturnGraceSeconds:1.0,
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
    // Echo Rail 1.0 replaces the tall 190–200 unit Spire entirely.
    // A wide low block plus its visible underbody energy field teaches
    // double jump in zone 2 with a MUCH bigger height/timing margin.
    // Keep the ECHO_SPIRE key for save/audit and Director compatibility.
    firstZone:2,
    minWidth:300,maxWidth:385,
    minHeight:78,maxHeight:86,
    introMinWidth:265,introMaxWidth:280,
    introMinHeight:70,introMaxHeight:76,
    energyHeightRatio:.46
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
  // Dash Impact & Morph 2.2 — pronounced but bounded acceleration, no invulnerability.
  // Air dash adds reach without altering the existing jump impulse.
  // Ground dash briefly extends an already active duck, not a hold-to-duck.
  const DASH=Object.freeze({
    unlockZone:1,duration:.30,bonusFactor:1.05,
    minBonusSpeed:400,maxBonusSpeed:760,
    groundDuckMinRemaining:.62,hintSeconds:5.2
  });
  // Shield Core 1.0: a RARE optional recovery reward, never a third obstacle.
  // Its height exceeds the maximum normal-jump player's highest body edge.
  const SHIELD_CORE=Object.freeze({
    firstZone:2,firstTime:16,restore:25,maxShield:100,spawnAtOrBelow:75,
    rise:268,radius:12,magnetDistance:35,magnetPull:9,
    visibleLeadSeconds:1.65,minCooldown:25,maxCooldown:35
  });
  const JUMP_FEEL=Object.freeze({
    coyoteSeconds:.080,
    maxCoyoteDistance:48,
    bufferSeconds:.110,
    landingAnimationSeconds:.230,
    echoUnlockZone:1,
    echoMinAirSeconds:.095
  });
  return {PALETTES,GAME,FLOW,AUDIO,TERRAIN,JUMP_FEEL,ECHO_SPIRE,DASH,SHIELD_CORE};
});
