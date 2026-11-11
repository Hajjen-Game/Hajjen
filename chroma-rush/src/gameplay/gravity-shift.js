/* CHROMA RUSH — Gravity Shift / Ceiling Run 1.0.
 * The physics engine stays in canonical floor coordinates; a mirrored camera
 * presents exactly equivalent ceiling running, inverted jumps and collisions.
 * The HUD, controls and atmospheric background remain upright. No RNG.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaGravityShift=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
  const START_ZONE=8,INTERVAL_ZONES=8,WARNING_SECONDS=.9,SHIFT_SECONDS=.58,GRACE_SECONDS=.28;
  // Short excursions: the old zone-8 to zone-16 inversion lasted ~96 seconds.
  // Ceiling time is now a brief set-piece, with a protected safe return.
  const CEILING_HOLD_SECONDS=16;
  class GravityShift {
    constructor(){this.reset()}
    reset(){
      this.ceiling=false;this.targetCeiling=false;this.phase='idle';
      this.warningLeft=0;this.shiftAge=0;this.grace=0;this.count=0;
      this.ceilingAge=0;
    }
    requestForZone(zone){
      const z=Math.floor(Number(zone)||0);
      if(z<START_ZONE||(z-START_ZONE)%INTERVAL_ZONES!==0||this.phase!=='idle')return false;
      this.targetCeiling=!this.ceiling;
      this.phase='warning';this.warningLeft=WARNING_SECONDS;
      return true;
    }
    // Opt-in authored Trials can request a one-off orientation change.
    // Regular zone scheduling and the Arcade auto-return remain unchanged.
    requestScripted(ceiling){
      if(this.phase!=='idle'||this.ceiling===Boolean(ceiling))return false;
      this.targetCeiling=Boolean(ceiling);
      this.phase='warning';this.warningLeft=WARNING_SECONDS;
      return true;
    }
    tick(dt,{safe=false,reducedMotion=false,autoReturn=true}={}){
      if(!(dt>0))return null;
      this.grace=Math.max(0,this.grace-dt);
      if(autoReturn&&this.phase==='idle'&&this.ceiling){
        this.ceilingAge+=dt;
        if(this.ceilingAge>=CEILING_HOLD_SECONDS){
          // Return requires the exact same safe-runway clearance as entry.
          // A distinct event lets the arcade reserve room before the flip.
          this.targetCeiling=false;this.phase='warning';
          this.warningLeft=WARNING_SECONDS;this.ceilingAge=0;
          return 'return_warning';
        }
      }
      if(this.phase==='warning'){
        this.warningLeft=Math.max(0,this.warningLeft-dt);
        if(this.warningLeft===0&&safe){
          if(reducedMotion){
            this.ceiling=this.targetCeiling;this.phase='idle';this.grace=GRACE_SECONDS;this.count++;
            this.ceilingAge=0;
            return 'complete';
          }
          this.phase='shifting';this.shiftAge=0;
          return 'begin';
        }
      }else if(this.phase==='shifting'){
        this.shiftAge=Math.min(SHIFT_SECONDS,this.shiftAge+dt);
        if(this.shiftAge>=SHIFT_SECONDS){
          this.ceiling=this.targetCeiling;this.phase='idle';
          this.grace=GRACE_SECONDS;this.count++;this.ceilingAge=0;
          return 'complete';
        }
      }
      return null;
    }
    get shifting(){return this.phase==='shifting'}
    get pending(){return this.phase==='warning'}
    get protected(){return this.shifting||this.grace>0}
    get mix(){
      if(!this.shifting)return this.ceiling?1:0;
      const t=smooth(this.shiftAge/SHIFT_SECONDS);
      return this.ceiling?1-t:t;
    }
    // Canonical feet/obstacle boxes always use the normal floor physics.
    // This is a 2D isometry at either endpoint: ceiling jumps screen-down.
    screenY(y,height=720){return height*this.mix+(1-2*this.mix)*y}
    applyCourseTransform(ctx,height=720){
      const t=this.mix;
      if(t<=0)return;
      ctx.translate(0,height*t);
      let scaleY=1-2*t;
      // Preserve a narrow electric slit rather than a singular Canvas matrix
      // at the exact halfway frame. No hitbox uses this visual approximation.
      if(Math.abs(scaleY)<.055)scaleY=scaleY<0?-.055:.055;
      ctx.scale(1,scaleY);
    }
    drawOverlay(ctx,{width=1280,height=720,primary='#3feeff',secondary='#53b5ff',
      quality={density:1,glow:1},reducedMotion=false,scripted=false}={}){
      if(!ctx||!width||!height)return;
      const density=clamp(quality.density??1,.3,1);
      const glow=clamp(quality.glow??1,.15,1);
      ctx.save();
      if(this.pending){
        const y=height*.21,alpha=.75+.18*Math.sin(this.warningLeft*13)**2;
        const text=scripted?(this.targetCeiling?'WORLD FOLD  ·  CEILING':'WORLD FOLD  ·  FLOOR'):
          (this.targetCeiling?'GRAVITY SHIFT  ·  CEILING':'GRAVITY SHIFT  ·  FLOOR');
        ctx.textAlign='center';ctx.font='800 19px system-ui';
        ctx.fillStyle='rgba(5,10,28,.66)';ctx.fillRect(width*.5-190,y-30,380,50);
        ctx.fillStyle='#ffffff';ctx.globalAlpha=alpha;ctx.shadowColor=primary;
        ctx.shadowBlur=10*glow;ctx.fillText(text,width*.5,y+2);
        ctx.globalAlpha=.8;ctx.fillStyle=secondary;
        ctx.fillRect(width*.5-116,y+11,232*(1-this.warningLeft/WARNING_SECONDS),2);
      }else if(this.shifting){
        const strength=Math.sin(Math.PI*this.shiftAge/SHIFT_SECONDS);
        const y=height*.5;
        ctx.globalAlpha=.14*strength*density;ctx.fillStyle=primary;
        ctx.fillRect(0,y-24,width,48);
        ctx.shadowColor=secondary;ctx.shadowBlur=22*glow;
        ctx.strokeStyle='#ffffff';ctx.lineWidth=2.5;
        ctx.globalAlpha=(.27+.48*strength)*density;
        ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();
        if(!reducedMotion&&density>.5){
          ctx.strokeStyle=secondary;ctx.lineWidth=1.5;
          for(let i=-1;i<=1;i+=2){
            ctx.globalAlpha=.23*strength*density;
            ctx.beginPath();ctx.moveTo(0,y+i*17);ctx.lineTo(width,y+i*17);ctx.stroke();
          }
        }
      }else if(this.ceiling){
        // Persistent, inexpensive orientation cue; always shown in Low mode.
        const y=height*.18;
        ctx.textAlign='right';ctx.font='800 15px system-ui';
        ctx.fillStyle=primary;ctx.globalAlpha=.85;
        ctx.shadowColor=primary;ctx.shadowBlur=5*glow;
        ctx.fillText('⇵  CEILING RUN',width-23,y);
      }
      ctx.restore();
    }
  }
  return {GravityShift,START_ZONE,INTERVAL_ZONES,WARNING_SECONDS,
    SHIFT_SECONDS,GRACE_SECONDS,CEILING_HOLD_SECONDS};
});
