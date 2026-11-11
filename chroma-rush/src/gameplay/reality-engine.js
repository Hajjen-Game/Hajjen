/* CHROMA RUSH — Reality Engine 1.0.
 * Opt-in 90s authored showcase: two safe World Folds, a non-collidable
 * Sentinel, and music-independent world resonance on real clears.
 * Does not add buttons, alter Arcade, modify hitboxes, or generate hazards.
 */
(function(root,factory){
  const config=typeof module!=='undefined'&&module.exports?
    require('../core/config.js'):(root&&root.ChromaConfig);
  const api=factory(config?.GAME);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaReality=api;
})(typeof window!=='undefined'?window:null,function(GAME){
  'use strict';
  const ID='REALITY-001',DURATION=90,COURSE_REVISION=1,KEY='chromaRushRealityV1';
  const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
  const PHRASES=Object.freeze([
    Object.freeze({start:4.1,cadence:1.36,actions:'JDJJDJD'}),
    Object.freeze({start:14.3,cadence:1.35,actions:'JJDDJJ'}),
    Object.freeze({start:25.0,cadence:1.28,actions:'DJJJDJ'}),
    Object.freeze({start:41.5,cadence:1.22,actions:'JJDJJJDDJJ'}),
    Object.freeze({start:61.5,cadence:1.20,actions:'JJJDDJJDJJD'}),
    Object.freeze({start:76.0,cadence:1.14,actions:'DJJJDDJJJJ'})
  ]);
  const ACTIONS=Object.freeze(PHRASES.flatMap(p=>[...p.actions].map((action,i)=>
    Object.freeze([Number((p.start+i*p.cadence).toFixed(3)),action==='J'?'jump':'duck']))));
  // Real terrain gaps with hand-verified takeoff and landing buffers.
  const GAP_TIMES=Object.freeze([23.2,58.8]);
  // Scripted warning begins only after the previous challenge is over.
  // Entire change takes ~1.48s (warning + visual fold).
  const FOLDS=Object.freeze([
    Object.freeze({at:34,ceiling:true}),
    Object.freeze({at:55,ceiling:false})
  ]);
  const SENTINEL=Object.freeze({start:61.5,end:86.5});
  function distanceAt(){
    const step=.025,table=[0];let prev=GAME.speedAt(0,1);
    for(let i=1;i<=Math.ceil(DURATION/step)+1;i++){
      const next=GAME.speedAt(i*step,1);
      table[i]=table[i-1]+(prev+next)*step/2;prev=next;
    }
    return t=>{
      const x=clamp(t/step,0,table.length-2),i=Math.floor(x);
      return table[i]+(table[i+1]-table[i])*(x-i);
    };
  }
  function createPlan({playerX=340}={}){
    const at=distanceAt(),offset=Number.isFinite(playerX)?playerX:340;
    const obstacles=ACTIONS.map(([time,type],i)=>{
      const speed=GAME.speedAt(time,1),v=clamp((speed-550)/1650,0,1);
      const tier=Math.floor(v*v*(3-2*v)*10+1e-9);
      return Object.freeze({time,type,worldX:Math.round(offset+at(time)),
        width:71+15*tier,height:type==='jump'?64+i%6:126+(i*7)%16,phase:'REALITY'});
    });
    const gaps=GAP_TIMES.map((time,i)=>Object.freeze({
      id:i+1,time,start:Math.round(offset+at(time)),
      width:Math.round(GAME.speedAt(time,1)*(.37+i*.02))
    }));
    const finish=Math.ceil(offset+at(DURATION)+GAME.speedAt(DURATION,1)*3);
    return Object.freeze({id:ID,revision:COURSE_REVISION,duration:DURATION,finish,
      obstacles:Object.freeze(obstacles),gaps:Object.freeze(gaps),
      signature:obstacles.map(o=>[o.time,o.type,o.worldX,o.width].join(':'))
        .concat(gaps.map(g=>[g.time,g.start,g.width].join(':'))).join('|')});
  }
  function validatePlan(plan){
    if(!plan||plan.id!==ID||plan.revision!==COURSE_REVISION||
      plan.duration!==DURATION||plan.obstacles?.length!==ACTIONS.length||
      plan.gaps?.length!==GAP_TIMES.length)return false;
    const flight=Math.abs(2*GAME.jumpVelocity/GAME.gravity);
    for(let i=0;i<plan.obstacles.length;i++){
      const e=plan.obstacles[i],prev=plan.obstacles[i-1];
      if(!Number.isFinite(e.worldX)||e.width<71||e.width>221||e.height<=0||
        e.type!==ACTIONS[i][1]||e.time!==ACTIONS[i][0])return false;
      if(prev){
        const minimum=Math.max(1.04,(prev.type==='jump'?flight:
          GAME.duckDuration+GAME.duckRecovery)+
          (prev.width+36)/Math.max(300,GAME.speedAt(prev.time,1))+.14);
        if(e.time-prev.time+1e-6<minimum||
          e.worldX<=prev.worldX+prev.width)return false;
      }
    }
    for(let i=0;i<plan.gaps.length;i++){
      const g=plan.gaps[i],previous=plan.gaps[i-1],s=GAME.speedAt(g.time,1);
      if(g.time!==GAP_TIMES[i]||!Number.isFinite(g.start)||
        g.width/s<.36||g.width/s>.41||
        (previous&&g.start<=previous.start+previous.width+s*2))return false;
      for(const o of plan.obstacles){
        if(Math.abs(o.time-g.time)<1.68)return false;
        const before=g.start-(o.worldX+o.width);
        const after=o.worldX-(g.start+g.width);
        if(before>=0&&before<s*1.03)return false;
        if(after>=0&&after<s*1.03)return false;
        if(before<0&&after<0)return false;
      }
    }
    for(const fold of FOLDS){
      if(plan.gaps.some(g=>Math.abs(g.time-fold.at)<3.15)||
        plan.obstacles.some(o=>Math.abs(o.time-fold.at)<2.4))return false;
    }
    return true;
  }
  function installTerrain(terrain,plan,baseY=515){
    if(!validatePlan(plan))throw new Error('Invalid Reality Trial plan');
    let cursor=0;const segments=[],gaps=[];
    for(const g of plan.gaps){
      segments.push({type:'flat',start:cursor,end:g.start,y0:baseY,y1:baseY});
      const gap={type:'gap',start:g.start,end:g.start+g.width,y0:baseY,y1:baseY,
        id:g.id,resolved:false,missed:false,trial:true};
      segments.push(gap);gaps.push(gap);cursor=gap.end;
    }
    segments.push({type:'flat',start:cursor,end:plan.finish,y0:baseY,y1:baseY});
    terrain.baseY=baseY;terrain.segments=segments;terrain.gaps=gaps;
    terrain.generated=plan.finish;terrain.lastGapEnd=gaps[gaps.length-1].end;
    terrain.nextId=gaps.length+1;return terrain;
  }
  function number(value){const n=Number(value);return Number.isFinite(n)?clamp(Math.floor(n),0,1e9):0}
  class RealityRecords{
    constructor(storage=null){
      this.storage=storage;this.data={bestScore:0,attempts:0,completions:0,lastScore:0};
      try{
        const raw=JSON.parse(storage?.getItem(KEY)||'null');
        if(raw&&typeof raw==='object'&&!Array.isArray(raw))
          for(const name of Object.keys(this.data))this.data[name]=number(raw[name]);
      }catch(_){}
    }
    get bestScore(){return this.data.bestScore}
    finish({score=0,completed=false}={}){
      const points=number(score),old=this.data.bestScore;
      this.data.attempts++;this.data.lastScore=points;
      if(completed){this.data.completions++;this.data.bestScore=Math.max(points,old)}
      try{this.storage?.setItem(KEY,JSON.stringify(this.data))}catch(_){}
      return {completed:Boolean(completed),newBest:Boolean(completed)&&points>old,
        bestScore:this.data.bestScore,previousBest:old};
    }
  }
  class RealityEngine{
    constructor(){this.reset()}
    reset(){
      this.foldIndex=0;this.foldsCompleted=0;this.foldWarnings=0;
      this.resonance=0;this.successfulClears=0;this.sentinelClears=0;
      this.sentinelTriggered=false;this.lastEvent=null;
    }
    tick(dt,{time=0,gravity=null,safe=false,reducedMotion=false}={}){
      if(!(dt>0)||!gravity)return null;
      this.resonance=Math.max(0,this.resonance-dt*.32);
      const fold=FOLDS[this.foldIndex];
      let event=null;
      if(fold&&time>=fold.at&&!gravity.pending&&!gravity.shifting){
        if(gravity.requestScripted(fold.ceiling)){
          this.foldIndex++;this.foldWarnings++;event='fold_warning';
        }
      }
      // No automatic ceiling return: the second authored Fold takes us home.
      const shift=gravity.tick(dt,{safe,reducedMotion,autoReturn:false});
      if(shift==='begin')event='fold_begin';
      if(shift==='complete'){this.foldsCompleted++;event='fold_complete'}
      if(!this.sentinelTriggered&&time>=SENTINEL.start){
        this.sentinelTriggered=true;event='sentinel_enter';
      }
      this.lastEvent=event;return event;
    }
    onClear({time=0,precision=false,master=false,protectedClear=false}={}){
      if(protectedClear)return;
      this.successfulClears++;
      if(time>=SENTINEL.start&&time<=SENTINEL.end)this.sentinelClears++;
      // Real clear -> atmosphere; no phantom combo, colliders, or score.
      this.resonance=clamp(this.resonance+(master?.32:precision?.25:.14),0,1);
    }
    get snapshot(){return {foldWarnings:this.foldWarnings,
      foldsCompleted:this.foldsCompleted,clears:this.successfulClears,
      sentinelClears:this.sentinelClears};}
    drawBackdrop(ctx,{time=0,width=1280,height=720,primary='#3feeff',
      secondary='#e265ff',quality={},reducedMotion=false}={}){
      const density=clamp(quality.density??1,.3,1);
      ctx.save();
      // World Symphony: only translucent atmospheric bars high above the
      // physical running plane. Works with music muted and reduced motion.
      const power=clamp(this.resonance,0,1);
      if(power>.03){
        const count=density>.7?5:3;
        for(let i=0;i<count;i++){
          const y=height*(.31+i*.055);
          ctx.globalAlpha=power*(.065+.013*i);
          ctx.fillStyle=i%2?secondary:primary;
          ctx.fillRect(width*.05,y,width*(.25+.11*i),2+i%2);
        }
      }
      // Sentinel is scenery, NOT a collider or projectile. Keep it in the
      // upper-right SKY and behind actual terrain/obstacles and HUD.
      const fade=clamp((time-SENTINEL.start)/1.4,0,1)*
        clamp((SENTINEL.end+1.5-time)/1.5,0,1);
      if(fade>0){
        const x=width*.78,y=height*.30,r=Math.min(width,height)*.087;
        ctx.translate(x,y);
        const pulse=reducedMotion?1:1+.025*Math.sin(time*4);
        ctx.scale(r*pulse,r*pulse);
        ctx.globalAlpha=fade*(.40+.17*power);
        ctx.strokeStyle=secondary;ctx.lineWidth=.058;
        ctx.fillStyle='#151731';
        ctx.beginPath();
        for(let i=0;i<6;i++){
          const a=i*Math.PI/3-Math.PI/6;
          const px=Math.cos(a),py=Math.sin(a);
          if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
        }
        ctx.closePath();ctx.fill();ctx.stroke();
        ctx.fillStyle=primary;ctx.globalAlpha=fade*(.35+.45*power);
        ctx.beginPath();ctx.moveTo(-.42,-.06);ctx.lineTo(.15,-.30);
        ctx.lineTo(.55,0);ctx.lineTo(.12,.30);ctx.closePath();ctx.fill();
        ctx.globalAlpha=fade*.3;ctx.strokeStyle=primary;ctx.lineWidth=.035;
        ctx.beginPath();ctx.moveTo(-1.15,0);ctx.lineTo(-1.7,-.4);ctx.moveTo(1.15,0);ctx.lineTo(1.7,.4);ctx.stroke();
      }
      ctx.restore();
    }
    drawOverlay(ctx,{time=0,width=1280,height=720,primary='#3feeff'}={}){
      // Label only during the actual choreographed encounter; no fake
      // obstacle and no screen-wide flashes, even on the lowest graphics tier.
      if(time<SENTINEL.start||time>SENTINEL.start+2.2)return;
      const alpha=clamp((time-SENTINEL.start)/.3,0,1)*
        clamp((SENTINEL.start+2.2-time)/.7,0,1);
      ctx.save();ctx.globalAlpha=alpha*.8;ctx.textAlign='center';
      ctx.font='800 16px system-ui';ctx.fillStyle=primary;
      ctx.fillText('SENTINEL · SURVIVE THE PATTERN',width*.5,height*.26);
      ctx.restore();
    }
  }
  return {ID,DURATION,COURSE_REVISION,KEY,PHRASES,ACTIONS,GAP_TIMES,FOLDS,SENTINEL,
    createPlan,validatePlan,installTerrain,RealityRecords,RealityEngine};
});
