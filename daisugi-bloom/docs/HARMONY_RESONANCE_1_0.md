# Japanese Harmony 5.5.0 · Harmony Resonance 1.0

**Status:** Implementerat i ordinarie spel (Standard), och i experimentell Director-motor. Ingen ny meny, knapp, power-up eller ändring av nivåmålen.

## Speldesign

**Resonans:** Två ortogonalt intilliggande föremål (upp/ned/vänster/höger) av **samma familj** bildar en diskret guld-/mintfärgad koppling om minst ett av dem är **stadium 3 eller 4**. Diagonaler gäller inte. Föremålet med högst stadium blir kopplingens visuella ankare. Som mest **sex länkar** visas samtidigt för att undvika ett plottrigt rutnät; alla giltiga länkar fungerar ändå i spelets regler.

**Harmony Echo:** Om spelaren i ett **senare manuellt byte** gör en matchning där BÅDA redan sammanlänkade föremålen ingår i **samma direkta fusion** utlöses Harmony Echo. Kopplingen måste finnas innan bytet; att skapa en koppling genom själva bytet räcker inte. Efterföljande automatiska fusioner och Harmony Pulse kan inte lösa ut extra Echo. Max **en Echo per spelardrag**.

**Belöning:** +125 poäng om ankaret var stadium 3, +200 om stadium 4. Inga extra drag, omedelbara stadiehöjningar eller dolda förbättringar av slumpen. En gyllene/mintfärgad ring, kort flytande text, egen mjuk tretonsklang samt poängflykt till HUD visar att belöningen utlösts. Echo visas även i resultatstatistik och Engine Lab.

**Lågmäld estetik:** Linjerna dras bara i glappet mellan objekten, inte över deras illustrationer. Stilla små ljuspunkter markerar ankarna. På mobil begränsas dekorativa animationer; inställningen Reducerad rörelse respekteras. Kopplingar visas endast på den stabila spelplanen och avaktiveras under swap/fusion/fall. Länklagret fångar aldrig pektryck.

## Implementation

- `harmony/rules.js`: deterministisk `resonanceLinks(board)` som identifierar objekt-ID-baserade länkar. `swap()` armerar kopplingarna **före** att bitar flyttas; endast första manuellt triggade fusionen kan ge Echo. `resolve()` ger särskild `echo`-event med `scoreDelta` och räknaren `echoes`.
- `harmony/app.js`: `refreshResonance()` bygger högst sex diskreta linjer när brädet är i vila, separata ankarklasser, `animateEcho()` visar kort ring och text, befintligt poängflyg hanterar Echo. Ny hjälptext och resultatstatistik.
- `harmony/audio.js`: `echo`-cue med separat cooldown och oförändrade röstgränser.
- `harmony/mobile-game.css`: transparens, lågmäld highlight och reduced-motion-fallback.
- `harmony/diagnostics.js`: `avgEchoes` och per-run `echoes` i versionerade rapporter.
- `index.html`: version 5.5.0.

## Kontrakt / regression

`tests/harmony-resonance.test.cjs` kontrollerar:
- Stadium 3 eller 4 och samma familj, ingen stadium-2-belöning.
- Exakt +125/+200, korrekt poäng- och räknaröverföring till save/resume.
- Ingen Echo om länken inte fanns innan spelarens byte.
- Ingen Echo i `resolve()` (passiva kaskader).
- Högst en Echo per giltigt drag, riktiga spel med sparfilskontrakt.
- Mobil smoke: länklagret kan inte fånga pekhändelser och en syntetisk manuell fusion ger exakt en Echo.

Manuella UI-tester på användarens telefon återstår, liksom visuell granskning av linjernas storlek och färg.

## Utvärdering

I 120 deterministiska spelomgångar fördelade över samtliga tio nivåer registrerades 74 legitima Echo-aktiveringar. Detta är en teknikvalidering med enkla botdrag, inte ett mått på människors upplevelse eller engagemang. Vid framtida justeringar ska balans i spelets poäng, antal aktiveringar per nivå och estetisk tydlighet utvärderas utan att börja garantera belöningar.
