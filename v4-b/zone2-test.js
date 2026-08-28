(()=>{
  const ROWS=10, WORLD_COLS=25, VIEW_COLS=15;
  const world=document.getElementById('world');
  const viewport=document.getElementById('viewport');
  const player=document.getElementById('player');
  const rowText=document.getElementById('playerRow');
  const colText=document.getElementById('playerCol');
  const visibleText=document.getElementById('visibleCols');
  const offsetText=document.getElementById('cameraOffset');
  const backBtn=document.getElementById('backBtn');

  const state={row:4,col:1,cameraLeft:0};
  const tiles=[];

  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const adjacent=(r,c)=>Math.abs(r-state.row)+Math.abs(c-state.col)===1;

  function buildWorld(){
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<WORLD_COLS;c++){
        const tile=document.createElement('div');
        tile.className='tile';
        tile.dataset.r=r;
        tile.dataset.c=c;
        tile.addEventListener('click',()=>{if(adjacent(r,c))moveTo(r,c);});
        world.insertBefore(tile,player);
        tiles.push(tile);
      }
    }
    render();
  }

  function calculateCameraLeft(){
    // Keep Sharkan around the eighth visible column while there is world left to scroll.
    // Clamp at both world edges so no empty space can ever appear.
    return clamp(state.col-7,0,WORLD_COLS-VIEW_COLS);
  }

  function render(){
    state.cameraLeft=calculateCameraLeft();
    tiles.forEach((tile,i)=>{
      const r=Math.floor(i/WORLD_COLS),c=i%WORLD_COLS;
      tile.classList.toggle('reachable',adjacent(r,c));
      tile.classList.toggle('current',r===state.row&&c===state.col);
    });

    player.style.left=`${((state.col+.5)/WORLD_COLS)*100}%`;
    player.style.top=`${((state.row+.5)/ROWS)*100}%`;

    const tileWidth=viewport.clientWidth/VIEW_COLS;
    world.style.transform=`translateX(${-state.cameraLeft*tileWidth}px)`;

    rowText.textContent=`${state.row+1} / ${ROWS}`;
    colText.textContent=`${state.col+1} / ${WORLD_COLS}`;
    visibleText.textContent=`${state.cameraLeft+1}–${state.cameraLeft+VIEW_COLS}`;
    offsetText.textContent=`${state.cameraLeft} column${state.cameraLeft===1?'':'s'}`;
  }

  function moveTo(r,c){
    if(r<0||r>=ROWS||c<0||c>=WORLD_COLS||!adjacent(r,c))return;
    state.row=r;state.col=c;render();
  }

  function moveBy(dr,dc){
    const r=state.row+dr,c=state.col+dc;
    if(r<0||r>=ROWS||c<0||c>=WORLD_COLS)return;
    moveTo(r,c);
  }

  window.addEventListener('keydown',e=>{
    const map={ArrowUp:[-1,0],w:[-1,0],W:[-1,0],ArrowDown:[1,0],s:[1,0],S:[1,0],ArrowLeft:[0,-1],a:[0,-1],A:[0,-1],ArrowRight:[0,1],d:[0,1],D:[0,1]};
    if(!map[e.key])return;
    e.preventDefault();
    moveBy(...map[e.key]);
  });

  window.addEventListener('resize',render);
  backBtn.addEventListener('click',()=>{location.href='index.html';});

  buildWorld();
})();
