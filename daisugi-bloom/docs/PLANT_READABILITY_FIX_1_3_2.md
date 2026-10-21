# Daisugi Bloom — Plant Readability Fix 1.3.2

**Status:** Implementerat i GitHub. Ingen förändring av spelregler, nivåmål, poäng eller permanent Daisugi-träd.

## Bakgrund
Efter 1.3.1 kunde spelaren se växterna i färg men rapporterade att bilderna på 7×7-brädet visades **upp och ner**, med **väldigt dålig skärpa**. Spelplanen hade dessutom onödiga marginaler.

## Korrigeringar

1. **Rätt orientering:** Babylon-texturen skapas nu med `invertY=true`, så WebP-bildarkens topp/botten motsvarar Plant Art Lab.
2. **Skarpare texturer:** atlaserna använder bilinjär filtrering utan mipmaps för dessa små 2D-växtbilder, så Babylon inte väljer alltför suddiga lågupplösta mipmapnivåer.
3. **Korrekt mobilupplösning:** `hardwareScalingLevel` är en *invers* upplösningsfaktor i Babylon. Koden använder `1 / min(devicePixelRatio, 2.5)` för upp till 2,5 renderade pixlar per CSS-pixel, i stället för den tidigare låsta faktorn minst 1 som gjorde att mobilens högre pixeltäthet förlorades.
4. **Större spelplan:** spelvyn använder mindre sidomarginaler på mobil och ortografiska kamerans bounds har minskats från ±3,95 till ±3,64. Växtstadiernas bildstorlek har dessutom ökats måttligt; trädens korta celebration får fortsatt synas större.
5. **HUD-justering:** stadieindikatorer och flytande poäng justerades till den större spelplanens projektion.
6. **Cache:** alla skript och stilmallar använder särskild 1.3.2-cacheparameter i HTML, så att telefonen inte återanvänder gamla renderingsinställningar.

## Regressionstester

GitHub Actions:
- Regel- och syntaxkontroller (spelmekaniken är orörd).
- Mobilheadless-test för 390 CSS px bredd och 2× mobil pixeltäthet.
- Krav på verklig högupplöst backing-canvas, snävare ortografisk kamera och bredare canvas.
- Kontroller av texturnas `invertY`, bilinjär filtrering och avstängda mipmaps.
- Bildanalys av **faktiskt renderade WebGL-pixlar** för att fånga svarta silhuetter och tom/trasig grafik.

Godkänt test: canvas 374 CSS px renderades internt till 748 px; svart pixelandel 0 och detekterade färgpixlar i spelbrädet cirka 85 procent (måttet inkluderar mark/vegetation och är främst ett regressionstest, inte ett värde för grafikkvalitet).

## Fortsatt konstnärlig begränsning
De nuvarande arkiven innehåller fem växter per familj med **176×176 px per originalcell**, vilket är tillräckligt för en prototyp men fortfarande begränsar de allra finaste detaljerna på högupplösta mobilskärmar.

Ett nytt set större WebP-atlaser skapades från de befintliga transparenta originalbilderna som lokalt försök, men filöverföringen av dessa binära bilder till GitHub fungerade inte. **De större bildarken är därför inte incheckade**. 1.3.2 förbättrar renderingen utan att påstå att bildarkens filupplösning har höjts.

## Test för spelaren

- Jämför fröväxterna på nivå 1 med bilderna i Plant Art Lab: blommor/blad ska nu vara rättvända.
- Kontrollera att konturerna är skarpare och att spelplanen tar större andel av mobilens bredd.
- Spela ett par fusioner och en Bloom Pulse för att verifiera att poäng, animationer och draginteraktioner fungerar.
- Skicka nya skärmbilder om du vill att vi finjusterar skärpa eller bildstorlek ytterligare.
