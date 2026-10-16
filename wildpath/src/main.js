import { CLASS_DATA, BOOSTS, ENEMIES, STAGE_NAMES, STAGE_GATES, clamp, random } from './config.js?v=0.6.0';
import { createWorld, createActor, pathX, lightOrb, ring, disc } from './world-v5.js?v=0.7.0';
import { BOARD_START, BOARD_END, moveOnRoad, projectToRoad } from './layout-v5.js?v=0.6.0';
import { chooseAutoTarget } from './targeting.js?v=0.6.0';
import { nextTravelZ, positionAfterBlessing, cameraAnchorZ } from './flow.js?v=0.6.0';
import { Director } from './director.js?v=0.6.0';
import { widthLockedFrustum, CAMERA_HEIGHT, CAMERA_BEHIND, CAMERA_LOOK_DISTANCE } from './framing.js?v=0.6.0';
import { magicProjectile, vfxRing, crystal, visibleGroundPool, shieldDome, meleeSlash } from './vfx-v2.js?v=0.7.0';
import { displayedScoreStep, cooldownFill, justRecharged, shakeStrength } from './juice.js?v=0.8.0';
import { createSpellAnimator } from './spell-animation.js?v=0.9.2';
import { chooseVolleyTargets } from './volley-targets.js?v=1.0.0';
import { WildpathPixiCombat } from './pixi-combat.js?v=1.0.3';
const CAMERA_WORLD_WIDTH=33.2;

const B = window.BABYLON;
const $ = id => document.getElementById(id);
if (!B) {
  $('startScreen').hidden = true;
  $('loadError').hidden = false;
  throw new Error('Babylon.js could not be loaded');
}
const V = (x,y,z) => new B.Vector3(x,y,z);
const canvas = $('game');
const engine = new B.Engine(canvas,true,{stencil:false,preserveDrawingBuffer:false},true);
engine.setHardwareScalingLevel(Math.max(1, Math.min(1.5,devicePixelRatio>2?1.35:1)));
const scene = new B.Scene(engine);
scene.clearColor = B.Color4.FromHexString('#26322eff');
scene.ambientColor = new B.Color3(.37,.45,.41);
scene.fogMode = B.Scene.FOGMODE_LINEAR;
scene.fogColor = B.Color3.FromHexString('#26322e');
scene.fogStart = 135;
scene.fogEnd = 300;
const ambient = new B.HemisphericLight('soft sky',V(0,1,0),scene);
ambient.intensity = .68;
ambient.diffuse = new B.Color3(.82,.9,.86);
ambient.groundColor = new B.Color3(.25,.4,.35);
const sunshine = new B.DirectionalLight('sunshine',V(-.5,-1,.6),scene);
sunshine.intensity = .62;
sunshine.diffuse = new B.Color3(.97,.88,.77);
const camera = new B.FreeCamera('portrait diorama camera',V(0,CAMERA_HEIGHT,-CAMERA_BEHIND),scene);
camera.mode = B.Camera.ORTHOGRAPHIC_CAMERA;
camera.minZ = .05;
camera.maxZ = 650;
scene.activeCamera = camera;
function resizeCamera(){
  // Width-first composition: the FULL diorama is visible on any mobile screen.
  // Height follows the portrait aspect ratio and reveals only part of each glade.
  const f=widthLockedFrustum(engine.getRenderWidth(),Math.max(1,engine.getRenderHeight()),CAMERA_WORLD_WIDTH);
  camera.orthoLeft=f.left;
  camera.orthoRight=f.right;
  camera.orthoTop=f.top;
  camera.orthoBottom=f.bottom;
}
resizeCamera();
const world=createWorld(scene);
const director=new Director();
const keys=new Set();
const touch={dx:0,dy:0};
const ui={selectedClass:'caster'};
const spellFX=createSpellAnimator(scene,{maxEffects:145,
  reducedMotion:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false});
