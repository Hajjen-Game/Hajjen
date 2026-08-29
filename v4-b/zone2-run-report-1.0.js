(()=>{
  const cfg=window.HAJJEN_CAMPAIGN_CONFIG||window.HAJJEN_ZONE_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  if(!cfg||cfg.zone!==2||!state)return;

  const $=id=>document.getElementById(id);
  const eventLog=$('eventLog');
  const combatModal=$('combatModal');
  const combatMessage=$('combatMessage');
  const toastArea=$('toastArea');
  const utility=document.querySelector('.utility-hud');
  if(!eventLog||!combatModal||!combatMessage||!utility)return;

  let copyBtn=$('copyZone2RunReportBtn');
  if(!copyBtn){
    copyBtn=document.createElement('button');
    copyBtn.id='copyZone2RunReportBtn';
    copyBtn.type='button';
    copyBtn.textContent='COPY RUN REPORT';
    const reset=$('resetBtn');
    utility.insertBefore(copyBtn,reset||null);
  }

  const startedAt=new Date();
  const run={
    events:[],combats:[],currentCombat:null,bossUnlockedSnapshot:null,bossEntrySnapshot:null,introCompleteSnapshot:null,
    metrics:{maxDanger:state.danger||0,spawns:0,aggroCombats:0,potionUses:0,potionHealing:0,potionsCrafted:0,levelUps:0,levelUpHealing:0,enemyDamage:0,effectiveDamageTaken:0,spellCasts:0,manipulation:[]}
  };
  let eventSerial=0;
  let lastStep=state.steps||0;
  let lastSnapshot=null;
  let lastCombatMessage='';
  let lastBossUnlocked=!!state.bossUnlocked;
  let lastIntroComplete=!!state.introComplete;

  function snapshot(){
    const c=state.combat;
    return {
      step:state.steps,row:state.row+1,col:state.col+1,hp:state.hp,maxHp:state.maxHp,level:state.level,xp:state.xp,danger:state.danger,potion:state.potion,
      mobKills:state.mobKills,eliteKills:state.eliteKills,bossUnlocked:state.bossUnlocked,bossKilled:state.bossKilled,zoneCleared:state.zoneCleared,gameOver:state.gameOver,introComplete:state.introComplete,
      spellIngredients:(state.spellIngredients||[]).map(i=>({...i})),potionIngredients:[...(state.potionIngredients||[])],
      spells:(state.spells||[]).map(s=>({name:s.name,force:s.force,base:s.damage,cd:Math.max(0,(s.cooldown||0)-(s.cooldownReduction||0)),fallback:!!s.fallback,enchantDamage:s.enchantDamage||0,enchantmentName:s.enchantmentName||''})),
      combat:c?{title:c.entity?.title||'ENEMY',type:c.entity?.type||'unknown',spawned:!!c.entity?.spawned,enemyHp:c.hp,enemyMaxHp:c.maxHp,attack:c.attack}:null
    };
  }

  function stateStamp(s){return s?`Step ${s.step} | HP ${s.hp}/${s.maxHp} | L${s.level} | D ${s.danger}/20 | Pos R${s.row}C${s.col}`:'';}
  function record(kind,text,s=snapshot()){
    run.metrics.maxDanger=Math.max(run.metrics.maxDanger,s?.danger||0);
    run.events.push({n:++eventSerial,kind,text,state:s});
  }
  function syncMoves(s=snapshot()){
    if(!s||s.step<=lastStep)return;
    const delta=s.step-lastStep;
    record('MOVE',delta===1?`Moved to row ${s.row}, column ${s.col}.`:`Moved ${delta} steps; now row ${s.row}, column ${s.col}.`,s);
    lastStep=s.step;
  }

  function startCombatRecord(s,fromAggro=false){
    if(!s?.combat)return;
    if(run.currentCombat&&run.currentCombat.result==='IN PROGRESS')return;
    const c={title:s.combat.title,type:s.combat.type,spawned:s.combat.spawned,fromAggro,startHp:s.hp,startMaxHp:s.maxHp,startDanger:s.danger,enemyMaxHp:s.combat.enemyMaxHp,enemyAttack:s.combat.attack,casts:[],damageTaken:0,enemyDamage:0,lastPlayerHp:s.hp,endHpBeforeRewards:null,result:'IN PROGRESS'};
    run.combats.push(c);run.currentCombat=c;
    if(fromAggro)run.metrics.aggroCombats++;
    if(c.type==='boss'&&!run.bossEntrySnapshot)run.bossEntrySnapshot=s;
  }

  function finalizeCombat(result,s=snapshot()){
    const c=run.currentCombat;if(!c)return;
    c.result=result;c.endHpBeforeRewards=result==='LOSS'?0:(c.lastPlayerHp??s?.hp??null);run.currentCombat=null;
  }

  function processCombatMessage(){
    const text=(combatMessage.textContent||'').trim();
    if(!text||text===lastCombatMessage)return;
    lastCombatMessage=text;
    const s=snapshot();
    if(s?.combat&&!run.currentCombat)startCombatRecord(s,false);
    const c=run.currentCombat;

    let m=text.match(/^(.+?) deals (\d+)\.(?: (.+?) hits back for (\d+)\.)?$/i);
    if(m&&c){
      const spell=m[1],damage=Number(m[2]);
      c.casts.push(`${spell} ${damage}`);run.metrics.spellCasts++;
      if(m[4]){
        const raw=Number(m[4]);
        const effective=Math.max(0,(c.lastPlayerHp??s.hp)-s.hp);
        c.enemyDamage+=raw;c.damageTaken+=effective;run.metrics.enemyDamage+=raw;run.metrics.effectiveDamageTaken+=effective;
      }
      c.lastPlayerHp=s.hp;
      record('COMBAT',text,s);
      lastSnapshot=s;
      return;
    }
    if(/^Healing Potion restores \d+ HP\. Choose a spell\.$/i.test(text)&&c){
      c.lastPlayerHp=s.hp;record('COMBAT',text,s);lastSnapshot=s;
    }
  }

  const nativePrepend=eventLog.prepend.bind(eventLog);
  eventLog.prepend=(...nodes)=>{
    nativePrepend(...nodes);
    nodes.forEach(node=>{
      if(!(node instanceof Element))return;
      const text=(node.textContent||'').trim();if(!text)return;
      const s=snapshot();syncMoves(s);const prev=lastSnapshot;

      const engaged=text.match(/^(.+?) engaged(?: from adjacent aggro)?\.$/i);
      if(engaged&&s?.combat)startCombatRecord(s,/from adjacent aggro/i.test(text));

      let m=text.match(/^Healing Potion restored (\d+) HP\.$/i);
      if(m){run.metrics.potionUses++;run.metrics.potionHealing+=Number(m[1]);if(run.currentCombat)run.currentCombat.lastPlayerHp=s.hp;}
      if(/^Zone 2 introduction complete: Healing Potion crafted\.$/i.test(text))run.metrics.potionsCrafted++;
      if(/^Level up → \d+\.$/i.test(text)){
        run.metrics.levelUps++;
        if(prev&&s)run.metrics.levelUpHealing+=Math.max(0,s.hp-prev.hp);
      }
      if(/^(.+?) defeated\.$/i.test(text)&&!/^Sharkan/i.test(text)&&run.currentCombat)finalizeCombat('WIN',s);
      if(/^Sharkan was defeated\./i.test(text)&&run.currentCombat)finalizeCombat('LOSS',s);
      if(/^Zone cleared\./i.test(text)&&run.currentCombat)finalizeCombat('WIN',s);

      record('LOG',text,s);lastSnapshot=s;
    });
  };

  new MutationObserver(processCombatMessage).observe(combatMessage,{childList:true,subtree:true,characterData:true});
  new MutationObserver(()=>{
    if(!combatModal.classList.contains('show')&&run.currentCombat){
      queueMicrotask(()=>{if(run.currentCombat&&!state.combat&&!state.gameOver)finalizeCombat('FLED');});
    }
  }).observe(combatModal,{attributes:true,attributeFilter:['class']});

  if(toastArea){
    new MutationObserver(mutations=>{
      for(const mutation of mutations)for(const node of mutation.addedNodes){
        if(!(node instanceof Element))continue;
        const text=(node.textContent||'').trim();
        if(/^NEW MOB SPAWNED$/i.test(text)){run.metrics.spawns++;record('SPAWN','New mob spawned.',snapshot());}
      }
    }).observe(toastArea,{childList:true});
  }

  document.addEventListener('click',e=>{
    const btn=e.target instanceof Element?e.target.closest('#manipCards button'):null;
    if(!btn||btn.disabled)return;
    const name=btn.closest('.card,.mini-card')?.querySelector('strong')?.textContent?.trim();
    if(name&&!run.metrics.manipulation.includes(name))run.metrics.manipulation.push(name);
  },true);

  function poll(){
    const s=snapshot();syncMoves(s);run.metrics.maxDanger=Math.max(run.metrics.maxDanger,s.danger||0);
    if(s.combat&&!run.currentCombat)startCombatRecord(s,false);
    if(s.bossUnlocked&&!lastBossUnlocked&&!run.bossUnlockedSnapshot)run.bossUnlockedSnapshot=s;
    if(s.introComplete&&!lastIntroComplete&&!run.introCompleteSnapshot)run.introCompleteSnapshot=s;
    lastBossUnlocked=!!s.bossUnlocked;lastIntroComplete=!!s.introComplete;lastSnapshot=s;
  }

  lastSnapshot=snapshot();
  record('RUN','Zone 2 run started.',lastSnapshot);
  [...eventLog.children].reverse().forEach(node=>{const text=(node.textContent||'').trim();if(text)record('LOG',text,lastSnapshot);});
  const pollTimer=setInterval(poll,80);

  function spellLine(s,level){const current=s.base+(level-1)*4+(s.enchantDamage||0);return `${s.name}${s.fallback?' [fallback]':''} — ${s.force}, base ${s.base}, current ${current}, CD ${s.cd}${s.enchantDamage?` | ${s.enchantmentName||`+${s.enchantDamage}`}`:''}`;}
  function resultText(s){
    if(s?.zoneCleared||s?.bossKilled)return'ZONE 2 CLEARED';
    if(s?.gameOver){const last=run.combats[run.combats.length-1];return last?`DEFEATED BY ${last.title}`:'SHARKAN DEFEATED';}
    if(run.bossEntrySnapshot)return`${cfg.bossTitle} ENGAGED / RUN IN PROGRESS`;
    if(s?.bossUnlocked)return`${cfg.bossTitle} UNLOCKED / NOT YET ENGAGED`;
    return'RUN IN PROGRESS';
  }
  const combatCount=type=>run.combats.filter(c=>c.type===type).length;

  function buildReport(){
    poll();const s=snapshot()||lastSnapshot;const crafted=(s.spells||[]).filter(x=>!x.fallback);const totalHealing=run.metrics.potionHealing+run.metrics.levelUpHealing;const lines=[];
    lines.push('HAJJEN V4-B — ZONE 2 RUN REPORT');
    lines.push(`Run started: ${startedAt.toISOString()}`);lines.push(`Generated: ${new Date().toISOString()}`);lines.push('');
    lines.push('=== RUN SUMMARY ===');
    lines.push(`Result: ${resultText(s)}`);lines.push(`Steps: ${s.step}`);lines.push(`Level: ${s.level} | XP: ${s.xp}`);lines.push(`HP: ${s.hp} / ${s.maxHp}`);
    lines.push(`Danger: ${s.danger} / 20 | Max Danger: ${run.metrics.maxDanger} / 20`);
    lines.push(`Potion: ${run.metrics.potionUses} used | ${s.potion} remaining | +${run.metrics.potionHealing} HP | ${run.metrics.potionsCrafted} crafted in Zone 2`);
    lines.push(`Potion introduction: ${s.introComplete?'COMPLETE':'NOT COMPLETE'}`);
    lines.push(`Level-up healing: +${run.metrics.levelUpHealing} HP across ${run.metrics.levelUps} level-up(s)`);lines.push(`Total recorded healing: +${totalHealing} HP`);
    lines.push(`Enemy damage (raw): ${run.metrics.enemyDamage} | Effective HP lost to attacks: ${run.metrics.effectiveDamageTaken}`);
    lines.push(`Combats: ${run.combats.length} total | ${combatCount('mob')} mobs | ${combatCount('elite')} elites | ${combatCount('boss')} boss`);
    lines.push(`Spawned enemies fought: ${run.combats.filter(c=>c.spawned).length} | Enemies spawned: ${run.metrics.spawns} | Adjacent aggro fights: ${run.metrics.aggroCombats}`);
    lines.push(`Spell casts: ${run.metrics.spellCasts}`);lines.push(`Manipulation played: ${run.metrics.manipulation.length?run.metrics.manipulation.join(', '):'None'}`);
    lines.push(`Crafted spells carried/current: ${crafted.length?crafted.map(x=>x.name).join(', '):'None'}`);
    lines.push(`Backpack spell ingredients: ${s.spellIngredients.length?s.spellIngredients.map(i=>`${i.name} (${i.force})`).join(', '):'None'}`);
    lines.push(`Backpack potion ingredients: ${s.potionIngredients.length?s.potionIngredients.join(', '):'None'}`);lines.push('');
    lines.push('=== BOSS READINESS ===');
    lines.push(run.bossUnlockedSnapshot?`${cfg.bossTitle} unlocked at: ${stateStamp(run.bossUnlockedSnapshot)} | Potion ${run.bossUnlockedSnapshot.potion}`:`${cfg.bossTitle} was not unlocked.`);
    lines.push(run.bossEntrySnapshot?`${cfg.bossTitle} entered at: ${stateStamp(run.bossEntrySnapshot)} | Potion ${run.bossEntrySnapshot.potion}`:`${cfg.bossTitle} was not entered.`);
    if(run.bossEntrySnapshot){const bs=run.bossEntrySnapshot.spells.filter(x=>!x.fallback);lines.push(`Spells at ${cfg.bossTitle}: ${bs.length?bs.map(x=>spellLine(x,run.bossEntrySnapshot.level)).join(' | '):'No crafted spells'}`);}lines.push('');
    lines.push('=== CURRENT SPELLS ===');(s.spells||[]).forEach(x=>lines.push(`- ${spellLine(x,s.level)}`));if(!(s.spells||[]).length)lines.push('- None');lines.push('');
    lines.push('=== COMBAT BREAKDOWN ===');if(!run.combats.length)lines.push('No combats recorded.');
    run.combats.forEach((c,i)=>{lines.push(`${i+1}. ${c.title} [${c.type}${c.spawned?' / spawned':''}${c.fromAggro?' / aggro':''}] — ${c.result}`);lines.push(`   Start: HP ${c.startHp}/${c.startMaxHp}, Danger ${c.startDanger}/20 | Enemy ${c.enemyMaxHp} HP / ${c.enemyAttack} attack`);lines.push(`   Casts: ${c.casts.length?c.casts.join(' → '):'None recorded'}`);lines.push(`   Damage taken: ${c.damageTaken} effective (${c.enemyDamage} raw) | HP before rewards: ${c.endHpBeforeRewards??c.lastPlayerHp}`);});
    lines.push('');lines.push('=== FULL RUN EVENT LOG ===');run.events.forEach(e=>lines.push(`${String(e.n).padStart(3,'0')} | ${e.kind.padEnd(6,' ')} | ${stateStamp(e.state)} | ${e.text}`));return lines.join('\n');
  }

  async function copyReport(){
    const text=buildReport();let copied=false;
    try{await navigator.clipboard.writeText(text);copied=true;}catch{}
    if(!copied){const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{copied=document.execCommand('copy');}catch{}ta.remove();}
    copyBtn.textContent=copied?'RUN REPORT COPIED':'COPY FAILED — TAP AGAIN';setTimeout(()=>{copyBtn.textContent='COPY RUN REPORT';},1800);
  }
  copyBtn.addEventListener('click',copyReport);
  window.HAJJEN_V4B_ZONE2_RUN_REPORT={getText:buildReport,data:run,stop:()=>clearInterval(pollTimer)};
})();
