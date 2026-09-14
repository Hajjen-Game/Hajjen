/* HAJJEN Zone 4 DEV — simulate permanent Zone 1–3 RPG progression.
   Adds a representative legacy loadout without overwriting newer Zone 4 gear.
   The migration runs once per permanent profile. */
(()=>{
  if(window.HAJJEN_ZONE4_LEGACY_LOADOUT)return;
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const state=window.HAJJEN_CAMPAIGN_STATE;
  const rpg=window.HAJJEN_RPG_STATE;
  if(Number(cfg?.zone)!==4||!state||!rpg?.getProfile||!rpg?.updateProfile)return;

  const ITEMS=[
    {id:'legacy-z23-armor',name:'Weathered Tide Vest',slot:'armor',rank:1,origin:'Zones 1–3',stats:{power:0,vitality:3,resolve:1},flavor:'Reliable expedition armor improved across the first three zones.'},
    {id:'legacy-z2-charm',name:'Primal Focus Charm',slot:'charm',rank:1,origin:'Zone 2',stats:{power:3,vitality:0,resolve:0},flavor:'A simple focus charm carried since Enchantments were first learned.'},
    {id:'legacy-z3-relic',name:'Resonant Shard',slot:'relic',rank:1,origin:'Zone 3',stats:{power:2,vitality:0,resolve:2},flavor:'A stable primal fragment recovered during the third expedition.'},
    {id:'legacy-z23-tool',name:"Explorer's Field Kit",slot:'tool',rank:1,origin:'Zones 1–3',stats:{power:1,vitality:0,resolve:1},flavor:'A practical field kit refined through three zones of exploration.'}
  ];
  const STARTING_SECURED_ESSENCE=60;
  const clone=v=>JSON.parse(JSON.stringify(v));

  function apply(){
    const current=rpg.getProfile();
    if(!current||current.meta?.zone3LegacyLoadoutSeeded)return false;
    const changed=rpg.updateProfile(profile=>{
      profile.inventory=Array.isArray(profile.inventory)?profile.inventory:[];
      profile.equipment=profile.equipment||{};
      profile.currencies=profile.currencies||{};
      profile.meta=profile.meta||{};
      ITEMS.forEach(item=>{
        let owned=profile.inventory.find(entry=>entry?.id===item.id);
        if(!owned){owned=clone(item);profile.inventory.push(owned);}
        if(!profile.equipment[item.slot])profile.equipment[item.slot]=clone(owned);
      });
      profile.currencies.securedEssence=Math.max(STARTING_SECURED_ESSENCE,Math.max(0,Number(profile.currencies.securedEssence)||0));
      profile.meta.zone3LegacyLoadoutSeeded=true;
      profile.meta.zone3LegacyLoadoutVersion=1;
      return profile;
    },'zone1-3-legacy-loadout-seed');
    if(changed){
      window.HAJJEN_ZONE4_RPG_STATS_RUNTIME?.sync?.();
      window.HAJJEN_ZONE4_RPG_BACKPACK_ISOLATED?.render?.();
    }
    return changed;
  }

  apply();
  window.HAJJEN_ZONE4_LEGACY_LOADOUT={version:'1.0-zone1-3-baseline',items:ITEMS.map(clone),startingSecuredEssence:STARTING_SECURED_ESSENCE,apply};
})();
