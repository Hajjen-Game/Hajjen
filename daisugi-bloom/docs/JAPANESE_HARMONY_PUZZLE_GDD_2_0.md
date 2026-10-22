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


## Mobile Game UI Reframe 3.1 — Spelplanen först (2026-10-21)

**Ny godkänd designriktning:** Mobilvyn ska upplevas som ett premium *puzzle-mobilspel*, inte som en responsiv webbdashboard. Referensen visar ett japanskt naturmotiv med en stor, skulpterad zen-trädgårdsram, kompakta pappers-/träplaketter för drag/poäng och en rund spelmenyknapp.

- **Spel-HUD:** Två taktila plaketter längst upp: återstående drag och poäng. Intjänade stjärnor och personligt rekord visas direkt under poängen. Rund spelmeny till höger.
- **Nivå och mål:** Kompakt nivåetikett och en tunn uppdragsrad. Ingen hög kortstapel ovanför brädet.
- **Spelplan:** 7×7-brädet har huvudrollen och omges av en varm sand-/träinramning med krattade zenmönster, mossaccenter och stenar. Föremålens sprite-atlas, deras skuggor, spelregler och interaktioner ändras inte.
- **Under brädet:** Diskreta nivå-/omstartsknappar och kort vald-ruta-information. Vid uppnått mål visas avslutsknappen i egen rad.
- **Immersivt läge:** Webbheadern visas i nivåvalet men döljs under en pågående nivå. Den lilla spelmenyn ger tillgång till hjälp, inställningar och nivåval; modalöverlägget blockerar inkommande spelinput.
- **Art-riktning:** Behåll de sex godkända Festival Night-motiven, men låt dem synas tydligare omkring brädet. Strukturen hämtar inspiration från mobilreferensen utan att kopiera dess föremål eller lägga till nya familjer/spelregler.
- **Kvalitet & test:** Ingen ändring i Harmony Rules, sparfiler, fusioner, poängresor eller scenrotation. Browser smoke validerar mobil-HUD-ordning, att brädet får större visuell yta, att brädet ryms i första mobilvyn och att spelmenyns hjälp nås. Visuell mobilbedömning behövs fortfarande.

**Implementation:** `daisugi-bloom/index.html`, `harmony/mobile-game.css`, `harmony/app.js`, `tests/harmony-browser-smoke.mjs`. Versionsnummer 3.1.0.


## Mobile Polish & Performance 3.2 — ren spelyta och lättare rendering (2026-10-21)

**Feedback från mobiltest:** UI 3.1 blev tydligt bättre, men spelet upplevdes som laggigt; under spelplanen fanns överflödiga knappar och två hjälprader. Festival-bakgrunderna upplevdes oskarpa.

**Beslut och implementation:**
- Under en nivå syns bara HUD (drag, poäng, stjärnor, rekord, menyknapp), nivånamn, mål och spelplan. Den synliga dockan och hjälpraderna under brädet är borttagna. För skärmläsare ligger rutinformation kvar i en diskret `role=status`.
- Spelplanen har fått ytterligare vertikalt andrum under uppdraget (`clamp(24px,4.6dvh,48px)`). Själva 7×7-spelbrädet förblir så stort som telefonbredden tillåter.
- Pausmenyn är samlingsplats för fortsätt, börja om, hjälp, inställningar, nivåval och — om nivån redan är klar — avslut med resultat. Därmed förloras inga spelhandlingar när nederdelen rensas.
- Rendering: förenklat trä-/sand-/mossmönster och färre inre skuggor per ruta; mobiltelefoner begränsar samtidiga poängresor (max 2 i stället för 5) och småpartiklar, men behåller viktiga fusionsringar och synligt poängankomstslag. Poängvärden och spellogik påverkas inte.
- Bakgrund: atlasen är fortfarande originalet med 6 × 320×640. Vald scen beskärs en gång per använd scen, uppskalad med högkvalitetsinterpolering och lätt kantförstärkning till en cachad, fristående WebP-blob som visas som EN scen i CSS. Detta minskar den mycket breda atlasens GPU-rasteryta. Originalatlasen är fallback. **Detta skapar inte ny bilddetalj.** För verkligt högupplöst, skarpt konstverk krävs sex nya exportfiler från högupplösta original.
- Bakgrunderna väljs fortfarande slumpmässigt utan direkt upprepning, sparfilen behåller vald scen, CSS/JS använder versionssträngen 3.2.0.

