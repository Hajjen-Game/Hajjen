# Victory Screen Accent Polish 1.1
Version 6.27.1 · 2026-10-24

## Target
Keep the calm, premium Midnight Garden/Zen Festival composition of 6.27.0 while introducing clearly visible signature Sakura pink + peach-orange accents from the rest of Japanese Harmony. Feedback came from player screenshots comparing the victory modal with the colorful main menu.

## Changes (CSS-only)
- Sakura pink and warm peach lighting in the upper dialog background, while midnight teal remains the dominant neutral base.
- A mixed Sakura/amber halo and floating ornamental accents behind the three star ratings; stars retain exact earned/empty state and legibility.
- Light Sakura border on the achievement card and rose + peach distinctions for move/stars counts.
- Bonus score gains peach glints, warmer orange border and a rose-peach record badge.
- Four stat icon containers get distinct Sakura, amber, gold and coral hints rather than identical green-grey boxes.
- Footer remains darker but gains a peach-gold Next Level CTA. Secondary/tertiary actions remain quieter.
- Uses lightweight layered CSS radial/linear gradients and existing one-shot animations only. Reduced motion is respected; no additional full-screen animation.
- CSS is scoped strictly to `.modal:has(.victory-result)`. Main menu, other dialogs, board and gameplay rules remain unchanged.

## QA
Mobile Puppeteer smoke extends existing completion assertions with computed style checks for rose/orange accents and layout checks at 390×844 and 320×640. Ensure all four stat fields remain visible in the scrollable content, Next Level remains accessible without scrolling through stats, and no horizontal page overflow is introduced.

No data reset, scoring change, or new artwork assets.
