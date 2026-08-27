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

  let row=3,col=3;
  let hp=100,danger=0;
  let rolled=false,moving=false;
  let moveValue=null,dirValue=null,chosenDir=null;
  let shrines=0,guardians=0,bossUnlocked=false;
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

  const starterSpell={id:'spell-ember-bolt',name:'Ember Bolt',force:'Ember',damage:18,desc:'Deal 18 direct damage. No damage-over-time effect.'};
  const starterPotion={id:'potion-healing',name:'Healing Potion',heal:25,desc:'Restore 25 HP instantly. No healing-over-time effect.',available:true};

  const ingredientPool=[
    {name:'Bloomcap',force:'Growth',effect:'Growth ingredient suited for direct healing or protection effects.'},
    {name:'Verdant Sap',force:'Growth',effect:'Potent Growth ingredient suited for stronger instant healing.'},
    {name:'Cinder Seed',force:'Ember',effect:'Ember ingredient with strong direct offensive potential.'},
    {name:'Ash Pepper',force:'Ember',effect:'Sharp Ember ingredient suited for critical-hit effects.'},
    {name:'Tide Pearl',force:'Flow',effect:'Flow ingredient suited for movement and control effects.'},
    {name:'Streamglass',force:'Flow',effect:'Refined Flow ingredient suited for precise movement manipulation.'},
    {name:'Ironroot',force:'Stone',effect:'Dense Stone ingredient suited for direct protection and shields.'},
    {name:'Slate Shard',force:'Stone',effect:'Stone ingredient with strong defensive structure.'},
    {name:'Feather Reed',force:'Gale',effect:'Light Gale ingredient suited for fast movement and direction effects.'},
    {name:'Sky Pollen',force:'Gale',effect:'Gale ingredient suited for precision and directional control.'},
    {name:'Moonspore',force:'Aether',effect:'Aether ingredient with unusual instantaneous magical properties.'},
    {name:'Void Petal',force:'Aether',effect:'Rare-feeling Aether base for teleportation and rule-bending effects.'}
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
      {id:'e-growth-potency',category:'Enhancement',name:'Growth Potency',timing:'Ingredient',desc:'Attach to a Growth ingredient: +10% instant Healing to a spell or potion created with it.',effect:'enhance',force:'Growth',bonus:'+10% Instant Healing'},
      {id:'e-flow-extension',category:'Enhancement',name:'Flow Precision',timing:'Ingredient',desc:'Attach to a Flow ingredient: +5% primary effect strength.',effect:'enhance',force:'Flow',bonus:'+5% Effect Strength'},
      {id:'e-aether-clarity',category:'Enhancement',name:'Aether Clarity',timing:'Ingredient',desc:'Attach to an Aether ingredient: +5% primary effect strength.',effect:'enhance',force:'Aether',bonus:'+5% Effect Strength'},
      {id:'e-primal-polish',category:'Enhancement',name:'Primal Polish',timing:'Ingredient',desc:'Attach to any ingredient: +5% primary effect strength.',effect:'enhance',force:null,bonus:'+5% Effect Strength'}
    ],
    Tactical:[
      {id:'t-quick-guard',category:'Tactical',name:'Quick Guard',timing:'Combat Prep',desc:'Block the first incoming enemy attack in this combat.',effect:'combat',tactical:'guard'},
      {id:'t-first-strike',category:'Tactical',name:'First Strike',timing:'Combat Prep',desc:'Your first spell in this combat deals +5 direct damage.',effect:'combat',tactical:'firstStrike'},
      {id:'t-dodge',category:'Tactical',name:'Dodge',timing:'Combat Prep',desc:'Avoid the first incoming enemy attack in this combat.',effect:'combat',tactical:'dodge'},
      {id:'t-battle-focus',category:'Tactical',name:'Battle Focus',timing:'Combat Prep',desc:'Your spells deal +4 direct damage for this combat.',effect:'combat',tactical:'focus'},
      {id:'t-disengage',category:'Tactical',name:'Disengage',timing:'Combat Prep',desc:'Allows you to flee from a normal mob encounter.',effect:'combat',tactical:'disengage'}
    ]
  };

  const slotCategories=['Manipulation','Manipulation','Manipulation','Enhancement','Enhancement','Tactical','Tactical'];
  let hand=[];

  const special=new Map([
    ['0,1',{type:'shrine',mark:'S',title:'ANCIENT SHRINE',sub:'Verdant Brook',desc:'Land here to activate the shrine.'}],
    ['6,7',{type:'shrine',mark:'S',title:'ANCIENT SHRINE',sub:'Verdant Brook',desc:'Land here to activate the shrine.'}],
    ['2,5',{type:'guardian',mark:'G',title:'VERDANT GUARDIAN',sub:'Elite Encounter',desc:'Triggers combat when entered or crossed.',enemy:{name:'Verdant Guardian',hp:55,attack:10}}],
    ['7,2',{type:'guardian',mark:'G',title:'MARSH GUARDIAN',sub:'Elite Encounter',desc:'Triggers combat when entered or crossed.',enemy:{name:'Marsh Guardian',hp:55,attack:10}}],
    ['1,5',{type:'mob',mark:'M',title:'BOGLING',sub:'Mob Encounter',desc:'Triggers combat when entered or crossed.',enemy:{name:'Bogling',hp:34,attack:8}}],
    ['8,8',{type:'mob',mark:'M',title:'ROOT STALKER',sub:'Mob Encounter',desc:'Triggers combat when entered or crossed.',enemy:{name:'Root Stalker',hp:40,attack:9}}],
    ['4,7',{type:'mystery',mark:'?',title:'MYSTERY TILE',sub:'Unknown',desc:'Prototype: random event placeholder.'}],
    ['5,1',{type:'heal',mark:'+',title:'HEALING SPRING',sub:'Recovery',desc:'Landing here restores 20% HP instantly.'}],
    ['8,5',{type:'hazard',mark:'!',title:'HAZARD',sub:'Dangerous Ground',desc:'Landing here costs 10% HP.'}],
    ['1,8',{type:'treasure',mark:'T',title:'TREASURE',sub:'Reward Tile',desc:'Prototype: treasure placeholder.'}],
    ['9,9',{type:'boss',mark:'B',title:'ROOTMAW',sub:'Verdant Boss',desc:'A heavy boss with strong direct attacks.',extra:'Weakness: Unknown',enemy:{name:'Rootmaw',hp:100,attack:14}}],
    ['0,4',{type:'ingredient',mark:'I',title:'INGREDIENT SITE',sub:'Primal Resources',desc:'Land here to reveal 3 ingredients and choose 1.'}],
    ['2,1',{type:'ingredient',mark:'I',title:'INGREDIENT SITE',sub:'Primal Resources',desc:'Land here to reveal 3 ingredients and choose 1.'}],
    ['3,8',{type:'ingredient',mark:'I',title:'INGREDIENT SITE',sub:'Primal Resources',desc:'Land here to reveal 3 ingredients and choose 1.'}],
    ['5,5',{type:'ingredient',mark:'I',title:'INGREDIENT SITE',sub:'Primal Resources',desc:'Land here to reveal 3 ingredients and choose 1.'}],
    ['7,6',{type:'ingredient',mark:'I',title:'INGREDIENT SITE',sub:'Primal Resources',desc:'Land here to reveal 3 ingredients and choose 1.'}],
    ['9,3',{type:'ingredient',mark:'I',title:'INGREDIENT SITE',sub:'Primal Resources',desc:'Land here to reveal 3 ingredients and choose 1.'}]
  ]);

  let pendingEncounter=null;
  let prepSpellSelected=false;
  let prepPotionSelected=false;
  let prepTacticalIndex=null;
  let combatState=null;

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
        t.className='tile';t.dataset.r=r;t.dataset.c=c;
        const s=special.get(`${r},${c}`);
        if(s){t.classList.add('special',s.type);t.dataset.mark=s.mark}
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
      tileExtra.textContent='';return;
    }
    tileTitle.textContent=s.title;tileSub.textContent=s.sub;tileDesc.textContent=s.desc;
    if(s.type==='boss') tileExtra.textContent=bossUnlocked?'Boss Shrine: READY':'Boss Shrine: LOCKED';
    else if(s.type==='ingredient') tileExtra.textContent='Standard: reveal 3 → choose 1. Manipulation Cards can change this.';
    else if(['mob','guardian'].includes(s.type)) tileExtra.textContent=danger>=10?'Danger 10+: enemies can also aggro from adjacent tiles.':'Direct contact/crossing triggers combat.';
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
    activeManipulationsEl.innerHTML='';
    for(let i=0;i<MAX_ACTIVE_MANIPULATIONS;i++){
      const active=activeManipulations[i];
      const slot=document.createElement('div');
      if(active){slot.className='active-manipulation-slot';slot.innerHTML=`<span class="active-name">${active.name}</span><span class="active-state">${active.state}</span>`}
      else{slot.className='active-manipulation-slot empty';slot.textContent='EMPTY'}
      activeManipulationsEl.appendChild(slot);
    }
    activeManipSummary.textContent=`${activeManipulations.length} / ${MAX_ACTIVE_MANIPULATIONS}`;
  }

  function renderLoadout(){
    $('spellSlot1').innerHTML=`<span>${starterSpell.name.toUpperCase()}</span><small>${starterSpell.damage} direct damage</small>`;
    $('actionSlot1').innerHTML=starterPotion.available?`<span>${starterPotion.name.toUpperCase()}</span><small>+${starterPotion.heal} HP instantly</small>`:`<span>${starterPotion.name.toUpperCase()}</span><small>USED</small>`;
    $('actionSlot1').classList.toggle('empty-slot',!starterPotion.available);
  }

  function updateStatus(){
    hp=Math.max(0,Math.min(100,hp));danger=Math.max(0,Math.min(20,danger));
    hpFill.style.width=hp+'%';hpText.textContent=hp+'%';
    const filled=Math.ceil(danger/4);
    [...dangerSegments.children].forEach((el,i)=>el.classList.toggle('on',i<filled));
    dangerText.textContent=`${danger}/20`;dangerState.textContent=dangerLabel();
    goalShrines.textContent=`Shrines: ${shrines} / 2`;goalGuardians.textContent=`Guardians: ${guardians} / 2`;
    bossUnlocked=shrines>=2&&guardians>=2;goalBoss.textContent=`Boss Shrine: ${bossUnlocked?'UNLOCKED':'LOCKED'}`;
    renderHand();renderActiveManipulations();renderLoadout();
  }

  function renderHand(){
    handEl.innerHTML='';
    hand.forEach((card,index)=>{
      const slot=document.createElement('button');
      const category=slotCategories[index];
      slot.className=`card-slot ${category.toLowerCase()}${card?'':' empty'}`;slot.dataset.index=index;
      if(phase==='mulligan'&&mulliganSelection.has(index)) slot.classList.add('selected');
      if(card){
        slot.innerHTML=`<span class="cat">${category==='Manipulation'?'M':category==='Enhancement'?'E':'T'} · ${category}</span><span class="name">${card.name}</span><span class="effect">${card.desc}</span><span class="timing">${card.timing}</span>`;
      }else{
        slot.innerHTML=`<span class="cat">${category==='Manipulation'?'M':category==='Enhancement'?'E':'T'}</span><span class="name">EMPTY</span><span class="effect"></span><span class="timing">${category}</span>`;
      }
      handEl.appendChild(slot);
    });
    const counts={Manipulation:0,Enhancement:0,Tactical:0};
    hand.filter(Boolean).forEach(c=>counts[c.category]++);
    handSummary.textContent=`${counts.Manipulation}/3 M · ${counts.Enhancement}/2 E · ${counts.Tactical}/2 T`;
  }

  function armManipulation(card,state,scope='ingredient'){
    activeManipulations.push({id:card.id,effect:card.effect,name:card.name,state,scope});renderActiveManipulations();
  }
  function clearIngredientManipulations(){activeManipulations=activeManipulations.filter(x=>x.scope!=='ingredient');renderActiveManipulations()}

  handEl.addEventListener('click',e=>{
    const slot=e.target.closest('.card-slot');if(!slot)return;
    const index=Number(slot.dataset.index);if(!hand[index])return;
    if(phase==='mulligan'){
      if(mulliganUsed)return;
      if(mulliganSelection.has(index))mulliganSelection.delete(index);else if(mulliganSelection.size<3)mulliganSelection.add(index);
      mulliganText.textContent=`Valda kort: ${mulliganSelection.size} / 3. Ersätts från samma kategori.`;
      redrawBtn.textContent=`REDRAW ${mulliganSelection.size}`;redrawBtn.disabled=mulliganSelection.size===0;renderHand();return;
    }
    if(phase!=='play')return;
    selectedCardIndex=index;openCardModal(hand[index]);
  });

  redrawBtn.addEventListener('click',()=>{
    if(phase!=='mulligan'||mulliganUsed||mulliganSelection.size===0)return;
    [...mulliganSelection].forEach(redrawCardAt);const n=mulliganSelection.size;mulliganSelection.clear();mulliganUsed=true;
    redrawBtn.disabled=true;redrawBtn.textContent='REDRAW USED';mulliganText.textContent=`${n} kort bytta. Varje slot behöll sin kategori.`;renderHand();logline.textContent='Mulligan klar. Starta zonen när du är redo.';
  });

  startZoneBtn.addEventListener('click',()=>{
    if(phase!=='mulligan')return;phase='play';mulliganSelection.clear();mulliganControls.style.display='none';rollBtn.disabled=false;renderHand();logline.textContent='Zonen har börjat. Kasta tärningarna.';
  });

  function randomMove(){return 1+Math.floor(Math.random()*6)}
  const faces=['N','E','S','W','CHOOSE','WILD'];
  function randomDir(){return faces[Math.floor(Math.random()*faces.length)]}

  function clearDirectionSelection(){[...dirChoice.querySelectorAll('button')].forEach(x=>x.classList.remove('selected'))}
  function displayDir(){
    const map={N:'↑',E:'→',S:'↓',W:'←',CHOOSE:'CHOOSE',WILD:'WILD'};dirDieEl.textContent=dirValue?map[dirValue]:'–';clearDirectionSelection();
    if(dirValue==='CHOOSE'){dirSub.textContent='Välj riktning';dirChoice.classList.add('show')}
    else if(dirValue==='WILD'){dirSub.textContent='WILD (0.3: välj riktning)';dirChoice.classList.add('show')}
    else{dirSub.innerHTML='↑ ↓ ← →<br>CHOOSE / WILD';dirChoice.classList.remove('show')}
  }

  function rollBoth(){
    if(phase!=='play')return;moveValue=randomMove();dirValue=randomDir();chosenDir=null;rolled=true;moveDieEl.textContent=moveValue;displayDir();rerollMove.disabled=false;rerollDirection.disabled=false;rollBtn.innerHTML='FLYTTA<br>SHARKAN';logline.textContent='Tärningarna är kastade. Kort och rerolls kan användas före flytten.';
  }
  function getEffectiveDir(){return ['N','E','S','W'].includes(dirValue)?dirValue:chosenDir}

  function resetAfterTurn(){
    rolled=false;moveValue=null;dirValue=null;chosenDir=null;moveDieEl.textContent='–';dirDieEl.textContent='–';dirSub.innerHTML='↑ ↓ ← →<br>CHOOSE / WILD';dirChoice.classList.remove('show');clearDirectionSelection();rollBtn.innerHTML='KASTA<br>TÄRNINGARNA';rollBtn.disabled=phase!=='play';rerollMove.disabled=true;rerollDirection.disabled=true;
  }
  function finishMovementTurn(){danger=Math.min(20,danger+1);moving=false;resetAfterTurn();updateStatus()}

  function encounterTileActive(key,tile){
    if(!tile||!['mob','guardian','boss'].includes(tile.type)||completed.has(key))return false;
    if(tile.type==='boss'&&!bossUnlocked)return false;
    return true;
  }

  function findTriggeredEncounter(r,c){
    const directKey=`${r},${c}`;const direct=special.get(directKey);
    if(encounterTileActive(directKey,direct))return {key:directKey,tile:direct,reason:'DIRECT CONTACT'};
    if(danger<10)return null;
    for(const [key,tile] of special.entries()){
      if(!encounterTileActive(key,tile))continue;
      const [er,ec]=key.split(',').map(Number);
      if(Math.max(Math.abs(er-r),Math.abs(ec-c))===1)return {key,tile,reason:'DANGER AGGRO — ADJACENT'};
    }
    return null;
  }

  async function animatePath(path){
    moving=true;rollBtn.disabled=true;rerollMove.disabled=true;rerollDirection.disabled=true;dirChoice.classList.remove('show');
    for(const [r,c] of path){
      row=r;col=c;playerPos();await new Promise(res=>setTimeout(res,170));
      const encounter=findTriggeredEncounter(r,c);
      if(encounter){moving=false;beginCombatPrep(encounter);return}
    }
    await resolveLanding();finishMovementTurn();
  }

  function randomIngredients(count){return shuffle(ingredientPool).slice(0,count).map(x=>({...x}))}

  function prepareChoiceModal(title,text,hint){
    $('choiceTitle').textContent=title;$('choiceText').textContent=text;$('choiceOptions').innerHTML='';$('choiceHint').textContent=hint||'';
    const confirm=$('confirmChoiceBtn');confirm.hidden=true;confirm.disabled=true;confirm.onclick=null;$('choiceModal').classList.add('show');
  }

  function ingredientChoice(options,pickCount){
    return new Promise(resolve=>{
      prepareChoiceModal('CHOOSE INGREDIENT',`${options.length} alternativ visas. Markera ${pickCount} och bekräfta.`,`0 / ${pickCount} valda`);
      const chosen=new Set();const confirm=$('confirmChoiceBtn');confirm.hidden=false;
      options.forEach((ing,index)=>{
        const btn=document.createElement('button');btn.className='choice-option';
        btn.innerHTML=`<span class="force">${ing.force}</span><span class="ingredient-name">${ing.name}</span><span class="ingredient-effect">${ing.effect}</span>`;
        btn.addEventListener('click',()=>{
          if(chosen.has(index)){chosen.delete(index);btn.classList.remove('selected')}
          else if(chosen.size<pickCount){chosen.add(index);btn.classList.add('selected')}
          $('choiceHint').textContent=`${chosen.size} / ${pickCount} valda`;confirm.disabled=chosen.size!==pickCount;
        });
        $('choiceOptions').appendChild(btn);
      });
      confirm.onclick=()=>{
        if(chosen.size!==pickCount)return;
        $('choiceModal').classList.remove('show');confirm.hidden=true;resolve([...chosen].map(i=>options[i]));
      };
    });
  }

  async function resolveIngredientTile(source='landed'){
    const revealCount=Math.min(4,3+lootRevealBonus);const pickCount=Math.min(revealCount,1+lootPickBonus);
    const chosen=await ingredientChoice(randomIngredients(revealCount),pickCount);
    chosen.forEach(ing=>ingredients.push({...ing,enhancements:[]}));lootRevealBonus=0;lootPickBonus=0;clearIngredientManipulations();
    logline.textContent=`Ingredient ${source==='adjacent'?'collected with Long Reach':'collected'}: ${chosen.map(x=>x.name).join(' + ')}.`;
  }

  async function resolveLanding(){
    const key=`${row},${col}`;const s=special.get(key);showTile(row,col);
    if(!s){
      logline.textContent=`Sharkan landade på ${String.fromCharCode(65+row)}${col+1}. Ingen automatisk effekt.`;
      if(!emptyTutorialShown){emptyTutorialShown=true;showInfo('EMPTY TILE','<p>Tomma rutor har ingen automatisk effekt.</p><p>Du kan spela ett giltigt kort, till exempel <strong>Long Reach</strong> om en Ingredient Tile ligger i någon av de åtta rutorna runt Sharkan. Annars slår du tärningarna igen.</p><p>Danger ökar när turen avslutas. Informationen finns under HELP.</p>')}
      return;
    }
    if(s.type==='ingredient')await resolveIngredientTile('landed');
    else if(s.type==='heal'){hp+=20;logline.textContent='Healing Spring: +20% HP instantly.'}
    else if(s.type==='hazard'){hp-=10;logline.textContent='Hazard: -10% HP.'}
    else if(s.type==='shrine'){if(!completed.has(key)){shrines++;completed.add(key);markCompleted(row,col)}logline.textContent='Shrine aktiverad.'}
    else if(s.type==='boss')logline.textContent=bossUnlocked?'Rootmaw is active. Contact will trigger combat.':'Boss Shrine är låst. Slutför målen först.';
    else if(s.type==='mystery')logline.textContent='Mystery event (placeholder).';
    else if(s.type==='treasure')logline.textContent='Treasure (placeholder).';
  }

  function markCompleted(r,c){board.children[r*N+c].classList.add('completed')}

  rollBtn.addEventListener('click',()=>{
    if(moving||phase!=='play')return;
    if(!rolled){rollBoth();return}
    const d=getEffectiveDir();if(!d){logline.textContent='Välj riktning först.';return}
    const vectors={N:[-1,0],E:[0,1],S:[1,0],W:[0,-1]},opposite={N:'S',S:'N',E:'W',W:'E'};
    let tr=row,tc=col,dir=d,path=[];
    for(let i=0;i<moveValue;i++){
      let [dr,dc]=vectors[dir];let nr=tr+dr,nc=tc+dc;
      if(nr<0||nr>=N||nc<0||nc>=N){dir=opposite[dir];[dr,dc]=vectors[dir];nr=tr+dr;nc=tc+dc}
      tr=nr;tc=nc;path.push([tr,tc]);
    }
    animatePath(path);
  });

  rerollMove.addEventListener('click',()=>{if(!rolled||moving||phase!=='play')return;moveValue=randomMove();moveDieEl.textContent=moveValue;logline.textContent='Steg-tärningen rerollad.'});
  rerollDirection.addEventListener('click',()=>{if(!rolled||moving||phase!=='play')return;dirValue=randomDir();chosenDir=null;displayDir();logline.textContent='Riktnings-tärningen rerollad.'});
  dirChoice.addEventListener('click',e=>{
    const b=e.target.closest('button[data-dir]');if(!b)return;chosenDir=b.dataset.dir;clearDirectionSelection();b.classList.add('selected');logline.textContent=`Vald riktning: ${chosenDir}.`;
  });

  function currentTileIsEmpty(){return !special.has(`${row},${col}`)}
  function adjacentIngredientTiles(){
    const result=[];for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
      if(dr===0&&dc===0)continue;const r=row+dr,c=col+dc;
      if(r>=0&&r<N&&c>=0&&c<N&&special.get(`${r},${c}`)?.type==='ingredient')result.push([r,c]);
    }return result;
  }
  function hasActiveEffect(effect){return activeManipulations.some(x=>x.effect===effect)}
  function hasFreeActiveManipulationSlot(){return activeManipulations.length<MAX_ACTIVE_MANIPULATIONS}

  function canPlayCard(card){
    if(!card||phase!=='play'||moving)return{ok:false,reason:'Card cannot be used now.'};
    if(card.effect==='keenEye'||card.effect==='doubleHarvest'){
      if(hasActiveEffect(card.effect))return{ok:false,reason:`${card.name} is already active.`};
      if(!hasFreeActiveManipulationSlot())return{ok:false,reason:'Maximum 2 Manipulation Cards can be active at once.'};return{ok:true};
    }
    if(card.effect==='calmWaters')return danger>0?{ok:true}:{ok:false,reason:'Danger is already 0.'};
    if(card.effect==='measuredStep')return rolled&&moveValue<6?{ok:true}:{ok:false,reason:'Use after rolling when Movement Die is below 6.'};
    if(card.effect==='longReach'){
      if(rolled)return{ok:false,reason:'Use between rolls while standing on an empty tile.'};
      if(!currentTileIsEmpty())return{ok:false,reason:'Long Reach requires an empty tile.'};
      if(!adjacentIngredientTiles().length)return{ok:false,reason:'No Ingredient Tile is in the 8 surrounding tiles.'};
      if(!hasFreeActiveManipulationSlot())return{ok:false,reason:'Maximum 2 Manipulation Cards can be combined at once.'};return{ok:true};
    }
    if(card.effect==='enhance'){
      const eligible=ingredients.filter(i=>!card.force||i.force===card.force);return eligible.length?{ok:true}:{ok:false,reason:card.force?`You need a collected ${card.force} ingredient.`:'You need a collected ingredient.'};
    }
    if(card.effect==='combat')return{ok:false,reason:'Tactical Cards are selected during pre-combat preparation.'};
    return{ok:false,reason:'Not implemented.'};
  }

  const cardModal=$('cardModal'),cardCategory=$('cardCategory'),cardTitle=$('cardTitle'),cardDesc=$('cardDesc'),cardTiming=$('cardTiming'),playCardBtn=$('playCardBtn');
  function openCardModal(card){
    const state=canPlayCard(card);cardCategory.textContent=card.category.toUpperCase();cardTitle.textContent=card.name;cardDesc.textContent=card.desc;cardTiming.textContent=`TIMING: ${card.timing}${state.ok?'':` · ${state.reason}`}`;playCardBtn.disabled=!state.ok;cardModal.classList.add('show');
  }
  function consumeSelectedCard(){if(selectedCardIndex===null)return;hand[selectedCardIndex]=null;selectedCardIndex=null;renderHand()}

  function chooseFromCollected(list,title,text){
    return new Promise(resolve=>{
      prepareChoiceModal(title,text,'Choose one ingredient.');
      list.forEach(ing=>{
        const btn=document.createElement('button');btn.className='choice-option';const bonuses=(ing.enhancements||[]).join(', ')||'No enhancements yet';
        btn.innerHTML=`<span class="force">${ing.force}</span><span class="ingredient-name">${ing.name}</span><span class="ingredient-effect">${bonuses}</span>`;
        btn.addEventListener('click',()=>{$('choiceModal').classList.remove('show');resolve(ing)});$('choiceOptions').appendChild(btn);
      });
    });
  }
  function chooseAdjacentTile(list){
    return new Promise(resolve=>{
      prepareChoiceModal('LONG REACH','Choose a surrounding Ingredient Tile.','This does not move Sharkan. Diagonal tiles count.');
      list.forEach(([r,c])=>{
        const btn=document.createElement('button');btn.className='choice-option';btn.innerHTML=`<span class="force">SURROUNDING TILE</span><span class="ingredient-name">${String.fromCharCode(65+r)}${c+1}</span><span class="ingredient-effect">Collect as if you landed here.</span>`;
        btn.addEventListener('click',()=>{$('choiceModal').classList.remove('show');resolve([r,c])});$('choiceOptions').appendChild(btn);
      });
    });
  }

  playCardBtn.addEventListener('click',async()=>{
    if(selectedCardIndex===null||!hand[selectedCardIndex])return;const card=hand[selectedCardIndex],state=canPlayCard(card);if(!state.ok)return;cardModal.classList.remove('show');
    if(card.effect==='keenEye'){lootRevealBonus=1;armManipulation(card,'NEXT INGREDIENT');consumeSelectedCard();logline.textContent='Keen Eye active: next Ingredient Tile reveals 4 choices.'}
    else if(card.effect==='doubleHarvest'){lootPickBonus=1;armManipulation(card,'NEXT INGREDIENT');consumeSelectedCard();logline.textContent='Double Harvest active: choose 2 on the next Ingredient Tile.'}
    else if(card.effect==='calmWaters'){danger=Math.max(0,danger-2);consumeSelectedCard();updateStatus();logline.textContent='Calm Waters: Danger -2.'}
    else if(card.effect==='measuredStep'){moveValue=Math.min(6,moveValue+1);moveDieEl.textContent=moveValue;consumeSelectedCard();logline.textContent='Measured Step: Movement Die +1.'}
    else if(card.effect==='longReach'){armManipulation(card,'RESOLVING');consumeSelectedCard();const targets=adjacentIngredientTiles();if(targets.length>1)await chooseAdjacentTile(targets);await resolveIngredientTile('adjacent');updateStatus()}
    else if(card.effect==='enhance'){
      const eligible=ingredients.filter(i=>!card.force||i.force===card.force);const target=await chooseFromCollected(eligible,'ENHANCE INGREDIENT',`Attach ${card.name}: ${card.bonus}`);target.enhancements=target.enhancements||[];target.enhancements.push(`${card.name}: ${card.bonus}`);consumeSelectedCard();logline.textContent=`${card.name} attached to ${target.name}: ${card.bonus}.`;
    }
  });

  $('closeCardModal').onclick=()=>{cardModal.classList.remove('show');selectedCardIndex=null};
  cardModal.addEventListener('click',e=>{if(e.target===cardModal){cardModal.classList.remove('show');selectedCardIndex=null}});

  const modal=$('modal'),modalTitle=$('modalTitle'),modalText=$('modalText');
  function showInfo(title,html){modalTitle.textContent=title;modalText.innerHTML=html;modal.classList.add('show')}
  $('closeModal').onclick=()=>modal.classList.remove('show');modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('show')});

  function tacticalCardsInHand(){return hand.map((card,index)=>({card,index})).filter(x=>x.card?.category==='Tactical')}

  function beginCombatPrep(encounter){
    pendingEncounter=encounter;phase='combat-prep';prepSpellSelected=false;prepPotionSelected=false;prepTacticalIndex=null;resetAfterTurn();rollBtn.disabled=true;
    $('combatPrepTitle').textContent=`PREPARE: ${encounter.tile.enemy.name.toUpperCase()}`;
    $('combatPrepText').textContent=encounter.reason==='DIRECT CONTACT'?'You entered or crossed the enemy tile. Choose your combat loadout.':'Danger has activated an adjacent enemy. Choose your combat loadout.';
    renderCombatPrep();$('combatPrepModal').classList.add('show');
  }

  function renderCombatPrep(){
    const spellBox=$('prepSpells'),potionBox=$('prepPotions'),tacticalBox=$('prepTactical');spellBox.innerHTML='';potionBox.innerHTML='';tacticalBox.innerHTML='';
    const spellBtn=document.createElement('button');spellBtn.className=`prep-option${prepSpellSelected?' selected':''}`;spellBtn.innerHTML=`<strong>${starterSpell.name}</strong><small>${starterSpell.desc}</small>`;spellBtn.onclick=()=>{prepSpellSelected=!prepSpellSelected;renderCombatPrep()};spellBox.appendChild(spellBtn);
    const potionBtn=document.createElement('button');potionBtn.className=`prep-option${prepPotionSelected?' selected':''}${starterPotion.available?'':' unavailable'}`;potionBtn.innerHTML=`<strong>${starterPotion.name}</strong><small>${starterPotion.available?starterPotion.desc:'Already used this run.'}</small>`;
    if(starterPotion.available)potionBtn.onclick=()=>{prepPotionSelected=!prepPotionSelected;renderCombatPrep()};potionBox.appendChild(potionBtn);
    const tacticals=tacticalCardsInHand();
    if(!tacticals.length){const empty=document.createElement('div');empty.className='prep-option unavailable';empty.innerHTML='<strong>NO TACTICAL CARD</strong><small>You can still start combat.</small>';tacticalBox.appendChild(empty)}
    tacticals.forEach(({card,index})=>{const btn=document.createElement('button');btn.className=`prep-option${prepTacticalIndex===index?' selected':''}`;btn.innerHTML=`<strong>${card.name}</strong><small>${card.desc}</small>`;btn.onclick=()=>{prepTacticalIndex=prepTacticalIndex===index?null:index;renderCombatPrep()};tacticalBox.appendChild(btn)});
    $('prepHint').textContent=`Spell: ${prepSpellSelected?'selected':'required'} · Potion: ${prepPotionSelected?'selected':'optional'} · Tactical: ${prepTacticalIndex===null?'optional':'selected'}`;
    $('startCombatBtn').disabled=!prepSpellSelected;
  }

  $('startCombatBtn').addEventListener('click',()=>{
    if(!pendingEncounter||!prepSpellSelected)return;
    let tactical=null;
    if(prepTacticalIndex!==null&&hand[prepTacticalIndex]){tactical=hand[prepTacticalIndex];hand[prepTacticalIndex]=null}
    combatState={encounter:pendingEncounter,enemyHp:pendingEncounter.tile.enemy.hp,enemyMaxHp:pendingEncounter.tile.enemy.hp,turn:1,potionEquipped:prepPotionSelected&&starterPotion.available,tactical,blockAvailable:['guard','dodge'].includes(tactical?.tactical),firstStrikeAvailable:tactical?.tactical==='firstStrike'};
    pendingEncounter=null;$('combatPrepModal').classList.remove('show');phase='combat';renderHand();renderCombat();$('combatModal').classList.add('show');
  });

  function renderCombat(){
    if(!combatState)return;const e=combatState.encounter.tile.enemy;
    $('combatEnemyName').textContent=e.name.toUpperCase();$('combatTurn').textContent=`TURN ${combatState.turn}`;
    $('enemyHpFill').style.width=`${Math.max(0,combatState.enemyHp)/combatState.enemyMaxHp*100}%`;$('enemyHpText').textContent=`${Math.max(0,combatState.enemyHp)}/${combatState.enemyMaxHp}`;
    $('combatPlayerHpFill').style.width=`${hp}%`;$('combatPlayerHpText').textContent=`${hp}%`;
    $('combatSpellBtn').innerHTML=`${starterSpell.name.toUpperCase()}<br><small>${starterSpell.damage} direct damage</small>`;
    $('combatPotionBtn').innerHTML=`${starterPotion.name.toUpperCase()}<br><small>+${starterPotion.heal} HP instantly</small>`;$('combatPotionBtn').disabled=!combatState.potionEquipped||!starterPotion.available;
    const canFlee=combatState.encounter.tile.type==='mob'&&combatState.tactical?.tactical==='disengage';$('combatFleeBtn').disabled=!canFlee;
    $('combatTacticalInfo').textContent=combatState.tactical?`TACTICAL: ${combatState.tactical.name} — ${combatState.tactical.desc}`:'TACTICAL: None selected';updateStatus();
  }

  function enemyAttack(){
    if(!combatState)return;const attack=combatState.encounter.tile.enemy.attack;
    if(combatState.blockAvailable){combatState.blockAvailable=false;$('combatLog').textContent=`${combatState.tactical.name} prevents the incoming attack.`}
    else{hp=Math.max(0,hp-attack);$('combatLog').textContent=`Enemy attacks Sharkan for ${attack} damage.`}
    if(hp<=0){finishCombat(false);return}
    combatState.turn++;renderCombat();
  }

  $('combatSpellBtn').addEventListener('click',()=>{
    if(phase!=='combat'||!combatState)return;
    let damage=starterSpell.damage;if(combatState.tactical?.tactical==='focus')damage+=4;if(combatState.firstStrikeAvailable){damage+=5;combatState.firstStrikeAvailable=false}
    combatState.enemyHp=Math.max(0,combatState.enemyHp-damage);$('combatLog').textContent=`${starterSpell.name} deals ${damage} direct damage.`;renderCombat();
    if(combatState.enemyHp<=0){setTimeout(()=>finishCombat(true),250);return}setTimeout(enemyAttack,250);
  });

  $('combatPotionBtn').addEventListener('click',()=>{
    if(phase!=='combat'||!combatState||!combatState.potionEquipped||!starterPotion.available)return;
    hp=Math.min(100,hp+starterPotion.heal);starterPotion.available=false;combatState.potionEquipped=false;$('combatLog').textContent=`${starterPotion.name}: +${starterPotion.heal} HP instantly.`;renderCombat();setTimeout(enemyAttack,250);
  });

  $('combatFleeBtn').addEventListener('click',()=>{
    if(phase!=='combat'||!combatState||combatState.encounter.tile.type!=='mob'||combatState.tactical?.tactical!=='disengage')return;
    $('combatModal').classList.remove('show');logline.textContent=`Disengage: escaped ${combatState.encounter.tile.enemy.name}.`;combatState=null;phase='play';finishMovementTurn();
  });

  function finishCombat(victory){
    if(!combatState)return;const {key,tile}=combatState.encounter;$('combatModal').classList.remove('show');
    if(!victory){combatState=null;phase='gameover';moving=false;resetAfterTurn();rollBtn.disabled=true;updateStatus();showInfo('SHARKAN DEFEATED','<p>HP reached 0 during combat. Game-over behavior is still a prototype.</p>');return}
    completed.add(key);const [er,ec]=key.split(',').map(Number);markCompleted(er,ec);
    if(tile.type==='guardian'){guardians++;logline.textContent=`${tile.enemy.name} defeated. Guardian objective updated.`}
    else if(tile.type==='boss'){logline.textContent='ROOTMAW DEFEATED — Zone prototype complete!'}
    else logline.textContent=`${tile.enemy.name} defeated.`;
    const bossWon=tile.type==='boss';combatState=null;phase='play';finishMovementTurn();
    if(bossWon)showInfo('ZONE COMPLETE','<p>Rootmaw has been defeated. In the full game this would award the zone Talent Point and move toward the next zone.</p>');
  }

  $('helpBtn').addEventListener('click',()=>showInfo('HAJJEN V4 — HELP',`
    <p><strong>Movement:</strong> roll Movement + Direction. Edge collisions bounce and remaining steps continue in the opposite direction. CHOOSE/WILD direction buttons visibly mark the selected direction.</p>
    <p><strong>Cards:</strong> fixed hand structure is 3 Manipulation / 2 Enhancement / 2 Tactical. Each hand card shows its effect directly.</p>
    <p><strong>Active Manipulation:</strong> up to 2 delayed/combined Manipulation Cards can be active at once.</p>
    <p><strong>Ingredient Tiles:</strong> reveal 3 and choose 1. Choices are marked first, then confirmed. Manipulation Cards can change the number revealed or chosen.</p>
    <p><strong>Starting loadout:</strong> Sharkan starts with Ember Bolt (direct damage) and one Healing Potion (instant healing). No damage-over-time or healing-over-time spells are used in this prototype.</p>
    <p><strong>Combat:</strong> enemies trigger if Sharkan lands on or moves through their tile. Before turn-based combat begins, choose spells, potions/actions and up to one Tactical Card.</p>
    <p><strong>Danger 10+:</strong> active mobs/guardians and an unlocked boss can also trigger when Sharkan enters any of the 8 adjacent tiles.</p>
    <p><strong>Danger:</strong> +1 after each completed movement turn. Manipulation Cards may reduce it. Spells and spell creation never modify Danger.</p>`));

  document.querySelectorAll('[data-modal]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(btn.dataset.modal==='Spellbook'){
        const list=ingredients.length?`<ul class="ingredient-list">${ingredients.map(i=>`<li><strong>${i.name}</strong> (${i.force})${i.enhancements?.length?` — ${i.enhancements.join('; ')}`:''}</li>`).join('')}</ul>`:'<p>No ingredients collected yet.</p>';
        showInfo('SPELLBOOK',`<p><strong>Starting spell:</strong> ${starterSpell.name} — ${starterSpell.desc}</p><p>Collected ingredients:</p>${list}`);
      }else if(btn.dataset.modal==='Backpack')showInfo('BACKPACK',`<p><strong>${starterPotion.name}:</strong> ${starterPotion.available?starterPotion.desc:'Used.'}</p><p>Crafting/equipment remains Future TODO.</p>`);
      else showInfo('TALENTS','<p>Placeholder for permanent progression. Zone completion will grant Talent Points.</p>');
    });
  });

  $('spellSlot1').addEventListener('click',()=>showInfo(starterSpell.name.toUpperCase(),`<p>${starterSpell.desc}</p>`));
  $('actionSlot1').addEventListener('click',()=>showInfo(starterPotion.name.toUpperCase(),`<p>${starterPotion.available?starterPotion.desc:'This potion has already been used.'}</p>`));

  hand=initialHand();makeBoard();playerPos();showTile(row,col);updateStatus();
})();