const pixi=new WildpathPixiCombat(canvas,scene,engine);
void pixi.init();
function spellStage(name,stage,point,intensity=1,cue='launch'){
  if(!point)return;
  if(stage==='sound'){spellFX.sound(name,cue);return;}
  if(pixi.ready)pixi.stage(name,stage,point,intensity);
  else spellFX.emit(name,stage,{x:point.x,z:point.z,y:point.y??1.32,intensity,
    directionX:point.dirX||0,directionZ:point.dirZ||0});
}
const game={
  state:'start',classId:'caster',spec:CLASS_DATA.caster,x:0,z:2,hp:100,maxHp:100,
  shield:0,time:0,actor:null,enemies:[],projectiles:[],effects:[],areas:[],
  texts:[],target:null,selectionRing:null,heroRing:null,upgrades:new Set(),score:0,kills:0,crits:0,
  combo:0,comboLife:0,recentHit:0,invulnerable:0,attackClock:0,
  cooldowns:[0,0,0],displayedScore:0,shake:0,toastClock:0,frame:0,gateQueued:false,recordAnnounced:false
};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const hitFlashColor=B.Color3.FromHexString('#fff2bc');
const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
const abilityButtons=[...document.querySelectorAll('#bottomHud .ability.special')];
const soundButton=$('soundButton');
function updateSoundButton(){
  if(!soundButton)return;
  soundButton.textContent=spellFX.muted?'♪̸':'♪';
  soundButton.setAttribute('aria-label',spellFX.muted?'Enable spell sounds':'Mute spell sounds');
  soundButton.setAttribute('aria-pressed',String(!spellFX.muted));
}
soundButton?.addEventListener('click',()=>{
  spellFX.setMuted(!spellFX.muted);
  updateSoundButton();
});
updateSoundButton();
function animateUI(el,keyframes,duration=300,easing='cubic-bezier(.2,.85,.2,1)'){
  if(!el||reducedMotion||!el.animate)return;
  el.animate(keyframes,{duration,easing});
}
function activeSpellFeedback(slot){
  const button=abilityButtons[slot];if(!button)return;
  button.classList.remove('is-ready');button.classList.add('is-cooling');
  animateUI(button,[
    {transform:'translateY(0) scale(1)',filter:'brightness(1.1)'},
    {transform:'translateY(4px) scale(.89)',filter:'brightness(1.7)',offset:.24},
    {transform:'translateY(0) scale(1.04)',filter:'brightness(1.22)',offset:.67},
    {transform:'translateY(0) scale(1)',filter:'brightness(1)'}
  ],275);
  game.shake=Math.max(game.shake,shakeStrength(slot===1?'heavy':'cast',reducedMotion));
}
function spellReadyFeedback(slot){
  const button=abilityButtons[slot];if(!button)return;
  button.classList.remove('is-cooling');button.classList.add('is-ready');
  animateUI(button,[
    {transform:'scale(.97)',filter:'brightness(1)'},
    {transform:'scale(1.18)',filter:'brightness(2.5)',offset:.36},
    {transform:'scale(1.02)',filter:'brightness(1.4)',offset:.7},
    {transform:'scale(1)',filter:'brightness(1)'}
  ],490);
}
function bumpScore(amount,source=null,reason='kill'){
  const points=Math.round(amount);
  if(!Number.isFinite(points)||points<=0)return;
  game.score+=points;
  const score=$('scoreText');
  animateUI(score,[
    {transform:'scale(1)',color:'#f3e8bd'},
    {transform:'scale(1.28)',color:'#fff9c6',offset:.35},
    {transform:'scale(1)',color:'#f3e8bd'}
  ],320);
  const host=$('scoreBursts');
  if(host){
    while(host.children.length>5)host.firstElementChild.remove();
    const pop=document.createElement('span');
    pop.className='score-burst '+(reason==='stage'?'score-stage':'');
    pop.textContent='+'+fmt(points)+(reason==='stage'?' ✦':'');
    if(reducedMotion)window.setTimeout(()=>pop.remove(),700);
    else pop.addEventListener('animationend',()=>pop.remove(),{once:true});
    host.append(pop);
  }
  if(source&&reason!=='stage'){
    floatingText({x:source.x,y:2.9,z:source.z},'+'+fmt(points),'score');
  }
  if(points>=1200)game.shake=Math.max(game.shake,shakeStrength('heavy',reducedMotion));
}
function updateJuice(dt){
  game.displayedScore=displayedScoreStep(game.displayedScore,game.score,dt);
  label('scoreText',fmt(game.displayedScore));
}

