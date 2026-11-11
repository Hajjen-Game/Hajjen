/* CHROMA RUSH — NEON CIRCUIT 1.0
 * Four-cube closed-track arcade racing. Pure deterministic game rules:
 * Catmull-Rom spline geometry, checkpoint-safe lap progression, collision
 * bumping, brake/drift, short Dash, progressive 10s color-speed zones.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaNeonCircuitCore=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';
const WIDTH=960,HEIGHT=540,CX=480,CY=270;
const TRACK_HALF=48,PLAYER_RADIUS=11;
const ZONE_SECONDS=10,LAPS_TO_WIN=3,READY_SECONDS=2.4,STEP=1/60;
const COLORS=['#60ecff','#ff71ac','#ffe26a','#9f8aff'];
const NAMES=['YOU','NOVA','VOLT','HEX'];
const DASH_TIME=.34,DASH_COOLDOWN=5.4;
const NODES=[
  [215,164],[350,109],[505,115],[683,139],
  [764,221],[736,294],[635,386],[514,377],
  [438,316],[347,343],[245,384],[159,303]
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
function catmull(p0,p1,p2,p3,t){
  const t2=t*t,t3=t2*t;
  return [
    .5*((2*p1[0])+(-p0[0]+p2[0])*t+
      (2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+
      (-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),
    .5*((2*p1[1])+(-p0[1]+p2[1])*t+
      (2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+
      (-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)
  ];
}
function makeTrack(nodes=NODES,steps=20){
  const samples=[],n=nodes.length;
  for(let i=0;i<n;i++){
    for(let k=0;k<steps;k++){
      const p=catmull(nodes[(i-1+n)%n],nodes[i],nodes[(i+1)%n],
        nodes[(i+2)%n],k/steps);
      samples.push({x:p[0],y:p[1]});
    }
  }
  samples.push({...samples[0]});
  let total=0;
  samples[0].s=0;
  for(let i=1;i<samples.length;i++){
    total+=hypot(samples[i].x-samples[i-1].x,
      samples[i].y-samples[i-1].y);
    samples[i].s=total;
  }
  return {samples,length:total,half:TRACK_HALF,pointCount:samples.length};
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
      aiTempo:id===0?1:.91+id*.025+(random()-.5)*.045,
      contactFlash:0};
  });
  const race={seed,random,racers,ready:READY_SECONDS,elapsed:0,
    zone:0,tide:0,phase:'ready',finished:false,finishPlace:null,
    winner:null,announcement:'READY',announcementTime:0,
    events:[],overflow:0,maxEvents:450,
    impacts:[],contactPairs:{},performance:{
      frames:0,slow50:0,worstFrameMs:0,renderMaxMs:0},
    quality:'auto'};
  log(race,'race_start',{mode:'neon-circuit-1.0',laps:LAPS_TO_WIN,
    trackLength:Math.round(TRACK.length)});
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
function moveRacer(m,p,input,dt){
  if(p.finished)return;
  p.dashTime=Math.max(0,p.dashTime-dt);
  p.dashCooldown=Math.max(0,p.dashCooldown-dt);
  p.edgeCooldown=Math.max(0,p.edgeCooldown-dt);
  p.contactFlash=Math.max(0,p.contactFlash-dt);
  let brake=false,desired=p.angle;
  if(p.id===0){
    brake=!!input.brake;
    const x=Number.isFinite(input.x)?input.x:0;
    const y=Number.isFinite(input.y)?input.y:0;
    if(hypot(x,y)>.13)desired=Math.atan2(y,x);
    if(input.dash&&p.dashCooldown<=0){
      p.dashTime=DASH_TIME;p.dashCooldown=DASH_COOLDOWN;p.dashes++;
      log(m,'dash',{player:p.id,lap:p.laps+1});
    }
  }else{
    const ai=desiredAI(m,p);
    desired=ai.angle;brake=ai.brake;
  }
  const turnSpeed=brake?5.1:3.75;
  p.angle+=clamp(angleDelta(p.angle,desired),-turnSpeed*dt,turnSpeed*dt);
  if(brake)p.brakeSeconds+=dt;
  const base=zoneSpeed(m.zone);
  const aiSpeed=p.aiTempo;
  const dashFactor=p.dashTime>0?1.47:1;
  const flowFactor=p.id===0?1+.075*p.flow:1;
  const target=base*aiSpeed*(brake?.53:1)*dashFactor*flowFactor;
  p.speed+=clamp(target-p.speed,-205*dt,260*dt);
  const proposed={x:p.x+Math.cos(p.angle)*p.speed*dt,
    y:p.y+Math.sin(p.angle)*p.speed*dt};
  let nearest=closest(proposed.x,proposed.y);
  const limit=TRACK_HALF-PLAYER_RADIUS;
  if(nearest.dist>limit){
    const factor=limit/Math.max(.01,nearest.dist);
    proposed.x=nearest.x+(proposed.x-nearest.x)*factor;
    proposed.y=nearest.y+(proposed.y-nearest.y)*factor;
    p.speed*=.55;
    const tangent=Math.atan2(nearest.ty,nearest.tx);
    p.angle+=angleDelta(p.angle,tangent)*.42;
    if(p.edgeCooldown<=0){
      p.edgeHits++;
      p.contactFlash=.16;
      p.edgeCooldown=.40;
      log(m,'edge_scrape',{player:p.id,lap:p.laps+1,zone:m.zone+1,
        speed:Math.round(p.speed)});
    }
    nearest=closest(proposed.x,proposed.y);
  }
  p.x=proposed.x;p.y=proposed.y;
  updateProgress(m,p,nearest,dt);
  if(p.id===0){
    if(nearest.dist<21&&!brake){
      p.flow=clamp(p.flow+dt*.36,0,1);
      p.lineSeconds+=dt;
    }else p.flow=clamp(p.flow-dt*.58,0,1);
    p.bestFlow=Math.max(p.bestFlow,p.flow);
  }
}
function bumpRacers(m){
  for(let i=0;i<m.racers.length;i++){
    const a=m.racers[i];if(a.finished)continue;
    for(let j=i+1;j<m.racers.length;j++){
      const b=m.racers[j];if(b.finished)continue;
      let dx=b.x-a.x,dy=b.y-a.y,d=hypot(dx,dy);
      if(d>=PLAYER_RADIUS*2.2)continue;
      if(d<.01){dx=1;dy=0;d=1}
      const nx=dx/d,ny=dy/d;
      const push=(PLAYER_RADIUS*2.2-d)*.52;
      a.x-=nx*push;a.y-=ny*push;
      b.x+=nx*push;b.y+=ny*push;
      // Cars sharing a lane should not be penalized EVERY FRAME for
      // harmless bumper-to-bumper proximity. Only relative high-speed or
      // significantly opposing contact generates an actual impact.
      const relative=Math.abs(a.speed-b.speed);
      const opposite=Math.abs(angleDelta(a.angle,b.angle))>.55;
      const key=i+'-'+j;
      if((relative>18||opposite)&&m.elapsed-(m.contactPairs[key]??-100)>.68){
        m.contactPairs[key]=m.elapsed;
        a.speed*=.84;b.speed*=.84;
        a.contactFlash=.14;b.contactFlash=.14;
        a.contacts++;b.contacts++;
        m.impacts.push({x:(a.x+b.x)/2,y:(a.y+b.y)/2,nx,ny,life:.24,
          colorA:a.color,colorB:b.color});
        if(m.impacts.length>8)m.impacts.shift();
        log(m,'contact',{a:a.id,b:b.id,intensity:Math.round(relative)});
      }
      // Resolve against road after pushing to avoid persistent wall clipping.
      for(const p of [a,b]){
        const near=closest(p.x,p.y);
        const max=TRACK_HALF-PLAYER_RADIUS;
        if(near.dist>max){
          const ratio=max/near.dist;
          p.x=near.x+(p.x-near.x)*ratio;
          p.y=near.y+(p.y-near.y)*ratio;
        }
      }
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
  return {schema:'neon-circuit-run-audit/1.0',build:'neon-circuit-1.0',
    seed:m.seed,status:m.finished?'completed':'in_progress',
    summary:{durationSeconds:+m.elapsed.toFixed(3),highestZone:m.zone+1,
      finishPlace:m.finishPlace,lapsCompleted:p.laps,
      lapFraction:+lapProgress(p).fraction.toFixed(3),
      lapTimes:p.lapTimes.slice(),speed:Math.round(p.speed),
      edgeHits:p.edgeHits,contacts:p.contacts,dashes:p.dashes,
      brakeSeconds:+p.brakeSeconds.toFixed(2),
      lineSeconds:+p.lineSeconds.toFixed(2),bestFlow:+p.bestFlow.toFixed(3),
      finishCompleted:p.finished,performance:{...m.performance}},
    racers:m.racers.map(r=>({
      id:r.id,finished:r.finished,laps:r.laps,
      finishTime:r.finishTime,edgeHits:r.edgeHits,contacts:r.contacts,
      dashes:r.dashes,lapTimes:r.lapTimes.slice()})),
    events:m.events.map(v=>({...v})),
    limits:{maxEvents:m.maxEvents,droppedEvents:m.overflow},
    privacy:'Local export only; no raw joystick, device identifiers or network telemetry'};
}
return {WIDTH,HEIGHT,CX,CY,COLORS,NAMES,NODES,TRACK,
  TRACK_HALF,PLAYER_RADIUS,ZONE_SECONDS,LAPS_TO_WIN,
  READY_SECONDS,DASH_TIME,DASH_COOLDOWN,STEP,zoneAt,zoneSpeed,
  angleDelta,makeTrack,pointAt,closest,directionAt,seededRace,
  tick,currentPosition,lapProgress,raceRanking,audit,desiredAI};
});
