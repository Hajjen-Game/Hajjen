/* CHROMA RUSH — Reality Engine 2.1 / Physical Platform + Sentinel Volleys
 * An actual elevated platform caught by landing, plus boss-fired moving,
 * collidable projectiles. The old timed jump selector and boss-chevron
 * barrier overlays are retired. Arcade remains isolated.
 */
(function(root,factory){
  const prior=typeof module!=='undefined'&&module.exports?
    require('./reality-engine-2.0.js'):root.ChromaReality;
  const api=factory(prior);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaReality=api;
})(typeof window!=='undefined'?window:null,function(base){
  'use strict';
  if(!base?.RealityEngine)throw new Error('Reality Engine 2.0 must load first');
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const smooth=n=>{const x=clamp(n,0,1);return x*x*(3-2*x)};
  const KEY='chromaRushRealityV21';
  const ENTRY_RISE=114,CREST_RISE=142;
  const BRANCH=Object.freeze({...base.BRANCH,rise:CREST_RISE,
    // Display is based on world coordinates; a timed jump is never required.
    physicalCapture:true});
  const SHOTS=Object.freeze(base.ACTIONS.filter(o=>o.bossPhase).map(o=>
    Object.freeze({time:o.time,phase:o.bossPhase,
      kind:o.type==='jump'?'low':'high'})));
  const PHASES=base.PHASES,SENTINEL=base.SENTINEL;
  function upperSurfaceAt(worldX,plan,baseY=515){
    const m=plan?.markers;
    if(!m||worldX<m.start||worldX>=m.end)return null;
    if(worldX<m.crest)return baseY-ENTRY_RISE-
      (CREST_RISE-ENTRY_RISE)*smooth((worldX-m.start)/(m.crest-m.start));
    if(worldX<m.descent)return baseY-CREST_RISE;
    return baseY-CREST_RISE*(1-smooth((worldX-m.descent)/(m.end-m.descent)));
  }
  function canLandUpper({route='undecided',plan,worldX,baseY=515,
    previousFeet,feet,vy,airborne}={}){
    if(route!=='undecided'||!airborne||!(vy>=0))return false;
    const y=upperSurfaceAt(worldX,plan,baseY);
    if(y===null)return false;
    // Require a genuine top-down crossing of a physical elevated surface.
    // Merely pressing Jump or walking under the platform never chooses it.
    return previousFeet<=y+5&&feet>=y;
  }
  const asInt=n=>Number.isFinite(Number(n))?clamp(Math.floor(Number(n)),0,1e9):0;
  class RealityRecords{
    constructor(storage=null){
      this.storage=storage;this.data={bestScore:0,attempts:0,completions:0,lastScore:0};
      try{
        const v=JSON.parse(storage?.getItem(KEY)||'null');
        if(v&&typeof v==='object'&&!Array.isArray(v))
          for(const k of Object.keys(this.data))this.data[k]=asInt(v[k]);
      }catch(_){}
    }
    get bestScore(){return this.data.bestScore}
    finish({score=0,completed=false}={}){
      const points=asInt(score),old=this.data.bestScore;
      this.data.attempts++;this.data.lastScore=points;
      if(completed){this.data.completions++;this.data.bestScore=Math.max(old,points)}
      try{this.storage?.setItem(KEY,JSON.stringify(this.data))}catch(_){}
      return {completed:!!completed,newBest:!!completed&&points>old,
        bestScore:this.data.bestScore,previousBest:old};
    }
  }
  class RealityEngine extends base.RealityEngine{
    reset(){
      super.reset();
      this.projectiles=[];this.shotCursor=0;this.shotsFired=0;
      this.shotsCleared=0;this.shotsHit=0;this.lastShotTime=-100;
      this.upperLandings=0;this.routeDecisionWorldX=null;
    }
    // This is called only after the shared jump physics actually land on
    // the elevated deck. Changing the route never rewrites lower terrain.
    captureUpper({time=0,worldX=0}={}){
      if(this.route!=='undecided')return false;
      this.route='upper';this.upperChoices=1;this.upperLandings++;
      this.routeReady=true;this.routeAt=time;this.routeDecisionWorldX=worldX;
      this.emit('route_selected',{route:'upper',time,worldX,physicalLanding:true});
      return true;
    }
    chooseRoute(route,{time=0,playerWorld=null,plan=null}={}){
      if(this.route!=='undecided'||route!=='lower'||!plan)return false;
      if(!Number.isFinite(playerWorld)||
        playerWorld<plan.markers.crest+85)return false;
      this.route='lower';this.routeAt=time;this.routeReady=true;
      this.routeDecisionWorldX=playerWorld;
      this.emit('route_selected',{route:'lower',time,worldX:playerWorld,physicalLanding:false});
      return true;
    }
    // Deliberately no select-by-press shortcut: physical landing owns it.
    onJump(){return false}
    upperSurfaceAt(x,plan,baseY){return upperSurfaceAt(x,plan,baseY)}
    routeAllows(route){return !route||route===this.route}
    tick(dt,{time=0,plan=null,playerWorld=null,baseY=515,
      playerX=340,spawnX=1040,speed=500}={}){
      if(!(dt>0))return null;
      this.resonance=Math.max(0,this.resonance-dt*.23);
      if(this.route==='undecided'&&plan&&playerWorld!==null)
        this.chooseRoute('lower',{time,playerWorld,plan});
      for(let i=0;i<PHASES.length;i++){
        const p=PHASES[i];
        if(time>=p.start&&this.bossPhase<i+1){
          this.bossPhase=i+1;
          this.emit('boss_phase',{phase:p.id,name:p.name});
        }
      }
      // A real boss volley originates from Sentinel's world-projected
      // muzzle, charges visibly, and then travels left past the player.
      while(this.shotCursor<SHOTS.length&&time>=SHOTS[this.shotCursor].time){
        const shot=SHOTS[this.shotCursor++];
        this.projectiles.push({
          id:this.shotCursor,kind:shot.kind,bossPhase:shot.phase,
          x:spawnX,y:baseY-(shot.kind==='low'?15:39),
          previousX:spawnX,age:0,charging:true,resolved:false,
          speed:Math.max(300,speed*.33),
          type:shot.kind==='low'?'sentinel-low':'sentinel-high',
          worldX:spawnX,
          hit:false
        });
        this.shotsFired++;this.lastShotTime=time;
        this.emit('boss_shot',{phase:shot.phase,kind:shot.kind,
          shotId:this.shotCursor});
      }
      for(let i=0;i<PHASES.length;i++){
        const p=PHASES[i];
        if(time>=p.end&&this.phaseResults[i]===null){
          const won=this.phaseClears[i]>=p.needed&&this.phaseHits[i]===0;
          this.phaseResults[i]=won;
          if(won){
            this.bossHealth=Math.max(0,this.bossHealth-1);
            this.impactTime=time;this.resonance=1;
          }
          this.emit(won?'boss_armor_break':'boss_attack_survived',
            {phase:p.id,health:this.bossHealth});
        }
      }
      if(!this.bossDefeated&&this.bossHealth===0){
        this.bossDefeated=true;this.emit('boss_defeated');
      }
      return this.eventQueue.shift()||null;
    }
    tickProjectiles(dt,{playerBox,playerWorldX=0,baseY=515,
      speed=500,invulnerable=false}={}){
      if(!(dt>0)||!playerBox)return [];
      const outcome=[];
      for(const shot of this.projectiles){
        if(shot.resolved)continue;
        shot.age+=dt;shot.previousX=shot.x;
        if(shot.age<=.40)continue;
        shot.charging=false;
        shot.x-=(speed+shot.speed)*dt;
        shot.worldX=playerWorldX+(shot.x-playerBox.x);
        const r=projectileBox(shot);
        const left=Math.min(shot.previousX,shot.x)-r.w*.5;
        const right=Math.max(shot.previousX,shot.x)+r.w*.5;
        const xOverlap=left<playerBox.x+playerBox.w&&
          right>playerBox.x;
        const yOverlap=r.y<playerBox.y+playerBox.h&&
          r.y+r.h>playerBox.y;
        if(xOverlap&&yOverlap){
          shot.resolved=true;shot.hit=true;this.shotsHit++;
          outcome.push({type:'hit',shot});
        }else if(shot.x+r.w*.5<playerBox.x){
          shot.resolved=true;this.shotsCleared++;
          outcome.push({type:'clear',shot,protectedClear:invulnerable});
        }
      }
      this.projectiles=this.projectiles.filter(s=>
        !s.resolved||s.age<.12);
      return outcome;
    }
    get snapshot(){return {...super.snapshot,upperLandings:this.upperLandings,
      routeDecisionWorldX:this.routeDecisionWorldX,
      shotsFired:this.shotsFired,shotsCleared:this.shotsCleared,shotsHit:this.shotsHit};}
    drawRoute(ctx,{plan,distance=0,width=1280,baseY=515,
      secondary='#e265ff',primary='#3feeff'}={}){
      if(!plan?.markers)return;
      const m=plan.markers,lo=Math.max(m.start,distance-45);
      const hi=Math.min(m.end,distance+width+225);
      if(hi<=lo)return;
      const xs=[];
      for(let x=lo;x<=hi;x+=13)xs.push([x-distance,upperSurfaceAt(x,plan,baseY)]);
      xs.push([hi-distance,upperSurfaceAt(hi-.01,plan,baseY)]);
      ctx.save();
      // Actual elevated collision platform: dark solid deck with a bright
      // continuous edge, not an unreachable dashed preview.
      ctx.beginPath();ctx.moveTo(xs[0][0],xs[0][1]);
      for(const [x,y] of xs.slice(1))ctx.lineTo(x,y);
      for(const [x,y] of xs.slice().reverse())ctx.lineTo(x,y+16);
      ctx.closePath();ctx.fillStyle='rgba(16,22,48,.96)';ctx.fill();
      ctx.beginPath();ctx.moveTo(xs[0][0],xs[0][1]);
      for(const [x,y] of xs.slice(1))ctx.lineTo(x,y);
      ctx.strokeStyle=this.route==='lower'?'#67708e':secondary;
      ctx.globalAlpha=this.route==='lower'?.43:1;
      ctx.lineWidth=3.4;ctx.shadowColor=secondary;ctx.shadowBlur=13;
      ctx.stroke();
      // A short illuminated entrance post makes the leap point visible.
      const post=m.start-distance;
      if(post>-45&&post<width+30){
        ctx.globalAlpha=1;ctx.shadowBlur=8;
        ctx.strokeStyle=secondary;ctx.lineWidth=3;
        ctx.beginPath();ctx.moveTo(post,baseY-ENTRY_RISE);
        ctx.lineTo(post,baseY-ENTRY_RISE+18);ctx.stroke();
      }
      ctx.restore();
    }
    drawAttack(){/* Replaced: Sentinel now shoots physical bolts, no arrows on gates. */}
    drawProjectiles(ctx,{primary='#3feeff',secondary='#e265ff',
      bossX=980,bossY=235}={}){
      for(const shot of this.projectiles){
        if(shot.resolved)continue;
        ctx.save();
        const color=shot.kind==='low'?secondary:primary;
        const rect=projectileBox(shot);
        // A visible path from the boss's body toward its charging muzzle.
        if(shot.charging){
          ctx.globalAlpha=.28+.38*clamp(shot.age/.40,0,1);
          ctx.strokeStyle=color;ctx.lineWidth=2.4;
          ctx.beginPath();ctx.moveTo(bossX,bossY);
          ctx.lineTo(shot.x,shot.y);ctx.stroke();
          ctx.globalAlpha=1;
        }
        const glow=shot.charging?(1+.4*Math.sin(shot.age*16)):1;
        ctx.shadowColor=color;ctx.shadowBlur=16*glow;
        ctx.fillStyle=color;
        ctx.beginPath();
        ctx.moveTo(rect.x+rect.w*.5,rect.y-2);
        ctx.lineTo(rect.x+rect.w+4,rect.y+rect.h*.5);
        ctx.lineTo(rect.x+rect.w*.5,rect.y+rect.h+2);
        ctx.lineTo(rect.x-4,rect.y+rect.h*.5);
        ctx.closePath();ctx.fill();
        ctx.globalAlpha=.91;ctx.fillStyle='#ffffff';
        ctx.fillRect(rect.x+7,rect.y+6,Math.max(5,rect.w-14),5);
        // Trails extend BEHIND projectile, never forming a fake attack box.
        if(!shot.charging){
          ctx.shadowBlur=0;ctx.globalAlpha=.37;ctx.strokeStyle=color;
          ctx.lineWidth=2;ctx.beginPath();
          ctx.moveTo(rect.x+rect.w+3,rect.y+rect.h*.5);
          ctx.lineTo(rect.x+rect.w+43,rect.y+rect.h*.5);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    drawBackdrop(ctx,props={}){
      super.drawBackdrop(ctx,props);
      const t=props.time||0;
      if(t-this.lastShotTime>=.35||t<this.lastShotTime)return;
      const x=(props.width||1280)*.80,y=(props.height||720)*.31;
      const strength=1-(t-this.lastShotTime)/.35;
      ctx.save();ctx.globalAlpha=strength*.8;
      ctx.strokeStyle='#ffe2ff';ctx.lineWidth=5;
      ctx.beginPath();ctx.moveTo(x-18,y+20);
      ctx.lineTo(x-40,y+58);ctx.stroke();
      ctx.restore();
    }
    drawOverlay(ctx,{time=0,width=1280,height=720,
      primary='#3feeff',secondary='#e265ff'}={}){
      if(this.route==='undecided'&&time>=32&&time<=38.0){
        ctx.save();ctx.textAlign='center';
        const x=width*.5,y=height*.22;
        ctx.fillStyle='rgba(5,12,29,.83)';
        ctx.fillRect(x-202,y-25,404,65);
        ctx.fillStyle='#fff1ff';ctx.font='900 17px system-ui';
        ctx.fillText('WORLD FOLD · PHYSICAL SPLIT',x,y);
        ctx.fillStyle=secondary;ctx.font='800 13px system-ui';
        ctx.fillText('JUMP ONTO THE UPPER PLATFORM',x,y+22);
        ctx.restore();return;
      }
      if(time>=29.25&&time<=38.0&&this.route==='undecided')return;
      super.drawOverlay(ctx,{time,width,height,primary,secondary});
    }
  }
  function projectileBox(shot){
    return {x:shot.x-17,y:shot.y-10,w:34,h:20};
  }
  return {...base,KEY,BRANCH,SHOTS,ENTRY_RISE,CREST_RISE,
    upperSurfaceAt,canLandUpper,projectileBox,
    RealityRecords,RealityEngine};
});
