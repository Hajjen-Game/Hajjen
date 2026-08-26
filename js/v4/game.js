(() => {
  const N=10;
  const board=document.getElementById('board');
  const player=document.getElementById('player');
  const rollBtn=document.getElementById('rollBtn');
  const moveDieEl=document.getElementById('moveDie');
  const dirDieEl=document.getElementById('directionDie');
  const dirSub=document.getElementById('directionSub');
  const dirChoice=document.getElementById('directionChoice');
  const rerollMove=document.getElementById('rerollMove');
  const rerollDirection=document.getElementById('rerollDirection');
  const logline=document.getElementById('logline');

  const hpFill=document.getElementById('hpFill');
  const hpText=document.getElementById('hpText');
  const dangerSegments=document.getElementById('dangerSegments');
  const dangerText=document.getElementById('dangerText');

  const tileTitle=document.getElementById('tileTitle');
  const tileSub=document.getElementById('tileSub');
  const tileDesc=document.getElementById('tileDesc');
  const tileExtra=document.getElementById('tileExtra');

  const goalShrines=document.getElementById('goalShrines');
  const goalGuardians=document.getElementById('goalGuardians');
  const goalBoss=document.getElementById('goalBoss');

  let row=3, col=3; // D4
  let hp=100, danger=0;
  let rolled=false, moving=false;
  let moveValue=null, dirValue=null, chosenDir=null;
  let shrines=0, guardians=0, bossUnlocked=false;
  const completed=new Set();

  const dangerNames=['CALM','RESTLESS','DANGEROUS','HOSTILE','CRITICAL'];

  // Sparse functional tiles. Keys are "row,col"
  const special = new Map([
    ['0,1',{type:'shrine',mark:'S',title:'ANCIENT SHRINE',sub:'Verdant Brook',desc:'Land here to activate the shrine.'}],
    ['6,7',{type:'shrine',mark:'S',title:'ANCIENT SHRINE',sub:'Verdant Brook',desc:'Land here to activate the shrine.'}],
    ['2,5',{type:'guardian',mark:'G',title:'GUARDIAN',sub:'Wild Encounter',desc:'Land here to defeat a guardian.'}],
    ['7,2',{type:'guardian',mark:'G',title:'GUARDIAN',sub:'Wild Encounter',desc:'Land here to defeat a guardian.'}],
    ['4,7',{type:'mystery',mark:'?',title:'MYSTERY TILE',sub:'Unknown',desc:'Prototype: random event placeholder.'}],
    ['5,1',{type:'heal',mark:'+',title:'HEALING SPRING',sub:'Recovery',desc:'Landing here restores 20% HP.'}],
    ['8,5',{type:'hazard',mark:'!',title:'HAZARD',sub:'Dangerous Ground',desc:'Landing here costs 10% HP.'}],
    ['1,8',{type:'treasure',mark:'T',title:'TREASURE',sub:'Reward Tile',desc:'Prototype: treasure placeholder.'}],
    ['9,9',{type:'boss',mark:'B',title:'ROOTMAW',sub:'Verdant Guardian',desc:'Regenerates during battle.',extra:'Weakness: Unknown'}]
  ]);

  function makeBoard(){
    for(let r=0;r<N;r++){
      for(let c=0;c<N;c++){
        const t=document.createElement('div');
        t.className='tile';
        t.dataset.r=r; t.dataset.c=c;
        const s=special.get(`${r},${c}`);
        if(s){
          t.classList.add('special',s.type);
          t.dataset.mark=s.mark;
        }
        t.addEventListener('mouseenter',()=>showTile(r,c));
        t.addEventListener('click',()=>showTile(r,c));
        board.appendChild(t);
      }
    }
  }

  function playerPos(){
    const cell=100/N;
    player.style.left=((col+.5)*cell)+'%';
    player.style.top=((row+.5)*cell)+'%';
  }

  function showTile(r,c){
    const s=special.get(`${r},${c}`);
    if(!s){
      tileTitle.textContent='NORMAL TILE';
      tileSub.textContent=`Ruta ${String.fromCharCode(65+r)}${c+1}`;
      tileDesc.textContent='Ingen specialeffekt.';
      tileExtra.textContent='';
      return;
    }
    tileTitle.textContent=s.title;
    tileSub.textContent=s.sub;
    tileDesc.textContent=s.desc;
    if(s.type==='boss'){
      tileExtra.textContent=bossUnlocked ? 'Boss Shrine: READY' : 'Boss Shrine: LOCKED';
    } else {
      tileExtra.textContent=s.extra||'';
    }
  }

  function updateStatus(){
    hp=Math.max(0,Math.min(100,hp));
    hpFill.style.width=hp+'%';
    hpText.textContent=hp+'%';
    [...dangerSegments.children].forEach((el,i)=>el.classList.toggle('on',i<danger));
    dangerText.textContent=danger===0?'CALM':dangerNames[Math.min(danger-1,4)];
    goalShrines.textContent=`Shrines: ${shrines} / 2`;
    goalGuardians.textContent=`Guardians: ${guardians} / 2`;
    bossUnlocked=shrines>=2 && guardians>=2;
    goalBoss.textContent=`Boss Shrine: ${bossUnlocked?'UNLOCKED':'LOCKED'}`;
  }

  function randomMove(){return 1+Math.floor(Math.random()*6)}
  const faces=['N','E','S','W','CHOOSE','WILD'];
  function randomDir(){return faces[Math.floor(Math.random()*faces.length)]}

  function displayDir(){
    const map={N:'↑',E:'→',S:'↓',W:'←',CHOOSE:'CHOOSE',WILD:'WILD'};
    dirDieEl.textContent=dirValue?map[dirValue]:'–';
    if(dirValue==='CHOOSE'){
      dirSub.textContent='Välj riktning';
      dirChoice.classList.add('show');
    }else if(dirValue==='WILD'){
      // Wild behavior is intentionally not designed yet.
      dirSub.textContent='WILD (prototyp: välj riktning)';
      dirChoice.classList.add('show');
    }else{
      dirSub.innerHTML='↑ ↓ ← →<br>CHOOSE / WILD';
      dirChoice.classList.remove('show');
    }
  }

  function rollBoth(){
    moveValue=randomMove();
    dirValue=randomDir();
    chosenDir=null;
    rolled=true;
    moveDieEl.textContent=moveValue;
    displayDir();
    rerollMove.disabled=false;
    rerollDirection.disabled=false;
    rollBtn.innerHTML='FLYTTA<br>SHARKAN';
    logline.textContent='Tärningarna är kastade. Rerolla vid behov och flytta sedan.';
  }

  function getEffectiveDir(){
    if(['N','E','S','W'].includes(dirValue)) return dirValue;
    return chosenDir;
  }

  async function animatePath(path){
    moving=true;
    rollBtn.disabled=true;
    rerollMove.disabled=true;
    rerollDirection.disabled=true;
    dirChoice.classList.remove('show');
    for(const [r,c] of path){
      row=r; col=c;
      playerPos();
      await new Promise(res=>setTimeout(res,170));
    }
    moving=false;
    resolveLanding();
    danger=Math.min(5,danger+1);
    updateStatus();
    rolled=false;
    moveValue=null; dirValue=null; chosenDir=null;
    moveDieEl.textContent='–'; dirDieEl.textContent='–';
    dirSub.innerHTML='↑ ↓ ← →<br>CHOOSE / WILD';
    rollBtn.innerHTML='KASTA<br>TÄRNINGARNA';
    rollBtn.disabled=false;
  }

  function resolveLanding(){
    const key=`${row},${col}`;
    const s=special.get(key);
    showTile(row,col);
    if(!s){
      logline.textContent=`Sharkan landade på ${String.fromCharCode(65+row)}${col+1}.`;
      return;
    }
    if(s.type==='heal'){
      hp+=20;
      logline.textContent='Healing Spring: +20% HP.';
    }else if(s.type==='hazard'){
      hp-=10;
      logline.textContent='Hazard: -10% HP.';
    }else if(s.type==='shrine'){
      if(!completed.has(key)){shrines++;completed.add(key);markCompleted(row,col)}
      logline.textContent='Shrine aktiverad.';
    }else if(s.type==='guardian'){
      if(!completed.has(key)){guardians++;completed.add(key);markCompleted(row,col)}
      logline.textContent='Guardian besegrad (prototyp).';
    }else if(s.type==='boss'){
      if(bossUnlocked) logline.textContent='BOSS TILE NÅDD – Rootmaw kan utmanas!';
      else logline.textContent='Boss Shrine är låst. Slutför målen först.';
    }else if(s.type==='mystery'){
      logline.textContent='Mystery event (placeholder).';
    }else if(s.type==='treasure'){
      logline.textContent='Treasure (placeholder).';
    }
  }

  function markCompleted(r,c){
    const idx=r*N+c;
    board.children[idx].classList.add('completed');
  }

  rollBtn.addEventListener('click',()=>{
    if(moving) return;
    if(!rolled){
      rollBoth();
      return;
    }
    const d=getEffectiveDir();
    if(!d){
      logline.textContent='Välj riktning först.';
      return;
    }
    // Calculate a step-by-step path so edge collisions bounce and the remaining steps continue opposite.
    const startR=row,startC=col;
    const vectors={N:[-1,0],E:[0,1],S:[1,0],W:[0,-1]};
    const opposite={N:'S',S:'N',E:'W',W:'E'};
    let tr=row,tc=col,dir=d,path=[];
    for(let i=0;i<moveValue;i++){
      let [dr,dc]=vectors[dir];
      let nr=tr+dr,nc=tc+dc;
      if(nr<0||nr>=N||nc<0||nc>=N){
        dir=opposite[dir];
        [dr,dc]=vectors[dir];
        nr=tr+dr;nc=tc+dc;
      }
      tr=nr;tc=nc;path.push([tr,tc]);
    }
    row=startR;col=startC;
    animatePath(path);
  });

  rerollMove.addEventListener('click',()=>{
    if(!rolled||moving) return;
    moveValue=randomMove();
    moveDieEl.textContent=moveValue;
    logline.textContent='Steg-tärningen rerollad.';
  });

  rerollDirection.addEventListener('click',()=>{
    if(!rolled||moving) return;
    dirValue=randomDir();
    chosenDir=null;
    displayDir();
    logline.textContent='Riktnings-tärningen rerollad.';
  });

  dirChoice.addEventListener('click',(e)=>{
    const b=e.target.closest('button[data-dir]');
    if(!b) return;
    chosenDir=b.dataset.dir;
    [...dirChoice.querySelectorAll('button')].forEach(x=>x.style.fontWeight='400');
    b.style.fontWeight='900';
    logline.textContent=`Vald riktning: ${chosenDir}.`;
  });

  const modal=document.getElementById('modal');
  const modalTitle=document.getElementById('modalTitle');
  const modalText=document.getElementById('modalText');
  document.querySelectorAll('[data-modal]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      modalTitle.textContent=btn.dataset.modal.toUpperCase();
      modalText.textContent={
        Spellbook:'Placeholder för spell crafting, ingredienser och val av tre aktiva spells.',
        Backpack:'Placeholder för consumables, healing, nyckelföremål och framtida run-items.',
        Talents:'Placeholder för permanent progression: Navigation, Survival och Arcana.'
      }[btn.dataset.modal];
      modal.classList.add('show');
    });
  });
  document.getElementById('closeModal').onclick=()=>modal.classList.remove('show');
  modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('show')});

  document.querySelectorAll('[data-action]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      logline.textContent=`${btn.dataset.action}: placeholder – systemet byggs senare.`;
    });
  });

  makeBoard();
  playerPos();
  showTile(row,col);
  updateStatus();
})();
