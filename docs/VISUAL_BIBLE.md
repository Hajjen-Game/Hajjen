# HAJJEN — Visual Bible

**Version:** 1.0  
**Status:** Core art-direction rules  
**Purpose:** This document is the visual source of truth for all new HAJJEN assets.

## Core identity

HAJJEN is a **cozy top-down 2D fantasy exploration game** with an art style that combines **pixel art** and the simplified, faceted shape language of **low-poly art**.

Four words should guide every visual decision:

> **COZY · FACETED · PIXELATED · MUTED**

The game should feel modern and handcrafted rather than like a retro 8-bit game.

---

## 1. Perspective

- The game uses a clear **top-down 2D perspective**.
- Do not use an isometric camera.
- Characters and objects may reveal a small amount of their front/side surfaces when needed for readability and depth.
- All assets must feel compatible with the same camera angle.
- Gameplay readability always takes priority over realistic perspective.

## 2. Pixel art × low-poly

HAJJEN is neither traditional pixel art nor rendered 3D low-poly art.

The intended style is:

> **Handcrafted 2D pixel art built from simplified, chunky, low-poly-inspired forms and faceted color planes.**

### Pixel-art influence

- Visible but tasteful pixel structure.
- Crisp edges rather than blurry painted edges.
- Simplified detail at gameplay scale.
- Avoid excessive tiny pixel noise.
- Do not make the game look intentionally primitive or 8-bit.

### Low-poly influence

- Strong, readable silhouettes.
- Simplified geometry.
- Broad color planes.
- Angular/faceted changes in light and color.
- Objects should be recognizable through shape before fine detail.

### Avoid

- Photorealism.
- Smooth 3D rendering.
- Highly painterly backgrounds that clash with sprites.
- Heavy black outlines around every object.
- Extremely detailed textures.
- Classic 8-bit/16-bit imitation as the dominant style.

---

## 3. Color language

### Global rule

HAJJEN always uses **pastel, muted, dusty or softly desaturated colors**.

Avoid highly saturated neon colors except for extremely small magical accents where gameplay readability requires them.

The world should remain harmonious even when different primal-force regions have strongly different identities.

### Primal-force color families

These are directional families, not rigid single-color values:

- **Growth:** sage, moss, muted mint, dusty botanical greens.
- **Ember:** burnt peach, terracotta, dusty orange, muted warm red.
- **Flow:** dusty blue, soft turquoise, desaturated aqua.
- **Stone:** warm grey, taupe, muted ochre, soft earth tones.
- **Gale:** pale blue-grey, cream, misty desaturated sky tones.
- **Aether:** lavender, dusty violet, pale pink and subdued magical hues.

Each region should use a limited local palette so the player can gradually recognize which primal force is influencing the environment without requiring a UI label.

---

## 4. Cozy first

The overworld should primarily feel:

- calm,
- inviting,
- curious,
- magical,
- exploratory.

Difficulty may increase and later regions may become stranger, darker or more dangerous, but HAJJEN should not become grimdark.

Mystery is preferred over horror. Wonder is preferred over aggression in the overworld.

Combat areas and bosses may increase tension while still belonging to the same visual universe.

---

## 5. World design

HAJJEN is designed around a **large connected overworld** rather than visually isolated levels.

Different primal-force regions should transition gradually into one another.

Example: approaching Ember may progressively introduce drier vegetation, warmer ground tones, unusual rocks and faintly glowing ingredients before the player reaches the heart of the Ember region.

Region identity should therefore be communicated through:

- terrain,
- vegetation,
- props,
- ingredients,
- lighting accents,
- environmental shapes,
- palette shifts.

Avoid abrupt visual borders unless the location specifically requires one.

---

## 6. Terrain and environment

The world should be constructed from reusable 2D terrain and environmental assets rather than one enormous flattened background image.

Terrain should:

- tile or combine cleanly,
- use simplified readable forms,
- preserve the faceted/pixelated visual language,
- support large connected maps,
- leave enough visual breathing room around gameplay elements.

Paths should be visually readable but should not feel like invisible rails. Where possible, rocks, trees, water, cliffs and other physical objects should naturally explain where Sharkan can and cannot walk.

---

## 7. Silhouette and gameplay readability

Every important gameplay object must remain recognizable at normal gameplay zoom.

This applies especially to:

- Sharkan,
- NPCs,
- bosses,
- ingredients,
- interactable objects,
- cave entrances,
- landmarks.

