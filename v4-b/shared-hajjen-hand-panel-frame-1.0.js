/* HAJJEN HAND outer frame mount v1.0.
   Attaches the existing shared panel-frame component to the live HAND panel. */
(()=>{
  const panel=window.HAJJEN_SHARED_HAND?.panel||document.querySelector('.zone3-app .cards-hud .shared-hand-panel');
  if(!panel)return;
  window.HAJJEN_PANEL_FRAME?.mount?.(panel);
})();
