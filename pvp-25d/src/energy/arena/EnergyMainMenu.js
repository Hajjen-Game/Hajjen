// A standalone menu + illustrated field guide for the Energy Arena.
// It never mutates the saved build, character, progression, or match rules.
const $=id=>document.getElementById(id);
const PAGES=[
  {
    title:"WELCOME TO ENERGY ARENA",chapter:"01 / THE BIG IDEA",
    intro:"You control an energy orb in short, tactical arena battles. The goal is simple: defeat the opposing team.",
    steps:[
      ["BUILD","Choose the spells and Evolutions that fit your playstyle."],
      ["FIGHT","Move, aim, cast and use cover to survive."],
      ["GROW","Earn XP, level up and gradually unlock your full toolkit."]
    ],tip:"First match? Start with Training Grounds (1v1).",
    art:"arena",caption:"An arena is a small battlefield. Positioning and obstacles matter."
  },
  {
    title:"CHOOSE YOUR ORIGIN",chapter:"02 / YOUR ORIGIN",
    intro:"Name your planet and choose its Origin: Genesis, Impact or Eclipse. Each Origin gives you two fixed starting spells and a unique passive.",
    steps:[
      ["GENESIS","Restore health and protect allies. Start with Pulse Mend and Resonance Guard."],
      ["IMPACT","Rush into close combat and interrupt enemies. Start with Phase Rush and Pulse Sever."],
      ["ECLIPSE","Fight from range and escape danger. Start with Flux Bolt and Phase Slip."]
    ],tip:"Origins shape your starting strengths, not your entire build. All five energy disciplines remain available.",
    art:"roles",caption:"Genesis, Impact and Eclipse have different starting strengths. Your later spells are up to you."
  },
  {
    title:"BUILD YOUR SPELL KIT",chapter:"03 / THE EVOLUTION TREE",
    intro:"You begin with three unlocked spells. More join your inner ring as you level, up to a complete ten-spell build.",
    steps:[
      ["INNER RING","Only your currently unlocked spells glow around the orb. At level 2, you have 3/10."],
      ["OUTER RING","The other Origin-compatible spells stay visible outside the bright ring."],
      ["REPLACE","Inspect a pool spell and swap it with one of your unlocked shared spells."]
    ],tip:"Your two Origin spells are permanent. Other unlocked spells can be changed for free.",
    art:"loadout",caption:"An early-level build: 3 equipped, 15 available to explore. The inner ring grows as you level."
  },
  {
    title:"UPGRADE & EVOLVE",chapter:"04 / TALENTS AND EVOLUTIONS",
    intro:"Each equipped spell can reach Rank 3. At Rank 3, choose one of its three Evolutions.",
    steps:[
      ["TALENT POINTS","Earn points as you level up, then spend them on spell ranks."],
      ["EVOLUTION","Pick the change you like: more power, new utility or a different effect."],
      ["MAX LEVEL","At level 30 you earn 30 points: enough to max all ten spells."]
    ],tip:"Evolution choices can be changed; try different combinations.",
    art:"talents",caption:"Master a spell first. Then select one of three branching Evolutions."
  },
  {
    title:"FORGE A SINGULARITY",chapter:"05 / BLACK HOLE MATTER",
    intro:"At level 10 you unlock Singularity Forge. It links one of your two Origin spells with any unlocked shared spell, creating a new combat reaction.",
    steps:[
      ["BLACK HOLE MATTER","Earn it occasionally from arena victories. Creating or changing your link costs one Matter."],
      ["THREE REACTIONS","Choose Annihilation, Distortion or Resonance, then use the partner spell before your Origin spell."],
      ["ENERGY FRAGMENTS","Earn these from team kills and use them to strengthen your forged Singularity at later levels."]
    ],tip:"Preview as many combinations as you like for free. Ordinary spell ranks still use Talent Points.",
    art:"singularity",caption:"A charged partner spell followed by its Origin anchor releases the Singularity."
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
    title:"CHOOSE YOUR BATTLE",chapter:"08 / ARENA MODES",
    intro:"You can enter any mode from the main menu. Start small or jump straight into a tougher fight.",
    steps:[
      ["TRAINING · 1V1","A gentler match against one enemy. Best for learning."],
      ["DUO · 2V2","Fight with an AI partner against two opponents."],
      ["FULL ARENA · 3V3","A complete team fight with three characters on each side."]
    ],tip:"The modes all use your current build and character progression.",
    art:"modes",caption:"Three modes, one evolving character."
  },
  {
    title:"KEEP EXPERIMENTING",chapter:"09 / YOUR NEXT STEPS",
    intro:"Winning and losing both award XP. More levels unlock more spells and Talent Points.",
    steps:[
      ["LEVEL UP","Your ten ability slots unlock gradually until level 28."],
      ["TRY BUILDS","Save up to three named presets in the HUB and load them later."],
      ["RETURN","Use Main Menu to choose another mode or open this guide again."]
    ],tip:"There is no need to make the perfect build on your first match.",
    art:"progress",caption:"Level, build and experience are part of the same journey."
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
        <div><span class="book-role-orb melee">⌁</span><strong>IMPACT</strong><small>CHASE · INTERRUPT</small></div>
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
        <div><strong>TRAINING GROUNDS</strong><span>✦ <em>VS</em> ◆</span><small>1V1</small></div>
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
    getOrigins,selectOrigin,createOrigin,getOriginLevel}){
    this.openHub=openHub;this.startMatch=startMatch;
    this.changeMode=changeMode;this.getCharacter=getCharacter;
    this.hideHub=hideHub;this.onMenuFromCombat=onMenuFromCombat;
    this.getOrigins=getOrigins;this.selectOrigin=selectOrigin;
    this.createOrigin=createOrigin;this.getOriginLevel=getOriginLevel;
    this.page=0;this.previousFocus=null;
    $("menu-play").addEventListener("click",()=>this.openPlay());
    $("menu-hub").addEventListener("click",()=>this.enterHub());
    $("menu-new-origin").addEventListener("click",()=>this.createOrigin());
    $("menu-about").addEventListener("click",()=>this.openGuide());
    $("main-menu-open").addEventListener("click",()=>this.onMenuFromCombat());
    for(const node of document.querySelectorAll("[data-menu-mode]")){
      node.addEventListener("click",()=>{
        const mode=node.dataset.menuMode;
        this.changeMode(mode);
        if(!this.getCharacter()){this.enterHub();return;}
        $("main-menu").hidden=true;
        this.startMatch(mode);
      });
    }
    $("guide-close").addEventListener("click",()=>this.closeGuide());
    $("guide-prev").addEventListener("click",()=>this.turn(-1));
    $("guide-next").addEventListener("click",()=>this.turn(1));
    $("guide-overlay").addEventListener("click",event=>{
      if(event.target===$("guide-overlay"))this.closeGuide();
    });
    document.addEventListener("keydown",event=>{
      if($("guide-overlay").hidden)return;
      if(event.key==="Escape"){event.preventDefault();this.closeGuide();}
      else if(event.key==="ArrowRight"){event.preventDefault();this.turn(1);}
      else if(event.key==="ArrowLeft"){event.preventDefault();this.turn(-1);}
    });
  }
  open(){
    this.closeGuide();
    this.hideHub();
    $("main-menu").hidden=false;
    $("menu-mode-options").hidden=true;
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
      row.setAttribute("aria-pressed",String(isActive));
      row.setAttribute("aria-label","Select "+entry.character.name+" ("+entry.character.origin+")");
      row.addEventListener("click",()=>{
        if(!isActive)this.selectOrigin(entry.id);
        this.renderOrigins();
      });
      const emblem=document.createElement("span");emblem.className="menu-origin-emblem";
      emblem.textContent=entry.character.origin==="Genesis"?"✧":
        entry.character.origin==="Impact"?"⌁":"❖";
      emblem.style.setProperty("--origin-color",entry.character.color);
      const meta=document.createElement("span");meta.className="menu-origin-meta";
      const name=document.createElement("strong");name.textContent=entry.character.name;
      const subtitle=document.createElement("small");
      subtitle.textContent=entry.character.origin+" · LEVEL "+this.getOriginLevel(entry);
      meta.append(name,subtitle);
      const state=document.createElement("span");
      state.className="menu-origin-state";state.textContent=isActive?"ACTIVE ✓":"SELECT →";
      row.append(emblem,meta,state);host.append(row);
    }
    if(!characters.length){
      const empty=document.createElement("p");empty.className="menu-origin-empty";
      empty.textContent="No Origins created. Create your first to begin.";
      host.append(empty);
    }
    $("menu-play").disabled=!characters.length;
    $("menu-hub").disabled=!characters.length;
  }
  openPlay(){
    this.open();
    $("menu-mode-options").hidden=false;
    $("menu-mode-options").scrollIntoView({behavior:"smooth",block:"nearest"});
  }
  enterHub(){
    $("main-menu").hidden=true;
    this.openHub();
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
    // Static, self-contained instructional drawings (no third-party image
    // requests). Only author-controlled markup from artMarkup is inserted.
    $("guide-illustration").innerHTML=artMarkup(item.art);
    $("guide-art-caption").textContent=item.caption;
    $("guide-progress").textContent=(this.page+1)+" / "+PAGES.length;
    $("guide-prev").disabled=this.page===0;
    $("guide-next").disabled=this.page===PAGES.length-1;
  }
}
