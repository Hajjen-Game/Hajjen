# Dash Hazard Redesign 2.0 — Pure Geometry

**CHROMA RUSH** • 2026-11-09

## Player direction

During the prior Dash Energy Bridge iteration, compulsory energy ribbons and a vertical seal caused a player to take damage even after performing a valid jump/duck. The agreed direction is **Pure Geometry**: Dash should feel useful, fast and expressive, but it must **not** unlock or bypass a nonphysical checkpoint. Two ordinary Hop boxes may be cleared via regular/Double Jump; at sufficiently high velocity they may become physically clearable with a single Jump. New mechanics are introduced on the **floor**, never for the first time on the ceiling.

**Locked baselines:** Speed Curve 3.2, Adaptive Camera Horizon 1.1 (100% -> 60%), Director pacing and existing controls. No new button, forced Dash, speed change, HP change, damage change, hitbox immunity or invulnerability.

## 1. Twin Vault (dash-jump)

Two separate 50-unit low boxes, each **62 units** tall with identical standard Jump architecture. Their region between contains absolutely **no collision body and no energy ribbon**. The collision system checks the swept box overlap for **each** physical box independently to avoid mobile-frame skips.

```js
gap  = Math.round(Math.max(300, speed)*0.42/10)*10
span = 50 + gap + 50
```

**Jump physics** (fixed game constants): jump velocity -870, gravity 2140; Echo Jump one weaker subsequent impulse -650 with +150 upward boost. A 1ms simulation over Echo timing predicts ~0.65s single-Jump clearance above a 62px box and ~1.25s best Echo clearance. The formula includes the 36px airborne player when comparing a full two-box traversal. Air Dash is an additional 0.30s world-distance thrust but never required by geometry.

| Entry zone | Speed (approx) | Gap | Overall vault span | Span + player / speed |
| --- | ---: | ---: | ---: | ---: |
| 3 | 569 | 240 | 340 | 0.66s |
| 5 | 745 | 310 | 410 | 0.60s |
| 15 | 1,369 | 570 | 670 | 0.52s |
| 22 | 1,640 | 690 | 790 | 0.50s |
| 30 | 1,859 | 780 | 880 | 0.49s |
| 40 | 2,055 | 860 | 960 | 0.49s |

These are simplified horizontal *geometry budgets*, **not** a guarantee that a normal jump starting at any arbitrary position will work. Terrain, takeoff position, visual reaction and fixed step still matter. At fast speeds, a well-timed ordinary Jump is a legitimate solution by design.

## 2. Long Gate (dash-duck)

Long, visually connected overhead geometry with distinct structural vertical ribs; no floating checkpoint or decorative energy connection. The collider is the same overhead rectangle the renderer presents, ending 28 units above the current floor surface. Ordinary Duck remains the primary legal solution.

The physical **whole-body** passage duration must fit an ordinary Duck's 0.55s active window, leaving a margin for touch timing.

```js
width = max(74, min(300, 110 + speed*0.18, speed*0.46 - 66))
crossingSeconds = (width + 66) / speed
```

| Entry zone | Speed (approx) | Gate width | Passage duration |
| --- | ---: | ---: | ---: |
| 4 | 660 | 229 | 0.447s |
| 5 | 745 | 244 | 0.416s |
| 15 | 1,369 | 300 | 0.267s |
| 22 | 1,640 | 300 | 0.223s |
| 30 | 1,859 | 300 | 0.197s |

At the first introduction the player receives about **0.10s** of extra duck-active time versus a perfectly timed physical crossing, with a smaller but still positive safety margin in early slow cases. Optional Ground Dash extends the ongoing duck and adds forward thrust; it cannot confer immunity and it must never be needed just to pass the gate.

## 3. AI Director and reaction-time safety

- First Dash-influenced advanced types arrive as **isolated floor shapes** after the previously taught Echo mechanism. If gravity flips, low HP, stress or unsafe terrain blocks an introduction, it is postponed.
- Director and procedural terrain still provide flat approach/landing lanes; dash-variant cooldown and recovery requirements continue unchanged. No forced new hazard on ceiling.
- Viewport-specific spawn planning uses the same expanded world-right camera horizon and existing reaction-time minimums (1.25s air / 1.18s ground). These are **conservative visual-recognition budgets**, not requirements to execute Dash.
- No new input, forced end-of-run, increase in hazard density, stealth visual, energy seal or action lock.

## 4. New audit semantics (schema v3)

```json
{
  "dashHazards": {
    "spawned": {"air": 0, "ground": 0},
    "assisted": {"air": 0, "ground": 0},
    "cleared": {"air": 0, "ground": 0},
    "missed": {"air": 0, "ground": 0},
    "clearedByMethod": {
      "geometry": {"air": 0, "ground": 0},
      "dashAssisted": {"air": 0, "ground": 0}
    }
  }
}
```

`dash_hazard_assist` records a *local* Dash activation while approaching/traversing the physical shape, and does not itself award points or a clear. `dash_hazard_clear` records `method: "geometry"` for successful no-Dash completion or `"dash-assisted"` for assisted completion. The `obstacle_clear` event is the only ordinary Flow/score clear source, avoiding double rewards. Misses are actual collider hits, not failure to break a seal. The summary remains reliable even when the event history truncates.

## 5. Regression / playtest checklist

- **Solo ordinary Duck** from zone 4 clears the longer gate with no Dash and retains full HP.
- **Normal / Echo Jump** above both low boxes clears Twin Vault with no Dash, at low/mid/high speeds as the geometry permits.
- Air Dash and Ground Dash **optionally** help and produce distinct summary counters, but never exempt a player from a real collision.
- The center between low boxes must be empty even in a long 30FPS physics step; two real colliders remain discrete.
- Both shapes readable and consistently colored with Chroma Tide on the **floor and ceiling**; new types are never first seen on ceiling. The early speed/camera behavior remains identical.
- Visible warning lead-time checked at high speed and 60% zoom, no phantom energy paths/ribbons.
- Compare frame pacing on iPhone and older Android/Performance graphics mode. Reducing drawn ribbons should have no performance downside.
- Export 2–3 rounds and inspect `dashHazards.clearedByMethod` before further tuning. Human playtests determine whether "Pure Geometry" is more intuitive.

**Historical note:** Docs for Dash Energy Bridge 1.0 describe a previous, now removed compulsory seal and are intentionally preserved for chronology, not as the current gameplay specification.
