(()=>{
  const zone=window.HAJJEN_ZONE_CONFIG?.zone||window.HAJJEN_CAMPAIGN_CONFIG?.zone||(window.HAJJEN_V4B_STATE?1:null);
  if(!zone)return;

  const $=id=>document.getElementById(id);
  const root=document.querySelector('.tileinfo,.tile-info,.tile-tooltip');
  const title=$('tileTitle');
  const sub=$('tileSub');
  const desc=$('tileDesc');
  const board=zone===1?$('board'):$('world');
  const host=zone===1?document.querySelector('.board-wrap'):$('viewport');
  if(!root||!title||!sub||!desc||!board||!host)return;

  root.classList.remove('tile-info');
  root.classList.add('tileinfo','tile-tooltip','shared-tile-info');
  root.dataset.sharedComponent='tile-info';
  root.setAttribute('role','status');
  root.setAttribute('aria-live','polite');
  root.setAttribute('aria-atomic','true');

  let heading=root.querySelector('h2');
  if(!heading){
    heading=document.createElement('h2');
  }
  heading.textContent='TILE INFO';
  heading.classList.add('shared-tile-info-heading');
  title.classList.add('shared-tile-info-title');
  sub.classList.add('shared-tile-info-sub');
  desc.classList.add('shared-tile-info-desc');

  // Keep the existing live nodes so zone-specific showTile() logic continues
  // to write into the exact same IDs. Only the presentation structure is shared.
  root.replaceChildren(heading,title,sub,desc);

  // Mark spell-ingredient tiles by Primal Force. The underlying entity keeps
  // its real ingredient name, so hover / Tile Info still says Bloomcap,
  // Glowroot, Riverglass, etc. The force marker is visual metadata only.
  const forceNames=new Set(['Growth','Ember','Flow','Stone','Gale','Aether']);
  const markIngredientForce=(row,col,force,cols)=>{
    const normalized=String(force||'');
    if(!forceNames.has(normalized)||!Number.isFinite(Number(row))||!Number.isFinite(Number(col))||!cols)return;
    const tile=board.children[(Number(row)*Number(cols))+Number(col)];
    if(tile instanceof HTMLElement)tile.dataset.force=normalized;
  };

  if(zone===1){
    const cols=15;
    [
      [2,3,'Growth'],
      [7,4,'Ember'],
      [1,8,'Flow'],
      [8,10,'Stone'],
      [3,12,'Gale'],
      [7,13,'Aether']
    ].forEach(([row,col,force])=>markIngredientForce(row,col,force,cols));
  }else{
    const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG||{};
    const cols=Number(cfg.cols)||0;
    (cfg.spellIngredients||[]).forEach(item=>markIngredientForce(item.row,item.col,item.force,cols));
  }

  // The zone adapters already place Tile Info on top of their own board/viewport.
  // Only repair that placement if a future adapter stops doing it. This does not
  // alter board/world dimensions; the tooltip is absolutely positioned.
  if(root.parentElement!==host)host.appendChild(root);

  let hideTimer=null;
  const show=()=>{
    clearTimeout(hideTimer);
    root.classList.add('show');
  };
  const hide=()=>{
    clearTimeout(hideTimer);
    root.classList.remove('show');
  };

  const tileFromEvent=target=>target instanceof Element?target.closest('.tile'):null;

  board.addEventListener('mouseover',event=>{
    const tile=tileFromEvent(event.target);
    if(tile&&board.contains(tile))show();
  });
  board.addEventListener('mouseout',event=>{
    const tile=tileFromEvent(event.target);
    if(!tile||!board.contains(tile))return;
    const related=event.relatedTarget instanceof Element?event.relatedTarget.closest('.tile'):null;
    if(related===tile)return;
    hide();
  });
  board.addEventListener('click',event=>{
    const tile=tileFromEvent(event.target);
    if(!tile||!board.contains(tile)||!matchMedia('(hover: none)').matches)return;
    show();
    hideTimer=setTimeout(hide,1800);
  });

  window.HAJJEN_SHARED_TILE_INFO={
    zone,
    root,
    host,
    board,
    fields:{title,sub,desc},
    show,
    hide
  };
})();
