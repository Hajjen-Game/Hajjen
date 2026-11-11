/* CHROMA RUSH — NEON CIRCUIT 1.2: Track Tide & Course Variety.
 * Three curated straight/chicane tracks. Zone pigment flows forward
 * ALONG the road; the landscape remains a fixed dark backdrop.
 * Cached panoramas, shared glass sprites, 750k mobile pixel cap.
 */
(function(root){
'use strict';
const CORE=root.ChromaNeonCircuitCore,CONFIG=root.ChromaConfig,
  IDENTITY=root.ChromaIdentity,TIDE=root.ChromaCenterPulse;
if(!CORE||!CONFIG||!document.getElementById('circuit-canvas'))return;
const $=id=>document.getElementById(id);
const WIDTH=CORE.WIDTH,HEIGHT=CORE.HEIGHT,TRACK=CORE.TRACK;
const SHELL=$('circuit-shell'),CANVAS=$('circuit-canvas'),ctx=CANVAS.getContext('2d');
if(!ctx){$('circuit-menu').textContent='Canvas 2D required';return;}
const BUDGET=750000,PALETTES=CONFIG.PALETTES.slice(0,8),
  ZONE_NAMES=['FLOW','SURGE','PULSE','OVERDRIVE','FRENZY','CRITICAL','FINAL'];
const reduced=()=>window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const rgb=(hex,a=1)=>{
  const i=parseInt(hex.slice(1),16);
  return 'rgba('+(i>>16)+','+((i>>8)&255)+','+(i&255)+','+a+')';
};
const mix=(a,b,t)=>{
  const x=parseInt(a.slice(1),16),y=parseInt(b.slice(1),16);
  return '#'+[16,8,0].map(k=>Math.round(((x>>k)&255)*(1-t)+
    ((y>>k)&255)*t).toString(16).padStart(2,'0')).join('');
};
let viewW=960,viewH=540,scale=1,ox=0,oy=0,
  panoWidth=WIDTH,panoLeft=0,quality=1,slowStreak=0;
const slots=[{key:'',canvas:null},{key:'',canvas:null}],sprites=Object.create(null);
let slotCursor=0,mode='menu',race=null,preview=CORE.seededRace(103),
  nextCourse=0,joyId=null,joyX=0,joyY=0,brakePressed=false,dashPending=false,
  keys=new Set(),frameBefore=0,accumulator=0,noticeUntil=0;
function resize(){
  viewW=Math.max(1,SHELL.clientWidth||innerWidth);
  viewH=Math.max(1,SHELL.clientHeight||innerHeight);
  const ratio=Math.min(1,Math.sqrt(BUDGET/(viewW*viewH)))*quality;
  const cw=Math.max(1,Math.floor(viewW*ratio)),ch=Math.max(1,Math.floor(viewH*ratio));
  if(CANVAS.width!==cw)CANVAS.width=cw;
  if(CANVAS.height!==ch)CANVAS.height=ch;
  scale=Math.min(viewW/WIDTH,viewH/HEIGHT);
  ox=(viewW-WIDTH*scale)/2;oy=(viewH-HEIGHT*scale)/2;
  panoWidth=Math.max(WIDTH,Math.ceil((viewW/scale)/4)*4);
  panoLeft=(WIDTH-panoWidth)/2;
  // Keep players safe when rotating the handset; no hidden game progress.
  if(viewH>viewW&&mode==='playing')pause();
}
root.addEventListener('resize',resize,{passive:true});
resize();
function text(id,value){const e=$(id),s=String(value);if(e.textContent!==s)e.textContent=s;}
function screen(next){
  mode=next;
  $('circuit-menu').classList.toggle('hidden',next!=='menu');
  $('circuit-pause-menu').classList.toggle('hidden',next!=='paused');
  $('circuit-finish').classList.toggle('hidden',next!=='result');
  $('circuit-hud').classList.toggle('hidden',next==='menu');
  $('circuit-joystick').classList.toggle('hidden',next!=='playing');
  $('circuit-actions').classList.toggle('hidden',next!=='playing');
  $('circuit-input-help').classList.toggle('hidden',next!=='playing');
}
function begin(){
  const course=nextCourse++%CORE.TRACKS.length;
  race=CORE.seededRace((Date.now()^Math.floor(Math.random()*0x7fffffff))>>>0,course);
  frameBefore=0;accumulator=0;quality=1;slowStreak=0;resize();
  keys.clear();resetStick();brakePressed=false;dashPending=false;
  screen('playing');noticeUntil=0;updateHud();
}
function pause(){
  if(mode!=='playing')return;
  screen('paused');brakePressed=false;dashPending=false;resetStick();
  $('circuit-brake').classList.remove('pressed');
}
function resume(){
  if(mode!=='paused')return;
  screen('playing');frameBefore=0;accumulator=0;
}
function finish(){
  screen('result');
  text('circuit-outcome',race.finishPlace===1?'1ST PLACE!':
    race.finishPlace===2?'2ND PLACE':race.finishPlace===3?'3RD PLACE':'RACE COMPLETE');
  text('circuit-result-message',race.racers[0].finished?
    'THREE LAPS COMPLETE':'TIME LIMIT REACHED');
  text('circuit-result-place',ordinal(race.finishPlace));
  text('circuit-result-time',clock(race.elapsed));
  const lapTimes=race.racers[0].lapTimes;
  text('circuit-result-best',lapTimes.length?
    Math.min(...lapTimes).toFixed(2)+'s':'—');
}
function clock(t){return Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0')}
function ordinal(p){return (['','1ST','2ND','3RD','4TH'][p]||'—')}
function download(){
  if(!race)return;
  const blob=new Blob([JSON.stringify(CORE.audit(race),null,2)],
    {type:'application/json'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;link.download='neon-circuit-zone-'+String(race.zone+1).padStart(2,'0')+
    '-race-audit.json';
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}
$('circuit-start').addEventListener('click',begin);
$('circuit-again').addEventListener('click',begin);
$('circuit-pause').addEventListener('click',pause);
$('circuit-resume').addEventListener('click',resume);
$('circuit-restart').addEventListener('click',begin);
$('circuit-export').addEventListener('click',download);
$('circuit-export-pause').addEventListener('click',download);
function setStick(e){
  const box=$('circuit-joystick').getBoundingClientRect();
  const dx=e.clientX-box.x-box.width*.5,dy=e.clientY-box.y-box.height*.5;
  const r=box.width*.39,len=Math.hypot(dx,dy);
  joyX=len>4?dx/len:0;joyY=len>4?dy/len:0;
  const mag=Math.min(len,r);
  $('circuit-stick').style.transform='translate(calc(-50% + '+(joyX*mag).toFixed(1)+
    'px),calc(-50% + '+(joyY*mag).toFixed(1)+'px))';
}
function resetStick(){
  joyId=null;joyX=0;joyY=0;
  $('circuit-stick').style.transform='translate(-50%, -50%)';
}
const joystick=$('circuit-joystick');
joystick.addEventListener('pointerdown',e=>{
  if(mode!=='playing'||joyId!==null)return;
  e.preventDefault();joyId=e.pointerId;
  joystick.setPointerCapture(e.pointerId);setStick(e);
});
joystick.addEventListener('pointermove',e=>{
  if(joyId===e.pointerId){e.preventDefault();setStick(e);}
});
const release=e=>{if(joyId===e.pointerId)resetStick()};
joystick.addEventListener('pointerup',release);
joystick.addEventListener('pointercancel',release);
joystick.addEventListener('lostpointercapture',release);
const brake=$('circuit-brake'),dash=$('circuit-dash');
brake.addEventListener('pointerdown',e=>{
  if(mode!=='playing')return;e.preventDefault();brakePressed=true;
  brake.setPointerCapture(e.pointerId);brake.classList.add('pressed');
});
const stopBrake=()=>{
  brakePressed=false;brake.classList.remove('pressed');
};
brake.addEventListener('pointerup',stopBrake);
brake.addEventListener('pointercancel',stopBrake);
brake.addEventListener('lostpointercapture',stopBrake);
dash.addEventListener('pointerdown',e=>{
  if(mode!=='playing')return;e.preventDefault();dashPending=true;
});
root.addEventListener('keydown',e=>{
  const k=e.key.length===1?e.key.toLowerCase():e.key;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Shift','Escape'].includes(k))
    e.preventDefault();
  keys.add(k);
  if(k===' '&&!e.repeat&&mode==='playing')dashPending=true;
  if(k==='Escape'){if(mode==='playing')pause();else if(mode==='paused')resume();}
});
root.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
root.addEventListener('blur',()=>{keys.clear();stopBrake();resetStick();if(mode==='playing')pause();});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&mode==='playing')pause();
});
function getInput(){
  let x=joyX,y=joyY;
  if(joyId===null){
    x=Number(keys.has('ArrowRight')||keys.has('d'))-
      Number(keys.has('ArrowLeft')||keys.has('a'));
    y=Number(keys.has('ArrowDown')||keys.has('s'))-
      Number(keys.has('ArrowUp')||keys.has('w'));
  }
  const input={x,y,brake:brakePressed||keys.has('Shift'),dash:dashPending};
  dashPending=false;
  return input;
}
function updateHud(){
  if(!race)return;
  const me=race.racers[0],lap=Math.min(CORE.LAPS_TO_WIN,me.laps+1);
  text('circuit-zone','ZONE '+String(race.zone+1).padStart(2,'0'));
  text('circuit-phase',ZONE_NAMES[race.zone%ZONE_NAMES.length]+
    ' · SPEED '+(CORE.zoneSpeed(race.zone)/118).toFixed(2)+'×');
  text('circuit-lap','LAP '+lap+'/'+CORE.LAPS_TO_WIN);
  text('circuit-flow','LINE FLOW '+Math.round(me.flow*100)+'%');
  text('circuit-place',ordinal(CORE.currentPosition(race))+' / 4');
  text('circuit-clock',clock(race.elapsed));
  text('circuit-dash',me.dashCooldown>.08?me.dashCooldown.toFixed(1)+'s':'DASH');
  dash.disabled=me.dashCooldown>.08;
  dash.classList.toggle('recharging',dash.disabled);
  let label='',visible=false;
  if(race.phase==='ready'){
    label=race.track.name+' · GET READY '+Math.max(1,Math.ceil(race.ready));
    visible=true;
  }else if(race.announcement&&race.elapsed<race.announcementTime){
    label=race.announcement;visible=true;
  }
  text('circuit-announce',label);
  $('circuit-announce').classList.toggle('hidden',!visible);
}
const buttons=[$('circuit-fullscreen'),$('circuit-fullscreen-menu')];
function syncFull(){
  const active=document.fullscreenElement===SHELL;
  for(const b of buttons){
    b.setAttribute('aria-pressed',String(active));
    b.setAttribute('aria-label',active?'Exit fullscreen':'Enter fullscreen');
    b.title=active?'Exit fullscreen':'Fullscreen';
  }
  text('circuit-fullscreen',active?'⤡':'⛶');
  text('circuit-fullscreen-menu',active?'⤡ EXIT FULLSCREEN':'⛶ FULLSCREEN');
}
function toggleFull(){
  const active=document.fullscreenElement===SHELL;
  try{
    const p=active?document.exitFullscreen():
      SHELL.requestFullscreen&&SHELL.requestFullscreen({navigationUI:'hide'});
    if(!p){text('circuit-fullscreen-status','Fullscreen not supported in this browser.');return;}
    if(p.catch)p.catch(()=>text('circuit-fullscreen-status','Browser blocked fullscreen.'));
  }catch(_){text('circuit-fullscreen-status','Fullscreen unavailable.');}
}
buttons.forEach(b=>b.addEventListener('click',toggleFull));
document.addEventListener('fullscreenchange',()=>{syncFull();resize()});
syncFull();
function trackPath(g,track=TRACK){
  const list=track.samples;
  g.beginPath();g.moveTo(list[0].x,list[0].y);
  for(let i=1;i<list.length;i++)g.lineTo(list[i].x,list[i].y);
  g.closePath();
}
function drawStatic(g,zone,track){
  const palette=PALETTES[zone%PALETTES.length];
  const primary=palette.primary,secondary=palette.secondary,shadow=palette.shadow;
  // Identical neutral backdrop in every zone: only the track changes.
  const sky=g.createLinearGradient(0,0,0,HEIGHT);
  sky.addColorStop(0,'#060a18');
  sky.addColorStop(.46,'#10263b');
  sky.addColorStop(1,'#09162a');
  g.fillStyle=sky;g.fillRect(panoLeft,0,panoWidth,HEIGHT);
  const haze=g.createRadialGradient(CORE.CX,CORE.CY,25,CORE.CX,CORE.CY,530);
  haze.addColorStop(0,rgb('#307caf',.17));
  haze.addColorStop(.55,rgb('#4386b4',.055));
  haze.addColorStop(1,rgb('#307caf',0));
  g.fillStyle=haze;g.fillRect(panoLeft,0,panoWidth,HEIGHT);
  for(let x=-1200;x<panoLeft+panoWidth+100;x+=67){
    const top=153+Math.abs((x*37)%195);
    g.fillStyle=rgb('#4a9dd5',.027);
    g.fillRect(x,top,18+(Math.abs(x*13)%19),HEIGHT-top);
  }
  // Cached atmosphere and road: one heavy paint per zone, never per frame.
  g.lineCap='round';g.lineJoin='round';
  trackPath(g,track);g.strokeStyle='rgba(0,1,14,.55)';
  g.lineWidth=132;g.stroke();
  trackPath(g,track);g.strokeStyle=rgb(primary,.11);
  g.lineWidth=120;g.stroke();
  trackPath(g,track);g.strokeStyle=rgb(primary,.53);
  g.lineWidth=104;g.stroke();
  trackPath(g,track);g.strokeStyle=rgb('#bedfff',.24);
  g.lineWidth=101;g.stroke();
  trackPath(g,track);g.strokeStyle='#09172b';
  g.lineWidth=96;g.stroke();
  const asphalt=g.createLinearGradient(170,140,772,408);
  asphalt.addColorStop(0,mix('#1a2e46',primary,.2));
  asphalt.addColorStop(.57,mix('#101b31',shadow,.23));
  asphalt.addColorStop(1,mix('#1c2d46',secondary,.13));
  trackPath(g,track);g.strokeStyle=asphalt;g.lineWidth=89;g.stroke();
  // Thin interior shear line implies forward travel without looking like
  // isolated obstacle bars or a second track.
  trackPath(g,track);g.strokeStyle=rgb(primary,.08);
  g.lineWidth=1.1;g.setLineDash([16,15]);g.stroke();g.setLineDash([]);
  // Raised rim/ramp lips are readable without looking like separate
  // obstacles. These are cached world details, never frame-time effects.
  trackPath(g,track);g.strokeStyle=rgb('#e0f4ff',.13);
  g.lineWidth=97.8;g.stroke();
  trackPath(g,track);g.strokeStyle=rgb(primary,.30);
  g.lineWidth=95.3;g.stroke();
  trackPath(g,track);g.strokeStyle=asphalt;g.lineWidth=89;g.stroke();
  for(let s=28;s<track.length;s+=49){
    const p=CORE.pointAt(s,track);
    for(const side of [-1,1]){
      const x=p.x+p.nx*side*CORE.TRACK_HALF;
      const y=p.y+p.ny*side*CORE.TRACK_HALF;
      g.save();g.translate(x,y);g.rotate(p.angle);
      g.fillStyle=rgb(s%3<1?secondary:primary,.43);
      g.fillRect(-4,side===1?-3:0,9,3);
      g.restore();
    }
  }
  // Tangential black-and-white start stripe, broad enough to read at
  // full mobile screen scale; crossings are based on actual lap progress.
  const finish=CORE.pointAt(0,track);
  g.save();g.translate(finish.x,finish.y);g.rotate(finish.angle);
  for(let col=-4;col<4;col++){
    for(let row=0;row<2;row++){
      if((col+row)%2===0)g.fillStyle='#d9f6ff';
      else g.fillStyle='#22435a';
      g.globalAlpha=.86;
      g.fillRect(row*8-8,col*10,8,10);
    }
  }
  g.restore();
}
function getStatic(zone,track=TRACK){
  const key=track.courseId+':'+zone+':'+panoWidth;
  let slot=slots.find(s=>s.key===key&&s.canvas);
  if(slot)return slot.canvas;
  slot=slots[slotCursor];slotCursor=(slotCursor+1)%slots.length;
  if(!slot.canvas)slot.canvas=document.createElement('canvas');
  if(slot.canvas.width!==panoWidth)slot.canvas.width=panoWidth;
  if(slot.canvas.height!==HEIGHT)slot.canvas.height=HEIGHT;
  const g=slot.canvas.getContext('2d',{alpha:false});
  g.setTransform(1,0,0,1,-panoLeft,0);
  drawStatic(g,zone,track);slot.key=key;
  return slot.canvas;
}
function rounded(g,x,y,w,h,r){
  g.beginPath();g.moveTo(x+r,y);g.lineTo(x+w-r,y);
  g.quadraticCurveTo(x+w,y,x+w,y+r);g.lineTo(x+w,y+h-r);
  g.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  g.lineTo(x+r,y+h);g.quadraticCurveTo(x,y+h,x,y+h-r);
  g.lineTo(x,y+r);g.quadraticCurveTo(x,y,x+r,y);g.closePath();
}
function sprite(color){
  if(sprites[color])return sprites[color];
  const surface=document.createElement('canvas');
  surface.width=68;surface.height=68;
  const g=surface.getContext('2d');g.translate(34,34);
  g.fillStyle=rgb(color,.25);g.shadowColor=color;g.shadowBlur=13;
  rounded(g,-11,-11,22,22,5);g.fill();g.shadowBlur=0;
  if(IDENTITY&&typeof IDENTITY.paintPlayer==='function'){
    IDENTITY.paintPlayer(g,{
      x:-11,y:-11,w:22,h:22,primary:color,
      secondary:mix(color,'#ffffff',.24),
      quality:{density:1,glow:.72},ambientLight:.61,
      bodyPath:(x,y,w,h,r)=>rounded(g,x,y,w,h,Math.min(r,5))
    });
  }else{
    g.fillStyle=mix(color,'#ffffff',.75);
    rounded(g,-11,-11,22,22,5);g.fill();
    g.strokeStyle=color;g.lineWidth=2;g.stroke();
  }
  return sprites[color]=surface;
}
function drawRacers(r){
  for(const p of r.racers){
    const falling=p.fallTimer>0;
    const fallFraction=falling?clamp(p.fallTimer/CORE.FALL_SECONDS,0,1):1;
    const spriteScale=falling?.13+.87*fallFraction:1;
    const vx=Math.cos(p.angle),vy=Math.sin(p.angle);
    ctx.save();
    if(!falling&&!p.finished){
      // A short REAR wake, not a deadly light trail or extra forward tick.
      const d=p.dashTime>0;
      ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(p.x-vx*11,p.y-vy*11);
      ctx.lineTo(p.x-vx*(d?45:20),p.y-vy*(d?45:20));
      ctx.strokeStyle=p.color;ctx.lineWidth=d?4:2;
      ctx.globalAlpha=d?.52:.25;ctx.stroke();
    }
    ctx.globalAlpha=falling?Math.max(.08,fallFraction*.76):
      p.finished?.30:
      p.invulnerable>0?.63+.28*Math.sin(r.elapsed*15):1;
    // Simulate FALLING DOWN INTO DEPTH without sliding the image toward
    // the bottom of the phone, matching the shared Clash design language.
    ctx.translate(p.x,p.y);ctx.scale(spriteScale,spriteScale);
    if(!falling&&p.contactFlash>0&&!reduced()){
      ctx.globalAlpha*=clamp(p.contactFlash/.24,0,1)*.70;
      ctx.strokeStyle=p.color;ctx.lineWidth=2;
      ctx.strokeRect(-18,-18,36,36);
      ctx.globalAlpha=1;
    }
    ctx.drawImage(sprite(p.color),-34,-34);
    ctx.restore();
    if(!falling){
      ctx.save();
      ctx.textAlign='center';ctx.font='800 11px system-ui,sans-serif';
      ctx.fillStyle=p.id===0?'#ffffff':p.color;
      ctx.globalAlpha=p.finished?.4:1;
      ctx.fillText(p.name,p.x,p.y-23);
      ctx.restore();
    }
  }
}
function drawImpacts(r){
  if(reduced())return;
  for(const v of r.impacts){
    const alpha=clamp(v.life/.32,0,1);
    const tx=-v.ny,ty=v.nx;
    const blast=clamp((v.strength||190)/360,.45,1.35);
    const span=(14+(1-alpha)*19)*blast;
    ctx.save();
    ctx.globalAlpha=alpha*.85;ctx.lineCap='square';
    // A compressed white strike, flanked by each combatant's pigment.
    // All lines are DIRECTIONAL. No ring-shaped particle hitbox.
    for(let i=0;i<5;i++){
      const offset=(i-2)*7.2;
      ctx.lineWidth=i===2?3:1.8;
      ctx.strokeStyle=i===2?'#ffffff':i<2?v.colorA:v.colorB;
      const spread=span*(1-.12*Math.abs(i-2));
      ctx.beginPath();
      ctx.moveTo(v.x+tx*(offset-spread),v.y+ty*(offset-spread));
      ctx.lineTo(v.x+tx*(offset+spread),v.y+ty*(offset+spread));
      ctx.stroke();
    }
    ctx.restore();
  }
}
function paint(){
  const m=race||preview;
  ctx.setTransform(CANVAS.width/viewW,0,0,CANVAS.height/viewH,0,0);
  ctx.clearRect(0,0,viewW,viewH);
  ctx.translate(ox,oy);ctx.scale(scale,scale);
  const z=m.zone;
  const current=getStatic(z);
  if(m.tide>0&&z>0&&TIDE&&!reduced()){
    const previous=getStatic(z-1),progress=1-m.tide/1.12;
    ctx.drawImage(previous,panoLeft,0,panoWidth,HEIGHT);
    ctx.save();TIDE.clipNewColor(ctx,
      {x:panoLeft,y:0,w:panoWidth,h:HEIGHT},progress);
    ctx.drawImage(current,panoLeft,0,panoWidth,HEIGHT);
    ctx.restore();TIDE.drawFront(ctx,
      {x:panoLeft,y:0,w:panoWidth,h:HEIGHT},
      progress,PALETTES[z%PALETTES.length].primary,.65);
  }else ctx.drawImage(current,panoLeft,0,panoWidth,HEIGHT);
  drawImpacts(m);drawRacers(m);
}
function loop(now){
  const frameMs=frameBefore?Math.max(0,now-frameBefore):0;
  frameBefore=now;
  if(mode==='playing'&&race){
    if(frameMs>55)slowStreak++;else slowStreak=Math.max(0,slowStreak-2);
    if(slowStreak>=9&&quality>.55){
      quality=quality>.85?.79:.55;resize();slowStreak=0;
    }
    accumulator+=Math.min(frameMs/1000,.042);
    let loops=0;
    while(accumulator>=CORE.STEP&&loops<3){
      const input=getInput();
      CORE.tick(race,input,CORE.STEP);
      accumulator-=CORE.STEP;loops++;
    }
    if(race.finished)finish();
    updateHud();
  }
  const renderStart=performance.now();
  paint();
  if(mode==='playing'&&race){
    race.performance.frames++;
    if(frameMs>50)race.performance.slow50++;
    race.performance.worstFrameMs=Math.max(race.performance.worstFrameMs,frameMs);
    race.performance.renderMaxMs=Math.max(race.performance.renderMaxMs,
      performance.now()-renderStart);
  }
  root.requestAnimationFrame(loop);
}
screen('menu');
root.requestAnimationFrame(loop);
})(typeof window!=='undefined'?window:null);
