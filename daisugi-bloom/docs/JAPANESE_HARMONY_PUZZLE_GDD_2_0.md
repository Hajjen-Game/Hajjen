# Japanese Harmony Puzzle — Game Design Document 2.0

**Datum:** 21 oktober 2026  
**Status:** Ny japanskinspirerad pusseldesign; **ingen programmering eller bildgenerering beställd eller genomförd** inom detta designpass.  
**Arbetsnamn:** Japanese Harmony Puzzle. Slutligt spelnamn ej beslutat.  
**Historik:** Bygger vidare på principerna i Daisugi Bloom, men är en **ny designinriktning**. Den gamla spelbara `daisugi-bloom/`-versionen, dess Power Move, naturenergi, Bloom Pulse och permanenta Daisugi-träd hör till den äldre 1.x-prototypen och ska inte tyst blandas in här.

> **Obligatorisk visuell standard för ALL framtida grafik:** [Japanese Harmony — Midnight Garden · Color & Art Bible 1.0](JAPANESE_HARMONY_COLOR_BIBLE_1_0.md) (`JH-COLOR-1.0`). Läs den först och följ samtliga HEX-ankare, transparenskrav, 7×7-rutplacering och familjestil vid bildgenerering. **Gör inga bilder på eget initiativ.** Invänta användarens uttryckliga beställning.

## 1. Vision — godkänd riktning

Ett renodlat, lättillgängligt, japanskinspirerat 7×7-matchpussel med färgstarka **föremål och växter från Japan** i stället för enbart växter. Matcha samma familj, **förädla** en pjäs genom fem stadier, skapa ett visuellt **mästerverk** och aktivera **Harmony Pulse** som förädlar fyra ortogonala grannar och kan bilda kedjereaktioner. Målet är nivåprogression, stjärnor, poäng och rekord – inte samlingsalbum eller separat världsträd.

Designlöfte: **Lätt att lära, strategiskt djup genom placering och planering. Inga hinder eller separat power-up-system.** Matcher och mästerverk ska kännas belönande, men spelaren ska uppleva att skickliga beslut slår ren tur.

### Låsta användarbeslut — spelmekanik

| Område | Godkänt beslut |
|---|---|
| Spelplan | Alltid 7×7, 49 spelbara rutor |
| Samtidiga familjer | Fyra från början, senare fem; nya familjer kan bytas mellan kapitel |
| Familjer och stadier | Varje familj har fem steg och en distinkt visuell progression |
| Swap och match | Byt angränsande pjäser, giltig match ≥3 av samma familj oberoende av utvecklingsstadium |
| Former | Horisontell, vertikal, T- och L-form; korsande samma-familj-linjer utgör en grupp |
| Överlevare | Högsta utvecklingsstadiet överlever **på sin nuvarande plats** och utvecklas +1 |
| Match 3 | Vanlig fusion, inga bonuser |
| Match 4 | Fusion + ett berättigat grannföremål utvecklas +1 |
| Match 5+ | Fusion + två berättigade grannföremål utvecklas +1; T/L får samma effekt |
| Bonus → mästerverk | **Ja.** En grannbonus får utveckla stadium 4→5 och direkt starta Harmony Pulse |
| Harmony Pulse | Mästerverk på stadium 5 förädlar upp till fyra upptagna ortogonala grannar, aldrig diagonalt; nya mästerverk kan fortsätta |
| Upprepade pulser | En pjäs får högst en indirekt förädling per sammanhängande pulskedja; varje mästerverk aktiveras en gång |
| Tomma rutor | **Fylls först när hela Harmony Pulse-kedjan avslutats** |
| Nytt nedfall | Endast föremål på stadium 1 faller in; gravitationskaskader kan generera nya matcher |
| Startbräden | Handdesignade nyckelsituationer + kontrollerad slump i övrigt |
| Efter misslyckad nivå | Ny kontrollerad startvariant; ingen väntetid eller bestraffning |
| Efter uppnått nivåmål | **Fortsätt spela med återstående drag** för att förbättra poängrekordet |
| Power Move | **Helt borttaget** |
| Hinder och specialföremål | **Inga**, även i senare nivåer. Variation genom nivåmål, placering, matcher och familjer |
| Mästerverksvarianter | Introduceras senare; huvudsakligen visuella, inte nya förmågor |
| Progression | Nivåer, stjärnor, personliga poängrekord (möjligen kapitelrekord); **inget samlingsalbum** |
| Svårighetsgrad | Börjar enkelt, mer strategisk efterhand; mix av lättare/svårare nivåer |

