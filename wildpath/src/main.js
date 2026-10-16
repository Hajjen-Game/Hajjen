import { CLASS_DATA, BOOSTS, ENEMIES, STAGE_NAMES, clamp, random } from './config.js';
import { createWorld, createActor, pathX, lightOrb, ring, disc } from './world.js';
import { Director } from './director.js';

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
scene.clearColor = B.Color4.FromHexString('#d9e9d7ff');
scene.ambientColor = new B.Color3(.67,.76,.67);
scene.fogMode = B.Scene.FOGMODE_LINEAR;
scene.fogColor = B.Color3.FromHexString('#d9e9d7');
scene.fogStart = 44;
scene.fogEnd = 82;
const ambient = new B.HemisphericLight('soft sky',V(0,1,0),scene);
ambient.intensity = .95;
ambient.diffuse = new B.Color3(1,.99,.93);
ambient.groundColor = new B.Color3(.41,.59,.45);
const sunshine = new B.DirectionalLight('sunshine',V(-.5,-1,.6),scene);
sunshine.intensity = .7;
sunshine.diffuse = new B.Color3(1,.94,.81);
const camera = new B.FreeCamera('high orthographic camera',V(0,25,-16),scene);
camera.mode = B.Camera.ORTHOGRAPHIC_CAMERA;
camera.minZ = .05;
camera.maxZ = 150;
scene.activeCamera = camera;
function resizeCamera(){
  const w=engine.getRenderWidth(), h=Math.max(1,engine.getRenderHeight());
  const height=window.innerWidth<650?26:28;
  camera.orthoTop=height/2;
  camera.orthoBottom=-height/2;
  camera.orthoLeft=-height*w/h/2;
  camera.orthoRight=height*w/h/2;
}
resizeCamera();
const world=createWorld(scene);
const director=new Director();
const keys=new Set();
const touch={dx:0,dy:0};
const ui={selectedClass:'caster'};
const game={
  state:'start',classId:'caster',spec:CLASS_DATA.caster,x:0,z:2,hp:100,maxHp:100,
  shield:0,time:0,actor:null,enemies:[],projectiles:[],effects:[],areas:[],
  texts:[],target:null,selectionRing:null,upgrades:new Set(),score:0,kills:0,crits:0,
  combo:0,comboLife:0,recentHit:0,invulnerable:0,attackClock:0,
  cooldowns:[0,0,0],toastClock:0,frame:0,gateQueued:false,recordAnnounced:false
};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const bestKey=()=> 'wildpath-v01-best-'+game.classId;
function getBest(){try{return Number(localStorage.getItem(bestKey()))||0;}catch{return 0;}}
function saveBest(){try{if(game.score>getBest())localStorage.setItem(bestKey(),String(game.score));}catch{}}
function fmt(n){return Math.floor(n).toLocaleString('en-US');}
function label(id,value){$(id).textContent=value;}
function hideScreens(){for(const id of ['startScreen','boostScreen','resultScreen','pauseScreen'])$(id).hidden=true;}
function showScreen(id){hideScreens();$(id).hidden=false;}
function toast(message){label('toast',message);$('toast').classList.add('shown');game.toastClock=2.5;}
function releaseMesh(mesh){if(mesh)mesh.dispose(false,false);}
function clearGame(){
  if(game.actor){game.actor.dispose();game.actor=null;}
  for(const e of game.enemies)e.actor.dispose();
  for(const p of game.projectiles)releaseMesh(p.mesh);
  for(const e of game.effects)releaseMesh(e.mesh);
  for(const a of game.areas){releaseMesh(a.mesh);releaseMesh(a.border);}
  for(const t of game.texts)t.el.remove();
  releaseMesh(game.selectionRing);
  game.enemies=[];game.projectiles=[];game.effects=[];game.areas=[];game.texts=[];
  game.selectionRing=null;
}
function startGame(){
  clearGame();director.reset();
  game.state='play';game.classId=ui.selectedClass;game.spec=CLASS_DATA[game.classId];
  game.x=pathX(2);game.z=2;game.hp=game.spec.hp;game.maxHp=game.hp;game.shield=0;
  game.time=0;game.attackClock=.25;game.cooldowns=[0,0,0];game.score=0;
  game.kills=0;game.crits=0;game.combo=0;game.comboLife=0;game.recentHit=0;
  game.invulnerable=0;game.frame=0;game.gateQueued=false;game.recordAnnounced=false;
  game.target=null;game.upgrades=new Set();game.toastClock=0;
  game.actor=createActor(scene,game.classId);
  game.actor.root.position.set(game.x,0,game.z);
  game.selectionRing=ring(scene,'target focus','#f4afa2',1.03,.075);
  game.selectionRing.isVisible=false;
  label('className',game.spec.name);
  label('basicName',game.spec.basic);
  game.spec.spells.forEach((s,i)=>label('spellName'+i,s));
  $('hud').hidden=false;
  hideScreens();
  camera.position.set(game.x,25,game.z-16);
  camera.setTarget(V(game.x,0,game.z+1));
  toast('Follow the trail · Your basic attack fires automatically!');
  canvas.focus();
}
function getNearest(range){
  let best=null,dist=range;
  for(const e of game.enemies){
    if(!e.alive)continue;
    const d=distance(e,game);
    if(d<dist){best=e;dist=d;}
  }
  return best;
}
function currentTarget(){
  if(game.target&&!game.target.alive)game.target=null;
  if(!game.target)game.target=getNearest(game.spec.range+.5);
  return game.target;
}
function selectTarget(e){game.target=e&&e.alive?e:null;}
function cycleTarget(){
  const choices=game.enemies.filter(e=>e.alive&&distance(e,game)<19).sort((a,b)=>distance(a,game)-distance(b,game));
  if(!choices.length){selectTarget(null);return;}
  const i=choices.indexOf(game.target);
  selectTarget(choices[(i+1)%choices.length]);
}
function spawnEnemy(type){
  const stats=ENEMIES[type];
  let z=game.z+random(9,17),x=pathX(z)+random(-9,9);
  if(Math.random()<.23){z=game.z-random(8,13);x=pathX(z)+random(-7,7);}
  z=clamp(z,0,215);
  const actor=createActor(scene,type,true);
  const id='wild-'+game.frame+'-'+Math.floor(Math.random()*999999);
  const enemy={
    id,type,x,z,actor,alive:true,hp:stats.hp*(1+director.stage*.09),
    maxHp:stats.hp*(1+director.stage*.09),speed:stats.speed,
    attackClock:random(.4,1.3),slow:0,knockX:0,knockZ:0,flash:0,bob:Math.random()*6.28
  };
  actor.root.position.set(x,0,z);
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
  game.texts.push({el,pos:V(pos.x,pos.y,pos.z),life:.77,total:.77});
}
function scoreKill(enemy){
  game.kills++;
  game.combo=game.comboLife>0?game.combo+1:1;
  game.comboLife=5.5;
  const multiplier=1+Math.min(2,Math.floor(game.combo/5)*.2);
  game.score+=Math.round(ENEMIES[enemy.type].score*multiplier);
  const best=getBest();
  if(best>0&&!game.recordAnnounced&&game.score>=best*.9){
    game.recordAnnounced=true;toast('YOUR PERSONAL RECORD IS WITHIN REACH!');
  }
  if([5,10,20].includes(game.combo))toast(String(game.combo)+' KILL STREAK!');
}
function ringBurst(x,z,color,scale=1){
  const circle=ring(scene,'impact ripple',color,.35,.10);
  circle.position.set(x,.12,z);circle.isPickable=false;
  game.effects.push({mesh:circle,life:.42,total:.42,scale,particle:false});
  for(let i=0;i<3;i++){
    const dot=lightOrb(scene,color,.13);
    dot.position.set(x+random(-.5,.5),random(.35,1.1),z+random(-.5,.5));
    game.effects.push({mesh:dot,life:.36,total:.36,scale:.8,particle:true});
  }
}
function hurtEnemy(e,base,options={}){
  if(!e||!e.alive)return;
  const boosted=(game.classId==='caster'&&game.upgrades.has('critchill'))||(game.classId==='melee'&&game.upgrades.has('critsteel'));
  const crit=Math.random()<(boosted?.24:.115);
  const amount=base*(crit?1.85:1);
  if(crit)game.crits++;
  e.hp-=amount;e.flash=.13;
  floatingText({x:e.x,y:2.5,z:e.z},(crit?'✦ ':'')+Math.round(amount),crit?'crit':'normal');
  if(options.slow)e.slow=Math.max(e.slow,options.slow);
  if(options.push){
    const dx=e.x-game.x,dz=e.z-game.z,dist=Math.max(.1,Math.hypot(dx,dz));
    e.knockX+=dx/dist*options.push;e.knockZ+=dz/dist*options.push;
  }
  if(e.hp<=0){
    e.alive=false;scoreKill(e);
    ringBurst(e.x,e.z,e.type==='ember'?'#f0b5a0':'#e5dfac',.9);
    if(game.target===e)game.target=null;
  }
}
function hurtPlayer(amount){
  if(game.state!=='play'||game.invulnerable>0)return;
  const absorb=Math.min(game.shield,amount);
  game.shield-=absorb;game.hp=Math.max(0,game.hp-(amount-absorb));
  game.invulnerable=.38;game.recentHit=2.3;
  floatingText({x:game.x,y:2.5,z:game.z},absorb===amount?'BLOCK':'-'+Math.round(amount-absorb),'hurt');
  if(game.hp<=0)finish(false);
}
function projectile(target,damage,color='#99dce6',hostile=false){
  const mesh=lightOrb(scene,color,hostile?.48:.38);
  const x=hostile?target.x:game.x,z=hostile?target.z:game.z;
  const destination=hostile?game:target;
  mesh.position.set(x,1.5,z);
  game.projectiles.push({mesh,x,z,y:1.5,damage,target:destination,hostile,life:3.8,speed:hostile?9:17,trail:0});
}
function icePool(x,z){
  const big=game.upgrades.has('snowfield');
  const radius=big?4.6:3.2;
  const mesh=disc(scene,'winter pool','#97d9e6',radius,.38);
  mesh.position.set(x,.018,z);mesh.isPickable=false;
  const border=ring(scene,'winter rim','#b5f3e6',radius,.06);
  border.position.set(x,.06,z);border.isPickable=false;
  game.areas.push({x,z,radius,life:big?7.5:5.5,tick:0,damage:big?11:6,slow:2.5,mesh,border});
}
function cast(slot){
  if(game.state!=='play'||game.cooldowns[slot]>0)return;
  const caster=game.classId==='caster';
  const target=currentTarget();
  if((caster&&slot!==2)||(!caster&&slot===1)){if(!target||distance(game,target)>17)return;}
  game.cooldowns[slot]=game.spec.cooldowns[slot];
  if(caster){
    if(slot===0){icePool(target.x,target.z);ringBurst(target.x,target.z,'#b4ecf1',3);}
    if(slot===1){
      const big=game.upgrades.has('bloom');
      ringBurst(target.x,target.z,'#a8ecf1',big?4.5:3.3);
      for(const e of game.enemies)if(e.alive&&distance(e,target)<(big?4.6:3.4))hurtEnemy(e,big?38:29,{slow:1.2});
    }
    if(slot===2){
      const strong=game.upgrades.has('shield');
      game.shield=Math.max(game.shield,strong?65:42);
      game.invulnerable=.42;
      ringBurst(game.x,game.z,'#90ecce',strong?4:2);
      if(strong)for(const e of game.enemies)if(e.alive&&distance(e,game)<4.5)e.slow=Math.max(e.slow,2.7);
      floatingText({x:game.x,y:2.8,z:game.z},'GUARD','heal');
    }
  }else{
    if(slot===0){
      const big=game.upgrades.has('cleave'),radius=big?5.2:3.9;
      ringBurst(game.x,game.z,'#f5d6a7',radius);
      let hits=0;
      for(const e of game.enemies)if(e.alive&&distance(e,game)<radius){hurtEnemy(e,big?41:32,{push:1.5});hits++;}
      if(hits>=4)game.score+=120;
    }
    if(slot===1){
      const dx=target.x-game.x,dz=target.z-game.z,dist=Math.max(.01,Math.hypot(dx,dz));
      const leap=Math.min(8,Math.max(0,dist-1.4));
      game.x+=dx/dist*leap;
      game.z=clamp(game.z+dz/dist*leap,0,director.ready?director.gate:director.gate-2.3);
      hurtEnemy(target,36,{push:2});
      ringBurst(game.x,game.z,'#edcba0',game.upgrades.has('rush')?4:2);
      if(game.upgrades.has('rush'))
        for(const e of game.enemies)if(e!==target&&e.alive&&distance(e,game)<4.2)hurtEnemy(e,22,{push:2});
    }
    if(slot===2){
      const big=game.upgrades.has('quake'),radius=big?7:5;
      ringBurst(game.x,game.z,'#ecc09b',radius);
      for(const e of game.enemies)if(e.alive&&distance(e,game)<radius)hurtEnemy(e,25,{push:big?5:3});
      game.invulnerable=.55;
    }
  }
}
function basicAttack(){
  const target=currentTarget();
  if(!target||distance(game,target)>game.spec.range)return;
  game.actor.root.rotation.y=Math.atan2(target.x-game.x,target.z-game.z);
  if(game.classId==='caster'){
    const count=game.upgrades.has('triple')?3:game.upgrades.has('double')?2:1;
    for(let i=0;i<count;i++){
      const shot=lightOrb(scene,i%2?'#c2f4f0':'#99dce6',.37);
      const offset=(i-(count-1)/2)*.32;
      shot.position.set(game.x+offset,1.5,game.z);
      game.projectiles.push({mesh:shot,x:game.x+offset,y:1.5,z:game.z,target,life:3.6,speed:17,
        damage:game.spec.baseDamage*(game.upgrades.has('triple')?1.14:1),hostile:false,trail:0});
    }
  }else{
    const reach=game.upgrades.has('arc')?3.8:2.95;
    ringBurst(game.x,game.z,'#f9dcae',1.55);
    const sword=game.actor.root.metadata?.sword;
    if(sword)sword.rotation.z=-.6;
    const dx=target.x-game.x,dz=target.z-game.z;
    for(const e of game.enemies)if(e.alive&&distance(e,game)<reach){
      const vx=e.x-game.x,vz=e.z-game.z;
      const d=Math.max(.01,Math.hypot(vx,vz)*Math.hypot(dx,dz));
      if((vx*dx+vz*dz)/d>.12)hurtEnemy(e,game.spec.baseDamage,{push:.35});
    }
    if(game.upgrades.has('echo')){
      const d=Math.max(.01,Math.hypot(dx,dz));
      const endpoint={x:game.x+dx/d*5.6,z:game.z+dz/d*5.6};
      ringBurst(endpoint.x,endpoint.z,'#f5cba0',1.8);
      for(const e of game.enemies)if(e.alive&&distance(e,endpoint)<1.9)hurtEnemy(e,8);
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
    game.x=clamp(game.x+x*game.spec.speed*dt,-21,21);
    game.z=clamp(game.z+z*game.spec.speed*dt,0,director.ready?director.gate:director.gate-2.3);
  }
  game.actor.root.position.set(game.x,Math.sin(game.time*12)*(len>.1?.06:.015),game.z);
  game.actor.leftArm.rotation.x=len>.1?Math.sin(game.time*12)*.2:0;
  game.actor.rightArm.rotation.x=len>.1?-Math.sin(game.time*12)*.2:0;
  const sword=game.actor.root.metadata?.sword;
  if(sword)sword.rotation.z+=(0-sword.rotation.z)*Math.min(1,dt*10);
  const p=V(game.x,25,game.z-16);
  camera.position=B.Vector3.Lerp(camera.position,p,Math.min(1,dt*5));
  camera.setTarget(V(camera.position.x,0,camera.position.z+17));
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
  for(let i=0;i<3;i++)game.cooldowns[i]=Math.max(0,game.cooldowns[i]-dt);
  game.recentHit=Math.max(0,game.recentHit-dt);
  game.invulnerable=Math.max(0,game.invulnerable-dt);
  game.comboLife=Math.max(0,game.comboLife-dt);
  if(game.comboLife===0)game.combo=0;
  if(director.ready&&game.z>=director.gate-.05)completeStage();
}
function updateEnemies(dt){
  for(const e of game.enemies){
    if(!e.alive)continue;
    e.attackClock-=dt;e.slow=Math.max(0,e.slow-dt);e.flash=Math.max(0,e.flash-dt);
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
    e.actor.root.position.set(e.x,Math.sin(game.time*4+e.bob)*.05,e.z);
    e.actor.root.rotation.y=Math.atan2(dx,dz);
    e.actor.rightArm.rotation.x=Math.sin(game.time*5+e.bob)*.22;
    e.actor.body.scaling.x=e.flash>0?.84:.75;
    if(d<ENEMIES[e.type].range&&e.attackClock<=0){
      e.attackClock=ENEMIES[e.type].cooldown*random(.88,1.12);
      if(e.type==='ember'){
        const p=lightOrb(scene,'#eeb59e',.47);p.position.set(e.x,1.4,e.z);
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
      else hurtEnemy(p.target,p.damage);
      ringBurst(p.target.x,p.target.z,p.hostile?'#efb99e':'#a6e7f2',.7);
      releaseMesh(p.mesh);game.projectiles.splice(i,1);
      continue;
    }
    p.x+=dx/d*step;p.z+=dz/d*step;p.y+=dy/d*step;
    p.mesh.position.set(p.x,p.y,p.z);
    p.trail-=dt;
    if(p.trail<=0){
      const dot=lightOrb(scene,p.hostile?'#f4d4c0':'#d2fbf7',.12);
      dot.position=p.mesh.position.clone();
      game.effects.push({mesh:dot,life:.19,total:.19,scale:.55,particle:true});
      p.trail=.085;
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
      for(const e of game.enemies)if(e.alive&&distance(e,a)<a.radius)hurtEnemy(e,a.damage,{slow:a.slow});
    }
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
  game.score+=1250+director.stage*450;
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
      director.next();game.z=Math.max(game.z,director.stage*50+1);game.x=pathX(game.z);
      game.actor.root.position.set(game.x,0,game.z);
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
  label('scoreText',fmt(game.score));
  label('timeText',String(Math.floor(game.time/60)).padStart(2,'0')+':'+String(Math.floor(game.time%60)).padStart(2,'0'));
  label('stageName','GLADE '+(director.stage+1)+' / 4');
  label('directorLabel',director.stateLabel);
  label('healthText',Math.ceil(game.hp)+' / '+game.maxHp+(game.shield>0?' · Shield '+Math.round(game.shield):''));
  $('healthFill').style.width=(game.hp/game.maxHp*100)+'%';
  label('comboText',game.combo>1?'COMBO '+game.combo:'x1.0');
  label('bestText','BEST '+fmt(getBest()));
  label('goal',director.ready?'Trail clear · Reach the glowing stones':'Follow the trail · '+STAGE_NAMES[director.stage]);
  const target=currentTarget();
  $('targetCard').hidden=!target;
  if(target){
    label('targetName',ENEMIES[target.type].name);
    $('targetHealthFill').style.width=(Math.max(0,target.hp)/target.maxHp*100)+'%';
  }
  for(let i=0;i<3;i++){
    const cd=$('cooldown'+i),time=game.cooldowns[i];
    cd.style.display=time>0?'flex':'none';cd.textContent=time>0?time.toFixed(1):'';
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
  hudTime-=dt;
  if(hudTime<=0){updateHud();hudTime=.12;}
}
let previous=performance.now();
engine.runRenderLoop(()=>{
  const now=performance.now(),dt=Math.min(.05,(now-previous)/1000||0);
  previous=now;
  if(game.state==='play')update(dt);
  scene.render();
});
window.addEventListener('resize',()=>{engine.resize();resizeCamera();});
window.addEventListener('blur',()=>keys.clear());
window.addEventListener('keydown',e=>{
  if(['Tab','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  if(e.code==='Tab'&&game.state==='play')cycleTarget();
  if(game.state==='play'&&['Digit2','Digit3','Digit4'].includes(e.code))cast(Number(e.code.slice(-1))-2);
  if(e.code==='Escape'){
    if(game.state==='play'){game.state='pause';showScreen('pauseScreen');}
    else if(game.state==='pause'){game.state='play';hideScreens();}
  }
  keys.add(e.code);
});
window.addEventListener('keyup',e=>keys.delete(e.code));
scene.onPointerObservable.add(info=>{
  if(info.type!==B.PointerEventTypes.POINTERDOWN||game.state!=='play')return;
  const id=info.pickInfo?.pickedMesh?.metadata?.enemyId;
  if(id){const e=game.enemies.find(e=>e.id===id&&e.alive);if(e)selectTarget(e);}
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
$('touchTarget').addEventListener('click',cycleTarget);
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
