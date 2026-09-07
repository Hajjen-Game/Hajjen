/* HAJJEN shared vector title plaque — DEV prototype.
   Reusable SVG/CSS plaque component. First target is the SHARKAN/status title.
   It only activates in Zone 3 ?dev=1 so the approved bitmap title plaques remain
   untouched in normal gameplay while the vector version is evaluated. */
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
      viewBox:'0 0 360 65',
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
      ['0%','#f0d395'],
      ['24%','#c18a43'],
      ['55%','#7c5328'],
      ['78%','#b77938'],
      ['100%','#e1ba6d']
    ].forEach(([offset,color])=>{
      gold.appendChild(svgEl('stop',{offset,'stop-color':color}));
    });

    const green=svgEl('linearGradient',{
      id:`hajjenTitleGreen-${index}`,
      x1:'0',y1:'0',x2:'0',y2:'1',
      gradientUnits:'objectBoundingBox'
    });
    [
      ['0%','#5c7041'],
      ['34%','#495f36'],
      ['72%','#344927'],
      ['100%','#2b3d23']
    ].forEach(([offset,color])=>{
      green.appendChild(svgEl('stop',{offset,'stop-color':color}));
    });

    defs.append(gold,green);
    svg.appendChild(defs);

    const outerD=[
      'M 48 4.5','H 312','L 319 9.5','H 327','L 333 15.5','L 330 22.5',
      'L 344 32.5','L 330 42.5','L 333 49.5','L 327 55.5','H 319','L 312 60.5',
      'H 48','L 41 55.5','H 33','L 27 49.5','L 30 42.5','L 16 32.5',
      'L 30 22.5','L 27 15.5','L 33 9.5','H 41','Z'
    ].join(' ');

    const goldD=[
      'M 51 7.5','H 309','L 317 13','H 324','L 329.5 18.5','L 326.8 24.8',
      'L 337.8 32.5','L 326.8 40.2','L 329.5 46.5','L 324 52','H 317','L 309 57.5',
      'H 51','L 43 52','H 36','L 30.5 46.5','L 33.2 40.2','L 22.2 32.5',
      'L 33.2 24.8','L 30.5 18.5','L 36 13','H 43','Z'
    ].join(' ');

    const greenD=[
      'M 58 10.5','H 302','L 312 17','H 320','L 324.5 21.5','L 321.8 27',
      'L 329.5 32.5','L 321.8 38','L 324.5 43.5','L 320 48','H 312','L 302 54.5',
      'H 58','L 48 48','H 40','L 35.5 43.5','L 38.2 38','L 30.5 32.5',
      'L 38.2 27','L 35.5 21.5','L 40 17','H 48','Z'
    ].join(' ');

    const greenInnerD=[
      'M 61 13','H 299','L 310 19.5','H 318','L 321.5 23','L 319.3 27.8',
      'L 325.8 32.5','L 319.3 37.2','L 321.5 42','L 318 45.5','H 310','L 299 52',
      'H 61','L 50 45.5','H 42','L 38.5 42','L 40.7 37.2','L 34.2 32.5',
      'L 40.7 27.8','L 38.5 23','L 42 19.5','H 50','Z'
    ].join(' ');

    svg.appendChild(svgEl('path',{class:'plaque-outer-shadow',d:outerD}));
    svg.appendChild(svgEl('path',{class:'plaque-gold',d:goldD,fill:`url(#hajjenTitleGold-${index})`}));
    svg.appendChild(svgEl('path',{class:'plaque-green',d:greenD,fill:`url(#hajjenTitleGreen-${index})`}));
    svg.appendChild(svgEl('path',{class:'plaque-green-inner',d:greenInnerD}));

    svg.appendChild(svgEl('path',{
      class:'plaque-top-highlight',
      d:'M 58 10.8 H 302 L 311.5 17 H 319.5'
    }));
    svg.appendChild(svgEl('path',{
      class:'plaque-bottom-shadow',
      d:'M 58 54.2 H 302 L 311.5 48 H 319.5'
    }));

    const leftDiamond=svgEl('path',{
      class:'plaque-ornament',
      d:'M 37.5 32.5 L 42 27.4 L 46.5 32.5 L 42 37.6 Z'
    });
    const rightDiamond=svgEl('path',{
      class:'plaque-ornament',
      d:'M 322.5 32.5 L 318 27.4 L 313.5 32.5 L 318 37.6 Z'
    });
    const leftDot=svgEl('circle',{class:'plaque-ornament-highlight',cx:'42',cy:'30.6',r:'1.05'});
    const rightDot=svgEl('circle',{class:'plaque-ornament-highlight',cx:'318',cy:'30.6',r:'1.05'});
    const lowerJewel=svgEl('path',{
      class:'plaque-ornament',
      d:'M 180 55.2 L 184.2 59 L 180 62.8 L 175.8 59 Z'
    });
    const lowerJewelHighlight=svgEl('circle',{
      class:'plaque-ornament-highlight',cx:'180',cy:'58.4',r:'1.0'
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
    heading.dataset.vectorTitlePlaqueSource='green-gold-1.1';

    const layer=document.createElement('div');
    layer.className='hajjen-vector-title-plaque-layer';
    layer.dataset.vectorTitlePlaque='green-gold-1.1';
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

  window.HAJJEN_VECTOR_TITLE_PLAQUE={version:'1.1',mount,buildPlaque};
})();
