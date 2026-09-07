/* HAJJEN Objectives vector frame — seam-free coded prototype.
   Objectives only. V1.3 keeps the thin continuous frame, refines the small
   nested corner accent and adds a tiny integrated round corner node. */
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

  const corners=['tl','tr','br','bl'].map(name=>{
    const group=document.createElementNS(NS,'g');
    group.setAttribute('data-corner',name);

    const accent=document.createElementNS(NS,'path');
    accent.setAttribute('class','corner-accent');

    const node=document.createElementNS(NS,'circle');
    node.setAttribute('class','corner-node');
    node.setAttribute('r','1.35');

    group.append(accent,node);
    svg.appendChild(group);
    return {name,accent,node};
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

    /* Compact nested corner motif. The round node sits inside the quarter-curve,
       so it reads as part of the ornament rather than floating in the parchment. */
    const inset=6.05;
    const radius=4.15;
    const arm=7.35;
    const nodeOffset=2.95;

    const data={
      tl:{
        d:`M ${inset} ${inset+radius+arm} V ${inset+radius} Q ${inset} ${inset} ${inset+radius} ${inset} H ${inset+radius+arm}`,
        cx:inset+nodeOffset,cy:inset+nodeOffset
      },
      tr:{
        d:`M ${w-inset-radius-arm} ${inset} H ${w-inset-radius} Q ${w-inset} ${inset} ${w-inset} ${inset+radius} V ${inset+radius+arm}`,
        cx:w-inset-nodeOffset,cy:inset+nodeOffset
      },
      br:{
        d:`M ${w-inset} ${h-inset-radius-arm} V ${h-inset-radius} Q ${w-inset} ${h-inset} ${w-inset-radius} ${h-inset} H ${w-inset-radius-arm}`,
        cx:w-inset-nodeOffset,cy:h-inset-nodeOffset
      },
      bl:{
        d:`M ${inset+radius+arm} ${h-inset} H ${inset+radius} Q ${inset} ${h-inset} ${inset} ${h-inset-radius} V ${h-inset-radius-arm}`,
        cx:inset+nodeOffset,cy:h-inset-nodeOffset
      }
    };

    corners.forEach(({name,accent,node})=>{
      accent.setAttribute('d',data[name].d);
      node.setAttribute('cx',data[name].cx);
      node.setAttribute('cy',data[name].cy);
    });
  }

  panel.prepend(svg);
  render();

  const ro=typeof ResizeObserver==='function'?new ResizeObserver(render):null;
  ro?.observe(panel);
  if(!ro)window.addEventListener('resize',render,{passive:true});

  window.HAJJEN_OBJECTIVES_VECTOR_FRAME={version:'1.3',panel,svg,render,resizeObserver:ro};
})();
