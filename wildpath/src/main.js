import { CLASS_DATA, BOOSTS, ENEMIES, STAGE_NAMES, STAGE_GATES, clamp, random } from './config.js?v=2.3.0';
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
import { WildpathPixiCombat } from './pixi-combat.js?v=2.6.0';
import {createOpenWorld} from './world-open.js?v=2.5.0';
import {OpenDirector} from './director-open.js?v=2.3.0';
import {WILD_RADIUS,WILD_CAMERA_WIDTH,freeStep,openSpawnPoint,energyThreshold,energyProgress} from './open-layout.js?v=2.0.0';
import {makeNatureLedger,recordNatureKill} from './nature-rebirth.js?v=2.3.0';
import {NatureGrowth} from './nature-growth.js?v=2.6.1';
import {LivingWater} from './living-water.js?v=2.7.3';
import {visibleWaterSpell,waterBoostName,waterBoostDescription} from './water-life.js?v=2.7.0';
import {casterVolley,casterGlintDamage,casterBloom,casterPool,glintSplash,cascadePower,choosePowerBoosts} from './power-growth.js?v=2.3.1';
import {isWillowglowPreviewRequested,mountWillowglowPreview} from './willowglow-preview.js?v=1.0.0';
const OPEN_WORLD=new URLSearchParams(location.search).get('world')!=='classic';
const WILLOWGLOW_PREVIEW=isWillowglowPreviewRequested(location.search,OPEN_WORLD);
const CAMERA_WORLD_WIDTH=OPEN_WORLD?WILD_CAMERA_WIDTH:33.2;

const B = window.BABYLON;
const $ = id => document.getElementById(id);
if (!B) {
  $('startScreen').hidden = true;
  $('loadError').hidden = false;
  throw new Error('Babylon.js could not be loaded');
}
const V = (x,y,z) => new B.Vector3(x,y,z);
document.body.classList.toggle('wildpath-open',OPEN_WORLD);
$('energyPanel').hidden=!OPEN_WORLD;
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
const world=OPEN_WORLD?createOpenWorld(scene):createWorld(scene);
// Opt-in real-world art review: one Willowglow near the playable start.
// The production camera, movement and existing nature placements do not change.
const willowglow= WILLOWGLOW_PREVIEW ? mountWillowglowPreview(B,scene) : null;
$('willowglowPreviewNote').hidden=!WILLOWGLOW_PREVIEW;
const director=OPEN_WORLD?new OpenDirector():new Director();
if(OPEN_WORLD){
  scene.clearColor=B.Color4.FromHexString('#253c33ff');
  scene.fogColor=B.Color3.FromHexString('#253c33');
  scene.fogStart=83;scene.fogEnd=165;
}
const keys=new Set();
const touch={dx:0,dy:0};
const ui={selectedClass:'caster'};
const spellFX=createSpellAnimator(scene,{maxEffects:145,
  reducedMotion:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false});