const bestKey=()=> 'wildpath-v01-best-'+game.classId;
function getBest(){try{return Number(localStorage.getItem(bestKey()))||0;}catch{return 0;}}
function saveBest(){try{if(game.score>getBest())localStorage.setItem(bestKey(),String(game.score));}catch{}}
function fmt(n){return Math.floor(n).toLocaleString('en-US');}
function label(id,value){$(id).textContent=value;}
function hideScreens(){for(const id of ['startScreen','boostScreen','resultScreen','pauseScreen'])$(id).hidden=true;}
function showScreen(id){hideScreens();$(id).hidden=false;}
function toast(message){label('toast',message);$('toast').classList.add('shown');game.toastClock=2.5;}
function releaseMesh(mesh){
  if(!mesh)return;
  // Transient VFX owns its materials: dispose them as well, or mobile GPUs
  // accumulate resources every time a projectile or impact expires.
  const materials=new Set();
  if(mesh.material)materials.add(mesh.material);
  for(const child of mesh.getChildMeshes?.()||[])if(child.material)materials.add(child.material);
  mesh.dispose(false,false);
  for(const material of materials)material.dispose();
}
function clearGame(){
  if(game.actor){game.actor.dispose();game.actor=null;}
  for(const e of game.enemies)e.actor.dispose();
  for(const p of game.projectiles)releaseMesh(p.mesh);
  for(const e of game.effects)releaseMesh(e.mesh);
  for(const a of game.areas){releaseMesh(a.mesh);releaseMesh(a.border);}
  for(const t of game.texts)t.el.remove();
  spellFX.clear();pixi.clear();
  releaseMesh(game.selectionRing);
  releaseMesh(game.heroRing);
  game.enemies=[];game.projectiles=[];game.effects=[];game.areas=[];game.texts=[];
  game.selectionRing=null;game.heroRing=null;
  $('scoreBursts').replaceChildren();
}
function startGame(){
  clearGame();director.reset();
  game.state='play';game.classId=ui.selectedClass;game.spec=CLASS_DATA[game.classId];
  game.x=pathX(2);game.z=2;game.hp=game.spec.hp;game.maxHp=game.hp;game.shield=0;
  game.time=0;game.attackClock=.25;game.cooldowns=[0,0,0];game.score=0;game.displayedScore=0;game.shake=0;
  game.kills=0;game.crits=0;game.combo=0;game.comboLife=0;game.recentHit=0;
  game.invulnerable=0;game.frame=0;game.gateQueued=false;game.recordAnnounced=false;game.advanceClock=0;
  game.target=null;game.upgrades=new Set();game.toastClock=0;
  spellFX.unlock(); // User gesture from New Game.
  game.actor=createActor(scene,game.classId);
  game.actor.root.scaling.setAll(1.48);
  game.actor.root.position.set(game.x,0,game.z);
  game.selectionRing=ring(scene,'target focus','#f4afa2',1.03,.075);
  game.selectionRing.isVisible=false;
  game.heroRing=vfxRing(scene,game.classId==='caster'?'#9af4f5':'#f3d2a1',.87,.13);
  game.heroRing.position.set(game.x,.21,game.z);
  label('className',game.spec.name);
  label('basicName',game.spec.basic);
  game.spec.spells.forEach((name,i)=>{
    label('spellName'+i,name);
    abilityButtons[i]?.classList.add('is-ready');
    abilityButtons[i]?.classList.remove('is-cooling');
  });
  label('scoreText','0');
  $('hud').hidden=false;
  hideScreens();
  // The hero starts on camera; no off-screen travel is ever required.
  camera.position.set(0,CAMERA_HEIGHT,cameraAnchorZ(game.z,CAMERA_BEHIND));
  camera.setTarget(V(0,0,camera.position.z+CAMERA_LOOK_DISTANCE));
  toast('Wild creatures approach! Your basic attack fires automatically.');
  canvas.focus();
}
// Automatic targeting is recalculated from nearby threats on every attack.
function currentTarget(range=game.spec.range+.5){
  game.target=chooseAutoTarget(game.enemies,game,range,game.target);
  return game.target;
}
function spawnEnemy(type){
  const stats=ENEMIES[type];
  let z=game.z+random(5,9),x=game.x+random(-5.5,5.5);
  if(Math.random()<.2){z=game.z-random(4,6);x=game.x+random(-4,4);}
  // Spawn near the hero, including when the player retreats into a previous glade.
  z=clamp(z,BOARD_START+1,Math.min(BOARD_END-1,director.gate-.5));
  ({x,z}=projectToRoad(x,z));
  const actor=createActor(scene,type,true);
  actor.root.scaling.scaleInPlace(1.27);
  const id='wild-'+game.frame+'-'+Math.floor(Math.random()*999999);
  const enemy={
    id,type,x,z,actor,alive:true,hp:stats.hp*(1+director.stage*.09),
    maxHp:stats.hp*(1+director.stage*.09),speed:stats.speed,recoil:0,
    attackClock:random(.4,1.3),slow:0,knockX:0,knockZ:0,flash:0,bob:Math.random()*6.28
  };
  actor.root.position.set(x,0,z);
  enemy.normalEmissive=actor.body.material.emissiveColor.clone();
  actor.root.metadata={...(actor.root.metadata||{}),enemyId:id};
  actor.root.getChildMeshes().forEach(m=>m.metadata={...(m.metadata||{}),enemyId:id});
  game.enemies.push(enemy);
}
game.spawnEnemy=spawnEnemy;
game.showToast=toast;
function floatingText(pos,value,kind='normal'){
  const el=document.createElement('div');
  el.className='float-damage '+kind;
  el.textContent=value;
  $('floaters').append(el);
  // Text fades upward; randomized horizontal offset makes crowd hits legible.
  game.texts.push({el,pos:V(pos.x+random(-.18,.18),pos.y,pos.z),life:kind==='crit'?.95:.73,total:kind==='crit'?.95:.73});
}
function scoreKill(enemy){
  game.kills++;
  game.combo=game.comboLife>0?game.combo+1:1;
  game.comboLife=5.5;
  const multiplier=1+Math.min(2,Math.floor(game.combo/5)*.2);
  bumpScore(ENEMIES[enemy.type].score*multiplier,enemy,'kill');
  const best=getBest();
  if(best>0&&!game.recordAnnounced&&game.score>=best*.9){
    game.recordAnnounced=true;toast('YOUR PERSONAL RECORD IS WITHIN REACH!');
  }
  if([5,10,20].includes(game.combo)){
    toast(String(game.combo)+' KILL STREAK!');
    animateUI($('comboText'),[
      {transform:'scale(1)',color:'#d5f1d7'},
      {transform:'scale(1.28)',color:'#fff0aa',offset:.45},
      {transform:'scale(1)',color:'#d5f1d7'}
    ],430);
  }
}
function ringBurst(x,z,color,scale=1){
  if(pixi.ready)return;
  const circle=vfxRing(scene,color,.50,.14);
  circle.position.set(x,.28,z);
  game.effects.push({mesh:circle,life:.38,total:.38,scale:Math.max(1.15,scale*1.6),particle:false});
  for(let i=0;i<4;i++){
    const dot=lightOrb(scene,color,.22);
    dot.position.set(x+random(-.72,.72),random(.5,2),z+random(-.72,.72));
    game.effects.push({mesh:dot,life:.32,total:.32,scale:.8,particle:true});
  }
}
function shardBurst(x,z,color,radius){
  if(pixi.ready)return;
  for(let i=0;i<5;i++){
    const angle=i*Math.PI*2/5;
    const m=crystal(scene,color,.28+Math.random()*.16);
    m.position.set(x+Math.sin(angle)*radius*.50,.72,z+Math.cos(angle)*radius*.50);
    m.rotation.z=Math.random()*.6-.3;
    game.effects.push({mesh:m,life:.34,total:.34,scale:1.05,particle:true});
  }
}
function hurtEnemy(e,base,options={}){
  if(!e||!e.alive)return;
  const boosted=(game.classId==='caster'&&game.upgrades.has('critchill'))||(game.classId==='melee'&&game.upgrades.has('critsteel'));
  const crit=Math.random()<(boosted?.24:.115);
  const amount=base*(crit?1.85:1);
  if(crit)game.crits++;
  e.hp-=amount;e.flash=crit?.26:.17;
  e.recoil=Math.max(e.recoil||0,crit?.28:.16);
  if(options.fxSpell){
    spellStage(options.fxSpell,'reaction',e,crit?1.25:.85);
    spellStage(options.fxSpell,'damage',{x:e.x,z:e.z,y:2.4},crit?1.45:.75);
  }
  floatingText({x:e.x,y:2.55,z:e.z},(crit?'CRIT! ':'')+Math.round(amount),crit?'crit':'normal');
  if(crit){
    game.shake=Math.max(game.shake,shakeStrength('crit',reducedMotion));
    if(game.effects.length<110)ringBurst(e.x,e.z,'#ffdf88',.64);
  }
  if(options.slow)e.slow=Math.max(e.slow,options.slow);
  if(options.push){
    const dx=e.x-game.x,dz=e.z-game.z,dist=Math.max(.1,Math.hypot(dx,dz));
    e.knockX+=dx/dist*options.push;e.knockZ+=dz/dist*options.push;
  }
  if(e.hp<=0){
    e.alive=false;scoreKill(e);
    ringBurst(e.x,e.z,e.type==='ember'?'#ffb49b':'#f8e7ab',1.15);
    game.shake=Math.max(game.shake,shakeStrength('kill',reducedMotion));
    if(game.target===e)game.target=null;
  }
}
function hurtPlayer(amount){
  if(game.state!=='play'||game.invulnerable>0)return;
  const absorb=Math.min(game.shield,amount);
  game.shield-=absorb;game.hp=Math.max(0,game.hp-(amount-absorb));
  game.invulnerable=.38;game.recentHit=2.3;
  game.shake=Math.max(game.shake,shakeStrength('playerHit',reducedMotion));
  animateUI($('damageTint'),[{opacity:0},{opacity:.18,offset:.25},{opacity:0}],380);
  floatingText({x:game.x,y:2.5,z:game.z},absorb===amount?'BLOCK':'-'+Math.round(amount-absorb),'hurt');
  if(game.hp<=0)finish(false);
}
function projectile(target,damage,color='#99dce6',hostile=false){
  const mesh=magicProjectile(scene,color,hostile?.54:.67);
  const x=hostile?target.x:game.x,z=hostile?target.z:game.z;
  const destination=hostile?game:target;
  mesh.position.set(x,1.5,z);
  game.projectiles.push({mesh,x,z,y:1.5,damage,target:destination,hostile,life:3.8,speed:hostile?9:17,trail:0});
}
function icePool(x,z){
  const big=game.upgrades.has('snowfield');
  const radius=big?4.6:3.2;
  const pool=visibleGroundPool(scene,'#7ec7e4',radius);
  const mesh=pool.floor,border=pool.edge;
  if(pixi.ready){mesh.isVisible=false;border.isVisible=false;}
  mesh.position.set(x,.21,z);
  border.position.set(x,.25,z);
  ringBurst(x,z,'#d4fbff',1.8);
  game.areas.push({x,z,radius,life:big?7.5:5.5,tick:0,damage:big?11:6,slow:2.5,mesh,border});
}
function cast(slot){
  if(game.state!=='play'||game.cooldowns[slot]>0)return;
  const caster=game.classId==='caster';
  const targeted=(caster&&slot!==2)||(!caster&&slot===1);
  const target=currentTarget(targeted?17:game.spec.range+.5);
  if(targeted&&!target)return;
  game.cooldowns[slot]=game.spec.cooldowns[slot];
  activeSpellFeedback(slot);
  const spellName=game.spec.spells[slot];
  spellStage(spellName,'charge',game);
  spellStage(spellName,'sound',game,1,'launch');
  if(caster){
    if(slot===0){
      spellStage('Winter Pool','core',target,.80);
      spellStage('Winter Pool','trail',target,.8);
      icePool(target.x,target.z);
      spellStage('Winter Pool','burst',target,1.45);
      spellStage('Winter Pool','aftermath',target,1.5);
      spellStage('Winter Pool','sound',target,1,'impact');
    }
    if(slot===1){
      const big=game.upgrades.has('bloom');
      // Grounded crystal blast: short seed pulse and sharp radial burst, no beam.
      spellStage('Crystal Bloom','core',target,1.1);
      spellStage('Crystal Bloom','burst',target,big?1.65:1.25);
      shardBurst(target.x,target.z,'#bbaffb',big?3.55:2.7);
      for(const e of game.enemies)if(e.alive&&distance(e,target)<(big?4.6:3.4))
        hurtEnemy(e,big?38:29,{slow:1.2,fxSpell:'Crystal Bloom'});
      spellStage('Crystal Bloom','aftermath',target,big?1.15:.88);
      spellStage('Crystal Bloom','sound',target,1,'impact');
    }
    if(slot===2){
      const strong=game.upgrades.has('shield');
      game.shield=Math.max(game.shield,strong?65:42);
      game.invulnerable=.42;
      spellStage('Pale Guard','core',game,1);
      spellStage('Pale Guard','trail',game,1.1);
      spellStage('Pale Guard','burst',game,strong?1.7:1.2);
      if(!pixi.ready){
        const dome=shieldDome(scene,strong?2.2:1.7);
        dome.position.set(game.x,1.46,game.z);
        game.effects.push({mesh:dome,life:.85,total:.85,scale:1.0,particle:false});
      }
      if(strong)for(const e of game.enemies)if(e.alive&&distance(e,game)<4.5)e.slow=Math.max(e.slow,2.7);
      spellStage('Pale Guard','aftermath',game,1.2);
      spellStage('Pale Guard','damage',game,.85); // Defence feedback, no damage dealt.
      floatingText({x:game.x,y:2.8,z:game.z},'GUARD','heal');
    }
  }else{
    if(slot===0){
      const big=game.upgrades.has('cleave'),radius=big?5.2:3.9;
      spellStage('Wide Arc','core',game,1.15);
      spellStage('Wide Arc','burst',game,big?1.8:1.35);
      const dir=game.actor.root.rotation.y;
      if(!pixi.ready){
        const sweep=meleeSlash(scene,game.x,game.z,dir,'#fff0bd',radius*.68);
        game.effects.push({mesh:sweep,life:.26,total:.26,scale:1.0,particle:false});
      }
      spellStage('Wide Arc','trail',game,1.3);
      let hits=0;
      for(const e of game.enemies)if(e.alive&&distance(e,game)<radius){
        hurtEnemy(e,big?41:32,{push:1.5,fxSpell:'Wide Arc'});hits++;
      }
      spellStage('Wide Arc','aftermath',game,1.1);
      if(hits>=4)bumpScore(120,game,'bonus');
    }
    if(slot===1){
      spellStage('Rushstrike','core',game,.9);
      const dx=target.x-game.x,dz=target.z-game.z,dist=Math.max(.01,Math.hypot(dx,dz));
      const leap=Math.min(8,Math.max(0,dist-1.4));
      // Rush follows the street; it must not jump across meadow plots or walls.
      for(let moved=0;moved<leap;moved+=.25){
        const stepSize=Math.min(.25,leap-moved);
        const allowedZ=clamp(game.z+dz/dist*stepSize,0,director.ready?director.gate:director.gate-2.3)-game.z;
        const step=moveOnRoad(game.x,game.z,dx/dist*stepSize,allowedZ);
        if(step.x===game.x&&step.z===game.z)break;
        game.x=step.x;game.z=step.z;
        if(moved%1<.25)spellStage('Rushstrike','trail',game,.64);
      }
      hurtEnemy(target,36,{push:2,fxSpell:'Rushstrike'});
      spellStage('Rushstrike','burst',game,game.upgrades.has('rush')?1.75:1.10);
      spellStage('Rushstrike','aftermath',game,1.0);
      if(game.upgrades.has('rush'))
        for(const e of game.enemies)if(e!==target&&e.alive&&distance(e,game)<4.2)
          hurtEnemy(e,22,{push:2,fxSpell:'Rushstrike'});
    }
    if(slot===2){
      const big=game.upgrades.has('quake'),radius=big?7:5;
      spellStage('Earthwake','core',game,1.1);
      spellStage('Earthwake','trail',game,1.2);
      spellStage('Earthwake','burst',game,big?2:1.5);
      if(!pixi.ready){
        const quake=vfxRing(scene,'#ffe6b7',radius*.85,.21);
        quake.position.set(game.x,.26,game.z);
        game.effects.push({mesh:quake,life:.52,total:.52,scale:1.25,particle:false});
      }
      for(const e of game.enemies)if(e.alive&&distance(e,game)<radius)
        hurtEnemy(e,25,{push:big?5:3,fxSpell:'Earthwake'});
      spellStage('Earthwake','aftermath',game,big?1.5:1.1);
      game.invulnerable=.55;
    }
  }
}
function basicAttack(){
  const target=currentTarget();
  if(!target||distance(game,target)>game.spec.range)return;
  game.actor.root.rotation.y=Math.atan2(target.x-game.x,target.z-game.z);
  if(game.classId==='caster'){
    spellStage('Glint Dart','charge',game,.75);
    spellStage('Glint Dart','core',game,.8);
    spellStage('Glint Dart','sound',game,1,'launch');
    const count=game.upgrades.has('triple')?3:game.upgrades.has('double')?2:1;
    const volley=chooseVolleyTargets(game.enemies,game,game.spec.range,count,target);
    for(let i=0;i<volley.length;i++){
      const shotTarget=volley[i];
      const shot=magicProjectile(scene,i%2?'#c2f4f0':'#99dce6',.54);
      const offset=(i-(volley.length-1)/2)*.36;
      shot.position.set(game.x+offset,1.5,game.z);
      if(pixi.ready){shot.isVisible=false;
        for(const child of shot.getChildMeshes())child.isVisible=false;}
      game.projectiles.push({mesh:shot,x:game.x+offset,y:1.5,z:game.z,target:shotTarget,life:3.6,speed:17,
        damage:game.spec.baseDamage*(game.upgrades.has('triple')?1.14:1),
        hostile:false,trail:0,spell:'Glint Dart',fxSeed:game.frame*17+i*31});
    }
  }else{
    const reach=game.upgrades.has('arc')?3.8:2.95;
    spellStage('Steel Arc','charge',game,.7);
    spellStage('Steel Arc','core',game,.85);
    spellStage('Steel Arc','trail',game,1);
    spellStage('Steel Arc','burst',target,.85);
    spellStage('Steel Arc','sound',game,1,'launch');
    if(!pixi.ready){
      const arc=meleeSlash(scene,game.x,game.z,game.actor.root.rotation.y,'#f8dfa6',reach*.85);
      game.effects.push({mesh:arc,life:.22,total:.22,scale:1.05,particle:false});
    }
    const sword=game.actor.root.metadata?.sword;
    if(sword)sword.rotation.z=-.6;
    const dx=target.x-game.x,dz=target.z-game.z;
    for(const e of game.enemies)if(e.alive&&distance(e,game)<reach){
      const vx=e.x-game.x,vz=e.z-game.z;
      const d=Math.max(.01,Math.hypot(vx,vz)*Math.hypot(dx,dz));
      if((vx*dx+vz*dz)/d>.12)hurtEnemy(e,game.spec.baseDamage,{push:.35,fxSpell:'Steel Arc'});
    }
    spellStage('Steel Arc','aftermath',target,.7);
    if(game.upgrades.has('echo')){
      const d=Math.max(.01,Math.hypot(dx,dz));
      const endpoint={x:game.x+dx/d*5.6,z:game.z+dz/d*5.6};
      ringBurst(endpoint.x,endpoint.z,'#f5cba0',1.8);
      for(const e of game.enemies)if(e.alive&&distance(e,endpoint)<1.9)hurtEnemy(e,8,{fxSpell:'Steel Arc'});
    }
  }
}
function updatePlayer(dt){
  let x=0,z=0;
  if(keys.has('KeyA')||keys.has('ArrowLeft'))x--;
  if(keys.has('KeyD')||keys.has('ArrowRight'))x++;
  if(keys.has('KeyW')||keys.has('ArrowUp'))z++;
  if(keys.has('KeyS')||keys.has('ArrowDown'))z--;
  x+=touch.dx;z-=touch.dy;
  const len=Math.hypot(x,z);
  if(len>.03){
    x/=Math.max(1,len);z/=Math.max(1,len);
    const dz=nextTravelZ(game.z,z*game.spec.speed*dt,director.stage,director.ready,STAGE_GATES,BOARD_START)-game.z;
    const step=moveOnRoad(game.x,game.z,x*game.spec.speed*dt,dz);
    game.x=step.x;
    game.z=step.z;
  }
  game.actor.root.position.set(game.x,Math.sin(game.time*12)*(len>.1?.06:.015),game.z);
  game.heroRing.position.set(game.x,.20,game.z);
  game.heroRing.scaling.setAll(1+Math.sin(game.time*4)*.065);
  game.actor.leftArm.rotation.x=len>.1?Math.sin(game.time*12)*.2:0;
  game.actor.rightArm.rotation.x=len>.1?-Math.sin(game.time*12)*.2:0;
  const sword=game.actor.root.metadata?.sword;
  if(sword)sword.rotation.z+=(0-sword.rotation.z)*Math.min(1,dt*10);
  // The camera follows the actual player north AND south. Retreating never leaves
  // the hero outside the portrait viewport, even across a previous stage.
  const p=V(0,CAMERA_HEIGHT,cameraAnchorZ(game.z,CAMERA_BEHIND));
  camera.position=B.Vector3.Lerp(camera.position,p,Math.min(1,dt*7.2));
  // Light directional camera impulse, decaying quickly, never changing the base framing.
  game.shake=Math.max(0,game.shake-dt*1.45);
  camera.position.x=Math.sin(game.time*83)*game.shake*.62;
  camera.setTarget(V(camera.position.x,0,camera.position.z+CAMERA_LOOK_DISTANCE));
  const target=currentTarget();
  if(target){
    game.actor.root.rotation.y=Math.atan2(target.x-game.x,target.z-game.z);
    game.selectionRing.isVisible=true;game.selectionRing.position.set(target.x,.11,target.z);
    game.selectionRing.scaling.setAll(1+Math.sin(game.time*5)*.055);
  }else game.selectionRing.isVisible=false;
  game.attackClock-=dt;
  if(game.attackClock<=0){
    basicAttack();game.attackClock=game.spec.attackSpeed*(game.upgrades.has('tempo')?.75:1);
  }
  for(let i=0;i<3;i++){
    const previous=game.cooldowns[i];
    game.cooldowns[i]=Math.max(0,previous-dt);
    if(justRecharged(previous,game.cooldowns[i]))spellReadyFeedback(i);
  }
  game.recentHit=Math.max(0,game.recentHit-dt);
  game.invulnerable=Math.max(0,game.invulnerable-dt);
  game.comboLife=Math.max(0,game.comboLife-dt);
  if(game.comboLife===0)game.combo=0;
  if(director.ready){
    game.advanceClock+=dt;
    if(game.advanceClock>1.25)completeStage();
  }else game.advanceClock=0;
}
function updateEnemies(dt){
  for(const e of game.enemies){
    if(!e.alive)continue;
    e.attackClock-=dt;e.slow=Math.max(0,e.slow-dt);e.flash=Math.max(0,e.flash-dt);e.recoil=Math.max(0,(e.recoil||0)-dt*2.4);
    const dx=game.x-e.x,dz=game.z-e.z,d=Math.max(.01,Math.hypot(dx,dz));
    let mx=0,mz=0;
    if(d>ENEMIES[e.type].range*.88){mx=dx/d;mz=dz/d;}
    else if(e.type==='ember'&&d<5){mx=-dx/d;mz=-dz/d;}
    for(const other of game.enemies){
      if(e===other||!other.alive)continue;
      const ox=e.x-other.x,oz=e.z-other.z,dist=Math.hypot(ox,oz);
      if(dist>0&&dist<1.5){mx+=ox/dist*.55;mz+=oz/dist*.55;}
    }
    const norm=Math.max(1,Math.hypot(mx,mz));
    const speed=e.speed*(e.slow>0?.43:1);
    e.x+=(mx/norm*speed+e.knockX*3)*dt;
    e.z+=(mz/norm*speed+e.knockZ*3)*dt;
    e.knockX*=Math.exp(-7*dt);e.knockZ*=Math.exp(-7*dt);
    e.actor.root.position.set(e.x,Math.sin(game.time*4+e.bob)*.05+e.recoil*.55,e.z);
    e.actor.root.rotation.y=Math.atan2(dx,dz);
    e.actor.rightArm.rotation.x=Math.sin(game.time*5+e.bob)*.22;
    e.actor.body.scaling.x=e.flash>0?1.12:1;
    e.actor.body.scaling.y=1-e.recoil*.25;
    e.actor.body.material.emissiveColor.copyFrom(e.flash>0?hitFlashColor:e.normalEmissive);
    if(d<ENEMIES[e.type].range&&e.attackClock<=0){
      e.attackClock=ENEMIES[e.type].cooldown*random(.88,1.12);
      if(e.type==='ember'){
        const p=magicProjectile(scene,'#f5a36e',.59);p.position.set(e.x,1.4,e.z);
        game.projectiles.push({mesh:p,x:e.x,y:1.4,z:e.z,target:game,damage:ENEMIES[e.type].damage,
          hostile:true,life:3.5,speed:9,trail:0});
      }else{hurtPlayer(ENEMIES[e.type].damage);ringBurst(game.x,game.z,'#f3c0a8',.8);}
    }
  }
  for(let i=game.enemies.length-1;i>=0;i--){
    if(!game.enemies[i].alive){game.enemies[i].actor.dispose();game.enemies.splice(i,1);}
  }
}
function updateProjectiles(dt){
  for(let i=game.projectiles.length-1;i>=0;i--){
    const p=game.projectiles[i];
    p.life-=dt;
    if(p.life<=0||(!p.hostile&&!p.target.alive)){
      releaseMesh(p.mesh);game.projectiles.splice(i,1);continue;
    }
    const dx=p.target.x-p.x,dz=p.target.z-p.z,dy=1.1-p.y;
    const d=Math.max(.01,Math.hypot(dx,dz,dy)),step=p.speed*dt;
    if(d<=step+.25){
      if(p.hostile)hurtPlayer(p.damage);
      else{
        const spell=p.spell||'Glint Dart';
        spellStage(spell,'burst',p.target,.80);
        hurtEnemy(p.target,p.damage,{fxSpell:spell});
        spellStage(spell,'aftermath',p.target,.64);
        spellStage(spell,'sound',p.target,1,'impact');
      }
      if(p.hostile)ringBurst(p.target.x,p.target.z,'#efb99e',.7);
      releaseMesh(p.mesh);game.projectiles.splice(i,1);
      continue;
    }
    p.x+=dx/d*step;p.z+=dz/d*step;p.y+=dy/d*step;
    p.dirX=dx/d;p.dirZ=dz/d;
    p.mesh.position.set(p.x,p.y,p.z);
    if(pixi.ready&&!p.hostile){
      p.mesh.isVisible=false;
      for(const child of p.mesh.getChildMeshes())child.isVisible=false;
    }
    p.trail-=dt;
    if(p.trail<=0){
      if(p.hostile){
        const dot=lightOrb(scene,'#f4d4c0',.22);
        dot.position=p.mesh.position.clone();
        game.effects.push({mesh:dot,life:.19,total:.19,scale:.55,particle:true});
      }else if(!pixi.ready)spellStage(p.spell||'Glint Dart','trail',p,.72);
      p.trail=.065;
    }
  }
}
function updateEffects(dt){
  for(let i=game.effects.length-1;i>=0;i--){
    const e=game.effects[i];e.life-=dt;
    if(e.life<=0){releaseMesh(e.mesh);game.effects.splice(i,1);continue;}
    const t=1-e.life/e.total;
    if(e.particle){e.mesh.scaling.setAll((1-t)*e.scale);e.mesh.position.y+=dt*.45;}
    else{e.mesh.scaling.setAll(.5+t*e.scale);e.mesh.material.alpha=.76*(1-t);}
  }
  for(let i=game.areas.length-1;i>=0;i--){
    const a=game.areas[i];a.life-=dt;a.tick-=dt;
    if(a.tick<=0){
      a.tick=.65;
      for(const e of game.enemies)if(e.alive&&distance(e,a)<a.radius)
        hurtEnemy(e,a.damage,{slow:a.slow,fxSpell:'Winter Pool'});
    }
    if(pixi.ready){a.mesh.isVisible=false;a.border.isVisible=false;}
    if(a.life<=0){releaseMesh(a.mesh);releaseMesh(a.border);game.areas.splice(i,1);}
  }
  const view=camera.viewport.toGlobal(engine.getRenderWidth(),engine.getRenderHeight());
  for(let i=game.texts.length-1;i>=0;i--){
    const t=game.texts[i];t.life-=dt;t.pos.y+=dt*1.3;
    const p=B.Vector3.Project(t.pos,B.Matrix.Identity(),scene.getTransformMatrix(),view);
    t.el.style.left=(p.x/engine.getRenderWidth()*100)+'%';
    t.el.style.top=(p.y/engine.getRenderHeight()*100)+'%';
    t.el.style.opacity=Math.max(0,t.life/t.total).toString();
    if(t.life<=0){t.el.remove();game.texts.splice(i,1);}
  }
}
function pickBoosts(){
  const pool=BOOSTS.filter(b=>b.classes.includes(game.classId)&&!game.upgrades.has(b.id));
  const picks=[];
  while(picks.length<3&&pool.length){
    const i=Math.floor(Math.random()*pool.length);
    picks.push(pool.splice(i,1)[0]);
  }
  return picks;
}
function completeStage(){
  if(game.gateQueued)return;
  game.gateQueued=true;
  bumpScore(1250+director.stage*450,null,'stage');
  game.hp=Math.min(game.maxHp,game.hp+23);
  if(director.stage>=3){finish(true);return;}
  game.state='boost';
  const wrap=$('boostOptions');wrap.innerHTML='';
  for(const item of pickBoosts()){
    const btn=document.createElement('button');btn.className='boost-card';
    const icon=document.createElement('span');icon.className='boost-icon';icon.textContent=item.icon;
    const title=document.createElement('strong');title.textContent=item.name;
    const desc=document.createElement('span');desc.textContent=item.desc;
    btn.append(icon,title,desc);
    btn.addEventListener('click',()=>{
      game.upgrades.add(item.id);
      if(item.id==='mend'){game.maxHp+=35;game.hp=Math.min(game.maxHp,game.hp+45);}
      // Blessings do not teleport the hero. Another wave starts where they stand.
      director.next();
      const settled=positionAfterBlessing(game);
      game.x=settled.x;game.z=settled.z;game.advanceClock=0;
      game.target=null;
      game.gateQueued=false;game.state='play';
      hideScreens();toast(item.name+' · New blessing!');
      canvas.focus();
    });
    wrap.append(btn);
  }
  showScreen('boostScreen');
}
function finish(success){
  if(game.state==='result')return;
  game.state='result';
  const oldBest=getBest();saveBest();
  label('resultEyebrow',success?'JOURNEY COMPLETE':'THE WILDS CLAIMED THIS RUN');
  label('resultHeading',success?'A trail well walked.':'Every path teaches something.');
  label('resultScore',fmt(game.score));
  label('resultSummary',game.score>=oldBest?'✦ NEW PERSONAL BEST ✦':'BEST '+fmt(oldBest));
  label('resultStats',game.kills+' defeated · '+game.crits+' critical strikes · '+Math.floor(game.time/60)+'m '+Math.floor(game.time%60)+'s');
  $('hud').hidden=true;showScreen('resultScreen');
}
function updateHud(){
  label('timeText',String(Math.floor(game.time/60)).padStart(2,'0')+':'+String(Math.floor(game.time%60)).padStart(2,'0'));
  label('stageName','GLADE '+(director.stage+1)+' / 4');
  label('directorLabel',director.stateLabel);
  label('healthText',Math.ceil(game.hp)+' / '+game.maxHp+(game.shield>0?' · Shield '+Math.round(game.shield):''));
  $('healthFill').style.width=(game.hp/game.maxHp*100)+'%';
  label('comboText',game.combo>1?'COMBO '+game.combo:'x1.0');
  label('bestText','BEST '+fmt(getBest()));
  label('goal',director.ready?'GLADE CLEAR · Choose a blessing':'SURVIVE THE WILDS · '+STAGE_NAMES[director.stage]);
  // No target card is needed: the closest threat is chosen automatically.
  for(let i=0;i<3;i++){
    const cd=$('cooldown'+i),time=game.cooldowns[i],button=abilityButtons[i];
    const busy=time>.001;
    cd.style.display=busy?'flex':'none';cd.textContent=busy?time.toFixed(1):'';
    cd.style.setProperty('--remaining',cooldownFill(time,game.spec.cooldowns[i])+'%');
    button?.classList.toggle('is-ready',!busy);
    button?.classList.toggle('is-cooling',busy);
    if(button){
      button.setAttribute('aria-label',game.spec.spells[i]+(busy?', ready in '+time.toFixed(1)+' seconds':', ready'));
    }
  }
}
let hudTime=0;
function update(dt){
  game.frame++;game.time+=dt;
  if(game.toastClock>0){
    game.toastClock-=dt;
    if(game.toastClock<=0)$('toast').classList.remove('shown');
  }
  updatePlayer(dt);
  director.tick(dt,game);
  updateEnemies(dt);
  updateProjectiles(dt);
  updateEffects(dt);
  spellFX.tick(dt);
  updateJuice(dt);
  hudTime-=dt;
  if(hudTime<=0){updateHud();hudTime=.12;}
}
let previous=performance.now();
engine.runRenderLoop(()=>{
  const now=performance.now(),dt=Math.min(.05,(now-previous)/1000||0);
  previous=now;
  if(game.state==='play')update(dt);
  scene.render();
  pixi.update(dt,game);
});
window.addEventListener('resize',()=>{engine.resize();resizeCamera();pixi.resize();});
window.addEventListener('blur',()=>keys.clear());
window.addEventListener('keydown',e=>{
  if(['Tab','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  if(game.state==='play'&&['Digit1','Digit2','Digit3'].includes(e.code))cast(Number(e.code.slice(-1))-1);
  if(e.code==='Escape'){
    if(game.state==='play'){game.state='pause';showScreen('pauseScreen');}
    else if(game.state==='pause'){game.state='play';hideScreens();}
  }
  keys.add(e.code);
});
window.addEventListener('keyup',e=>keys.delete(e.code));
scene.onPointerObservable.add(info=>{
  if(info.type!==B.PointerEventTypes.POINTERDOWN||game.state!=='play')return;
  // Clicking the world never locks a target; combat is positioning-based.
});
document.querySelectorAll('[data-class]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    ui.selectedClass=btn.dataset.class;
    document.querySelectorAll('[data-class]').forEach(el=>el.classList.toggle('selected',el===btn));
  });
});
document.querySelectorAll('[data-slot]').forEach(btn=>btn.addEventListener('click',()=>cast(Number(btn.dataset.slot))));
$('playButton').addEventListener('click',startGame);
$('retryButton').addEventListener('click',startGame);
$('menuButton').addEventListener('click',()=>{clearGame();game.state='start';showScreen('startScreen');$('hud').hidden=true;});
$('pauseButton').addEventListener('click',()=>{if(game.state==='play'){game.state='pause';showScreen('pauseScreen');}});
$('resumeButton').addEventListener('click',()=>{game.state='play';hideScreens();canvas.focus();});
$('quitButton').addEventListener('click',()=>finish(false));
const coarse=matchMedia('(hover: none) and (pointer: coarse)').matches;
if(coarse){
  $('touchControls').hidden=false;
  const joy=$('joystick'),stick=$('stick');
  function moveJoy(e){
    const box=joy.getBoundingClientRect();
    const dx=e.clientX-(box.left+box.width/2),dy=e.clientY-(box.top+box.height/2);
    const d=Math.hypot(dx,dy),radius=box.width*.33,norm=Math.max(radius,d);
    touch.dx=dx/norm;touch.dy=dy/norm;
    stick.style.transform='translate('+(touch.dx*radius)+'px,'+(touch.dy*radius)+'px)';
  }
  joy.addEventListener('pointerdown',e=>{joy.setPointerCapture(e.pointerId);moveJoy(e);});
  joy.addEventListener('pointermove',e=>{if(joy.hasPointerCapture(e.pointerId))moveJoy(e);});
  function stopJoy(){touch.dx=0;touch.dy=0;stick.style.transform='';}
  joy.addEventListener('pointerup',stopJoy);
  joy.addEventListener('pointercancel',stopJoy);
}
