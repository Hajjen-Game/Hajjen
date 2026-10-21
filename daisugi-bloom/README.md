# Daisugi Bloom — Plant Art Integration 1.3

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
