/* CHROMA RUSH — High-Speed Readability & Fairness Audit 1.0.
 * One source of truth for on-screen recognition and approach time.
 * It never changes game speed, jump strength, obstacle collision or RNG.
 * Pure planning/metrics plus a small optional side-on early-warning renderer.
 */
(function(root,factory){
  const config=typeof module!=='undefined'&&module.exports?require('../core/config.js'):(root&&root.ChromaConfig);
  const api=factory(config.GAME,config.JUMP_FEEL);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaHighSpeedFairness=api;
})(typeof window!=='undefined'?window:null,function(GAME,JUMP_FEEL){
  'use strict';
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const PLAYER_HALF_WIDTH=22;
  const STANDARD_PAD=90;
  // Including human decision time, not just physical possibility. These are
  // conservative *design budgets*, not measured population reaction times.
  // Echo requires first takeoff + the second intentional press at >=95ms.
  const ACTIONS=Object.freeze({
    jump:Object.freeze({lead:.57,label:'JUMP',mark:'↑',cost:1}),
    duck:Object.freeze({lead:.56,label:'DUCK',mark:'↓',cost:1}),
    echo:Object.freeze({lead:1.00,label:'2× JUMP',mark:'↑↑',cost:3}),
    gap:Object.freeze({lead:.66,label:'GAP',mark:'↑',cost:2}),
    'echo-gap':Object.freeze({lead:1.10,label:'2× GAP',mark:'↑↑',cost:3}),
    'dash-jump':Object.freeze({lead:1.25,label:'AIR DASH',mark:'↑+',cost:3}),
    'dash-duck':Object.freeze({lead:1.18,label:'GROUND DASH',mark:'↓+',cost:3})
  });
  function rule(type){return ACTIONS[type]||ACTIONS.jump;}
  function horizonFor(type,{speed=370,playerX=300,viewportWidth=1280}={}){
    const v=Math.max(300,speed);
    const standard=viewportWidth+STANDARD_PAD;
    // Spawn only farther ahead when the original fixed-screen approach
    // cannot deliver enough *time*. A tiny safety margin absorbs the 22px
    // front half of the square, fixed-step jitter and variable obstacle width.
    return Math.max(standard,playerX+PLAYER_HALF_WIDTH+
      v*(rule(type).lead+.06));
  }
  function metrics(type,{x,playerX=300,viewportWidth=1280,speed=370}={}){
    const v=Math.max(300,speed),r=rule(type);
    const atImpact=Math.max(0,(x-playerX-PLAYER_HALF_WIDTH)/v);
    const visible=Math.max(0,(Math.min(x,viewportWidth)-playerX-PLAYER_HALF_WIDTH)/v);
    const offscreen=Math.max(0,atImpact-visible);
    return {type,requiredSeconds:r.lead,leadSeconds:atImpact,
      visibleSeconds:visible,earlyCueSeconds:offscreen,
      marginSeconds:atImpact-r.lead,
      // An offscreen object needs NO HUD warning when its natural on-screen
      // approach already exceeds the action's recognition-time budget.
      needsCue:visible+1e-5<r.lead&&offscreen>.015,
      fair:atImpact+1e-5>=r.lead};
  }
  function warning({hurdles=[],gaps=[],distance=0,playerX=300,
    viewportWidth=1280,speed=370}={}){
    const v=Math.max(300,speed);
    let best=null;
    function consider(type,worldX,screenX,key){
      if(!(screenX>viewportWidth-4))return;
      const m=metrics(type,{x:screenX,playerX,viewportWidth,speed:v});
      if(!m.needsCue||!(m.leadSeconds>0&&m.leadSeconds<=2.2))return;
      // Only show warnings which have genuine offscreen world geometry,
      // not a predicted or randomly chosen future action.
      if(!best||m.leadSeconds<best.seconds)
        best={type,label:rule(type).label,mark:rule(type).mark,
          seconds:m.leadSeconds,key,worldX};
    }
    for(const h of hurdles){
      if(h.hit||h.cleared)continue;
      consider(h.type,h.worldX,h.x,h.worldX);
    }
    for(const gap of gaps){
      if(gap.resolved)continue;
      const type=gap.echoChallenge?'echo-gap':'gap';
      consider(type,gap.start,gap.start-distance,gap.id);
    }
    return best;
  }
  // No rings, screen flashes, large arrows or extra particles. Kept outside
  // the gravity-flipped course so the label is legible while ceiling running.
  function drawWarning(ctx,cue,{width=1280,height=720,primary='#3feeff',
    glow=1,reducedMotion=false}={}){
    if(!ctx||!cue)return false;
    const x=width-171,y=height*.30;
    ctx.save();
    ctx.globalAlpha=.94;
    ctx.fillStyle='rgba(4,10,25,.84)';
    ctx.fillRect(x-20,y-21,168,44);
    ctx.strokeStyle=primary;ctx.lineWidth=1.6;
    ctx.beginPath();ctx.moveTo(x-20,y-21);ctx.lineTo(x-20,y+23);ctx.stroke();
    ctx.fillStyle='#f7fcff';
    ctx.textAlign='left';ctx.font='900 15px system-ui';
    ctx.shadowColor=primary;ctx.shadowBlur=7*clamp(glow,0,1);
    ctx.fillText(cue.mark+'  '+cue.label,x-9,y-2);
    ctx.shadowBlur=0;
    ctx.fillStyle='#b3d4e4';ctx.font='700 10px system-ui';
    const seconds=Math.max(0,cue.seconds);
    ctx.fillText(seconds.toFixed(1)+'s AHEAD',x-9,y+14);
    ctx.restore();
    return true;
  }
  // Conservative analytic report for offline audits. A scenario is safe if
  // its *total* advance warning is >= the design budget; screen-only warning
  // is reported separately so reviewers can see where HUD telegraphs matter.
  function scenario(type,{speed,playerX=339,viewportWidth=1280}={}){
    const oldX=viewportWidth+STANDARD_PAD;
    const plannedX=horizonFor(type,{speed,playerX,viewportWidth});
    const old=metrics(type,{x:oldX,playerX,viewportWidth,speed});
    const planned=metrics(type,{x:plannedX,playerX,viewportWidth,speed});
    return {type,speed,old,planned,earlyWarningRequired:planned.needsCue};
  }
  return {ACTIONS,STANDARD_PAD,PLAYER_HALF_WIDTH,rule,horizonFor,metrics,
    warning,drawWarning,scenario};
});
