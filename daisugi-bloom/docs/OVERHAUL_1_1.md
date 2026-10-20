# Daisugi Bloom – Visual & Gameplay Overhaul 1.1
Datum: 2026-10-20

## Varför passet behövdes
Användarens mobiltest av First Playable 1.0 visade att spelplanen såg ut som ett Excel-kalkylblad, växterna var för små, nivå 3–5 gick att vinna med ett enda drag och fusioner, Bloom Pulse och Daisugi-trädet saknade den avsedda visuella kvaliteten.

## Implementerat 1.1

### 3D och spelplan
- Bort med kraftigt vita rutor och tjocka limegröna linjer. Varmare jordfärg, nära sammanhängande rutor, smal mjuk mosskant.
- Frön, groddar och buskar större relativt varje ruta, så att deras familj och växtstadium lättare ska kännas igen på mobil.
- Fyra naturfamiljer har olika silhuetter: Sakura (runda blomblad), Verdant (bladverk), Mistbloom (daggdropp/blommor) och Sunleaf (gyllene stjärnform).
- Mjukare och mattare material; mindre hårda highlights och mindre överexponering.
- Byte/fusion: konsumtion mot överlevande växt, utveckling med växtuppslag och blad-/ljuspartiklar.
- Bloom Pulse: fyra mjuka gröna energifronter med ljushalo och små partiklar; ingen rotgrafik. Grannväxterna reagerar med synlig tillväxt.
- Skörd: växten lyfter och löses upp; ljuspartiklar rör sig från platsen. Fall sker ned mot spelplanen, inte som horisontell rörelse.
- Permanent träd: moderstam, flera smala uppåtriktade stammar och separata avsmalnande kronor för att närma sig riktig daisugi-silhuett.

### Nivåbalans
- Tidigare förberedda buskar i nivå 3–5 har tagits bort. Ingen startnivå har färdiga buskar.
- De fem nivåernas mål kräver fler kombinationer och mer uppbyggnad:
  1. First Petals: 14 fusioner (14 drag).
  2. Growing Together: 15 fusioner **och** odla till buske (20 drag).
  3. The First Bloom: skörda 3 träd (25 drag).
  4. Ripple Grove: skörda 4 träd totalt, inklusive 2 träd i samma pulskedja (35 drag).
  5. Nature's Gift: använd Power Move och skörda 5 träd (31 drag).
- Startbräden genereras utan befintliga matcher och med högst stadium 3 på högre introduktionsnivåer.
- Nya frön i påfyllningen undviker de flesta men inte alla oavsiktliga omedelbara matcher; Nature Cascades finns kvar, medan planerade Bloom Pulses blir viktigare.
- Stjärntrösklar använder par-gränser per nivå i stället för en enkel procentsats oanvända drag.
- Flerdelade mål visar progress för båda delarna i HUD.

### Behållna designbeslut
- 7×7, byte mellan grannar, matchning över växtstadier inom samma familj, en överlevande växt utvecklas ett stadium.
- Fyrvägs-Bloom Pulse, max en tillväxt per växt i samma pulskedja, skörd innan fall.
- Enbart frön faller ner, Nature Cascades kvarstår.
- Power Move är gratis och kan omedelbart skapa fusion, men genererar inte ny naturenergi från sin egen reaktion.
- Effektivitetsstjärnor och livskraft separata, ett enda permanent träd som kan omformas utan att förlora tillväxt.

## Tester och kända återstående begränsningar
- GitHub Actions kör logiktester samt mobil/headless-webbläsartest med en faktisk Babylon-motor.
- Procedurala 3D-växter och animationsövergångar är förbättrade men fortfarande inte handgjorda slutliga 3D-modeller.
- Svårighetsbalansen bygger på automatiserade genomspelningar; den måste fortfarande valideras med verkliga spelare.
- De långsiktiga systemen (hinder, fler nivåer, trädmutationer, sociala funktioner) ingår inte.
- 1.0-sparfiler lagras fortsatt i samma prototypmiljö; gamla nivårekord kan därför fortfarande visas och varje nivå kan spelas om manuellt.
- Tidigare prototypversioner har inte ändrat kärnmekanikens låsta regler.

## Nästa utvärdering
Ta nya mobilskärmbilder av nivå 1, blandade frö/grodd/blomma/buske, en faktisk Bloom Pulse, permanenta Daisugi-trädet och resultatskärmen. Kontrollera framför allt att silhuetter och rutmaterial fungerar i faktisk mobilstorlek, samt om nivå 4 behöver balanseras ytterligare.

Observera att detta dokument beskriver utförd implementation och testbara arbetsval, inte nya användargodkända designbeslut. Läs fortsatt [Game Design Document 1.0](DAISUGI_BLOOM_GDD_1_0.md).
