# Sharkan sprite workflow

A Sharkan sprite is a replaceable asset. Game code should never depend on visual padding except through an explicit foot anchor.

## Production checklist

- real transparent alpha background
- same camera angle within one direction
- same canvas dimensions
- same apparent character scale
- no baked-in ground shadow
- whole character stays inside the canvas
- visible pose change between animation frames
- foot/ground anchor calibrated in `js/config.js`

## Animation workflow

For each direction:

1. Approve the idle sprite.
2. Approve four walk frames visually.
3. Put them in the matching `assets/characters/sharkan/` folder.
4. Update only paths/anchors in `js/config.js` if needed.
5. Test the animation in-game before generating the next direction.

A bad frame should be replaceable without changing movement, zones or UI code.
