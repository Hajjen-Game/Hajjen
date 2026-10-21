# Daisugi Bloom – Plant Art Integration 1.3

**Status:** Implementerad i GitHub. Detta pass ändrar bildpresentationen men inte spelregler, poäng, progression eller nivåbalans.

## Vad som ändrats

Vi har ersatt de tidigare proceduralt uppbyggda 3D-växterna på **7×7-brädet** med 20 förrenderade, transparenta illustrationer. Bilderna skapades tillsammans med spelaren med japanska trädgårdar och premium match-3-grafik som inspirationsriktning.

Alla fyra naturfamiljer har fem stadier:

| Familj | Frö | Grodd | Blomma | Buske | Träd |
| --- | --- | --- | --- | --- | --- |
| Sakura | glansig_sakura_i_fröskal.png | glansig_körsbärsblomma_ur_fröskal.png | glansig_sakuraklase_med_daggdroppar.png | blomstrande_sakurabuske_i_bonsaistil.png | glansfull_sakurabonsai_i_blomning.png |
| Verdant | glansig_grodd_i_öppet_frö.png | glansigt_trädplantsskott_i_fröskal.png | glansig_bonsai_i_frodig_grönska.png | glansig_fantasibonsai_med_daggdroppar.png | färgstarkt_bonsaiträd_i_mossig_stenträdgård.png |
| Mistbloom | pärlemorsskimrande_mistbloom_sådd.png | glittrande_akvamarinblomma_med_daggdroppar.png | glittrande_iskristallblomma_med_daggdroppar.png | glittrande_akvablå_blomsterkluster.png | magiskt_bonsaiträd_med_lotusblommor.png |
| Sunleaf | glödande_grodd_i_gyllene_fröskal.png | glödande_solblommeskott_med_daggdroppar.png | glödande_gyllene_lotusblomma_med_dagg.png | glödande_gyllene_blomsterbuske.png | glödande_gyllene_bonsai_med_blomnster.png |

Dessa källbilder är inte individuellt uppladdade till GitHub i originalupplösning. Det är deras **optimerade slutresultat** som ingår i repot. Originalkällorna ligger i den ursprungliga bildskapande konversationen.

## Grafikpipeline

- Varje av de fyra familjerna packas i ett eget transparent WebP-bildark: `assets/plants/<family>-atlas.webp`.
- Varje ark innehåller fem fält på 176×176 bildpunkter (totalt 880×176).
- Bilderna trimmades till det faktiska synliga innehållet och centrerades innan optimering.
- `src/plant-art.js` beskriver vilket atlasfält som hör till familj och stadium.
- `src/visuals.js` använder **ett kameravänt Babylon-plan per växt** och fyra delade transparenta texturer. Vi behåller Babylon-spelplan, skuggor och VFX.
- Befintliga fusioner, Bloom Pulse, Nature Cascades, trädskapande, skörd och Power Move fortsätter att använda samma logiska händelser.
- Den permanenta Daisugi-trädvyn är fortfarande **riktig 3D**, oförändrad i detta pass.

### Storlekar

Atlasbeskärningen är gemensam och spelplanens objekt skalas per stadium för tydlig progression. Stadion 1–2 är mer kompakta, 3–4 större och trädstadiet visas som störst under Tree Celebration innan skörd. Alla beslut kan justeras grafiskt utan att ändra spelreglerna.

## Plant Art Lab

Tillgängligt med knappen **Plant Art Lab** på startsidan eller via `?lab=plants`.

- Fyra rader (naturfamiljer), fem kolumner (utvecklingsstadier).
- Klicka på en växt för att förstora förhandsvisningen.
- **Visa utveckling** spelar stegvis upp samma familj från stadium 1 till stadium 5.
- Piltangenterna *Familj* väljer nästa/föregående naturfamilj.
- Labbet påverkar inte sparade spel eller progression.

## Tester

- GitHub Actions kör `node daisugi-bloom/tests/rules.test.cjs` för spelreglerna, oförändrade från version 1.2.
- Mobiltestet verifierar att 20 art-celler visas, att alla fyra WebP-material laddas, att Lab-spelaren når stadium 5 och att riktig 3D-spelplan fortfarande startar.
- Kontrollera visuellt på mobil att beskärning, storlekar, läsbarhet och färgåtergivning fungerar under nivå 1–5. En sådan subjektiv bedömning ersätter inte automatiska tester.

## Avgränsning

Det permanenta Daisugi-trädets 3D-modell, poängsystemet, naturenergin och de fem nivåernas balans påverkas inte. Detta är en ren grafikintegration.