**Regression:** Browser smoke testar att nederdelen saknas, menyn innehåller alla nödvändiga funktioner, att en liten scen istället för en gigantisk atlas blir aktiv, och att 49 brickor, poäng och fusioner fungerar som tidigare.

**Verifieringsbegränsning:** Syntax- och DOM-referenskontroll är gjord i anslutningen. Faktisk uppmätt mobil-FPS och fullständig körning av Chrome/CI är ännu inte verifierad och ska bedömas vid telefonstest.


## Core Motion & Match Feel 4.0 — spelkänsla före mer VFX (2026-10-21)

**Mål:** Visuellt och taktilt premium-pussel, inspirerat av timing och tydlig feedback i casual-matchspel men med vår egen varma Zen-identitet. Passet ändrar **endast presentationslagret**, inte 7×7-regler, avkastning, drag, progression, sparformat eller bakgrunder.

- **Markering:** vald bricka lyfts subtilt med ~2 px och skala ~1.055 samt en 115 ms liten beröringsreaktion; denna effekt ligger enbart på `.piece`, inte på brädet.
- **Giltigt byte:** 166 ms positionskorrigering med liten accelerations-/inbromsningsprofil i stället för rak glidning. ID-spårning mellan eventens före/efter-bräden bevaras.
- **Ogiltigt byte:** flyttar båda berörda föremålen visuellt mot varandra och fjädrar tillbaka under ~215 ms; spelreglerna ger ingen poäng- eller dragförändring. Ingen falsk omordning i DOM eller regelmotor. Board-input blockeras under den korta återstudsen.
- **Fusion/förädling:** kvarvarande föremål komprimeras före sammanfogning, de andra föremålen rör sig mot överlevaren på ~162 ms och det nya stadiets originalillustration framträder sedan med en mjuk 205 ms skala-/landningskurva. En tillfällig liten ljusglimt per uppgraderad survivor (högst två på mobil) förstärker förändringen. De befintliga fusionsringarna och Score Stream behålls.
- **Fall:** både redan existerande brickor och nyskapade får en ytterst liten landing-squash/settle. 195–270 ms respektive 205–270 ms, där animationerna följer föremålets verkliga ID och start-/slutposition.
- **Prestanda:** använder samma stabila 49 DOM-rutor, inga nya globala grafiklager, inga tunga per-ruta-filter, animationerna körs via `Element.animate` för transform/opacity. Fusionsglimt är en tillfällig DOM-nod per relevant survivor, på samma lätta befintliga score-FX-lager.
- **Tillgänglighet:** `Minska animationer` eller `prefers-reduced-motion` hoppar över de nya WAAPI-rörelserna. Spelreglerna och funktionalitet fungerar även utan Web Animations API.
- **QA:** browser smoke testar ogiltigt angränsande byte som visuell återstuds med oförändrad poäng, oförändrat dragantal, exakt samma 49 celler och samma familjer/stadier. Befintliga funktionstester för swap, fusion, Score Stream och mobilnavigering finns kvar.

**Uttryckligt utanför pass 4.0:** familjespecifika VFX, omarbetat Harmony Pulse och ett nytt ljudlandskap. Dessa ligger i kommande 4.1–4.2. Slutlig estetisk nivå samt faktisk Android-prestanda verifieras i telefon.


## Evolution & Harmony Pulse 4.1 — familjeidentitet och kedjefeedback (2026-10-21)

**Designmål:** Utgå från den fysiska Core Motion 4.0, men ge varje nytt föremålsstadium igenkännbara visuella signaturer och göra orsak/verkan vid mästerverk och Harmony Pulse lätt att följa. **Ingen ändring av Harmony Rules eller sparformat.**

**Fem familjeeffekter (endast kosmetik):**
- **Sakura:** två lätta rosa blommarkörer som vrider sig uppåt, utan partikelsvärm.
- **Lykta:** varm bärnstensfärgad ljushalo som expanderar snabbt.
- **Koi:** två små blåvita koncentriska vattenringar.
- **Solfjäder:** två svepande, böjda vindspår.
- **Bonsai:** två mjukt stigande gröna glimtar.

En familjesignatur utlöses i `playFusion` när det nya stadiets illustrerade objekt har lagts på brädet. Den spelar parallellt med den befintliga skalningstransitionen och den generiska glimt som infördes i 4.0 tas bort, så att animationerna inte staplas i onödan. Familjesignaturen skapas av högst **två** element per fusionsevent på mobil (**tre** på större skärmar), vardera med två CSS-pseudoelement. Varje effekt rensas automatiskt efter cirka 345 ms. Samtliga använder den befintliga pekgenomsläppliga score-FX-overlayern.

