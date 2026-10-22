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

## Smart directed hint 1.2 (2026-10-22)

After a user's mobile test showed two Sakura swaps with different strategic consequences, hint selection was upgraded from a random valid swap to **ranking all playable swaps** by a one-move preview using `new HarmonyRules.Game(level,game.save(),{fastRestore:true})` in fresh copies. The pure `bestHint(game)` reports the strongest suggestion. The weighted ranking rewards actual score gain, advancement to stage 3/4, Masterpieces, Harmony Echo/Pulse and tutorial goal progress; when valuations are equal, moving a less-developed source piece is preferred. Each preview uses a separately copied save so not even RNG rolls or bag order from the live match change. Future turns remain fully player-controlled.

**Screenshot-inspired regression:** With the observed developed Sakura in row 5, column 3, the downwards swap from row 3, column 3 to row 4, column 3 is preferred over moving the developed Sakura upwards. A seeded approximate board yielded +325 (including Harmony Echo) for the former and +200 for the latter. The exact totals on the user's real save could differ because the screenshot alone cannot capture the full refill RNG state and every object stage. Browser smoke now confirms that the highlighted source/destination correspond to `bestHint`, not just any legal swap. The visual design and 60-second timer remain unchanged.

**Direction-sensitive scoring fix:** The preview calls `trial.swap(hint.from,hint.to)`, *not* an unordered pair. Even when the two cells are the same, the actual destination may determine the surviving fusion tile on a stage tie, affecting bonuses, cascades and points. Tests compare the displayed direction with a real clone played in that exact order.
