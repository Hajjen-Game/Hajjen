// Wildpath 3.0 — playable Pass 1 vertical slice.
// Babylon renders the arena/actors. NatureGrowth is reused without changing
// Wildpath 2.x; combat/waves/controls belong solely to Wildpath 3.0.
import {ARENA_RADIUS,ENEMY_TYPES,WAVE_BUDGETS,BOOSTS,clamp,moveInsideArena,
  selectAutoTarget,spawnAtAngle,waveEnemyType} from './rules.js?v=3.0.2';
import {createArcadeArena,candyMaterial} from './arena.js?v=3.0.3';
import {createCharacter,setCharacterPose} from './actors.js?v=3.0.1';
import {createMovementControls} from './controls.js?v=3.0.1';
import {WaterVFX} from './vfx.js?v=3.0.1';
import {createScoreLedger,awardScore,currentCombo,formatScore} from './score.js?v=3.0.1';
import {makeNatureLedger,recordNatureKill} from '../../wildpath/src/nature-rebirth.js';
import {MobileNatureGrowth} from './mobile-nature.js?v=3.0.3';
const B=window.BABYLON;
const $=id=>document.getElementById(id);
const V=(x,y,z)=>new B.Vector3(x,y,z);
const fmt=t=>Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');
export class Wildpath3Game {
  constructor(){
    this.canvas=$('game');
    this.engine=new B.Engine(this.canvas,true,{stencil:false,
      preserveDrawingBuffer:false},true);
    this.engine.setHardwareScalingLevel(
      Math.max(1,Math.min(1.6,(window.devicePixelRatio||1)/1.8)));
    this.scene=new B.Scene(this.engine);
    this.arena=createArcadeArena(this.scene);
    this.arena.resize(this.engine);
    this.controls=createMovementControls();
    this.vfx=new WaterVFX(this.canvas,this.scene,this.engine);
    void this.vfx.init();
    this.score=createScoreLedger();
    try{
      this.bestScore=Math.max(0,Number(localStorage.getItem('wildpath3.best.score')||0))||0;
    }catch{this.bestScore=0;}
    this.projectileMaterial=candyMaterial(this.scene,'turquoise auto bolt','#1bd5ed',
      {shine:.32,emission:.18});
    this.pulseMaterial=candyMaterial(this.scene,'strong cyan water pulse','#19d2b5',
      {shine:.13,emission:.10});
    this.pickupMaterial=candyMaterial(this.scene,'golden magic seed','#ffc044',
      {shine:.27,emission:.10});
    this.nature=new MobileNatureGrowth(this.scene,{
      onBloom:(event,upgraded)=>{
        this.events.blooms++;
        this.award(event.tier,event.x,event.z);
        this.vfx.emit('Tidal Bloom','burst',event.x,event.z,.66);
      },
      onFusion:event=>{
        this.events.fusionNotices++;
        this.award(event.kind,event.x,event.z);
        this.vfx.emit('Tidal Bloom','burst',event.x,event.z,1.25);
        this.toast('✿ '+event.kind.toUpperCase()+' FUSION!');
      }
    });
    this.state='menu';
    this.hero=null;
    this.enemies=[];this.projectiles=[];this.pickups=[];this.fx=[];
    this.events={blooms:0,fusionNotices:0};
    this.clock=0;this.hudTimer=0;this.toastTimer=0;
    this.configureUI();
    this.arena.follow(0,0,1);
    let then=performance.now();
    this.engine.runRenderLoop(()=>{
      const now=performance.now(),dt=Math.min(.045,(now-then)/1000);
      then=now;
      if(this.state==='playing')this.update(dt);
      this.scene.render();
      this.vfx.update(dt,this.projectiles,this.state==='playing');
    });
    window.addEventListener('resize',()=>{
      this.engine.resize();this.arena.resize(this.engine);
    });
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden&&this.state==='playing')this.pause();
    });
  }
  configureUI(){
    $('beginButton').addEventListener('click',()=>this.start());
    $('againButton').addEventListener('click',()=>this.start());
    $('pauseButton').addEventListener('click',()=>this.pause());
    $('resumeButton').addEventListener('click',()=>this.resume());
    $('quitButton').addEventListener('click',()=>this.returnToMenu());
    $('resultMenuButton').addEventListener('click',()=>this.returnToMenu());
  }
  show(name){
    for(const id of ['intro','boostModal','pauseModal','finishModal']){
      $(id).hidden=id!==name;
    }
    document.body.dataset.mode=this.state;
  }
  award(kind,x,z){
    if(!this.score)return;
    const gained=awardScore(this.score,kind,this.time);
    if(Number.isFinite(x)&&Number.isFinite(z))this.scorePopup(gained.points,x,z,kind);
    this.hudTimer=-.01;
    return gained;
  }
  scorePopup(amount,x,z,kind){
    const stage=$('floaters'),camera=this.scene.activeCamera;
    const viewport=camera.viewport.toGlobal(this.engine.getRenderWidth(),this.engine.getRenderHeight());
    const p=B.Vector3.Project(V(x,2.25,z),B.Matrix.Identity(),
      this.scene.getTransformMatrix(),viewport);
    if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.z<0||p.z>1)return;
    const rect=this.canvas.getBoundingClientRect();
    const pointX=rect.left+p.x*rect.width/this.engine.getRenderWidth();
    const pointY=rect.top+p.y*rect.height/this.engine.getRenderHeight();
    if(pointX<-20||pointX>window.innerWidth+20||pointY<70||pointY>window.innerHeight-100)return;
    const div=document.createElement('div');
    div.className='scoreFloat '+(kind==='seed'?'pickupScore':
      ['flower','bush','tree','blossom','meadow','thicket','grove','enchanted'].includes(kind)?'natureScore':'combatScore');
    div.style.left=pointX+'px';div.style.top=pointY+'px';
    div.textContent='+'+formatScore(amount);
    stage.appendChild(div);
    div.addEventListener('animationend',()=>div.remove(),{once:true});
    while(stage.childElementCount>28)stage.firstElementChild?.remove();
  }
  toast(message){
    const t=$('toast');t.textContent=message;t.classList.add('visible');
    this.toastTimer=2.3;
  }
  start(){
    this.cleanupRun();
    this.state='playing';
    this.wave=0;this.waveSpawned=0;this.waveDelay=.55;this.clearClock=0;
    this.time=0;this.kills=0;this.damageTaken=0;this.seedCount=0;
    this.score=createScoreLedger();this.vfx.clear();$('floaters').replaceChildren();
    this.cooldown=.40;this.pulseCd=3.5;this.guardCd=9;
    this.damage=25;this.speed=6.9;this.attackDelay=.57;this.range=9.8;
    this.splashRadius=1.65;this.splashPower=.47;
    this.pulseRadius=4.5;this.pulseDamage=34;this.pulseDelay=4.15;
    this.doublePulse=false;this.cascade=false;
    this.maxHp=115;this.hp=115;
    this.hero={x:0,z:0,alive:true};
    this.hero.actor=createCharacter(this.scene,'hero');
    this.ledger=makeNatureLedger();
    this.events={blooms:0,fusionNotices:0};
    this.controls.reset();
    this.show(null);this.toast('LEVEL 1 · GROW YOUR LEGACY');
    this.updateHud();
  }
  cleanupRun(){
    if(this.hero?.actor)this.hero.actor.dispose();
    for(const e of this.enemies)e.actor.dispose();
    for(const p of this.projectiles)p.mesh.dispose();
    for(const p of this.pickups)p.mesh.dispose();
    for(const f of this.fx){f.mesh.dispose();f.material.dispose();}
    this.enemies=[];this.projectiles=[];this.pickups=[];this.fx=[];
    this.nature.clear();this.vfx.clear();$('floaters').replaceChildren();
    this.hero=null;
  }
  returnToMenu(){
    this.cleanupRun();this.state='menu';this.show('intro');this.controls.reset();
    this.arena.follow(0,0,1);
  }
  pause(){
    if(this.state!=='playing')return;
    this.state='paused';this.show('pauseModal');this.controls.reset();
  }
  resume(){
    if(this.state!=='paused')return;
    this.state='playing';this.show(null);
  }
  spawn(){
    let pos;
    for(let i=0;i<14;i++){
      const a=Math.random()*Math.PI*2;
      pos=spawnAtAngle(a,ARENA_RADIUS-1.9);
      if(Math.hypot(pos.x-this.hero.x,pos.z-this.hero.z)>5.2)break;
    }
    const type=waveEnemyType(this.wave,this.waveSpawned);
    const spec=ENEMY_TYPES[type];
    const actor=createCharacter(this.scene,type);
    const enemy={type,x:pos.x,z:pos.z,hp:spec.hp,maxHp:spec.hp,alive:true,
      speed:spec.speed,attackCd:.3+Math.random()*.5,
      radius:spec.radius,actor,t:Math.random()*20};
    setCharacterPose(actor,enemy.x,enemy.z,0);
    this.enemies.push(enemy);this.waveSpawned++;
  }
  makeBolt(from,target){
    const mesh=B.MeshBuilder.CreateSphere('automatic water dart',
      {diameter:.44,segments:12},this.scene);
    mesh.position.set(from.x,1.22,from.z);
    mesh.material=this.projectileMaterial;mesh.isPickable=false;
    this.projectiles.push({mesh,x:from.x,z:from.z,target,age:0,damage:this.damage});
    this.vfx.emit('Water Dart','charge',from.x,from.z,.85);
  }
  splashAt(x,z,radius,damage,except=null,source='splash'){
    let hits=0;
    for(const enemy of [...this.enemies]){
      if(!enemy.alive||enemy===except)continue;
      if(Math.hypot(enemy.x-x,enemy.z-z)>radius+enemy.radius*.35)continue;
      this.damageEnemy(enemy,damage,source);
      hits++;
    }
    if(hits>0){
      this.makeRipple(x,z,radius,'pulse');
      this.vfx.emit('Tidal Bloom','burst',x,z,
        Math.min(1.55,.75+hits*.09));
    }
    return hits;
  }
  pulse(){
    this.makeRipple(this.hero.x,this.hero.z,this.pulseRadius,'pulse');
    this.vfx.emit('Tidal Bloom','burst',this.hero.x,this.hero.z,1.38);
    let hits=0;
    // The entire ring damages close enemy groups, not only the auto-target.
    for(const enemy of [...this.enemies]){
      if(!enemy.alive||Math.hypot(enemy.x-this.hero.x,
        enemy.z-this.hero.z)>this.pulseRadius+enemy.radius*.2)continue;
      this.damageEnemy(enemy,this.pulseDamage,'pulse');
      hits++;
    }
    if(this.doublePulse){
      this.splashAt(this.hero.x,this.hero.z,this.pulseRadius*.89,
        this.pulseDamage*.63,null,'pulse');
    }
    if(hits>0)this.toast('✦ TIDAL PULSE · '+hits+' HIT');
  }
  makeRipple(x,z,radius,kind='hit'){
    const mesh=B.MeshBuilder.CreateTorus('clean colored spell ring',
      {diameter:2,thickness:kind==='pulse'?.11:.075,tessellation:32},this.scene);
    // Babylon torus lies in the XZ plane by default, parallel to the floor.
    mesh.position.set(x,.22,z);
    const color=kind==='pulse'?'#32e6c4':kind==='kill'?'#ffd05f':'#49dded';
    const material=candyMaterial(this.scene,'impact '+kind,color,{
      emission:.10,shine:.12});
    material.alpha=.95;mesh.material=material;
    this.fx.push({mesh,material,age:0,life:kind==='pulse'?.48:.33,radius});
  }
  damageEnemy(enemy,amount,source='direct'){
    if(!enemy.alive)return;
    enemy.hp-=amount;
    if(enemy.hp>0){
      enemy.actor.torso.scaling.x=Math.max(.8,1+Math.min(.13,amount/170));
      return;
    }
    enemy.alive=false;
    this.kills++;
    const {x,z}=enemy;
    this.award(enemy.type,x,z);
    this.makeRipple(x,z,1.0,'kill');
    if(this.cascade&&source!=='cascade')
      this.splashAt(x,z,2.35,this.damage*.65,enemy,'cascade');
    const event=recordNatureKill(this.ledger,{x,z,type:enemy.type,time:this.time});
    if(event)this.nature.apply(event,this.hero);
    if(Math.random()<.78){
      const mesh=B.MeshBuilder.CreateSphere('collectible golden seed',
        {diameter:.40,segments:10},this.scene);
      mesh.position.set(x,.42,z);mesh.material=this.pickupMaterial;
      mesh.isPickable=false;this.pickups.push({x,z,mesh,age:0});
    }
    enemy.actor.dispose();
  }
  damageHero(amount){
    this.hp=Math.max(0,this.hp-amount);
    this.damageTaken+=amount;
    this.makeRipple(this.hero.x,this.hero.z,.84,'hit');
    if(this.hp<=0)this.end(false);
  }
  handleMovement(dt){
    const dir=this.controls.sample();
    const distance=Math.hypot(dir.x,dir.z);
    // Camera looks north (+Z), so screen-up maps to positive world Z.
    const p=moveInsideArena(this.hero.x,this.hero.z,dir.x*this.speed*dt,
      -dir.z*this.speed*dt);
    this.hero.x=p.x;this.hero.z=p.z;
    setCharacterPose(this.hero.actor,p.x,p.z,this.time,this.speed*distance);
    this.arena.follow(p.x,p.z,dt);
  }
  updateEnemies(dt){
    for(const e of this.enemies){
      if(!e.alive)continue;
      e.t+=dt;
      const dx=this.hero.x-e.x,dz=this.hero.z-e.z;
      const d=Math.max(.0001,Math.hypot(dx,dz));
      const striking=d<e.radius+.86;
      if(!striking){
        const step=Math.min(Math.max(0,d-e.radius-.7),e.speed*dt);
        e.x+=dx/d*step;e.z+=dz/d*step;
      }
      e.attackCd=Math.max(0,e.attackCd-dt);
      if(striking&&e.attackCd===0){
        this.damageHero(ENEMY_TYPES[e.type].damage);
        e.attackCd=e.type==='guardian'?1.5:1.30;
        if(this.state!=='playing')break;
      }
      setCharacterPose(e.actor,e.x,e.z,e.t,striking?0:e.speed);
    }
  }
  updateProjectiles(dt){
    for(let i=this.projectiles.length-1;i>=0;i--){
      const p=this.projectiles[i];
      p.age+=dt;
      if(!p.target.alive||p.age>1.6){p.mesh.dispose();this.projectiles.splice(i,1);continue;}
      const dx=p.target.x-p.x,dz=p.target.z-p.z,d=Math.hypot(dx,dz);
      if(d<.65+p.target.radius){
        const primary=p.target;
        this.damageEnemy(primary,p.damage);
        // Every automatic dart now has genuine nearby splash damage,
        // so player positioning creates tight Nature Rebirth clusters.
        this.splashAt(p.x,p.z,this.splashRadius,
          p.damage*this.splashPower,primary);
        this.makeRipple(p.x,p.z,.72);
        this.vfx.emit('Water Dart','burst',p.x,p.z,.98);
        p.mesh.dispose();this.projectiles.splice(i,1);continue;
      }
      const step=Math.min(d,18*dt);
      p.x+=dx/Math.max(.001,d)*step;p.z+=dz/Math.max(.001,d)*step;
      p.mesh.position.set(p.x,1.25+Math.sin(p.age*13)*.04,p.z);
    }
  }
  updatePickups(dt){
    for(let i=this.pickups.length-1;i>=0;i--){
      const p=this.pickups[i];p.age+=dt;
      p.mesh.position.y=.43+Math.sin(p.age*7)*.10;
      p.mesh.rotation.y+=dt*3;
      const d=Math.hypot(this.hero.x-p.x,this.hero.z-p.z);
      if(d<1.15){
        p.mesh.dispose();this.pickups.splice(i,1);
        this.seedCount++;this.hp=Math.min(this.maxHp,this.hp+1.5);
        this.award('seed',p.x,p.z);
      }else if(d<3.7){
        const f=Math.min(1,dt*(d<2?5:2.3));
        p.x+=(this.hero.x-p.x)*f;p.z+=(this.hero.z-p.z)*f;
        p.mesh.position.x=p.x;p.mesh.position.z=p.z;
      }
    }
  }
  updateFX(dt){
    for(let i=this.fx.length-1;i>=0;i--){
      const f=this.fx[i];f.age+=dt;
      if(f.age>=f.life){
        f.mesh.dispose();f.material.dispose();this.fx.splice(i,1);continue;
      }
      const t=f.age/f.life,e=1-Math.pow(1-t,2);
      f.mesh.scaling.setAll(.12+f.radius*e);
      f.material.alpha=(1-t)*.88;
    }
  }
  updateWaves(dt){
    if(this.waveSpawned<WAVE_BUDGETS[this.wave]){
      this.waveDelay-=dt;
      if(this.waveDelay<=0){
        this.spawn();
        this.waveDelay=Math.max(.52,.88-this.wave*.09);
      }
      return;
    }
    if(this.enemies.some(e=>e.alive)){this.clearClock=0;return;}
    // Allow the final kill's natural blooms to mature before choosing a boost.
    this.clearClock+=dt;
    if(this.clearClock<3.0)return;
    this.award('wave',this.hero.x,this.hero.z);
    if(this.wave===WAVE_BUDGETS.length-1)this.end(true);
    else this.openBoosts();
  }
  openBoosts(){
    this.state='boost';
    $('boostTitle').textContent='WAVE '+(this.wave+1)+' COMPLETE';
    $('boostSubtitle').textContent='Choose one upgrade for your automatic spells.';
    const wrap=$('boostChoices');wrap.replaceChildren();
    const shuffled=[...BOOSTS].sort(()=>Math.random()-.5).slice(0,3);
    for(const option of shuffled){
      const button=document.createElement('button');
      button.type='button';button.className='boostChoice';
      const icon=document.createElement('span');
      icon.className='boostIcon';icon.textContent=option.icon;
      const heading=document.createElement('strong');heading.textContent=option.name;
      const desc=document.createElement('small');desc.textContent=option.description;
      button.append(icon,heading,desc);
      button.addEventListener('click',()=>this.chooseBoost(option.id));
      wrap.appendChild(button);
    }
    this.show('boostModal');this.controls.reset();
  }
  chooseBoost(id){
    if(this.state!=='boost')return;
    if(id==='tempo')this.attackDelay*=.75;
    if(id==='damage')this.damage*=1.3;
    if(id==='splash'){
      this.pulseRadius*=1.45;
      this.pulseDamage*=1.30;
      this.pulseDelay*=.87;
    }
    if(id==='range'){this.range*=1.25;this.splashRadius*=1.2;}
    if(id==='stride')this.speed*=1.18;
    if(id==='torrent'){this.splashRadius*=1.75;this.splashPower*=1.55;}
    if(id==='deluge'){
      this.doublePulse=true;this.pulseDelay*=.75;this.pulseRadius*=1.18;
    }
    if(id==='cascade')this.cascade=true;
    if(id==='mend'){this.maxHp+=20;this.hp=Math.min(this.maxHp,this.hp+55);}
    this.wave++;
    this.waveSpawned=0;this.waveDelay=.68;this.clearClock=0;
    // Retain plants and fusion history across all waves.
    this.state='playing';this.show(null);
    this.toast('WAVE '+(this.wave+1)+' · GROW STRONGER');
  }
  end(won){
    this.state=won?'won':'lost';
    this.controls.reset();
    const nature=this.nature.snapshot();
    $('finishTitle').textContent=won?'LEVEL 1 CLEARED!':'THE FOREST RESTS';
    $('finishSubtitle').textContent=won
      ?'Your entire round’s nature will form one unique Daisugi tree in the next development pass.'
      :'Try new movement routes to create stronger fusion chains.';
    if(this.score.total>this.bestScore){
      this.bestScore=this.score.total;
      try{localStorage.setItem('wildpath3.best.score',String(this.bestScore));}catch{}
    }
    $('resultScore').textContent=formatScore(this.score.total);
    $('resultBest').textContent='PERSONAL BEST '+formatScore(this.bestScore);
    $('resultCombo').textContent='BEST COMBO '+this.score.bestCombo+' · NATURE POINTS '+
      formatScore(this.score.breakdown.nature);
    $('finishStats').replaceChildren();
    const cells=[
      ['ENEMIES',String(this.kills)],
      ['BLOOMS',String(this.events.blooms)],
      ['FUSED PLANTS',String(nature.fusedPlants)],
      ['GROVES',String(nature.regions)],
      ['SEEDS',String(this.seedCount)],
      ['TIME',fmt(this.time)]
    ];
    for(const [k,v]of cells){
      const cell=document.createElement('div');cell.className='statCell';
      const label=document.createElement('small');label.textContent=k;
      const value=document.createElement('strong');value.textContent=v;
      cell.append(label,value);$('finishStats').append(cell);
    }
    this.show('finishModal');
  }
  updateHud(){
    if(!this.hero)return;
    const count=this.enemies.filter(e=>e.alive).length;
    const snap=this.nature.snapshot();
    $('waveText').textContent='WAVE '+(this.wave+1)+' / '+WAVE_BUDGETS.length;
    $('timeText').textContent=fmt(this.time);
    $('hpLabel').textContent=Math.ceil(this.hp)+' / '+this.maxHp;
    $('hpBar').style.width=clamp(this.hp/this.maxHp*100,0,100)+'%';
    $('killText').textContent=this.kills+' KOs';
    $('bloomText').textContent=this.events.blooms+' BLOOMS';
    $('fusionText').textContent=snap.regions+' FUSIONS';
    $('seedText').textContent=this.seedCount;
    $('scoreText').textContent=formatScore(this.score.total);
    $('bestText').textContent='BEST '+formatScore(this.bestScore);
    const combo=currentCombo(this.score,this.time);
    $('comboText').textContent=combo>1?'COMBO '+combo:'AUTO BATTLE';
    $('enemyText').textContent=count+' ENEMIES';
  }
  update(dt){
    this.time+=dt;
    if(this.toastTimer>0){
      this.toastTimer-=dt;
      if(this.toastTimer<=0)$('toast').classList.remove('visible');
    }
    this.handleMovement(dt);
    this.updateEnemies(dt);
    if(this.state!=='playing')return;
    this.cooldown-=dt;this.pulseCd-=dt;this.guardCd-=dt;
    if(this.cooldown<=0){
      const target=selectAutoTarget(this.hero,this.enemies,this.range);
      if(target){this.makeBolt(this.hero,target);this.cooldown=this.attackDelay;}
      else this.cooldown=Math.max(-.1,this.cooldown);
    }
    if(this.pulseCd<=0){
      if(this.enemies.some(e=>e.alive&&
        Math.hypot(e.x-this.hero.x,e.z-this.hero.z)<this.pulseRadius+.3)){
        this.pulse();this.pulseCd=this.pulseDelay;
      }else this.pulseCd=.25; // Hold the pulse until enemies are near.
    }
    if(this.guardCd<=0){
      if(this.hp<this.maxHp*.76){
        this.hp=Math.min(this.maxHp,this.hp+14);
        this.makeRipple(this.hero.x,this.hero.z,1.9,'pulse');
        this.guardCd=12;
        this.toast('✿ AUTO RENEWAL');
      }else this.guardCd=1;
    }
    this.updateProjectiles(dt);
    this.updatePickups(dt);
    this.updateFX(dt);
    this.nature.update(dt,this.hero);
    this.enemies=this.enemies.filter(e=>e.alive);
    this.updateWaves(dt);
    this.hudTimer-=dt;
    if(this.hudTimer<=0){this.hudTimer=.12;this.updateHud();}
  }
}
