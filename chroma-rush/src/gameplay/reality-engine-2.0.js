/* CHROMA RUSH — Reality Engine 2.0 / Gameplay First.
 * Physically distinct route choice with a real elevated track, 3-stage
 * Sentinel combat whose attack colliders can be avoided with Jump/Duck,
 * and independently stored fixed-course records. No Arcade changes.
 */
(function(root,factory){
  const config=typeof module!=='undefined'&&module.exports?
    require('../core/config.js'):(root&&root.ChromaConfig);
  const api=factory(config?.GAME);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaReality=api;
})(typeof window!=='undefined'?window:null,function(GAME){
  'use strict';
  const ID='REALITY-002',DURATION=90,COURSE_REVISION=2,KEY='chromaRushRealityV2';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const smooth=n=>{const t=clamp(n,0,1);return t*t*(3-2*t)};
  // The CHOICE is a regular Jump on a clear runway. No third button.
  // Selecting high genuinely replaces the future collidable terrain.
  const BRANCH=Object.freeze({
    choiceStart:30.0,choiceEnd:33.0,
    start:34.0,crest:37.6,descent:47.4,end:51.0,
    rise:170
  });
  const COMMON=Object.freeze([
    Object.freeze({start:4.2,cadence:1.36,actions:'JDJJDJD'}),
    Object.freeze({start:14.6,cadence:1.34,actions:'JJDDJJ'}),
    Object.freeze({start:25.9,cadence:1.33,actions:'DJJ'}),
    Object.freeze({start:52.5,cadence:1.55,actions:'JDJ'})
  ]);
  const ROUTES=Object.freeze({
    upper:Object.freeze({start:39.1,cadence:1.40,actions:'JDJDJJ'}),
    lower:Object.freeze({start:39.2,cadence:2.05,actions:'DJDJ'})
  });
  const GAP_TIMES=Object.freeze([23.2,58.8]);
  // Each physically authored boss barrier is emitted by the Sentinel.
  // Actual shared obstacle collision is mandatory: these aren't decorations.
  const PHASES=Object.freeze([
    Object.freeze({id:1,name:'SCAN',start:62.0,cadence:1.38,
      actions:'DDJJD',end:69.4,needed:4}),
    Object.freeze({id:2,name:'REWRITE',start:71.0,cadence:1.31,
      actions:'JJJDJ',end:78.0,needed:4}),
    Object.freeze({id:3,name:'OVERLOAD',start:80.0,cadence:1.17,
      actions:'DJDDJJD',end:88.45,needed:6})
  ]);
  const SENTINEL=Object.freeze({start:60.9,end:89.9});
  const actionsOf=(phrase,extra={})=>[...phrase.actions].map((letter,i)=>({
    time:Number((phrase.start+i*phrase.cadence).toFixed(3)),
    type:letter==='J'?'jump':'duck',...extra
  }));
  const ACTIONS=Object.freeze([
    ...COMMON.flatMap(p=>actionsOf(p)),
    ...actionsOf(ROUTES.upper,{route:'upper'}),
    ...actionsOf(ROUTES.lower,{route:'lower'}),
    ...PHASES.flatMap(p=>actionsOf(p,{bossPhase:p.id}))
  ].sort((a,b)=>a.time-b.time).map(x=>Object.freeze(x)));
  function distanceAt(){
    const dt=.025,table=[0];let speed=GAME.speedAt(0,1);
    for(let i=1;i<=Math.ceil(DURATION/dt)+2;i++){
      const next=GAME.speedAt(i*dt,1);
      table[i]=table[i-1]+(speed+next)*dt*.5;speed=next;
    }
    return time=>{
      const n=clamp(time/dt,0,table.length-2),i=Math.floor(n);
      return table[i]+(table[i+1]-table[i])*(n-i);
    };
  }
  function createPlan({playerX=340}={}){
    const at=distanceAt(),offset=Number.isFinite(playerX)?playerX:340;
    const obstacles=ACTIONS.map((a,i)=>{
      const s=GAME.speedAt(a.time,1),t=clamp((s-550)/1650,0,1);
      const width=71+15*Math.floor(smooth(t)*10+1e-9)+
        (a.bossPhase&&a.type==='duck'?18:0);
      return Object.freeze({...a,worldX:Math.round(offset+at(a.time)),
        width,height:a.type==='jump'?64+i%7:122+(i*5)%19,
        phase:a.bossPhase?'SENTINEL':'REALITY'});
    });
    const gaps=GAP_TIMES.map((time,i)=>Object.freeze({
      id:i+1,time,start:Math.round(offset+at(time)),
      width:Math.round(GAME.speedAt(time,1)*(.37+i*.02))
    }));
    const markers=Object.freeze({
      start:Math.round(offset+at(BRANCH.start)),
      crest:Math.round(offset+at(BRANCH.crest)),
      descent:Math.round(offset+at(BRANCH.descent)),
      end:Math.round(offset+at(BRANCH.end))
    });
    const finish=Math.ceil(offset+at(DURATION)+GAME.speedAt(DURATION,1)*3);
    const signature=obstacles.map(o=>[o.time,o.type,o.route||'',o.bossPhase||0,o.worldX,o.width].join(':'))
      .concat(gaps.map(g=>[g.time,g.start,g.width].join(':'))).join('|');
    return Object.freeze({id:ID,revision:COURSE_REVISION,duration:DURATION,finish,
      obstacles:Object.freeze(obstacles),gaps:Object.freeze(gaps),markers,signature});
  }
  function validatePlan(plan){
    if(!plan||plan.id!==ID||plan.revision!==COURSE_REVISION||
      plan.duration!==DURATION||plan.obstacles?.length!==ACTIONS.length||
      plan.gaps?.length!==GAP_TIMES.length||!plan.markers)return false;
    const {start,crest,descent,end}=plan.markers;
    if(!(0<start&&start<crest&&crest<descent&&descent<end&&end<plan.finish))return false;
    const flight=Math.abs(2*GAME.jumpVelocity/GAME.gravity);
    for(let i=0;i<plan.obstacles.length;i++){
      const o=plan.obstacles[i],auth=ACTIONS[i];
      if(!o||o.time!==auth.time||o.type!==auth.type||
        o.route!==auth.route||o.bossPhase!==auth.bossPhase||
        o.width<71||o.width>239||o.height<45||
        !Number.isFinite(o.worldX))return false;
    }
    // Treat the two mutually exclusive trajectories independently.
    for(const route of ['lower','upper']){
      const events=plan.obstacles.filter(o=>!o.route||o.route===route);
      for(let i=1;i<events.length;i++){
        const old=events[i-1],next=events[i];
        const commit=old.type==='jump'?flight:GAME.duckDuration+GAME.duckRecovery;
        const min=Math.max(1.04,commit+
          (old.width+36)/Math.max(300,GAME.speedAt(old.time,1))+.14);
        if(next.time-old.time+1e-6<min||
          next.worldX<=old.worldX+old.width)return false;
      }
    }
    for(let i=0;i<plan.gaps.length;i++){
      const gap=plan.gaps[i],s=GAME.speedAt(gap.time,1);
      if(gap.time!==GAP_TIMES[i]||!Number.isFinite(gap.start)||
        gap.width/s<.36||gap.width/s>.41)return false;
      for(const o of plan.obstacles){
        if(Math.abs(o.time-gap.time)<1.72)return false;
        const before=gap.start-(o.worldX+o.width),after=o.worldX-(gap.start+gap.width);
        if(before>=0&&before<s*1.05)return false;
        if(after>=0&&after<s*1.05)return false;
        if(before<0&&after<0)return false;
      }
    }
    if(plan.gaps.some(g=>g.start>=start&&g.start<end))return false;
    if(plan.obstacles.some(o=>o.time>=BRANCH.choiceStart-1.1&&o.time<BRANCH.crest))return false;
    if(plan.obstacles.some(o=>o.time>BRANCH.descent-.9&&o.time<BRANCH.end+1.1))return false;
    for(const o of plan.obstacles){
      if(o.route&&(o.worldX<crest||o.worldX>=descent))return false;
      if(o.bossPhase){
        const p=PHASES[o.bossPhase-1];
        if(!p||o.time<p.start||o.time>=p.end)return false;
      }
    }
    return true;
  }
  function installTerrain(terrain,plan,baseY=515,route='lower'){
    if(!validatePlan(plan)||!['upper','lower'].includes(route))
      throw new Error('Invalid Reality 2.0 course or route');
    const upper=route==='upper',high=baseY-BRANCH.rise;
    const {start,crest,descent,end}=plan.markers;
    const remembered=new Map((terrain.gaps||[]).map(g=>[g.id,g]));
    const segments=[],gaps=[];
    let x=0,y=baseY;
    function section(type,to,otherY=y){
      if(to<=x)throw new Error('Overlapping Reality 2.0 terrain segments');
      segments.push({type,start:x,end:to,y0:y,y1:otherY});
      x=to;y=otherY;
    }
    function gapAt(g){
      section('flat',g.start);
      const old=remembered.get(g.id);
      const seg={type:'gap',start:x,end:g.start+g.width,y0:y,y1:y,
        id:g.id,resolved:Boolean(old?.resolved),missed:Boolean(old?.missed),trial:true};
      segments.push(seg);gaps.push(seg);x=seg.end;
    }
    gapAt(plan.gaps[0]);
    section('flat',start);
    section(upper?'slope':'flat',crest,upper?high:baseY);
    section('flat',descent);
    section(upper?'slope':'flat',end,baseY);
    gapAt(plan.gaps[1]);
    section('flat',plan.finish);
    terrain.baseY=baseY;terrain.segments=segments;terrain.gaps=gaps;
    terrain.generated=plan.finish;terrain.lastGapEnd=gaps[gaps.length-1].end;
    terrain.nextId=gaps.length+1;
    return terrain;
  }
  const asInt=value=>{const n=Number(value);return Number.isFinite(n)?clamp(Math.floor(n),0,1e9):0};
  class RealityRecords{
    constructor(storage=null){
      this.storage=storage;this.data={bestScore:0,attempts:0,completions:0,lastScore:0};
      try{
        const data=JSON.parse(storage?.getItem(KEY)||'null');
        if(data&&typeof data==='object'&&!Array.isArray(data))
          for(const k of Object.keys(this.data))this.data[k]=asInt(data[k]);
      }catch(_){}
    }
    get bestScore(){return this.data.bestScore}
    finish({score=0,completed=false}={}){
      const value=asInt(score),previous=this.data.bestScore;
      this.data.attempts++;this.data.lastScore=value;
      if(completed){
        this.data.completions++;this.data.bestScore=Math.max(previous,value);
      }
      try{this.storage?.setItem(KEY,JSON.stringify(this.data))}catch(_){}
      return {completed:Boolean(completed),newBest:Boolean(completed)&&value>previous,
        bestScore:this.data.bestScore,previousBest:previous};
    }
  }
  class RealityEngine{
    constructor(){this.reset()}
    reset(){
      this.route='undecided';this.routeAt=null;this.upperChoices=0;
      this.resonance=0;this.successfulClears=0;
      this.bossHealth=3;this.bossPhase=0;this.bossAttacksCleared=0;
      this.bossHits=0;this.phaseResults=[null,null,null];this.phaseClears=[0,0,0];
      this.phaseHits=[0,0,0];this.bossDefeated=false;
      this.impactTime=-100;this.lastEvent=null;
      this.eventQueue=[];this.routeReady=false;
    }
    emit(type,details={}){this.eventQueue.push({type,...details});this.lastEvent=type}
    chooseRoute(route,{time=0,terrain=null,plan=null,grounded=false}={}){
      if(this.route!=='undecided'||!terrain||!plan)return false;
      if(time<BRANCH.choiceStart||time>BRANCH.choiceEnd)return false;
      if(route==='upper'&&!grounded)return false;
      if(route!=='lower'&&route!=='upper')return false;
      installTerrain(terrain,plan,terrain.baseY,route);
      this.route=route;this.routeAt=time;this.routeReady=true;
      if(route==='upper')this.upperChoices++;
      this.emit('route_selected',{route,time});
      return true;
    }
    onJump({time,terrain,plan,grounded}={}){
      return this.chooseRoute('upper',{time,terrain,plan,grounded});
    }
    routeAllows(route){return !route||route===this.route}
    tick(dt,{time=0,terrain=null,plan=null}={}){
      if(!(dt>0))return null;
      this.resonance=Math.max(0,this.resonance-dt*.23);
      if(this.route==='undecided'&&time>=BRANCH.choiceEnd)
        this.chooseRoute('lower',{time:BRANCH.choiceEnd,terrain,plan,grounded:true});
      for(let i=0;i<PHASES.length;i++){
        const p=PHASES[i];
        if(time>=p.start&&this.bossPhase<i+1){
          this.bossPhase=i+1;this.emit('boss_phase',{phase:p.id,name:p.name});
        }
        if(time>=p.end&&this.phaseResults[i]===null){
          const successful=this.phaseClears[i]>=p.needed&&this.phaseHits[i]===0;
          this.phaseResults[i]=successful;
          if(successful){
            this.bossHealth=Math.max(0,this.bossHealth-1);
            this.impactTime=time;this.resonance=1;
          }
          this.emit(successful?'boss_armor_break':'boss_attack_survived',
            {phase:p.id,health:this.bossHealth});
        }
      }
      if(!this.bossDefeated&&this.bossHealth===0){
        this.bossDefeated=true;this.emit('boss_defeated');
      }
      return this.eventQueue.shift()||null;
    }
    onClear({time=0,precision=false,master=false,protectedClear=false,
      bossPhase=0}={}){
      if(protectedClear)return;
      this.successfulClears++;
      this.resonance=clamp(this.resonance+(master?.30:precision?.23:.15),0,1);
      if(bossPhase>=1&&bossPhase<=3){
        this.phaseClears[bossPhase-1]++;this.bossAttacksCleared++;
        this.resonance=clamp(this.resonance+.11,0,1);
      }
    }
    onBossHit(bossPhase){
      if(!(bossPhase>=1&&bossPhase<=3))return;
      this.phaseHits[bossPhase-1]++;this.bossHits++;
    }
    get snapshot(){return {route:this.route,upperChoices:this.upperChoices,
      clears:this.successfulClears,phaseClears:[...this.phaseClears],
      phaseHits:[...this.phaseHits],phaseResults:[...this.phaseResults],
      bossHealth:this.bossHealth,bossDefeated:this.bossDefeated,
      bossAttacksCleared:this.bossAttacksCleared,bossHits:this.bossHits};}
    drawRoute(ctx,{plan,distance=0,time=0,width=1280,height=720,
      baseY=515,primary='#3feeff',secondary='#e265ff',reducedMotion=false}={}){
      if(!plan||time>BRANCH.end+5)return;
      const m=plan.markers;
      // Draw the OTHER physical route as a thin dashed guide. It is
      // intentionally NOT solid or collidable; the chosen route is rendered
      // by the real terrain renderer above it.
      const active=this.route,guide=active==='upper'?'lower':'upper';
      const top=baseY-BRANCH.rise;
      const yAt=(x,route)=>{
        if(route==='lower'||x<=m.start||x>=m.end)return baseY;
        if(x<m.crest)return baseY+(top-baseY)*smooth((x-m.start)/(m.crest-m.start));
        if(x<=m.descent)return top;
        return top+(baseY-top)*smooth((x-m.descent)/(m.end-m.descent));
      };
      ctx.save();ctx.beginPath();
      let seen=false;
      // The line is physically registered to world coordinates and scrolls.
      // Never draw ahead of the visible viewport as a misleading obstacle.
      const lo=Math.max(m.start,distance-80),hi=Math.min(m.end,distance+width+250);
      for(let x=lo;x<=hi;x+=16){
        const sx=x-distance,sy=yAt(x,guide);
        if(!seen){ctx.moveTo(sx,sy);seen=true}else ctx.lineTo(sx,sy);
      }
      if(seen){
        ctx.lineTo(hi-distance,yAt(hi,guide));
        ctx.strokeStyle=guide==='upper'?secondary:primary;
        ctx.lineWidth=2;ctx.globalAlpha=active==='undecided'?.55:.22;
        if(ctx.setLineDash)ctx.setLineDash([13,10]);
        ctx.stroke();
      }
      ctx.restore();
    }
    drawBackdrop(ctx,{time=0,width=1280,height=720,
      primary='#3feeff',secondary='#e265ff',quality={},reducedMotion=false}={}){
      const density=clamp(quality.density??1,.2,1),p=this.resonance;
      ctx.save();
      if(p>.02){
        const count=density>=.65?6:3;
        for(let i=0;i<count;i++){
          ctx.globalAlpha=p*(.10+.01*i);ctx.fillStyle=i%2?secondary:primary;
          ctx.fillRect(width*.05,height*(.27+i*.052),
            width*(.25+i*.08),3);
        }
      }
      const visible=smooth((time-SENTINEL.start)/1.2)*
        smooth((SENTINEL.end+1-time)/1.6);
      if(visible>0){
        // Large 3-stage angular boss, not a tiny blinking waypoint icon.
        const x=width*.80,y=height*.31;
        const radius=Math.min(width*.12,height*.155);
        const vibration=reducedMotion?0:Math.sin(time*10)*2.5*(this.bossPhase===3?1.7:1);
        const burst=clamp(1-(time-this.impactTime)/1.4,0,1);
        ctx.translate(x+vibration,y);ctx.scale(radius,radius);
        const vertices=8;
        ctx.globalAlpha=visible;
        ctx.shadowColor=secondary;ctx.shadowBlur=18*density+burst*35;
        ctx.beginPath();
        for(let i=0;i<vertices;i++){
          const a=i*Math.PI*2/vertices-Math.PI/8;
          const v=(i%2===0?1.05:.98);
          if(!i)ctx.moveTo(Math.cos(a)*v,Math.sin(a)*v);
          else ctx.lineTo(Math.cos(a)*v,Math.sin(a)*v);
        }
        ctx.closePath();ctx.fillStyle='#16142f';ctx.fill();
        ctx.strokeStyle=secondary;ctx.lineWidth=.065;ctx.stroke();
        ctx.shadowBlur=0;
        // Three thick armor slabs are removed ONLY after actual boss clears.
        for(let i=0;i<3;i++){
          const alive=i<this.bossHealth;
          const a=-Math.PI*.85+i*Math.PI*.85;
          const c=Math.cos(a),s=Math.sin(a);
          ctx.save();ctx.translate(c*.9,s*.9);ctx.rotate(a+Math.PI/2);
          ctx.globalAlpha=visible*(alive?1:.16+burst*.5);
          ctx.fillStyle=alive?(i===2?'#ff88d4':'#ab86ff'):'#394064';
          ctx.fillRect(-.42,-.11,.84,.22);
          ctx.strokeStyle=alive?'#fff1ff':'#7a8bbd';ctx.lineWidth=.025;
          ctx.strokeRect(-.42,-.11,.84,.22);ctx.restore();
        }
        ctx.globalAlpha=visible;
        ctx.beginPath();
        ctx.moveTo(-.42,-.17);ctx.lineTo(.12,-.45);
        ctx.lineTo(.48,-.10);ctx.lineTo(.24,.27);
        ctx.lineTo(-.34,.38);ctx.closePath();
        ctx.fillStyle=burst>.05?'#ffffff':primary;
        ctx.fill();
        // A reactive segmented mandible announces each attack phrase.
        const attack=PHASES.find(ph=>time>=ph.start&&time<=ph.end);
        if(attack){
          const progress=(time-attack.start)/(attack.end-attack.start);
          ctx.globalAlpha=visible*(.6+.24*Math.sin(progress*Math.PI*12)**2);
          ctx.strokeStyle=secondary;ctx.lineWidth=.045;
          ctx.beginPath();ctx.moveTo(-.8,.6);ctx.lineTo(-1.5,1.3);
          ctx.moveTo(.8,.6);ctx.lineTo(1.5,1.3);ctx.stroke();
        }
        // Armor failure creates a readable multi-shard breakup, not a blink.
        if(burst>.05){
          for(let i=0;i<7;i++){
            const a=i*Math.PI*2/7;
            const v=.9+(1-burst)*1.25;
            ctx.save();ctx.translate(Math.cos(a)*v,Math.sin(a)*v);
            ctx.rotate(a);ctx.globalAlpha=visible*burst;
            ctx.fillStyle=i%2?secondary:primary;
            ctx.fillRect(-.12,-.08,.24,.16);ctx.restore();
          }
        }
        if(this.bossDefeated){
          const shatter=smooth((time-this.impactTime)/1.55);
          ctx.globalAlpha=visible*(1-shatter);
          ctx.fillStyle='#ffffff';ctx.fillRect(-.5,-.07,1,.14);
        }
      }
      ctx.restore();
    }
    drawAttack(ctx,{obstacle,box,quality={}}={}){
      if(!obstacle?.bossPhase||!box)return;
      // All identifying graphics stay INSIDE the physical collision shape.
      // No detached energy fields or pre-hazard fake hitboxes.
      ctx.save();ctx.globalAlpha=.92;
      const x=box.x,w=box.w;
      const y=obstacle.type==='jump'?box.y:obstacle.groundY-28-obstacle.height;
      const h=obstacle.type==='jump'?box.h:obstacle.height;
      ctx.strokeStyle='#ffe0ff';ctx.lineWidth=2;
      ctx.beginPath();
      if(obstacle.type==='jump'){
        for(let i=0;i<3;i++){
          const xx=x+(i+1)*w/4;
          ctx.moveTo(xx-8,y+12);ctx.lineTo(xx,y+Math.min(h-9,27));
          ctx.lineTo(xx+8,y+Math.min(h-9,16));
        }
      }else{
        // Overhead Sweep retains the full existing duck gate collider.
        for(let i=0;i<3;i++){
          const xx=x+(i+1)*w/4;
          ctx.moveTo(xx-6,y+6);ctx.lineTo(xx+6,y+17);
          ctx.lineTo(xx-5,y+Math.min(h-7,28));
        }
      }
      ctx.stroke();
      ctx.globalAlpha=.82;ctx.fillStyle='#ffe7ff';
      ctx.font='900 13px system-ui';ctx.textAlign='center';
      const label=obstacle.type==='jump'?'SLAM':'SWEEP';
      ctx.fillText(label,x+w/2,y+Math.max(19,Math.min(h-11,40)));
      ctx.restore();
    }
    drawOverlay(ctx,{time=0,width=1280,height=720,
      primary='#3feeff',secondary='#e265ff'}={}){
      if(this.route==='undecided'&&time>=BRANCH.choiceStart-.75&&time<=BRANCH.choiceEnd){
        ctx.save();ctx.textAlign='center';
        ctx.fillStyle='rgba(7,13,29,.83)';
        ctx.fillRect(width*.5-210,height*.22-34,420,57);
        ctx.font='800 18px system-ui';ctx.fillStyle='#f3eeff';
        ctx.fillText('WORLD FOLD · CHOOSE YOUR ROUTE',width*.5,height*.22-10);
        ctx.font='800 14px system-ui';ctx.fillStyle=secondary;
        ctx.fillText('JUMP = UPPER  ·  STAY = LOWER',width*.5,height*.22+10);
        ctx.restore();
      }else if(this.route!=='undecided'&&this.routeAt!==null&&time-this.routeAt<2.0){
        const alpha=clamp((this.routeAt+2-time)/.5,0,1);
        ctx.save();ctx.textAlign='center';ctx.globalAlpha=alpha;
        ctx.font='900 19px system-ui';ctx.fillStyle=this.route==='upper'?secondary:primary;
        ctx.fillText(this.route==='upper'?'UPPER ROUTE · BONUS CHALLENGE':'LOWER ROUTE · STEADY PATH',
          width*.5,height*.23);ctx.restore();
      }
      if(time>=SENTINEL.start&&time<=SENTINEL.end){
        ctx.save();ctx.textAlign='center';
        const top=height*.17;
        ctx.font='900 17px system-ui';ctx.fillStyle='#fff0ff';
        ctx.fillText('SENTINEL  ·  '+(PHASES[Math.max(0,this.bossPhase-1)]?.name||'INCOMING'),
          width*.5,top);
        for(let i=0;i<3;i++){
          ctx.fillStyle=i<this.bossHealth?'#e68afe':'#37435e';
          ctx.fillRect(width*.5-65+i*48,top+11,40,6);
        }
        ctx.restore();
      }
      if(this.bossDefeated&&time>=this.impactTime&&time<=90){
        ctx.save();ctx.textAlign='center';ctx.globalAlpha=.9;
        ctx.font='900 23px system-ui';ctx.fillStyle='#d6ffff';
        ctx.fillText('SENTINEL SHATTERED',width*.5,height*.28);
        ctx.restore();
      }
    }
  }
  return {ID,DURATION,COURSE_REVISION,KEY,BRANCH,COMMON,ROUTES,GAP_TIMES,
    PHASES,SENTINEL,ACTIONS,createPlan,validatePlan,installTerrain,
    RealityRecords,RealityEngine};
});