**Mästerverk:** Vid skapande av stadium 5 visas en enda varm, gyllene ring kring objektet (högst två på mobil), istället för ännu en allmän fusionsburst. Det befintliga grafiska stadiet, inte overlayeffekten, förblir huvudfokus. Ringen avlägsnas efter 385 ms.

**Harmony Pulse – tydlig orsak/verkan:** När eventet `pulse` inleds får tidigare bricktillstånd ligga kvar synligt. Små mintfärgade energipunkter färdas från `target.from` till `target.to` under 135 ms. Först **därefter** uppdateras hela logiska tillståndet, med 116 ms landningsrespons för högst ett antal valda visuella mål. Alla game-state-förändringar används fortfarande i sin helhet, oavsett hur många strålar som ritas. Mobilbudgeten är fem synliga strålar och två source-ringar per Pulse-event; större skärmar kan visa upp till nio strålar och fyra ringar. Undviker tidigare extra `fusionBurst` på varje Pulse-våg.

**Belöningshierarki:** Smal och icke blockerande chip ovanför spelplanen. Fyra objekt → `VACKERT!`; större matchningar, former eller automatiska kedjevågor → `HARMONI!`; nytt mästerverk → `MÄSTERVERK!`; två eller fler mästerverk i samma Harmony-kedja → `PERFEKT HARMONI · xN`. Endast en chip visas åt gången och en svagare belöning får inte ersätta en starkare inom samma drag. Vanliga trematchningar får inte stora ord över brickorna.

**Zen- och prestandaskydd:** Inga stora skärmskakningar, inga vita fullskärmsexplosioner, ingen shader-/Canvas-effekt eller nya familjegrafikfiler. `Minska animationer`/systeminställningen reducerad rörelse hoppar över de nya visuella effekterna. Endast temporära `transform`/ `opacity`-animationer; de 49 permanenta rutorna ändras inte.

**Tester:** `tests/harmony-browser-smoke.mjs` verifierar att verklig mobilfusion får en familjesignatur, och `tests/harmony-vfx.test.cjs` verifierar samtliga fem familjer, mobilbudget, mästerverksring, reward-prioritet och att Pulse träffar innan rutor ritas om. GitHub Actions kör båda via `.github/workflows/daisugi-bloom-tests.yml`.

**Kod:** `harmony/app.js`, `harmony/mobile-game.css`, `index.html` (4.1.0), tester och arbetsflöde. **Nästa planerade pass 4.2 är ljud/poäng-belöningspolish och ligger utanför 4.1.** Visuell kvalitetsbedömning, prestanda och haptisk feedback måste fortfarande göras i verklig Android-browser.


## Visual Readability 4.1.1 — korrigering efter mobilfeedback (2026-10-21)

**Rapporterat problem:** Det gick knappt att se någon skillnad efter 4.1. Kodgranskningen visade att familjeeffekterna var högst ungefär en brickas storlek (95 %), varade bara 345 ms och startade samtidigt som den nya stage-spriten fortfarande skalades fram. Harmony Pulse syntes som små 135 ms-punkter; vanliga trematchningar visade inget tydligt stadiumvärde.

**Ändringar:**
- Familjeeffekten börjar **efter** den nya illustrationens 245 ms-förädling, inte mitt under den. Storlek ökas till 145 % av brickans sida; varaktighet till 590 ms, med tydligt färgkodade konturer/halor och två familjespecifika detaljelement. Max två samtidiga familjeeffekter per fusion på mobil.
- Varje vanlig godkänd fusion får en liten förankrad etikett `✦ STADIUM N` som rör sig uppåt i 650 ms. Högst två etiketter per event på mobil, ingen stor mittbaner för trematchning.
- Mästerverksringen förstoras till 162 % av brickan och varar 680 ms. Signalen är lokal – ingen skärmskakning, vit explosion eller helskärmsdimning.
- Harmony Pulse visar upp till fem synliga energilinjer och fem ljuskärnor på mobil som färdas i 230 ms, två källhalor och högst tre lokala träffringar. Samtliga regelstyrda mål förädlas fortfarande oavsett visuella gränser; brädet uppdateras **efter** energins resa.
- Prestanda: lätta, kortlivade DOM-element i en befintlig overlay. Endast transform/opacity animeras; inga fler långlivade lager eller uppskalade bakgrundstexturer. Reducerad rörelse fortsätter fungera.
- 4.1.1 skiljer sig avsiktligt tydligt från 4.1 redan vid vanliga 3-matchningar.