const pixi=new WildpathPixiCombat(canvas,scene,engine);
pixi.enableSlashFrames=!OPEN_WORLD; // Glintweaver-only mode never downloads melee sprites.
void pixi.init();
// Only the open world has living scenery. The original game stays intact.
let natureLedger=makeNatureLedger();
const nature=OPEN_WORLD?new NatureGrowth(scene,{onBloom:(event,upgraded)=>{
  pixi.stage('Nature Bloom','burst',{x:event.x,z:event.z,y:.6,
    color:event.fxColor},
    event.tier==='blossom'?2.12:event.tier==='tree'?1.82:event.tier==='bush'?1.35:.83);
  if(upgraded){
    const names={bush:'✿ BUSH',tree:'🌳 TREE',blossom:'🌸 BLOOM!'};
    floatingText({x:event.x,y:2.8,z:event.z},names[event.tier]||'✿ BLOOM','nature');
  }
},onFusion:event=>{
  pixi.stage('Nature Fusion','burst',{x:event.x,z:event.z,y:.22,
    color:event.kind==='enchanted'?0xcdb1ee:event.kind==='grove'?0xbce6af:0xcde6a4},
    event.kind==='enchanted'?1.75:1.15);
  const labels={meadow:'✿ MEADOW',thicket:'❀ FLOWERS',
    grove:'🌳 GROVE',enchanted:'✧ MAGIC GROVE'};
  floatingText({x:event.x,y:2.15,z:event.z},labels[event.kind],'nature');
}}):null;
const water=OPEN_WORLD?new LivingWater(scene,{onPond:e=>{
  pixi.stage('Living Pond','burst',{x:e.x,z:e.z,y:.20,color:0x9beee5},
    e.rare?1.5:1.05);
  floatingText({x:e.x,z:e.z,y:2.0},e.rare?'✧ LILY POND':'≈ POND','nature');
}}):null;
function spellStage(name,stage,point,intensity=1,cue='launch'){
  if(!point)return;
  if(stage==='sound'){spellFX.sound(name,cue);return;}
  if(pixi.ready)pixi.stage(visibleWaterSpell(name,OPEN_WORLD),stage,point,intensity);
  else spellFX.emit(name,stage,{x:point.x,z:point.z,y:point.y??1.32,intensity,
    directionX:point.dirX||0,directionZ:point.dirZ||0});
}
const game={
  state:'start',classId:'caster',spec:CLASS_DATA.caster,x:0,z:2,hp:100,maxHp:100,
  shield:0,time:0,actor:null,enemies:[],projectiles:[],effects:[],areas:[],
  texts:[],pickups:[],energy:0,lastPickupSound:-10,surgeCelebrated:false,target:null,selectionRing:null,heroRing:null,upgrades:new Set(),score:0,kills:0,crits:0,
  combo:0,comboLife:0,recentHit:0,invulnerable:0,attackClock:0,
  cooldowns:[0,0,0],displayedScore:0,shake:0,toastClock:0,frame:0,gateQueued:false,recordAnnounced:false,
  waterSurfaces:[]
};
// Read-only instrumentation for manual QA and browser smoke tests (?debug=1).
if(new URLSearchParams(location.search).has('debug')){
  window.__wildpathDebug=Object.freeze({
    read:()=>({
      mode:OPEN_WORLD?'open':'classic',state:game.state,x:game.x,z:game.z,
      health:game.hp,energy:game.energy,stage:director.stage,
      enemies:game.enemies.filter(e=>e.alive).length,pickups:game.pickups.length,
      score:game.score,cameraX:camera.position.x,cameraZ:camera.position.z,
      pixiReady:pixi.ready,pixiFailed:pixi.failed,
      nature:nature?.snapshot()??null,water:water?.snapshot()??null,
      willowglow:willowglow?{version:willowglow.version,position:willowglow.position,
        scale:willowglow.scale,meshes:willowglow.meshes,leaves:willowglow.stats.leaves}:null
    }),
    // Debug-only illustration/test: ten local simulated kills create one tree.
    // No score, combat, health, loot or permanent progression is changed.
    previewNature:(count=10)=>{
      if(!nature||game.state!=='play')return null;
      const demo=makeNatureLedger();
      demo.nextId=natureLedger.nextId+5000;
      const at=game.time+.01;
      for(let i=0;i<Math.min(10,Math.max(1,count));i++){
        const e=recordNatureKill(demo,{x:game.x+4,z:game.z+3,
          type:'bramble',time:at+i*.035});
        nature.apply(e,game);
      }
      return nature.snapshot();
    },
    // Visual QA only: a color/shape gallery showing six species-independent
    // palettes and escalating plant sizes, without modifying the game build.
    previewNatureGallery:()=>{
      if(!nature||game.state!=='play')return null;
      const at=game.time+.01,seed=makeNatureLedger();
      seed.nextId=6001;
      for(let i=0;i<6;i++){
        const angle=i*Math.PI/3;
        const x=game.x+Math.cos(angle)*10.1;
        const z=game.z+Math.sin(angle)*10.1;
        const kills=i===0?1:i===1?3:i===2?6:10;
        for(let k=0;k<kills;k++){
          const e=recordNatureKill(seed,{x,z,time:at+i*2+k*.03,
            type:'mossling'});
          nature.apply(e,game);
        }
      }
      return nature.snapshot();
    },
    // Test-only separate plants for a real asynchronous fusion sequence.
    previewFusionGarden:()=>{
      // Visual QA runs even while an unrelated Power Surge selection is paused.
      if(!nature)return null;
      const before=nature.snapshot();
      const center={x:game.x+8.6,z:game.z+4.8};
      const id=9000+Math.floor(game.time)*100;
      for(let i=0;i<7;i++){
        const angle=i*2.399963;
        nature.apply({kind:'create',id:id+i,
          x:center.x+Math.cos(angle)*1.7,
          z:center.z+Math.sin(angle)*1.55,
          tier:i===0?'bush':'flower',species:'mossling'},game);
      }
      return {before,after:nature.snapshot()};
    },
    // Advances the production NatureGrowth animation/controller only, never
    // invents kills, plants, boosts or changes the actual combat simulator.
    advanceNature:(seconds=3.7)=>{
      if(!nature)return null;
      const n=Math.min(150,Math.max(0,Math.ceil(seconds/.05)));
      for(let i=0;i<n;i++)nature.update(.05,game);
      updateHud();
      return nature.snapshot();
    },
    // Dedicated display-only scene for judging pond color and lily-pad scale.
    previewWaterGarden:()=>{
      if(!water)return null;
      const at=game.time;
      water.cast('tide',game.x+4,game.z+6,4.5,at);
      for(let i=0;i<6;i++)water.kill(game.x+4.1,game.z+6.2,at+i*.035);
      water.cast('rain',game.x-6,game.z+9,3.7,at);
      water.update(.9,at+.9);game.waterSurfaces=water.surfaces();
      updateHud();
      return water.snapshot();
    },
    // Debug-only integration check: upgraded Crystal Bloom against 10 real
    // enemies. This is not available in the ordinary game URL.
    testPowerBurst:()=>{
      if(!OPEN_WORLD||game.state!=='play')return null;
      for(const e of game.enemies)e.alive=false;
      game.target=null;
      game.upgrades.add('bloom');game.upgrades.add('nova');
      const anchor={x:game.x+6.5,z:game.z};
      for(let i=0;i<10;i++){
        spawnEnemy('mossling',{packAnchor:anchor,packIndex:i,packSize:10});
        game.enemies[game.enemies.length-1].hp=8;
      }
      const before=game.kills;
      game.cooldowns[1]=0;cast(1);
      return {kills:game.kills-before,plants:nature.snapshot(),
        water:water.snapshot(),remaining:game.enemies.filter(x=>x.alive).length};
    },
    restart:()=>{
      startGame();
      return nature?.snapshot()??null;
    }
  });
}
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
  for(const p of game.pickups)releaseMesh(p.mesh);
  spellFX.clear();pixi.clear();
  nature?.clear();natureLedger=makeNatureLedger();
  water?.clear();game.waterSurfaces=[];
  releaseMesh(game.selectionRing);
  releaseMesh(game.heroRing);
  game.enemies=[];game.projectiles=[];game.effects=[];game.areas=[];game.texts=[];game.pickups=[];game.energy=0;game.lastPickupSound=-10;game.surgeCelebrated=false;
  game.selectionRing=null;game.heroRing=null;
  $('scoreBursts').replaceChildren();
  $('energyPanel').classList.remove('energy-gained','energy-ready');
  $('surgeBanner').classList.remove('shown');
}
function startGame(){
  clearGame();director.reset();
  game.state='play';game.classId=ui.selectedClass;game.spec=CLASS_DATA[game.classId];
  game.x=OPEN_WORLD?0:pathX(2);game.z=OPEN_WORLD?0:2;game.hp=game.spec.hp;game.maxHp=game.hp;game.shield=0;
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
  label('basicName',visibleWaterSpell(game.spec.basic,OPEN_WORLD));
  game.spec.spells.forEach((name,i)=>{
    label('spellName'+i,visibleWaterSpell(name,OPEN_WORLD));
    abilityButtons[i]?.classList.add('is-ready');
    abilityButtons[i]?.classList.remove('is-cooling');
  });
  label('scoreText','0');
  $('hud').hidden=false;
  hideScreens();
  // The hero starts on camera; no off-screen travel is ever required.
  camera.position.set(OPEN_WORLD?game.x:0,CAMERA_HEIGHT,cameraAnchorZ(game.z,CAMERA_BEHIND));
  camera.setTarget(V(OPEN_WORLD?game.x:0,0,camera.position.z+CAMERA_LOOK_DISTANCE));
  toast(OPEN_WORLD?'Collect the glints of magic to awaken your powers!':'Wild creatures approach! Your basic attack fires automatically.');
  canvas.focus();
}
// Automatic targeting is recalculated from nearby threats on every attack.
function currentTarget(range=game.spec.range+.5){
  game.target=chooseAutoTarget(game.enemies,game,range,game.target);
  return game.target;
}
function spawnEnemy(type,opts={}){
  const stats=ENEMIES[type];
  let x,z;
  if(OPEN_WORLD){
    if(opts.packAnchor){
      const angle=((opts.packIndex||0)/Math.max(1,opts.packSize||1))*Math.PI*2+game.time*.25;
      const gap=opts.packIndex===0?0:random(.55,1.55);
      ({x,z}=freeStep(opts.packAnchor.x,opts.packAnchor.z,
        Math.cos(angle)*gap,Math.sin(angle)*gap,WILD_RADIUS-1));
    }else({x,z}=openSpawnPoint(game));
  }
  else{
    z=game.z+random(5,9);x=game.x+random(-5.5,5.5);
    if(Math.random()<.2){z=game.z-random(4,6);x=game.x+random(-4,4);}
    z=clamp(z,BOARD_START+1,Math.min(BOARD_END-1,director.gate-.5));
    ({x,z}=projectToRoad(x,z));
  }
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
  if(OPEN_WORLD){
    // Readability cap for simultaneous AoE damage numbers and score pops.
    if(['normal','crit','score'].includes(kind)){
      const cap=kind==='score'?3:kind==='crit'?3:7;
      if(game.texts.filter(t=>t.kind===kind).length>=cap)return;
    }
    if(kind==='nature'){
      // Rapid tier evolution presents one final bloom label, not 3 stacked ones.
      for(let i=game.texts.length-1;i>=0;i--){
        const t=game.texts[i];
        if(t.kind==='nature'&&Math.hypot(t.pos.x-pos.x,t.pos.z-pos.z)<7){
          t.el.remove();game.texts.splice(i,1);
        }
      }
    }
  }
  const el=document.createElement('div');
  el.className='float-damage '+kind;
  el.textContent=value;
  $('floaters').append(el);
  // Text fades upward; randomized horizontal offset makes crowd hits legible.
  game.texts.push({el,kind,pos:V(pos.x+random(-.18,.18),pos.y,pos.z),life:kind==='crit'?.95:.73,total:kind==='crit'?.95:.73});
}
function scoreKill(enemy){
  game.kills++;
  if(OPEN_WORLD){
    director.kills++;
    dropGlint(enemy);
    const event=recordNatureKill(natureLedger,{
      x:enemy.x,z:enemy.z,type:enemy.type,time:game.time
    });
    nature?.apply(event,game);
    water?.kill(enemy.x,enemy.z,game.time);
  }
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
function absorbMagic(value){
  game.energy+=value;
  const panel=$('energyPanel');
  panel.classList.add('energy-gained');
  panel.classList.toggle('energy-ready',game.energy>=energyThreshold(director.stage));
  label('energyText',Math.min(game.energy,energyThreshold(director.stage))+' / '+energyThreshold(director.stage));
  $('energyFill').style.width=energyProgress(game.energy,director.stage)*100+'%';
  // A visible number at the actual player, plus UI feedback and a gentle chime.
  floatingText({x:game.x,y:3.25,z:game.z},'✦ +'+value+' MAGIC','energy');
  if(pixi.ready)pixi.stage('Magic Pickup','burst',{x:game.x,z:game.z,y:1.4},1);
  if(game.time-game.lastPickupSound>.19){
    spellFX.sound('Pale Guard','impact');
    game.lastPickupSound=game.time;
  }
  if(!reducedMotion){
    animateUI(panel,[{filter:'brightness(1)',transform:'scale(1)'},
      {filter:'brightness(2.4)',transform:'scale(1.045)',offset:.32},
      {filter:'brightness(1)',transform:'scale(1)'}],350);
  }
}
function dropGlint(enemy){
  if(game.pickups.length>=90){
    const oldest=game.pickups.shift();
    absorbMagic(oldest.value);
    releaseMesh(oldest.mesh);
  }
  const mesh=lightOrb(scene,'#8cffe2',.81);
  mesh.position.set(enemy.x,.90,enemy.z);
  game.pickups.push({x:enemy.x,z:enemy.z,value:enemy.type==='guardian'?3:1,
    mesh,age:0,magnet:false,seed:Math.random()*6.28});
}
function updateGlints(dt){
  if(!OPEN_WORLD)return;
  for(let i=game.pickups.length-1;i>=0;i--){
    const p=game.pickups[i];p.age+=dt;
    const dx=game.x-p.x,dz=game.z-p.z,dist=Math.hypot(dx,dz);
    p.magnet=dist<9.2||p.age>10;
    if(p.magnet&&dist>.001){
      const speed=(dist<9.2?9.8:15)+Math.max(0,9.2-dist)*1.7;
      const step=Math.min(dist,speed*dt);
      p.x+=dx/dist*step;p.z+=dz/dist*step;
    }
    const appear=Math.min(1,p.age*5);
    p.mesh.scaling.setAll((.86+Math.sin(p.age*9+p.seed)*.11)*appear);
    p.mesh.position.set(p.x,.94+Math.sin(game.time*5.5+p.seed)*.18,p.z);
    if(Math.hypot(game.x-p.x,game.z-p.z)<1.12){
      absorbMagic(p.value);
      releaseMesh(p.mesh);game.pickups.splice(i,1);
    }
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
  const crit=Math.random()<(boosted?(OPEN_WORLD?.33:.24):.115);
  const amount=base*(crit?(OPEN_WORLD&&boosted?2.25:1.85):1);
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
    const chain=cascadePower(game.upgrades,OPEN_WORLD);
    const depth=options.cascadeDepth||0;
    if(chain&&depth<chain.maxDepth){
      spellStage('Crystal Cascade','burst',{x:e.x,z:e.z,y:1.18},1.25);
      let hits=0;
      for(const other of game.enemies){
        if(other!==e&&other.alive&&Math.hypot(other.x-e.x,other.z-e.z)<chain.radius){
          hurtEnemy(other,chain.damage,{fxSpell:'Crystal Cascade',
            cascadeDepth:depth+1,fromCascade:true});
          if(++hits===chain.targets)break;
        }
      }
    }
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
  const blocked=absorb===amount;
  floatingText({x:game.x,y:2.5,z:game.z},blocked?'✦ BLOCK':'-'+Math.round(amount-absorb),blocked?'block':'hurt');
  if(blocked)spellStage('Guard Block','burst',game,1);
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
  const power=casterPool(game.upgrades,OPEN_WORLD),{radius}=power;
  const pool=visibleGroundPool(scene,'#7ec7e4',radius);
  const mesh=pool.floor,border=pool.edge;
  if(pixi.ready){mesh.isVisible=false;border.isVisible=false;}
  mesh.position.set(x,.21,z);
  border.position.set(x,.25,z);
  ringBurst(x,z,'#d4fbff',1.8);
  game.areas.push({x,z,radius,life:power.life,tick:OPEN_WORLD?power.tick:0,
    tickRate:power.tick,damage:power.damage,slow:power.slow,mesh,border,water:OPEN_WORLD});
  if(OPEN_WORLD)water?.cast('rain',x,z,Math.min(5.8,radius*.81),game.time);
  if(OPEN_WORLD&&power.entryDamage){
    spellStage('Winter Pool','burst',{x,z,y:.5},
      game.upgrades.has('hailstorm')?2.15:1.6);
    for(const e of game.enemies)
      if(e.alive&&Math.hypot(e.x-x,e.z-z)<radius)
        hurtEnemy(e,power.entryDamage,{slow:power.slow,fxSpell:'Winter Pool'});
  }
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
      const power=casterBloom(game.upgrades,OPEN_WORLD);
      const cx=target.x,cz=target.z;
      if(OPEN_WORLD)water?.cast('tide',cx,cz,
        Math.min(5.0,power.radius*.67),game.time);
      spellStage('Crystal Bloom','core',target,1.1);
      spellStage('Crystal Bloom','burst',target,power.intensity);
      shardBurst(cx,cz,'#bbaffb',power.radius*.65);
      for(const e of game.enemies)
        if(e.alive&&Math.hypot(e.x-cx,e.z-cz)<power.radius)
          hurtEnemy(e,power.damage,{slow:1.5,fxSpell:'Crystal Bloom'});
      if(power.splinters)for(let i=0;i<power.splinters;i++){
        const a=i*Math.PI*2/power.splinters+game.time*.17;
        const px=cx+Math.cos(a)*power.radius*.64;
        const pz=cz+Math.sin(a)*power.radius*.64;
        spellStage('Crystal Bloom','burst',{x:px,z:pz,y:1},.75);
        for(const e of game.enemies)
          if(e.alive&&Math.hypot(e.x-px,e.z-pz)<power.splinterRadius)
            hurtEnemy(e,power.splinterDamage,{fxSpell:'Crystal Bloom'});
      }
      spellStage('Crystal Bloom','aftermath',target,power.intensity);
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
      spellStage('Wide Arc','burst',{
        x:game.x,z:game.z,y:1.18,followPlayer:true,
        targetX:target?.x??game.x+Math.sin(game.actor.root.rotation.y)*3,
        targetZ:target?.z??game.z+Math.cos(game.actor.root.rotation.y)*3
      },big?1.3:1.0);
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
    const count=casterVolley(game.upgrades,OPEN_WORLD);
    const volley=chooseVolleyTargets(game.enemies,game,game.spec.range,count,target);
    for(let i=0;i<volley.length;i++){
      const shotTarget=volley[i];
      const shot=magicProjectile(scene,i%2?'#c2f4f0':'#99dce6',.54);
      const offset=(i-(volley.length-1)/2)*.36;
      shot.position.set(game.x+offset,1.5,game.z);
      if(pixi.ready){shot.isVisible=false;
        for(const child of shot.getChildMeshes())child.isVisible=false;}
      game.projectiles.push({mesh:shot,x:game.x+offset,y:1.5,z:game.z,target:shotTarget,life:3.6,speed:17,
        damage:casterGlintDamage(game.upgrades,game.spec.baseDamage,OPEN_WORLD),
        hostile:false,trail:0,spell:'Glint Dart',water:OPEN_WORLD,fxSeed:game.frame*17+i*31});
    }
  }else{
    const reach=game.upgrades.has('arc')?3.8:2.95;
    spellStage('Steel Arc','charge',game,.7);
    spellStage('Steel Arc','core',game,.85);
    spellStage('Steel Arc','trail',game,1);
    spellStage('Steel Arc','burst',{
      x:target.x,z:target.z,y:1.2,followPlayer:true,
      originX:game.x,originZ:game.z,
      targetX:target.x,targetZ:target.z
    },.85);
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
    const dz=OPEN_WORLD?z*game.spec.speed*dt:
      nextTravelZ(game.z,z*game.spec.speed*dt,director.stage,director.ready,STAGE_GATES,BOARD_START)-game.z;
    const step=OPEN_WORLD?freeStep(game.x,game.z,x*game.spec.speed*dt,dz):
      moveOnRoad(game.x,game.z,x*game.spec.speed*dt,dz);
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
  const p=V(OPEN_WORLD?game.x:0,CAMERA_HEIGHT,cameraAnchorZ(game.z,CAMERA_BEHIND));
  camera.position=B.Vector3.Lerp(camera.position,p,Math.min(1,dt*7.2));
  game.shake=Math.max(0,game.shake-dt*1.45);
  const shakeX=Math.sin(game.time*83)*game.shake*.62;
  camera.setTarget(V(camera.position.x+shakeX,0,camera.position.z+CAMERA_LOOK_DISTANCE));
  const target=currentTarget();
  if(target){
    game.actor.root.rotation.y=Math.atan2(target.x-game.x,target.z-game.z);
    game.selectionRing.isVisible=true;game.selectionRing.position.set(target.x,.11,target.z);
    game.selectionRing.scaling.setAll(1+Math.sin(game.time*5)*.055);
  }else game.selectionRing.isVisible=false;
  game.attackClock-=dt;
  if(game.attackClock<=0){
    basicAttack();game.attackClock=game.spec.attackSpeed*(game.upgrades.has('tempo')?(OPEN_WORLD?.59:.75):1);
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
    if(OPEN_WORLD&&!game.surgeCelebrated){
      game.surgeCelebrated=true;
      const banner=$('surgeBanner');banner.classList.add('shown');
      spellStage('Magic Surge','burst',game,2);
      spellFX.sound('Pale Guard','launch');
      toast('POWER SURGE! Choose an evolution.');
    }
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
    const stepX=(mx/norm*speed+e.knockX*3)*dt,stepZ=(mz/norm*speed+e.knockZ*3)*dt;
    if(OPEN_WORLD){
      const moved=freeStep(e.x,e.z,stepX,stepZ,WILD_RADIUS+.5);
      e.x=moved.x;e.z=moved.z;
    }else{e.x+=stepX;e.z+=stepZ;}
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
        if(OPEN_WORLD&&spell==='Glint Dart'){
          const splash=glintSplash(game.upgrades,OPEN_WORLD);
          if(splash){
            // Every upgraded projectile can damage a small group on impact.
            const x=p.target.x,z=p.target.z;
            spellStage('Glint Splash','burst',{x,z,y:1.3},
              game.upgrades.has('glintstorm')?1.55:1);
            let hits=0;
            for(const other of game.enemies){
              if(other!==p.target&&other.alive&&Math.hypot(other.x-x,other.z-z)<splash.radius){
                hurtEnemy(other,splash.damage,{fxSpell:'Glint Dart'});
                if(++hits>=splash.targets)break;
              }
            }
          }
        }
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
      a.tick=a.tickRate??.65;
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
  const pool=BOOSTS.filter(b=>b.classes.includes(game.classId)&&!game.upgrades.has(b.id)&&(!b.onlyOpen||OPEN_WORLD));
  if(OPEN_WORLD&&game.classId==='caster')
    return choosePowerBoosts(pool,game.upgrades,director.stage);
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
  game.hp=Math.min(game.maxHp,game.hp+(OPEN_WORLD?16:23));
  if(director.stage>=(OPEN_WORLD?7:3)){finish(true);return;}
  game.state='boost';
  const wrap=$('boostOptions');wrap.innerHTML='';
  for(const item of pickBoosts()){
    const btn=document.createElement('button');btn.className='boost-card';
    if(OPEN_WORLD&&item.category==='damage')btn.classList.add('boost-offensive');
    const icon=document.createElement('span');icon.className='boost-icon';icon.textContent=item.icon;
    const title=document.createElement('strong');title.textContent=
      OPEN_WORLD?waterBoostName(item.id,item.name):item.name;
    const desc=document.createElement('span');desc.textContent=
      OPEN_WORLD?waterBoostDescription(item.id,item.desc):item.desc;
    btn.append(icon,title,desc);
    btn.addEventListener('click',()=>{
      game.upgrades.add(item.id);
      if(OPEN_WORLD){
        game.energy=0;game.surgeCelebrated=false;
        $('energyPanel').classList.remove('energy-ready','energy-gained');
        $('surgeBanner').classList.remove('shown');
        game.invulnerable=Math.max(game.invulnerable,.75);
        spellStage('Magic Surge','burst',game,1.5);
      }
      if(item.id==='mend'){game.maxHp+=35;game.hp=Math.min(game.maxHp,game.hp+45);}
      // Blessings do not teleport the hero. Another wave starts where they stand.
      director.next();
      const settled=positionAfterBlessing(game);
      game.x=settled.x;game.z=settled.z;game.advanceClock=0;
      game.target=null;
      game.gateQueued=false;game.state='play';
      hideScreens();toast((OPEN_WORLD?waterBoostName(item.id,item.name):item.name)+' · New blessing!');
      canvas.focus();
    });
    wrap.append(btn);
  }
  $('surgeBanner').classList.remove('shown');
  if(OPEN_WORLD){
    label('boostHeading','POWER SURGE!');
    label('boostSubtitle','Your magic has awakened. Choose how it evolves.');
  }
  showScreen('boostScreen');
}
function finish(success){
  if(game.state==='result')return;
  game.state='result';
  const oldBest=getBest();saveBest();
  label('resultEyebrow',success?'JOURNEY COMPLETE':'THE WILDS CLAIMED THIS RUN');
  label('resultHeading',success?(OPEN_WORLD?'The wilds have awakened.':'A trail well walked.'):'Every path teaches something.');
  label('resultScore',fmt(game.score));
  label('resultSummary',game.score>=oldBest?'✦ NEW PERSONAL BEST ✦':'BEST '+fmt(oldBest));
  label('resultStats',game.kills+' defeated · '+game.crits+' critical strikes · '+Math.floor(game.time/60)+'m '+Math.floor(game.time%60)+'s');
  $('hud').hidden=true;showScreen('resultScreen');
}
function updateHud(){
  label('timeText',String(Math.floor(game.time/60)).padStart(2,'0')+':'+String(Math.floor(game.time%60)).padStart(2,'0'));
  label('stageName',OPEN_WORLD?'SURGE '+(director.stage+1)+' / 8':'GLADE '+(director.stage+1)+' / 4');
  if(OPEN_WORLD){
    label('energyText',Math.min(game.energy,energyThreshold(director.stage))+' / '+energyThreshold(director.stage));
    $('energyFill').style.width=energyProgress(game.energy,director.stage)*100+'%';
    const growth=nature?.snapshot();
    if(growth)label('natureBadge','✿ '+growth.planted+' BLOOMS · '+growth.regions+
      ' GROVES · '+growth.tiers.blossom+' RARE');
    const ponds=water?.snapshot();
    if(ponds)label('waterBadge','≈ '+ponds.ponds+' PONDS · '+ponds.temporary+' WET');
  }
  label('directorLabel',director.stateLabel);
  label('healthText',Math.ceil(game.hp)+' / '+game.maxHp+(game.shield>0?' · Shield '+Math.round(game.shield):''));
  $('healthFill').style.width=(game.hp/game.maxHp*100)+'%';
  label('comboText',game.combo>1?'COMBO '+game.combo:'x1.0');
  label('bestText','BEST '+fmt(getBest()));
  label('goal',OPEN_WORLD?
    (director.ready?'MAGIC AWAKENED · Choose a blessing':'COLLECT MAGIC · GROW STRONGER'):
    (director.ready?'GLADE CLEAR · Choose a blessing':'SURVIVE THE WILDS · '+STAGE_NAMES[director.stage]));
  // No target card is needed: the closest threat is chosen automatically.
  for(let i=0;i<3;i++){
    const cd=$('cooldown'+i),time=game.cooldowns[i],button=abilityButtons[i];
    const busy=time>.001;
    cd.style.display=busy?'flex':'none';cd.textContent=busy?time.toFixed(1):'';
    cd.style.setProperty('--remaining',cooldownFill(time,game.spec.cooldowns[i])+'%');
    button?.classList.toggle('is-ready',!busy);
    button?.classList.toggle('is-cooling',busy);
    if(button){
      button.setAttribute('aria-label',visibleWaterSpell(game.spec.spells[i],OPEN_WORLD)+
        (busy?', ready in '+time.toFixed(1)+' seconds':', ready'));
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
  updateGlints(dt);
  nature?.update(dt,game);
  water?.update(dt,game.time);
  if(water)game.waterSurfaces=water.surfaces();
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
  if(OPEN_WORLD&&btn.dataset.class!=='caster'){btn.hidden=true;btn.style.display='none';return;}
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
const slashTestButton=$('slashVfxButton');
function updateSlashTestButton(){
  if(!slashTestButton)return;
  slashTestButton.textContent=pixi.slashMode==='asset'
    ?'WEAPON SLASH: CETHIEL (TEST)'
    :'WEAPON SLASH: PREVIOUS PIXI';
}
slashTestButton?.addEventListener('click',()=>{
  pixi.setSlashMode(pixi.slashMode==='asset'?'original':'asset');
  updateSlashTestButton();
});
updateSlashTestButton();
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