### Nyanser att verifiera i speltest, inte påstå som låsta användarbeslut

- Exakt tie-breaker vid lika högsta stadium: förslag är flyttad pjäs om den ingår bland de högsta, annars konsekvent positionsordning.
- Exakt prioritetsordning för grannbonus när flera grannar har samma stadium; förslag: högsta stadium först och bestämd ordning vid lika.
- Bonus utan berättigade grannar: föreslagna extra poäng.
- Exakt poängtabell, stjärntrösklar, antal drag, startbräden, familjeutbud i nivå 1–10 och omblandning vid dödläge.
- Samtidiga korsmatcher av olika familjer, sammanslagning av grupper, kedjors identiteter över gravitationskaskader och gränsfallet där direkta och indirekta uppgraderingar sammanfaller.
- Om gamla tidigare ritade visuella stadier ska återanvändas är ännu inte bestämt; ändra inte genom att anta det.

## 2. Objektfamiljer (första fem – arbetsdesign)

| Familj | Föreslagen utvecklingskedja 1→5 | Färgankare från standard |
|---|---|---|
| **Sakura** | Knopp → Blommande kvist → Blomsterklase → Sakurabuske → Praktfullt sakuraträd | `#EE91AF` |
| **Lykta** | Enkel papperslykta → Målad → Upplyst → Förgylld → Ceremoniell festivallykta | `#DD6655` |
| **Koi** | Liten koi → Ung koi → Färgstark koi → Praktkoi → Legendarisk koi | `#E8A354` |
| **Solfjäder** | Hopfälld → Halvöppen → Målad → Förgylld → Ceremoniell solfjäder | `#699DBD` |
| **Bonsai** (senare) | Frö → Planta → Ung bonsai → Formad bonsai → Mästerbonsai | `#75B68A` |

De exakta stadienamnen och illustrationerna är förslag. Varje familj behåller genomgående **samma formspråk och kulörankare** men får ökande dekor/komplexitet för varje utvecklingsstadium. Inga fler än fem aktiva familjer på ett normalt 7×7-bräde.

## 3. Match- och pulse-sekvens — arbetsordning för implementation senare

1. Spelaren försöker byta två ortogonalt angränsande rutor. Om ingen match om ≥3 uppstår återställs bytet utan att förbruka drag.
2. Identifiera alla raka horisontella/vertikala matchlinjer; slå ihop överlappande **samma-familj**-linjer till unika grupper inklusive T/L. En korsningscell räknas en gång.
3. Välj gruppens högst utvecklade pjäs som mottagare, låt den behålla positionen och öka dess stadium +1 (max 5); förbruka de övriga i gruppen.
4. Match 4 utvecklar en giltig granne +1; match 5+ utvecklar två **olika** giltiga grannar +1. Grannbonus får ge stadium 5 och då starta mästerverk.
5. Aktivera alla nyskapade mästerverk som en Harmony Pulse-våg. Pulsen utvecklar upptagna grannar upp/ned/vänster/höger; tomma rutor förblir tomma; familj spelar ingen roll.
6. Låt nya mästerverk fortsätta att pulsas i nya vågor, max en indirekt förädling per pjäs under sammanhängande Harmony-kedja. Redan aktiverade mästerverk kan inte pulsas igen.
7. Skörda mästerverken och rensa deras rutor **efter** att kedjan är färdig.
8. Låt pjäser falla och fyll tomrum med enbart stadium 1 från balanserat kontrollerade familjeutbud. Automatiska matchningar löser sina egna vågor/kaskader.
9. Beräkna mål och poäng först när dragets hela reaktionskedja är avslutad. Om nivåmål uppnåtts markeras nivån som klar **utan att tvinga fram resultatskärm**; spelaren får fortsätta använda resterande drag. Stjärnor för effektivitet bestäms vid första måluppfyllelsen, rekordpoäng vid omgångens slut.