**Tester:** `harmony-vfx.test.cjs` kräver effektvaraktighet, fem familjer, stadiumindikator, begränsade Pulse-linjer/träffar och korrekt sekvens; browser smoke kräver på en 390px mobil att en normal fusion skapar familjesignatur och stadiumetikett samt att familjeeffekten är minst 1.25 gånger brickans bredd. CSS/JS versionssträng 4.1.1. Faktiskt utseende och FPS verifieras genom användartest på en riktig Android-telefon.


## Audio & Reward 4.2 — musikalisk feedback och poängankomst (2026-10-21)

**Syfte:** Bygg vidare på Motion 4.0 och Evolution/Pulse 4.1.1 så att en vanlig matchning är tillfredsställande och större prestationer känns tydligt rikare utan att spelet låter stressande eller orsakar nya prestandaproblem.

**Ny ljudmotor:** `harmony/audio.js` laddas före `app.js`, utan externa ljudfiler. En mjuk syntetiserad klangprofil med träliknande triangeltoner, glasliknande sine-toner och harmoniska toner från en pentatonisk skala. Spelas via Web Audio API endast när ett användarinitierat spel-/menyval har låst upp AudioContext. Inga webbförfrågningar eller tunga ljuddekoders.

- Brickval: kort träklick.
- Giltigt byte: ett kort dubbelklick som följer rörelsen.
- Ogiltigt byte: låg, dämpad dubbelknackning i takt med återstudsen.
- Fusion: klang vars tonhöjd påverkas av familj och förädlingsstadium; fyra eller fler matchade får extra överton. Utlöses i `playFusion` när föremålen möts och den nya illustrationen visas.
- Bonus: ljus liten dubbelklang.
- Harmony Pulse: en ny stigande pentatonisk ton per logisk våg, synkroniserad med att energin lämnar mästerverket, inte efter det att målbrickorna redan reagerat.
- Mästerverk: tre samklingande harmoniska toner.
- Harvest: mjuk upplösning i en stigande tretonsklang.
- Poängankomst: diskret kort glasklang, med rikare överton för belöningar på 500 poäng eller mer.
- Nivåmål: fyrtoners musikalisk upplösning; avklarat slutresultat ytterligare en varm tretonsföljd.

**Respekt för inställningar:** Den befintliga `Ljud`-inställningen växlar omedelbart motorns `enabled`-läge. Avstängning stoppar pågående oscillatorer; avstängt ljud skapar inga nya oscillatorer. `Minska animationer` fungerar oförändrat och påverkar inte val av ljud.

**Ljudprestanda:** Högst åtta samtidiga oscillatorer; korta attack/decay-kuvert och separata event-cooldowns (t.ex. 115 ms för Pulse, 170 ms för poängankomst). Ingen audio-loop, stor ljudbuffer eller bakgrundsmusik i detta pass.

**Poängsystem och HUD:** Score Stream flyger något snabbare till poängrutan (500 ms på mobil, 555 ms på större skärm). Mobilströmmar har två partiklar i svansen i stället för tre. Poängrutan reagerar vid ankomst med en kort skalning och en liten tillfällig glimt vid minst 250 poäng. Upprepade stora pulser från två nästan samtidiga belöningar throttlas. Poängsiffran räknar mjukt upp under ca 260 ms när en poängresan anländer och kan avbrytas/restartas av nästa ankomst utan tappade poäng. `scoreShown` är fortsatt faktiskt anlända poäng; `scoreDisplayed` är en ren presentationssiffra, medan `game.score` alltid är auktoritativt för regler och sparning. Vid omstart/resultat/reducerad rörelse görs en omedelbar synkronisering till rätt totalsumma.

**Uppdragsrespons:** När det faktiska målvärdet ökar förstoras `goalProgress` kort; ingen ny stor HUD-box.

**Verifiering:** `harmony-audio.test.cjs` testar ljudinitiering, separata tonkaraktärer, av/på, begränsat antal röster, cooldown och städning. `harmony-reward.test.cjs` testar rullande scoretotaler, samtidiga ankomster, reducerad rörelse och återställning. Existerande VFX-test använder en ljudstub för att kontrollera Pulse-ordningen utan faktisk AudioContext. Browser smoke validerar att ljudmotorn laddas före appen och att poängräknaren ökar vid ankomst. GitHub Actions kör testerna med gamla Harmony Rules-regressioner.

