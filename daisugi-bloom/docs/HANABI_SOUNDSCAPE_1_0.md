# Hanabi Soundscape 1.0

## Player feedback
The firework animation looked beautiful but felt flat without sound beside Fusion, Harmony Pulse and score effects. Implement three **dedicated, quiet, premium festival cues** within the game's existing Web Audio system.

## Sound timing (real animation events)
1. **Hanabi load:** a low wooden tap and gentle gold chime at the moment the firework enters the crate, after the descending rocket finishes, before the crate glow.
2. **Hanabi charge:** a short rising pentatonic/sine swell when the bottom-up tile telegraph begins. It follows the visual marker count and has no six-beep spam.
3. **Hanabi launch:** exactly when the multicolored glitter starts: a delicate airy noise sweep, a rising musical pitch and four staggered high, bell-like sparkling notes for the ascending tail.

No solid explosion, excessive percussion or loud high-frequency crackle: elegant Japanese festival fireworks.

## Constraints
- No audio files, external assets or requests: Web Audio procedural noise and oscillators only; tiny noise buffer cached per AudioContext.
- Same AudioContext and existing master gain as Fusion, capped at eight concurrent voices, with cooldowns. Zero autoplay; unlock follows actual user touch. Audio preference, muted mode and pause/hidden conditions respected through the shared sound() function. stop() also releases Hanabi's noise voices.
- Sound is driven by visual events, **not** physics mutations; saved runs, targets, level difficulty and Director unchanged.
- Reduced-motion setting only controls visuals. Sound preference remains independent.
- Regression tests cover intake, charge, launch, rate limits, noise source cleanup, mute, and 390px browser sequencing.
