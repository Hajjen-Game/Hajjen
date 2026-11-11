# Neon Trails 1.1 — Flow & Dash

Date: 2026-11-11

## Evidence from the first four player run logs (1.0)
Four finished runs lasted **5.450, 7.167, 12.033 and 14.733 seconds** — average **9.84575 s**. Two were victories entirely within Zone 1; one loss was a wall death at 12.033 s and one loss was an opponent trail at 14.733 s. Several AI opponents were eliminated by their own trails by 3–7 seconds, leaving limited room for the ten-second color progression. No frames over 50ms were reported. Original tails lasted 9.4s in Zone 1 (over 1000 traveled units at initial 108/s) in an arena around 612×392.

## 1.1 changes
- **Much shorter trails:** from 9.4s to **3.3s** in Zone 1, tapering gradually to a **2.15s minimum**. Active segments are pruned automatically and remain physically dangerous after the first grace period. The short trail window is intended to open more escape lanes, allow tactical cutoffs and extend matches.
- **Safe opening:** first **2.0s** allow players to learn their direction without immediate trail KOs; the visual tails still appear. Own-tail collision ignores only the newest **0.72s** of the player's own path, up from 0.38s. Real swept-segment collisions with older trails remain lethal.
- **Gentle wall rebound:** neither human nor AI is eliminated by simply contacting the outer wall. Movement is clamped inside the playable boundary, incident heading is reflected about the contacted axis, then a tiny inward displacement prevents sticking. A **0.26s short trail grace** prevents instant double KOs from a trail crossing the rebound point. The trail sample restarts at the bounce to prevent a visually incorrect through-wall bridge. Wall rebounds emit timestamped `wall_bounce` events with position and axis.
- **Dash language:** replace “Boost” with **DASH** everywhere in the UI and event model, including the mobile action button and menu instructions. It now means a short **0.33s at 1.8× movement speed** with **4.6s cooldown** (previous Boost was 0.65s at 1.48×, 5.2s cooldown). It is optional, requires no extra buttons, and does not make trails harmless.
- **Trail art:** remove the separate direction tick in front of every cube (the stray “tail sticking forward”). The latest drawn trail tip is trimmed to remain behind its cube; use squared line caps. Three batched stroke passes per age bucket carry a very subtle moving luminance modulation and tinted white core, preserving the fast canvas architecture without adding full-screen glow or particles.
- **AI:** slightly reduced eagerness to chase opponents in the opening seconds; steering still predicts walls and hazards with seeded candidate scoring, and rebounding follows exactly the same equations as the human.
- **Run Log 1.1:** retains the same local export button/file naming, with a new schema/build, `playerDashes`, per-cube `wallBounces`, `trailLifetimeSeconds`, `dash` / `wall_bounce` events and previous performance statistics. Existing 1.0 exports remain usable for historical comparison.

## QA / targets
1. Continue full CHROMA RUSH regression and browser smoke.
2. Add checks for four-side rebounds, no player elimination on mere rim contact, 3.3s trail expiry, tail drawing behind cubes, Dash cooldown/event and log field changes.
3. Verify browser joystick/Dash, pause/export, stable colored world edges and no page errors on desktop/high-DPR mobile.
4. Real-device acceptance: rounds should **commonly reach multiple color zones**, without scripting an artificial minimum match length. Enjoyable traps should remain possible after Zone 2, and AI should not repeatedly eliminate itself within a few seconds.
5. Avoid reintroducing Chroma Clash's earlier frame pacing regression. The local run audit still reports worst frame time and slow frames.

This change does not touch the original Rush runner, Chroma Clash or other modes.
