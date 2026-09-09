/* HAJJEN top header lower rail — Zone 3 presentation.
   Uses the exact same stroke hierarchy and gold gradient as the approved board
   vector frame. The header itself stays frameless at the top and sides. */
(()=>{
  const params=new URLSearchParams(location.search);
  const zone=window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||null;
  const isDev=params.get('dev')==='1';
  const isZone3=Number(zone)===3;
  if(!isDev&&!isZone3)return;

  const NS='http://www.w3.org/2000/svg';
  const make=(name,attrs={})=>{
    const node=document.createElementNS(NS,name);
    Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,String(value)));
    return node;
  };

  function mount(header,index=0){
    if(!header||header.querySelector(':scope > .hajjen-header-vector-rail'))return;

    const svg=make('svg',{
      class:'hajjen-header-vector-rail',
      'aria-hidden':'true',
      preserveAspectRatio:'none'
    });

    const defs=make('defs');
    const gradient=make('linearGradient',{
      id:`hajjenHeaderGold-${index}`,
      x1:'0',y1:'0',x2:'0',y2:'1',
      gradientUnits:'objectBoundingBox'
    });
    [['0%','#f2d9a1'],['24%','#cf9853'],['56%','#81502b'],['79%','#bb7d3c'],['100%','#e4b86d']].forEach(([offset,color])=>{
      gradient.appendChild(make('stop',{offset,'stop-color':color}));
    });
    defs.appendChild(gradient);
    svg.appendChild(defs);

    const shadow=make('path',{class:'header-frame-shadow'});
    const gold=make('path',{class:'header-frame-gold',stroke:`url(#hajjenHeaderGold-${index})`});
    const inner=make('path',{class:'header-frame-inner'});
    const highlight=make('path',{class:'header-frame-highlight'});
    svg.append(shadow,gold,inner,highlight);
    header.appendChild(svg);

    const render=()=>{
      const w=Math.max(320,header.clientWidth||window.innerWidth||0);
      const h=Math.max(70,header.clientHeight||86);
      svg.setAttribute('viewBox',`0 0 ${w} ${h}`);

      /* Same silhouette as the header background: a deeper left logo bay,
         otherwise a clean continuous lower rail across the viewport. */
      const x1=w*.021;
      const x2=w*.032;
      const x3=w*.151;
      const x4=w*.163;
      const base=h*.79;
      const bay=h-2.8;

      const rail=`M 0 ${base} H ${x1} L ${x2} ${bay} H ${x3} L ${x4} ${base} H ${w}`;
      const innerRail=`M 0 ${base+3.6} H ${x1-1} L ${x2-1} ${bay-3.4} H ${x3+1} L ${x4+1} ${base+3.6} H ${w}`;
      const highlightRail=`M 0 ${base-1.15} H ${x1+.7} L ${x2+.7} ${bay-1.1} H ${x3-.7} L ${x4-.7} ${base-1.15} H ${w}`;

      shadow.setAttribute('d',rail);
      gold.setAttribute('d',rail);
      inner.setAttribute('d',innerRail);
      highlight.setAttribute('d',highlightRail);
    };

    render();
    if(typeof ResizeObserver==='function')new ResizeObserver(render).observe(header);
    else window.addEventListener('resize',render,{passive:true});
  }

  const apply=()=>document.querySelectorAll('.zone3-app .titlebar').forEach((header,index)=>mount(header,index));
  apply();
  const root=document.getElementById('campaignRoot')||document.body;
  new MutationObserver(apply).observe(root,{childList:true,subtree:true});
})();
