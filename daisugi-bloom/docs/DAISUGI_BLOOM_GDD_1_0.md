# Daisugi Bloom — Game Design Document 1.0

> **NYARE DESIGNINRIKTNING (2026-10-21):** Användaren har valt ett separat, japanskinspirerat pusselspel med japanska objekt, Harmony Pulse, inga hinder och ingen Power Move. **Den aktuella speldesignen dokumenteras i [Japanese Harmony Puzzle GDD 2.0](JAPANESE_HARMONY_PUZZLE_GDD_2_0.md) och dess bindande [Color & Art Bible 1.0](JAPANESE_HARMONY_COLOR_BIBLE_1_0.md).** Denna äldre GDD 1.0 är historik för den befintliga Daisugi Bloom-prototypen, inte instruktion att bygga nya grafikassets efter gamla växt- och Power Move-regler.



**Datum:** 20 oktober 2026  
**Status:** Designunderlag inför första spelbara prototypen. Dokumentationen ger inte i sig godkännande att börja programmera.  
**Syfte:** Permanent, lätt att återläsa beslutslogg. Denna fil skiljer bindande spelarbeslut från arbetsförslag och öppna frågor.

## 1. Vision och kärnloop

Daisugi Bloom är ett mobilfokuserat, lättillgängligt match-3-/odlingspussel. Spelaren byter plats på närliggande naturfragment på en full 7×7-bräda. Matchningar får en växt att växa genom fem stadier. Ett färdigt träd skickar en **Bloom Pulse** till sina fyra ortogonala grannar, vilket kan skapa en kedjereaktion av nya träd. Träden skördas till **livskraft** som används för att utveckla spelarens **enda permanenta Daisugi-träd**, synligt i en separat vy mellan nivåerna.

Kärnloop: **Swap → matchning/fusion → växtutveckling → färdigt träd → Bloom Pulse → skörd/livskraft → fallande frön och nya matcher → nivåmål/stjärnor → permanent Daisugi-utveckling.**

Designprinciper: enkelt att förstå, strategiskt djup från placering och kedjereaktioner, korta nivåer, stor visuell belöning utan rörig spelplan. Daisugi-trädet ska inte dominera spelvyn under själva nivån.

## 2. Fastslagna spelarbeslut (LÅST)

### 2.1 Spelplan och interaktion

- **Konsekvent 7×7-spelplan**, 49 rutor.
- **Klassisk full spelplan:** normala rutor är fyllda med naturfragment. Tillfälliga luckor uppstår när fragment förbrukas under en fusion och fylls sedan på.
- **Swap av intilliggande rutor** är huvudsaklig handling (match-3). Match = minst tre från **samma naturfamilj**, även med **olika utvecklingsstadier**.
- **Fyra naturfamiljer** är den arbetsmodell som använts i designen. De följer **samma mekaniska grundregler**, inte separata specialkrafter.
- **Fem växtstadier:** frö → grodd → blomma → buske → träd.
- **Bara grundfragment/frön faller ner** som ny påfyllning. Högre stadier skapas genom fusion och Bloom Pulse.
- Nivåerna ska ha **varierade mål** (t.ex. ett visst antal träd, särskilda familjer, livskraft, större kedjor; senare miljömål), men samma kärnregler.

### 2.2 Växtutveckling, träd och Bloom Pulse

- Matcher leder till **fusion och växtutveckling**, inte bara att fragment försvinner.
- Designens genomgående arbetsregel: den **mest utvecklade växten** i den matchade gruppen överlever och växer **ett steg**; övriga matchade fragment förbrukas.
- När en växt blir ett **färdigt träd** skickar den **alltid Bloom Pulse**.
- Bloom Pulse påverkar exakt **fyra ortogonala grannrutor** (upp, ner, vänster, höger), **inte diagonaler**. Familjen hos grannväxten saknar betydelse.
- Varje grannväxt som påverkas växer **ett stadium**. En buske som blir ett träd kan skicka vidare en ny puls.
- **Samma växt får utvecklas högst ett steg genom en sammanhängande Bloom Pulse-kedja**, även om flera pulser träffar samma växt.
- Färdiga träd **skördas till livskraft** och lämnar spelplanen; de ligger inte kvar som permanenta hinder eller ytterligare matchobjekt.
- Vanliga matchningar och påfyllning kan också skapa **Nature Cascades** (nya automatiska matchningar efter fallande frön).

### 2.3 Naturenergi och Power Move

