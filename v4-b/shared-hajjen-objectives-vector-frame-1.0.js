/* HAJJEN Objectives vector frame — seam-free coded prototype.
   Objectives only. V1.2 adds a small integrated corner accent inspired by
   the polished target UI while keeping every rail continuous and seam-free. */
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
    ['0%','#f2d586'],
    ['35%','#d2a253'],
    ['70%','#a87637'],
    ['100%','#e2bd70']
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

  const cornerAccents=['tl','tr','br','bl'].map(name=>{
    const p=document.createElementNS(NS,'path');
    p.setAttribute('class','corner-accent');
    p.setAttribute('data-corner',name);
    svg.appendChild(p);
    return {name,p};
  });

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

    const outer=roundedFramePath(w,h,2.35,5.9);
    const innerD=roundedFramePath(w,h,5.1,4.35);
    const highlightD=roundedFramePath(w,h,3.5,5.15);

    shadow.setAttribute('d',outer);
    gold.setAttribute('d',outer);
    inner.setAttribute('d',innerD);
    highlight.setAttribute('d',highlightD);

    /* Small nested L/curve accents: they echo the corner radius instead of
       floating into the parchment. No dots, diagonals or disconnected ornaments. */
    const inset=6.05;
    const radius=4.15;
    const arm=8.0;

    const data={
      tl:`M ${inset} ${inset+radius+arm} V ${inset+radius} Q ${inset} ${inset} ${inset+radius} ${inset} H ${inset+radius+arm}`,
      tr:`M ${w-inset-radius-arm} ${inset} H ${w-inset-radius} Q ${w-inset} ${inset} ${w-inset} ${inset+radius} V ${inset+radius+arm}`,
      br:`M ${w-inset} ${h-inset-radius-arm} V ${h-inset-radius} Q ${w-inset} ${h-inset} ${w-inset-radius} ${h-inset} H ${w-inset-radius-arm}`,
      bl:`M ${inset+radius+arm} ${h-inset} H ${inset+radius} Q ${inset} ${h-inset} ${inset} ${h-inset-radius} V ${h-inset-radius-arm}`
    };

    cornerAccents.forEach(({name,p})=>p.setAttribute('d',data[name]));
  }

  panel.prepend(svg);
  render();

  const ro=typeof ResizeObserver==='function'?new ResizeObserver(render):null;
  ro?.observe(panel);
  if(!ro)window.addEventListener('resize',render,{passive:true});

  window.HAJJEN_OBJECTIVES_VECTOR_FRAME={version:'1.2',panel,svg,render,resizeObserver:ro};
})();
