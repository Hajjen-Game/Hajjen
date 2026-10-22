# Japanese Harmony — Idle Move Hint 1.0 (2026-10-22)

- **Trigger:** exactly 60,000 ms of user inactivity while a level is actively playable. This is wall time in a visible browser tab, not a request for a new move.
- **Logic:** select one of the real adjacent swap pairs returned by `HarmonyRules.validSwaps(game.board)`; highlight just one piece (or the partner if the user has already selected one of the pair). No matching or random-refill rules change.
- **Effect:** a soft, persistent gold outline and breathing glow on that single tile. No autoplay, score, boosters, penalty, or reduction to stars.
- **Cancellation:** a board touch/click, a swap, menu/pause, level switch, end of level, backgrounding the browser tab, or changing input cancels the hint immediately and restarts the inactivity period when appropriate.
- **Animation constraints:** no hint during the fusion sequence. The timer is rearmed once the animations have settled. Existing Echo, Pulse, Resonance and target visual feedback remain intact.
- **Accessibility:** reduced-motion toggle and OS reduced-motion preference produce a static glow instead of repeated pulses; buttons remain tappable and hit targets are unchanged.
- **QA:** mobile smoke runs the live web UI with a *test-only shortened clock* for the exact 60-second timer. It asserts an actual playable swap, no consumed turns, single highlighted tile, tap cancellation, paused-menu suppression, automatic rearm and reduced-motion behavior.

## Directed hint 1.1 (2026-10-22)

A user observation exposed that highlighting one random endpoint of a swap was misleading. Hint guidance now marks **both endpoints, with distinct roles**: the piece that should be moved is lit with a **strong, steady golden glow**; the cell to receive it is marked with a **subtle mint/ivory pulse**. The roles are derived by tentatively applying each legal swap to a copy of the board and checking which endpoint forms a match. No actual board, move counter, score or save state is modified. The existing 60-second idle timeout, pause/background behavior and reduced-motion accessibility are preserved.

Screenshot regression: On the level-13 board shown by the user, move Sushi at row 5, column 6 (index 33) into Ryu at row 4, column 6 (index 26); this forms three horizontal Sushi at row 4, columns 5–7. The directed-hint unit test asserts `{from:33,to:26}`. Mobile browser smoke checks the two highlight roles, both clearing on interaction and no animation under reduced-motion.