- Matchningar och kombinationer **fyller en naturenergimätare**.
- När mätaren är full får spelaren en **gratis Power Move** som inte förbrukar ett vanligt nivådrag.
- Spelaren väljer **själv naturfamiljen** för sitt nya **grundfragment/frö**.
- Spelaren placerar fröet genom att **ersätta en valfri ruta på den fulla spelplanen**.
- Placeringen **får omedelbart starta matchning och Bloom Pulse**, utan extra vanlig swap.

### 2.4 Resultat och permanent träd

- **Stjärnbetyg belönar effektivitet** vid nivåmålet (i synnerhet antal drag).
- **Livskraft belönar skapade/skördade träd.**
- Spelaren har **ett enda permanent Daisugi-träd**, som växer över många nivåer.
- Trädet utvecklas både **automatiskt genom livskraft** och genom **spelarens utvecklingsval vid milstolpar**.
- Trädets samlade tillväxt går **inte förlorad** vid kosmetiska ändringar. Utseendet kan justeras senare; tidigare val ska inte vara oåterkalleliga.
- Naturfamiljerna ger **mindre visuella avtryck**, medan spelaren har **stor frihet att själv styra trädets huvudsakliga utseende**.
- Det permanenta trädet har **egen vy mellan nivåerna**, och ska **inte uppta stor yta, eller behöva synas alls, under pusselspelande**.

### 2.5 Grafik, kamera och animation

- **Små stiliserade 3D-växter**, rundade former, tydlig volym, mjuka skuggor; spelplanen ses **nästan rakt uppifrån**.
- **Släta, tydliga spelrutor** med **mjuka jord- och mossdetaljer i kanterna**. Neutrala rutmaterial, inte färgkodade golv som konkurrerar med växterna.
- Vanliga fusioner ska vara **snabba**; färdiga träd och Bloom Pulse får större, mer levande 3D-animationer.
- Bloom Pulse visas med **mjuka gröna energivågor och små ljuspartiklar** som färdas över spelplanen; **inte synliga rotspår**.
- Växternas 3D-form ska normalt förmedla utvecklingsstadiet. När spelaren markerar en växt visas stadiet **diskret**; en inställning får aktivera **permanent stadieindikator** på alla rutor.

## 3. Rekommenderad mekanisk regelordning (ARBETSREGLER — EJ ALLA SEPARAT GODKÄNDA)

Denna ordning har diskuterats upprepade gånger men alla kantfall är ännu inte uttryckligen låsta:

1. Spelaren gör ett giltigt swap, eller använder Power Move (direktmatchning tillåten).
2. Identifiera matchade grupper om minst tre från samma familj. Fusionsmottagaren är den mest utvecklade växten och växer ett steg. Övriga matchade växter förbrukas.
3. Skapas ett färdigt träd aktiveras dess Bloom Pulse. Trädet finns kvar visuellt tills dess puls behandlats.
4. Varje puls påverkar bara de fyra upptagna ortogonala grannrutorna. En växt påverkas max en gång per **sammanhängande pulskedja**. Nya träd får avge varsin puls en gång.
5. När hela pulskedjan är klar skördas träden och ger livskraft.
6. Fyll luckorna med enbart frön. Kontrollera om nya matcher bildas; i så fall behandlas de som en ny Nature Cascade-omgång.
7. Avsluta nivån först efter att pågående reaktioner har avslutats och uppnådda mål räknats.

**Viktiga öppna kantfall:**
- Vilken växt överlever om två eller fler matchade växter ligger på samma högsta utvecklingsstadium? Föreslaget: prioritet för den flyttade växten, med fast reservregel för automatisk kaskad.
- Hur kombineras samtidiga horisontella/vertikala matcher och T-/L-former? Föreslaget: sammanhängande grupp löses som en fusion, inte dubbel uppgradering av samma växt.
- Hur hanteras ett Power Move som ersätter en redan högt utvecklad växt? Spelaren ska tydligt se vad som går förlorat och kunna avbryta innan placeringen bekräftas.
- Ska en Power Move-utlöst kedja ladda naturenergi? **Föreslagen skyddsregel:** den ger vanlig livskraft men inte ny naturenergi, så man inte kan kedja gratisdrag oändligt.
- Vad sker om spelplanen saknar giltiga drag? Föreslaget: gratis och varsam omblandning som bevarar högre växtstadier, eller en kontrollerad lösning utan låsning.
- Om en påfyllningskaskad direkt efter pulskedjan skapar nytt träd är detta en **ny** pulskedja; konsekvensen för tidigare berörda växter bör verifieras i en regeltest.

