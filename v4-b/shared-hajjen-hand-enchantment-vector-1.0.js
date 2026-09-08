/* HAJJEN HAND — Enchantment vector icon mount, DEV only. */
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

  function enchantmentIcon(){
    const svg=svgEl('svg',{
      class:'hajjen-ench-card-icon',
      viewBox:'0 0 48 48',
      'aria-hidden':'true',
      focusable:'false'
    });
    const path=(d,extra={})=>svg.appendChild(svgEl('path',{d,...extra}));
    const circle=(cx,cy,r,extra={})=>svg.appendChild(svgEl('circle',{cx,cy,r,...extra}));
    path('M24 7.5l3.2 10.2L37.5 21l-10.3 3.2L24 34.5l-3.2-10.3L10.5 21l10.3-3.3z');
    path('M24 12.2v23.6M12.2 21h23.6');
    circle('24','21','3.1',{class:'ench-icon-fill'});
    return svg;
  }

  function decorate(card){
    if(!card||card.dataset.handCategory!=='enchantment')return;
    let wrap=card.querySelector(':scope > .hajjen-ench-card-icon-wrap');
    if(!wrap){
      wrap=document.createElement('span');
      wrap.className='hajjen-ench-card-icon-wrap';
      wrap.setAttribute('aria-hidden','true');
      card.prepend(wrap);
    }
    if(!wrap.querySelector(':scope > .hajjen-ench-card-icon')){
      wrap.replaceChildren(enchantmentIcon());
    }
  }

  function handNode(){
    return document.getElementById('manipCards')||document.getElementById('manipulationCards');
  }

  function scan(){
    raf=0;
    const hand=handNode();
    if(!hand)return false;
    hand.querySelectorAll(':scope > .shared-hand-card[data-hand-category="enchantment"]').forEach(decorate);
    return true;
  }

  function schedule(){
    if(raf)return;
    raf=requestAnimationFrame(()=>requestAnimationFrame(scan));
  }

  function start(){
    const hand=handNode();
    if(!hand){
      const root=document.getElementById('campaignRoot')||document.body;
      const wait=new MutationObserver(()=>{
        if(handNode()){
          wait.disconnect();
          start();
        }
      });
      wait.observe(root,{childList:true,subtree:true});
      return;
    }

    scan();
    requestAnimationFrame(scan);
    setTimeout(scan,50);
    setTimeout(scan,180);
    observer?.disconnect();
    observer=new MutationObserver(schedule);
    observer.observe(hand,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-hand-category']});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();

  window.HAJJEN_HAND_ENCHANTMENT_VECTOR={version:'1.0',scan:schedule};
})();
