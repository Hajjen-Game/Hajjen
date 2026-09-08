/* HAJJEN HAND — generic Locked slot vector/CSS card, DEV only.
   Converts any locked Hand placeholder into one neutral reusable card. */
(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get('dev')!=='1')return;

  const zone=window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||(window.HAJJEN_V4B_STATE?1:null);
  const hand=document.getElementById(zone===1?'manipulationCards':'manipCards');
  if(!hand)return;

  const COPY='See Card Decks for unlock timing.';
  const NS='http://www.w3.org/2000/svg';
  let queued=false;
  let observer=null;

  function svgEl(name,attrs={}){
    const node=document.createElementNS(NS,name);
    Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,String(value)));
    return node;
  }

  function lockIcon(){
    const svg=svgEl('svg',{
      class:'hajjen-locked-card-icon',
      viewBox:'0 0 48 48',
      'aria-hidden':'true',
      focusable:'false'
    });
    svg.appendChild(svgEl('path',{d:'M15 22v-5c0-5.1 4-9 9-9s9 3.9 9 9v5'}));
    svg.appendChild(svgEl('rect',{x:'11',y:'21',width:'26',height:'19',rx:'3.5'}));
    svg.appendChild(svgEl('circle',{cx:'24',cy:'29',r:'2.2'}));
    svg.appendChild(svgEl('path',{d:'M24 31.2v4'}));
    return svg;
  }

  function decorate(slot){
    if(!slot.classList.contains('locked')){
      if(slot.classList.contains('hajjen-vector-locked-slot')){
        slot.classList.remove('hajjen-vector-locked-slot');
        delete slot.dataset.hajjenLockedDecorated;
        const category=(slot.dataset.handPlaceholder||'slot').toUpperCase();
        const label=document.createElement('strong');
        label.textContent=category;
        const state=document.createElement('span');
        state.textContent='EMPTY';
        slot.replaceChildren(label,state);
      }
      return;
    }

    const complete=slot.classList.contains('hajjen-vector-locked-slot')&&
      slot.querySelector(':scope > .hajjen-locked-card-icon-wrap .hajjen-locked-card-icon')&&
      slot.querySelector(':scope > strong')?.textContent==='SLOT LOCKED'&&
      slot.querySelector(':scope > .shared-locked-copy')?.textContent===COPY;
    if(complete)return;

    slot.classList.add('hajjen-vector-locked-slot');
    slot.dataset.hajjenLockedDecorated='1';
    slot.setAttribute('aria-label','Slot locked');

    /* Use div + p instead of span so the base shared-hand synchronizer does not
       mistake our icon or body copy for its legacy LOCKED state label. */
    const iconWrap=document.createElement('div');
    iconWrap.className='hajjen-locked-card-icon-wrap';
    iconWrap.appendChild(lockIcon());

    const title=document.createElement('strong');
    title.textContent='SLOT LOCKED';

    const copy=document.createElement('p');
    copy.className='shared-locked-copy';
    copy.textContent=COPY;

    slot.replaceChildren(iconWrap,title,copy);
  }

  function sync(){
    queued=false;
    [...hand.querySelectorAll(':scope > .shared-hand-placeholder')].forEach(decorate);
  }

  function queueSync(){
    if(queued)return;
    queued=true;
    queueMicrotask(sync);
  }

  observer=new MutationObserver(queueSync);
  observer.observe(hand,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
  sync();

  window.HAJJEN_SHARED_LOCKED_HAND_CARD={version:'1.0',sync};
})();
