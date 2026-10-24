# Japanese Harmony — Victory Screen Polish 1.0
Release: 6.27.0 · 2026-10-24

## Design intent
Replace the long, near-uniform result dialog with a compact **Zen Festival** reward moment. Maintain restrained teal glass, warm gold, ivory, light blossom accents, and accessible contrast. Game logic, stars, best records and saved progression remain unchanged.

## Implemented
- Hero section: LEVEL COMPLETE, "Vilken harmoni!", three large earned/outlined stars with soft halo and a short sequential reveal. The star text and accessible label remain derived from the stored result, not recalculated.
- Result section: a single goal capsule with the achieved objective plus a paired moves/rating display. "Betyget låses när du når målet" stays visible, without duplicate full-width boxes.
- Premium score card: large bonus score, subtle one-shot shimmer and **personal-record indicator in the same card**, not a redundant fifth stat.
- Compact two-column stat grid: icons and numeric values for Masterpieces, Harmony Echo, best chain, and fusions.
- Footer: Next Level clearly dominant; Continue for score record remains a functional secondary action when moves remain; Play again and Level selection stay available as quieter tertiary buttons.
- Mobile: header/footer sit outside the independent result-content scroll area. A 320px / 390px phone keeps Next Level in sight even when the stats require scrolling; no horizontal overflow. Reduced motion disables appearance/shimmer keyframes.
- All CSS is scoped using :has(.victory-result) so pause, help, dev, and failed-level dialogs are not redesigned. Failure statistics remain unchanged.

## Verification
The browser smoke test checks reward text, counts, record chip, structure, responsive dimensions, animation keyframes, score-independent stars, optional continuation, and return to level selection. It also writes `victory-390.png` and `victory-320.png` screenshots to GitHub Actions test artifacts. No new player-data migration/reset.
