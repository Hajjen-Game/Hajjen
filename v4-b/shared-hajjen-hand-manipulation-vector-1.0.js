/* HAJJEN HAND — Manipulation vector icon/decor mount, DEV only. */
(()=>{
  if(new URLSearchParams(location.search).get('dev')!=='1')return;
  const NS='http://www.w3.org/2000/svg';
  let observer=null;
  let raf=0;

  function svgEl(name,attrs={}){
    const node=document.createElementNS(NS,name);
    Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,String(value)));
    return node;
  }

  function manipulationIcon(){
    const svg=svgEl('svg',{
      class:'hajjen-manip-card-icon',
      viewBox:'0 0 48 48',
      'aria-hidden':'true',
      focusable:'false'
    });

    /* The authored hand paths sit slightly high/left inside the 48x48 viewBox.
       Shift the glyph itself, not the SVG box, so the symbol is optically centered
       while the medallion stays perfectly centered by CSS. */
    const glyph=svgEl('g',{transform:'translate(2.6 3.4)'});
    svg.appendChild(glyph);
    const path=(d,extra={})=>glyph.appendChild(svgEl('path',{d,...extra}));

    path('M15 25V10.5c0-1.8 2.8-1.8 2.8 0V21');
    path('M17.8 21V7.5c0-1.9 2.9-1.9 2.9 0V21');
    path('M20.7 21V6.5c0-1.9 2.9-1.9 2.9 0V21');
    path('M23.6 21V9c0-1.9 2.9-1.9 2.9 0v14');
    path('M26.5 23l4.4-5c1.4-1.5 3.5.3 2.5 2L28 31c-1.6 3.2-4.2 5-8.1 5h-2.1c-5.5 0-8.5-3.6-8.5-8.6v-6.2c0-2 2.8-2.4 3.5-.5l2.2 5.1');
    path('M20.2 29l3.4 3.4 3.4-3.4-3.4-3.4z',{class:'manip-icon-fill'});
    return svg;
  }

  function decorate(card){
    if(!card||card.matches('.shared-enchantment-card,.enchantment,.tactical,.shared-hand-placeholder'))return;
    const category=(card.dataset.handCategory||'').toLowerCase();
    const looksManip=category==='manipulation'||card.classList.contains('card')||card.classList.contains('mini-card');
    if(!looksManip)return;
    if(card.querySelector(':scope > .hajjen-manip-card-icon-wrap'))return;

    const wrap=document.createElement('span');
    wrap.className='hajjen-manip-card-icon-wrap';
    wrap.setAttribute('aria-hidden','true');
    wrap.appendChild(manipulationIcon());
    card.prepend(wrap);
  }

  function scan(){
    raf=0;
    const hand=document.getElementById('manipCards');
    if(!hand)return false;
    [...hand.children].forEach(decorate);
    return true;
  }

  function schedule(){
    if(raf)return;
    raf=requestAnimationFrame(()=>requestAnimationFrame(scan));
  }

  function start(){
    const hand=document.getElementById('manipCards');
    if(!hand){
      const root=document.getElementById('campaignRoot')||document.body;
      const wait=new MutationObserver(()=>{
        if(document.getElementById('manipCards')){
          wait.disconnect();
          start();
        }
      });
      wait.observe(root,{childList:true,subtree:true});
      return;
    }

    scan();
    observer?.disconnect();
    observer=new MutationObserver(schedule);
    observer.observe(hand,{childList:true,subtree:false});
    document.fonts?.ready?.then(schedule).catch(()=>{});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();

  window.HAJJEN_HAND_MANIPULATION_VECTOR={version:'1.1',scan:schedule};
})();
