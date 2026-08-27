(() => {
  const N = 10;
  const MAX_ACTIVE_MANIPULATIONS = 2;
  const CARD_DRAW_INTERVAL = 3;
  const $ = id => document.getElementById(id);

  const board = $('board');
  const player = $('player');
  const rollBtn = $('rollBtn');
  const moveDiceEl = $('moveDie');
  const dirDiceEl = $('directionDie');
  const dirSub = $('directionSub');
  const dirChoice = $('directionChoice');
  const rerollMove = $('rerollMove');
  const rerollDirection = $('rerollDirection');
  const logline = $('logline');
  const hpFill = $('hpFill');
  const hpText = $('hpText');
  const dangerSegments = $('dangerSegments');
  const dangerText = $('dangerText');
  const dangerState = $('dangerState');
  const drawCountdown = $('drawCountdown');
  const tileTitle = $('tileTitle');
  const tileSub = $('tileSub');
  const tileDesc = $('tileDesc');
  const tileExtra = $('tileExtra');
  const goalShrines = $('goalShrines');
  const goalGuardians = $('goalGuardians');
  const goalBoss = $('goalBoss');
  const handEl = $('hand');
  const handSummary = $('handSummary');
  const activeManipulationsEl = $('activeManipulations');
  const activeManipSummary = $('activeManipSummary');
  const mulliganControls = $('mulliganControls');
  const mulliganText = $('mulliganText');
  const redrawBtn = $('redrawBtn');
  const startZoneBtn = $('startZoneBtn');

  let row = 3, col = 3;
  let hp = 100, danger = 0;
  let rolled = false, moving = false;
  let moveValue = null, dirValue = null, chosenDir = null;
  let wildDirs = [];
  let shrines = 0, guardians = 0, bossUnlocked = false;
  let phase = 'mulligan';
  let mulliganUsed = false;
  let emptyTutorialShown = false;
  let selectedCardIndex = null;
  let lootRevealBonus = 0;
  let lootPickBonus = 0;
  let activeManipulations = [];
  let turnsUntilCardDraw = CARD_DRAW_INTERVAL;
  let spawnSerial = 0;
  const mobSpawnTimers = [];
  const completed = new Set();
  const mulliganSelection = new Set();
  const ingredients = [];

  const starterSpell = {
    id:'spell-ember-bolt', name:'Ember Bolt', force:'Ember', damage:18, bonusDamage:0,
    desc:'Deal direct Ember damage. No damage-over-time effect.', enhancements:[]
  };
  const starterPotion = {
    id:'potion-healing', name:'Healing Potion', heal:25,
    desc:'Restore 25 HP instantly. No healing-over-time effect.', available:true
  };
  const spellLibrary = [starterSpell];
  const backpackItems = [starterPotion];
  const spellLoadout = [starterSpell, null, null];
  const actionLoadout = [starterPotion, null];

  const ingredientPool = [
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

  const cardPools = {
    Manipulation:[
      {id:'m-keen-eye',category:'Manipulation',name:'Keen Eye',timing:'Exploration',desc:'Your next Ingredient Tile reveals 4 choices instead of 3.',effect:'keenEye'},
      {id:'m-double-harvest',category:'Manipulation',name:'Double Harvest',timing:'Exploration',desc:'On your next Ingredient Tile, choose 2 ingredients instead of 1.',effect:'doubleHarvest'},
      {id:'m-long-reach',category:'Manipulation',name:'Long Reach',timing:'Empty Tile',desc:'From an empty tile, collect from an Ingredient Tile in one of the 8 surrounding tiles.',effect:'longReach'},
      {id:'m-calm-waters',category:'Manipulation',name:'Calm Waters',timing:'Between Rolls',desc:'Reduce Danger by 2.',effect:'calmWaters'},
      {id:'m-measured-step',category:'Manipulation',name:'Measured Step',timing:'After Roll',desc:'Increase the current Movement Dice by 1, up to 6.',effect:'measuredStep'}
    ],
    Enhancement:[
      {id:'e-ember-surge',category:'Enhancement',name:'Ember Surge',timing:'Spell',desc:'Give one Ember spell +5 direct damage for this zone.',effect:'enhanceSpell',force:'Ember',damageBonus:5},
      {id:'e-ember-edge',category:'Enhancement',name:'Ember Edge',timing:'Spell',desc:'Give one Ember spell +3 direct damage for this zone.',effect:'enhanceSpell',force:'Ember',damageBonus:3},
      {id:'e-primal-charge',category:'Enhancement',name:'Primal Charge',timing:'Spell',desc:'Give one damage spell +3 direct damage for this zone.',effect:'enhanceSpell',force:null,damageBonus:3},
      {id:'e-focused-power',category:'Enhancement',name:'Focused Power',timing:'Spell',desc:'Give one damage spell +2 direct damage for this zone.',effect:'enhanceSpell',force:null,damageBonus:2},
      {id:'e-growth-potency',category:'Enhancement',name:'Growth Potency',timing:'Spell',desc:'Strengthen one Growth spell. Growth spell effects are not implemented yet.',effect:'enhanceSpell',force:'Growth',damageBonus:0}
    ],
    Tactical:[
      {id:'t-quick-guard',category:'Tactical',name:'Quick Guard',timing:'Combat Prep',desc:'Block the first incoming enemy attack in this combat.',effect:'combat',tactical:'guard'},
      {id:'t-first-strike',category:'Tactical',name:'First Strike',timing:'Combat Prep',desc:'Your first spell in this combat deals +5 direct damage.',effect:'combat',tactical:'firstStrike'},
      {id:'t-dodge',category:'Tactical',name:'Dodge',timing:'Combat Prep',desc:'Avoid the first incoming enemy attack in this combat.',effect:'combat',tactical:'dodge'},
      {id:'t-battle-focus',category:'Tactical',name:'Battle Focus',timing:'Combat Prep',desc:'Your spells deal +4 direct damage for this combat.',effect:'combat',tactical:'focus'},
      {id:'t-disengage',category:'Tactical',name:'Disengage',timing:'Combat Prep',desc:'Allows you to flee from a normal mob encounter.',effect:'combat',tactical:'disengage'}
    ]
  };

  const slotCategories = ['Manipulation','Manipulation','Manipulation','Enhancement','Enhancement','Tactical','Tactical'];
  let hand = [];

  const special = new Map([
    ['0,1',{type:'shrine',mark:'S',title:'ANCIENT SHRINE',sub:'Verdant Brook',desc:'Land here to activate the shrine.'}],
    ['6,7',{type:'shrine',mark:'S',title:'ANCIENT SHRINE',sub:'Verdant Brook',desc:'Land here to activate the shrine.'}],
    ['2,5',{type:'guardian',mark:'G',title:'VERDANT GUARDIAN',sub:'Elite Encounter',desc:'Triggers combat when entered or crossed.',enemy:{name:'Verdant Guardian',hp:55,attack:10}}],
    ['7,2',{type:'guardian',mark:'G',title:'MARSH GUARDIAN',sub:'Elite Encounter',desc:'Triggers combat when entered or crossed.',enemy:{name:'Marsh Guardian',hp:55,attack:10}}],
    ['1,5',{type:'mob',mark:'M',title:'BOGLING',sub:'Mob Encounter',desc:'Triggers combat when entered or crossed.',enemy:{name:'Bogling',hp:34,attack:8}}],
    ['8,8',{type:'mob',mark:'M',title:'ROOT STALKER',sub:'Mob Encounter',desc:'Triggers combat when entered or crossed.',enemy:{name:'Root Stalker',hp:40,attack:9}}],
    ['8,5',{type:'mob',mark:'M',title:'MIRELING',sub:'Mob Encounter',desc:'Triggers combat when entered or crossed.',enemy:{name:'Mireling',hp:36,attack:8}}],
    ['4,7',{type:'mystery',mark:'?',title:'MYSTERY TILE',sub:'Unknown',desc:'Prototype: random event placeholder.'}],
    ['5,1',{type:'heal',mark:'+',title:'HEALING SPRING',sub:'Recovery',desc:'Landing here restores 20% HP instantly.'}],
    ['1,8',{type:'treasure',mark:'T',title:'TREASURE',sub:'Reward Tile',desc:'Prototype: treasure placeholder.'}],
    ['9,9',{type:'boss',mark:'B',title:'ROOTMAW',sub:'Verdant Boss',desc:'A heavy boss with strong direct attacks.',extra:'Weakness: Unknown',enemy:{name:'Rootmaw',hp:100,attack:14}}],
    ['0,4',{type:'ingredient',mark:'I',title:'INGREDIENT SITE',sub:'Primal Resources',desc:'Land here to reveal 3 ingredients and choose 1.'}],
    ['2,1',{type:'ingredient',mark:'I',title:'INGREDIENT SITE',sub:'Primal Resources',desc:'Land here to reveal 3 ingredients and choose 1.'}],
    ['3,8',{type:'ingredient',mark:'I',title:'INGREDIENT SITE',sub:'Primal Resources',desc:'Land here to reveal 3 ingredients and choose 1.'}],
    ['5,5',{type:'ingredient',mark:'I',title:'INGREDIENT SITE',sub:'Primal Resources',desc:'Land here to reveal 3 ingredients and choose 1.'}],
    ['7,6',{type:'ingredient',mark:'I',title:'INGREDIENT SITE',sub:'Primal Resources',desc:'Land here to reveal 3 ingredients and choose 1.'}],
    ['9,3',{type:'ingredient',mark:'I',title:'INGREDIENT SITE',sub:'Primal Resources',desc:'Land here to reveal 3 ingredients and choose 1.'}]
  ]);

  let pendingEncounter = null;
  let prepTacticalIndex = null;
  let combatState = null;
  let returnToCombatPrep = false;

  const cardinalDirs = ['N','E','S','W'];
  const vectors = {N:[-1,0],E:[0,1],S:[1,0],W:[0,-1]};
  const opposite = {N:'S',S:'N',E:'W',W:'E'};
  const dirGlyph = {N:'↑',E:'→',S:'↓',W:'←',CHOOSE:'CHOOSE',WILD:'WILD'};

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

  function drawCardForSlot(index){
    const category=slotCategories[index];
    const idsInHand=new Set(hand.filter(Boolean).map(c=>c.id));
    let pool=cardPools[category].filter(c=>!idsInHand.has(c.id));
    if(!pool.length) pool=cardPools[category];
    hand[index]={...pool[Math.floor(Math.random()*pool.length)]};
    return hand[index];
  }

  function redrawCardAt(index){
    const previousId=hand[index]?.id;
    const category=slotCategories[index];
    const idsInHand=new Set(hand.filter(Boolean).map(c=>c.id));
    let pool=cardPools[category].filter(c=>c.id!==previousId&&!idsInHand.has(c.id));
    if(!pool.length) pool=cardPools[category].filter(c=>c.id!==previousId);
    hand[index]={...pool[Math.floor(Math.random()*pool.length)]};
  }

  function makeBoard(){
    for(let r=0;r<N;r++) for(let c=0;c<N;c++){
      const t=document.createElement('div');
      t.className='tile';
      t.dataset.r=r;
      t.dataset.c=c;
      t.addEventListener('mouseenter',()=>showTile(r,c));
      t.addEventListener('click',()=>showTile(r,c));
      board.appendChild(t);
      refreshTileVisual(r,c);
    }
  }

  function refreshTileVisual(r,c){
    const tileEl=board.children[r*N+c];
    if(!tileEl) return;
    const preview=tileEl.classList.contains('movement-preview');
    const destination=tileEl.classList.contains('movement-destination');
    const encounterPreview=tileEl.classList.contains('movement-encounter');
    tileEl.className='tile';
    tileEl.removeAttribute('data-mark');
    const s=special.get(`${r},${c}`);
    if(s){tileEl.classList.add('special',s.type);tileEl.dataset.mark=s.mark;}
    if(completed.has(`${r},${c}`)) tileEl.classList.add('completed');
    if(preview) tileEl.classList.add('movement-preview');
    if(destination) tileEl.classList.add('movement-destination');
    if(encounterPreview) tileEl.classList.add('movement-encounter');
  }

  function playerPos(){
    const cell=100/N;
    player.style.left=((col+.5)*cell)+'%';
    player.style.top=((row+.5)*cell)+'%';
  }

  function showTile(r,c){
    const key=`${r},${c}`;
    const s=special.get(key);
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
    if(completed.has(key)&&['mob','guardian','boss'].includes(s.type)) tileExtra.textContent='Defeated / inactive.';
    else if(s.type==='boss') tileExtra.textContent=bossUnlocked?'Boss Shrine: READY':'Boss Shrine: LOCKED';
    else if(s.type==='ingredient') tileExtra.textContent='Standard: reveal 3 → choose 1. Manipulation Cards can change this.';
    else if(['mob','guardian'].includes(s.type)) tileExtra.textContent=danger>=10?'Danger 10+: enemies can also aggro from adjacent tiles.':'Direct contact/crossing triggers combat.';
    else tileExtra.textContent=s.extra||'';
  }

  function dangerLabel(){
    if(danger>=20)return'CRITICAL';
    if(danger>=15)return'HOSTILE';
    if(danger>=10)return'DANGEROUS';
    if(danger>=5)return'UNEASY';
    return'CALM';
  }

  function spellDamage(spell){return (spell?.damage||0)+(spell?.bonusDamage||0);}

  function renderActiveManipulations(){
    activeManipulationsEl.innerHTML='';
    for(let i=0;i<MAX_ACTIVE_MANIPULATIONS;i++){
      const active=activeManipulations[i];
      const slot=document.createElement('div');
      if(active){slot.className='active-manipulation-slot';slot.innerHTML=`<span class="active-name">${active.name}</span><span class="active-state">${active.state}</span>`;}
      else{slot.className='active-manipulation-slot empty';slot.textContent='EMPTY';}
      activeManipulationsEl.appendChild(slot);
    }
    activeManipSummary.textContent=`${activeManipulations.length} / ${MAX_ACTIVE_MANIPULATIONS}`;
  }

  function renderLoadout(){
    for(let i=0;i<3;i++){
      const el=$(`spellSlot${i+1}`),spell=spellLoadout[i];
      el.classList.toggle('equipped',!!spell);
      el.classList.toggle('empty-slot',!spell);
      el.innerHTML=spell?`<span>${spell.name.toUpperCase()}</span><small>${spellDamage(spell)} direct damage${spell.bonusDamage?` · +${spell.bonusDamage} enhanced`:''}</small>`:'EMPTY';
    }
    for(let i=0;i<2;i++){
      const el=$(`actionSlot${i+1}`),action=actionLoadout[i];
      const usable=!!action&&action.available;
      el.classList.toggle('equipped',usable);
      el.classList.toggle('empty-slot',!usable);
      el.innerHTML=usable?`<span>${action.name.toUpperCase()}</span><small>+${action.heal} HP instantly</small>`:'EMPTY';
    }
  }

  function renderCardDrawCountdown(){
    if(phase==='mulligan'){drawCountdown.textContent='Card draw starts when the zone begins.';return;}
    drawCountdown.textContent=`${turnsUntilCardDraw} ${turnsUntilCardDraw===1?'turn':'turns'} left to draw new card.`;
  }

  function updateStatus(){
    hp=Math.max(0,Math.min(100,hp));
    danger=Math.max(0,Math.min(20,danger));
    hpFill.style.width=hp+'%';
    hpText.textContent=hp+'%';
    [...dangerSegments.children].forEach((el,i)=>el.classList.toggle('on',i<Math.ceil(danger/4)));
    dangerText.textContent=`${danger}/20`;
    dangerState.textContent=dangerLabel();
    goalShrines.textContent=`Shrines: ${shrines} / 2`;
    goalGuardians.textContent=`Guardians: ${guardians} / 2`;
    bossUnlocked=shrines>=2&&guardians>=2;
    goalBoss.textContent=`Boss Shrine: ${bossUnlocked?'UNLOCKED':'LOCKED'}`;
    renderHand();renderActiveManipulations();renderLoadout();renderCardDrawCountdown();
  }

  function renderHand(){
    handEl.innerHTML='';
    hand.forEach((card,index)=>{
      const category=slotCategories[index];
      const slot=document.createElement('button');
      slot.className=`card-slot ${category.toLowerCase()}${card?'':' empty'}`;
      slot.dataset.index=index;
      if(phase==='mulligan'&&mulliganSelection.has(index))slot.classList.add('selected');
      slot.innerHTML=card
        ?`<span class="cat">${category==='Manipulation'?'M':category==='Enhancement'?'E':'T'} · ${category}</span><span class="name">${card.name}</span><span class="effect">${card.desc}</span><span class="timing">${card.timing}</span>`
        :`<span class="cat">${category==='Manipulation'?'M':category==='Enhancement'?'E':'T'}</span><span class="name">EMPTY</span><span class="effect"></span><span class="timing">${category}</span>`;
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
  function clearIngredientManipulations(){activeManipulations=activeManipulations.filter(x=>x.scope!=='ingredient');renderActiveManipulations();}

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
    [...mulliganSelection].forEach(redrawCardAt);
    const n=mulliganSelection.size;mulliganSelection.clear();mulliganUsed=true;
    redrawBtn.disabled=true;redrawBtn.textContent='REDRAW USED';mulliganText.textContent=`${n} kort bytta. Varje slot behöll sin kategori.`;
    renderHand();logline.textContent='Mulligan klar. Starta zonen när du är redo.';
  });

  startZoneBtn.addEventListener('click',()=>{
    if(phase!=='mulligan')return;
    phase='play';mulliganSelection.clear();mulliganControls.style.display='none';rollBtn.disabled=false;updateStatus();
    logline.textContent='Zonen har börjat. Kasta tärningarna.';
  });

  function randomMove(){return 1+Math.floor(Math.random()*6);}
  const faces=['N','E','S','W','CHOOSE','WILD'];
  function randomDir(){return faces[Math.floor(Math.random()*faces.length)];}
  function randomWildDirs(){
    const first=cardinalDirs[Math.floor(Math.random()*cardinalDirs.length)];
    const secondPool=cardinalDirs.filter(d=>d!==first);
    return [first,secondPool[Math.floor(Math.random()*secondPool.length)]];
  }

  function clearDirectionSelection(){[...dirChoice.querySelectorAll('button')].forEach(x=>x.classList.remove('selected'));}
  function clearMovementPreview(){
    [...board.querySelectorAll('.movement-preview,.movement-destination,.movement-encounter')].forEach(el=>el.classList.remove('movement-preview','movement-destination','movement-encounter'));
  }

  function appendSegment(path,startR,startC,direction,steps){
    let r=startR,c=startC,dir=direction;
    for(let i=0;i<steps;i++){
      let [dr,dc]=vectors[dir];
      let nr=r+dr,nc=c+dc;
      if(nr<0||nr>=N||nc<0||nc>=N){dir=opposite[dir];[dr,dc]=vectors[dir];nr=r+dr;nc=c+dc;}
      r=nr;c=nc;path.push([r,c]);
    }
    return [r,c];
  }

  function buildMovementPath(){
    if(!rolled||!moveValue)return[];
    const path=[];
    let r=row,c=col;
    if(dirValue==='WILD'){
      if(wildDirs.length!==2)return[];
      [r,c]=appendSegment(path,r,c,wildDirs[0],moveValue);
      [r,c]=appendSegment(path,r,c,wildDirs[1],moveValue);
      return path;
    }
    const direction=cardinalDirs.includes(dirValue)?dirValue:chosenDir;
    if(!direction)return[];
    appendSegment(path,r,c,direction,moveValue);
    return path;
  }

  function previewEffectivePath(path){
    const effective=[];
    let trigger=null;
    for(const [r,c] of path){
      effective.push([r,c]);
      const encounter=findTriggeredEncounter(r,c);
      if(encounter){trigger=encounter;break;}
    }
    return {path:effective,trigger};
  }

  function updateMovementPreview(){
    clearMovementPreview();
    const full=buildMovementPath();
    if(!full.length)return;
    const {path,trigger}=previewEffectivePath(full);
    path.forEach(([r,c],i)=>{
      const el=board.children[r*N+c];
      if(!el)return;
      el.classList.add('movement-preview');
      if(i===path.length-1)el.classList.add('movement-destination');
    });
    if(trigger&&path.length){
      const [r,c]=path[path.length-1];
      board.children[r*N+c]?.classList.add('movement-encounter');
    }
  }

  function displayDir(){
    dirDiceEl.textContent=dirValue?dirGlyph[dirValue]:'–';
    clearDirectionSelection();
    if(dirValue==='CHOOSE'){
      dirSub.textContent='Välj riktning';dirChoice.classList.add('show');
    }else if(dirValue==='WILD'){
      dirSub.textContent=wildDirs.length===2?`${dirGlyph[wildDirs[0]]}  ${dirGlyph[wildDirs[1]]}`:'';
      dirChoice.classList.remove('show');
    }else{
      dirSub.textContent='';dirChoice.classList.remove('show');
    }
    updateMovementPreview();
  }

  function rollBoth(){
    if(phase!=='play')return;
    moveValue=randomMove();dirValue=randomDir();chosenDir=null;wildDirs=dirValue==='WILD'?randomWildDirs():[];rolled=true;
    moveDiceEl.textContent=moveValue;displayDir();rerollMove.disabled=false;rerollDirection.disabled=false;
    rollBtn.innerHTML='FLYTTA<br>SHARKAN';logline.textContent='Tärningarna är kastade. Förhandsvisningen visar vägen och den blinkande slutrutan.';
  }

  function resetAfterTurn(){
    clearMovementPreview();rolled=false;moveValue=null;dirValue=null;chosenDir=null;wildDirs=[];
    moveDiceEl.textContent='–';dirDiceEl.textContent='–';dirSub.textContent='';dirChoice.classList.remove('show');clearDirectionSelection();
    rollBtn.innerHTML='KASTA<br>TÄRNINGARNA';rollBtn.disabled=phase!=='play';rerollMove.disabled=true;rerollDirection.disabled=true;
  }

  function drawCardAfterInterval(){
    const emptySlots=hand.map((card,index)=>card?null:index).filter(x=>x!==null);
    if(!emptySlots.length){logline.textContent+=' Card draw skipped: hand is full.';return;}
    const index=emptySlots[Math.floor(Math.random()*emptySlots.length)];
    const card=drawCardForSlot(index);logline.textContent+=` New ${card.category} card drawn: ${card.name}.`;
  }

  function scheduleMobSpawn(){mobSpawnTimers.push({turnsLeft:3+Math.floor(Math.random()*3)});}
  function activeEnemyKeys(){
    const keys=[];for(const [key,tile] of special.entries())if(['mob','guardian','boss'].includes(tile.type)&&!completed.has(key))keys.push(key);return keys;
  }
  function isNearActiveEnemy(r,c){
    for(const key of activeEnemyKeys()){
      const [er,ec]=key.split(',').map(Number);if(Math.max(Math.abs(er-r),Math.abs(ec-c))<=1)return true;
    }return false;
  }
  function spawnMob(){
    const candidates=[];
    for(let r=0;r<N;r++)for(let c=0;c<N;c++){
      const key=`${r},${c}`;if(special.has(key)||(r===row&&c===col)||isNearActiveEnemy(r,c))continue;candidates.push([r,c]);
    }
    if(!candidates.length)return false;
    const [r,c]=candidates[Math.floor(Math.random()*candidates.length)];spawnSerial++;
    const variants=[{name:'Roused Bogling',hp:36,attack:8},{name:'Irritated Rootling',hp:38,attack:9},{name:'Marsh Prowler',hp:40,attack:9}];
    const enemy=variants[Math.floor(Math.random()*variants.length)];
    special.set(`${r},${c}`,{type:'mob',mark:'M',title:enemy.name.toUpperCase(),sub:'Spawned Mob Encounter',desc:'The disturbed zone has produced a new mob. Triggers combat when entered or crossed.',enemy:{...enemy,spawnId:spawnSerial}});
    refreshTileVisual(r,c);logline.textContent+=` The disturbed zone spawned ${enemy.name} at ${String.fromCharCode(65+r)}${c+1}.`;return true;
  }
  function tickMobSpawns(){
    for(let i=mobSpawnTimers.length-1;i>=0;i--){mobSpawnTimers[i].turnsLeft--;if(mobSpawnTimers[i].turnsLeft<=0){spawnMob();mobSpawnTimers.splice(i,1);}}
  }

  function finishMovementTurn(){
    danger=Math.min(20,danger+1);turnsUntilCardDraw--;tickMobSpawns();
    if(turnsUntilCardDraw<=0){drawCardAfterInterval();turnsUntilCardDraw=CARD_DRAW_INTERVAL;}
    moving=false;resetAfterTurn();updateStatus();
  }

  function encounterTileActive(key,tile){
    if(!tile||!['mob','guardian','boss'].includes(tile.type)||completed.has(key))return false;
    if(tile.type==='boss'&&!bossUnlocked)return false;return true;
  }
  function findTriggeredEncounter(r,c){
    const directKey=`${r},${c}`,direct=special.get(directKey);
    if(encounterTileActive(directKey,direct))return{key:directKey,tile:direct,reason:'DIRECT CONTACT'};
    if(danger<10)return null;
    for(const [key,tile] of special.entries()){
      if(!encounterTileActive(key,tile))continue;
      const [er,ec]=key.split(',').map(Number);
      if(Math.max(Math.abs(er-r),Math.abs(ec-c))===1)return{key,tile,reason:'DANGER AGGRO — ADJACENT'};
    }return null;
  }

  async function animatePath(path){
    clearMovementPreview();moving=true;rollBtn.disabled=true;rerollMove.disabled=true;rerollDirection.disabled=true;dirChoice.classList.remove('show');
    for(const [r,c] of path){
      row=r;col=c;playerPos();await new Promise(res=>setTimeout(res,170));
      const encounter=findTriggeredEncounter(r,c);if(encounter){moving=false;beginCombatPrep(encounter);return;}
    }
    await resolveLanding();finishMovementTurn();
  }

  function randomIngredients(count){return shuffle(ingredientPool).slice(0,count).map(x=>({...x}));}
  function prepareChoiceModal(title,text,hint){
    $('choiceTitle').textContent=title;$('choiceText').textContent=text;$('choiceOptions').innerHTML='';$('choiceHint').textContent=hint||'';
    const confirm=$('confirmChoiceBtn');confirm.hidden=true;confirm.disabled=true;confirm.onclick=null;$('choiceModal').classList.add('show');
  }
  function ingredientChoice(options,pickCount){
    return new Promise(resolve=>{
      prepareChoiceModal('CHOOSE INGREDIENT',`${options.length} alternativ visas. Markera ${pickCount} och bekräfta.`,`0 / ${pickCount} valda`);
      const chosen=new Set(),confirm=$('confirmChoiceBtn');confirm.hidden=false;
      options.forEach((ing,index)=>{
        const btn=document.createElement('button');btn.className='choice-option';
        btn.innerHTML=`<span class="force">${ing.force}</span><span class="ingredient-name">${ing.name}</span><span class="ingredient-effect">${ing.effect}</span>`;
        btn.onclick=()=>{
          if(chosen.has(index)){chosen.delete(index);btn.classList.remove('selected');}
          else if(chosen.size<pickCount){chosen.add(index);btn.classList.add('selected');}
          $('choiceHint').textContent=`${chosen.size} / ${pickCount} valda`;confirm.disabled=chosen.size!==pickCount;
        };
        $('choiceOptions').appendChild(btn);
      });
      confirm.onclick=()=>{if(chosen.size!==pickCount)return;$('choiceModal').classList.remove('show');confirm.hidden=true;resolve([...chosen].map(i=>options[i]));};
    });
  }

  async function resolveIngredientTile(source='landed'){
    const revealCount=Math.min(4,3+lootRevealBonus),pickCount=Math.min(revealCount,1+lootPickBonus);
    const chosen=await ingredientChoice(randomIngredients(revealCount),pickCount);
    chosen.forEach(ing=>ingredients.push({...ing}));lootRevealBonus=0;lootPickBonus=0;clearIngredientManipulations();
    logline.textContent=`Ingredient ${source==='adjacent'?'collected with Long Reach':'collected'}: ${chosen.map(x=>x.name).join(' + ')}.`;
  }

  async function resolveLanding(){
    const key=`${row},${col}`,s=special.get(key);showTile(row,col);
    if(!s){
      logline.textContent=`Sharkan landade på ${String.fromCharCode(65+row)}${col+1}. Ingen automatisk effekt.`;
      if(!emptyTutorialShown){emptyTutorialShown=true;showInfo('EMPTY TILE','<p>Tomma rutor har ingen automatisk effekt.</p><p>Du kan spela ett giltigt kort, till exempel <strong>Long Reach</strong> om en Ingredient Tile ligger i någon av de åtta rutorna runt Sharkan. Annars slår du tärningarna igen.</p><p>Danger ökar när turen avslutas. Informationen finns under HELP.</p>');}
      return;
    }
    if(s.type==='ingredient')await resolveIngredientTile('landed');
    else if(s.type==='heal'){hp+=20;logline.textContent='Healing Spring: +20% HP instantly.';}
    else if(s.type==='shrine'){
      if(!completed.has(key)){shrines++;completed.add(key);refreshTileVisual(row,col);}logline.textContent='Shrine aktiverad.';
    }else if(s.type==='boss')logline.textContent=bossUnlocked?'Rootmaw is active. Contact will trigger combat.':'Boss Shrine är låst. Slutför målen först.';
    else if(s.type==='mystery')logline.textContent='Mystery event (placeholder).';
    else if(s.type==='treasure')logline.textContent='Treasure (placeholder).';
  }

  rollBtn.addEventListener('click',()=>{
    if(moving||phase!=='play')return;
    if(!rolled){rollBoth();return;}
    const path=buildMovementPath();
    if(!path.length){logline.textContent='Välj riktning först.';return;}
    animatePath(path);
  });
  rerollMove.addEventListener('click',()=>{
    if(!rolled||moving||phase!=='play')return;moveValue=randomMove();moveDiceEl.textContent=moveValue;updateMovementPreview();logline.textContent='Movement Dice rerolled.';
  });
  rerollDirection.addEventListener('click',()=>{
    if(!rolled||moving||phase!=='play')return;dirValue=randomDir();chosenDir=null;wildDirs=dirValue==='WILD'?randomWildDirs():[];displayDir();logline.textContent='Direction Dice rerolled.';
  });
  dirChoice.addEventListener('click',e=>{
    const b=e.target.closest('button[data-dir]');if(!b)return;chosenDir=b.dataset.dir;clearDirectionSelection();b.classList.add('selected');updateMovementPreview();logline.textContent=`Vald riktning: ${chosenDir}.`;
  });

  function currentTileIsEmpty(){return !special.has(`${row},${col}`);}
  function adjacentIngredientTiles(){
    const result=[];for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
      if(dr===0&&dc===0)continue;const r=row+dr,c=col+dc;if(r>=0&&r<N&&c>=0&&c<N&&special.get(`${r},${c}`)?.type==='ingredient')result.push([r,c]);
    }return result;
  }
  function hasActiveEffect(effect){return activeManipulations.some(x=>x.effect===effect);}
  function hasFreeActiveManipulationSlot(){return activeManipulations.length<MAX_ACTIVE_MANIPULATIONS;}

  function eligibleSpellsForEnhancement(card){
    return spellLibrary.filter(spell=>(!card.force||spell.force===card.force)&&spell.damage>0);
  }

  function canPlayCard(card){
    if(!card||phase!=='play'||moving)return{ok:false,reason:'Card cannot be used now.'};
    if(card.effect==='keenEye'||card.effect==='doubleHarvest'){
      if(hasActiveEffect(card.effect))return{ok:false,reason:`${card.name} is already active.`};
      if(!hasFreeActiveManipulationSlot())return{ok:false,reason:'Maximum 2 Manipulation Cards can be active at once.'};return{ok:true};
    }
    if(card.effect==='calmWaters')return danger>0?{ok:true}:{ok:false,reason:'Danger is already 0.'};
    if(card.effect==='measuredStep')return rolled&&moveValue<6?{ok:true}:{ok:false,reason:'Use after rolling when Movement Dice is below 6.'};
    if(card.effect==='longReach'){
      if(rolled)return{ok:false,reason:'Use between rolls while standing on an empty tile.'};
      if(!currentTileIsEmpty())return{ok:false,reason:'Long Reach requires an empty tile.'};
      if(!adjacentIngredientTiles().length)return{ok:false,reason:'No Ingredient Tile is in the 8 surrounding tiles.'};
      if(!hasFreeActiveManipulationSlot())return{ok:false,reason:'Maximum 2 Manipulation Cards can be combined at once.'};return{ok:true};
    }
    if(card.effect==='enhanceSpell'){
      const eligible=eligibleSpellsForEnhancement(card);
      return eligible.length?{ok:true}:{ok:false,reason:card.force?`You need a ${card.force} damage spell in your Spellbook.`:'You need a damage spell in your Spellbook.'};
    }
    if(card.effect==='combat')return{ok:false,reason:'Tactical Cards are selected during pre-combat preparation.'};
    return{ok:false,reason:'Not implemented.'};
  }

  const cardModal=$('cardModal'),cardCategory=$('cardCategory'),cardTitle=$('cardTitle'),cardDesc=$('cardDesc'),cardTiming=$('cardTiming'),playCardBtn=$('playCardBtn');
  function openCardModal(card){
    const state=canPlayCard(card);cardCategory.textContent=card.category.toUpperCase();cardTitle.textContent=card.name;cardDesc.textContent=card.desc;
    cardTiming.textContent=`TIMING: ${card.timing}${state.ok?'':` · ${state.reason}`}`;playCardBtn.disabled=!state.ok;cardModal.classList.add('show');
  }
  function consumeSelectedCard(){if(selectedCardIndex===null)return;hand[selectedCardIndex]=null;selectedCardIndex=null;renderHand();}

  function chooseSpellForEnhancement(spells,card){
    return new Promise(resolve=>{
      prepareChoiceModal('ENHANCE SPELL',`Choose a spell for ${card.name}.`,'Choose one spell.');
      spells.forEach(spell=>{
        const btn=document.createElement('button');btn.className='choice-option';
        btn.innerHTML=`<span class="force">${spell.force}</span><span class="ingredient-name">${spell.name}</span><span class="ingredient-effect">Current: ${spellDamage(spell)} direct damage · ${card.desc}</span>`;
        btn.onclick=()=>{$('choiceModal').classList.remove('show');resolve(spell);};$('choiceOptions').appendChild(btn);
      });
    });
  }

  function chooseAdjacentTile(list){
    return new Promise(resolve=>{
      prepareChoiceModal('LONG REACH','Choose a surrounding Ingredient Tile.','This does not move Sharkan. Diagonal tiles count.');
      list.forEach(([r,c])=>{
        const btn=document.createElement('button');btn.className='choice-option';btn.innerHTML=`<span class="force">SURROUNDING TILE</span><span class="ingredient-name">${String.fromCharCode(65+r)}${c+1}</span><span class="ingredient-effect">Collect as if you landed here.</span>`;
        btn.onclick=()=>{$('choiceModal').classList.remove('show');resolve([r,c]);};$('choiceOptions').appendChild(btn);
      });
    });
  }

  playCardBtn.addEventListener('click',async()=>{
    if(selectedCardIndex===null||!hand[selectedCardIndex])return;
    const card=hand[selectedCardIndex],state=canPlayCard(card);if(!state.ok)return;cardModal.classList.remove('show');
    if(card.effect==='keenEye'){lootRevealBonus=1;armManipulation(card,'NEXT INGREDIENT');consumeSelectedCard();logline.textContent='Keen Eye active: next Ingredient Tile reveals 4 choices.';}
    else if(card.effect==='doubleHarvest'){lootPickBonus=1;armManipulation(card,'NEXT INGREDIENT');consumeSelectedCard();logline.textContent='Double Harvest active: choose 2 on the next Ingredient Tile.';}
    else if(card.effect==='calmWaters'){danger=Math.max(0,danger-2);consumeSelectedCard();updateStatus();logline.textContent='Calm Waters: Danger -2.';}
    else if(card.effect==='measuredStep'){moveValue=Math.min(6,moveValue+1);moveDiceEl.textContent=moveValue;consumeSelectedCard();updateMovementPreview();logline.textContent='Measured Step: Movement Dice +1.';}
    else if(card.effect==='longReach'){armManipulation(card,'RESOLVING');consumeSelectedCard();const targets=adjacentIngredientTiles();if(targets.length>1)await chooseAdjacentTile(targets);await resolveIngredientTile('adjacent');updateStatus();}
    else if(card.effect==='enhanceSpell'){
      const target=await chooseSpellForEnhancement(eligibleSpellsForEnhancement(card),card);
      target.bonusDamage=(target.bonusDamage||0)+(card.damageBonus||0);
      target.enhancements=target.enhancements||[];target.enhancements.push(`${card.name}: +${card.damageBonus||0} damage`);
      consumeSelectedCard();updateStatus();logline.textContent=`${card.name} enhanced ${target.name}: +${card.damageBonus||0} direct damage for this zone.`;
    }
  });

  $('closeCardModal').onclick=()=>{cardModal.classList.remove('show');selectedCardIndex=null;};
  cardModal.addEventListener('click',e=>{if(e.target===cardModal){cardModal.classList.remove('show');selectedCardIndex=null;}});

  const modal=$('modal'),modalTitle=$('modalTitle'),modalText=$('modalText');
  function showInfo(title,html){modalTitle.textContent=title;modalText.innerHTML=html;modal.classList.add('show');}
  function closeInfoModal(){
    modal.classList.remove('show');
    if(returnToCombatPrep&&phase==='combat-prep'&&pendingEncounter){returnToCombatPrep=false;renderCombatPrep();$('combatPrepModal').classList.add('show');}
  }
  $('closeModal').onclick=closeInfoModal;modal.addEventListener('click',e=>{if(e.target===modal)closeInfoModal();});

  function equipSpellToSlot(spell,index){
    for(let i=0;i<spellLoadout.length;i++)if(spellLoadout[i]?.id===spell.id)spellLoadout[i]=null;spellLoadout[index]=spell;updateStatus();
  }
  function equipActionToSlot(item,index){
    for(let i=0;i<actionLoadout.length;i++)if(actionLoadout[i]?.id===item.id)actionLoadout[i]=null;if(item.available)actionLoadout[index]=item;updateStatus();
  }

  function openSpellbook(targetSlot=null,fromCombatPrep=false){
    if(fromCombatPrep){$('combatPrepModal').classList.remove('show');returnToCombatPrep=true;}
    const ingredientList=ingredients.length?`<ul class="ingredient-list">${ingredients.map(i=>`<li><strong>${i.name}</strong> (${i.force})</li>`).join('')}</ul>`:'<p>No ingredients collected yet.</p>';
    const spell=spellLibrary[0],equippedIndex=spellLoadout.findIndex(x=>x?.id===spell.id);
    const enhancementText=spell.enhancements?.length?`<p><strong>Zone enhancements:</strong> ${spell.enhancements.join('; ')}</p>`:'<p><strong>Zone enhancements:</strong> None.</p>';
    const targetText=targetSlot===null?'Choose a spell slot from the main UI to move/equip a spell.':`Target: Spell Slot ${targetSlot+1}.`;
    showInfo('SPELLBOOK',`<p>${targetText}</p><div class="inventory-item"><h3>${spell.name}</h3><p>${spell.desc}</p><p><strong>Current direct damage:</strong> ${spellDamage(spell)}</p>${enhancementText}<div class="inventory-status">${equippedIndex>=0?`Currently equipped in Spell Slot ${equippedIndex+1}.`:'Not equipped.'}</div><div class="inventory-actions">${targetSlot!==null?`<button data-spell-equip="${targetSlot}">EQUIP TO SLOT ${targetSlot+1}</button>`:''}${equippedIndex>=0?`<button data-spell-unequip="${equippedIndex}">UNEQUIP</button>`:''}</div></div><p><strong>Collected ingredients:</strong></p>${ingredientList}<p class="system-note">Ingredient-strengthening effects are reserved for persistent loot carried in the Backpack between zones, not Enhancement Cards.</p>`);
  }

  function openBackpack(targetSlot=null,fromCombatPrep=false){
    if(fromCombatPrep){$('combatPrepModal').classList.remove('show');returnToCombatPrep=true;}
    const item=backpackItems[0],equippedIndex=actionLoadout.findIndex(x=>x?.id===item.id&&item.available);
    const canUseNow=phase==='play'&&!moving&&item.available&&hp<100;
    const targetText=targetSlot===null?'Backpack items can be used outside combat or equipped into Action slots.':`Target: Action Slot ${targetSlot+1}.`;
    showInfo('BACKPACK',`<p>${targetText}</p><div class="inventory-item"><h3>${item.name}</h3><p>${item.available?item.desc:'This item has been used.'}</p><div class="inventory-status">${equippedIndex>=0?`Currently equipped in Action Slot ${equippedIndex+1}.`:item.available?'Not equipped.':'Unavailable.'}</div><div class="inventory-actions">${item.available&&targetSlot!==null?`<button data-action-equip="${targetSlot}">EQUIP TO SLOT ${targetSlot+1}</button>`:''}${equippedIndex>=0?`<button data-action-unequip="${equippedIndex}">UNEQUIP</button>`:''}${canUseNow?`<button data-use-potion-now="1">USE NOW (+${item.heal} HP)</button>`:''}</div></div><p>During combat, only items equipped in Action slots are available.</p><p class="system-note">Future persistent loot may also be carried here and used between zones to strengthen ingredients.</p>`);
  }

  modalText.addEventListener('click',e=>{
    const spellEquip=e.target.closest('[data-spell-equip]');if(spellEquip){equipSpellToSlot(starterSpell,Number(spellEquip.dataset.spellEquip));closeInfoModal();return;}
    const spellUnequip=e.target.closest('[data-spell-unequip]');if(spellUnequip){spellLoadout[Number(spellUnequip.dataset.spellUnequip)]=null;updateStatus();closeInfoModal();return;}
    const actionEquip=e.target.closest('[data-action-equip]');if(actionEquip){equipActionToSlot(starterPotion,Number(actionEquip.dataset.actionEquip));closeInfoModal();return;}
    const actionUnequip=e.target.closest('[data-action-unequip]');if(actionUnequip){actionLoadout[Number(actionUnequip.dataset.actionUnequip)]=null;updateStatus();closeInfoModal();return;}
    if(e.target.closest('[data-use-potion-now]')&&phase==='play'&&!moving&&starterPotion.available){
      hp=Math.min(100,hp+starterPotion.heal);starterPotion.available=false;for(let i=0;i<actionLoadout.length;i++)if(actionLoadout[i]?.id===starterPotion.id)actionLoadout[i]=null;
      updateStatus();logline.textContent=`${starterPotion.name} used from Backpack: +${starterPotion.heal} HP instantly.`;closeInfoModal();
    }
  });

  document.querySelectorAll('[data-spell-slot]').forEach(btn=>btn.addEventListener('click',()=>{if(phase!=='combat')openSpellbook(Number(btn.dataset.spellSlot));}));
  document.querySelectorAll('[data-action-slot]').forEach(btn=>btn.addEventListener('click',()=>{if(phase!=='combat')openBackpack(Number(btn.dataset.actionSlot));}));
  function tacticalCardsInHand(){return hand.map((card,index)=>({card,index})).filter(x=>x.card?.category==='Tactical');}

  function beginCombatPrep(encounter){
    clearMovementPreview();pendingEncounter=encounter;phase='combat-prep';prepTacticalIndex=null;resetAfterTurn();rollBtn.disabled=true;
    $('combatPrepTitle').textContent=`PREPARE: ${encounter.tile.enemy.name.toUpperCase()}`;
    $('combatPrepText').textContent=encounter.reason==='DIRECT CONTACT'?'You entered or crossed the enemy tile. Your current Spell/Action loadout is carried into combat; you may change it before starting.':'Danger has activated an adjacent enemy. Your current Spell/Action loadout is carried into combat; you may change it before starting.';
    renderCombatPrep();$('combatPrepModal').classList.add('show');
  }

  function renderPrepLoadout(container,items,type){
    container.innerHTML='';items.forEach((item,index)=>{
      const box=document.createElement('div');
      if(item&&(type==='spell'||item.available)){
        box.className='prep-option selected';
        const stat=type==='spell'?`${spellDamage(item)} direct damage`:item.desc;
        box.innerHTML=`<strong>${type==='spell'?`SPELL ${index+1}`:`ACTION ${index+1}`}: ${item.name}</strong><small>${stat}</small>`;
      }else{box.className='prep-option unavailable';box.innerHTML=`<strong>${type==='spell'?'SPELL':'ACTION'} ${index+1}: EMPTY</strong><small>No ${type==='spell'?'spell':'action'} equipped.</small>`;}
      container.appendChild(box);
    });
  }

  function renderCombatPrep(){
    renderPrepLoadout($('prepSpells'),spellLoadout,'spell');renderPrepLoadout($('prepPotions'),actionLoadout,'action');
    const tacticalBox=$('prepTactical');tacticalBox.innerHTML='';const tacticals=tacticalCardsInHand();
    if(!tacticals.length){const empty=document.createElement('div');empty.className='prep-option unavailable';empty.innerHTML='<strong>NO TACTICAL CARD</strong><small>You can still start combat.</small>';tacticalBox.appendChild(empty);}
    tacticals.forEach(({card,index})=>{
      const btn=document.createElement('button');btn.className=`prep-option${prepTacticalIndex===index?' selected':''}`;btn.innerHTML=`<strong>${card.name}</strong><small>${card.desc}</small>`;
      btn.onclick=()=>{prepTacticalIndex=prepTacticalIndex===index?null:index;renderCombatPrep();};tacticalBox.appendChild(btn);
    });
    const equippedSpells=spellLoadout.filter(Boolean).length,equippedActions=actionLoadout.filter(x=>x?.available).length;
    $('prepHint').textContent=`${equippedSpells} spell(s) · ${equippedActions} action(s) equipped · Tactical: ${prepTacticalIndex===null?'optional':'selected'}`;$('startCombatBtn').disabled=equippedSpells===0;
  }
  $('changeSpellsBtn').addEventListener('click',()=>openSpellbook(0,true));
  $('changeActionsBtn').addEventListener('click',()=>openBackpack(0,true));

  $('startCombatBtn').addEventListener('click',()=>{
    if(!pendingEncounter||!spellLoadout.some(Boolean))return;
    let tactical=null;if(prepTacticalIndex!==null&&hand[prepTacticalIndex]){tactical=hand[prepTacticalIndex];hand[prepTacticalIndex]=null;}
    const combatSpell=spellLoadout.find(Boolean),combatAction=actionLoadout.find(x=>x?.available)||null;
    combatState={encounter:pendingEncounter,enemyHp:pendingEncounter.tile.enemy.hp,enemyMaxHp:pendingEncounter.tile.enemy.hp,turn:1,spell:combatSpell,action:combatAction,tactical,blockAvailable:['guard','dodge'].includes(tactical?.tactical),firstStrikeAvailable:tactical?.tactical==='firstStrike'};
    pendingEncounter=null;$('combatPrepModal').classList.remove('show');phase='combat';renderHand();renderCombat();$('combatModal').classList.add('show');
  });

  function renderCombat(){
    if(!combatState)return;const e=combatState.encounter.tile.enemy;
    $('combatEnemyName').textContent=e.name.toUpperCase();$('combatTurn').textContent=`TURN ${combatState.turn}`;
    $('enemyHpFill').style.width=`${Math.max(0,combatState.enemyHp)/combatState.enemyMaxHp*100}%`;$('enemyHpText').textContent=`${Math.max(0,combatState.enemyHp)}/${combatState.enemyMaxHp}`;
    $('combatPlayerHpFill').style.width=`${hp}%`;$('combatPlayerHpText').textContent=`${hp}%`;
    $('combatSpellBtn').innerHTML=`${combatState.spell.name.toUpperCase()}<br><small>${spellDamage(combatState.spell)} direct damage</small>`;
    if(combatState.action?.available){$('combatPotionBtn').innerHTML=`${combatState.action.name.toUpperCase()}<br><small>+${combatState.action.heal} HP instantly</small>`;$('combatPotionBtn').disabled=false;}
    else{$('combatPotionBtn').innerHTML='NO ACTION';$('combatPotionBtn').disabled=true;}
    $('combatFleeBtn').disabled=!(combatState.encounter.tile.type==='mob'&&combatState.tactical?.tactical==='disengage');
    $('combatTacticalInfo').textContent=combatState.tactical?`TACTICAL: ${combatState.tactical.name} — ${combatState.tactical.desc}`:'TACTICAL: None selected';updateStatus();
  }

  function enemyAttack(){
    if(!combatState)return;const attack=combatState.encounter.tile.enemy.attack;
    if(combatState.blockAvailable){combatState.blockAvailable=false;$('combatLog').textContent=`${combatState.tactical.name} prevents the incoming attack.`;}
    else{hp=Math.max(0,hp-attack);$('combatLog').textContent=`Enemy attacks Sharkan for ${attack} damage.`;}
    if(hp<=0){finishCombat(false);return;}combatState.turn++;renderCombat();
  }

  $('combatSpellBtn').addEventListener('click',()=>{
    if(phase!=='combat'||!combatState)return;
    let damage=spellDamage(combatState.spell);if(combatState.tactical?.tactical==='focus')damage+=4;if(combatState.firstStrikeAvailable){damage+=5;combatState.firstStrikeAvailable=false;}
    combatState.enemyHp=Math.max(0,combatState.enemyHp-damage);$('combatLog').textContent=`${combatState.spell.name} deals ${damage} direct damage.`;renderCombat();
    if(combatState.enemyHp<=0){setTimeout(()=>finishCombat(true),250);return;}setTimeout(enemyAttack,250);
  });
  $('combatPotionBtn').addEventListener('click',()=>{
    if(phase!=='combat'||!combatState||!combatState.action?.available)return;
    hp=Math.min(100,hp+combatState.action.heal);combatState.action.available=false;for(let i=0;i<actionLoadout.length;i++)if(actionLoadout[i]?.id===combatState.action.id)actionLoadout[i]=null;
    $('combatLog').textContent=`${combatState.action.name}: +${combatState.action.heal} HP instantly.`;combatState.action=null;renderCombat();setTimeout(enemyAttack,250);
  });
  $('combatFleeBtn').addEventListener('click',()=>{
    if(phase!=='combat'||!combatState||combatState.encounter.tile.type!=='mob'||combatState.tactical?.tactical!=='disengage')return;
    $('combatModal').classList.remove('show');logline.textContent=`Disengage: escaped ${combatState.encounter.tile.enemy.name}.`;combatState=null;phase='play';finishMovementTurn();
  });

  function finishCombat(victory){
    if(!combatState)return;const {key,tile}=combatState.encounter;$('combatModal').classList.remove('show');
    if(!victory){combatState=null;phase='gameover';moving=false;resetAfterTurn();rollBtn.disabled=true;updateStatus();showInfo('SHARKAN DEFEATED','<p>HP reached 0 during combat. Game-over behavior is still a prototype.</p>');return;}
    completed.add(key);const [er,ec]=key.split(',').map(Number);refreshTileVisual(er,ec);
    if(tile.type==='guardian'){guardians++;logline.textContent=`${tile.enemy.name} defeated. Guardian objective updated.`;}
    else if(tile.type==='boss')logline.textContent='ROOTMAW DEFEATED — Zone prototype complete!';
    else{danger=Math.min(20,danger+2);scheduleMobSpawn();logline.textContent=`${tile.enemy.name} defeated. Danger +2: the zone has been irritated.`;}
    const bossWon=tile.type==='boss';combatState=null;phase='play';finishMovementTurn();
    if(bossWon)showInfo('ZONE COMPLETE','<p>Rootmaw has been defeated. In the full game this would award the zone Talent Point and move toward the next zone.</p>');
  }

  $('helpBtn').addEventListener('click',()=>showInfo('HAJJEN V4 — HELP',`
    <p><strong>Movement:</strong> roll Movement Dice + Direction Dice. The board previews the route before movement; the final reachable tile blinks. Edge collisions bounce and continue with remaining steps.</p>
    <p><strong>WILD:</strong> rolls two different random cardinal directions. Sharkan moves the full Movement Dice value in the first direction, then the full value again in the second. Opposite directions are allowed.</p>
    <p><strong>Cards:</strong> fixed hand structure is 3 Manipulation / 2 Enhancement / 2 Tactical. Every 3 completed turns, one new card is drawn if any hand slot is empty. Active Manipulation Cards do not block card draw.</p>
    <p><strong>Enhancement Cards:</strong> affect spells directly for the current zone, for example +5 direct damage to an Ember spell. They no longer modify ingredients.</p>
    <p><strong>Persistent loot:</strong> future loot carried in the Backpack between zones can fill the old permanent role of strengthening ingredients.</p>
    <p><strong>Ingredient Tiles:</strong> reveal 3 and choose 1. Choices are marked first, then confirmed. Manipulation Cards can change the number revealed or chosen.</p>
    <p><strong>Loadout:</strong> Spell/Action slots persist until you change them. Clicking a Spell slot opens Spellbook; clicking an Action slot opens Backpack.</p>
    <p><strong>Backpack:</strong> outside combat you may use healing from any tile. During combat you only have Actions equipped in Action slots.</p>
    <p><strong>Combat:</strong> enemies trigger if Sharkan lands on or moves through their tile. Pre-combat lets you change the persistent loadout and select up to one Tactical Card.</p>
    <p><strong>Mob kills:</strong> defeating a normal mob adds +2 Danger on top of the normal turn increase and may cause another mob to spawn several turns later.</p>
    <p><strong>Danger 10+:</strong> active enemies can also aggro when Sharkan enters one of their 8 adjacent tiles.</p>
    <p><strong>Spells:</strong> no damage-over-time or healing-over-time effects are used at this stage.</p>`));

  document.querySelectorAll('[data-modal]').forEach(btn=>btn.addEventListener('click',()=>{
    if(btn.dataset.modal==='Spellbook')openSpellbook();else if(btn.dataset.modal==='Backpack')openBackpack();else showInfo('TALENTS','<p>Placeholder for permanent progression. Zone completion will grant Talent Points.</p>');
  }));

  hand=initialHand();makeBoard();playerPos();showTile(row,col);updateStatus();
})();
