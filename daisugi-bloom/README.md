# Japanese Harmony — aktivt 7×7-fusionspussel

## Harmony Director 4.0 — Objective Intelligence & Adaptive Recovery (2026-10-25)

**Aktiverad automatiskt från nivå 10 och uppåt.** Nivå 1–9 använder fortsatt Pacing Director 3.0 och tidigare påbörjade spel behåller sin motor. Nya Director 4.0 analyserar riktiga träffmöjligheter på Daruma och Sealed Stones, känner igen delträffar som framsteg och föredrar försiktigt bättre lagliga brickpåfyllningar efter flera drag utan målframsteg. Inga extra drag, gratis träffar eller manipulerade poäng/stjärnor. Game Dev → Motorlab kan jämföra 3.1.1 och 4.0 med samma seed.

[Specifikation, gränser och regressionstester](docs/HARMONY_DIRECTOR_4_0.md).


## Goshuincho Level Card Rework 1.0 — 2026-10-25

Tre godkända kapitelbrickor (Sakura, Dimma och den mindre Daruma) finns nu som högupplösta separata WebP-bilder i GitHub (6.35.0). De ersätter de gamla runda, upprepade nivåmotiven. Varje nivå visar sin kapitelkonst med dynamiskt nivånummer och bara vid klarad nivå den befintliga japanska stjärnstämpeln. Ingen bild får tänjas ut eller hamna utanför kortet. Även kapitelminiatyren hämtar nu rätt bild. Sidindelningen 4+4+2, stjärnarkiv och speldata är oförändrade. Se [design och verifiering](docs/GOSHUINCHO_LEVEL_CARD_REWORK_1_0.md).


## Goshuincho Artwork Fidelity 1.0 — 2026-10-25

En korrigering i v6.34.1 hindrar fyrkantiga kapitel- och stjärnbilder från att tänjas ut i rektangulära hållare. Separata högupplösta illustrationer stöds redan, men de nio original-PNG:erna kunde inte exporteras från projektets bildbibliotek till GitHub i detta pass. Den tidigare 96px-AVIF-atlasen används därför fortfarande; faktisk pixelupplösning behöver uppgraderas innan bildskärpan är fullt återställd. Se [fidelity-status och överlämning](docs/GOSHUINCHO_ARTWORK_FIDELITY_1_0.md).


## Goshuincho Stamp Slot Polish 1.0 — 2026-10-25

Bokens första tre kapitel använder nu godkända illustrerade Sakura-/Dimma-/Daruma-bilder, och klarade nivåers bildrutor får kapitelbundna runda stämplar. De bruna stjärnpillren har ersatts av en mjukt avrundad plakett med **ett enda** japanskt sigill: 一星, 二星 eller 三星. Ett optimerat transparent 3×3-AVIF-ark (8,5 kB) innehåller de nio befintliga godkända illustrationerna. Nivå-/kapitelbilder och betyg går fortfarande att byta individuellt i `harmony/goshuincho.js`. Kapitelsigillet har en förberedd illustrerad hållare; ingen ny belöningsbild är påhittad. Textkontrast och markering av vald nivå förbättrad. Befintliga nivåer, låsningar, poäng, stjärnor och sparfiler är oförändrade. Läs [design och bildkarta](docs/GOSHUINCHO_STAMP_SLOT_POLISH_1_0.md).


## Goshuincho Pagination Rework 1.0 — 2026-10-25

Boken visar nu **4 + 4 + 2 stämplar per kapitel**, i ett rymligt 2×2-rutnät med större motivplatser. Detaljpanelen visas först vid nivåval (eller på sidan där en påbörjad/aktuell nivå finns). Sista kapitelsidan visar två nivåer och en tydlig sektion för kapitelprogression och kapitelsigill. Kapitel innehåller fortfarande tio nivåer; stjärnor, sparfiler, låsta nivåer, fortsatt spel och den vanliga nivålistan är helt oförändrade. Ingen ny bild behövs för att testa layouten. Läs [pagination-design och QA](docs/GOSHUINCHO_PAGINATION_REWORK_1_0.md).



## Goshuincho Level Select 2.0 — 2026-10-24

Väg B: **den vanliga nivålistan finns kvar** medan Goshuincho utvecklas till den framtida primära nivåkartan. Tryck på en stämpel i boken för att se nivånamn, mål, dragbudget, rekord och stjärnor, och starta sedan via en tydlig Spela-knapp. Påbörjade rundor visar Fortsätt och använder samma sparfil som huvudmenyn. Nästa nivå markeras; låsta nivåer är synliga men går inte att starta. Kapitelbläddring och befintliga tre separata bildplatser behålls. Ingen datarensning och ingen ekonomifunktion. Läs [Goshuincho Level Select 2.0](docs/GOSHUINCHO_LEVEL_SELECT_2_0.md).