**Observera:** Bonusuppgraderingar, direkta fusioner och pulser kan inträffa i samma sammanhängande drag; implementatören måste undvika dubbelförbrukning och oavsiktlig dubbelutveckling.

## 4. Nivådesign — godkända principer

- Inga hinder/stenblock/stenplattor eller blockerade rutor i spelets framtida nivåer.
- Varje nivå har en **pusselkärna**: handplacerade viktiga familjer/stadier som gör den strategiskt igenkännlig. Övriga rutor väljs från **testade kontrollerade startvarianter**.
- Ny godkänd startvariant vid misslyckad nivå; ingen väntetid/liv/straff.
- Rekord ska bero mer på spelarens val än på tur. Nedfall bör använda balanserade fördelningar av de tillgängliga familjerna, utan dold medgångs-/motgångsmanipulation.
- Om ingen giltig match finns: föreslagen automatisk gratis omblandning, helst så högre stadier/nyckelföremål behåller placering. Måste testas.
- Det ska finnas flera giltiga drag men inte nödvändigtvis flera **lika bra** drag.
- Nivåer varierar i mål: antal fusioner, nå visst stadium, specifika mästerverk, stora 4/5/T/L-matcher, Harmony-kedjor, få drag, poäng.
- De flesta nivåer har ett enda tydligt huvudmål. Variation kommer ur **utgångsläge, placering, familjer och måluppgifter**, inte nya mekaniker.
- Återstående drag efter uppnått mål ger inga automatiska bonuspoäng: spelaren får spela ut dem för ytterligare fusioner och Harmony Pulse, eller frivilligt avsluta.
- Stjärnor beskriver effektivitet till första målträff; poängrekord beskriver hela omgångens prestation. Personligt rekord per nivå; kapitelrekord som möjlig framtida aggregatfunktion.

## 5. Första tio nivåerna — utkast, inte slutbalanserat

| Nr | Nivå | Mål | Förslag antal drag | Introducerar/testar |
|---|---|---|---:|---|
| 1 | First Match | 5 fusioner | 12 | Swap och match 3 |
| 2 | Growing Beauty | Utveckla 3 föremål till stadium 3 | 18 | Fem utvecklingsstadier |
| 3 | The Survivor | Skapa ett stadium 4-föremål | 16 | Högsta stadiet och plats |
| 4 | First Masterpiece | Skapa ett mästerverk | 18 | Stadium 5 |
| 5 | Harmony Awakens | Uppgradera 3 grannar med en Harmony Pulse | 18 | Orto-puls och luckor |
| 6 | Lantern Festival | Skapa 2 lyktmästerverk | 22 | Familjespecifika mål |
| 7 | Four of a Kind | Skapa en fyrmatchning | 18 | En extra grannbonus |
| 8 | Beautiful Shapes | Skapa en T- eller L-matchning | 16 | Två grannbonuser |
| 9 | Double Harmony | Skapa två mästerverk i en sammanhängande pulskedja | 20 | Kedjeplanering |
| 10 | Master of Harmony | Skapa 3 mästerverk | 24 | Samspel mellan regler |

**Inte färdigt:** Tabellens dragantal är designhypoteser. Startbräden och alla nivåers vinstmöjlighet ska verifieras med faktiskt regelutfall och nedfall innan de påstås vara färdiga. Kapitel 1 börjar med fyra familjer; Bonsai introduceras som femte familj omkring nivå 21.

## 6. Spelbalans och återspelbarhet