**Scope:** Ingen ändring av brickbilder, Harmony Rules, nivåer, sparfilformat, fusionens logik eller Festival Night-bakgrunder. Verklig upplevelse på Android, ljudbalans vid hög volym och mätt FPS kräver enhetstest efter release 4.2.0.


## Mobile Performance & Polish 4.3 — kontinuerlig respons utan plotter (2026-10-21)

**Syfte:** Behåll premiumkänslan, familjeeffekterna från 4.1.1 och poäng-/ljudresponsen från 4.2, men reducera onödiga layoutmätningar, samtidiga extraspår och resurser som blir kvar efter ett avbrutet spel.

**Per-turn mätning (lokalt, utan telemetri):** Ny `harmony/performance.js` samplar `requestAnimationFrame` under en pågående spelanimation, inte när spelaren bara tittar på brädet. Senaste dragets genomsnittliga bildrutetid, p95, ungefärlig FPS, andel bildrutor över 34 ms, största antal tillfälliga FX-noder och antal startade animationer sammanställs. Tidigare drag räknas endast inom aktuell session. Ingenting skickas till en server eller lagras i `localStorage`.

**Visning:** Pausmenyn → **Prestanda** visar rapporten utan någon permanent FPS-mätare på spelplanen. Uppgifterna bygger endast på de bildrutor som samplats under dragets animation; de är inte ett fullständigt GPU-benchmark, och den faktiska användarupplevelsen måste fortfarande kontrolleras på telefonen.

**Adaptiv extragrafik:** Två tydligt långsamma drag med minst 12 uppmätta bildrutor vardera (p95 över 42 ms eller fler än 27 % bildrutor över 34 ms) sänker tillfälligt enbart detaljnivån för extra fusionsgnistor, poängsvansprickar och antalet samtidigt synliga Harmony Pulse-spår. Tre stabila drag (p95 under 25 ms och under 9 % långsamma bildrutor) återställer dem. Spelet tar **inte bort** själva bytet, animationen för det nya stadiet, familjesignaturen, mästerverksringen, HUD-poäng eller regelstyrda Pulse-uppgraderingar. Inga spelregler eller belöningssiffror förändras.

**Layoutkostnad:** `indexRect()` läser samma brickas `getBoundingClientRect()` högst en gång per drag med en tillfällig 49-plats-cache. Den föräldraruta som används för fusionslager återanvänds inom draget. Cachen släpps i `finally` oavsett om animationen lyckas. Inga koordinater sparas mellan drag eller efter en förändring av skärmlayout.

**Animation cleanup:** Vid ny nivå/nivåval avbryts pågående Web Animations på överblivna score-FX-noder innan nodlagret töms. Spel i bakgrundsflik startar inte nya visuella animationer eller ljud. Mätningen är aktiv endast under spelanimation och avregistrerar sin enda rAF vid avslut.

**VFX-budget:** I normal mobilprofil visas samma huvudanimationer som 4.2, inklusive tydligt stadiumtext och ljusram. Extra fusionsgnistor och poängsvansprickar begränsas om mer än 32 tillfälliga score-/FX-noder redan finns. Den adaptiva profilen kan minska extra gnistor och antalet visuella energispår ytterligare. Scoresystemet och alla logiska Harmony Pulse-mål berörs inte.

**Regression & QA:** `tests/harmony-performance.test.cjs` testar samplingens avslut, jankbedömning, adaptiv ned-/uppgradering, icke-sampling i dold flik och frånvaro av läckande animationframes. Befintliga rules-, audio-, reward- och VFX-tester kvarstår. Browser smoke kontrollerar att prestandamenyn öppnas efter ett drag och att resultatet innehåller lokala mätfält. GitHub Actions inkluderar även syntaxkontroll av prestandamodulen.

**Utvärdering:** Enhetsprestanda/FPS kan inte bekräftas av källkodstester. Ta skärmbild på Prestanda-menyn efter ett vanligt drag och gärna efter en stor Harmony Pulse-kedja; jämför mätvärden och hur själva spelet känns. Om lagg kvarstår är nästa åtgärd riktad profilering på den aktuella Android-enheten, inte en automatisk försämring av spelets grafik.


## Fusion Motion & Harvest Readability 4.3.1 — synlig sammanslagning (2026-10-22)