## Goshuincho Collection 1.0 — 2026-10-24

Ny mobilanpassad samlarbok i huvudmenyn: en fiktiv, goshuincho-inspirerad resebok med kapitel om tio nivåer, en samlingsstämpel per klarad nivå, separata 1–3-stjärnorssigill och ett kapitelsigill när alla tio nivåerna är fullbordade. Stjärnor och stämplar räknas från befintliga sparade resultat. Ingen ny sparfil, valuta, mikrotransaktion eller nollställning. Grafikplatser för kapitel, nivåstämplar och stjärnornas sigill är separat ersättningsbara genom `harmony/goshuincho.js`. Funktion och mobil-QA finns i [dokumentationen](docs/GOSHUINCHO_COLLECTION_1_0.md).


## Daruma Awakening 1.0 — 2026-10-24

Nivå 21 introducerar Daruma med två ögon och en fast position. Fusioner intill eller Harmony Pulse ger en träff, dock högst ett öga per spelardrag. Efter andra träffen visas en fullbordad Daruma som sedan försvinner, och rutan fylls med vanliga brickor. Fler Daruma introduceras på nivå 23 och 26. Gamla påbörjade nivåer, stjärnor och rekord bevaras. Kompakt genomskinligt spriteatlas med tre versioner från våra skapade Daruma-bilder.

[Fullständig design och teknisk QA](docs/DARUMA_AWAKENING_1_0.md)


## Difficulty Floor 1.0 — 2026-10-24

Nivå 14 kunde tidigare klaras på två drag trots att nivå 13 var utmanande. Fyrmatchningsnivåerna 6 och 14 kräver nu fyrmatchningar under **fyra olika drag**, så en lyckosam kedja aldrig räknas som flera separata beslut. Även de alltför korta nivåerna 7 och 9 samt några andra icke-dim-mål har höjts försiktigt. Dimbanelayout och dragbudget är orörda. Redan påbörjade rundor behåller sina ursprungliga mål utan datarensning.

[Designbeslut och tester](docs/DIFFICULTY_FLOOR_1_0.md)


## Main Menu Premium Lift 1.0 — 2026-10-24

Huvudmenyn har fått en lugnare Midnight Garden-premiumkänsla med sakura-rosa, persiko-orange och guld. Toppfält, hero, kapitelruta, framstegsindikator och nivåkort har tydligare hierarki och bättre djup. Nästa upplåsta nivå har en subtil varm markering; redan klarade nivåer och låsta nivåer skiljs visuellt. Spelplan, regler, poäng, stjärnor och sparad progression är oförändrade.

[Design och verifiering](docs/MAIN_MENU_PREMIUM_LIFT_1_0.md)


## Victory Screen Accent Polish 1.1 — 2026-10-24

Resultatskärmen har fått Japanese Harmonys rosa/orange signaturpalett, med sakura-glöd bakom rubrik och stjärnor, persikofärgat ljus i bonuspoängkortet, varmare rekordbadge och varierande nyanser i statistikikonerna. Den mörka tealbasen och layouten från Victory Screen Polish 1.0 består. Ändringen påverkar **bara vinstskärmen**, inte poäng, stjärnor, sparningar, spelplan eller huvudsida.

[Design- och testbeslut](docs/VICTORY_SCREEN_ACCENT_POLISH_1_1.md)


## Victory Screen Polish 1.0 — 2026-10-24
Resultatrutan har fått större trestjärnig vinstsektion, ett samlat mål-/dragkort, en djupare bonuspoängpanel med rekordmarkering, fyra kompakta statistikfält och en alltid synlig "Nästa nivå"-knapp på mobil. Frivilliga bonusdrag, poäng, nivåframsteg och befintliga sparningar fungerar oförändrat.

[Design och QA](docs/VICTORY_SCREEN_POLISH_1_0.md)


## Harmony Pulse Mist Reach 1.0 — 2026-10-24

Harmony Pulse renar nu dimma på de fyra angränsande rutorna även när en ruta är tom efter fusion. Tomma rutor får aldrig en konstgjord uppgradering, bonuspoäng eller Pulse-träffräkning; det är bara dimman som tas bort. En ny visuell energistråle och mist-release-effekt visar vad som händer på tomma rutor. Sparade poäng, stjärnor och spelomgångar nollställs inte.

