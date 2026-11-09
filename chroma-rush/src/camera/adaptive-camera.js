/* CHROMA RUSH — Adaptive Camera Horizon 1.1
 * A presentation-only, player-anchored camera with real world-space lookahead.
 * Physics, terrain RNG, speed, gravity and HUD are never transformed.
 * Supports the existing screen-space Chroma Tide via a projected color adapter.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaAdaptiveCamera=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
  const smooth=t=>{const v=clamp(t,0,1);return v*v*(3-2*v)};
  // Two overlapping eased ramps. Keep the original curve exactly as-is
  // through zone ~15 (~speed 1,414), where player testing feels good.
  // Extend gradually toward 60% only in the genuinely fast late game.
  const MIN_ZOOM=.6,MID_ZOOM=.8,START_SPEED=650;
  const FIRST_STAGE_END_SPEED=1850,LATE_STAGE_START_SPEED=1450,FULL_ZOOM_SPEED=2200;
  const SETTLE_SECONDS=1.15;
  class AdaptiveCamera {
    constructor(){
      this.zoom=1;this.lowestZoom=1;
      this._tide=null;this.anchorX=300;this.anchorY=515;
      this.viewportWidth=1280;
      const c=this;
      // Reuse one adapter per camera: no per-frame wrapper objects or
      // duplicate atmosphere passes on devices with constrained memory.
      this.projectedTide={
        get active(){return Boolean(c._tide?.active)},
        get charging(){return Boolean(c._tide?.charging)},
        get from(){return c._tide?.from},
        get to(){return c._tide?.to},
        ambientColor(channel){return c._tide.ambientColor(channel)},
        colorAt(x,channel,y,height){
          return c._tide.colorAt(c.screenX(x,c.anchorX),channel,
            c.screenY(y,c.anchorY),height);
        },
        accentAt(x,y,height){
          return c._tide.accentAt(c.screenX(x,c.anchorX),
            c.screenY(y,c.anchorY),height);
        },
        frontAt(y,height){
          return c.worldX(c._tide.frontAt(c.screenY(y,c.anchorY),height),c.anchorX);
        },
        gradient(ctx,width,channel='primary',y=360,height=720){
          const tide=c._tide;
          if(!tide?.active)return tide?.to?.[channel]||'#ffffff';
          const from=tide.from?.[channel]||'#ffffff',to=tide.to?.[channel]||from;
          if(tide.charging)return from;
          const left=c.visibleLeft(c.viewportWidth,c.anchorX);
          const right=c.visibleRight(c.viewportWidth,c.anchorX);
          const head=this.frontAt(y,height),span=35/c.zoom;
          if(head>right+span)return from;
          if(head<left-span)return to;
          const norm=x=>clamp((x-left)/(right-left),0,1);
          const g=ctx.createLinearGradient(left,0,right,0);
          g.addColorStop(0,from);g.addColorStop(norm(head-span),from);
          g.addColorStop(norm(head+span),to);g.addColorStop(1,to);
          return g;
        }
      };
    }
    targetForSpeed(speed){
      const v=Math.max(0,Number(speed)||0);
      const early=smooth((v-START_SPEED)/(FIRST_STAGE_END_SPEED-START_SPEED));
      const late=smooth((v-LATE_STAGE_START_SPEED)/(FULL_ZOOM_SPEED-LATE_STAGE_START_SPEED));
      // Overlap removes the unnatural "hold at 80%" plateau. Both eased
      // ramps have zero slope at their endpoints, so zoom remains C1-smooth.
      return 1-(1-MID_ZOOM)*early-(MID_ZOOM-MIN_ZOOM)*late;
    }
    reset(speed=370){
      this.zoom=this.targetForSpeed(speed);
      this.lowestZoom=this.zoom;
    }
    tick(dt,speed,{reducedMotion=false}={}){
      if(!(dt>0))return this.zoom;
      const target=this.targetForSpeed(speed);
      const alpha=reducedMotion?1:1-Math.exp(-dt/SETTLE_SECONDS);
      this.zoom=clamp(this.zoom+(target-this.zoom)*alpha,MIN_ZOOM,1);
      if(Math.abs(target-this.zoom)<.00005)this.zoom=target;
      this.lowestZoom=Math.min(this.lowestZoom,this.zoom);
      return this.zoom;
    }
    screenX(worldX,anchorX){return anchorX+(worldX-anchorX)*this.zoom}
    worldX(screenX,anchorX){return anchorX+(screenX-anchorX)/this.zoom}
    screenY(worldY,anchorY){return anchorY+(worldY-anchorY)*this.zoom}
    worldY(screenY,anchorY){return anchorY+(screenY-anchorY)/this.zoom}
    visibleLeft(width,anchorX){return this.worldX(0,anchorX)}
    visibleRight(width,anchorX){return this.worldX(width,anchorX)}
    worldBottom(height,anchorY){return this.worldY(height,anchorY)}
    view(width,height,anchorX,anchorY){
      return {left:this.visibleLeft(width,anchorX),
        right:this.visibleRight(width,anchorX),
        bottom:this.worldBottom(height,anchorY)};
    }
    setTide(tide,{width,anchorX,anchorY}){
      this._tide=tide;this.viewportWidth=width;
      this.anchorX=anchorX;this.anchorY=anchorY;
      return this.zoom<.99999?this.projectedTide:tide;
    }
    apply(ctx,anchorX,anchorY){
      // apply AFTER gravity mirroring, so inverted gameplay remains anchored
      // to the mirrored track with no HUD/canvas position changes.
      if(this.zoom>=.99999)return;
      ctx.translate(anchorX*(1-this.zoom),anchorY*(1-this.zoom));
      ctx.scale(this.zoom,this.zoom);
    }
    get extraVisibleFraction(){return 1/this.zoom-1}
  }
  return {AdaptiveCamera,MIN_ZOOM,MID_ZOOM,START_SPEED,FIRST_STAGE_END_SPEED,
    LATE_STAGE_START_SPEED,FULL_ZOOM_SPEED,SETTLE_SECONDS};
});
