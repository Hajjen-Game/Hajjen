/* CHROMA RUSH — Dynamic Terrain & Gap Jumps 1.0
 * World-space, deterministic-injectable endless terrain generator.
 * Owns the height map and gap metadata; never reads input or DOM.
 * Constant auto-run speed, Director decisions and physics are managed externally.
 */
(function(root,factory){
  const config=typeof module!=='undefined'&&module.exports?require('../core/config.js'):(root&&root.ChromaConfig);
  const api=factory(config.TERRAIN);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaTerrain=api;
})(typeof window!=='undefined'?window:null,function(RULES){
  'use strict';
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
  class TerrainSystem {
    constructor({random=Math.random,rules=RULES}={}){
      this.random=random;this.rules=rules;this.reset(515);
    }
    reset(baseY=515){
      this.baseY=baseY;this.segments=[{type:'flat',start:0,end:1900,y0:baseY,y1:baseY}];
      this.lastGapEnd=-Infinity;this.gaps=[];this.generated=1900;this.nextId=1;
    }
    _random(min,max){return min+clamp(this.random(),0,1)*(max-min)}
    _append(type,length,y1=this._last().y1){
      const prev=this._last();
      const seg={type,start:prev.end,end:prev.end+length,y0:prev.y1,y1};
      if(type==='gap'){
        seg.id=this.nextId++;seg.resolved=false;seg.missed=false;
        this.gaps.push(seg);this.lastGapEnd=seg.end;
      }
      this.segments.push(seg);this.generated=seg.end;
      return seg;
    }
    _last(){return this.segments[this.segments.length-1]}
    _choose(zone,speed){
      const prev=this._last(),r=this.rules;
      if(prev.type!=='flat'){
        // A guaranteed flat landing / preparation area after every feature.
        this._append('flat',this._random(r.minLandingFlat,r.minLandingFlat+260));
        return;
      }
      const roll=this.random();
      const gapAllowed=zone>=r.gapFromZone &&
        prev.end-this.lastGapEnd>=Math.max(r.minGapSeparation,speed*2.2) &&
        prev.end>r.firstGapWorld;
      if(gapAllowed&&roll<r.gapChance){
        const width=clamp(speed*this._random(.30,.37),r.minGapWidth,r.maxGapWidth);
        this._append('gap',width);
        return;
      }
      if(zone>=r.slopeFromZone&&roll<r.slopeChance){
        const delta=this._random(-r.maxHeightChange,r.maxHeightChange);
        const nextY=clamp(prev.y1+delta,this.baseY-r.maxOffset,this.baseY+r.maxOffset);
        // Smooth slopes: never a sudden vertical wall or a forced jump.
        this._append('slope',this._random(r.minSlopeWidth,r.maxSlopeWidth),nextY);
        return;
      }
      this._append('flat',this._random(400,740));
    }
    ensure(right,zone=1,speed=370){
      // Capped work and retained forward buffers keep mobile frames predictable.
      let attempts=0;
      while(this.generated<right+100 && attempts++<24)this._choose(zone,speed);
    }
    _segmentAt(x){
      if(x<0)return this.segments[0];
      // Most queries are around the player / visible screen; the list is short
      // after pruning and remains monotonic by absolute world position.
      for(const s of this.segments)if(x>=s.start&&x<s.end)return s;
      return x>=this.generated?this._last():null;
    }
    groundAt(x){
      const s=this._segmentAt(x);
      if(!s||s.type==='gap')return null;
      if(s.type!=='slope')return s.y1;
      return s.y0+(s.y1-s.y0)*smooth((x-s.start)/(s.end-s.start));
    }
    gapAt(x){const s=this._segmentAt(x);return s?.type==='gap'?s:null}
    // Check the entire hazard's world-space neighborhood and protect both
    // takeoff and landing. Ordinary boxes may spawn on flat terrain only.
    canSpawnObstacle(worldX,width=70,speed=370){
      const before=Math.max(110,speed*.74),after=Math.max(130,speed*.91);
      const lo=worldX-before,hi=worldX+width+after;
      for(const s of this.segments){
        if(s.end<lo||s.start>hi)continue;
        if(s.type==='gap')return false;
      }
      const y=this.groundAt(worldX),yEnd=this.groundAt(worldX+width);
      if(y===null||yEnd===null||Math.abs(y-yEnd)>7)return false;
      const s=this._segmentAt(worldX);
      // Avoid boxes on a moving slope; keep the collision behavior predictable.
      return s?.type==='flat';
    }
    visibleGaps(from,to){return this.gaps.filter(g=>g.end>=from&&g.start<=to)}
    markGap(gap,missed){if(!gap||gap.resolved)return false;gap.resolved=true;gap.missed=Boolean(missed);return true}
    prune(before,speed=370){
      // At extreme speed the player remains airborne over a long world-space
      // distance: retain takeoff metadata until landing can be resolved.
      const keepBehind=Math.max(1100,speed*1.35);
      while(this.segments.length>4&&this.segments[1].end<before-keepBehind)this.segments.shift();
      this.gaps=this.gaps.filter(g=>g.end>=before-keepBehind);
    }
  }
  return {TerrainSystem};
});
