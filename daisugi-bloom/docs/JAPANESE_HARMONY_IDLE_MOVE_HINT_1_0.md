# Japanese Harmony — Idle Move Hint 1.0 (2026-10-22)

- **Trigger:** exactly 60,000 ms of user inactivity while a level is actively playable. This is wall time in a visible browser tab, not a request for a new move.
- **Logic:** select one of the real adjacent swap pairs returned by `HarmonyRules.validSwaps(game.board)`; highlight just one piece (or the partner if the user has already selected one of the pair). No matching or random-refill rules change.
- **Effect:** a soft, persistent gold outline and breathing glow on that single tile. No autoplay, score, boosters, penalty, or reduction to stars.
- **Cancellation:** a board touch/click, a swap, menu/pause, level switch, end of level, backgrounding the browser tab, or changing input cancels the hint immediately and restarts the inactivity period when appropriate.
- **Animation constraints:** no hint during the fusion sequence. The timer is rearmed once the animations have settled. Existing Echo, Pulse, Resonance and target visual feedback remain intact.
- **Accessibility:** reduced-motion toggle and OS reduced-motion preference produce a static glow instead of repeated pulses; buttons remain tappable and hit targets are unchanged.
- **QA:** mobile smoke runs the live web UI with a *test-only shortened clock* for the exact 60-second timer. It asserts an actual playable swap, no consumed turns, single highlighted tile, tap cancellation, paused-menu suppression, automatic rearm and reduced-motion behavior.
