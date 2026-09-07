/* HAJJEN shared vector title plaque — DEV prototype.
   SHARKAN/status V1.6: plaque frame now uses the same layered rail logic as the
   approved vector board frame, plus restrained circular side mounts. */
(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get('dev')!=='1')return;

  const NS='http://www.w3.org/2000/svg';

  function svgEl(name,attrs={}){
    const node=document.createElementNS(NS,name);
    Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,String(value)));
    return node;
  }

  function buildPlaque(index=0){
    const svg=svgEl('svg',{
      class:'hajjen-vector-title-plaque-svg',
      viewBox:'0 0 360 42',
      preserveAspectRatio:'none',
      'aria-hidden':'true'
    });

    const defs=svgEl('defs');

    /* Pale-gold-forward version of the board-frame metal family. The important
       change from V1.5 is that this gradient is used as a THIN STROKE, not as a
       broad filled metal band. */
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

    const green=svgEl('linearGradient',{
      id:`hajjenTitleGreen-${index}`,
      x1:'0',y1:'0',x2:'0',y2:'1',
      gradientUnits:'objectBoundingBox'
    });
    [
      ['0%','#82936a'],
      ['34%','#74885c'],
      ['72%','#62774b'],
      ['100%','#56683f']
    ].forEach(([offset,color])=>green.appendChild(svgEl('stop',{offset,'stop-color':color})));

    defs.append(gold,green);
    svg.appendChild(defs);

    /* Simple low plaque. The frame is no longer a filled gold polygon. Instead
       the SAME outline is layered like the board frame: dark support -> pale
       gold rail -> fine bronze inner rail -> pale highlight. */
    const outerD=[
      'M 48 6','H 312','L 322 13','V 29','L 312 36',
      'H 48','L 38 29','V 13','Z'
    ].join(' ');
    const innerD=[
      'M 51 8.5','H 309','L 319 15','V 27','L 309 33.5',
      'H 51','L 41 27','V 15','Z'
    ].join(' ');

    svg.appendChild(svgEl('path',{class:'plaque-base',d:outerD,fill:`url(#hajjenTitleGreen-${index})`}));
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

    /* Small round mounts echo the circular nodes on the board/panel frame and
       visually explain how the title plaque is attached to the same rail. */
    [['30','21'],['330','21']].forEach(([cx,cy])=>{
      svg.appendChild(svgEl('circle',{class:'plaque-mount-ring',cx,cy,r:'4.1'}));
      svg.appendChild(svgEl('circle',{class:'plaque-mount-core',cx,cy,r:'2.65'}));
      svg.appendChild(svgEl('circle',{class:'plaque-mount-jewel',cx,cy:Math.max(0,Number(cy)-.65),r:'.72'}));
    });

    return svg;
  }

  function mount(panel,index=0){
    if(!panel)return null;
    const heading=panel.querySelector(':scope > h2');
    if(!heading)return null;

    const existing=panel.querySelector(':scope > .hajjen-vector-title-plaque-layer');
    if(existing)return existing;

    const label=(heading.textContent||'').trim()||'SHARKAN';
    heading.classList.add('hajjen-vector-title-plaque-source');
    heading.dataset.vectorTitlePlaqueSource='green-gold-1.6';

    const layer=document.createElement('div');
    layer.className='hajjen-vector-title-plaque-layer';
    layer.dataset.vectorTitlePlaque='green-gold-1.6';
    layer.setAttribute('aria-hidden','true');

    const svg=buildPlaque(index);
    const text=document.createElement('span');
    text.className='hajjen-vector-title-plaque-text';
    text.textContent=label;

    layer.append(svg,text);
    panel.appendChild(layer);
    return layer;
  }

  function apply(){
    const panel=document.querySelector('.zone3-app .shared-status.hajjen-framed-panel');
    if(panel)mount(panel,0);
  }

  apply();
  const root=document.getElementById('campaignRoot')||document.body;
  new MutationObserver(apply).observe(root,{childList:true,subtree:true});

  window.HAJJEN_VECTOR_TITLE_PLAQUE={version:'1.6',mount,buildPlaque};
})();
