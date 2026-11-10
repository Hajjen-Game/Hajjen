/* CHROMA RUSH — Player & Movement Identity 2.0.
 * Motion-reactive translucent cube body, halo and contact light.
 * Absolutely NO glyphs, arrows, lettering or internal stripes on the runner
 * or obstacle surfaces. Pure presentation; same physics and hitboxes.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaIdentity=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const rgba=(hex,alpha)=>{
    const v=parseInt(hex.slice(1),16);
    return 'rgba('+(v>>16)+','+((v>>8)&255)+','+(v&255)+','+clamp(alpha,0,1)+')';
  };
  // Modest pigment mixing: white stays the dominant identifying color,
  // while both edges answer Chroma Tide's actual local zone colors.
  function tint(white,color,fraction){
    const a=parseInt(white.slice(1),16),b=parseInt(color.slice(1),16);
    const t=clamp(fraction,0,1);
    return '#'+[16,8,0].map(n=>
      Math.round(((a>>n)&255)*(1-t)+((b>>n)&255)*t)
        .toString(16).padStart(2,'0')).join('');
  }
  const budget=quality=>{
    const density=clamp(quality?.density??1,.3,1);
    return {density,glow:clamp(quality?.glow??1,.15,1),premium:density>=.7};
  };
  // Read existing purely-visual clocks. Never advance state here.
  function expression(motion={},reducedMotion=false){
    if(reducedMotion)return {launch:0,echo:0,landing:0,duck:0,release:0,dash:0};
    const duration=Math.max(.01,motion.rules?.landingAnimationSeconds||.2);
    const pulse=(remaining,window)=>clamp(remaining/window,0,1);
    return {
      launch:pulse(motion.launchTime||0,.13),
      echo:pulse(motion.echoTime||0,.19),
      landing:pulse(motion.landTime||0,duration)*clamp(motion.impact??1,0,1),
      duck:pulse(motion.duckEntry||0,.105),
      release:pulse(motion.duckExit||0,.12),
      dash:pulse(motion.dashTime||0,.30)
    };
  }
  // Material changes are FULL-SURFACE gradients that conform to the cube's
  // existing curved deformation. No lettering, additional geometric symbols,
  // arrowheads, stripes, floating objects or double render passes of the world.
  function paintPlayer(ctx,{x,y,w,h,topShift=0,primary='#4bf0ff',
    secondary='#fa49b2',pose={},motion={},quality={},reducedMotion=false,
    tideResonance=0,ambientLight=0,lightRig=null,bodyPath}={}){
    if(typeof bodyPath!=='function'||!(w>0&&h>0))return;
    const p=expression(motion,reducedMotion),q=budget(quality);
    // Chroma Tide ignites the existing cube surface at the exact moment
    // the REAL palette front crosses the runner. No independent timer.
    const tide=reducedMotion?0:clamp(tideResonance,0,1);
    // The cube stays the same approved silhouette: only existing light
    // and full-surface glass pigments answer the environment's palette.
    const sceneLight=clamp(lightRig?.player?.ambient??ambientLight,0,1)*q.glow;
    const rimLift=lightRig?.player?.edgeBoost||0;
    const burst=clamp(p.echo*.7+p.dash*.8+p.landing*.65+p.launch*.35+tide*.85,0,1);
    const drive=clamp(p.dash*.52+p.echo*.27+p.duck*.12+tide*.32,0,.7);
    ctx.save();
    // The glow is welded to the actual moving silhouette; no halo ring.
    ctx.shadowColor=tide>.25?'#ffffff':burst>.28?secondary:primary;
    ctx.shadowBlur=(22+Math.min(21,(pose.glow||0)*12+burst*11+tide*6)+
      sceneLight*6)*q.glow;
    const shell=ctx.createLinearGradient(x+topShift*.35,y,x+w,y+h);
    shell.addColorStop(0,'#ffffff');
    shell.addColorStop(.23,burst>.4?'#ffffff':'#f7fcff');
    shell.addColorStop(.66,tint('#f4faff',primary,.12+p.launch*.14+p.landing*.07+tide*.18+sceneLight*.105));
    shell.addColorStop(1,tint('#e2effc',secondary,.16+drive*.28+tide*.13+sceneLight*.12));
    ctx.fillStyle=shell;
    bodyPath(x,y,w,h,8,topShift);ctx.fill();
    ctx.shadowBlur=(7+burst*8)*q.glow;
    ctx.strokeStyle=tide>.28?'#f6fdff':burst>.4?secondary:primary;
    ctx.lineWidth=2.1+Math.min(.9,burst*.65+tide*.26)+rimLift;
    ctx.stroke();
    if(q.premium){
      // One broad optical coating, not an inset icon or an engraved line.
      // Entire second fill follows the approved cube silhouette.
      const sheen=ctx.createLinearGradient(x,y+h*.1,x+w,y+h*.9);
      sheen.addColorStop(0,'rgba(255,255,255,.38)');
      sheen.addColorStop(.48,'rgba(255,255,255,.06)');
      sheen.addColorStop(1,rgba(primary,.11+burst*.08+tide*.07));
      ctx.fillStyle=sheen;ctx.shadowBlur=0;
      bodyPath(x+2,y+2,w-4,h-4,5,topShift*.78);
      ctx.fill();
    }
    ctx.restore();
  }
  // Short contact glow expands WITH the landing / duck compression.
  // It stays on the real surface, including when the course is inverted.
  function drawContact(ctx,{x,surface,width=44,primary='#4bf0ff',
    secondary='#fa49b2',motion={},quality={},reducedMotion=false,tideResonance=0}={}){
    if(!Number.isFinite(surface))return;
    const p=expression(motion,reducedMotion),q=budget(quality);
    const tide=reducedMotion?0:clamp(tideResonance,0,1);
    const impulse=clamp(p.landing*.8+p.duck*.35+p.release*.18+tide*.40,0,1);
    const w=clamp(width*(1+impulse*.38),16,90);
    ctx.save();ctx.shadowBlur=0;
    ctx.fillStyle=rgba(impulse>.35?secondary:primary,.15+impulse*.35);
    ctx.fillRect(x-w*.5,surface+3,w,2.5+impulse*.9);
    // Performance paints only a single straight contact strip.
    if(q.premium&&impulse>.15){
      ctx.globalAlpha=impulse*.24;ctx.fillStyle=primary;
      ctx.fillRect(x-w*.31,surface+7,w*.62,1.4);
    }
    ctx.restore();
  }
  return {budget,expression,paintPlayer,drawContact,tint};
});
