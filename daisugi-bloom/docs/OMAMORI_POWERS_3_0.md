# Omamori Powers 3.0 — Active Blessings & Consumables

Japanese Harmony · 2026-10-26 · v6.49.0

## Första pilot: tre aktiva krafter

| Ägt kort | Förmåga | Användning |
| --- | --- | --- |
| Sakura | **Bloom Touch** | Välj vanlig bricka stadium 1–4 och höj den ett steg. Stadium 5 triggar Harmony Pulse mot fyra grannar och fortsatta kedjor. |
| Koi | **Ripple Shuffle** | Välj mittenruta för en 3×3-omblandning. Flyttar aldrig Daruma/Sealed Stones; bevarar identiteter och stadier; avvisar positioner utan minst ett lagligt byte eller som skulle ge automatiska gratismatcher. |
| Månens ro | **Second Chance** | Erbjuds först när spelarens drag tar slut och nivån misslyckas: återuppta med tre extra drag. |

## Permanent samling och förbrukningsbara välsignelser

- Det **permanenta Omamori-kortet**, utrustning och Bond 1–3 behålls. Varje aktivering förbrukar **en charge**, högst en aktivering per nivåförsök, även efter omladdning.
- Tidigare ägare av något av de tre testkorten får en gratis provanvändning per ägt kort genom engångsmigreringen. Nya köpare med Harmony Coins får också en provanvändning.
- En nivå som slutförs **utan aktiv kraft**, medan ett av pilotkorten är utrustat, ger **en charge** per unikt nivåindex och kort. Max tre i förrådet. Ingen belöning genom repetition eller assisterad vinst. Inga betalköp.
- Sakura och Koi markeras genom val på spelplanen, med uttrycklig bekräftelse innan charge dras. Om en Koi-omblandning saknar godkänt resultat förbrukas ingenting.
- Månens ro erbjuds i förlustdialogen, där användaren bekräftar en extra chans. Förlusten kan i stället accepteras.

## Rättvisa och assisted records

- Aktiva krafter påverkar den pågående nivån och får föra spelaren till nästa nivå, men omgången blir **assisterad**.
- Vanliga `bestStars`, `fourFamilyStars`, `bestScores`, `fourFamilyScores`, `bestChain`, `fourFamilyChain` och Harmony Coins påverkas **inte** av en assisterad vinst. Separata `assistedStars` och `assistedScores` sparas för utvärdering.
- Goshuincho-stämplar baseras fortfarande på oassisterade rekord. En assisterad vinst låser ändå upp nästa nivå. Resultatskärmen ska tydligt beskriva skillnaden.
- Nivåns vanliga mål, dragkrav, Board, Director och poängberäkning är oförändrade när inget kort används.
- När ett kort används spelas samma händelsetyper (Harmony Pulse, Awakening, collection etc.) upp i appen.

## Lokala sparfält

`save.powers={version:1,charges:{sakura,koi,tsuki},claimed:{sakura:[],koi:[],tsuki:[]},starters:[]}`.

`save.run.data.assisted` och `save.run.data.blessingUsed` följer med sparad påbörjad omgång även efter browser-uppdatering. Inga centrala spelarprofiler eller köpregister används ännu.

## Tekniska filer
- `harmony/powers.js` — provlager/inventering, förbrukning, riktad användning och gameplay-events.
- `harmony/app.js` — aktiva knappar, välj ruta, bekräfta, räddningsmodal, assisterade rekord.
- `harmony/mobile-game.css` + `index.html` — kompakt mobilrad och resultatmarkering.
- `tests/harmony-powers.test.cjs` och `tests/harmony-powers-browser.mjs`.

## Nästa utvärdering
Testa effektens styrka, hur ofta spelaren tjänar charges och om användarna förstår skillnaden mellan assisterade och vanliga stjärnor. Spelet ska inte sälja boosts innan den balansen är beprövad.
