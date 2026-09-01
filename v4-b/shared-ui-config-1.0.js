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
      runReportCopied:'RUN REPORT COPIED',
      runReportNotReady:'RUN REPORT NOT READY',
      runReportCopyFailed:'COPY FAILED — TAP AGAIN',
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
        ],
        help:[
          {title:'ZONE 1 GOAL',items:[
            'Create a spell as an introduction quest. It gives no XP.',
            'Defeat 4 normal mobs and both Guardians to unlock Rootmaw.',
            'After Rootmaw falls, Zone 1 becomes safe. Explore freely, then use the Zone 2 portal.'
          ]},
          {title:'DANGER',items:[
            'Every 3 movement steps adds +1 Danger. Harvesting and combat also add pressure.',
            'Higher Danger increases spawn pressure, enemy power and aggro.'
          ]},
          {title:'MANIPULATION',items:[
            'Zone 1 has 3 Manipulation cards. Later zones expand this to 4.',
            'Tactical cards have been removed from the design.'
          ]},
          {title:'SPELLS',items:[
            'Ember Bolt is a permanent Cooldown 0 fallback.',
            'You can create up to 3 additional spells.',
            'Cooldown is measured in other spell casts, not real time.',
            'Primal spells no longer have built-in healing or defense effects. Enchantments take that role from Zone 3 onward.'
          ]},
          {title:'LEVELS',items:[
            'Zone 1 cap: Level 4.',
            'Zone 2 cap: Level 7.',
            'Zone 3 cap: Level 10.'
          ]},
          {title:'PRIMAL SPRING',items:[
            'Restores up to 45 HP once per run. At full HP it remains unused.'
          ]}
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
        ],
        help:[
          {title:'ZONE 2 GOAL',items:[
            'Create a Healing Potion from Moonleaf + Clearwater.',
            'Defeat 4 normal mobs, both Guardians, and reach Level 7 to unlock the Zone 2 boss.',
            'The world is wider than Zone 1; the camera follows Sharkan horizontally.'
          ]},
          {title:'DANGER',items:[
            'Movement, harvesting and combat raise Danger just like Zone 1.',
            'Higher Danger increases spawn pressure and enemy scaling.'
          ]},
          {title:'BACKPACK',items:[
            'Unused spell ingredients carry between zones.',
            'Healing Potions and crafted spells also carry forward.'
          ]},
          {title:'SPELLS',items:[
            'Your Zone 1 spells remain available.',
            'Collect two ingredients to create another spell if you still have a free crafted-spell slot.'
          ]}
        ]
      }
    }
  };
})();
