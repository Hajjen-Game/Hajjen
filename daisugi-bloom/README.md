# Japanese Harmony — aktivt 7×7-fusionspussel (5.6.x)

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
