/* CHROMA RUSH — NEON CIRCUIT 2.1: Manual Racing & Track Identity.
 * Camera follows the cube through a multi-screen neon racing world.
 * The stable dark environment and road-only Track Tide render in visible
 * cached world tiles (never one enormous offscreen track image).
 */
(function(root){
'use strict';
const CORE=root.ChromaNeonCircuitCore,CONFIG=root.ChromaConfig,
  IDENTITY=root.ChromaIdentity,CAMERA=root.ChromaCircuitCamera;
if(!CORE||!CONFIG||!CAMERA||!document.getElementById('circuit-canvas'))return;
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
let viewW=960,viewH=540,quality=1,slowStreak=0,camera=null;
const TILE=448,TILE_PAD=10,TILE_LIMIT=36;
const tileCache=new Map(),sprites=Object.create(null);
let tileBuilds=0,tileHits=0,mode='menu',race=null,preview=CORE.seededRace(103),
  nextCourse=0,joyId=null,joyX=0,joyY=0,brakePressed=false,dashPending=false,
  keys=new Set(),frameBefore=0,accumulator=0,noticeUntil=0;
function resize(){
  viewW=Math.max(1,SHELL.clientWidth||innerWidth);
  viewH=Math.max(1,SHELL.clientHeight||innerHeight);
  const ratio=Math.min(1,Math.sqrt(BUDGET/(viewW*viewH)))*quality;
  const cw=Math.max(1,Math.floor(viewW*ratio)),ch=Math.max(1,Math.floor(viewH*ratio));
  if(CANVAS.width!==cw)CANVAS.width=cw;
  if(CANVAS.height!==ch)CANVAS.height=ch;
  // Camera uses a true 1:1 aspect transform; the visible world changes
  // with device dimensions instead of distorting the road and the cubes.
  if(camera)CAMERA.step(camera,(race||preview).racers[0],
    {width:viewW,height:viewH},0,true);
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
  camera=CAMERA.create(CORE.WORLD_BOUNDS,
    {width:viewW,height:viewH},race.racers[0]);
  tileCache.clear();tileBuilds=0;tileHits=0;
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
  // Analog thumb travel: centered means no drive, full radius full power.
  const strength=len>r*.13?Math.min(1,len/r):0;
  joyX=len>0?dx/len*strength:0;
  joyY=len>0?dy/len*strength:0;
  $('circuit-joystick').classList.toggle('driving',strength>.15);
  $('circuit-stick').style.transform='translate(calc(-50% + '+(joyX*r).toFixed(1)+
    'px),calc(-50% + '+(joyY*r).toFixed(1)+'px))';
}
function resetStick(){
  joyId=null;joyX=0;joyY=0;
  $('circuit-joystick').classList.remove('driving');
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
  // North-up follow camera: a thumb direction is the same world
  // direction, so it needs no aspect or camera-rotation correction.
  const input={x,y,brake:brakePressed||keys.has('Shift'),dash:dashPending};
  dashPending=false;
  return input;
}
function updateHud(){
  if(!race)return;
  const me=race.racers[0],lap=Math.min(CORE.LAPS_TO_WIN,me.laps+1);
  text('circuit-zone','ZONE '+String(race.zone+1).padStart(2,'0'));
  text('circuit-phase',ZONE_NAMES[race.zone%ZONE_NAMES.length]+
    ' · SPEED '+Math.round(me.speed));
  text('circuit-lap','LAP '+lap+'/'+CORE.LAPS_TO_WIN);
  text('circuit-flow','LINE FLOW '+Math.round(me.flow*100)+'%');
  text('circuit-place',ordinal(CORE.currentPosition(race))+' / 4');
  text('circuit-clock',clock(race.elapsed));
  text('circuit-dash',me.dashCooldown>.08?me.dashCooldown.toFixed(1)+'s':'DASH');
  dash.disabled=me.dashCooldown>.08||me.speed<18;
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
function forVisibleSegments(g,track,rect){
  const list=track.samples;
  let painting=false,found=false;
  g.beginPath();
  // Segments have global world coordinates; only nearby lines are emitted,
  // so multi-screen courses never issue a full-track paint on every frame.
  for(let i=1;i<list.length;i++){
    const a=list[i-1],b=list[i];
    const intersects=Math.max(a.x,b.x)>=rect.minX&&
      Math.min(a.x,b.x)<=rect.maxX&&
      Math.max(a.y,b.y)>=rect.minY&&Math.min(a.y,b.y)<=rect.maxY;
    if(intersects){
      if(!painting)g.moveTo(a.x,a.y);
      g.lineTo(b.x,b.y);found=true;painting=true;
    }else painting=false;
  }
  return found;
}
function tileHasRoad(track,rect){
  const a=track.bounds;
  if(a.minX>rect.maxX||a.maxX<rect.minX||
      a.minY>rect.maxY||a.maxY<rect.minY)return false;
  const list=track.samples;
  for(let i=1;i<list.length;i++){
    const p=list[i-1],q=list[i];
    if(Math.max(p.x,q.x)>=rect.minX&&Math.min(p.x,q.x)<=rect.maxX&&
      Math.max(p.y,q.y)>=rect.minY&&Math.min(p.y,q.y)<=rect.maxY)
      return true;
  }
  return false;
}
function paintRoadTile(g,zone,track,tileX,tileY){
  const palette=PALETTES[zone%PALETTES.length];
  const primary=palette.primary,secondary=palette.secondary;
  const rect={minX:tileX*TILE-TILE_PAD-74,
    maxX:(tileX+1)*TILE+TILE_PAD+74,
    minY:tileY*TILE-TILE_PAD-74,
    maxY:(tileY+1)*TILE+TILE_PAD+74};
  if(!tileHasRoad(track,rect))return false;
  g.save();g.translate(-tileX*TILE+TILE_PAD,-tileY*TILE+TILE_PAD);
  g.lineCap='round';g.lineJoin='round';
  const stroke=(width,color,dashed=false)=>{
    const visible=forVisibleSegments(g,track,rect);
    if(!visible)return;
    g.lineWidth=width;g.strokeStyle=color;
    if(dashed)g.setLineDash([16,15]);
    g.stroke();
    if(dashed)g.setLineDash([]);
  };
  // These geometries are RASTERIZED ONCE per visible tile per zone.
  // No huge full-world canvases and no runtime per-frame glow blur.
  // Dark shoulder, color-coded guard rail and precise bright cap.
  stroke(136,'rgba(0,1,14,.72)');
  stroke(124,rgb(secondary,.095));
  stroke(114,rgb(primary,.16));
  stroke(106,rgb(primary,.48));
  stroke(103,rgb('#c8f5ff',.26));
  stroke(98,'#071527');
  // The actual ROAD pigment changes across zones, not just the rails.
  const asphalt=g.createLinearGradient(
    track.bounds.minX,track.bounds.minY,
    track.bounds.maxX,track.bounds.maxY);
  asphalt.addColorStop(0,mix('#102038',primary,.33));
  asphalt.addColorStop(.40,mix('#13213a',primary,.31));
  asphalt.addColorStop(.70,mix('#131e35',secondary,.32));
  asphalt.addColorStop(1,mix('#16243b',primary,.30));
  stroke(89,asphalt);
  stroke(97,rgb('#e3faff',.13));
  stroke(95.5,rgb(primary,.39));
  stroke(90,'#09192c');
  stroke(88,asphalt);
  // Subtle lane gloss adds depth without reading as an obstacle.
  stroke(72,rgb('#dbf5ff',.032));
  stroke(62,rgb(primary,.052));
  stroke(52,asphalt);
  stroke(1.4,rgb('#d3f6ff',.18),true);
  // Small light studs/curb marks. Skip markers outside the current tile.
  for(let distance=28;distance<track.length;distance+=42){
    const p=CORE.pointAt(distance,track);
    if(p.x<rect.minX-10||p.x>rect.maxX+10||
        p.y<rect.minY-10||p.y>rect.maxY+10)continue;
    for(const side of [-1,1]){
      g.save();g.translate(p.x+p.nx*side*CORE.TRACK_HALF,
        p.y+p.ny*side*CORE.TRACK_HALF);
      g.rotate(p.angle);
      g.fillStyle=rgb((Math.floor(distance/84)%2)?primary:'#d5efff',.54);
      g.fillRect(-5,side===1?-3:0,11,3);g.restore();
    }
  }
  // A constant physical finish stripe for all viewports and zoom levels.
  const finish=CORE.pointAt(0,track);
  if(finish.x>rect.minX-30&&finish.x<rect.maxX+30&&
      finish.y>rect.minY-65&&finish.y<rect.maxY+65){
    g.save();g.translate(finish.x,finish.y);g.rotate(finish.angle);
    g.globalAlpha=.88;
    for(let col=-4;col<4;col++)for(let row=0;row<2;row++){
      g.fillStyle=(col+row)%2===0?'#e2f6ff':'#25455c';
      g.fillRect(row*8-8,col*10,8,10);
    }
    g.restore();
  }
  g.restore();
  return true;
}
function getTile(zone,track,ix,iy){
  const key=track.courseId+':'+zone+':'+ix+':'+iy;
  if(tileCache.has(key)){
    const v=tileCache.get(key);
    tileCache.delete(key);tileCache.set(key,v);
    tileHits++;return v;
  }
  const surface=document.createElement('canvas');
  surface.width=TILE+2*TILE_PAD;surface.height=TILE+2*TILE_PAD;
  const g=surface.getContext('2d',{alpha:true});
  const drawn=paintRoadTile(g,zone,track,ix,iy);
  const value=drawn?surface:null;
  tileCache.set(key,value);tileBuilds++;
  if(tileCache.size>TILE_LIMIT)tileCache.delete(tileCache.keys().next().value);
  return value;
}
function drawRoadTiles(g,zone,track,view){
  const x0=Math.floor((view.minX-75)/TILE),x1=Math.floor((view.maxX+75)/TILE);
  const y0=Math.floor((view.minY-75)/TILE),y1=Math.floor((view.maxY+75)/TILE);
  for(let iy=y0;iy<=y1;iy++)for(let ix=x0;ix<=x1;ix++){
    const tile=getTile(zone,track,ix,iy);
    if(tile)g.drawImage(tile,ix*TILE-TILE_PAD,iy*TILE-TILE_PAD);
  }
}
function drawWorldBackdrop(g,cam){
  // Stable atmosphere is drawn screen-space; it NEVER changes with Zone.
  const gradient=g.createLinearGradient(0,0,0,viewH);
  gradient.addColorStop(0,'#060a18');
  gradient.addColorStop(.48,'#10263b');
  gradient.addColorStop(1,'#09162a');
  g.fillStyle=gradient;g.fillRect(0,0,viewW,viewH);
  const frame=CAMERA.viewBounds(cam,80);
  // World-anchored quiet pillars contribute parallax without cities or
  // moving colored shapes that can be mistaken for hazards.
  g.save();
  g.translate(viewW*.5,viewH*.5);g.scale(cam.zoom,cam.zoom);
  g.translate(-cam.x,-cam.y);
  const startX=Math.floor(frame.minX/140)*140;
  const endX=Math.ceil(frame.maxX/140)*140;
  for(let x=startX;x<=endX;x+=140){
    const top=frame.minY+85+Math.abs((Math.floor(x/140)*37)%175);
    g.fillStyle='rgba(63,133,185,.035)';
    g.fillRect(x,top,23,frame.maxY-top);
  }
  g.strokeStyle='rgba(87,169,215,.045)';g.lineWidth=1;
  g.beginPath();
  for(let x=Math.floor(frame.minX/160)*160;x<frame.maxX;x+=160){
    g.moveTo(x,frame.minY);g.lineTo(x,frame.maxY);
  }
  for(let y=Math.floor(frame.minY/160)*160;y<frame.maxY;y+=160){
    g.moveTo(frame.minX,y);g.lineTo(frame.maxX,y);
  }
  g.stroke();
  // Calm world-anchored landmarks: outside-road curves, never square hazards.
  for(const [x,y,r] of [[1790,700,175],[730,1010,140],[1390,1210,125]]){
    if(x+r<frame.minX||x-r>frame.maxX||
        y+r<frame.minY||y-r>frame.maxY)continue;
    g.strokeStyle='rgba(89,196,226,.055)';g.lineWidth=3;
    g.beginPath();g.arc(x,y,r,-.9,2.15);g.stroke();
    g.strokeStyle='rgba(244,130,190,.038)';g.lineWidth=1;
    g.beginPath();g.arc(x,y,r+23,1.8,5.65);g.stroke();
  }
  g.restore();
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
    ctx.translate(p.x,p.y);
    // Glass cubes remain visibly SQUARE on wide-screen phones even as
    // the roadway fills more horizontal space.
    ctx.scale(spriteScale,spriteScale);
    if(!falling&&p.contactFlash>0&&!reduced()){
      ctx.globalAlpha*=clamp(p.contactFlash/.24,0,1)*.70;
      ctx.strokeStyle=p.color;ctx.lineWidth=2;
      ctx.strokeRect(-18,-18,36,36);
      ctx.globalAlpha=1;
    }
    ctx.drawImage(sprite(p.color),-34,-34);
    // Small front lip shows heading, without an arrow or long streak.
    ctx.rotate(p.angle+Math.PI/2);
    ctx.fillStyle=p.id===0?'#f3ffff':'#e2e7ff';
    ctx.globalAlpha*=.75;
    ctx.fillRect(-6,-12,12,2.1);
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
// A world-space ribbon follows the circuit in POSITIVE driving direction.
// Two ribbons cover wraparound with no diagonal through the center.
function appendRoadSlice(g,track,from,to,half){
  if(to<=from+.0001)return;
  const count=Math.max(2,Math.ceil((to-from)/13));
  for(let i=0;i<=count;i++){
    const p=CORE.pointAt(from+(to-from)*i/count,track);
    const x=p.x+p.nx*half,y=p.y+p.ny*half;
    if(i===0)g.moveTo(x,y);else g.lineTo(x,y);
  }
  for(let i=count;i>=0;i--){
    const p=CORE.pointAt(from+(to-from)*i/count,track);
    g.lineTo(p.x-p.nx*half,p.y-p.ny*half);
  }
  g.closePath();
}
function clipWaveRepaint(g,track,wave){
  const end=wave.start+wave.reach,L=track.length;
  g.beginPath();
  if(end>L){
    appendRoadSlice(g,track,wave.start,L,69);
    appendRoadSlice(g,track,0,end-L,69);
  }else appendRoadSlice(g,track,wave.start,end,69);
  g.clip();
}
function drawWaveFront(g,track,wave,color){
  if(reduced()||!wave.active)return;
  const lead=wave.start+wave.reach;
  // Following the road edges instead of drawing a full-width bar:
  // this reads as pigment movement, not as a new physical obstacle.
  g.save();g.lineJoin='round';g.lineCap='round';
  for(const side of [-1,1]){
    g.beginPath();
    for(let i=0;i<=10;i++){
      const p=CORE.pointAt(lead-95+104*i/10,track);
      const x=p.x+p.nx*45*side,y=p.y+p.ny*45*side;
      if(i===0)g.moveTo(x,y);else g.lineTo(x,y);
    }
    g.globalAlpha=.17;g.strokeStyle=color;g.lineWidth=7;g.stroke();
    g.globalAlpha=.72;g.strokeStyle=mix(color,'#ffffff',.62);
    g.lineWidth=1.7;g.stroke();
  }
  g.restore();
}
function paint(){
  const m=race||preview,track=m.track||TRACK;
  if(!camera)camera=CAMERA.create(CORE.WORLD_BOUNDS,
    {width:viewW,height:viewH},m.racers[0]);
  ctx.setTransform(CANVAS.width/viewW,0,0,CANVAS.height/viewH,0,0);
  ctx.clearRect(0,0,viewW,viewH);
  drawWorldBackdrop(ctx,camera);
  ctx.save();
  ctx.translate(viewW*.5,viewH*.5);
  ctx.scale(camera.zoom,camera.zoom);
  ctx.translate(-camera.x,-camera.y);
  const z=m.zone,view=CAMERA.viewBounds(camera,12);
  if(m.tide>0&&z>0){
    const wave=CORE.waveState(m);
    drawRoadTiles(ctx,z-1,track,view);
    ctx.save();clipWaveRepaint(ctx,track,wave);
    drawRoadTiles(ctx,z,track,view);
    ctx.restore();
    drawWaveFront(ctx,track,wave,PALETTES[z%PALETTES.length].primary);
  }else drawRoadTiles(ctx,z,track,view);
  drawImpacts(m);drawRacers(m);
  ctx.restore();
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
  const m=race||preview;
  if(camera&&m){
    CAMERA.step(camera,m.racers[0],{width:viewW,height:viewH},
      Math.min(frameMs/1000,.05),mode==='menu');
  }
  const renderStart=performance.now();
  paint();
  if(mode==='playing'&&race){
    race.performance.frames++;
    if(frameMs>50)race.performance.slow50++;
    race.performance.worstFrameMs=Math.max(race.performance.worstFrameMs,frameMs);
    race.performance.renderMaxMs=Math.max(race.performance.renderMaxMs,
      performance.now()-renderStart);
    race.performance.cameraZoomMin=Math.min(
      race.performance.cameraZoomMin??camera.zoom,camera.zoom);
    race.performance.cameraZoomMax=Math.max(
      race.performance.cameraZoomMax??camera.zoom,camera.zoom);
    race.performance.tileBuilds=tileBuilds;
    race.performance.tileHits=tileHits;
    race.performance.cameraMaxDrift=+camera.maxDrift.toFixed(1);
  }
  root.requestAnimationFrame(loop);
}
// Read-only test hook, no raw input or device fingerprint recorded.
root.ChromaCircuitViewDebug={
  snapshot:()=>({
    camera:camera?{x:camera.x,y:camera.y,zoom:camera.zoom,
      targetZoom:camera.targetZoom,lookAhead:camera.lookAhead,
      updates:camera.updates}:null,
    tiles:tileCache.size,tileBuilds,tileHits,
    course:(race||preview).track.courseId,
    player:(race||preview).racers[0]&&{
      x:(race||preview).racers[0].x,
      y:(race||preview).racers[0].y},
    viewport:{width:viewW,height:viewH}
  }),
  sampleRoad:(zone,x,y)=>{
    const track=(race||preview).track;
    const ix=Math.floor(x/TILE),iy=Math.floor(y/TILE);
    const tile=getTile(zone,track,ix,iy);
    if(!tile)return [0,0,0,0];
    return Array.from(tile.getContext('2d').getImageData(
      Math.max(0,Math.min(tile.width-1,Math.floor(x-ix*TILE+TILE_PAD))),
      Math.max(0,Math.min(tile.height-1,Math.floor(y-iy*TILE+TILE_PAD))),1,1).data);
  }
};
screen('menu');
root.requestAnimationFrame(loop);
})(typeof window!=='undefined'?window:null);
