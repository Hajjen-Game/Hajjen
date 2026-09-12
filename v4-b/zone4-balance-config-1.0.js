/* HAJJEN Zone 4 balance layer: larger Manipulation pool + Zone 4 Enchantment values. */
(()=>{
  const cfg=window.HAJJEN_ZONE_CONFIG;
  if(!cfg||cfg.zone!==4)return;

  cfg.manipulationCards=['Calm Waters','Ward Sigil','Steady Nerves','Smoke Trail'];
  cfg.manipulationRewardDeck=[
    {id:'calm-waters',name:'Calm Waters',text:'Reduce Danger by 3.'},
    {id:'ward-sigil',name:'Ward Sigil',text:'Block the next enemy spawn.'},
    {id:'steady-nerves',name:'Steady Nerves',text:'Next 3 movement steps do not advance ambient Danger.'},
    {id:'smoke-trail',name:'Smoke Trail',text:'Next 3 movement steps, Hunting enemies can move only every second step.'},
    {id:'false-trail',name:'False Trail',text:'The next Hunting enemy that would pursue Sharkan loses the trail instead.'},
    {id:'veiled-passage',name:'Veiled Passage',text:'Next 3 movement steps, nearby enemies cannot trigger adjacent aggro.'},
    {id:'fresh-tracks',name:'Fresh Tracks',text:'Reset the ambient Danger countdown to 3 movement steps.'},
    {id:'safe-window',name:'Safe Window',text:'No ambient enemy can spawn during the next 3 movement steps.'},
    {id:'misdirection',name:'Misdirection',text:'Choose one nearby normal mob and move it 2 tiles away from Sharkan.'},
    {id:'pressure-break',name:'Pressure Break',text:'Reduce Danger by 2 and prevent the next adjacent-aggro check.'}
  ];

  cfg.enchantmentDeck=[
    {id:'empowered',name:'Empowered',text:'Enchanted spell deals +12 damage.'},
    {id:'lifebound',name:'Lifebound',text:'Casting the spell restores 10 HP.'},
    {id:'fortified',name:'Fortified',text:'After casting, reduce the next enemy hit by 12.'},
    {id:'quickening',name:'Quickening',text:'First cast of this spell each combat deals +18 damage.'},
    {id:'echoing',name:'Echoing',text:'Every second cast of this spell deals +14 additional damage.'},
    {id:'siphoning',name:'Siphoning',text:'When this spell defeats an enemy, restore 20 HP.'},
    {id:'focused',name:'Focused',text:'Spell gains +3 damage for each player level above 1.'},
    {id:'primal-surge',name:'Primal Surge',text:'Spell deals +18 damage while Danger is 15+.'},
    {id:'stabilized',name:'Stabilized',text:"Spell's defensive/healing secondary effect is increased by 100%."},
    {id:'finisher',name:'Finisher',text:'Spell deals +18 damage to enemies below 35% HP.'}
  ];

  const ui=window.HAJJEN_SHARED_UI_CONFIG?.zones?.[4];
  if(ui){
    const goal=(ui.help||[]).find(section=>section.title==='ZONE 4 GOAL');
    if(goal&&!goal.items.some(item=>/10-card Manipulation/i.test(item)))goal.items.splice(1,0,'Card Reward can draw from a 10-card Manipulation pool.');
    const power=(ui.help||[]).find(section=>section.title==='ZONE 4 POWER STEP');
    if(power&&!power.items.some(item=>/Enchantments are strengthened/i.test(item)))power.items.splice(2,0,'Zone 4 Enchantments are strengthened for the higher enemy HP and attack values.');
  }
})();
