(()=>{
  const $=id=>document.getElementById(id);

  const build=document.querySelector('.build');
  if(build)build.textContent='V4-B 0.5 · HUD POLISH';
  const meta=document.querySelector('meta[name="hajjen-build"]');
  if(meta)meta.content='v4-b-prototype-0.5-hud-polish';

  const objectives=document.querySelector('.objectives');
  const deckRow=document.querySelector('.deck-row');
  if(objectives&&deckRow&&!document.querySelector('.deck-sidebar-panel')){
    const panel=document.createElement('section');
    panel.className='panel deck-sidebar-panel';
    const h=document.createElement('h2');
    h.textContent='CARD DECKS';
    panel.append(h,deckRow);
    objectives.insertAdjacentElement('afterend',panel);
    deckRow.classList.add('deck-sidebar');
    deckRow.querySelectorAll('.deck-pile.locked').forEach(pile=>{
      if(pile.querySelector('.deck-lock'))return;
      const lock=document.createElement('span');
      lock.className='deck-lock';
      lock.setAttribute('aria-label','Locked');
      lock.textContent='🔒';
      pile.appendChild(lock);
    });
  }

  const dangerExpanded=document.querySelector('.danger-expanded');
  if(dangerExpanded)dangerExpanded.classList.add('danger-compact');

  const hand=$('manipulationCards');
  const handPanel=document.querySelector('.cards-hud .manipulation-panel');
  const handTitle=handPanel?.querySelector('h2');
  let slotCount=null;
  if(handTitle){
    handTitle.textContent='HAND — MANIPULATION';
    slotCount=document.createElement('span');
    slotCount.className='hand-slot-count';
    handTitle.appendChild(slotCount);
  }

  if(hand){
    const decorate=()=>{
      hand.querySelectorAll(':scope > .mini-card').forEach(card=>{
        if(!card.querySelector('.card-cat')){
          const cat=document.createElement('div');
          cat.className='card-cat';
          cat.textContent='MANIPULATION';
          card.prepend(cat);
        }
      });
    };

    let observer;
    const rebuildSlots=()=>{
      if(observer)observer.disconnect();
      hand.querySelectorAll(':scope > .hand-empty-slot').forEach(x=>x.remove());
      decorate();
      const real=[...hand.querySelectorAll(':scope > .mini-card')];
      for(let i=real.length;i<7;i++){
        const empty=document.createElement('div');
        empty.className='hand-empty-slot';
        empty.setAttribute('aria-label',`Empty hand slot ${i+1}`);
        hand.appendChild(empty);
      }
      if(slotCount)slotCount.textContent=`${real.length} / 7 SLOTS`;
      if(observer)observer.observe(hand,{childList:true});
    };

    let queued=false;
    observer=new MutationObserver(()=>{
      if(queued)return;
      queued=true;
      queueMicrotask(()=>{queued=false;rebuildSlots();});
    });
    observer.observe(hand,{childList:true});
    rebuildSlots();
  }
})();