Vi ska senare kvalitetstesta varje nivå med bl.a. enkel och mer planeringsorienterad AI, flera kontrollerade startvarianter och olika förutbestämda nedfallssekvenser. Utvärdera: vinstfrekvens, antal drag till mål, strategi-/turfördel, stora Harmony-kedjor och jämförbar rekordpotential mellan startvarianter.

Det ska vara möjligt att klara samma nivå genom mer än en strategi. Ett enklare tillvägagångssätt ska ofta ge nivåavklarande, medan välplanerade Harmony-kedjor skapar den bästa poängpotentialen. Lättare nivåer ska varvas med svårare; svårighet kommer från val, inte från hinder.

Mästerverksvarianter får introduceras längre fram som visuella temavarianter, utan att deras gameplayfunktioner byts.

## 7. Visuell identitet (bindande standard för grafik)

**Färgidentitet:** **Japanese Harmony — Midnight Garden**, fullständiga specifikationer i [Color & Art Bible 1.0](JAPANESE_HARMONY_COLOR_BIBLE_1_0.md). Det här är den primära referensen för alla framtida bildprompter, ritade assets, spelplaner och UI-skisser.

### Basfärger (HEX exakt)

| Användning | Token | HEX |
|---|---|---|
| Mörk appbakgrund | Midnight Ink | **#102A37** |
| UI-paneler | Temple Teal | **#254853** |
| UI-text | Warm Ivory | **#FFF2DC** |
| Sekundär UI-text | Muted Ivory | **#C6D3CA** |
| UI-kant | Soft Jade Border | **#65867F** |
| Sakura / mjuk accent | Sakura Pink | **#EE91AF** |
| Lykta / festival | Festival Coral | **#DD6655** |
| Koi / varm amber | Koi Amber | **#E8A354** |
| Solfjäder / indigo | Fan Indigo | **#699DBD** |
| Bonsai / grönska | Bonsai Jade | **#75B68A** |
| Belöning / stjärnor | Harmony Gold | **#F2C66E** |
| Harmony Pulse | Harmony Mint | **#78D1B0** |
| Neutral spelruta | Zen Sand | **#EADDC8** |
| Lugn stenvariation | Soft Stone | **#D9CAB2** |
| Rutlinje | Garden Grid | **#B8A78F** |
| Yttre spelplansram | Garden Border | **#A58B73** |

**Obligatoriska visuella regler:**
1. Mörk UI-ram, ljus varm neutral spelplan och tydligt färgkodade föremålsfamiljer. Ändra inte hela UI:t för att matcha ett enskilt föremål.
2. Samma familj behåller sitt färgankare i alla fem stadier. Nyanser för material, ljus och djup är tillåtna.
3. Transparent PNG för individuella föremål; verklig alfakanal, inga ritade schackrutor. Gemensam skala, perspektiv, ljus och skärpa.
4. 7×7 bräde **exakt 49 lika stora, helt fria rutor**. Inga dekorobjekt eller ramdelar får skymma en enda spelruta. Rekommenderat: skapa dekorramen som separat PNG och rendera det matematiskt exakta spelrutnätet i motorn.
5. Kapitlen får ha sakura-, zen-, tempel-, festival- och nattdekorationer **runt** brädet. **Färgidentitet och objektsilhuetter är konstanta**.
6. Harmony Pulse använder mjuk mint `#78D1B0`, små guldaccenter `#F2C66E`, aldrig stor vit smäll som skymmer objekten.
7. Ingen bildgenerering eller kodning sker automatiskt när detta dokument uppdateras. Användaren beställer sådana pass separat.

### Godkänd art-direction-korrigering 2026-10-21 (LÅST)

**Gemensam grafikstil ≠ gemensam färg eller dekor.** Lyktornas bilder är godkända som **renderingskvalitetsreferens** (ljussättning, skärpa, material, 3D-djup, detaljkvalitet), men **deras röda palett, lyktornas tofsar och guldornament får inte kopieras** till andra familjer. Varje objekt har en **självständig familjepalett, egen silhuett, eget naturligt material och egen utvecklingskedja**. Detaljrikedom får öka mellan stadier, men **form, hållning/öppningsgrad eller morfologi måste också förändras tydligt**.

