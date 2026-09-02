window.HAJJEN_ZONE_CONFIG={
  zone:3,name:'ZONE 3',cols:25,rows:10,viewCols:15,viewRows:10,start:{row:5,col:1},levelFloor:7,levelCap:10,next:null,
  introQuest:'Apply an Enchantment',introType:'enchantment',bossTitle:'ZONE 3 BOSS',bossPos:{row:4,col:23},
  mobTarget:7,eliteTarget:2,bossLevelTarget:10,requireIntroForBoss:true,
  enemies:[
    {row:5,col:4,type:'mob',title:'RIFT WHELP',hp:150,attack:19,xp:30},
    {row:2,col:6,type:'mob',title:'STONE WRAITH',hp:154,attack:19,xp:30},
    {row:8,col:7,type:'mob',title:'GALE STALKER',hp:158,attack:20,xp:31},
    {row:4,col:9,type:'mob',title:'AETHER HUNTER',hp:162,attack:20,xp:31},
    {row:2,col:14,type:'mob',title:'PRIMAL WRAITH',hp:166,attack:21,xp:32},
    {row:8,col:15,type:'mob',title:'RIFT PROWLER',hp:170,attack:21,xp:32},
    {row:4,col:17,type:'mob',title:'VOID STALKER',hp:174,attack:21,xp:32},
    {row:6,col:19,type:'mob',title:'STONE REAVER',hp:178,attack:22,xp:33},
    {row:1,col:22,type:'mob',title:'GALE REAVER',hp:182,attack:22,xp:33},
    {row:8,col:22,type:'mob',title:'RIFT HUNTER',hp:186,attack:23,xp:34},
    {row:5,col:11,type:'elite',title:'PRIMAL SENTINEL',hp:265,attack:27,xp:50},
    {row:5,col:20,type:'elite',title:'RIFT GUARDIAN',hp:280,attack:28,xp:52},
    {row:4,col:23,type:'boss',title:'ZONE 3 BOSS',hp:390,attack:32,xp:100}
  ],
  spring:{row:5,col:13,heal:45,title:'PRIMAL SPRING'},
  spellIngredients:[
    {row:1,col:4,name:'Thorn Core',force:'Growth'},
    {row:8,col:9,name:'Cinder Heart',force:'Ember'},
    {row:1,col:16,name:'Tide Crystal',force:'Flow'},
    {row:8,col:23,name:'Moon Rift',force:'Aether'}
  ],
  potionIngredients:[],
  manipulationCards:['Veiled Passage','Misdirection','Safe Window','Pressure Break'],
  combatAttraction:{enabled:true,radius:2,chance:{calm:0,uneasy:.30,dangerous:.45,hostile:.60,critical:.75}},
  enchantment:{worldPickup:false,draw:2,mark:'✦'},
  enchantmentDeck:[
    {id:'empowered',name:'Empowered',text:'Enchanted spell deals +6 damage.'},
    {id:'lifebound',name:'Lifebound',text:'Casting the spell restores 5 HP.'},
    {id:'fortified',name:'Fortified',text:'After casting, reduce the next enemy hit by 4.'},
    {id:'quickening',name:'Quickening',text:'First cast of this spell each combat deals +8 damage.'},
    {id:'echoing',name:'Echoing',text:'Every second cast of this spell deals +8 additional damage.'},
    {id:'siphoning',name:'Siphoning',text:'When this spell defeats an enemy, restore 10 HP.'},
    {id:'focused',name:'Focused',text:'Spell gains +3 damage for each player level above 1.'},
    {id:'primal-surge',name:'Primal Surge',text:'Spell deals +10 damage while Danger is 15+.'},
    {id:'stabilized',name:'Stabilized',text:"Spell's defensive/healing secondary effect is increased by 50%."},
    {id:'finisher',name:'Finisher',text:'Spell deals +10 damage to enemies below 35% HP.'}
  ]
};

(()=>{
  const ui=window.HAJJEN_SHARED_UI_CONFIG?.zones?.[3];
  if(!ui)return;
  const mobObjective=(ui.objectives||[]).find(item=>item.kind==='mob');
  if(mobObjective)mobObjective.target=7;
  const goal=(ui.help||[]).find(section=>section.title==='ZONE 3 GOAL');
  if(goal)goal.items=[
    'Apply one of your two drawn Enchantments to a crafted spell.',
    'Defeat 7 normal mobs, both Guardians, and reach Level 10 to unlock the Zone 3 boss.',
    'Zone 3 contains 10 fixed normal mobs on the same 25×10 world size as Zone 2. Three mobs are optional, so route choice still matters.'
  ];
  const danger=(ui.help||[]).find(section=>section.title==='DANGER');
  if(danger)danger.items=[
    'Movement, harvesting and combat continue to raise Danger.',
    'Higher Danger increases spawn pressure, enemy power and adjacent aggro.',
    'From Danger 5 onward, combat can attract a nearby existing normal mob into a chained fight.'
  ];
  if(!(ui.help||[]).some(section=>section.title==='ZONE 3 MANIPULATION')){
    ui.help.splice(2,0,{title:'ZONE 3 MANIPULATION',items:[
      'Veiled Passage suppresses adjacent aggro for 3 movement steps.',
      'Misdirection moves one nearby normal mob 2 tiles farther away.',
      'Safe Window prevents ambient spawns for 3 movement steps.',
      'Pressure Break reduces Danger by 2 and blocks the next combat-attraction check.'
    ]});
  }
})();
