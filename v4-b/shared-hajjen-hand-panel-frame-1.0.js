/* HAJJEN HAND outer frame mount v1.2.
   Attaches the shared panel-frame component to the live HAND panel.
   The DEV background image is now handled directly in CSS from the real repo asset. */
(()=>{
  const panel=window.HAJJEN_SHARED_HAND?.panel||document.querySelector('.zone3-app .cards-hud .shared-hand-panel');
  if(!panel)return;
  window.HAJJEN_PANEL_FRAME?.mount?.(panel);
})();