- **Lykta:** fem tidigare bilder godkända; **ska inte regenereras i nästa bildpass**.
- **Koi:** fem nya separata bilder, **orange/amber `#E8A354` dominerar**, naturlig vit/elfenben och individuella kroppsposer; utveckling från liten fisk till legendarisk koi (eventuellt flera fiskar i högre stadium om tydligt läsbart).
- **Solfjäder:** fem nya separata bilder med **blått/indigo `#699DBD` som tydlig huvudkulör**, stegvis hopfälld → halvöppen → öppen → ceremoniell → mästerverk; **inga lånade lykttossar eller dominerande rött**.
- **Sakura:** fem nya separata bilder, **sakura-rosa `#EE91AF` dominerar**; tydligt knopp → kvist → kluster → buske → blommande träd, utan lyktspecifika ornament.
- **Bonsai:** fem nya separata bilder, **jadegrön `#75B68A` dominerar**; frö → planta → ung bonsai → formad bonsai → mästerbonsai; naturligt trä och diskret keramik.
- **Assetformat:** 1 stadium = 1 fullstor, fristående PNG med **riktig transparent alfakanal**, inte collage/översiktsark eller färdig presentationsbild. Endast ett motiverat motiv per fil. Kontrollera även att storleken fungerar i en mobilruta.
- **Ingen annan spelkod eller de godkända lyktbilderna ändras** förrän användaren uttryckligen begär sådan integrering.

**Fullständig bindande specifikation:** [Color & Art Bible, §2.4](JAPANESE_HARMONY_COLOR_BIBLE_1_0.md).

### Förhållande till äldre prototyp

Tidigare **Daisugi Bloom 1.x** använde bl.a. fyra rena växtfamiljer, Bloom Pulse, permanent Daisugi-träd, livskraft, naturenergimätare och Power Move. Dessa hör till föregående spelprototyp och **ska inte importeras** till det nya japanska objektpusselspelet som beslutade mekaniker.

## 8. Status och fortsättning

**Färger definierade och dokumenterade, men användaren har inte ännu utvärderat färgerna i genererad grafik.** Använd alltid `JH-COLOR-1.0` tills användaren ber om en uttrycklig revision.

**Nästa steg när användaren ger klartecken:** generera visuella tillgångar utifrån Color Bible, helst 1) provobjekt från olika familjer som stilankare, 2) 7×7-spelplansram med äkta transparent alfa, 3) UI-förslag. Kontrollera alla 49 rutor och konsekvent palett innan någon bild integreras i spelkoden. Inga grafiska filer eller spelkod ska skapas utan uttrycklig begäran.


## Implementation status — Japanese Harmony First Playable 2.0 (2026-10-21)

**This section supersedes earlier 'no programming' status notes in this document.** At the user's explicit request, the old landing page was replaced with the new Japanese Harmony first playable.

**Implemented in GitHub:**
- `daisugi-bloom/index.html` serves Japanese Harmony and loads `harmony/rules.js`, `harmony/app.js`, `harmony/styles.css`.
- New DOM/mobile 7×7 board and Midnight Garden UI tokens.
- Four starting families (Sakura, Lykta, Koi, Solfjäder), five stage model, mixed-stage matching, strongest-piece survivor, T/L overlap groups, 4/5 bonus growth, direct and bonus-triggered Harmony Pulse, no refill until pulses complete, stage-one refill, free deadlock shuffle, controlled balanced bag, and separate save slots.
- Ten first-chapter levels (design draft move budgets), stars frozen when goal first achieved, play remaining moves for score, new board variant on retry, no power ups or permanent Daisugi tree.
- `tests/harmony.test.cjs` and `tests/harmony-browser-smoke.mjs` cover logic and mobile view; workflow switched to new smoke while retaining old standalone legacy rule tests.

