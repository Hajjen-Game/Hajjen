/* CHROMA RUSH — Dash Animation 2.5 / Squash, Stretch & Speed Feel
 * Pure visual deformation. Collision shapes come only from core/geometry.js.
 */
(function(root,factory){
  const config=typeof module!=='undefined'&&module.exports?require('../core/config.js'):(root&&root.ChromaConfig);
  const api=factory(config.JUMP_FEEL,config.DASH);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaMotion=api;
})(typeof window!=='undefined'?window:null,function(RULES,DASH){
  'use strict';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const dashDuration=DASH?.duration||.30;
  // The existing jump and duck silhouettes are preserved. Dash bends the
  // TOP of the rounded cube while its bottom remains anchored, never rotates
  // the entire sprite. The front stretch is 28% stronger than the wind-up.
  const FRONT_BEND_RATIO=1.28;
  const smooth=t=>{const n=clamp(t,0,1);return n*n*(3-2*n);};
  // Readable deformation cues, derived from the SAME phase as the top bend.
  // These are visual-only; real collision remains in core/geometry.js.
  function dashFeel(remaining){
    const shear=dashShear(remaining);
    return {
      windup:clamp(-shear,0,1),
      release:clamp(shear/FRONT_BEND_RATIO,0,1),
      // Authoritative signal for trail and sound synchronization: no independent timer.
      burst:shear>.15
    };
  }
  function dashShear(remaining){
    if(!(remaining>0))return 0;
    const t=clamp(dashDuration-remaining,0,dashDuration);
    // 0–45ms wind-up backwards, 45–100ms drive forwards, 100–205ms hold,
    // then an understated elastic recoil and return by the 300ms mark.
    if(t<=.045)return t===0?0:-smooth(t/.045);
    if(t<=.100)return -1+(1+FRONT_BEND_RATIO)*smooth((t-.045)/.055);
    if(t<=.205)return FRONT_BEND_RATIO-.08*smooth((t-.100)/.105);
    if(t<=.270)return 1.20-1.26*smooth((t-.205)/.065);
    return -.06*(1-smooth((t-.270)/(dashDuration-.270)));
  }
  function dashStrength(remaining){
    // Existing glow/speed wake remains compatible with dash 2.2.
    if(!(remaining>0))return 0;
    const t=clamp(Math.min((dashDuration-remaining)/.055,remaining/.095,1),0,1);
    return smooth(t);
  }
  function elasticBodyPath(ctx,x,y,w,h,topShift,radius=8){
    // Original round-rectangle vocabulary with gently bowed side walls.
    // Top corners follow the sheared top edge; the lower corners do NOT move.
    const r=Math.min(radius,w/4,h/3);
    const s=clamp(topShift,-w*.48,w*.48);
    ctx.beginPath();
    ctx.moveTo(x+s+r,y);
    ctx.lineTo(x+s+w-r,y);
    ctx.quadraticCurveTo(x+s+w,y,x+s+w,y+r);
    ctx.bezierCurveTo(x+w+s*.83,y+h*.36,x+w+s*.17,y+h*.7,x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.bezierCurveTo(x+s*.17,y+h*.7,x+s*.83,y+h*.36,x+s,y+r);
    ctx.quadraticCurveTo(x+s,y,x+s+r,y);
    ctx.closePath();
  }
  class PlayerMotion {
    constructor(rules=RULES){this.rules=rules;this.reset();}
    reset(){this.launchTime=0;this.echoTime=0;this.landTime=0;this.impact=0;this.duckEntry=0;this.duckExit=0;this.dashTime=0;this.dashGround=false;}
    jump(){this.launchTime=0.13;this.echoTime=0;this.landTime=0;this.duckEntry=0;this.duckExit=0;}
    echoJump(){this.echoTime=.19;this.launchTime=0;this.landTime=0;this.duckEntry=0;this.duckExit=0;}
    duckStart(){this.duckEntry=.105;this.duckExit=0;this.landTime=0;}
    duckRelease(){this.duckEntry=0;this.duckExit=.12;this.dashTime=0;}
    duckCancel(){this.duckEntry=0;this.duckExit=0;this.dashTime=0;}
    dashStart(ground=false){this.dashTime=dashDuration;this.dashGround=Boolean(ground);}

    land(velocity=0){
      this.landTime=this.rules.landingAnimationSeconds;
      this.launchTime=0;this.echoTime=0;this.dashTime=0;
      this.impact=clamp((Math.abs(velocity)-220)/750,.45,1);
      return this.impact;
    }
    tick(dt){
      this.launchTime=Math.max(0,this.launchTime-dt);
      this.echoTime=Math.max(0,this.echoTime-dt);
      this.landTime=Math.max(0,this.landTime-dt);
      this.duckEntry=Math.max(0,this.duckEntry-dt);
      this.duckExit=Math.max(0,this.duckExit-dt);
      this.dashTime=Math.max(0,this.dashTime-dt);
    }
    sample({landed=true,duck=false,vy=0}={}){
      // Duck uses the existing SHORT collision box from core/geometry.js.
      // Motion stays inside that box at entry: a deliberate low snap, then settle.
      if(duck){
        const t=1-this.duckEntry/.105;
        const settle=Math.pow(Math.max(0,1-t),2);
        const dash=dashStrength(this.dashTime);
        const shear=dashShear(this.dashTime);
        const feel=dashFeel(this.dashTime);
        // Duck stays low and compact. Wind-up gathers into the back edge;
        // forward thrust widens only slightly in addition to the top bend.
        return {scaleX:1.045+.16*settle-.043*feel.windup+.068*feel.release,
          scaleY:1-.19*settle+.030*feel.windup-.030*feel.release,
          glow:.16+.14*settle+.85*dash,
          dash,shear,dashFeel:feel,dashMode:dash>0?'ground':null};
      }
      if(landed&&this.duckExit>0){
        // Springing upright is visual only; the normal hitbox is active now.
        const t=1-this.duckExit/.12;
        const y=.84+.16*t+.045*Math.sin(Math.PI*t);
        return {scaleX:1/y,scaleY:y,glow:(1-t)*.20};
      }
      let scaleY=1,glow=0;
      if(!landed){
        // Do not move hitboxes: we only change drawn body proportions.
        scaleY+=clamp(-vy/1500,-.085,.105);
        if(this.launchTime>0){
          const elapsed=.13-this.launchTime;
          if(elapsed<.025)scaleY-=.10*(1-elapsed/.025);
          else scaleY+=.035*Math.max(0,1-(elapsed-.025)/.105);
        }
        if(this.echoTime>0){
          // A distinct secondary beat: fast inward compression followed by a
          // taller spring release, all in the course's gravity-relative space.
          const t=clamp(1-this.echoTime/.19,0,1);
          const echoScale=t<.2?.76+2.2*t:1+.2*Math.sin(Math.PI*(t-.2)/.8);
          scaleY*=echoScale;
          glow=.4+.38*(1-t);
        }else glow=.2;
      }else if(this.landTime>0){
        const t=1-this.landTime/this.rules.landingAnimationSeconds;
        if(t<.45){scaleY-=.135*this.impact*(1-t/.45);}
        else{scaleY+=.042*this.impact*Math.sin((t-.45)/.55*Math.PI);}
        glow=(1-t)*.42*this.impact;
      }
      const dash=dashStrength(this.dashTime);
      const shear=dashShear(this.dashTime);
      const feel=dashFeel(this.dashTime);
      // Air Dash: a visibly compressed anticipation and a supple horizontal
      // extension, while the lower edge stays anchored in the 2.4 contour.
      return {scaleX:1/clamp(scaleY,.7,1.3)-.085*feel.windup+.145*feel.release,
        scaleY:scaleY+.065*feel.windup-.083*feel.release,glow:glow+.90*dash,
        dash,shear,dashFeel:feel,dashMode:dash>0?'air':null};
    }
  }
  return {PlayerMotion,dashStrength,dashShear,dashFeel,elasticBodyPath,FRONT_BEND_RATIO};
});
