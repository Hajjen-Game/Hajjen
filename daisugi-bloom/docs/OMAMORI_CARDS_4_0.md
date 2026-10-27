# Omamori Cards 4.0 — Consumable Cards & Tiered Powers
Japanese Harmony · version 6.50.0

## Överenskommen spelmodell
- **Själva Omamori-kortet förbrukas.** Kortet ägs, utvecklas och förbrukas som en enhet; det finns inga separata laddningar/användningssaldon.
- Ett förbrukat kort försvinner även om nivåförsöket därefter misslyckas. Ett avbrutet/ogiltigt val förbrukar ingenting.
- Ett nytt kort köps för **Harmony Coins** och börjar **alltid på stadium I**, med tom uppdragsjournal. Också tidigare stadium-III-kort nollställs.
- Alla kort kan användas direkt på stadium I. Uppdrag på **tre respektive sex olika nivåer med kortet utrustat** utvecklar dess effekt till II och III. Vid redan registrerat nivåuppdrag får omspelning inte duplicera framsteg.
- Olika ägda Omamori får aktiveras **flera gånger på samma nivåförsök**, en gång per *kort*. Ingen tidigare begränsning på en aktivering per nivåförsök finns kvar.
- Endast de tre första kortsorterna har aktiva förmågor i denna pilot; de övriga tre kan bäras och utvecklas i väntan på sitt kraftpass.

## Aktiva förmågor
| Omamori | Stadium I | Stadium II | Stadium III |
| --- | --- | --- | --- |
| Sakuras välsignelse | Uppgradera 1 vald vanlig bricka +1 | Uppgradera 2 olika brickor +1 | Uppgradera 3 olika brickor +1 |
| Koins väg | Blanda ett 2×2-område | Blanda ett 3×3-område | Blanda samma 3×3-område en gång eller, om du vill, **en andra gång** utan extra kort |
| Månens ro | 2 extra drag vid förlust | 3 extra drag vid förlust | 5 extra drag vid förlust |

- Harmony Pulse och naturliga kedjor kan uppstå från Sakuras uppgraderingar.
- Shuffle bevarar originalobjekt (familjer, ID, utvecklingsstadier), flyttar aldrig Daruma/Sealed Stone och får aldrig orsaka en ogiltig/stillastående spelplan eller en automatisk match utan spelarbeslut.
- Koins andra shuffle erbjuds *efter* första och kan avbrytas via **Behåll**. Första bekräftelsen förbrukar ett kort. En enda ytterligare omblandning är tillåten, inom exakt samma område.
- Månkortet förbrukas när spelaren uttryckligen bekräftar återupptagning från förlust.
- Assisterade segrar låser upp nästa nivå men håller **stjärnstämplar, gamla rekord och ordinarie första-belöningar** åtskilda.

## Migration / ekonomi
- Nytt fält `save.omamoriCards={version:1,cards:{...},discovered:[...],replay:{...}}`.
- Vid första uppdateringstillfället konverteras varje tidigare köpt Omamori från gamla `economy.owned` till **ett** ägt fysiskt kort. Befintliga nivåuppdrag från Sakura/Daruma ger motsvarande stadium (1, 2 eller 3).
- Gamla separata `save.powers.charges` används inte längre, men sparas passivt för möjlig felsökning. Historisk upptäcktsinformation lever vidare i `economy.owned`, men berättigar aldrig till en ny gratis aktiv kopia.
- Befintliga Harmony Coins, alla sparade nivåer, poäng och stjärnor bevaras.
- En oassisterad omspelning av en avklarad nivå ger **4 Harmony Coins**, max fem sådana belöningar per UTC-dag. Det hindrar att spelare låses ute efter att de redan samlat första-stjärn-mynten.
- Det finns **ingen riktig betalning**, premiumvariant eller slumpköp i denna version.

## Kod
- `harmony/cards.js`: fysiska kort, migration, köp, utrustning, utvecklingsuppdrag, förbrukning och omspelekonomi.
- `harmony/powers.js`: stadiumskalning och säkra bordseffekter.
- `harmony/app.js`: mobilkortlek, bekräftelse, flerval för Sakura, tvåstegs-Koi och extra drag från Månen.
- `tests/harmony-powers.test.cjs`: kort/effekt/regressionskontrakt.
- `tests/harmony-powers-browser.mjs`: riktig mobilanvändning, samt flera kort inom samma omgång.
