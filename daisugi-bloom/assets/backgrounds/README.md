# Festival Night — 6 backgrounds (Japanese Harmony UI 3.0)

**Status:** Sex motiv godkända som bakgrundskandidater av användaren och nu aktiva i spelet. Renderingsstil: **Premium Festival Night med Zen-kontroll**. Giltig övergripande färgbibel: `daisugi-bloom/docs/JAPANESE_HARMONY_COLOR_BIBLE_1_0.md`.

## Bildkällor

Atlasen `festival-night-six.avif` innehåller sex lodräta kompositioner från de två ursprungliga tredelade, AI-genererade bildarken. Varje panel har formats om till **320 × 640** för en optimerad **1920 × 640** AVIF-bild (~40 KB). Ordning vänster till höger:

1. Månbelyst sjö, pagod och vattenfall
2. Lykta, festivalstad och bro
3. Zen-trädgård med koi, lyktor och sakura
4. Nattligt tehus, sjö och sakuraträd
5. Lyktportal och japansk stenväg
6. Bambu-vattenfall och koi i kvällsljus

**Val:** JavaScript väljer en av sex bildpaneler vid varje ny nivåstart eller omstart, utan att upprepa samma direkt efter varandra. Samma panel behålls under hela nivån och vid `Resume` av sparat spel. Vid storleksändring räknas bakgrundens täckande skalning och utsnitt om.

## Visuella skydd

- En **mörk nattblå skuggoverlay** läggs ovanpå bakgrunden men under hela UI:t. Paneler använder mörka, halvtransparenta gradients och tunna accenter i Harmony Gold.
- Spelrutorna är varmare och cirka 5–12 % mörkare än tidigare; ikonernas originalfärger och bakgrundstransparens får **inte** mörkas ned separat.
- Ingen tung blur i alla 49 rutorna. Endast **en** komprimerad AVIF-fil, redan laddad och återanvänd mellan nivåerna, visas. Animationer och bildatlas från spelet påverkas inte.
- Om webbläsaren inte kan läsa AVIF eller om bilden inte laddas används den mörkblå grundfärgen automatiskt, utan oläsbart UI.
- Om ett av sex motiv visar sig störa läsbarheten på någon telefon, exkludera det från poolen vid ett senare QA-pass — utan att kompromissa med kontrasterna.

## Placering och referens

I JavaScript: `daisugi-bloom/harmony/app.js` → `chooseFestivalBackground` och `layoutFestivalBackground`.

I CSS: `daisugi-bloom/harmony/styles.css` → `Premium Festival Night × Zen Control — UI Art Lift 3.0`.

**Framåtblick:** Om användaren vill höja bakgrundsskärpan ytterligare kan atlasen vid behov bytas mot sex separat exporterade original i större upplösning, utan att förändra det nuvarande nivåvalet, de godkända familjefärgerna eller layouten.
