/* HAJJEN Zone 4 run report — balance/debug telemetry for the new dev zone. */
(()=>{
  const cfg=window.HAJJEN_CAMPAIGN_CONFIG||window.HAJJEN_ZONE_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  if(!cfg||cfg.zone!==4||!state)return;

  const eventLog=document.getElementById('eventLog');
  const combatModal=document.getElementById('combatModal');
  const toastArea=document.getElementById('toastArea');
  if(!eventLog||!combatModal)return;

  const startedAt=new Date();
  const startedMs=performance.now();
  const placed={
    mobs:(cfg.enemies||[]).filter(e=>e.type==='mob').length,
    elites:(cfg.enemies||[]).filter(e=>e.type==='elite').length,
    bosses:(cfg.enemies||[]).filter(e=>e.type==='boss').length
  };
  const run={
    events:[],combats:[],currentCombat:null,
    metrics:{maxDanger:Number(state.danger)||0,spawns:0,potionUses:0,potionHealing:0,levelUps:0,spellCasts:0,stepsToFirstCombat:null,secondsToFirstCombat:null,tacticalUses:[],enchantmentsApplied:[]}
  };
  let serial=0,lastStep=Number(state.steps)||0,lastLevel=Number(state.level)||0,lastPotion=Number(state.potion)||0;

  function snapshot(){
    const c=state.combat;
    return {
      step:Number(state.steps)||0,row:(Number(state.row)||0)+1,col:(Number(state.col)||0)+1,
      hp:Number(state.hp)||0,maxHp:Number(state.maxHp)||0,level:Number(state.level)||0,xp:Number(state.xp)||0,
      danger:Number(state.danger)||0,potion:Number(state.potion)||0,mobKills:Number(state.mobKills)||0,eliteKills:Number(state.eliteKills)||0,
      bossUnlocked:!!state.bossUnlocked,bossKilled:!!state.bossKilled,zoneCleared:!!state.zoneCleared,gameOver:!!state.gameOver,introComplete:!!state.introComplete,
      combat:c?{title:c.entity?.title||'ENEMY',type:c.entity?.type||'unknown',spawned:!!c.entity?.spawned,enemyHp:Number(c.hp)||0,enemyMaxHp:Number(c.maxHp)||0,attack:Number(c.attack)||0}:null
    };
  }
  function record(kind,text,s=snapshot()){
    run.metrics.maxDanger=Math.max(run.metrics.maxDanger,s.danger||0);
    const item={n:++serial,kind,text,state:s};run.events.push(item);return item;
  }
  function syncMovement(s=snapshot()){
    if(s.step<=lastStep)return;
    const delta=s.step-lastStep;record('MOVE',delta===1?`Moved to R${s.row}C${s.col}.`:`Moved ${delta} steps; now R${s.row}C${s.col}.`,s);lastStep=s.step;
  }
  function startCombat(s=snapshot()){
    if(!s.combat||run.currentCombat)return;
    const combat={title:s.combat.title,type:s.combat.type,spawned:s.combat.spawned,startStep:s.step,startDanger:s.danger,startHp:s.hp,enemyMaxHp:s.combat.enemyMaxHp,enemyAttack:s.combat.attack,casts:[],result:'IN PROGRESS'};
    run.combats.push(combat);run.currentCombat=combat;
    if(run.metrics.stepsToFirstCombat===null){run.metrics.stepsToFirstCombat=s.step;run.metrics.secondsToFirstCombat=Math.round((performance.now()-startedMs)/100)/10;}
  }
  function finishCombat(result,s=snapshot()){
    if(!run.currentCombat)return;
    Object.assign(run.currentCombat,{result,endStep:s.step,endHp:s.hp});run.currentCombat=null;
  }

  const nativePrepend=eventLog.prepend.bind(eventLog);
  eventLog.prepend=(...nodes)=>{
    nativePrepend(...nodes);
    for(const node of nodes){
      if(!(node instanceof Element))continue;
      const text=(node.textContent||'').trim();if(!text)continue;
      const s=snapshot();syncMovement(s);
      if(/ engaged(?: from adjacent aggro)?\.$/i.test(text)&&s.combat)startCombat(s);
      if(/^(.+?) defeated\.$/i.test(text)&&!/^Sharkan/i.test(text))finishCombat('WIN',s);
      if(/^Sharkan was defeated\./i.test(text))finishCombat('LOSS',s);
      const potion=text.match(/^Healing Potion restored (\d+) HP\.$/i);
      if(potion){run.metrics.potionUses++;run.metrics.potionHealing+=Number(potion[1])||0;}
      if(/^Level up → \d+\.$/i.test(text))run.metrics.levelUps++;
      record('LOG',text,s);
    }
  };

  document.addEventListener('click',event=>{
    const button=event.target instanceof Element?event.target.closest('#combatSpells button'):null;
    if(!button||button.disabled||!state.combat||!run.currentCombat)return;
    const name=(button.childNodes[0]?.textContent||button.textContent||'SPELL').trim();
    const damage=Number((button.querySelector('small')?.textContent||'').match(/(\d+) damage/i)?.[1])||0;
    run.currentCombat.casts.push(`${name} ${damage}`);run.metrics.spellCasts++;
  },true);

  document.addEventListener('hajjen:tactical-used',event=>{
    const detail=event.detail||{};
    if(Number(detail.zone)!==4)return;
    const item={name:detail.name||detail.key||'Tactical',step:Number(state.steps)||0,danger:Number(state.danger)||0};
    run.metrics.tacticalUses.push(item);record('TACTICAL',`${item.name} used.`,snapshot());
  });
  document.addEventListener('hajjen:enchantment-applied',event=>{
    const detail=event.detail||{};if(Number(detail.zone)!==4)return;
    queueMicrotask(()=>{
      const hand=window.HAJJEN_ZONE4_ENCHANTMENTS?.getHand?.()||[];
      const card=hand.find(item=>item.id===detail.cardId);
      const item={card:card?.definition?.name||detail.cardId||'Unknown',spell:card?.spellName||detail.spellId||'Unknown',step:Number(state.steps)||0};
      run.metrics.enchantmentsApplied.push(item);record('ENCHANTMENT',`${item.card} applied to ${item.spell}.`,snapshot());
    });
  });

  if(toastArea)new MutationObserver(mutations=>{
    for(const mutation of mutations)for(const node of mutation.addedNodes){
      if(node instanceof Element&&/^NEW MOB SPAWNED$/i.test((node.textContent||'').trim())){run.metrics.spawns++;record('SPAWN','New mob spawned.',snapshot());}
    }
  }).observe(toastArea,{childList:true});

  new MutationObserver(()=>{
    if(!combatModal.classList.contains('show')&&run.currentCombat)queueMicrotask(()=>{if(run.currentCombat&&!state.combat)finishCombat(state.gameOver?'LOSS':'FLED',snapshot());});
  }).observe(combatModal,{attributes:true,attributeFilter:['class']});

  function poll(){
    const s=snapshot();syncMovement(s);run.metrics.maxDanger=Math.max(run.metrics.maxDanger,s.danger);
    if(s.combat&&!run.currentCombat)startCombat(s);
    if(s.level>lastLevel){run.metrics.levelUps+=s.level-lastLevel;lastLevel=s.level;}
    if(s.potion<lastPotion)lastPotion=s.potion;else if(s.potion>lastPotion)lastPotion=s.potion;
  }
  const pollTimer=setInterval(poll,100);
  record('RUN',`Zone 4 run started${window.HAJJEN_ZONE4_DEV_MODE?' in dev mode':''}.`,snapshot());

  const combatCount=type=>run.combats.filter(c=>c.type===type).length;
  function resultText(s){
    if(s.zoneCleared||s.bossKilled)return'ZONE 4 CLEARED';
    if(s.gameOver){const last=run.combats[run.combats.length-1];return last?`DEFEATED BY ${last.title}`:'SHARKAN DEFEATED';}
    if(s.bossUnlocked)return`${cfg.bossTitle} UNLOCKED / RUN IN PROGRESS`;
    return'RUN IN PROGRESS';
  }
  function buildReport(){
    poll();const s=snapshot();
    const ench=window.HAJJEN_ZONE4_ENCHANTMENTS?.getHand?.()||[];
    const lines=[];
    lines.push('HAJJEN V4-B — ZONE 4 RUN REPORT');
    lines.push(`Mode: ${window.HAJJEN_ZONE4_DEV_MODE?'DEV (?dev=1)':'CAMPAIGN'}`);
    lines.push(`Run started: ${startedAt.toISOString()}`);lines.push(`Generated: ${new Date().toISOString()}`);lines.push('');
    lines.push('=== RUN SUMMARY ===');
    lines.push(`Result: ${resultText(s)}`);
    lines.push(`Map: ${cfg.cols}×${cfg.rows} (${cfg.cols*cfg.rows} tiles)`);
    lines.push(`Steps: ${s.step} | Position: R${s.row}C${s.col}`);
    lines.push(`Level: ${s.level} | XP: ${s.xp}`);
    lines.push(`HP: ${s.hp}/${s.maxHp} | Potion: ${s.potion}`);
    lines.push(`Danger: ${s.danger}/20 | Max Danger: ${run.metrics.maxDanger}/20`);
    lines.push(`Kills: ${s.mobKills} mobs | ${s.eliteKills} elites | Boss: ${s.bossKilled?'DEFEATED':s.bossUnlocked?'UNLOCKED':'LOCKED'}`);lines.push('');
    lines.push('=== COMBAT / TRAVEL ===');
    lines.push(`Placed enemies: ${placed.mobs} mobs | ${placed.elites} elites | ${placed.bosses} boss`);
    lines.push(`Combats recorded: ${run.combats.length} total | ${combatCount('mob')} mobs | ${combatCount('elite')} elites | ${combatCount('boss')} boss`);
    lines.push(`Ambient spawns observed: ${run.metrics.spawns}`);
    lines.push(`First combat: ${run.metrics.stepsToFirstCombat===null?'none':`${run.metrics.stepsToFirstCombat} steps / ${run.metrics.secondsToFirstCombat.toFixed(1)} s`}`);lines.push('');
    lines.push('=== FULL HAND ===');
    lines.push(`Tactical used: ${run.metrics.tacticalUses.length}/2${run.metrics.tacticalUses.length?` · ${run.metrics.tacticalUses.map(item=>item.name).join(' + ')}`:''}`);
    lines.push(`Enchantments drawn: ${ench.map(item=>item.definition?.name||item.id).join(' + ')||'none'}`);
    lines.push(`Enchantments applied: ${run.metrics.enchantmentsApplied.length}${run.metrics.enchantmentsApplied.length?` · ${run.metrics.enchantmentsApplied.map(item=>`${item.card} → ${item.spell}`).join(' | ')}`:''}`);
    lines.push(`Spell casts: ${run.metrics.spellCasts}`);lines.push(`Potion uses: ${run.metrics.potionUses} | Healing recorded: ${run.metrics.potionHealing}`);lines.push('');
    lines.push('=== LOADED SPELLS ===');
    (state.spells||[]).forEach((spell,index)=>lines.push(`${index+1}. ${spell.name} | ${spell.force} | Base ${Number(spell.damage)||0} | CD ${Math.max(0,Number(spell.cooldown)||0)}${spell.enchantmentName?` | ${spell.enchantmentName}`:''}`));
    lines.push('');lines.push('=== COMBATS ===');
    if(!run.combats.length)lines.push('None.');
    run.combats.forEach((c,index)=>lines.push(`${index+1}. ${c.title} [${c.type}] | ${c.result} | step ${c.startStep}${c.endStep!=null?`→${c.endStep}`:''} | enemy ${c.enemyMaxHp} HP / ${c.enemyAttack} ATK | Sharkan ${c.startHp}→${c.endHp??'?'} | casts: ${c.casts.join(', ')||'none'}`));
    lines.push('');lines.push('=== EVENT LOG ===');
    run.events.slice(-80).forEach(item=>lines.push(`#${item.n} [${item.kind}] Step ${item.state.step} R${item.state.row}C${item.state.col} | HP ${item.state.hp}/${item.state.maxHp} | L${item.state.level} | D${item.state.danger}/20 | ${item.text}`));
    return lines.join('\n');
  }

  window.HAJJEN_V4B_ZONE4_RUN_REPORT={version:'1.0',run,getText:buildReport,snapshot,stop(){clearInterval(pollTimer);}};
})();
