# Daisugi Bloom — First Playable 1.0

Datum: 2026-10-20  
Status: Första implementation för användartest; **balans och grafik ej slutligt godkända**.

## Implementerat

- Separat statisk webbsida på `/daisugi-bloom/` med Babylon.js 3D-spelbräde.
- Match-3 på 7×7, familj matchas oberoende av stadium. Fusion prioriterar högsta stadium.
- Grodd/blomma/buske som procedurala mjuka 3D-miniatyrer, färdigt träd som övergående animation.
- Bloom Pulse når fyra ortogonala grannar; varje växt max en pulstillväxt per sammanhängande kedja; varje nytt träd kan i sin tur pulsa.
- Skörd före gravitation, enbart fröpåfyllning, Nature Cascades och automatisk hjälp vid dödlägen.
- Fyra naturfamiljer, naturenergi, gratis Power Move, informationspanel vid val och valfria siffror för växtstadiet.
- Fem introduktionsnivåer, stjärnor från effektivitet, livskraft från skördade träd.
- Separat 3D-trädvy med permanent tillväxt och flera kosmetiska utseenden, upplåsta genom livskraft.
- Lokal sparning av nivåframsteg och pågående spel samt högsta intjänade livskraft per nivå.

## Tillfälliga implementationbeslut (INTE nya fastställda spelarbeslut)

1. Matchöverlevare: högsta stadium först, sedan växten som flyttades in i matchningen, annars stabil närhet till matchens mitt.
2. En korsmatch är en enda sammanhängande fusion.
3. Ogiltig swap återställs utan att förbruka drag.
4. Naturenergi: 3-match +22, 4-match +38, 5+-match +52 och +8 för efterföljande kaskadsteg. En Power Move kan lagras, och ett Power Move-utlöst förlopp laddar inte mätaren.
5. Ett skördat träd ger 30 livskraft. Endast en förbättring av tidigare nivårekord läggs till permanent livskraft.
6. Stjärnor: 1 för klarad nivå, +1 vid minst 22 % kvarvarande drag och ytterligare +1 vid minst 44 %.
7. Om inga vanliga matchningar är möjliga blandas seedfragment varsamt om. Högre stadier avses behållas.
8. Nivåerna 3–5 använder handplacerade, delvis utvecklade växter för att snabbt demonstrera pulser och specialdrag. **Endast nya fallande fragment är frön**.
9. Tre trädutseenden: Daisugi (från start), Frodig krona (90 livskraft), Blommande (180 livskraft). Ren kosmetik.
10. Inga automatiska dragledtrådar har lagts in ännu eftersom användaren inte har bestämt hur de ska fungera.
11. Ingen separat tidsbegränsning. Efter femte nivån kan man spela om nivåer och förbättra resultat.

## Första fem nivåerna

| Nivå | Mål | Fokus |
|---|---|---|
| 1. First Petals | Utveckla en blomma (stadium 3) | Swap och vanlig fusion |
| 2. Growing Together | Utveckla en buske (stadium 4) | Matcha blandade stadier |
| 3. The First Bloom | Skapa minst ett träd | Träd, Bloom Pulse och livskraft |
| 4. Ripple Grove | Minst tre träd från samma pulskedja | Strategisk placering |
| 5. Nature's Gift | Använd Power Move och skapa minst två träd | Familjeval och gratis matchning |

## Första användartestet

1. Öppna sidan på mobil och bedöm om frö, grodd, blomma och buske kan särskiljas utan siffror.
2. Testa tryck-val och svep för swap; ett ogiltigt drag ska inte minska dragantalet.
3. På nivå 3 kan en tydlig matchning i mitten skapa det första trädet.
4. På nivå 4 kan man byta den högra rutan i mittenraden med rutan precis ovanför; det ska skapa en stor grön pulskedja.
5. På nivå 5: välj Verdant i Power Move och ersätt Mistbloom-fröet till höger om mittbusken; det ska starta en direkt fusion utan att använda drag.
6. Kontrollera att två träd i samma våg animeras tillsammans och att inga diagonala växter utvecklas.
7. Kontrollera att permanent livskraft inte dubblas vid omspelning av samma nivå med samma resultat.
8. Prova att byta utseende i trädvyn utan att tillväxten försvinner.
9. Prova på verklig mobilbredd och med `Visa växtstadier` på/av samt `Minska animationer`.

## Föreslaget nästa utvecklingspass efter feedback

- Förbättra lågstadieväxternas silhuetter och 3D-animationernas mjukhet utifrån skärmbilder.
- Justera antal drag, fröfördelning, naturenergi och trädskördar utifrån spelarens upplevelse.
- Ge en tydligare träd-tillväxtövergång om spelarens feedback visar att procedurala former känns för statiska.
- Fixa eventuella mobil- och webbläsarproblem innan nya nivåer/hinder.
- Behåll versionerade GDD- och implementationstillägg.

## Omfattning

Kod är begränsad till `daisugi-bloom/`. Ingen ändring av `wildpath/`, `arena3v3/`, `pvp-25d/`, `v4-b/` eller rootens navigering. Designbeslut i `DAISUGI_BLOOM_GDD_1_0.md` är fortsatt referens; alla nya värden ovan är testbara arbetsantaganden.