[Regler och regressionstester](docs/HARMONY_PULSE_MIST_REACH_1_0.md)

## Difficulty & Reward Calibration 1.0 — 2026-10-24

Nivå 1–5 förblir en introduktion. Några för lätta mål på nivå 6, 7 och 11–20 har höjts, medan dimnivåerna 13, 15, 17 och 19 får två extra drag var. Nya omgångar ger 1–3 stjärnor efter hur snabbt nivåmålet nås; poäng är fortfarande frivilliga rekord. Tidigare sparade betyg påverkas inte.

[Balansbeslut och testplan](docs/DIFFICULTY_REWARD_CALIBRATION_1_0.md)

## UI Cleanup & Premium Polish 1.0 — 2026-10-23

**Byggt i spelet:** UI:t är lugnare, kortare och mer konsekvent utan nya spelregler eller färre funktioner. `index.html` och `harmony/mobile-game.css` är omarbetade, med en liten pausmenyuppdatering i `harmony/app.js`.

- **Startsida:** kortare välkomsttext, diskretare chips och avsevärt mindre avstånd ned till nivålistan. Det tidigare felaktiga påståendet om fem familjer per nivå är borttaget.
- **Nivåval:** lättare nivåkort, fortsatt synliga stjärnor och poängrekord; 4 familjer under nivå 1–10 och 5 från nivå 11 visas i en kompakt informationsrad.
- **Spelmotor:** Director-valet ligger under det inbyggt tangentbordstillgängliga `Avancerat`-reglaget (`details/summary`), stängt från början. Valt läge sparas precis som tidigare.
- **Spel-HUD:** drag och poäng har enklare men fortfarande japansk/premium inramning. Director-fasens tekniska text är visuellt dold men finns kvar för tillgänglighet/diagnostik. Mål och stjärntrösklar är nedtonade och kompaktare.
- **Masterpiece Collection:** mindre konkurrerande panelram, bättre typografisk hierarki och oförändrade originalbilder/ikondimensioner.
- **Pausmeny:** Fortsätt spela står ut, omstart och nivåval är egna tydliga rader; hjälpen/inställningar och prestations-/utvecklarverktyg är två diskreta par. Samma knappar, ordning i DOM och klickbeteenden som tidigare.
- **Ingen ombalansering eller ny board-layout:** 7×7-board, sprite- och ikonstorlekar, matchregler, spelmotor, sparningar, poäng och animationssystem lämnas orörda. Board & Icon Readability 1.0 är ett separat kommande pass.

Mobiltestet kontrollerar nu att nivåvalet syns tidigare på 390px, att den avancerade motorn går att öppna, att pausknapparna fungerar på skärmen och att spelplanens prioritet samt mobilens fulla bredd bevaras.

## Art Recovery 6.8.2 — 2026-10-23

Åtgärdar ett verkligt rapporterat fel där hela spelplanen visade **emoji-fallbacks** (blå fisk, enkel lykta, blomma och solfjäder) i stället för de godkända detaljrika illustrationerna.

**Orsak:** Förra implementationen gjorde de nya Koi/Maneki-neko-bilderna beroende av lyckad laddning av äldre atlaser. Den hade heller ingen återhämtning om en atlas begärdes när mobilen hade tillfälligt dåligt nät. Bildtestet kontrollerade bakgrundsadress men inte att den färdiga illustrationen faktiskt syntes.

**Fix:** Fyra oberoende resurser (originalatlas, extraatlas, Koi stadium 1 och Maneki-neko stadium 1) laddas nu separat, med högst tre automatiska återförsök efter nätfel och särskild återhämtning när nätanslutningen kommer tillbaka. Vid återhämtning används exakt den framgångsrikt laddade adressen som CSS-bild, för att kringgå felaktigt cachade svar. De två nya stadium 1-bilderna visas när deras egna resurser laddats – **även om ingen av atlaserna är tillgänglig**. Annars behålls föregående atlasbild eller emoji som tillfällig fallback; ingen tom bricka.

Mobiltestet kontrollerar nu `display:block`, att emojin är dold och att båda atlaserna kan återhämta sig efter simulerade 4G-fel. Testet simulerar även att båda atlaserna är permanent otillgängliga för att verifiera att Koi och Maneki-neko ändå visas rätt.

## Stage 1 Art Refresh — Koi & Maneki-neko (2026-10-23)

Två nya transparenta spelarvalda ikoner ligger i `assets/koi-stage1.avif` och `assets/maneki-stage1.avif`.

