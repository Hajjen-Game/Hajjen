window.HAJJEN_ZONE_CONFIG={
  zone:2,name:'ZONE 2',cols:25,rows:10,viewCols:15,viewRows:10,start:{row:5,col:1},levelFloor:4,levelCap:7,next:'zone3.html',
  introQuest:'Create a Healing Potion',introType:'potion',bossTitle:'ZONE 2 BOSS',bossPos:{row:4,col:23},
  enemies:[
    {row:2,col:5,type:'mob',title:'MIRE SCOUT',hp:92,attack:13,xp:20},{row:7,col:7,type:'mob',title:'BOG HUNTER',hp:98,attack:14,xp:20},
    {row:3,col:12,type:'mob',title:'ROOT RAIDER',hp:102,attack:14,xp:21},{row:8,col:15,type:'mob',title:'MARSH HUNTER',hp:106,attack:15,xp:21},
    {row:1,col:19,type:'mob',title:'FEN STALKER',hp:110,attack:15,xp:22},{row:6,col:21,type:'mob',title:'MIRE PROWLER',hp:112,attack:15,xp:22},
    {row:4,col:10,type:'elite',title:'FEN GUARDIAN',hp:178,attack:19,xp:35},{row:7,col:18,type:'elite',title:'MARSH WARDEN',hp:188,attack:20,xp:38},
    {row:4,col:17,type:'spring',title:'PRIMAL SPRING',hp:0,attack:0,xp:0},
    {row:4,col:23,type:'boss',title:'ZONE 2 BOSS',hp:270,attack:24,xp:80}
  ],
  spellIngredients:[{row:1,col:4,name:'Glowroot',force:'Growth'},{row:8,col:9,name:'Ash Pearl',force:'Ember'},{row:2,col:16,name:'Riverglass',force:'Flow'},{row:7,col:22,name:'Wind Shard',force:'Gale'}],
  potionIngredients:[{row:4,col:6,name:'Moonleaf'},{row:5,col:13,name:'Clearwater'}],
  enchantment:{worldPickup:false,draw:1,mark:'✦'},
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
