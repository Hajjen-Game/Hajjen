/* HAJJEN Action Bar card prototype — literal Zone 3 ?dev=1 only.
   Adds decorative icon slots to the existing live Action Bar buttons without
   changing click handlers, spell ownership or potion gameplay. */
(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get('dev')!=='1')return;

  const actionHud=document.querySelector('.zone3-app .action-hud.shared-action-bar');
  const actionbar=document.getElementById('actionbar');
  if(!actionHud||!actionbar)return;

  const forceSymbols={
    ember:'✦',
    flow:'≈',
    stone:'◆',
    growth:'✤',
    gale:'◌',
    aether:'✧',
    potion:'⚗',
    empty:'◇'
  };
  const forces=['ember','flow','stone','growth','gale','aether'];
  let decorating=false;
  let queued=false;

  function makeIconSlot(kind){
    const slot=document.createElement('span');
    slot.className='hajjen-action-icon-slot';
    slot.setAttribute('aria-hidden','true');

    const img=document.createElement('img');
    img.className='hajjen-action-icon-image';
    img.alt='';
    img.hidden=true;

    const fallback=document.createElement('span');
    fallback.className='hajjen-action-icon-fallback';
    fallback.textContent=forceSymbols[kind]||forceSymbols.empty;

    slot.append(img,fallback);
    return slot;
  }

  function decorateButton(button){
    if(!(button instanceof HTMLButtonElement))return;
    button.classList.add('hajjen-action-card');

    const isPotion=button.matches('[data-action-potion],.shared-potion-slot,#usePotionBtn');
    const force=forces.find(name=>button.classList.contains(name))||null;
    const isEmpty=button.classList.contains('empty');
    const kind=isPotion?'potion':force||(isEmpty?'empty':'empty');
    button.dataset.actionVisualKind=kind;

    let icon=button.querySelector(':scope > .hajjen-action-icon-slot');
    if(!icon){
      icon=makeIconSlot(kind);
      button.prepend(icon);
    }else{
      const fallback=icon.querySelector('.hajjen-action-icon-fallback');
      if(fallback)fallback.textContent=forceSymbols[kind]||forceSymbols.empty;
    }

    /* Empty slots are plain text nodes in the shared component. Wrap only that
       label so the card can share the same title layout as populated slots. */
    if(isEmpty&&!button.querySelector(':scope > strong')){
      const label=[...button.childNodes]
        .filter(node=>node.nodeType===Node.TEXT_NODE)
        .map(node=>node.textContent||'')
        .join(' ')
        .trim()||'EMPTY SPELL';
      [...button.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE).forEach(node=>node.remove());
      const strong=document.createElement('strong');
      strong.textContent=label;
      button.appendChild(strong);
    }
  }

  function decorate(){
    if(decorating)return;
    decorating=true;
    try{
      actionHud.classList.add('hajjen-actionbar-card-dev');
      const heading=actionHud.querySelector('.action-hud-title > span:last-child');
      if(heading)heading.textContent='4 SPELLS + POTION';

      actionbar.querySelectorAll(':scope > button').forEach(decorateButton);
    }finally{
      decorating=false;
    }
  }

  function queueDecorate(){
    if(decorating||queued)return;
    queued=true;
    queueMicrotask(()=>{
      queued=false;
      decorate();
    });
  }

  decorate();

  /* Shared Action Bar can refresh button contents when spells change. Reapply
     only the decorative DEV layer after those updates. */
  const observer=new MutationObserver(queueDecorate);
  observer.observe(actionbar,{childList:true,subtree:true,characterData:true});

  window.HAJJEN_ACTION_BAR_CARD_DEV={version:'1.0',decorate,actionHud,actionbar};
})();