- **Koi, stadium 1:** liten röd-vit fisk i glansigt turkost vatten, inte längre en rund plakett
- **Maneki-neko, stadium 1:** centrerad pärlvit katt-tass med rosa trampdynor, sakuradetaljer och guldkanter, utan tofs eller snöre
- Båda använder **riktig alfatransparens** (inte svart bakgrund), kontrollerad med avkodade kantpixlar i mobiltestet
- Bildfilerna har anpassats till 144×144 AVIF och visas med egna `sprite-stage1-` klasser. Alla andra föremål och stadium 2–5 behåller tidigare bildatlaser
- Spelets regler, Director, sparningar och poängsystem är helt oförändrade

## Visual Harmony VFX 2.0 — 2026-10-23

**Samlat visuellt poleringspass för alla återstående belöningsanimationer**, med Harmony Firework 1.1:s godkända guld/pearl/rosa Sakura-palett som gemensam referens. Alla spelmekaniker och befintliga familjeikoner är oförändrade.

- **Harmony Resonance:** De långsamma energitrådarna är nu pärlvita och champagneguld i stället för mintgröna, med subtil glittrande topp. Nya Echo-möjligheter får en varm ljuspuls utan extra otydligt blått.
- **Harmony Echo:** Kort kollapsande varm energitråd, tydligare guldig ring, pärlvit text och tre små matchande glints (rosa blomma, pärlvit diamant, guldstjärna).
- **Harmony Pulse:** Källringar, riktade energistrålar och träffarna använder varm guld/pearl. En enda begränsad trio glints för hela vågen, inte en explosion på varje mål.
- **Poäng/utveckling:** Flygande poängpiller, svanspartiklar, poängräknarens träffring och stadium-markeringen har samma gyllene sken, medan själva poängräkningen och banrörelsen är oförändrade.
- **Masterpiece/Collection:** Befintlig stora guldexplosion används oförändrad; collection-utmärkelsen och dess poängbonus får samma guldrim och tre diskreta glints.
- **Poppande text:** Endast de redan godkända händelserna Echo, Pulse och Masterpiece använder poppande ord. Blå/mintgröna textglöd har ersatts med eleganta varma variationer. Ingen extra vanlig matchtext har lagts till.
- **Kollision/inkomst:** Tillfälliga kontaktcirklar under alla objekt har en gyllene gemensam bas; objekten och deras animationer förblir identifierbara.

Nya accent-glints använder samma tre symboler som Firework 1.1, har egna längd-/partikelbegränsningar, skapas bara vid sällsynta händelser och tas bort automatiskt efter under en sekund. *Minska animationer* och OS-reducerad rörelse respekteras. Tester kontrollerar både den gemensamma CSS-paletten och Echo/Pulse i riktiga mobilomgångar.

Se [Visual Harmony VFX 2.0 – detaljer och QA](docs/JAPANESE_HARMONY_VISUAL_HARMONY_VFX_2_0.md).

## Harmony Firework VFX 1.1 — 2026-10-23

Efter speltest har den **ljusblå diamanten ersatts av pärlvitt med varm champagne-guldglöd**. Mini-fyrverkeriet behåller en rosa blomma och en tydligt guldig stjärna. Symbolerna är något större och den gyllene ringen, ljuspulsen och pop-rörelsen något tydligare, utan fler partiklar eller längre tunga animationer. Samma tillgänglighets- och mobilbegränsningar gäller.

## Harmony Firework VFX 1.0 — 2026-10-23

**Alla nio objektfamiljer delar nu samma premium-animation**, byggd på Sakuras tidigare rosa blomanimation men med varm guldglöd som huvudfärg. Varje vanlig fusion får en kort, liten gyllene ring, mjuk kärna och ett mini-fyrverkeri med **rosa blomma (✿), ljusblå diamant (◆) och guldstjärna (✦)**. Symbolerna får egen glow, poppar utåt, svävar och tonar bort.

Effekten har tre kontrollerade storlekar: **small** vid vanliga fusioner, **medium** vid större utveckling (stadium 4+ eller fyra-/femmatch), **masterpiece** vid faktisk Masterpiece-händelse. Kraftigare effekter varar något längre men täcker inte spelplanen. Samma Sakura-inspirerade evolution-glöd ersätter tidigare familjespecifika visuella overlays. Gamla fusion-intake-animationer, riktiga objektförflyttningar, poängflygning, Harmony Pulse/Echo, spelregler, sparningar och Director lämnas orörda.