**Explicitly pending / not to claim complete:**
- **Uppdatering 2026-10-21:** Spelatlasen `daisugi-bloom/assets/harmony-atlas.webp` finns i GitHub och innehåller samtliga fem rader med fem utvecklingsstadier: Sakura, Lykta, Koi, Solfjäder och Bonsai. De första fyra familjerna används i kapitel 1. **Bonsai är inte saknad grafik** utan inväntar nivåprogression med fem aktiva familjer (ursprungligen planerad kring nivå 21).
- Art must be integrated from the user's approved originals while preserving family-specific color rules and all five clearly distinct stages. Never silently substitute old Daisugi foliage atlases. The fifth approved lantern original must be checked against the available image set instead of duplicated without user awareness.
- Actual 7×7 start boards, star thresholds, bag variation and level 8/9 goal achievability still need human playtesting and/or more advanced simulation. Green automated tests are not a guarantee of final balance.
- UI animation polish and full image atlas are not final; this is **first playable / test build**, not a visually complete release.


## UI-regel beslutad 2026-10-21: rena föremålsikoner utan siffror

**Låst användarbeslut:** Rutorna på 7×7-brädet får **inte** innehålla synliga etiketter som `1/5`, `2/5`, `3/5`, `4/5` eller `5/5`. Ikonerna och deras tydliga visuella förädlingssteg ska bära informationen utan textetiketter som täcker illustrationerna. Utvecklingsstadium kan visas i en separat informationsrad **när spelaren markerar en ruta**, samt för skärmläsare, men aldrig som standardoverlay på alla brickor. Inställningsvalet för sifferöverlägg har tagits bort, inklusive för sparade spel med tidigare `showStages`-värde.

## Fusion Fluidity 2.0.2 — mobil prestanda (2026-10-21)

Åtgärdat direkt i spelet efter testfeedback om trög fusion/animation:
- **Stabil 7×7 DOM**: rutornas 49 knappnoder och lyssnare skapas en gång, därefter behålls de genom byten, fusioner, pulser, skördar och nedfall. Endast rutor vars `id/family/stage` ändrats får ny bildnod; markeringar uppdateras utan ny DOM.
- **Kortare animeringspauser:** tidigare sekventiella väntetider på 135–320 ms per delhändelse är sänkta till ungefär 55–135 ms; reducerad rörelse tar bort väntetid helt.
- **Lättare mobilrendering**: ingen dyr CSS-`drop-shadow` på samtliga 49 sprites; befintliga skuggor i bilderna bevaras; rutorna får begränsad paint/layout.
- **Harmony Chain-status** är ett smalt kortlivat statuschip som döljer sig automatiskt, inte en stor banner över mittfältet.
- **Spelregler, målbilder, sparade framsteg och familjeordning är oförändrade.**
- Mobil- och regeltester verifierar körning inklusive en verklig matchning och att den första rutans DOM-nod behålls. Användarens verkliga telefonupplevelse ska utvärderas i fortsatt speltest.

## Kinetic Fusion 2.1 — bindande rättelser (2026-10-21)

**Användarbeslut: NYTT BRÄDE = ENDAST STADIUM 1.** Varje föremål på samtliga 49 rutor ska börja på stadium **1** när en ny nivå eller en omstart genereras. Tidigare handplacerade stadium 2–4 var ett fel och är borttagna från generatorn. Kontrollerad nivåvariation får ske genom **familjernas fördelning och placering**, aldrig genom gratis förädlade föremål. Ett aktivt sparat spel som fortsätts ska däremot naturligtvis behålla redan intjänad förädling.

**Rörelse och respons:** Efter användarfeedback om otillräcklig fusion jämfördes gamla Daisugi Bloom 3D-baserade `Garden.play` och Wildpaths spatiala fusion. Japanese Harmony 2.1 visar nu faktiskt **rörliga föremål**: byte glider mellan rutorna, förbrukade matchföremål rör sig mot överlevaren, överlevaren växer kort, Harmony Pulse får rörlig energi mellan ortogonala grannar och gravitetsnedfall animeras med bevarade pjäsidentiteter. Web Animations API kör grafikförflyttning via browserns compositor; 49 rutknappar återanvänds och objektskiften uppdaterar endast berörda bilder. Ingen konstgjord lång väntetid läggs mellan varje snapshot. Minska animationer stöds fortfarande.

