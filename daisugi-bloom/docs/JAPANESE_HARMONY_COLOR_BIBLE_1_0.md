# Japanese Harmony — Color & Art Bible 1.0

**Design-ID:** `JH-COLOR-1.0`  
**Identitetsnamn:** **Japanese Harmony — Midnight Garden**  
**Datum:** 2026-10-21  
**Omfattning:** Det nya japanskinspirerade 7×7 match-/fusionsspelet, som för närvarande utvecklas ur Daisugi Bloom-idén. Spelets slutliga namn är ännu inte bestämt.  
**Status:** **Obligatorisk art-direction-standard för all kommande grafik.** Färgerna är ett konkret designförslag som assistenten tagit fram på användarens begäran; de är inte individuellt godkända av användaren ännu och kan justeras när de första bilderna utvärderas. Ändra inte paletten tyst mellan genereringar.

## 1. Visuell identitet

**Ledstjärna:** *Mörk, elegant japansk UI-ram + varm, lugn zen-spelplan + färgstarka, igenkännbara japanska objekt*. Detta förenar det tidigare UI:t som användaren gillade med de varma illustrerade ikonerna, utan att 20 olika föremål behöver få en helt annan stil.

- **UI**: djup blågrön bläckkänsla, diskreta jade-/stenkanter, varm gräddvit typografi, guld för belöningar. Premium och mysigt, inte kallt neon eller nästan helt vitt.
- **Spelplan**: neutral varm sand/sten för att fem objektfamiljer ska synas. Lugn materialstruktur, inte kalejdoskop eller starkt färgad rutbakgrund.
- **Objekt**: färgrika, handmålade/soft-3D-inspirerade, rundade och taktila med gemensam ljusriktning, skärpa och skala. De ska tydligt särskiljas i form, inte bara kulör.
- **Visuell prioritet**: 1) spelpjäser, 2) matchning/utveckling, 3) mål/drag/rekord, 4) dekor.
- **Kontrast**: mörk UI + ljus text, mörk text på ljus sand. Undvik små ljusa texter på korallröd bakgrund utan extra kontrastbehandling.

## 2. Obligatoriska färgtokens

### 2.1 UI och varumärke — fasta basfärger

| Token | HEX | Funktion |
|---|---|---|
| `--jh-ink` / **Midnight Ink** | **#102A37** | Appens bakgrund, djupaste konturer |
| `--jh-panel` / **Temple Teal** | **#254853** | Paneler, kort, HUD |
| `--jh-panel-raised` | **#315966** | Upphöjda paneler och knappar |
| `--jh-outline` | **#65867F** | Mjuka kanter/avdelare på mörka ytor |
| `--jh-ivory` / **Warm Ivory** | **#FFF2DC** | Primär text mot mörkt |
| `--jh-text-muted` | **#C6D3CA** | Sekundär text mot mörkt |
| `--jh-sakura` / **Sakura Pink** | **#EE91AF** | Dekor, små accenter, utvalda highlights |
| `--jh-coral` / **Festival Coral** | **#DD6655** | Varm signalfärg, knapp- och festivalkänsla |
| `--jh-gold` / **Harmony Gold** | **#F2C66E** | Stjärnor, rekord, prestation, guldglans |
| `--jh-primary-button` | **#F0B879** | Viktig CTA mot mörk text `#102A37` |
| `--jh-harmony-mint` | **#78D1B0** | Harmony Pulse, förädlingsenergi |
| `--jh-selection` | **#F6D98A** | Markerad ruta/aktiv handling, ej familjefärg |

### 2.2 Spelplan — neutral och lugn

| Token | HEX | Funktion |
|---|---|---|
| `--jh-board-sand` / **Zen Sand** | **#EADDC8** | Grundyta i de 49 spelrutorna |
| `--jh-board-sand-alt` / **Soft Stone** | **#D9CAB2** | Mycket mild materialvariation och kanter |
| `--jh-board-line` | **#B8A78F** | Tunna rutavgränsningar |
| `--jh-board-frame` / **Garden Border** | **#A58B73** | Yttre ram av trä/sten/sand |
| `--jh-board-text` | **#334B49** | Liten text/siffror ovanpå sand om sådant behövs |

Rutor ska ha låg detaljkontrast och aldrig konkurrera med objekten. Grönt i moss- och stenramen är ett subtilt materialinslag, inte ett grönt schackrutemönster.

### 2.3 Objektfamiljer — fem visuellt distinkta ankare

| Familj | Primärt HEX-ankare | Silhuett och material |
|---|---|---|
| **Sakura** | **#EE91AF** | Rosa organiska kronblad, gräddvita högdagrar, mjuka bladformer |
| **Lykta** | **#DD6655** | Korall/vermilion, pappersstruktur, mörkt trä och varm inre ljuskälla |
| **Koi** | **#E8A354** | Varm amber/orange, elfenbensvita kontraster, rund kropp och fenor |
| **Solfjäder** | **#699DBD** | Dämpat indigo-/havsblått, ljusgräddvita papper och tydlig solfjädersilhuett |
| **Bonsai** (introduceras senare) | **#75B68A** | Jade-/salviagröna kronor, varmt brun stam och keramikskål |

