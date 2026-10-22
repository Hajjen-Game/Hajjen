# Japanese Harmony 5.5.1 · Harmony Resonance Visual Polish 1.1

**Status:** Implementerat i ordinarie mobil-/webbspel. Endast visuell förbättring. Harmony Resonances regler, Harmony Echo-poäng (+125/+200), Harmony Pulse, antal tillåtna Echo per drag, fusioner, nivåmål, refill, Director och befintliga sparfiler är oförändrade.

## Visuella förbättringar

1. **Flödande energitråd:** Varje av högst sex synliga resonanskopplingar har en tunn mint-/guldgradient med ett ljusparti som rör sig längs tråden på cirka 4,7 sekunder (5,5 sekunder på mobil). Tråden ligger mellan figurernas silhuetter, inte ovanpå deras centrala motiv. Det är vanlig CSS på ett litet HTML-element, inte canvas, WebGL eller ett frame-baserat partikelsystem.
2. **Ljus vid ny möjlighet:** När en koppling mellan två objekt först blir aktiv ritas en cirka 0,8 sekunder lång mjuk puls över båda rutorna. En koppling identifieras av föremålens stabila objekt-ID:n. Pulsen spelas **inte** om vid vanlig markering av en annan ruta.
3. **Tydligare källa:** Stadium 3/4-föremålet får en diskret varmare kant, svagt inre mintljus och en liten gyllene glödpunkt utan att sprite-illustrationen döljs.
4. **Harmony Echo payoff:** När en redan existerande länk används i en verklig fusion minns klienten den länkens skärmkoordinater före bytet. Två korta stråk dras mot fusionens landningspunkt, följt av en lätt förstärkt Echo-ring och den tidigare Echo-texten/klangen. Det ändrar **inte** Echo-triggern eller poängen.

## Prestanda och tillgänglighet

- Max **sex** synliga trådar, och ingen kontinuerlig JavaScript-loop.
- Linjeelement återanvänds så länge samma objekt-ID-par är aktivt; detta förhindrar att energiflödet återstartar vid varje rendering.
- Under swap, fusion, fall och shuffle döljs resonansoverlayen; när brädet landar visas den igen.
- Overlay och effektfragment har `pointer-events: none` och blockerar aldrig touch eller mus.
- Både `prefers-reduced-motion` och spelets egen inställning **Minska animationer** stänger av den löpande trådanimationen, startpulsen och Echo-rörelserna.
- Uppdaterad layout hanterar ändrad skärmstorlek utan att starta om redan existerande kopplingar.
- Inga nya bilder, externa resurser, menyer, poängregler eller spelobjekt.

## Tekniska ändringar

- `harmony/app.js`: ihållande `resonanceNodes`, `resonanceLastKeys`, ett litet transient Echo-geometriminne, en gång per länk/settled-board startpuls och visuellt sammanflöde vid Echo.
- `harmony/mobile-game.css`: små CSS-keyframes `resonance-current`, `resonance-appear`, `resonance-discovery`, samt Echo-stråk och rörelsereducering.
- `tests/harmony-browser-smoke.mjs`: mobilvalidering av långsamt flödande tråd, en kort discovery-puls, touch-transparens och både system- och appstyrd rörelsereducering.
- `index.html`: versionssatta resurser `?v=5.5.1`, inklusive CSS och JS för att undvika att en telefon laddar en gammal cachad version.
- `harmony/diagnostics.js`: etikett `gameVersion: "5.5.1"`; simuleringar och underliggande regler förblir oförändrade.

## Utvärdering

QA via statiska syntaxkontroller, befintliga regel- och komponenttester, samt mobil-browser-smoke i projektets CI. Visuell balans (trådens styrka på faktiska skärmar, kontrast över de olika festivalbakgrunderna och Echo-belöningens tydlighet) kräver fortfarande speltest på användarens telefon.

**Nästa separat pass:** Board Praise Callouts 1.0 ingår uttryckligen **inte** i detta arbete.
