/* HAJJEN Zone 4 DEV — one-move input buffer.
   One physical key press can produce at most one Sharkan step. A single intent
   pressed during enemy animation is replayed after the animation completes.
   Keyboard auto-repeat is deliberately ignored for this tile-based movement. */
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const world=document.getElementById('world');
  if(!window.HAJJEN_ZONE4_DEV_MODE||!cfg||cfg.zone!==4||!state||!world||window.HAJJEN_ZONE4_INPUT_BUFFER)return;

  const directionForKey=key=>({
    ArrowUp:{dr:-1,dc:0},w:{dr:-1,dc:0},W:{dr:-1,dc:0},
    ArrowDown:{dr:1,dc:0},s:{dr:1,dc:0},S:{dr:1,dc:0},
    ArrowLeft:{dr:0,dc:-1},a:{dr:0,dc:-1},A:{dr:0,dc:-1},
    ArrowRight:{dr:0,dc:1},d:{dr:0,dc:1},D:{dr:0,dc:1}
  })[key]||null;
  const held=new Set();
  const physicalKey=key=>String(key||'').toLowerCase();
  let buffered=null;
  let waitRaf=0;
  let waiting=false;

  function movement(){return window.HAJJEN_ZONE4_ENEMY_MOVEMENT_DEV;}
  function canReplay(){return !state.combat&&!state.gameOver&&!state.zoneCleared&&!movement()?.visualMoving;}

  function clickDirection(dr,dc){
    const r=Number(state.row)+Number(dr),c=Number(state.col)+Number(dc);
    if(r<0||c<0||r>=Number(cfg.rows)||c>=Number(cfg.cols))return false;
    const tile=world.querySelector(`.tile[data-r="${r}"][data-c="${c}"]`);
    if(!tile)return false;
    tile.click();return true;
  }

  function replay(){
    const intent=buffered;buffered=null;
    if(!intent||!canReplay())return;
    setTimeout(()=>{
      if(!canReplay())return;
      if(intent.type==='key'){clickDirection(intent.dr,intent.dc);return;}
      const tile=world.querySelector(`.tile[data-r="${intent.r}"][data-c="${intent.c}"]`);
      if(!tile)return;
      const adjacent=Math.abs(Number(intent.r)-Number(state.row))+Math.abs(Number(intent.c)-Number(state.col))===1;
      if(adjacent)tile.click();
    },0);
  }

  function waitForAnimation(){
    waitRaf=0;
    if(movement()?.visualMoving){waitRaf=requestAnimationFrame(waitForAnimation);return;}
    waiting=false;replay();
  }
  function onEnemyMovement(){
    if(waiting)return;
    waiting=true;waitRaf=requestAnimationFrame(waitForAnimation);
  }

  function onKeydown(event){
    const dir=directionForKey(event.key);if(!dir)return;
    const id=physicalKey(event.key);

    /* Desktop browsers emit repeated keydown events while a key remains held.
       Those repeats previously kept refilling the post-animation buffer and
       could turn two quick presses into many board steps. */
    if(event.repeat||held.has(id)){
      event.preventDefault();event.stopImmediatePropagation();return;
    }
    held.add(id);

    if(!movement()?.visualMoving)return; // first physical press: core owns it
    if(!buffered)buffered={type:'key',dr:dir.dr,dc:dir.dc};
    event.preventDefault();event.stopImmediatePropagation();
  }
  function onKeyup(event){
    if(!directionForKey(event.key))return;
    held.delete(physicalKey(event.key));
  }
  function clearHeld(){held.clear();}

  function onBoardClick(event){
    if(!movement()?.visualMoving||!(event.target instanceof Element))return;
    const tile=event.target.closest('.tile');if(!tile||!world.contains(tile))return;
    const r=Number(tile.dataset.r),c=Number(tile.dataset.c);
    const adjacent=Math.abs(r-Number(state.row))+Math.abs(c-Number(state.col))===1;
    if(adjacent&&!buffered)buffered={type:'tile',r,c};
    event.preventDefault();event.stopImmediatePropagation();
  }

  window.addEventListener('keydown',onKeydown,true);
  window.addEventListener('keyup',onKeyup,true);
  window.addEventListener('blur',clearHeld);
  world.addEventListener('click',onBoardClick,true);
  document.addEventListener('hajjen:zone4-enemy-movement-dev',onEnemyMovement);

  window.HAJJEN_ZONE4_INPUT_BUFFER={
    version:'2.0-one-physical-press-one-step',
    get buffered(){return buffered?{...buffered}:null;},
    restore(){
      cancelAnimationFrame(waitRaf);waiting=false;buffered=null;held.clear();
      window.removeEventListener('keydown',onKeydown,true);
      window.removeEventListener('keyup',onKeyup,true);
      window.removeEventListener('blur',clearHeld);
      world.removeEventListener('click',onBoardClick,true);
      document.removeEventListener('hajjen:zone4-enemy-movement-dev',onEnemyMovement);
    }
  };
})();