(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG;
  if(!cfg)return;
  const SAVE_KEY='hajjen-v4b-campaign';
  const AMBIENT_STEPS=3;
  const LEVEL_THRESHOLDS={2:30,3:70,4:120,5:180,6:250,7:330,8:420,9:520,10:630};
  const forceSpell={Growth:{name:'Thorn Bloom',damage:24,cooldown:1},Ember:{name:'Cinder Burst',damage:32,cooldown:2},Flow:{name:'Tide Lash',damage:26,cooldown:1},Stone:{name:'Stone Breaker',damage:29,cooldown:2},Gale:{name:'Razor Gust',damage:23,cooldown:1},Aether:{name:'Rift Pulse',damage:35,cooldown:3}};
  const modifierBonus=force=>({Growth:2,Ember:5,Flow:3,Stone:4,Gale:4,Aether:5}[force]||2);
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const key=(r,c)=>`${r},${c}`;
  const $=id=>document.getElementById(id);

  function defaultProgress(){
    const level=cfg.levelFloor,xp=LEVEL_THRESHOLDS[level]||0,maxHp=100+(level-1)*15;
    return {version:1,zone:cfg.zone-1,level,xp,maxHp,hp:maxHp,potion:1,spells:[{id:'ember-bolt',name:'Ember Bolt',force:'Ember',damage:20,cooldown:0,fallback:true}]};
  }
  let saved=defaultProgress();
  try{saved={...saved,...JSON.parse(localStorage.getItem(SAVE_KEY)||'{}')};}catch{}
  if(saved.level<cfg.levelFloor){saved.level=cfg.levelFloor;saved.xp=LEVEL_THRESHOLDS[cfg.levelFloor]||saved.xp;saved.maxHp=100+(cfg.levelFloor-1)*15;saved.hp=saved.maxHp;}
  const state={
    row:cfg.start.row,col:cfg.start.col,prevRow:cfg.start.row,prevCol:cfg.start.col,
    level:clamp(saved.level,cfg.levelFloor,cfg.levelCap),xp:saved.xp||0,maxHp:saved.maxHp||100,hp:Math.min(saved.hp||saved.maxHp,saved.maxHp),potion:saved.potion??1,
    spells:Array.isArray(saved.spells)&&saved.spells.length?saved.spells:[{id:'ember-bolt',name:'Ember Bolt',force:'Ember',damage:20,cooldown:0,fallback:true}],
    danger:0,steps:0,nextAmbient:AMBIENT_STEPS,mobKills:0,eliteKills:0,bossKilled:false,bossUnlocked:false,zoneCleared:false,gameOver:false,combat:null,
    spawnBlock:0,steadySteps:0,quietHarvest:false,spawnTimers:[],spawnSerial:0,
    spellIngredients:[],potionIngredients:[],introComplete:false,enchantmentUsed:false
  };
  state.maxHp=Math.max(state.maxHp,100+(state.level-1)*15);state.hp=Math.min(state.hp,state.maxHp);

  const root=document.getElementById('campaignRoot');
  root.innerHTML=`<div class="campaign-app">
    <header class="titlebar"><div><div class="eyebrow">CAMPAIGN SYSTEM TEST</div><h1>HAJJEN V4-B — ${cfg.name}</h1></div><div class="build">V4-B 1.0 · ${cfg.cols}×${cfg.rows}</div></header>
    <aside class="side left-side">
      <section class="panel"><h2>QUESTS / MÅL</h2><div class="quest intro"><i>✦</i><div><strong>${cfg.introQuest}</strong><small id="introQuest">NOT COMPLETE</small></div></div><div class="quest"><i>☠</i><div><strong>Cull the Wilds</strong><small id="mobQuest">Mobs: 0 / 4</small></div></div><div class="quest"><i>⚔</i><div><strong>Break the Guardians</strong><small id="eliteQuest">Elites: 0 / 2</small></div></div><div class="quest"><i>♛</i><div><strong>${cfg.bossTitle}</strong><small id="bossQuest">Boss: LOCKED</small></div></div></section>
      <section class="panel"><h2>MANIPULATION · 4 CARDS</h2><div id="manipCards"></div></section>
    </aside>
    <main class="main"><div class="board-topline"><span>${cfg.name} — ${cfg.cols}×${cfg.rows}</span><span>VIEWPORT ${cfg.viewCols}×${cfg.viewRows} · WORLD MOVES</span></div><div id="viewport" class="viewport"><div id="world" class="world"><div id="player" class="player">S</div></div><div id="toastArea" class="toast-area"></div></div><div class="legend">✿ Spell ingredient · ⚗ Potion ingredient · ☠ Mob · ⚔ Elite · ♛ Boss · ➜ Exit</div></main>
    <aside class="side right-side">
      <section class="panel"><h2>SHARKAN</h2><div class="metric"><span>Level</span><strong id="levelText"></strong></div><div>HP <strong id="hpText"></strong><div class="bar hp"><i id="hpFill"></i></div></div><div>XP <strong id="xpText"></strong><div class="bar xp"><i id="xpFill"></i></div></div><div>Danger <strong id="dangerText"></strong><div class="bar dangerbar"><i id="dangerFill"></i></div></div><div id="dangerState" class="danger-state">CALM</div></section>
      <section class="panel tile-info"><h2>TILE INFO</h2><h3 id="tileTitle">OPEN GROUND</h3><div id="tileSub">Move freely.</div><p id="tileDesc">WASD / arrows or click an adjacent tile.</p></section>
      <section class="panel"><h2>EVENT LOG</h2><div id="eventLog" class="event-log"></div></section>
    </aside>
    <section class="bottom">
      <section class="panel"><h2>SPELLBOOK · 3 CRAFTED + EMBER BOLT</h2><div id="spellGrid" class="spell-grid"></div><div class="buttons"><button id="craftSpellBtn">CREATE SPELL</button><button id="usePotionBtn">USE POTION</button></div><div class="resources" id="spellResources"></div></section>
      <section class="panel"><h2>${cfg.zone===2?'POTION CRAFTING':'ZONE SYSTEM'}</h2><div id="zoneSystem"></div></section>
      <section class="panel"><h2>CAMERA / PRESSURE</h2><div class="metric"><span>Visible</span><strong id="visibleText"></strong></div><div class="metric"><span>Next Danger</span><strong id="clockText"></strong></div><div class="metric"><span>Enemy power</span><strong id="powerText"></strong></div><div class="buttons"><button id="resetBtn">RESET CAMPAIGN</button></div></section>
    </section>
    <footer class="footer">ZONE ${cfg.zone} LEVEL CAP: ${cfg.levelCap} · TACTICAL REMOVED · ENCHANTMENTS ${cfg.zone<3?'LOCKED':'INTRODUCED'}</footer>
  </div>
  <div id="combatModal" class="modal"><div class="modal-card"><div class="eyebrow" id="combatTier">ENCOUNTER</div><h2 id="combatTitle">ENEMY</h2><div class="combat-stats"><div>ENEMY HP <strong id="enemyHpText"></strong><div class="bar dangerbar"><i id="enemyHpFill"></i></div></div><div>SHARKAN HP <strong id="combatHpText"></strong><div class="bar hp"><i id="combatHpFill"></i></div></div></div><div id="combatMessage" class="combat-message">Choose a spell.</div><div id="combatSpells" class="combat-spells"></div><div class="combat-footer"><button id="fleeBtn">FLEE</button></div></div></div>`;

  const world=$('world'),viewport=$('viewport'),player=$('player');
  world.style.width=`${(cfg.cols/cfg.viewCols)*100}%`;world.style.height=`${(cfg.rows/cfg.viewRows)*100}%`;world.style.gridTemplateColumns=`repeat(${cfg.cols},1fr)`;world.style.gridTemplateRows=`repeat(${cfg.rows},1fr)`;
  player.style.width=`${(1/cfg.cols)*72}%`;

  const entities=new Map(),tiles=[];
  const add=(r,c,data)=>entities.set(key(r,c),{...data,r,c});
  cfg.enemies.forEach(e=>add(e.row,e.col,{type:e.type,mark:e.type==='mob'?'☠':e.type==='elite'?'⚔':'♛',title:e.title,baseHp:e.hp,baseAttack:e.attack,xp:e.xp}));
  (cfg.spellIngredients||[]).forEach(e=>add(e.row,e.col,{type:'ingredient',mark:'✿',title:e.name.toUpperCase(),name:e.name,force:e.force}));
  (cfg.potionIngredients||[]).forEach(e=>add(e.row,e.col,{type:'potion-ingredient',mark:'⚗',title:e.name.toUpperCase(),name:e.name}));
  if(cfg.zone===3&&cfg.enchantment)add(4,8,{type:'enchantment',mark:cfg.enchantment.mark||'✦',title:cfg.enchantment.name.toUpperCase()});

  function buildWorld(){
    for(let r=0;r<cfg.rows;r++)for(let c=0;c<cfg.cols;c++){
      const t=document.createElement('div');t.className='tile';t.dataset.r=r;t.dataset.c=c;t.addEventListener('mouseenter',()=>showTile(r,c));t.addEventListener('click',()=>{showTile(r,c);if(adjacent(r,c))moveTo(r,c);});world.insertBefore(t,player);tiles.push(t);
    }
  }
  function tileAt(r,c){return tiles[r*cfg.cols+c];}
  function adjacent(r,c){return Math.abs(r-state.row)+Math.abs(c-state.col)===1;}
  function camera(){return {left:clamp(state.col-7,0,Math.max(0,cfg.cols-cfg.viewCols)),top:clamp(state.row-4,0,Math.max(0,cfg.rows-cfg.viewRows))};}
  function positionWorld(){
    const cam=camera(),tileW=viewport.clientWidth/cfg.viewCols,tileH=viewport.clientHeight/cfg.viewRows;world.style.transform=`translate(${-cam.left*tileW}px,${-cam.top*tileH}px)`;
    player.style.left=`${((state.col+.5)/cfg.cols)*100}%`;player.style.top=`${((state.row+.5)/cfg.rows)*100}%`;
    $('visibleText').textContent=`C ${cam.left+1}–${cam.left+cfg.viewCols} · R ${cam.top+1}–${cam.top+cfg.viewRows}`;
  }
  function renderBoard(){
    tiles.forEach((t,i)=>{const r=Math.floor(i/cfg.cols),c=i%cfg.cols,e=entities.get(key(r,c));t.className='tile';t.removeAttribute('data-mark');if(e&&!e.completed){t.classList.add('special',e.type);t.dataset.mark=e.mark||'?';}if(adjacent(r,c)&&!state.combat&&!state.gameOver)t.classList.add('reachable');if(r===state.row&&c===state.col)t.classList.add('current');});positionWorld();
  }
  function showTile(r,c){
    const e=entities.get(key(r,c));if(!e||e.completed){$('tileTitle').textContent='OPEN GROUND';$('tileSub').textContent=`Row ${r+1}, Column ${c+1}`;$('tileDesc').textContent=state.zoneCleared?'Zone cleared. Explore freely.':'Move here if adjacent.';return;}
    $('tileTitle').textContent=e.title;$('tileSub').textContent=e.type.replace('-',' ').toUpperCase();
    if(e.type==='mob'||e.type==='elite')$('tileDesc').textContent=`Base ${e.baseHp} HP / ${e.baseAttack} damage. Enemy power +${enemyPowerBonus()}%.`;
    else if(e.type==='boss')$('tileDesc').textContent=state.bossUnlocked?'Boss ready.':'Defeat 4 mobs and both elites first.';
    else if(e.type==='portal')$('tileDesc').textContent=cfg.next?'Step here to continue to the next zone.':'Campaign prototype complete.';
    else if(e.type==='enchantment')$('tileDesc').textContent='Collect Empowered I to unlock the Zone 3 Enchantment introduction.';
    else $('tileDesc').textContent=state.zoneCleared?'Collect freely.':'Collecting adds +1 Danger unless Quiet Harvest is active.';
  }

  function moveTo(r,c){
    if(state.combat||state.gameOver||!adjacent(r,c)||r<0||c<0||r>=cfg.rows||c>=cfg.cols)return;
    const target=entities.get(key(r,c));if(target?.type==='boss'&&!state.bossUnlocked){toast('BOSS LOCKED','danger');return;}
    state.prevRow=state.row;state.prevCol=state.col;state.row=r;state.col=c;state.steps++;
    if(!state.zoneCleared)advanceDanger();renderAll();resolveTile();if(!state.zoneCleared&&!state.combat)maybeAggro();if(!state.zoneCleared)maybeSpawn();
  }
  function moveBy(dr,dc){const r=state.row+dr,c=state.col+dc;if(r<0||c<0||r>=cfg.rows||c>=cfg.cols)return;moveTo(r,c);}
  window.addEventListener('keydown',e=>{if(state.combat||state.gameOver)return;const map={ArrowUp:[-1,0],w:[-1,0],W:[-1,0],ArrowDown:[1,0],s:[1,0],S:[1,0],ArrowLeft:[0,-1],a:[0,-1],A:[0,-1],ArrowRight:[0,1],d:[0,1],D:[0,1]};if(map[e.key]){e.preventDefault();moveBy(...map[e.key]);}});
  window.addEventListener('resize',positionWorld);

  function resolveTile(){
    const e=entities.get(key(state.row,state.col));if(!e||e.completed)return;
    if(e.type==='ingredient'){e.completed=true;state.spellIngredients.push({name:e.name,force:e.force});harvestDanger();toast(`${e.name.toUpperCase()} COLLECTED`,'reward');log(`Collected ${e.name} (${e.force}).`,'reward');renderAll();return;}
    if(e.type==='potion-ingredient'){e.completed=true;state.potionIngredients.push(e.name);harvestDanger();toast(`${e.name.toUpperCase()} COLLECTED`,'reward');log(`Collected potion ingredient ${e.name}.`,'reward');renderAll();return;}
    if(e.type==='enchantment'){e.completed=true;state.hasEnchantment=true;toast(`${cfg.enchantment.name.toUpperCase()} FOUND`,'reward');log(`${cfg.enchantment.name} is ready to apply.`,'reward');renderAll();return;}
    if(e.type==='portal'){if(cfg.next){saveCampaign();location.href=cfg.next;}else toast('ZONES 1–3 COMPLETE','reward');return;}
    if(['mob','elite','boss'].includes(e.type))startCombat(e);
  }
  function harvestDanger(){if(state.zoneCleared)return;if(state.quietHarvest){state.quietHarvest=false;log('Quiet Harvest prevented harvest Danger.','reward');return;}changeDanger(1,'harvesting');}
  function advanceDanger(){if(state.steadySteps>0){state.steadySteps--;return;}state.nextAmbient--;if(state.nextAmbient<=0){state.nextAmbient=AMBIENT_STEPS;changeDanger(1,'movement');}}
  function changeDanger(amount,why){if(state.zoneCleared&&amount>0)return;const old=state.danger;state.danger=clamp(state.danger+amount,0,20);if(old!==state.danger)log(`Danger ${amount>0?'+':''}${amount} (${why}) → ${state.danger}/20.`,'danger');}
  function dangerTier(){return state.danger>=20?'critical':state.danger>=15?'hostile':state.danger>=10?'dangerous':state.danger>=5?'uneasy':'calm';}
  function enemyScale(){return {calm:1,uneasy:1.1,dangerous:1.2,hostile:1.35,critical:1.5}[dangerTier()];}
  function enemyPowerBonus(){return Math.round((enemyScale()-1)*100);}
  function spawnChance(){return {calm:0,uneasy:.15,dangerous:.30,hostile:.45,critical:.65}[dangerTier()];}
  function maybeSpawn(){if(state.danger<5||Math.random()>spawnChance()||state.combat)return;if(state.spawnBlock){state.spawnBlock--;toast('SPAWN BLOCKED','reward');return;}const spots=[];for(let r=0;r<cfg.rows;r++)for(let c=0;c<cfg.cols;c++){if(entities.has(key(r,c))||(r===state.row&&c===state.col))continue;const d=Math.max(Math.abs(r-state.row),Math.abs(c-state.col));if(d>=2&&d<=5)spots.push({r,c});}if(!spots.length)return;const s=spots[Math.floor(Math.random()*spots.length)];state.spawnSerial++;add(s.r,s.c,{type:'mob',mark:'☠',title:`ROUSED MOB ${state.spawnSerial}`,baseHp:cfg.zone===2?96:158,baseAttack:cfg.zone===2?14:20,xp:cfg.zone===2?18:28,spawned:true});toast('NEW MOB SPAWNED','danger');renderBoard();}
  function maybeAggro(){if(state.danger<10)return;for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const e=entities.get(key(state.row+dr,state.col+dc));if(e&&!e.completed&&(e.type==='mob'||e.type==='elite')){toast('ADJACENT AGGRO','danger');startCombat(e,true);return;}}}

  function spellDamage(s){return s.damage+(state.level-1)*4+(s.enchantDamage||0);}
  function cooldown(s){return Math.max(0,(s.cooldown||0)-(s.cooldownReduction||0));}
  function startCombat(e,fromAggro=false){
    if(state.combat||state.zoneCleared)return;const scale=enemyScale(),maxHp=Math.round(e.baseHp*scale),attack=Math.round(e.baseAttack*scale);state.combat={entity:e,maxHp,hp:maxHp,attack,cooldowns:{}};$('combatTier').textContent=e.type==='boss'?'BOSS':e.type==='elite'?'ELITE':'MOB';$('combatTitle').textContent=e.title;$('combatMessage').textContent=`Enemy power +${enemyPowerBonus()}%. Choose a spell.`;$('fleeBtn').disabled=e.type!=='mob';$('combatModal').classList.add('show');renderCombat();log(`${e.title} engaged${fromAggro?' from adjacent aggro':''}.`,'danger');
  }
  function renderCombat(){const c=state.combat;if(!c)return;$('enemyHpText').textContent=`${c.hp} / ${c.maxHp}`;$('enemyHpFill').style.width=`${Math.max(0,c.hp/c.maxHp*100)}%`;$('combatHpText').textContent=`${state.hp} / ${state.maxHp}`;$('combatHpFill').style.width=`${state.hp/state.maxHp*100}%`;const wrap=$('combatSpells');wrap.innerHTML='';state.spells.forEach(s=>{const remain=c.cooldowns[s.id]||0,b=document.createElement('button');b.disabled=remain>0;b.innerHTML=`${s.name}<small>${spellDamage(s)} damage · CD ${cooldown(s)}${remain?` · ${remain} casts remaining`:''}</small>`;b.addEventListener('click',()=>cast(s));wrap.appendChild(b);});}
  function cast(s){const c=state.combat;if(!c||(c.cooldowns[s.id]||0)>0)return;Object.keys(c.cooldowns).forEach(id=>{if(id!==s.id&&c.cooldowns[id]>0)c.cooldowns[id]--;});const cd=cooldown(s);if(cd)c.cooldowns[s.id]=cd;const dmg=spellDamage(s);c.hp-=dmg;$('combatMessage').textContent=`${s.name} deals ${dmg}.`;if(c.hp<=0){winCombat();return;}state.hp=Math.max(0,state.hp-c.attack);$('combatMessage').textContent+=` ${c.entity.title} hits back for ${c.attack}.`;renderCombat();renderStatus();if(state.hp<=0)defeat();}
  function winCombat(){const e=state.combat.entity;e.completed=true;$('combatModal').classList.remove('show');state.combat=null;if(e.type==='mob'){state.mobKills++;changeDanger(2,'mob defeated');}if(e.type==='elite'){state.eliteKills++;changeDanger(2,'elite defeated');}if(e.type==='boss')state.bossKilled=true;gainXp(e.xp||0);toast(`${e.title} DEFEATED`,'reward');log(`${e.title} defeated.`,'reward');updateQuests();if(e.type==='boss'){clearZone();return;}renderAll();}
  function defeat(){$('combatModal').classList.remove('show');state.combat=null;state.gameOver=true;toast('SHARKAN DEFEATED','danger');log('Sharkan was defeated. Reset the campaign to retry.','danger');renderAll();}
  $('fleeBtn').addEventListener('click',()=>{if(!state.combat||state.combat.entity.type!=='mob')return;$('combatModal').classList.remove('show');state.combat=null;state.row=state.prevRow;state.col=state.prevCol;changeDanger(1,'fled combat');renderAll();});

  function gainXp(amount){state.xp+=amount;let leveled=false;while(state.level<cfg.levelCap&&state.xp>=(LEVEL_THRESHOLDS[state.level+1]||Infinity)){state.level++;state.maxHp+=15;state.hp=state.maxHp;leveled=true;toast(`LEVEL ${state.level}!`,'reward');log(`Level up → ${state.level}.`,'reward');}if(leveled)renderSpells();}
  function renderStatus(){
    $('levelText').textContent=`${state.level} / ${cfg.levelCap}`;$('hpText').textContent=`${state.hp} / ${state.maxHp}`;$('hpFill').style.width=`${state.hp/state.maxHp*100}%`;
    const prev=LEVEL_THRESHOLDS[state.level]||0,next=LEVEL_THRESHOLDS[state.level+1]||prev,pct=state.level>=cfg.levelCap?100:clamp((state.xp-prev)/(next-prev)*100,0,100);$('xpText').textContent=state.level>=cfg.levelCap?`${state.xp} XP · ZONE CAP`:`${state.xp-prev} / ${next-prev}`;$('xpFill').style.width=`${pct}%`;
    $('dangerText').textContent=`${state.danger} / 20`;$('dangerFill').style.width=`${state.danger*5}%`;$('dangerState').textContent=state.zoneCleared?'CLEARED':dangerTier().toUpperCase();$('clockText').textContent=state.zoneCleared?'SAFE':state.steadySteps?`${state.steadySteps} protected`:`${state.nextAmbient} steps`;$('powerText').textContent=state.zoneCleared?'+0%':`+${enemyPowerBonus()}%`;
  }
  function updateQuests(){const was=state.bossUnlocked;state.bossUnlocked=state.mobKills>=4&&state.eliteKills>=2;$('mobQuest').textContent=`Mobs: ${Math.min(state.mobKills,4)} / 4`;$('eliteQuest').textContent=`Elites: ${Math.min(state.eliteKills,2)} / 2`;$('bossQuest').textContent=state.bossKilled?'Boss: DEFEATED':state.bossUnlocked?'Boss: READY':'Boss: LOCKED';$('introQuest').textContent=state.introComplete?'COMPLETE':'NOT COMPLETE';if(state.bossUnlocked&&!was)toast('BOSS UNLOCKED','reward');}
  function clearZone(){state.zoneCleared=true;state.danger=0;[...entities.entries()].forEach(([k,e])=>{if(['mob','elite','boss'].includes(e.type))entities.delete(k);});add(cfg.bossPos.row,cfg.bossPos.col,{type:'portal',mark:'➜',title:cfg.next?'NEXT ZONE PORTAL':'CAMPAIGN EXIT'});saveCampaign();renderAll();toast(`${cfg.name} CLEARED`,'reward');log('Zone cleared. All enemy pressure is gone; explore freely before leaving.','reward');}

  function renderSpells(){const grid=$('spellGrid');grid.innerHTML='';state.spells.forEach(s=>{const d=document.createElement('div');d.className='spell';d.innerHTML=`<strong>${s.name}</strong><span>${s.force} · ${spellDamage(s)} damage · CD ${cooldown(s)}${s.fallback?' · FALLBACK':''}</span><span>${s.enchantmentName||'No extra effect.'}</span>`;grid.appendChild(d);});$('spellResources').textContent=`Spell ingredients: ${state.spellIngredients.length?state.spellIngredients.map(i=>`${i.name} (${i.force})`).join(' · '):'None'}`;$('craftSpellBtn').disabled=state.spellIngredients.length<2||state.spells.filter(s=>!s.fallback).length>=3||state.gameOver;}
  function craftSpell(){if(state.spellIngredients.length<2||state.spells.filter(s=>!s.fallback).length>=3)return;const first=state.spellIngredients.shift(),second=state.spellIngredients.shift(),base=forceSpell[first.force];state.spells.push({id:`crafted-${Date.now()}`,name:base.name,force:first.force,damage:base.damage+modifierBonus(second.force),cooldown:base.cooldown});toast(`${base.name.toUpperCase()} CREATED`,'reward');log(`${base.name} created. Cooldown ${base.cooldown}.`,'reward');renderAll();}
  $('craftSpellBtn').addEventListener('click',craftSpell);
  $('usePotionBtn').addEventListener('click',()=>{if(state.potion<1||state.hp>=state.maxHp||state.combat)return;const heal=Math.min(30,state.maxHp-state.hp);state.potion--;state.hp+=heal;toast(`+${heal} HP`,'reward');renderAll();});

  function renderZoneSystem(){
    const z=$('zoneSystem');
    if(cfg.zone===2){z.innerHTML=`<p class="resources">Potion ingredients: <strong>${state.potionIngredients.length?state.potionIngredients.join(' + '):'None'}</strong></p><div class="buttons"><button id="craftPotionBtn" ${state.potionIngredients.length<2?'disabled':''}>CREATE HEALING POTION</button></div><p class="resources">Introduction quest only — no XP reward.</p>`;$('craftPotionBtn')?.addEventListener('click',()=>{if(state.potionIngredients.length<2)return;state.potionIngredients.splice(0,2);state.potion++;state.introComplete=true;toast('HEALING POTION CREATED','reward');log('Zone 2 introduction complete: Healing Potion crafted.','reward');renderAll();});
    }else{
      const eligible=state.spells.filter(s=>!s.fallback),has=!!state.hasEnchantment&&!state.enchantmentUsed;
      z.innerHTML=`<div class="enchant-box"><strong>${cfg.enchantment.name}</strong><span class="resources">+${cfg.enchantment.damage} damage. Fixed bonus; the spell still scales normally with Sharkan level.</span><select id="enchantTarget">${eligible.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select><button id="applyEnchantBtn" ${!has||!eligible.length?'disabled':''}>APPLY ENCHANTMENT</button><span class="resources">${state.enchantmentUsed?'Applied.':state.hasEnchantment?'Card collected — choose a crafted spell.':'Find the ✦ Enchantment card in the zone.'}</span></div>`;
      $('applyEnchantBtn')?.addEventListener('click',()=>{const id=$('enchantTarget')?.value,s=state.spells.find(x=>x.id===id);if(!s||!state.hasEnchantment||state.enchantmentUsed)return;s.enchantDamage=(s.enchantDamage||0)+cfg.enchantment.damage;s.enchantmentName=`${cfg.enchantment.name} · +${cfg.enchantment.damage} damage`;state.enchantmentUsed=true;state.introComplete=true;toast(`${cfg.enchantment.name.toUpperCase()} APPLIED`,'reward');log(`${cfg.enchantment.name} applied to ${s.name}.`,'reward');renderAll();});
    }
  }

  const manip=[
    {name:'Calm Waters',text:'Reduce Danger by 3.',use:()=>{if(state.zoneCleared)return false;changeDanger(-3,'Calm Waters');return true;}},
    {name:'Ward Sigil',text:'Block the next mob spawn.',use:()=>{if(state.zoneCleared)return false;state.spawnBlock++;return true;}},
    {name:'Steady Nerves',text:'Next 3 moves do not advance ambient Danger.',use:()=>{if(state.zoneCleared)return false;state.steadySteps=3;return true;}},
    {name:'Quiet Harvest',text:'Next collected ingredient adds no Danger.',use:()=>{if(state.zoneCleared)return false;state.quietHarvest=true;return true;}}
  ].map(c=>({...c,used:false}));
  function renderManip(){const w=$('manipCards');w.innerHTML='';manip.forEach(c=>{const d=document.createElement('div');d.className='card';d.innerHTML=`<strong>${c.name}</strong><span>${c.text}</span><button ${c.used||state.zoneCleared?'disabled':''}>${c.used?'USED':'PLAY'}</button>`;d.querySelector('button').addEventListener('click',()=>{if(c.used)return;if(c.use()){c.used=true;toast(`${c.name.toUpperCase()} PLAYED`,'reward');renderAll();}});w.appendChild(d);});}

  function saveCampaign(){localStorage.setItem(SAVE_KEY,JSON.stringify({version:1,zone:cfg.zone,level:state.level,xp:state.xp,maxHp:state.maxHp,hp:state.hp,potion:state.potion,spells:state.spells}));}
  function log(text,type='system'){const e=document.createElement('div');e.className=`event ${type}`;e.textContent=text;$('eventLog').prepend(e);while($('eventLog').children.length>9)$('eventLog').lastChild.remove();}
  function toast(text,type='system'){const t=document.createElement('div');t.className=`toast ${type}`;t.textContent=text;$('toastArea').prepend(t);setTimeout(()=>t.remove(),1700);}
  function renderAll(){renderBoard();renderStatus();renderSpells();renderZoneSystem();renderManip();updateQuests();$('usePotionBtn').textContent=`USE POTION · ${state.potion} LEFT`;$('usePotionBtn').disabled=state.potion<1||state.hp>=state.maxHp||state.combat||state.gameOver;}
  $('resetBtn').addEventListener('click',()=>{localStorage.removeItem(SAVE_KEY);location.href='index.html';});

  buildWorld();renderAll();log(`${cfg.name} started. Level cap ${cfg.levelCap}.`,'reward');if(cfg.zone===2)log('Introduction: collect Moonleaf + Clearwater and create a Healing Potion. No XP reward.','system');else log('Introduction: find Empowered I and apply it to a crafted spell.','system');toast(`${cfg.name} · LEVEL CAP ${cfg.levelCap}`,'reward');
})();
