(() => {
  const ROWS=10, COLS=15, AMBIENT_STEPS=3;
  const $=id=>document.getElementById(id);
  const board=$('board'), player=$('player'), toastArea=$('toastArea');
  const combatModal=$('combatModal'), craftModal=$('craftModal');

  const state={
    row:5,col:2,prevRow:5,prevCol:2,hp:100,maxHp:100,xp:0,level:1,danger:0,steps:0,
    mobKills:0,eliteKills:0,bossKilled:false,potion:1,ingredients:[],spells:[],combat:null,
    gameOver:false,bossUnlocked:false,nextAmbient:AMBIENT_STEPS,spawnBlock:0,calmCards:1,wardCards:1,steadyCards:1,
    steadySteps:0,spawnTimers:[],spawnSerial:0,craftSelection:[],aggroPulling:false
  };

  const ingredientDefs=[
    {name:'Bloomcap',force:'Growth',mark:'✿'},
    {name:'Cinder Seed',force:'Ember',mark:'✿'},
    {name:'Tide Pearl',force:'Flow',mark:'✿'},
    {name:'Ironroot',force:'Stone',mark:'✿'},
    {name:'Feather Reed',force:'Gale',mark:'✿'},
    {name:'Moonspore',force:'Aether',mark:'✿'}
  ];

  const forceSpell={
    Growth:{name:'Thorn Bloom',damage:21,note:'Heals 6 HP when cast.'},
    Ember:{name:'Cinder Burst',damage:29,note:'High direct damage.'},
    Flow:{name:'Tide Lash',damage:23,note:'Reduces the next enemy hit by 2.'},
    Stone:{name:'Stone Breaker',damage:22,note:'Reduces the next enemy hit by 4.'},
    Gale:{name:'Razor Gust',damage:25,note:'Fast direct damage.'},
    Aether:{name:'Rift Pulse',damage:27,note:'Unstable high damage.'}
  };

  state.spells=[{id:'ember-bolt',name:'Ember Bolt',force:'Ember',damage:24,note:'Starter spell.'}];

  const entities=new Map();
  const key=(r,c)=>`${r},${c}`;
  const add=(r,c,data)=>entities.set(key(r,c),{...data,r,c});

  add(2,3,{type:'ingredient',...ingredientDefs[0],title:'BLOOMCAP PATCH'});
  add(7,4,{type:'ingredient',...ingredientDefs[1],title:'CINDER SEED PATCH'});
  add(1,8,{type:'ingredient',...ingredientDefs[2],title:'TIDE PEARL SITE'});
  add(8,10,{type:'ingredient',...ingredientDefs[3],title:'IRONROOT SITE'});
  add(3,12,{type:'ingredient',...ingredientDefs[4],title:'FEATHER REED SITE'});
  add(7,13,{type:'ingredient',...ingredientDefs[5],title:'MOONSPORE SITE'});

  add(5,11,{type:'spring',mark:'✧',title:'PRIMAL SPRING',heal:45,desc:'A restorative Primal Spring. Restores up to 45 HP once per run.'});

  add(3,5,{type:'mob',mark:'☠',title:'BOGLING',baseHp:42,baseAttack:9,xp:10});
  add(6,6,{type:'mob',mark:'☠',title:'MIRELING',baseHp:44,baseAttack:9,xp:10});
  add(2,10,{type:'mob',mark:'☠',title:'ROOT STALKER',baseHp:48,baseAttack:10,xp:11});
  add(8,8,{type:'mob',mark:'☠',title:'MARSH PROWLER',baseHp:46,baseAttack:10,xp:11});
  add(4,9,{type:'elite',mark:'⚔',title:'VERDANT GUARDIAN',baseHp:112,baseAttack:15,xp:24});
  add(7,12,{type:'elite',mark:'⚔',title:'MARSH GUARDIAN',baseHp:118,baseAttack:16,xp:26});
  add(4,14,{type:'boss',mark:'♛',title:'ROOTMAW',baseHp:190,baseAttack:19,xp:50});

  const manipulationCards=$('manipulationCards');
  const cardDefs=[
    {id:'calm',name:'Calm Waters',text:'Reduce Danger by 3.',uses:()=>state.calmCards,play:()=>{if(state.calmCards<1)return;state.calmCards--;changeDanger(-3,'Calm Waters');log('Calm Waters reduced Danger by 3.','system');renderManipulation();}},
    {id:'ward',name:'Ward Sigil',text:'Block the next mob spawn.',uses:()=>state.wardCards,play:()=>{if(state.wardCards<1)return;state.wardCards--;state.spawnBlock++;log('Ward Sigil will block the next mob spawn.','system');toast('NEXT SPAWN BLOCKED','reward');renderManipulation();}},
    {id:'steady',name:'Steady Nerves',text:'Next 3 movement steps do not advance the ambient Danger clock.',uses:()=>state.steadyCards,play:()=>{if(state.steadyCards<1)return;state.steadyCards--;state.steadySteps=3;log('Steady Nerves protects the next 3 movement steps.','system');toast('3 SAFE STEPS','reward');renderManipulation();}}
  ];

  function renderManipulation(){
    manipulationCards.innerHTML='';
    cardDefs.forEach(card=>{
      const wrap=document.createElement('div');wrap.className='mini-card';
      wrap.innerHTML=`<strong>${card.name}</strong><span>${card.text}</span>`;
      const btn=document.createElement('button');btn.textContent=card.uses()?`PLAY · ${card.uses()} left`:'USED';btn.disabled=!card.uses()||state.gameOver;btn.addEventListener('click',card.play);wrap.appendChild(btn);manipulationCards.appendChild(wrap);
    });
  }

  function makeBoard(){
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
      const tile=document.createElement('div');tile.className='tile';tile.dataset.r=r;tile.dataset.c=c;
      tile.addEventListener('mouseenter',()=>showTile(r,c));
      tile.addEventListener('click',()=>{showTile(r,c);if(isAdjacent(r,c))attemptMove(r,c);});
      board.appendChild(tile);
    }
    renderBoard();positionPlayer();
  }

  function tileAt(r,c){return board.children[r*COLS+c];}
  function isAdjacent(r,c){return Math.abs(r-state.row)+Math.abs(c-state.col)===1;}
  function renderBoard(){
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
      const tile=tileAt(r,c);const keepWarning=tile.classList.contains('spawn-warning');const keepSpawn=tile.classList.contains('spawned-now');
      tile.className='tile';tile.removeAttribute('data-mark');
      const e=entities.get(key(r,c));
      if(e&&!e.completed){tile.classList.add('special',e.type);tile.dataset.mark=e.mark||'?';}
      if(e&&e.completed)tile.classList.add('completed','special',e.type),tile.dataset.mark=e.mark||'×';
      if(isAdjacent(r,c)&&!state.gameOver&&!state.combat&&!state.aggroPulling)tile.classList.add('reachable');
      if(r===state.row&&c===state.col)tile.classList.add('current');
      if(keepWarning)tile.classList.add('spawn-warning');if(keepSpawn)tile.classList.add('spawned-now');
    }
  }

  function positionPlayer(){
    player.style.left=`${((state.col+.5)/COLS)*100}%`;player.style.top=`${((state.row+.5)/ROWS)*100}%`;
  }

  function showTile(r,c){
    const e=entities.get(key(r,c));
    if(e?.type==='spring'&&e.completed){$('tileTitle').textContent='PRIMAL SPRING';$('tileSub').textContent='Depleted';$('tileDesc').textContent='The spring has already restored Sharkan this run.';return;}
    if(!e||e.completed){$('tileTitle').textContent='OPEN GROUND';$('tileSub').textContent=`Row ${r+1}, Column ${c+1}`;$('tileDesc').textContent='Move here if it is adjacent. Free movement replaces the dice in V4-B.';return;}
    $('tileTitle').textContent=e.title||e.type.toUpperCase();
    if(e.type==='ingredient'){$('tileSub').textContent=`${e.force} Ingredient`;$('tileDesc').textContent='Step here to collect it. Harvesting adds +1 Danger.';}
    else if(e.type==='mob'||e.type==='elite'){$('tileSub').textContent=e.type==='elite'?'Elite encounter':'Mob encounter';$('tileDesc').textContent=`Base ${e.baseHp} HP / ${e.baseAttack} damage. Enemy power: +${enemyPowerBonus()}%.`;}
    else if(e.type==='boss'){$('tileSub').textContent=state.bossUnlocked?'Boss ready':'Boss locked';$('tileDesc').textContent=state.bossUnlocked?'Rootmaw can now be challenged.':'Defeat 4 normal mobs and both Guardians first.';}
    else if(e.type==='spring'){$('tileSub').textContent='Restorative site · One use';$('tileDesc').textContent='Step here while injured to restore up to 45 HP. It becomes depleted after use.';}
    else{$('tileSub').textContent='World landmark';$('tileDesc').textContent=e.desc||'No automatic effect in this test.';}
  }

  function attemptMove(r,c){
    if(state.gameOver||state.combat||state.aggroPulling||!isAdjacent(r,c))return;
    const target=entities.get(key(r,c));
    if(target?.type==='boss'&&!target.completed&&!state.bossUnlocked){toast('BOSS LOCKED — COMPLETE QUESTS','danger');log('Rootmaw is locked. Defeat 4 mobs and 2 elites first.','system');return;}
    state.prevRow=state.row;state.prevCol=state.col;state.row=r;state.col=c;state.steps++;
    positionPlayer();advanceDangerClock();processSpawnTimers();renderAll();resolveCurrentTile();
    if(!state.combat)setTimeout(checkDangerAggro,120);
    maybeAmbientSpawn();
  }

  function advanceDangerClock(){
    if(state.steadySteps>0){state.steadySteps--;log(`Steady Nerves: ${state.steadySteps} protected step${state.steadySteps===1?'':'s'} remain.`,'system');return;}
    state.nextAmbient--;
    if(state.nextAmbient<=0){state.nextAmbient=AMBIENT_STEPS;changeDanger(1,'time spent moving');}
  }

  function resolveCurrentTile(){
    const e=entities.get(key(state.row,state.col));if(!e||e.completed)return;
    if(e.type==='ingredient'){e.completed=true;state.ingredients.push({name:e.name,force:e.force});changeDanger(1,'harvesting');log(`Collected ${e.name} (${e.force}).`,'reward');toast(`${e.name.toUpperCase()} COLLECTED`,'reward');renderAll();return;}
    if(e.type==='spring'){
      if(state.hp>=state.maxHp){log('Primal Spring remains unused because Sharkan is already at full HP.','system');toast('HP FULL — SPRING REMAINS','system');return;}
      const heal=Math.min(e.heal||45,state.maxHp-state.hp);state.hp+=heal;e.completed=true;log(`Primal Spring restored ${heal} HP.`,'reward');toast(`PRIMAL SPRING · +${heal} HP`,'reward');renderAll();showTile(state.row,state.col);return;
    }
    if(e.type==='mob'||e.type==='elite'||e.type==='boss')startCombat(e);
  }

  function changeDanger(amount,reason){
    const old=state.danger;state.danger=Math.max(0,Math.min(20,state.danger+amount));
    if(state.danger!==old){log(`Danger ${amount>0?'+':''}${amount} (${reason}) → ${state.danger}/20.`,'danger');if(amount>0&&state.danger>=10)toast(`DANGER ${state.danger}`,'danger');}
    renderStatus();
  }

  function dangerTier(){if(state.danger>=20)return'critical';if(state.danger>=15)return'hostile';if(state.danger>=10)return'dangerous';if(state.danger>=5)return'uneasy';return'calm';}
  function enemyScale(){const tier=dangerTier();return tier==='critical'?1.5:tier==='hostile'?1.35:tier==='dangerous'?1.2:tier==='uneasy'?1.1:1;}
  function enemyPowerBonus(){return Math.round((enemyScale()-1)*100);}
  function spawnChance(){const tier=dangerTier();return tier==='critical'?.65:tier==='hostile'?.45:tier==='dangerous'?.30:tier==='uneasy'?.15:0;}

  function renderStatus(){
    $('hpText').textContent=`${state.hp} / ${state.maxHp}`;$('hpFill').style.width=`${(state.hp/state.maxHp)*100}%`;
    const next=xpTarget();const base=state.level===1?0:state.level===2?30:state.level===3?70:120;const pct=state.level>=4?100:Math.max(0,Math.min(100,((state.xp-base)/(next-base))*100));
    $('xpText').textContent=state.level>=4?`${state.xp} XP · MAX`:`${state.xp-base} / ${next-base}`;$('xpFill').style.width=`${pct}%`;$('levelText').textContent=state.level;
    $('dangerText').textContent=`${state.danger} / 20`;$('dangerFill').style.width=`${state.danger*5}%`;
    const tier=dangerTier();$('dangerState').className=`danger-state ${tier}`;$('dangerState').textContent=tier.toUpperCase();
    const info={calm:['CALM','Low spawn pressure.'],uneasy:['UNEASY','Mobs can begin spawning as you move.'],dangerous:['DANGEROUS','More spawns, +20% enemy power, adjacent aggro.'],hostile:['HOSTILE','Heavy spawn pressure, +35% enemy power. Combat can attract nearby enemies.'],critical:['CRITICAL','Maximum pressure, +50% enemy power. Combat can attract nearby enemies.']}[tier];
    $('dangerRule').innerHTML=`<strong>${info[0]}</strong><span>${info[1]}</span>`;
    $('stepsText').textContent=state.steps;$('killsText').textContent=state.mobKills;
    $('clockText').textContent=state.steadySteps?`${state.steadySteps} protected`:`${state.nextAmbient} step${state.nextAmbient===1?'':'s'}`;$('scalingText').textContent=`+${enemyPowerBonus()}%`;
  }

  function xpTarget(){return state.level===1?30:state.level===2?70:state.level===3?120:120;}
  function gainXp(amount){state.xp+=amount;log(`Gained ${amount} XP.`,'reward');let leveled=false;while(state.level<4&&state.xp>=xpTarget()){state.level++;state.maxHp+=15;state.hp=state.maxHp;leveled=true;log(`LEVEL UP → ${state.level}. Max HP +15 and spell damage improved.`,'reward');toast(`LEVEL ${state.level}!`,'reward');}if(leveled)renderSpells();renderStatus();}
  function spellDamage(spell){return spell.damage+(state.level-1)*4;}

  function startCombat(entity,fromAggro=false){
    if(state.combat||state.gameOver)return;
    const scale=enemyScale();const maxHp=Math.round(entity.baseHp*scale);const attack=Math.round(entity.baseAttack*scale);
    state.combat={entity,maxHp,hp:maxHp,attack,guard:0,fromAggro};
    $('combatTier').textContent=entity.type==='elite'?'ELITE ENCOUNTER':entity.type==='boss'?'BOSS ENCOUNTER':'MOB ENCOUNTER';$('combatTitle').textContent=entity.title;
    $('combatMessage').textContent=`Enemy power +${enemyPowerBonus()}%. Choose a spell.`;
    $('fleeBtn').disabled=entity.type!=='mob';renderCombat();combatModal.classList.add('show');log(`${entity.title} engaged${fromAggro?' from nearby aggro':''}.`,'combat');
  }

  function renderCombat(){
    const c=state.combat;if(!c)return;$('enemyHpText').textContent=`${c.hp} / ${c.maxHp}`;$('enemyHpFill').style.width=`${Math.max(0,c.hp/c.maxHp*100)}%`;$('combatHpText').textContent=`${state.hp} / ${state.maxHp}`;$('combatHpFill').style.width=`${state.hp/state.maxHp*100}%`;
    const wrap=$('combatSpells');wrap.innerHTML='';state.spells.forEach(spell=>{const b=document.createElement('button');b.innerHTML=`${spell.name}<small>${spell.force} · ${spellDamage(spell)} damage${spell.note?` · ${spell.note}`:''}</small>`;b.addEventListener('click',()=>castSpell(spell));wrap.appendChild(b);});
  }

  function castSpell(spell){
    const c=state.combat;if(!c)return;const dmg=spellDamage(spell);c.hp-=dmg;let extra='';
    if(spell.force==='Growth'){const heal=Math.min(6,state.maxHp-state.hp);state.hp+=heal;if(heal)extra=` +${heal} HP.`;}
    if(spell.force==='Stone')c.guard=4;if(spell.force==='Flow')c.guard=2;
    $('combatMessage').textContent=`${spell.name} deals ${dmg}.${extra}`;log(`${spell.name} hit ${c.entity.title} for ${dmg}.`,'combat');
    if(c.hp<=0){finishCombatWin();return;}
    const blocked=Math.min(c.guard,c.attack);const hit=c.attack-blocked;c.guard=0;state.hp=Math.max(0,state.hp-hit);$('combatMessage').textContent+=` ${c.entity.title} hits back for ${hit}${blocked?` (${blocked} blocked)`:''}.`;log(`${c.entity.title} attacked for ${hit}.`,'combat');renderCombat();renderStatus();if(state.hp<=0)finishDefeat();
  }

  function finishCombatWin(){
    const c=state.combat,e=c.entity;e.completed=true;combatModal.classList.remove('show');state.combat=null;
    if(e.type==='mob'){state.mobKills++;changeDanger(2,'mob defeated');state.spawnTimers.push({steps:2+Math.floor(Math.random()*3),tier:'mob'});}
    if(e.type==='elite'){state.eliteKills++;changeDanger(2,'elite defeated');}
    if(e.type==='boss')state.bossKilled=true;
    gainXp(e.xp||0);log(`${e.title} defeated.`,'reward');toast(`${e.title} DEFEATED`,'reward');updateObjectives();renderAll();
    if(dangerTier()==='hostile'||dangerTier()==='critical')maybeCombatAttraction();
  }

  function finishDefeat(){combatModal.classList.remove('show');state.combat=null;state.gameOver=true;log('Sharkan was defeated. Reset the V4-B test to try again.','combat');toast('SHARKAN DEFEATED','danger');renderAll();}

  $('fleeBtn').addEventListener('click',()=>{
    if(!state.combat||state.combat.entity.type!=='mob')return;combatModal.classList.remove('show');state.combat=null;state.row=state.prevRow;state.col=state.prevCol;changeDanger(1,'fled combat');log('Sharkan fled from a normal mob.','combat');positionPlayer();renderAll();
  });

  function updateObjectives(){
    $('mobQuest').textContent=`Mobs: ${Math.min(state.mobKills,4)} / 4`;$('eliteQuest').textContent=`Elites: ${Math.min(state.eliteKills,2)} / 2`;
    const was=state.bossUnlocked;state.bossUnlocked=state.mobKills>=4&&state.eliteKills>=2;
    $('bossQuest').textContent=state.bossKilled?'Boss: DEFEATED':state.bossUnlocked?'Boss: READY':'Boss: LOCKED';
    if(state.bossUnlocked&&!was){toast('ROOTMAW UNLOCKED','reward');log('Quest complete: Rootmaw is now unlocked.','reward');}
  }

  function maybeAmbientSpawn(){
    if(state.gameOver||state.combat||state.danger<5)return;if(Math.random()>spawnChance())return;requestSpawn('mob',false);
  }

  function processSpawnTimers(){
    state.spawnTimers.forEach(t=>t.steps--);const ready=state.spawnTimers.filter(t=>t.steps<=0);state.spawnTimers=state.spawnTimers.filter(t=>t.steps>0);ready.forEach(()=>requestSpawn('mob',false));
  }

  function requestSpawn(tier='mob',adjacent=false){
    if(state.spawnBlock>0){state.spawnBlock--;log('Ward Sigil blocked a mob spawn.','system');toast('SPAWN BLOCKED','reward');return;}
    const spot=findSpawnSpot(adjacent);if(!spot)return;telegraphSpawn(spot.r,spot.c,tier,adjacent);
  }

  function findSpawnSpot(adjacent=false){
    const candidates=[];
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
      if(entities.has(key(r,c))||(r===state.row&&c===state.col))continue;const d=Math.max(Math.abs(r-state.row),Math.abs(c-state.col));
      if(adjacent?d===1:d>=2&&d<=5)candidates.push({r,c});
    }
    return candidates.length?candidates[Math.floor(Math.random()*candidates.length)]:null;
  }

  function telegraphSpawn(r,c,tier,adjacent){
    const tile=tileAt(r,c);tile.classList.add('spawn-warning');toast('ENEMY FORMING IN THE ZONE','spawn');log(`Danger pressure is spawning a new ${tier==='elite'?'elite':'mob'}.`,'danger');
    setTimeout(()=>{
      tile.classList.remove('spawn-warning');state.spawnSerial++;
      if(tier==='elite')add(r,c,{type:'elite',mark:'⚔',title:`ROUSED GUARDIAN ${state.spawnSerial}`,baseHp:104,baseAttack:15,xp:22,spawned:true});
      else add(r,c,{type:'mob',mark:'☠',title:`ROUSED BOGLING ${state.spawnSerial}`,baseHp:43,baseAttack:9,xp:10,spawned:true});
      renderBoard();tile.classList.add('spawned-now');setTimeout(()=>tile.classList.remove('spawned-now'),650);log(`${entities.get(key(r,c)).title} spawned at row ${r+1}, column ${c+1}.`,'combat');toast('NEW MOB SPAWNED','spawn');
      if(adjacent&&state.danger>=15)setTimeout(()=>{const e=entities.get(key(r,c));if(e&&!e.completed&&!state.combat&&!state.gameOver)startCombat(e,true);},850);
    },650);
  }

  function activeMobCandidates(radius){
    const candidates=[];
    entities.forEach(e=>{
      if(e.completed||e.type!=='mob')return;
      const d=Math.max(Math.abs(e.r-state.row),Math.abs(e.c-state.col));
      if(d>=2&&d<=radius)candidates.push(e);
    });
    return candidates;
  }

  function targetCellsAroundPlayer(){
    const cells=[];
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
      if(!dr&&!dc)continue;const r=state.row+dr,c=state.col+dc;if(r<0||r>=ROWS||c<0||c>=COLS)continue;
      if(!entities.has(key(r,c)))cells.push({r,c});
    }
    return cells;
  }

  function findPathToPlayer(entity){
    const targets=targetCellsAroundPlayer();if(!targets.length)return null;
    const targetSet=new Set(targets.map(p=>key(p.r,p.c)));
    const start={r:entity.r,c:entity.c};const q=[start];const prev=new Map([[key(start.r,start.c),null]]);let found=null;
    for(let i=0;i<q.length&&!found;i++){
      const cur=q[i];
      for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]){
        const nr=cur.r+dr,nc=cur.c+dc,nk=key(nr,nc);if(nr<0||nr>=ROWS||nc<0||nc>=COLS||prev.has(nk))continue;
        if(nr===state.row&&nc===state.col)continue;
        const occ=entities.get(nk);if(occ&&occ!==entity)continue;
        prev.set(nk,key(cur.r,cur.c));q.push({r:nr,c:nc});if(targetSet.has(nk)){found={r:nr,c:nc};break;}
      }
    }
    if(!found)return null;const path=[];let cursor=key(found.r,found.c);const startKey=key(start.r,start.c);
    while(cursor&&cursor!==startKey){const [r,c]=cursor.split(',').map(Number);path.unshift({r,c});cursor=prev.get(cursor);}
    return path;
  }

  function findAttractedMob(radius){
    const options=activeMobCandidates(radius).map(entity=>({entity,path:findPathToPlayer(entity)})).filter(x=>x.path&&x.path.length);
    if(!options.length)return null;const shortest=Math.min(...options.map(x=>x.path.length));const best=options.filter(x=>x.path.length===shortest);return best[Math.floor(Math.random()*best.length)];
  }

  function animateAttractedMob(entity,path){
    state.aggroPulling=true;renderBoard();tileAt(entity.r,entity.c)?.classList.add('aggro-attracted');
    toast('COMBAT ATTRACTED A NEARBY MOB','danger');log(`${entity.title} heard the fight and is moving toward Sharkan.`,'danger');
    let i=0;
    const step=()=>{
      if(state.gameOver||state.combat){state.aggroPulling=false;renderBoard();return;}
      if(i>=path.length){state.aggroPulling=false;renderBoard();tileAt(entity.r,entity.c)?.classList.add('aggro-target');setTimeout(()=>{if(!state.gameOver&&!state.combat&&!entity.completed)startCombat(entity,true);},260);return;}
      const next=path[i++];entities.delete(key(entity.r,entity.c));entity.r=next.r;entity.c=next.c;entities.set(key(entity.r,entity.c),entity);renderBoard();tileAt(entity.r,entity.c)?.classList.add('aggro-attracted');setTimeout(step,190);
    };
    setTimeout(step,360);
  }

  function maybeCombatAttraction(){
    if(state.gameOver||state.combat||state.aggroPulling)return;
    const tier=dangerTier();const radius=tier==='critical'?4:3;const chance=tier==='critical'?.60:.38;const pick=findAttractedMob(radius);if(!pick||Math.random()>chance)return;
    setTimeout(()=>animateAttractedMob(pick.entity,pick.path),420);
  }

  function checkDangerAggro(){
    if(state.danger<10||state.combat||state.gameOver||state.aggroPulling)return;
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
      if(!dr&&!dc)continue;const e=entities.get(key(state.row+dr,state.col+dc));if(e&&!e.completed&&(e.type==='mob'||e.type==='elite')){toast('ADJACENT AGGRO','danger');startCombat(e,true);return;}
    }
  }

  function renderSpells(){
    const wrap=$('spells');wrap.innerHTML='';state.spells.forEach(s=>{const d=document.createElement('div');d.className=`spell ${s.force.toLowerCase()}`;d.innerHTML=`<strong>${s.name}</strong><span>${s.force} · ${spellDamage(s)} damage</span><span>${s.note||''}</span>`;wrap.appendChild(d);});
    $('ingredients').textContent=state.ingredients.length?state.ingredients.map(x=>`${x.name} (${x.force})`).join(' · '):'None';$('craftBtn').disabled=state.ingredients.length<2||state.spells.length>=3||state.gameOver;
  }

  function openCraft(){if(state.ingredients.length<2||state.spells.length>=3)return;state.craftSelection=[];renderCraft();craftModal.classList.add('show');}
  function renderCraft(){
    const wrap=$('craftChoices');wrap.innerHTML='';state.ingredients.forEach((ing,i)=>{const b=document.createElement('button');b.className='craft-choice'+(state.craftSelection.includes(i)?' selected':'');b.innerHTML=`<strong>${ing.name}</strong><span>${ing.force}</span>`;b.addEventListener('click',()=>{const p=state.craftSelection.indexOf(i);if(p>=0)state.craftSelection.splice(p,1);else if(state.craftSelection.length<2)state.craftSelection.push(i);renderCraft();});wrap.appendChild(b);});
    const chosen=state.craftSelection.map(i=>state.ingredients[i]);const confirm=$('confirmCraftBtn');confirm.disabled=chosen.length!==2;
    if(chosen.length===2){const first=forceSpell[chosen[0].force];const bonus=modifierBonus(chosen[1].force);$('craftPreview').textContent=`${first.name} · ${chosen[0].force} · ${first.damage+bonus} base damage. ${first.note} Second ingredient adds +${bonus}.`;}
    else $('craftPreview').textContent=`Choose 2 ingredients (${chosen.length}/2). First = Force, second = modifier.`;
  }
  function modifierBonus(force){return {Growth:2,Ember:5,Flow:3,Stone:4,Gale:4,Aether:5}[force]||2;}
  function confirmCraft(){
    if(state.craftSelection.length!==2)return;const indexes=[...state.craftSelection].sort((a,b)=>b-a);const first=state.ingredients[state.craftSelection[0]],second=state.ingredients[state.craftSelection[1]],base=forceSpell[first.force];
    state.spells.push({id:`crafted-${Date.now()}`,name:base.name,force:first.force,damage:base.damage+modifierBonus(second.force),note:base.note});indexes.forEach(i=>state.ingredients.splice(i,1));state.craftSelection=[];craftModal.classList.remove('show');log(`Created ${base.name} from ${first.name} + ${second.name}.`,'reward');toast(`${base.name.toUpperCase()} CREATED`,'reward');renderAll();
  }

  $('craftBtn').addEventListener('click',openCraft);$('confirmCraftBtn').addEventListener('click',confirmCraft);$('cancelCraftBtn').addEventListener('click',()=>craftModal.classList.remove('show'));

  $('restBtn').addEventListener('click',()=>{if(state.potion<1||state.hp>=state.maxHp||state.gameOver||state.combat)return;const heal=Math.min(30,state.maxHp-state.hp);state.hp+=heal;state.potion--;log(`Healing Potion restored ${heal} HP.`,'reward');toast(`+${heal} HP`,'reward');renderAll();});
  $('resetBtn').addEventListener('click',()=>location.reload());

  function log(text,type='system'){
    const wrap=$('eventLog');const e=document.createElement('div');e.className=`event ${type}`;e.textContent=text;wrap.prepend(e);while(wrap.children.length>8)wrap.lastChild.remove();
  }
  function toast(text,type='system'){const t=document.createElement('div');t.className=`toast ${type}`;t.textContent=text;toastArea.prepend(t);setTimeout(()=>t.remove(),1750);}

  function renderAll(){renderBoard();renderStatus();renderSpells();renderManipulation();updateObjectives();$('potionText').textContent=`${state.potion} left · +30 HP`;$('restBtn').disabled=state.potion<1||state.hp>=state.maxHp||state.gameOver||!!state.combat;}

  function moveBy(dr,dc){const r=state.row+dr,c=state.col+dc;if(r<0||r>=ROWS||c<0||c>=COLS)return;attemptMove(r,c);}
  window.addEventListener('keydown',e=>{
    if(state.combat||craftModal.classList.contains('show')||state.gameOver||state.aggroPulling)return;const tag=document.activeElement?.tagName;if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT')return;
    const map={ArrowUp:[-1,0],w:[-1,0],W:[-1,0],ArrowDown:[1,0],s:[1,0],S:[1,0],ArrowLeft:[0,-1],a:[0,-1],A:[0,-1],ArrowRight:[0,1],d:[0,1],D:[0,1]};if(map[e.key]){e.preventDefault();moveBy(...map[e.key]);}
  });

  makeBoard();renderAll();log('V4-B started: movement is free. Danger now reacts to time, harvesting and combat.','system');log('Primal Spring restores up to 45 HP once per run.','system');log('Defeat 4 mobs + 2 elites to unlock Rootmaw.','system');toast('MOVE FREELY — WASD OR CLICK','reward');
})();