**Mobilfeedback:** Efter 4.3 rapporterades att spelet inte längre laggar, men att föremål verkar försvinna snarare än faktiskt dras samman. Det tidigare fusionsspöket blev 20 % stort och 12 % synligt inom bara 162 ms, medan färdiga mästerverk tonades bort på 150 ms. Resultatet var en rörelse som var svår att uppfatta.

**Ny fusionssekvens:**
1. Föremålen som ska konsumeras behåller sin ursprungliga sprite i en temporär, ovanpåliggande 7×7-fusionsyta. Källbrickorna döljs enbart medan deras visuella kopior färdas.
2. Kort laddningsmoment (0–13 % av animationen) följt av förflyttning ända fram till överlevaren. Vid 94 % är föremålet fortfarande helt synligt och 66 % stort; vid kontakt har det 92 % opacitet och 49 % skala. Total synlig förflyttning 280 ms, utan förtida fadeout.
3. Först efter att alla källobjekt nått överlevaren ersätts dess originalillustration av den nya förädlingen. En familjefärgad, liten kontaktcirkel förstärker det exakta sammanfogningsögonblicket.
4. Det nya objektet blommar fram över 215 ms; därefter visas familjesignaturen och `STADIUM N` enligt tidigare design. Kompositören använder huvudsakligen `transform`/`opacity`, inga pixelfilter, skärmskakningar eller stora vita explosioner.

**Mästerverk som lämnar spelplanen:** Vid Harvest svävar det färdiga föremålet först uppåt utan att förlora opacitet. Först under sista delen av 295 ms-animationen tonar det bort; en begränsad liten guldring visar frigjord energi. Spelets egentliga `harvest`-händelse och poängfördelning är oförändrade.

**Prestandaskydd:** Använder befintliga transient `fusion-fx-layer` och `score-fx-overlay`. Högst två kontakt-/harvestringar på mobil samtidigt per event. Reducerad rörelse hoppar över effekterna och går direkt till korrekt board-state. Varken 7×7-spelregler, levels, räknare, ljud, bakgrund eller sparformat ändras.

**Regression:** `tests/harmony-fusion-motion.test.cjs` testar opaque travel, korrekt destination, ordning före render, synlighetsåterställning, kontaktmarkering och långsammare Harvest. Browser smoke testar rörelsen på riktiga 7×7-rutor genom att kontrollera `fusion-ghost` keyframes. Kopplat till GitHub Actions. Ljud/VFX/performance-kontrakten från 4.1–4.3 körs fortsatt. Slutlig visuell utvärdering och FPS på Android behöver göras av spelaren.


## Pass 5 – Fusion Readability 4.3.2 (2026-10-22)

**Bakgrund:** Spelartest av 4.3.1 visade att normal matchning av 3–5 föremål fortfarande såg ut som att föremålen försvann. Endast själva fusionsrörelsen skulle ändras; spelregler, poäng, kameravy, bakgrund och tidigare VFX behålls.

**Ny timing för vanlig sammandragning:** Varje fusion börjar med **75 ms anticipation**, följs av en fullt synlig rörelse mot det regelvalda överlevande föremålet på **380 ms (3-match)**, **430 ms (4-match)** eller **480 ms (5+ match)**, och avslutas med **55 ms kontaktfas** där ursprungsbilderna ligger kvar på rätt plats innan de ersätts med det nya stadiet. Den totala fusionsinsamlingen tar alltså 510/560/610 ms före en 215 ms förädlingsbloom.

**Visuell kurva:** Föremålen är kvar vid startplatsen under anticipation. De behåller 100 % opacitet och nära full storlek under större delen av färden (15 % av sträckan, sedan 50 % och 86 %), krymper först nära målet och når sitt mål på 78 % skala utan fadeout. Sista positionen hålls under 55 ms; därefter byts board-snapshot och överlevarens nya stadium växer fram. Källrutornas `visibility` återställs i `finally` även om animationen avbryts. Inga extra partikelsystem eller nya långlivade DOM-element introduceras.

**Samtidiga fusioner:** Om två grupper fusioneras samtidigt används en gemensam fusionsklocka som baseras på den största gruppen. Det förhindrar att en mindre grupp slutar animera och kort hoppar tillbaka medan en större grupp ännu rör sig.