På mobil och belastade enheter begränsas partiklarna; **Minska animationer** och OS-inställningen *reduced motion* stänger av nya animationerna helt. Regressionstester kontrollerar färgade symboler i riktiga fusioner och Masterpiece-händelser. Mer information: [Harmony Firework VFX 1.0](docs/JAPANESE_HARMONY_FIREWORK_VFX_1_0.md).

## Journey Balance 6.6 — 2026-10-23

**Mjukare övergång vid nivå 11:** Fyra familjer under de tio introduktionsnivåerna är betydligt mer belönande än fem. Spelarens verkliga rekord på nivå 11–14 (4 710 / 7 900 / 9 125 / 9 388 poäng) visade att 6.2:s stjärngränser (6 500 / 11 400 / 16 900 på nivå 11) var för höga när fem familjer introducerades.

Nivå 11 kräver nu **5 000 poäng för en stjärna**, **7 500 för två**, **11 250 för tre**. Nivå 12: 5 050 / 7 600 / 11 400. Kraven stiger gradvis till nivå 50 (7 250 / 12 000 / 17 800), och ännu högre nivåer har ett tak för att undvika omöjliga mål.

**Dina resultat räknas om automatiskt, utan att rekord eller upplåsta nivåer raderas.** Den observerade historiken motsvarar nu 1/2/2/2 stjärnor på nivå 11–14. Gamla vinster under det nya minimimålet behåller minst en stjärna.

**Director 3.0 mjukt förstärkt på nivå 11–20:** På nivå 11–15 jämför den fem vanliga påfyllningsförslag, eller sex efter minst tre drag utan utveckling. Nivå 16–20 får ett femte förslag endast efter tre stagnerade drag. Efter nivå 20 används åter fyra. Alla förslag hämtas ur den verkliga objektpåsen, ändrar inga redan existerande objekt och får inte lägga in gratis matchningar där basförslaget saknar sådana. Standard och Director 2.0 påverkas inte.

[Balansbeslut, exakt kurva och tester](docs/JAPANESE_HARMONY_JOURNEY_BALANCE_6_6.md).

## Family Progression 1.0 — 2026-10-23

**Fast nivåstruktur:** Nivå **1–10 använder fyra objektfamiljer** på den vanliga 7×7-spelplanen, med fyra större mästerverksikoner. **Från nivå 11 använder alla nya spel fem familjer**, där det blir mer att planera inför poängjakten. Alla nio föremålstyper fortsätter att rotera mellan nivåerna. Det manuella experimentvalet i nivåmenyn har ersatts med en tydlig informationsrad. Pacing Director 3.0 (inklusive 2.0) fungerar i båda delarna.

**Befintliga rekord och sparningar behålls.** Om du redan testat 4-familjsläget på nivå 1–10 behålls dina stjärnor och poäng. Tidigare 5-familjsresultat på introduktionsnivåerna förs in i den gemensamma visningen *om de är högre*, utan att originalhistoriken raderas. Från nivå 11 visas den ursprungliga femfamiljshistoriken. En påbörjad nivå med fem familjer fortsätter med exakt fem vid återupptagning, även om den är en introduktionsnivå.

Bakgrund: [Four Families Experiment 1.0](docs/JAPANESE_HARMONY_FOUR_FAMILIES_EXPERIMENT_1_0.md) jämförde 480 spelomgångar med 4 respektive 5 familjer. Fyrfamiljsversionen var mer belönande men gav mycket högre poäng och betydligt fler mästerverk. Därför använder vi fyra för introduktion och fem i Journey. Se [beslut och migrering](docs/JAPANESE_HARMONY_FAMILY_PROGRESSION_1_0.md).

## Harmony Pacing Director 3.0 — 2026-10-22

**Aktivt i spelet för nya omgångar.** Välj i nivåmenyn mellan **Harmony Pacing 3.0**, **Opportunity 2.0** och **Standard**. 3.0 **innehåller hela Opportunity 2.0** och varierar endast bedömningen av fyra normala påfyllningar utifrån de senaste dragens rytm och utveckling. På spelplanen finns en lågmäld fasetikett: BYGGER, FLOW, ANDRUM eller NYA MÖJLIGHETER.

Tiden mäts mellan **giltiga spelardrag efter animationsslut**, inte medan animationerna pågår. Paus, dold webbläsarflik och tidsintervall över 90 sekunder räknas inte som spelarsvårighet. Att tänka långsamt är inte ett misslyckande. Pacing-data är lokal, sparas som ett begränsat fönster av de åtta senaste dragen och återställs när en ny nivå startar. Director kan aldrig ändra existerande brickor, ge gratis fusioner, höja stadier, byta gravitationsriktning, ta extra drag eller garantera vinst.

