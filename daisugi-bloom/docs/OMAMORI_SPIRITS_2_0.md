# Omamori Spirits 2.0 — Identity & Bond

Japanese Harmony · 2026-10-26 · version 6.48.0

## Syfte
Omamori ska kännas personliga utan att göra det lättare eller svårare att klara en nivå. Detta är en första testbar iteration med **Sakura** och **Daruma**; övriga fyra Omamori finns kvar som kosmetiska samlarföremål.

## Två identiteter
| Kort | När blir uppdraget klart? | Tre Bond-gränser |
| --- | --- | --- |
| Sakuras välsignelse | Skapa minst ett Masterpiece på en nivå när Sakura är utrustad | 1, 3, 6 **olika nivåer** |
| Darumas löfte | Träffa minst en Daruma eller Sealed Stone på en nivå 21–40 när Daruma är utrustad | 1, 3, 6 **olika nivåer** |

- En nivå kan ge **högst ett Bond-framsteg per Omamori**. Kedjor, omspelningar, och flera träffar i samma nivå ger inte ytterligare framsteg.
- Inga retroaktiva Bond-framsteg; du måste äga och bära Omamorin när händelsen inträffar.
- Bond-uppdrag är frivilliga och får räknas även om nivån förloras; de påverkar inte nivåmål, stjärnor, poäng, drag eller Harmony Director.
- Nivå 21–40 ger Daruma realistisk möjlighet att utvecklas. Före dess är kortet kosmetiskt men kan fortfarande bäras.
- Alla Bond-belöningar är **presentation**: en kompakt utrustad markering under spel, ett kort glöd-/symbolögonblick vid relevant händelse och ökat sken/bättre animation vid Bond 2–3. Respekterar "Minska animationer".
- I Omamori-butiken visas uppdrag, progressbar, aktuell nivå och nästa belöning. Samtliga sex ursprungliga kort och Harmony Coins-priser behålls.

## Sparning
`save.spirits={version:1,bonds:{sakura:{levels:[]},daruma:{levels:[]}}}` läggs till befintlig `japanese-harmony-puzzle-v2` i browserns localStorage. Befintliga `save.economy`, stjärnor, nivåer, Harmony Coins och utrustad Omamori bevaras. Progression är lokal för browserprofilen, inget konto eller betalstöd finns.

## Implementering
- `harmony/spirits.js`: observerar endast bekräftade spelevents efter ett giltigt byte, ägarskap och nivåindex. Muterar endast `save.spirits`, aldrig spelmotorn eller plånboken.
- `harmony/app.js`: integration i `trySwap`, utrustningsvy och VFX-ögonblick. Sparar Bond direkt när kvalificerad händelse inträffar.
- `harmony/mobile-game.css` och `index.html`: kompakta mobila visuella element och cache-version.
- `tests/harmony-spirits.test.cjs`: regler, engångsbelöning, persistence, kosmetiskt kontrakt.
- `tests/harmony-economy-browser.mjs`: mobilt utseende, utrustad markering, Bond efter omladdning.

## Avgränsningar
- Inga riktiga köp, slumpmässiga paket, gameplay-bonusar, extra drag eller Premium-kort införs.
- Tematiska uttryck är en **första CSS/VFX-prototyp**, inte färdig specialillustration eller fristående samlingsrum.
- Om testspelare uppskattar mekaniken: välj nästa omgång för den stora visuella premiumutvecklingen och de övriga fyra korten.