**Tillgänglighet/prestanda:** `Minska animationer` förblir omedelbar; prestandamätaren från 4.3 lämnas orörd. Allt sker via existerande `transform`-animationer på visuella kloner och den gamla kontakt-/förädlingssekvensen återanvänds. Ingen ändring av Harmony Rules.

**Tester:** `harmony-fusion-motion.test.cjs` kontrollerar tiderna för grupper med 3/4/5 föremål, obruten full opacitet, verklig färd ända till rätt målruta, 55 ms slutkontakt, samtidig 3+5-match med gemensam klocka, cleanup och harvest. Browser smoke kräver nu minst 510 ms samt hållna slut-keyframes för en verklig spelmatchning. Slutlig användarbedömning på Android avgör om timing/kurva behöver finjusteras.


## Fusion Position Fix 4.3.3 — korrekt spelruteplacering (2026-10-22)

**Fel efter Pass 5:** De rörliga objekten vid sammanslagningar renderades uppe i vänstra hörnet i stället för på de berörda rutorna. **Rotorsak:** `.fusion-fx-layer .fusion-ghost { inset: auto !important; }` i `harmony/styles.css` vann över JavaScripts dynamiskt satta `left`/`top` och nollställde källrutans position. Detta var ett CSS-koordinatfel, inte ett animations- eller regelproblem.

**Åtgärd:** Ta bort den överstyrande `inset`-deklarationen; sätt endast `right:auto` och `bottom:auto`, så att klonens inline `left`/`top` används. Anpassa dessutom `makeFxLayer` till det faktiska positionsursprunget på insidan av spelramens kant med `parent.clientLeft/clientTop`. Då är klonens position och förflyttning i samma koordinatsystem som dess start- och målrutor, även på mobil.

**Regression:** `harmony-browser-smoke.mjs` skapar riktiga kloner på rutor 0, 19 och 48 och jämför uppmätt startposition med respektive ruta. Avvikelsen måste vara under två pixlar, och föremål längst ned till höger ska ligga långt från övre vänstra hörnet. Testet skulle ha slagit fel med den gamla `!important`-regeln. Fem isolerade testgrupper för rörelse, VFX, ljud, poäng och prestanda passerar fortfarande. Tidskurvan 380/430/480 ms från 4.3.2 är oförändrad.

**Release:** 4.3.3, cache-bust för JavaScript och båda CSS-filerna. Bekräftelse i spelarens Android-webbläsare återstår.


## Fusion Timing A/B 4.3.4 — snabbare med korrekt placering (2026-10-22)

**Spelarfeedback:** Efter att 4.3.3 rättat positionsfelet blev sammanslagningen tydlig, men för långsam. Den tidigare hastigheten från 4.3.1 hade inte kunnat utvärderas rättvist eftersom animationskopiorna felaktigt hamnade i övre vänstra hörnet.

**Ändring:** Återställ exakt fusionsindragning från 4.3.1: 280 ms för 3-, 4- och 5-matchning, med samma korta anticipation inuti animationen och sammanslagningens slutliga kontakt. Ta bort det extra 75 ms startstoppet och 55 ms slutstoppet från 4.3.2. Ljud, uppgraderad objektanimation och övriga effekter kvarstår.

**Viktigt:** Behåll korrigerade koordinater från 4.3.3 (`left/top` inte åsidosatta av CSS `inset:auto!important`, samt spelramens `clientLeft/clientTop` i `makeFxLayer`). Detta är ett renodlat timing-A/B-test, inte en rollback av grafik eller position.

**QA:** Samtliga fem isolerade testgrupper för fusion, prestanda, ljud, poäng och VFX passerar. Fusionskontraktet validerar 280 ms även för 4-/5-matchningar och samtidiga gruppfusioner. Browser-smoke kontrollerar startpositionerna på verkliga rutor i övre, mellersta och nedre delen av spelplanen samt 280 ms-animationerna. Slutgiltig mobilupplevelse utvärderas på telefonen.


## Object Expansion 5.0 — nio familjer, fem per nivå (2026-10-22)

**Beslut:** De fyra godkända nya objektfamiljerna **Sushi**, **Maneki-neko**, **Origami** och **Ryu Dragon** är tillagda till de befintliga fem (Sakura, Lykta, Koi, Solfjäder, Bonsai). Samtliga har exakt fem stadium, där stadium 5 är Masterpiece och triggar samma Harmony Pulse/Harvest som förr. **Inga spelsystem för progression eller matchning har ändrats.**

