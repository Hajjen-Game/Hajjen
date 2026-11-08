/* CHROMA RUSH — Jump & Duck Motion 1.0
 * Pure visual deformation. Collision shapes come only from core/geometry.js.
 */
(function(root,factory){
  const config=typeof module!=='undefined'&&module.exports?require('../core/config.js'):(root&&root.ChromaConfig);
  const api=factory(config.JUMP_FEEL);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaMotion=api;
})(typeof window!=='undefined'?window:null,function(RULES){
  'use strict';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  class PlayerMotion {
    constructor(rules=RULES){this.rules=rules;this.reset();}
    reset(){this.launchTime=0;this.echoTime=0;this.landTime=0;this.impact=0;this.duckEntry=0;this.duckExit=0;this.dashTime=0;this.dashGround=false;}
    jump(){this.launchTime=0.13;this.echoTime=0;this.landTime=0;this.duckEntry=0;this.duckExit=0;}
    echoJump(){this.echoTime=.19;this.launchTime=0;this.landTime=0;this.duckEntry=0;this.duckExit=0;}
    duckStart(){this.duckEntry=.105;this.duckExit=0;this.landTime=0;}
    duckRelease(){this.duckEntry=0;this.duckExit=.12;}
    duckCancel(){this.duckEntry=0;this.duckExit=0;this.dashTime=0;}
    dashStart(ground=false){this.dashTime=.24;this.dashGround=Boolean(ground);}

    land(velocity=0){
      this.landTime=this.rules.landingAnimationSeconds;
      this.launchTime=0;this.echoTime=0;
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
        const dash=this.dashTime>0?Math.sin(Math.PI*this.dashTime/.24):0;
        return {scaleX:1.045+.16*settle+.19*dash,scaleY:1-.19*settle-.11*dash,
          glow:.16+.14*settle+.50*dash};
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
      const dash=this.dashTime>0?Math.sin(Math.PI*this.dashTime/.24):0;
      // A brisk horizontal streak silhouette, purely cosmetic: hitboxes
      // remain fixed and air dash never adds height or vertical velocity.
      return {scaleX:1/clamp(scaleY,.7,1.3)+.22*dash,
        scaleY:scaleY-.06*dash,glow:glow+.55*dash};
    }
  }
  return {PlayerMotion};
});
