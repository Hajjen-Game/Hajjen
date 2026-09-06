/* HAJJEN reusable panel-frame mount.
   Shared core: creates the same eight-piece frame structure for any panel.
   Also installs the shared SVG matte-clean filter used by frame family A. */
(()=>{
  const PARTS=['tl','t','tr','l','r','bl','b','br'];
  const FILTER_ID='hajjen-frame-matte-clean';

  function ensureMatteFilter(){
    if(document.getElementById(FILTER_ID))return;

    const NS='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(NS,'svg');
    svg.setAttribute('aria-hidden','true');
    svg.setAttribute('width','0');
    svg.setAttribute('height','0');
    svg.style.position='absolute';
    svg.style.width='0';
    svg.style.height='0';
    svg.style.overflow='hidden';
    svg.style.pointerEvents='none';

    const defs=document.createElementNS(NS,'defs');
    const filter=document.createElementNS(NS,'filter');
    filter.id=FILTER_ID;
    filter.setAttribute('color-interpolation-filters','sRGB');
    filter.setAttribute('x','-10%');
    filter.setAttribute('y','-10%');
    filter.setAttribute('width','120%');
    filter.setAttribute('height','120%');

    /* Build a luminance mask from the source artwork. Black/near-black matte
       becomes transparent; bronze/gold pixels remain opaque. The 10→60 RGB
       ramp matches the cleaned asset preview without bleaching the frame. */
    const luma=document.createElementNS(NS,'feColorMatrix');
    luma.setAttribute('in','SourceGraphic');
    luma.setAttribute('type','matrix');
    luma.setAttribute('values',
      '0 0 0 0 0  '+
      '0 0 0 0 0  '+
      '0 0 0 0 0  '+
      '.2126 .7152 .0722 0 0');
    luma.setAttribute('result','hajjenFrameLuma');

    const transfer=document.createElementNS(NS,'feComponentTransfer');
    transfer.setAttribute('in','hajjenFrameLuma');
    transfer.setAttribute('result','hajjenFrameMask');
    const alpha=document.createElementNS(NS,'feFuncA');
    alpha.setAttribute('type','linear');
    alpha.setAttribute('slope','5.1');
    alpha.setAttribute('intercept','-0.2');
    transfer.appendChild(alpha);

    const composite=document.createElementNS(NS,'feComposite');
    composite.setAttribute('in','SourceGraphic');
    composite.setAttribute('in2','hajjenFrameMask');
    composite.setAttribute('operator','in');

    filter.append(luma,transfer,composite);
    defs.appendChild(filter);
    svg.appendChild(defs);
    document.documentElement.prepend(svg);
  }

  function mount(panel){
    if(!panel)return null;
    ensureMatteFilter();
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

  ensureMatteFilter();
  window.HAJJEN_PANEL_FRAME={version:'1.1',mount,parts:PARTS.slice()};
})();
