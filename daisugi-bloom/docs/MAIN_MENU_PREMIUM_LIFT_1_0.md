# Main Menu Premium Lift 1.0

Japanese Harmony · release 6.28.0 · 2026-10-24

## Objective
Give the initial menu the visual identity and material quality of Victory Accent 1.1, without crowding a narrow mobile screen or weakening level selection. The approved Premium Festival Night backgrounds remain the artistic scene. Dark teal remains the neutral base; Sakura rose, peach and warm gold provide deliberate points of emphasis.

## Implemented
- Header: a quieter premium glass plaque with Sakura/peach edge lights, warmer blossom brand tile, higher contrast typography and subtle separated controls, without increasing navigation complexity.
- Hero: still short enough to show levels within a typical phone viewport. Mixed Sakura/amber light gradients, small floral motifs, and a Sakura-to-peach highlighted word. Pills have three restrained accents, not loud filled buttons.
- Chapter surface: a distinct card depth from the hero, warmer chapter-heading emphasis and a bordered star-total chip. Existing family progression guidance becomes compact aligned badges. Advanced controls remain folded by default.
- Level list: tactile teal cards with warm number plaques, rose/peach edge highlights and a stronger currently-unlocked level style. Previously completed levels get a more subtle separate style. Locked levels remain clearly inactive, and existing star/record content stays untouched.
- Paginator and Continue CTA: warm pink/peach/gold focus accents. Corrected stale copy implying only one star per completed level.
- Motion: only lightweight native press/hover transitions. System reduced-motion setting and Harmony's reduced-motion class suppress movement.
- Changes are menu only: no asset additions, level balance, reward calculations, archived stars/records, save schema or background selection changes.

## Accessibility and visual regression
The currently unlocked level receives `aria-current="step"` in addition to its visual class. Disabled levels remain disabled. Explicit keyboard focus rings use the warm palette.
New browser checks inspect computed CSS and unlocked semantics at **390×844** and **320×640**, confirm 20 menu entries, the first selectable level appearing in the initial viewport, retained family guidance, no horizontal overflow, and the Advanced fold state. The regular Puppeteer preview artifact includes `main-menu-390.png` and `main-menu-320.png`.

## Follow-up
Player screenshot evaluation will determine whether chapter ornaments and card tinting are balanced on a real Android phone. No additional UI effects are required to play.
