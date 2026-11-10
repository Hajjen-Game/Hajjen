/* CHROMA RUSH — Premium World Lighting & Cohesion 3.0.
 * One deterministic light budget across the ORIGINAL sky, track material,
 * obstacle bodies and player glass. No extra sprites, trails, screen passes,
 * rings, hitboxes or simulation state. Chroma Tide still owns spatial color.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaWorldLighting=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
  const rgba=(hex,alpha)=>{
    const n=parseInt(hex.slice(1),16);
    return 'rgba('+(n>>16)+','+((n>>8)&255)+','+(n&255)+','+
      clamp(alpha,0,1)+')';
  };
  // This envelope is evaluated once per DRAW, not once per obstacle.
  // A permanent visual base makes the world feel illuminated even when
  // Surge is idle, while Surge only adds a small ambient "lift".
  function evaluate({flow=0,surge=0,quality={}}={}){
    const q=clamp(quality.glow??1,.15,1);
    const activity=clamp(flow,0,100)/100;
    const lift=clamp(surge,0,1);
    const energy=.64+activity*.17+lift*.19;
    const visible=q*.8+.2; // contrast never disappears on Performance.
    return {
      energy,
      sky:{
        key:(.20+energy*.105)*q,
        bounce:(.088+energy*.042)*q,
        horizon:(.13+energy*.078)*q
      },
      terrain:{
        surface:.18+energy*.14*visible,
        bounce:(.095+energy*.085)*q,
        edgeGlow:(24+energy*10)*q
      },
      player:{
        ambient:clamp(.24+energy*.62,0,1),
        // Preserve the strong near-white main silhouette.
        edgeBoost:.04+energy*.055
      },
      hazard:{
        // Hazard readability is deliberate: low-spec visuals may lose
        // bloom, but never their opaque-enough shell/outer boundary.
        veil:.105+energy*.048,
        shell:.30+energy*.115,
        inset:.16+energy*.045,
        border:.68+energy*.12,
        bloom:(18+energy*6)*q,
        // Physical *existing* shell fill gets a white-tinted top face.
        faceGlint:(.07+energy*.07)*visible
      }
    };
  }
  function shellGradient(ctx,color,top,height,light){
    const v=light?.hazard||evaluate().hazard;
    const g=ctx.createLinearGradient(0,top,0,top+Math.max(1,height));
    g.addColorStop(0,rgba('#ffffff',v.faceGlint));
    g.addColorStop(.25,rgba(color,v.shell));
    g.addColorStop(.75,rgba(color,v.shell*.82));
    g.addColorStop(1,rgba(color,v.shell*.62));
    return g;
  }
  return {evaluate,shellGradient};
});
