# Harmony Pacing Director 3.0 — Japanese Harmony
**2026-10-22 · Live gameplay feature**

## Core decision

The user's request is for a live, hands-on experience. **3.0 is selected by default for NEW runs**, with an explicit level-menu switch for **2.0** and **Standard**. Existing saved runs are resumed with exactly the engine mode they began with, without silently changing rules mid-level.

### 3.0 includes 2.0
3.0 evaluates the SAME four regular gravity refills and applies **Opportunity Director 2.0 scoring as its base**. The only extension is a small, capped preference for promising opportunities based on the recent pace and outcomes of the human player's own moves.

### Timing and interpretation
Browser captures milliseconds between stable board availability and the next successful swap, excluding animations, menu time and background tabs. Pauses over 90 seconds do not enter the rolling sample. All samples are capped to eight per run and saved locally.

The engine never assumes that slow equals bad. Four coarse states:
- **BYGGER**: neutral, including players who deliberate carefully
- **FLOW**: a recent fast cadence *plus* some genuine development
- **ANDRUM**: shortly after Masterpiece, Harmony Echo or Pulse
- **NYA MÖJLIGHETER**: three or more moves without meaningful development

The pace preference may modestly favor proposals with **playable** development opportunities, but no AI move is performed. No free match, targeted family injection, board rewrite or artificial failure is allowed. Players must spot and execute every opportunity themselves.

### Safety, data and controls
- Direct timer data is local-only; no network submission or behavioral tracking service
- Existing saved runs retain prior engine mode
- `new Game(level,null,{directorMode:"v3"})` opts in; `"v2"` and default `"standard"` continue to work
- `game.swap(a,b,{decisionMs})` accepts an optional explicit real/simulated interval, and gracefully ignores invalid swaps, pause gaps and time beyond 90 seconds
- `paceTimes`, `paceOutcomes`, `pacePhase`, and `paceLastMajor` persist through save/resume
- Pacing preference is applied ONLY while choosing among ordinary stage-one refills. Actual gravity, bag balance and rewards stay unchanged.

### Tests
- Dedicated unit tests for mode selection, timing classification, slow-player fairness, no mutation, untouched RNG/bag, no free cascades, and saving
- Mobile browser test selects a live Director 3.0 game, makes a valid move, verifies timing saved, switches to Director 2.0 and Standard, and checks all four lab modes
- Seeded 480-game comparison with synthetic input rhythms for all four engines, with raw results attached to GitHub Actions

**Do not interpret synthetic bot trials as direct proof of fun, addiction, human win rates or real-world timing response.** Real player experience is the promotion criterion.
