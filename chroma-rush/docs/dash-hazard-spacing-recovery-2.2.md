# Dash Hazard Spacing & Recovery 2.2

**CHROMA RUSH • 2026-11-09 • Corrective pass after iPhone playtests**

## Problem demonstrated by real runs

The previous Zigzag Energy Geometry 2.1 restored physically meaningful, genuinely long Twin Vault and Long Gate obstacles. A player then saw the two in very rapid succession and found the sequence too difficult.

Existing safeguards in `MovementAwareness.minimumGap` and the adaptive Director were mostly **times between obstacle spawns**, with a small fixed standard-width estimate. They were not the minimum time after the **whole long obstacle is finished**. Camera horizon can also give advanced types different offscreen lead times, so raw time between spawn calls is not a reliable way to measure separation in *world space*.

Example around world speed v=800:
- Air Twin Vault width is ~1,050 units, which occupies ~1.31 seconds of normal travel.
- If the Ground Gate spawns 1.8s later, that does **not** mean 1.8s of recovery after clearing the Air Vault; players may have only ~0.49s to land, reset Dash, comprehend the next shape and press Duck twice.
- When Dash acceleration is used, the available recovery time can be shorter still.
- 2.1 did not track the last obstacle's absolute `worldX+width` after pruning.

## Recovery rule

`src/gameplay/dash-hazards.js` now provides the pure deterministic helpers:

```js
recoveryAfter(previousType,nextType,{prevIntro,nextIntro})
placementAfter(lastPlaced,nextType,{worldX,speed,intro})
```

Every new obstacle is checked against `lastPlacedHazard.endWorld`, the actual absolute world-space coordinate of the **trailing physical edge**. The last successful placement survives old collider pruning but resets at the start of each new run or practice session. Rejected spawns do not update it; the Director can retry in a later safe corridor.

| Previous obstacle | Next obstacle | Recovery AFTER full end | Plus motion margin |
|---|---|---:|---:|
| Twin Vault or Long Gate (first lesson) | Other long advanced (first lesson) | **3.2s** | +0.15s |
| Any long advanced | Another long advanced, later repetitions | **2.6s** | +0.15s |
| First advanced lesson | Ordinary Jump/Duck | **2.1s** | +0.15s |
| Later advanced | Ordinary Jump/Duck | **1.7s** | +0.15s |
| Ordinary obstacle | First advanced lesson | **1.6s** | +0.15s |
| Ordinary obstacle | Advanced, later repetition | **1.25s** | +0.15s |
| Ordinary Jump/Duck | Ordinary Jump/Duck | Existing Director timing | unchanged |

Minimum space in world units:

```js
requiredWorldGap = speed * (recoverySeconds + 0.15)
actualWorldGap = nextObstacle.worldX - previousObstacle.endWorld
allow = actualWorldGap >= requiredWorldGap
```

These are world-distance/relative-time guarantees, not arbitrary invisible colliders. If a new obstacle is not yet safe, spawn returns false and the Director tries again later; no speed changes, no automatic clears, and no collision immunity.

The Director's **own** `minimumGap(previous,next,speed)` also now recognizes the *actual length* of the preceding advanced obstacle: for the Air bridge at early speeds, it adds ~1.36 seconds, and for the Ground gate it adds up to .68 seconds, before applying the recovery seconds. This reduces inappropriate requests; the gameplay-level world-edge rule is the final authority.

## Worked example at ~800 world speed

Twin Vault span ~1,050 units. A first Long Gate following it needs at least **800 × 3.35 = 2,680 world units of genuinely empty track AFTER the last Twin Vault box**. Thus the start of the next gate is separated by ~3,730 world units from the start of the first Vault, compared with the old ~1.6–1.8-second spawn-time interval, which could place two structures on top of one another in the player's decision window.

Between normal and first advanced hazards, there is also guaranteed setup room; after advanced hazards, simple obstacles cannot abruptly interrupt the landing. This applies equally to ceiling repeats; first introductions remain floor-only.

## Tests

- Unit checks for the actual world coordinates at several speeds, ensuring just-before-boundary rejects and exactly-at-boundary accepts.
- Both orders of Air/Ground advanced pairs; first introductions and repeats.
- Ordinary hazards before and after advanced shapes.
- History reset per new run, untouched on veto, surviving collider pruning.
- Integrated game smoke creates a true guided Air hazard, immediately attempts a guided Ground hazard, verifies the rejection, then advances until a legitimate later Ground placement is allowed.
- Full node, browser/mobile and build/Pages pipeline.

## Unchanged

Speed Curve 3.2; Adaptive Camera Horizon 1.1 (late 60%); Dash thrust and input timings; Echo/Jump/Duck physics; the restored glowing Zigzag Energy Bridge; entire HP/Flow/Shield economy; procedural patterns and hazard density outside the mandatory safety spaces.

**Test recommendation:** play through the first two long introductions without changing difficulty settings, then check if the empty lane feels like enough time to *land → recognize next hazard → prepare next action*. A healthy recovery gap should feel like an intentional small breathing point, not an abrupt stop; world speed never drops.
