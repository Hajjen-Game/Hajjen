# CHROMA RUSH — Ambient Lighting 2.1 (Phase 2 correction)

A landscape-first 2D neon auto-runner: Jump, Duck, and survive the acceleration.

**Play:** https://hajjen-game.github.io/Hajjen/chroma-rush/

## Ambient Lighting 2.1 — player-led visual correction (2026-11-10)

The established Chroma Tide wave already looked good; Visual Signature 2.0 mainly added a soundtrack layer, score HUD, and canvas streaks. Player testing showed **the added streaks around/behind the cube looked worse**, without a meaningful visual leap. Accordingly, **all Phase 2 Surge-only streak layers have been removed**.

The change instead comes from the existing world lighting: palette-aware **diffuse sky illumination**, softer colored **terrain bounce** that obeys true physical gap clipping, and gentle **cube glass reflection** using its original material. No new sprites, pseudo-hazards, ringing flashes, additional lines or HUD clutter. Seven-second scoring/timer functionality is retained.

The original spectral-wave implementation is unchanged, as are all aspects of Endless Escalation Director 4.0, speed, obstacle placement, physics, camera and Gravity Shift.

[Implementation detail and validation](docs/ambient-lighting-2.1.md).

*The Visual Signature 2.0 section below is historical; its Surge streak effects have now been retired.*

## Phase 2 — Visual Signature 2.0 · Silent-first Chroma Surge (2026-11-10)

Endless Escalation 4.0 remains the live Director. This follow-up **only changes the signature visual experience** after user feedback that Chroma Surge was barely noticeable without music.

Chroma Surge now lasts **7 seconds** after the real color wave crosses the runner, while keeping the same proven actual-clear-only score formula and four-stage mastery. High-tier players see a more expressive, palette-colored **horizontal energy wake attached to the runner**; clears make it briefly brighten. The wake is rendered **behind hazards** and automatically follows the existing jump, duck and inverted-ceiling transforms. The center HUD displays a small **SURGE ×chain / +points / remaining-time meter** without adding a large competing panel or obstructing the course. Haptics respect existing settings. No soundtrack is required.

This pass does **not** alter speed, Endless Escalation Director difficulty, terrain, hazard placement, HP, controls, camera, Gravity Shift or game physics. Rendering respects existing graphics tiers and reduced-motion preferences. Logs carry their own visual-signature-2.0 build identifier.

[Design constraints and test plan](docs/visual-signature-2.0.md).

## Endless Escalation Director 4.0 — current design (2026-11-10)

CHROMA RUSH is an **endless escalating reaction game**, not a 3–4-minute session target. The previous target has been retired: an elite runner can continue indefinitely, and escalating challenge (not an internal death clock) eventually defeats players.

- **Procedural Streak Composer:** genuinely random Jump/Duck runs, including up to six successive Jumps *or* six successive Ducks. No preauthored 11-step alternating script; new sequences are composed each time from stochastic 1–6 action streaks.
- **Escalating challenge floor:** permanent progression increases with every zone and PEAK attack. Recoveries temporarily protect the player but **cannot erase the already achieved attack difficulty**, even at low HP.
- **Extended attacks and microbreathers:** after early training, the Director keeps sustained Rush windows while reducing FADE/RELAX to small breaks, then returns at a higher challenge floor. Regular and Echo Gaps remain possible between selected attack windows.
- **Uncapped late acceleration:** the original speed curve is unchanged through 240s, then additional acceleration rises smoothly and remains positive indefinitely. Camera zoom and physics safety rules remain unchanged.
- **Real safe terrain corridors:** the long flat sections scale with both speed and escalation rather than hitting the previous 36k-unit cutoff.
- **Local audit:** directorExperience.escalation tracks the irreversible challenge floor, attack count and next attack; directorExperience.rush continues to count actual completed phrases.

[Full design and regression strategy](docs/endless-escalation-director-4.0.md).

*Sections below document historical passes and some now-superseded 3–4-minute tuning decisions. Endless Escalation 4.0 is the authoritative current direction.*

## Phase 3 — Rush Chains 3.0 · Continuous skill sections (2026-11-10)

A second player audit (6:29 / zone 33) showed **169 obstacles (26.1/min)** versus the prior 183 / 6:54 (26.5/min). Despite increasing PEAK exposure from **27.7% to 39.9%**, raw obstacle density barely changed. At 28 perfect zones and only 5 normal obstacle hits, the user explicitly requested *long near-back-to-back Jump/Duck runs*, not a longer endurance session.

New genuine **10–11-action Rush Chains** start only in safe, confident PEAK windows from zone 8, using the ordinary Jump and Duck hazards with the existing physical minimum arrival interval as their cadence (~0.74–0.96s when speed is high). No new controls. The terrain planner reserves approximately 12.6–14 seconds of safe flat runway at the future arrival point on two out of three eligible PEAK cycles, while independently preserving landing/takeoff and gap checks on every hurdle. Every third PEAK retains Echo Gap and ordinary gap opportunities. An unsafe terrain veto, hit, severe stress, low shield or gravity transition cancels the *remaining* sequence without deleting anything already in flight.

Healthy advanced PEAKs can last ~12–13 seconds to fit a full riff; actual completed chains and successful individual Rush actions are recorded in `directorExperience.rush` for the next on-device export. Ordinary terrain gaps, slopes, Echo Gaps and Dash Duck remain available outside these dedicated bursts. The base speed curve, camera, jump/duck/dash physics, obstacle hitboxes, music, graphics and existing variety guard remain unchanged.

[Audit, design and validation](docs/rush-chains-3.0.md).

## Phase 2 — Action Density & Extended Peaks 2.0 · Real-play correction

A real 6:54 / zone-35 run contained 183 spawned obstacles (26.5 per minute) and 24 perfect zones. **Only 27.7% of gameplay occurred in PEAK**, despite the player's request for sustained, denser action. New Chroma Surge effects and original music were not enough to alter the player's perceived challenge; difficulty must be grounded in gameplay, even with sound muted.

The Action Pressure Director now gradually increases basic Jump/Duck rhythm from zone **6–19**, instead of relying only on the old post-zone-24 endurance curve. Healthy players experience longer sustained intense sections, shorter midgame downtime, and more opportunities for varied action phrases. The terrain planner leaves more usable flat lanes during peaks while retaining slopes, gaps, double-jump terrain, gravity-shift breathing windows, and the original minimum safe physical spacing. Low shield or high stress still provides protective recovery.

The existing 3–4 minute *target*, actual speed curve, Adaptive Camera zoom, movement physics, sound and all visuals are unchanged. The exported round log now exposes `directorExperience.actionDensity`. [Full zone-35 audit and safety plan](docs/action-density-extended-peaks-2.0.md).

## Phase 2 — Chroma Surge 1.0 · Signature Experience

Chroma Tide's color-changing wave now initiates a short **4.8-second skill window** when it reaches the runner. Every genuine obstacle or gap clear increases a bounded Surge chain and earns a bonus; hits break the Surge chain without adding damage. Original beat-synced procedural music and layered neon visuals emphasize the event. The live chain occupies only a small temporary part of the HUD.

The existing Core Pace 1.1, safe short Gravity Shift, Adaptive Camera Horizon, player movements, Director, terrain and hitboxes are unchanged. HIGH visual settings prioritize modern devices; simplified graphics and reduced-motion remain supported without changing game rules. The local round audit records Surge performance without remote analytics. [Full implementation and validation plan](docs/signature-experience-chroma-surge-1.0.md).

## Core Pace & Gravity Rebalance 1.1 — 3–4 minute urgency (2026-11-09)

Analysis of three player rounds (2:16, 2:52 and 5:17) identified an overly gentle long-run speed ramp and ceiling runs lasting about 96 seconds. The first 45 seconds remain unchanged, but a smooth extra +460 world units/s builds through 225 seconds; approximately 1,800 at 3 minutes and 2,067 at 4 minutes. **This is a difficulty target, not a forced time limit.** Adaptive Camera Horizon and all Jump/Duck/Dash geometry and physics remain unchanged.

Gravity Shift stays a rare event introduced at zone 8 and then every eight zones, but each ceiling excursion is now a brief 16-second hold, followed by a safeguarded automatic return to the floor (with an additional warning and safe-runway wait). [Evidence, implementation and validation plan](docs/core-pace-gravity-rebalance-1.1.md).

## Core Gameplay Excellence 1.0 — baseline audit (2026-11-09)

- **Phase 1 has begun; gameplay balance and physics are deliberately unchanged.** The first 60 seconds are summarized in four 15-second windows in the existing locally exported round log.
- **Air Dash and Ground Dash remain.** They may help recover from early Jump or Duck inputs even without a compulsory Dash obstacle. New diagnostics correlate proximity and later clear/hit without falsely claiming Dash caused a rescue.
- **Evidence next:** observe 15–20 first-time players, compare Dash correction use under matched conditions, audit high-speed legibility and low-end mobile performance. No claim of D1/D7 retention is made from local per-round logs.
- [Audit methodology, fields and Phase 1 decision gates](docs/core-gameplay-excellence-1.0.md).

## Arcade Simplification 1.0 — current gameplay (2026-11-09)

The current design removes the **wide Echo Rail** and **Twin Vault / Energy Bridge** from active spawning. The physically wider **Long Duck Gate** remains. The short Jump now shares the same neon housing, side rails and energy-field language as Duck, inverted from the ground and given its own secondary color. Ordinary and double-jump gaps are more common and use the established terrain safety budget. The first double-jump chasm is introduced on the floor after a completed ordinary gap.

A palette now lasts **two zones**, so Chroma Tide is reserved for genuine color changes. Gravity Shift first occurs at **zone 8** and then at **16, 24, 32…**: its even-zone timing avoids launching simultaneously with a color transition. Movement controls, standard collision boxes, Speed Curve 3.2, camera, Flow and late endurance density are preserved. See [Arcade Simplification 1.0 implementation and QA](docs/arcade-simplification-1.0.md).

**The sections below document earlier design passes. References to active Echo Rail/Twin Vault introductions describe historical versions and are superseded by this pass.**

## Endurance Mastery 4.0 — late-game intensity (2026-11-09)

After the 10:04 / zone-51 player audit: 221 spawned obstacles, **200 ordinary Jump/Duck (90.5%)** and only 21 Echo/Twin Vault/Long Gate. In minutes 8–10, 45 of 46 obstacles were ordinary, with no Echo Rail or Twin Vault. The older Director's zone-based spawn interval reached its difficulty ceiling by approximately zone 7, while late high-speed terrain blocked many physically valid hazards. The final two minutes also featured repeated low HP (10–40), correctly suppressing advanced hazards but causing an overlong stretch of basic play. A full source- and log-based analysis is in [Endurance Mastery Audit](docs/endurance-mastery-4.0.md).

- **Progressive endurance density:** a smooth late-intensity ramp between zones **24–50** with a separate **simple-action rhythm floor** for skilled late survivors, even at low HP. During healthy mastered runs, BUILD gaps between spawn attempts shorten by up to **0.29s**, PEAK lasts up to **1.4s longer**, and two/three-step phrases are weighted higher. Low HP still blocks hard multi-input patterns and advanced hazards, but no longer entirely flattens basic Jump/Duck spacing. Real minimum arrival spacing and physics safety always win.
- **Late arcades get actual playable runway:** after zone 25, skilled runners—including those at low HP without critical stress—can encounter occasional **3.0–3.6-second flat challenge corridors** between hills and gaps. Without them, the old 400–740-unit flats often left too little takeoff/landing clearance at speeds over 2,000, so Director requests were repeatedly rejected. Long flats are generated by the existing seeded Terrain System, not a new scripted level. Hills, gaps, Echo gaps, gravity orientation and terrain safety vetoes remain.
- **BUILD is now more expressive late:** confident players can receive tier-2 three-input patterns even in BUILD, without introducing a new control or forcing advanced Dash. PEAK still uses the existing larger vocabulary; FADE and RELAX remain genuinely calmer. The first Echo and both first Dash teaching obstacles are unchanged.
- **Playable when wounded:** low HP and recent damage still veto unsafe Echo/Dash and more dangerous combinations. The new pressure does *not* mean guaranteed death, a hard end at zone 50, or speed acceleration.
- **Telemetry & tests:** `directorExperience.endurance` exports late ramp, actual shield, advanced readiness intensity and separate basic-density factor; existing 30-second obstacle mix remains. Seeded 10-minute Director simulations and high-speed terrain tests validate the late opportunity ramp and early-zone physics, but real device playtests are still needed to verify on-course placement, difficulty and readability.

**Unchanged:** Speed Curve 3.2, Adaptive Camera Horizon 1.1, obstacle dimensions and hitboxes from Balance 3.0, jump/duck/Dash controls and cooldowns, HP/Perfect Zone rewards, Flow, screen/UI, Chroma Tide, sound, gravity shift, graphics and the original backdrop.

## Obstacle & Director Balance 3.0 (2026-11-09)

After multiple player sessions and speed/obstacle changes, audited all six physical hazard families (ordinary Jump/Duck, broad Echo Rail, Twin Vault, Long Duck Gate and ordinary/Echo Gaps) against Speed Curve 3.2, jump/duck/Dash timing, camera zoom, terrain safety and the adaptive Director. Four older player logs confirm >86% ordinary Jump/Duck in retained events and at least one run with five consecutive identical normal obstacles. These logs span differing builds and are **not** treated as controlled difficulty evidence.

