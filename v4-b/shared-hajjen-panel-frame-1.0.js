/* HAJJEN reusable panel-frame mount.
   Shared core only: creates the same eight-piece frame structure for any panel.
   Individual panels keep their own sizing/padding variables in CSS. */
(()=>{
  const PARTS=['tl','t','tr','l','r','bl','b','br'];

  function mount(panel){
    if(!panel)return null;
    panel.classList.add('hajjen-framed-panel');

    let frame=panel.querySelector(':scope > .hajjen-panel-frame');
    if(frame)return frame;

    frame=document.createElement('span');
    frame.className='hajjen-panel-frame';
    frame.setAttribute('aria-hidden','true');

    PARTS.forEach(part=>{
      const piece=document.createElement('span');
      piece.className=`hajjen-panel-frame-piece ${part}`;
      frame.appendChild(piece);
    });

    panel.prepend(frame);
    return frame;
  }

  window.HAJJEN_PANEL_FRAME={version:'1.0',mount,parts:PARTS.slice()};
})();