Prefer one strong recognizable shape over many realistic small details.

Characters should remain distinguishable by silhouette even before clothing details are noticed.

---

## 8. Ingredients and collectibles

Collectible ingredients are central to HAJJEN and must be easy to discover while exploring.

They should:

- visually belong to their environment,
- have a stronger or more unusual silhouette than ordinary decoration,
- use subtle contrast to attract attention,
- communicate something about their primal force and possible properties through their appearance.

Avoid excessive UI markers such as permanent exclamation marks or glowing outlines when environmental design can communicate importance instead.

Magical ingredients may use restrained particles, movement or glow, but these effects should remain consistent with the muted palette.

---

## 9. Lighting and shading

- Shapes may be angular/faceted while the overall atmosphere remains soft.
- Use restrained shadows.
- Avoid heavy realistic global illumination or glossy 3D materials.
- Light should help define the simplified planes of an object.
- Magical light is allowed but should normally be soft and localized.

The low-poly feeling should primarily come from **shape and color planes**, not from rendering the game as 3D.

---

## 10. Characters

Sharkan, NPCs and bosses must share the same visual language as the world.

Character rules:

- Top-down 2D gameplay sprites.
- Strong silhouettes.
- Simplified forms.
- Faceted color/shadow planes.
- Subtle pixel-art structure.
- Muted/pastel palette.
- Enough exaggeration for features and equipment to remain readable at gameplay scale.

Do not place highly rendered character illustrations directly into a simpler pixel-art world.

Animation frames should preserve consistent scale, proportions, palette, equipment and ground anchor.

---

## 11. Environmental depth

Even though HAJJEN is 2D, the world should have visual depth.

Use separate layers when appropriate:

1. ground/terrain,
2. paths and ground details,
3. objects and vegetation,
4. characters and interactables,
5. foreground objects that can visually overlap characters,
6. subtle effects such as particles, mist or leaves.

This allows Sharkan to walk behind trees, structures and tall vegetation without requiring 3D graphics.

---

## 12. Modern indie presentation

Pixel art is an artistic choice, not a technical limitation.

HAJJEN may use subtle modern effects such as:

- gently animated water,
- drifting leaves,
- soft fog,
- restrained particles,
- subtle magical glow,
- environmental movement,
- smooth camera movement.

These effects should support the handcrafted artwork rather than overwhelm it.

---

## 13. UI consistency

The inventory, spellbook, dialogue and other UI should feel connected to the game world while remaining highly readable.

UI should favor:

- simple shapes,
- muted colors,
- subtle pixel/faceted details,
- tactile fantasy materials used sparingly,
- clear icons and generous spacing.

The UI should not suddenly switch to glossy modern sci-fi styling or ornate high-fantasy realism.

---

## 14. Asset consistency checklist

Before approving a new visual asset, check:

1. Is it clearly top-down 2D?
2. Does it combine pixel-art character with faceted low-poly-inspired forms?
3. Are the colors pastel, muted or softly desaturated?
4. Does it feel cozy and magical rather than harsh?
5. Is the silhouette readable at gameplay scale?
6. Does it belong naturally beside existing HAJJEN assets?
7. Is unnecessary micro-detail avoided?
8. Does it preserve the correct primal-force palette where applicable?
9. Does it avoid looking like rendered 3D, retro 8-bit art or a painterly illustration?
10. Does it serve gameplay readability as well as aesthetics?

If several answers are no, the asset should be revised before becoming a production asset.

---

## 15. Prompt foundation

The following concept should be included, directly or indirectly, in prompts for new production artwork:

> **HAJJEN visual style: cozy top-down 2D fantasy game art, a distinctive hybrid of modern pixel art and simplified low-poly-inspired faceted forms, crisp readable shapes, subtle pixel structure, chunky silhouettes, soft restrained lighting, muted pastel and dusty colors, handcrafted modern indie-game aesthetic, not isometric, not photorealistic, not glossy 3D, not classic retro 8-bit.**

Asset-specific prompts should add camera, scale, transparency, tileability, animation or region requirements without contradicting this foundation.

---

## Guiding principle

When uncertain between visual complexity and clarity, choose **clarity**.

When uncertain between saturation and harmony, choose **harmony**.

When uncertain between realism and charm, choose **charm**.

HAJJEN should always feel like one coherent, cozy, strange little world worth exploring.
