/* HAJJEN Objectives vector frame — seam-free coded prototype.
   Draws one continuous responsive SVG frame around Objectives only.
   V1.1 removes the floating corner flourish/dot and uses a tighter, cleaner
   corner radius so the frame reads more like the polished target UI. */
(()=>{
  const panel=document.querySelector('.zone3-app .objectives.shared-objectives');
  if(!panel)return;

  panel.querySelector(':scope > .hajjen-panel-frame')?.remove();
  panel.querySelector(':scope > .hajjen-objectives-vector-frame')?.remove();

  const NS='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(NS,'svg');
  svg.classList.add('hajjen-objectives-vector-frame');
  svg.setAttribute('aria-hidden','true');
  svg.setAttribute('preserveAspectRatio','none');

  const defs=document.createElementNS(NS,'defs');
  const gradient=document.createElementNS(NS,'linearGradient');
  gradient.id='hajjenObjectivesGold';
  gradient.setAttribute('x1','0');
  gradient.setAttribute('y1','0');
  gradient.setAttribute('x2','0');
  gradient.setAttribute('y2','1');
  gradient.setAttribute('gradientUnits','objectBoundingBox');
  [
    ['0%','#f0cf78'],
    ['34%','#c89443'],
    ['70%','#9a672f'],
    ['100%','#ddb35d']
  ].forEach(([offset,color])=>{
    const stop=document.createElementNS(NS,'stop');
    stop.setAttribute('offset',offset);
    stop.setAttribute('stop-color',color);
    gradient.appendChild(stop);
  });
  defs.appendChild(gradient);
  svg.appendChild(defs);

  const makePath=(cls)=>{
    const p=document.createElementNS(NS,'path');
    p.setAttribute('class',cls);
    svg.appendChild(p);
    return p;
  };

  const shadow=makePath('frame-shadow');
  const gold=makePath('frame-gold');
  const inner=makePath('frame-inner');
  const highlight=makePath('frame-highlight');

  function roundedFramePath(w,h,inset,r){
    const x=inset;
    const y=inset;
    const right=Math.max(x,w-inset);
    const bottom=Math.max(y,h-inset);
    const radius=Math.min(r,(right-x)/2,(bottom-y)/2);
    return [
      `M ${x+radius} ${y}`,
      `H ${right-radius}`,
      `Q ${right} ${y} ${right} ${y+radius}`,
      `V ${bottom-radius}`,
      `Q ${right} ${bottom} ${right-radius} ${bottom}`,
      `H ${x+radius}`,
      `Q ${x} ${bottom} ${x} ${bottom-radius}`,
      `V ${y+radius}`,
      `Q ${x} ${y} ${x+radius} ${y}`,
      'Z'
    ].join(' ');
  }

  function render(){
    const w=Math.max(80,panel.clientWidth||0);
    const h=Math.max(100,panel.clientHeight||0);
    svg.setAttribute('viewBox',`0 0 ${w} ${h}`);

    /* Tighter radii make the corners feel deliberate rather than bulbous.
       All four visible rails remain continuous closed SVG paths — no joins. */
    const outer=roundedFramePath(w,h,2.4,5.8);
    const innerD=roundedFramePath(w,h,5.2,4.3);
    const highlightD=roundedFramePath(w,h,3.5,5.1);

    shadow.setAttribute('d',outer);
    gold.setAttribute('d',outer);
    inner.setAttribute('d',innerD);
    highlight.setAttribute('d',highlightD);
  }

  panel.prepend(svg);
  render();

  const ro=typeof ResizeObserver==='function'?new ResizeObserver(render):null;
  ro?.observe(panel);
  if(!ro)window.addEventListener('resize',render,{passive:true});

  window.HAJJEN_OBJECTIVES_VECTOR_FRAME={version:'1.1',panel,svg,render,resizeObserver:ro};
})();
