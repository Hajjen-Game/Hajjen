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
    _choose(zone,speed,policy=null){
      const prev=this._last(),r=this.rules;
      if(prev.type!=='flat'){
        // A guaranteed flat landing / preparation area after every feature.
        return this._append('flat',this._random(r.minLandingFlat,r.minLandingFlat+260));
      }
      const roll=this.random();
      const gapAllowed=zone>=r.gapFromZone &&
        prev.end-this.lastGapEnd>=Math.max(r.minGapSeparation,speed*2.2) &&
        prev.end>r.firstGapWorld && (!policy||policy.allowGap);
      const gapChance=policy?Math.max(0,policy.gapChance||0):r.gapChance;
      const slopeChance=policy?Math.max(0,policy.slopeChance||0):r.slopeChance-gapChance;
      let segment;
      if(gapAllowed&&roll<gapChance){
        // Rare Echo Gaps are a distinct movement challenge, not a hidden
        // widening of normal gaps. The Director gates them by player readiness.
        const echo=zone>=5&&(policy?.echoGapChance??0)>0&&
          this.random()<policy.echoGapChance;
        const minSeconds=echo?(policy.echoGapSecondsMin??.92):(policy?.gapSecondsMin??.30);
        const maxSeconds=echo?(policy.echoGapSecondsMax??1.015):(policy?.gapSecondsMax??.37);
        const raw=speed*this._random(minSeconds,maxSeconds);
        const width=echo
          ?clamp(raw,Math.max(r.minGapWidth,speed*.89),speed*1.04)
          :clamp(raw,r.minGapWidth,r.maxGapWidth);
        segment=this._append('gap',width);
        if(echo){
          segment.echoChallenge=true;
          segment.echoVariant=width/speed>=.97?'extended':'approach';
        }
      }else if(zone>=r.slopeFromZone&&roll<(policy?(gapAllowed?gapChance:0)+slopeChance:r.slopeChance)){
        const change=policy?.maxHeightChange??r.maxHeightChange;
        const delta=this._random(-change,change);
        const nextY=clamp(prev.y1+delta,this.baseY-r.maxOffset,this.baseY+r.maxOffset);
        segment=this._append('slope',this._random(r.minSlopeWidth,r.maxSlopeWidth),nextY);
      }else if(policy?.dashLearningRunway){
        // Long advanced Dash shapes must actually spawn in the tutorial.
        // Only during the original FLOOR-ONLY first lesson, author a calm
        // contiguous flat runway wide enough for a 1.36-second energy
        // bridge plus the normal takeoff/landing safety margins. This
        // changes terrain generation, never existing terrain/collisions.
        segment=this._append('flat',Math.max(2700,Math.min(3900,speed*3.2)));
      }else if(policy?.challengeRunway){
        // Late mastered sections: occasional 3.0–3.6-second flat
        // lanes with physically valid runway for several obstacles.
        const laneSeconds=2.95+0.60*clamp(policy.density??policy.endurance??0,0,1);
        segment=this._append('flat',Math.min(7800,
          Math.max(1900,speed*laneSeconds)));
      }else segment=this._append('flat',this._random(400,740));
      if(policy){segment.plannedPhase=policy.phase;segment.lookaheadSeconds=policy.leadSeconds;}
      return segment;
    }
    ensure(right,zone=1,speed=370,policy=null){
      // This optional policy is supplied by Unified Terrain Director 3.0.
      // Calls without a policy retain the original standalone random behavior.
      const added=[];
      let attempts=0;
      while(this.generated<right+100&&attempts++<24){
        const decision=typeof policy==='function'?policy(this.generated):policy;
        added.push(this._choose(zone,speed,decision));
      }
      return added;
    }
    _segmentAt(x){
      if(x<0)return this.segments[0];
      // Lookup is called by collision, takeoff/landing and gameplay Director.
      // Binary search prevents long-run terrain history from creating linear
      // work on every physics step. Segment geometry and boundaries unchanged.
      if(x>=this.generated)return this._last();
      let lo=0,hi=this.segments.length-1;
      while(lo<=hi){
        const mid=(lo+hi)>>>1,s=this.segments[mid];
        if(x<s.start)hi=mid-1;
        else if(x>=s.end)lo=mid+1;
        else return s;
      }
      return null;
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
