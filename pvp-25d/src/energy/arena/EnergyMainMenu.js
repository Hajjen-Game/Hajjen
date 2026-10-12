import { EnergyJourneyRoadmap } from "./EnergyJourneyRoadmap.js?v=20261012-journey4";
// A standalone menu + illustrated field guide for the Project Energy.
// It never mutates the saved build, character, progression, or match rules.
const $=id=>document.getElementById(id);
const PAGES=[
  {
    title:"WELCOME TO PROJECT ENERGY",chapter:"01 / THE BIG IDEA",
    intro:"You control an energy orb, learn your spells through Planet Defense and choose between wave survival and tactical arena battles.",
    steps:[
      ["BUILD","Choose the spells and Evolutions that fit your playstyle."],
      ["FIGHT","Move, aim, cast and use cover to survive."],
      ["GROW","Clear new Journey planets, discover spells from all five disciplines and unlock Evolutions."]
    ],tip:"New Origins begin with two bound spells. Your first planet clear grants a choice from all five disciplines.",
    art:"arena",caption:"An arena is a small battlefield. Positioning and obstacles matter."
  },
  {
    title:"CHOOSE YOUR ORIGIN",chapter:"02 / YOUR ORIGIN",
    intro:"Name your planet and choose its Origin: Genesis, Impact or Eclipse. Each Origin gives you two fixed starting spells and a unique passive.",
    steps:[
      ["GENESIS","Restore health and protect allies. Start with Pulse Mend and Resonance Guard."],
      ["IMPACT","Rush into melee with Phase Rush, then keep attacking with instant Arc Strike. Pulse Sever remains a shared interrupt you can equip later."],
      ["ECLIPSE","Fight from range and escape danger. Start with Flux Bolt and Phase Slip."]
    ],tip:"Origins shape your starting strengths, not your entire build. All five energy disciplines remain available.",
    art:"roles",caption:"Genesis, Impact and Eclipse have different starting strengths. Your later spells are up to you."
  },
  {
    title:"BUILD YOUR SPELL KIT",chapter:"03 / THE EVOLUTION TREE",
    intro:"New Origins begin with two bound spells. Each first-clear Planet Defense victory lets you discover another shared spell for your library.",
    steps:[
      ["INNER RING","Your actual earned spells surround your Origin. New Journey builds begin with exactly two."],
      ["OUTER RING","Future spells remain visible but unlock at campaign milestones; all five disciplines are available from the start."],
      ["REPLACE","Inspect a pool spell and swap it with one of your unlocked shared spells."]
    ],tip:"Your two Origin spells stay bound. You can equip discovered shared spells after you earn them.",
    art:"loadout",caption:"Your Journey starts with the two Origin-bound spells. The bright inner ring grows as you earn discoveries."
  },
  {
    title:"EVOLVE YOUR ORIGIN",chapter:"04 / JOURNEY MILESTONES",
    intro:"Journey characters have no levels or spell ranks. New spells are discovered through first-time Planet Defense clears.",
    steps:[
      ["PLANET 3","Unlock Counterplay spells for the next encounter."],
      ["PLANET 10","Evolutions are planned to change a spell's behavior, not add numerical ranks."],
      ["PLANET 20","Synergies and Rift Expedition form the next major milestone."]
    ],tip:"Your two Origin spells are permanent. Additional spell discoveries can come from any of the five disciplines.",
    art:"talents",caption:"Unlock distinctive gameplay choices as your Journey advances."
  },
  {
    title:"SYNERGIES · COMING LATER",chapter:"05 / LONG-TERM DISCOVERIES",
    intro:"Synergies will unlock through the Journey instead of an arbitrary Character Level. This feature is not active for new Journey Origins yet.",
    steps:[
      ["PLANET 20","The proposed milestone for Synergies and Rift Expedition."],
      ["SPELL PAIRS","Eventually discover combinations of your Origin spells with shared energy disciplines."],
      ["PREVIEW","Existing legacy Forge systems remain available to older saved builds."]
    ],tip:"The spell-library Journey and the Forge migration are deliberately separate development passes.",
    art:"singularity",caption:"Combine energy disciplines after the relevant systems become available."
  },
  {
    title:"READ THE BATTLE",chapter:"06 / IN THE ARENA",
    intro:"Watch health, your Flux resource, targets and cooldowns. Choose when to attack, protect or reposition.",
    steps:[
      ["TARGET","Click an orb to target it, or press Tab to cycle enemies."],
      ["CAST","Use keys 1–0 for the ten ability slots as they unlock."],
      ["SURVIVE","Move behind arena obstacles to break line of sight and avoid attacks."]
    ],tip:"Your allies keep fighting even when you are not controlling them.",
    art:"combat",caption:"The fight is real-time. The arena, target and action bar guide decisions."
  },
  {
    title:"LEARN THE CONTROLS",chapter:"07 / QUICK CONTROLS",
    intro:"A few simple keys cover the most important parts of the game.",
    steps:[
      ["W A S D","Move your orb around the battlefield."],
      ["1 THROUGH 0","Cast spells from your action bar."],
      ["TAB / F1–F3","Cycle enemies with Tab. Select friendly targets with F1, F2 and F3."]
    ],tip:"Only abilities you've unlocked can be used in combat.",
    art:"controls",caption:"These are the currently implemented keyboard controls."
  },
  {
    title:"CHOOSE YOUR BATTLE",chapter:"08 / PLANET DEFENSE",
    intro:"Your active Journey follows a 20-planet roadmap. Completing each new planet for the first time advances your Origin.",
    steps:[
      ["PLANET DEFENSE","Five waves alongside two AI companions, using only your earned spells."],
      ["BETWEEN WAVES","Choose temporary buffs for this match; the four-card ally-aware Overcharge system is being developed."],
      ["AFTER THE WIN","Return to HUB to claim your permanent spell discovery from all eligible energy disciplines."],
      ["JOURNEY HEXES","Only your next available hex starts a new first-clear encounter. Completed hexes receive green ticks."],
      ["PVP TESTS","Existing 1v1, 2v2 and 3v3 prototypes remain in development access. PvP progression has not been decided."]
    ],tip:"The new Journey does not award XP or spell ranks. Older Origins keep their historical progression until migration.",
    art:"modes",caption:"One campaign path, two AI companions and a growing spell library."
  },
  {
    title:"KEEP EXPERIMENTING",chapter:"09 / YOUR NEXT STEPS",
    intro:"There are no levels in the new Journey. Each first-clear planet makes a tangible part of your Origin's toolkit available.",
    steps:[
      ["DISCOVER SPELLS","Choose an owned shared spell from the five disciplines after a new planet is cleared."],
      ["BUILD YOUR KIT","Your ten active slots are two bound Origin spells plus up to eight discovered shared spells."],
      ["AI TEAM","Companion styles are planned after Planet 5 and their optional build editors after Planet 15."],
      ["OTHER ORIGINS","You can create or resume more Origins. They have separate campaign progress and spell libraries."]
    ],tip:"An unfinished first-clear spell reward stays saved until you choose. There is no need to perfect the first build.",
    art:"progress",caption:"A connected campaign with spell discoveries and team milestones."
  }
];
function artMarkup(name){
  const dots=(count,cls,r,start=-Math.PI/2)=>Array.from({length:count},(_,i)=>{
    const a=start+i*Math.PI*2/count;
    const x=50+Math.cos(a)*r,y=50+Math.sin(a)*r;
    return '<i class="'+cls+'" style="left:'+x.toFixed(2)+'%;top:'+y.toFixed(2)+'%"></i>';
  }).join("");
  switch(name){
    case "arena":return `
      <div class="book-arena-map">
        <span class="book-pillar p1"></span><span class="book-pillar p2"></span>
        <span class="book-pillar p3"></span><span class="book-pillar p4"></span>
        <span class="book-unit hero">✦</span><span class="book-unit friend">✧</span>
        <span class="book-unit enemy">◈</span><span class="book-unit enemy second">◈</span>
        <span class="book-path"></span>
        <span class="book-mini-label top">YOUR ORB</span>
        <span class="book-mini-label bottom">OPPONENTS</span>
      </div>`;
    case "roles":return `
      <div class="book-role-gallery">
        <div><span class="book-role-orb healer">✧</span><strong>GENESIS</strong><small>HEAL · PROTECT</small></div>
        <div><span class="book-role-orb melee">⌁</span><strong>IMPACT</strong><small>CHARGE · STRIKE</small></div>
        <div><span class="book-role-orb caster">❖</span><strong>ECLIPSE</strong><small>CAST · REPOSITION</small></div>
      </div>`;
    case "loadout":return `
      <div class="book-orbit-map">
        <div class="book-orbit-ring inner"></div><div class="book-orbit-ring outer"></div>
        <div class="book-orbit-hero">✦</div>
        ${dots(3,"book-orbit-dot chosen",27)}
        ${dots(15,"book-orbit-dot pool",44,Math.PI/15-Math.PI/2)}
      </div>
      <div class="book-key"><span class="a">◉ 3/10 EQUIPPED</span><span class="b">◇ 15 IN POOL</span></div>`;
    case "talents":return `
      <div class="book-rank-path"><span>RANK 1 ✓</span><span>RANK 2 ✓</span><span>RANK 3 ★</span></div>
      <div class="book-branch-stem"></div>
      <div class="book-evolution-row">
        <div>✦<strong>POWER</strong><small>Bigger impact</small></div>
        <div>➤<strong>SPEED</strong><small>Quicker cast</small></div>
        <div>◈<strong>UTILITY</strong><small>New effect</small></div>
      </div>
      <p class="book-art-subtitle">ONE SPELL · THREE PATHS · CHOOSE ONE</p>`;
    case "singularity":return `
      <div class="book-singularity-art">
        <div class="book-singularity-spells"><span>✦ <small>ORIGIN SPELL</small></span><span>❄ <small>PARTNER SPELL</small></span></div>
        <div class="book-singularity-path"><i></i><i></i></div>
        <div class="book-singularity-core"><div class="book-singularity-hole"></div></div>
        <strong>BLACK HOLE MATTER</strong>
        <div class="book-singularity-reactions"><span>ANNIHILATION</span><span>DISTORTION</span><span>RESONANCE</span></div>
        <small>REQUIRES LEVEL 10</small>
      </div>`;
    case "combat":return `
      <div class="book-combat-scene">
        <div class="book-combat-score"><span class="ally">ALLY 100%</span><span class="foe">ENEMY 100%</span></div>
        <span class="book-combat-rock"></span>
        <span class="book-combat-hero">✦</span><span class="book-combat-enemy">◆</span>
        <span class="book-projectile"></span>
        <div class="book-action-row">${Array.from({length:10},(_,i)=>'<i>'+((i+1)%10)+'</i>').join("")}</div>
      </div>`;
    case "controls":return `
      <div class="book-controls">
        <div class="book-wasd"><kbd>W</kbd><div><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div><span>MOVE</span></div>
        <div class="book-keys"><div class="book-keyline">1 · 2 · 3 · 4 · 5 · 6 · 7 · 8 · 9 · 0</div>
        <p>CAST ABILITIES</p><div><kbd>TAB</kbd> <span>ENEMY</span></div>
        <div><kbd>F1</kbd><kbd>F2</kbd><kbd>F3</kbd><span>ALLIES</span></div></div>
      </div>`;
    case "modes":return `
      <div class="book-modes-art">
        <div><strong>PLANET DEFENSE</strong><span>✦ ✧ ◈ <em>VS</em> ◆ ◆ ◆</span><small>5 WAVES · 3VE</small></div>
        <div><strong>DUO SKIRMISH</strong><span>✦ ✧ <em>VS</em> ◆ ◆</span><small>2V2</small></div>
        <div><strong>FULL ARENA</strong><span>✦ ✧ ◈ <em>VS</em> ◆ ◆ ◆</span><small>3V3</small></div>
      </div>`;
    default:return `
      <div class="book-progress-art">
        <span>LEVEL 1</span><div class="book-progress-line"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><span>LEVEL 30</span>
        <strong>30 TALENT POINTS</strong><small>10 MASTERED SPELLS</small>
        <div class="book-presets-art"><span>BUILD 1</span><span>BUILD 2</span><span>BUILD 3</span></div>
      </div>`;
  }
}
export class EnergyMainMenu{
  constructor({openHub,startMatch,changeMode,getCharacter,hideHub,onMenuFromCombat,
    getOrigins,selectOrigin,createOrigin,getOriginLevel,getJourney}){
    this.openHub=openHub;this.startMatch=startMatch;
    this.changeMode=changeMode;this.getCharacter=getCharacter;
    this.hideHub=hideHub;this.onMenuFromCombat=onMenuFromCombat;
    this.getOrigins=getOrigins;this.selectOrigin=selectOrigin;
    this.createOrigin=createOrigin;this.getOriginLevel=getOriginLevel;
    this.getJourney=getJourney;
    this.page=0;this.previousFocus=null;
    // Play opens the one player Journey. No XP or old mixed-mode wins count
    // as campaign clears until the true first-clear schema is implemented.
    this.journey=new EnergyJourneyRoadmap({
      map:$("hub-journey-map"),detail:$("hub-journey-detail"),
      summary:$("hub-journey-summary"),
      onSelect:hex=>{
        const button=$("play-journey-start");
        button.disabled=false;
        button.textContent="PLAY · PLANET "+String(hex.step).padStart(2,"0")+" →";
      }
    });
    $("menu-new-origin").addEventListener("click",()=>this.createNew());
    $("menu-resume").addEventListener("click",()=>this.openResume());
    $("menu-about").addEventListener("click",()=>this.openGuide());
    $("menu-game-dev").addEventListener("click",()=>this.openGameDev());
    $("roster-create-origin").addEventListener("click",()=>this.createNew());
    $("roster-back").addEventListener("click",()=>this.open());
    $("game-dev-back").addEventListener("click",()=>this.open());
    $("play-back-hub").addEventListener("click",()=>this.enterHub());
    $("main-menu-open").addEventListener("click",()=>this.onMenuFromCombat());
    $("play-journey-start").addEventListener("click",()=>{
      if(!$("play-journey-start").disabled&&this.journey.armed&&this.getCharacter()){
        this.changeMode("defense");
        this.hideScreens();
        this.startMatch("defense");
      }
    });
    for(const node of document.querySelectorAll("[data-menu-mode]")){
      node.addEventListener("click",()=>{
        if(node.disabled||!this.getCharacter())return;
        this.changeMode(node.dataset.menuMode);
        this.hideScreens();
        this.startMatch(node.dataset.menuMode);
      });
    }
    $("guide-close").addEventListener("click",()=>this.closeGuide());
    $("guide-prev").addEventListener("click",()=>this.turn(-1));
    $("guide-next").addEventListener("click",()=>this.turn(1));
    $("guide-overlay").addEventListener("click",event=>{
      if(event.target===$("guide-overlay"))this.closeGuide();
    });
    document.addEventListener("keydown",event=>{
      if(!$("guide-overlay").hidden){
        if(event.key==="Escape"){event.preventDefault();this.closeGuide();}
        else if(event.key==="ArrowRight"){event.preventDefault();this.turn(1);}
        else if(event.key==="ArrowLeft"){event.preventDefault();this.turn(-1);}
      }else if(event.key==="Escape"){
        if(!$("hub-play-screen").hidden){event.preventDefault();this.enterHub();}
        else if(!$("origin-roster-screen").hidden||!$("game-dev-screen").hidden){
          event.preventDefault();this.open();
        }
      }
    });
  }
  hideScreens(){
    for(const id of ["main-menu","origin-roster-screen","hub-play-screen","game-dev-screen"])
      $(id).hidden=true;
  }
  open(){
    this.closeGuide();
    this.hideHub();
    this.hideScreens();
    $("main-menu").hidden=false;
    $("main-menu-open").hidden=true;
  }
  createNew(){
    this.hideScreens();
    $("main-menu-open").hidden=false;
    this.createOrigin();
  }
  openResume(){
    this.hideHub();
    this.hideScreens();
    $("origin-roster-screen").hidden=false;
    $("main-menu-open").hidden=false;
    this.renderOrigins();
  }
  renderOrigins(){
    const {characters,activeId}=this.getOrigins();
    const host=$("menu-origin-list");host.replaceChildren();
    $("menu-origin-count").textContent=characters.length+" CREATED";
    for(const entry of characters){
      const isActive=entry.id===activeId;
      const row=document.createElement("button");row.type="button";
      row.className="menu-origin-item"+(isActive?" active":"");
      row.setAttribute("aria-label","Continue as "+entry.character.name+
        " ("+entry.character.origin+")");
      row.addEventListener("click",()=>{
        // Enter the clicked Origin's HUB immediately; no secondary Play step.
        this.selectOrigin(entry.id);
        this.enterHub();
      });
      const emblem=document.createElement("span");emblem.className="menu-origin-emblem";
      emblem.textContent=entry.character.origin==="Genesis"?"✧":
        entry.character.origin==="Impact"?"⌁":"❖";
      emblem.style.setProperty("--origin-color",entry.character.color);
      const meta=document.createElement("span");meta.className="menu-origin-meta";
      const name=document.createElement("strong");name.textContent=entry.character.name;
      const subtitle=document.createElement("small");
      subtitle.textContent=entry.character.origin+" · "+
        (entry.progression.journey?.version===2?
          (entry.progression.journey.clears||0)+"/20 PLANETS":
          "LEVEL "+this.getOriginLevel(entry));
      meta.append(name,subtitle);
      const state=document.createElement("span");
      state.className="menu-origin-state";
      state.textContent="ENTER HUB →";
      row.append(emblem,meta,state);host.append(row);
    }
    if(!characters.length){
      const empty=document.createElement("p");empty.className="menu-origin-empty";
      empty.textContent="No saved Origins yet. Choose New Origin to begin.";
      host.append(empty);
    }
  }
  enterHub(){
    this.hideScreens();
    $("main-menu-open").hidden=false;
    this.openHub();
  }
  openPlay(){
    // HUB -> Play = the campaign map. The hex needs an explicit selection
    // before starting; other game modes remain in a collapsed dev section.
    if(!this.getCharacter()){this.openResume();return;}
    const journey=this.getJourney?.();
    if(journey?.pending){this.enterHub();return;}
    this.journey.clears=Math.min(20,journey?.clears||0);
    this.journey.tracked=Boolean(journey);
    this.hideHub();
    this.hideScreens();
    $("hub-play-screen").hidden=false;
    $("main-menu-open").hidden=false;
    const start=$("play-journey-start");
    start.disabled=true;
    start.textContent="SELECT NEXT PLANET TO PLAY";
    this.journey.resetSelection();
  }
  openGameDev(){
    this.hideHub();
    this.hideScreens();
    $("game-dev-screen").hidden=false;
    $("main-menu-open").hidden=false;
  }
  openGuide(){
    this.previousFocus=document.activeElement;
    this.page=0;this.renderGuide();
    $("guide-overlay").hidden=false;
    $("guide-close").focus();
  }
  closeGuide(){
    if($("guide-overlay").hidden)return;
    $("guide-overlay").hidden=true;
    this.previousFocus?.focus?.();
  }
  turn(delta){
    const next=Math.max(0,Math.min(PAGES.length-1,this.page+delta));
    if(this.page!==next){this.page=next;this.renderGuide();}
  }
  renderGuide(){
    const item=PAGES[this.page];
    $("guide-chapter").textContent=item.chapter;
    $("guide-page-title").textContent=item.title;
    $("guide-intro").textContent=item.intro;
    const steps=$("guide-steps");steps.replaceChildren();
    for(const [title,description] of item.steps){
      const row=document.createElement("div");row.className="guide-step";
      const head=document.createElement("strong");head.textContent=title;
      const body=document.createElement("p");body.textContent=description;
      row.append(head,body);steps.append(row);
    }
    $("guide-tip").textContent="TIP · "+item.tip;
    $("guide-illustration").innerHTML=artMarkup(item.art);
    $("guide-art-caption").textContent=item.caption;
    $("guide-progress").textContent=(this.page+1)+" / "+PAGES.length;
    $("guide-prev").disabled=this.page===0;
    $("guide-next").disabled=this.page===PAGES.length-1;
  }
}