**Balanskonsekvens:** Första tio nivåernas tidigare angivna dragbudgetar och handritade startpussel som förutsatte stadium 2–4 är **preliminära och behöver omvärderas** efter detta nya stadium-1-krav. Ändra inte tillbaka startobjektens stadium för att göra nivåerna lättare. Justera i stället antal drag, mål eller familjeplacering efter speltester.

**Kvalitetskrav:** Automatisk startbrädeskontroll över samtliga nivåer och upprepade omstarter (49× stadium 1, inga färdiga matcher, minst tre möjliga drag), samt verkligt mobiltest av en fusionsrörelse. Godkända tester garanterar inte perfekt upplevd flyt på den användarens mobil; återtest med längre Harmony-kedjor behövs.

## Fusion Spark & Score Stream 2.2 — Feedback-effekter (2026-10-21)

**Godkänd designriktning från användaren:** När föremål fusioneras behövs diskreta, snabba ljus- och partikelanimationer runt överlevaren. När en händelse ger poäng ska ett synligt **+poängvärde skjutas från den relevanta spelrutan till poängboxen**, följt av en kort ström små ljuspunkter. Vid ankomsten uppdateras poängräknaren och får en liten visuell respons. Inga permanenta sifferetiketter ska finnas på rutorna.

**Implementation:** `daisugi-bloom/harmony/app.js` och `harmony/styles.css`. Alla effekter är separata, tillfälliga och pointer-fria DOM-lager med CSS transform/opacity-animation via Web Animations; de får aldrig stoppa efterföljande matcher. Matchgrupper använder sin egen survivorsruta som ursprung. Bonus/puls/skörd hämtar ursprung från relevanta rutor. För samtidiga eller mycket stora kaskader begränsas antalet parallella visuella poängströmmar, medan poängberäkningen alltid är exakt. Ljuseffekterna följer Midnight Garden-standardens `#F2C66E` (Harmony Gold) och `#78D1B0` (Harmony Mint), inte en täckande vit explosion.

**Tillgänglighet och stabilitet:** Reducerad rörelse visar poängen direkt utan flyganimation. Grafiklagret återanvänds, städas bort vid nivåbyte och ignorerar gamla animationers sena ankomst. Korrekt slutpoäng kommer alltid från regelmotorn även om en poänganimation avbryts. Mobil regressionstest kontrollerar att små glimtningar, poängströmmar och faktisk poängankomst fungerar, samt att inga 1/5-etiketter kommer tillbaka.

## Reward Feedback 2.3 — Förstärkt men respektfull spelrespons (2026-10-21)

**Användarfeedback:** Förra 2.2-passet syntes knappt; poängflygningen och poängboxens respons var otillräckliga. Spelaren ska tydligt förstå *vilken ruta som fusionerats*, *vad fusionen gav*, *var poängen går* och *när poängen faktiskt har lagts till*. Upplevelsen ska vara belönande utan att dölja 7×7-brädet eller kännas laggig.

**Låsta grafiska principer:** Standardfamiljernas färger och illustrationer ändras inte; effekter följer Harmony Gold `#F2C66E`, Harmony Mint `#78D1B0` och Midnight Ink `#102A37`.

