/* CHROMA RUSH — Shield Core 1.0: optional double-jump recovery.
 * Canonical floor-world geometry, no RNG, no changes to obstacle generation.
 * A shield pickup must NEVER be reachable by a single normal jump.
 */
(function(root,factory){
  const config=typeof module!=='undefined'&&module.exports?require('../core/config.js'):(root&&root.ChromaConfig);
  const api=factory(config.GAME,config.SHIELD_CORE);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaShieldCore=api;
})(typeof window!=='undefined'?window:null,function(GAME,RULES){
  'use strict';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const DEFAULT=Object.freeze({
    firstZone:2,firstTime:16,restore:25,maxShield:100,spawnAtOrBelow:75,
    rise:268,radius:12,magnetDistance:35,magnetPull:9,
    visibleLeadSeconds:1.65,minCooldown:25,maxCooldown:35
  });
  const R=RULES||DEFAULT;
  const sizeOf=R.radius||DEFAULT.radius;
  const distToRect=(x,y,box)=>{
    const dx=x-clamp(x,box.x,box.x+box.w);
    const dy=y-clamp(y,box.y,box.y+box.h);
    return Math.hypot(dx,dy);
  };
  class ShieldCoreSystem{
    constructor(rules=R){this.rules=rules;this.reset();}
    reset(){
      this.active=null;
      this.nextAt=this.rules.firstTime;
      this.retryAt=0;
      this.spawnCount=0;
      this.picked=0;
      this.missed=0;
      this.flight=null;
      this.missedSince=0;
    }
    get visible(){return this.active!==null;}
    // Shield Core's recovery corridor vetoes future *Director obstacles*.
    // Existing obstacle spawn remains the sole source of Director decisions.
    blocksHazard(worldX,width=60,speed=370){
      const c=this.active;
      if(!c)return false;
      const clearance=Math.max(300,Math.max(300,speed)*1.12);
      const start=worldX,end=worldX+width;
      return start<=c.worldX+clearance&&end>=c.worldX-clearance;
    }
    safePlacement(worldX,{terrain,hurdles=[],speed=370,gravityBusy=false}={}){
      if(gravityBusy||!terrain)return false;
      const v=Math.max(300,speed);
      const coreGround=terrain.groundAt(worldX);
      if(coreGround===null||!Number.isFinite(coreGround))return false;
      // More generous than an ordinary obstacle: both safe takeoff and
      // touchdown, on flat terrain (even at high speed).
      if(!terrain.canSpawnObstacle(worldX,36,v))return false;
      if(Number.isFinite(terrain.generated)&&worldX+v*.9>terrain.generated)return false;
      for(const dx of [-v*.84,-v*.50,v*.45,v*.90]){
        const foot=terrain.groundAt(worldX+dx);
        if(foot===null||Math.abs(coreGround-foot)>8)return false;
      }
      const zone=v*1.12;
      if(hurdles.some(h=>!h.hit&&!h.cleared&&
        h.worldX+h.width>=worldX-zone&&h.worldX<=worldX+zone))return false;
      return true;
    }
    tick(dt,{time=0,zone=1,hp=100,playerWorld=0,playerBox=null,
      echoUsed=false,landed=true,terrain=null,hurdles=[],speed=370,
      distance=0,playerX=300,viewportWidth=1280,gravityBusy=false,
      playerFeet=0}={}){
      const events={spawned:null,picked:null,missed:null};
      if(!(dt>0))return events;
      if(this.flight){
        this.flight.life=Math.max(0,this.flight.life-dt);
        if(this.flight.life===0)this.flight=null;
      }
      let core=this.active;
      if(core){
        if(hp>=this.rules.maxShield){
          // Don't leave a worthless crystal on screen after Perfect Zone.
          this.active=null;
        }else if(playerWorld>core.worldX+Math.max(80,speed*.2)){
          this.active=null;this.missed++;events.missed={worldX:core.worldX};
        }else{
          core.age+=dt;
          const box=playerBox;
          // Magnet is a tiny, purely local attraction after the Echo Jump.
          // Physics are based on its displayed location with <=9px pull.
          // A first jump never activates either magnetic movement or pickup.
          let x=core.worldX-distance,y=core.y;
          if(box&&echoUsed&&!landed){
            const distanceToPlayer=distToRect(x,y,box);
            const n=clamp((this.rules.magnetDistance-distanceToPlayer)/
              this.rules.magnetDistance,0,1);
            const pull=n*this.rules.magnetPull;
            if(pull>0){
              const midX=box.x+box.w*.5,midY=box.y+box.h*.5;
              const length=Math.hypot(midX-x,midY-y)||1;
              x+=((midX-x)/length)*pull;
              y+=((midY-y)/length)*pull;
            }
            // Real rectangle-to-circle overlap, not a proximity-only reward.
            if(distToRect(x,y,box)<=this.rules.radius){
              const restored=Math.min(this.rules.restore,
                Math.max(0,this.rules.maxShield-hp));
              this.active=null;
              if(restored>0){
                this.picked++;
                events.picked={restored,worldX:core.worldX,x,y,zone,
                  before:hp,after:hp+restored};
              }
            }
          }
          if(this.active){core.x=x;core.displayY=y;}
        }
      }
      if(this.active||time<this.nextAt||time<this.retryAt||
        zone<this.rules.firstZone||hp>this.rules.spawnAtOrBelow||
        hp<=0||gravityBusy)return events;
      // Deterministic 25–35s breathing room, independent of gameplay RNG.
      // Spawn ahead for a visible double-jump lead, with a tight cap on
      // active collectibles and no displacement of hazards/terrain.
      const v=Math.max(300,speed);
      const x=Math.max(viewportWidth+64,playerX+v*this.rules.visibleLeadSeconds);
      const worldX=distance+x;
      if(!this.safePlacement(worldX,{terrain,hurdles,speed:v,gravityBusy})){
        this.retryAt=time+.75;return events;
      }
      const ground=terrain.groundAt(worldX);
      const coreObject={worldX,x,y:ground-this.rules.rise,
        displayY:ground-this.rules.rise,ground,age:0,radius:sizeOf};
      this.active=coreObject;
      this.spawnCount++;
      this.nextAt=time+([29,33,27,31][(this.spawnCount-1)%4]);
      events.spawned={worldX,y:coreObject.y,zone};
      return events;
    }
    startFlight(x,y,amount){
      // Flight coordinates are already converted to the UPRIGHT screen;
      // ceiling mode changes the initial Y but never the HUD destination.
      this.flight={x,y,amount,life:.54,total:.54};
    }
    snapshot(){return {active:this.active?{worldX:this.active.worldX,y:this.active.y}:null,
      nextAt:this.nextAt,spawnCount:this.spawnCount,picked:this.picked,missed:this.missed};}
  }
  return {ShieldCoreSystem,distToRect,DEFAULT};
});
