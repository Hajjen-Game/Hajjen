/* CHROMA RUSH — NEON CIRCUIT 2.7: Premium Motion & Visual Cohesion
 * Auto-accelerate from GO. Thumb aim changes heading; releasing the stick
 * keeps that heading without any automatic racing-line correction. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaNeonCircuitCore=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';
const WIDTH=960,HEIGHT=540,CX=480,CY=270;
const TRACK_HALF=47,PLAYER_RADIUS=11;
const RAMP_START=TRACK_HALF-PLAYER_RADIUS-1;
const FALL_SECONDS=.72,RESPAWN_GRACE=.92;
const FALL_EDGE=TRACK_HALF+17; // Base outer ramp edge, extended in banked curves.
const IMPACT_COOLDOWN=.64,IMPACT_FRICTION=.91;
const ZONE_SECONDS=10,LAPS_TO_WIN=3,READY_SECONDS=2.4,STEP=1/60;
const MAX_RACE_SECONDS=165;
const COLOR_WAVE_SECONDS=3.15;
const WAVE_START_BACK=760,WAVE_FRONT_TRAVEL=4550;
const COLORS=['#60ecff','#ff71ac','#ffe26a','#9f8aff'];
const NAMES=['YOU','NOVA','VOLT','HEX'];
const DASH_TIME=.34,DASH_COOLDOWN=5.4;
// 2.0 is no longer squeezed into a 960×540 arena.
// Only a small fraction of this multi-screen world is visible at once.
const TRACK_SHAPE=Object.freeze({left:240,right:2260,top:185,bottom:1300,radius:160});
const COURSE_PROFILES=Object.freeze([
  {id:'spectral-highway',name:'SPECTRAL GP',cornerCut:128,
    // Deliberately authored GP rhythm: long straights, outer hairpins, then
    // one technical infield chicane. Circular fillets, not Bézier wobble.
    waypoints:[
      [620,260],[1580,260],[2100,330],[2340,650],
      [2130,1010],[1810,1080],[1480,790],
      [1170,840],[900,1190],[510,1260],
      [250,930],[320,570]
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
const zoneSpeed=z=>Math.min(300,191+15.5*Math.max(0,z));
const AI_STYLES=Object.freeze([
  null,
  Object.freeze({name:'precision',attackCooldown:8.0,attackWindow:1.10,
    targetLead:.19,attackRange:104,tempo:1.012,turnLead:110,brakeCurve:.52}),
  Object.freeze({name:'aggressive',attackCooldown:3.45,attackWindow:1.72,
    targetLead:.18,attackRange:156,tempo:1.028,turnLead:82,brakeCurve:.75}),
  Object.freeze({name:'opportunist',attackCooldown:6.15,attackWindow:1.32,
    targetLead:.24,attackRange:108,tempo:1.005,turnLead:96,brakeCurve:.65})
]);
const rand=seed=>{let n=(seed>>>0)||0x6e624eb7;
  return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296};
};
function makeTrack(shape=TRACK_SHAPE,steps=20,variant=0){
  const index=mod(Math.floor(variant),COURSE_PROFILES.length);
  const profile=COURSE_PROFILES[index],vertices=profile.waypoints;
  const n=vertices.length,spacing=Math.max(4,Math.min(8,steps*.35));
  const corners=[];
  for(let i=0;i<n;i++){
    const prev=vertices[(i+n-1)%n],v=vertices[i],next=vertices[(i+1)%n];
    const di=[v[0]-prev[0],v[1]-prev[1]];
    const dout=[next[0]-v[0],next[1]-v[1]];
    const li=hypot(...di),lo=hypot(...dout);
    if(li<85||lo<85)throw Error('World circuit segment too short');
    const ui=[di[0]/li,di[1]/li],uo=[dout[0]/lo,dout[1]/lo];
    const turn=Math.atan2(ui[0]*uo[1]-ui[1]*uo[0],
      ui[0]*uo[0]+ui[1]*uo[1]);
    if(Math.abs(turn)>.01){
      const cut=Math.min(profile.cornerCut,li*.30,lo*.30);
      const radius=cut/Math.tan(Math.abs(turn)/2),sign=Math.sign(turn);
      const entry={x:v[0]-ui[0]*cut,y:v[1]-ui[1]*cut};
      const exit={x:v[0]+uo[0]*cut,y:v[1]+uo[1]*cut};
      const cx=entry.x-ui[1]*sign*radius;
      const cy=entry.y+ui[0]*sign*radius;
      corners.push({entry,exit,cx,cy,radius,turn,
        startAngle:Math.atan2(entry.y-cy,entry.x-cx),sign});
    }else corners.push({entry:{x:v[0],y:v[1]},
      exit:{x:v[0],y:v[1]},radius:Infinity,turn:0,sign:0});
  }
  const samples=[],parts=[];
  const push=(x,y)=>{
    const last=samples[samples.length-1];
    if(last&&hypot(last.x-x,last.y-y)<1e-7)return;
    samples.push({x,y});
  };
  push(corners[0].exit.x,corners[0].exit.y);
  for(let i=0;i<n;i++){
    const j=(i+1)%n,from=corners[i].exit,to=corners[j].entry;
    const lineLength=hypot(to.x-from.x,to.y-from.y);
    let start=samples.length-1;
    const straightSteps=Math.max(2,Math.ceil(lineLength/spacing));
    for(let k=1;k<=straightSteps;k++){
      const t=k/straightSteps;push(from.x+(to.x-from.x)*t,
        from.y+(to.y-from.y)*t);
    }
    parts.push({kind:'straight',i0:start,i1:samples.length-1,
      length:lineLength,curvature:0});
    start=samples.length-1;
    const c=corners[j];
    if(c.sign){
      const count=Math.max(8,Math.ceil(c.radius*Math.abs(c.turn)/spacing));
      for(let k=1;k<=count;k++){
        const angle=c.startAngle+c.turn*k/count;
        push(c.cx+Math.cos(angle)*c.radius,
          c.cy+Math.sin(angle)*c.radius);
      }
      parts.push({kind:'arc',i0:start,i1:samples.length-1,
        radius:c.radius,turn:c.turn,sign:c.sign,
        cx:c.cx,cy:c.cy,
        length:c.radius*Math.abs(c.turn),curvature:c.sign/c.radius});
    }
  }
  const first=samples[0],last=samples[samples.length-1];
  if(hypot(first.x-last.x,first.y-last.y)>.001)
    throw Error('circular GP course does not close');
  samples[samples.length-1]={x:first.x,y:first.y};
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
  const sections=parts.map(part=>({...part,
    start:samples[part.i0].s,end:samples[part.i1].s}));
  // Three boost lanes on the three longest STRAIGHT sections; never inside
  // a turn. Choose offsets to make overtaking a deliberate route decision.
  const candidates=sections.filter(p=>p.kind==='straight'&&p.length>185)
    .sort((a,b)=>b.length-a.length).slice(0,3)
    .sort((a,b)=>a.start-b.start);
  const boosts=candidates.map((part,id)=>({
    id,s:part.start+part.length*.57,halfLength:38,
    lane:[-16,15,0][id],halfWidth:14,
    duration:1.24,factor:1.34,section:'straight'
  }));
  return {samples,length:total,half:TRACK_HALF,
    sections,boosts,pointCount:samples.length,shape:{...shape},
    variant:index,courseId:profile.id,name:profile.name,bounds,
    coverage:{width:(bounds.maxX-bounds.minX+2*TRACK_HALF)/WIDTH,
      height:(bounds.maxY-bounds.minY+2*TRACK_HALF)/HEIGHT},
    layout:'multi-screen-world-track',
    segmentKinds:['straight','constant-radius-arc','banked-hairpin']};
}
function bankingAt(s,track=TRACK){
  const distance=mod(s,track.length);
  const part=track.sections.find(p=>p.start<=distance&&p.end>=distance);
  if(!part||part.kind!=='arc')return {bank:0,sign:0,radius:Infinity};
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
  const fade=smooth(Math.min(distance-part.start,part.end-distance)/43);
  return {bank:fade*clamp(315/part.radius,.4,1),
    sign:part.sign,radius:part.radius};
}
function edgeAt(s,side=1,track=TRACK){
  const bank=bankingAt(s,track),outer=bank.sign*side<0;
  const extra=(outer?12:3)*bank.bank;
  return {limit:FALL_EDGE+extra,bank:bank.bank,outer,
    sign:bank.sign,radius:bank.radius};
}
const TRACKS=COURSE_PROFILES.map((_,index)=>makeTrack(TRACK_SHAPE,20,index));
const TRACK=TRACKS[0];
const SPATIAL_CELL=144;
for(const track of TRACKS){
  const grid=new Map(),list=track.samples;
  for(let i=0;i<list.length-1;i++){
    const a=list[i],b=list[i+1],pad=80;
    const minX=Math.floor((Math.min(a.x,b.x)-pad)/SPATIAL_CELL);
    const maxX=Math.floor((Math.max(a.x,b.x)+pad)/SPATIAL_CELL);
    const minY=Math.floor((Math.min(a.y,b.y)-pad)/SPATIAL_CELL);
    const maxY=Math.floor((Math.max(a.y,b.y)+pad)/SPATIAL_CELL);
    for(let cx=minX;cx<=maxX;cx++)for(let cy=minY;cy<=maxY;cy++){
      const key=cx+','+cy;
      if(!grid.has(key))grid.set(key,[]);
      grid.get(key).push(i);
    }
  }
  track.spatialCell=SPATIAL_CELL;
  track.spatialBuckets=grid;
}

 // Cache static bank rim geometry at boot; only tile painting reuses it.
for(const track of TRACKS){
  track.rimSamples=[];
  for(let distance=0;distance<track.length;distance+=10){
    const p=pointAt(distance,track);
    const sample={s:distance,x:p.x,y:p.y};
    for(const side of [-1,1]){
      const edge=edgeAt(distance,side,track),inner=TRACK_HALF+4;
      sample[side<0?'left':'right']={
        ix:p.x+p.nx*inner*side,iy:p.y+p.ny*inner*side,
        ox:p.x+p.nx*(edge.limit-3)*side,
        oy:p.y+p.ny*(edge.limit-3)*side
      };
    }
    track.rimSamples.push(sample);
  }
}

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
// Local spatial lookup replaces ~750 segment scans every time an AI plans,
// the camera draws a bank tilt, or a collision tests the road edge.
// Off-track/teleport positions explicitly fall back to the exact full scan.
function closest(x,y,track=TRACK){
  const list=track.samples,cell=track.spatialCell||144;
  const buckets=track.spatialBuckets;
  const key=Math.floor(x/cell)+','+Math.floor(y/cell);
  const candidates=buckets?buckets.get(key):null;
  let best=Infinity,result=null;
  function inspect(i){
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
  if(candidates&&candidates.length){
    for(const i of candidates)inspect(i);
  }
  // Exact behavior outside the near-road band and at an empty grid cell.
  if(best>80*80){
    best=Infinity;result=null;
    for(let i=0;i<list.length-1;i++)inspect(i);
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
      dashes:0,dashHits:0,dashTime:0,dashCooldown:0,brakeSeconds:0,
      lineSeconds:0,flow:0,bestFlow:0,edgeCooldown:0,
      aiLane:id===0?lane[id]:lane[id]+(random()-.5)*9,
      aiTempo:id===0?1:AI_STYLES[id].tempo+(random()-.5)*.035,
      aiStyle:id===0?'player':AI_STYLES[id].name,
      aiDefenses:0,aiDefendTime:0,aiDefenseCooldown:id*.37,
      contactFlash:0,gatePasses:0,lastGateTime:null,impactCooldown:0,impulseX:0,impulseY:0,
      knockSeconds:0,falls:0,knockouts:0,fallTimer:0,
      respawns:0,invulnerable:0,lastAttacker:null,lastImpactAt:-100,
      unsafeImpact:false,vx:0,vy:0,fallVX:0,fallVY:0,fallAnchorX:0,
      fallAnchorY:0,edgeExposure:0,driveSeconds:0,neutralSteerSeconds:0,
      braking:false,
      aiAttackTarget:null,aiAttackTime:0,aiAttackCooldown:id*.28,
      aiAttacks:0,aiHits:0,
      bankRides:0,bankSaves:0,bankHeight:0,boosts:0,
      boostTime:0,boostFactor:1,boostPadId:-1,boostNextAt:0,
      speedSamples:0,speedAccum:0,boostPeak:0};
  });
  const race={seed,random,racers,track,gates,courseIndex,
    ready:READY_SECONDS,elapsed:0,
    zone:0,tide:0,waveStartS:0,waveStartPlayerS:0,phase:'ready',finished:false,finishPlace:null,
    winner:null,announcement:'READY',announcementTime:0,
    events:[],overflow:0,maxEvents:450,
    impacts:[],spectacles:[],contactPairs:{},performance:{
      frames:0,slow50:0,worstFrameMs:0,renderMaxMs:0},
    quality:'auto'};
  log(race,'race_start',{mode:'neon-circuit-2.7',laps:LAPS_TO_WIN,
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
        const finishing=p.laps>=LAPS_TO_WIN;
        m.spectacles.push({kind:finishing?'finish':'lap',
          x:p.x,y:p.y,angle:p.angle,color:p.color,
          owner:p.id,life:finishing?.92:.70,duration:finishing?.92:.70});
        if(m.spectacles.length>12)m.spectacles.shift();
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
function desiredAI(m,p,dt=STEP){
  const style=AI_STYLES[p.id],current=closest(p.x,p.y,m.track);
  const s=current.s,look=clamp(p.speed*.52,63,style.turnLead);
  const near=pointAt(s+28,m.track),future=pointAt(s+120,m.track);
  const curve=Math.abs(angleDelta(near.angle,future.angle));
  p.aiAttackCooldown=Math.max(0,p.aiAttackCooldown-dt);
  p.aiAttackTime=Math.max(0,p.aiAttackTime-dt);
  p.aiDefenseCooldown=Math.max(0,p.aiDefenseCooldown-dt);
  p.aiDefendTime=Math.max(0,p.aiDefendTime-dt);
  const opponents=m.racers.filter(v=>v!==p&&!v.finished&&
    v.fallTimer<=0&&v.invulnerable<=0);
  const threats=opponents.map(v=>({
    racer:v,dist:hypot(v.x-p.x,v.y-p.y),gap:v.progress-p.progress
  })).filter(t=>t.dist<95&&t.gap<22&&t.gap>-100)
    .sort((a,b)=>a.dist-b.dist);
  // A defender yields or blocks laterally; no artificial speed advantage.
  const threat=threats.find(t=>t.racer.dashTime>0||
    (p.id!==2&&(t.racer.aiAttackTarget===p.id||t.dist<29)));
  if(threat&&p.aiDefendTime<=0&&p.aiDefenseCooldown<=0&&
     current.dist<26&&p.speed>85){
    p.aiDefendTime=p.id===3?.34:.47;
    p.aiDefenseCooldown=2.35+(p.id===3?1.15:p.id===1?.4:0);
    p.aiDefenses++;
    log(m,'ai_defend',{player:p.id,against:threat.racer.id,
      style:style.name});
  }
  let target=p.aiAttackTarget===null?null:m.racers[p.aiAttackTarget];
  if(!target||target.finished||target.fallTimer>0||target.invulnerable>0||
     hypot(target.x-p.x,target.y-p.y)>180||current.dist>32||
     p.aiAttackTime<=0||p.aiDefendTime>0){
    target=null;p.aiAttackTarget=null;p.aiAttackTime=0;
  }
  if(!target&&p.aiAttackCooldown<=0&&p.speed>115&&
     current.dist<25&&p.aiDefendTime<=0){
    const options=opponents.map(v=>{
      const gap=v.progress-p.progress,dist=hypot(v.x-p.x,v.y-p.y);
      const edge=closest(v.x,v.y,m.track).dist;
      const vulnerability=edge>24?35:0;
      return {v,dist,gap,eligible:gap>-28&&gap<style.attackRange&&
        dist<style.attackRange&&
        (p.id!==3||edge>18||dist<30),
        score:-dist*.44+clamp(gap,0,60)*.12+
         (p.id===3?vulnerability*2:p.id===2?20:-12)};
    }).filter(v=>v.eligible).sort((a,b)=>b.score-a.score);
    if(options.length){
      target=options[0].v;p.aiAttackTarget=target.id;
      p.aiAttackTime=style.attackWindow;
      p.aiAttackCooldown=style.attackCooldown;
      p.aiAttacks++;
      log(m,'ai_attack',{attacker:p.id,target:target.id,
        gap:Math.round(options[0].gap),style:style.name});
    }
  }
  if(target){
    const tx=target.x+target.vx*style.targetLead;
    const ty=target.y+target.vy*style.targetLead;
    return {angle:Math.atan2(ty-p.y,tx-p.x),brake:false,
      line:s,curvature:curve,attacking:true,target:target.id};
  }
  const ahead=pointAt(s+look,m.track);
  let lane=(p.id===1?0:p.aiLane)*
    (.72+.06*Math.sin(m.elapsed*.65+p.id));
  const lap=Math.max(0,Math.floor(p.progress/m.track.length));
  const boost=m.track.boosts.find(pad=>{
    const distance=mod(pad.s-s,m.track.length);
    const choice=p.id===1?3:p.id===2?2:3;
    return distance>0&&distance<160&&
      (pad.id+p.id+lap)%choice===0;
  });
  if(boost&&p.aiDefendTime<=0)lane=boost.lane;
  if(p.aiDefendTime>0&&threat){
    const threatRoad=closest(threat.racer.x,threat.racer.y,m.track);
    lane=clamp(threatRoad.side>=current.side?
      current.side-12:current.side+12,-19,19);
  }
  return {angle:Math.atan2(ahead.y+ahead.ny*lane-p.y,
      ahead.x+ahead.nx*lane-p.x),
    brake:curve>style.brakeCurve&&p.speed>185,
    line:s,curvature:curve,attacking:false,target:null};
}
function fallOff(m,p){
  if(p.fallTimer>0||p.finished||p.invulnerable>0)return;
  p.fallVX=p.vx*.44+p.impulseX*.62;
  p.fallVY=p.vy*.44+p.impulseY*.62;
  p.fallAnchorX=p.x;p.fallAnchorY=p.y;
  p.falls++;p.fallTimer=FALL_SECONDS;
  m.spectacles.push({kind:'eject',x:p.x,y:p.y,angle:p.angle,
    color:p.color,life:.68,duration:.68,owner:p.id});
  if(m.spectacles.length>12)m.spectacles.shift();
  p.speed=0;p.dashTime=0;p.impulseX=0;p.impulseY=0;
  p.knockSeconds=0;p.contactFlash=0;p.unsafeImpact=false;
  p.edgeExposure=0;
  const attacker=m.elapsed-(p.lastImpactAt||-100)<1.7?
    p.lastAttacker:null;
  if(Number.isInteger(attacker)&&attacker!==p.id&&m.racers[attacker])
    m.racers[attacker].knockouts++;
  log(m,'fall',{player:p.id,attacker:attacker??null,
    lap:p.laps+1,progress:+p.progress.toFixed(1)});
  if(p.id===0){
    m.announcement='FALL · RESPAWNING';
    m.announcementTime=m.elapsed+.95;
  }else if(attacker===0){
    // Recognize a skillful shove immediately, before the next zone banner.
    m.announcement='RIVAL EJECTED · '+p.name;
    m.announcementTime=m.elapsed+1.2;
  }
}
function respawn(m,p){
  // The racing clock never resets. The cube appears safely near its last
  // validated position. A small setback costs time, not a whole lap.
  const target=pointAt(p.progress-27,m.track),offset=p.id%2?6:-6;
  p.x=target.x+target.nx*offset;
  p.y=target.y+target.ny*offset;
  p.angle=target.angle;
  p.speed=p.id===0?0:zoneSpeed(m.zone)*.52;
  p.vx=Math.cos(p.angle)*p.speed;p.vy=Math.sin(p.angle)*p.speed;
  p.impulseX=0;p.impulseY=0;p.knockSeconds=0;p.lastAttacker=null;
  p.impactCooldown=.55;p.edgeCooldown=.45;
  p.aiAttackTime=0;p.aiAttackTarget=null;p.aiAttackCooldown=2.3;
  p.invulnerable=RESPAWN_GRACE;
  p.edgeExposure=0;p.fallVX=0;p.fallVY=0;p.lastImpactAt=-100;
  p.bankHeight=0;p.boostTime=0;p.boostFactor=1;p.braking=false;
  p.aiDefendTime=0;p.aiDefenseCooldown=1.1;
  p.respawns++;
  m.spectacles.push({kind:'respawn',x:p.x,y:p.y,
    angle:p.angle,color:p.color,owner:p.id,life:.66,duration:.66});
  if(m.spectacles.length>12)m.spectacles.shift();
  log(m,'respawn',{player:p.id,lap:p.laps+1,
    grace:RESPAWN_GRACE,setback:27});
}
function moveRacer(m,p,input,dt){
  if(p.finished)return;
  if(p.fallTimer>0){
    p.fallTimer=Math.max(0,p.fallTimer-dt);
    p.x+=p.fallVX*dt*.62;p.y+=p.fallVY*dt*.62;
    p.fallVX*=Math.exp(-dt*2.7);p.fallVY*=Math.exp(-dt*2.7);
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
  p.boostTime=Math.max(0,p.boostTime-dt);
  if(p.boostTime<=0)p.boostFactor=1;
  let brake=false,desired=p.angle,steering=true;
   const now=closest(p.x,p.y,m.track);
   if(p.id===0){
     brake=!!input.brake;
     const x=Number.isFinite(input.x)?input.x:0;
     const y=Number.isFinite(input.y)?input.y:0;
     const mag=clamp(hypot(x,y),0,1);
     steering=mag>.15;
     // Full auto-throttle: the stick only determines steering direction.
     // Centering it preserves the last heading and never follows the road.
     if(steering){
       desired=Math.atan2(y,x);
       // Only a last-resort rim correction. Normal racing is manual.
       const edge=clamp((now.dist-(RAMP_START-8))/8,0,1);
       if(edge>0){
         const guide=pointAt(now.s+48,m.track);
         const escape=Math.atan2(guide.y-p.y,guide.x-p.x);
         desired+=angleDelta(desired,escape)*(.22*edge);
       }
     }else p.neutralSteerSeconds+=dt;
     // Dash does not require the stick to be held, but needs real speed.
     if(input.dash&&p.speed>=45&&p.dashCooldown<=0){
       p.dashTime=DASH_TIME;p.dashCooldown=DASH_COOLDOWN;p.dashes++;
       log(m,'dash',{player:p.id,lap:p.laps+1});
     }
   }else{
     const ai=desiredAI(m,p,dt);
     desired=ai.angle;brake=ai.brake;
   }
   const turnSpeed=brake?5.85:4.35;
   if(steering)
     p.angle+=clamp(angleDelta(p.angle,desired),-turnSpeed*dt,turnSpeed*dt);
   p.braking=brake;
   if(brake)p.brakeSeconds+=dt;
   const base=zoneSpeed(m.zone);
   const aiSpeed=p.aiTempo;
   const dashFactor=Math.min(1.77,(p.dashTime>0?1.47:1)*
     (p.boostTime>0?p.boostFactor:1));
   const flowFactor=p.id===0?1+.075*p.flow:1;
   const target=base*aiSpeed*(brake?.76:1)*dashFactor*flowFactor;
   // Both neutral and directed stick auto-accelerate; only BRAKE slows.
   const decel=brake?400:215;
   const accel=p.boostTime>0?390:265;
   p.speed+=clamp(target-p.speed,-decel*dt,accel*dt);
   if(p.speed<.5)p.speed=0;
   if(p.id===0)p.driveSeconds+=dt;
  // Rolling momentum: changing heading does not instantly redirect movement.
  // Brake tightens the turn. Keep a quicker response for the track AI.
  if(p.speed>40&&p.vx===0&&p.vy===0){
    p.vx=Math.cos(p.angle)*p.speed;p.vy=Math.sin(p.angle)*p.speed;
  }
  const targetVX=Math.cos(p.angle)*p.speed;
  const targetVY=Math.sin(p.angle)*p.speed;
  const blend=1-Math.exp(-(p.id===0?(brake?15:8.5):16)*dt);
  p.vx+=(targetVX-p.vx)*blend;p.vy+=(targetVY-p.vy)*blend;
  const proposed={x:p.x+(p.vx+p.impulseX)*dt,
    y:p.y+(p.vy+p.impulseY)*dt};
  // Keep the knock momentum alive for ~200ms, producing visibly larger
  // collisions and allowing a strong impact to carry racers over the lip.
  p.impulseX*=Math.pow(IMPACT_FRICTION,dt*60);
  p.impulseY*=Math.pow(IMPACT_FRICTION,dt*60);
  let nearest=closest(proposed.x,proposed.y,m.track);
  const limit=RAMP_START,side=nearest.side>=0?1:-1;
  const bank=edgeAt(nearest.s,side,m.track);
  const rampT=clamp((nearest.dist-limit)/(bank.limit-limit),0,1);
  if(nearest.dist>limit){
    // The cambered shoulder is a climb, NOT an instant fall trigger.
    // An inward counterforce resists minor drift; a large shove can still
    // overcome the bank and clear its physical lip.
    p.edgeExposure+=dt;
    p.bankRides+=dt;
    const inward=-side*(300+600*rampT+350*bank.bank);
    p.vx+=nearest.nx*inward*dt;
    p.vy+=nearest.ny*inward*dt;
    p.speed*=Math.max(.96,1-(.60+.6*rampT)*dt);
    p.bankHeight=clamp(rampT*(.32+.68*bank.bank),0,1);
    if(nearest.dist>=bank.limit&&p.invulnerable<=0){
      p.x=proposed.x;p.y=proposed.y;
      fallOff(m,p);return;
    }
    if(p.edgeCooldown<=0){
      p.edgeHits++;p.contactFlash=.16;p.edgeCooldown=.48;
      log(m,'edge_scrape',{player:p.id,lap:p.laps+1,zone:m.zone+1,
        speed:Math.round(p.speed),ramp:+rampT.toFixed(2),
        banked:bank.outer&&bank.bank>.2});
    }
  }else{
    if(p.edgeExposure>.1)p.bankSaves++;
    p.edgeExposure=0;
    p.bankHeight=Math.max(0,p.bankHeight-4*dt);
  }
  const previous={x:p.x,y:p.y};
  p.x=proposed.x;p.y=proposed.y;
  updateProgress(m,p,previous,nearest,dt);
  if(p.speed>25&&m.elapsed>=p.boostNextAt&&
     p.fallTimer<=0&&p.invulnerable<=0){
    const along=nearest.s;
    for(const pad of m.track.boosts){
      const delta=mod(along-pad.s+m.track.length/2,
        m.track.length)-m.track.length/2;
      if(Math.abs(delta)>pad.halfLength)continue;
      if(Math.abs(nearest.side-pad.lane)>pad.halfWidth)continue;
      p.boosts++;p.boostPadId=pad.id;p.boostNextAt=m.elapsed+2;
      p.boostTime=pad.duration;p.boostFactor=pad.factor;
      const surface=pointAt(pad.s,m.track);
      m.spectacles.push({kind:'boost',
        x:surface.x+surface.nx*pad.lane,
        y:surface.y+surface.ny*pad.lane,
        angle:surface.angle,color:p.color,life:.65,duration:.65,
        owner:p.id});
      if(m.spectacles.length>12)m.spectacles.shift();
      // Immediate burst ensures the pad feels rewarding even if the
      // player is already at full speed; dash stacks, but is not required.
      const impulse=Math.min(66,zoneSpeed(m.zone)*.29);
      p.speed+=impulse;
      p.vx+=Math.cos(p.angle)*impulse*.60;
      p.vy+=Math.sin(p.angle)*impulse*.60;
      p.boostPeak=Math.max(p.boostPeak,p.speed);
      p.contactFlash=.18;
      log(m,'boost',{player:p.id,pad:pad.id,lap:p.laps+1,
        speed:Math.round(p.speed),factor:pad.factor});
      if(p.id===0){
        m.announcement='BOOST · SPEED UP';
        m.announcementTime=m.elapsed+.58;
      }
      break;
    }
  }
  if(p.boostTime>0)p.boostPeak=Math.max(p.boostPeak,p.speed);
  if(p.id===0){
    p.speedSamples++;p.speedAccum+=p.speed;
    if(p.speed>45&&nearest.dist<24&&!brake){
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
      const aVX=a.vx+a.impulseX;
      const aVY=a.vy+a.impulseY;
      const bVX=b.vx+b.impulseX;
      const bVY=b.vy+b.impulseY;
      const closing=Math.max(0,(aVX-bVX)*nx+(aVY-bVY)*ny);
      const dashA=a.dashTime>0,dashB=b.dashTime>0;
      const key=i+'-'+j;
      const last=m.contactPairs[key]??-100;
      // Any true high-speed contact is meaningful. Slow side-by-side
      // brushing still separates shapes without fake impact spam.
      if(m.elapsed-last>=IMPACT_COOLDOWN &&
          (closing>19||dashA||dashB)){
        m.contactPairs[key]=m.elapsed;
        // Forward momentum transfers mainly to the OTHER racer.
        const intendedA=a.aiAttackTarget===b.id&&a.aiAttackTime>0;
        const intendedB=b.aiAttackTarget===a.id&&b.aiAttackTime>0;
        const charged=intendedA||intendedB;
        const force=clamp(260+closing*1.55+
          (dashA||dashB?155:0)+(charged?90:0),260,720);
        const aApproach=Math.max(0,aVX*nx+aVY*ny);
        const bApproach=Math.max(0,-bVX*nx-bVY*ny);
        const aAttacks=(dashA&&!dashB)||(intendedA&&!intendedB)||
          (!dashB&&!intendedB&&aApproach>bApproach+15);
        const bAttacks=(dashB&&!dashA)||(intendedB&&!intendedA)||
          (!dashA&&!intendedA&&bApproach>aApproach+15);
        const weightA=aAttacks?.22:bAttacks?1.24:.78;
        const weightB=bAttacks?.22:aAttacks?1.24:.78;
        a.impulseX-=nx*force*weightA;
        a.impulseY-=ny*force*weightA;
        b.impulseX+=nx*force*weightB;
        b.impulseY+=ny*force*weightB;
        a.knockSeconds=.36;b.knockSeconds=.36;
        a.unsafeImpact=true;b.unsafeImpact=true;
        a.lastAttacker=aAttacks?null:b.id;
        b.lastAttacker=bAttacks?null:a.id;
        a.lastImpactAt=m.elapsed;b.lastImpactAt=m.elapsed;
        a.speed*=aAttacks?.94:dashA?.90:.77;
        b.speed*=bAttacks?.94:dashB?.90:.77;
        a.contacts++;b.contacts++;
        if(dashA&&aAttacks){
          a.dashHits++;
          if(a.id===0){
            m.announcement='DIRECT HIT · '+b.name;
            m.announcementTime=m.elapsed+.66;
          }
        }
        if(dashB&&bAttacks){
          b.dashHits++;
          if(b.id===0){
            m.announcement='DIRECT HIT · '+a.name;
            m.announcementTime=m.elapsed+.66;
          }
        }
        if(intendedA){a.aiHits++;a.aiAttackTime=0;a.aiAttackTarget=null;}
        if(intendedB){b.aiHits++;b.aiAttackTime=0;b.aiAttackTarget=null;}
        a.contactFlash=.24;b.contactFlash=.24;
        m.impacts.push({x:(a.x+b.x)/2,y:(a.y+b.y)/2,
          nx,ny,life:.32,colorA:a.color,colorB:b.color,
          strength:force,charged:dashA||dashB,lifeMax:.32});
        if(m.impacts.length>10)m.impacts.shift();
        log(m,'impact',{a:a.id,b:b.id,force:Math.round(force),
          dash:dashA||dashB,closing:Math.round(closing),
          intended:charged,dominant:aAttacks?a.id:bAttacks?b.id:null});
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
    m.waveStartPlayerS=closest(m.racers[0].x,m.racers[0].y,m.track).s;
    m.waveStartS=mod(m.waveStartPlayerS-WAVE_START_BACK,m.track.length);
    m.announcement='ZONE '+String(m.zone+1).padStart(2,'0')+' · SPEED UP';
    m.announcementTime=m.elapsed+1.2;
    log(m,'zone',{zone:m.zone+1,speed:zoneSpeed(m.zone),
      waveStart:+m.waveStartS.toFixed(1),
      waveDirection:'forward',waveScope:'track-only',
      waveSeconds:COLOR_WAVE_SECONDS,behind:WAVE_START_BACK,
      style:'spectral-feather-prismatic-front'});
  }
  m.tide=Math.max(0,m.tide-step);
  for(const p of m.racers)moveRacer(m,p,input,step);
  bumpRacers(m);
  for(const v of m.impacts)v.life-=step;
  m.impacts=m.impacts.filter(v=>v.life>0);
  for(const fx of m.spectacles)fx.life-=step;
  m.spectacles=m.spectacles.filter(fx=>fx.life>0);
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
    reach:WAVE_FRONT_TRAVEL*progress,
    behind:WAVE_START_BACK,playerStart:m.waveStartPlayerS,
    feather:76,style:'spectral-feather-prismatic-front',
    frontS:mod(start+WAVE_FRONT_TRAVEL*progress,m.track.length),
    active:m.zone>0&&m.tide>0,
    direction:'forward',scope:'track-only'};
}
function audit(m){
  const p=m.racers[0];
  return {schema:'neon-circuit-run-audit/2.7',build:'neon-circuit-2.7',
    seed:m.seed,status:m.finished?'completed':'in_progress',
    courseId:m.track.courseId,courseName:m.track.name,
    trackLength:+m.track.length.toFixed(1),
    summary:{durationSeconds:+m.elapsed.toFixed(3),highestZone:m.zone+1,
      lapValidation:'four-ordered-physical-gates',
      waveMode:'spectral-feather-offscreen-origin',
      cameraMode:'close-follow-damped-zoom',worldTrack:true,
      edgeMode:'physical-cambered-bank-and-recoverable-ramp',
      trackArchitecture:'tangent-circular-arcs-straights',
      boostPads:m.track.boosts.length,
       controlMode:'auto-throttle-manual-steering',
      rivalStyles:m.racers.slice(1).map(p=>p.aiStyle),
      spectacleMode:'premium-motion-impact-lap-2.7',
      waveTransitions:m.events.filter(e=>e.type==='zone').length,
      finishPlace:m.finishPlace,lapsCompleted:p.laps,
      lapFraction:+lapProgress(p,m.track).fraction.toFixed(3),
      lapTimes:p.lapTimes.slice(),speed:Math.round(p.speed),
      edgeHits:p.edgeHits,contacts:p.contacts,dashes:p.dashes,
      falls:p.falls,respawns:p.respawns,knockouts:p.knockouts,
      boosts:p.boosts,dashHits:p.dashHits,boostPeak:Math.round(p.boostPeak),
      averageSpeed:Math.round(p.speedAccum/Math.max(1,p.speedSamples)),
      bankRides:+p.bankRides.toFixed(2),
      bankSaves:p.bankSaves,
      aiAttacks:m.racers.reduce((n,r)=>n+r.aiAttacks,0),
      aiHits:m.racers.reduce((n,r)=>n+r.aiHits,0),
      aiAIContacts:m.events.filter(e=>e.type==='impact'&&e.a>0&&e.b>0).length,
      brakeSeconds:+p.brakeSeconds.toFixed(2),
       driveSeconds:+p.driveSeconds.toFixed(2),
       neutralSteerSeconds:+p.neutralSteerSeconds.toFixed(2),
      lineSeconds:+p.lineSeconds.toFixed(2),bestFlow:+p.bestFlow.toFixed(3),
      finishCompleted:p.finished,performance:{...m.performance}},
    racers:m.racers.map(r=>({
      id:r.id,finished:r.finished,laps:r.laps,
      gatePasses:r.gatePasses,
      finishTime:r.finishTime,edgeHits:r.edgeHits,contacts:r.contacts,
      dashes:r.dashes,dashHits:r.dashHits,falls:r.falls,respawns:r.respawns,
      knockouts:r.knockouts,aiAttacks:r.aiAttacks,aiHits:r.aiHits,
      boosts:r.boosts,bankSaves:r.bankSaves,
      aiStyle:r.aiStyle,aiDefenses:r.aiDefenses,
      lapTimes:r.lapTimes.slice()})),
    events:m.events.map(v=>({...v})),
    limits:{maxEvents:m.maxEvents,droppedEvents:m.overflow},
    privacy:'Local export only; no raw joystick, device identifiers or network telemetry'};
}
return {WIDTH,HEIGHT,CX,CY,COLORS,NAMES,NODES,TRACK,TRACKS,TRACK_SHAPE,WORLD_BOUNDS,MAX_RACE_SECONDS,
  COURSE_NAMES,COURSE_IDS,COLOR_WAVE_SECONDS,WAVE_START_BACK,WAVE_FRONT_TRAVEL,
  TRACK_HALF,PLAYER_RADIUS,RAMP_START,FALL_EDGE,FALL_SECONDS,RESPAWN_GRACE,
  READY_SECONDS,ZONE_SECONDS,LAPS_TO_WIN,DASH_TIME,DASH_COOLDOWN,STEP,zoneAt,zoneSpeed,
  AI_STYLES,
  angleDelta,makeTrack,pointAt,closest,directionAt,gateCrossed,GATES,
  bankingAt,edgeAt,
  waveState,seededRace,
  tick,currentPosition,lapProgress,raceRanking,audit,desiredAI};
});
