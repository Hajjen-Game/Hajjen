/* CHROMA RUSH — Terrain Render Seam Fix 1.1
 * A single continuous surface mask and one world-space grid for all solid terrain.
 * Gaps have NO foreground fill, leaving the real parallax background visible.
 * Pure presentation module: never modifies physics, terrain or scoring.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaTerrainRender=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
  const rgba=(hex,a)=>{
    const n=parseInt(hex.slice(1),16);
    return `rgba(${n>>16},${(n>>8)&255},${n&255},${a})`;
  };
  function surface(s,x){
    if(s.type!=='slope')return s.y1;
    return s.y0+(s.y1-s.y0)*smooth((x-s.start)/(s.end-s.start));
  }
  function visibleRuns(segments,left,right){
    const runs=[];let current=[];
    for(const s of segments){
      if(s.end<=left||s.start>=right)continue;
      const lo=Math.max(left,s.start),hi=Math.min(right,s.end);
      if(hi<=lo)continue;
      if(s.type==='gap'){
        if(current.length)runs.push(current);
        current=[];
      }else{
        if(current.length&&lo-current[current.length-1].hi>0.01){runs.push(current);current=[]}
        current.push({s,lo,hi});
      }
    }
    if(current.length)runs.push(current);
    return runs;
  }
  function traceSurface(ctx,run,distance,depth=0,connect=false,step=16){
    const first=run[0];
    (connect?ctx.lineTo:ctx.moveTo).call(ctx,first.lo-distance,surface(first.s,first.lo)+depth);
    for(const {s,lo,hi} of run){
      if(s.type==='slope')for(let x=lo+step;x<hi;x+=step)ctx.lineTo(x-distance,surface(s,x)+depth);
      // Use the exact boundary height, not the following segment's sampled height.
      ctx.lineTo(hi-distance,surface(s,hi)+depth);
    }
  }
  function drawTerrain({ctx,terrain,distance,width,height,baseY,primary,secondary,flow=0,glowLine,quality={glow:1,terrainStep:16,gridStep:105},tide=null}){
    if(!ctx||!terrain||!terrain.segments)return;
    const left=Math.max(0,distance-36),right=distance+width+36;
    const runs=visibleRuns(terrain.segments,left,right);
    if(!runs.length)return;
    const colorAt=(x,channel,y)=>tide?.active?tide.colorAt(x,channel,y,height):
      (channel==='primary'?primary:secondary);
    const groundPrimary=colorAt(width*.5,'primary',baseY);

    // Build one compound clip mask for all solid track. The floor, gradients and
    // grid are all clipped to it: the gap is literal transparency over the world.
    ctx.save();ctx.beginPath();
    for(const run of runs){
      const start=run[0].lo-distance,end=run[run.length-1].hi-distance;
      ctx.moveTo(start,height+8);
      traceSurface(ctx,run,distance,0,true,quality.terrainStep);
      ctx.lineTo(end,height+8);ctx.closePath();
    }
    ctx.clip();
    // One gradient anchored to the SCREEN instead of segment-local starts.
    // Resetting the gradient at every new slope was the visible dark seam.
    const ground=ctx.createLinearGradient(0,baseY-25,0,height);
    ground.addColorStop(0,rgba(groundPrimary,.15+clamp(flow,0,100)*.0008));
    ground.addColorStop(.55,'#0b1224');
    ground.addColorStop(1,'#050812');
    ctx.fillStyle=ground;
    ctx.fillRect(-36,0,width+72,height+8);
    // Very light ground tint within the EXISTING clip: the actual terrain
    // material responds as the tide crosses, with no duplicate geometry.
    if(tide?.active&&!tide.charging){
      ctx.save();
      ctx.globalAlpha=.085*Math.min(1,quality.glow??1);
      ctx.fillStyle=tide.gradient(ctx,width,'primary',baseY,height);
      ctx.fillRect(-36,0,width+72,height+8);
      ctx.restore();
    }

    // A single world-aligned perspective grid, shared across all segments.
    // Clipping automatically prevents lines from painting the gap or the sky.
    for(let x=Math.ceil(left/quality.gridStep)*quality.gridStep;x<=right;x+=quality.gridStep){
      const s=terrain.segments.find(p=>p.type!=='gap'&&x>=p.start&&x<p.end);
      if(!s)continue;
      const sx=x-distance,sy=surface(s,x);
      glowLine(sx,sy+2,sx-72,height,colorAt(sx,'secondary',sy),1,1,.17);
    }
    for(const depth of [32,76,126]){
      ctx.beginPath();
      ctx.beginPath();for(const run of runs)traceSurface(ctx,run,distance,depth,false,quality.terrainStep);
      ctx.strokeStyle=tide?.active?
        tide.gradient(ctx,width,'primary',baseY+depth,height):primary;
      ctx.lineWidth=.8;ctx.globalAlpha=.12;
      ctx.shadowBlur=0;ctx.stroke();
    }
    ctx.restore();

    // Draw continuous surface strokes as one path, not one stroke per polygon.
    // Break the path at true gaps only, never at slope-to-flat transitions.
    ctx.save();ctx.beginPath();
    for(const run of runs)traceSurface(ctx,run,distance,0,false,quality.terrainStep);
    ctx.strokeStyle=tide?.active?tide.gradient(ctx,width,'primary',baseY,height):primary;
    ctx.lineWidth=2.8;ctx.globalAlpha=.92;
    ctx.shadowColor=groundPrimary;ctx.shadowBlur=(21+clamp(flow,0,100)*.12)*quality.glow;
    ctx.stroke();ctx.restore();

    // Only edge markers are drawn over the background of each gap.
    for(const gap of terrain.segments){
      if(gap.type!=='gap'||gap.end<=left||gap.start>=right)continue;
      for(const edge of [gap.start,gap.end]){
        const x=edge-distance;
        if(x<-20||x>width+20)continue;
        glowLine(x,gap.y0-2,x,gap.y0+53,colorAt(x,'secondary',gap.y0),3,17,.85);
        glowLine(x-5,gap.y0,x+5,gap.y0,'#ffffff',2,10,.64);
      }
      const cue=gap.start-distance;
      if(cue>-110&&cue<width){
        ctx.save();
        ctx.fillStyle=gap.echoChallenge?'#ffffff':colorAt(cue,'secondary',gap.y0);
        ctx.font=gap.echoChallenge?'850 13px system-ui':'800 13px system-ui';
        ctx.textAlign='center';ctx.globalAlpha=.88;
        ctx.shadowColor=colorAt(cue,'secondary',gap.y0);ctx.shadowBlur=gap.echoChallenge?9*quality.glow:0;
        // Echo gaps have an explicit double-jump visual vocabulary,
        // including in low graphics; no hidden jumps or surprise geometry.
        ctx.fillText(gap.echoChallenge?'2× JUMP':'↑',cue-(gap.echoChallenge?54:32),gap.y0-35);
        ctx.restore();
      }
      if(gap.echoChallenge&&cue>-55&&cue<width+55){
        for(let i=0;i<2;i++){
          const x=cue-14-i*10;
          glowLine(x,gap.y0-5,x-5,gap.y0-15,colorAt(x,'secondary',gap.y0),1.8,6,.75);
        }
      }
    }
  }
  return {drawTerrain,visibleRuns,surface};
});
