/* HAJJEN HAND — Tactical vector/CSS card preview, DEV only.
   Zone 3 keeps Tactical progression locked; this mounts one visual prototype
   into the first Tactical hand slot so the card family can be reviewed safely. */
(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get('dev')!=='1')return;
  const zone=window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone;
  if(zone!==3)return;

  const hand=document.getElementById('manipCards');
  if(!hand||hand.querySelector(':scope > .hajjen-dev-tactical-card'))return;

  const NS='http://www.w3.org/2000/svg';
  const svgEl=(name,attrs={})=>{
    const node=document.createElementNS(NS,name);
    Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,String(value)));
    return node;
  };

  function tacticalIcon(){
    const svg=svgEl('svg',{
      class:'hajjen-tactical-card-icon',
      viewBox:'0 0 48 48',
      'aria-hidden':'true',
      focusable:'false'
    });
    const path=(d)=>svg.appendChild(svgEl('path',{d}));
    path('M24 7.5c5 3.4 9.2 4.1 13 4.5v10.4c0 8-4.9 13.6-13 18.1-8.1-4.5-13-10.1-13-18.1V12c3.8-.4 8-1.1 13-4.5z');
    path('M24 13v20');
    path('M17 18.5c2.4 1.2 4.8 1.9 7 2.2 2.2-.3 4.6-1 7-2.2');
    return svg;
  }

  function createCard(){
    const card=document.createElement('div');
    card.className='shared-hand-card shared-tactical-card tactical hajjen-dev-tactical-card';
    card.dataset.handCategory='tactical';
    card.dataset.handLabel='Guard Stance';
    card.dataset.devPreview='tactical';

    const iconWrap=document.createElement('span');
    iconWrap.className='hajjen-tactical-card-icon-wrap';
    iconWrap.appendChild(tacticalIcon());

    const title=document.createElement('strong');
    title.textContent='Guard Stance';

    const copy=document.createElement('span');
    copy.className='shared-tactical-copy';
    copy.textContent='Equip this Tactical card to prepare a defensive stance for combat.';

    const equip=document.createElement('button');
    equip.type='button';
    equip.className='shared-tactical-equip';
    equip.textContent='EQUIP';
    equip.setAttribute('aria-pressed','false');
    equip.addEventListener('click',()=>{
      if(card.classList.contains('is-equipt'))return;
      card.classList.add('is-equipt');
      equip.textContent='EQUIPT';
      equip.setAttribute('aria-pressed','true');
    });

    card.append(iconWrap,title,copy,equip);
    return card;
  }

  const card=createCard();
  const firstTacticalPlaceholder=hand.querySelector(':scope > .shared-hand-placeholder[data-hand-placeholder="tactical"]');
  if(firstTacticalPlaceholder)firstTacticalPlaceholder.before(card);
  else hand.appendChild(card);

  /* Let the existing shared Hand component recalculate the remaining Tactical
     placeholder count. This leaves one preview card + one locked Tactical slot. */
  window.HAJJEN_SHARED_HAND?.sync?.();
})();
