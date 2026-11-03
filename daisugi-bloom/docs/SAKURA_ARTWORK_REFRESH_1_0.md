# Sakura artwork refresh 1.0 — 2026-11-03

Scope: **only Sakura**, stages 1–5, in the same order as the five supplied images.

- New transparent 960×192 AVIF (`assets/sakura-five-stages.avif`), five 192×192 cells, stages increasing left to right. Source: five 1254×1254 transparent Sakura illustrations provided by the user on 2026-11-03.
- Five Sakura stages render from the new independent atlas on the 7×7 board. Sakura's collection Masterpiece uses the final fifth cell.
- Existing `assets/harmony-atlas.webp` (including the old Sakura row and all other classic families) is **not changed**, and `harmony-new-families.avif` is not changed.
- Graceful fallback: when the new Sakura file fails to load, the original Sakura atlas/emoji remains.
- Reversible comparison: add `?sakura=classic` to the game URL to disable new Sakura assets without touching saves. Remove the parameter to return to the new art.
- Purely cosmetic: no changes to levels, mechanics, director, star thresholds, scores, progression or saved games.

QA after deployment: inspect Sakura 1–5 on the board and stage-5 collection; confirm koi, lantern, fan, bonsai and other families unchanged; compare with `?sakura=classic`; play a fusion and reload an existing game.

Global rollback: revert the Sakura artwork PR commit(s); original files are retained in Git history and the original atlas is still present.