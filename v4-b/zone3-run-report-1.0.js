(()=>{
  const cfg=window.HAJJEN_CAMPAIGN_CONFIG||window.HAJJEN_ZONE_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  if(!cfg||cfg.zone!==3||!state)return;

  const $=id=>document.getElementById(id);
  const eventLog=$('eventLog');
  const combatModal=$('combatModal');
  const toastArea=$('toastArea');
  if(!eventLog||!combatModal)return;

  const startedAt=new Date();
  const startedMs=performance.now();
  const placed={
    mobs:(cfg.enemies||[]).filter(e=>e.type==='mob').length,
    elites:(cfg.enemies||[]).filter(e=>e.type==='elite').length,
    bosses:(cfg.enemies||[]).filter(e=>e.type==='boss').length
  };

  const run={
    events:[],
    combats:[],
    currentCombat:null,
    metrics:{
      maxDanger:Number(state.danger)||0,
      spawns:0,
      aggroCombats:0,
      potionUses:0,
      potionHealing:0,
      levelUps:0,
      levelUpHealing:0,
      spellCasts:0,
      stepsToFirstCombat:null,
      secondsToFirstCombat:null,
      combatStartSteps:[],
      combatStepGaps:[],
      enchantmentsApplied:[]
    }
  };

  let serial=0;
  let lastSnapshot=null;
  let lastStep=Number(state.steps)||0;
  let lastCombatStartStep=null;

  function snapshot(){
    const c=state.combat;
    return {
      step:Number(state.steps)||0,
      row:(Number(state.row)||0)+1,
      col:(Number(state.col)||0)+1,
      hp:Number(state.hp)||0,
      maxHp:Number(state.maxHp)||0,
      level:Number(state.level)||0,
      xp:Number(state.xp)||0,
      danger:Number(state.danger)||0,
      potion:Number(state.potion)||0,
      mobKills:Number(state.mobKills)||0,
      eliteKills:Number(state.eliteKills)||0,
      bossUnlocked:!!state.bossUnlocked,
      bossKilled:!!state.bossKilled,
      zoneCleared:!!state.zoneCleared,
      gameOver:!!state.gameOver,
      introComplete:!!state.introComplete,
      spells:(state.spells||[]).map(s=>({
        id:s.id,name:s.name,force:s.force,base:Number(s.damage)||0,
        cooldown:Math.max(0,(Number(s.cooldown)||0)-(Number(s.cooldownReduction)||0)),
        fallback:!!s.fallback,enchantmentName:s.enchantmentName||'',
        enchantments:Array.isArray(s.enchantments)?s.enchantments.map(x=>typeof x==='string'?x:x?.id).filter(Boolean):[]
      })),
      combat:c?{
        title:c.entity?.title||'ENEMY',
        type:c.entity?.type||'unknown',
        spawned:!!c.entity?.spawned,
        enemyHp:Number(c.hp)||0,
        enemyMaxHp:Number(c.maxHp)||0,
        attack:Number(c.attack)||0
      }:null
    };
  }

  function stamp(s){return `Step ${s.step} | R${s.row}C${s.col} | HP ${s.hp}/${s.maxHp} | L${s.level} | D ${s.danger}/20`;}
  function record(kind,text,s=snapshot()){
    run.metrics.maxDanger=Math.max(run.metrics.maxDanger,s?.danger||0);
    run.events.push({n:++serial,kind,text,state:s});
  }

  function syncMoves(s=snapshot()){
    if(!s||s.step<=lastStep)return;
    const delta=s.step-lastStep;
    record('MOVE',delta===1?`Moved to R${s.row}C${s.col}.`:`Moved ${delta} steps; now R${s.row}C${s.col}.`,s);
    lastStep=s.step;
  }

  function startCombatRecord(s=snapshot(),fromAggro=false){
    if(!s?.combat)return;
    if(run.currentCombat&&run.currentCombat.result==='IN PROGRESS')return;

    const c={
      title:s.combat.title,type:s.combat.type,spawned:s.combat.spawned,fromAggro,
      startStep:s.step,startDanger:s.danger,startHp:s.hp,startMaxHp:s.maxHp,
      enemyMaxHp:s.combat.enemyMaxHp,enemyAttack:s.combat.attack,
      casts:[],result:'IN PROGRESS',endStep:null,endHp:null
    };
    run.combats.push(c);
    run.currentCombat=c;
    if(fromAggro)run.metrics.aggroCombats++;

    run.metrics.combatStartSteps.push(s.step);
    if(run.metrics.stepsToFirstCombat===null){
      run.metrics.stepsToFirstCombat=s.step;
      run.metrics.secondsToFirstCombat=Math.round((performance.now()-startedMs)/100)/10;
    }
    if(lastCombatStartStep!==null)run.metrics.combatStepGaps.push(Math.max(0,s.step-lastCombatStartStep));
    lastCombatStartStep=s.step;
  }

  function finalizeCombat(result,s=snapshot()){
    const c=run.currentCombat;if(!c)return;
    c.result=result;c.endStep=s?.step??state.steps;c.endHp=s?.hp??state.hp;
    run.currentCombat=null;
  }

  const nativePrepend=eventLog.prepend.bind(eventLog);
  eventLog.prepend=(...nodes)=>{
    nativePrepend(...nodes);
    nodes.forEach(node=>{
      if(!(node instanceof Element))return;
      const text=(node.textContent||'').trim();if(!text)return;
      const s=snapshot();syncMoves(s);const prev=lastSnapshot;

      if(/ engaged(?: from adjacent aggro)?\.$/i.test(text)&&s.combat){
        startCombatRecord(s,/from adjacent aggro/i.test(text));
      }
      let m=text.match(/^Healing Potion restored (\d+) HP\.$/i);
      if(m){run.metrics.potionUses++;run.metrics.potionHealing+=Number(m[1]);}
      if(/^Level up → \d+\.$/i.test(text)){
        run.metrics.levelUps++;
        if(prev)run.metrics.levelUpHealing+=Math.max(0,s.hp-prev.hp);
      }
      if(/^(.+?) defeated\.$/i.test(text)&&!/^Sharkan/i.test(text)&&run.currentCombat)finalizeCombat('WIN',s);
      if(/^Sharkan was defeated\./i.test(text)&&run.currentCombat)finalizeCombat('LOSS',s);
      if(/^Zone cleared\./i.test(text)&&run.currentCombat)finalizeCombat('WIN',s);

      record('LOG',text,s);lastSnapshot=s;
    });
  };

  if(toastArea){
    new MutationObserver(mutations=>{
      for(const mutation of mutations)for(const node of mutation.addedNodes){
        if(!(node instanceof Element))continue;
        const text=(node.textContent||'').trim();
        if(/^NEW MOB SPAWNED$/i.test(text)){
          run.metrics.spawns++;
          record('SPAWN','New mob spawned.',snapshot());
        }
      }
    }).observe(toastArea,{childList:true});
  }

  new MutationObserver(()=>{
    if(!combatModal.classList.contains('show')&&run.currentCombat){
      queueMicrotask(()=>{
        if(run.currentCombat&&!state.combat){
          finalizeCombat(state.gameOver?'LOSS':'FLED',snapshot());
        }
      });
    }
  }).observe(combatModal,{attributes:true,attributeFilter:['class']});

  document.addEventListener('click',event=>{
    if(!(event.target instanceof Element))return;
    const button=event.target.closest('#combatSpells button');
    if(!button||button.disabled||!state.combat||!run.currentCombat)return;
    const label=(button.childNodes[0]?.textContent||button.textContent||'SPELL').trim();
    const damageMatch=(button.querySelector('small')?.textContent||'').match(/(\d+) damage/i);
    const damage=damageMatch?Number(damageMatch[1]):0;
    run.currentCombat.casts.push(`${label} ${damage}`);
    run.metrics.spellCasts++;
  },true);

  document.addEventListener('hajjen:enchantment-applied',event=>{
    const detail=event.detail||{};
    queueMicrotask(()=>{
      const hand=window.HAJJEN_ZONE3_ENCHANTMENTS?.getHand?.()||[];
      const card=hand.find(x=>x.id===detail.cardId);
      const entry={
        card:card?.definition?.name||detail.cardId||'Unknown',
        spell:card?.spellName||state.spells.find(s=>s.id===detail.spellId)?.name||detail.spellId||'Unknown',
        step:Number(state.steps)||0,
        danger:Number(state.danger)||0
      };
      run.metrics.enchantmentsApplied.push(entry);
      record('ENCHANTMENT',`${entry.card} applied to ${entry.spell}.`,snapshot());
    });
  });

  function poll(){
    const s=snapshot();syncMoves(s);
    run.metrics.maxDanger=Math.max(run.metrics.maxDanger,s.danger||0);
    if(s.combat&&!run.currentCombat)startCombatRecord(s,false);
    lastSnapshot=s;
  }

  lastSnapshot=snapshot();
  record('RUN',`Zone 3 run started${window.HAJJEN_ZONE3_DEV_MODE?' in dev mode':''}.`,lastSnapshot);
  [...eventLog.children].reverse().forEach(node=>{const text=(node.textContent||'').trim();if(text)record('LOG',text,lastSnapshot);});
  const pollTimer=setInterval(poll,80);

  function resultText(s){
    if(s.zoneCleared||s.bossKilled)return'ZONE 3 CLEARED';
    if(s.gameOver){const last=run.combats[run.combats.length-1];return last?`DEFEATED BY ${last.title}`:'SHARKAN DEFEATED';}
    if(s.bossUnlocked)return`${cfg.bossTitle} UNLOCKED / RUN IN PROGRESS`;
    return'RUN IN PROGRESS';
  }
  function combatCount(type){return run.combats.filter(c=>c.type===type).length;}
  function average(values){return values.length?values.reduce((a,b)=>a+b,0)/values.length:0;}
  function fmtSeconds(value){return value===null?'No combat yet':`${value.toFixed(1)} s`;}

  function buildReport(){
    poll();
    const s=snapshot();
    const hand=window.HAJJEN_ZONE3_ENCHANTMENTS?.getHand?.()||[];
    const drawn=hand.map(x=>x.definition?.name||x.id).filter(Boolean);
    const applied=hand.filter(x=>x.appliedTo).map(x=>`${x.definition?.name||x.id} → ${x.spellName||x.appliedTo}`);
    const gaps=run.metrics.combatStepGaps;
    const firstGap=run.metrics.stepsToFirstCombat;
    const allGaps=firstGap===null?[...gaps]:[firstGap,...gaps];
    const longestGap=allGaps.length?Math.max(...allGaps):s.step;
    const avgGap=allGaps.length?average(allGaps):s.step;
    const lines=[];

    lines.push('HAJJEN V4-B — ZONE 3 RUN REPORT');
    lines.push(`Mode: ${window.HAJJEN_ZONE3_DEV_MODE?'DEV (?dev=1)':'CAMPAIGN'}`);
    lines.push(`Run started: ${startedAt.toISOString()}`);
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');
    lines.push('=== RUN SUMMARY ===');
    lines.push(`Result: ${resultText(s)}`);
    lines.push(`Map: ${cfg.cols}×${cfg.rows} (${cfg.cols*cfg.rows} tiles)`);
    lines.push(`Steps: ${s.step} | Position: R${s.row}C${s.col}`);
    lines.push(`Level: ${s.level} | XP: ${s.xp}`);
    lines.push(`HP: ${s.hp}/${s.maxHp} | Potion: ${s.potion}`);
    lines.push(`Danger: ${s.danger}/20 | Max Danger: ${run.metrics.maxDanger}/20`);
    lines.push(`Kills: ${s.mobKills} mobs | ${s.eliteKills} elites | Boss: ${s.bossKilled?'DEFEATED':s.bossUnlocked?'UNLOCKED':'LOCKED'}`);
    lines.push('');

    lines.push('=== COMBAT DENSITY / TRAVEL ===');
    lines.push(`Placed enemies: ${placed.mobs} mobs | ${placed.elites} elites | ${placed.bosses} boss`);
    lines.push(`Combats recorded: ${run.combats.length} total | ${combatCount('mob')} mobs | ${combatCount('elite')} elites | ${combatCount('boss')} boss`);
    lines.push(`Steps to first combat: ${firstGap===null?'No combat yet':firstGap}`);
    lines.push(`Time to first combat: ${fmtSeconds(run.metrics.secondsToFirstCombat)}`);
    lines.push(`Combat start steps: ${run.metrics.combatStartSteps.length?run.metrics.combatStartSteps.join(', '):'None'}`);
    lines.push(`Average steps between combat starts: ${avgGap.toFixed(1)}`);
    lines.push(`Longest no-combat gap: ${longestGap} steps`);
    lines.push(`Spawned enemies: ${run.metrics.spawns} | Spawned enemies fought: ${run.combats.filter(c=>c.spawned).length}`);
    lines.push(`Adjacent aggro combats: ${run.metrics.aggroCombats}`);
    lines.push('');

    lines.push('=== ENCHANTMENTS ===');
    lines.push(`Cards drawn: ${drawn.length?drawn.join(', '):'None detected'}`);
    lines.push(`Currently applied: ${applied.length?applied.join(' | '):'None'}`);
    lines.push(`Applications during this run: ${run.metrics.enchantmentsApplied.length?run.metrics.enchantmentsApplied.map(x=>`${x.card} → ${x.spell} at step ${x.step} (D${x.danger})`).join(' | '):'None recorded'}`);
    lines.push('');

    lines.push('=== RESOURCE / COMBAT USE ===');
    lines.push(`Potion uses: ${run.metrics.potionUses} | Potion healing: +${run.metrics.potionHealing} HP`);
    lines.push(`Level ups: ${run.metrics.levelUps} | Level-up healing: +${run.metrics.levelUpHealing} HP`);
    lines.push(`Spell casts: ${run.metrics.spellCasts}`);
    lines.push('');

    lines.push('=== CURRENT SPELLS ===');
    if(!s.spells.length)lines.push('- None');
    s.spells.forEach(spell=>lines.push(`- ${spell.name}${spell.fallback?' [fallback]':''} — ${spell.force}, base ${spell.base}, CD ${spell.cooldown}${spell.enchantmentName?` | ${spell.enchantmentName}`:''}`));
    lines.push('');

    lines.push('=== COMBAT BREAKDOWN ===');
    if(!run.combats.length)lines.push('No combats recorded.');
    run.combats.forEach((c,i)=>{
      lines.push(`${i+1}. ${c.title} [${c.type}${c.spawned?' / spawned':''}${c.fromAggro?' / aggro':''}] — ${c.result}`);
      lines.push(`   Start: Step ${c.startStep} | HP ${c.startHp}/${c.startMaxHp} | Danger ${c.startDanger}/20 | Enemy ${c.enemyMaxHp} HP / ${c.enemyAttack} attack`);
      lines.push(`   Casts: ${c.casts.length?c.casts.join(' → '):'None recorded'}`);
      lines.push(`   End: Step ${c.endStep??s.step} | HP ${c.endHp??s.hp}`);
    });
    lines.push('');

    lines.push('=== FULL RUN EVENT LOG ===');
    run.events.forEach(e=>lines.push(`${String(e.n).padStart(3,'0')} [${e.kind}] ${e.text} | ${stamp(e.state)}`));
    return lines.join('\n');
  }

  window.HAJJEN_V4B_ZONE3_RUN_REPORT={
    getText:buildReport,
    data:run,
    stop:()=>clearInterval(pollTimer)
  };
})();
