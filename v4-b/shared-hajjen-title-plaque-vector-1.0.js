/* HAJJEN shared vector title plaque — DEV prototype.
   V2.2: approved green plaques remain on SHARKAN/EVENT LOG, while ACTION BAR,
   CARD DECKS and HAND share the exact same muted-navy plaque variant. */
(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get('dev')!=='1')return;

  const NS='http://www.w3.org/2000/svg';

  function svgEl(name,attrs={}){
    const node=document.createElementNS(NS,name);
    Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,String(value)));
    return node;
  }

  function buildPlaque(index=0,variant='green'){
    const svg=svgEl('svg',{
      class:'hajjen-vector-title-plaque-svg',
      viewBox:'0 0 360 42',
      preserveAspectRatio:'none',
      'aria-hidden':'true'
    });

    const defs=svgEl('defs');

    const gold=svgEl('linearGradient',{
      id:`hajjenTitleGold-${index}`,
      x1:'0',y1:'0',x2:'0',y2:'1',
      gradientUnits:'objectBoundingBox'
    });
    [
      ['0%','#EFD6A0'],
      ['16%','#ECD39D'],
      ['58%','#ECD39D'],
      ['74%','#DFB46B'],
      ['88%','#C9914F'],
      ['100%','#B77A3B']
    ].forEach(([offset,color])=>gold.appendChild(svgEl('stop',{offset,'stop-color':color})));

    const surface=svgEl('linearGradient',{
      id:`hajjenTitleSurface-${index}`,
      x1:'0',y1:'0',x2:'0',y2:'1',
      gradientUnits:'objectBoundingBox'
    });

    const stops=variant==='blue'
      ? [
          ['0%','#52606D'],
          ['34%','#434F5B'],
          ['72%','#363F49'],
          ['100%','#2E3741']
        ]
      : [
          ['0%','#82936A'],
          ['34%','#74885C'],
          ['72%','#62774B'],
          ['100%','#56683F']
        ];
    stops.forEach(([offset,color])=>surface.appendChild(svgEl('stop',{offset,'stop-color':color})));

    defs.append(gold,surface);
    svg.appendChild(defs);

    const outerD=[
      'M 48 6','H 312','L 322 13','V 29','L 312 36',
      'H 48','L 38 29','V 13','Z'
    ].join(' ');
    const innerD=[
      'M 51 8.5','H 309','L 319 15','V 27','L 309 33.5',
      'H 51','L 41 27','V 15','Z'
    ].join(' ');

    svg.appendChild(svgEl('path',{class:'plaque-base',d:outerD,fill:`url(#hajjenTitleSurface-${index})`}));
    svg.appendChild(svgEl('path',{class:'plaque-frame-shadow',d:outerD}));
    svg.appendChild(svgEl('path',{class:'plaque-frame-gold',d:outerD,stroke:`url(#hajjenTitleGold-${index})`}));
    svg.appendChild(svgEl('path',{class:'plaque-frame-inner',d:innerD}));
    svg.appendChild(svgEl('path',{
      class:'plaque-frame-highlight',
      d:'M 52 8.9 H 308 L 317.3 15.1'
    }));
    svg.appendChild(svgEl('path',{
      class:'plaque-frame-lower',
      d:'M 52 33.1 H 308 L 317.3 26.9'
    }));

    [['48','21'],['312','21']].forEach(([cx,cy])=>{
      svg.appendChild(svgEl('circle',{class:'plaque-mount-ring',cx,cy,r:'4.1'}));
      svg.appendChild(svgEl('circle',{class:'plaque-mount-core',cx,cy,r:'2.65'}));
      svg.appendChild(svgEl('circle',{class:'plaque-mount-jewel',cx,cy:Math.max(0,Number(cy)-.65),r:'.72'}));
    });

    return svg;
  }

  function mount(panel,index=0,options={}){
    if(!panel)return null;
    const headingSelector=options.headingSelector||':scope > h2';
    const heading=panel.querySelector(headingSelector);
    if(!heading)return null;

    const existing=panel.querySelector(':scope > .hajjen-vector-title-plaque-layer');
    if(existing)return existing;

    let label=options.label||'';
    if(!label&&options.labelSelector)label=heading.querySelector(options.labelSelector)?.textContent||'';
    if(!label)label=(heading.textContent||'').trim()||'SHARKAN';

    const variant=options.variant==='blue'?'blue':'green';
    heading.classList.add('hajjen-vector-title-plaque-source');
    heading.dataset.vectorTitlePlaqueSource=`${variant}-gold-2.2`;

    const layer=document.createElement('div');
    layer.className=`hajjen-vector-title-plaque-layer hajjen-vector-title-plaque-${variant}`;
    layer.dataset.vectorTitlePlaque=`${variant}-gold-2.2`;
    layer.setAttribute('aria-hidden','true');

    const svg=buildPlaque(index,variant);
    const text=document.createElement('span');
    text.className='hajjen-vector-title-plaque-text';
    text.textContent=label.trim();

    layer.append(svg,text);
    panel.appendChild(layer);
    return layer;
  }

  function apply(){
    const status=document.querySelector('.zone3-app .shared-status.hajjen-framed-panel');
    const eventLog=document.querySelector('.zone3-app .shared-event-log.hajjen-framed-panel');
    const actionBar=document.querySelector('.zone3-app .shared-action-bar');
    const cardDecks=document.querySelector('.zone3-app .shared-card-decks-panel');
    const hand=document.querySelector('.zone3-app .shared-hand-panel');

    if(status)mount(status,0);
    if(eventLog)mount(eventLog,1);
    if(actionBar)mount(actionBar,2,{
      headingSelector:':scope > .action-hud-title',
      labelSelector:':scope > span:first-child',
      variant:'blue'
    });
    if(cardDecks)mount(cardDecks,3,{variant:'blue'});
    if(hand)mount(hand,4,{
      headingSelector:':scope > h2',
      labelSelector:':scope > .hand-title-text',
      variant:'blue'
    });
  }

  apply();
  const root=document.getElementById('campaignRoot')||document.body;
  new MutationObserver(apply).observe(root,{childList:true,subtree:true});

  window.HAJJEN_VECTOR_TITLE_PLAQUE={version:'2.2',mount,buildPlaque};
})();
