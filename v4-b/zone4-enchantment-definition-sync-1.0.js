/* Sync late-loaded Zone 4 balance copy into the live Enchantment/Card Reward APIs. */
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG||window.HAJJEN_CAMPAIGN_CONFIG;
  const enchantments=window.HAJJEN_ZONE4_ENCHANTMENTS||window.HAJJEN_ENCHANTMENTS;
  const reward=window.HAJJEN_ZONE4_CARD_REWARD_TEST;
  if(!cfg||cfg.zone!==4||!Array.isArray(cfg.enchantmentDeck))return;

  if(Array.isArray(enchantments?.deck)){
    cfg.enchantmentDeck.forEach(def=>{
      const live=enchantments.deck.find(card=>card?.id===def.id);
      if(live)Object.assign(live,def);
    });
    enchantments.sync?.();
  }

  if(reward?.decks)reward.decks.enchantment=cfg.enchantmentDeck.map(card=>({...card}));
  window.HAJJEN_SHARED_HAND?.sync?.();
  window.HAJJEN_HAND_LIST_PRODUCTION?.render?.();
})();
