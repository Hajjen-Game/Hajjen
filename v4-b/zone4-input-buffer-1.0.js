/* HAJJEN Zone 4 DEV — one-move input buffer.
   Enemy movement keeps the exact same animation/input lock as V7, but the first
   movement intent made during that lock is replayed once the animation ends.
   No gameplay, cadence, Danger or enemy movement rules are changed. */
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const world=document.getElementById('world');
  if(!window.HAJJEN_ZONE4_DEV_MODE||!cfg||cfg.zone!==4||!state||!world||window.HAJJEN_ZONE4_INPUT_BUFFER)return;

  const moveKeys=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','W','a','A','s','S','d','D']);
  let buffered=null;
  let waitRaf=0;
  let waiting=false;

  function movement(){return window.HAJJEN_ZONE4_ENEMY_MOVEMENT_DEV;}

  function canReplay(){
    return !state.combat&&!state.gameOver&&!state.zoneCleared&&!movement()?.visualMoving;
  }

  function replay(){
    const intent=buffered;
    buffered=null;
    if(!intent||!canReplay())return;

    // Replay on a fresh task so the movement system can finish all cleanup from
    // the just-completed enemy animation before the next Sharkan step begins.
    setTimeout(()=>{
      if(!canReplay())return;
      if(intent.type==='key'){
        window.dispatchEvent(new KeyboardEvent('keydown',{key:intent.key,bubbles:true,cancelable:true}));
        return;
      }
      const tile=world.querySelector(`.tile[data-r="${intent.r}"][data-c="${intent.c}"]`);
      if(!tile)return;
      const adjacent=Math.abs(Number(intent.r)-Number(state.row))+Math.abs(Number(intent.c)-Number(state.col))===1;
      if(adjacent)tile.click();
    },0);
  }

  function waitForAnimation(){
    waitRaf=0;
    if(movement()?.visualMoving){waitRaf=requestAnimationFrame(waitForAnimation);return;}
    waiting=false;
    replay();
  }

  function onEnemyMovement(){
    if(waiting)return;
    waiting=true;
    waitRaf=requestAnimationFrame(waitForAnimation);
  }

  function onKeydown(event){
    if(!moveKeys.has(event.key)||!movement()?.visualMoving)return;
    if(!buffered)buffered={type:'key',key:event.key};
    // V7's own capture listener, registered immediately after this script,
    // remains responsible for blocking the live keypress during animation.
  }

  function onBoardClick(event){
    if(!movement()?.visualMoving||!(event.target instanceof Element))return;
    const tile=event.target.closest('.tile');
    if(!tile||!world.contains(tile))return;
    const r=Number(tile.dataset.r),c=Number(tile.dataset.c);
    const adjacent=Math.abs(r-Number(state.row))+Math.abs(c-Number(state.col))===1;
    if(adjacent&&!buffered)buffered={type:'tile',r,c};
    // V7 still blocks the original click; only the first adjacent movement
    // intent is remembered and replayed after the visual lock clears.
  }

  window.addEventListener('keydown',onKeydown,true);
  world.addEventListener('click',onBoardClick,true);
  document.addEventListener('hajjen:zone4-enemy-movement-dev',onEnemyMovement);

  window.HAJJEN_ZONE4_INPUT_BUFFER={
    version:'1.0-one-move-buffer',
    get buffered(){return buffered?{...buffered}:null;},
    restore(){
      cancelAnimationFrame(waitRaf);
      waiting=false;buffered=null;
      window.removeEventListener('keydown',onKeydown,true);
      world.removeEventListener('click',onBoardClick,true);
      document.removeEventListener('hajjen:zone4-enemy-movement-dev',onEnemyMovement);
    }
  };
})();
