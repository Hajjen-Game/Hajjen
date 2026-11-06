/* CHROMA RUSH — Full Background Continuity 1.0
   Standalone, offline-capable HTML5 Canvas 2D game. No third-party assets or dependencies.
   All dimensions are logical world units, scaled to landscape viewport height.
*/
(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx || !window.ChromaDirector || !window.ChromaConfig || !window.ChromaGeometry || !window.ChromaHud || !window.ChromaFlow || !window.ChromaAudio || !window.ChromaProgress || !window.ChromaArcadeUI || !window.ChromaTerrain || !window.ChromaJump || !window.ChromaMotion || !window.ChromaTerrainRender || !window.ChromaWorldBackground) {
    document.getElementById('menu').innerHTML = '<h2>Canvas 2D is required.</h2>';
    return;
  }
  const el = id => document.getElementById(id);
  const director = new window.ChromaDirector.AdaptiveRushDirector();
  const flow = new window.ChromaFlow.FlowSystem();
  function preferredAudio(){try{return localStorage.getItem('chromaRushSoundOff')!=='true'}catch(_){return true}}
  const audio = new window.ChromaAudio.ReactiveAudioSystem({scope:window,enabled:preferredAudio()});
  let profileStorage=null;try{profileStorage=localStorage}catch(_){}
  const progression = new window.ChromaProgress.ArcadeProgression(profileStorage);
  const arcadeUI = window.ChromaArcadeUI;
  const GAME = window.ChromaConfig.GAME;
  const GEO = window.ChromaGeometry;
  const terrain = new window.ChromaTerrain.TerrainSystem();
  const jumpControl = new window.ChromaJump.JumpController();
  const motion = new window.ChromaMotion.PlayerMotion();
  const terrainRender = window.ChromaTerrainRender;
  const worldBackground = window.ChromaWorldBackground;
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
    milestoneProgress:el('milestone-progress'),milestoneNext:el('milestone-next'),
    practiceSelect:el('practice-zone'),practiceButton:el('practice-start-btn'),practiceHint:el('practice-hint'),
    modeIndicator:el('mode-indicator'),milestoneToast:el('milestone-toast'),milestoneToastName:el('milestone-toast-name'),
    milestonePanel:el('milestone-panel'),milestoneGrid:el('milestone-grid'),
    finalMode:el('final-mode'),finalStreak:el('final-streak'),finalRecord:el('final-record'),finalMilestones:el('final-milestones')
  };
  const PALETTES = window.ChromaConfig.PALETTES;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const mix=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
  const hexRgb=s=>[parseInt(s.slice(1,3),16),parseInt(s.slice(3,5),16),parseInt(s.slice(5,7),16)];
  const rgbHex=(a,b,t)=>{ const A=hexRgb(a),B=hexRgb(b); return '#'+A.map((v,i)=>Math.round(mix(v,B[i],t)).toString(16).padStart(2,'0')).join('');};
  const rgba=(hex,alpha)=>{const c=hexRgb(hex);return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`};
  const rand=(a,b)=>a+Math.random()*(b-a);
  const vib=ms=>{try{if(navigator.vibrate)navigator.vibrate(ms)}catch(_){}};
  const store = {
    get(){try{return Number(localStorage.getItem('chromaRushBestFlow1'))||0}catch(_){return 0}},
    put(v){try{localStorage.setItem('chromaRushBestFlow1',String(v))}catch(_){}}
  };
  let W=1280,H=720,scale=1,floorY=H*GAME.floorRatio,dpr=1;
  let status='ready', time=0, worldTime=0, zone=1, lastTs=0, shake=0, hitFlash=0, lastZoneCallout=0;
  let speed=GAME.baseSpeed, hp=GAME.startingHP, score=0, best=progression.bestScore, hurdles=[], motes=[], rings=[], streaks=[];
  let runMode='arcade', startZone=1, milestoneTime=0, unlockedThisRun=[];
  // Absolute travelled distance: terrain and obstacles share this world axis.
  let distance=0,gapRecovery=null;
  let c1=PALETTES[0].primary, c2=PALETTES[0].secondary, c3=PALETTES[0].shadow;
  let player={x:300,feet:floorY,vy:0,landed:true,duck:false,duckTime:0,duckRecovery:0,wasAirborne:false,invulnerable:0,stretch:0};
  const input={duckKeys:new Set(),duckPointer:null};
  // Each new press triggers a fixed duck pulse. Holding never extends or repeats it.
  const DUCK_DURATION=GAME.duckDuration;
  const DUCK_RECOVERY=GAME.duckRecovery;
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
    const label=blocked?'Tap to unlock audio':unsupported?'Audio unavailable':audio.enabled?'Mute sound':'Enable sound';
    $.sound.title=label;
    $.sound.setAttribute('aria-pressed',String(audio.enabled));
    $.sound.setAttribute('aria-label',label);
    $.audioHint.textContent=unsupported?'AUDIO NOT SUPPORTED':'TAP ♫ FOR MUSIC';
    $.audioHint.classList.toggle('hidden',status!=='running'||(!blocked&&!unsupported));
  }
  syncSoundButton(true);
  function resize(){
    const cw=Math.max(1,canvas.clientWidth),ch=Math.max(1,canvas.clientHeight);
    dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.max(1,Math.floor(cw*dpr));canvas.height=Math.max(1,Math.floor(ch*dpr));
    W=720*cw/ch; H=720;scale=ch/H; floorY=H*GAME.floorRatio;
    player.x=W*.265;
    if(status==='ready'){
      terrain.reset(floorY);
      player.feet=floorY;
    }
  }
  window.addEventListener('resize',resize,{passive:true});resize();
  const makeMote=(x,y,color,options={})=>({x,y,vx:options.vx??rand(-130,90),vy:options.vy??rand(-120,45),
    life:options.life??rand(.2,.58),max:options.life??.58,r:options.r??rand(1.2,3.5),color});
  function burst(x,y,count,color,intensity=1){
    for(let i=0;i<count;i++){
      const a=rand(0,Math.PI*2),v=rand(45,220)*intensity;
      motes.push(makeMote(x,y,color,{vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rand(.2,.65),r:rand(1.1,3.1)}));
    }
    if(motes.length>180)motes.splice(0,motes.length-180);
  }
  function ripple(x,y,color,r=20){rings.push({x,y,r,life:.52,max:.52,color});}
  function startRun(requestedMode='arcade',requestedZone=1){
    // A practice run can only begin in a zone already reached in real arcade play.
    const selected=Number(requestedZone);
    runMode=requestedMode==='practice'&&progression.canPracticeZone(selected)?'practice':'arcade';
    startZone=runMode==='practice'?selected:1;
    time=(startZone-1)*GAME.zoneSeconds;worldTime=0;zone=startZone;
    hp=GAME.startingHP;speed=GAME.speedAt(time,zone);score=0;shake=0;hitFlash=0;
    const palette=PALETTES[(zone-1)%PALETTES.length];
    c1=palette.primary;c2=palette.secondary;c3=palette.shadow;
    hurdles=[];motes=[];rings=[];streaks=[];director.reset();flow.reset();flow.currentZone=zone;
    distance=0;gapRecovery=null;terrain.reset(floorY);jumpControl.reset();motion.reset();
    // Practice retains the chosen zone/difficulty but starts on a fresh,
    // safe runway, rather than loading a nonexistent alternate level.
    terrain.ensure(W+1000,zone,speed);
    milestoneTime=0;unlockedThisRun=[];
    player={x:W*.265,feet:floorY,vy:0,landed:true,duck:false,duckTime:0,duckRecovery:0,wasAirborne:false,invulnerable:0,stretch:0};
    input.duckKeys.clear();input.duckPointer=null;$.jump.classList.remove('is-down');$.duck.classList.remove('is-down');
    $.menu.classList.add('hidden');$.milestonePanel.classList.add('hidden');$.gameover.classList.add('hidden');$.pauseMenu.classList.add('hidden');
    $.hud.classList.remove('hidden');$.controls.classList.remove('hidden');$.pauseBtn.classList.remove('hidden');$.pauseBtn.textContent='Ⅱ';
    $.critical.classList.remove('active');$.zoneCallout.classList.add('hidden');$.zonePerfect.classList.add('hidden');$.milestoneToast.classList.add('hidden');
    arcadeUI.hud($,runMode==='practice');
    status='running';lastTs=performance.now();updateHud();audio.start();syncSoundButton(true);sound('start');
  }
  function earnedMilestones(awards){
    if(runMode!=='arcade'||!awards?.length)return;
    for(const award of awards)if(!unlockedThisRun.some(m=>m.id===award.id))unlockedThisRun.push(award);
    $.milestoneToastName.textContent=awards.map(m=>m.name).join(' · ');
    $.milestoneToast.classList.remove('hidden');milestoneTime=1.7;
  }
  function showMenu(){
    if(status==='running'||status==='paused')audio.stop();
    status='ready';runMode='arcade';milestoneTime=0;
    $.milestoneToast.classList.add('hidden');$.milestonePanel.classList.add('hidden');$.pauseMenu.classList.add('hidden');$.gameover.classList.add('hidden');
    $.controls.classList.add('hidden');$.hud.classList.add('hidden');$.pauseBtn.classList.add('hidden');
    $.critical.classList.remove('active');$.zoneCallout.classList.add('hidden');$.zonePerfect.classList.add('hidden');
    $.menu.classList.remove('hidden');syncSoundButton(true);arcadeUI.menu($,progression);
  }
  function pause(){if(status!=='running')return;status='paused';$.pauseMenu.classList.remove('hidden');$.controls.classList.add('hidden');$.pauseBtn.textContent='▶';input.duckKeys.clear();input.duckPointer=null;player.duck=false;player.duckTime=0;player.duckRecovery=0;$.duck.classList.remove('is-down');audio.pause();syncSoundButton(true);}
  function resume(){if(status!=='paused')return;status='running';$.pauseMenu.classList.add('hidden');$.controls.classList.remove('hidden');$.pauseBtn.textContent='Ⅱ';lastTs=performance.now();audio.resume();syncSoundButton(true);}
  function endRun(){
    if(status!=='running')return;
    status='dead';audio.stop();syncSoundButton(true);sound('gameover');$.controls.classList.add('hidden');$.pauseBtn.classList.add('hidden');$.critical.classList.remove('active');
    const total=Math.floor(score),previousBest=progression.bestScore;
    if(runMode==='arcade'){
      earnedMilestones(progression.finishRankedRun({score:total,zone,bestStreak:flow.bestStreak}).earned);
      best=progression.bestScore;
      if(best>previousBest)store.put(best); // Preserve the Flow 1.0 record used by earlier versions.
    }
    arcadeUI.results($,{practice:runMode==='practice',score:total,zone,runStreak:flow.bestStreak,
      perfectZones:flow.perfectZones,bestScore:progression.bestScore,recordScore:runMode==='arcade'&&total>previousBest,
      earned:unlockedThisRun});
    arcadeUI.menu($,progression);
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
    ripple(player.x,player.feet-5,c1,12);
    for(let i=0;i<12;i++){
      motes.push(makeMote(player.x+rand(-15,15),player.feet-2,c2,
        {vx:rand(-155,60),vy:rand(-110,-25),life:rand(.16,.40),r:rand(1.0,2.8)}));
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
    const n=Math.round(8+strength*9);
    for(let i=0;i<n;i++){
      const side=i%2===0?1:-1;
      motes.push(makeMote(player.x+side*rand(3,12),ground-3,side===1?c1:c2,
        {vx:side*rand(70,205)*(0.6+strength*.5),vy:rand(-62,-9),
         life:rand(.18,.40),r:rand(1.0,2.9)}));
    }
    if(motes.length>180)motes.splice(0,motes.length-180);
    ripple(player.x,ground,c2,15+strength*10);
    // Max 2 logical px before the draw() camera damping factor.
    if(velocity>650)shake=Math.max(shake,2.0);
    sound('land');
  }
  function startDuck(){
    if(status!=='running'||!player.landed||player.duck||player.duckRecovery>0)return;
    player.duck=true;
    player.duckTime=DUCK_DURATION;
    $.duck.classList.add('is-down');
    sound('duck');burst(player.x-16,floorY-5,4,c2,.26);
  }
  function updateDuck(dt){
    if(player.duck){
      player.duckTime=Math.max(0,player.duckTime-dt);
      if(player.duckTime===0){
        player.duck=false;
        player.duckRecovery=DUCK_RECOVERY;
        $.duck.classList.remove('is-down');
      }
    }else{
      player.duckRecovery=Math.max(0,player.duckRecovery-dt);
    }
  }
  function registerControls(){
    $.jump.addEventListener('pointerdown',e=>{e.preventDefault();$.jump.classList.add('is-down');
      try{$.jump.setPointerCapture(e.pointerId)}catch(_){}jump();});
    const jumpRelease=()=>$.jump.classList.remove('is-down');
    $.jump.addEventListener('pointerup',jumpRelease);$.jump.addEventListener('pointercancel',jumpRelease);
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
      if(k==='Escape'&&!$.milestonePanel.classList.contains('hidden')){closeMilestones();return}
      if((k==='Escape'||k==='KeyP')&&!e.repeat){if(status==='running')pause();else if(status==='paused')resume()}
    });
    window.addEventListener('keyup',e=>{input.duckKeys.delete(e.code)});
    window.addEventListener('blur',()=>{input.duckKeys.clear();input.duckPointer=null;if(status==='running')pause()});
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&status==='running')pause()});
    el('start-btn').addEventListener('click',()=>startRun('arcade'));
    el('retry-btn').addEventListener('click',()=>startRun(runMode,startZone));
    $.practiceButton.addEventListener('click',()=>startRun('practice',Number($.practiceSelect.value)));
    el('resume-btn').addEventListener('click',resume);
    el('restart-paused-btn').addEventListener('click',()=>startRun(runMode,startZone));
    el('menu-paused-btn').addEventListener('click',showMenu);
    el('menu-result-btn').addEventListener('click',showMenu);
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
  arcadeUI.menu($,progression);

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
    return true;
  }
  function updateHud(){
    HUD.update($,{hp,zone,color:c1,phase:director.label,score,speed,
      baseSpeed:GAME.baseSpeed,status,flow});
  }
  function nextZone(reward=null){
    lastZoneCallout=1.4;
    HUD.showZoneCallout($,{zone,name:PALETTES[(zone-1)%PALETTES.length].name,
      color:PALETTES[(zone-1)%PALETTES.length].primary,perfectReward:reward?.perfect?reward:null});
    ripple(player.x,floorY-20,c1,35);burst(player.x,floorY-20,24,c1,1.7);if(!reward?.perfect)sound('zone');
  }
  function onHit(o){
    if(o.hit)return;
    o.hit=true;
    if(player.invulnerable>0){flow.registerCollision();return;}
    hp=Math.max(0,hp-GAME.damagePerHit);player.invulnerable=.96;shake=12;hitFlash=.38;
    director.registerDamage();flow.registerDamage();burst(player.x,player.feet-30,'#ff506d',30,1.4);ripple(player.x,player.feet-26,'#ff596e',25);
    vib([25,40,30]);sound('hit');if(hp===0)endRun();
  }
  function failGap(gap){
    if(!terrain.markGap(gap,true))return;
    gapRecovery=gap;jumpControl.cancel();motion.reset();
    // Damage follows exactly the same HP/Flow/Director rules as a box hit.
    hp=Math.max(0,hp-GAME.damagePerHit);
    director.registerDamage();flow.registerDamage();
    player.invulnerable=1.15;shake=13;hitFlash=.42;
    burst(player.x,player.feet-12,'#ff5998',26,1.3);ripple(player.x,player.feet-8,c2,27);
    sound('hit');vib([30,45,30]);
    if(hp===0)endRun();
  }
  function clearGap(gap){
    if(!terrain.markGap(gap,false))return;
    director.registerClear();
    const reward=flow.registerClear({precision:false});
    score+=reward.earnedPoints;
    if(runMode==='arcade')earnedMilestones(progression.reachedStreak(flow.streak).earned);
    burst(player.x,player.feet-7,c1===c2?5:9,c1,.58);
    if(reward.tierUp)sound('flow');else sound('score');
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
        burst(player.x,floorY-36,21,c2,1.05);ripple(player.x,floorY-18,c1,22);
        sound('perfect');
        if(runMode==='arcade')earnedMilestones(progression.perfectZone().earned);
      }
      zone=next;
      if(runMode==='arcade')earnedMilestones(progression.reachedZone(zone).earned);
      nextZone(reward);
    }
    speed=GAME.speedAt(time,zone);
    distance+=speed*dt;
    terrain.ensure(distance+W+800,zone,speed);
    terrain.prune(distance+player.x,speed);
    const i=(zone-1)%PALETTES.length, j=(zone-2+PALETTES.length)%PALETTES.length;
    const t=zone===1?1:smooth((time%GAME.zoneSeconds)/.68);
    c1=rgbHex(PALETTES[j].primary,PALETTES[i].primary,t);
    c2=rgbHex(PALETTES[j].secondary,PALETTES[i].secondary,t);
    c3=rgbHex(PALETTES[j].shadow,PALETTES[i].shadow,t);
    flow.tick(dt);
    player.invulnerable=Math.max(0,player.invulnerable-dt);
    jumpControl.tick(dt,distance+player.x);motion.tick(dt);
    shake=Math.max(0,shake-dt*36);hitFlash=Math.max(0,hitFlash-dt);
    if(lastZoneCallout>0){lastZoneCallout-=dt;if(lastZoneCallout<=0)$.zoneCallout.classList.add('hidden')}
    if(milestoneTime>0){milestoneTime-=dt;if(milestoneTime<=0)$.milestoneToast.classList.add('hidden')}
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
    if(flow.tier>=1&&Math.random()<dt*(flow.tier===3?19:flow.tier===2?11:5)){
      motes.push(makeMote(player.x-25,player.feet-20,Math.random()<.5?c1:c2,
        {vx:rand(-160,-40),vy:rand(-55,25),life:rand(.2,.42),r:rand(.9,2.4)}));
    }
    if(!player.landed&&Math.random()<.7)motes.push(makeMote(player.x+rand(-14,14),player.feet-8,c1,{vx:rand(-170,-20),vy:rand(10,70),life:.32,r:rand(1,3)}));
    director.tick(dt,{zone,speed,hp},spawn);
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
          if(runMode==='arcade')earnedMilestones(progression.reachedStreak(flow.streak).earned);
          if(gained.tierUp){burst(player.x,floorY-25,9,c1,.62);sound('flow')}
          else if(Math.random()<.25)sound('score');
        }
      }
    }
    hurdles=hurdles.filter(o=>o.x+o.width>-100);
    score+=dt*(45+speed*.095);
    for(const m of motes){m.x+=m.vx*dt;m.y+=m.vy*dt;m.vy+=150*dt;m.life-=dt}
    motes=motes.filter(m=>m.life>0).slice(-180);
    for(const r of rings){r.r+=dt*160;r.life-=dt}
    rings=rings.filter(r=>r.life>0);
    if(hp>0&&hp<=25&&Math.floor(worldTime*1.5)!==Math.floor((worldTime-dt)*1.5))sound('warning');
    audio.tick({phase:director.phase,speed,flow:flow.value,zone,hp});
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
    ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.shadowColor=color;ctx.shadowBlur=blur;
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore();
  }
  function drawWorld(t){
    worldBackground.drawBackground({ctx,width:W,height:H,time:t,speed,
      primary:c1,secondary:c2,shadow:c3,flow:flow.value,glowLine});
  }
  function drawTerrain(){
    terrainRender.drawTerrain({ctx,terrain,distance,width:W,height:H,baseY:floorY,
      primary:c1,secondary:c2,flow:flow.value,glowLine});
  }
  function drawObstacle(o){
    const b=GEO.obstacleBox(o,o.groundY), isLow=o.type==='jump',color=isLow?c2:c1;
    const cx=o.x+b.w/2,twinkle=.76+Math.sin(worldTime*6+o.pulse)*.14;
    ctx.save();
    ctx.shadowColor=color;ctx.shadowBlur=23;ctx.globalAlpha=twinkle;
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
      ctx.shadowBlur=8;ctx.shadowColor=color;
      ctx.fillText(isLow?'↑ JUMP':'↓ DUCK',cx,isLow?b.y-25:b.y-20);
    }
    ctx.restore();
  }
  function drawPlayer(){
    const b=GEO.playerBox(player),beat=1+Math.sin(worldTime*14)*.025;
    ctx.save();
    if(player.invulnerable>0&&Math.floor(worldTime*16)%2===0)ctx.globalAlpha=.32;
    for(let i=5+Math.floor(flow.value/25);i>=1;i--){
      const x=b.x-i*(9+speed/110),sc=1-i*.105;
      ctx.fillStyle=rgba(c1,clamp(.055+(8-i)*.025,0,.24));
      roundRectPath(x,b.y+(1-sc)*b.h/2,b.w*sc,b.h*sc,6);ctx.fill();
    }
    const shape=motion.sample({landed:player.landed,duck:player.duck,vy:player.vy});
    const rw=b.w*shape.scaleX*beat, rh=b.h*shape.scaleY*beat;
    const rx=player.x-rw/2,ry=player.feet-rh;
    ctx.shadowColor=c1;ctx.shadowBlur=31+shape.glow*17;
    roundRectPath(rx,ry,rw,rh,player.duck?8:8);ctx.fillStyle='#f3fcff';ctx.fill();
    ctx.shadowBlur=9;ctx.lineWidth=2;ctx.strokeStyle=c1;ctx.stroke();
    const shading=ctx.createLinearGradient(rx,ry,rx+rw,ry+rh);
    shading.addColorStop(0,'rgba(255,255,255,.9)');shading.addColorStop(.6,'rgba(247,251,255,.08)');shading.addColorStop(1,rgba(c1,.34));
    ctx.fillStyle=shading;roundRectPath(rx+5,ry+4,rw-10,rh-8,5);ctx.fill();
    glowLine(rx+6,ry+6,rx+rw*.6,ry+6,'#fff',2,6,.7);
    ctx.restore();
    // At high Flow a soft halo frames the runner; collision shape is untouched.
    if(flow.tier===3){
      ctx.save();ctx.strokeStyle=c2;ctx.lineWidth=1.6;ctx.shadowColor=c2;ctx.shadowBlur=16;
      ctx.globalAlpha=.25+.06*Math.sin(worldTime*5);
      ctx.beginPath();ctx.ellipse(player.x,player.feet-b.h/2,b.w*.95,b.h*.95,0,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
    const surface=terrain.groundAt(distance+player.x);
    if(surface!==null){
      const height=clamp((surface-player.feet)*.16,0,80);
      ctx.fillStyle=rgba(c1,.14);ctx.beginPath();ctx.ellipse(player.x,surface+5,clamp(25-height*.18,9,25),4,0,0,Math.PI*2);ctx.fill();
    }
  }
  function drawFx(dt){
    for(const m of motes){
      const a=clamp(m.life/Math.max(.2,m.max),0,1);
      ctx.globalAlpha=a*.9;ctx.fillStyle=m.color;
      ctx.shadowColor=m.color;ctx.shadowBlur=8;
      ctx.beginPath();ctx.arc(m.x,m.y,m.r*a,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;ctx.shadowBlur=0;
    for(const r of rings){
      ctx.globalAlpha=clamp(r.life/r.max,0,1)*.65;
      ctx.strokeStyle=r.color;ctx.lineWidth=2;ctx.shadowColor=r.color;ctx.shadowBlur=13;
      ctx.beginPath();ctx.ellipse(r.x,r.y,r.r,r.r*.4,0,0,Math.PI*2);ctx.stroke();
    }
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
    const sx=canvas.width/W,sy=canvas.height/H;
    ctx.setTransform(sx,0,0,sy,0,0);
    ctx.save();
    if(shake>0&&status==='running')ctx.translate(rand(-shake,shake)*.4,rand(-shake,shake)*.35);
    drawWorld(worldTime);
    drawTerrain();
    for(const o of hurdles)drawObstacle(o);
    drawPlayer();drawFx();
    ctx.restore();
    // UI screens use subtle dimming, but background remains animated and recognizable.
    if(status!=='running'){
      ctx.fillStyle='rgba(4,7,18,.33)';ctx.fillRect(0,0,W,H);
    }
  }
  function frame(ts){
    if(!lastTs)lastTs=ts;
    const dt=clamp((ts-lastTs)/1000,0,.033);lastTs=ts;
    if(status==='running')update(dt);
    else if(status==='ready'){worldTime+=dt*.38;}
    draw();requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
