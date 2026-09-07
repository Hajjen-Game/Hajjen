/* HAJJEN shared thin vector panel frame — seam-free coded prototype.
   V1.9 keeps the approved Objectives geometry and board-matched bronze-gold
   palette, now shared by Objectives, Sharkan/Status, Event Log, Card Decks,
   Hand and Action Bar. No PNG slices or bitmap joins. */
(()=>{
  const NS='http://www.w3.org/2000/svg';
  const targets=[
    {key:'objectives',selector:'.zone3-app .objectives.shared-objectives'},
    {key:'status',selector:'.zone3-app .shared-status.hajjen-framed-panel'},
    {key:'event-log',selector:'.zone3-app .shared-event-log.hajjen-framed-panel'},
    {key:'card-decks',selector:'.zone3-app .shared-card-decks-panel.hajjen-framed-panel'},
    {key:'hand',selector:'.zone3-app .cards-hud .shared-hand-panel.hajjen-framed-panel'},
    {key:'action-bar',selector:'.zone3-app .action-hud.shared-action-bar'}
  ];

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

  function mount(panel,key,index){
    if(!panel)return null;

    panel.querySelector(':scope > .hajjen-panel-frame')?.remove();
    panel.querySelector(':scope > .hajjen-shared-vector-frame')?.remove();
    panel.querySelector(':scope > .hajjen-objectives-vector-frame')?.remove();

    const svg=document.createElementNS(NS,'svg');
    svg.classList.add('hajjen-shared-vector-frame');
    if(key==='objectives')svg.classList.add('hajjen-objectives-vector-frame');
    svg.setAttribute('data-frame-panel',key);
    svg.setAttribute('aria-hidden','true');
    svg.setAttribute('preserveAspectRatio','none');

    const gradientId=`hajjenPanelGold-${key}-${index}`;
    const defs=document.createElementNS(NS,'defs');
    const gradient=document.createElementNS(NS,'linearGradient');
    gradient.id=gradientId;
    gradient.setAttribute('x1','0');
    gradient.setAttribute('y1','0');
    gradient.setAttribute('x2','0');
    gradient.setAttribute('y2','1');
    gradient.setAttribute('gradientUnits','objectBoundingBox');
    [
      ['0%','#efd6a0'],
      ['28%','#c9914f'],
      ['62%','#7a4c29'],
      ['82%','#b77a3b'],
      ['100%','#dfb46b']
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
    gold.setAttribute('stroke',`url(#${gradientId})`);
    const inner=makePath('frame-inner');
    const highlight=makePath('frame-highlight');

    const corners=['tl','tr','br','bl'].map(name=>{
      const group=document.createElementNS(NS,'g');
      group.setAttribute('data-corner',name);

      const accent=document.createElementNS(NS,'path');
      accent.setAttribute('class','corner-accent');

      const sweepShadow=document.createElementNS(NS,'path');
      sweepShadow.setAttribute('class','corner-sweep-shadow');

      const sweep=document.createElementNS(NS,'path');
      sweep.setAttribute('class','corner-sweep');

      const node=document.createElementNS(NS,'circle');
      node.setAttribute('class','corner-node');
      node.setAttribute('r','1.35');

      group.append(accent,sweepShadow,sweep,node);
      svg.appendChild(group);
      return {name,accent,sweepShadow,sweep,node};
    });

    function render(){
      const w=Math.max(80,panel.clientWidth||0);
      const h=Math.max(80,panel.clientHeight||0);
      svg.setAttribute('viewBox',`0 0 ${w} ${h}`);

      const outer=roundedFramePath(w,h,2.35,5.9);
      const innerD=roundedFramePath(w,h,5.1,4.35);
      const highlightD=roundedFramePath(w,h,3.5,5.15);

      shadow.setAttribute('d',outer);
      gold.setAttribute('d',outer);
      inner.setAttribute('d',innerD);
      highlight.setAttribute('d',highlightD);

      /* Approved compact motif from Objectives: small node plus tight engraved
         quarter-sweep close to the rail. Mirrored identically in all corners. */
      const inset=6.05;
      const radius=4.15;
      const arm=7.35;
      const nodeOffset=2.95;
      const sweepReach=10.9;
      const sweepEdge=0.72;

      const data={
        tl:{
          accent:`M ${inset} ${inset+radius+arm} V ${inset+radius} Q ${inset} ${inset} ${inset+radius} ${inset} H ${inset+radius+arm}`,
          sweep:`M ${inset+sweepEdge} ${inset+sweepReach} C ${inset+1.55} ${inset+7.55}, ${inset+6.35} ${inset+1.75}, ${inset+sweepReach} ${inset+sweepEdge}`,
          cx:inset+nodeOffset,cy:inset+nodeOffset
        },
        tr:{
          accent:`M ${w-inset-radius-arm} ${inset} H ${w-inset-radius} Q ${w-inset} ${inset} ${w-inset} ${inset+radius} V ${inset+radius+arm}`,
          sweep:`M ${w-inset-sweepEdge} ${inset+sweepReach} C ${w-inset-1.55} ${inset+7.55}, ${w-inset-6.35} ${inset+1.75}, ${w-inset-sweepReach} ${inset+sweepEdge}`,
          cx:w-inset-nodeOffset,cy:inset+nodeOffset
        },
        br:{
          accent:`M ${w-inset} ${h-inset-radius-arm} V ${h-inset-radius} Q ${w-inset} ${h-inset} ${w-inset-radius} ${h-inset} H ${w-inset-radius-arm}`,
          sweep:`M ${w-inset-sweepEdge} ${h-inset-sweepReach} C ${w-inset-1.55} ${h-inset-7.55}, ${w-inset-6.35} ${h-inset-1.75}, ${w-inset-sweepReach} ${h-inset-sweepEdge}`,
          cx:w-inset-nodeOffset,cy:h-inset-nodeOffset
        },
        bl:{
          accent:`M ${inset+radius+arm} ${h-inset} H ${inset+radius} Q ${inset} ${h-inset} ${inset} ${h-inset-radius} V ${h-inset-radius-arm}`,
          sweep:`M ${inset+sweepEdge} ${h-inset-sweepReach} C ${inset+1.55} ${h-inset-7.55}, ${inset+6.35} ${h-inset-1.75}, ${inset+sweepReach} ${h-inset-sweepEdge}`,
          cx:inset+nodeOffset,cy:h-inset-nodeOffset
        }
      };

      corners.forEach(({name,accent,sweepShadow,sweep,node})=>{
        accent.setAttribute('d',data[name].accent);
        sweepShadow.setAttribute('d',data[name].sweep);
        sweep.setAttribute('d',data[name].sweep);
        node.setAttribute('cx',data[name].cx);
        node.setAttribute('cy',data[name].cy);
      });
    }

    panel.prepend(svg);
    render();

    const ro=typeof ResizeObserver==='function'?new ResizeObserver(render):null;
    ro?.observe(panel);
    if(!ro)window.addEventListener('resize',render,{passive:true});

    return {key,panel,svg,render,resizeObserver:ro};
  }

  const mounted=targets.map((target,index)=>mount(document.querySelector(target.selector),target.key,index)).filter(Boolean);
  window.HAJJEN_SHARED_VECTOR_FRAMES={version:'1.9',mounted};
  window.HAJJEN_OBJECTIVES_VECTOR_FRAME=mounted.find(item=>item.key==='objectives')||null;
})();
