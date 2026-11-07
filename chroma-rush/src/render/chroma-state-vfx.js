/* CHROMA RUSH — Chroma State 2.0 visual choreography.
 * Deterministic cosmetic layers, no score/Flow/Director/physics dependencies.
 * Camera is strictly side-on: horizontal streaks, linear light rails, and
 * detached corners, never radial rings or a full-screen flash.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaStateVFX=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const rgba=(hex,alpha)=>{
    const n=parseInt(hex.slice(1),16);
    return 'rgba('+(n>>16)+','+((n>>8)&255)+','+(n&255)+','+clamp(alpha,0,1)+')';
  };
  const TAU=Math.PI*2;
  const IN_SECONDS=.42,OUT_SECONDS=.26,ENTRY_SECONDS=.62;
  class ChromaStateVisuals {
    constructor(){this.reset()}
    reset(){
      this.active=false;this.intensity=0;this.elapsed=0;
      this.entryAge=ENTRY_SECONDS;this.entryCount=0;this.exitCount=0;
    }
    setActive(next){
      const wanted=Boolean(next);
      if(wanted===this.active)return null;
      this.active=wanted;
      if(wanted){this.entryAge=0;this.entryCount++;return 'enter'}
      this.entryAge=ENTRY_SECONDS;this.exitCount++;return 'exit';
    }
    tick(dt,{reducedMotion=false}={}){
      if(!(dt>0))return;
      this.elapsed+=dt;
      this.entryAge=Math.min(ENTRY_SECONDS,this.entryAge+dt);
      if(reducedMotion){this.intensity=this.active?1:0;return}
      this.intensity=clamp(this.intensity+(this.active?dt/IN_SECONDS:-dt/OUT_SECONDS),0,1);
    }
    get visible(){return this.intensity>1e-3}
    get arrival(){return this.active?Math.max(0,1-this.entryAge/ENTRY_SECONDS):0}
    drawEnvironment(ctx,{width,height,groundY,primary,secondary,quality={},reducedMotion=false}={}){
      if(!this.visible||reducedMotion)return;
      const density=clamp(quality.density??1,.3,1),glow=clamp(quality.glow??1,.15,1);
      const strength=this.intensity,arrival=this.arrival;
      ctx.save();
      // Elevated ambient illumination, restrained above the playable horizon.
      // Transparent streaks leave hazards, gaps, and terrain contrast intact.
      const top=height*.43;
      const ambient=ctx.createLinearGradient(0,top-82,0,top+70);
      ambient.addColorStop(0,rgba(primary,0));
      ambient.addColorStop(.51,rgba(primary,(.056+.035*arrival)*strength*density));
      ambient.addColorStop(1,rgba(secondary,0));
      ctx.fillStyle=ambient;ctx.fillRect(0,top-82,width,152);
      const count=density<.5?4:density<.8?7:11;
      for(let i=0;i<count;i++){
        const row=(i+.55)/count;
        const y=height*(.18+row*.46);
        const phase=this.elapsed*(55+i%3*8)+i*117;
        const x=((phase%(width+310))+(width+310))%(width+310)-110;
        const span=(35+(i%4)*25)*(density<.5?.72:1);
        ctx.strokeStyle=i%2===0?primary:secondary;
        ctx.globalAlpha=(.06+.07*(i%3)/2)*strength*density;
        ctx.lineWidth=i%3===0?1.8:1;
        ctx.shadowColor=primary;ctx.shadowBlur=5*glow;
        ctx.beginPath();ctx.moveTo(x-span,y);ctx.lineTo(x,y);ctx.stroke();
      }
      // Track-resonance rails are short, parallel and horizontal, with no
      // full-width glow overlay that might conceal a gap edge.
      ctx.globalAlpha=(.09+.055*arrival)*strength*density;
      ctx.strokeStyle=secondary;ctx.lineWidth=1.6;
      ctx.shadowColor=secondary;ctx.shadowBlur=11*glow;
      for(let i=0;i<4;i++){
        const length=38+i*24;
        const x=width*(.20+i*.21)-((this.elapsed*(70+i*15))%120);
        const y=groundY+12+i*8;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+length,y);ctx.stroke();
      }
      ctx.restore();
    }
    drawBehindPlayer(ctx,{x,y,width=44,height=44,duck=false,primary,secondary,
      speed=370,quality={},reducedMotion=false}={}){
      if(!this.visible||reducedMotion)return;
      const strength=this.intensity,glow=clamp(quality.glow??1,.15,1);
      const density=clamp(quality.density??1,.3,1);
      const count=density<.5?3:density<.8?5:8;
      const tail=clamp(speed/630,.65,2.6);
      const top=y-height,arrival=this.arrival;
      ctx.save();
      // Three separated layers of energy: inner cyan body wake, outer
      // secondary speed filaments and tiny offset fragments. Nothing travels
      // in the player's collision path in front of the square.
      for(let i=0;i<count;i++){
        const t=(i+1)/count;
        const start=x-width*.5-13-i*(11+3*tail);
        const end=start-(24+52*t)*tail;
        const pulse=Math.sin(this.elapsed*15+i*2.23);
        const yLine=top+height*(.16+.68*((i*3)%count)/count)+pulse*3.3;
        ctx.strokeStyle=i%3===0?secondary:primary;
        ctx.lineWidth=i%3===0?2.1:1.25;
        ctx.shadowColor=i%3===0?secondary:primary;
        ctx.shadowBlur=(8+5*arrival)*glow;
        ctx.globalAlpha=(.19+.23*(1-t))*(.78+.22*pulse)*strength*density;
        ctx.beginPath();ctx.moveTo(start,yLine);ctx.lineTo(end,yLine);ctx.stroke();
      }
      // Two luminous side rails mirror the square silhouette: they do not
      // encircle it or create a side-view-breaking oval halo.
      ctx.strokeStyle=secondary;ctx.lineWidth=1.7;
      ctx.globalAlpha=(.20+.18*arrival)*strength;
      ctx.shadowColor=secondary;ctx.shadowBlur=13*glow;
      const left=x-width*.5-8;
      for(const sy of [top+height*.14,top+height*.86]){
        ctx.beginPath();ctx.moveTo(left,sy);ctx.lineTo(left-21-13*arrival,sy);ctx.stroke();
      }
      ctx.restore();
    }
    drawAfterPlayer(ctx,{x,y,width=44,height=44,primary,secondary,quality={},
      reducedMotion=false}={}){
      if(!this.visible||reducedMotion)return;
      const strength=this.intensity,glow=clamp(quality.glow??1,.15,1);
      const arrival=this.arrival,phase=(1+Math.sin(this.elapsed*11))*.5;
      const w=width*.5+9+arrival*6,h=height*.5+9+arrival*3;
      const arm=clamp(width*.22,6,13),middle=y-height*.5;
      ctx.save();
      ctx.lineWidth=1.8+arrival*.7;
      ctx.strokeStyle=secondary;ctx.shadowColor=secondary;
      ctx.shadowBlur=(9+arrival*12)*glow;
      ctx.globalAlpha=(.40+.17*phase+.12*arrival)*strength;
      ctx.beginPath();
      // Detached angled corners: readable for both jump and duck poses.
      for(const sx of [-1,1])for(const sy of [-1,1]){
        const px=x+sx*w,py=middle+sy*h;
        ctx.moveTo(px-sx*arm,py);ctx.lineTo(px,py);ctx.lineTo(px,py-sy*arm);
      }
      ctx.stroke();
      if((quality.density??1)>.5){
        ctx.lineWidth=1.15;
        ctx.strokeStyle=primary;ctx.shadowColor=primary;
        ctx.globalAlpha=(.16+.13*phase)*strength;
        ctx.beginPath();
        ctx.moveTo(x-w-6,middle);ctx.lineTo(x-w-26,middle);
        ctx.moveTo(x+w+5,middle);ctx.lineTo(x+w+11,middle);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  return {ChromaStateVisuals,IN_SECONDS,OUT_SECONDS,ENTRY_SECONDS};
});