## 4. Visuell art direction — arbetsnamn och referensformer

Fyra visuella naturfamiljer har föreslagits och använts i skisser (arbetsnamn, kan justeras):

| Familj | Palette | Formkänsla | Exempel på trädets diskreta kosmetiska avtryck |
|---|---|---|---|
| **Sakura / Blomning** | rosa, korall, gräddvitt | mjuka runda blomblad | rosa blomklasar |
| **Verdant / Skog** | smaragd, mint, mossa | spetsiga blad, tät grönska | tätare grönt lövverk |
| **Mistbloom / Dagg** | turkos, ljusblå, silvergrön | klockblommor, mjukt hängande blad | daggdetaljer, blå blomning |
| **Sunleaf / Sol** | guldgul, honung, varm orange | stjärnblommor, bredare blad | varma gyllene accenter |

Visuell design måste vara lättläst på mobil även för personer som inte kan särskilja alla färger: **färg + silhuett + stadium**. Växterna ligger i samma storleksskala och delar material- och ljusdesign. Buskar är bredare/fylligare än blommor, groddar är små och låga; ett färdigt träd får tillfälligt expandera under animationen men ska inte skymma resten av spelplanen.

UI: stor kvadratisk 7×7-bräda (~90–95 % av mobilens bredd som arbetsförslag), ovanför kort nivåmål och drag kvar, under en naturenergimätare. Ingen stor bild av det permanenta trädet under spel. Ortografisk kamera nästan rakt ovanifrån (cirka 75–80 grader från markplanet är arbetsförslag). Ljus, lugn och taktil trädgårdskänsla; undvik plottrig vegetation och dominant glow.

### VFX / animationer för prototyp

**Måste se bra ut:**
1. Swap med tydlig, snabb förflyttning.
2. Vanlig fusion där två förbrukade växter dras in mot mottagaren och mottagaren **synligt växer**.
3. Buske → kortvarigt 3D-träd: stam och krona utvecklas.
4. Bloom Pulse i fyra tydliga riktningar med mjuk grön energifront, få ljuspunkter och synlig växtreaktion.
5. Följdvågor: träd som skapas i samma omgång animeras samtidigt; tydlig stegvis våg.
6. Trädskörd till livskraft och fallande nya frön.
7. Grundläggande diskreta ljud för fusion, träd, puls, skörd samt avstängningsmöjlighet.

**Kan vänta:** avancerad omvärld, stort kosmetikbibliotek, hindervarianter, omfattande musiksystem, massor av partikelsorter, kampanjkarta och många nivåer. Minska rörelse/snabbspolning ska planeras för tillgänglighet och tempo.

Tidstankar **att testa**, inte låsta: swap ca 0,12–0,18 s; enkel fusion 0,25–0,40 s; trädets framväxt ca 0,40–0,65 s; puls till granne 0,15–0,25 s, med överlapp för flera träd i en våg.

## 5. Nivådesign och första prototyp

**Kärnmål:** nivåer med begränsat antal drag, inte en timer. Nivåmålen varierar inom samma regler: skapa antal träd, vissa familjeträd, samla livskraft, planera flerträds-Bloom Pulse, senare återställa områden med hinder. Ett stjärnbetyg ska visa effektivitet, medan livskraft kommer från träden.

**Första fem genomtänkta nivåerna, rekommenderat prototypsnitt:**

1. **Första fusionen:** lär swap och utveckling från frö till grodd/blomma.
2. **Första busken:** lär att samma växt kan utvecklas flera gånger och hur den överlever matchningar.
3. **Första trädet:** lär trädskapande, skörd och första Bloom Pulse; visar påverkan på permanent Daisugi.
4. **Planerad puls:** förbered två nästan färdiga växter runt en punkt och skapa kedjan med skicklighet.
5. **Naturenergi och Power Move:** välj familj, ersätt ruta gratis, utlös omedelbar matchning och gärna Bloom Pulse.

Nivå 6–10 kan öka variationen genom särskilda familjer, större kedjor, livskraftsmål och stjärnutmaning; första större trädutseendevalet vid ungefär nivå 10 har föreslagits. **Exakta nivåmål, startbräden, antalet drag och belöningsvärden är ännu inte låsta.**