Färgankaret gäller hela familjen genom fem stadier. Materialnyanser, kontrasterande högdagrar och små gula/krämvita detaljer är tillåtna, men familjer får **inte** byta huvudkulör mellan bilder eller generationer. Mer avancerade stadier blir detaljrikare och mer förfinade, inte slumpmässigt mer neonfärgade. På varje 7×7-ruta: tydlig familj + tydligt stadium även utan att läsa färgen.

## 3. Lås för framtida generering av grafik

**Obligatoriskt i varje framtida bildgenereringsuppdrag:**

1. Läs `JH-COLOR-1.0` och bifoga relevanta HEX-koder som bindande palett.
2. Behåll **gemensam bildstil**: japanskinspirerat illustrerat spelmaterial, mjuka men skarpa former, taktila material, mjuka skuggor; inte fotorealistiskt eller blockigt low-poly.
3. Skapa **inga gameplaybilder** som visar andra spelfamiljer, extra power-ups, hinder eller andra nya mekaniker, om de inte specifikt efterfrågas.
4. Objektbilder exporteras som **verkliga transparenta PNG** (alfa i filen), ett centrerat objekt per ruta, utan bakgrund, text, logotyper eller inbakad schackrutig transparensillustration.
5. Objektens perspektiv, beskärning, ljusriktning och upplevda storlek hålls konsekventa mellan alla 5 stadier och alla familjer. Lägre stadier får inte vara så små att de försvinner på mobilen.
6. **Spelbräde**: 7×7 = exakt 49 fria, lika stora rutor; inga växter, blommor, stenar, mosskvistar eller annan dekor inne i eller ovanpå de spelbara rutorna. All dekor endast **utanför** det spelbara rutnätet.
7. **Transparent spelplansbakgrund** betyder verklig alfa utanför ytterramen; rutornas sand/stenyta är däremot avsiktligt opak. Inga inbakade rutmönster som ser ut som alfa. Kontrollera faktiskt alfakanal.
8. För att eliminera försvunna/felräknade rutor är det **tekniskt föredraget** att göra illustrerad **ram/background som separat PNG** och lägga det exakta interaktiva 7×7-rutnätet i spelet. Om ett helt rutnät ingår i PNG:n måste alla 49 rutor kontrolleras geometriskt före integrering.
9. Som tekniskt referensmått för en 2048×2048-bild kan 7×7-området vara 1792×1792 px (7 celler à 256 px), centrerat med 128 px ram runtom. Anpassa efter motorns faktiska layout; detta är ett produktionsmått, inte ett krav på varje kreativ skiss.
10. Separata kapitelteman får variera **dekoren och miljömaterialen** (zen/sakura/festival/natt), men **inte** ändra bas-UI:ts HEX-tokens eller familjernas färgidentiteter. Revidering kräver nytt versionsbeslut.

## 4. Ljus, effekter och hierarki

- Standardljus: mjukt och varmt från övre vänster; måttlig ambient occlusion; högdagrar och runda material, skarpa konturer.
- Harmony Pulse: mjuk mintgrön ljusvåg `#78D1B0` med diskreta gyllene `#F2C66E` partiklar; inte dominerande vita explosioner.
- Stora fusioner: varm guldaccent utan att täcka föremålens huvudform.
- Nattlig UI-bakgrund får ha lågkontrastmönster men spelplanen och objekten är visuellt viktigast.
- Säker textkontrast: `#FFF2DC` på `#102A37` ca 13,5:1; `#C6D3CA` på `#254853` ca 6,4:1; `#334B49` på `#EADDC8` ca 7,0:1. Beroende på knappfärg använd mörk text.

## 5. Checklista innan bild godkänns

- [ ] Exakta relevant HEX-ankare respekteras, utan oförklarliga kulörbyten
- [ ] Föremålet/boarden matchar tidigare assets i proportioner, skugga, detaljnivå
- [ ] Föremålen är snabbt avläsbara i en liten mobilruta
- [ ] 7×7-ytan är komplett och helt fri från dekor
- [ ] Alfa/transparens fungerar verkligen, inte ritad grå/vit schackbakgrund
- [ ] UI är mörk jade/bläck + varm ivory/guld, inte ett helt nytt ljus-UI
- [ ] Endast sådant som hör till spelets godkända design introduceras

## 6. Beslutsgränser och historik

Detta är färgstandarden för **det nya japanska objektpusselspelet**, inte en automatisk omfärgning av den fortfarande spelbara **Daisugi Bloom 1.x**. Befintlig kod eller grafik ska inte ändras av dokumentationen i sig. Efter att användaren har utvärderat första visuella resultaten kan vi versionsuppdatera paletten med explicit, dokumenterad feedback.
