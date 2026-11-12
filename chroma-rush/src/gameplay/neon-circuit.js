/* CHROMA RUSH — NEON CIRCUIT 2.7: Premium Motion & Visual Cohesion.
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
const TILE=448,TILE_PAD=18,TILE_LIMIT=36;
const tileCache=new Map(),sprites=Object.create(null);
const motionStates=new WeakMap();
let motionSnapshot={lean:0,squash:1,stretch:1,brake:0};
let tileBuilds=0,tileHits=0,mode='menu',race=null,preview=CORE.seededRace(103),
  nextCourse=0,joyId=null,joyX=0,joyY=0,brakePressed=false,dashPending=false,
  keys=new Set(),frameBefore=0,accumulator=0,noticeUntil=0,
  finishPendingAt=0,lastAnnouncement='',lastZone=-1,lastPlace='';
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
  screen('playing');noticeUntil=0;finishPendingAt=0;
  lastAnnouncement='';lastZone=-1;lastPlace='';updateHud();
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
  finishPendingAt=0;
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
  // Thumb changes heading only. Neutral preserves heading, not speed.
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
  // North-up follow camera: the thumb aims toward a world direction.
  // When released the cube keeps the last heading at auto speed.
  const input={x,y,brake:brakePressed||keys.has('Shift'),dash:dashPending};
  dashPending=false;
  return input;
}
function updateHud(){
  if(!race)return;
  const me=race.racers[0],lap=Math.min(CORE.LAPS_TO_WIN,me.laps+1);
  const zoneEl=$('circuit-zone');
  text('circuit-zone','ZONE '+String(race.zone+1).padStart(2,'0'));
  if(lastZone!==race.zone){
    if(lastZone>=0&&!reduced()){
      zoneEl.classList.remove('zone-shift');void zoneEl.offsetWidth;
      zoneEl.classList.add('zone-shift');
    }
    lastZone=race.zone;
  }
  text('circuit-phase',ZONE_NAMES[race.zone%ZONE_NAMES.length]+
    ' · SPEED '+Math.round(me.speed));
  text('circuit-lap','LAP '+lap+'/'+CORE.LAPS_TO_WIN);
  text('circuit-flow','LINE FLOW '+Math.round(me.flow*100)+'%');
  const placing=ordinal(CORE.currentPosition(race))+' / 4';
  text('circuit-place',placing);
  if(placing!==lastPlace){
    const place=$('circuit-place');
    if(lastPlace&&!reduced()){
      place.classList.remove('place-swap');void place.offsetWidth;
      place.classList.add('place-swap');
    }
    lastPlace=placing;
  }
  text('circuit-clock',clock(race.elapsed));
  text('circuit-dash',me.dashCooldown>.08?me.dashCooldown.toFixed(1)+'s':'DASH');
  dash.disabled=me.dashCooldown>.08||me.speed<45;
  dash.classList.toggle('recharging',dash.disabled);
  let label='',visible=false;
  if(race.phase==='ready'){
    label=race.track.name+' · GET READY '+Math.max(1,Math.ceil(race.ready));
    visible=true;
  }else if(race.announcement&&race.elapsed<race.announcementTime){
    label=race.announcement;visible=true;
  }
  text('circuit-announce',label);
  const announce=$('circuit-announce');
  announce.classList.toggle('hidden',!visible);
  const moment=race.phase==='ready'?'ready':
    label.startsWith('GO')?'go':
    label.startsWith('LAP')?'lap':
    label.startsWith('ZONE')?'zone':
    label.includes('EJECTED')?'knockout':
    label.includes('HIT')?'impact':
    label.includes('FALL')?'fall':
    label.includes('BOOST')?'boost':'neutral';
  const key=visible?moment+':'+label:'';
  if(key!==lastAnnouncement){
    announce.dataset.moment=moment;
    if(visible&&!reduced()){
      announce.classList.remove('moment-enter');
      void announce.offsetWidth;announce.classList.add('moment-enter');
    }else announce.classList.remove('moment-enter');
    lastAnnouncement=key;
  }
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
// Paint the physical ramp as a continuous shoulder, with taller light
// banking on the OUTSIDE of circular turns. World-coordinates, tile-cached.
function drawBankedEdges(g,track,rect,primary,secondary){
  // Physically continuous shaded slopes instead of stacked neon outlines.
  const runs=[];let current=[];
  for(const p of track.rimSamples){
    const visible=p.x>rect.minX-110&&p.x<rect.maxX+110&&
      p.y>rect.minY-110&&p.y<rect.maxY+110;
    if(visible)current.push(p);
    else if(current.length){if(current.length>1)runs.push(current);current=[];}
  }
  if(current.length>1)runs.push(current);
  const point=(p,side,t)=>{
    const edge=side<0?p.left:p.right;
    return {x:edge.ix+(edge.ox-edge.ix)*t,
      y:edge.iy+(edge.oy-edge.iy)*t};
  };
  function strip(run,side,inner,outer,color){
    g.beginPath();
    for(let i=0;i<run.length;i++){
      const p=point(run[i],side,inner);
      if(i===0)g.moveTo(p.x,p.y);else g.lineTo(p.x,p.y);
    }
    for(let i=run.length-1;i>=0;i--){
      const p=point(run[i],side,outer);g.lineTo(p.x,p.y);
    }
    g.closePath();g.fillStyle=color;g.fill();
  }
  g.save();g.lineJoin='round';g.lineCap='round';
  for(const run of runs)for(const side of [-1,1]){
    // An extruded metal bank with a soft lit slope and a recessed root.
    // Static tile-only geometry; the inner track still has the same width.
    strip(run,side,0,1,rgb('#020b18',.96));
    strip(run,side,0,.23,rgb('#021526',.79));
    strip(run,side,.23,.73,rgb(primary,.32));
    strip(run,side,.73,.93,rgb(secondary,.24));
    strip(run,side,.93,1,rgb('#e4f8ff',.19));
    g.beginPath();
    for(let i=0;i<run.length;i++){
      const p=point(run[i],side,1);
      if(i===0)g.moveTo(p.x,p.y);else g.lineTo(p.x,p.y);
    }
    g.strokeStyle=rgb('#000712',.85);g.lineWidth=5.2;g.stroke();
    g.strokeStyle=rgb(mix(primary,'#e8faff',.58),.46);
    g.lineWidth=1.35;g.stroke();
  }
  g.restore();
}
function drawBoostPads(g,track,rect,primary,secondary){
  for(const pad of track.boosts){
    const p=CORE.pointAt(pad.s,track);
    if(p.x<rect.minX-80||p.x>rect.maxX+80||
       p.y<rect.minY-80||p.y>rect.maxY+80)continue;
    g.save();
    g.translate(p.x+p.nx*pad.lane,p.y+p.ny*pad.lane);
    g.rotate(p.angle);
    // Engraved into the raceway rather than a hovering rounded card.
    const bed=g.createLinearGradient(-48,-12,48,12);
    bed.addColorStop(0,rgb(primary,.045));
    bed.addColorStop(.40,rgb(secondary,.17));
    bed.addColorStop(.70,rgb(primary,.25));
    bed.addColorStop(1,rgb(primary,.045));
    g.fillStyle=bed;rounded(g,-46,-15,92,30,5);g.fill();
    for(const y of [-14,14]){
      g.strokeStyle=rgb(mix(primary,'#e0f7ff',.42),.35);
      g.lineWidth=1.1;g.beginPath();
      g.moveTo(-42,y);g.lineTo(42,y);g.stroke();
    }
    g.lineJoin='round';g.lineCap='round';
    for(const x of [-23,0,23]){
      g.beginPath();g.moveTo(x-11,-9);g.lineTo(x+3,0);
      g.lineTo(x-11,9);
      g.strokeStyle=rgb(primary,.30);g.lineWidth=8;g.stroke();
      g.strokeStyle=rgb(mix(primary,'#ffffff',.55),.91);
      g.lineWidth=3.4;g.stroke();
      g.strokeStyle=rgb('#f4ffff',.60);g.lineWidth=1;g.stroke();
    }
    g.restore();
  }
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
  // A separate, downward-extruded under-deck makes the track read as a
  // hovering physical structure. Fully tile-cached; zero extra blur per frame.
  g.save();
  g.translate(0,15);
  stroke(148,'rgba(0,1,11,.56)');
  stroke(139,'#071023');
  stroke(135,rgb(secondary,.22));
  stroke(128,'#111d30');
  g.restore();
  // Top asphalt face and subdued neon bevels.
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
  stroke(78,rgb(mix(primary,'#eafaff',.63),.061));
  stroke(73,rgb('#f3ffff',.034));
  stroke(61,rgb(primary,.076));
  stroke(52,asphalt);
  // Narrow specular road grooves sit inside the surface, not above it.
  stroke(44,rgb(secondary,.035));
  stroke(41,asphalt);
  stroke(1.4,rgb('#d3f6ff',.18),true);
  drawBankedEdges(g,track,rect,primary,secondary);
  drawBoostPads(g,track,rect,primary,secondary);
  // Small light studs/curb marks. Skip markers outside the current tile.
  for(let distance=28;distance<track.length;distance+=34){
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
function arenaLighting(m){
  const next=PALETTES[m.zone%PALETTES.length];
  const last=PALETTES[Math.max(0,m.zone-1)%PALETTES.length];
  const active=m.zone>0&&m.tide>0;
  const progress=active?clamp(1-m.tide/CORE.COLOR_WAVE_SECONDS,0,1):1;
  const eased=progress*progress*(3-2*progress);
  return {
    primary:active?mix(last.primary,next.primary,eased):next.primary,
    secondary:active?mix(last.secondary,next.secondary,eased):next.secondary,
    charge:active?Math.pow(Math.sin(progress*Math.PI),2):0,
    progress
  };
}
function drawWorldBackdrop(g,cam,m){
  // Spectral Arena lighting is intentionally WORLD-AGNOSTIC during a tide.
  // The palette breathes over the entire arena without a rear starting line.
  const light=arenaLighting(m);
  const gradient=g.createLinearGradient(0,0,viewW*.16,viewH);
  gradient.addColorStop(0,mix('#030916',light.primary,.075));
  gradient.addColorStop(.52,mix('#0a172c',light.secondary,.105));
  gradient.addColorStop(1,mix('#030c1b',light.primary,.11));
  g.fillStyle=gradient;g.fillRect(0,0,viewW,viewH);
  const halo=g.createRadialGradient(viewW*.50,viewH*.49,viewH*.12,
    viewW*.50,viewH*.49,Math.max(viewW,viewH)*.68);
  halo.addColorStop(0,rgb(light.primary,.095+.12*light.charge));
  halo.addColorStop(.6,rgb(light.secondary,.025+.025*light.charge));
  halo.addColorStop(1,rgb(light.primary,0));
  g.fillStyle=halo;g.fillRect(0,0,viewW,viewH);
  const frame=CAMERA.viewBounds(cam,130);
  g.save();
  g.translate(viewW*.5,viewH*.5);g.scale(cam.zoom,cam.zoom);
  g.translate(-cam.x,-cam.y);
  // Large, restrained geometric terraces and ribs: calm depth beneath the
  // elevated roadway, never floating rectangular objects resembling hazards.
  const cell=280;
  const x0=Math.floor(frame.minX/cell)*cell;
  const y0=Math.floor(frame.minY/cell)*cell;
  const x1=Math.ceil(frame.maxX/cell)*cell;
  const y1=Math.ceil(frame.maxY/cell)*cell;
  g.lineJoin='round';
  for(let x=x0;x<=x1;x+=cell)for(let y=y0;y<=y1;y+=cell){
    const code=Math.abs((Math.floor(x/cell)*37+Math.floor(y/cell)*53)%7);
    const rise=(code%3)*22;
    g.beginPath();
    g.moveTo(x+8,y+cell*.32+rise);
    g.lineTo(x+cell*.64,y+5);
    g.lineTo(x+cell-10,y+cell*.31+rise);
    g.lineTo(x+cell*.35,y+cell*.63+rise);
    g.closePath();
    g.fillStyle=rgb(light.primary,code%2?.010:.020);
    g.fill();
    g.beginPath();
    g.moveTo(x+8,y+cell*.32+rise);
    g.lineTo(x+cell*.64,y+5);
    g.lineTo(x+cell-10,y+cell*.31+rise);
    g.strokeStyle=rgb(light.secondary,code%2?.034:.056);
    g.lineWidth=1.4;g.stroke();
  }
  // Sparse radial trenches communicate massive arena scale and continuity.
  for(const [x,y,r] of [[1790,700,175],[730,1010,140],[1390,1210,125]]){
    if(x+r<frame.minX||x-r>frame.maxX||
       y+r<frame.minY||y-r>frame.maxY)continue;
    g.strokeStyle=rgb(light.primary,.09+.035*light.charge);
    g.lineWidth=7;
    g.beginPath();g.arc(x,y,r,-.9,2.15);g.stroke();
    g.strokeStyle=rgb(light.secondary,.075);
    g.lineWidth=1.8;
    g.beginPath();g.arc(x,y,r+18,1.8,5.65);g.stroke();
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
// Cached multi-facet beveled glass sprite. The clear face and reflective edge
// remain readable at phone-scale, while the radial glow is pre-rasterized.
function sprite(color){
  if(sprites[color])return sprites[color];
  const surface=document.createElement('canvas');
  surface.width=90;surface.height=90;
  const g=surface.getContext('2d');g.translate(45,45);
  const halo=g.createRadialGradient(0,0,6,0,0,34);
  halo.addColorStop(0,rgb(color,.39));
  halo.addColorStop(.38,rgb(color,.18));
  halo.addColorStop(1,rgb(color,0));
  g.fillStyle=halo;g.fillRect(-36,-36,72,72);
  g.shadowColor=color;g.shadowBlur=10;
  const glass=g.createLinearGradient(-12,-13,12,14);
  glass.addColorStop(0,mix(color,'#ffffff',.92));
  glass.addColorStop(.43,mix(color,'#ffffff',.66));
  glass.addColorStop(1,mix(color,'#06172f',.31));
  g.fillStyle=glass;rounded(g,-12,-12,24,24,5);g.fill();
  g.shadowBlur=0;
  g.strokeStyle=rgb(mix(color,'#ffffff',.64),.91);
  g.lineWidth=1.7;rounded(g,-11.2,-11.2,22.4,22.4,4.6);g.stroke();
  g.beginPath();g.moveTo(-8,7);g.lineTo(-8,-7);
  g.quadraticCurveTo(-8,-9,-5,-9);g.lineTo(6,-9);
  g.strokeStyle='rgba(255,255,255,.65)';g.lineWidth=2.1;g.stroke();
  const facet=g.createLinearGradient(-12,0,12,0);
  facet.addColorStop(0,'rgba(255,255,255,.01)');
  facet.addColorStop(1,'rgba(2,14,35,.29)');
  g.fillStyle=facet;rounded(g,-9,-9,18,18,3);g.fill();
  return sprites[color]=surface;
}
// Visual-only spring: steering remains a manual physics input and neither
// contact size nor collision timing ever depends on these transforms.
function motionPose(p,r){
  let st=motionStates.get(p);
  if(!st){st={angle:p.angle,time:r.elapsed,lean:0,sx:1,sy:1};motionStates.set(p,st);}
  const dt=clamp(r.elapsed-st.time,.001,.05);
  const turn=CORE.angleDelta(st.angle,p.angle)/dt;
  const lateral=(-Math.sin(p.angle)*p.vx+Math.cos(p.angle)*p.vy)/
    Math.max(80,p.speed);
  const brake=p.braking?1:0;
  const bank=p.bankHeight||0;
  const hit=clamp((p.contactFlash||0)/.24,0,1);
  const dash=p.dashTime>0?1:0;
  const boost=p.boostTime>0?1:0;
  // Quick impact compression followed by restrained release; no arrow form.
  const leanTarget=clamp(-turn*.050-lateral*.12,-.18,.18)+
    clamp(bank*.075,-.06,.06);
  const sx=1+dash*.11+boost*.09+hit*.13-brake*.05;
  const sy=1-dash*.065-boost*.055-hit*.15+brake*.065;
  const t=1-Math.exp(-dt*15);
  st.lean+=(leanTarget-st.lean)*t;
  st.sx+=(sx-st.sx)*(1-Math.exp(-dt*20));
  st.sy+=(sy-st.sy)*(1-Math.exp(-dt*20));
  st.angle=p.angle;st.time=r.elapsed;
  const pose={lean:reduced()?0:st.lean,
    sx:reduced()?1:st.sx,sy:reduced()?1:st.sy,
    brake,hit,dash,boost,slip:clamp(Math.abs(lateral),0,1)};
  if(p.id===0)motionSnapshot={lean:pose.lean,squash:pose.sx,
    stretch:pose.sy,brake:pose.brake};
  return pose;
}
function drawCombatOpportunity(r){
  if(reduced())return;
  const me=r.racers[0];
  if(me.finished||me.fallTimer>0||me.dashCooldown>.08||me.speed<80)return;
  const forwardX=Math.cos(me.angle),forwardY=Math.sin(me.angle);
  const options=r.racers.slice(1).filter(p=>!p.finished&&p.fallTimer<=0)
    .map(p=>{
      const dx=p.x-me.x,dy=p.y-me.y;
      return {p,distance:Math.hypot(dx,dy),
        forward:dx*forwardX+dy*forwardY,
        lateral:Math.abs(dx*forwardY-dy*forwardX)};
    }).filter(v=>v.forward>7&&v.forward<106&&v.lateral<33)
    .sort((a,b)=>a.distance-b.distance);
  if(!options.length)return;
  const target=options[0],t=clamp((106-target.forward)/106,0,1);
  ctx.save();ctx.translate(target.p.x,target.p.y);
  ctx.strokeStyle='#e9ffff';ctx.lineWidth=1.4;
  ctx.globalAlpha=.30+.45*t;
  ctx.lineCap='round';
  // Four short brackets attached to the racer, never a standalone square.
  for(const sx of [-1,1])for(const sy of [-1,1]){
    ctx.beginPath();
    ctx.moveTo(sx*16,sy*21);ctx.lineTo(sx*21,sy*21);
    ctx.lineTo(sx*21,sy*16);ctx.stroke();
  }
  ctx.restore();
}
function drawRacers(r){
  for(const p of r.racers){
    const falling=p.fallTimer>0;
    const fraction=falling?clamp(p.fallTimer/CORE.FALL_SECONDS,0,1):1;
    const fallScale=falling?.13+.87*fraction:1;
    const dirX=Math.cos(p.angle),dirY=Math.sin(p.angle);
    const pose=motionPose(p,r);
    ctx.save();
    // Wheel-free racer language: energy traction is attached immediately
    // beneath the cube and never becomes a detached obstacle-looking trail.
    if(!falling&&p.braking&&!reduced()){
      const sideX=-dirY,sideY=dirX,fade=.22+.24*pose.slip;
      ctx.strokeStyle=p.color;ctx.lineWidth=1.4;ctx.globalAlpha=fade;
      ctx.lineCap='round';
      for(const side of [-1,1]){
        const ax=p.x+sideX*side*11-dirX*8;
        const ay=p.y+sideY*side*11-dirY*8;
        ctx.beginPath();ctx.moveTo(ax,ay);
        ctx.lineTo(ax-dirX*(8+pose.slip*12),
          ay-dirY*(8+pose.slip*12));
        ctx.stroke();
      }
    }
    ctx.globalAlpha=falling?Math.max(.07,fraction*.78):
      p.finished?.30:p.invulnerable>0?.67+.24*Math.sin(r.elapsed*15):1;
    ctx.translate(p.x,p.y);
    ctx.scale(fallScale,fallScale);
    ctx.rotate(pose.lean);
    // Squash is smooth and based on the actual force and maneuver state.
    ctx.rotate(p.angle);
    ctx.scale(pose.sx,pose.sy);
    ctx.rotate(-p.angle);
    if(!falling&&!reduced()&&pose.hit>.08){
      ctx.save();ctx.globalAlpha*=pose.hit*.36;
      ctx.strokeStyle='#ffffff';ctx.lineWidth=1.7;
      rounded(ctx,-15,-15,30,30,6);ctx.stroke();ctx.restore();
    }
    ctx.drawImage(sprite(p.color),-45,-45);
    if(!falling&&p.boostTime>0&&!reduced()){
      const age=CORE.TRACK.boosts[0].duration-p.boostTime;
      if(age<.24){
        const fade=1-clamp(age/.24,0,1);
        ctx.save();ctx.strokeStyle=p.color;ctx.lineWidth=2;
        ctx.globalAlpha*=fade*.65;
        ctx.beginPath();ctx.arc(0,0,17+(1-fade)*14,0,Math.PI*2);
        ctx.stroke();ctx.restore();
      }
    }
    // A small inset front glint indicates heading without an arrow.
    ctx.rotate(p.angle+Math.PI/2);
    ctx.fillStyle=p.id===0?'#ffffff':'#d4e8f7';
    ctx.globalAlpha*=.60;
    ctx.fillRect(-5,-12,10,1.5);
    ctx.restore();
    if(!falling){
      ctx.save();ctx.textAlign='center';
      ctx.font='800 11px system-ui,sans-serif';
      ctx.fillStyle=p.id===0?'#f3ffff':p.color;
      ctx.globalAlpha=p.finished?.4:1;
      ctx.fillText(p.name,p.x,p.y-23);
      ctx.restore();
    }
  }
}
function luminousPool(g,x,y,color,inner,outer,alpha){
  if(alpha<=0)return;
  const halo=g.createRadialGradient(x,y,inner,x,y,outer);
  halo.addColorStop(0,rgb(color,alpha));
  halo.addColorStop(.42,rgb(color,alpha*.37));
  halo.addColorStop(1,rgb(color,0));
  g.fillStyle=halo;
  g.fillRect(x-outer,y-outer,outer*2,outer*2);
}
function drawWorldSpectacles(m,view){
  if(reduced())return;
  // A short hierarchy: pad < hit < ejection < finish. No projectile shapes.
  for(const fx of m.spectacles||[]){
    if(fx.x<view.minX-130||fx.x>view.maxX+130||
       fx.y<view.minY-130||fx.y>view.maxY+130)continue;
    const age=clamp(1-fx.life/fx.duration,0,1);
    const vanish=Math.pow(1-age,1.55);
    ctx.save();
    ctx.translate(fx.x,fx.y);ctx.rotate(fx.angle);
    if(fx.kind==='boost'){
      luminousPool(ctx,0,0,fx.color,5,92,vanish*.32);
      for(let k=0;k<3;k++){
        const dx=-36+age*82+k*20;
        ctx.beginPath();ctx.moveTo(dx-9,-11);ctx.lineTo(dx+3,0);
        ctx.lineTo(dx-9,11);
        ctx.strokeStyle=k===1?'#ffffff':fx.color;
        ctx.lineWidth=k===1?3.6:2.5;
        ctx.lineCap='round';ctx.lineJoin='round';
        ctx.globalAlpha=vanish*(k===1?.83:.60);
        ctx.stroke();
      }
      ctx.globalAlpha=vanish*.52;
      ctx.strokeStyle=fx.color;ctx.lineWidth=1.3;
      for(const y of [-21,21]){
        ctx.beginPath();ctx.moveTo(-28+age*65,y);
        ctx.lineTo(3+age*65,y);ctx.stroke();
      }
    }else if(fx.kind==='eject'){
      luminousPool(ctx,0,0,fx.color,5,110,vanish*.28);
      ctx.globalAlpha=vanish*.66;
      ctx.strokeStyle=fx.color;ctx.lineWidth=2.6;
      ctx.beginPath();ctx.ellipse(0,0,13+age*45,9+age*35,0,0,Math.PI*2);
      ctx.stroke();
      for(let k=0;k<8;k++){
        const theta=k*Math.PI/4+fx.owner*.25;
        const distance=12+age*46;
        ctx.strokeStyle=k%2?'#e8ffff':fx.color;
        ctx.lineWidth=k%2?1.4:2.2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(theta)*distance*.70,
          Math.sin(theta)*distance*.70);
        ctx.lineTo(Math.cos(theta)*distance,
          Math.sin(theta)*distance);ctx.stroke();
      }
    }else if(fx.kind==='respawn'){
      // A soft reconstruction field anchored to the newly placed racer.
      luminousPool(ctx,0,0,fx.color,3,76,vanish*.21);
      ctx.globalAlpha=vanish*.63;
      for(let k=0;k<2;k++){
        const rad=15+age*28+k*12;
        ctx.beginPath();ctx.arc(0,0,rad,
          -Math.PI*.62+age*Math.PI*.5,
          Math.PI*.64+age*Math.PI*.5);
        ctx.strokeStyle=k===0?fx.color:'#e7ffff';
        ctx.lineWidth=k===0?2.4:1;ctx.stroke();
      }
    }else if(fx.kind==='lap'||fx.kind==='finish'){
      // One celebratory wave expands from the crossing point. Result panel
      // follows only after the short finish moment has been seen.
      const final=fx.kind==='finish';
      luminousPool(ctx,0,0,fx.color,6,final?125:94,
        vanish*(final?.39:.25));
      ctx.globalAlpha=vanish*(final?.83:.58);
      for(let k=0;k<(final?3:2);k++){
        const rad=15+age*(final?70:42)+k*13;
        ctx.beginPath();
        ctx.arc(0,0,rad,
          -Math.PI*.8+(age*.2+k*.19),
          Math.PI*.85+age*.2+k*.19);
        ctx.strokeStyle=k===1?'#ffffff':fx.color;
        ctx.lineWidth=k===0?3.8:1.7;ctx.stroke();
      }
    }
    ctx.restore();
  }
}
function drawVelocityRails(m,view){
  if(reduced())return;
  const p=m.racers[0],factor=clamp((p.speed-170)/205,0,1);
  if(factor<.07||p.fallTimer>0)return;
  const at=CORE.closest(p.x,p.y,m.track).s;
  const primary=PALETTES[m.zone%PALETTES.length].primary;
  ctx.save();ctx.lineCap='round';ctx.lineWidth=1.2+factor*.55;
  // The WORLD moves against the player; short side glints emphasize speed
  // without adding long lines to the player cube itself.
  const travel=m.elapsed*p.speed*.22;
  for(let i=0;i<15;i++){
    const s=at-180+i*45+travel%45;
    const pt=CORE.pointAt(s,m.track);
    if(pt.x<view.minX-22||pt.x>view.maxX+22||
       pt.y<view.minY-22||pt.y>view.maxY+22)continue;
    const fade=.14+.12*factor;
    for(const side of [-1,1]){
      const x=pt.x+pt.nx*side*42,y=pt.y+pt.ny*side*42;
      ctx.strokeStyle=side>0?'#d9faff':primary;
      ctx.globalAlpha=fade;
      ctx.beginPath();ctx.moveTo(x,y);
      ctx.lineTo(x-pt.tx*(12+factor*17),y-pt.ty*(12+factor*17));
      ctx.stroke();
    }
  }
  ctx.restore();
}
function drawWaveWorldHalo(m,view,wave){
  if(reduced()||!wave.active)return;
  const p=CORE.pointAt(wave.frontS,m.track);
  if(p.x<view.minX-380||p.x>view.maxX+380||
     p.y<view.minY-380||p.y>view.maxY+380)return;
  const palette=PALETTES[m.zone%PALETTES.length];
  const charge=.17+.10*Math.sin(wave.progress*Math.PI);
  ctx.save();
  ctx.globalCompositeOperation='screen';
  luminousPool(ctx,p.x,p.y,palette.primary,36,310,charge);
  luminousPool(ctx,p.x,p.y,palette.secondary,10,156,charge*.55);
  ctx.restore();
}
function drawImpacts(r){
  if(reduced())return;
  for(const v of r.impacts){
    const life=clamp(v.life/(v.lifeMax||.32),0,1),age=1-life;
    const force=clamp((v.strength||260)/720,.35,1);
    const heavy=force>.68||v.charged;
    const angle=Math.atan2(v.ny,v.nx);
    ctx.save();ctx.translate(v.x,v.y);ctx.rotate(angle);
    ctx.globalCompositeOperation='screen';
    luminousPool(ctx,0,0,'#ffffff',3,44+age*30,life*force*.40);
    luminousPool(ctx,-8,0,v.colorA,2,39+age*18,life*.29);
    luminousPool(ctx,8,0,v.colorB,2,39+age*18,life*.29);
    ctx.globalCompositeOperation='source-over';
    // Compression is instantaneous; a coherent radial shock ring follows.
    ctx.strokeStyle='#f4ffff';ctx.lineWidth=heavy?2.6:1.5;
    ctx.globalAlpha=life*(heavy?.76:.48);
    ctx.beginPath();
    ctx.ellipse(0,0,9+age*(heavy?38:24),
      7+age*(heavy?26:16),0,0,Math.PI*2);
    ctx.stroke();
    ctx.lineCap='round';ctx.lineJoin='round';
    // Directional shards fly from collision normal, never from random screen
    // positions and never persist as long streaks behind the racer.
    for(let k=0;k<(heavy?9:5);k++){
      const t=(k-(heavy?4:2))*.42;
      const theta=(k%2?1:-1)*.18+t;
      const spread=(11+age*(heavy?41:28))*(.74+.24*Math.abs(Math.sin(t)));
      const x=Math.cos(theta)*spread;
      const y=Math.sin(theta)*spread;
      const sign=k%2?-1:1;
      ctx.strokeStyle=k%3===0?'#ffffff':sign<0?v.colorA:v.colorB;
      ctx.lineWidth=k%3===0?2.7:1.65;
      ctx.globalAlpha=life*(heavy?.84:.53);
      ctx.beginPath();
      ctx.moveTo(x*.62*sign,y*.62);
      ctx.lineTo(x*sign,y);ctx.stroke();
    }
    // Brief bright contact core. Dash hits read as distinct energy clashes.
    if(v.charged){
      ctx.globalAlpha=Math.pow(life,1.55)*.83;
      ctx.strokeStyle='#ffffff';ctx.lineWidth=2.3;
      ctx.beginPath();ctx.moveTo(-8,-8);ctx.lineTo(0,-13);
      ctx.lineTo(8,-8);ctx.moveTo(-8,8);ctx.lineTo(0,13);
      ctx.lineTo(8,8);ctx.stroke();
    }
    ctx.restore();
  }
}
// Chroma Rush Spectral Wave translated to curving WORLD-space track geometry:
// moving refractive veil, softened color field, three attached light filaments,
// no detached square/flash and no visible starting seam.
function waveRibbon(g,track,wave,offset=0){
  // The REAR seam stays thousands of units behind the initial player and
  // never rides forward into camera view with the prismatic leading edge.
  const from=wave.start-track.length*.49,to=wave.start+wave.reach+offset;
  if(to<=from)return;
  const count=Math.ceil((to-from)/19),half=66;
  const shimmer=side=>{
    const phase=wave.progress*21;
    return 7*Math.sin(side*3.8+phase)+
      3.4*Math.sin(side*8.9-phase*1.3);
  };
  g.beginPath();
  for(let i=0;i<=count;i++){
    const distance=from+(to-from)*i/count;
    const p=CORE.pointAt(distance,track),d=distance===to?shimmer(1):0;
    const v=d?CORE.pointAt(distance+d,track):p;
    if(i===0)g.moveTo(v.x+v.nx*half,v.y+v.ny*half);
    else g.lineTo(v.x+v.nx*half,v.y+v.ny*half);
  }
  // A living, warped cross-track boundary. Never a rigid rectangular line.
  for(let i=1;i<=10;i++){
    const side=1-i/5;
    const p=CORE.pointAt(to+shimmer(side),track);
    g.lineTo(p.x+p.nx*side*half,p.y+p.ny*side*half);
  }
  for(let i=count-1;i>=0;i--){
    const p=CORE.pointAt(from+(to-from)*i/count,track);
    g.lineTo(p.x-p.nx*half,p.y-p.ny*half);
  }
  g.closePath();
}
function clipWaveRepaint(g,track,wave,offset=-42){
  waveRibbon(g,track,wave,offset);
  g.clip();
}
function drawWaveFront(g,track,wave,color){
  if(reduced()||!wave.active)return;
  const front=wave.start+wave.reach;
  const secondary=PALETTES[(race||preview).zone%PALETTES.length].secondary;
  const phase=wave.progress*21;
  const p=CORE.pointAt(front,track),wobble=8*Math.sin(phase);
  // Chroma Rush Spectral Wave's prismatic veil: light follows the moving
  // road-front, not a screen-wide line or something the player might dodge.
  g.save();
  g.translate(p.x+p.nx*wobble,p.y+p.ny*wobble);
  g.rotate(p.angle);
  const veil=g.createLinearGradient(-105,0,110,0);
  veil.addColorStop(0,rgb(secondary,0));
  veil.addColorStop(.26,rgb(secondary,.075));
  veil.addColorStop(.48,rgb(color,.24));
  veil.addColorStop(.56,'rgba(255,255,255,.13)');
  veil.addColorStop(.80,rgb(color,.14));
  veil.addColorStop(1,rgb(secondary,0));
  g.fillStyle=veil;g.fillRect(-105,-44,215,88);
  g.restore();
  // Like Spectral Wave, these short filaments are attached to the SAME
  // front, with different radii and phase. They are parallel to the road.
  g.save();g.lineCap='round';g.lineJoin='round';
  for(const side of [-1,1]){
    for(const [index,shift,alpha,width] of
      [[0,-24,.28,5],[1,0,.63,2.6],[2,20,.31,2.5]]){
      g.beginPath();
      for(let i=0;i<=10;i++){
        const ss=front-90+130*i/10+shift;
        const t=CORE.pointAt(ss,track);
        const off=43*side+3.8*Math.sin(i*.8+phase+side*2);
        const x=t.x+t.nx*off,y=t.y+t.ny*off;
        if(i===0)g.moveTo(x,y);else g.lineTo(x,y);
      }
      g.globalAlpha=alpha*(.9+.1*Math.sin(phase*1.5+index));
      g.strokeStyle=index===0?secondary:index===1?'#ffffff':color;
      g.lineWidth=width;g.stroke();
    }
  }
  g.restore();
}
function paint(){
  const m=race||preview,track=m.track||TRACK;
  if(!camera)camera=CAMERA.create(CORE.WORLD_BOUNDS,
    {width:viewW,height:viewH},m.racers[0]);
  ctx.setTransform(CANVAS.width/viewW,0,0,CANVAS.height/viewH,0,0);
  ctx.clearRect(0,0,viewW,viewH);
  drawWorldBackdrop(ctx,camera,m);
  ctx.save();
  const p=m.racers[0];
  const nearbyImpact=m.impacts.find(v=>v.life>.08&&
    Math.hypot(v.x-p.x,v.y-p.y)<82);
  // Tiny visual-only camera impulse; navigation and world physics never shake.
  const kick=nearbyImpact&&!reduced()?
    clamp(nearbyImpact.strength/330,0,2.4)*
      clamp(nearbyImpact.life/.32,0,1):0;
  ctx.translate(viewW*.5+kick*Math.sin(m.elapsed*121),
    viewH*.5+kick*Math.sin(m.elapsed*153));
  ctx.scale(camera.zoom,camera.zoom);
  ctx.translate(-camera.x,-camera.y);
  const z=m.zone,view=CAMERA.viewBounds(camera,12);
  if(m.tide>0&&z>0){
    const wave=CORE.waveState(m);
    drawRoadTiles(ctx,z-1,track,view);
    // Only the front moves: the initial recolor seam remains far behind.
    // Three alpha passes feather the warped boundary instead of a hard cut.
    if(wave.progress>.87){
      drawRoadTiles(ctx,z,track,view);
    }else{
      ctx.save();clipWaveRepaint(ctx,track,wave);
      drawRoadTiles(ctx,z,track,view);
      ctx.restore();
      if(!reduced())for(const [offset,alpha] of
        [[-17,.35],[28,.22]]){
        ctx.save();ctx.globalAlpha=alpha;
        clipWaveRepaint(ctx,track,wave,offset);
        drawRoadTiles(ctx,z,track,view);
        ctx.restore();
      }
      drawWaveFront(ctx,track,wave,PALETTES[z%PALETTES.length].primary);
    }
  }else drawRoadTiles(ctx,z,track,view);
  drawVelocityRails(m,view);
  drawWorldSpectacles(m,view);
  if(m.tide>0&&z>0)drawWaveWorldHalo(m,view,CORE.waveState(m));
  drawImpacts(m);drawRacers(m);drawCombatOpportunity(m);
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
    if(race.finished){
      // Show the physical finish flare before the result overlay.
      if(!finishPendingAt)finishPendingAt=now+(reduced()?0:760);
      if(now>=finishPendingAt)finish();
    }
    if(mode==='playing')updateHud();
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
    premiumMotion:motionSnapshot,
    finishPending:finishPendingAt>0,
    moment:($('circuit-announce').dataset.moment||'neutral'),
    spectacles:(race||preview).spectacles.length,
    arena:arenaLighting(race||preview),
    course:(race||preview).track.courseId,
    player:(race||preview).racers[0]&&{
      x:(race||preview).racers[0].x,
      y:(race||preview).racers[0].y,
      speed:(race||preview).racers[0].speed,
      angle:(race||preview).racers[0].angle,
      falls:(race||preview).racers[0].falls,
      knockouts:(race||preview).racers[0].knockouts},
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
