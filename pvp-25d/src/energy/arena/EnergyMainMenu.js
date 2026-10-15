import {ROLES} from "../abilityCatalog.js?v=20261015-eclipse1";
import { EnergyJourneyRoadmap } from "./EnergyJourneyRoadmap.js?v=20261015-eclipse1";
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
    "tip": "Målet är att varje Stage ska kännas annorlunda – utan att varje match måste ha en helt ny boss.",
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
        "Öppna Journey Roadmap, välj nästa tillgängliga Stage och tryck Play för att starta Planet Defense."
      ],
      [
        "MARKERADE SEGRAR",
        "En Stage får en grön bock när du klarat den för första gången. Då öppnas nästa steg."
      ],
      [
        "NYTT INNEHÅLL",
        "Längs vägen öppnas fler spell-val. Framtida milstolpar visar också AI Styles, Evolutions och nya utmaningar."
      ]
    ],
    "tip": "Genesis, Impact och Eclipse får klass-spells vid Stage 3, 6, 9 och 12. Du kan inte hoppa över Stages.",
    "art": "journey",
    "caption": "Hexagonerna visar din resa. Grönt betyder avklarat; nästa Stage är markerad."
  },
  {
    "title": "UPPTÄCK OCH BYGG SPELLS",
    "chapter": "06 / EVOLUTION TREE",
    "intro": "Genesis, Impact och Eclipse har sex klassunika spells var: två från start och fyra som låses upp längs Stage-kartan.",
    "steps": [
      [
        "LYSANDE SPELLS",
        "Efter en vinst lyser de tillgängliga spellsen upp i Evolution Tree. Klicka på dem för att läsa vad de gör."
      ],
      [
        "VÄLJ EN PERMANENT",
        "Bekräfta valet i Selected Spell-panelen. Genesis, Impact och Eclipse får en ny klass-spell vid Stage 3, 6, 9 och 12."
      ],
      [
        "SKAPA DIN BUILD",
        "Varje Origin använder sex klass-spells. De första fyra har Evolutions; spell 5 och 6 är egna färdigheter utan extra Evolution-val."
      ]
    ],
    "tip": "Spell-valen är klassbundna för Genesis, Impact och Eclipse. Crystal Bolt behåller sin signaturanimation. Cross-class Synergies är pausade.",
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
        "STAGE 10 · EVOLUTIONS",
        "När du klarar Stage 10 får du välja din första Evolution. Fler platser öppnas efter Stage 12, 14, 16 och 20. Inga spell ranks behövs."
      ],
      [
        "BUILD PRESETS",
        "Du kan spara och återvända till olika spell-kombinationer i HUB. Du behöver inte bygga allt från början varje gång."
      ]
    ],
    "tip": "Välj en Evolution per spell. Valet sparas per Origin och fungerar i strid när spellen är utrustad. Du kan ändra valet kostnadsfritt.",
    "art": "evolutions",
    "caption": "Tre Evolution-vägar per spell. Val blir spelbara från Stage 10 och ger nya effekter i strid."
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
        "STAGE 5 · SPELBART",
        "Efter Stage 5 kan du välja Balanced, Aggressive, Protective eller Disruptive direkt i kompanjonens HUB-kort. Spelstilen ändrar deras beslut i strid."
      ],
      [
        "STAGE 15 · PLANERAT",
        "AI Builds ska ge möjlighet att anpassa deras spells. Färdiga builds ska fungera även om du inte vill ändra något."
      ]
    ],
    "tip": "AI-kompisarna får inga egna Journey-kartor. Deras inställningar låses upp på din Origins resa.",
    "art": "companions",
    "caption": "Du i centrum av striden; två självständiga AI-kompisar som du senare kan forma."
  },
  {
    "title": "VÄGEN IN I RIFT",
    "chapter": "10 / EXPEDITION OCH FRAMTIDEN",
    "intro": "Project Energy byggs fortfarande. Målet är att spelet ska vara enkelt att komma in i, fullt av färgstarka spells och djupt nog för att du ska vilja experimentera länge.",
    "steps": [
      [
        "STAGE 20 · RIFT EXPEDITION",
        "Efter Stage 20 kan du testa The Echoing Rift, en egen expedition med fem sammanhängande områden, portaler och en slutboss. Den skiljer sig från Planet Defense."
      ],
      [
        "FORTFARANDE UNDER UTVECKLING",
        "Rift Expedition 1.0 har en spelbar väg och strider men ännu inga permanenta belöningar. Synergies, fler miljöer och mer avancerade mekaniker kommer senare."
      ],
      [
        "DIN UPPLEVELSE",
        "Testa olika Origins, prova oväntade spell-kombinationer och berätta gärna vad som är kul – eller borde bli bättre."
      ]
    ],
    "tip": "Med Game Dev och en DEV Test Origin kan du prova den första Rift Expedition direkt utan att behöva spela om hela Journey.",
    "art": "future",
    "caption": "The Echoing Rift har öppnats i en första spelbar version. Synergies och fler expeditioner kommer senare."
  }
];
function artMarkup(name){
  const orb=(theme,extra="")=>
    '<span class="bk-orb bk-orb--'+theme+' '+extra+'" aria-hidden="true"><i></i></span>';
  const tag=(label,type="")=>'<span class="bk-tag '+type+'">'+label+'</span>';
  switch(name){
    case "vision":return '<div class="bk-art bk-vision">'+
      '<div class="bk-art-kicker">A LIVING ENERGY WORLD</div>'+
      '<div class="bk-stars bk-stars-a"></div>'+
      '<div class="bk-vision-line"></div>'+
      '<div class="bk-vision-actors">'+
        '<div class="bk-vision-unit">'+orb("vital")+'<small>AI · GENESIS</small></div>'+
        '<div class="bk-vision-unit main">'+orb("cryo")+'<strong>DIN ORIGIN</strong></div>'+
        '<div class="bk-vision-unit">'+orb("kinetic")+'<small>AI · IMPACT</small></div>'+
      '</div><div class="bk-vision-enemies"><i></i><i></i><i></i><i></i><i></i></div>'+
      '<div class="bk-art-footer">3 ENERGY ORBS <b>·</b> REAL-TIME PVE</div></div>';
    case "origins":return '<div class="bk-art bk-origins">'+
      [
        ["vital","GENESIS","VITAL","PULSE MEND","RESONANCE GUARD"],
        ["kinetic","IMPACT","KINETIC","PHASE RUSH","ARC STRIKE"],
        ["cryo","ECLIPSE","CRYO","CRYSTAL BOLT","CRYSTAL SNARE"],
        ["solar","SOLAR","SUNFIRE","FLUX BOLT","SUN LANCE"]
      ].map(role=>'<div class="bk-origin-card bk-origin-card--'+role[0]+'">'+
        orb(role[0])+'<strong>'+role[1]+'</strong><em>'+role[2]+'</em>'+
        '<span class="bk-origin-abilities">'+role[3]+'<b>+</b>'+role[4]+'</span></div>'
      ).join("")+
      '<div class="bk-art-footer">TWO BOUND SPELLS <b>·</b> ONE DISCIPLINE</div></div>';
    case "combat":return '<div class="bk-art bk-combat">'+
      '<div class="bk-battle-header"><span>YOU <b>100%</b></span><span>WAVE 03 / 05</span><span>ENEMY <b>62%</b></span></div>'+
      '<div class="bk-battle-zone">'+
        '<span class="bk-battle-cover left"></span><span class="bk-battle-cover right"></span>'+
        '<div class="bk-fighter bk-fighter-a">'+orb("vital")+'</div>'+
        '<div class="bk-fighter bk-fighter-b">'+orb("cryo")+'</div>'+
        '<div class="bk-fighter bk-fighter-c">'+orb("kinetic")+'</div>'+
        '<div class="bk-fighter bk-fighter-enemy">◆</div>'+
        '<div class="bk-battle-cast"></div>'+
      '</div><div class="bk-combat-hotkeys">'+
        tag("W A S D · MOVE")+tag("1 – 0 · SPELLS")+tag("TAB · TARGET")+
      '</div><div class="bk-art-footer">THINK FAST <b>·</b> FIGHT AS A TEAM</div></div>';
    case "waves":return '<div class="bk-art bk-waves">'+
      '<div class="bk-art-kicker">PLANET DEFENSE · 5 WAVES</div>'+
      '<div class="bk-wave-row">'+Array.from({length:5},(_,i)=>
        '<div class="bk-wave-hex '+(i===2?"current":"")+'">'+
        '<small>VÅG</small><strong>0'+(i+1)+'</strong></div>').join("")+'</div>'+
      '<div class="bk-wave-arena"><div class="bk-wave-squad">'+
        orb("cryo")+orb("vital")+orb("kinetic")+
        '</div><div class="bk-wave-burst">✧</div>'+
        '<div class="bk-wave-hostiles">'+Array.from({length:11},(_,i)=>
          '<span class="bk-threat '+(i%4===0?"large":"")+'">◆</span>').join("")+
        '</div></div>'+
      '<div class="bk-wave-pause">'+tag("OVERCHARGE AFTER EACH PAUSE","bright")+
        '<span>CHOOSE 1 OF 4</span></div></div>';
    case "journey":return '<div class="bk-art bk-journey">'+
      '<div class="bk-art-kicker">YOUR CAMPAIGN · 20 STAGES</div>'+
      '<div class="bk-hex-map">'+Array.from({length:20},(_,i)=>{
        const step=i+1,state=i<2?"done":i===2?"next":"locked";
        const label=step===3?"COUNTER":step===5?"AI":step===10?"EVO":step===15?"BUILD":step===20?"RIFT":"";
        return '<div class="bk-hex-cell '+state+'"><span>'+
          (i<2?"✓":String(step).padStart(2,"0"))+'</span>'+
          (label?'<small>'+label+'</small>':"")+'</div>';
      }).join("")+'</div>'+
      '<div class="bk-journey-legend">'+tag("✓ KLAR","done")+tag("NÄSTA STAGE","bright")+tag("LÅST")+'</div>'+
      '<div class="bk-art-footer">NO LEVELS <b>·</b> EVERY FIRST CLEAR COUNTS</div></div>';
    case "spells":return '<div class="bk-art bk-spells">'+
      '<div class="bk-art-kicker">FIVE DISCIPLINES · ONE DISCOVERY</div>'+
      '<div class="bk-discovery-stage">'+orb("cryo","bk-discovery-hero")+
      [
        ["void","ENTROPY MARK"],["solar","SUN LANCE"],["cryo","FRACTURE SPEAR"],
        ["kinetic","VECTOR RUSH"],["vital","REACTIVE THREAD"]
      ].map((a,i)=>'<div class="bk-discover-node bk-discover-node-'+(i+1)+' '+a[0]+'">'+
        '<span>✦</span><strong>'+a[1]+'</strong></div>').join("")+
      '</div><div class="bk-selected-preview">'+
        '<span>SELECTED SPELL</span><strong>FRACTURE SPEAR</strong>'+
        '<span class="bk-preview-button">✧ DISCOVER THIS SPELL</span>'+
      '</div><div class="bk-art-footer">2 BOUND + UP TO 8 SHARED SPELLS</div></div>';
    case "overcharges":return '<div class="bk-art bk-overcharges">'+
      '<div class="bk-art-kicker">WAVE COMPLETE · CHOOSE ONE</div>'+
      '<div class="bk-overcharge-grid">'+
      [
        ["you","YOU · ECLIPSE","COMET RAIN","EXTRA IMPACTS"],
        ["you","YOU · ECLIPSE","RIME CASCADE","CRYO BURSTS"],
        ["vital","AI · GENESIS","LIVING BLOOM","HEALING PULSES"],
        ["kinetic","AI · IMPACT","ARC TEMPEST","KINETIC CHAINS"]
      ].map((a,i)=>'<div class="bk-overcharge-card '+a[0]+(i===0?" highlighted":"")+'">'+
        '<small>'+a[1]+'</small><div class="bk-overcharge-sigil">✦</div>'+
        '<strong>'+a[2]+'</strong><span>'+a[3]+'</span></div>').join("")+
      '</div><div class="bk-overcharge-bottom">'+
      tag("ONE CHOICE","bright")+tag("RUN ONLY")+tag("FOUR WAVE BREAKS")+
      '</div></div>';
    case "evolutions":return '<div class="bk-art bk-evolutions">'+
      '<div class="bk-art-kicker">CRYSTAL BOLT · THREE FUTURE PATHS</div>'+
      '<div class="bk-evo-source"><span>❖</span><strong>CRYSTAL BOLT</strong></div>'+
      '<div class="bk-evo-connectors"><i></i><i></i><i></i></div>'+
      '<div class="bk-evo-options">'+[
        ["RAPID CRYSTAL","QUICKER CAST"],
        ["GLACIAL ECHO","SECOND PROJECTILE"],
        ["BRITTLE CORE","AMPLIFIED HIT"]
      ].map(item=>'<div class="bk-evo-option"><span>◇</span><strong>'+item[0]+
        '</strong><small>'+item[1]+'</small><em>UNLOCKS AT STAGE 10</em></div>').join("")+
      '</div><div class="bk-art-footer">EXPLORE NOW <b>·</b> UNLOCK LATER</div></div>';
    case "companions":return '<div class="bk-art bk-companions">'+
      '<div class="bk-art-kicker">TWO AI COMPANIONS · ONE JOURNEY</div>'+
      '<div class="bk-companion-row">'+[
        ["vital","GENESIS","SUPPORT","VITAL / SOLAR"],
        ["kinetic","IMPACT","MELEE","KINETIC / VOID"]
      ].map(item=>'<div class="bk-companion-card">'+
        '<small>AI COMPANION</small>'+orb(item[0])+
        '<strong>'+item[1]+'</strong><span>'+item[2]+' · '+item[3]+'</span>'+
        '<div class="bk-companion-locks">'+tag("STYLE · 5")+tag("BUILD · 15")+'</div></div>').join("")+
      '</div><div class="bk-art-footer">THEIR CONFIGURATION · YOUR MILESTONES</div></div>';
    case "future":return '<div class="bk-art bk-future">'+
      '<div class="bk-art-kicker">THE JOURNEY CONTINUES</div>'+
      '<div class="bk-future-scene"><div class="bk-future-ring bk-future-ring-1"></div>'+
        '<div class="bk-future-ring bk-future-ring-2"></div>'+
        '<div class="bk-future-vortex">✧</div>'+
        '<span class="bk-future-badge">STAGE 20</span>'+
      '</div><div class="bk-future-content"><strong>RIFT EXPEDITION</strong>'+
        '<span>SYNERGIES · NEW PVE CHALLENGES</span></div>'+
      '<div class="bk-art-footer">IN DEVELOPMENT <b>·</b> MORE TO DISCOVER</div></div>';
    default:return '<div class="bk-art bk-vision">'+orb("cryo")+'</div>';
  }
}
export class EnergyMainMenu{
  constructor({openHub,startMatch,changeMode,getCharacter,hideHub,onMenuFromCombat,
    getOrigins,selectOrigin,createOrigin,getOriginLevel,getJourney,
    getDevOrigin,createDevOrigin,activateDevOrigin,playDevStage,isDevOrigin,
    playRift}){
    this.openHub=openHub;this.startMatch=startMatch;
    this.changeMode=changeMode;this.getCharacter=getCharacter;
    this.hideHub=hideHub;this.onMenuFromCombat=onMenuFromCombat;
    this.getOrigins=getOrigins;this.selectOrigin=selectOrigin;
    this.createOrigin=createOrigin;this.getOriginLevel=getOriginLevel;
    this.getJourney=getJourney;
    this.getDevOrigin=getDevOrigin;this.createDevOrigin=createDevOrigin;
    this.activateDevOrigin=activateDevOrigin;this.playDevStage=playDevStage;
    this.isDevOrigin=isDevOrigin;this.playRift=playRift;
    this.page=0;this.previousFocus=null;
    // Play opens the one player Journey. No XP or old mixed-mode wins count
    // as campaign clears until the true first-clear schema is implemented.
    this.journey=new EnergyJourneyRoadmap({
      map:$("hub-journey-map"),detail:$("hub-journey-detail"),
      summary:$("hub-journey-summary"),
      onSelect:hex=>{
        const button=$("play-journey-start");
        button.disabled=false;
        button.textContent=(this.journey.allowReplay&&hex.step<=this.journey.clears?
          "PLAY STAGE AGAIN · STAGE ":"PLAY · STAGE ")+
          String(hex.step).padStart(2,"0")+" →";
      }
    });
    $("menu-new-origin").addEventListener("click",()=>this.createNew());
    $("menu-resume").addEventListener("click",()=>this.openResume());
    $("menu-about").addEventListener("click",()=>this.openGuide());
    $("menu-game-dev").addEventListener("click",()=>this.openGameDev());
    $("roster-create-origin").addEventListener("click",()=>this.createNew());
    $("roster-back").addEventListener("click",()=>this.open());
    $("game-dev-back").addEventListener("click",()=>this.open());
    const devStage=$("game-dev-stage-select");
    for(let stage=1;stage<=20;stage++){
      const option=document.createElement("option");
      option.value=String(stage);
      option.textContent="STAGE "+String(stage).padStart(2,"0");
      devStage.append(option);
    }
    devStage.value="20";
    $("game-dev-create-origin").addEventListener("click",()=>{
      try{
        if(this.getDevOrigin()&&!window.confirm(
          "Reset your existing DEV Test Origin? Its spell build, AI Styles and saved presets will be replaced. Your normal Origins are safe."))return;
        this.createDevOrigin($("game-dev-origin-role").value);
        this.enterHub();
      }catch(error){$("game-dev-origin-status").textContent=error.message||"Could not create test Origin.";}
    });
    $("game-dev-play-rift").addEventListener("click",()=>{
      if(!this.getDevOrigin())return;
      this.activateDevOrigin();
      this.hideScreens();
      this.playRift();
    });
    $("game-dev-open-origin").addEventListener("click",()=>{
      if(!this.getDevOrigin())return;
      this.activateDevOrigin();this.enterHub();
    });
    $("game-dev-play-stage").addEventListener("click",()=>{
      if(!this.getDevOrigin())return;
      const stage=Number(devStage.value);
      if(!Number.isInteger(stage)||stage<1||stage>20)return;
      this.hideScreens();
      this.playDevStage(stage);
    });
    $("play-back-hub").addEventListener("click",()=>this.enterHub());
    $("play-rift-expedition").addEventListener("click",()=>{
      if($("play-rift-expedition").disabled||!this.getCharacter())return;
      this.hideScreens();
      this.playRift();
    });
    $("main-menu-open").addEventListener("click",()=>this.onMenuFromCombat());
    $("play-journey-start").addEventListener("click",()=>{
      if($("play-journey-start").disabled||!this.journey.armed||!this.getCharacter())return;
      const stage=this.journey.selected;
      // Replay is available only while the DEV Origin is the active character.
      // Ordinary Origins cannot use this UI to skip or farm Journey Stages.
      if(this.journey.allowReplay&&stage<=this.journey.clears){
        if(!this.isDevOrigin?.())return;
        this.hideScreens();
        this.playDevStage(stage);
        return;
      }
      this.changeMode("defense");
      this.hideScreens();
      this.startMatch("defense");
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
      subtitle.textContent=entry.character.origin+" · "+(entry.devTest?"DEV TEST · ":"")+
        (entry.progression.journey?.version===2?
          (entry.progression.journey.clears||0)+"/20 STAGES":
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
    this.journey.setOriginRole(this.getCharacter()?.role||null);
    this.journey.clears=Math.min(20,journey?.clears||0);
    this.journey.tracked=Boolean(journey);
    this.journey.allowReplay=Boolean(journey&&this.isDevOrigin?.());
    this.journey.replayStage=this.journey.allowReplay?
      this.getDevOrigin?.()?.progression?.devStage||20:20;
    this.hideHub();
    this.hideScreens();
    $("hub-play-screen").hidden=false;
    $("main-menu-open").hidden=false;
    const start=$("play-journey-start");
    start.disabled=true;
    start.textContent=this.journey.allowReplay?
      "SELECT A CLEARED STAGE TO REPLAY":"SELECT NEXT STAGE TO PLAY";
    this.journey.resetSelection();
    const rift=$("play-rift-expedition");
    const unlocked=Boolean(journey?.clears>=20);
    rift.disabled=!unlocked;
    rift.textContent=unlocked?"ENTER THE ECHOING RIFT →":"UNLOCKS AT STAGE 20";
  }
  renderDevStatus(){
    const dev=this.getDevOrigin?.();
    $("game-dev-open-origin").disabled=!dev;
    $("game-dev-play-stage").disabled=!dev;
    $("game-dev-play-rift").disabled=!dev;
    const status=$("game-dev-origin-status");
    if(!dev){
      status.textContent="No test Origin created. Choose an Origin above, then create one.";
      return;
    }
    status.textContent=dev.character.name+" · 20/20 STAGES · "+
      (["healer","melee","caster","solar"].includes(dev.character.role)?"ALL 6 "+ROLES[dev.character.role].name.toUpperCase()+" CLASS SPELLS":"ALL 16 SHARED SPELLS")+" · "+
      "AI STYLES UNLOCKED · SAVED SEPARATELY. Choose any Stage to replay it with the full toolkit.";
    $("game-dev-stage-select").value=String(dev.progression.devStage||20);
    $("game-dev-origin-role").value=dev.character.role;
  }
  openGameDev(){
    this.hideHub();
    this.hideScreens();
    $("game-dev-screen").hidden=false;
    $("main-menu-open").hidden=false;
    this.renderDevStatus();
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
