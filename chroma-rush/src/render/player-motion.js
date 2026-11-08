/* CHROMA RUSH — Soft Lean Dash 2.3 / Jump & Duck Motion 1.0
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
  // The cube stays a ROUNDED CUBE. Dash blends a natural clockwise lean
  // (forward is +x in course space) with tiny squash/stretch. The normal
  // jump/duck silhouettes stay intact and gameplay hitboxes are unchanged.
  function dashStrength(remaining){
    if(!(remaining>0))return 0;
    const t=clamp(Math.min((dashDuration-remaining)/.055,remaining/.095,1),0,1);
    return t*t*(3-2*t); // smoothstep: no hard angular snaps
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
        // Ground Dash stays compact: slight forward lean, not a stretched
        // projectile. The underlying duck collision box is unchanged.
        return {scaleX:1.045+.16*settle+.075*dash,
          scaleY:1-.19*settle-.025*dash,
          glow:.16+.14*settle+.85*dash,
          dash,tilt:.052*dash,dashMode:dash>0?'ground':null};
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
      // Air Dash feels dynamic through a graceful forward rotation and a
      // touch of horizontal stretch: no pointed polygon or hard edges.
      return {scaleX:1/clamp(scaleY,.7,1.3)+.13*dash,
        scaleY:scaleY-.045*dash,glow:glow+.90*dash,
        dash,tilt:.215*dash,dashMode:dash>0?'air':null};
    }
  }
  return {PlayerMotion,dashStrength};
});
