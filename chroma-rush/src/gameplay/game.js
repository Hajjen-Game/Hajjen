/* CHROMA RUSH — Gravity Shift / Ceiling Run 1.0 on Original Background Restored
   Movement Evolution 2.0 — Contextual Air & Ground Dash; Echo Jump retained.
   Standalone, offline-capable HTML5 Canvas 2D game. No third-party assets or dependencies.
   All dimensions are logical world units, scaled to landscape viewport height.
*/
(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx || !window.ChromaDirector || !window.ChromaConfig || !window.ChromaGeometry || !window.ChromaHud || !window.ChromaFlow || !window.ChromaAudio || !window.ChromaProgress || !window.ChromaArcadeUI || !window.ChromaTerrain || !window.ChromaJump || !window.ChromaDash || !window.ChromaMotion || !window.ChromaWorldBackground || !window.ChromaTerrainRender || !window.ChromaRoundAudit || !window.ChromaUnifiedTerrainDirector || !window.ChromaQuality || !window.ChromaFrameClock || !window.ChromaEffects || !window.ChromaMobilePreferences || !window.ChromaReplay || !window.ChromaReplayUI || !window.ChromaSpectralWave || !window.ChromaStateVFX || !window.ChromaSpeedTrails || !window.ChromaGravityShift || !window.ChromaMovementAwareness || !window.ChromaHighSpeedFairness || !window.ChromaPrecisionCombo) {
    document.getElementById('menu').innerHTML = '<h2>Canvas 2D is required.</h2>';
    return;
  }
  const el = id => document.getElementById(id);
  const director = new window.ChromaDirector.AdaptiveRushDirector();
  const flow = new window.ChromaFlow.FlowSystem();
  const combo = new window.ChromaPrecisionCombo.PrecisionComboSystem();
  const gradePrecision = window.ChromaPrecisionCombo.assessPrecision;
  function preferredAudio(){try{return localStorage.getItem('chromaRushSoundOff')!=='true'}catch(_){return true}}
  const audio = new window.ChromaAudio.ReactiveAudioSystem({scope:window,enabled:preferredAudio()});
  let profileStorage=null;try{profileStorage=localStorage}catch(_){}
  const preferences = new window.ChromaMobilePreferences.MobilePreferences(profileStorage);
  audio.setMusicEnabled(preferences.music);
  audio.setEffectsEnabled(preferences.effects);
  audio.setEffectsVolume(preferences.effectsVolume/100);
  const progression = new window.ChromaProgress.ArcadeProgression(profileStorage);
  const arcadeUI = window.ChromaArcadeUI;
  const replay = new window.ChromaReplay.ReplayChallenge(profileStorage);
  const replayUI = window.ChromaReplayUI;
  const GAME = window.ChromaConfig.GAME;
  const GEO = window.ChromaGeometry;
  const FAIR = window.ChromaHighSpeedFairness;
  const terrain = new window.ChromaTerrain.TerrainSystem();
  const terrainDirector = new window.ChromaUnifiedTerrainDirector.UnifiedTerrainDirector({terrain,director});
  const jumpControl = new window.ChromaJump.JumpController();
  const dash = new window.ChromaDash.ContextualDash();
  const motion = new window.ChromaMotion.PlayerMotion();
  const effects = new window.ChromaEffects.EffectLanguage();
  const terrainRender = window.ChromaTerrainRender;
  const worldBackground = window.ChromaWorldBackground;
  const spectralWave = new window.ChromaSpectralWave.SpectralWave();
  const gravityShift = new window.ChromaGravityShift.GravityShift();
  const chromaVfx = new window.ChromaStateVFX.ChromaStateVisuals();
  const speedTrails = new window.ChromaSpeedTrails.SpeedTrails();
  const reducedMotion=Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  const runAudit = new window.ChromaRoundAudit.RoundAudit();
  const quality = new window.ChromaQuality.QualityManager({storage:profileStorage,
    device:{deviceMemory:navigator.deviceMemory,hardwareConcurrency:navigator.hardwareConcurrency}});
  const frameClock = new window.ChromaFrameClock.FixedStepClock();
  const HUD = window.ChromaHud;
  const $ = {
    menu:el('menu'), hud:el('hud'), controls:el('controls'), gameover:el('gameover'),
    pauseMenu:el('pause-menu'), pauseBtn:el('pause-btn'), jump:el('jump-btn'), duck:el('duck-btn'),
    echoHint:el('echo-hint'),dashHint:el('dash-hint'),
    hp:el('hp-inner'), hpNumber:el('hp-number'), zone:el('zone-display'), phase:el('phase-display'),
    score:el('score-display'), speed:el('speed-display'), critical:el('danger-indicator'),
    zoneCallout:el('zone-callout'), zoneCalloutTag:el('zone-callout-tag'), zoneCalloutName:el('zone-callout-name'),
    sound:el('sound-btn'), audioHint:el('audio-hint'), finalScore:el('final-score'), finalZone:el('final-zone'), finalBest:el('final-best'),
    finalPerfect:el('final-perfect'), zonePerfect:el('zone-perfect'),
    flowNumber:el('flow-number'),flowBar:el('flow-inner'),flowOuter:el('flow-outer'),
    flowMultiplier:el('flow-multiplier'),flowState:el('flow-state'),flowStreak:el('flow-streak'),
    recordScore:el('record-score'),recordZone:el('record-zone'),recordStreak:el('record-streak'),
    recordDistance:el('record-distance'),replayProgress:el('replay-progress'),
    replayTarget:el('replay-target'),replayPercent:el('replay-percent'),replayFill:el('replay-fill'),
    replayToast:el('replay-toast'),
    milestoneProgress:el('milestone-progress'),milestoneNext:el('milestone-next'),
    practiceSelect:el('practice-zone'),practiceButton:el('practice-start-btn'),practiceHint:el('practice-hint'),
    modeIndicator:el('mode-indicator'),milestoneToast:el('milestone-toast'),milestoneToastName:el('milestone-toast-name'),
    milestonePanel:el('milestone-panel'),milestoneGrid:el('milestone-grid'),
    finalMode:el('final-mode'),finalStreak:el('final-streak'),finalRecord:el('final-record'),finalMilestones:el('final-milestones'),
    finalDistance:el('final-distance'),finalComparison:el('final-comparison'),finalChallenge:el('final-challenge'),
    exportRun:el('export-run-btn'),graphicsButton:el('graphics-btn'),
    graphicsPanel:el('graphics-panel'),graphicsMode:el('graphics-mode'),
    graphicsActive:el('graphics-active'),perfOverlay:el('perf-overlay'),
    musicEnabled:el('music-enabled'),effectsEnabled:el('effects-enabled'),
    effectsVolume:el('effects-volume'),effectsVolumeValue:el('effects-volume-value'),
    hapticsEnabled:el('haptics-enabled'),fullscreenButton:el('fullscreen-btn'),
    fullscreenStatus:el('fullscreen-status'),runLaunch:el('run-launch')
  };
  const PALETTES = window.ChromaConfig.PALETTES;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const mix=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
  const hexRgb=s=>[parseInt(s.slice(1,3),16),parseInt(s.slice(3,5),16),parseInt(s.slice(5,7),16)];
  const rgbHex=(a,b,t)=>{ const A=hexRgb(a),B=hexRgb(b); return '#'+A.map((v,i)=>Math.round(mix(v,B[i],t)).toString(16).padStart(2,'0')).join('');};
  const rgba=(hex,alpha)=>{const c=hexRgb(hex);return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`};
  const rand=(a,b)=>a+Math.random()*(b-a);
  // Visual-only PRNG: graphics quality cannot perturb Director/terrain randomness.
  let visualSeed=0x7e3a91d2;
  const visualRandom=()=>{visualSeed=(Math.imul(1664525,visualSeed)+1013904223)>>>0;return visualSeed/4294967296;};
  const fxRand=(a,b)=>a+visualRandom()*(b-a);
  const vib=ms=>{if(!preferences.haptics)return;try{if(navigator.vibrate)navigator.vibrate(ms)}catch(_){}};
  const store = {
    get(){try{return Number(localStorage.getItem('chromaRushBestFlow1'))||0}catch(_){return 0}},
    put(v){try{localStorage.setItem('chromaRushBestFlow1',String(v))}catch(_){}}
  };
  let W=1280,H=720,scale=1,floorY=H*GAME.floorRatio,dpr=1;
  const diagnosticsOn=Boolean(window.location&&/[?&]perf=1(?:&|$)/.test(window.location.search||''));
  let frameDiagnosticsElapsed=0,previousFrameTimestamp=null;
  if(diagnosticsOn)$.perfOverlay.classList.remove('hidden');
  let status='ready', time=0, worldTime=0, zone=1, lastTs=0, shake=0, hitFlash=0, lastZoneCallout=0;
  let speed=GAME.baseSpeed, hp=GAME.startingHP, score=0, best=progression.bestScore, hurdles=[], motes=[], streaks=[];
  let runMode='arcade', startZone=1, milestoneTime=0, unlockedThisRun=[];
  let peakFlow=0,replayToastTime=0,zoneSoundAtCrossing=false,echoHintTime=0,dashHintTime=0;
  // Absolute travelled distance: terrain and obstacles share this world axis.
  let distance=0,gapRecovery=null;
  let c1=PALETTES[0].primary, c2=PALETTES[0].secondary, c3=PALETTES[0].shadow;
  let player={x:300,feet:floorY,vy:0,landed:true,duck:false,duckTime:0,duckRecovery:0,wasAirborne:false,invulnerable:0,stretch:0};
  const input={duckKeys:new Set(),duckPointer:null,jumpPointer:null};
  // Each new press triggers a fixed duck pulse. Holding never extends or repeats it.
  const DUCK_DURATION=GAME.duckDuration;
  const DUCK_RECOVERY=GAME.duckRecovery;
  const DASH=window.ChromaConfig.DASH||{unlockZone:1,duration:.30,bonusFactor:1.05,
    minBonusSpeed:400,maxBonusSpeed:760,groundDuckMinRemaining:.62,hintSeconds:5.2};
  const SPEED_MARKS=Object.freeze([1.5,2,3,4,6,8]);
  let nextSpeedMark=0;
  function auditState(){return {time:worldTime,zone,hp,score,flow:flow.value,speed,distance,
    phase:director.phase,streak:flow.streak,chromaActive:flow.tier===3,
    gravityMode:gravityShift.ceiling?'ceiling':'floor',gravityPhase:gravityShift.phase,
    movementPressure:director.movement.pressure,
    comboChain:combo.chain.length,dashMode:dash.mode||'none',
    dashActive:dash.active};}
  function exportRound(){
    if(status!=='dead')return;
    const exported=runAudit.snapshot(auditState());
    // A local-only snapshot helps diagnose weak devices without collecting identifiers.
    exported.renderPerformance=quality.snapshot();
    const contents=JSON.stringify(exported,null,2);
    const filename=`chroma-rush-zone-${String(zone).padStart(2,'0')}-${runMode}-audit.json`;
    try{
      const blob=new Blob([contents],{type:'application/json'});
      const url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download=filename;a.style.display='none';
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),2000);
    }catch(_){
      // Fallback for restricted browsers; no server or third-party upload.
      if(navigator.clipboard&&typeof navigator.clipboard.writeText==='function')
        navigator.clipboard.writeText(contents).then(()=>{$.exportRun.textContent='LOG COPIED';}).catch(()=>{});
    }
  }
  // Audio is fully owned by src/audio/reactive-audio.js, including all effects.
  function sound(kind){audio.effect(kind)}
  let lastAudioState='';
  function syncSoundButton(force=false){
    const state=audio.playbackState;
    if(!force&&state===lastAudioState)return;
    lastAudioState=state;
    const blocked=audio.enabled&&state==='blocked';
    const unsupported=audio.enabled&&state==='unsupported';
    $.sound.textContent=audio.enabled?'♫':'×';
    const label=blocked?'Tap to unlock audio':unsupported?'Audio unavailable':audio.enabled?'Mute all sound':'Enable all sound';
    $.sound.title=label;
    $.sound.setAttribute('aria-pressed',String(audio.enabled));
    $.sound.setAttribute('aria-label',label);
    $.audioHint.textContent=unsupported?'AUDIO NOT SUPPORTED':'TAP ♫ FOR MUSIC';
    $.audioHint.classList.toggle('hidden',status!=='running'||(!blocked&&!unsupported));
  }
  syncSoundButton(true);
  function resize(){
    const cw=Math.max(1,canvas.clientWidth),ch=Math.max(1,canvas.clientHeight);
    dpr=quality.effectiveDpr(window.devicePixelRatio||1,cw,ch);
    const pixelsX=Math.max(1,Math.floor(cw*dpr)),pixelsY=Math.max(1,Math.floor(ch*dpr));
    // Setting canvas dimensions clears its buffers. Avoid reallocating unless needed.
    if(canvas.width!==pixelsX||canvas.height!==pixelsY){canvas.width=pixelsX;canvas.height=pixelsY;}
    const previousWidth=W;
    W=720*cw/ch; H=720;scale=ch/H; floorY=H*GAME.floorRatio;
    // A rotation/aspect change invalidates old screen-space echo positions.
    if(Math.abs(W-previousWidth)>1)speedTrails.reset();
    player.x=W*.265;
    if(status==='ready'){
      terrain.reset(floorY);
      player.feet=floorY;
    }
  }
  window.addEventListener('resize',resize,{passive:true});resize();
  function syncGraphics(){
    $.graphicsMode.value=quality.mode;
    $.graphicsActive.textContent=quality.mode.toUpperCase()+' · '+quality.tier.toUpperCase();
  }
  syncGraphics();
  function syncMobilePreferences(){
    $.musicEnabled.checked=preferences.music;
    $.effectsEnabled.checked=preferences.effects;
    $.hapticsEnabled.checked=preferences.haptics;
    $.effectsVolume.value=String(preferences.effectsVolume);
    $.effectsVolumeValue.textContent=preferences.effectsVolume+'%';
  }
  syncMobilePreferences();
  const shell=el('game-shell');
  function syncFullscreenButton(message=''){
    const supported=typeof shell.requestFullscreen==='function'&&document.fullscreenEnabled!==false;
    const active=document.fullscreenElement===shell;
    const safeToChange=status==='ready'||status==='dead';
    $.fullscreenButton.disabled=!supported||!safeToChange;
    $.fullscreenButton.textContent=active?'EXIT FULLSCREEN':'GO FULLSCREEN';
    $.fullscreenStatus.textContent=message||(!supported?'Fullscreen not available in this browser.':!safeToChange?'Return to menu to change fullscreen.':active?'Fullscreen is active.':'Optional: hide browser bars for more space.');
  }
  syncFullscreenButton();
  const showSettings=()=>{
    const nowHidden=$.graphicsPanel.classList.toggle('hidden');
    $.graphicsButton.setAttribute('aria-expanded',String(!nowHidden));
    if(!nowHidden){syncMobilePreferences();syncGraphics();syncFullscreenButton()}
  };
  $.graphicsButton.addEventListener('click',()=>{
    showSettings();
  });
  $.musicEnabled.addEventListener('change',()=>{
    preferences.set('music',Boolean($.musicEnabled.checked));
    audio.setMusicEnabled(preferences.music);
  });
  $.effectsEnabled.addEventListener('change',()=>{
    preferences.set('effects',Boolean($.effectsEnabled.checked));
    audio.setEffectsEnabled(preferences.effects);
  });
  $.hapticsEnabled.addEventListener('change',()=>{
    preferences.set('haptics',Boolean($.hapticsEnabled.checked));
  });
  $.effectsVolume.addEventListener('input',()=>{
    preferences.set('effectsVolume',Number($.effectsVolume.value));
    audio.setEffectsVolume(preferences.effectsVolume/100);
    syncMobilePreferences();
  });
  $.fullscreenButton.addEventListener('click',()=>{
    const active=document.fullscreenElement===shell;
    try{
      const result=active?document.exitFullscreen():shell.requestFullscreen({navigationUI:'hide'});
      if(result&&typeof result.then==='function')
        result.then(()=>{syncFullscreenButton();resize()}).catch(()=>syncFullscreenButton('Fullscreen was blocked by the browser.'));
      else syncFullscreenButton();
    }catch(_){syncFullscreenButton('Fullscreen is unavailable here.')}
  });
  document.addEventListener('fullscreenchange',()=>{syncFullscreenButton();resize()});
  $.graphicsMode.addEventListener('change',()=>{
    if(quality.setMode($.graphicsMode.value)){resize();syncGraphics();}
  });
  const makeMote=(x,y,color,options={})=>({x,y,vx:options.vx??fxRand(-130,90),vy:options.vy??fxRand(-120,45),
    life:options.life??fxRand(.2,.58),max:options.life??.58,r:options.r??fxRand(1.2,3.5),color});
  function burst(x,y,count,color,intensity=1){
    const budget=Math.max(3,Math.round(count*quality.profile.particles));
    for(let i=0;i<budget;i++){
      const a=fxRand(0,Math.PI*2),v=fxRand(45,220)*intensity;
      motes.push(makeMote(x,y,color,{vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:fxRand(.2,.65),r:fxRand(1.1,3.1)}));
    }
    if(motes.length>180)motes.splice(0,motes.length-180);
  }
  function groundPulse(x,y,color,size=20,strength=1){effects.ground(x,y,color,size,strength);}
  function frameEcho(x,y,color,size=28,strength=1){effects.frame(x,y,color,size,strength);}
  function startRun(requestedMode='arcade',requestedZone=1){
    // A practice run can only begin in a zone already reached in real arcade play.
    const selected=Number(requestedZone);
    runMode=requestedMode==='practice'&&progression.canPracticeZone(selected)?'practice':'arcade';
    startZone=runMode==='practice'?selected:1;
    time=(startZone-1)*GAME.zoneSeconds;worldTime=0;zone=startZone;
    hp=GAME.startingHP;speed=GAME.speedAt(time,zone);score=0;shake=0;hitFlash=0;
    // Starting practice at later zones must never spam past speed milestones.
    nextSpeedMark=SPEED_MARKS.findIndex(mark=>speed/GAME.baseSpeed<mark);
    if(nextSpeedMark<0)nextSpeedMark=SPEED_MARKS.length;
    const palette=PALETTES[(zone-1)%PALETTES.length];
    c1=palette.primary;c2=palette.secondary;c3=palette.shadow;
    spectralWave.start({from:palette,to:palette,width:W,reducedMotion:true});
    chromaVfx.reset();speedTrails.reset();gravityShift.reset();
    zoneSoundAtCrossing=false;
    hurdles=[];motes=[];streaks=[];effects.reset();director.reset();terrainDirector.reset();flow.reset();combo.reset();flow.currentZone=zone;
    distance=0;gapRecovery=null;terrain.reset(floorY);jumpControl.reset();dash.reset();motion.reset();
    peakFlow=0;replayToastTime=0;
    // All moves are usable immediately. Explain dash first; save the Echo
    // tip for its first tall Spire in zone 2, without overlapping callouts.
    echoHintTime=startZone>=2?3.9:0;
    dashHintTime=startZone===1?DASH.hintSeconds:0;
    $.echoHint.classList.add('hidden');$.dashHint.classList.add('hidden');
    replay.start({practice:runMode==='practice',bestScore:progression.bestScore,bestZone:progression.bestZone});
    // Practice retains the chosen zone/difficulty but starts on a fresh,
    // safe runway, rather than loading a nonexistent alternate level.
    terrainDirector.prepare({right:W+1000,playerWorld:player.x,zone,speed,hp});
    runAudit.reset({mode:runMode,startingZone:startZone});
    runAudit.record('start',auditState(),{startingZone:startZone});
    if(startZone>=DASH.unlockZone)runAudit.record('dash_unlocked',auditState(),{zone:startZone});
    $.exportRun.textContent='EXPORT RUN LOG';
    milestoneTime=0;unlockedThisRun=[];
    player={x:W*.265,feet:floorY,vy:0,landed:true,duck:false,duckTime:0,duckRecovery:0,wasAirborne:false,invulnerable:0,stretch:0};
    input.duckKeys.clear();input.duckPointer=null;input.jumpPointer=null;$.jump.classList.remove('is-down');$.duck.classList.remove('is-down','dash-active');
    $.graphicsButton.classList.add('hidden');$.graphicsPanel.classList.add('hidden');$.graphicsButton.setAttribute('aria-expanded','false');
    $.menu.classList.add('hidden');$.milestonePanel.classList.add('hidden');$.gameover.classList.add('hidden');$.pauseMenu.classList.add('hidden');
    $.hud.classList.remove('hidden');$.controls.classList.remove('hidden');$.pauseBtn.classList.remove('hidden');$.pauseBtn.textContent='Ⅱ';
    $.critical.classList.remove('active');$.zoneCallout.classList.add('hidden');$.zonePerfect.classList.add('hidden');$.milestoneToast.classList.add('hidden');
    $.replayToast.classList.add('hidden');
    $.jump.setAttribute('aria-label',startZone>=window.ChromaConfig.JUMP_FEEL.echoUnlockZone?
      'Jump; tap again in the air for Double Jump':'Jump');
    $.duck.setAttribute('aria-label',
      'Duck or Dash: tap while airborne for Air Dash, or tap again during Duck for Ground Dash');
    arcadeUI.hud($,runMode==='practice');
    // Decorative GO cue runs while the usual safe runway begins, without
    // freezing or delaying physics, input or the procedural Director.
    $.runLaunch.classList.remove('run-launch-active');
    void $.runLaunch.offsetWidth;
    $.runLaunch.classList.add('run-launch-active');
    status='running';lastTs=performance.now();frameClock.reset(lastTs);
    updateHud();audio.start();syncSoundButton(true);sound('start');
  }
  function earnedMilestones(awards){
    if(runMode!=='arcade'||!awards?.length)return;
    for(const award of awards)if(!unlockedThisRun.some(m=>m.id===award.id))unlockedThisRun.push(award);
    $.milestoneToastName.textContent=awards.map(m=>m.name).join(' · ');
    $.milestoneToast.classList.remove('hidden');milestoneTime=1.7;
  }
  function showMenu(){
    if(status==='running'||status==='paused')audio.stop();
    status='ready';runMode='arcade';milestoneTime=0;replayToastTime=0;echoHintTime=0;dashHintTime=0;
    $.echoHint.classList.add('hidden');$.dashHint.classList.add('hidden');dash.reset();$.duck.classList.remove('dash-active');
    spectralWave.reset();chromaVfx.reset();speedTrails.reset();gravityShift.reset();effects.reset();combo.reset();zoneSoundAtCrossing=false;
    $.replayToast.classList.add('hidden');
    $.milestoneToast.classList.add('hidden');$.milestonePanel.classList.add('hidden');$.pauseMenu.classList.add('hidden');$.gameover.classList.add('hidden');
    $.controls.classList.add('hidden');$.hud.classList.add('hidden');$.pauseBtn.classList.add('hidden');
    $.critical.classList.remove('active');$.zoneCallout.classList.add('hidden');$.zonePerfect.classList.add('hidden');
    $.menu.classList.remove('hidden');$.graphicsButton.classList.remove('hidden');$.graphicsPanel.classList.add('hidden');$.graphicsButton.setAttribute('aria-expanded','false');syncSoundButton(true);arcadeUI.menu($,progression);replayUI.menu($,replay);
  }
  function pause(){if(status!=='running')return;status='paused';$.graphicsButton.classList.remove('hidden');$.pauseMenu.classList.remove('hidden');$.controls.classList.add('hidden');$.pauseBtn.textContent='▶';input.duckKeys.clear();input.duckPointer=null;input.jumpPointer=null;$.jump.classList.remove('is-down');dash.cancel();dash.onDuckEnd();$.duck.classList.remove('dash-active');player.duck=false;player.duckTime=0;player.duckRecovery=0;motion.duckCancel();$.duck.classList.remove('is-down');audio.pause();syncSoundButton(true);}
  function resume(){if(status!=='paused')return;status='running';$.graphicsButton.classList.add('hidden');$.graphicsPanel.classList.add('hidden');$.pauseMenu.classList.add('hidden');$.controls.classList.remove('hidden');$.pauseBtn.textContent='Ⅱ';lastTs=performance.now();frameClock.reset(lastTs);audio.resume();syncSoundButton(true);}
  function endRun(){
    if(status!=='running')return;
    status='dead';dash.cancel();$.duck.classList.remove('dash-active');speedTrails.reset();effects.reset();$.echoHint.classList.add('hidden');$.dashHint.classList.add('hidden');$.graphicsButton.classList.remove('hidden');audio.stop();syncSoundButton(true);sound('gameover');$.controls.classList.add('hidden');$.pauseBtn.classList.add('hidden');$.critical.classList.remove('active');
    runAudit.finish(auditState());
    const total=Math.floor(score),previousBest=progression.bestScore;
    replayToastTime=0;$.replayToast.classList.add('hidden');
    if(runMode==='arcade'){
      earnedMilestones(progression.finishRankedRun({score:total,zone,bestStreak:flow.bestStreak}).earned);
      best=progression.bestScore;
      if(best>previousBest)store.put(best); // Preserve the Flow 1.0 record used by earlier versions.
    }
    const replayResult=replay.finish({score:total,distance:Math.floor(distance),zone,
      peakFlow,perfectZones:flow.perfectZones,bestScore:progression.bestScore,bestZone:progression.bestZone});
    arcadeUI.results($,{practice:runMode==='practice',score:total,zone,runStreak:flow.bestStreak,
      perfectZones:flow.perfectZones,bestScore:progression.bestScore,recordScore:runMode==='arcade'&&total>previousBest,
      earned:unlockedThisRun});
    replayUI.results($,{practice:runMode==='practice',score:total,distance:Math.floor(distance),...replayResult});
    arcadeUI.menu($,progression);replayUI.menu($,replay);
    $.milestoneToast.classList.add('hidden');$.gameover.classList.remove('hidden');
  }
  function openMilestones(){
    if(status!=='ready')return;
    arcadeUI.milestones($,progression);
    $.menu.classList.add('hidden');$.milestonePanel.classList.remove('hidden');
  }
  function closeMilestones(){
    $.milestonePanel.classList.add('hidden');$.menu.classList.remove('hidden');
  }
  function launchJump(){
    // Launch velocity and the hitbox remain identical to Terrain 1.0.
    player.vy=GAME.jumpVelocity;player.landed=false;dash.onLeaveGround();motion.jump();
    groundPulse(player.x,player.feet-3,c1,18,.85);
    effects.cue('jump',player.x,player.feet-2,c1,c2,{speed,reducedMotion});
    for(let i=0;i<Math.max(3,Math.round(8*quality.profile.particles));i++){
      motes.push(makeMote(player.x+fxRand(-15,15),player.feet-2,c2,
        {vx:fxRand(-155,60),vy:fxRand(-110,-25),life:fxRand(.16,.40),r:fxRand(1.0,2.8)}));
    }
    if(motes.length>180)motes.splice(0,motes.length-180);
    sound('jump');
  }
  function jump(){
    if(status!=='running'||gravityShift.shifting)return;
    const action=jumpControl.request({grounded:player.landed,ducking:player.duck,
      recovering:Boolean(gapRecovery),worldX:distance+player.x,
      echoEnabled:zone>=window.ChromaConfig.JUMP_FEEL.echoUnlockZone});
    runAudit.record('jump_input',auditState(),{action,grounded:player.landed,
      echoAvailable:jumpControl.echoAvailable});
    if(action==='jump'||action==='coyote')launchJump();
    else if(action==='echo')launchEcho();
  }
  function launchEcho(){
    // Echo never changes horizontal movement speed, gravity, or collision size.
    // One weaker impulse is available per intentional jump and is restored
    // only on a valid landing or a new buffered grounded takeoff.
    // Preserve upward momentum for quick second taps. A pure assignment to
    // -650 could actually SLOW the cube just after an ordinary takeoff.
    // This always produces a real impulse, yet never exceeds first-jump power.
    player.vy=Math.max(GAME.jumpVelocity,
      Math.min(GAME.echoJumpVelocity,player.vy-GAME.echoUpwardBoost));
    motion.echoJump();
    speedTrails.reset(); // the new beat starts a distinct clean afterimage arc
    frameEcho(player.x,player.feet-25,c2,31,.92);
    effects.cue('echo',player.x,player.feet-23,c2,c1,{speed,reducedMotion});
    const n=Math.max(3,Math.round(12*quality.profile.particles));
    for(let i=0;i<n;i++){
      const side=i%2===0?1:-1;
      motes.push(makeMote(player.x+side*fxRand(5,18),player.feet-fxRand(12,37),
        side>0?c1:c2,{vx:side*fxRand(85,220),vy:fxRand(-185,-40),
          life:fxRand(.20,.49),r:fxRand(.9,2.7)}));
    }
    if(motes.length>180)motes.splice(0,motes.length-180);
    runAudit.record('echo_jump',auditState(),{verticalImpulse:player.vy,
      surface:gravityShift.ceiling?'ceiling':'floor'});
    sound('echo');vib(12);
  }
  function landingImpact(ground,velocity){
    const strength=motion.land(velocity);
    // Short-lived dust streams sideways along the actual terrain surface.
    const n=Math.max(3,Math.round((6+strength*6)*quality.profile.particles));
    for(let i=0;i<n;i++){
      const side=i%2===0?1:-1;
      motes.push(makeMote(player.x+side*fxRand(3,12),ground-3,side===1?c1:c2,
        {vx:side*fxRand(70,205)*(0.6+strength*.5),vy:fxRand(-62,-9),
         life:fxRand(.18,.40),r:fxRand(1.0,2.9)}));
    }
    if(motes.length>180)motes.splice(0,motes.length-180);
    groundPulse(player.x,ground-2,c2,15+strength*10,1+strength*.3);
    effects.cue('land',player.x,ground-2,c1,c2,{strength,speed,reducedMotion});
    // Max 2 logical px before the draw() camera damping factor.
    if(velocity>650)shake=Math.max(shake,2.0);
    sound('land');
  }
  function pressDuckDash(){
    if(status!=='running')return;
    // A second physical press while ducking or a new press in midair is Dash.
    // A first press on the ground remains the exact legacy duck.
    const desired=player.duck?'ground':!player.landed?'air':'duck';
    runAudit.record('duck_input',auditState(),{desired,grounded:player.landed,
      ducking:player.duck});
    const action=dash.request({zone,grounded:player.landed,ducking:player.duck,
      recovering:Boolean(gapRecovery),shifting:gravityShift.shifting||gravityShift.protected});
    if(!action){
      if(desired!=='duck'){
        const reason=gapRecovery?'gap_recovery':gravityShift.shifting||gravityShift.protected?
          'gravity_shift':dash.active?'dash_active':desired==='air'&&dash.usedAir?
          'air_spent':desired==='ground'&&dash.usedDuck?'ground_spent':
          zone<DASH.unlockZone?'zone_locked':'not_ready';
        runAudit.record('dash_blocked',auditState(),{desired,reason});
      }
      startDuck();return;
    }
    if(action==='ground')player.duckTime=Math.max(player.duckTime,DASH.groundDuckMinRemaining);
    motion.dashStart(action==='ground');
    const color=action==='ground'?c2:c1;
    if(!reducedMotion){
      frameEcho(player.x-14,player.feet-(action==='ground'?10:26),color,30,.82);
      // Horizontal linear slashes are readable with this flat 2D camera.
      for(let i=0;i<Math.max(3,Math.round(9*quality.profile.particles));i++){
        motes.push(makeMote(player.x-24-fxRand(0,18),
          player.feet-fxRand(action==='ground'?3:10,action==='ground'?18:46),i%2?c1:c2,
          {vx:fxRand(-310,-145),vy:fxRand(-25,25),life:fxRand(.12,.30),r:fxRand(.8,1.9)}));
      }
      if(motes.length>180)motes.splice(0,motes.length-180);
    }
    $.duck.classList.add('dash-active');
    director.noteDash(action);
    runAudit.record(action==='air'?'air_dash':'ground_dash',auditState(),
      {extraSpeedFactor:DASH.bonusFactor,grounded:player.landed,
        ceiling:gravityShift.ceiling,remainingDuck:player.duckTime});
    sound(action==='air'?'dash-air':'dash-ground');
    vib(18);
  }
  function startDuck(){
    if(status!=='running'||gravityShift.shifting||!player.landed||player.duck||player.duckRecovery>0)return;
    player.duck=true;
    dash.onDuckStart();
    player.duckTime=DUCK_DURATION;
    motion.duckStart();
    groundPulse(player.x,player.feet-2,c2,18,.82);
    effects.cue('duck',player.x,player.feet-2,c1,c2,{speed,reducedMotion});
    $.duck.classList.add('is-down');
    sound('duck');
    // A short, horizontal ground streak: low-cost and readable on weak phones.
    for(let i=0;i<Math.max(1,Math.round(3*quality.profile.particles));i++)
      motes.push(makeMote(player.x-18-fxRand(0,12),player.feet-fxRand(2,7),c2,
        {vx:fxRand(-205,-80),vy:fxRand(-12,5),life:fxRand(.12,.28),r:fxRand(.9,1.7)}));
  }
  function updateDuck(dt){
    if(!dash.active)$.duck.classList.remove('dash-active');
    if(player.duck){
      player.duckTime=Math.max(0,player.duckTime-dt);
      if(player.duckTime===0){
        player.duck=false;
        dash.onDuckEnd();
        player.duckRecovery=DUCK_RECOVERY;
        motion.duckRelease();
        groundPulse(player.x,player.feet-2,c1,12,.52);
        effects.cue('release',player.x,player.feet-2,c1,c2,{speed,reducedMotion});
        $.duck.classList.remove('is-down');
      }
    }else{
      player.duckRecovery=Math.max(0,player.duckRecovery-dt);
    }
  }
  function registerControls(){
    $.jump.addEventListener('pointerdown',e=>{
      e.preventDefault();
      if(input.jumpPointer!==null)return; // one action per new thumb press
      input.jumpPointer=e.pointerId;
      $.jump.classList.add('is-down');
      try{$.jump.setPointerCapture(e.pointerId)}catch(_){}
      jump();
    });
    const jumpRelease=e=>{
      if(e.pointerId!==input.jumpPointer)return;
      input.jumpPointer=null;$.jump.classList.remove('is-down');
    };
    $.jump.addEventListener('pointerup',jumpRelease);
    $.jump.addEventListener('pointercancel',jumpRelease);
    $.jump.addEventListener('lostpointercapture',jumpRelease);
    // Some Android browsers can deliver a release outside the captured
    // element; clearing the matching pointer avoids stuck controls.
    window.addEventListener('pointerup',jumpRelease);
    window.addEventListener('pointercancel',jumpRelease);
    $.duck.addEventListener('pointerdown',e=>{e.preventDefault();
      if(input.duckPointer!==null)return;
      const freshPress=input.duckKeys.size===0;
      input.duckPointer=e.pointerId;
      try{$.duck.setPointerCapture(e.pointerId)}catch(_){}
      if(freshPress)pressDuckDash();
    });
    const duckRelease=e=>{if(input.duckPointer===e.pointerId)input.duckPointer=null;};
    $.duck.addEventListener('pointerup',duckRelease);$.duck.addEventListener('pointercancel',duckRelease);
    $.duck.addEventListener('lostpointercapture',duckRelease);
    window.addEventListener('pointerup',duckRelease);
    window.addEventListener('pointercancel',duckRelease);
    window.addEventListener('keydown',e=>{
      const k=e.code;
      if(['Space','ArrowUp','KeyW','ArrowDown','KeyS','Escape','KeyP'].includes(k))e.preventDefault();
      if((k==='Space'||k==='ArrowUp'||k==='KeyW')&&!e.repeat){if(status==='ready'||status==='dead')startRun('arcade');else jump();}
      if((k==='ArrowDown'||k==='KeyS')&&!e.repeat&&!input.duckKeys.has(k)){
        const freshPress=input.duckKeys.size===0&&input.duckPointer===null;
        input.duckKeys.add(k);if(freshPress)pressDuckDash();
      }
      if(k==='Escape'&&!$.graphicsPanel.classList.contains('hidden')){$.graphicsPanel.classList.add('hidden');$.graphicsButton.setAttribute('aria-expanded','false');return}
      if(k==='Escape'&&!$.milestonePanel.classList.contains('hidden')){closeMilestones();return}
      if((k==='Escape'||k==='KeyP')&&!e.repeat){if(status==='running')pause();else if(status==='paused')resume()}
    });
    window.addEventListener('keyup',e=>{input.duckKeys.delete(e.code)});
    window.addEventListener('blur',()=>{input.duckKeys.clear();input.duckPointer=null;input.jumpPointer=null;$.jump.classList.remove('is-down');if(status==='running')pause()});
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&status==='running')pause()});
    el('start-btn').addEventListener('click',()=>startRun('arcade'));
    el('retry-btn').addEventListener('click',()=>startRun(runMode,startZone));
    $.practiceButton.addEventListener('click',()=>startRun('practice',Number($.practiceSelect.value)));
    el('resume-btn').addEventListener('click',resume);
    el('restart-paused-btn').addEventListener('click',()=>startRun(runMode,startZone));
    el('menu-paused-btn').addEventListener('click',showMenu);
    el('menu-result-btn').addEventListener('click',showMenu);
    $.exportRun.addEventListener('click',exportRound);
    el('milestone-view-btn').addEventListener('click',openMilestones);
    el('milestone-back-btn').addEventListener('click',closeMilestones);
    $.pauseBtn.addEventListener('click',()=>status==='paused'?resume():pause());
    $.sound.addEventListener('click',()=>{
      if(audio.enabled&&audio.playbackState==='blocked'){
        audio.unlock();
        if(status==='running')audio.resume();
      }else{
        audio.setEnabled(!audio.enabled);
        try{localStorage.setItem('chromaRushSoundOff',String(!audio.enabled))}catch(_){}
      }
      syncSoundButton(true);
    });
    document.addEventListener('contextmenu',e=>e.preventDefault());
  }
  registerControls();
  arcadeUI.menu($,progression);replayUI.menu($,replay);

  // Response windows follow the ACTION'S physical demand. Place high-speed
  // hazards farther outside the view, with an upright early visual warning.
  // Never reduce track speed or alter collision geometry.
  const spawnXFor=type=>FAIR.horizonFor(type,
    {speed,playerX:player.x,viewportWidth:W});
  function spawn(data){
    // Hold new hazards while the arena safely changes orientation. Existing
    // hazards finish their normal course; no artificial clears are awarded.
    if(gravityShift.pending||gravityShift.shifting)return false;
    const spire=window.ChromaConfig.ECHO_SPIRE;
    const firstEcho=data.type==='echo'&&!director.echoIntroduced;
    if(data.type==='echo'&&(zone<spire.firstZone||hp<=50||director.stress>=.42))return false;
    if(firstEcho&&(gravityShift.ceiling||gravityShift.pending||
      gravityShift.shifting||gravityShift.protected))return false;
    const width=data.type==='echo'?
      rand(firstEcho?spire.introMinWidth:spire.minWidth,
        firstEcho?spire.introMaxWidth:spire.maxWidth):
      data.type==='jump'?rand(43,58):rand(54,71);
    const height=data.type==='echo'?
      rand(firstEcho?spire.introMinHeight:spire.minHeight,
        firstEcho?spire.introMaxHeight:spire.maxHeight):
      data.type==='jump'?rand(53,66):rand(115,158);
    const x=spawnXFor(data.type),worldX=distance+x;
    if(!terrain.canSpawnObstacle(worldX,width,speed))return false;
    const groundY=terrain.groundAt(worldX+width*.5);
    if(groundY===null)return false;
    if(data.type==='echo'){
      // Double-jump barriers need a readable run-up and a predictable
      // takeoff. Wide elevation changes or a late visible approach are vetoed.
      const approach=(x-player.x)/Math.max(300,speed);
      const launchY=terrain.groundAt(worldX-speed*.55);
      const landY=terrain.groundAt(worldX+width+speed*.20);
      // Keep the takeoff and landing on nearly the same level: a launch
      // from much higher ground could let ONE jump clear a lower Spire.
      if(approach<.78||launchY===null||landY===null||
        Math.abs(launchY-groundY)>8||Math.abs(landY-groundY)>8)return false;
    }
    hurdles.push({type:data.type,x,worldX,groundY,width,height,hit:false,cleared:false,
      closestClearance:Infinity,entryDuckTime:null,phase:data.phase,pulse:Math.random()*Math.PI*2});
    const fairness=FAIR.metrics(data.type,
      {x,playerX:player.x,viewportWidth:W,speed});
    runAudit.record('spawn',auditState(),{obstacle:data.type,pattern:data.pattern||'',worldX,
      surface:gravityShift.ceiling?'ceiling':'floor',intro:firstEcho,
      leadSeconds:fairness.leadSeconds,requiredSeconds:fairness.requiredSeconds,
      visibleSeconds:fairness.visibleSeconds,earlyCueSeconds:fairness.earlyCueSeconds,
      fair:fairness.fair,needsCue:fairness.needsCue});
    return true;
  }
  function updateHud(){
    HUD.update($,{hp,zone,color:c1,phase:director.label,score,speed,
      baseSpeed:GAME.baseSpeed,status,flow,combo});
    replayUI.hud($,{practice:runMode==='practice',score,previousScore:replay.previousScore});
  }
  function nextZone(reward=null){
    const incoming=PALETTES[(zone-1)%PALETTES.length];
    const outgoing=PALETTES[(zone-2+PALETTES.length)%PALETTES.length];
    const animated=spectralWave.start({from:outgoing,to:incoming,width:W,
      duration:.86,chargeDuration:.19,reducedMotion});
    // The panel peaks as the wave reaches the player's horizontal position.
    lastZoneCallout=1.6;
    HUD.showZoneCallout($,{zone,name:incoming.name,
      color:incoming.primary,perfectReward:reward?.perfect?reward:null});
    zoneSoundAtCrossing=animated&&!reward?.perfect;
    // Charge cue precedes the color wave; the established zone sound still
    // lands once, at the runner crossing. Perfect Zone has its own reward cue.
    if(animated&&!reward?.perfect)sound('zone-charge');
    if(!animated&&!reward?.perfect)sound('zone');
    if(zone===window.ChromaConfig.ECHO_SPIRE.firstZone){
      echoHintTime=4.1;
      $.jump.setAttribute('aria-label','Jump; tap again in the air for Double Jump');
      runAudit.record('echo_unlocked',auditState(),{zone});
    }
    if(zone===DASH.unlockZone&&zone!==1){
      dashHintTime=DASH.hintSeconds;
      $.duck.setAttribute('aria-label',
        'Duck or Dash: tap while airborne for Air Dash, or tap again during Duck for Ground Dash');
      runAudit.record('dash_unlocked',auditState(),{zone});
    }
    if(gravityShift.requestForZone(zone)){
      // Schedule a breathing space; generated gaps already ahead are respected
      // and the shift waits until the actual visible runway is safe.
      terrainDirector.noHazardsBefore=Math.max(terrainDirector.noHazardsBefore,
        distance+W+speed*1.5);
      terrainDirector.noGapsBefore=Math.max(terrainDirector.noGapsBefore,
        distance+W+speed*1.8);
      runAudit.record('gravity_warning',auditState(),{target:gravityShift.targetCeiling?'ceiling':'floor'});
      sound('gravity-warning');
    }
  }
  // Combo rewards never create a second clear, second streak or separate
  // multiplier. They enhance existing Flow only for ACTUAL successful moves.
  function awardCombo(action,{precision=false,master=false}={}){
    if(player.invulnerable>0){combo.breakChain();return;}
    const chain=combo.onClear({action,time:worldTime,precision,master});
    if(!chain)return;
    const reward=flow.registerCombo({length:chain.length});
    score+=reward.earnedPoints;
    combo.noteBonus(reward.earnedPoints);
    director.noteCombo(chain);
    runAudit.record('combo',auditState(),{length:chain.length,
      sequence:chain.actions,precisionClears:chain.precisionCount,
      masterClears:chain.masterCount,bonusPoints:reward.earnedPoints,
      bonusFlow:reward.flowGain});
    if(chain.flourish){
      effects.cue('combo',player.x,player.feet-22,c1,c2,
        {speed,reducedMotion,strength:chain.length===4?1.12:.92});
      sound('combo');
      if(chain.length===4)vib(12);
    }
    if(reward.tierUp&&reward.tier!==3)sound('flow');
  }
  function onHit(o){
    if(o.hit)return;
    if(gravityShift.protected){
      // Absolute guarantee: a hazard that arrives during the flip cannot
      // cause hidden damage or count as a free precision clearance.
      o.hit=true;o.cleared=true;
      runAudit.record('gravity_protected_contact',auditState(),{obstacle:o.type});
      return;
    }
    o.hit=true;
    combo.breakChain();
    if(player.invulnerable>0){
      flow.registerCollision();runAudit.record('invulnerable_contact',auditState(),{obstacle:o.type});return;
    }
    hp=Math.max(0,hp-GAME.damagePerHit);
    runAudit.record('obstacle_hit',auditState(),{obstacle:o.type});player.invulnerable=.96;shake=12;hitFlash=.38;
    director.registerDamage({action:o.type});flow.registerDamage();speedTrails.disrupt();burst(player.x,player.feet-30,'#ff506d',30,1.4);frameEcho(player.x,player.feet-26,'#ff596e',29,1.1);
    vib([25,40,30]);sound('hit');if(hp===0)endRun();
  }
  function failGap(gap){
    if(!terrain.markGap(gap,true))return;
    gapRecovery=gap;jumpControl.cancel();dash.cancel();motion.reset();combo.breakChain();
    terrainDirector.noteGapOutcome({missed:true,echo:Boolean(gap.echoChallenge),
      worldX:distance+player.x,speed});
    // Match regular obstacle invulnerability: the gap still counts as a
    // missed challenge, but cannot immediately charge a second shield hit.
    const absorbed=player.invulnerable>0;
    if(absorbed)flow.registerCollision();
    else{
      hp=Math.max(0,hp-GAME.damagePerHit);
      director.registerDamage({action:gap.echoChallenge?'echo-gap':'gap'});
      flow.registerDamage();speedTrails.disrupt();
    }
    runAudit.record('gap_miss',auditState(),{width:gap.end-gap.start,shieldCharged:!absorbed,
      echoChallenge:Boolean(gap.echoChallenge)});
    player.invulnerable=Math.max(player.invulnerable,1.15);shake=13;hitFlash=.42;
    burst(player.x,player.feet-12,'#ff5998',26,1.3);frameEcho(player.x,player.feet-18,c2,28);
    sound('hit');vib([30,45,30]);
    if(hp===0)endRun();
  }
  function clearGap(gap){
    if(!terrain.markGap(gap,false))return;
    terrainDirector.noteGapOutcome({missed:false,echo:Boolean(gap.echoChallenge),
      worldX:distance+player.x,speed});
    director.registerClear({action:gap.echoChallenge?'echo-gap':'gap'});
    const reward=flow.registerClear({precision:false});
    score+=reward.earnedPoints;
    awardCombo(gap.echoChallenge?'echo-gap':'gap');
    runAudit.record('gap_clear',auditState(),{width:gap.end-gap.start,
      echoChallenge:Boolean(gap.echoChallenge),variant:gap.echoVariant||''});
    if(runMode==='arcade')earnedMilestones(progression.reachedStreak(flow.streak).earned);
    burst(player.x,player.feet-7,c1===c2?5:9,c1,.58);
    frameEcho(player.x,player.feet-18,c2,20,.55);
    if(reward.tierUp&&reward.tier!==3)sound('flow');
    else if(!reward.tierUp)sound('score');
  }
  function update(dt){
    time+=dt;worldTime+=dt;
    const next=Math.floor(time/GAME.zoneSeconds)+1;
    if(next!==zone){
      // Reward the completed zone before switching; empty zones never count as perfect.
      const reward=flow.completeZone({hp,maxHP:GAME.startingHP});
      if(reward.perfect){
        hp=Math.min(GAME.startingHP,hp+reward.heal);
        score+=reward.bonusPoints;
        burst(player.x,player.feet-36,14,c2,.84);frameEcho(player.x,player.feet-25,c1,38,1.1);
        effects.cue('perfect',player.x,player.feet-24,c1,c2,{speed,reducedMotion});
        sound('perfect');
        runAudit.record('perfect_zone',auditState(),{completedZone:zone,healed:reward.heal});
        if(runMode==='arcade')earnedMilestones(progression.perfectZone().earned);
      }
      zone=next;
      runAudit.record('zone',auditState(),{newZone:zone});
      if(runMode==='arcade')earnedMilestones(progression.reachedZone(zone).earned);
      nextZone(reward);
    }
    speed=GAME.speedAt(time,zone);
    // First-crossing-only celebrations at spaced speed milestones.
    // They do not change speed, scoring, collision or Director pacing.
    if(nextSpeedMark<SPEED_MARKS.length&&speed>=GAME.baseSpeed*SPEED_MARKS[nextSpeedMark]){
      effects.cue('speed',player.x,player.feet-3,c1,c2,{speed,reducedMotion});
      nextSpeedMark++;
    }
    // Gameplay time and base acceleration remain unchanged. Dash only adds
    // a short, bounded extra world-distance step. Terrain, obstacles and gap
    // collision all consume this SAME displacement (no teleport/tunnelling).
    const worldStep=speed*dt+dash.tick(dt,speed);
    distance+=worldStep;
    const lastTerrainWorld=terrain.generated;
    // The generator must cover the farthest possible action-specific spawn,
    // including an offscreen Echo Spire with a full second of warning.
    const farthestSpawn=spawnXFor('echo');
    terrainDirector.prepare({right:distance+Math.max(W+800,farthestSpawn+speed*.48),
      playerWorld:distance+player.x,zone,speed,hp});
    for(const feature of terrain.segments){
      if(feature.start>=lastTerrainWorld&&('gap'===feature.type||'slope'===feature.type))
        runAudit.record('terrain',auditState(),{feature:feature.echoChallenge?'echo-gap':feature.type,
          variant:feature.echoVariant||'',width:feature.end-feature.start,
          start:feature.start,elevationChange:feature.y1-feature.y0,
          plannedPhase:feature.plannedPhase||'LEGACY'});
    }
    terrain.prune(distance+player.x,speed);
    const current=PALETTES[(zone-1)%PALETTES.length];
    c1=current.primary;c2=current.secondary;c3=current.shadow;
    // Presentation-only transition: no change to speed, terrain, Director
    // pacing, colliders, Flow, score, or seeded obstacle generation.
    if(spectralWave.tick(dt,{playerX:player.x,playerY:player.feet,height:H})){
      // One small lateral light accent when the spectral front crosses the runner.
      groundPulse(player.x,player.feet-2,c2,23,.88);
      frameEcho(player.x,player.feet-24,c1,24,.65);
      burst(player.x,player.feet-18,9,c1,.52);
      if(zoneSoundAtCrossing)sound('zone');
      zoneSoundAtCrossing=false;
    }
    flow.tick(dt,{phase:director.phase});
    combo.tick(dt);
    player.invulnerable=Math.max(0,player.invulnerable-dt);
    const bufferedEcho=jumpControl.tick(dt,distance+player.x);
    if(bufferedEcho==='echo'&&!player.landed&&!gapRecovery&&!gravityShift.shifting)launchEcho();
    motion.tick(dt);
    shake=Math.max(0,shake-dt*36);hitFlash=Math.max(0,hitFlash-dt);
    if(lastZoneCallout>0){lastZoneCallout-=dt;if(lastZoneCallout<=0)$.zoneCallout.classList.add('hidden')}
    if(milestoneTime>0){milestoneTime-=dt;if(milestoneTime<=0)$.milestoneToast.classList.add('hidden')}
    if(replayToastTime>0){replayToastTime-=dt;if(replayToastTime<=0)$.replayToast.classList.add('hidden')}
    if(echoHintTime>0)echoHintTime=Math.max(0,echoHintTime-dt);
    if(dashHintTime>0)dashHintTime=Math.max(0,dashHintTime-dt);
    $.echoHint.classList.toggle('hidden',echoHintTime<=0||lastZoneCallout>0||status!=='running');
    $.dashHint.classList.toggle('hidden',dashHintTime<=0||lastZoneCallout>0||status!=='running');
    const playerWorld=distance+player.x;
    // The upcoming runway must have no gaps or hazards around the runner.
    // Every threshold is measured in travel seconds, independent of FPS.
    const safeShift=player.landed&&!player.duck&&!gapRecovery &&
      terrain.visibleGaps(playerWorld-speed*.35,playerWorld+speed*1.55).length===0 &&
      hurdles.every(o=>o.hit||o.cleared||
        o.x+o.width<player.x-speed*.35||o.x>player.x+speed*1.55);
    const gravityEvent=gravityShift.tick(dt,{safe:safeShift,reducedMotion});
    if(gravityEvent==='begin'){
      player.invulnerable=Math.max(player.invulnerable,.58+.28);
      jumpControl.cancel();dash.cancel();speedTrails.reset();combo.breakChain();
      if(!reducedMotion){
        groundPulse(player.x,player.feet-2,c2,33,1.1);
        frameEcho(player.x,player.feet-23,c1,36,1);
      }
      sound('gravity-shift');
      runAudit.record('gravity_shift_begin',auditState(),{target:gravityShift.targetCeiling?'ceiling':'floor'});
    }else if(gravityEvent==='complete'){
      player.invulnerable=Math.max(player.invulnerable,.28);
      speedTrails.reset();director.noteGravityShift();
      runAudit.record('gravity_shift_complete',auditState(),{mode:gravityShift.ceiling?'ceiling':'floor'});
      if(reducedMotion)sound('gravity-shift');
    }
    const ground=terrain.groundAt(playerWorld);
    const currentGap=terrain.gapAt(playerWorld);
    player.wasAirborne=!player.landed;
    if(gapRecovery){
      // Brief spectral recovery after a fall: prevents repeated invisible
      // deaths while the same gap passes underneath the player.
      player.landed=false;player.vy=0;
      player.feet=Math.min(player.feet,terrain.baseY-45);
      if(ground!==null&&playerWorld>=gapRecovery.end+24){
        player.feet=ground;player.landed=true;gapRecovery=null;
        jumpControl.onLand({recovering:true});dash.onLand();motion.land(300);sound('land');
      }
    }else if(player.landed){
      if(ground===null){
        player.landed=false;player.vy=0;dash.onLeaveGround();
        if(currentGap)jumpControl.leaveLedge(currentGap.start);
      }else{
        // Running follows the true slope while preserving horizontal speed.
        player.feet=ground;
      }
    }else{
      const previousFeet=player.feet;
      player.vy+=GAME.gravity*dt;
      player.feet+=player.vy*dt;
      if(ground!==null&&player.vy>=0&&previousFeet<=ground+5&&player.feet>=ground){
        const impact=player.vy;
        player.feet=ground;player.vy=0;player.landed=true;
        dash.onLand();landingImpact(ground,impact);
        // A valid touchdown on the far side completes a gap even if the player
        // has buffered another immediate jump. Otherwise the next jump could
        // hide the grounded frame required by the original gap-clear logic.
        for(const gap of terrain.visibleGaps(playerWorld-Math.max(1100,speed*1.30),playerWorld)){
          if(!gap.resolved&&playerWorld>=gap.end)clearGap(gap);
        }
        // Fire immediately after a valid landing if the player pressed up to
        // 110 ms too early. A duck or gap recovery never queues a jump.
        if(jumpControl.onLand({ducking:player.duck}))launchJump();
      }
    }
    // Any unlanded descent below the level is a real gap miss, not a
    // landing from below the floor. The fall is charged once per gap.
    if(!gapRecovery){
      for(const gap of terrain.visibleGaps(playerWorld-Math.max(1100,speed*1.30),playerWorld+40)){
        if(gap.resolved||playerWorld<gap.start)continue;
        if(player.feet>terrain.baseY+window.ChromaConfig.TERRAIN.fallThreshold){
          failGap(gap);break;
        }
        if(playerWorld>=gap.end+26&&player.landed){clearGap(gap)}
      }
    }
    updateDuck(dt);
    // Tiny, performance-bounded particles make high Flow visibly different.
    if(flow.tier>=1&&visualRandom()<dt*(flow.tier===3?19:flow.tier===2?11:5)*quality.profile.particles){
      motes.push(makeMote(player.x-25,player.feet-20,visualRandom()<.5?c1:c2,
        {vx:fxRand(-160,-40),vy:fxRand(-55,25),life:fxRand(.2,.42),r:fxRand(.9,2.4)}));
    }
    if(!player.landed&&visualRandom()<.7*quality.profile.particles)motes.push(makeMote(player.x+fxRand(-14,14),player.feet-8,c1,{vx:fxRand(-170,-20),vy:fxRand(10,70),life:.32,r:fxRand(1,3)}));
    const phaseBefore=director.phase;
    terrainDirector.tick(dt,{zone,speed,hp,distance,spawnX:W+90,
      spawnXFor,playerX:player.x,
      zoneElapsed:time-(zone-1)*GAME.zoneSeconds,
      surface:gravityShift.ceiling?'ceiling':'floor',
      gravityPending:gravityShift.pending||gravityShift.shifting||
        gravityShift.protected},spawn);
    if(phaseBefore!==director.phase)runAudit.record('phase',auditState(),
      {from:phaseBefore,to:director.phase,movement:director.movement.insight});
    const p=GEO.playerBox(player);
    for(const o of hurdles){
      const priorX=o.x;
      o.x-=worldStep;
      const b=GEO.obstacleBox(o,o.groundY);
      // Swept X check prevents skipping a narrow obstacle on a slow phone.
      const sweptX=GEO.sweptXOverlap(p,priorX,o);
      const yOverlap=GEO.verticalOverlap(p,b);
      if(sweptX && !yOverlap && !o.hit){
        // A real narrow jump clearance or well-timed duck is a precision pass.
        if((o.type==='jump'||o.type==='echo') && p.y+p.h<=b.y){
          o.closestClearance=Math.min(o.closestClearance,b.y-(p.y+p.h));
        }else if(o.type==='duck' && player.duck && o.entryDuckTime===null){
          o.entryDuckTime=player.duckTime;
        }
      }
      if(sweptX&&yOverlap)onHit(o);
      if(!o.cleared&&o.x+o.width<p.x){
        o.cleared=true;
        if(!o.hit){
          const traverse=(o.width+66)/Math.max(300,speed);
          const graded=gradePrecision({action:o.type,
            closestClearance:o.closestClearance,entryDuckTime:o.entryDuckTime,
            traverseSeconds:traverse});
          const precision=graded.precision;
          director.registerClear({action:o.type});
          if(precision){
            director.registerNearMiss();
            effects.cue('precision',player.x,player.feet-24,c1,c2,{speed,reducedMotion});
          }
          const gained=flow.registerClear({precision});
          score+=gained.earnedPoints;
          awardCombo(o.type,{precision,master:graded.master});
          runAudit.record('obstacle_clear',auditState(),
            {obstacle:o.type,precision,master:graded.master,
              precisionMargin:graded.margin===null?-1:graded.margin});
          if(o.type==='echo'){
            // Compact clean-clear reward for a real double-jump barrier.
            // Doesn't mask the next obstacle or change the scoring contract.
            frameEcho(player.x,player.feet-22,c2,24,.7);
            burst(o.x+o.width*.5,o.groundY-o.height*.35,7,c2,.62);
            runAudit.record('echo_spire_clear',auditState(),{precision,phase:o.phase});
          }
          if(gained.tierUp)runAudit.record('flow_tier',auditState(),{tier:flow.tier});
          if(runMode==='arcade')earnedMilestones(progression.reachedStreak(flow.streak).earned);
          if(gained.tierUp){burst(player.x,floorY-25,9,c1,.62);if(gained.tier!==3)sound('flow')}
          else if(Math.random()<.25)sound('score');
        }
      }
    }
    hurdles=hurdles.filter(o=>o.x+o.width>-100);
    score+=dt*(45+speed*.095);
    peakFlow=Math.max(peakFlow,flow.value);
    const records=replay.watch({score,distance});
    if(records.length){replayUI.toast($,records.includes('score')?'score':'distance');replayToastTime=1.7;}
    for(const m of motes){m.x+=m.vx*dt;m.y+=m.vy*dt;m.vy+=150*dt;m.life-=dt}
    motes=motes.filter(m=>m.life>0).slice(-180);
    effects.tick(dt);
    // React to the latched Chroma tier (90% enter, below 87% exit)
    // after all clears, damage and Perfect Zone updates this tick.
    const chromaEvent=chromaVfx.setActive(flow.tier===3);
    if(chromaEvent==='enter'){
      if(!reducedMotion){
        groundPulse(player.x,player.feet-2,c2,35,1.22);
        frameEcho(player.x,player.feet-23,c1,39,1.2);
        burst(player.x-16,player.feet-17,16,c2,.8);
      }
      sound('chroma');
    }
    chromaVfx.tick(dt,{reducedMotion});
    // Actual time-sampled history of the pose, independent of gameplay RNG.
    // A trail is visual; sampled only after movement, clears and collisions.
    const trailPose=motion.sample({landed:player.landed,duck:player.duck,vy:player.vy});
    const hitbox=GEO.playerBox(player);
    speedTrails.tick(dt,{playerX:player.x,feet:player.feet,
      width:hitbox.w*trailPose.scaleX,height:hitbox.h*trailPose.scaleY,
      distance,speed:speed+dash.bonusSpeed,flow:flow.value,chromaActive:flow.tier===3,
      primary:spectralWave.colorAt(player.x,'primary',player.feet,H),
      secondary:spectralWave.colorAt(player.x,'secondary',player.feet,H),
      quality:quality.profile,reducedMotion});
    if(hp>0&&hp<=25&&Math.floor(worldTime*1.5)!==Math.floor((worldTime-dt)*1.5))sound('warning');
    audio.tick({phase:director.phase,speed,flow:flow.value,chromaActive:flow.tier===3,zone,hp});
    runAudit.tick(dt,auditState(),director.insight);
    syncSoundButton();
    updateHud();
  }

  function rect(x,y,w,h,color,alpha=1){ctx.fillStyle=alpha===1?color:rgba(color,alpha);ctx.fillRect(x,y,w,h)}
  function roundRectPath(x,y,w,h,r){
    const R=Math.min(r,w/2,h/2);
    ctx.beginPath();ctx.moveTo(x+R,y);ctx.arcTo(x+w,y,x+w,y+h,R);ctx.arcTo(x+w,y+h,x,y+h,R);
    ctx.arcTo(x,y+h,x,y,R);ctx.arcTo(x,y,x+w,y,R);ctx.closePath();
  }
  function glowLine(x1,y1,x2,y2,color,width=2,blur=12,alpha=1){
    ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;
    ctx.shadowColor=color;ctx.shadowBlur=blur*quality.profile.glow;
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore();
  }
  function drawWorld(t){
    // Chroma Tide 2.0 draws the ORIGINAL background ONCE, even while
    // the chromatic boundary is in flight. Distant scenery samples the
    // spatial palette, eliminating two full expensive clipped redraws.
    worldBackground.drawBackground({ctx,width:W,height:H,time:t,speed,
      primary:c1,secondary:c2,shadow:c3,flow:flow.value,
      glowLine,quality:quality.profile,tide:spectralWave.active?spectralWave:null});
  }
  function drawTerrain(){
    // One clipped terrain geometry pass, tinted in-place by the same front.
    // Ground gaps, sloped collider geometry and visual spacing are unchanged.
    terrainRender.drawTerrain({ctx,terrain,distance,width:W,height:H,baseY:floorY,
      primary:c1,secondary:c2,flow:flow.value,glowLine,quality:quality.profile,
      tide:spectralWave.active?spectralWave:null});
  }
  function drawObstacle(o){
    const b=GEO.obstacleBox(o,o.groundY),isLow=o.type==='jump',isEcho=o.type==='echo';
    const core=(isLow||isEcho)?b:GEO.duckGateCoreBox(o,o.groundY);
    const color=spectralWave.colorAt(o.x,(isLow||isEcho)?'secondary':'primary',core.y+core.h*.5,H);
    const cx=o.x+b.w/2,twinkle=.76+Math.sin(worldTime*6+o.pulse)*.14;
    ctx.save();
    if(isEcho||isLow){
      // Shared Low Neon Barrier architecture for both jump families.
      // Echo is a TALL two-chamber sibling; the actual body, inset face,
      // bevel, white cap, vertical cheeks and floor plinth are identical.
      // Every structural stroke fits the same physical obstacle footprint.
      const x=b.x,y=b.y,w=b.w,h=b.h,bevel=Math.min(8,w*.16);
      ctx.globalAlpha=twinkle;
      ctx.shadowColor=color;ctx.shadowBlur=19*quality.profile.glow;
      ctx.beginPath();
      ctx.moveTo(x+bevel,y+1);ctx.lineTo(x+w-bevel,y+1);
      ctx.lineTo(x+w-1,y+bevel);ctx.lineTo(x+w-1,y+h-3);
      ctx.lineTo(x+w-4,y+h-1);ctx.lineTo(x+4,y+h-1);
      ctx.lineTo(x+1,y+h-3);ctx.lineTo(x+1,y+bevel);
      ctx.closePath();
      ctx.fillStyle=rgba(color,.30);ctx.fill();
      ctx.lineWidth=2.6;ctx.strokeStyle=color;ctx.stroke();
      ctx.shadowBlur=0;ctx.globalAlpha=1;
      glowLine(x+bevel+1,y+5,x+w-bevel-1,y+5,'#ffffff',2.6,11,.90);
      glowLine(x+3,y+bevel+2,x+3,y+h-11,color,1.7,6,.72);
      glowLine(x+w-3,y+bevel+2,x+w-3,y+h-11,color,1.7,6,.72);
      ctx.fillStyle=rgba(color,isEcho ? .12 : .17);
      ctx.fillRect(x+6,y+bevel+8,w-12,h-bevel-22);
      if(isEcho){
        // The double-jump Spire belongs to the SAME obstacle family,
        // distinguished only by its height and two integrated energy
        // chambers. No floating instructional icons, arrows or labels.
        for(let k=0;k<2;k++){
          const yy=y+h*(.23+k*.40);
          ctx.fillStyle=rgba(k===0?'#ffffff':color,.25);
          ctx.fillRect(x+8,yy-2,w-16,18);
          glowLine(x+8,yy+17,x+w-8,yy+17,color,2.4,8,.88);
          glowLine(x+12,yy+2,x+w-12,yy+2,'#ffffff',1.3,4,.56);
        }
      }else{
        // Lower single-jump barrier keeps the quiet recessed face.
        ctx.strokeStyle=rgba('#ffffff',.27);ctx.lineWidth=1;
        ctx.beginPath();
        ctx.moveTo(x+10,y+bevel+12);ctx.lineTo(x+10,y+h-14);
        ctx.moveTo(x+w-10,y+bevel+12);ctx.lineTo(x+w-10,y+h-14);
        ctx.stroke();
      }
      ctx.fillStyle=rgba(color,.38);
      ctx.fillRect(x+2,y+h-12,w-4,10);
      glowLine(x+3,y+h-12,x+w-3,y+h-12,color,2.3,8,.91);
      glowLine(x+4,y+h-3,x+w-4,y+h-3,'#ffffff',1.5,6,.55);
    }else{
      // This is one continuous, visible overhead energy gate. Its sparse,
      // low-opacity field extends beyond the top of the camera so a second
      // jump cannot escape over the old short hanging beam.
      // The collider matches the entire field; no invisible ceiling wall.
      const by=b.y+b.h,top=Math.max(0,b.y);
      ctx.shadowBlur=0;ctx.globalAlpha=twinkle;
      ctx.fillStyle=rgba(color,.105);ctx.fillRect(b.x,b.y,b.w,b.h);
      ctx.strokeStyle=rgba(color,.68);ctx.lineWidth=1.9;
      ctx.beginPath();
      ctx.moveTo(b.x+1,b.y);ctx.lineTo(b.x+1,by);
      ctx.moveTo(b.x+b.w-1,b.y);ctx.lineTo(b.x+b.w-1,by);
      ctx.stroke();
      // Repeating narrow crossbars make the full damaging column clearly
      // readable without turning the sky into a solid saturated rectangle.
      ctx.lineWidth=1;ctx.strokeStyle=rgba(color,.36);
      for(let y=top+20;y<core.y-4;y+=43){
        ctx.beginPath();ctx.moveTo(b.x+7,y);ctx.lineTo(b.x+b.w-7,y);ctx.stroke();
      }
      ctx.shadowColor=color;ctx.shadowBlur=21*quality.profile.glow;
      roundRectPath(core.x,core.y,core.w,core.h,4);
      ctx.fillStyle=rgba(color,.30);ctx.fill();
      ctx.lineWidth=3;ctx.strokeStyle=color;ctx.stroke();
      ctx.shadowBlur=0;ctx.globalAlpha=1;
      ctx.fillStyle=rgba(color,.18);
      roundRectPath(core.x+6,core.y+8,core.w-12,core.h-15,2);ctx.fill();
      glowLine(b.x-7,by,b.x+b.w+7,by,color,5,14,1);
      for(let k=0;k<4;k++){
        const x=core.x+10+k*(core.w-20)/3;
        glowLine(x,core.y+12,x,by-12,color,1,0,.36);
      }
      glowLine(core.x,core.y,core.x+core.w,core.y,'#ffffff',1,8,.45);
    }
    ctx.restore();
  }
  function drawPlayer(){
    const b=GEO.playerBox(player),beat=1+Math.sin(worldTime*14)*.025;
    const pc1=spectralWave.colorAt(player.x,'primary',player.feet,H);
    const pc2=spectralWave.colorAt(player.x,'secondary',player.feet,H);
    ctx.save();
    if(player.invulnerable>0&&Math.floor(worldTime*16)%2===0)ctx.globalAlpha=.32;
    // Speed Trails 2.0 renders historical poses separately *behind* hazards.
    // The old per-frame fake copies of the current pose are retired.
    const shape=motion.sample({landed:player.landed,duck:player.duck,vy:player.vy});
    const rw=b.w*shape.scaleX*beat, rh=b.h*shape.scaleY*beat;
    const rx=player.x-rw/2,ry=player.feet-rh;
    const morph=shape.dash>.12, dashAmount=morph?shape.dash:0;
    if(dash.active&&!reducedMotion){
      // Side-view speed wake; brighter and longer than 2.1, but always
      // BEHIND the runner. Rendered at most 4 strokes, 2 on older phones.
      const density=quality.profile.density;
      const count=density<.5?2:density<.8?3:4;
      for(let i=0;i<count;i++){
        const y=ry+rh*(.18+i*.21);
        glowLine(rx-8-i*8,y,rx-102-i*26,y,i%2?pc2:pc1,
          (2.8-i*.35)*(.7+.3*dashAmount),13,Math.max(.22,.72-i*.12));
      }
      // A single crisp strike line tells the eye the runner surged forward.
      glowLine(rx+rw*.67,ry+rh*.50,rx+rw+12,ry+rh*.50,
        '#fff',2.1,11,.62*dashAmount);
    }
    chromaVfx.drawBehindPlayer(ctx,{x:player.x,y:player.feet,width:rw,height:rh,
      duck:player.duck,primary:pc1,secondary:pc2,speed,
      quality:quality.profile,reducedMotion});
    ctx.shadowColor=pc1;ctx.shadowBlur=(31+shape.glow*17)*Math.max(.45,quality.profile.glow);
    // Distinct change of SHAPE: pointed aerial glider or low ground-skid
    // polygon. Geometry collision remains GEO.playerBox(player), not this art.
    if(morph)window.ChromaMotion.dashBodyPath(ctx,rx,ry,rw,rh,player.duck?'ground':'air');
    else roundRectPath(rx,ry,rw,rh,8);
    ctx.fillStyle='#f3fcff';ctx.fill();
    ctx.shadowBlur=9*quality.profile.glow;ctx.lineWidth=morph?2.8:2;
    ctx.strokeStyle=pc1;ctx.stroke();
    const shading=ctx.createLinearGradient(rx,ry,rx+rw,ry+rh);
    shading.addColorStop(0,'rgba(255,255,255,.9)');shading.addColorStop(.6,'rgba(247,251,255,.08)');shading.addColorStop(1,rgba(pc1,.34));
    ctx.fillStyle=shading;
    if(morph)window.ChromaMotion.dashBodyPath(ctx,rx+4,ry+3,rw-8,rh-6,player.duck?'ground':'air');
    else roundRectPath(rx+5,ry+4,rw-10,rh-8,5);
    ctx.fill();
    if(morph){
      // Asymmetric energy spine, emphasizing that the square is a fast,
      // forward-facing wedge instead of a larger square.
      glowLine(rx+rw*.25,ry+rh*.32,rx+rw*.80,ry+rh*.50,'#fff',2.3,8,.84);
      glowLine(rx+rw*.31,ry+rh*.72,rx+rw*.79,ry+rh*.53,pc2,1.8,7,.74);
    }else glowLine(rx+6,ry+6,rx+rw*.6,ry+6,'#fff',2,6,.7);
    if(player.duck){
      const n=Math.max(1,Math.round(3*quality.profile.particles));
      for(let i=0;i<n;i++){
        const x=rx-(i*13+12),y=player.feet-4-i*4;
        glowLine(x,y,x-12-speed/110,y,pc2,1.1,5,.34-i*.065);
      }
    }
    // A tiny angular availability marker follows the player's actual body.
    // It is visually subdued and disappears as soon as Echo Jump is spent.
    if(!player.landed&&zone>=window.ChromaConfig.JUMP_FEEL.echoUnlockZone&&
      jumpControl.echoAvailable&&!gravityShift.shifting){
      ctx.save();
      ctx.globalAlpha=.68;ctx.shadowColor=pc2;ctx.shadowBlur=5*quality.profile.glow;
      ctx.strokeStyle=pc2;ctx.lineWidth=1.8;
      ctx.beginPath();
      const cx=rx+rw+7,cy=ry+rh*.5;
      ctx.moveTo(cx,cy-8);ctx.lineTo(cx+5,cy-8);ctx.lineTo(cx+5,cy);
      ctx.moveTo(cx+8,cy-3);ctx.lineTo(cx+13,cy-3);ctx.lineTo(cx+13,cy+5);
      ctx.stroke();ctx.restore();
    }
    ctx.restore();
    // Transformed mode keeps the same clear square silhouette.
    // Post-player neon brackets follow the ACTUAL deformed pose, including
    // jump stretch, landing squash and duck compression on either surface.
    chromaVfx.drawAfterPlayer(ctx,{x:player.x,y:player.feet,width:rw,height:rh,
      primary:pc1,secondary:pc2,quality:quality.profile,reducedMotion});
    const surface=terrain.groundAt(distance+player.x);
    if(surface!==null){
      // Side-view contact glow: thin horizontal strip instead of a floor oval.
      const height=clamp((surface-player.feet)*.16,0,80),w=clamp(44-height*.36,18,44);
      ctx.fillStyle=rgba(pc1,.14);ctx.fillRect(player.x-w/2,surface+3,w,2.5);
    }
  }
  function drawFx(dt){
    for(const m of motes){
      const a=clamp(m.life/Math.max(.2,m.max),0,1);
      ctx.globalAlpha=a*.9;ctx.fillStyle=m.color;
      ctx.shadowColor=m.color;ctx.shadowBlur=8*quality.profile.glow;
      ctx.beginPath();ctx.arc(m.x,m.y,m.r*a,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;ctx.shadowBlur=0;
    effects.draw(ctx,{glow:quality.profile.glow,density:quality.profile.density,reducedMotion});
    ctx.globalAlpha=1;ctx.shadowBlur=0;
    if(hitFlash>0){ctx.fillStyle=`rgba(255,25,80,${hitFlash*.23})`;ctx.fillRect(0,0,W,H)}
    if(hp<=25&&status==='running'){
      const a=.08+.07*Math.pow(Math.sin(worldTime*5),2);
      const g=ctx.createRadialGradient(W/2,H/2,W*.13,W/2,H/2,W*.68);
      g.addColorStop(0,'rgba(255,30,60,0)');g.addColorStop(1,`rgba(255,30,65,${a})`);
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    }
  }
  function draw(){
    const started=performance.now();
    const sx=canvas.width/W,sy=canvas.height/H;
    ctx.setTransform(sx,0,0,sy,0,0);
    ctx.save();
    if(shake>0&&status==='running')ctx.translate(fxRand(-shake,shake)*.4,fxRand(-shake,shake)*.35);
    drawWorld(worldTime);
    // Only the course flips: the original atmospheric background and DOM HUD
    // stay upright. All gameplay sprites, gaps and trails share one transform.
    ctx.save();gravityShift.applyCourseTransform(ctx,H);
    chromaVfx.drawEnvironment(ctx,{width:W,height:H,groundY:floorY,
      primary:c1,secondary:c2,quality:quality.profile,reducedMotion});
    const background=performance.now();
    drawTerrain();
    const terrainDone=performance.now();
    // Overlay stays beneath all hazards and the player for clear silhouettes.
    spectralWave.draw(ctx,{width:W,height:H,groundY:floorY,quality:quality.profile});
    // Trails stay under hazards so a high-speed afterimage never masks a jump or duck cue.
    speedTrails.draw(ctx,{quality:quality.profile,reducedMotion});
    for(const o of hurdles)drawObstacle(o);
    drawPlayer();
    const actorsDone=performance.now();
    drawFx();
    ctx.restore();
    // Upright warning, shift energy and persistent ceiling-mode orientation.
    gravityShift.drawOverlay(ctx,{width:W,height:H,primary:c1,secondary:c2,
      quality:quality.profile,reducedMotion});
    // Upright, minimal warning only while the real course feature is
    // offscreen; unaffected by gravity and visible in Performance graphics.
    const cue=FAIR.warning({hurdles,gaps:terrain.gaps,distance,
      playerX:player.x,viewportWidth:W,speed});
    FAIR.drawWarning(ctx,cue,{width:W,height:H,primary:c1,
      glow:quality.profile.glow,reducedMotion});
    ctx.restore();
    if(status!=='running'){
      ctx.fillStyle='rgba(4,7,18,.33)';ctx.fillRect(0,0,W,H);
    }
    const done=performance.now();
    return {background:background-started,terrain:terrainDone-background,
      actors:actorsDone-terrainDone,effects:done-actorsDone,total:done-started};
  }
  function frame(ts){
    const frameElapsed=previousFrameTimestamp===null?0:Math.max(0,ts-previousFrameTimestamp);
    previousFrameTimestamp=ts;
    const updateStart=performance.now();
    const timing=frameClock.advance(ts,status==='running',dt=>{
      if(status!=='running')return false;update(dt);return status==='running';
    });
    if(status==='ready')worldTime+=timing.elapsed*.38;
    const updateMs=performance.now()-updateStart;
    const measured=draw();measured.update=updateMs;
    if(status==='running')runAudit.noteFrame?.(frameElapsed,timing.dropped);
    if(status==='running'&&quality.observe(frameElapsed,measured)){
      resize();syncGraphics();
    }
    if(diagnosticsOn){
      frameDiagnosticsElapsed+=Math.min(.25,frameElapsed/1000);
      if(frameDiagnosticsElapsed>=.65){
        frameDiagnosticsElapsed=0;
        const m=quality.snapshot();
        $.perfOverlay.textContent='FPS '+m.fps+' | '+m.tier.toUpperCase()+' ('+m.mode+')\n'+
          'frame p90 '+m.frameP90Ms+'ms | render '+m.renderMs.total+'ms\n'+
          'bg '+m.renderMs.background+' | ground '+m.renderMs.terrain+' | objects '+m.renderMs.actors+' | FX '+m.renderMs.effects+'ms';
      }
    }
    requestAnimationFrame(frame);
  }
  // The unstarted title scene still uses the first palette consistently.
  spectralWave.start({from:PALETTES[0],to:PALETTES[0],reducedMotion:true});
  requestAnimationFrame(frame);
})();
