/* CHROMA RUSH — Terrain Render Seam Fix 1.1 / Tide Spectacle 1.0
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
  function drawTerrain({ctx,terrain,distance,width,height,baseY,primary,secondary,flow=0,glowLine,quality={glow:1,terrainStep:16,gridStep:105},tide=null,cameraView=null}){
    if(!ctx||!terrain||!terrain.segments)return;
    const viewLeft=Math.min(0,cameraView?.left??0);
    const viewRight=Math.max(width,cameraView?.right??width);
    // Preserve the real bottom edge under zoom: ground must cover the whole
    // screen even after the gravity mirror maps it onto the ceiling.
    const bottom=Math.max(height,cameraView?.bottom??height);
    const left=distance+viewLeft-36,right=distance+viewRight+36;
    const runs=visibleRuns(terrain.segments,left,right);
    // The high-zone PRACTICE camera already sees a little behind world zero.
    // Fill that opening with the existing start-run flat, not a new collider.
    if(cameraView&&viewLeft<-.01&&left<0&&
      runs[0]?.[0]?.lo===0&&terrain.segments[0]?.type==='flat'){
      const y=Number.isFinite(terrain.baseY)?terrain.baseY:runs[0][0].s.y0;
      const s={type:'flat',start:left,end:0,y0:y,y1:y};
      runs[0].unshift({s,lo:left,hi:0});
    }
    if(!runs.length)return;
    const colorAt=(x,channel,y)=>tide?.active?tide.colorAt(x,channel,y,height):
      (channel==='primary'?primary:secondary);
    const groundPrimary=tide?.active?tide.ambientColor('primary'):primary;

    // Build one compound clip mask for all solid track. The floor, gradients and
    // grid are all clipped to it: the gap is literal transparency over the world.
    ctx.save();ctx.beginPath();
    for(const run of runs){
      const start=run[0].lo-distance,end=run[run.length-1].hi-distance;
      ctx.moveTo(start,bottom+8);
      traceSurface(ctx,run,distance,0,true,quality.terrainStep);
      ctx.lineTo(end,bottom+8);ctx.closePath();
    }
    ctx.clip();
    // One gradient anchored to the SCREEN instead of segment-local starts.
    // Resetting the gradient at every new slope was the visible dark seam.
    const ground=ctx.createLinearGradient(0,baseY-25,0,bottom);
    ground.addColorStop(0,rgba(groundPrimary,.15+clamp(flow,0,100)*.0008));
    ground.addColorStop(.55,'#0b1224');
    ground.addColorStop(1,'#050812');
    ctx.fillStyle=ground;
    ctx.fillRect(viewLeft-36,0,viewRight-viewLeft+72,bottom+8);
    // Very light ground tint within the EXISTING clip: the actual terrain
    // material responds as the tide crosses, with no duplicate geometry.
    if(tide?.active&&!tide.charging){
      ctx.save();
      ctx.globalAlpha=.085*Math.min(1,quality.glow??1);
      ctx.fillStyle=tide.gradient(ctx,width,'primary',baseY,height);
      ctx.fillRect(viewLeft-36,0,viewRight-viewLeft+72,bottom+8);
      ctx.restore();
    }

    // The wave also excites the EXISTING solid ground material beneath the
    // surface line. This is inside the true terrain clip, so gaps remain
    // empty and hills never sprout a false ledge. Performance skips it.
    if(tide?.active&&!tide.charging&&(quality.density??1)>=.55){
      const head=tide.frontAt(baseY,height),density=clamp(quality.density,0,1);
      if(head>viewLeft-245&&head<viewRight+205){
        const wash=ctx.createLinearGradient(head-155,0,head+270,0);
        wash.addColorStop(0,rgba(secondary,0));
        wash.addColorStop(.33,rgba(secondary,.12*density));
        wash.addColorStop(.56,rgba(primary,.18*density));
        wash.addColorStop(.76,rgba(secondary,.08*density));
        wash.addColorStop(1,rgba(primary,0));
        const x=Math.max(viewLeft,head-155),end=Math.min(viewRight,head+270);
        if(end>x){ctx.save();ctx.fillStyle=wash;ctx.fillRect(x,0,end-x,bottom+8);ctx.restore();}
      }
    }
    // A single world-aligned perspective grid, shared across all segments.
    // Clipping automatically prevents lines from painting the gap or the sky.
    for(let x=Math.ceil(left/quality.gridStep)*quality.gridStep;x<=right;x+=quality.gridStep){
      const s=terrain.segments.find(p=>p.type!=='gap'&&x>=p.start&&x<p.end);
      if(!s)continue;
      const sx=x-distance,sy=surface(s,x);
      // Existing grid only: briefly amplify lines behind the real front.
      const accent=tide?.accentAt?.(sx,sy,height)||0;
      glowLine(sx,sy+2,sx-72,bottom,colorAt(sx,'secondary',sy),1,1,
        .17+.36*accent*clamp(quality.glow??1,.15,1));
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

    // One extra localized luminous SURFACE pass near the moving tide.
    // Uses exactly the same existing geometry and true gap boundaries:
    // no fake line bridge, new object or double terrain/background redraw.
    if(tide?.active&&!tide.charging){
      const head=tide.frontAt(baseY,height);
      if(head>viewLeft-200&&head<viewRight+45){
        const g=ctx.createLinearGradient(viewLeft,0,viewRight,0);
        const norm=x=>clamp((x-viewLeft)/(viewRight-viewLeft),0,1);
        g.addColorStop(0,rgba(primary,0));
        g.addColorStop(norm(head-58),rgba(primary,0));
        g.addColorStop(norm(head+20),rgba(secondary,.58));
        g.addColorStop(norm(head+75),rgba(primary,.38));
        g.addColorStop(norm(head+210),rgba(primary,0));
        g.addColorStop(1,rgba(primary,0));
        ctx.save();ctx.beginPath();
        for(const run of runs)traceSurface(ctx,run,distance,0,false,quality.terrainStep);
        ctx.strokeStyle=g;ctx.lineWidth=7;
        ctx.globalAlpha=.84*clamp(quality.glow??1,.15,1);
        ctx.shadowColor=secondary;
        ctx.shadowBlur=20*clamp(quality.glow??1,.15,1);
        ctx.stroke();ctx.restore();
        // High quality: one hairline of optical refraction hugs exactly the
        // same surface path, respecting each real gap, not the screen floor.
        if((quality.density??1)>=.78){
          const edge=ctx.createLinearGradient(head-120,0,head+180,0);
          edge.addColorStop(0,rgba(secondary,0));
          edge.addColorStop(.4,rgba(secondary,.35));
          edge.addColorStop(.57,rgba('#ffffff',.72));
          edge.addColorStop(.78,rgba(primary,.31));
          edge.addColorStop(1,rgba(primary,0));
          ctx.save();ctx.beginPath();
          for(const run of runs)traceSurface(ctx,run,distance,0,false,quality.terrainStep);
          ctx.strokeStyle=edge;ctx.lineWidth=2.2;
          ctx.globalAlpha=.80;ctx.shadowBlur=6*clamp(quality.glow??1,.15,1);
          ctx.shadowColor=secondary;ctx.stroke();ctx.restore();
        }
      }
    }

    // Only edge markers are drawn over the background of each gap.
    for(const gap of terrain.segments){
      if(gap.type!=='gap'||gap.end<=left||gap.start>=right)continue;
      for(const edge of [gap.start,gap.end]){
        const x=edge-distance;
        if(x<viewLeft-20||x>viewRight+20)continue;
        glowLine(x,gap.y0-2,x,gap.y0+53,colorAt(x,'secondary',gap.y0),3,17,.85);
        glowLine(x-5,gap.y0,x+5,gap.y0,'#ffffff',2,10,.64);
      }
      const cue=gap.start-distance;
      if(cue>viewLeft-110&&cue<viewRight){
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
      if(gap.echoChallenge&&cue>viewLeft-55&&cue<viewRight+55){
        for(let i=0;i<2;i++){
          const x=cue-14-i*10;
          glowLine(x,gap.y0-5,x-5,gap.y0-15,colorAt(x,'secondary',gap.y0),1.8,6,.75);
        }
      }
    }
  }
  return {drawTerrain,visibleRuns,surface};
});
