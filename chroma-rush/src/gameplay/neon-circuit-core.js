/* CHROMA RUSH — NEON CIRCUIT 1.1: Track & Impact Rebuild
 * Real rounded-straight circuit, consistent actual laps, steering recovery,
 * high-energy bumper collisions, ramp ejection & fair timed respawns.
 * Shared speed/tide progression. Pure deterministic physics + event audit.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaNeonCircuitCore=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';
const WIDTH=960,HEIGHT=540,CX=480,CY=270;
const TRACK_HALF=47,PLAYER_RADIUS=11;
const RAMP_START=TRACK_HALF-PLAYER_RADIUS-1;
const FALL_SECONDS=.72,RESPAWN_GRACE=1.22;
const IMPACT_COOLDOWN=.64,IMPACT_FRICTION=.855;
const ZONE_SECONDS=10,LAPS_TO_WIN=3,READY_SECONDS=2.4,STEP=1/60;
const COLORS=['#60ecff','#ff71ac','#ffe26a','#9f8aff'];
const NAMES=['YOU','NOVA','VOLT','HEX'];
const DASH_TIME=.34,DASH_COOLDOWN=5.4;
const TRACK_SHAPE=Object.freeze({left:184,right:777,top:119,bottom:421,radius:102});
// Track has LONG straightaways joined by exact quarter circles. Old 1.0
// S-bend/hairpin geometry was visually difficult to parse on mobile.
const NODES=[
  [388,119],[675,119],[777,221],[777,319],
  [675,421],[286,421],[184,319],[184,221]
];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
const hypot=Math.hypot;
const mod=(x,n)=>(x%n+n)%n;
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const zoneAt=t=>Math.floor(Math.max(0,t+1e-8)/ZONE_SECONDS);
const zoneSpeed=z=>Math.min(187,118+12*Math.max(0,z));
const rand=seed=>{let n=(seed>>>0)||0x6e624eb7;
  return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296};
};
function makeTrack(shape=TRACK_SHAPE,steps=20){
  const {left:L,right:R,top:T,bottom:B,radius:r}=shape;
  if(!(r>0&&R-L>r*2&&B-T>r*2))throw Error('Invalid Circuit shape');
  const samples=[];
  const push=(x,y)=>{
    const prev=samples[samples.length-1];
    if(prev&&hypot(prev.x-x,prev.y-y)<.00001)return;
    samples.push({x,y});
  };
  const line=(x1,y1,x2,y2)=>{
    const count=Math.max(1,Math.ceil(hypot(x2-x1,y2-y1)/
      Math.max(4,steps*.4)));
    for(let j=1;j<=count;j++)push(x1+(x2-x1)*j/count,
      y1+(y2-y1)*j/count);
  };
  const arc=(cx,cy,start,end)=>{
    const count=Math.max(8,Math.ceil(steps*1.7));
    for(let j=1;j<=count;j++){
      const a=start+(end-start)*j/count;
      push(cx+r*Math.cos(a),cy+r*Math.sin(a));
    }
  };
  // Start/finish on the upper straight, not at a tight corner.
  const sx=L+r+75;
  push(sx,T);
  line(sx,T,R-r,T);
  arc(R-r,T+r,-Math.PI/2,0);
  line(R,T+r,R,B-r);
  arc(R-r,B-r,0,Math.PI/2);
  line(R-r,B,L+r,B);
  arc(L+r,B-r,Math.PI/2,Math.PI);
  line(L,B-r,L,T+r);
  arc(L+r,T+r,Math.PI,Math.PI*1.5);
  line(L+r,T,sx,T);
  let total=0;samples[0].s=0;
  for(let i=1;i<samples.length;i++){
    total+=hypot(samples[i].x-samples[i-1].x,
      samples[i].y-samples[i-1].y);
    samples[i].s=total;
  }
  return {samples,length:total,half:TRACK_HALF,
    pointCount:samples.length,shape:{...shape},
    layout:'straight-arc',segmentKinds:['straight','quarter-arc']};
}
const TRACK=makeTrack();
function pointAt(s,track=TRACK){
  const distance=mod(s,track.length),list=track.samples;
  let lo=0,hi=list.length-1;
  while(lo+1<hi){
    const mid=(lo+hi)>>1;
    if(list[mid].s<distance)lo=mid;else hi=mid;
  }
  const a=list[lo],b=list[lo+1],segLen=b.s-a.s||1;
  const t=clamp((distance-a.s)/segLen,0,1);
  const tx=(b.x-a.x)/segLen,ty=(b.y-a.y)/segLen;
  return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,
    tx,ty,angle:Math.atan2(ty,tx),nx:-ty,ny:tx,s:distance};
}
function closest(x,y,track=TRACK){
  let best=Infinity,result=null;
  const list=track.samples;
  for(let i=0;i<list.length-1;i++){
    const a=list[i],b=list[i+1],dx=b.x-a.x,dy=b.y-a.y;
    const den=dx*dx+dy*dy||1;
    const t=clamp(((x-a.x)*dx+(y-a.y)*dy)/den,0,1);
    const px=a.x+dx*t,py=a.y+dy*t,distSq=(x-px)**2+(y-py)**2;
    if(distSq<best){
      best=distSq;
      const seg=Math.sqrt(den);
      result={x:px,y:py,dist:Math.sqrt(distSq),
        s:a.s+seg*t,tx:dx/seg,ty:dy/seg,
        nx:-dy/seg,ny:dx/seg,
        side:((x-px)*(-dy)+(y-py)*dx)/seg,index:i};
    }
  }
  return result;
}
function directionAt(s,lead=68,track=TRACK){
  const a=pointAt(s,track),b=pointAt(s+lead,track);
  return Math.atan2(b.y-a.y,b.x-a.x);
}
function seededRace(seed=20261111){
  const random=rand(seed);
  // The player begins third: overtaking is visible from the first lap,
  // without forcing all four racers into repeated front-to-back contacts.
  const grid=[-56,-84,-28,0];
  const lane=[-13,13,-13,13];
  const racers=grid.map((distance,id)=>{
    const p=pointAt(distance),off=lane[id];
    return {id,name:NAMES[id],color:COLORS[id],
      x:p.x+p.nx*off,y:p.y+p.ny*off,angle:p.angle,
      speed:0,progress:distance,laps:0,finished:false,finishTime:null,
      lapTimes:[],lastLapStart:0,edgeHits:0,contacts:0,
      dashes:0,dashTime:0,dashCooldown:0,brakeSeconds:0,
      lineSeconds:0,flow:0,bestFlow:0,edgeCooldown:0,
      aiLane:id===0?lane[id]:lane[id]+(random()-.5)*9,
      aiTempo:id===0?1:.90+id*.022+(random()-.5)*.06,
      contactFlash:0,impactCooldown:0,impulseX:0,impulseY:0,
      knockSeconds:0,falls:0,knockouts:0,fallTimer:0,
      respawns:0,invulnerable:0,lastAttacker:null,unsafeImpact:false};
  });
  const race={seed,random,racers,ready:READY_SECONDS,elapsed:0,
    zone:0,tide:0,phase:'ready',finished:false,finishPlace:null,
    winner:null,announcement:'READY',announcementTime:0,
    events:[],overflow:0,maxEvents:450,
    impacts:[],contactPairs:{},performance:{
      frames:0,slow50:0,worstFrameMs:0,renderMaxMs:0},
    quality:'auto'};
  log(race,'race_start',{mode:'neon-circuit-1.1',laps:LAPS_TO_WIN,
    trackLength:Math.round(TRACK.length),track:'rounded-straights',
    impact:'ejection-and-respawn'});
  return race;
}
function log(m,type,detail={}){
  if(m.events.length<m.maxEvents)
    m.events.push({t:+m.elapsed.toFixed(3),type,...detail});
  else m.overflow++;
}
function raceRanking(m){
  return m.racers.slice().sort((a,b)=>{
    if(a.finished&&b.finished)return a.finishTime-b.finishTime;
    if(a.finished)return -1;if(b.finished)return 1;
    return b.progress-a.progress;
  }).map(p=>p.id);
}
function currentPosition(m,id=0){return raceRanking(m).indexOf(id)+1}
function lapProgress(p,track=TRACK){
  return {lap:Math.max(0,Math.floor(p.progress/track.length)+1),
    fraction:mod(p.progress,track.length)/track.length,
    total:p.progress/track.length};
}
function updateProgress(m,p,nearest,dt){
  const length=TRACK.length,old=mod(p.progress,length);
  let delta=nearest.s-old;
  if(delta>length/2)delta-=length;
  if(delta<-length/2)delta+=length;
  // No reverse laps and no teleport shortcut: progress is limited by
  // physical forward movement in a single deterministic physics tick.
  if(delta<-.6||delta>Math.max(8,p.speed*dt*2.3+4))return;
  const before=p.progress;
  p.progress+=Math.max(0,delta);
  const lapBefore=Math.max(0,Math.floor(before/length));
  const lapAfter=Math.max(0,Math.floor(p.progress/length));
  if(lapAfter>lapBefore){
    p.laps=lapAfter;
    const lapTime=+(m.elapsed-p.lastLapStart).toFixed(3);
    p.lapTimes.push(lapTime);
    p.lastLapStart=m.elapsed;
    log(m,'lap',{player:p.id,lap:p.laps,seconds:lapTime});
    if(p.id===0){
      m.announcement='LAP '+Math.min(p.laps+1,LAPS_TO_WIN)+' / '+LAPS_TO_WIN;
      m.announcementTime=m.elapsed+1.1;
    }
    if(p.laps>=LAPS_TO_WIN){
      p.finished=true;p.finishTime=m.elapsed;
      log(m,'finish',{player:p.id,time:+m.elapsed.toFixed(3)});
    }
  }
}
function desiredAI(m,p){
  const s=closest(p.x,p.y).s;
  const look=clamp(p.speed*.53,59,103);
  const ahead=pointAt(s+look);
  const lane=p.aiLane*(.68+.08*Math.sin(m.elapsed*.7+p.id));
  const tx=ahead.x+ahead.nx*lane,ty=ahead.y+ahead.ny*lane;
  const angle=Math.atan2(ty-p.y,tx-p.x);
  const near=pointAt(s+28),future=pointAt(s+120);
  const curve=Math.abs(angleDelta(near.angle,future.angle));
  return {angle,brake:curve>.57&&p.speed>115,
    line:s,curvature:curve};
}
function fallOff(m,p){
  if(p.fallTimer>0||p.finished||p.invulnerable>0)return;
  p.falls++;p.fallTimer=FALL_SECONDS;
  p.speed=0;p.dashTime=0;p.impulseX=0;p.impulseY=0;
  p.knockSeconds=0;p.contactFlash=0;p.unsafeImpact=false;
  const attacker=p.lastAttacker;
  if(Number.isInteger(attacker)&&attacker!==p.id&&m.racers[attacker]){
    m.racers[attacker].knockouts++;
  }
  log(m,'fall',{player:p.id,attacker:attacker??null,
    lap:p.laps+1,progress:+p.progress.toFixed(1)});
  if(p.id===0){
    m.announcement='FALL · RESPAWNING';
    m.announcementTime=m.elapsed+.9;
  }
}
function respawn(m,p){
  // The racing clock never resets. The cube appears safely near its last
  // validated position. A small setback costs time, not a whole lap.
  const target=pointAt(p.progress-27),offset=p.id%2?6:-6;
  p.x=target.x+target.nx*offset;
  p.y=target.y+target.ny*offset;
  p.angle=target.angle;
  p.speed=zoneSpeed(m.zone)*.68;
  p.impulseX=0;p.impulseY=0;p.knockSeconds=0;p.lastAttacker=null;
  p.impactCooldown=.55;p.edgeCooldown=.45;
  p.invulnerable=RESPAWN_GRACE;
  p.respawns++;
  log(m,'respawn',{player:p.id,lap:p.laps+1,
    grace:RESPAWN_GRACE,setback:27});
}
function moveRacer(m,p,input,dt){
  if(p.finished)return;
  if(p.fallTimer>0){
    p.fallTimer=Math.max(0,p.fallTimer-dt);
    if(p.fallTimer<=0)respawn(m,p);
    return;
  }
  p.dashTime=Math.max(0,p.dashTime-dt);
  p.dashCooldown=Math.max(0,p.dashCooldown-dt);
  p.edgeCooldown=Math.max(0,p.edgeCooldown-dt);
  p.impactCooldown=Math.max(0,p.impactCooldown-dt);
  p.invulnerable=Math.max(0,p.invulnerable-dt);
  p.knockSeconds=Math.max(0,p.knockSeconds-dt);
  p.contactFlash=Math.max(0,p.contactFlash-dt);
  let brake=false,desired=p.angle;
  const now=closest(p.x,p.y);
  if(p.id===0){
    brake=!!input.brake;
    const x=Number.isFinite(input.x)?input.x:0;
    const y=Number.isFinite(input.y)?input.y:0;
    const guide=pointAt(now.s+clamp(p.speed*.35,33,58));
    const trackGuide=Math.atan2(guide.y-p.y,guide.x-p.x);
    if(hypot(x,y)>.13){
      desired=Math.atan2(y,x);
      // Assist only near the outer ramp. The joystick still steers all
      // normal overtakes. At the rim, it helps escape instead of sticking
      // against the same edge for dozens of seconds.
      const edge=clamp((now.dist-12)/(RAMP_START-12),0,1);
      const assist=.12+.72*edge*edge;
      desired+=angleDelta(desired,trackGuide)*assist;
    }else desired=trackGuide;
    if(input.dash&&p.dashCooldown<=0){
      p.dashTime=DASH_TIME;p.dashCooldown=DASH_COOLDOWN;p.dashes++;
      log(m,'dash',{player:p.id,lap:p.laps+1});
    }
  }else{
    const ai=desiredAI(m,p);
    desired=ai.angle;brake=ai.brake;
  }
  const turnSpeed=brake?5.35:4.15;
  p.angle+=clamp(angleDelta(p.angle,desired),-turnSpeed*dt,turnSpeed*dt);
  if(brake)p.brakeSeconds+=dt;
  const base=zoneSpeed(m.zone);
  const aiSpeed=p.aiTempo;
  const dashFactor=p.dashTime>0?1.47:1;
  const flowFactor=p.id===0?1+.075*p.flow:1;
  const target=base*aiSpeed*(brake?.58:1)*dashFactor*flowFactor;
  p.speed+=clamp(target-p.speed,-185*dt,235*dt);
  const proposed={x:p.x+(Math.cos(p.angle)*p.speed+p.impulseX)*dt,
    y:p.y+(Math.sin(p.angle)*p.speed+p.impulseY)*dt};
  // Keep the knock momentum alive for ~200ms, producing visibly larger
  // collisions and allowing a strong impact to carry racers over the lip.
  p.impulseX*=Math.pow(IMPACT_FRICTION,dt*60);
  p.impulseY*=Math.pow(IMPACT_FRICTION,dt*60);
  let nearest=closest(proposed.x,proposed.y);
  const limit=RAMP_START;
  if(nearest.dist>limit){
    if(p.unsafeImpact&&p.knockSeconds>.05&&p.invulnerable<=0&&
        nearest.dist>limit+3){
      p.x=proposed.x;p.y=proposed.y;
      fallOff(m,p);
      return;
    }
    const factor=limit/Math.max(.01,nearest.dist);
    proposed.x=nearest.x+(proposed.x-nearest.x)*factor;
    proposed.y=nearest.y+(proposed.y-nearest.y)*factor;
    // No more repeated 45% losses and near-zero "speed 5" stalls.
    p.speed=Math.max(zoneSpeed(m.zone)*.69,p.speed*.86);
    const inward=pointAt(nearest.s+52);
    const escape=Math.atan2(inward.y-proposed.y,inward.x-proposed.x);
    p.angle+=angleDelta(p.angle,escape)*.72;
    p.impulseX*=.35;p.impulseY*=.35;
    p.unsafeImpact=false;
    if(p.edgeCooldown<=0){
      p.edgeHits++;p.contactFlash=.16;p.edgeCooldown=.5;
      log(m,'edge_scrape',{player:p.id,lap:p.laps+1,zone:m.zone+1,
        speed:Math.round(p.speed)});
    }
    nearest=closest(proposed.x,proposed.y);
  }
  p.x=proposed.x;p.y=proposed.y;
  updateProgress(m,p,nearest,dt);
  if(p.id===0){
    if(nearest.dist<24&&!brake){
      p.flow=clamp(p.flow+dt*.34,0,1);
      p.lineSeconds+=dt;
    }else p.flow=clamp(p.flow-dt*.54,0,1);
    p.bestFlow=Math.max(p.bestFlow,p.flow);
  }
}
function bumpRacers(m){
  for(let i=0;i<m.racers.length;i++){
    const a=m.racers[i];
    if(a.finished||a.fallTimer>0||a.invulnerable>0)continue;
    for(let j=i+1;j<m.racers.length;j++){
      const b=m.racers[j];
      if(b.finished||b.fallTimer>0||b.invulnerable>0)continue;
      let dx=b.x-a.x,dy=b.y-a.y,d=hypot(dx,dy);
      if(d>=PLAYER_RADIUS*2.2)continue;
      if(d<.01){dx=1;dy=0;d=1}
      const nx=dx/d,ny=dy/d;
      const push=(PLAYER_RADIUS*2.2-d)*.52;
      a.x-=nx*push;a.y-=ny*push;
      b.x+=nx*push;b.y+=ny*push;
      const aVX=Math.cos(a.angle)*a.speed+a.impulseX;
      const aVY=Math.sin(a.angle)*a.speed+a.impulseY;
      const bVX=Math.cos(b.angle)*b.speed+b.impulseX;
      const bVY=Math.sin(b.angle)*b.speed+b.impulseY;
      const closing=Math.max(0,(aVX-bVX)*nx+(aVY-bVY)*ny);
      const dashA=a.dashTime>0,dashB=b.dashTime>0;
      const key=i+'-'+j;
      const last=m.contactPairs[key]??-100;
      // Any true high-speed contact is meaningful. Slow side-by-side
      // brushing still separates shapes without fake impact spam.
      if(m.elapsed-last>=IMPACT_COOLDOWN &&
          (closing>19||dashA||dashB)){
        m.contactPairs[key]=m.elapsed;
        const force=clamp(120+closing*.95+(dashA||dashB?145:0),
          130,430);
        const weightA=dashA&&!dashB?.23:dashB&&!dashA?1:.70;
        const weightB=dashB&&!dashA?.23:dashA&&!dashB?1:.70;
        a.impulseX-=nx*force*weightA;
        a.impulseY-=ny*force*weightA;
        b.impulseX+=nx*force*weightB;
        b.impulseY+=ny*force*weightB;
        a.knockSeconds=.36;b.knockSeconds=.36;
        a.unsafeImpact=true;b.unsafeImpact=true;
        a.lastAttacker=b.id;b.lastAttacker=a.id;
        a.speed*=dashA?.91:.77;b.speed*=dashB?.91:.77;
        a.contacts++;b.contacts++;
        a.contactFlash=.24;b.contactFlash=.24;
        m.impacts.push({x:(a.x+b.x)/2,y:(a.y+b.y)/2,
          nx,ny,life:.32,colorA:a.color,colorB:b.color,
          strength:force});
        if(m.impacts.length>10)m.impacts.shift();
        log(m,'impact',{a:a.id,b:b.id,force:Math.round(force),
          dash:dashA||dashB,closing:Math.round(closing)});
      }
      // A high-energy hit deliberately exceeds the safe road limit:
      // don't clamp it away before the fall check on the next tick.
    }
  }
}
function tick(m,input={},dt=STEP){
  if(m.finished)return m;
  const step=clamp(dt,0,1/30);
  if(!step)return m;
  if(m.phase==='ready'){
    m.ready=Math.max(0,m.ready-step);
    if(m.ready<=0){
      m.phase='running';m.announcement='GO!';
      m.announcementTime=m.elapsed+1.1;
      log(m,'go');
    }
    return m;
  }
  if(m.phase!=='running')return m;
  const oldZone=m.zone;
  m.elapsed+=step;
  m.zone=zoneAt(m.elapsed);
  if(m.zone!==oldZone){
    m.tide=1.12;
    m.announcement='ZONE '+String(m.zone+1).padStart(2,'0')+' · SPEED UP';
    m.announcementTime=m.elapsed+1.2;
    log(m,'zone',{zone:m.zone+1,speed:zoneSpeed(m.zone)});
  }
  m.tide=Math.max(0,m.tide-step);
  for(const p of m.racers)moveRacer(m,p,input,step);
  bumpRacers(m);
  for(const v of m.impacts)v.life-=step;
  m.impacts=m.impacts.filter(v=>v.life>0);
  if(m.racers[0].finished||m.elapsed>=110){
    m.finished=true;m.phase='result';
    m.finishPlace=currentPosition(m);
    m.winner=raceRanking(m)[0];
    log(m,'race_end',{place:m.finishPlace,winner:m.winner,
      duration:+m.elapsed.toFixed(3),completed:m.racers[0].finished});
  }
  return m;
}
function audit(m){
  const p=m.racers[0];
  return {schema:'neon-circuit-run-audit/1.1',build:'neon-circuit-1.1',
    seed:m.seed,status:m.finished?'completed':'in_progress',
    summary:{durationSeconds:+m.elapsed.toFixed(3),highestZone:m.zone+1,
      finishPlace:m.finishPlace,lapsCompleted:p.laps,
      lapFraction:+lapProgress(p).fraction.toFixed(3),
      lapTimes:p.lapTimes.slice(),speed:Math.round(p.speed),
      edgeHits:p.edgeHits,contacts:p.contacts,dashes:p.dashes,
      falls:p.falls,respawns:p.respawns,knockouts:p.knockouts,
      brakeSeconds:+p.brakeSeconds.toFixed(2),
      lineSeconds:+p.lineSeconds.toFixed(2),bestFlow:+p.bestFlow.toFixed(3),
      finishCompleted:p.finished,performance:{...m.performance}},
    racers:m.racers.map(r=>({
      id:r.id,finished:r.finished,laps:r.laps,
      finishTime:r.finishTime,edgeHits:r.edgeHits,contacts:r.contacts,
      dashes:r.dashes,falls:r.falls,respawns:r.respawns,
      knockouts:r.knockouts,lapTimes:r.lapTimes.slice()})),
    events:m.events.map(v=>({...v})),
    limits:{maxEvents:m.maxEvents,droppedEvents:m.overflow},
    privacy:'Local export only; no raw joystick, device identifiers or network telemetry'};
}
return {WIDTH,HEIGHT,CX,CY,COLORS,NAMES,NODES,TRACK,TRACK_SHAPE,
  TRACK_HALF,PLAYER_RADIUS,RAMP_START,FALL_SECONDS,RESPAWN_GRACE,
  READY_SECONDS,ZONE_SECONDS,LAPS_TO_WIN,DASH_TIME,DASH_COOLDOWN,STEP,zoneAt,zoneSpeed,
  angleDelta,makeTrack,pointAt,closest,directionAt,seededRace,
  tick,currentPosition,lapProgress,raceRanking,audit,desiredAI};
});
