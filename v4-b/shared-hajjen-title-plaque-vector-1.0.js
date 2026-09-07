/* HAJJEN shared vector title plaque — DEV prototype.
   Reusable SVG/CSS plaque component. SHARKAN/status V1.2 uses a slimmer,
   lighter silhouette and the same bronze-gold family as the vector board frame. */
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
      viewBox:'0 0 360 50',
      preserveAspectRatio:'none',
      'aria-hidden':'true'
    });

    const defs=svgEl('defs');

    /* Same bronze-gold palette as the approved vector board frame. */
    const gold=svgEl('linearGradient',{
      id:`hajjenTitleGold-${index}`,
      x1:'0',y1:'0',x2:'0',y2:'1',
      gradientUnits:'objectBoundingBox'
    });
    [
      ['0%','#f2d9a1'],
      ['24%','#cf9853'],
      ['56%','#81502b'],
      ['79%','#bb7d3c'],
      ['100%','#e4b86d']
    ].forEach(([offset,color])=>{
      gold.appendChild(svgEl('stop',{offset,'stop-color':color}));
    });

    /* Slightly lighter, softer green inspired by the supplied plaque reference. */
    const green=svgEl('linearGradient',{
      id:`hajjenTitleGreen-${index}`,
      x1:'0',y1:'0',x2:'0',y2:'1',
      gradientUnits:'objectBoundingBox'
    });
    [
      ['0%','#71865a'],
      ['34%','#607748'],
      ['72%','#4f653b'],
      ['100%','#425631']
    ].forEach(([offset,color])=>{
      green.appendChild(svgEl('stop',{offset,'stop-color':color}));
    });

    defs.append(gold,green);
    svg.appendChild(defs);

    /* V1.2 geometry: same ornamental idea as V1.1 but substantially lower,
       with narrower rail bands and restrained side points. */
    const outerD=[
      'M 52 3','H 308','L 314 7','H 321','L 325 11','L 323 16',
      'L 333 25','L 323 34','L 325 39','L 321 43','H 314','L 308 47',
      'H 52','L 46 43','H 39','L 35 39','L 37 34','L 27 25',
      'L 37 16','L 35 11','L 39 7','H 46','Z'
    ].join(' ');

    const goldD=[
      'M 54 5','H 306','L 313 9','H 319','L 322.5 12.5','L 320.5 17',
      'L 329.5 25','L 320.5 33','L 322.5 37.5','L 319 41','H 313','L 306 45',
      'H 54','L 47 41','H 41','L 37.5 37.5','L 39.5 33','L 30.5 25',
      'L 39.5 17','L 37.5 12.5','L 41 9','H 47','Z'
    ].join(' ');

    const greenD=[
      'M 58 7','H 302','L 311 12','H 317','L 319.5 14.5','L 317.8 18.5',
      'L 325 25','L 317.8 31.5','L 319.5 35.5','L 317 38','H 311','L 302 43',
      'H 58','L 49 38','H 43','L 40.5 35.5','L 42.2 31.5','L 35 25',
      'L 42.2 18.5','L 40.5 14.5','L 43 12','H 49','Z'
    ].join(' ');

    const greenInnerD=[
      'M 60 9','H 300','L 310 14','H 315.5','L 317.2 15.8','L 315.7 19.2',
      'L 322.2 25','L 315.7 30.8','L 317.2 34.2','L 315.5 36','H 310','L 300 41',
      'H 60','L 50 36','H 44.5','L 42.8 34.2','L 44.3 30.8','L 37.8 25',
      'L 44.3 19.2','L 42.8 15.8','L 44.5 14','H 50','Z'
    ].join(' ');

    svg.appendChild(svgEl('path',{class:'plaque-outer-shadow',d:outerD}));
    svg.appendChild(svgEl('path',{class:'plaque-gold',d:goldD,fill:`url(#hajjenTitleGold-${index})`}));
    svg.appendChild(svgEl('path',{class:'plaque-green',d:greenD,fill:`url(#hajjenTitleGreen-${index})`}));
    svg.appendChild(svgEl('path',{class:'plaque-green-inner',d:greenInnerD}));

    svg.appendChild(svgEl('path',{
      class:'plaque-top-highlight',
      d:'M 58.8 7.5 H 301.2 L 310.5 12.6 H 316.2'
    }));
    svg.appendChild(svgEl('path',{
      class:'plaque-bottom-shadow',
      d:'M 58.8 42.5 H 301.2 L 310.5 37.4 H 316.2'
    }));

    /* Smaller side ornaments and the tiny lower-centre jewel from the reference. */
    const leftDiamond=svgEl('path',{
      class:'plaque-ornament',
      d:'M 40 25 L 43.1 21.6 L 46.2 25 L 43.1 28.4 Z'
    });
    const rightDiamond=svgEl('path',{
      class:'plaque-ornament',
      d:'M 320 25 L 316.9 21.6 L 313.8 25 L 316.9 28.4 Z'
    });
    const leftDot=svgEl('circle',{class:'plaque-ornament-highlight',cx:'43.1',cy:'23.8',r:'.72'});
    const rightDot=svgEl('circle',{class:'plaque-ornament-highlight',cx:'316.9',cy:'23.8',r:'.72'});
    const lowerJewel=svgEl('path',{
      class:'plaque-ornament',
      d:'M 180 45.7 L 183.1 48.6 L 180 51.5 L 176.9 48.6 Z'
    });
    const lowerJewelHighlight=svgEl('circle',{
      class:'plaque-ornament-highlight',cx:'180',cy:'48.1',r:'.68'
    });

    svg.append(leftDiamond,rightDiamond,leftDot,rightDot,lowerJewel,lowerJewelHighlight);
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
    heading.dataset.vectorTitlePlaqueSource='green-gold-1.2';

    const layer=document.createElement('div');
    layer.className='hajjen-vector-title-plaque-layer';
    layer.dataset.vectorTitlePlaque='green-gold-1.2';
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

  window.HAJJEN_VECTOR_TITLE_PLAQUE={version:'1.2',mount,buildPlaque};
})();