- **Fusion:** Expanderande gyllene ring med kortvarig ljusglöd, tydliga men få partiklar som rör sig ut från överlevarens ruta. En match 4 syns starkare, 5+ får en extra kort 'SUPER!'-markering utan att skymma mitten av brädet.
- **Harmony:** En extra mintfärgad ring/glöd vid nybildat mästerverk samt kort respons där Harmony Pulse utvecklar grannar.
- **Poängresa:** Varje relevant poänghändelse börjar i sin belönande ruta som en högkontrast `+poäng`-etikett. Den rör sig längs en böjd bana med en kort följande svans av varma ljuspunkter till **poängräknaren**, inte bara till en godtycklig del av skärmen.
- **Ankomst:** Först vid visuell ankomst adderas det visade poängvärdet. Då växer och glöder poängräknaren kort och en guldring expanderar runt den. Flera poängströmmar kan överlappa utan att ändra den riktiga regelmotorpoängen.
- **Responsiv prestanda:** Transient `position:fixed`-overlay, inga 49 permanenta partikelnoder eller tunga white-flash-effekter. `transform` + `opacity` används för rörelse; inga `await` på score-flykt får stoppa spelmekanik eller nästa drag. Högst fem samtidiga synliga poängresor; överflödsvärden visas korrekt direkt med ankomstpuls. Grafik rensas vid nivåbyte. `Minska animationer` och operativsystemets reducerad-rörelse-val respekteras.
- **Test:** Mobiltest observerar *faktisk* renderad fusionsring, betydande storlek på poängvärde, poängström och poängfältsring. Automatisk framgång är inte samma sak som slutlig estetisk godkännande; telefonstest krävs för finjustering.

**Kodversion:** `daisugi-bloom/harmony/app.js`, `harmony/styles.css`, `daisugi-bloom/index.html` – v2.3.0.

## UI Art Lift 3.0 — Premium Festival Night med Zen-kontroll (2026-10-21)

**Godkänt designbeslut:** Alla sex japanskt inspirerade natt-/festival-/zenmotiv ska kunna ingå som bakgrunder. Varje ny nivå eller omstart väljer ett motiv slumpmässigt och använder **samma motiv under hela nivån**. Ett återupptaget spel behåller sin tidigare bakgrund. Samma motiv ska inte väljas två gånger i rad.

**Grafisk leverans:** Sex ursprungliga kompositioner från de två godkända tredelade bakgrundsarken lagras i en optimerad AVIF-atlas: `daisugi-bloom/assets/backgrounds/festival-night-six.avif` (~40 KB, 6 paneler × 320×640). För detaljer, panelordning och kontrastkrav, se [Bakgrunds-README](../assets/backgrounds/README.md).

**UI-system:** Premium Festival Night innebär midnattsblå/teal, varma gulddetaljer, harmonisk japansk nattkänsla och **mörka, halvtransparenta paneler** ovanpå bakgrunden. Zen-kontroll innebär ren informationshierarki, försiktiga highlights, färre onödiga effekter och bevarad läsbarhet trots varierande scen. Global lågkostnads-overlay med mörka gradients ovanpå varje bild garanterar tillräcklig bakgrundsdämpning, medan enskilda viktiga paneler har egna mörka halvtäckande gradients.

**Brädet:** 7×7, identisk storlek och oförändrade föremålsbilder. Markens två sandstenstoner är något mörkare, och ramen har djupare valnöts-/bronston och diskret gyllene ljuskant. Uppdateringen får inte färgjustera själva sakura-, lykta-, koi-, solfjäder- och bonsai-ikonerna. Alla 49 rutors fusion/prestanda förblir fristående från bakgrundsskiktet.

**Prestanda och fallback:** Endast en AVIF-atlas laddas och återanvänds för alla sex motiv; byte av bakgrund kräver bara uppdatering av CSS-position/viewport-utsnitt, aldrig att 6 stora foton laddas separat eller att tung blur läggs på spelrutorna. Om AVIF inte stöds eller en tillgång saknas faller vyn tillbaka till en Midnattsblå gradient utan påverkan på spelet. Browser-smoke ska täcka sex unika motiv, stabil scen över drag, rotation vid omstart, bevarad stage-1-start och intakt 7×7-mekanik.

**Kvalitetssäkring:** De sex motiven bedöms lämpliga med denna dämpnings-/panelmodell, men användaren avgör i verkligt mobiltest om ett visst motiv bör exkluderas. Låt inte enstaka bakgrund tvinga bort önskad kontrast eller effektflyt.
