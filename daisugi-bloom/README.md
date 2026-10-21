# Japanese Harmony — First Playable 2.0

> **AKTIV SPELPROTOTYP från 2026-10-21.** Den japanska match-/fusionsspeldesignen har nu ersatt den gamla Daisugi Bloom-startsidan i `daisugi-bloom/index.html`. Den äldre 1.x-versionen ligger kvar som historisk kod i `src/` men laddas inte i det nya spelet. GDD och färgstandarden är styrande.

**Spela (GitHub Pages):** https://hajjen-game.github.io/Hajjen/daisugi-bloom/  
**Aktuell motor:** `harmony/rules.js`; **UI:** `harmony/app.js` + `harmony/styles.css`. Ingen extern Babylon-CDN behövs för detta 2D-matchpussel.

**Implementerat:** 7×7, Sakura/Lykta/Koi/Solfjäder, 5 stadier, 3–5+ matchningar inklusive T/L, högsta stadium överlever på sin plats, +1/+2 grannbonus vid 4/5-matchning, Harmony Pulse-kedjor från stadium 5, först efter pulser nedfall av stadium-1-föremål, inga Power Moves eller hinder, kontrollerade startbräden, 10 första nivåerna, stjärnor/poäng/rekord, fri omstart och vidare spel efter mål. Ny sparfil med separat nyckel, inga gamla Daisugi-framsteg importeras.

**Faktiska bildassets är nu integrerade** via `assets/harmony-atlas.webp`: en transparent 5×5-atlas med 176×176 px per stadieruta. Rader: Sakura, Lykta, Koi, Solfjäder, Bonsai. Kolumner: stadier 1–5. Spriteatlasen är byggd från godkända separata illustrationer och används på de 49 spelrutorna. **Känd återstående bildfråga:** Av det tillgängliga godkända lyktsourcematerialet hittades endast fyra unika bilder; lyktstadium 5 använder tills vidare samma källa som stadium 4. Detta är en synlig tillfällig lösning och måste ersättas när originalstadium 5 identifierats. Atlasen får inte misstas för de fullstora originalen.

**Teststatus:** GitHub Actions `Japanese Harmony & legacy checks` kontrollerar spelregler, regressioner och mobilvy; gröna kontroller bekräftar teknisk bas men inte färdig svårighetsbalans. Speltest av dragbudgetar och kapitelmål återstår.

- [GDD 2.0](docs/JAPANESE_HARMONY_PUZZLE_GDD_2_0.md)
- [Color & Art Bible 1.0](docs/JAPANESE_HARMONY_COLOR_BIBLE_1_0.md)

---

## Historisk dokumentation — Daisugi Bloom 1.x

# Daisugi Bloom — Plant Readability Fix 1.3.2

> **Ny design under framtagning (ingen ny spelkod):** [Japanese Harmony Puzzle GDD 2.0](docs/JAPANESE_HARMONY_PUZZLE_GDD_2_0.md) — japanska objekt, Harmony Pulse och rekordbaserade pusselnivåer. **Obligatorisk färgidentitet för framtida grafik:** [Japanese Harmony — Midnight Garden / Color & Art Bible 1.0](docs/JAPANESE_HARMONY_COLOR_BIBLE_1_0.md). Befintliga Daisugi Bloom 1.3.2 nedan är fortfarande den äldre, spelbara prototypen.



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
