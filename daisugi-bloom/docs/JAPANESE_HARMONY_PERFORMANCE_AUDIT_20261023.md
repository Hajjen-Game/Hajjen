# Japanese Harmony – Performance & Code Hygiene Audit 1.0
Date: 2026-10-23

## Scope

Reviewed the currently loaded Japanese Harmony page and its HTML, app/game rules, visual CSS, audio, diagnostics, image loading, browser smoke tests, and on-device frame meter. The legacy Daisugi `src/`, `styles.css`, and plant assets are present in the repository but not referenced by the active Harmony page; deleting them is not a gameplay performance fix.

This is a static/source and automated-test audit. It is **not** a measured FPS claim for any particular player's Android phone.

## Observations

1. **Confirmed unnecessary main-thread/layout work – fixed.** `refreshResonance()` repeatedly recalculated up to six visual links and read their board/shell coordinates whenever `renderBoard()` ran, including harmless tap/selection rerenders. Cache settled anchors, partners and beam coordinates using a signature of the 49 pieces, invalidate on fresh levels and viewport resize, and keep one-time discovery pulses. Mobile browser regression verifies *zero Resonance geometry reads on a simple selection* and nonzero reads after resize.
2. **Expensive hint simulation repeated on an unchanged board – fixed.** `bestHint()` simulates candidate legal moves to choose an actual good move, appropriate for the game but unnecessarily repeated after non-move interactions or a pause/resume. Cache one result per unchanged board/remaining-moves/score/RNG state; browser regression checks evaluation count while hint remains accurate.
3. **Unused application helper – removed.** `highlightIndices()` was defined but never invoked; the active effect pipeline uses other render helpers. Removed this dead function without touching game rules or animation handlers.
4. **Existing protections confirmed.** The board reuses 49 DOM tile elements; tile artwork is replaced only when its piece changes; score VFX budgets are capped; reduced-motion preferences exist; the performance meter samples requestAnimationFrame only during a turn and stops afterward; the art loader retries a bounded number of times.
5. **Assets are reasonably constrained.** Current main sprite atlases are approx. 403 KB (classic WebP) and 86 KB (new-family AVIF); the three high-resolution background AVIF images are approx. 120–157 KB each. No evidence of giant canvases or unbounded background-asset downloads in normal play.
6. **Stylesheet growth – future carefully scoped cleanup.** `harmony/mobile-game.css` is ~81 KB uncompressed and accumulated multiple overrides. Consolidating old selectors may improve maintainability and parsing but risks changing the approved art. Do this only with before/after mobile screenshots, reduced-motion checks, and browser tests rather than wholesale deletion.
7. **GPU art effects – watch, not altered.** A per-sprite drop-shadow filter remains on board art. It *could* be expensive on weaker devices, but removal may degrade readability. Measure on the target phone or compare on/off with screenshots before changing it.
8. **Developer diagnostics – low priority.** `diagnostics.js` is included in initial page HTML even for ordinary players (~12 KB uncompressed). Lazy loading may simplify startup but needs careful Game Dev and offline regression coverage; not changed in this pass.

## Gameplay invariants

- Same 7×7 board, nine families with five art stages, fusion/move logic and 30-second hint behavior
- No changed scoring, saves, star requirements, turns or player progression
- No change to approved VFX timing, sprite atlas coordinates or accessibility toggles
- Hint cache invalidates as soon as actual board/moves/score/RNG state changes

## Regression gate

`daisugi-bloom/tests/harmony-browser-smoke.mjs` now checks stable Resonance beam references, zero geometry reads on selection, geometry reflow on resize, and memoization of best-move simulations between harmless interactions. All existing project workflows, including puzzle rules and perf tests, remain part of GitHub Actions.

## Follow-ups if users notice lag

1. Collect the in-game **Prestanda** report after multiple real turns on the affected phone. Look at 95th-percentile frame time, slow-frame percentage and animation/FX count, not only estimated FPS.
2. If slow frames remain high: compare sprite drop-shadows on/off on mobile; keep the clearer option only if frame metrics permit.
3. Consider an isolated CSS consolidation pass with screenshot diffs rather than deleting legacy rules blindly.
4. If startup becomes slow, test lazy-loading developer-only diagnostics separately and measure actual load behavior.
