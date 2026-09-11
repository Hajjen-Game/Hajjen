window.HAJJEN_ZONE_CONFIG={
  zone:4,name:'ZONE 4',cols:25,rows:10,viewCols:15,viewRows:10,start:{row:5,col:1},levelFloor:10,levelCap:13,next:null,
  introQuest:'Use Both Tactical Cards',introType:'tactical-pair',bossTitle:'ZONE 4 BOSS',bossPos:{row:4,col:23},
  mobTarget:7,eliteTarget:2,bossLevelTarget:13,requireIntroForBoss:true,
  enemies:[
    {row:5,col:4,type:'mob',title:'DUSK WHELP',hp:210,attack:25,xp:40},
    {row:2,col:7,type:'mob',title:'RIFT HUNTER',hp:216,attack:25,xp:40},
    {row:8,col:6,type:'mob',title:'STONE LURKER',hp:222,attack:26,xp:41},
    {row:4,col:9,type:'mob',title:'AETHER PROWLER',hp:228,attack:26,xp:41},
    {row:1,col:13,type:'mob',title:'PRIMAL REAVER',hp:234,attack:27,xp:42},
    {row:8,col:14,type:'mob',title:'VOID HUNTER',hp:240,attack:27,xp:42},
    {row:3,col:17,type:'mob',title:'GALE REAVER',hp:246,attack:28,xp:43},
    {row:6,col:19,type:'mob',title:'RIFT STALKER',hp:252,attack:28,xp:43},
    {row:1,col:22,type:'mob',title:'DUSK REAVER',hp:258,attack:29,xp:44},
    {row:8,col:23,type:'mob',title:'VOID PROWLER',hp:264,attack:29,xp:44},
    {row:5,col:11,type:'elite',title:'DUSK SENTINEL',hp:345,attack:33,xp:62},
    {row:5,col:20,type:'elite',title:'VOID GUARDIAN',hp:365,attack:34,xp:65},
    {row:4,col:23,type:'boss',title:'ZONE 4 BOSS',hp:510,attack:38,xp:140}
  ],
  spring:{row:4,col:12,heal:90,title:'PRIMAL SPRING'},
  spring2:{row:8,col:18,heal:90,title:'PRIMAL SPRING'},
  springs:[
    {row:4,col:12,heal:90,title:'PRIMAL SPRING'},
    {row:8,col:18,heal:90,title:'PRIMAL SPRING'}
  ],
  potionHeal:45,
  spellIngredients:[
    {row:1,col:5,name:'Verdant Heart',force:'Growth'},
    {row:8,col:10,name:'Pyre Shard',force:'Ember'},
    {row:2,col:16,name:'Deepglass',force:'Flow'},
    {row:7,col:21,name:'Starroot',force:'Aether'}
  ],
  potionIngredients:[
    {row:6,col:14,name:'Moonleaf'},
    {row:3,col:19,name:'Clearwater'}
  ],
  manipulationCards:['Calm Waters','Ward Sigil','Steady Nerves','Quiet Harvest'],
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
  ],
  tactical:{draw:2},
  tacticalDeck:[
    {id:'guard-stance',name:'Guard Stance',text:'Block the next enemy hit completely.'},
    {id:'battle-focus',name:'Battle Focus',text:'Your next spell in this combat deals +20 damage.'}
  ]
};

(()=>{
  const config=window.HAJJEN_SHARED_UI_CONFIG;
  if(!config)return;
  config.zones=config.zones||{};
  config.zones[4]={
    levelTarget:13,
    manipulationDeckSize:4,
    objectives:[
      {kind:'intro',icon:'✦',title:'Use Both Tactical Cards',statusId:'introQuest'},
      {kind:'mob',icon:'☠',title:'Cull the Wilds',statusId:'mobQuest',target:7,colorClass:'mob-color'},
      {kind:'elite',icon:'⚔',title:'Break the Guardians',statusId:'eliteQuest',target:2,colorClass:'elite-color'},
      {kind:'level',icon:'★',title:'Reach Level 13',statusId:'levelQuest',target:13},
      {kind:'boss',icon:'♛',title:'ZONE 4 BOSS',statusId:'bossQuest',colorClass:'boss-color'}
    ],
    decks:[
      {type:'manipulation',state:'active',slots:4,note:'4 / 4 ACTIVE'},
      {type:'enchantment',state:'active',slots:2,note:'2 / 2 ACTIVE'},
      {type:'tactical',state:'active',slots:2,note:'2 / 2 ACTIVE'}
    ],
    help:[
      {title:'ZONE 4 GOAL',items:[
        'All eight Hand slots are now active: 4 Manipulation, 2 Enchantment and 2 Tactical.',
        'Use both Tactical cards during the run.',
        'Defeat 7 normal mobs, both Guardians, and reach Level 13 to unlock the Zone 4 boss.',
        'Zone 4 uses the same 25×10 world size as Zone 3.'
      ]},
      {title:'ZONE 4 POWER STEP',items:[
        'The level band advances from 7–10 to 10–13.',
        'Zone 4 crafted spells receive +10 base potency; Zone 3 used +7 and Zone 2 used +4.',
        'Enemy base HP and attack step upward with the new level band.'
      ]},
      {title:'TACTICAL',items:[
        'Guard Stance blocks the next enemy hit completely.',
        'Battle Focus adds +20 damage to your next spell in the current combat.',
        'Each Tactical card is one-use for the run.'
      ]},
      {title:'ENCHANTMENTS',items:[
        'Two Enchantment cards are available, just like Zone 3.',
        'Apply them to crafted spells from Hand.'
      ]},
      {title:'CAMPAIGN',items:[
        'Crafted spells and Healing Potions carry forward.',
        'Spell and Potion ingredients remain zone-local.'
      ]}
    ]
  };
})();