[Designbeslut och testresultat](docs/JAPANESE_HARMONY_PACING_DIRECTOR_3_0.md). Motorlabbet har fyra motorlägen med syntetiskt dragtempo för reproducerbar jämförelse; det verkliga spelet använder uppmätt tid. GitHub Actions kör dessutom 480 simuleringar för A/B/C/D-jämförelsen.

## Score & Stars 6.2 — 2026-10-22

**Ny poängbalans från nivå 11:** Nivå 11 börjar på **6 500 poäng** i stället för 1 600. Kraven växer långsamt till cirka 7 850 vid nivå 50 och ökar därefter mycket försiktigt med ett övre tak för extremt höga nivånummer. Varje nivå har tre separata poänggränser: **1★ = minimimålet, 2★ = cirka 175 % och 3★ = cirka 260 % av minimimålet**. Stjärnornas exakta nivåkrav syns direkt ovanför spelplanen.

**Nivålistan** visar nu spelarens rekordpoäng under namnet på varje avklarad nivå, bredvid dess nya 1–3 stjärnor. Äldre rekord behålls exakt. Gamla score-nivåers stjärnor räknas om utifrån poängen, men en tidigare vunnen nivå behåller minst en stjärna och förblir upplåst. Inga vanliga spelfusioner, Masterpiece-bonusar eller Director-regler har förändrats.

Balansen baseras på fulla poängomgångar snarare än Engine Labbets förkortade tester. Ett reproducerbart CI-benchmark kör **330 hela omgångar med alla drag** i 11 nivåer och tre AI-strategier. Se [Score & Stars 6.2](docs/JAPANESE_HARMONY_SCORE_STARS_6_2.md).

## Opportunity Director 2.0 — 2026-10-22

Det nya opt-in-läget **Director 2.0** finns i Game Dev → Motorlabbet och kan jämföras med **Standard** och **Director 1.0** på exakt samma startfrön. Målet är att skapa meningsfulla utvecklingsmöjligheter runt redan investerade stadium 3–4-objekt, utan att ge spelaren gratismatchningar eller manipulera befintliga objekt. Efter flera drag utan betydelsefull utveckling prioriterar 2.0 försiktigt nya möjligheter. Den använder samma objektpåse, fyra möjliga påfyllningar och separata förgrenade RNG-strömmar. **Vanliga spelet kör fortfarande Standard** tills tester och spelkänsla motiverar något annat.

[Utvecklingsspecifikation och testplan](docs/JAPANESE_HARMONY_OPPORTUNITY_DIRECTOR_2_0.md). Ett reproducerbart test över 480 spel med Standard/Director 1.0/Director 2.0 körs via GitHub Actions och lämnar en fullständig JSON-rapport.

## Smart Directed Move Hint 1.2 — 2026-10-22

När spelaren inte interagerat med spelplanen på **60 sekunder** räknar `HarmonyRules.bestHint(game)` fram det mest belönande draget bland samtliga tillåtna byten. Motorn förhandsberäknar poäng, måluppfyllelse, utveckling till högre stadier, Masterpieces, Harmony Echo och Harmony Pulse på **separata kopior av spelet** och ändrar aldrig den riktiga spelplanen. Brickan som ska flyttas lyser starkt guld, medan destinationen pulserar mjukare mintvitt. Lika bra alternativ prioriterar en lägre utvecklad bricka som källa. Ledtråden är gratis, förbrukar inga drag och försvinner vid nästa interaktion. Den pausas under animationer, menyer och inaktiv flik. **Minska animationer** visar ett statiskt sken.

## Endless Journey & Masterpiece Collection 1.0 — 2026-10-22

**Nivå 1–10** introducerar fusioner och Harmony Pulse. Från **nivå 11** räcker ett tydligt poängmål inom draggränsen; stjärnorna baseras på poäng. Nivå 11–50 är genererade som första balanserbara svårighetskurva. Samma generator stöder även alla högre nivånummer utan att skapa separata quest-definitioner. Nivåväljaren visar 20 åt gången.

**Masterpiece Collection:** Spelplanens fem aktuella familjer visas under brädet med sina faktiska stadium 5-bilder. Varje mästerverk ökar den egna familjens **obegränsade heltalsräknare** (0, 1, 2 …), aldrig 0/5. Ikonen visas fritt utan ring eller bakgrundsplatta. En liten rund heltalsräknare ligger ovanpå ikonens nedre vänstra hörn och pulserar när ett nytt mästerverk samlas. Varje mästerverk ger en egen växande, men begränsad, bonus utöver Harmony-poäng. Räkning, bonusar och poäng bevaras i sparfilen under omgången och återställs vid en ny nivå.

