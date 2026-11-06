# Mobile Arcade Polish 1.0 — design and verification

## Goal

Improve the native-feeling landscape mobile experience without changing the endless
procedural track, Director phases, jump/duck rules, damage, Flow, or performance profiles.

## Implementation

- **Compact HUD:** The HUD reserves a right column for the top actions, lowers the
  prominence of Director phase labels, and keeps score, shield and Flow readable.
- **Touch feedback:** Jump and Duck keep an active target of at least 80×80 CSS px,
  while the decorative glass panel is visually inset. Jump input is tracked by
  pointer ID, independent of Duck pointer capture, with pointercancel/lostpointercapture
  cleanup. Keyboard and existing fixed duck timers are unchanged.
- **Audio and haptics:** `src/ui/mobile-preferences.js` persists independent Music,
  Effects, Effects Volume (0–100), and Vibration preferences. The original top-right
  audio icon remains a *master mute* (all audio); individual preferences remain
  stored even if master audio is muted. Soundscape and effects use independent
  gain buses in `src/audio/reactive-audio.js`.
- **Fullscreen:** An explicit optional gesture invokes Fullscreen API where supported.
  When unavailable, the button explains the limitation. Fullscreen changes are
  offered only from the main menu/end-of-run screen, not during an active or
  paused run, to avoid moving the playfield under the runner mid-challenge.
  The existing viewport-fit/safe-area CSS still handles the fallback.
- **Transitions:** A short decorative GO caption appears at start without delaying
  gameplay or the first safe runway; Pause and Run Complete panels get restrained
  entrance easing with `prefers-reduced-motion` support.
- **Performance:** No new canvas particle systems. DOM effects are limited to
  transitions and pressed-state feedback. Performance/Auto/High quality settings
  remain independent of input/gameplay timing.

## Verification

- Node: all existing tests plus separate mobile-settings, audio-bus and input tests.
- Chromium: new `scripts/mobile-arcade-audit.py` checks menu/settings/controls/HUD,
  persists settings and verifies no clipping on 1440×600, 900×410, 740×360 and
  640×330. Existing terrain/background/visual audit and graphics-tier comparison
  remain required checks.
- Sound is still Web Audio and must be unlocked by a player interaction on mobile.
  Fullscreen availability varies by browser; iOS can restrict the Fullscreen API.
- Real-phone touch latency and audio quality still need human testing. Synthetic
  Chromium rendering results do not establish mobile FPS.
