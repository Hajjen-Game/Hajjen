/* CHROMA RUSH — Speed Trails 2.0 on Chroma State 2.0
   Standalone, offline-capable HTML5 Canvas 2D game. No third-party assets or dependencies.
   All dimensions are logical world units, scaled to landscape viewport height.
*/
(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx || !window.ChromaDirector || !window.ChromaConfig || !window.ChromaGeometry || !window.ChromaHud || !window.ChromaFlow || !window.ChromaAudio || !window.ChromaProgress || !window.ChromaArcadeUI || !window.ChromaTerrain || !window.ChromaJump || !window.ChromaMotion || !window.ChromaWorldBackground || !window.ChromaTerrainRender || !window.ChromaRoundAudit || !window.ChromaUnifiedTerrainDirector || !window.ChromaQuality || !window.ChromaFrameClock || !window.ChromaEffects || !window.ChromaMobilePreferences || !window.ChromaReplay || !window.ChromaReplayUI || !window.ChromaSpectralWave || !window.ChromaStateVFX || !window.ChromaSpeedTrails) {
    document.getElementById('menu').innerHTML = '<h2>Canvas 2D is required.</h2>';
    return;
  }
  const el = id => document.getElementById(id);
  const director = new window.ChromaDirector.AdaptiveRushDirector();
  const flow = new window.ChromaFlow.FlowSystem();
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
  const terrain = new window.ChromaTerrain.TerrainSystem();
  const terrainDirector = new window.ChromaUnifiedTerrainDirector.UnifiedTerrainDirector({terrain,director});
  const jumpControl = new window.ChromaJump.JumpController();
  const motion = new window.ChromaMotion.PlayerMotion();
  const effects = new window.ChromaEffects.EffectLanguage();
  const terrainRender = window.ChromaTerrainRender;
  const worldBackground = window.ChromaWorldBackground;
  const spectralWave = new window.ChromaSpectralWave.SpectralWave();
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
  let peakFlow=0,replayToastTime=0,zoneSoundAtCrossing=false;
  // Absolute travelled distance: terrain and obstacles share this world axis.
  let distance=0,gapRecovery=null;
  let c1=PALETTES[0].primary, c2=PALETTES[0].secondary, c3=PALETTES[0].shadow;
  let player={x:300,feet:floorY,vy:0,landed:true,duck:false,duckTime:0,duckRecovery:0,wasAirborne:false,invulnerable:0,stretch:0};
  const input={duckKeys:new Set(),duckPointer:null,jumpPointer:null};
  // Each new press triggers a fixed duck pulse. Holding never extends or repeats it.
  const DUCK_DURATION=GAME.duckDuration;
  const DUCK_RECOVERY=GAME.duckRecovery;
  function auditState(){return {time:worldTime,zone,hp,score,flow:flow.value,speed,distance,
    phase:director.phase,streak:flow.streak,chromaActive:flow.tier===3};}
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
    const palette=PALETTES[(zone-1)%PALETTES.length];
    c1=palette.primary;c2=palette.secondary;c3=palette.shadow;
    spectralWave.start({from:palette,to:palette,width:W,reducedMotion:true});
    chromaVfx.reset();speedTrails.reset();
    zoneSoundAtCrossing=false;
    hurdles=[];motes=[];streaks=[];effects.reset();director.reset();terrainDirector.reset();flow.reset();flow.currentZone=zone;
    distance=0;gapRecovery=null;terrain.reset(floorY);jumpControl.reset();motion.reset();
    peakFlow=0;replayToastTime=0;
    replay.start({practice:runMode==='practice',bestScore:progression.bestScore,bestZone:progression.bestZone});
    // Practice retains the chosen zone/difficulty but starts on a fresh,
    // safe runway, rather than loading a nonexistent alternate level.
    terrainDirector.prepare({right:W+1000,playerWorld:player.x,zone,speed,hp});
    runAudit.reset({mode:runMode,startingZone:startZone});
    runAudit.record('start',auditState(),{startingZone:startZone});
    $.exportRun.textContent='EXPORT RUN LOG';
    milestoneTime=0;unlockedThisRun=[];
    player={x:W*.265,feet:floorY,vy:0,landed:true,duck:false,duckTime:0,duckRecovery:0,wasAirborne:false,invulnerable:0,stretch:0};
    input.duckKeys.clear();input.duckPointer=null;input.jumpPointer=null;$.jump.classList.remove('is-down');$.duck.classList.remove('is-down');
    $.graphicsButton.classList.add('hidden');$.graphicsPanel.classList.add('hidden');$.graphicsButton.setAttribute('aria-expanded','false');
    $.menu.classList.add('hidden');$.milestonePanel.classList.add('hidden');$.gameover.classList.add('hidden');$.pauseMenu.classList.add('hidden');
    $.hud.classList.remove('hidden');$.controls.classList.remove('hidden');$.pauseBtn.classList.remove('hidden');$.pauseBtn.textContent='Ⅱ';
    $.critical.classList.remove('active');$.zoneCallout.classList.add('hidden');$.zonePerfect.classList.add('hidden');$.milestoneToast.classList.add('hidden');
    $.replayToast.classList.add('hidden');
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
    status='ready';runMode='arcade';milestoneTime=0;replayToastTime=0;
    spectralWave.reset();chromaVfx.reset();speedTrails.reset();zoneSoundAtCrossing=false;
    $.replayToast.classList.add('hidden');
    $.milestoneToast.classList.add('hidden');$.milestonePanel.classList.add('hidden');$.pauseMenu.classList.add('hidden');$.gameover.classList.add('hidden');
    $.controls.classList.add('hidden');$.hud.classList.add('hidden');$.pauseBtn.classList.add('hidden');
    $.critical.classList.remove('active');$.zoneCallout.classList.add('hidden');$.zonePerfect.classList.add('hidden');
    $.menu.classList.remove('hidden');$.graphicsButton.classList.remove('hidden');$.graphicsPanel.classList.add('hidden');$.graphicsButton.setAttribute('aria-expanded','false');syncSoundButton(true);arcadeUI.menu($,progression);replayUI.menu($,replay);
  }
  function pause(){if(status!=='running')return;status='paused';$.graphicsButton.classList.remove('hidden');$.pauseMenu.classList.remove('hidden');$.controls.classList.add('hidden');$.pauseBtn.textContent='▶';input.duckKeys.clear();input.duckPointer=null;input.jumpPointer=null;$.jump.classList.remove('is-down');player.duck=false;player.duckTime=0;player.duckRecovery=0;motion.duckCancel();$.duck.classList.remove('is-down');audio.pause();syncSoundButton(true);}
  function resume(){if(status!=='paused')return;status='running';$.graphicsButton.classList.add('hidden');$.graphicsPanel.classList.add('hidden');$.pauseMenu.classList.add('hidden');$.controls.classList.remove('hidden');$.pauseBtn.textContent='Ⅱ';lastTs=performance.now();frameClock.reset(lastTs);audio.resume();syncSoundButton(true);}
  function endRun(){
    if(status!=='running')return;
    status='dead';speedTrails.reset();$.graphicsButton.classList.remove('hidden');audio.stop();syncSoundButton(true);sound('gameover');$.controls.classList.add('hidden');$.pauseBtn.classList.add('hidden');$.critical.classList.remove('active');
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
    player.vy=GAME.jumpVelocity;player.landed=false;motion.jump();
    groundPulse(player.x,player.feet-3,c1,18,.85);
    for(let i=0;i<Math.max(4,Math.round(12*quality.profile.particles));i++){
      motes.push(makeMote(player.x+fxRand(-15,15),player.feet-2,c2,
        {vx:fxRand(-155,60),vy:fxRand(-110,-25),life:fxRand(.16,.40),r:fxRand(1.0,2.8)}));
    }
    if(motes.length>180)motes.splice(0,motes.length-180);
    sound('jump');
  }
  function jump(){
    if(status!=='running')return;
    const action=jumpControl.request({grounded:player.landed,ducking:player.duck,
      recovering:Boolean(gapRecovery),worldX:distance+player.x});
    if(action==='jump'||action==='coyote')launchJump();
  }
  function landingImpact(ground,velocity){
    const strength=motion.land(velocity);
    // Short-lived dust streams sideways along the actual terrain surface.
    const n=Math.max(4,Math.round((8+strength*9)*quality.profile.particles));
    for(let i=0;i<n;i++){
      const side=i%2===0?1:-1;
      motes.push(makeMote(player.x+side*fxRand(3,12),ground-3,side===1?c1:c2,
        {vx:side*fxRand(70,205)*(0.6+strength*.5),vy:fxRand(-62,-9),
         life:fxRand(.18,.40),r:fxRand(1.0,2.9)}));
    }
    if(motes.length>180)motes.splice(0,motes.length-180);
    groundPulse(player.x,ground-2,c2,15+strength*10,1+strength*.3);
    // Max 2 logical px before the draw() camera damping factor.
    if(velocity>650)shake=Math.max(shake,2.0);
    sound('land');
  }
  function startDuck(){
    if(status!=='running'||!player.landed||player.duck||player.duckRecovery>0)return;
    player.duck=true;
    player.duckTime=DUCK_DURATION;
    motion.duckStart();
    groundPulse(player.x,player.feet-2,c2,18,.82);
    $.duck.classList.add('is-down');
    sound('duck');
    // A short, horizontal ground streak: low-cost and readable on weak phones.
    for(let i=0;i<Math.max(2,Math.round(5*quality.profile.particles));i++)
      motes.push(makeMote(player.x-18-fxRand(0,12),player.feet-fxRand(2,7),c2,
        {vx:fxRand(-205,-80),vy:fxRand(-12,5),life:fxRand(.12,.28),r:fxRand(.9,1.7)}));
  }
  function updateDuck(dt){
    if(player.duck){
      player.duckTime=Math.max(0,player.duckTime-dt);
      if(player.duckTime===0){
        player.duck=false;
        player.duckRecovery=DUCK_RECOVERY;
        motion.duckRelease();
        groundPulse(player.x,player.feet-2,c1,12,.52);
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
    $.duck.addEventListener('pointerdown',e=>{e.preventDefault();
      if(input.duckPointer!==null)return;
      const freshPress=input.duckKeys.size===0;
      input.duckPointer=e.pointerId;
      try{$.duck.setPointerCapture(e.pointerId)}catch(_){}
      if(freshPress)startDuck();
    });
    const duckRelease=e=>{if(input.duckPointer===e.pointerId)input.duckPointer=null;};
    $.duck.addEventListener('pointerup',duckRelease);$.duck.addEventListener('pointercancel',duckRelease);
    $.duck.addEventListener('lostpointercapture',duckRelease);
    window.addEventListener('keydown',e=>{
      const k=e.code;
      if(['Space','ArrowUp','KeyW','ArrowDown','KeyS','Escape','KeyP'].includes(k))e.preventDefault();
      if((k==='Space'||k==='ArrowUp'||k==='KeyW')&&!e.repeat){if(status==='ready'||status==='dead')startRun('arcade');else jump();}
      if((k==='ArrowDown'||k==='KeyS')&&!e.repeat&&!input.duckKeys.has(k)){
        const freshPress=input.duckKeys.size===0&&input.duckPointer===null;
        input.duckKeys.add(k);if(freshPress)startDuck();
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

  // Timings are in seconds. Spatial distances increase with speed, keeping
  // obstacle-recovery time physically feasible rather than randomly compressing in pixels.
  function spawn(data){
    const width=data.type==='jump'?rand(43,58):rand(54,71);
    const height=data.type==='jump'?rand(53,66):rand(115,158);
    const x=W+90,worldX=distance+x;
    if(!terrain.canSpawnObstacle(worldX,width,speed))return false;
    const groundY=terrain.groundAt(worldX+width*.5);
    if(groundY===null)return false;
    hurdles.push({type:data.type,x,worldX,groundY,width,height,hit:false,cleared:false,
      closestClearance:Infinity,entryDuckTime:null,phase:data.phase,pulse:Math.random()*Math.PI*2});
    runAudit.record('spawn',auditState(),{obstacle:data.type,pattern:data.pattern||'',worldX});
    return true;
  }
  function updateHud(){
    HUD.update($,{hp,zone,color:c1,phase:director.label,score,speed,
      baseSpeed:GAME.baseSpeed,status,flow});
    replayUI.hud($,{practice:runMode==='practice',score,previousScore:replay.previousScore});
  }
  function nextZone(reward=null){
    const incoming=PALETTES[(zone-1)%PALETTES.length];
    const outgoing=PALETTES[(zone-2+PALETTES.length)%PALETTES.length];
    const animated=spectralWave.start({from:outgoing,to:incoming,width:W,duration:.92,reducedMotion});
    // The panel peaks as the wave reaches the player's horizontal position.
    lastZoneCallout=1.6;
    HUD.showZoneCallout($,{zone,name:incoming.name,
      color:incoming.primary,perfectReward:reward?.perfect?reward:null});
    zoneSoundAtCrossing=animated&&!reward?.perfect;
    if(!animated&&!reward?.perfect)sound('zone');
  }
  function onHit(o){
    if(o.hit)return;
    o.hit=true;
    if(player.invulnerable>0){
      flow.registerCollision();runAudit.record('invulnerable_contact',auditState(),{obstacle:o.type});return;
    }
    hp=Math.max(0,hp-GAME.damagePerHit);
    runAudit.record('obstacle_hit',auditState(),{obstacle:o.type});player.invulnerable=.96;shake=12;hitFlash=.38;
    director.registerDamage();flow.registerDamage();speedTrails.disrupt();burst(player.x,player.feet-30,'#ff506d',30,1.4);frameEcho(player.x,player.feet-26,'#ff596e',29,1.1);
    vib([25,40,30]);sound('hit');if(hp===0)endRun();
  }
  function failGap(gap){
    if(!terrain.markGap(gap,true))return;
    gapRecovery=gap;jumpControl.cancel();motion.reset();
    terrainDirector.noteGapOutcome({missed:true,worldX:distance+player.x,speed});
    // Match regular obstacle invulnerability: the gap still counts as a
    // missed challenge, but cannot immediately charge a second shield hit.
    const absorbed=player.invulnerable>0;
    if(absorbed)flow.registerCollision();
    else{
      hp=Math.max(0,hp-GAME.damagePerHit);
      director.registerDamage();flow.registerDamage();speedTrails.disrupt();
    }
    runAudit.record('gap_miss',auditState(),{width:gap.end-gap.start,shieldCharged:!absorbed});
    player.invulnerable=Math.max(player.invulnerable,1.15);shake=13;hitFlash=.42;
    burst(player.x,player.feet-12,'#ff5998',26,1.3);frameEcho(player.x,player.feet-18,c2,28);
    sound('hit');vib([30,45,30]);
    if(hp===0)endRun();
  }
  function clearGap(gap){
    if(!terrain.markGap(gap,false))return;
    terrainDirector.noteGapOutcome({missed:false,worldX:distance+player.x,speed});
    director.registerClear();
    const reward=flow.registerClear({precision:false});
    score+=reward.earnedPoints;
    runAudit.record('gap_clear',auditState(),{width:gap.end-gap.start});
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
        burst(player.x,player.feet-36,21,c2,1.05);frameEcho(player.x,player.feet-25,c1,38,1.22);
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
    distance+=speed*dt;
    const lastTerrainWorld=terrain.generated;
    terrainDirector.prepare({right:distance+W+800,playerWorld:distance+player.x,zone,speed,hp});
    for(const feature of terrain.segments){
      if(feature.start>=lastTerrainWorld&&('gap'===feature.type||'slope'===feature.type))
        runAudit.record('terrain',auditState(),{feature:feature.type,width:feature.end-feature.start,
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
    player.invulnerable=Math.max(0,player.invulnerable-dt);
    jumpControl.tick(dt,distance+player.x);motion.tick(dt);
    shake=Math.max(0,shake-dt*36);hitFlash=Math.max(0,hitFlash-dt);
    if(lastZoneCallout>0){lastZoneCallout-=dt;if(lastZoneCallout<=0)$.zoneCallout.classList.add('hidden')}
    if(milestoneTime>0){milestoneTime-=dt;if(milestoneTime<=0)$.milestoneToast.classList.add('hidden')}
    if(replayToastTime>0){replayToastTime-=dt;if(replayToastTime<=0)$.replayToast.classList.add('hidden')}
    const playerWorld=distance+player.x;
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
        jumpControl.onLand({recovering:true});motion.land(300);sound('land');
      }
    }else if(player.landed){
      if(ground===null){
        player.landed=false;player.vy=0;
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
        landingImpact(ground,impact);
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
    terrainDirector.tick(dt,{zone,speed,hp,distance,spawnX:W+90},spawn);
    if(phaseBefore!==director.phase)runAudit.record('phase',auditState(),{from:phaseBefore,to:director.phase});
    const p=GEO.playerBox(player);
    for(const o of hurdles){
      const priorX=o.x;
      o.x-=speed*dt;
      const b=GEO.obstacleBox(o,o.groundY);
      // Swept X check prevents skipping a narrow obstacle on a slow phone.
      const sweptX=GEO.sweptXOverlap(p,priorX,o);
      const yOverlap=GEO.verticalOverlap(p,b);
      if(sweptX && !yOverlap && !o.hit){
        // A real narrow jump clearance or well-timed duck is a precision pass.
        if(o.type==='jump' && p.y+p.h<=b.y){
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
          const precision=o.type==='jump'
            ?o.closestClearance>=0&&o.closestClearance<=18
            :o.entryDuckTime!==null&&o.entryDuckTime>=traverse+.02&&o.entryDuckTime<=traverse+.16;
          director.registerClear();
          if(precision)director.registerNearMiss();
          const gained=flow.registerClear({precision});
          score+=gained.earnedPoints;
          runAudit.record('obstacle_clear',auditState(),{obstacle:o.type,precision});
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
      distance,speed,flow:flow.value,chromaActive:flow.tier===3,
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
    const paint=p=>worldBackground.drawBackground({ctx,width:W,height:H,time:t,speed,
      primary:p.primary,secondary:p.secondary,shadow:p.shadow,flow:flow.value,
      glowLine,quality:quality.profile});
    if(spectralWave.active)spectralWave.drawLayer(ctx,W,H,
      ()=>paint(spectralWave.from),()=>paint(spectralWave.to));
    else paint(PALETTES[(zone-1)%PALETTES.length]);
  }
  function drawTerrain(){
    const paint=p=>terrainRender.drawTerrain({ctx,terrain,distance,width:W,height:H,baseY:floorY,
      primary:p.primary,secondary:p.secondary,flow:flow.value,glowLine,quality:quality.profile});
    if(spectralWave.active)spectralWave.drawLayer(ctx,W,H,
      ()=>paint(spectralWave.from),()=>paint(spectralWave.to));
    else paint(PALETTES[(zone-1)%PALETTES.length]);
  }
  function drawObstacle(o){
    const b=GEO.obstacleBox(o,o.groundY), isLow=o.type==='jump';
    const color=spectralWave.colorAt(o.x,isLow?'secondary':'primary',b.y+b.h*.5,H);
    const cx=o.x+b.w/2,twinkle=.76+Math.sin(worldTime*6+o.pulse)*.14;
    ctx.save();
    ctx.shadowColor=color;ctx.shadowBlur=23*quality.profile.glow;ctx.globalAlpha=twinkle;
    roundRectPath(b.x,b.y,b.w,b.h,isLow?6:4);ctx.fillStyle=rgba(color,.3);ctx.fill();
    ctx.lineWidth=3;ctx.strokeStyle=color;ctx.stroke();
    ctx.shadowBlur=0;ctx.globalAlpha=1;
    if(isLow){
      ctx.fillStyle=rgba(color,.14);roundRectPath(b.x+7,b.y+7,b.w-14,b.h-14,3);ctx.fill();
      glowLine(b.x+9,b.y+12,b.x+b.w-9,b.y+12,'#ffffff',1,4,.5);
      for(let k=0;k<3;k++){
        const yp=b.y+16+k*15;glowLine(b.x+9,yp,b.x+b.w-9,yp,color,1,0,.5);
      }
    }else{
      ctx.fillStyle=rgba(color,.18);roundRectPath(b.x+6,b.y+8,b.w-12,b.h-15,2);ctx.fill();
      const by=b.y+b.h;
      glowLine(b.x-7,by,b.x+b.w+7,by,color,5,14,1);
      for(let k=0;k<4;k++){
        const x=b.x+10+k*(b.w-20)/3;glowLine(x,b.y+12,x,by-12,color,1,0,.36);
      }
      glowLine(b.x,b.y,b.x+b.w,b.y,'#ffffff',1,8,.45);
    }
    if(time<24){
      ctx.globalAlpha=clamp((24-time)/5,0,1)*.86;
      ctx.font='800 14px system-ui';ctx.textAlign='center';ctx.letterSpacing='3px';ctx.fillStyle=color;
      ctx.shadowBlur=8*quality.profile.glow;ctx.shadowColor=color;
      ctx.fillText(isLow?'↑ JUMP':'↓ DUCK',cx,isLow?b.y-25:b.y-20);
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
    chromaVfx.drawBehindPlayer(ctx,{x:player.x,y:player.feet,width:rw,height:rh,
      duck:player.duck,primary:pc1,secondary:pc2,speed,
      quality:quality.profile,reducedMotion});
    ctx.shadowColor=pc1;ctx.shadowBlur=(31+shape.glow*17)*Math.max(.45,quality.profile.glow);
    roundRectPath(rx,ry,rw,rh,player.duck?8:8);ctx.fillStyle='#f3fcff';ctx.fill();
    ctx.shadowBlur=9*quality.profile.glow;ctx.lineWidth=2;ctx.strokeStyle=pc1;ctx.stroke();
    const shading=ctx.createLinearGradient(rx,ry,rx+rw,ry+rh);
    shading.addColorStop(0,'rgba(255,255,255,.9)');shading.addColorStop(.6,'rgba(247,251,255,.08)');shading.addColorStop(1,rgba(pc1,.34));
    ctx.fillStyle=shading;roundRectPath(rx+5,ry+4,rw-10,rh-8,5);ctx.fill();
    glowLine(rx+6,ry+6,rx+rw*.6,ry+6,'#fff',2,6,.7);
    if(player.duck){
      const n=Math.max(1,Math.round(3*quality.profile.particles));
      for(let i=0;i<n;i++){
        const x=rx-(i*13+12),y=player.feet-4-i*4;
        glowLine(x,y,x-12-speed/110,y,pc2,1.1,5,.34-i*.065);
      }
    }
    ctx.restore();
    // Transformed mode keeps the same clear square silhouette.
    chromaVfx.drawAfterPlayer(ctx,{x:player.x,y:player.feet,width:b.w,height:b.h,
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
    effects.draw(ctx,{glow:quality.profile.glow,density:quality.profile.density});
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
