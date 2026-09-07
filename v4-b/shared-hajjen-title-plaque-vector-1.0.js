/* HAJJEN shared vector title plaque — DEV prototype.
   SHARKAN/status V1.4: simple compact geometry with the exact approved
   board-frame bronze/gold palette. No dark/brown outer shell. */
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

    /* Exact approved frame palette:
       #3B2416 #4C2C16 #7A4C29 #B77A3B #C9914F #DFB46B #EFD6A0
       The two darkest browns are reserved for subtle shadow/contrast in CSS;
       the visible outer rail remains bronze/gold rather than a brown band. */
    const gold=svgEl('linearGradient',{
      id:`hajjenTitleGold-${index}`,
      x1:'0',y1:'0',x2:'0',y2:'1',
      gradientUnits:'objectBoundingBox'
    });
    [
      ['0%','#EFD6A0'],
      ['24%','#DFB46B'],
      ['50%','#C9914F'],
      ['74%','#B77A3B'],
      ['100%','#DFB46B']
    ].forEach(([offset,color])=>gold.appendChild(svgEl('stop',{offset,'stop-color':color})));

    /* Green stays deliberately soft/light; this pass changes the metal palette,
       not the plaque geometry. */
    const green=svgEl('linearGradient',{
      id:`hajjenTitleGreen-${index}`,
      x1:'0',y1:'0',x2:'0',y2:'1',
      gradientUnits:'objectBoundingBox'
    });
    [
      ['0%','#7b8d61'],
      ['34%','#6e8254'],
      ['72%','#5d7146'],
      ['100%','#51633c']
    ].forEach(([offset,color])=>green.appendChild(svgEl('stop',{offset,'stop-color':color})));

    defs.append(gold,green);
    svg.appendChild(defs);

    /* Simple beveled plaque. No chunky dark outer shell, side diamonds or
       decorative spikes. The bronze/gold rail itself is the outside edge. */
    const goldD=[
      'M 46 3','H 314','L 327 12','V 30','L 314 39',
      'H 46','L 33 30','V 12','Z'
    ].join(' ');

    const greenD=[
      'M 49 6','H 311','L 323 14','V 28','L 311 36',
      'H 49','L 37 28','V 14','Z'
    ].join(' ');

    svg.appendChild(svgEl('path',{class:'plaque-gold',d:goldD,fill:`url(#hajjenTitleGold-${index})`}));
    svg.appendChild(svgEl('path',{class:'plaque-green',d:greenD,fill:`url(#hajjenTitleGreen-${index})`}));

    /* One restrained pale-gold highlight line ties directly into the frame. */
    svg.appendChild(svgEl('path',{
      class:'plaque-top-highlight',
      d:'M 52 7.2 H 308 L 319.2 14.6'
    }));

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
    heading.dataset.vectorTitlePlaqueSource='green-gold-1.4';

    const layer=document.createElement('div');
    layer.className='hajjen-vector-title-plaque-layer';
    layer.dataset.vectorTitlePlaque='green-gold-1.4';
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

  window.HAJJEN_VECTOR_TITLE_PLAQUE={version:'1.4',mount,buildPlaque};
})();
