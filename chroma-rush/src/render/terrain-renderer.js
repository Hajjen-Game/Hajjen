/* CHROMA RUSH — Terrain Visual Fix 1.2 — corrected ground clip polygons. Presentation only. */
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.ChromaTerrainRender=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
 const rgba=(hex,alpha)=>{const n=parseInt(hex.slice(1),16);return 'rgba('+(n>>16)+','+((n>>8)&255)+','+(n&255)+','+alpha+')'};
 function surface(s,x){return s.type==='slope'?s.y0+(s.y1-s.y0)*smooth((x-s.start)/(s.end-s.start)):s.y1}
 function visibleRuns(segments,left,right){
   const runs=[];let current=[];
   for(const s of segments){
     if(s.end<=left||s.start>=right)continue;
     const lo=Math.max(left,s.start),hi=Math.min(right,s.end);
     if(hi<=lo)continue;
     if(s.type==='gap'){if(current.length)runs.push(current);current=[]}
     else{
       if(current.length&&lo-current[current.length-1].hi>.01){runs.push(current);current=[]}
       current.push({s,lo,hi});
     }
   }
   if(current.length)runs.push(current);
   return runs;
 }
 function traceSurface(ctx,run,distance,depth=0,connect=false){
   const first=run[0];
   // The compound floor clip starts at the bottom of each island.
   // Its NEXT point must be joined to the surface, not a new subpath:
   // moveTo() here produced the diagonal black wedge seen in-game.
   if(connect)ctx.lineTo(first.lo-distance,surface(first.s,first.lo)+depth);
   else ctx.moveTo(first.lo-distance,surface(first.s,first.lo)+depth);
   for(const {s,lo,hi} of run){
     for(let x=lo+16;x<hi;x+=16)ctx.lineTo(x-distance,surface(s,x)+depth);
     ctx.lineTo(hi-distance,surface(s,hi)+depth);
   }
 }
 function drawTerrain({ctx,terrain,distance,width,height,baseY,primary,secondary,flow=0,glowLine}){
   if(!ctx||!terrain||!terrain.segments)return;
   const left=Math.max(0,distance-36),right=distance+width+36;
   const runs=visibleRuns(terrain.segments,left,right);
   if(!runs.length)return;
   // ONE compound polygon mask for continuous ground, with true holes at gaps.
   ctx.save();ctx.beginPath();
   for(const run of runs){
     const start=run[0].lo-distance,end=run[run.length-1].hi-distance;
     ctx.moveTo(start,height+8);
     traceSurface(ctx,run,distance,0,true);
     ctx.lineTo(end,height+8);ctx.closePath();
   }
   ctx.clip();
   // One gradient anchored to the viewport, not separately to each segment.
   const ground=ctx.createLinearGradient(0,baseY-25,0,height);
   ground.addColorStop(0,rgba(primary,.15+clamp(flow,0,100)*.0008));
   ground.addColorStop(.55,'#0b1224');ground.addColorStop(1,'#050812');
   ctx.fillStyle=ground;ctx.fillRect(-36,0,width+72,height+8);
   // World-anchored perspective grid: segment joins never reset its phase.
   for(let x=Math.ceil(left/105)*105;x<=right;x+=105){
     const s=terrain.segments.find(p=>p.type!=='gap'&&x>=p.start&&x<p.end);
     if(!s)continue;
     const sx=x-distance,sy=surface(s,x);
     glowLine(sx,sy+2,sx-72,height,secondary,1,1,.17);
   }
   for(const depth of [32,76,126]){
     ctx.beginPath();for(const run of runs)traceSurface(ctx,run,distance,depth);
     ctx.strokeStyle=primary;ctx.lineWidth=.8;ctx.globalAlpha=.12;
     ctx.shadowBlur=0;ctx.stroke();
   }
   ctx.restore();
   // One surface outline per island, never one stroke per flat/slope tile.
   ctx.save();ctx.beginPath();
   for(const run of runs)traceSurface(ctx,run,distance);
   ctx.strokeStyle=primary;ctx.lineWidth=2.8;ctx.globalAlpha=.92;
   ctx.shadowColor=primary;ctx.shadowBlur=21+clamp(flow,0,100)*.12;
   ctx.stroke();ctx.restore();
   // Gap: only neon ledges and jump cue. Absolutely NO black fill.
   for(const gap of terrain.segments){
     if(gap.type!=='gap'||gap.end<=left||gap.start>=right)continue;
     for(const edge of [gap.start,gap.end]){
       const x=edge-distance;
       if(x<-20||x>width+20)continue;
       glowLine(x,gap.y0-2,x,gap.y0+53,secondary,3,17,.85);
       glowLine(x-5,gap.y0,x+5,gap.y0,'#ffffff',2,10,.64);
     }
     const cue=gap.start-distance;
     if(cue>-30&&cue<width){
       ctx.save();ctx.fillStyle=secondary;ctx.font='800 13px system-ui';
       ctx.textAlign='center';ctx.globalAlpha=.8;
       ctx.fillText('↑',cue-32,gap.y0-35);ctx.restore();
     }
   }
 }
 return {drawTerrain,visibleRuns,surface};
});