Startbräden bör vara genomtänkta och testade, inte blint slumpmässiga. Nya fragment som faller är frön. Hinder såsom sten och torr jord introduceras **senare**, inte i första fem. Nivåer bör normalt vara korta (cirka 2–4 minuter som målsättning, ännu inte validerat).

## 6. Stjärnor, livskraft och personligt Daisugi-träd

**Låst:** två skilda belöningar, nivåbetyg för effektivitet och livskraft för skördade träd. Ett enda permanent träd växer automatiskt och genom val, kan stylas om utan att förlora tillväxt. Familjerna lämnar bara mindre visuella avtryck.

**Arbetsförslag för rättvisa och omspelning (inte uttryckligen låsta):**
- En stjärna räcker för att gå vidare. Oanvända drag kan ge stjärnbonus.
- Nivån avslutas när målet nåtts och hela pågående reaktionen räknats klart.
- För att motverka oändlig farmning räknas permanent bara förbättringen över spelarens tidigare bästa livskraftsresultat vid omspelning av en nivå.
- En misslyckad nivå ger inte permanent livskraft.
- Livskraft används automatiskt för att utveckla trädets bas; utseendealternativ låses upp och kan bytas utan kostnad.
- Tillväxten fortsätter på lång sikt genom stamstruktur, kronor, blomning och detaljer snarare än obegränsad storlek.
- Trädvyn kan visa tidigare utvecklingsstadier samt jämförelse före/efter nivåbelöning.

## 7. Öppet att besluta — INGET STOPP för första prototyp

**Högst prioritet innan specifik logik implementeras:**
1. Tie-breaker om flera växter har samma stadium, inklusive samtidigt korsmatch och fallande kaskader.
2. Exakt poäng-/energibalans; Power Move-interaktion med mätaren; hur många Power Moves får sparas.
3. Villkor för ett giltigt swap; hantering av deadlock och att utvecklade växter inte förstörs av omblandning.
4. Hur första fem nivåers startbräden och mål utformas för att visa första Bloom Pulse tidigt nog.
5. Hur man granskar/ångrar val av Power Move-ruta innan den tillämpas (utan att spelaren tappar värdefulla buskar av misstag).

**Kan vänta till efter speltest:**
- Exakta kosmetiska familjenamn och färgkoder; justering av modellernas detaljer.
- Nivå 6–100, hinderdesign, utvecklingsmilstolpar för långa kampanjer.
- Trädets fullständiga 3D-customization, sparade utseendepresets, avancerat ljud och finish.
- Automatiska dragledtrådar. Förslaget har varit ett diskret tips efter inaktivitet, men spelaren har **inte beslutat** om denna fråga.

## 8. Prototypens godkännandekriterier

En användbar första prototyp ska kunna visa att:

- Familj och stadium är avläsbara på mobil utan permanenta siffror, och valbar siffervisning fungerar.
- Swap, fusion och påfyllning har förutsägbara och rättvisa resultat.
- Två eller fler avsiktligt placerade buskar kan omvandlas genom en planerad Bloom Pulse.
- Diagonaler påverkas aldrig; ett fragment utvecklas max en gång i samma pulskedja.
- Power Move kostar inget vanligt drag, låter spelaren välja fröfamilj, ersätter vald ruta och kan direkt trigga fusion/puls.
- Träd omvandlas till livskraft; stjärnor beror huvudsakligen på effektivitet.
- Ett enda permanent Daisugi-träd visar synlig progression över flera nivåer och bevarar tillväxt vid byte av upplåst utseende.
- Upplevelsen är rolig även utan det permanenta trädets belöning: vanliga fusioner och Bloom Pulse måste kännas bra i sig.

## 9. Arbetsprincip vid fortsatt utveckling

**Detta dokument är designens checklista.** Vid ny chatt: läs denna fil först, jämför med ny feedback och dokumentera nya **godkända** beslut som versionerade tillägg. Markera förslag och antaganden separat från vad spelaren uttryckligen beslutat. Ändra inte designregler tyst, och börja inte bygga bara för att ett dokument finns. GitHub-ändringar sker först när användaren ber om dem.

**Spelkonceptets kortpitch:** *Daisugi Bloom är ett mysigt, strategiskt 7×7-pussel där du matchar levande miniatyrväxter, utvecklar dem till träd och skapar gröna kedjereaktioner genom Bloom Pulse. Skördade träd ger livskraft åt ditt enda personliga Daisugi-träd, som växer och formas under hela din spelresa.*