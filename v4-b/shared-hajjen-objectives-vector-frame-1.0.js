/* HAJJEN Objectives vector frame — seam-free coded prototype.
   Draws one continuous responsive SVG frame around Objectives only. */
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

  const corners=['tl','tr','br','bl'].map(name=>{
    const group=document.createElementNS(NS,'g');
    group.setAttribute('data-corner',name);
    const flourish=document.createElementNS(NS,'path');
    flourish.setAttribute('class','corner-flourish');
    const dot=document.createElementNS(NS,'circle');
    dot.setAttribute('class','corner-dot');
    dot.setAttribute('r','1.55');
    group.append(flourish,dot);
    svg.appendChild(group);
    return {name,flourish,dot};
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

    const outer=roundedFramePath(w,h,2.4,8.5);
    const innerD=roundedFramePath(w,h,5.2,6.7);
    const highlightD=roundedFramePath(w,h,3.5,7.8);
    shadow.setAttribute('d',outer);
    gold.setAttribute('d',outer);
    inner.setAttribute('d',innerD);
    highlight.setAttribute('d',highlightD);

    const pad=2.4;
    const arm=16;
    const curve=9;
    const dotOffset=6.6;

    const data={
      tl:{
        d:`M ${pad} ${pad+arm} C ${pad+1.5} ${pad+curve} ${pad+curve} ${pad+1.5} ${pad+arm} ${pad}`,
        cx:pad+dotOffset,cy:pad+dotOffset
      },
      tr:{
        d:`M ${w-pad-arm} ${pad} C ${w-pad-curve} ${pad+1.5} ${w-pad-1.5} ${pad+curve} ${w-pad} ${pad+arm}`,
        cx:w-pad-dotOffset,cy:pad+dotOffset
      },
      br:{
        d:`M ${w-pad} ${h-pad-arm} C ${w-pad-1.5} ${h-pad-curve} ${w-pad-curve} ${h-pad-1.5} ${w-pad-arm} ${h-pad}`,
        cx:w-pad-dotOffset,cy:h-pad-dotOffset
      },
      bl:{
        d:`M ${pad+arm} ${h-pad} C ${pad+curve} ${h-pad-1.5} ${pad+1.5} ${h-pad-curve} ${pad} ${h-pad-arm}`,
        cx:pad+dotOffset,cy:h-pad-dotOffset
      }
    };

    corners.forEach(({name,flourish,dot})=>{
      flourish.setAttribute('d',data[name].d);
      dot.setAttribute('cx',data[name].cx);
      dot.setAttribute('cy',data[name].cy);
    });
  }

  panel.prepend(svg);
  render();

  const ro=typeof ResizeObserver==='function'?new ResizeObserver(render):null;
  ro?.observe(panel);
  if(!ro)window.addEventListener('resize',render,{passive:true});

  window.HAJJEN_OBJECTIVES_VECTOR_FRAME={version:'1.0',panel,svg,render,resizeObserver:ro};
})();