**Introduktionsbalans:** Nivå 6 kräver ett lyktmästerverk; nivå 9 två mästerverk totalt (inte längre ett specifikt slumpkänsligt simultant kedjemönster). Kärnfusionsreglerna och befintliga bilder är oförändrade. Båda tidigare felen dokumenterades i [spelgranskningen](docs/JAPANESE_HARMONY_GAME_AUDIT_20261022.md).

[Detaljer, kontroller och testplan](docs/JAPANESE_HARMONY_ENDLESS_JOURNEY_1_0.md).

**Spela:** https://hajjen-game.github.io/Hajjen/daisugi-bloom/

**Nuvarande spel:** Tio nivåer, fem aktiva objektfamiljer per nivå (roteras mellan de nio familjerna Sakura, Lykta, Koi, Solfjäder, Bonsai, Sushi, Maneki-neko, Origami och Ryu). Samtliga nio har fem utvecklingsstadier. Gemensamma regler för 3/4/5/T/L-fusioner, Harmony Resonance/Echo, Harmony Pulse och mästerverk. Nivå 8 har målet **Garden in Bloom: fem föremål till stadium 3**. Historiska texter längre ned dokumenterar äldre Daisugi-versioner och ska inte läsas som aktuell status.

**Senaste spelrevisionen och identifierade kontrollpunkter:** [Japanese Harmony — Full Game Audit (2026-10-22)](docs/JAPANESE_HARMONY_GAME_AUDIT_20261022.md). Denna rapport skiljer bekräftad funktion från kvarstående balans-/designproblem. Inga nya nivåer bör införas innan nivå 6 och 9 har granskats spelmässigt.

**Prestandapass 2.0.2 (2026-10-21):** Alla 49 spelrutor återanvänds nu i DOM i stället för att skapas om vid varje animation; endast förändrade bildpositioner uppdateras. Matchnings-/puls-/nedfallspauserna är kortare, live-`drop-shadow` på samtliga ikoner har tagits bort och Harmony Chain-meddelandet är mindre och försvinner automatiskt. Inställningen för sifferetiketter på alla bilder är borttagen; stadium kan läsas när man markerar ett föremål. CI testar en riktig mobilmatchning och att DOM-rutorna behålls.

**Speldesign & grafisk standard:** [Japanese Harmony GDD 2.0](docs/JAPANESE_HARMONY_PUZZLE_GDD_2_0.md) · [Color & Art Bible 1.0](docs/JAPANESE_HARMONY_COLOR_BIBLE_1_0.md)

## Historik: Daisugi Bloom 1.3.2

Texten nedan beskriver den äldre botaniska prototypen och inte längre spelet som laddas via `daisugi-bloom/index.html`.

## Senaste utvecklingspass

**Plant Readability Fix 1.3.2** – rättvända växtbilder, skarpare texturfiltrering, verklig hög-DPI-rendering på mobilen och en större spelplan med mindre marginaler. Alla spelregler, bildfamiljer och permanent träd är oförändrade.

[Utvecklingslogg och testplan för 1.3.2](docs/PLANT_READABILITY_FIX_1_3_2.md)

## Tidigare utvecklingspass

# Plant Art Integration 1.3

## Senaste utvecklingspass

**Plant Art Integration 1.3** – alla 20 japanskt inspirerade växtbilder från Sakura, Verdant, Mistbloom och Sunleaf används nu i den spelbara 7×7-vyn. Bildparen optimerades till fyra transparenta WebP-atlaser. Babylon hanterar fortsatt rörelse, fusioner, Bloom Pulse och Tree Celebration. Daisugi-trädet mellan nivåerna är fortfarande riktig 3D.

