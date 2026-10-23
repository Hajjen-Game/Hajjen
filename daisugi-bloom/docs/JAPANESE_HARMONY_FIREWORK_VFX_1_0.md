# Japanese Harmony — Harmony Firework VFX 1.0
**2026-10-23**

## Goal

Unify the previous separate family-specific evolution effects into one coherent, gold-forward Sakura-inspired celebration: a tiny Japanese festival firework rather than a large explosion. Common for all nine families.

## Follow-up polish: Firework VFX 1.1 (2026-10-23)

Player feedback: the ice-blue color clashed with the warmer Japanese festival palette, and the burst could be a little clearer.

- The ◆ is now **pearl-white** (CSS #fff9ee), with white inner glint, warm ivory and champagne-gold outer glow (#dcb36d), no cyan
- All symbols enlarge from 16px to 18px on standard fusion, with medium 20px and Masterpiece 22px
- The first outward pop grows from 1.15 to 1.30 base scale; the middle pose stays a touch brighter
- The golden contact ring and central pulse are slightly more defined; spread and fade increase modestly
- **Particle count stays exactly the same** to preserve mobile performance, object visibility, animation safeguards and gameplay

## Visual grammar

| Symbol | Shape | Color | Feeling |
|---|---|---|---|
| Blossom | ✿ | Pink | Sakura / soft elegance |
| Crystal | ◆ | Pearl-white / champagne gold | Warm contrast / clarity |
| Star | ✦ | Gold | Premium / highlight |

All symbols have a distinct text-shadow glow with pale core and colored outer bloom. The background pulse, expanding ring and visual anchor are always soft gold. Motion is a quick scale-up and small outward radial drift (with subtle rotation), then a float and transparency fade to zero.

| Tier | Trigger | Count on mobile | Typical duration |
|---|---|---:|---:|
| Small | Normal stage 2–3 fusion | 5 | 510–560 ms |
| Medium | Fusion reaching stage 4+, or 4+ match | 7 | 670–720 ms |
| Masterpiece | Real `hero` event | 9 | 850–900 ms |

Constrained mobile profiling halves particle complexity when appropriate. Maximum two effect origins per board event on mobile, three on desktop. No canvas or perpetual particle system. The new fireworks use the same pointer-free fixed score FX overlay, and nodes are removed on animation completion.

## Hook points and integration
- `playFusion` retains the physical gathering of pieces before revealing the upgraded item. It calls the existing `fusionBurst`, now shared across all families, and a single harmonized `evolveFamilyFx`.
- The actual `hero` event triggers the largest tier, in addition to its existing collectible halo and central MASTERPIECE praise.
- Fusion groups use their real `to` stage and group size to select tiers; not random rewards.
- Every family gets the same base effect, with pink flower and gold star motifs; the mini firework includes all three shapes.
- Nothing changes in rules.js, game objects, bag, RNG, score, rewards, Director 3.0, saves or overall game rhythm.

## Accessibility and performance
- Both the game's **Minska animationer** setting and the OS motion preference completely disable these decorative effects.
- Particles use only transform and opacity Web Animations API; their CSS glows remain static and localized.
- Particle counts and simultaneous center counts are capped; a reasonable global FX node budget prevents layering many bursts on a 390px phone.
- The effect is noninteractive, with aria-hidden decorative particles.
- Mobile integration smoke verifies a real fusion produces all 3 symbols and the shared Sakura evolution, and an actual generated Masterpiece produces the stronger tier.

## QA focus
Have a player try:
1. A basic 3-match: small gold pulse, three distinct symbols popping/fading.
2. A stage 4 evolution: richer, but short and not distracting.
3. A real Masterpiece: visible stronger burst, preserved central praise and Masterpiece Collection.
4. Four-family intro and five-family Journey; shapes and clarity should feel consistent.
