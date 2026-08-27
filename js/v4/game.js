(() => {
  const N=10;
  const MAX_ACTIVE_MANIPULATIONS=2;
  const $=id=>document.getElementById(id);

  const board=$('board');
  const player=$('player');
  const rollBtn=$('rollBtn');
  const moveDieEl=$('moveDie');
  const dirDieEl=$('directionDie');
  const dirSub=$('directionSub');
  const dirChoice=$('directionChoice');
  const rerollMove=$('rerollMove');
  const rerollDirection=$('rerollDirection');
  const logline=$('logline');

  const hpFill=$('hpFill');
  const hpText=$('hpText');
  const dangerSegments=$('dangerSegments');
  const dangerText=$('dangerText');
  const dangerState=$('dangerState');

  const tileTitle=$('tileTitle');
  const tileSub=$('tileSub');
  const tileDesc=$('tileDesc');
  const tileExtra=$('tileExtra');

  const goalShrines=$('goalShrines');
  const goalGuardians=$('goalGuardians');
  const goalBoss=$('goalBoss');

  const handEl=$('hand');
  const handSummary=$('handSummary');
  const activeManipulationsEl=$('activeManipulations');
  const activeManipSummary=$('activeManipSummary');
  const mulliganControls=$('mulliganControls');
  const mulliganText=$('mulliganText');
  const redrawBtn=$('redrawBtn');
  const startZoneBtn=$('startZoneBtn');

  let row=3, col=3; // D4
  let hp=100, danger=0;
  let rolled=false, moving=false;
  let moveValue=null, dirValue=null, chosenDir=null;
  let shrines=0, guardians=0, bossUnlocked=false;
  let phase='mulligan';
  let mulliganUsed=false;
  let emptyTutorialShown=false;
  let selectedCardIndex=null;
  let lootRevealBonus=0;
  let lootPickBonus=0;
  let activeManipulations=[];

  const completed=new Set();
  const mulliganSelection=new Set();
  const ingredients=[];

  const ingredientPool=[
    {name:'Bloomcap',force:'Growth',effect:'Stable Growth spell base; supports regeneration effects.'},
    {name:'Verdant Sap',force:'Growth',effect:'Potent Growth ingredient; supports healing effects.'},
    {name:'Cinder Seed',force:'Ember',effect:'Ember ingredient with strong offensive potential.'},
    {name:'Ash Pepper',force:'Ember',effect:'Sharp Ember ingredient suited for critical effects.'},
    {name:'Tide Pearl',force:'Flow',effect:'Flow ingredient that supports fluid spell effects.'},
    {name:'Streamglass',force:'Flow',effect:'Refined Flow ingredient suited for duration effects.'},
    {name:'Ironroot',force:'Stone',effect:'Dense Stone ingredient suited for protection.'},
    {name:'Slate Shard',force:'Stone',effect:'Stone ingredient with strong defensive structure.'},
    {name:'Feather Reed',force:'Gale',effect:'Light Gale ingredient suited for fast effects.'},
    {name:'Sky Pollen',force:'Gale',effect:'Gale ingredient that supports precision and control.'},
    {name:'Moonspore',force:'Aether',effect:'Aether ingredient with unusual magical properties.'},
    {name:'Void Petal',force:'Aether',effect:'Rare-feeling Aether base for rule-bending effects.'}
  ];

  const cardPools={
    Manipulation:[
      {id:'m-keen-eye',category:'Manipulation',name:'Keen Eye',timing:'Exploration',desc:'Your next Ingredient Tile reveals 4 choices instead of 3.',effect:'keenEye'},
      {id:'m-double-harvest',category:'Manipulation',name:'Double Harvest',timing:'Exploration',desc:'On your next Ingredient Tile, choose 2 ingredients instead of 1.',effect:'doubleHarvest'},
      {id:'m-long-reach',category:'Manipulation',name:'Long Reach',timing:'Empty Tile',desc:'From an empty tile, collect from an Ingredient Tile in one of the 8 surrounding tiles.',effect:'longReach'},
      {id:'m-calm-waters',category:'Manipulation',name:'Calm Waters',timing:'Between Rolls',desc:'Reduce Danger by 2.',effect:'calmWaters'},
      {id:'m-measured-step',category:'Manipulation',name:'Measured Step',timing:'After Roll',desc:'Increase the current Movement Die by 1, up to 6.',effect:'measuredStep'}
    ],
    Enhancement:[
      {id:'e-ember-focus',category:'Enhancement',name:'Ember Focus',timing:'Ingredient',desc:'Attach to an Ember ingredient: +5% Critical Chance to a spell created with it.',effect:'enhance',force:'Ember',bonus:'+5% Critical Chance'},
      {id:'e-growth-potency',category:'Enhancement',name:'Growth Potency',timing:'Ingredient',desc:'Attach to a Growth ingredient: +10% Healing to a spell or potion created with it.',effect:'enhance',force:'Growth',bonus:'+10% Healing'},
      {id:'e-flow-extension',category:'Enhancement',name:'Flow Extension',timing:'Ingredient',desc:'Attach to a Flow ingredient: +1 effect duration to a creation using it.',effect:'enhance',force:'Flow',bonus:'+1 Duration'},
      {id:'e-aether-clarity',category:'Enhancement',name:'Aether Clarity',timing:'Ingredient',desc:'Attach to an Aether ingredient: +5% primary effect strength.',effect:'enhance',force:'Aether',bonus:'+5% Effect Strength'},
      {id:'e-primal-polish',category:'Enhancement',name:'Primal Polish',timing:'Ingredient',desc:'Attach to any ingredient: +5% primary effect strength.',effect:'enhance',force:null,bonus:'+5% Effect Strength'}
    ],
    Tactical:[
      {id:'t-quick-guard',category:'Tactical',name:'Quick Guard',timing:'Combat',desc:'Negate the next incoming attack. Combat is not implemented in 0.2.',effect:'combat'},
      {id:'t-first-strike',category:'Tactical',name:'First Strike',timing:'Combat Start',desc:'Sharkan acts first in the encounter. Combat is not implemented in 0.2.',effect:'combat'},
      {id:'t-dodge',category:'Tactical',name:'Dodge',timing:'Reaction',desc:'Avoid one incoming attack. Combat is not implemented in 0.2.',effect:'combat'},
      {id:'t-battle-focus',category:'Tactical',name:'Battle Focus',timing:'Combat',desc:'Gain a temporary combat advantage for the encounter. Combat is not implemented in 0.2.',effect:'combat'},
      {id:'t-disengage',category:'Tactical',name:'Disengage',timing:'Combat',desc:'Escape a normal mob encounter. Combat is not implemented in 0.2.',effect:'combat'}
    ]
  };

  const slotCategories=['Manipulation','Manipulation','Manipulation','Enhancement','Enhancement','Tactical','Tactical'];
  let hand=[];

  // Sparse functional tiles. Ingredient Tiles are intentionally reusable in 0.2 so the choice system is easy to test.
  const special=new Map([
    ['0,1',{type:'shrine',mark:'S',title:'ANCIENT SHRINE',sub:'Verdant Brook',desc:'Land here to activate the shrine.'}],
    ['6,7',{type:'shrine',mark:'S',title:'ANCIENT SHRINE',sub:'Verdant Brook',desc:'Land here to activate the shrine.'}],
    ['2,5',{type:'guardian',mark:'G',title:'GUARDIAN',sub:'Wild Encounter',desc:'Land here to defeat a guardian (prototype).'}],
    ['7,2',{type:'guardian',mark:'G',title:'GUARDIAN',sub:'Wild Encounter',desc:'Land here to defeat a guardian (prototype).'}],
    ['4,7',{type:'mystery',mark:'?',title:'MYSTERY TILE',sub:'Unknown',desc:'Prototype: random event placeholder.'}],
    ['5,1',{type:'heal',mark:'+',title:'HEALING SPRING',sub:'Recovery',desc:'Landing here restores 20% HP.'}],
    ['8,5',{type:'hazard',mark:'!',title:'HAZARD',sub:'Dangerous Ground',desc:'Landing here costs 10% HP.'}],
    ['1,8',{type:'treasure',mark:'T',title:'TREASURE',sub:'Reward Tile',desc:'Prototype: treasure placeholder.'}],
    ['9,9',{type:'boss',mark:'B',title:'ROOTMAW',sub:'Verdant Guardian',desc:'Regenerates during battle.',extra:'Weakness: Unknown'}],
    ['0,4',{type:'ingredient',mark:'I',title:'INGREDIENT SITE',sub:'Primal Resources',desc:'Land here to reveal 3 ingredients and choose 1.'}],
    ['2,1',{type:'ingredient',mark:'I',title:'INGREDIENT SITE',sub:'Primal Resources',desc:'Land here to reveal 3 ingredients and choose 1.'}],
    ['3,8',{type:'ingredient',mark:'I',title:'INGREDIENT SITE',sub:'Primal Resources',desc:'Land here to reveal 3 ingredients and choose 1.'}],
    ['5,5',{type:'ingredient',mark:'I',title:'INGREDIENT SITE',sub:'Primal Resources',desc:'Land here to reveal 3 ingredients and choose 1.'}],
    ['7,6',{type:'ingredient',mark:'I',title:'INGREDIENT SITE',sub:'Primal Resources',desc:'Land here to reveal 3 ingredients and choose 1.'}],
    ['9,3',{type:'ingredient',mark:'I',title:'INGREDIENT SITE',sub:'Primal Resources',desc:'Land here to reveal 3 ingredients and choose 1.'}]
  ]);

  function shuffle(items){
    const a=[...items];
    for(let i=a.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }

  function initialHand(){
    const used={Manipulation:new Set(),Enhancement:new Set(),Tactical:new Set()};
    return slotCategories.map(category=>{
      const candidates=shuffle(cardPools[category].filter(c=>!used[category].has(c.id)));
      const card=candidates[0];
      used[category].add(card.id);
      return {...card};
    });
  }

  function redrawCardAt(index){
    const category=slotCategories[index];
    const idsInHand=new Set(hand.filter(Boolean).map(c=>c.id));
    const choices=cardPools[category].filter(c=>!idsInHand.has(c.id));
    const pool=choices.length?choices:cardPools[category].filter(c=>c.id!==hand[index]?.id);
    hand[index]={...pool[Math.floor(Math.random()*pool.length)]};
  }

  function makeBoard(){
    for(let r=0;r<N;r++){
      for(let c=0;c<N;c++){
        const t=document.createElement('div');
        t.className='tile';
        t.dataset.r=r;
        t.dataset.c=c;
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
      tileDesc.textContent='Ingen automatisk effekt. Spela ett giltigt kort eller slå tärningarna igen.';
      tileExtra.textContent='';
      return;
    }
    tileTitle.textContent=s.title;
    tileSub.textContent=s.sub;
    tileDesc.textContent=s.desc;
    if(s.type==='boss') tileExtra.textContent=bossUnlocked?'Boss Shrine: READY':'Boss Shrine: LOCKED';
    else if(s.type==='ingredient') tileExtra.textContent='Standard: reveal 3 → choose 1. Manipulation Cards can change this.';
    else tileExtra.textContent=s.extra||'';
  }

  function dangerLabel(){
    if(danger>=20) return 'CRITICAL';
    if(danger>=15) return 'HOSTILE';
    if(danger>=10) return 'DANGEROUS';
    if(danger>=5) return 'UNEASY';
    return 'CALM';
  }

  function renderActiveManipulations(){
    if(!activeManipulationsEl||!activeManipSummary) return;
    activeManipulationsEl.innerHTML='';
    for(let i=0;i<MAX_ACTIVE_MANIPULATIONS;i++){
      const active=activeManipulations[i];
      const slot=document.createElement('div');
      if(active){
        slot.className='active-manipulation-slot';
        slot.innerHTML=`<span class="active-name">${active.name}</span><span class="active-state">${active.state}</span>`;
      }else{
        slot.className='active-manipulation-slot empty';
        slot.textContent='EMPTY';
      }
      activeManipulationsEl.appendChild(slot);
    }
    activeManipSummary.textContent=`${activeManipulations.length} / ${MAX_ACTIVE_MANIPULATIONS}`;
  }

  function updateStatus(){
    hp=Math.max(0,Math.min(100,hp));
    danger=Math.max(0,Math.min(20,danger));
    hpFill.style.width=hp+'%';
    hpText.textContent=hp+'%';
    const filled=Math.ceil(danger/4);
    [...dangerSegments.children].forEach((el,i)=>el.classList.toggle('on',i<filled));
    dangerText.textContent=`${danger}/20`;
    dangerState.textContent=dangerLabel();
    goalShrines.textContent=`Shrines: ${shrines} / 2`;
    goalGuardians.textContent=`Guardians: ${guardians} / 2`;
    bossUnlocked=shrines>=2&&guardians>=2;
    goalBoss.textContent=`Boss Shrine: ${bossUnlocked?'UNLOCKED':'LOCKED'}`;
    renderHand();
    renderActiveManipulations();
  }

  function renderHand(){
    handEl.innerHTML='';
    hand.forEach((card,index)=>{
      const slot=document.createElement('button');
      const category=slotCategories[index];
      slot.className=`card-slot ${category.toLowerCase()}${card?'':' empty'}`;
      slot.dataset.index=index;
      if(phase==='mulligan'&&mulliganSelection.has(index)) slot.classList.add('selected');
      if(card){
        slot.innerHTML=`<span class="cat">${category==='Manipulation'?'M':category==='Enhancement'?'E':'T'} · ${category}</span><span class="name">${card.name}</span><span class="timing">${card.timing}</span>`;
      }else{
        slot.innerHTML=`<span class="cat">${category==='Manipulation'?'M':category==='Enhancement'?'E':'T'}</span><span class="name">EMPTY</span><span class="timing">${category}</span>`;
      }
      handEl.appendChild(slot);
    });
    const counts={Manipulation:0,Enhancement:0,Tactical:0};
    hand.filter(Boolean).forEach(c=>counts[c.category]++);
    handSummary.textContent=`${counts.Manipulation}/3 M · ${counts.Enhancement}/2 E · ${counts.Tactical}/2 T`;
  }

  function armManipulation(card,state,scope='ingredient'){
    activeManipulations.push({id:card.id,effect:card.effect,name:card.name,state,scope});
    renderActiveManipulations();
  }

  function clearIngredientManipulations(){
    activeManipulations=activeManipulations.filter(x=>x.scope!=='ingredient');
    renderActiveManipulations();
  }

  handEl.addEventListener('click',e=>{
    const slot=e.target.closest('.card-slot');
    if(!slot) return;
    const index=Number(slot.dataset.index);
    if(!hand[index]) return;
    if(phase==='mulligan'){
      if(mulliganUsed) return;
      if(mulliganSelection.has(index)) mulliganSelection.delete(index);
      else if(mulliganSelection.size<3) mulliganSelection.add(index);
      mulliganText.textContent=`Valda kort: ${mulliganSelection.size} / 3. Ersätts från samma kategori.`;
      redrawBtn.textContent=`REDRAW ${mulliganSelection.size}`;
      redrawBtn.disabled=mulliganSelection.size===0;
      renderHand();
      return;
    }
    selectedCardIndex=index;
    openCardModal(hand[index]);
  });

  redrawBtn.addEventListener('click',()=>{
    if(phase!=='mulligan'||mulliganUsed||mulliganSelection.size===0) return;
    [...mulliganSelection].forEach(redrawCardAt);
    const n=mulliganSelection.size;
    mulliganSelection.clear();
    mulliganUsed=true;
    redrawBtn.disabled=true;
    redrawBtn.textContent='REDRAW USED';
    mulliganText.textContent=`${n} kort bytta. Varje slot behöll sin kategori.`;
    renderHand();
    logline.textContent='Mulligan klar. Starta zonen när du är redo.';
  });

  startZoneBtn.addEventListener('click',()=>{
    if(phase!=='mulligan') return;
    phase='play';
    mulliganSelection.clear();
    mulliganControls.style.display='none';
    rollBtn.disabled=false;
    renderHand();
    logline.textContent='Zonen har börjat. Kasta tärningarna.';
  });

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
      dirSub.textContent='WILD (0.2: välj riktning)';
      dirChoice.classList.add('show');
    }else{
      dirSub.innerHTML='↑ ↓ ← →<br>CHOOSE / WILD';
      dirChoice.classList.remove('show');
    }
  }

  function rollBoth(){
    if(phase!=='play') return;
    moveValue=randomMove();
    dirValue=randomDir();
    chosenDir=null;
    rolled=true;
    moveDieEl.textContent=moveValue;
    displayDir();
    rerollMove.disabled=false;
    rerollDirection.disabled=false;
    rollBtn.innerHTML='FLYTTA<br>SHARKAN';
    logline.textContent='Tärningarna är kastade. Kort och rerolls kan användas före flytten.';
  }

  function getEffectiveDir(){
    if(['N','E','S','W'].includes(dirValue)) return dirValue;
    return chosenDir;
  }

  function resetAfterTurn(){
    rolled=false;
    moveValue=null;
    dirValue=null;
    chosenDir=null;
    moveDieEl.textContent='–';
    dirDieEl.textContent='–';
    dirSub.innerHTML='↑ ↓ ← →<br>CHOOSE / WILD';
    dirChoice.classList.remove('show');
    rollBtn.innerHTML='KASTA<br>TÄRNINGARNA';
    rollBtn.disabled=false;
    rerollMove.disabled=true;
    rerollDirection.disabled=true;
  }

  async function animatePath(path){
    moving=true;
    rollBtn.disabled=true;
    rerollMove.disabled=true;
    rerollDirection.disabled=true;
    dirChoice.classList.remove('show');
    for(const [r,c] of path){
      row=r;
      col=c;
      playerPos();
      await new Promise(res=>setTimeout(res,170));
    }
    await resolveLanding();
    danger=Math.min(20,danger+1);
    moving=false;
    resetAfterTurn();
    updateStatus();
  }

  function randomIngredients(count){
    return shuffle(ingredientPool).slice(0,count).map(x=>({...x}));
  }

  function ingredientChoice(options,pickCount){
    return new Promise(resolve=>{
      const choiceModal=$('choiceModal');
      const choiceTitle=$('choiceTitle');
      const choiceText=$('choiceText');
      const choiceOptions=$('choiceOptions');
      const choiceHint=$('choiceHint');
      choiceTitle.textContent='CHOOSE INGREDIENT';
      choiceText.textContent=`${options.length} alternativ visas. Välj ${pickCount}.`;
      choiceOptions.innerHTML='';
      choiceHint.textContent=pickCount>1?`0 / ${pickCount} valda`:'Välj ett kort för att samla ingrediensen.';
      const chosen=[];
      options.forEach((ing,index)=>{
        const btn=document.createElement('button');
        btn.className='choice-option';
        btn.innerHTML=`<span class="force">${ing.force}</span><span class="ingredient-name">${ing.name}</span><span class="ingredient-effect">${ing.effect}</span>`;
        btn.addEventListener('click',()=>{
          if(chosen.includes(index)) return;
          chosen.push(index);
          btn.classList.add('selected');
          choiceHint.textContent=`${chosen.length} / ${pickCount} valda`;
          if(chosen.length>=pickCount){
            setTimeout(()=>{
              choiceModal.classList.remove('show');
              resolve(chosen.map(i=>options[i]));
            },180);
          }
        });
        choiceOptions.appendChild(btn);
      });
      choiceModal.classList.add('show');
    });
  }

  async function resolveIngredientTile(source='landed'){
    const revealCount=Math.min(4,3+lootRevealBonus);
    const pickCount=Math.min(revealCount,1+lootPickBonus);
    const options=randomIngredients(revealCount);
    const chosen=await ingredientChoice(options,pickCount);
    chosen.forEach(ing=>ingredients.push({...ing,enhancements:[]}));

    lootRevealBonus=0;
    lootPickBonus=0;
    clearIngredientManipulations();

    const names=chosen.map(x=>x.name).join(' + ');
    logline.textContent=`Ingredient ${source==='adjacent'?'collected with Long Reach':'collected'}: ${names}.`;
  }

  async function resolveLanding(){
    const key=`${row},${col}`;
    const s=special.get(key);
    showTile(row,col);
    if(!s){
      logline.textContent=`Sharkan landade på ${String.fromCharCode(65+row)}${col+1}. Ingen automatisk effekt.`;
      if(!emptyTutorialShown){
        emptyTutorialShown=true;
        showInfo('EMPTY TILE',`<p>Tomma rutor har ingen automatisk effekt.</p><p>Du kan spela ett kort som är giltigt från den positionen, till exempel <strong>Long Reach</strong> om en Ingredient Tile ligger i någon av de åtta rutorna runt Sharkan. Om du inte vill eller kan göra något slår du bara tärningarna igen.</p><p>Danger ökar fortfarande när turen avslutas. Informationen finns senare under HELP.</p>`);
      }
      return;
    }
    if(s.type==='ingredient'){
      await resolveIngredientTile('landed');
    }else if(s.type==='heal'){
      hp+=20;
      logline.textContent='Healing Spring: +20% HP.';
    }else if(s.type==='hazard'){
      hp-=10;
      logline.textContent='Hazard: -10% HP.';
    }else if(s.type==='shrine'){
      if(!completed.has(key)){
        shrines++;
        completed.add(key);
        markCompleted(row,col);
      }
      logline.textContent='Shrine aktiverad.';
    }else if(s.type==='guardian'){
      if(!completed.has(key)){
        guardians++;
        completed.add(key);
        markCompleted(row,col);
      }
      logline.textContent='Guardian besegrad (0.2 placeholder).';
    }else if(s.type==='boss'){
      logline.textContent=bossUnlocked?'BOSS TILE NÅDD – Rootmaw kan utmanas!':'Boss Shrine är låst. Slutför målen först.';
    }else if(s.type==='mystery'){
      logline.textContent='Mystery event (placeholder).';
    }else if(s.type==='treasure'){
      logline.textContent='Treasure (placeholder).';
    }
  }

  function markCompleted(r,c){
    board.children[r*N+c].classList.add('completed');
  }

  rollBtn.addEventListener('click',()=>{
    if(moving||phase!=='play') return;
    if(!rolled){
      rollBoth();
      return;
    }
    const d=getEffectiveDir();
    if(!d){
      logline.textContent='Välj riktning först.';
      return;
    }
    const vectors={N:[-1,0],E:[0,1],S:[1,0],W:[0,-1]};
    const opposite={N:'S',S:'N',E:'W',W:'E'};
    let tr=row,tc=col,dir=d,path=[];
    for(let i=0;i<moveValue;i++){
      let [dr,dc]=vectors[dir];
      let nr=tr+dr,nc=tc+dc;
      if(nr<0||nr>=N||nc<0||nc>=N){
        dir=opposite[dir];
        [dr,dc]=vectors[dir];
        nr=tr+dr;
        nc=tc+dc;
      }
      tr=nr;
      tc=nc;
      path.push([tr,tc]);
    }
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

  dirChoice.addEventListener('click',e=>{
    const b=e.target.closest('button[data-dir]');
    if(!b) return;
    chosenDir=b.dataset.dir;
    [...dirChoice.querySelectorAll('button')].forEach(x=>x.style.fontWeight='400');
    b.style.fontWeight='900';
    logline.textContent=`Vald riktning: ${chosenDir}.`;
  });

  function currentTileIsEmpty(){
    return !special.has(`${row},${col}`);
  }

  function adjacentIngredientTiles(){
    const result=[];
    for(let dr=-1;dr<=1;dr++){
      for(let dc=-1;dc<=1;dc++){
        if(dr===0&&dc===0) continue;
        const r=row+dr;
        const c=col+dc;
        if(r>=0&&r<N&&c>=0&&c<N&&special.get(`${r},${c}`)?.type==='ingredient') result.push([r,c]);
      }
    }
    return result;
  }

  function hasActiveEffect(effect){
    return activeManipulations.some(x=>x.effect===effect);
  }

  function hasFreeActiveManipulationSlot(){
    return activeManipulations.length<MAX_ACTIVE_MANIPULATIONS;
  }

  function canPlayCard(card){
    if(!card||phase!=='play'||moving) return {ok:false,reason:'Card cannot be used now.'};

    if(card.effect==='keenEye'||card.effect==='doubleHarvest'){
      if(hasActiveEffect(card.effect)) return {ok:false,reason:`${card.name} is already active.`};
      if(!hasFreeActiveManipulationSlot()) return {ok:false,reason:'Maximum 2 Manipulation Cards can be active at once.'};
      return {ok:true};
    }

    if(card.effect==='calmWaters') return danger>0?{ok:true}:{ok:false,reason:'Danger is already 0.'};
    if(card.effect==='measuredStep') return rolled&&moveValue<6?{ok:true}:{ok:false,reason:'Use after rolling when Movement Die is below 6.'};

    if(card.effect==='longReach'){
      if(rolled) return {ok:false,reason:'Use between rolls while standing on an empty tile.'};
      if(!currentTileIsEmpty()) return {ok:false,reason:'Long Reach requires an empty tile.'};
      if(!adjacentIngredientTiles().length) return {ok:false,reason:'No Ingredient Tile is in the 8 surrounding tiles.'};
      if(!hasFreeActiveManipulationSlot()) return {ok:false,reason:'Maximum 2 Manipulation Cards can be combined at once.'};
      return {ok:true};
    }

    if(card.effect==='enhance'){
      const eligible=ingredients.filter(i=>!card.force||i.force===card.force);
      return eligible.length?{ok:true}:{ok:false,reason:card.force?`You need a collected ${card.force} ingredient.`:'You need a collected ingredient.'};
    }

    if(card.effect==='combat') return {ok:false,reason:'Tactical Cards are shown in 0.2, but combat is not implemented yet.'};
    return {ok:false,reason:'Not implemented.'};
  }

  const cardModal=$('cardModal');
  const cardCategory=$('cardCategory');
  const cardTitle=$('cardTitle');
  const cardDesc=$('cardDesc');
  const cardTiming=$('cardTiming');
  const playCardBtn=$('playCardBtn');

  function openCardModal(card){
    const state=canPlayCard(card);
    cardCategory.textContent=card.category.toUpperCase();
    cardTitle.textContent=card.name;
    cardDesc.textContent=card.desc;
    cardTiming.textContent=`TIMING: ${card.timing}${state.ok?'':` · ${state.reason}`}`;
    playCardBtn.disabled=!state.ok;
    cardModal.classList.add('show');
  }

  function consumeSelectedCard(){
    if(selectedCardIndex===null) return;
    hand[selectedCardIndex]=null;
    selectedCardIndex=null;
    renderHand();
  }

  function chooseFromCollected(list,title,text){
    return new Promise(resolve=>{
      const choiceModal=$('choiceModal');
      $('choiceTitle').textContent=title;
      $('choiceText').textContent=text;
      const container=$('choiceOptions');
      container.innerHTML='';
      $('choiceHint').textContent='Choose one ingredient.';
      list.forEach(ing=>{
        const btn=document.createElement('button');
        btn.className='choice-option';
        const bonuses=(ing.enhancements||[]).join(', ')||'No enhancements yet';
        btn.innerHTML=`<span class="force">${ing.force}</span><span class="ingredient-name">${ing.name}</span><span class="ingredient-effect">${bonuses}</span>`;
        btn.addEventListener('click',()=>{
          choiceModal.classList.remove('show');
          resolve(ing);
        });
        container.appendChild(btn);
      });
      choiceModal.classList.add('show');
    });
  }

  function chooseAdjacentTile(list){
    return new Promise(resolve=>{
      const choiceModal=$('choiceModal');
      $('choiceTitle').textContent='LONG REACH';
      $('choiceText').textContent='Choose a surrounding Ingredient Tile.';
      const container=$('choiceOptions');
      container.innerHTML='';
      $('choiceHint').textContent='This does not move Sharkan. Diagonal tiles count.';
      list.forEach(([r,c])=>{
        const btn=document.createElement('button');
        btn.className='choice-option';
        btn.innerHTML=`<span class="force">SURROUNDING TILE</span><span class="ingredient-name">${String.fromCharCode(65+r)}${c+1}</span><span class="ingredient-effect">Collect as if you landed here.</span>`;
        btn.addEventListener('click',()=>{
          choiceModal.classList.remove('show');
          resolve([r,c]);
        });
        container.appendChild(btn);
      });
      choiceModal.classList.add('show');
    });
  }

  playCardBtn.addEventListener('click',async()=>{
    if(selectedCardIndex===null||!hand[selectedCardIndex]) return;
    const card=hand[selectedCardIndex];
    const state=canPlayCard(card);
    if(!state.ok) return;
    cardModal.classList.remove('show');

    if(card.effect==='keenEye'){
      lootRevealBonus=1;
      armManipulation(card,'NEXT INGREDIENT');
      consumeSelectedCard();
      logline.textContent='Keen Eye active: next Ingredient Tile reveals 4 choices.';
    }else if(card.effect==='doubleHarvest'){
      lootPickBonus=1;
      armManipulation(card,'NEXT INGREDIENT');
      consumeSelectedCard();
      logline.textContent='Double Harvest active: choose 2 on the next Ingredient Tile.';
    }else if(card.effect==='calmWaters'){
      danger=Math.max(0,danger-2);
      consumeSelectedCard();
      updateStatus();
      logline.textContent='Calm Waters: Danger -2.';
    }else if(card.effect==='measuredStep'){
      moveValue=Math.min(6,moveValue+1);
      moveDieEl.textContent=moveValue;
      consumeSelectedCard();
      logline.textContent='Measured Step: Movement Die +1.';
    }else if(card.effect==='longReach'){
      armManipulation(card,'RESOLVING');
      consumeSelectedCard();
      const targets=adjacentIngredientTiles();
      if(targets.length>1) await chooseAdjacentTile(targets);
      await resolveIngredientTile('adjacent');
      updateStatus();
    }else if(card.effect==='enhance'){
      const eligible=ingredients.filter(i=>!card.force||i.force===card.force);
      const target=await chooseFromCollected(eligible,'ENHANCE INGREDIENT',`Attach ${card.name}: ${card.bonus}`);
      target.enhancements=target.enhancements||[];
      target.enhancements.push(`${card.name}: ${card.bonus}`);
      consumeSelectedCard();
      logline.textContent=`${card.name} attached to ${target.name}: ${card.bonus}.`;
    }
  });

  $('closeCardModal').onclick=()=>{
    cardModal.classList.remove('show');
    selectedCardIndex=null;
  };
  cardModal.addEventListener('click',e=>{
    if(e.target===cardModal){
      cardModal.classList.remove('show');
      selectedCardIndex=null;
    }
  });

  const modal=$('modal');
  const modalTitle=$('modalTitle');
  const modalText=$('modalText');

  function showInfo(title,html){
    modalTitle.textContent=title;
    modalText.innerHTML=html;
    modal.classList.add('show');
  }

  $('closeModal').onclick=()=>modal.classList.remove('show');
  modal.addEventListener('click',e=>{
    if(e.target===modal) modal.classList.remove('show');
  });

  $('helpBtn').addEventListener('click',()=>showInfo('HAJJEN V4 — HELP',`
    <p><strong>Movement:</strong> roll Movement + Direction. Edge collisions bounce and remaining steps continue in the opposite direction.</p>
    <p><strong>Cards:</strong> fixed hand structure is 3 Manipulation / 2 Enhancement / 2 Tactical. Used cards leave their category slot empty.</p>
    <p><strong>Active Manipulation:</strong> up to 2 delayed/combined Manipulation Cards can be active at once. Their effects are shown above the hand until they resolve.</p>
    <p><strong>Ingredient Tiles:</strong> reveal 3 ingredients and choose 1. Manipulation Cards can change the number revealed or chosen.</p>
    <p><strong>Long Reach:</strong> from an empty tile, an Ingredient Tile in any of the 8 surrounding squares can be collected without moving Sharkan.</p>
    <p><strong>Empty Tiles:</strong> no automatic action window. Play a valid card if useful, otherwise roll again.</p>
    <p><strong>Danger:</strong> +1 after each completed movement turn. Manipulation Cards may reduce it. Spells and spell creation do not affect Danger.</p>
    <p><strong>0.2:</strong> Tactical Cards are visible but combat is still a placeholder.</p>`));

  document.querySelectorAll('[data-modal]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(btn.dataset.modal==='Spellbook'){
        const list=ingredients.length
          ? `<ul class="ingredient-list">${ingredients.map(i=>`<li><strong>${i.name}</strong> (${i.force})${i.enhancements?.length?` — ${i.enhancements.join('; ')}`:''}</li>`).join('')}</ul>`
          : '<p>No ingredients collected yet.</p>';
        showInfo('SPELLBOOK',`<p>0.2 ingredient inventory. Spell creation comes later.</p>${list}`);
      }else if(btn.dataset.modal==='Backpack'){
        showInfo('BACKPACK','<p>Placeholder for consumables, healing and key items. Crafting/equipment is Future TODO.</p>');
      }else{
        showInfo('TALENTS','<p>Placeholder for permanent progression. Zone completion will grant Talent Points.</p>');
      }
    });
  });

  document.querySelectorAll('[data-action]').forEach(btn=>{
    btn.addEventListener('click',()=>logline.textContent=`${btn.dataset.action}: placeholder – systemet byggs senare.`);
  });

  hand=initialHand();
  makeBoard();
  playerPos();
  showTile(row,col);
  updateStatus();
})();