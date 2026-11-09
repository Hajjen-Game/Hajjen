/* CHROMA RUSH — Signature Experience, Chroma Surge 1.0.
 * A real skill-reward window tied to the palette wave crossing the runner.
 * No extra obstacles, automatic inputs, speed changes, collision changes or RNG.
 * Rich original neon accents on HIGH; always preserve hazard silhouettes.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaSurge=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const WINDOW_SECONDS=4.8,MAX_CHAIN=4;
  const rgba=(hex,alpha)=>{
    const n=parseInt(hex.slice(1),16);
    return 'rgba('+(n>>16)+','+((n>>8)&255)+','+(n&255)+','+clamp(alpha,0,1)+')';
  };
  class ChromaSurge{
    constructor(){this.reset()}
    reset(){
      this.phase='idle';this.zone=0;this.remaining=0;this.elapsed=0;
      this.chain=0;this.clears=0;this.breaks=0;this.points=0;
      this.bestChain=0;this.count=0;this.lastBonus=0;this.flashLeft=0;
    }
    // Arm only when a REAL chapter/palette changes. A new palette already
    // receives a single Tide; the Surge waits for the *actual* crossing.
    arm({zone=1}={}){
      if(this.phase==='active')this.phase='idle';
      this.phase='armed';this.zone=Math.max(1,Math.floor(zone));
      this.remaining=0;this.elapsed=0;this.chain=0;this.clears=0;
      this.breaks=0;this.points=0;this.lastBonus=0;this.flashLeft=0;
      return true;
    }
    activate(){
      if(this.phase!=='armed')return false;
      this.phase='active';this.remaining=WINDOW_SECONDS;this.elapsed=0;
      this.count++;return true;
    }
    get active(){return this.phase==='active'}
    get intensity(){
      if(!this.active)return 0;
      const onset=clamp(this.elapsed/.38,0,1);
      const tail=clamp(this.remaining/.66,0,1);
      return Math.min(onset,tail);
    }
    tick(dt){
      if(!(dt>0)||!this.active)return null;
      this.elapsed+=dt;this.remaining=Math.max(0,this.remaining-dt);
      this.flashLeft=Math.max(0,this.flashLeft-dt);
      if(this.remaining<=1e-7){this.phase='idle';return 'complete'}
      return null;
    }
    // Skill points use only observed, legitimate clears; visual flourish
    // and background decorations can never produce a reward.
    onClear({kind='jump',precision=false,master=false,protectedClear=false}={}){
      if(!this.active||protectedClear)return null;
      if(!['jump','duck','dash-duck','gap','echo-gap'].includes(kind))return null;
      this.chain=Math.min(MAX_CHAIN,this.chain+1);
      this.bestChain=Math.max(this.bestChain,this.chain);
      this.clears++;
      const bonus=60+this.chain*35+(precision?35:0)+(master?25:0);
      this.points+=bonus;this.lastBonus=bonus;this.flashLeft=.35;
      return {points:bonus,chain:this.chain,kind,precision:Boolean(precision)};
    }
    onHit(){
      if(!this.active)return false;
      this.breaks++;this.chain=0;this.flashLeft=0;
      return true;
    }
    // Thin layered streaks, behind actors & hazards. No ring, opaque
    // rectangle, screen flash, or fake obstacle and no gameplay RNG.
    draw(ctx,{width=1280,height=720,groundY=height*.715,playerX=300,
      primary='#3feeff',secondary='#53b5ff',quality={},reducedMotion=false}={}){
      if(!this.active||reducedMotion||!ctx)return;
      const density=clamp(quality.density??1,.3,1);
      const glow=clamp(quality.glow??1,.15,1);
      const energy=this.intensity;
      if(energy<=0)return;
      const bright=(.36+.13*this.chain)*energy;
      ctx.save();
      // Track conductors are below gameplay silhouettes even after the
      // camera's course inversion; the HUD is outside this transform.
      for(let i=0;i<4;i++){
        const y=groundY+12+i*9;
        const x=playerX-155-i*21;
        const length=85+i*28;
        ctx.strokeStyle=i%2?secondary:primary;
        ctx.lineWidth=i===0?2.4:1.1;
        ctx.shadowColor=i%2?secondary:primary;
        ctx.shadowBlur=(i===0?18:8)*glow;
        ctx.globalAlpha=bright*(.58-i*.11);
        ctx.beginPath();ctx.moveTo(Math.max(0,x),y);
        ctx.lineTo(Math.min(width,x+length),y);ctx.stroke();
      }
      // Modern HIGH mode: extra speed-synchronised spectral strands in the
      // distant atmosphere. All are narrow, low alpha and never collide.
      const strands=density>=.8?13:density>=.55?8:4;
      for(let i=0;i<strands;i++){
        const row=(i+.46)/strands;
        const y=height*(.19+row*.37);
        const phase=(this.elapsed*(155+i*11)+i*137)%(width+240);
        const x=width+90-phase;
        const length=35+(i%5)*20;
        const color=i%2?primary:secondary;
        ctx.globalAlpha=energy*(.065+(i%4)*.022)*density;
        ctx.lineWidth=i%4===0?1.7:1;
        ctx.shadowBlur=5*glow;ctx.shadowColor=color;ctx.strokeStyle=color;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+length,y);ctx.stroke();
      }
      // Brief linear player wake after a skill clear, not an obstruction.
      if(this.flashLeft>0){
        const flash=clamp(this.flashLeft/.35,0,1)*energy;
        ctx.strokeStyle='#ffffff';ctx.shadowColor=primary;ctx.shadowBlur=20*glow;
        for(let i=0;i<3;i++){
          const y=groundY-36-i*12;
          ctx.globalAlpha=flash*(.34-i*.08);
          ctx.lineWidth=i===0?2.2:1.2;
          ctx.beginPath();ctx.moveTo(playerX-12-i*22,y);
          ctx.lineTo(playerX+42+i*23,y);ctx.stroke();
        }
      }
      ctx.restore();
    }
  }
  return {ChromaSurge,WINDOW_SECONDS,MAX_CHAIN};
});
