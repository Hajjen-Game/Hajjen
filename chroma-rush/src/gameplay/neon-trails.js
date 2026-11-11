/* CHROMA RUSH — NEON TRAILS 1.1
 * Shorter tail / forgiving wall rebound / Rush Dash and controlled neon
 * trail visuals. Deterministic physics and isolated mobile renderer.
 */
(function (root) {
'use strict';
const RUSH = root.ChromaConfig ||
  (typeof require==='function' ? require('../core/config.js') : null);
const TIDE = root.ChromaCenterPulse ||
  (typeof require==='function' ? require('../render/chroma-center-pulse.js') : null);
const IDENTITY = root.ChromaIdentity ||
  (typeof require==='function' ? require('../render/chroma-identity.js') : null);
const WIDTH=960, HEIGHT=540, CX=480, CY=270;
const ZONE_SECONDS=10, FIXED_STEP=1/60;
const COLORS=['#60ecff','#ff71ac','#ffe26a','#9f8aff'];
const NAMES=['YOU','NOVA','VOLT','HEX'];
const PALETTES=RUSH.PALETTES.slice(0,7).map(p=>[p.primary,p.shadow,p.secondary]);
const ZONE_NAMES=['FLOW','SURGE','PULSE','OVERDRIVE','FRENZY','CRITICAL','FINAL'];
const DASH_SECONDS=.33, DASH_COOLDOWN=4.6;
const TRAIL_SAMPLE=.068, MAX_TRAIL_SEGMENTS=95;
const TRAIL_START_GRACE=2.0, OWN_TAIL_GRACE=.72;
const WALL_MARGIN=11, WALL_BOUNCE_GRACE=.26;
const MAX_AUDIT_EVENTS=380;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const hypot=(x,y)=>Math.hypot(x,y);
const angleDiff=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const zoneAt=t=>Math.floor(Math.max(0,t+1e-8)/ZONE_SECONDS);
const speedAt=zone=>Math.min(222,108+13*Math.max(0,zone));
// At Zone 01 the old 9.4s trail could exceed the usable arena's width.
 // A 3.3s lifetime rewards trapping, but lets escapes reopen quickly.
const trailLife=zone=>Math.max(2.15,3.3-.10*zone);
const nextContraction=elapsed=>{
  const next=Math.ceil((Math.max(0,elapsed)+1e-6)/20)*20;
  return next<=140?Math.max(0,next-elapsed):Infinity;
};
const arenaAt=zone=>{
  const step=Math.min(7,Math.floor(Math.max(0,zone)/2));
  return {left:CX-(306-13*step),right:CX+(306-13*step),
    top:CY-(196-9*step),bottom:CY+(196-9*step),stage:step};
};
function rng(seed){
  let n=(seed>>>0)||92345691;
  return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
}
function segmentDistanceSq(a,b,c,d){
  // Shortest segment-to-segment distance, detecting crossing at speed.
  // Based on clamped point projections plus a robust intersection test.
  const ax=b.x-a.x,ay=b.y-a.y,cx=d.x-c.x,cy=d.y-c.y;
  const cross=(u,v,x,y)=>u*y-v*x;
  const cd=cross(ax,ay,cx,cy);
  if(Math.abs(cd)>1e-8){
    const ox=c.x-a.x,oy=c.y-a.y;
    const t=cross(ox,oy,cx,cy)/cd;
    const u=cross(ox,oy,ax,ay)/cd;
    if(t>=0&&t<=1&&u>=0&&u<=1)return 0;
  }
  const pt=(p,v,w)=>{
    const dx=w.x-v.x,dy=w.y-v.y,den=dx*dx+dy*dy;
    const t=den?clamp(((p.x-v.x)*dx+(p.y-v.y)*dy)/den,0,1):0;
    const x=p.x-v.x-dx*t,y=p.y-v.y-dy*t;
    return x*x+y*y;
  };
  return Math.min(pt(a,c,d),pt(b,c,d),pt(c,a,b),pt(d,a,b));
}
function nearWall(x,y,arena,margin=0){
  return x<arena.left+margin||x>arena.right-margin||
    y<arena.top+margin||y>arena.bottom-margin;
}
function hitsTrail(from,to,player,players,time,zone,
  {radius=5.5,ignoreOwn=OWN_TAIL_GRACE}={}){
  const radSq=radius*radius,ageLimit=trailLife(zone);
  for(const owner of players){
    const trail=owner.trail;
    for(let i=trail.length-1;i>=0;i--){
      const t=trail[i],age=time-t.at;
      if(age>ageLimit)break;
      // Ignore only the recent part directly attached to your own tail.
      if(owner.id===player.id&&age<ignoreOwn)continue;
      const minx=Math.min(from.x,to.x)-radius,maxx=Math.max(from.x,to.x)+radius;
      const miny=Math.min(from.y,to.y)-radius,maxy=Math.max(from.y,to.y)+radius;
      if(Math.max(t.x1,t.x2)<minx||Math.min(t.x1,t.x2)>maxx||
         Math.max(t.y1,t.y2)<miny||Math.min(t.y1,t.y2)>maxy)continue;
      if(segmentDistanceSq(from,to,{x:t.x1,y:t.y1},{x:t.x2,y:t.y2})<=radSq)
        return {id:owner.id,at:t.at};
    }
  }
  return null;
}
function record(m,type,fields={}){
  if(m.events.length<MAX_AUDIT_EVENTS)
    m.events.push({t:+m.elapsed.toFixed(3),type,...fields});
  else m.droppedEvents++;
}
function createGame(seed=20261111){
  const random=rng(seed);
  const spawn=[
    // Tangential starting directions avoid unavoidable head-on spawns.
    [CX-158,CY-112,0],[CX+158,CY-112,Math.PI/2],
    [CX-158,CY+112,-Math.PI/2],[CX+158,CY+112,Math.PI]
  ];
  const players=spawn.map((s,id)=>({
    id,name:NAMES[id],color:COLORS[id],x:s[0],y:s[1],
    angle:s[2],desiredAngle:s[2],alive:true,dash:0,cooldown:0,
    wallGrace:0,wallBounces:0,
    distance:0,dashes:0,eliminations:0,trail:[],sampleX:s[0],sampleY:s[1],
    sampleAt:0,aiAt:0,fallenAt:null,fallCause:null
  }));
  const m={seed,random,players,elapsed:0,zone:0,stage:0,active:true,
    state:'running',winner:null,outcome:null,boostReady:true,
    paletteFade:0,announced:null,events:[],droppedEvents:0,eliminations:0,
    maxSpeed:108,performance:{frames:0,slow50:0,worstFrameMs:0,renderMaxMs:0},
    startedAt:null};
  record(m,'start',{players:4,mode:'neon-trails-1.1',
    trailLife:trailLife(0),wallBehavior:'soft_reflection',dash:true});
  return m;
}
function aiIntent(m,p){
  const zone=m.zone,arena=arenaAt(zone),spd=speedAt(zone);
  const candidates=[0,.28,-.28,.54,-.54,.9,-.9,1.22,-1.22];
  let best=p.angle,bestScore=-1e9;
  const opponents=m.players.filter(q=>q.alive&&q.id!==p.id);
  // The opponent target is a cutting opportunity, not a suicidal chase.
  const target=opponents.length ? opponents.reduce((a,b)=>
    hypot(a.x-p.x,a.y-p.y)<hypot(b.x-p.x,b.y-p.y)?a:b):null;
  for(let i=0;i<candidates.length;i++){
    const angle=p.angle+candidates[i];
    const ux=Math.cos(angle),uy=Math.sin(angle);
    let score=0,safe=true;
    for(const dist of [36,67,104]){
      const x=p.x+ux*dist,y=p.y+uy*dist;
      const prev={x:p.x+ux*Math.max(0,dist-22),y:p.y+uy*Math.max(0,dist-22)};
      if(nearWall(x,y,arena,16)){score-=48/(dist/36);safe=false;continue;}
      const hit=hitsTrail(prev,{x,y},p,m.players,m.elapsed,zone,
        {radius:9,ignoreOwn:OWN_TAIL_GRACE});
      if(hit){score-=135/(dist/36);safe=false;}
      else score+=6;
    }
    // Favor graceful curves and occasional tactical interception of rivals.
    score-=Math.abs(candidates[i])*2.1;
    // In the opening zones prioritise staying alive over intercepting.
    if(target&&safe&&m.elapsed>7){
      const theta=Math.atan2(target.y-p.y,target.x-p.x);
      score+=2.2*Math.cos(angleDiff(angle,theta));
      const intercept=hypot(target.x-(p.x+ux*68),target.y-(p.y+uy*68));
      score+=Math.max(0,2.4-intercept/85);
    }
    score+=(m.random()-.5)*.2; // seeded tie-breaks only
    if(score>bestScore){bestScore=score;best=angle;}
  }
  return best;
}
function eliminate(m,p,reason,owner=null){
  if(!p.alive)return;
  p.alive=false;p.fallenAt=m.elapsed;p.fallCause=reason;
  const killer=owner!=null&&owner!==p.id?m.players[owner]:null;
  if(killer)killer.eliminations++;
  record(m,'out',{player:p.id,cause:reason,trailOwner:owner,
    x:+p.x.toFixed(1),y:+p.y.toFixed(1),zone:m.zone+1});
}
function tick(m,input={},dt=FIXED_STEP){
  if(m.state!=='running')return m;
  const step=clamp(Number.isFinite(dt)?dt:0,0,1/30);
  if(!step)return m;
  const prevZone=m.zone;
  m.elapsed+=step;
  m.zone=zoneAt(m.elapsed);m.maxSpeed=speedAt(m.zone);
  const arena=arenaAt(m.zone),prevStage=m.stage;
  m.stage=arena.stage;
  if(m.zone!==prevZone){
    m.paletteFade=1.05;
    record(m,'zone',{zone:m.zone+1,speed:m.maxSpeed,trailLife:trailLife(m.zone)});
    m.announced='ZONE '+String(m.zone+1).padStart(2,'0')+' · SPEED UP';
  }
  if(m.stage!==prevStage){
    record(m,'arena_shrink',{stage:m.stage,arena});
    m.announced='ARENA CONTRACTS';
  }
  m.paletteFade=Math.max(0,m.paletteFade-step);
  const user=m.players[0];
  if(input.dash&&user.alive&&user.cooldown<=0){
    user.dash=DASH_SECONDS;user.cooldown=DASH_COOLDOWN;user.dashes++;
    record(m,'dash',{player:0,zone:m.zone+1});
  }
  for(const p of m.players){
    if(!p.alive)continue;
    p.dash=Math.max(0,p.dash-step);
    p.cooldown=Math.max(0,p.cooldown-step);
    p.wallGrace=Math.max(0,p.wallGrace-step);
    if(p.id===0){
      if(Number.isFinite(input.x)&&Number.isFinite(input.y)&&
         hypot(input.x,input.y)>.12)
        p.desiredAngle=Math.atan2(input.y,input.x);
    }else{
      p.aiAt-=step;
      if(p.aiAt<=0){
        p.desiredAngle=aiIntent(m,p);
        p.aiAt=.13+m.random()*.06;
      }
    }
    const diff=angleDiff(p.angle,p.desiredAngle);
    const maxTurn=(p.dash>0?3.7:5.0)*step;
    p.angle+=clamp(diff,-maxTurn,maxTurn);
    const speed=m.maxSpeed*(p.dash>0?1.8:1);
    const from={x:p.x,y:p.y};
    const to={x:p.x+Math.cos(p.angle)*speed*step,
      y:p.y+Math.sin(p.angle)*speed*step};
    // The arena is a bumper, not instant death. Reflect only the axis
    // crossed and keep the cube clearly inside its playable boundary.
    const touchedX=to.x<arena.left+WALL_MARGIN||to.x>arena.right-WALL_MARGIN;
    const touchedY=to.y<arena.top+WALL_MARGIN||to.y>arena.bottom-WALL_MARGIN;
    let bounced=false;
    if(touchedX||touchedY){
      const vx=Math.cos(p.angle),vy=Math.sin(p.angle);
      const nx=touchedX?-vx:vx,ny=touchedY?-vy:vy;
      p.angle=Math.atan2(ny,nx);
      p.desiredAngle=p.angle;
      to.x=clamp(to.x,arena.left+WALL_MARGIN+.7,arena.right-WALL_MARGIN-.7);
      to.y=clamp(to.y,arena.top+WALL_MARGIN+.7,arena.bottom-WALL_MARGIN-.7);
      // A gentle nudge inward conveys rebound rather than hard sticking.
      if(touchedX)to.x=clamp(to.x+Math.sign(nx)*2.5,
        arena.left+WALL_MARGIN+.7,arena.right-WALL_MARGIN-.7);
      if(touchedY)to.y=clamp(to.y+Math.sign(ny)*2.5,
        arena.top+WALL_MARGIN+.7,arena.bottom-WALL_MARGIN-.7);
      p.wallGrace=WALL_BOUNCE_GRACE;
      p.wallBounces++;
      bounced=true;
      record(m,'wall_bounce',{player:p.id,zone:m.zone+1,
        x:+to.x.toFixed(1),y:+to.y.toFixed(1),axis:touchedX&&touchedY?'both':touchedX?'x':'y'});
    }
    // Warm-up gives players time to learn steering and see the trails.
    // A very brief grace after a rebound avoids accidental double-KO
    // from the 1-2 trail pixels already touching that same wall.
    const invuln=m.elapsed<TRAIL_START_GRACE||p.wallGrace>0;
    const obstacle= !invuln ?
      hitsTrail(from,to,p,m.players,m.elapsed,m.zone):null;
    if(obstacle){
      eliminate(m,p,'trail',obstacle.id);
      continue;
    }
    p.x=to.x;p.y=to.y;p.distance+=hypot(to.x-from.x,to.y-from.y);
    if(bounced){
      // Start the new trail at the reflected cube, never bridge across
      // the arena rim or draw a straight line through a wall.
      p.sampleX=p.x;p.sampleY=p.y;p.sampleAt=m.elapsed;
    }
    // Trail sampling uses real swept segments, not guessed sprites or a
    // gameplay-independent particle effect. Every segment is dangerous.
    const distance=hypot(p.x-p.sampleX,p.y-p.sampleY);
    if(m.elapsed-p.sampleAt>=TRAIL_SAMPLE&&distance>=3){
      p.trail.push({x1:p.sampleX,y1:p.sampleY,x2:p.x,y2:p.y,at:m.elapsed});
      p.sampleX=p.x;p.sampleY=p.y;p.sampleAt=m.elapsed;
      if(p.trail.length>MAX_TRAIL_SEGMENTS)p.trail.shift();
    }
  }
  for(const p of m.players){
    while(p.trail.length&&m.elapsed-p.trail[0].at>trailLife(m.zone))
      p.trail.shift();
  }
  const alive=m.players.filter(p=>p.alive);
  if(!user.alive||alive.length<=1){
    m.state='finished';
    m.winner=alive.length===1?alive[0].id:null;
    m.outcome=user.alive&&alive.length===1?'victory':'eliminated';
    record(m,'end',{outcome:m.outcome,winner:m.winner,duration:+m.elapsed.toFixed(3)});
  }
  return m;
}
function audit(m){
  return {schema:'neon-trails-run-audit/1.1',build:'neon-trails-1.1',
    seed:m.seed,status:m.state==='finished'?'completed':'in_progress',
    summary:{durationSeconds:+m.elapsed.toFixed(3),highestZone:m.zone+1,
      arenaStage:m.stage,speed:m.maxSpeed,alive:m.players.filter(p=>p.alive).length,
      outcome:m.outcome,winner:m.winner,playerDashes:m.players[0].dashes,
      wallBounces:m.players.map(p=>p.wallBounces),
      trailLifetimeSeconds:+trailLife(m.zone).toFixed(2),
      playerEliminations:m.players[0].eliminations,
      playerDistance:+m.players[0].distance.toFixed(1),
      trailLengths:m.players.map(p=>p.trail.length),
      performance:{...m.performance}},
    players:m.players.map(p=>({id:p.id,alive:p.alive,color:p.color,
      eliminatedAt:p.fallenAt,cause:p.fallCause,
      dashes:p.dashes,wallBounces:p.wallBounces,eliminations:p.eliminations})),
    events:m.events.map(e=>({...e})),
    limits:{maxEvents:MAX_AUDIT_EVENTS,droppedEvents:m.droppedEvents},
    privacy:'Local export only; no raw input, device IDs or network telemetry'};
}
const core={WIDTH,HEIGHT,CX,CY,COLORS,NAMES,ZONE_SECONDS,ZONE_NAMES,PALETTES,
  DASH_SECONDS,DASH_COOLDOWN,TRAIL_SAMPLE,MAX_TRAIL_SEGMENTS,
  TRAIL_START_GRACE,OWN_TAIL_GRACE,WALL_MARGIN,WALL_BOUNCE_GRACE,
  zoneAt,speedAt,trailLife,arenaAt,nextContraction,segmentDistanceSq,nearWall,hitsTrail,
  angleDiff,createGame,aiIntent,eliminate,tick,audit};
if(typeof module!=='undefined'&&module.exports)module.exports=core;
root.ChromaNeonTrailsCore=core;
if(typeof document==='undefined'||!document.getElementById('trails-canvas'))return;

const $=id=>document.getElementById(id),canvas=$('trails-canvas');
const ctx=canvas.getContext('2d');
if(!ctx){$('trails-menu').textContent='Canvas 2D required';return;}
const PIXELS=750000;
const reduced=()=>window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const joystick=$('trails-joystick'),stick=$('trails-stick');
const sceneSlots=[{key:'',canvas:null},{key:'',canvas:null}];
const sprites=Object.create(null);
let sceneIndex=0,game=null,mode='menu',keys=new Set(),pointer=null,
  joyX=0,joyY=0,dashPending=false,
  prevTimestamp=0,accum=0,lastZone=-1,lastStage=-1,
  viewW=960,viewH=540,scale=1,ox=0,oy=0,panoWidth=WIDTH,panoLeft=0,
  quality=1,slowFrames=0,noticeUntil=0,notification='';
function resize(){
  viewW=Math.max(1,$('trails-shell').clientWidth||innerWidth);
  viewH=Math.max(1,$('trails-shell').clientHeight||innerHeight);
  const density=Math.min(1,Math.sqrt(PIXELS/(viewW*viewH)))*quality;
  const w=Math.max(1,Math.round(viewW*density)),h=Math.max(1,Math.round(viewH*density));
  if(canvas.width!==w)canvas.width=w;
  if(canvas.height!==h)canvas.height=h;
  scale=Math.min(viewW/WIDTH,viewH/HEIGHT);
  ox=(viewW-WIDTH*scale)/2;oy=(viewH-HEIGHT*scale)/2;
  panoWidth=Math.max(WIDTH,Math.ceil(viewW/scale/4)*4);
  panoLeft=(WIDTH-panoWidth)/2;
  if(viewH>viewW&&mode==='running')pause();
}
window.addEventListener('resize',resize,{passive:true});
resize();
function setText(id,value){
  const el=$(id);if(el.textContent!==value)el.textContent=value;
}
function setScreen(name){
  $('trails-menu').classList.toggle('hidden',name!=='menu');
  $('trails-pause-menu').classList.toggle('hidden',name!=='paused');
  $('trails-finish').classList.toggle('hidden',name!=='result');
  $('trails-hud').classList.toggle('hidden',name==='menu');
  joystick.classList.toggle('hidden',name!=='running');
  $('trails-dash').classList.toggle('hidden',name!=='running');
  $('trails-input-help').classList.toggle('hidden',name!=='running');
}
function start(){
  game=createGame((Date.now()^Math.floor(Math.random()*0x7fffffff))>>>0);
  quality=1;slowFrames=0;resize();prevTimestamp=0;accum=0;
  mode='running';keys.clear();resetStick();dashPending=false;
  notification='STEER · AVOID LIGHT TRAILS';noticeUntil=2.4;
  setScreen('running');updateHud();
}
function pause(){
  if(mode!=='running')return;
  mode='paused';resetStick();dashPending=false;setScreen('paused');
}
function resume(){
  if(mode!=='paused')return;
  mode='running';prevTimestamp=0;accum=0;setScreen('running');
}
function finish(){
  mode='result';setScreen('result');
  setText('trails-outcome',game.outcome==='victory'?'VICTORY':'RUN ENDED');
  setText('trails-summary',game.outcome==='victory'?'LAST CUBE RUNNING':
    game.players[0].fallCause==='trail'?'CAUGHT BY A NEON TRAIL':'THE ARENA GOT YOU');
  setText('trails-duration',clock(game.elapsed));
  setText('trails-kos',String(game.players[0].eliminations));
  setText('trails-zone-end',String(game.zone+1).padStart(2,'0'));
}
function downloadLog(){
  if(!game)return;
  const blob=new Blob([JSON.stringify(audit(game),null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='neon-trails-zone-'+String(game.zone+1).padStart(2,'0')+'-run-audit.json';
  document.body.appendChild(a);a.click();a.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),2000);
}
$('trails-start').addEventListener('click',start);
$('trails-again').addEventListener('click',start);
$('trails-pause').addEventListener('click',pause);
$('trails-resume').addEventListener('click',resume);
$('trails-restart').addEventListener('click',start);
$('trails-export').addEventListener('click',downloadLog);
$('trails-export-pause').addEventListener('click',downloadLog);
function moveStick(e){
  const r=joystick.getBoundingClientRect();
  const dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2;
  const radius=r.width*.38,mag=hypot(dx,dy);
  joyX=mag>3?dx/mag:0;joyY=mag>3?dy/mag:0;
  const d=Math.min(mag,radius);
  stick.style.transform='translate(calc(-50% + '+(joyX*d).toFixed(1)+
    'px),calc(-50% + '+(joyY*d).toFixed(1)+'px))';
}
function resetStick(){
  pointer=null;joyX=0;joyY=0;
  stick.style.transform='translate(-50%,-50%)';
}
joystick.addEventListener('pointerdown',e=>{
  if(mode!=='running'||pointer!==null)return;
  e.preventDefault();pointer=e.pointerId;joystick.setPointerCapture(e.pointerId);moveStick(e);
});
joystick.addEventListener('pointermove',e=>{
  if(pointer===e.pointerId){e.preventDefault();moveStick(e);}
});
function release(e){if(e.pointerId===pointer)resetStick();}
joystick.addEventListener('pointerup',release);
joystick.addEventListener('pointercancel',release);
joystick.addEventListener('lostpointercapture',release);
$('trails-dash').addEventListener('pointerdown',e=>{
  if(mode!=='running')return;
  e.preventDefault();dashPending=true;
});
window.addEventListener('keydown',e=>{
  const key=e.key.length===1?e.key.toLowerCase():e.key;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Escape'].includes(key))
    e.preventDefault();
  keys.add(key);
  if(key===' '&&!e.repeat)dashPending=true;
  if(key==='Escape'){if(mode==='running')pause();else if(mode==='paused')resume();}
});
window.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
window.addEventListener('blur',()=>{keys.clear();resetStick();if(mode==='running')pause();});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&mode==='running')pause();
});
function input(){
  if(pointer!==null)return {x:joyX,y:joyY};
  const x=Number(keys.has('ArrowRight')||keys.has('d'))-
          Number(keys.has('ArrowLeft')||keys.has('a'));
  const y=Number(keys.has('ArrowDown')||keys.has('s'))-
          Number(keys.has('ArrowUp')||keys.has('w'));
  return {x,y};
}
function clock(sec){
  return Math.floor(sec/60)+':'+String(Math.floor(sec%60)).padStart(2,'0');
}
function updateHud(){
  if(!game)return;
  setText('trails-zone','ZONE '+String(game.zone+1).padStart(2,'0'));
  const countdown=nextContraction(game.elapsed);
  setText('trails-phase',countdown<=3?
    'ARENA CONTRACTS · '+Math.ceil(countdown)+'S':
    ZONE_NAMES[game.zone%ZONE_NAMES.length]+
    ' · SPEED '+(speedAt(game.zone)/108).toFixed(2)+'×');
  setText('trails-count',game.players.filter(p=>p.alive).length+' ALIVE');
  setText('trails-clock',clock(game.elapsed));
  const remaining=game.players[0].cooldown;
  setText('trails-dash',remaining>0?remaining.toFixed(1)+'s':'DASH');
  $('trails-dash').classList.toggle('recharging',remaining>0);
  $('trails-dash').disabled=remaining>0;
  const note=game.announced&&game.elapsed<noticeUntil?game.announced:notification;
  if(game.announced){
    notification=game.announced;noticeUntil=game.elapsed+1.45;game.announced=null;
  }
  $('trails-announce').classList.toggle('hidden',game.elapsed>noticeUntil);
  setText('trails-announce',notification);
}
// Browser fullscreen capability and denial behavior same as Clash.
const shell=$('trails-shell'),fullButtons=[$('trails-fullscreen'),$('trails-fullscreen-menu')];
function syncFullscreen(){
  const on=document.fullscreenElement===shell;
  fullButtons.forEach(b=>{b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',on?'Exit fullscreen':'Enter fullscreen');});
  $('trails-fullscreen').textContent=on?'⤡':'⛶';
  $('trails-fullscreen-menu').textContent=on?'⤡ EXIT FULLSCREEN':'⛶ FULLSCREEN';
}
function full(){
  const on=document.fullscreenElement===shell;
  try{
    const promise=on?document.exitFullscreen():
      shell.requestFullscreen&&shell.requestFullscreen({navigationUI:'hide'});
    if(!promise){$('trails-fullscreen-status').textContent='Fullscreen unavailable in this browser.';return;}
    if(promise.catch)promise.catch(()=>{
      $('trails-fullscreen-status').textContent='Your browser blocked fullscreen.';
    });
  }catch(_){$('trails-fullscreen-status').textContent='Fullscreen unavailable.';}
}
fullButtons.forEach(b=>b.addEventListener('click',full));
document.addEventListener('fullscreenchange',()=>{syncFullscreen();resize();});
syncFullscreen();

const hexAlpha=(hex,a)=>{
  const h=parseInt(hex.slice(1),16);
  return 'rgba('+(h>>16)+','+((h>>8)&255)+','+(h&255)+','+a+')';
};
function mix(from,to,t){
  const a=parseInt(from.slice(1),16),b=parseInt(to.slice(1),16);
  return '#'+[16,8,0].map(shift=>Math.round(((a>>shift)&255)*(1-t)+
    ((b>>shift)&255)*t).toString(16).padStart(2,'0')).join('');
}
function rounded(x,y,w,h,r){
  const rr=Math.min(r,w/2,h/2);ctx.beginPath();
  ctx.moveTo(x+rr,y);ctx.lineTo(x+w-rr,y);ctx.arcTo(x+w,y,x+w,y+rr,rr);
  ctx.lineTo(x+w,y+h-rr);ctx.arcTo(x+w,y+h,x+w-rr,y+h,rr);
  ctx.lineTo(x+rr,y+h);ctx.arcTo(x,y+h,x,y+h-rr,rr);
  ctx.lineTo(x,y+rr);ctx.arcTo(x,y,x+rr,y,rr);ctx.closePath();
}
function getScene(zone,stage){
  const key=zone+':'+stage+':'+panoWidth;
  let slot=sceneSlots.find(s=>s.key===key&&s.canvas);
  if(slot)return slot.canvas;
  slot=sceneSlots[sceneIndex];sceneIndex=(sceneIndex+1)%2;
  if(!slot.canvas)slot.canvas=document.createElement('canvas');
  slot.canvas.width=panoWidth;slot.canvas.height=HEIGHT;
  const buffer=slot.canvas.getContext('2d',{alpha:false});
  // One static background and floor render per zone/size. The visible
  // context is never swapped or mutated by the cache renderer.
  buffer.setTransform(1,0,0,1,-panoLeft,0);
  paintWorldCached(buffer,PALETTES[zone%PALETTES.length],stage);
  slot.key=key;
  return slot.canvas;
}
function paintWorldCached(buffer,palette,stage){
  // Preserve the same world painter and path code while temporarily
  // redirecting the variable through a scope-local 2D proxy-like wrapper:
  // instead of mutable global context, use a static scene-specific painter.
  const [primary,shadow,secondary]=palette,arena=arenaAt(stage*2);
  const sky=buffer.createLinearGradient(0,0,0,HEIGHT);
  sky.addColorStop(0,'#060b19');sky.addColorStop(.5,mix('#081525',shadow,.65));
  sky.addColorStop(1,mix('#071425',shadow,.4));
  buffer.fillStyle=sky;buffer.fillRect(panoLeft,0,panoWidth,HEIGHT);
  const g=buffer.createRadialGradient(CX,CY,0,CX,CY,520);
  g.addColorStop(0,hexAlpha(primary,.2));g.addColorStop(.58,hexAlpha(secondary,.07));
  g.addColorStop(1,hexAlpha(primary,0));
  buffer.fillStyle=g;buffer.fillRect(panoLeft,0,panoWidth,HEIGHT);
  for(let x=-1000;x<panoLeft+panoWidth+100;x+=74){
    const y=185+(Math.abs(x*41)%170);
    buffer.fillStyle=hexAlpha(secondary,.035);
    buffer.fillRect(x,y,18+(Math.abs(x*7)%15),HEIGHT-y);
  }
  const rr=(x,y,w,h,r)=>{
    const n=Math.min(r,w/2,h/2);buffer.beginPath();
    buffer.moveTo(x+n,y);buffer.lineTo(x+w-n,y);buffer.arcTo(x+w,y,x+w,y+n,n);
    buffer.lineTo(x+w,y+h-n);buffer.arcTo(x+w,y+h,x+w-n,y+h,n);
    buffer.lineTo(x+n,y+h);buffer.arcTo(x,y+h,x,y+h-n,n);
    buffer.lineTo(x,y+n);buffer.arcTo(x,y,x+n,y,n);buffer.closePath();
  };
  rr(arena.left,arena.top,arena.right-arena.left,arena.bottom-arena.top,24);
  const surface=buffer.createLinearGradient(arena.left,arena.top,arena.right,arena.bottom);
  surface.addColorStop(0,mix('#101c36',primary,.12));
  surface.addColorStop(.54,mix('#0a1629',shadow,.45));
  surface.addColorStop(1,mix('#0a1625',secondary,.18));
  buffer.fillStyle=surface;buffer.fill();
  buffer.save();buffer.clip();buffer.strokeStyle=hexAlpha(primary,.08);buffer.lineWidth=1;
  for(let x=arena.left+46;x<arena.right;x+=55){
    buffer.beginPath();buffer.moveTo(x,arena.top);buffer.lineTo(x,arena.bottom);buffer.stroke();
  }
  for(let y=arena.top+42;y<arena.bottom;y+=55){
    buffer.beginPath();buffer.moveTo(arena.left,y);buffer.lineTo(arena.right,y);buffer.stroke();
  }
  buffer.restore();
  buffer.strokeStyle=hexAlpha(primary,.73);buffer.lineWidth=3.2;
  rr(arena.left,arena.top,arena.right-arena.left,arena.bottom-arena.top,24);buffer.stroke();
  buffer.strokeStyle='rgba(237,252,255,.4)';buffer.lineWidth=1;
  rr(arena.left+4,arena.top+4,arena.right-arena.left-8,
    arena.bottom-arena.top-8,20);buffer.stroke();
}
function sprite(color){
  if(sprites[color])return sprites[color];
  const c=document.createElement('canvas');c.width=64;c.height=64;
  const g=c.getContext('2d');
  g.translate(32,32);
  const path=(x,y,w,h,r)=>{
    g.beginPath();g.moveTo(x+r,y);g.lineTo(x+w-r,y);
    g.quadraticCurveTo(x+w,y,x+w,y+r);g.lineTo(x+w,y+h-r);
    g.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    g.lineTo(x+r,y+h);g.quadraticCurveTo(x,y+h,x,y+h-r);
    g.lineTo(x,y+r);g.quadraticCurveTo(x,y,x+r,y);g.closePath();
  };
  g.fillStyle=hexAlpha(color,.3);g.shadowColor=color;g.shadowBlur=10;
  path(-10,-10,20,20,4);g.fill();g.shadowBlur=0;
  if(IDENTITY?.paintPlayer)IDENTITY.paintPlayer(g,{
    x:-10,y:-10,w:20,h:20,primary:color,secondary:mix(color,'#ffffff',.24),
    quality:{density:1,glow:.65},ambientLight:.58,bodyPath:path
  });
  else{
    g.fillStyle=mix(color,'#f9ffff',.74);path(-10,-10,20,20,4);g.fill();
    g.strokeStyle=color;g.lineWidth=1.8;g.stroke();
  }
  return sprites[color]=c;
}
function drawTrails(){
  // Fixed three-age buckets amortize hundreds of segments into at most 36
  // Canvas strokes (4 cubes × 3 buckets × 3 coats), not 3 strokes PER segment.
  // This is important to retain Clash 1.4's mobile frame pacing.
  const now=game.elapsed,ttl=trailLife(game.zone);
  ctx.save();ctx.lineJoin='round';ctx.lineCap='butt';
  for(const p of game.players){
    for(let band=0;band<3;band++){
      let count=0;
      ctx.beginPath();
      const newest=p.trail[p.trail.length-1];
      for(const seg of p.trail){
        const remaining=clamp((ttl-(now-seg.at))/ttl,0,1);
        if(remaining<=0||Math.min(2,Math.floor(remaining*3))!==band)continue;
        // A line ends BEHIND the moving cube. The old 'nose tick' looked
        // like a fragment of the dangerous trail projecting forward.
        let x2=seg.x2,y2=seg.y2;
        if(p.alive && seg===newest){
          const dx=x2-seg.x1,dy=y2-seg.y1,len=hypot(dx,dy);
          const forward=hypot(p.x-x2,p.y-y2);
          if(len>1 && forward<14){
            const trim=Math.min(len,(14-forward));
            x2-=dx/len*trim;y2-=dy/len*trim;
          }
        }
        ctx.moveTo(seg.x1,seg.y1);
        ctx.lineTo(x2,y2);
        count++;
      }
      if(!count)continue;
      const fade=[.26,.62,1][band];
      // Tiny traveling brightness modulation creates neon flow with only
      // three shared strokes per age band, not hundreds of shadow blurs.
      const shimmer=.90+.10*Math.sin(now*5.6-p.id*1.7-band*.65);
      ctx.strokeStyle=p.color;ctx.globalAlpha=.16*fade*shimmer;ctx.lineWidth=8.5;
      ctx.stroke();
      ctx.globalAlpha=.79*fade*shimmer;ctx.lineWidth=2.65;ctx.stroke();
      ctx.strokeStyle=mix(p.color,'#f7ffff',.68);
      ctx.globalAlpha=.37*fade*shimmer;ctx.lineWidth=.85;ctx.stroke();
    }
  }
  ctx.restore();
}
function drawRunners(){
  ctx.save();
  for(const p of game.players){
    const alpha=p.alive?1:Math.max(0,1-(game.elapsed-(p.fallenAt||0))/.42);
    if(alpha<=0)continue;
    const dashing=p.dash>0;
    ctx.globalAlpha=alpha;
    if(dashing&&!reduced()){
      const dx=Math.cos(p.angle),dy=Math.sin(p.angle);
      ctx.strokeStyle=p.color;ctx.lineWidth=3.2;ctx.globalAlpha=.5*alpha;
      ctx.beginPath();ctx.moveTo(p.x-dx*8,p.y-dy*8);
      ctx.lineTo(p.x-dx*37,p.y-dy*37);ctx.stroke();ctx.globalAlpha=alpha;
    }
    ctx.drawImage(sprite(p.color),p.x-32,p.y-32);
    ctx.font='bold 11px system-ui,sans-serif';
    ctx.textAlign='center';ctx.fillStyle=p.id===0?'#f3ffff':p.color;
    ctx.fillText(p.name,p.x,p.y-24);
    // No forward-pointing tail marker: the cube face and backward dash
    // streak already explain direction without looking like an obstacle.
  }
  ctx.restore();
}
function render(){
  if(!game)return;
  ctx.setTransform(canvas.width/viewW,0,0,canvas.height/viewH,0,0);
  ctx.clearRect(0,0,viewW,viewH);
  ctx.translate(ox,oy);ctx.scale(scale,scale);
  const activeZone=game.zone,stage=game.stage,palette=PALETTES[activeZone%7];
  const current=getScene(activeZone,stage);
  if(game.paletteFade>0&&activeZone>0&&TIDE&&!reduced()){
    const old=getScene(activeZone-1,stage);
    ctx.drawImage(old,panoLeft,0,panoWidth,HEIGHT);
    ctx.save();
    const progress=1-game.paletteFade/1.05;
    TIDE.clipNewColor(ctx,{x:panoLeft,y:0,w:panoWidth,h:HEIGHT},progress);
    ctx.drawImage(current,panoLeft,0,panoWidth,HEIGHT);
    ctx.restore();
    TIDE.drawFront(ctx,{x:panoLeft,y:0,w:panoWidth,h:HEIGHT},progress,palette[0],.63);
  }else ctx.drawImage(current,panoLeft,0,panoWidth,HEIGHT);
  if(nextContraction(game.elapsed)<=3){
    const next=arenaAt(game.zone+1);
    ctx.save();
    ctx.globalAlpha=.56;
    ctx.strokeStyle='#ffc88c';
    ctx.lineWidth=1.6;
    ctx.setLineDash([9,8]);
    rounded(next.left,next.top,next.right-next.left,next.bottom-next.top,23);
    ctx.stroke();
    ctx.restore();
  }
  drawTrails();
  drawRunners();
}
function loop(stamp){
  const delta=prevTimestamp?Math.max(0,stamp-prevTimestamp):0;
  prevTimestamp=stamp;
  if(mode==='running'&&game){
    if(delta>65)slowFrames++;
    else slowFrames=Math.max(0,slowFrames-2);
    if(slowFrames>=8&&quality>.57){quality=quality>.85?.8:.55;resize();slowFrames=0;}
    accum+=Math.min(delta/1000,.04);
    let ticks=0;
    while(accum>=FIXED_STEP&&ticks<3){
      const v=input();v.dash=dashPending;
      dashPending=false;
      tick(game,v,FIXED_STEP);
      accum-=FIXED_STEP;ticks++;
    }
    if(game.state==='finished')finish();
    updateHud();
  }
  const start=performance.now();
  render();
  if(mode==='running'&&game){
    game.performance.frames++;
    if(delta>50)game.performance.slow50++;
    game.performance.worstFrameMs=Math.max(game.performance.worstFrameMs,delta);
    game.performance.renderMaxMs=Math.max(game.performance.renderMaxMs,
      performance.now()-start);
  }
  window.requestAnimationFrame(loop);
}
setScreen('menu');
window.requestAnimationFrame(loop);
})(typeof globalThis!=='undefined'?globalThis:this);
