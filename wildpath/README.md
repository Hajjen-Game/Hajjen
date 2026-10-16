# Wildpath · First Playable (v0.1)

A small, original fantasy action-survival prototype. **Cozy presentation, intense pacing.**

A rounded, colorful 3D nature trail. Two fighting styles. Automatic basic attacks, WoW-inspired target selection and three manually activated targeted abilities. A finite-budget AI Director creates peaks and breathing room while the player moves along a four-part linear trail, chooses run-only blessings and chases a high score.

## Play locally

No package manager is required for this first prototype. Host the folder with any static HTTP server:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000. The first load needs internet access for the Babylon.js CDN; Google Fonts is optional. Opening `index.html` via `file://` may block ES modules.

## Controls

| Desktop | Action |
|---|---|
| WASD / arrows | Move, including while attacking |
| Click an enemy | Lock that target |
| Tab | Cycle nearby targets |
| Basic attack | Automatic (nearest enemy unless locked) |
| 2 / 3 / 4 | Cast three class abilities automatically at selected target (self-centered utility on 4) |
| Escape | Pause |

On touch-capable devices, the left stick moves, the three spell buttons cast, and the target button cycles enemies. Touch control support is experimental; the PC experience takes priority in v0.1.

## Classes (working names)

* **Glintweaver**: rapid homing glints, Winter Pool, Crystal Bloom, Pale Guard.
* **Stoneblade**: auto sword arcs, Wide Arc, Rushstrike, Earthwake.

Crit chance is hidden from the HUD. Each stage completion offers one of three run-only blessings. The final four-stage prototype is deliberately shorter than the planned 8–12 minute finished run.

## Director and score integrity

A stage has a finite threat budget. The Director alternates build-up, peak and relax based on nearby enemies and player pressure. During relax it stops spawning standard enemies. Some enemy compositions vary, but killing infinitely many Director-created enemies cannot inflate score: stage budgets are capped. Both classes share enemy base points and completion bonuses; class balance still needs playtesting.

## Project structure

* `index.html`, `styles.css` – layout and UI
* `src/config.js` – class stats, enemy definitions, milestone settings, blessings
* `src/world.js` – Babylon scene helpers, soft rounded environment and placeholder actors
* `src/director.js` – dynamic encounter pacing, fixed spawn budgets
* `src/main.js` – input, combat, upgrades, scoring, state machine, rendering loop

## Deploy to GitHub Pages

In the GitHub repo settings under **Pages**, choose **GitHub Actions** as the source. The workflow in `.github/workflows/pages.yml` publishes static assets from the default branch on each push. A separate production build/CDN strategy can be added later.

## Art and licensing

All currently rendered props and actors are original procedural geometry. No Unity Asset Store or World of Warcraft files are used. Before importing any third-party Unity assets, check their license and convert/export to glTF/GLB if allowed. This is a prototype, not a final illustration of the game's art direction.

## Next iteration candidates

1. Test feel: movement, melee distance, targeting and readability with a high camera.
2. Check the downloaded Unity nature pack's models and licensing; swap individual props if the style suits Wildpath.
3. Improve enemy telegraphs and melee fairness; tune Director response to pressure.
4. Validate score parity between classes and add seeded challenge runs.
5. Improve touch UX and optional manual mobile target tap.