- **One shared speed-aware physical-sizing module:** [Obstacle Balance 3.0](src/gameplay/obstacle-balance.js), used at runtime by `spawn()`. Normal Jump expands smoothly from **43–58** near the start to **87–105** at speed 2200; standard Duck grows from **54–71** to **184–221**; repeated Echo Rail from **300–385** to **475–560**. All ranges have hard bounds and remain clearly smaller than advanced Dash silhouettes; normal Duck never becomes Ground-Dash-only.
- **All starting lesson semantics retained:** first Echo Rail in zone 2 remains exactly **265–280 wide × 70–76 high**; heights remain unchanged; Twin Vault's forgiving ~1.02-second early run and 1200-unit later maximum remain untouched; Long Duck Gate stays on its original physical curve, with identical Duck visuals and the 2.2 world-end recovery.
- **Gap audit:** the normal, safe 0.30–0.35-second gap generation was unintentionally capped at 500 world units; cap is now **850** so normal gaps remain consistent at high speeds (early gaps and separate Echo gaps are unchanged). Terrain takeoff/landing, low-HP and phase gates are not loosened.
- **Director Variety 3.0:** real successful spawn/action history rather than only previous pattern selection; blocks any fourth consecutive simple Jump or Duck, even across pattern boundaries; modest repetition/rolling-family penalties; softly boosts long-unseen *safe* Echo opportunities and healthy short multi-input PEAK phrases. Never bypass HP, stress, Echo/Dash cooldown, floor-only introductions, terrain veto or recovery.
- **New audit visibility:** `directorExperience.variety.recentActions / recentPatterns / rejected`, plus a **full-run** `summary.variety.spawnedByType / windows / maxBasicStreak` (30-second buckets remain accurate even after the old mobile-friendly 600-event detailed log cap). Existing per-obstacle `width,height,expectedTraverseSeconds` stay available. New build marker: `obstacle-director-balance-3.0`.
- All changes are deterministic or seeded-testable; [sizing, physics and 6-minute multi-seed Director tests](tests/obstacle-director-balance-3.0.test.cjs). For full calculations, source-derived findings, constraints, caveats and player test plan see the [Obstacle & Director Balance Audit 3.0](docs/obstacle-director-balance-audit-3.0.md).
- **Unchanged:** Speed Curve 3.2, camera zoom curve, both Dash buttons, jump impulses, HP/shield, score and Flow, gravity inversion, Chroma Tide, original background, existing 3.2 advanced recovery buffers, and all obstacle graphics.

## Echo Borders & Duck Gate Unification 1.3 (2026-11-09)

Player visual corrections based on annotated screenshots:
- **Echo Rail:** Keep exactly the original raised, stretched standard Jump shell with its thin Duck-style underbody curtain. Restore clear **left and right** bright vertical boundaries along the underbody curtain, from directly below the solid beam to the track. Each outer rail is ~2.1 world units wide with modest quality-scaled glow. Interior strands remain ~1px, the field low-opacity, and **no bold bar is added at ground level**. Width/height, collider and doubled-Jump requirements are unchanged.
- **Long Duck Gate (dash-duck):** Eliminate its own visual variant entirely. Both `duck` and `dash-duck` share the **identical standard Duck Gate Canvas draw path**: same transparent upper field (opacity .105), side outlines, unobtrusive horizontal field ribs, lower solid core, glow weights and bottom bright bar. **Only the width** changes. Remove the bespoke long-only zigzag engraving, reinforced rib grid, extra vertical bars and increased background opacity.
- No new image assets, new mechanics or physics changes. No edits to Dash Energy Bridge / Twin Vault zigzag, Speed Curve 3.2, camera, motion or Director spacing.
- Render regression compares the two Duck versions' actual canvas call sequences and glow widths and verifies the two Echo energy-field vertical outer rails.

## Echo Rail Raised Jump 1.2 (2026-11-09)

**Player correction:** The 1.1 rail still looked like a single thick purple box with strong ground-level lines. The desired structure is literally **the ordinary Jump obstacle, extended horizontally and suspended above the track**, connected downward only by the **same faint translucent energy curtain as the normal Duck Gate has above its central body**.

- Draw the **real standard beveled Jump barrier** at the top of the existing Echo collider (height ~44–58 units, depending on existing total 70–86 height). It shares the same inset face, side ribs, bright cap and **underside of the raised solid** as the standard Jump. No bespoke Echo stripe or massive separate lower block.
- Underneath, draw a low-opacity (`rgba(color,.10)`) uninterrupted energy field filling the remaining ~24–30 units **down to the track**, with low-opacity 1px **vertical strands**, never a wave or zigzag.
- **Remove all heavy ground-level base lines and neon plinths** from the Echo energy curtain. The only bold underside belongs to the raised standard Jump barrier itself. The global track line remains as before.
- Physically it remains one and the same full collision rectangle, with no hidden gap/extra hazard. The code reuses the regular obstacle renderer on a visual sub-body, while gravity mirror, zone-2 introduction, speed, Dash and Director remain unchanged.
- Regression tests verify that the Echo's visually solid plinth is **raised**, its energy strands descend straight to the track without a thick foot line, and ordinary jump/duck silhouettes remain unchanged.

## Echo Rail Energy Veil 1.1 (2026-11-09)

