# Daisugi Bloom — UI, Score & Tree Celebration 1.2

**Status:** Implementerat som ett eget pass i `daisugi-bloom/`. Tidigare godkända spelregler och övriga spel i repot är oförändrade.

## Bakgrund: utvärdering av 1.1
Efter mobiltest beskrev spelaren **hela** det tidigare blekvita/ljusgröna gränssnittet som "Excel", saknade poäng som belöning för lyckade kombinationer och såg knappt de färdiga träden innan de försvann. Grundfragmenten kändes också fortfarande som färgade kulor.

## Genomförd design och implementation

### 1. Japanskt inspirerad, färgstark UI
- Ny genomgående färghierarki: mörk indigo/bläckblå, jade/matcha, sakura-rosa, gyllene amber och korall/vermilion.
- Alla större UI-delar är omstajlade: toppmeny, nivålista, nivå-/målpaneler, drag kvar, energimätare, Power Move, resultatdialog, trädvy, knappar och inställningar.
- Mörkare bakgrund och djupare panelytor ersätter den tidigare bleka vita appkänslan. Rutnätets geometry och 7×7-layout behålls.
- Versionsetikett och tillgångarnas cache-parametrar uppdaterade till **1.2**.

### 2. Poäng och kombobelöningar
`Game.score` uppdateras i spelmotorn och ingår i snapshots/sparade nivåomgångar. `save.bestScore[level]` är högsta poäng per nivå och lagras separat från stjärnor (effektivitet) och livskraft (skördade träd). Gamla sparningar utan score kan fortsätta spela med 0 som startvärde.

**Prototypvärden (arbetsbalans, inte låsta designbeslut):**
- Match 3: +100, match 4: +180, match 5+: +300.
- Växtutveckling: grodd +30, blomma +60, buske +120, träd +350.
- Automatisk Nature Cascade får multiplikator 1,0×, 1,5×, 2,0× ... upp till 4,0× på matchpoängen.
- Bloom Pulse: +40 poäng per växt som verkligen utvecklas.
- Skörd: +500 per träd plus +250 per extra träd i samma sammanhängande trädkedja.
- Nivå avklarad: +500 plus +50 per kvarvarande drag.
- Power Move får samma match-/puls-/skördepoäng som andra drag, men kostar fortsatt inget vanligt drag och laddar inte ny naturenergi från sin egen reaktion.

**Feedback i spelet:** ny live-HUD för POÄNG/REKORD, flytande poäng vid fusioner, pulser och skörd, Nature Cascade-multiplikator, Bloom Chain/Wild Bloom-indikator och resultatskärm med total score och tidigare rekord.

### 3. Tree Celebration
Tidigare sekvens: fusion → puls → skörd spelades nästan omedelbart.
Nu: när ett träd skapas genererar spelreglerna en explicit `hero`-händelse **mellan** fusion och puls. Vid nytt träd skapat av puls skickas en motsvarande hero-händelse innan nästa pulsvåg.

- Trädet står synligt och växer/andas med en mjuk glöd, ljuspartiklar och en ring vid basen.
- **Första trädet:** ca 990 ms firande. **Efterföljande pulsvåg:** ca 680 ms firande. Endast en hero-event per våg med alla nya träd tillsammans.
- En liten "TRÄD SKAPAT!" / "TRÄDEN BLOMSTRAR!"-banner visas, innan pulsen går vidare och träden till slut skördas.
- Spelarnas val `Minska animationer` och snabbspolning stöds; den logiska ordningen ändras inte.

### 4. Miniatyrernas igenkänning
De fyra grundfragmenten har inte längre exakt samma kulform med olika färger: Sakura har fem kronblad, Verdant bladformer, Mistbloom en upprätt daggdroppe och Sunleaf gyllene strålar. Fortsatt stiliserade 3D-objekt, inte handgjorda slutliga modeller.

## Kontroller och regression
`node daisugi-bloom/tests/rules.test.cjs`: omfattar bland annat score delta-avstämning mot slutpoäng, pulspoäng, sparning, Power Move-poäng utan dragkostnad och att alla träd firas före skörd.

Automatisk mobiltestning: start av Babylon, närvaro av poäng-HUD, popup, versionsetikett och färgstarkt UI.

## Saker att testa manuellt
1. Uppdatera spelvyn så det står `UI · SCORE · BLOOM 1.2` på startsidan.
2. Bedöm om den nya paletten är japanskt inspirerad och tillräckligt kontrastrik även på mobil.
3. Skapa några vanliga fusioner: kontrollera att poängen tickar och visas nära rutan.
4. Testa en stor kedja: flera poänghändelser, kombobonus och synligt rekord.
5. Skapa ett träd: nu ska det stå kvar, få firande och **därefter** pulsera och skördas.
6. Prova Power Move och kontrollera att det ger poäng, men inte kostar ett vanligt drag.
7. Avsluta och spela om en nivå: rekordpoängen ska finnas kvar, samtidigt som sparad livskraft inte dubbelräknas.
8. Skicka skärmbilder av både vanlig spelvy och nivåsresultat för fortsatt balansering.

## Nästa pass, inte implementerat
Ytterligare handgjorda 3D-växtmodeller, avancerade bladanimationer och storskalig nivåvariation kan utvärderas efter användarfeedback på version 1.2.