**Bildmaterial:** Samtliga 20 nya individuellt godkända källbilder (fem per familj) sammansatta till en **960 × 768 transparent AVIF-atlas** på `daisugi-bloom/assets/harmony-new-families.avif`, fyra rader × fem kolumner. Varje transparent bild upptar en 192 × 192-cell för native CSS-sprites. Den befintliga femfamiljsatlasen lämnas oförändrad. Den nya atlasen är cirka 86 kB och behöver bara laddas en gång per spelsession. På webben visas rätt sprite med kolumn `(stage-1)*25 %` och rad `row*100/3 %`; native fallbacks visas endast om en atlas inte kan laddas.

| Rad i nya atlasen | Stadium 1 | Stadium 2 | Stadium 3 | Stadium 4 | Stadium 5 – Masterpiece |
| --- | --- | --- | --- | --- | --- |
| Sushi | Laxnigiri | Maki | Sushi-set på lackbricka | Dekorerad festivalbricka | Praktfull sushibåt |
| Maneki-neko | Lucky Charm Bell | Little Lucky Cat | Maneki-neko med guldmynt | Ornate Fortune Cat | Imperial Maneki-neko Shrine |
| Origami | Mönstrat vikpapper | Origamitrana | Decorative Origami Bloom | Ornate Origami Ensemble | Celestial Origami Display |
| Ryu Dragon | Dragon Pearl | Little Ryu Totem | Coiled Ryu Dragon | Ornate Celestial Ryu | Imperial Ryu Guardian |

**Färgidentitet:** Sushi korall/orange + nori + varm guld/sakura. Maneki-neko elfenbensvit, vermilionröd, borstat guld, jadegrön och sakurarosa. Origami rispapperselfenben `#F6F0E2`, indigoblå `#3A4F8F`, sakurarosa `#E6A3BE`, soft teal `#6FAFA8`, folie-guld `#D8B55B`, plommonlila `#6C4A7E`. Ryu jade `#2D8B6E`, crimson `#B93A3A`, antikguld `#C9A24F`, molnelfenben `#F2E7D6`, charcoal `#2B2623`, ljus teal `#56B7B0`. Samma rundade, glossy, illustrativa premiumkänsla som befintliga objekt.

**Nivårotation:** Varje nivå har **fem olika aktiva familjer**. Startbrädet garanteras innehålla minst ett föremål av **var och en av dessa fem**, utan gratismatch och med minst tre möjliga drag. Familjerna väljs deterministiskt utifrån nivånummer; spelplanen och dropplaceringarna förblir slumpmässiga. Alla **nio** har garanterat dykt upp redan vid nivå 3 och får flera återbesök före nivå 10.

| Nivå | Aktiva familjer |
| --- | --- |
| 1 | Sakura, Lykta, Koi, Solfjäder, Bonsai |
| 2 | Sakura, Koi, Solfjäder, Sushi, Maneki-neko |
| 3 | Lykta, Koi, Bonsai, Origami, Ryu |
| 4 | Sakura, Solfjäder, Sushi, Origami, Maneki-neko |
| 5 | Lykta, Bonsai, Sushi, Ryu, Maneki-neko |
| 6 | Lykta, Koi, Bonsai, Origami, Ryu |
| 7 | Sakura, Solfjäder, Sushi, Origami, Ryu |
| 8 | Koi, Solfjäder, Bonsai, Maneki-neko, Origami |
| 9 | Sakura, Lykta, Sushi, Maneki-neko, Ryu |
| 10 | Koi, Bonsai, Sushi, Origami, Ryu |

**Specifika garantier:** Lykta finns med på nivå 6 med målet Lantern Festival; inga nivåer använder alla nio samtidigt. Ett pågående äldre sparat spel migrerar eventuella inaktiva identiteter till familjer i nivåns nya uppsättning utan att nollställa stadium, drag, poäng eller RNG-räknare. VFX-signatur och ljudklang utökas för nya familjer. Inga ändringar av regellogiken för 3/4/5-matchning, Masterpiece eller Harmony Pulse.

**QA:** Ren regeltestning verifierar alla nio familjer, exakt fem per nivå, faktisk förekomst på startbrädet för alla tio nivåer och återföring av äldre sparfiler. Browser-smoke kontrollerar kodens nivåtäckning samt att en riktig Android-layout avkodar 960 × 768-AVIF och visar Origami-/Ryu-sprites i nivå 3. Slutlig upplevelse/test av nivåbalans och ljus-/färgskillnaderna görs på telefonen.
