(()=>{
  window.HAJJEN_SHARED_UI_CONFIG={
    version:'1.0',
    text:{
      actionBar:'ACTION BAR',
      cardDecks:'CARD DECKS',
      sharkan:'SHARKAN',
      eventLog:'EVENT LOG',
      hand:'HAND',
      spellbook:'SPELLBOOK',
      backpack:'BACKPACK',
      help:'HELP',
      copyRunReport:'COPY RUN REPORT',
      resetCampaign:'RESET CAMPAIGN',
      potion:'HEALING POTION',
      potionShort:'POTION',
      emptySpell:'EMPTY SPELL',
      manipulation:'MANIPULATION',
      enchantment:'ENCHANTMENT',
      tactical:'TACTICAL'
    },
    layout:{
      handSlots:8,
      hand:{manipulation:4,enchantment:2,tactical:2},
      spellSlots:4,
      potionSlot:true
    },
    deckLibrary:{
      manipulation:{label:'MANIPULATION',introducedIn:1},
      enchantment:{label:'ENCHANTMENT',introducedIn:3},
      tactical:{label:'TACTICAL',introducedIn:4}
    },
    zones:{
      1:{
        levelTarget:4,
        manipulationDeckSize:3,
        objectives:[
          {kind:'intro',icon:'✦',title:'Create a Spell',statusId:'spellQuest'},
          {kind:'mob',icon:'☠',title:'Cull the Wilds',statusId:'mobQuest',target:4,colorClass:'mob-color'},
          {kind:'elite',icon:'⚔',title:'Break the Guardians',statusId:'eliteQuest',target:2,colorClass:'elite-color'},
          {kind:'level',icon:'★',title:'Reach Level 4',statusId:'levelQuest',target:4},
          {kind:'boss',icon:'♛',title:'Rootmaw',statusId:'bossQuest',colorClass:'boss-color'}
        ],
        decks:[
          {type:'manipulation',state:'active'},
          {type:'enchantment',state:'locked',note:'LOCKED · INTRODUCED IN ZONE 3'},
          {type:'tactical',state:'locked',note:'LOCKED · INTRODUCED IN ZONE 4'}
        ]
      },
      2:{
        levelTarget:7,
        manipulationDeckSize:4,
        objectives:[
          {kind:'intro',icon:'✦',title:'Create a Healing Potion',statusId:'introQuest'},
          {kind:'mob',icon:'☠',title:'Cull the Wilds',statusId:'mobQuest',target:4,colorClass:'mob-color'},
          {kind:'elite',icon:'⚔',title:'Break the Guardians',statusId:'eliteQuest',target:2,colorClass:'elite-color'},
          {kind:'level',icon:'★',title:'Reach Level 7',statusId:'levelQuest',target:7},
          {kind:'boss',icon:'♛',title:'ZONE 2 BOSS',statusId:'bossQuest',colorClass:'boss-color'}
        ],
        decks:[
          {type:'manipulation',state:'active'},
          {type:'enchantment',state:'locked',note:'LOCKED · INTRODUCED IN ZONE 3'},
          {type:'tactical',state:'locked',note:'LOCKED · INTRODUCED IN ZONE 4'}
        ]
      }
    }
  };
})();
