/* HAJJEN panel-frame compatibility marker — vector-only UI.
   The old eight-piece PNG frame and matte filter are retired. Shared callers
   still use mount() to mark eligible panels before the SVG vector frame pass. */
(()=>{
  function mount(panel){
    if(!panel)return null;
    panel.classList.add('hajjen-framed-panel');
    return panel.querySelector(':scope > .hajjen-shared-vector-frame')||null;
  }

  window.HAJJEN_PANEL_FRAME={
    version:'2.0-vector-only',
    mount,
    parts:[]
  };
})();
