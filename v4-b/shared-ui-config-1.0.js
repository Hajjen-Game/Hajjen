(()=>{
  window.HAJJEN_SHARED_UI_CONFIG={
    version:'1.0',
    text:{
      actionBar:'ACTION BAR',
      cardDecks:'CARD DECKS',
      sharkan:'SHARKAN',
      eventLog:'EVENT LOG',
      hand:'HAND — MANIPULATION',
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
      handSlots:7,
      spellSlots:4,
      potionSlot:true
    },
    deckLibrary:{
      manipulation:{label:'MANIPULATION'},
      enchantment:{label:'ENCHANTMENT'},
      tactical:{label:'TACTICAL'}
    },
    zones:{
      1:{
        levelTarget:4,
        manipulationDeckSize:3,
        decks:[
          {type:'manipulation',state:'active'},
          {type:'enchantment',state:'locked',note:'LOCKED · INTRODUCED IN ZONE 3'}
        ]
      },
      2:{
        levelTarget:7,
        manipulationDeckSize:4,
        decks:[
          {type:'manipulation',state:'active'},
          {type:'enchantment',state:'locked',note:'LOCKED · INTRODUCED IN ZONE 3'}
        ]
      }
    }
  };
})();
