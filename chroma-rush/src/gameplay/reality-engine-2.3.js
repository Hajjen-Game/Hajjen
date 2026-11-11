/* CHROMA RUSH — Reality Engine 2.3: Sentinel Rebirth & Route Flow
 * Real muzzle-spawned projectile trajectory + symmetric breathing energy core,
 * plus authored lower-route rhythm and a useful pre-fork challenge.
 * Loaded ONLY for opt-in Reality; Arcade and Mastery remain untouched.
 */
(function(root,factory){
  const prior=typeof module!=='undefined'&&module.exports?
    require('./reality-engine-2.2.js'):root.ChromaReality;
  const config=typeof module!=='undefined'&&module.exports?
    require('../core/config.js'):root.ChromaConfig;
  const api=factory(prior,config?.GAME);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaReality=api;
})(typeof window!=='undefined'?window:null,function(base,GAME){
  'use strict';
  if(!base?.RealityEngine||!GAME)throw Error('Reality 2.3 requires Reality 2.2');
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const smooth=n=>{const t=clamp(n,0,1);return t*t*(3-2*t)};
  const KEY='chromaRushRealityV23';
  const VERSION='REALITY-2.3-REBIRTH';
  const LOWER=Object.freeze({start:38.75,cadence:1.47,actions:'JDJDDJ'});
  const BRIDGE=Object.freeze({time:31.38,type:'jump'});
  const MUZZLE_CHARGE=.40;
  const DEPART_FRACTION=.54;
  const PHASES=base.PHASES;
  function integrateSpeed(from,to){
    if(from===to)return 0;
    const sign=to>from?1:-1,a=Math.min(from,to),b=Math.max(from,to);
    const count=Math.max(1,Math.ceil((b-a)/.020));
    let sum=0;
    for(let i=0;i<count;i++){
      const t0=a+(b-a)*i/count,t1=a+(b-a)*(i+1)/count;
      sum+=(GAME.speedAt(t0,1)+GAME.speedAt(t1,1))*(t1-t0)*.5;
    }
    return sign*sum;
  }
  function createPlan(opts={}){
    const foundation=base.createPlan(opts);
    const lower=foundation.obstacles.filter(o=>o.route==='lower');
    if(lower.length!==4)throw Error('Reality 2.3 requires known lower route');
    const worldAt=t=>{
      let anchor=foundation.obstacles[0];
      for(const o of foundation.obstacles){
        if(o.time>t)break;
        anchor=o;
      }
      return Math.round(anchor.worldX+integrateSpeed(anchor.time,t));
    };
    const lowObstacles=Object.freeze([...LOWER.actions].map((action,i)=>{
      const time=Number((LOWER.start+i*LOWER.cadence).toFixed(3));
      const original=lower[Math.min(i,lower.length-1)];
      return Object.freeze({...original,time,worldX:worldAt(time),
        route:'lower',type:action==='J'?'jump':'duck',
        width:Math.min(81,original.width),
        height:action==='J'?64+(i%3):122+(i%3)*5,
        phase:'LOWER_FLOW',bossPhase:0});
    }));
    // One final shared movement choice BEFORE the clear upper-landing runway.
    // Placed 2.8 seconds after the previous shared obstacle; does not block
    // the jump up to the deck at 34s+.
    const starter=foundation.obstacles.find(o=>o.time===28.56)||
      foundation.obstacles.filter(o=>!o.route&&!o.bossPhase&&o.time<BRIDGE.time).at(-1);
    if(!starter)throw Error('Missing Reality bridge anchor');
    const bridge=Object.freeze({...starter,
      time:BRIDGE.time,worldX:worldAt(BRIDGE.time),
      type:BRIDGE.type,width:74,height:64,route:undefined,
      phase:'FOLD_APPROACH',bossPhase:0});
    const obstacles=Object.freeze([
      ...foundation.obstacles.filter(o=>o.route!=='lower'),
      ...lowObstacles,bridge
    ].sort((a,b)=>a.time-b.time));
    const signature=foundation.signature+'|'+VERSION+'|'+
      lowObstacles.map(o=>[o.time,o.type,o.worldX].join(':')).join('|')+
      '|bridge:'+bridge.worldX;
    return Object.freeze({...foundation,foundation,obstacles,signature,
      bridge,lower:lowObstacles,revisionLabel:VERSION});
  }
  function validatePlan(plan){
    if(!plan?.foundation||!base.validatePlan(plan.foundation))return false;
    const lower=plan.obstacles.filter(o=>o.route==='lower');
    if(lower.length!==LOWER.actions.length||plan.obstacles.length!==
      plan.foundation.obstacles.length-4+LOWER.actions.length+1)return false;
    if(!plan.bridge||plan.bridge.type!==BRIDGE.type||
      plan.bridge.time!==BRIDGE.time||plan.bridge.worldX>=plan.markers.start)return false;
    if(!lower.every((o,i)=>o.time===
      Number((LOWER.start+i*LOWER.cadence).toFixed(3))&&
      Number.isFinite(o.worldX)))return false;
    // Branch checks use the same real jump/duck commitment budget as Arcade.
    for(const route of ['lower','upper']){
      const obstacles=plan.obstacles.filter(o=>!o.route||o.route===route)
        .filter(o=>!o.bossPhase);
      for(let i=1;i<obstacles.length;i++){
        const previous=obstacles[i-1],next=obstacles[i];
        const commitment=previous.type==='jump'?
          Math.abs(2*GAME.jumpVelocity/GAME.gravity):
          GAME.duckDuration+GAME.duckRecovery;
        const min=commitment+
          (previous.width+36)/Math.max(300,GAME.speedAt(previous.time,1))+.12;
        if(next.time-previous.time<min-1e-6||
          next.worldX<=previous.worldX+previous.width)return false;
      }
    }
    if(plan.gaps.some(g=>Math.abs(g.time-BRIDGE.time)<2))return false;
    for(const o of lower)
      if(o.worldX<plan.markers.crest||o.worldX>=plan.markers.descent)return false;
    return true;
  }
  function installTerrain(terrain,plan,baseY=515,route='lower'){
    if(!validatePlan(plan))throw Error('Unsafe Reality 2.3 course');
    return base.installTerrain(terrain,plan.foundation,baseY,route);
  }
  class RealityRecords extends base.RealityRecords{
    constructor(storage=null){
      super(storage);
      this.data={bestScore:0,attempts:0,completions:0,lastScore:0};
      try{
        const data=JSON.parse(storage?.getItem(KEY)||'null');
        if(data&&typeof data==='object'&&!Array.isArray(data))
          for(const k of Object.keys(this.data)){
            const n=Number(data[k]);
            if(Number.isFinite(n))this.data[k]=clamp(Math.floor(n),0,1e9);
          }
      }catch(_){}
    }
    finish({score=0,completed=false}={}){
      const points=clamp(Math.floor(Number(score)||0),0,1e9),old=this.data.bestScore;
      this.data.attempts++;this.data.lastScore=points;
      if(completed){
        this.data.completions++;this.data.bestScore=Math.max(old,points);
      }
      try{this.storage?.setItem(KEY,JSON.stringify(this.data))}catch(_){}
      return {completed:!!completed,newBest:!!completed&&points>old,
        bestScore:this.data.bestScore,previousBest:old};
    }
  }
  class RealityEngine extends base.RealityEngine{
    reset(){
      super.reset();
      this.coreCharge=0;this.coreRecoil=0;this.muzzleFires=0;
      this.lastMuzzle=null;this.bossFlightTrails=0;
    }
    tick(dt,props={}){
      if(!(dt>0))return null;
      const before=this.shotsFired;
      const result=super.tick(dt,props);
      this.coreCharge=Math.max(0,this.coreCharge-dt*.16);
      this.coreRecoil=Math.max(0,this.coreRecoil-dt*4.5);
      if(this.shotsFired>before){
        const shots=this.projectiles.slice(-(this.shotsFired-before));
        for(const shot of shots){
          // The projectile starts AT THE ACTUAL CORE, never below it.
          // Spawn coordinates use the inverse camera transform supplied
          // by game.js, matching the screen-space Sentinel exactly.
          shot.originX=shot.x;
          shot.originY=Number.isFinite(props.bossY)?
            props.bossY:(props.baseY??515)-280;
          shot.laneY=(props.baseY??515)-base.SHOT[shot.kind].offset;
          shot.y=shot.originY;
          shot.descentEndX=shot.originX-
            (shot.originX-(props.playerX??340))*DEPART_FRACTION;
          shot.trail=[];
          shot.fromCore=true;
          this.muzzleFires++;
          this.lastMuzzle={x:shot.originX,y:shot.originY,
            kind:shot.kind,at:props.time||0};
          this.coreCharge=1;this.coreRecoil=.65;
        }
      }
      return result;
    }
    tickProjectiles(dt,{playerBox,playerWorldX=0,speed=500,
      invulnerable=false,leftBound=-100}={}){
      if(!(dt>0)||!playerBox)return [];
      const events=[];
      for(const shot of this.projectiles){
        if(shot.finished)continue;
        shot.age+=dt;shot.previousX=shot.x;
        if(shot.impacted){
          shot.impactAge=(shot.impactAge||0)+dt;
          if(shot.impactAge>.28)shot.finished=true;
          continue;
        }
        if(shot.age<=MUZZLE_CHARGE)continue;
        shot.charging=false;
        shot.x-=(speed+shot.speed)*dt;
        if(Number.isFinite(shot.originY)&&Number.isFinite(shot.laneY)){
          const span=Math.max(1,shot.originX-shot.descentEndX);
          const travelled=shot.originX-shot.x;
          shot.y=shot.originY+
            (shot.laneY-shot.originY)*smooth(travelled/span);
        }
        if(Array.isArray(shot.trail)){
          shot.trail.push({x:shot.x,y:shot.y});
          if(shot.trail.length>7)shot.trail.shift();
          this.bossFlightTrails++;
        }
        shot.worldX=playerWorldX+(shot.x-playerBox.x);
        const box=base.projectileBox(shot),half=box.w/2;
        if(!shot.resolved){
          const left=Math.min(shot.previousX,shot.x)-half;
          const right=Math.max(shot.previousX,shot.x)+half;
          const inX=left<playerBox.x+playerBox.w&&right>playerBox.x;
          const inY=box.y<playerBox.y+playerBox.h&&
            box.y+box.h>playerBox.y;
          if(inX&&inY){
            const impactX=clamp(shot.x,playerBox.x,playerBox.x+playerBox.w);
            const impactY=clamp(shot.y,playerBox.y,playerBox.y+playerBox.h);
            shot.x=impactX;shot.y=impactY;
            shot.resolved=true;shot.impacted=true;shot.impactAge=0;
            this.shotsHit++;
            this.sentinelImpact={x:impactX,y:impactY,kind:shot.kind,id:shot.id};
            events.push({type:'hit',shot,impactX,impactY,protected:invulnerable});
          }else if(shot.x+half<playerBox.x){
            shot.resolved=true;shot.passed=true;this.shotsCleared++;
            this.shotVisualPasses++;
            events.push({type:'clear',shot,protectedClear:invulnerable});
          }
        }
        if(shot.x+half<leftBound-55){
          shot.finished=true;this.shotVisualRemovals++;
        }
      }
      this.projectiles=this.projectiles.filter(shot=>!shot.finished);
      return events;
    }
    get snapshot(){
      return {...super.snapshot,
        muzzleFires:this.muzzleFires,
        bossFlightTrails:this.bossFlightTrails};
    }
    drawBackdrop(ctx,{time=0,width=1280,height=720,
      primary='#3feeff',secondary='#e265ff',reducedMotion=false}={}){
      const appear=smooth((time-base.SENTINEL.start)/1.25);
      const disappear=smooth((base.SENTINEL.end+1-time)/1.3);
      const alpha=appear*disappear;
      if(alpha<.01)return;
      const x=width*.80,y=height*.31;
      const r=Math.min(width*.070,height*.14);
      const active=this.projectiles.some(s=>s.charging&&!s.finished);
      const charge=active ? .14 : 0;
      const fire=this.lastMuzzle?
        clamp(1-(time-this.lastMuzzle.at)/.34,0,1):0;
      const oscillation=reducedMotion?0:Math.sin(time*5.5)*.025;
      // This rendering is EXACTLY symmetric in both axes. All rings use
      // complete contours: no missing vertices, eyes, limbs or character art.
      ctx.save();ctx.translate(x,y);
      ctx.globalAlpha=alpha;
      ctx.scale(r*(1+oscillation+charge-fire*.07),
        r*(1+oscillation+charge+fire*.04));
      ctx.lineJoin='miter';
      // Soft compact energy field, no huge detached neon frame.
      ctx.shadowColor=secondary;ctx.shadowBlur=10;
      ctx.fillStyle='rgba(13,18,35,.91)';
      ctx.beginPath();
      for(let i=0;i<8;i++){
        const a=Math.PI*(i/4-1/8);
        const px=Math.cos(a),py=Math.sin(a);
        if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
      }
      ctx.closePath();ctx.fill();
      ctx.strokeStyle=secondary;ctx.lineWidth=.053;ctx.stroke();
      ctx.shadowBlur=0;
      // Inner regular square and inner symmetry-contour.
      ctx.strokeStyle=primary;ctx.lineWidth=.047;
      ctx.strokeRect(-.69,-.69,1.38,1.38);
      ctx.fillStyle='rgba(14,23,43,.90)';
      ctx.fillRect(-.39,-.39,.78,.78);
      ctx.strokeStyle=secondary;ctx.lineWidth=.04;
      ctx.strokeRect(-.39,-.39,.78,.78);
      // Core visibly accumulates energy before each attack and recoils
      // when the shot leaves. Animated even if music is disabled.
      const power=active?Math.min(1,.5+this.coreCharge*.5):.48;
      ctx.fillStyle=fire>.04?'#ffffff':primary;
      ctx.globalAlpha=alpha*(.60+power*.4);
      const core=.18+power*.11;
      ctx.fillRect(-core,-core,core*2,core*2);
      // Three centered and symmetric armor segments, INSIDE the core.
      for(let i=0;i<3;i++){
        ctx.globalAlpha=alpha*(i<this.bossHealth?1:.19);
        ctx.fillStyle=i<this.bossHealth?secondary:'#526077';
        ctx.fillRect((i-1)*.38-.14,.58,.28,.085);
      }
      if(fire>.02){
        ctx.globalAlpha=alpha*fire*.65;ctx.strokeStyle='#ffffff';
        ctx.lineWidth=.035;
        ctx.strokeRect(-.51-fire*.15,-.51-fire*.15,
          1.02+fire*.30,1.02+fire*.30);
      }
      ctx.restore();
    }
    drawProjectiles(ctx,{primary='#3feeff',secondary='#e265ff'}={}){
      for(const shot of this.projectiles){
        if(shot.finished)continue;
        const color=shot.kind==='low'?secondary:primary;
        ctx.save();
        if(shot.impacted){
          const k=clamp(1-(shot.impactAge||0)/.28,0,1);
          ctx.globalAlpha=k;ctx.strokeStyle=color;ctx.lineWidth=2.2;
          for(let i=0;i<4;i++){
            const a=(i+.5)*Math.PI/2,d=7+(1-k)*25;
            ctx.beginPath();
            ctx.moveTo(shot.x+Math.cos(a)*d,shot.y+Math.sin(a)*d);
            ctx.lineTo(shot.x+Math.cos(a)*(d+11),
              shot.y+Math.sin(a)*(d+11));ctx.stroke();
          }
          ctx.restore();continue;
        }
        if(shot.charging){
          // A compact square is visibly charged IN the reactor.
          const size=6+11*smooth(shot.age/MUZZLE_CHARGE);
          ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=14;
          ctx.globalAlpha=.60+.40*smooth(shot.age/MUZZLE_CHARGE);
          ctx.fillRect(shot.x-size/2,shot.y-size/2,size,size);
          ctx.restore();continue;
        }
        const b=base.projectileBox(shot);
        // A brief moving history shows the departure from the real muzzle,
        // but never paints an imaginary full-length barrier or fake hitbox.
        const trail=shot.trail||[];
        if(trail.length>=2){
          ctx.strokeStyle=color;ctx.lineWidth=2.2;ctx.globalAlpha=.35;
          ctx.beginPath();
          for(let i=0;i<trail.length;i++){
            const v=trail[i];
            if(i===0)ctx.moveTo(v.x,v.y);
            else ctx.lineTo(v.x,v.y);
          }
          ctx.stroke();ctx.globalAlpha=1;
        }
        ctx.shadowColor=color;ctx.shadowBlur=12;
        ctx.fillStyle=color;
        if(shot.kind==='low'){
          ctx.beginPath();ctx.moveTo(b.x,b.y+b.h);
          ctx.lineTo(b.x+12,b.y+2);ctx.lineTo(b.x+b.w-12,b.y+2);
          ctx.lineTo(b.x+b.w,b.y+b.h);
          ctx.closePath();ctx.fill();
          ctx.shadowBlur=0;ctx.globalAlpha=.8;ctx.fillStyle='#fff8ff';
          ctx.fillRect(b.x+16,b.y+7,b.w-32,3);
        }else{
          ctx.fillRect(b.x,b.y+3,b.w,b.h-6);
          ctx.shadowBlur=0;ctx.globalAlpha=.82;ctx.fillStyle='#ffffff';
          ctx.fillRect(b.x+9,b.y+7,b.w-18,3);
        }
        ctx.restore();
      }
    }
    // Remove route announcements from the screen center entirely. They
    // collided with the persistent Zone, Trial timer and Chroma Surge HUD.
    drawOverlay(ctx,{time=0,width=1280,height=720,
      primary='#3feeff',secondary='#e265ff'}={}){
      if(time<base.SENTINEL.start||time>base.SENTINEL.end)return;
      if(!this.lastCue||time-this.lastCueAt>=.9)return;
      const color=this.lastCue==='low'?secondary:primary;
      const r=Math.min(width*.070,height*.14);
      const x=width*.8,y=height*.31+r+21;
      ctx.save();ctx.textAlign='center';ctx.fillStyle=color;
      ctx.font='800 13px system-ui';
      ctx.fillText(this.lastCue==='low'?'LOW · JUMP':'HIGH · DUCK',x,y);
      ctx.restore();
    }
  }
  return {...base,KEY,VERSION,LOWER,BRIDGE,MUZZLE_CHARGE,
    createPlan,validatePlan,installTerrain,RealityRecords,RealityEngine};
});
