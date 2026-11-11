/* CHROMA RUSH — Reality Engine 2.2: Route Identity & Boss Clarity
 * Experimental Reality-only layer. No changes to Arcade or Mastery.
 * - Physical upper deck: distinctly harder 7-gate chain and clean-route reward.
 * - Projectile lives AFTER clearing player until exiting screen, real impact center.
 * - Clear action silhouettes: ground cutter vs elevated sweep.
 * - Clean concentric Chroma control core instead of character-shaped boss.
 */
(function(root,factory){
  const prior=typeof module!=='undefined'&&module.exports?
    require('./reality-engine-2.1.js'):root.ChromaReality;
  const config=typeof module!=='undefined'&&module.exports?
    require('../core/config.js'):root.ChromaConfig;
  const api=factory(prior,config?.GAME);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaReality=api;
})(typeof window!=='undefined'?window:null,function(base,GAME){
  'use strict';
  if(!base?.RealityEngine||!GAME)throw Error('Reality 2.2 requires engine and config');
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const smooth=x=>{const t=clamp(x,0,1);return t*t*(3-2*t)};
  const KEY='chromaRushRealityV22';
  const UPPER=Object.freeze({start:39.1,cadence:1.16,actions:'JJDJJDD',
    multiplier:2,cleanBonus:1800});
  const SHOT=Object.freeze({
    low:Object.freeze({width:64,height:24,offset:12,action:'JUMP'}),
    high:Object.freeze({width:76,height:26,offset:49,action:'DUCK'})
  });
  const BASE_SHOTS=base.SHOTS;
  // Reuse the validated baseline terrain/gap planner. Replace ONLY the
  // upper-route challenges with a compact, deliberately harder authored
  // pattern, leaving lower route, gaps and Sentinel timings unchanged.
  function createPlan(opts={}){
    const foundation=base.createPlan(opts);
    const old=foundation.obstacles.filter(o=>o.route==='upper');
    if(old.length<2)throw Error('Missing baseline upper route anchors');
    const interpolate=t=>{
      let left=old[0],right=old[1];
      for(let i=0;i<old.length-1;i++)
        if(t>=old[i].time){left=old[i];right=old[i+1];}
      const r=(t-left.time)/(right.time-left.time);
      return Math.round(left.worldX+(right.worldX-left.worldX)*r);
    };
    const extras=[...UPPER.actions].map((ch,i)=>{
      const t=Number((UPPER.start+i*UPPER.cadence).toFixed(3));
      const original=old[Math.min(old.length-1,Math.floor(i*.85))];
      return Object.freeze({
        ...original,time:t,worldX:interpolate(t),
        type:ch==='J'?'jump':'duck',
        height:ch==='J'?65+(i%4):126+(i*3)%12,
        route:'upper',phase:'UPPER_OVERDRIVE',
        width:Math.min(85,original.width+4),
        bossPhase:0
      });
    });
    const obstacles=Object.freeze([
      ...foundation.obstacles.filter(o=>o.route!=='upper'),...extras
    ].sort((a,b)=>a.time-b.time));
    const signature=foundation.signature+'|OVERDRIVE_2.2|'+extras
      .map(o=>[o.type,o.time,o.worldX].join(':')).join('|');
    return Object.freeze({...foundation,foundation,obstacles,signature,
      revisionLabel:'REALITY-2.2-ROUTE'});
  }
  function validatePlan(plan){
    if(!plan?.foundation||!base.validatePlan(plan.foundation))return false;
    const upper=plan.obstacles.filter(o=>o.route==='upper');
    if(upper.length!==UPPER.actions.length)return false;
    if(plan.obstacles.length!==plan.foundation.obstacles.length-6+upper.length)return false;
    for(let i=0;i<upper.length;i++){
      const o=upper[i],expected=UPPER.start+i*UPPER.cadence;
      if(Math.abs(o.time-expected)>.001||o.width<70||
        o.worldX<plan.markers.crest||o.worldX>=plan.markers.descent)
        return false;
      if(i){
        const prev=upper[i-1],safeTime=Math.abs(2*GAME.jumpVelocity/GAME.gravity);
        const budget=prev.type==='jump'?safeTime:GAME.duckDuration+GAME.duckRecovery;
        const minimum=budget+(prev.width+36)/Math.max(300,GAME.speedAt(prev.time,1))+.12;
        if(o.time-prev.time<minimum||o.worldX<=prev.worldX+prev.width)return false;
      }
    }
    return true;
  }
  function installTerrain(terrain,plan,baseY=515,route='lower'){
    if(!validatePlan(plan))throw Error('Unsafe Reality 2.2 course');
    return base.installTerrain(terrain,plan.foundation,baseY,route);
  }
  class RealityRecords extends base.RealityRecords{
    constructor(storage=null){
      super(storage);
      // Base constructor uses old KEY. Read separate Reality 2.2 records.
      this.data={bestScore:0,attempts:0,completions:0,lastScore:0};
      try{
        const v=JSON.parse(storage?.getItem(KEY)||'null');
        if(v&&typeof v==='object'&&!Array.isArray(v))
          for(const k of Object.keys(this.data)){
            const n=Number(v[k]);
            if(Number.isFinite(n))this.data[k]=clamp(Math.floor(n),0,1e9);
          }
      }catch(_){}
    }
    finish({score=0,completed=false}={}){
      const value=clamp(Math.floor(Number(score)||0),0,1e9),old=this.data.bestScore;
      this.data.attempts++;this.data.lastScore=value;
      if(completed){
        this.data.completions++;this.data.bestScore=Math.max(old,value);
      }
      try{this.storage?.setItem(KEY,JSON.stringify(this.data))}catch(_){}
      return {completed:!!completed,newBest:!!completed&&value>old,
        bestScore:this.data.bestScore,previousBest:old};
    }
  }
  // All collision art follows the same axis-aligned box used in simulation.
  // Low cutter: floor-scraping wide trapezoid. High sweep: suspended gate bar.
  function projectileBox(s){
    const shape=SHOT[s.kind]||SHOT.low;
    return {x:s.x-shape.width/2,y:s.y-shape.height/2,
      w:shape.width,h:shape.height};
  }
  class RealityEngine extends base.RealityEngine{
    reset(){
      super.reset();
      this.routeClears=0;this.routeHits=0;this.routeRewarded=false;
      this.routeBonus=0;this.routeFlash=0;this.sentinelImpact=null;
      this.shotVisualPasses=0;this.shotVisualRemovals=0;
      this.lastCue=null;this.lastCueAt=-100;
    }
    captureUpper(args={}){
      const ok=super.captureUpper(args);
      if(ok){this.routeFlash=1;this.resonance=1;}
      return ok;
    }
    onClear(args={}){
      super.onClear(args);
      if(args.route==='upper'&&!args.protectedClear)this.routeClears++;
    }
    onRouteHit(route){
      if(route==='upper')this.routeHits++;
    }
    tick(dt,props={}){
      if(!(dt>0))return null;
      this.routeFlash=Math.max(0,this.routeFlash-dt*.4);
      const firedBefore=this.shotsFired;
      const event=super.tick(dt,props);
      if(this.shotsFired>firedBefore){
        // Position ALL newly fired shots on visibly separate HEIGHT LANES.
        // 2.1 launched only 24px apart, explaining the ambiguous silhouette.
        const newShots=this.projectiles.slice(-(this.shotsFired-firedBefore));
        for(const shot of newShots)
          shot.y=(props.baseY??515)-SHOT[shot.kind].offset;
        const newest=newShots[newShots.length-1];
        this.lastCue=newest.kind;this.lastCueAt=props.time||0;
      }
      // 2.2 route completion is an EARNED reward, not unconditional.
      if(this.route==='upper'&&!this.routeRewarded&&props.plan&&
          Number.isFinite(props.playerWorld)&&
          props.playerWorld>=props.plan.markers.end+12){
        this.routeRewarded=true;
        if(this.routeHits===0&&this.routeClears>=UPPER.actions.length){
          this.routeBonus=UPPER.cleanBonus;
          this.resonance=1;
          this.emit('upper_route_clean',{points:UPPER.cleanBonus,
            clears:this.routeClears,hits:this.routeHits});
        }else this.emit('upper_route_finish',{clears:this.routeClears,
          hits:this.routeHits,bonus:0});
      }
      return event;
    }
    // A projectile is scored at most once. A successful dodge keeps a
    // traveling projectile visible until it REALLY exits left viewport.
    // On impact, the bolt snaps to the swept contact point and fractures.
    tickProjectiles(dt,{playerBox,playerWorldX=0,speed=500,
      invulnerable=false,leftBound=-100,baseY=515}={}){
      if(!(dt>0)||!playerBox)return [];
      const outcomes=[];
      for(const shot of this.projectiles){
        if(shot.finished)continue;
        shot.age+=dt;
        shot.previousX=shot.x;
        if(shot.impacted){
          shot.impactAge=(shot.impactAge||0)+dt;
          if(shot.impactAge>.28)shot.finished=true;
          continue;
        }
        if(shot.age<=.40)continue;
        shot.charging=false;
        shot.x-=(speed+shot.speed)*dt;
        shot.worldX=playerWorldX+(shot.x-playerBox.x);
        const r=projectileBox(shot);
        // Check swept X, while Y uses the same collider that gets drawn.
        if(!shot.resolved){
          const half=r.w/2;
          const sweptLeft=Math.min(shot.previousX,shot.x)-half;
          const sweptRight=Math.max(shot.previousX,shot.x)+half;
          const crosses=sweptLeft<playerBox.x+playerBox.w&&
            sweptRight>playerBox.x;
          const yContact=r.y<playerBox.y+playerBox.h&&
            r.y+r.h>playerBox.y;
          if(crosses&&yContact){
            const contactX=clamp(shot.x,playerBox.x,
              playerBox.x+playerBox.w);
            const contactY=clamp(shot.y,playerBox.y,
              playerBox.y+playerBox.h);
            shot.x=contactX;shot.y=contactY;
            shot.resolved=true;shot.impacted=true;shot.impactAge=0;
            // The shared onHit() must mark hit and charge HP exactly once.
            // Never pre-mark: onHit skips objects already marked hit.
            this.shotsHit++;
            this.sentinelImpact={x:contactX,y:contactY,kind:shot.kind,id:shot.id};
            outcomes.push({type:'hit',shot,
              impactX:contactX,impactY:contactY,protected:invulnerable});
          }else if(shot.x+half<playerBox.x){
            shot.resolved=true;shot.passed=true;
            this.shotsCleared++;
            this.shotVisualPasses++;
            outcomes.push({type:'clear',shot,protectedClear:invulnerable});
          }
        }
        if(shot.x+r.w/2<leftBound-55){
          shot.finished=true;this.shotVisualRemovals++;
        }
      }
      this.projectiles=this.projectiles.filter(s=>!s.finished);
      return outcomes;
    }
    get snapshot(){
      return {...super.snapshot,
        routeClears:this.routeClears,routeHits:this.routeHits,
        routeRewarded:this.routeRewarded,routeBonus:this.routeBonus,
        shotVisualPasses:this.shotVisualPasses,
        shotVisualRemovals:this.shotVisualRemovals,
        lastCue:this.lastCue};
    }
    drawRoute(ctx,props={}){
      super.drawRoute(ctx,props);
      const plan=props.plan,baseY=props.baseY??515;
      if(!plan||this.route!=='upper')return;
      const m=plan.markers,lo=Math.max(m.crest,(props.distance||0)-55);
      const hi=Math.min(m.descent,(props.distance||0)+(props.width||1280)+220);
      if(hi<=lo)return;
      ctx.save();
      // Continuous underlighting belongs to upper route geometry, never
      // opaque fake gates or player-trailing effects.
      ctx.fillStyle='rgba(228,117,255,.11)';
      ctx.fillRect(lo-props.distance,baseY-base.CREST_RISE+18,
        hi-lo,27);
      ctx.strokeStyle=props.secondary||'#e265ff';
      ctx.lineWidth=1.4;ctx.globalAlpha=.65;
      ctx.beginPath();ctx.moveTo(lo-props.distance,baseY-base.CREST_RISE+20);
      ctx.lineTo(hi-props.distance,baseY-base.CREST_RISE+20);
      ctx.stroke();ctx.restore();
    }
    drawProjectiles(ctx,{primary='#3feeff',secondary='#e265ff',
      bossX=980,bossY=235}={}){
      for(const shot of this.projectiles){
        if(shot.finished)continue;
        const b=projectileBox(shot);
        ctx.save();
        const color=shot.kind==='low'?secondary:primary;
        if(shot.impacted){
          const k=clamp(1-(shot.impactAge||0)/.28,0,1);
          ctx.globalAlpha=k;
          ctx.lineWidth=2.2;ctx.strokeStyle=color;
          for(let i=0;i<4;i++){
            const a=(i+.5)*Math.PI/2;
            const d=8+(1-k)*27;
            ctx.beginPath();ctx.moveTo(shot.x+Math.cos(a)*d,
              shot.y+Math.sin(a)*d);
            ctx.lineTo(shot.x+Math.cos(a)*(d+9),
              shot.y+Math.sin(a)*(d+9));ctx.stroke();
          }
          ctx.restore();continue;
        }
        if(shot.charging){
          // Small muzzle flare, no world-spanning laser line that can
          // be misread as a third, unimplemented collision hazard.
          const a=.35+.6*smooth(shot.age/.40);
          ctx.globalAlpha=a;ctx.strokeStyle=color;ctx.lineWidth=2.4;
          ctx.beginPath();ctx.arc(shot.x,shot.y,15+shot.age*18,
            -.65,.65);ctx.stroke();
          ctx.globalAlpha=1;
        }
        ctx.shadowColor=color;ctx.shadowBlur=shot.charging?9:14;
        ctx.fillStyle=color;
        if(shot.kind==='low'){
          // Long horizontal ground cutter with a broad stable silhouette.
          ctx.beginPath();
          ctx.moveTo(b.x,b.y+b.h);
          ctx.lineTo(b.x+12,b.y+2);
          ctx.lineTo(b.x+b.w-12,b.y+2);
          ctx.lineTo(b.x+b.w,b.y+b.h);
          ctx.closePath();ctx.fill();
          ctx.shadowBlur=0;ctx.fillStyle='#fff8ff';ctx.globalAlpha=.8;
          ctx.fillRect(b.x+16,b.y+7,b.w-32,3);
          // Ground-hugging streak stays attached to the actual body.
          ctx.strokeStyle=color;ctx.globalAlpha=.6;ctx.lineWidth=2;
          ctx.beginPath();ctx.moveTo(b.x+5,b.y+b.h+4);
          ctx.lineTo(b.x+b.w-5,b.y+b.h+4);ctx.stroke();
        }else{
          // WIDE suspended sweep bar, clear air underneath to duck.
          ctx.fillRect(b.x,b.y+3,b.w,b.h-6);
          ctx.fillStyle='#ffffff';ctx.shadowBlur=0;
          ctx.globalAlpha=.85;ctx.fillRect(b.x+9,b.y+7,b.w-18,3);
          ctx.globalAlpha=.5;ctx.strokeStyle=color;ctx.lineWidth=2;
          ctx.beginPath();ctx.moveTo(b.x+12,b.y+b.h+3);
          ctx.lineTo(b.x+b.w-12,b.y+b.h+3);ctx.stroke();
        }
        ctx.shadowBlur=0;
        if(!shot.charging){
          ctx.globalAlpha=.26;ctx.strokeStyle=color;
          ctx.lineWidth=2;ctx.beginPath();
          ctx.moveTo(b.x+b.w+6,b.y+b.h/2);
          ctx.lineTo(b.x+b.w+Math.min(42,b.w*.5),b.y+b.h/2);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    drawBackdrop(ctx,{time=0,width=1280,height=720,
      primary='#3feeff',secondary='#e265ff',reducedMotion=false}={}){
      const enter=smooth((time-base.SENTINEL.start)/1.3);
      const leave=smooth((base.SENTINEL.end+1-time)/1.4);
      const visible=enter*leave;
      if(visible<.01)return;
      // A simple, large chromatic control CORE: two interrupted angular
      // contours and one square pulse. No eyes, legs or humanoid features.
      const x=width*.80,y=height*.31;
      const r=Math.min(width*.097,height*.17);
      ctx.save();ctx.translate(x,y);
      const pulse=reducedMotion?1:1+.024*Math.sin(time*5);
      ctx.scale(r*pulse,r*pulse);
      ctx.globalAlpha=visible;ctx.lineJoin='miter';
      ctx.shadowColor=secondary;ctx.shadowBlur=12;
      for(let ring=0;ring<2;ring++){
        const radius=ring===0?1:.68;
        ctx.beginPath();
        for(let i=0;i<8;i++){
          if((ring===0&&i===2)||(ring===1&&i===6))continue;
          const a=-Math.PI*.25+i*Math.PI/4;
          const px=Math.cos(a)*radius,py=Math.sin(a)*radius;
          if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
        }
        ctx.strokeStyle=ring===0?secondary:primary;
        ctx.lineWidth=ring===0?.065:.045;ctx.stroke();
      }
      ctx.shadowBlur=0;
      ctx.fillStyle='rgba(13,21,43,.92)';
      ctx.fillRect(-.29,-.29,.58,.58);
      ctx.strokeStyle=primary;ctx.lineWidth=.07;
      ctx.strokeRect(-.29,-.29,.58,.58);
      const bright=clamp(1-(time-this.impactTime)/.65,0,1);
      ctx.fillStyle=bright?'#ffffff':primary;
      ctx.fillRect(-.11,-.11,.22,.22);
      // Exactly three structural armor bands, stripped after real clears.
      for(let i=0;i<3;i++){
        ctx.globalAlpha=visible*(i<this.bossHealth?1:.12);
        ctx.fillStyle=i<this.bossHealth?secondary:'#45506f';
        ctx.fillRect(-.73+i*.52,-1.21,.43,.10);
      }
      ctx.restore();
    }
    drawOverlay(ctx,{time=0,width=1280,height=720,
      primary='#3feeff',secondary='#e265ff'}={}){
      if(this.route==='undecided'&&time>=32&&time<=38){
        ctx.save();ctx.textAlign='center';
        const x=width*.5,y=height*.20;
        ctx.font='800 16px system-ui';ctx.fillStyle=secondary;
        ctx.fillText('FOLD · JUMP TO UPPER / OVERDRIVE 2×',x,y);
        ctx.restore();
      }
      if(this.route==='upper'&&time>=34&&time<=base.BRANCH.end+1){
        ctx.save();ctx.textAlign='center';
        ctx.globalAlpha=.94;
        ctx.font='900 17px system-ui';ctx.fillStyle=secondary;
        ctx.fillText('UPPER OVERDRIVE · 2×',width*.5,height*.18);
        ctx.font='800 11px system-ui';ctx.fillStyle='#dde6ff';
        ctx.fillText(this.routeClears+'/'+UPPER.actions.length+
          ' CLEARS  ·  CLEAN BONUS +'+UPPER.cleanBonus,width*.5,height*.18+18);
        ctx.restore();
      }
      if(this.routeRewarded&&this.routeBonus&&time>=base.BRANCH.end&&
        time<=base.BRANCH.end+2.7){
        ctx.save();ctx.textAlign='center';ctx.fillStyle=secondary;
        ctx.font='900 21px system-ui';
        ctx.fillText('OVERDRIVE CLEAN · +'+this.routeBonus,
          width*.5,height*.26);ctx.restore();
      }
      if(time>=base.SENTINEL.start&&time<=base.SENTINEL.end){
        ctx.save();ctx.textAlign='center';
        const x=width*.8,y=height*.31;
        const p=PHASES[Math.max(0,this.bossPhase-1)];
        ctx.fillStyle='#f2e5ff';ctx.font='800 13px system-ui';
        ctx.fillText('SENTINEL · '+(p?.name||'CHARGING'),x,y-98);
        if(this.lastCue&&time-this.lastCueAt<1.18){
          const low=this.lastCue==='low';
          ctx.fillStyle=low?secondary:primary;
          ctx.font='900 17px system-ui';
          ctx.fillText(low?'LOW · JUMP':'HIGH · DUCK',x,y+100);
        }
        ctx.restore();
      }
      if(this.bossDefeated&&time>=this.impactTime&&time<base.DURATION){
        ctx.save();ctx.textAlign='center';ctx.fillStyle='#eeffff';
        ctx.font='900 22px system-ui';
        ctx.fillText('SENTINEL SHATTERED',width*.5,height*.30);
        ctx.restore();
      }
    }
  }
  const PHASES=base.PHASES;
  return {...base,KEY,UPPER,SHOT,createPlan,validatePlan,installTerrain,
    projectileBox,RealityRecords,RealityEngine};
});
