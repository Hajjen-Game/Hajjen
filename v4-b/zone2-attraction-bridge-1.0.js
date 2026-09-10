(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG;
  if(!cfg||cfg.zone!==2||window.HAJJEN_ZONE2_ATTRACTION_BRIDGE)return;

  const source=cfg.combatAttraction||{};
  window.HAJJEN_ZONE2_ATTRACTION_RULES={
    enabled:source.enabled!==false,
    radius:Number(source.radius)||3,
    chance:{...(source.chance||{})}
  };

  window.HAJJEN_ZONE2_ATTRACTION_BRIDGE={version:'1.0'};
})();
