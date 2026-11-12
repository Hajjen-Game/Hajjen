/* CHROMA RUSH — NEON CIRCUIT 2.0: World Track & Follow Camera
 * One authored multi-screen road with long straightaways, a broad hairpin
 * and a sweeping S sector. Physical lap gates, AI, contacts and Track Tide
 * remain in world coordinates; the follow camera only changes the view.
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
const MAX_RACE_SECONDS=165;
const COLOR_WAVE_SECONDS=1.45;
const COLORS=['#60ecff','#ff71ac','#ffe26a','#9f8aff'];
const NAMES=['YOU','NOVA','VOLT','HEX'];
const DASH_TIME=.34,DASH_COOLDOWN=5.4;
// 2.0 is no longer squeezed into a 960×540 arena.
// Only a small fraction of this multi-screen world is visible at once.
const TRACK_SHAPE=Object.freeze({left:240,right:2260,top:185,bottom:1300,radius:160});
const COURSE_PROFILES=Object.freeze([
  {id:'spectral-highway',name:'SPECTRAL HIGHWAY',cornerCut:180,
    waypoints:[
      [620,260],[1580,260],        // opening long straight
      [1930,350],[2140,565],       // sweeping right turn
      [2210,800],[2050,960],       // outside bank
      [1800,935],[1600,790],       // smooth interior sweep
      [1380,890],[1310,1120],      // deliberate S
      [1050,1240],[710,1210],      // lower broad stretch
      [470,1090],[280,880],        // generous left hairpin
      [310,620],[430,460]         // climb to start
    ]}
]);
const NODES=COURSE_PROFILES[0].waypoints;
const COURSE_NAMES=COURSE_PROFILES.map(p=>p.name);
const COURSE_IDS=COURSE_PROFILES.map(p=>p.id);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
const hypot=Math.hypot;
const mod=(x,n)=>(x%n+n)%n;
const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const zoneAt=t=>Math.floor(Math.max(0,t+1e-8)/ZONE_SECONDS);
const zoneSpeed=z=>Math.min(268,172+14*Math.max(0,z));
const rand=seed=>{let n=(seed>>>0)||0x6e624eb7;
  return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296};
};
function makeTrack(shape=TRACK_SHAPE,steps=20,variant=0){
  const index=mod(Math.floor(variant),COURSE_PROFILES.length);
  const profile=COURSE_PROFILES[index],vertices=profile.waypoints;
  const n=vertices.length,spacing=Math.max(4,Math.min(10,steps*.40));
  const incoming=[],outgoing=[];
  for(let i=0;i<n;i++){
    const p=vertices[(i+n-1)%n],v=vertices[i],q=vertices[(i+1)%n];
    const dx=v[0]-p[0],dy=v[1]-p[1],nextX=q[0]-v[0],nextY=q[1]-v[1];
    const before=hypot(dx,dy),after=hypot(nextX,nextY);
    if(before<60||after<60)throw Error('World circuit segment too short');
    const cut=Math.min(profile.cornerCut,before*.44,after*.44);
    incoming.push({x:v[0]-dx/before*cut,y:v[1]-dy/before*cut});
    outgoing.push({x:v[0]+nextX/after*cut,y:v[1]+nextY/after*cut});
  }
  const samples=[],push=(x,y)=>{
    const prev=samples[samples.length-1];
    if(prev&&hypot(prev.x-x,prev.y-y)<1e-6)return;
    samples.push({x,y});
  };
  push(outgoing[0].x,outgoing[0].y);
  for(let i=0;i<n;i++){
    const j=(i+1)%n,from=outgoing[i],to=incoming[j],
      distance=hypot(to.x-from.x,to.y-from.y),
      count=Math.max(2,Math.ceil(distance/spacing));
    for(let k=1;k<=count;k++){
      const t=k/count;
      push(from.x+(to.x-from.x)*t,from.y+(to.y-from.y)*t);
    }
    const v=vertices[j],exit=outgoing[j],
      bendLength=hypot(to.x-v[0],to.y-v[1])+hypot(exit.x-v[0],exit.y-v[1]),
      arcCount=Math.max(8,Math.ceil(bendLength/spacing));
    for(let k=1;k<=arcCount;k++){
      const t=k/arcCount,u=1-t;
      push(u*u*to.x+2*u*t*v[0]+t*t*exit.x,
        u*u*to.y+2*u*t*v[1]+t*t*exit.y);
    }
  }
  const first=samples[0],last=samples[samples.length-1];
  if(hypot(first.x-last.x,first.y-last.y)>1e-5)
    samples.push({x:first.x,y:first.y});
  let total=0;samples[0].s=0;
  const bounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity};
  for(let i=0;i<samples.length;i++){
    const p=samples[i];
    bounds.minX=Math.min(bounds.minX,p.x);bounds.maxX=Math.max(bounds.maxX,p.x);
    bounds.minY=Math.min(bounds.minY,p.y);bounds.maxY=Math.max(bounds.maxY,p.y);
    if(i){total+=hypot(p.x-samples[i-1].x,p.y-samples[i-1].y);p.s=total;}
  }
  if(total<4000||total>6500)throw Error('World circuit length out of range');
  if(bounds.maxX-bounds.minX<1600||bounds.maxY-bounds.minY<850)
    throw Error('World circuit too small for follow-camera racing');
  return {samples,length:total,half:TRACK_HALF,
    pointCount:samples.length,shape:{...shape},variant:index,
    courseId:profile.id,name:profile.name,bounds,
    coverage:{width:(bounds.maxX-bounds.minX+2*TRACK_HALF)/WIDTH,
      height:(bounds.maxY-bounds.minY+2*TRACK_HALF)/HEIGHT},
    layout:'multi-screen-world-track',
    segmentKinds:['straight','rounded-corner','hairpin','sweep']};
}
const TRACKS=COURSE_PROFILES.map((_,index)=>makeTrack(TRACK_SHAPE,20,index));
const TRACK=TRACKS[0];
const WORLD_BOUNDS=Object.freeze({
  minX:TRACK.bounds.minX-290,maxX:TRACK.bounds.maxX+290,
  minY:TRACK.bounds.minY-290,maxY:TRACK.bounds.maxY+290
});
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
function seededRace(seed=20261111,courseId=0){
  const random=rand(seed);
  const courseIndex=mod(Math.floor(courseId),TRACKS.length);
  const track=TRACKS[courseIndex];
  const gates=[0,.25,.5,.75].map(v=>pointAt(track.length*v,track));
  // The player begins third: overtaking is visible from the first lap,
  // without forcing all four racers into repeated front-to-back contacts.
  const grid=[-56,-84,-28,-12];
  const lane=[-13,13,-13,13];
  const racers=grid.map((distance,id)=>{
    const p=pointAt(distance,track),off=lane[id];
    return {id,name:NAMES[id],color:COLORS[id],
      x:p.x+p.nx*off,y:p.y+p.ny*off,angle:p.angle,
      speed:0,progress:distance,laps:0,finished:false,finishTime:null,
      lapTimes:[],lastLapStart:0,edgeHits:0,contacts:0,
      dashes:0,dashTime:0,dashCooldown:0,brakeSeconds:0,
      lineSeconds:0,flow:0,bestFlow:0,edgeCooldown:0,
      aiLane:id===0?lane[id]:lane[id]+(random()-.5)*9,
      aiTempo:id===0?1:.97+id*.024+(random()-.5)*.06,
      contactFlash:0,gatePasses:0,lastGateTime:null,impactCooldown:0,impulseX:0,impulseY:0,
      knockSeconds:0,falls:0,knockouts:0,fallTimer:0,
      respawns:0,invulnerable:0,lastAttacker:null,unsafeImpact:false};
  });
  const race={seed,random,racers,track,gates,courseIndex,
    ready:READY_SECONDS,elapsed:0,
    zone:0,tide:0,waveStartS:0,phase:'ready',finished:false,finishPlace:null,
    winner:null,announcement:'READY',announcementTime:0,
    events:[],overflow:0,maxEvents:450,
    impacts:[],contactPairs:{},performance:{
      frames:0,slow50:0,worstFrameMs:0,renderMaxMs:0},
    quality:'auto'};
  log(race,'race_start',{mode:'neon-circuit-2.0',laps:LAPS_TO_WIN,
    trackLength:Math.round(track.length),track:track.courseId,
    course:track.name,impact:'ejection-and-respawn',
    zoneWave:'forward-track-only'});
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
  return {lap:Math.max(1,p.laps+1),
    fraction:clamp((p.progress-p.laps*track.length)/track.length,0,1),
    total:p.progress/track.length};
}
const GATES=[0,.25,.5,.75].map(v=>pointAt(TRACK.length*v));
function gateCrossed(from,to,gate,width=TRACK_HALF+PLAYER_RADIUS){
  const tx=gate.tx,ty=gate.ty;
  const before=(from.x-gate.x)*tx+(from.y-gate.y)*ty;
  const after=(to.x-gate.x)*tx+(to.y-gate.y)*ty;
  if(!(before<=0&&after>0))return false;
  const factor=-before/(after-before);
  if(factor<0||factor>1)return false;
  const crossingX=from.x+(to.x-from.x)*factor;
  const crossingY=from.y+(to.y-from.y)*factor;
  const lane=(crossingX-gate.x)*gate.nx+(crossingY-gate.y)*gate.ny;
  return Math.abs(lane)<=width;
}
function updateProgress(m,p,from,nearest,dt){
  const length=m.track.length,quarter=length/4;
  // Credit an actual lap ONLY after passing four ordered physical gates
  // around the complete closed road. This never uses a projected progress
  // delta: a 1.0 projection mismatch used to permanently lock progress
  // until another entire circuit, silently throwing away physical laps.
  const expected=p.gatePasses%4,gate=m.gates[expected];
  const to={x:p.x,y:p.y};
  if(gateCrossed(from,to,gate)){
    p.gatePasses++;
    p.lastGateTime=m.elapsed;
    log(m,'checkpoint',{player:p.id,gate:expected,passed:p.gatePasses,
      projected:+nearest.s.toFixed(1)});
    if(expected===0&&p.gatePasses>1){
      p.laps++;
      const lapTime=+(m.elapsed-p.lastLapStart).toFixed(3);
      p.lapTimes.push(lapTime);
      p.lastLapStart=m.elapsed;
      log(m,'lap',{player:p.id,lap:p.laps,seconds:lapTime,
        validatedBy:'physical-checkpoints'});
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
  // The nearest-road projection may jump when a cube scrapes an inside
  // corner. Ranking/guide progress is bounded by the physical checkpoint
  // interval; it cannot freeze forever and never invents a completed lap.
  if(p.gatePasses===0){
    p.progress=clamp(nearest.s-length,-Math.max(110,length*.18),0);
  }else{
    const start=(p.gatePasses-1)*quarter;
    const qIndex=(p.gatePasses-1)%4;
    const baseLap=Math.floor((p.gatePasses-1)/4);
    let raw=nearest.s-qIndex*quarter;
    if(qIndex===0&&nearest.s>length*.75)raw=-1;
    else if(qIndex===3&&nearest.s<length*.20)raw=quarter;
    p.progress=clamp(start+raw,start,start+quarter);
    // p.laps is authoritative for HUD/results and never inferred from
    // an unreliable local projection.
    if(p.finished)p.progress=Math.max(p.progress,p.laps*length);
  }
}
function desiredAI(m,p){
  const s=closest(p.x,p.y,m.track).s;
  const look=clamp(p.speed*.53,59,103);
  const ahead=pointAt(s+look,m.track);
  const lane=p.aiLane*(.68+.08*Math.sin(m.elapsed*.7+p.id));
  const tx=ahead.x+ahead.nx*lane,ty=ahead.y+ahead.ny*lane;
  const angle=Math.atan2(ty-p.y,tx-p.x);
  const near=pointAt(s+28,m.track),future=pointAt(s+120,m.track);
  const curve=Math.abs(angleDelta(near.angle,future.angle));
  return {angle,brake:curve>.84&&p.speed>200,
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
  const target=pointAt(p.progress-27,m.track),offset=p.id%2?6:-6;
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
  const now=closest(p.x,p.y,m.track);
  if(p.id===0){
    brake=!!input.brake;
    const x=Number.isFinite(input.x)?input.x:0;
    const y=Number.isFinite(input.y)?input.y:0;
    const guide=pointAt(now.s+clamp(p.speed*.35,33,58),m.track);
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
  let nearest=closest(proposed.x,proposed.y,m.track);
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
    const inward=pointAt(nearest.s+52,m.track);
    const escape=Math.atan2(inward.y-proposed.y,inward.x-proposed.x);
    p.angle+=angleDelta(p.angle,escape)*.72;
    p.impulseX*=.35;p.impulseY*=.35;
    p.unsafeImpact=false;
    if(p.edgeCooldown<=0){
      p.edgeHits++;p.contactFlash=.16;p.edgeCooldown=.5;
      log(m,'edge_scrape',{player:p.id,lap:p.laps+1,zone:m.zone+1,
        speed:Math.round(p.speed)});
    }
    nearest=closest(proposed.x,proposed.y,m.track);
  }
  const previous={x:p.x,y:p.y};
  p.x=proposed.x;p.y=proposed.y;
  updateProgress(m,p,previous,nearest,dt);
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
    m.tide=COLOR_WAVE_SECONDS;
    // At the zone boundary the pigment begins just behind the player,
    // then travels *forward* along this track's arc-length geometry.
    m.waveStartS=mod(closest(m.racers[0].x,m.racers[0].y,m.track).s-92,
      m.track.length);
    m.announcement='ZONE '+String(m.zone+1).padStart(2,'0')+' · SPEED UP';
    m.announcementTime=m.elapsed+1.2;
    log(m,'zone',{zone:m.zone+1,speed:zoneSpeed(m.zone),
      waveStart:+m.waveStartS.toFixed(1),
      waveDirection:'forward',waveScope:'track-only',
      waveSeconds:COLOR_WAVE_SECONDS});
  }
  m.tide=Math.max(0,m.tide-step);
  for(const p of m.racers)moveRacer(m,p,input,step);
  bumpRacers(m);
  for(const v of m.impacts)v.life-=step;
  m.impacts=m.impacts.filter(v=>v.life>0);
  if(m.racers[0].finished||m.elapsed>=MAX_RACE_SECONDS){
    m.finished=true;m.phase='result';
    m.finishPlace=currentPosition(m);
    m.winner=raceRanking(m)[0];
    log(m,'race_end',{place:m.finishPlace,winner:m.winner,
      duration:+m.elapsed.toFixed(3),completed:m.racers[0].finished});
  }
  return m;
}
function waveState(m){
  const progress=clamp(1-m.tide/COLOR_WAVE_SECONDS,0,1);
  const start=mod(m.waveStartS||0,m.track.length);
  return {progress,start,length:m.track.length,
    reach:m.track.length*progress,
    frontS:mod(start+m.track.length*progress,m.track.length),
    active:m.zone>0&&m.tide>0,
    direction:'forward',scope:'track-only'};
}
function audit(m){
  const p=m.racers[0];
  return {schema:'neon-circuit-run-audit/2.0',build:'neon-circuit-2.0',
    seed:m.seed,status:m.finished?'completed':'in_progress',
    courseId:m.track.courseId,courseName:m.track.name,
    trackLength:+m.track.length.toFixed(1),
    summary:{durationSeconds:+m.elapsed.toFixed(3),highestZone:m.zone+1,
      lapValidation:'four-ordered-physical-gates',
      waveMode:'forward-track-only',
      cameraMode:'world-follow-lookahead-zoom',worldTrack:true,
      waveTransitions:m.events.filter(e=>e.type==='zone').length,
      finishPlace:m.finishPlace,lapsCompleted:p.laps,
      lapFraction:+lapProgress(p,m.track).fraction.toFixed(3),
      lapTimes:p.lapTimes.slice(),speed:Math.round(p.speed),
      edgeHits:p.edgeHits,contacts:p.contacts,dashes:p.dashes,
      falls:p.falls,respawns:p.respawns,knockouts:p.knockouts,
      brakeSeconds:+p.brakeSeconds.toFixed(2),
      lineSeconds:+p.lineSeconds.toFixed(2),bestFlow:+p.bestFlow.toFixed(3),
      finishCompleted:p.finished,performance:{...m.performance}},
    racers:m.racers.map(r=>({
      id:r.id,finished:r.finished,laps:r.laps,
      gatePasses:r.gatePasses,
      finishTime:r.finishTime,edgeHits:r.edgeHits,contacts:r.contacts,
      dashes:r.dashes,falls:r.falls,respawns:r.respawns,
      knockouts:r.knockouts,lapTimes:r.lapTimes.slice()})),
    events:m.events.map(v=>({...v})),
    limits:{maxEvents:m.maxEvents,droppedEvents:m.overflow},
    privacy:'Local export only; no raw joystick, device identifiers or network telemetry'};
}
return {WIDTH,HEIGHT,CX,CY,COLORS,NAMES,NODES,TRACK,TRACKS,TRACK_SHAPE,WORLD_BOUNDS,MAX_RACE_SECONDS,
  COURSE_NAMES,COURSE_IDS,COLOR_WAVE_SECONDS,
  TRACK_HALF,PLAYER_RADIUS,RAMP_START,FALL_SECONDS,RESPAWN_GRACE,
  READY_SECONDS,ZONE_SECONDS,LAPS_TO_WIN,DASH_TIME,DASH_COOLDOWN,STEP,zoneAt,zoneSpeed,
  angleDelta,makeTrack,pointAt,closest,directionAt,gateCrossed,GATES,
  waveState,seededRace,
  tick,currentPosition,lapProgress,raceRanking,audit,desiredAI};
});