**Plant Art Lab:** från startsidan eller [direkt via ?lab=plants](https://hajjen-game.github.io/Hajjen/daisugi-bloom/?lab=plants) kan alla 20 stadier jämföras och utvecklingen spelas upp.

[Fullständig integrationslogg och källbildsmappning](docs/PLANT_ART_INTEGRATION_1_3.md)

## Tidigare utvecklingspass

**UI, Score & Tree Celebration 1.2** – nytt färgstarkt japanskt inspirerat gränssnitt, live-poäng och nivårekord, flytande kombopoäng samt ett tydligt firande innan trädets Bloom Pulse och skörd. Fyra mer särskiljbara grundfragment.

[Beslut, arbetsbalans och testplan för 1.2](docs/UI_SCORE_TREE_1_2.md)

## Tidigare utvecklingspass

**Visual & Gameplay Overhaul 1.1** – större, tydligare procedurala 3D-växter; varm jord istället för vita Excel-rutor; mer livfulla växtfusioner, gröna Bloom Pulse-vågor och en bättre daisugi-silhuett. De fem introduktionsnivåerna är nu riktiga flerdragsutmaningar snarare än färdiga endragsdemos.

[Ändringslogg och testplan för Overhaul 1.1](docs/OVERHAUL_1_1.md)

Ett **fristående, mobilfokuserat 7×7 match-3-spel** med levande 3D-växter, Nature Cascades, Bloom Pulse och ett permanent Daisugi-träd. Spelet är en separat prototyp och ändrar inte Wildpath eller de andra spelen.

## Spela

- **GitHub Pages (förväntad adress när Pages-publiceringen är aktiv):** https://hajjen-game.github.io/Hajjen/daisugi-bloom/
- **Repo:** https://github.com/Hajjen-Game/Hajjen/tree/main/daisugi-bloom
- **Lokal körning:** starta en statisk HTTP-server i repots rot, exempelvis:
  `python3 -m http.server 8000`
  Öppna sedan http://localhost:8000/daisugi-bloom/

Babylon.js hämtas från CDN vid start, vilket kräver internetanslutning. Ingen paketering eller byggprocess krävs.

## Första spelbara versionen

- 7×7-bräde med fyra naturfamiljer och fem växtstadier.
- Swap via svep eller genom att markera två grannar; ogiltiga drag kostar ingenting.
- En matchad grupp fusioneras; högsta stadiet överlever och växer ett steg.
- Färdiga träd skickar mjuka gröna Bloom Pulses i fyra riktningar. Grannar utvecklas maximalt ett steg per pulskedja.
- Träd skördas till livskraft. Bara frön faller in från toppen; automatiska matcher kan bilda Nature Cascades.
- Naturenergi och **gratis Power Move**: välj fröfamilj och ersätt en ruta, med möjlighet att skapa match direkt.
- Fem lärnivåer, draggränser, stjärnbetyg och sparad progression.
- Egen 3D-vy för ett enda permanent Daisugi-träd. Intjänad livskraft behålls när kosmetiskt utseende ändras.
- Inställningar för synliga stadier, ljud och reducerade animationer.

### Kontroll

**Mobil:** dra en växt till en granne eller tryck först på en växt och sedan på en granne. **Dator:** klicka två grannar eller dra. Välj Power Move i panelen under brädet. Klicka på en utvecklad växt för att se dess stadium; placering av Power Move ovanpå en utvecklad växt kräver bekräftelse.

### Kodstruktur

| Fil | Ansvar |
|---|---|
| `index.html` | HUD, nivåmeny, trädvy, inställningar och resultatrutor |
| `styles.css` | Responsiv mobilpresentation |
| `src/rules.js` | Ren spelmekanik: generation, matcher, fusion, pulser, tyngdkraft, poäng och fem nivåer |
| `src/visuals.js` | Babylon 3D-växter, ljus, spelplan, animationer och permanent träd |
| `src/app.js` | Kontroller, ljud, UI, sparning och nivåflöde |
| `tests/rules.test.cjs` | Logiska regressionskontroller utan externa beroenden |
| `docs/DAISUGI_BLOOM_GDD_1_0.md` | Överenskommen speldesign och uppdelning mellan låst/öppet |
| `docs/FIRST_PLAYABLE_1_0.md` | Prototypens antaganden, testplan och återstående arbete |

Kör regeltesterna från reporoten:

```bash
node daisugi-bloom/tests/rules.test.cjs
```

## Viktig avgränsning

Det här är **First Playable**, inte ett slutpolerat spel. Fem nivåer, 3D-växter och kedjereaktioner kan speltestas, men balans, mer avancerade tillväxtövergångar, ytterligare nivåer och kosmetik behöver utvecklas utifrån feedback. Den befintliga GDD-filen är fortsatt beslutsunderlag. Prototypregler har dokumenterats separat, inte i efterhand presenterats som låsta användarbeslut.

## Fortsättning i en ny chatt

1. Läs `docs/DAISUGI_BLOOM_GDD_1_0.md` och `docs/FIRST_PLAYABLE_1_0.md`.
2. Jämför senaste testfeedback med **LÅST** och **ARBETSREGLER**.
3. Kontrollera den spelbara prototypen och kör tester innan justeringar.
4. Håll allt under `daisugi-bloom/` för att inte påverka andra spel.
5. Uppdatera design- och implementationslogg efter varje nytt pass.