**Player visual correction:** The intended reference was the subtle, translucent electric column **above the regular Duck Gate** (highlighted by the player's white arrow), but reversed **below the low Echo Rail**. The previous patterned zigzag compartment was not intended for this family.

- Keep the low, wide, solid purple/cyan **upper neon beam**.
- The underside is a **thin, pale, semi-transparent energy veil** like the ordinary Duck Gate's open field, with fine **VERTICAL** light strands instead of horizontal crossbars. **No zigzag wave / lightning** in this Echo Rail.
- Remove the old opaque lower foot/plinth so the field reads as light rather than a second solid slab. Keep a modest contact glow at the floor and a clear separation glow where it meets the beam.
- All geometry, dimensions, 2D collision, floor/ceiling mirroring, Echo Jump controls, Twin Vault zigzag bridge, Director and Speed Curve 3.2 are unchanged.
- Visual source is drawn in the existing Canvas obstacle renderer; **no generated image assets**. Updated render regression tests check that the actual emitted strands are vertical, translucent and within the same physical bounds.

## Echo Rail 1.0 + Twin Vault Intro Rebalance 2.3 (2026-11-09)

**Player feedback:** only ~2/8 early long Twin Vault crossings succeeded, mainly zones 5–7; the old narrow Echo Spire was also repeatedly frustrating. This update changes their **actual world geometry**, not invisible input conditions or the speed curve.

- **Early Twin Vaults shortened ~25–30%** using a 1.02-second full-body travel target (including the player). Around zone 5 at world speed 745: **980 → 720 world units**. At 900: **1190 → 880**. A gentle width ramp reinstates the full **1,200-unit** late silhouette by world speed 1200. The twin neon boxes and brightly glowing, genuinely colliding zigzag energy between them are unchanged; the shorter early gap is comfortable with a well-timed Echo Jump, while Air Dash remains a useful and fun optional boost. First-time hint now says “DOUBLE JUMP · DASH HELPS” rather than implying a mandatory move.
- **Tall Echo Spire replaced completely** with the **Echo Rail**: one broad, low horizontal barrier with a solid neon deck and a visible, electric underside (underneath the beam, as the inverse of the ordinary hanging Duck Gate's energy field). Intro geometry becomes **265–280 wide × 70–76 high** instead of a 46–49 wide × 190–194 high tower. Later versions are **300–385 wide × 78–86 high**. All glow remains inside actual collision geometry. The first safe Echo lesson still happens on the floor in **zone 2**, with a much more forgiving double-jump window. Higher speed can allow an ordinary well-timed jump.
- Round log `spawn` events now record **width, height and estimated pass time** for direct checks in zone 5–7 exports. Internally `type:'echo'` and old audit keys remain stable for continuity; no old tall Spire is left rendered or spawned.
- **Unchanged:** Spacing & Recovery 2.2 between advanced obstacles, Director pacing, Dash controls/thrust, gravity inversion, Echo ability, original background, Speed Curve 3.2, adaptive camera and HP/Flow.
- [Design calculations, honest physics constraints and testing checklist](docs/twin-vault-intro-balance-2.3-echo-rail-1.0.md). Old Echo Spire and Twin Vault 2.1 notes below are historical only.

## Dash Hazard Spacing & Recovery 2.2 (2026-11-09)

- **Player issue:** a long Twin Vault and a long Ground Dash Gate could appear directly after each other. Director's historical safety gap largely measured **spawn-to-spawn time**, but the Twin Vault itself occupies ~1.36s worth of travel; the next advanced challenge could begin before the previous complete traversal and recovery.
- **Authoritative world-edge spacing:** the game now retains the `endWorld` of the **last actually spawned** obstacle even after the off-screen obstacle list is pruned. Before spawning a new obstacle, `DASH_HAZARDS.placementAfter(...)` checks the **world-space start of the next collider against the previous collider's full end plus a recovery corridor**. Rejected attempts never overwrite this history.
- **Dedicated recovery in actual travel time:** two advanced hurdles: **3.2s after the first shape ends** for either introductory lesson, **2.6s** for subsequent pairings. Following any advanced hazard with a normal Jump/Duck: **2.1s for the first guided lesson, 1.7s afterward**. Immediately before an advanced shape, normal hurdles must leave **1.6s for the first introduction or 1.25s later**. Add ~0.15 speed-seconds of space as a margin against Dash thrust and mobile frame jitter.
- **Director coordination:** `MovementAwareness.minimumGap` now accounts for the physical **length of advanced spans** when calculating spawn/arrival safety (instead of treating the long advanced hazards as ordinary narrow obstacles). The actual game-world edge guard is the final authority, including variable camera warning lead, changing speed and pruned hazards.
- **No forced double-long combos:** normal motifs are unchanged, but guided tutorials can no longer be physically compressed. A postponed obstacle stays pending or is retried later, not teleported closer and not falsely cleared.
- No change to Twin Vault/Long Gate silhouettes, zigzag glow, damage/HP, move timings, free Air/Ground Dash, physics, adaptive camera, Speed Curve 3.2 or UI.
- [Regression tests](tests/dash-hazard-spacing-2.2.test.cjs) include both advanced orders, all speed ranges, late pruned shapes, and an [actual game smoke check](tests/game-smoke.test.cjs) for the first long pair.
- [Technical explanation and playtest checklist](docs/dash-hazard-spacing-recovery-2.2.md).

## Dash Hazard Redesign 2.1 – Zigzag Energy Geometry (2026-11-09)

**Player playtest correction:** The Zigzag Energy Bridge was visually valuable and needed glow polish, not removal. Also the long advanced obstacles should require **Dash at lower speed**, while allowing dash-free traversal after acceleration increases. Dash itself is fun to use freely—never restrict the ability or tie activation to a special obstacle.

- **Twin Vault** retains two ordinary 50-unit low endboxes but reconnects them with a **visibly glowing, 36-unit-high floor-energy strip** with an angular sicksack lightning pattern, soft blue/cyan glow, one restrained moving glint, and an optional second visual layer on higher graphics profiles. The visible energy bed IS the middle physical collider: **landing there hurts**. No invisible checkpoint, action-specific immunity, mandatory seal flag, huge opaque box or extra arrow.
- The long Air layout uses an early-world distance of roughly **1.36 seconds of travel**, capped at **1,200 logical units**. With real Jump/Echo/Dash physics, early runs near speeds 570–900 demand **double jump + Air Dash**, confirmed by a step simulation against all three actual collider shapes. As speed increases past ~1,100 an Echo Jump can suffice; near ~1,800 even a correctly timed **single Jump + Air Dash** becomes viable. This is true physical reach, not a scripted Dash-only command.
- **Long Gate** grows with speed to roughly **0.68 seconds of ordinary travel** (maximum width 530), exceeding the .55s standard Duck early. **Duck + Ground Dash** makes an actual physically viable traversal. At higher speed the width cap naturally makes **Duck alone** sufficient. The gate has a newly strengthened angular white glow integrated inside its full-length underside; the 28px ducking passage is always visibly open.
- Director first introductions remain floor-only, isolated and low-stress. The terrain generator provides a calm **long flat runway only while the two first floor lessons remain untaught**, so these longer hazards can actually spawn; normal randomized hills and gaps resume after the lesson. Dash-attributed clears and no-Dash clears remain differentiated in audit schema 3, with corrected version label `dash-hazard-zigzag-geometry-2.1`.
- High-speed readability budgets for the three-input Twin Vault and two-press Long Gate are lengthened, including offscreen warnings when required. Speed Curve 3.2, Camera Horizon 1.1, controls, Dash thrust, input timings, Flow/HP rules, random Director choice and original background remain unchanged.
- **Design note:** the long *early* layout requires Echo+Dash. Single Jump+Dash is feasible on the same shape later once speed is sufficiently high; there is no hidden anti-Echo rule. This distinction is preferable to faking a forced Dash with invisible damage.
- See [design, calculations and test checklist](docs/dash-hazard-zigzag-geometry-2.1.md) and [step-physics tests](tests/dash-energy-geometry-2.1.test.cjs). The Pure Geometry 2.0 notes below are retained as historical material.

## Dash Hazard Redesign 2.0 – Pure Geometry (2026-11-09)

- **Removed compulsory Dash seal logic and both Air Bridge zigzag strands:** no glowing vertical checkpoints, energy ribbons, invisible blockers or action-locked damage. An ordinary Jump, correctly timed Echo Jump or Duck can legitimately clear **visible collision geometry**. Air Dash / Ground Dash remain powerful **optional** movement techniques with the same two touch controls, same durations, same speed thrust and no invulnerability.
- **Twin Vault (old dash-jump):** two separately drawn and independently colliding standard-width (50-unit) low Jump boxes; their middle is empty and gap length tracks speed at about 0.42 s of travel. A timed Echo Jump can clear both early; at sufficiently high speeds, one clean ordinary jump may also suffice. Optional Air Dash helps cover distance but is never required.
- **Long Gate (old dash-duck):** a clearly visible structural overhead canopy with the existing 28px duck passage. The width is deliberately clamped by the actual 0.55s Duck duration: accounting for the 66px crouched player, even at slower introduction speeds there is **at least ~80ms of geometric slack** for ordinary Duck. Optional Ground Dash adds safer reach/duck duration. No invisible second condition.
- Preserves **ground-only first introductions** (zones 3/4 only when floor returns), later ceiling repeats, Director cooldowns/recovery, terrain gap shielding, gravity inversion, 12-second zones, Speed Curve 3.2, Adaptive Camera Horizon 1.1 (60% late minimum), HP and Shield Core recovery. Existing advanced-hazard early-warning rules remain conservative.
- Improved [run export](src/diagnostics/round-audit.js) to **version 3** with `dashHazards.assisted` and `dashHazards.clearedByMethod.geometry / .dashAssisted`, plus clear `method` events; formerly ambiguous `charged` and seal-break events are no longer emitted. The camera export label is corrected to Horizon 1.1 without changing camera behavior.
- Source-matched [collision/Director regression](tests/dash-hazards-2.0.test.cjs) and [jump/echo/duck geometry tests](tests/dash-pure-geometry-2.0.test.cjs) replace the seal tests; [Game smoke](tests/game-smoke.test.cjs) verifies real no-Dash clears and optional Dash-assisted clears.
- Read the [Pure Geometry design, spacing calculations and test checklist](docs/dash-hazard-redesign-2.0.md). Old Dash Energy Bridge 1.0 sections below are **historical only** and not part of the current build.

## Adaptive Camera Horizon 1.1 — Extended Late-Game Horizon (2026-11-09)

- iPhone playtesting found the first adaptive camera pleasantly subtle, but suggested **up to 60% world scale at genuinely high speed**, rather than the old 80% limit.
- **The entire camera response up to world speed 1,450 is preserved exactly**, keeping the approved difficulty and readability around zone 15 unchanged. After that the 80%-bound zoom curve continues smoothly into a second overlapping zoom stage, reaching **60% at speed 2,200** (~10 minutes on Speed Curve 3.2).
- Two additive cubic-smoothstep ramps: `z = 1 - 0.2*smooth((v-650)/1200) - 0.2*smooth((v-1450)/750)`, clamped by their individual smooth steps. That means **~86% at 3m**, **~73% at 5m**, **~64% at 7m**, **60% around 10m**. These are target zoom values; the camera eases to them over time.
- At the maximum zoom-out, the player remains fixed on screen and a 1,280-unit landscape displays ~**1,907 world units** to the right (vs 1,280 before camera zoom, ~1,515 with Camera 1.0): **~627 extra world units ahead**, about 66.7% more horizontal world span overall.
- **No speed, obstacle, terrain physics, double jump, Dash, HP, Shield, Director pacing, Chroma Tide or HUD changes.** The already-integrated viewport-aware spawn, terrain fill, warning, gravity mirror and color adapter expand automatically with the extra horizon.
- **Readability trade-off:** a 44-unit player square appears ~26 logical units tall at 60%. This can become small on a physical iPhone display. Verify by playing longer and check actual UI contrast; 60% is an experimental *upper bound on zoom-out*, not a demand that short runs shrink this far.
- Validation in [Adaptive Camera Horizon 1.1 regressions](tests/adaptive-camera-horizon-1.1.test.cjs); [new design notes](docs/adaptive-camera-horizon-1.1.md). Historical [1.0 notes](docs/adaptive-camera-horizon-1.0.md) retained.

## Adaptive Camera Horizon 1.0 — Real Lookahead (2026-11-09)

- **Speed Curve 3.2 is locked/unchanged** after the latest iPhone playtest. The player reported a good difficulty increase around zone 15.
- New [adaptive camera module](src/camera/adaptive-camera.js) zooms the WORLD course out smoothly based on actual current speed: **100% through speed 650**, easing to **80% by speed 1,850** and staying at that minimum thereafter. No abrupt jumps on color-zone changes. The on-screen player position, ground anchor, HUD and touch controls remain stable.
- At 80% zoom and a standard 1,280-unit landscape, the right world horizon increases from **1,280 to about 1,515 units**, with the runner staying at its original x position. This is real extra visibility, not simply rendering small objects inside the old obstacle-spawn boundary.
- Terrain renderer now fills the widened view **including below the physical bottom** (also correct when mirrored onto the ceiling) and fills the negative-world sliver at the start of high-zone practice. No fake ground over any existing gap.
- Director spawn positions, reaction-time metrics, offscreen prompts, terrain generation and Shield Core positioning use the enlarged visible world-right boundary. Echo, Dash and gap safety budgets remain unchanged. No obstacle teleports or collision adjustments.
- The original parallax/background and Chroma Tide remain screen-anchored; a tiny world-to-screen color adapter keeps the ground and obstacles synchronized to the same travelling palette front. The original palette-wave overlay, graphics quality and screen-space damage flash remain unchanged.
- No added render passes or offscreen buffers; the zoom uses a regular Canvas 2D transform around the player. Both floor and ceiling modes share one transformed course; HUD, orientation cues and warning labels remain upright and unzoomed. Reduced Motion bypasses camera-easing animation.
- Exported run logs now include final camera zoom, minimum zoom and added visible reaction distance. [Camera tests](tests/adaptive-camera-horizon-1.0.test.cjs) and [design/QA notes](docs/adaptive-camera-horizon-1.0.md) cover rendering, tide alignment, correct gap coverage, spawn safety and mobile expectations.

## Speed Curve 3.2 — Faster Momentum (2026-11-09)

- Built from two playtests: Curve 3.0 ended at **6:53 / zone 35 / ~1,155 speed**; Curve 3.1 ended at **4:29.7 / zone 23 / ~1,349 speed**. Despite the shorter run, the player still felt the acceleration was too slow.
- Formula: `370 + 1350 * (1 − exp(−t/170)) + .9 * t`, t=elapsed seconds. Starts at 370; reaches **825** at 1m, **1,162** at 2m, **1,414** at 3m, **1,759** at 5m, **1,984** at 7m. These are rounded world units/s.
- Continues upward indefinitely, with gradually tapering acceleration. All 12-second zone transitions remain visually significant but add **no instantaneous speed step**.
- **Only speed balance is changed:** Jump, Duck, Echo Jump, Dash geometry and seals, movement physics, Director, HP/Shield restoration, color zones, original background and fixed camera stay as before.
- Includes [Speed Curve 3.2 tests](tests/speed-curve-3.2.test.cjs) for continuous speed, exact 1/2/3/5/7-minute targets, 10/20-minute robustness, practice alignment, Dash and Echo reaction budgets and seeded seven-minute safety.
- The next independent feature pass, **Adaptive Camera Horizon 1.0**, has now been implemented and is documented above.
- Read [Speed Curve 3.2 balance notes](docs/speed-curve-3.2.md). No force-death timer and no promise of a specific human run duration.

## Speed Curve 3.0 — Long-Run Progression (2026-11-09)

- **Balancing target:** exceptional runs around 5–7 minutes, with 10+ minutes still possible. This is not a forced death time or a measured human survival distribution.
- Keeps 370 units/s launch and 12-second zones; replaces the two-slope plus per-zone boost with one continuously increasing, diminishing-acceleration velocity curve.
- Formula: `370 + 620 × (1 − exp(−t/180)) + 0.55 × t` for elapsed time `t` in seconds. Expected: ~579 at 1m, ~738 at 2m, ~861 at 3m, ~1,038 at 5m, ~1,161 at 7m, ~1,298 at 10m. There is **no speed cap**.
- Zone changes still trigger visual/color milestones and progression, but no extra speed jump; later-zone practice starts at the same corresponding time-derived speed.
- No changes to Director decisions, movement, HP/Flow, obstacle physics, original camera/background, graphics quality or gap collision. The **existing Dash Energy Bridge is still present**; the seal-less geometry and dynamic camera are separate future passes.
- Previously saved scores, PBs and milestones remain; older scores may not be directly comparable with the new speed curve.
- Historical implementation details remain in the [Speed Curve 3.0 notes](docs/speed-curve-3.0.md).

## Dash Energy Bridge 1.0 (2026-11-08)

- Replaces the single wide Air Dash rectangle with **two real 50-unit normal Jump box collision bodies**, spaced by approximately 0.42 seconds of running distance. The gap has **no invisible solid collider**.
- A legible double-strand zigzag energy connection is rendered between the two boxes, including a visible center energy seam reaching to the top of the playfield.
- Echo Jump can travel longer than both boxes, but **cannot bypass the center Dash seal**. The matching Air Dash must be activated locally. Charge fades the bridge to mint, with the existing strike confirmation.
- Air Dash proximity scales with speed (~0.35 seconds rather than a 280-unit cap), unlike the unchanged Ground Dash proximity; the 0.30-second Dash duration and jump/echo physics remain intact.
- Compound boxes use swept collision checks independently (including at low mobile frame rates). Checkpoint crossing remains frame-safe; clearance only rewards an actually charged seal.
- Existing floor-first introduction, gravity inversion, terrain/Director safety vetoes and reaction-time warnings are retained. No fonts, icons or arrows in the hazard.
- New source-matched Echo-vs-Dash distance budget and high-speed/collision tests cover early and late zones.

## HUD Anchor Alignment 4.1 (2026-11-08)

- Corrected legacy 166px right inset that previously made the center of the HUD visually drift left.
- Zone stays at the true midpoint of the viewport independently of how wide Shield, Flow and Score are.
- Score, Speed and the PB tracker are pinned to the right side, with a dedicated safe area for the sound and pause controls.
- Narrow landscape viewports use slightly smaller score/zone text and shorter widths, preserving separation without scrolling.
- CSS-only: no changes to HUD values, score logic, layout of on-screen buttons, canvas, renderer, Director, gameplay or quality profiles.

## Premium Arcade UI & Final Cohesion 4.0 (2026-11-08)

- **Main Menu simplification:** one centered CHROMA RUSH identity, a short tagline, a single dominant START RUN action, condensed personal bests and quiet navigation to Practice, Milestones and How to Play. Release metadata is still accessible in the DOM but no longer competes visually.
- **Run Complete clarity:** score is the focal point, with only zone and best score immediately beneath it; replay is the primary CTA, while Main Menu / Run Details are secondary. The private export action lives inside Run Details, not in the primary choice row.
- **Preserved complete results:** perfect zones, best streak, distance, comparison, next challenge, earned milestones, and export remain fully functional in the expandable details drawer.
- **Record and practice clarity:** new high scores receive a distinct restrained pink accent; Practice continues to say it is unranked, while ranked mode drops redundant labels.
- **HUD simplification:** shield, Flow, zone and score are visually dominant; Director phase and duplicate logo labels remain available to JS/tests but are hidden from the live HUD. Existing HP alerts, combo, dash/echo cues, score, replay tracker and speed continue updating normally.
- **Mobile and performance:** short landscape viewports have a compact responsive layout with large primary buttons; CSS-only decorations add no animation loops, canvas passes or expensive fullscreen blur. No mechanics, Director logic, hitboxes, original background, Chroma Tide, or High preset changes.
- **Accessibility:** explicit menu navigation names, retained semantic buttons and drawers, preserved status accessibility and focus-visible styles.
- **Verification:** regression checks cover primary actions, details/export retention, practice presentation, HUD updates and DOM structure; Playwright GitHub Actions checks validate mobile landscape and screen layout.

## Chroma Tide & Energy Identity 3.0 (2026-11-08)

- **Phase light in original sky:** a wide, soft atmosphere reflection follows the true moving color boundary (no rings, boxes, scouts or stage geometry). Balanced/High only; no additional radial light in Performance.
- **Ground illumination on true terrain:** the arriving palette briefly refracts the existing solid ground material inside its clip, so gaps remain completely open. On High an extra fine, gradient-tinted edge hugs actual slopes and ledges.
- **Refined Chroma Tide:** wider feathered color refraction replaces the narrow glow impression; the moving seam remains naturally warped, not a hard fake barrier, while the original spatial color masks still recolor the world once.
- **Player contact:** the moment the real wave crosses the player activates a short glow/material response on the clean, unmarked cube and its true contact line. The existing zone sound remains synchronized to that crossing; no new timer, hazard or random state.
- **Afterglow and reduced motion:** brief fading horizon energy after transition, then no leftover effects. Reduced motion still skips the wave; quality tiers bound sky/ground work. No physics, collision, Director, speed, inputs, original background geometry or High preset changes.
- **Tests:** release metadata, bounded reflections, gap-safe terrain and previous Chroma Tide / Player Identity expectations are verified in CI.

## Player & Movement Identity 2.0 (2026-11-08)

- **Removed unwanted markings:** no painted lines on the runner; removed the confusing arrow/text-like glyphs from Jump, Duck, Echo and Dash obstacles, including the three inward chevrons from Dash seals. Actual obstacle architecture and collision remain untouched.
- **Living glass cube:** an updated multi-stop, zone-reactive material coats the existing squash/stretch shape with continuous body color. Jump, Echo, landing, duck and Dash visual-clock intensities modulate rim glow and color without adding glyphs, icons or floating geometry.
- **Responsive surface light:** the existing contact strip gains brief, land/duck-aware illumination. Premium modes get one extra low-cost optical coating; Performance gets a single material gradient and contact strip.
- **Safe under inversion:** all body and contact effects draw within the already gravity-transformed course; original atmospheric backdrop remains unchanged. No input, Director, Flow, hitbox or speed-rule changes.
- **Cache and QA:** asset query versions and audit build stamp refreshed; legacy tests and dedicated visual tests validate no glyphs, limited draw budget and unchanged physics.

## Chroma Identity & Visual Polish 1.0 (2026-11-08)

- New dedicated **Canvas-only visual identity module** supplies palette-aware channel cuts within the original runner silhouette and inset hazard marks across Jump, Duck, Echo and Dash.
- **Premium Chroma Tide:** a trio of boundary-locked light shear traces on higher-quality devices only; Performance graphics receives no additional strokes or overhead.
- **Clean arcade typography:** dual-color logo rail, score hierarchy, compact HUD progress rails, and deliberate call-to-action styling for Main Menu and Run Complete.
- **Strict protections:** original restored background, collision dimensions, 60Hz physics, Director, Flow, terrain, inputs, and HIGH quality profile unchanged. New module is optional on staged/cached HTML loads.
- **Verification:** dedicated visual mark geometry tests and complete GitHub Actions unit/browser suites.

## Performance Stability 2.0 (2026-11-08)

- **Premium High is protected:** no changes to HIGH resolution budgets, glow, particle density, animation language, Chroma Tide or background aesthetics. Manual HIGH is never dynamically downgraded.
- **One DOM update per rendered simulation frame:** when a slow device needs multiple deterministic 60 Hz simulation steps, HUD and sound-button updates now happen once per visible frame, not once per catch-up step. On 120 Hz displays, no unnecessary DOM update occurs for frames without a simulation step. Dash, terrain, scoring and movement are identical.
- **Offscreen hazard culling:** high-speed future Dash/Echo obstacles still exist for collision and Director lookahead but skip expensive canvas gradients/shadows until they can affect the viewport. Visible geometry and glow are unchanged.
- **Faster terrain lookups:** binary search replaces repeated linear traversal of monotonic terrain segments. World coordinates, gaps, slopes and hitboxes remain exactly the same.
- **Lower JS churn:** an O(1) bounded circular frame history replaces per-frame array shifting. Color RGBA formatting no longer allocates a three-number array per obstacle paint call.
- **More robust Auto Quality:** after a pause, run start or resume, stale frame measurements are cleared without changing the chosen visual tier. Stable devices with unknown Safari/browser hardware hints are allowed back to High sooner, with a long hysteresis cooldown; marginal devices can still automatically step down after sustained slow frames. Manual settings never change.
- **Verification:** new regression tests cover High integrity, Auto recovery, frame-rate statistics, long-run terrain boundaries, and render-only instrumentation, alongside the existing seeded High-vs-Performance gameplay parity test.
- **Scope boundary:** this release does not lower visual ambition to accommodate the older Galaxy A51, nor does it claim to measure actual iPhone 16 performance remotely. Use a fresh iPhone test run to confirm perceived stability.

## Director Experience & Flow Balance 2.0 (2026-11-08)

- **Precision means skill, not stress:** a successful tight-clearance obstacle pass now calls `registerPrecisionClear` instead of registering a near-miss. The Director gains slightly more confidence (+0.012) and relieves existing stress (-0.028) without altering hazard geometry, speed, score, HP, or hitboxes. Real dangerous near-misses and collisions still raise pressure normally. Previously, repeated precision clears incorrectly raised stress and could postpone special challenges.
- **Fairness during Director-authored breathers:** Flow's idle-decay timer ages at half speed during FADE and does not age during RELAX. A RELAX phase restores at most one second of unused idle grace for the subsequent BUILD; it cannot refill Flow. Above 65%, gentle exponential pressure still runs during both phases with their existing reduced rates; long no-clear runs still lose Chroma.
- **What is intentionally unchanged:** Flow gains for clears (5), precision (8), combo points, thresholds (30/65/90), 2× Chroma, damage penalty (35), Perfect Zone criteria (three real clears), adaptive terrain/obstacle safety, Dash scheduling, graphics profiles and the speed curve.
- **Player evidence:** exported run logs now include `directorExperience` with precision/stress diagnostics and `flowBalance` with cumulative pressure loss, idle loss, recovery-phase time and current Flow/tier. No additional menu or HUD clutter.
- **QA:** deterministic fixed-step tests for successful precision, genuine danger, no free Flow, relaxation grace, extended idle and new run diagnostics; existing Node, browser and high-speed fairness checks remain authoritative.

## Dash Reliability 1.2 + UI Calm 1.0 (2026-11-08)

- **What failed in live play:** three uploaded arcade audit logs (zones 9, 12, 12) contained **172 real obstacle spawns, zero Dash obstacles**. The prior pure-Director 370-test run had not exercised the real terrain+gap+obstacle veto stack. This was not unlucky RNG.
- **Corrected physical safety:** the normal terrain collider validator already guarantees an obstacle on flat ground with a clear launch/landing window. The Dash-specific validator incorrectly demanded *identical* elevation almost two seconds before/after the obstacle, plus faraway exclusions, so hilly late zones almost always rejected it. We now let gentle distant slopes coexist with Dash but preserve the local flat collider, no-gap corridor, collision geometry, true reaction lead, shield/gap constraints and collision-based spacing.
- **Guided flat runway:** while teaching the two *first* Dash obstacles, Unified Terrain Director briefly generates floor-run training sections without slopes/gaps, only after the Echo Spire has been introduced; as soon as both Dash lessons spawn, ordinary procedural terrain resumes. Ceiling teaching is still forbidden, and normal Dash repeats may still occur on the ceiling.
- **Diagnostics:** audit summary now records actual Dash spawns and a compact rejected-attempt count grouped by reason (rather than flooding event lists). This makes it possible to diagnose a real run directly instead of relying on isolated pattern simulation.
- **UI Calm:** main menu focuses on the logo, START RUN, Best Score and Best Zone. Practice, Milestones and How to Play remain one tap away through compact secondary actions; full controls and training selectors do not crowd the default viewport. Run Complete puts the run score first, zone and personal best second, RUN AGAIN next; precision/streak/distance/comparison/challenge details are behind RUN DETAILS. Export Log remains one tap away for debugging. No settings, modes or records are removed.
- **QA:** adds a **real game-frame integration test with actual terrain, obstacle spawning and gravity flipping through the late zones**, plus tests for the menu/results disclosure behavior. The old pure-Director test remains for pattern fairness.

## Dash Pacing 1.1 + Chroma Spectrum 2.0 (2026-11-08)

- **Floor-first teaching is universal for new obstacle mechanics:** the initial Echo Spire, Air Vault and Ground Slip Gate must first appear during ordinary floor running, NEVER in a ceiling section or during a flip. Dash abilities still unlock on their original zones; an *obstacle lesson* waits for a safe floor even if the player is already in zone 5 or later. The gravity shift waits for a first-lesson obstacle to pass before flipping.
- **Recurrent challenges after the introductions:** after both Dash types have been safely introduced, the Director explicitly considers a single Dash obstacle around every 24 seconds of safe play, alternating Air and Ground. It can appear on either surface only after being learned on floor. This is a minimum spacing, not a rigid time obligation: low HP (50 or less), stress, inappropriate phases, gravity transitions, recovery awareness, existing hazards and unsafe terrain still postpone it. Random selection is no longer required for useful recurrence.
- **Director integrity:** the Dash spawn pressure is no longer recorded as an Echo Spire spawn; existing Echo cooldown remains meaningful. Every Dash repeat remains a single step in the regular Director, never a mandatory stacked pattern, and records diagnostic counts for actual spawned repeats.
- **24 curated neon zones:** keep the original first eight palettes *identical and in the same order*; add 16 new premium high-contrast chromatic combinations for zones 9 through 24. Existing Chroma Tide wave and one-pass rendering are reused, with no extra shader layers, textures, particles, CPU color computations or changes to gameplay balance. Colors only begin repeating at zone 25.
- **Unchanged pending design choice:** Air Vault / Ground Slip Gate width, dash seal collision requirement, art, player controls, movement, physics and hitbox remain unchanged. Widening hurdles instead of an energy seal is explicitly deferred until real player feedback decides.
- **Verification:** simulate grounded first introductions with the actual ceiling cadence and recurring encounters through zone 14, pause repeats for low shield, preserve spacing, check all 24 palette names and cache versions, rerun browser + node checks.

## Dash Challenge Obstacles 1.0 — Air Vault & Ground Slip Gate (2026-11-08)

- **Air Vault (dash-jump):** an extended, low jump barrier with a visible, slender vertical momentum seal. First introduced from zone 3, one by itself; clear by jumping and starting Air Dash near its white dash seal. Ordinary Jump, Double Jump, and Dash too far away cannot open the seal.
- **Ground Slip Gate (dash-duck):** an extended version of the existing overhead Duck Gate, with a visible energy membrane inside its low passage. First introduced from zone 4. Duck first, then physically press Duck again to Ground Dash through the seal. Neither a single crouch nor Air Dash breaks it.
- **Not invulnerability:** players still need to clear the actual jump or duck collider; failed height or mistimed posture still takes ordinary shield damage. Both are obstacles, not rewards or scenery. Unlocking a seal doesn't skip collision checks or guarantee a clear.
- **Director:** two low-weight single-action micro-patterns, taught separately and held back for low shield / high stress / flip transitions. Special challenges reserve significantly more safe terrain and obstacle spacing. Their minimum reaction lead is 1.25s Air / 1.18s Ground, with the existing high-speed ahead-of-screen warning. Both fully support ceiling mirroring.
- **Visual:** consistent existing beveled jump/duck architecture, thin luminous seal, integrated short chevrons, and a brief AIR DASH / GROUND DASH lesson in the existing HUD hint, never text or floating icons drawn onto the obstacle. Charged seals soften to mint. No distracting rectangular arrival marker or halo/ring.
- **Scoring/analytics:** regular real obstacle-clear Flow and score, one damage event on a missed seal, subtle chime on successful breakthrough, audit logs for separate Air / Ground clears and misses. The existing combo classification treats them as jump and duck. Controls, dash impulse and hitboxes unchanged.
- **Regression:** test real active Dash mode + proximity + posture, ordinary-action failure, ceiling/terrain fairness, intro pacing and browser/phone performance. Final tuning to be informed by actual Android playtests.

## Shield Core 1.0 — Collectible Recovery & Pickup Feel (2026-11-08)

- Optional and rare **+25 SHIELD** crystal (capped at 100), appearing at earliest zone 2 and only if shield <=75. It never awards points, Flow or separate currency.
- Core position: 268px above **local flat terrain**, deliberately above normal single-jump reach. A real Echo Jump press and vertical hitbox overlap are required; proximity alone cannot reward the player.
- Director safe corridor: spawn only on a stable flat launch/landing span, away from existing hurdles and gaps; later hazards are vetoed while the reward is active. Single active core, deterministic 27–33s opportunity spacing, no gameplay random calls or forced obstacles.
- Pickup: code-drawn white/cyan crystal with small `×2` cue, tiny local magnet *only after* Echo Jump, brief pop and energy diamond flying toward the upright HUD, +25 feedback and a soft shield-bar glow. Small two-note synth pickup chime, optional haptic, quality-scaled sparkle. No confusing boxes or particle rings.
- Gravity Shift: positions and collision stay in canonical floor coordinates and are transformed through the course display; the short pickup flight transforms its origin once and moves to the upright HUD.
- Run audit logs spawn/pickup/miss plus collected count and shield restored, locally only.
- Existing Dash 2.5, gameplay hitbox, jump physics, procedural Director randomness, controls and level difficulty remain unchanged.

## Dash Animation 2.5 — Squash, Stretch & Speed Feel (2026-11-08)

- **Reference:** applies the 5-stage movement-feel pattern identified in the user's Dash video: anticipation → strong shape deformation → synchronized whoosh → brief afterimages → speed lines. The extra camera push was deliberately omitted to preserve obstacle readability on a fast auto-runner.
- **Elastic silhouette:** keep the approved 2.4 softly bowed top (28% stronger forward), bottom fixed, never rotate the cube. Layer in Air wind-up horizontal compression (~8.5% narrower, ~6.5% taller) then release stretch (~14.5% longer, ~8.3% shorter). Compact Ground Duck gets a smaller 4.3% compression and 6.8% release stretch.
- **Release-linked sound & VFX:** a restrained charge click and very short haptic cue occur on input. The main Dash whoosh, quick negative-X streak particles and stronger haptic cue fire **once** when the actual PlayerMotion `dashFeel.burst` transitions forward, not at the initial backward pose. The former instant rectangular frame is removed; don't add distracting circular rings.
- **Pose-matched afterimages:** 2–3 true, curved top-edge samples share the existing `SpeedTrails` module; recorded positions use the real world distance and feet of each sample, not copies glued to the current frame. Render under hazards and behind the player to avoid fake obstacles. Caps: High 3 / Balanced 2 / Performance 1; entries fade after 225ms. In Performance mode blur is disabled.
- **Physics/Director/HP unchanged:** Dash 2.2 thrust, 0.30s window, level/zone 1 availability, collision geometry, ceiling mirroring and fairness are identical; VFX does not mutate gameplay RNG. Reduced-motion removes pose ghosts and lowers deformation.
- **Tests:** deterministic phase behavior, zone-1 touch input, audio charge→release sequencing, true echo geometry and age caps, no ghost on reduced motion, no rings, fixed physics and exact cache-versioned files.
- **Next stage:** Dash-specific obstacles only after real-device movement testing; keep required inputs telegraphed and timed by the Director.

## Dash Elastic 2.4 (2026-11-08)

- **User-confirmed animation language:** the top of the rounded cube bends **backward** for a short ~45ms wind-up, then springs forward with **28% more deformation** than the backward anticipation. The bottom stays anchored and the rounded sides gently bow, using a small Canvas bezier path rather than rotating or swapping sprites.
- **Timing:** wind-up 0–45ms → spring through zero to a full forward stretch by 100ms → brief held impact → subtle elastic recoil → upright by 300ms, synchronized with the existing duration. A pure easing function is used so movement remains smooth even across skipped mobile frames.
- **Air Dash:** the relatively tall existing jumping silhouette gets an upper-edge shift of up to roughly 16px (on its 36px-wide hitbox), staying soft and vertical rather than a triangle or leaning as a rigid block. **Ground Dash:** only ~6px of top-edge displacement on its compact 66×21 duck silhouette. Both keep the original white core, gleam, and rounded ink/neon outline.
- **Unchanged gameplay:** original Dash thrust (2.2), duration, mechanics, collision box, jump/duck physics, Director, sounds, HUD, background and controller bindings are left alone; Ceiling Run mirrors the curved artwork with the same board transform. Reduced-motion still shows the state but with a smaller bend.
- **Tests:** verify backward/front ratio, independent motion phases, unshifted feet, curved sides, visible effect in actual frame rendering, release asset freshness, and CPU-only browser/gameplay regressions. No dash-only obstacles are introduced here.

## Dash Soft Lean 2.3 (2026-11-08)

- **Return to the original character:** the pointed arrow/polygon cube is gone. Air Dash and Ground Dash both retain the player's established soft round-rectangle ink, white surface shading, neon edge and jump/duck squash/stretch.
- **Air Dash lean:** smooth clockwise rotation of the body by up to **0.215 radians (~12.3°)** around its visual center, plus only **13%** extra horizontal stretch and ~4.5% extra compression. Its direction still reads rightward in the normal side-on course camera.
- **Ground Dash lean:** small **0.052 radians (~3.0°)** tilt and just **7.5%** extra stretch. The body remains a compact crouched cube, not a spear or a flattened glider.
- **Continuous motion:** smoothstep-in and smoothstep-out tied to the existing 0.30s Dash. No sudden shape swap, extra object or temporary alternate sprite. Reduced-motion mode scales the visual tilt down to 25% without changing the hitbox or movement.
- **Same Dash power:** the stronger 2.2 travel impulse, dash duration, sound, speed trails, Director, jump/duck inputs and zone-1 availability remain untouched. Existing course transform mirrors the body's rotation for ceiling runs; world geometry is not rotated.
- **QA:** explicit regression tests for soft silhouette, lean limits, no arrow path, original collision geometry and all release asset versions. Dash-only obstacles are still deliberately a separate fairness/balance step after movement feel is accepted.

## Dash Impact & Morph 2.2 (2026-11-08)

- **Immediate stronger thrust:** Dash now lasts 0.30s (was 0.24s) with bonus world velocity `clamp(1.05 × speed, 400, 760)`, modulated by a quick launch kick and smooth taper. Both terrain-distance and obstacle screen positions continue to use one fixed-step world displacement; no teleport, camera whiplash, extra health or changed hitboxes.
- **The cube transforms, not just glows:** In the air, it becomes a long pointed glider; on the ground, a flat forward-leaning skid shape. A sharp energy spine, brighter 2–4 trailing horizontal rails and a small wake make the action perceptible even at Performance quality. The base jump and duck silhouettes are unchanged when Dash is inactive. Ceiling Run mirrors the same art.
- **Audio & feel:** stronger two-layer thrust plus a resolving overtone for each Dash type, and a slightly longer optional haptic tap; still respects the existing sound and reduced-motion settings.
- **All movement from zone 1:** Air/Ground Dash, Jump and Double Jump can all be performed immediately. The *first mandatory Echo Spire* remains in zone 2 to teach precision later without locking the ability. Dash teaching appears at run start, with the Echo hint reserved for zone 2; they do not overlap.
- **Next step, not bundled:** introduce Dash-dependent barriers and longer gaps only after the new dash movement is playtested, and audit reachability, compulsory spacing, slope/ceiling variants, inputs at 30fps and Director pacing. Avoid introducing a required Dash obstacle before onboarding.
- **Versioned release:** changes to configuration, dash physics, motion rendering, audio, game logic and menu all get fresh URLs and automated tests for movement strength, morph geometry, collision invariants and browser layout.

## Movement Evolution 2.1 — Control Reliability Fix (2026-11-08)

- **Fix rapid Double Jump:** the 95ms no-input period that silently ignored a legitimate second press is removed. Each independently released/repressed jump now works immediately as soon as Double Jump unlocks in zone 2; holding a pointer or key still cannot auto-repeat.
- **Dash available from the start:** rather than hiding it until zone 4 / higher speed, contextual Dash now works in zone 1. The onboarding prompt appears immediately and the existing instruction text reflects actual availability. One Air Dash per flight, and one Ground Dash per new duck sequence remain the rules.
- **Correct stale asset risk:** `config.js`, `game.js`, `jump-controller.js`, `contextual-dash.js`, `style.css`, and `round-audit.js` all have fresh versioned URLs. The dash module and game also gracefully tolerate an unexpectedly older cached config.
- **Touch robustness:** pointer-up/cancel on window clears stale captures if Android delivers the release outside the original button. A brief high-contrast DASH confirmation appears on the right button during the active dash.
- **Action-level diagnostics:** round audit version 2 now retains input decisions, successful Double Jump/Air Dash/Ground Dash and rejected dash attempts with reason codes; no touch coordinates or personal identifiers. New per-run counters let real mobile reports conclusively distinguish presses not reaching the game from physics decisions.
- **Fairness unchanged:** no new required dash hazards; gravity, damage, hitboxes and procedurally authored levels remain intact. Performance and mobile visual checks still required in the CI.

## Movement Evolution 2.0 — Contextual Dash (2026-11-08)

- **Two controls only:** the existing left **JUMP** button is widened and labelled `×2 DOUBLE JUMP`; the right is equally wide and labelled **DUCK / DASH** with `×2 GROUND DASH`. On the keyboard, Space/Up stays Jump and Down/S remains context-sensitive. Every dash needs a *new* physical press; holding a key/pointer never repeats it.
- **Air Dash:** starting in **zone 4**, one tap of Duck/Dash while airborne adds `0.24 s` of bounded forward travel. It can be used before or after Echo Jump in the same flight, but **at most once per landing interval**. Dash never changes vertical velocity, gravity, collision geometry, or provides invulnerability.
- **Ground Dash:** tap Duck once to begin the existing `0.55 s` crouch, release then tap again **before the crouch ends** to dash while still crouched. The second tap guarantees at least `0.55 s` of remaining crouch time. A new duck cannot begin during the original `0.12 s` duck recovery. No continuous holding.
- **World-space, fixed-step mechanics:** the runner stays at its canonical screen position. For the dash's `0.24 s` duration, the same `worldStep = speed × dt + dashExtra` is used for **player world position, gap/terrain sampling and all obstacle motion**. Additive dash speed is `clamp(0.72 × currentSpeed, 270, 560)` logical units/s. No teleport, no extra dash jumps, no modified zone speed curve.
- **Presentation and accessibility:** a restrained horizontal stretch, side-on neon wake, small procedural sound cue and short optional haptic pulse distinguish Air/Ground Dash. The entire course and effects mirror correctly during Ceiling Run. Reduced-motion suppresses cosmetic particle bursts and ribbons, but gameplay is identical. The main menu exposes the current build and a zone-4 onboarding hint explains the combination.
- **Adaptive Director integration:** successful dash presses are recorded as player intent and add a small recovery buffer to *future* complex patterns. All existing hazards remain physical; dashing **does not clear** them or grant damage protection. No new mandatory dash-only hazards or wider gaps are introduced until the mechanic is tested on real devices; those require a dedicated fairness and difficulty audit.
- **QA:** `tests/movement-evolution-2.0.test.cjs` checks one-air-use, double-tap ground gating, exact finite travel, Director insight, hitbox invariants and build wiring. `tests/game-smoke.test.cjs` exercises actual controls and world traversal in the live simulation. Playtest zone 4+ on both floor and ceiling, with High/Balanced graphics.

## Chroma Tide Spectacle 1.0 — The Visible Impact Pass (2026-11-08)

- **Stronger, still legible wave:** two carefully bounded translucent prismatic veils, a brighter central filament, colored flank filaments, trailing refracted shards and short speed cuts. Every stroke remains physically tied to the existing full-height wave; no scout/pseudo-obstacle, circle, screen-wide white flash or strobing.
- **Living track and parallax:** the *existing* perspective grid becomes brighter for an instant as the front passes. One additional small highlight follows the exact terrain surface, stopping at real gaps and tracking slopes/ceiling inversion. The original background's horizon receives one narrow traveling depth shimmer. Background and terrain continue to be drawn **once each**.
- **Afterglow you can notice:** the crossing resonates for 0.48s, and after the front exits the viewport, three small local horizontal light rails decay for 0.78s. This is a finite deterministic trail (no persistent shader state or particles), and remains independent of hazards, scoring and RNG.
- **Sound lock:** the established zone-change cue lands on the actual player crossing, with one extra quiet harmonic tail; zone-charge remains a separate, softer warning. Audio settings and reduced-motion behavior are unchanged.
- **Mobile budget:** bounded draw calls scale with High/Balanced/Performance density and glow. No extra textures, full-scene re-renders, cameras, offscreen canvases, motion blur or new asset requests. Local UI now shows the latest build as “CHROMA TIDE SPECTACLE 1.0”.
- **QA:** automated tests for front integration, afterglow decay, reduced-motion, bounded rendering and unchanged one-pass world/terrain. Manual review of zones 1→2 and 2→3 at High and Balanced on an older phone is still needed before calling the visual balance final.

## Chroma Tide 2.0 — Premium Color-Zone Transitions (2026-11-08)

- **No false hazards:** the separate on-ground scout rectangle and its vertical tip remain completely absent. The 0.19-second awakening phase introduces only a *scene-wide subtle tint and rising zone-charge sound*, not a new object to jump over.
- **Unified chromatic tide:** over the next **0.86 seconds**, a full-height, softly warped color boundary sweeps right-to-left. A prismatic leading veil, layered light filaments and short refraction flecks move **with the same wave front**; an approximately 0.27-second pair of restrained horizontal resonance rails accompanies the single crossing of the player. No rings or full-screen white flash. Zone sound lands once at the actual crossing.
- **Perceptually blended pigments:** per-palette, per-channel 65-step OKLab color ramps are generated **once on zone change**. Subsequent actor, environment and ground-light samples use only simple lookup (no per-frame exponent/power calculations). Original eight palettes and their exact endpoint colors remain unchanged.
- **Original background remains intact:** atmospheric sky, distant columns, subtle streaks, stars, floor/grid and full-height continuity are preserved. World objects change color where the same spatial wave passes; global haze and ground ambience blend smoothly across the entire duration rather than snapping at the center of the frame.
- **The big performance fix:** during the tide the original code drew both palette versions of the **entire background AND terrain** in separate clipped passes. Chroma Tide 2.0 calls the real background renderer **once** and the real terrain renderer **once**, with spatial color gradients and per-object color sampling. The terrain's original gap transparency mask still clips once. The tide itself limits luminous strokes independent of forced High glow. This reduces redundant Canvas drawing; actual FPS benefit depends on the phone and must be checked on device.
- **Game integrity:** the Director, difficulty curve, zone cadence, collision bounds, world geometry, speed, Flow/combos, Double Jump, Gravity Shift, HUD and two controls are untouched. The existing reduced-motion setting bypasses the animated tide while still applying the next palette.
- **Acceptance QA:** [Chroma Tide tests](tests/chroma-tide-2.0.test.cjs) verify 8 palette ramps, one-pass world/terrain, correct gradient direction, charge without object geometry, fixed FX budget, reduced motion and unchanged control semantics. [Game-loop tests](tests/game-smoke.test.cjs) verify a real zone transition renders exactly one backdrop and ground pass. For older phones, compare zone 1→2 and 2→3 in High vs Balanced and export run FPS/frame-stall metrics.

## Echo Spire 1.2 — Early Zone-2 Double-Jump Onboarding (2026-11-08)

- **Double-jump is a basic movement, not a late-game surprise.** The first solo Echo Spire is taught on the floor in **zone 2**, immediately after the existing zone-2 Echo Jump unlock. The first ceiling Gravity Shift still begins in zone 3 and is unchanged.
- **Actual scheduling, not just eligibility.** Adaptive Rush Director prioritizes one isolated introductory Spire about 1.5 seconds into zone 2, including during normal FADE/RELAX pacing when necessary. Ordinary obstacle spacing, terrain, HP and gravity safety checks are still enforced; the introduction is never silently forced through an unsafe gap or pending shift.
- **Reliable runway:** before its first introduction, the zone-2 terrain forecast avoids slopes, so players learn the gesture on a predictable, level approach. A blocked or dangerously late tutorial is cancelled rather than arriving just before the zone-3 ceiling transition; it can retry in a later safe floor segment.
- **Same forgiving artwork and hitbox as 1.1:** first Spire 190–194 high × 46–49 wide, regular Spires 190–200 high × 46–52 wide, with the Low Neon Barrier family appearance. Single jump cannot clear it, while two taps still can. Later Echo Gaps remain locked until the first real Spire clear. No Dash, additional button, change to speed acceleration or player physics.
- [Gameplay integration test](tests/game-smoke.test.cjs) exercises an ordinary arcade run from zone 1 and verifies that its first real Echo Spire is spawned **in zone 2, on the floor**. Echo physics, Director tests and high-speed fairness tests cover the follow-up.

## Echo Spire 1.1 — Shared Barrier Style & First Floor Lesson (2026-11-08)

- **Shared design language:** the tall Echo Spire and ordinary Low Neon Barrier now use the SAME beveled housing, recessed front, white top rail, side structure and illuminated floor plinth. The Spire retains two distinct integral energy chambers, but no text, detached arrows or floating instruction icons. Duck Gates retain their established design.
- **More forgiving after Speed Curve 2.0:** ordinary Spires are **190–200** world units high and **46–52** units wide; the very first lesson is only **190–194** high and **46–49** wide. The canonical single-jump apex remains ~**177** world units, so one jump is still insufficient, while the double-jump now has a broader vertical and horizontal timing window at low speed.
- **Grounded first lesson:** initially started in zone 5 in 1.1; moved to **zone 2** in 1.2 (before the first Ceiling Run). The Director and the real spawn function both require the *actual floor orientation* for the first Echo Spire, with no pending/in-progress gravity flip. The first hard gap demanding double jump is withheld until a Spire has been **really cleared**, so the first mandatory double-jump challenge is never an Echo Gap in the ceiling. Later Echo Spires are still possible on either surface.
- **No terrain loophole:** Spires require a nearly level takeoff and landing (within 8 world units of the obstacle base), preventing a first-jump bypass from a much higher slope. No changes to player jump impulses, speed acceleration, Flow scoring, HP, obstacle controls, or normal JUMP/DUCK/regular gap balance.
- [Updated Echo physics/Director tests](tests/echo-spire-1.0.test.cjs) cover single-vs-double-jump at slower speeds, genuine early-floor introduction, deferred ceiling spawns, and later ceiling support. [Visual render tests](tests/jump-obstacle-visual-identity-1.0.test.cjs) compare the shared shell under both Low and High graphics settings.

## Speed Curve 2.0 (2026-11-08)

- The first-phase speed progression is deliberately gentler now that CHROMA RUSH includes double jumps, Echo Spires, Gravity Shift, varied terrain and movement combos. **Only the speed formula in shared config changes.** The start remains **370**, with acceleration reduced **11.5 → 7 logical units/s²**, and zone bonus reduced **12 → 7 units per new zone**.
- At **120 seconds**, the continuous speed curve transitions to a smaller **4.5 units/s²** acceleration; it does not hard-cap or temporarily slow the runner. The zone cadence remains **12 seconds** and gives the same +7 increment before and after the taper. Existing jump/duck physics, obstacles, Director pacing, fairness warning thresholds, Flow, graphics and all controls are preserved.
- For wall-clock run time `t` and 1-based zone `z`, the speed formula is `370 + 7 × min(t, 120) + 4.5 × max(0, t − 120) + 7 × max(0, z − 1)`. Starting a practice run in a later zone uses the same absolute point on this curve as getting there naturally.
- Reference values (computed from the shipped config):

| Elapsed | Zone | Old speed | New speed | Reduction |
|---|---:|---:|---:|---:|
| 0 sec | 1 | 370 | 370 | 0% |
| 30 sec | 3 | 739 | 594 | 20% |
| 60 sec | 6 | 1,120 | 825 | 26% |
| 90 sec | 8 | 1,489 | 1,049 | 30% |
| 120 sec | 11 | 1,870 | 1,280 | 32% |
| 180 sec | 16 | 2,620 | 1,585 | 40% |

- [Speed Curve 3.0 regression tests](tests/speed-curve-3.0.test.cjs) verify exact checkpoints, late-phase continuity, monotonic zone transitions, no hard cap, practice alignment and unchanged controls/physics. The existing [High-Speed Fairness Audit](tests/high-speed-fairness-audit-1.0.test.cjs) is re-baselined to the new 180-second speed and separately tests later-zone high-speed practice.
- **Manual playtest focus:** zone 1–3 onboarding, zone 4–8 difficulty/response rhythm, zone 11+ longer runs. Change Director complexity only after comparing gameplay feedback; this is deliberately a one-variable balance pass. Older recorded high-speed audit results refer to the **previous** curve.

## Precision & Combo System 1.0 (2026-11-07)

- **Existing precision is preserved and clarified:** normal JUMP and Echo Spire still qualify for a precision clear at 0–18 logical units above their obstacle; DUCK retains its real entry-duration window (traversal + .02–.16 seconds). A tighter subset is logged as **master** without changing the existing regular Precision reward. Ordinary gap clears do not invent precision timing.
- **Real movement chains, no extra controls:** `src/gameplay/precision-combo.js` recognizes *successfully cleared* alternating gestures (Jump → Duck, Duck → Echo Spire, Jump → Duck → Echo, etc.). Gaps use the Jump gesture; Echo Gaps use Echo. Repeating the same gesture, waiting more than 5.8 game-time seconds, damage, a missed gap or a Gravity Shift breaks the chain. Pauses do not consume the window. The maximum chain is **4** moves, then the next clear starts a fresh chain.
- **Only Flow owns rewards:** existing obstacle clears and precision points are still awarded exactly once. Combo milestones at 2 / 3 / 4 moves add modest **20 / 35 / 55 base points** multiplied by the *current Flow multiplier*, with **0 / 1 / 1 Flow** bonus respectively. Combo events do not grant free streak, Perfect Zone clear or additional health; there is no separate combo multiplier.
- **Minimal feedback:** for ~0.8–1.25 seconds the existing Flow streak caption reads `CHAIN ×2/3/4`. Chains of 3+ receive a short angular, layered light-trail cue and small procedural synth phrase; higher chains get very brief optional vibration. No new words on obstacles, floating text panels, rings or full-screen effects. Reduced-motion/Low Graphics retain the same scoring and movement, with fewer visual strokes.
- **Passive Director insight:** the Movement-Aware Director records actual completed chains and best chain in its diagnostic insight. It **does not force harder hazard patterns** or bypass high-speed fairness restrictions just because a combo exists.
- **Round export:** the local audit now records precision/master clear counts, chain sequences, real bonus points/Flow and maximum combo length (plus totals for each length). Nothing is sent to a server. Existing jump/duck/echo physics and user-selected settings are unchanged.
- [Combo tests](tests/precision-combo-system-1.0.test.cjs) and the full browser smoke harness cover no-repeat farming, capped rewards, genuine chain breaks, Flow tier integration, Director telemetry, actual UI feedback, Low Graphics and no extra button/Dash.

## Jump Obstacle Visual Identity 1.0 (2026-11-07)

- **Low Neon Barrier:** the normal JUMP obstacle now reads as a physical grounded barrier with a full-footprint beveled shell, continuous top rail, recessed panel, vertical chassis supports and a broad luminous base. It uses the existing palette-linked colors and the same lightweight canvas drawing language as Duck Gates, without copying their tall silhouette.
- **No in-world direction labels:** the old floating `↑ JUMP` / `↓ DUCK` text and arrows are removed from regular obstacles. The Echo Spire also drops the floating `2× JUMP` instruction and replaces its arrow-shaped inner chevrons with two integrated energy chambers. The tall DUCK energy field and crawl clearance are unchanged.
- **All collision footprints are unchanged:** normal JUMP widths 43–58 and heights 53–66, the DUCK gate's 28 logical-unit slot, and the Echo Spire height is revised in 1.1 (see above). The normal barrier's solid artwork stays entirely within its original hitbox; no invisible solid decorative wings or altered timing are introduced.
- Gameplay buttons, Gravity Shift world reflection, scoring, procedural Director, high-speed fairness budgets and offscreen reaction-time HUD remain untouched. **The high-speed offscreen cue is a separate accessibility/fairness system, not text floating on an obstacle.**
- [Regression tests](tests/jump-obstacle-visual-identity-1.0.test.cjs) render all three live obstacle branches under normal and Low graphics settings and assert text removal, integrated shape, geometric footprint integrity and ceiling symmetry. Manual visual review on mobile is still recommended.

## High-Speed Readability & Fairness Audit 1.0 (2026-11-07)

- **Measured reaction windows, not just pixels.** Fast jump, duck and Echo Spire hazards are spawned farther ahead only when necessary to preserve their action-specific timing budgets (0.57s / 0.56s / 1.00s); gap and Echo Gap visual cue budgets are 0.66s / 1.10s. Running speed, hitboxes, gameplay RNG, buttons, and physics do not change.
- **Restrained offscreen preview.** If a *real* incoming hazard or generated gap would otherwise become visible too late, a small upright warning at the right edge identifies the required action and seconds remaining. Normal-speed play does not get unnecessary cues; ceiling mirroring and Low Graphics are supported.
- **Actual arrival-time safety.** The Director checks both spawn-time spacing and when each hazard physically reaches the player. A delayed Echo→Duck or Echo→Jump transition cannot silently become tighter merely because the two actions have different offscreen lookahead.
- **Local per-run observability.** Exported rounds include per-spawn visible and total reaction time, required timing budget, early cue usage, low-budget warnings, longest frame, frame stalls and fixed-step dropped simulation time. No identifiers or tracking.
- **24 deterministic 180-second audits**, spanning 3 mobile/desktop widths, 4 seeds and 2 scripted health/recovery behaviors: **2,206 obstacles**, 974 necessary advance cues, **zero under-budget spawns, late gap cues or unsafe arrival intervals**. These are scheduling/geometry checks, not proof of human playability or real-phone FPS.
- [**Full audit report & recommended mobile acceptance tests**](docs/high-speed-readability-fairness-audit-1.0.md) · [Audit script](scripts/high-speed-fairness-audit.cjs) · [Regression tests](tests/high-speed-fairness-audit-1.0.test.cjs).

## Movement-Aware Director 1.0 (2026-11-07)

- Adds a **pure, testable movement intelligence layer** (`src/director/movement-awareness.js`) alongside Adaptive Rush Director 2.0 and Unified Terrain Director 3.0. It models regular jumps, duck, Echo Jump, ordinary gaps and long Echo Gaps using **real control-commitment windows**, skill demand and recovery costs, without changing the input, physics, score or auto-run speed.
- Director composes short, **physically playable action phrases** (jump → duck, duck → jump, solo Echo, and later Echo combinations). Motif costs and dynamic effort budgets screen out overly hard strings after damage, recent heavy moves or low confidence; phase transitions still create genuine no-hazard breathing room.
- **Echo Spire difficulty is intentionally moderated.** The initial Spire is an unlabelled, isolated floor lesson from zone 2 during a healthy PEAK. More complex Echo phrases are only eligible after **at least one actual Echo Spire clear**. Echo spawns are separated by at least 7.2 seconds and refused when the visible approach becomes too short at extreme speed, avoiding impossible late prompts and stalled spawn queues.
- **Gap and obstacle Directors cooperate:** full aerial-recovery distance prevents an Echo Spire from immediately following a chasm or an Echo Gap from piling onto a recent Spire. Successful / missed gaps, real collision damage, genuine obstacle clears and gravity shifts feed measured movement pressure and future recovery windows. A terrain veto postpones unsafe obstacles rather than faking successful clears.
- Terrain generation and player physics remain canonical, so ceiling running mirrors the same collision/reaction windows. No Dash, extra buttons, physics alterations, scripted fixed levels or monetization.
- Run diagnostics include movement pressure at each recorded event and a Director insight snapshot with demand/cooldown state. New [movement-aware tests](tests/movement-aware-director-1.0.test.cjs) cover real jump durations, phrase effort, cooldowns, low-HP fallback, gap coordination, gravity recovery and high-speed lead-time safety.
- This is **first-pass calibration**. The goals are fewer unfair strings and more deliberate rhythm, not making all obstacles easy. Review player runs for how often hard Echo phrases actually occur before tuning their weights further.

## Echo Spire 1.0 — True Double-Jump Hazards (2026-11-07)

- Adds **Echo Spire**, a grounded, tall neon obstacle with a distinctive tall two-chamber body with no floating instruction label, readable on Low graphics. It is not a stretched duck gate and cannot be crouched under.
- Original 1.0 height: **204–216 logical pixels**, replaced by **190–200** in 1.1. The regular first-jump apex is about **177 pixels**, making a single jump physically insufficient; a reasonably timed Echo Jump clears comfortably. The hitbox ends at the visible top and matches the drawn body exactly.
- Originally started at **zone 4**, moved to **zone 5** in 1.1 and then **zone 2 on the floor** in 1.2, after the zone 2 Echo Jump onboarding. The Adaptive Director places a **single isolated introductory Spire** at the first healthy, confident PEAK opportunity and defers it if the ground is unsafe. After introduction it may appear in BUILD/PEAK phrases, with later zone 6+/8+ optional multi-action motifs.
- Director spacing accounts for Echo flight and landing recovery. No Spires during low HP, high friction, early tutorial, FADE/RELAX or the unsafe portion of Gravity Shift. The existing terrain safety veto ensures no gaps or unsuitable slopes near the takeoff/landing.
- Normal jumps, duck gates, two-button controls, normal and Echo Gaps, physics, speed progression, score rules and original atmosphere remain intact. All obstacle coordinates are inverted with the course during ceiling running.
- A genuine Echo Spire clear receives a compact angular/particle flourish and an audit event. New regression tests simulate normal-vs-double-jump collision across speeds and verify Director sequencing, low-HP exclusions and the real arcade loop on both surfaces.

## Echo-proof Duck Gates 1.0 (2026-11-07)

- Echo Jump revealed a bypass in the original suspended **DUCK** obstacles: the player could jump over their short upper edge instead of ducking.
- DUCK hazards are now **continuous overhead energy gates** extending beyond the sky. Their collision occupies the same full-height region as their visible low-opacity field, so there are **no invisible blockers**. The previous saturated lower hanging module remains readable, with delicate vertical rails/crossbars continuing into the upper sky.
- The **28-unit duck clearance** below each gate remains unchanged. Standard standing movement and jumping collide, while properly timed duck still passes. Floor **JUMP** obstacles, procedural spacing, Echo Jump physics, HP/Flow scoring, and controls are untouched.
- All geometry stays in the canonical game world, so Gravity Shift mirrors the entire gate to the opposite side during ceiling running.
- [Regression tests](tests/duck-gates-echo-proof-1.0.test.cjs) cover collision at the Echo Jump apex, true duck passage, existing jump obstacles, floor/ceiling reflection, and visible gate/collider synchronization.

## Movement Evolution 1.0 — Echo Jump (2026-11-07)

- **No Dash, no third or fourth button.** The existing Jump and Duck inputs remain unchanged. Starting at zone 2, tapping Jump a second time while airborne (after a brief ~95ms protection against accidental double taps) performs one **Echo Jump** per flight. It uses a weaker second-jump target (−650), plus a bounded early-tap boost so the second press always adds real lift without exceeding the ordinary takeoff speed. The ability resets only after valid landing / fresh grounded takeoff.
- Normal jump, coyote time, 110ms landing buffer, recovery safety, gravity transitions and collision hitboxes are retained. Echo Jump does not alter horizontal speed, score or the Director's obstacle timing.
- The secondary beat has a distinct fast squash-then-stretch, layered angular light cuts, a small glow trail, procedural two-part sound and short vibration. Effects are drawn in the canonical player world, so ceiling mode mirrors them correctly. Reduced-motion and Low Graphics remain respected.
- A brief in-run cue teaches **TAP JUMP AGAIN IN THE AIR** at zone 2. A two-pronged accent follows the cube when the airborne second jump is available. Practice runs starting in later zones have it immediately.
- **Echo Gaps** are rare, opt-in longer chasms from zone 5, now unlocked only after a real Echo Spire clear, labelled **2× JUMP**. The Unified Terrain Director permits these only in healthy, confident PEAK segments with enough time to land. Regular gaps keep their previous sizes and generation rates.
- Run audit records Echo Jump uses and whether each gap was an Echo challenge. The new [movement tests](tests/movement-evolution-1.0.test.cjs) cover controller state, physical flight reachability, Director policy, marker generation and mobile input.
- Initial tuning proposal: playtest the second impulse and long-gap frequency; the current values are not yet declared final.

## Ceiling Player Animation Sync 1.0 (2026-11-07)

- Fixed a Canvas 2D save/restore mismatch in `ChromaStateVisuals.drawBehindPlayer`: when Chroma Flow was active, the player wake restored a state that it did not own. In ceiling mode, this prematurely removed the world mirror during `drawPlayer`, leaving the post-player neon brackets, contact glow, particle dust and arcade accents at floor orientation.
- The Chroma wake now **saves its own state before changing styles** and restores exactly that state; the gameplay camera transform stays active throughout the player and FX passes, then resets before the upright gravity indicator.
- Post-player brackets use the **rendered, animated silhouette** (`rw/rh`) rather than the rigid collision hitbox (`b.w/b.h`), so launch stretch, duck squash and landing deformation stay visually synchronized on both surfaces.
- No changes to hitboxes, physics, Director, speed, terrain generation, original background, Flow progression or input. Low graphics and reduced-motion settings remain supported.
- Added Canvas state-balance regression tests and an actual arcade-frame test for Chroma-active ceiling rendering, with a return-to-floor check.

## Gravity Shift / Ceiling Run 1.0 (2026-11-07)

- From **zone 3**, and then on every second new zone (5, 7, 9…), the runner alternates between the floor and the ceiling. In ceiling mode the entire course — terrain, actual gaps, low and overhead obstacles, trails and player — is mirrored vertically. The camera, two controls, original atmospheric background and DOM HUD stay upright.
- **JUMP** sends the runner away from the active surface: visibly downward while upside down; **DUCK** compresses the character toward the ceiling. The underlying collision and jump model remains canonical, so existing coyote time, jump buffering, gaps, scoring and procedural patterns still work.
- A **0.9-second GRAVITY SHIFT warning** precedes the flip. If the physical runway is not clear (obstacles, gaps or an airborne player), the warning waits rather than flipping into danger. Incoming hazards are paused during preparation and the brief transition.
- The **0.58-second mirrored squeeze-and-expand** includes a thin electric seam and two newly synthesized sound cues. Brief post-flip invulnerability prevents unfair hits, with no fake clears. Low graphics retains the warning and persistent **CEILING RUN** indicator.
- *Reduced motion* makes the mode switch instant after a safe warning; pause/restart/menu reset transitions cleanly. The game does **not** slow down during the shift.
- [New safety and geometry tests](tests/gravity-shift-1.0.test.cjs) validate the sequence and the transform. This is an initial gameplay pass; its visual impact and frequency should be playtested on mobile before extending it.

## Original Background Restored 1.0 (2026-11-07)

- Restored **the exact Full Background Continuity 1.0 renderer** from the commit preceding Background Depth & Parallax 2.0. The user preferred its calmer original neon haze, faint structures, horizon and star streaks over the later buildings and mountain layers.
- Background Depth & Parallax 2.0 and 2.1 are **historical, not currently active**. Their docs remain for future design reference.
- **Arcade Animation Language 2.0, Speed Trails 2.0, Chroma State 2.0, Spectral Wave, Flow, terrain, Director, and all controls stay in place.**
- The original background still covers every pixel behind gaps and slopes. Spectral Wave continues its old/new color transition, while the scenery itself uses its original time-based motion.
- New regression and screenshot checks guard against accidentally reintroducing buildings or mountain profiles.

## Arcade Animation Language 2.0 (2026-11-07)

- A shared **side-on neon visual grammar** for seven actual game moments: jump launch, landing, duck entry, duck release, registered near-miss precision clearance, first speed milestones, and Perfect Zone rewards.
- Short straight-line accents coordinate with existing Speed Trails, Spectral Wave and Chroma State instead of adding circular rings or a screen-wide flash.
- Precision passes get a distinctive detached neon cross-cut; at speed multipliers 1.5×, 2×, 3×, 4×, 6× and 8×, a single short rail burst marks the milestone.
- Reduced pre-existing random launch/land/duck particles, bounded all new cues in the existing 24-entry effect pool, added a cooldown/priority mechanism, and scaled layers to the current mobile graphics preset.
- No changes to collision, Jump/Duck controls, difficulty, score, Flow, Director or audio. Reduced-motion disables the new moving cues.
- [Detailed animation plan and test coverage](docs/arcade-animation-language-2.0.md).

## Background Depth & Parallax 2.1 – Layered Landscape Pass (archived, not active)

- **Replaces the high, separate city/building objects** from 2.0 with **three continuous, gently rolling mountain/ridge silhouettes**; no freestanding towers, hard-edged windows or faux obstacles.
- Keeps the distant starfield and independent far/middle/near parallax based on accumulated world travel. Low-contrast haze between ridges creates depth without busy details.
- Eight palette zones now have distinct *landscape geometry*: CYAN soft hills, VIOLET soft peaked ridges, MAGENTA dunes, LIME open valleys, AMBER rounded mesas, ELECTRIC folds, REDLINE dramatic mountain ridges and WHITEOUT frosted peaks.
- **Spectral Wave** still reveals both the new zone colors and its landforms using the same clipped color front; full-height background remains visible through real gaps and slopes.
- Geometry, crest strokes, stars and glow adapt to High/Balanced/Performance settings and reduced motion. No changes to Director, obstacle shapes, collision, jump/duck, Flow or speed.
- [Technical design and tests](docs/background-depth-parallax-2.1.md).

## Background Depth & Parallax 2.0 (archived, not active)

- Rebuilt the pure Canvas 2D world with **four spatial parallax planes** (distant stars, far towers, intermediate architecture, and nearer structures) plus subtle fast-moving horizon streaks.
- Eight neon palette zones now own **distinct silhouettes** — for example VIOLET spires, LIME terraces, AMBER foundries and ELECTRIC arched conduits.
- The existing **Spectral Wave** reveals the incoming architecture as well as the palette, with old/new motifs on the correct side of the passing color front.
- All scrolling derives from travelled world distance; atmosphere continues behind gap terrain with no hard floor seam, and hazards remain above every background detail.
- All geometry is generated in code. High/Balanced/Performance profiles reduce distant and near structure costs; reduced-motion keeps the scenery static.
- No changes to scoring, AI Director, obstacle patterns, collision, player speed, controls or Flow.
- [Technical design and testing](docs/background-depth-parallax-2.0.md).

## Speed Trails 2.0 (2026-11-07)

- Replaced the old fixed-row ghost copies with **actual timed afterimages** from earlier frames. During jump or duck, the echoes retain the corresponding earlier height and silhouette.
- **Longer light rails at higher speed**, plus separate small luminous fragments that travel backward and fade. High-speed momentum is visible even outside Chroma State.
- Unified the trail language with Chroma State 2.0 to avoid two overlapping sets of wake filaments. Chroma adds restrained visual intensity without changing its Flow reward.
- Quality budgets are capped for High/Balanced/Performance, and reduced-motion suppresses animated trails. No score, speed, collision, Director or input changes.
- [Implementation notes and tests](docs/speed-trails-2.0.md).

## Flow Multiplier Glow 1.0 (2026-11-07)

- **1.25×** now starts the reward ladder with a slightly larger cyan number and slow, soft breathing neon glow.
- **1.5×** is more prominent, lavender and visibly pulsing.
- **2×** is a large pink-violet neon reward with the strongest, fastest glow pulse.
- The label uses the actual **Flow tier**, including Chroma State's existing 90% entry / 87% exit latch. No scoring, difficulty or speed changes.
- Only the small HUD text pulses: no whole-screen flashes, rings, gameplay obstruction or layout-jolting scaling. Reduced-motion keeps static tier colors and glow.
- [Implementation notes](docs/flow-multiplier-glow-1.0.md).

## Chroma State 2.0 (2026-11-07)

- At 90% Flow, Chroma State now arrives as a multilayer neon transformation: a one-time activation accent, streaked energy wake, luminous straight-edge corner accents and atmospheric world light.
- A distinct ascending synth cue and understated melody shimmer reinforce the upgraded 2× state. The Flow/score economy, 90%-enter/87%-exit hysteresis, HP and all gameplay geometry are unchanged.
- Animations use the existing High/Balanced/Performance graphics settings and honor reduced-motion preferences. No extra buttons or circular ring effects.
- [Technical notes](docs/chroma-state-2.0.md).

## Zone Transition Spectral Wave 1.0 (2026-11-07)

- Entering a new zone launches a **0.92-second right-to-left neon color front**. The old palette remains on the left while the new one rolls in from the right.
- The parallax backdrop and terrain are recolored in distinct Canvas 2D clipped layers. Obstacles and player color respond to their actual positions within the front rather than switching globally.
- The moving boundary carries a soft prismatic glow, a few horizontal light streaks, and a ground-aligned accent — no large oval rings, flashes, or obstacle-obscuring overlays.
- The zone title crests near the moment the wave crosses the player, accompanied by a short linear pulse and restrained sparkle. Perfect Zone audio remains the priority.
- No gameplay effects: jump/duck controls, speed, zones, Director, obstacle collision, Flow, and score do not change. Effects scale with graphics quality; reduced-motion immediately recolors the scene.
- The published build is version-marked so the main-menu cache freshness check detects updates.
- [Implementation and test notes](docs/zone-transition-spectral-wave-1.0.md).

## Mobile Arcade Polish 1.0 (2026-11-06)

- **Landscape touch controls** retain comfortable 80×80 px hit targets with a smaller visual footprint, clearer pressed states and independent pointer-ID handling for two-thumb play.
- **HUD hierarchy** prioritizes shield, Flow, zone and score without colliding with top-right actions, including short landscape phones.
- **Sound settings** now distinguish Music, Sound Effects, Effects Volume and Vibration. The existing quick sound button still mutes all audio, while separate choices persist locally.
- **Optional fullscreen** is available from the menu where the browser supports it; fallback is safe and explains browser limitations.
- **Polished transitions** add a short nonblocking GO cue and subtle pause/results panel easing; reduced-motion preference is respected.
- **No game rule changes:** speed, jump/duck geometry, damage, Chroma Flow, Director, terrain and the selected graphics quality are unchanged.
- [Technical details and test plan](docs/mobile-arcade-polish-1.0.md).

## Duck Feel & Effect Language 1.0 (2026-11-06)

- Duck has a fast downward compression, a brief low speed trail, and an elastic upright release; the 0.55 s tap pulse, 0.12 s recovery, collision boxes, jump physics and input semantics remain untouched.
- Added `src/render/effect-language.js` for bounded, reusable **horizontal ground pulses** and **detached rectangular corner echoes**. The old screen-plane oval rings are removed from jumps, landings, gaps, hits and zone celebrations.
- The Chroma State halo and contact shadow now use straight neon brackets / a ground strip instead of ellipses. Tiny round particles remain intentionally as sparks, not rings.
- Effects are capped to 24 concurrent instances and respect High / Balanced / Performance graphics settings. Cosmetic random draws stay isolated from gameplay generation.
- Node regression and Chromium screenshots cover the new animation states, VFX shape and gameplay integrity; no new levels, obstacles or control buttons.

## Flow Balance 1.1 (2026-11-06)

- Rebalanced from two real arcade-run exports (zone 8 and zone 10): Chroma State no longer spends most of the session saturated at 100%.
- Normal clears grant **5 Flow** instead of 6, precision clears **8** instead of 10, and a Perfect Zone grants **5 Flow** instead of 8. Existing Perfect Zone **+10 shield**, points, Flow tiers, multipliers and all score mechanics are retained.
- Smooth, high-tier-only resistance starts at 65 Flow and scales to **4.5 Flow per second at 100**. There is no extra decay below 65; the old inactivity decay remains unchanged. No sudden wipe or hard timer.
- Challenge generation, score multipliers, physics, Director, accessibility options and graphics quality remain unchanged. The high-tier visual effects naturally respond to the new Flow meter without adding expensive rendering.
- Local-only event replay checks the original two logs against the new rules. Historical scores are not rewritten; new scores follow the revised Flow economy.
- Technical details: [docs/flow-balance-1.1.md](docs/flow-balance-1.1.md).

## Unified Terrain Director 3.0 (2026-11-06)

- **One continuous procedural run, never fixed levels:** `src/director/unified-terrain-director.js` coordinates terrain choices with Adaptive Rush Director 2.0 while retaining the existing two controls, speed, Flow and HP rules.
- **Phase-aware terrain:** BUILD favors broad rolling slopes, PEAK may introduce occasional gaps, FADE limits new hazards, and RELAX is predominantly stable, flat ground. Zone restrictions still apply (slopes from zone 2, gaps from zone 3).
- **Arrival-aware planning:** the coordinator estimates which Director phase will be active when each upcoming terrain feature reaches the player; this prevents scheduling a new gap merely because PEAK is active while the generated section is still far off-screen.
- **Recovery and safety:** an unsafe gap/obstacle combination is deferred until the terrain is clear. Missed gaps temporarily reduce future gap pressure, especially at low shield or high stress; successful gaps keep forward momentum.
- **Separate responsibilities:** `terrain-system.js` remains responsible for geometrically valid slopes/gaps, `adaptive-director.js` still selects authored jump/duck motifs and pacing, and the unified coordinator determines the shared timing policy. No extra game actions or levels.
- **Diagnostics:** exported round logs now label generated slopes and gaps with their intended Director phase. New seeded 3-minute simulations test variety, gap spacing, deferral, recovery, and phase behavior.
- **Performance:** this change deliberately does not increase visual effects or perform per-frame full-course pathfinding. Existing mobile rendering performance remains an independent optimization task; subjective feel is not claimed to be validated on slow devices.

## Game Experience & Visual Audit 1.0 (2026-11-06)

- **Actual Chromium visual suite** at four landscape resolutions: flat/hilly/gap terrain, menu and result screens, full-height background pixel checks, and JavaScript error monitoring. GitHub Actions now uploads rendered screenshots after each change.
- **Fixed** a shield-damage inconsistency: a gap miss during temporary invulnerability no longer charges another 25 HP (but still breaks Flow and records a failed gap).
- **Fixed** clipping of the start menu on very short landscape viewports without reducing gameplay button hit areas.
- **Run diagnostics:** finished runs now offer an optional **EXPORT RUN LOG** JSON download (zones, hits, gaps, Flow/Chroma State, Director phases/stress and key events). Logs are local-only, bounded and contain no personal data.
- **Full report:** [docs/game-experience-visual-audit-1.0.md](docs/game-experience-visual-audit-1.0.md), including tested coverage, limitations and next improvements.
- Same gameplay rules, Director 2.0, terrain, acceleration, music and scoring. The only rule correction is consistent gap invulnerability.

## Jump Feel & Forgiveness 1.0 (new)

- **Coyote time:** A new press up to 80 ms after leaving a gap edge can launch the original jump. At high speed this is additionally capped to 48 world units beyond the edge; no double jump is introduced.
- **Jump buffer:** A jump pressed up to 110 ms before landing will trigger exactly once on landing. Queued input expires naturally. Ducking and spectral gap-recovery cannot queue jumps. Both mobile and keyboard input use these shared rules.
- **Visual motion:** A dedicated animation module adds a fast takeoff squash, upward stretch, small apex settling, directional landing particles, subtle impact glow, a brief 230 ms landing squash/rebound and a restrained camera reaction after a hard landing. All animations use the existing neon colors.
- **Gameplay integrity:** Launch velocity, gravity, obstacle/gap geometry, auto-run speed, damage and two-button controls are unchanged. Rendering deformation never modifies collision shapes.
- **Gap integrity:** A landing on the far platform counts as a successful gap clear before a buffered hop immediately launches again, preventing missing Flow/score when chained hops occur.
- **Modular architecture:** `src/gameplay/jump-controller.js` owns timing rules and `src/render/player-motion.js` owns sprite deformation; both have pure Node tests plus browser-game VM integration tests.
- **Not added:** No variable-height jumps, double jump, new level selection or major gravity/apex changes. Those remain possible separate experiments.

## Dynamic Terrain & Gap Jumps 1.0 (new)

- The **same endless randomly generated course** now includes rolling slopes from zone 2 and occasional jumpable chasms from zone 3. No separate levels, tracks, buttons or progression reset.
- `src/terrain/terrain-system.js` owns a world-space series of flats, smoothed hills and true groundless gaps. It is dependency-free and has a deterministic RNG injection for tests.
- The existing Director remains responsible for authored jump/duck patterns and pacing, but **will defer an obstacle** when terrain says its takeoff/landing vicinity is unsafe. In-flight patterns are kept and retried, not silently counted as spawned.
- Landing / running heights and box positions now sample the same ground geometry. Vertical physics prevent landing from *underneath* a platform.
- Gap width is bounded relative to running speed and the existing jump duration. A fall costs 25 shield, interrupts Flow and prevents Perfect Zone, with a single brief recovery until the far ledge, avoiding infinite fall loops.
- Clearing a gap without falling registers an ordinary clear for Flow, streak, Director confidence and points; a missed gap never counts as a successful obstacle.
- Terrain is painted directly as a live neon surface with real dark gaps, illuminated edges and a subtle jump cue. The grid adapts to changing surface elevation.
- Existing audio, Chroma Flow, Perfect Zones, practice, milestones, records and two-button controls remain present.
- **Balancing target:** high-energy 2–3 minute arcade rounds, not an unlimited reaction-time redesign. Mobile playtesting is still required.

## Arcade Progression 1.0 (new)

- **Personal records**: persistent best score, highest reached zone and longest damage-free obstacle streak. A compact record panel lives on the start menu, with best streak also appearing on results.
- **Six personal milestones**: Zone 03 (IGNITION), Zone 05 (NEON PILOT), 10-hit-free clear streak (TEN STRONG), first Perfect Zone (FLAWLESS), Zone 08 (CHROMA RUNNER), and Zone 12 (REDLINE). Tap the Milestones counter to open the full gallery.
- **Practice mode**: after reaching Zone 02 in a normal arcade run, choose any zone reached in **standard** play. Practice begins at that zone's speed and palette, with fresh Flow, full HP and the same Director/audio mechanics.
- **Ranked integrity**: practice is clearly marked UNRANKED in the HUD and results. It never writes best score, best zone, streak, Perfect Zone totals or milestones; it never unlocks further practice zones. Standard runs always start at Zone 01. Neither practice nor milestones grant gameplay powers.
- **Record migration**: existing `chromaRushBestFlow1` score remains the starting best score. Historical zone and streak records were not tracked by old builds, so they start fresh rather than being guessed. New progress is saved under `chromaRushArcadeV1`.
- **Safe persistence**: missing/corrupt/blocked local storage falls back to a playable game. Record updates happen on new ranked zone/streak achievements and on run completion. Personal records stay on the same browser/device without an account.
- **Modular architecture**: `src/progression/arcade-progress.js` owns all durable record, unlock and milestone rules; `src/ui/arcade-ui.js` renders progress without implementing the rules. No additions to gameplay controls or dependencies.
- **Design target**: the same fast, satisfying 2–3 minute arcade run. Speed Fairness & Readability remains a separately deferred task.

## Reactive Audio 1.1 — Mobile audibility

- The BUILD phase plays an original midrange melody and prominent percussion, not mostly sub-bass.
- A louder but bounded music bus makes the soundtrack more audible on phone speakers.
- Suspended/interrupted mobile Web Audio can be unlocked from a user gesture, with a visual hint when audio is blocked.

## Reactive Audio System 1.0

- **Original procedural synth score** in `src/audio/reactive-audio.js`: electronic kick, hi-hat pulses, synth bass, ambient harmonic pads and a high-register arpeggio. No third-party tracks, sound files, assets, downloads or libraries.
- **Reactive intensity:** BUILD keeps a driving but restrained pulse; PEAK adds dense percussion and arpeggios; FADE softens; RELAX drops to a sparse heartbeat. All fades are smoothed. The **Director**, not audio, decides which phase the game is in.
- **Acceleration:** soundtrack grows from 110 BPM toward a capped 156 BPM as the scrolling speed increases. Music never affects the actual gameplay speed.
- **Flow:** High Flow gradually strengthens the soundtrack; Chroma State adds brighter, more intricate notes. Flow falls naturally after damage and the mix follows.
- **Zone identity:** new zones shift the harmony and sound a short transition; Perfect Zone has its own three-note celebration instead of layering both transitions at once.
- **Clear audio ownership:** music and gameplay sound effects use separate gain buses, with a shared master volume. Original jump, duck, land, score, hit, warning and Flow cues are retained as synthesized events with updated tones.
- **Mobile-friendly:** audio context is created and unlocked only after a deliberate Start/Resume/unmute gesture. Scheduling is tied to the existing animation loop, looks ahead only 90 ms, caps at three steps per frame and never starts an independent timer or background worker.
- **Control & safety:** one sound button mutes both music and effects, and the choice persists in local storage. Pausing, changing tabs, or ending a run fades music; unsupported Web Audio simply remains silent without breaking gameplay.
- **Unchanged gameplay:** Director 2.0, Chroma Flow, Perfect Zones, physics, HP and speed all retain their existing rules.

**Mobile listening test needed:** This first synth mix is intentionally conservative and must be evaluated for musicality, headroom and device speaker balance on actual phones. It is an original procedural prototype score, not a mastered soundtrack.

## Chroma Flow & Perfect Zones 1.0

- **Flow** rises when real, unhit obstacles are cleared (+6), and rises more for narrow jump clearances / well-timed duck presses (+10). It falls 35 on damage, and decays slowly (1.5/s) after a 3.5-second stretch without successful clears. Flow never fills passively during a Director break.
- **Chroma State** starts at 90 Flow. Thresholds: 30, 65, 90. Multipliers on *obstacle-clear* score: 1× / 1.25× / 1.5× / 2×. Survival-time score is deliberately unaffected so simply waiting does not generate boosted points.
- **Reactive visuals** ramp floor glow, track glow, player trail length, subtle motes and a player halo at CHROMA STATE. The colors still follow the existing zone palettes. Transitions are restrained to protect obstacle readability.
- **Perfect Zones** are counted only if at least **three actual obstacles were cleared** in the last 12-second zone, with zero collisions (including contacts absorbed by temporary invulnerability). They grant up to **10 shield** without exceeding the 100-HP cap, plus a 350-base-point bonus and a small Flow boost. An empty zone is never perfect. The toast identifies the *completed* zone.
- **Feedback** includes a Flow bar, current multiplier, clear streak, a Perfect Zone transition announcement and count on the results screen; brief synthetic audio cues play on Flow-tier increases and Perfect Zones. Full layered music remains planned for Step 4.
- **Best score for Flow scoring** uses a new `chromaRushBestFlow1` local-storage key. The old record remains stored intact under `chromaRushBest`, because the scoring rules changed.
- **Modular implementation:** `src/gameplay/flow.js` owns score/Flow/streak/zone rules; `src/core/config.js` owns all tunable constants; `src/ui/hud.js` only presents state. No extra player inputs, collectible economy or dependencies.

## What changed in 2.0?

- **Authored micro-patterns:** 12 short, recognizable combinations (solo, pairs, triplets, switchbacks) instead of independently selecting every hazard.
- **Adaptive pacing:** Directorn observes successful clears, near misses, recent damage and HP to adjust pattern tier, timing, intensity, and breathing space.
- **Microbreaks:** Build → Peak → Fade → Relax. Speed never decreases, but spawns stop briefly during recovery.
- **Safety spacing:** Every adjacent pair of spawned hazards (including across patterns) respects a time-based minimum gap for jump/duck recovery.
- **Avoid repetition:** Weighted selection prevents immediate repetition of the same pattern when there is an alternative.
- **Maintainable structure:** Shared physics/configuration, geometry, HUD and reusable Director pattern definitions are now separate from the main game loop.
- **Unchanged fundamentals:** Same neon palette, HP, scoring, jump physics, 0.55-second tap-to-duck, touch controls and progressively increasing speed.

## Folder structure

```text
chroma-rush/
  index.html                  Static entry point; controlled script order
  style.css                   Shared responsive game styling
  src/
    core/
      config.js               Speed, zones, jump/duck timings, color palettes
      geometry.js             Shared player and hazard hitboxes
    director/
      patterns.js             Authored micro-pattern catalog and selection
      adaptive-director.js    Director 2.0: pacing, stress, confidence, safe gaps
    gameplay/
      flow.js                 Pure Flow/Perfect Zone state and scoring rules
      game.js                 Input, game state, collision and world rendering
    audio/
      reactive-audio.js       Standalone Web Audio soundtrack + SFX orchestration
    progression/
      arcade-progress.js      Ranked records, practice unlocks and personal milestones
    ui/
      hud.js                  Reusable HUD and zone transition presentation
      arcade-ui.js            Record panels, practice selector and milestone gallery
  tests/
    director.test.cjs          Original Director pacing regression checks
    director-2.test.cjs        Pattern selection, adaptive state and high-speed safety
    game-smoke.test.cjs        Full game loop and mobile/keyboard duck regression
    flow.test.cjs              Flow thresholds, flawless zones, damage, healing and reset
    reactive-audio.test.cjs    Audio lifecycle, phase mix, tempo, mute and scheduling
    arcade-progress.test.cjs  Persistence migration, milestones, unlock safety and UI
```

Modules are plain browser JavaScript with CommonJS compatibility for Node tests, so the game needs **no build process, dependencies, CDN, account or analytics**. All script URLs carry a version query to limit stale browser caches on GitHub Pages.

## Architecture rules

1. Change core tuning in `src/core/config.js` (do not repeat constants throughout the code).
2. Keep game object geometry in `src/core/geometry.js`, not in rendering.
3. Add new patterns to `src/director/patterns.js`; only the Director chooses when to use them.
4. `adaptive-director.js` makes planning decisions and exposes `insight` for future diagnostics. It does not read DOM, draw or modify player inputs.
5. Shared HUD drawing goes into `src/ui/hud.js`. Do not mix UI styling with gameplay decisions.
6. All audio synthesis and playback lives in `src/audio/reactive-audio.js`. The gameplay engine only reports events and state. Input and world rendering still live in `game.js`: **next modularization targets** are `src/input/controls.js` and `src/render/world.js`.
7. Arcade records and practice unlocks live exclusively in `src/progression/arcade-progress.js`. The renderer never writes progression. Practice sessions must not call any `reached*`, `perfectZone`, or `finishRankedRun` method.
8. All new rules require targeted Node regression tests. Keep deterministic RNG injection in the Director.

## Run and test

Open `index.html` in a browser or serve the folder with any static HTTP server.

```sh
node --test chroma-rush/tests/*.cjs
```

**Controls:** left thumb = Jump, right thumb = Tap Duck. Desktop: Space/↑/W = Jump, S/↓ = Duck, Esc/P = Pause. Duck has a fixed 0.55-second duration and 0.12-second recovery; holding does not repeat the action.

## Intentional scope decisions

- The target is a thrilling **2–3 minute run**, not infinite perfect reaction time. A full Speed Fairness & Readability redesign is deferred until playtests suggest it is needed.
- The Director may ease the number and complexity of obstacles but **never lowers scrolling speed**.
- AI Director 2.0 is a transparent, deterministic-rule system; it is not a neural network or an unbeatable automated level designer. Gameplay still requires real-device testing and balancing.
- No new gameplay controls, collectibles or economy. The optional practice selector exists only on the menu and practice does not influence ranked results.

## Versions

- **1.0 (2026-11-06):** First single-page prototype.
- **1.1:** Tap-to-duck with a fixed duration and recovery.
- **2.0:** Adaptive motif generation, player-friction awareness, shared modules and Director regression tests.
- **Flow 1.0:** Reactive Flow tiers, skill-based score bonuses, Perfect Zones and shield recovery.

- **Audio 1.0 (2026-11-06):** Independent Web Audio engine, phase-responsive original layered music, Flow/zone sync, sound effects, pause/mute persistence, audio regression tests.

- **Arcade 1.0 (2026-11-06):** Personal best zone/streak/score, six milestones, milestone gallery and separately marked unranked practice from unlocked zones.

## Jump Feel tuning

Change timings in `src/core/config.js` under `JUMP_FEEL`. The Coyote Time distance cap matters at late-game speed: do not increase it without checking gap fairness. Jump buffering and squash/stretch are meant to improve responsiveness and visuals, not lower the underlying challenge. Run `node --test chroma-rush/tests/*.cjs` before changing physics or terrain interaction.
