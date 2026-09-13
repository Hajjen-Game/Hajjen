/* HAJJEN Zone 4 — stronger run-local Enchantments.
   Descriptions are upgraded before the Zone 4 Enchantment hand is created.
   Runtime deltas sit on top of the proven shared combat values, so Zones 1–3
   keep their existing Enchantment balance untouched. */
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  if(!cfg||cfg.zone!==4||!Array.isArray(cfg.enchantmentDeck))return;

  const textById={
    'empowered':'Enchanted spell deals +12 damage.',
    'lifebound':'Casting the spell restores 10 HP.',
    'fortified':'After casting, reduce the next enemy hit by 12.',
    'quickening':'First cast of this spell each combat deals +18 damage.',
    'echoing':'Every second cast of this spell deals +14 additional damage.',
    'siphoning':'When this spell defeats an enemy, restore 20 HP.',
    'focused':'Spell gains +3 damage for each player level above 1.',
    'primal-surge':'Spell deals +18 damage while Danger is 15+.',
    'stabilized':"Spell's defensive/healing secondary effect is increased by 100%.",
    'finisher':'Spell deals +18 damage to enemies below 35% HP.'
  };
  cfg.enchantmentDeck.forEach(card=>{if(textById[card.id])card.text=textById[card.id];});

  function init(){
    const state=window.HAJJEN_CAMPAIGN_STATE;
    const combatSpells=document.getElementById('combatSpells');
    if(!state||!combatSpells||window.HAJJEN_ZONE4_ENCHANTMENT_BUFFS)return;

    const baseDamage=new WeakMap();
    const allIds=spell=>Array.isArray(spell?.enchantments)
      ?spell.enchantments.map(item=>typeof item==='string'?item:item?.id).filter(Boolean)
      :[];
    const zone4Ids=spell=>Array.isArray(spell?.enchantments)
      ?spell.enchantments.filter(item=>typeof item==='object'&&item?.sourceZone===4).map(item=>item.id).filter(Boolean)
      :[];

    function extraDamage(spell){
      const ids=zone4Ids(spell);if(!ids.length)return 0;
      const c=state.combat;let bonus=0;
      if(ids.includes('empowered'))bonus+=6;                 // 6 -> 12
      if(ids.includes('primal-surge')&&state.danger>=15)bonus+=8; // 10 -> 18
      if(c){
        const casts=Number(c.spellCastCounts?.[spell.id])||0;
        if(ids.includes('quickening')&&casts===0)bonus+=10;   // 8 -> 18
        if(ids.includes('echoing')&&(casts+1)%2===0)bonus+=6; // 8 -> 14
        if(ids.includes('finisher')&&c.maxHp>0&&c.hp/c.maxHp<.35)bonus+=8; // 10 -> 18
      }
      return bonus;
    }

    function installDamageGetter(spell){
      if(!spell||spell.__zone4BuffDamageGetter)return;
      const descriptor=Object.getOwnPropertyDescriptor(spell,'enchantDamage');
      if(descriptor&&descriptor.configurable===false)return;
      const initial=Number(spell.enchantDamage)||0;baseDamage.set(spell,initial);
      Object.defineProperty(spell,'enchantDamage',{
        configurable:true,enumerable:false,
        get(){return (baseDamage.get(spell)||0)+extraDamage(spell);},
        set(value){const n=Number(value);baseDamage.set(spell,Number.isFinite(n)?n:0);}
      });
      Object.defineProperty(spell,'__zone4BuffDamageGetter',{configurable:true,enumerable:false,value:true});
    }
    function patchSpells(){(state.spells||[]).forEach(installDamageGetter);}

    function coreSecondary(spell,id,base){
      const ids=allIds(spell);if(!ids.includes(id))return 0;
      return Math.round(base*(ids.includes('stabilized')?1.5:1));
    }
    function desiredSecondary(spell,id){
      const ids=allIds(spell);if(!ids.includes(id))return 0;
      const z4=zone4Ids(spell);
      const oldBase={lifebound:5,siphoning:10,fortified:4}[id]||0;
      const newBase={lifebound:10,siphoning:20,fortified:12}[id]||oldBase;
      const base=z4.includes(id)?newBase:oldBase;
      const factor=z4.includes('stabilized')?2:(ids.includes('stabilized')?1.5:1);
      return Math.round(base*factor);
    }

    function syncHp(){
      const hpText=document.getElementById('hpText');if(hpText)hpText.textContent=`${state.hp} / ${state.maxHp}`;
      const hpFill=document.getElementById('hpFill');if(hpFill)hpFill.style.width=`${state.maxHp?state.hp/state.maxHp*100:0}%`;
      window.HAJJEN_SHARED_STATUS?.sync?.();
    }
    function siphonRows(){
      const log=document.getElementById('eventLog');
      return [...(log?.children||[])].filter(node=>/^Siphoning restored \d+ HP\.$/.test((node.textContent||'').trim()));
    }
    function rewriteNewSiphonLog(extra,previousRows){
      if(!(extra>0))return 0;
      const previous=previousRows||new Set();
      const row=siphonRows().find(node=>!previous.has(node));
      if(!row)return 0;
      const match=(row.textContent||'').match(/(\d+)/);const core=Number(match?.[1])||0;
      const total=core+extra;
      row.textContent=`Siphoning restored ${total} HP.`;
      document.dispatchEvent(new CustomEvent('hajjen:zone4-siphoning-buffed',{detail:{zone:4,core,extra,total}}));
      return total;
    }

    combatSpells.addEventListener('click',event=>{
      const button=event.target instanceof Element?event.target.closest('button'):null;
      if(!button||button.disabled||!combatSpells.contains(button)||!state.combat)return;
      patchSpells();
      const buttons=[...combatSpells.querySelectorAll(':scope > button')];
      const index=buttons.indexOf(button),spell=(state.spells||[])[index];
      if(!spell)return;

      const c=state.combat,ids=allIds(spell),data={combat:c,spell,lifeAdded:0,desiredBlock:0,originalAttack:null,siphonExtra:0,siphonPreAdded:0,previousSiphonRows:new Set(siphonRows())};

      if(ids.includes('lifebound')){
        const desired=desiredSecondary(spell,'lifebound');
        const core=coreSecondary(spell,'lifebound',5);
        const extra=Math.max(0,desired-core);
        if(extra>0){const before=state.hp;state.hp=Math.min(state.maxHp,state.hp+extra);data.lifeAdded=state.hp-before;}
      }

      if(ids.includes('fortified')){
        const desired=desiredSecondary(spell,'fortified');
        const core=coreSecondary(spell,'fortified',4);
        const extra=Math.max(0,desired-core);
        if(extra>0){
          data.originalAttack=Number(c.attack)||0;
          data.desiredBlock=Math.min(data.originalAttack,desired);
          c.attack=Math.max(0,data.originalAttack-extra);
        }
      }

      if(ids.includes('siphoning')){
        const desired=desiredSecondary(spell,'siphoning');
        const core=coreSecondary(spell,'siphoning',10);
        data.siphonExtra=Math.max(0,desired-core);

        /* Siphoning used to apply its Zone 4 delta after winCombat(), which
           made the base +10 appear in telemetry and could let a level-up heal
           happen first. Combat is deterministic, so when the button already
           shows lethal damage we can safely apply the Zone 4 delta before the
           core +10. The fallback below still covers any unusual lethal cast. */
        const shownDamage=Number((button.textContent||'').match(/(\d+)\s*damage/i)?.[1])||0;
        if(data.siphonExtra>0&&shownDamage>0&&Number(c.hp)<=shownDamage){
          const before=state.hp;
          state.hp=Math.min(state.maxHp,state.hp+data.siphonExtra);
          data.siphonPreAdded=state.hp-before;
        }
      }
      event.__hajjenZone4EnchantBuff=data;

      if(data.siphonPreAdded>0){
        queueMicrotask(()=>{
          rewriteNewSiphonLog(data.siphonPreAdded,data.previousSiphonRows);
          syncHp();
        });
      }
    },true);

    combatSpells.addEventListener('click',event=>{
      const data=event.__hajjenZone4EnchantBuff;if(!data)return;
      const {combat,lifeAdded,desiredBlock}=data;
      if(data.originalAttack!==null)combat.attack=data.originalAttack;

      const message=document.getElementById('combatMessage');
      if(message&&lifeAdded>0){
        message.textContent=(message.textContent||'').replace(/Lifebound restores (\d+) HP\./,(_,n)=>`Lifebound restores ${Number(n)+lifeAdded} HP.`);
      }
      if(message&&desiredBlock>0){
        message.textContent=(message.textContent||'').replace(/Fortified blocks \d+\./,`Fortified blocks ${desiredBlock}.`);
      }

      if(combat.entity?.completed&&data.siphonExtra>0&&data.siphonPreAdded===0){
        const before=state.hp;state.hp=Math.min(state.maxHp,state.hp+data.siphonExtra);
        const added=state.hp-before;
        if(added>0){
          rewriteNewSiphonLog(added,data.previousSiphonRows);
          syncHp();
        }
      }
    });

    const spellGrid=document.getElementById('spellGrid');
    const observer=spellGrid?new MutationObserver(()=>queueMicrotask(patchSpells)):null;
    observer?.observe(spellGrid,{childList:true,subtree:true});
    document.addEventListener('hajjen:enchantment-applied',()=>{patchSpells();window.HAJJEN_SHARED_ACTION_BAR?.sync?.();});
    document.addEventListener('hajjen:enchantment-replaced',()=>{patchSpells();window.HAJJEN_SHARED_ACTION_BAR?.sync?.();});

    patchSpells();
    window.HAJJEN_ZONE4_ENCHANTMENT_BUFFS={
      version:'1.1-zone4-buffed-siphoning-sync',
      values:{empowered:12,lifebound:10,fortified:12,quickening:18,echoing:14,siphoning:20,focusedPerLevel:3,primalSurge:18,stabilizedPercent:100,finisher:18},
      patch:patchSpells,observer
    };
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else queueMicrotask(init);
})();
