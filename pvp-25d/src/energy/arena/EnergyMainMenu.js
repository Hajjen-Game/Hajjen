import { EnergyJourneyRoadmap } from "./EnergyJourneyRoadmap.js?v=20261012-journey4";
// A standalone menu + illustrated field guide for the Project Energy.
// It never mutates the saved build, character, progression, or match rules.
const $=id=>document.getElementById(id);
const PAGES=[
  {
    "title": "VÄLKOMMEN TILL PROJECT ENERGY",
    "chapter": "01 / VAD ÄR SPELET?",
    "intro": "Project Energy är ett singleplayer-actionspel om levande energivarelser. Skapa din egen Origin och slåss i realtid tillsammans med två AI-kompisar mot vågor av fiender.",
    "steps": [
      [
        "DIN EGEN ENERGIVARELSE",
        "Du styr ett levande klot med egna spells, utseende och en tydlig energiidentitet."
      ],
      [
        "ETT LAG PÅ TRE",
        "Dina två AI-kompisar slåss, skyddar och hjälper dig under varje Planet Defense."
      ],
      [
        "BYGG NÅGOT UNIKT",
        "Välj nya spells, skapa oväntade kombinationer och forma din personliga spelstil."
      ]
    ],
    "tip": "Börja med en Origin som känns rolig. Du behöver inte förstå hela byggsystemet direkt.",
    "art": "vision",
    "caption": "En Origin, två AI-kompisar och intensiva strider mot levande energifiender."
  },
  {
    "title": "VÄLJ DIN ORIGIN",
    "chapter": "02 / TRE SÄTT ATT BÖRJA",
    "intro": "När du skapar en Origin väljer du namn och grundidentitet. Varje Origin börjar med två permanenta spells från samma energidisciplin. De två kan inte bytas ut.",
    "steps": [
      [
        "GENESIS · VITAL",
        "En stödjande Origin med Pulse Mend och Resonance Guard. Healing och skydd är din styrka."
      ],
      [
        "IMPACT · KINETIC",
        "En aggressiv närstrids-Origin med Phase Rush och Arc Strike. Gå nära, rör dig snabbt och slå hårt."
      ],
      [
        "ECLIPSE · CRYO",
        "En kontrollerande distans-Origin med Crystal Bolt och Crystal Snare. Sakta ner och lås fast fiender."
      ]
    ],
    "tip": "Din Origin avgör hur du börjar – inte vilka energidiscipliner du får använda senare.",
    "art": "origins",
    "caption": "Genesis = Vital · Impact = Kinetic · Eclipse = Cryo."
  },
  {
    "title": "SÅ FUNGERAR STRIDEN",
    "chapter": "03 / REALTID OCH SAMARBETE",
    "intro": "Du styr din egen Origin direkt. Dina två lagkamrater sköts av AI och har egna spells. Positionering, rätt mål och tajming avgör när laget överlever.",
    "steps": [
      [
        "RÖRELSE OCH MÅL",
        "Rör dig med W, A, S, D. Klicka för att välja mål eller använd Tab för att växla mellan fiender."
      ],
      [
        "DINA SPELLS",
        "Använd 1–0 för actionbarens spells. F1–F3 hjälper dig att välja dig själv och dina allierade."
      ],
      [
        "SPELSTIL",
        "Attackera, heala, skydda, kontrollera och flytta dig bort från farliga attacker."
      ]
    ],
    "tip": "Du behöver inte styra AI-kompisarna i strid. De använder sina egna förmågor automatiskt.",
    "art": "combat",
    "caption": "Din Origin slåss tillsammans med AI-laget medan spells, mål och rörelse styrs i realtid."
  },
  {
    "title": "FÖRSVARA PLANETEN",
    "chapter": "04 / PLANET DEFENSE",
    "intro": "Planet Defense är spelets första huvudsakliga spelläge. Varje match består av fem fiendevågor där ditt lag försöker överleva allt större hot.",
    "steps": [
      [
        "FEM VÅGOR",
        "Varje våg har en egen sammansättning av fiender. Ibland krävs taktik, ibland gäller det att hantera riktigt mycket kaos."
      ],
      [
        "NYA HOT",
        "Olika fiender kan pressa dig på olika sätt. Förberedelser och val av spells blir viktigare längre in i kampanjen."
      ],
      [
        "VINN TILLSAMMANS",
        "Alla tre lagmedlemmar kan bidra. Skydda varandra, kontrollera farliga fiender och få ut maximalt av era spells."
      ]
    ],
    "tip": "Målet är att varje planet ska kännas annorlunda – utan att varje match måste ha en helt ny boss.",
    "art": "waves",
    "caption": "Fem vågor, ett lag och fiender som blir fler och mer krävande."
  },
  {
    "title": "DIN JOURNEY",
    "chapter": "05 / 20 PLANETER ATT KLARA",
    "intro": "Project Energy har inga vanliga levels eller spell ranks för nya Origins. I stället växer du genom att klara planeter i en Journey med 20 hexagoner.",
    "steps": [
      [
        "TRYCK PLAY",
        "Öppna Journey Roadmap, välj nästa tillgängliga hexagon och tryck Play för att starta Planet Defense."
      ],
      [
        "MARKERADE SEGRAR",
        "En planet får en grön bock när du klarat den för första gången. Då öppnas nästa steg."
      ],
      [
        "NYTT INNEHÅLL",
        "Längs vägen öppnas fler spell-val. Framtida milstolpar visar också AI Styles, Evolutions och nya utmaningar."
      ]
    ],
    "tip": "En ny spell väljs efter en första seger. Du kan inte hoppa förbi kommande planeter.",
    "art": "journey",
    "caption": "Hexagonerna visar din resa. Grönt betyder avklarat; nästa planet är markerad."
  },
  {
    "title": "UPPTÄCK OCH BYGG SPELLS",
    "chapter": "06 / EVOLUTION TREE",
    "intro": "Du börjar med två bundna spells. Efter nya Planet Defense-segrar upptäcker du permanenta spells från fem discipliner: Void, Solar, Cryo, Kinetic och Vital.",
    "steps": [
      [
        "LYSANDE SPELLS",
        "Efter en vinst lyser de tillgängliga spellsen upp i Evolution Tree. Klicka på dem för att läsa vad de gör."
      ],
      [
        "VÄLJ EN PERMANENT",
        "Bekräfta ditt val i Selected Spell-panelen. Du får exakt en ny spell per första planetseger."
      ],
      [
        "SKAPA DIN BUILD",
        "Du kan få totalt tio aktiva spells: dina två bundna plus upp till åtta delade. Spara dina favoritkombinationer som Build Presets."
      ]
    ],
    "tip": "Du får välja mellan alla fem energidiscipliner från första spell-belöningen, oavsett Origin.",
    "art": "spells",
    "caption": "Tillgängliga nya spells glöder i yttersta ringen; ett val blir permanent."
  },
  {
    "title": "ÖVERLADDA DIN MATCH",
    "chapter": "07 / OVERCHARGES",
    "intro": "Mellan vågorna erbjuds Overcharges – tillfälliga förstärkningar som gör varje Planet Defense-match mer oförutsägbar, effektfull och rolig.",
    "steps": [
      [
        "FYRA ERBJUDANDEN",
        "Två kort förstärker dig. Ett kort förstärker den ena AI-kompisen och ett förstärker den andra."
      ],
      [
        "VÄLJ EXAKT ETT",
        "Du väljer bara ett av de fyra korten efter varje vågpaus. Totalt kan du samla fyra Overcharges under en match."
      ],
      [
        "SKAPA KAOS",
        "Till exempel kan Comet Rain få extra energiattacker att falla över fiender. Andra Overcharges förstärker healing, skydd eller närstrid."
      ]
    ],
    "tip": "Overcharges försvinner efter matchen. Dina permanenta upptäckta spells finns däremot kvar i din Origin.",
    "art": "overcharges",
    "caption": "Två val för dig och ett för vardera AI-kompisen. Välj ett kort per paus."
  },
  {
    "title": "EVOLUTIONS OCH BUILDS",
    "chapter": "08 / FÖRDJUPA DIN ORIGIN",
    "intro": "Evolution Tree visar inte bara vilka spells du äger. Det visar också möjliga utvecklingsvägar för varje spell – så att samma förmåga längre fram kan få olika användningsområden.",
    "steps": [
      [
        "UTFORSKA VÄGAR",
        "Klicka på en Evolution för att läsa vad den kan göra, även när den är låst."
      ],
      [
        "PLANET 10 · PLANERAT",
        "Evolutions är tänkta att låsas upp genom Journey och ändra hur spells fungerar – inte bara öka en siffra."
      ],
      [
        "BUILD PRESETS",
        "Du kan spara och återvända till olika spell-kombinationer i HUB. Du behöver inte bygga allt från början varje gång."
      ]
    ],
    "tip": "Evolution-valen går redan att förhandsgranska. Den permanenta upplåsningen utvecklas fortfarande.",
    "art": "evolutions",
    "caption": "Ett spellträd med olika framtida Evolution-vägar, utan gamla Rank 1–3."
  },
  {
    "title": "LÄR KÄNNA DITT LAG",
    "chapter": "09 / DINA AI-KOMPISAR",
    "intro": "Dina två AI-kompisar har egna roller och energityper. De syns som animerade klot under ditt stora Evolution Tree i HUB och följer med på varje Planet Defense.",
    "steps": [
      [
        "ALLTID TVÅ ALLIERADE",
        "Om du spelar Eclipse följer Genesis och Impact med. Väljer du en annan Origin får du de två övriga som AI-kompisar."
      ],
      [
        "PLANET 5 · PLANERAT",
        "AI Styles ska låta dig påverka hur aggressivt, skyddande eller kontrollerande en kompis spelar."
      ],
      [
        "PLANET 15 · PLANERAT",
        "AI Builds ska ge möjlighet att anpassa deras spells. Färdiga builds ska fungera även om du inte vill ändra något."
      ]
    ],
    "tip": "AI-kompisarna får inga egna Journey-kartor. Deras inställningar låses upp på din Origins resa.",
    "art": "companions",
    "caption": "Du i centrum av striden; två självständiga AI-kompisar som du senare kan forma."
  },
  {
    "title": "DET HÄR ÄR BARA BÖRJAN",
    "chapter": "10 / FRAMTIDEN",
    "intro": "Project Energy byggs fortfarande. Målet är att spelet ska vara enkelt att komma in i, fullt av färgstarka spells och djupt nog för att du ska vilja experimentera länge.",
    "steps": [
      [
        "PLANET 20 · MÅL",
        "Synergies och Rift Expedition är planerade som större upplåsningar längre fram i Journey."
      ],
      [
        "MER SAMSPEL",
        "Fler fiender, kombinationer och smartare AI-lagkamrater ska göra PvE-kampanjen rikare med tiden."
      ],
      [
        "DIN UPPLEVELSE",
        "Testa olika Origins, prova oväntade spell-kombinationer och berätta gärna vad som är kul – eller borde bli bättre."
      ]
    ],
    "tip": "Det du spelar nu är en utvecklingsversion. Vissa knappar och milstolpar är medvetet låsta tills de är färdiga.",
    "art": "future",
    "caption": "Nya planeter, djupare synergier och Rift Expedition väntar längre fram."
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
