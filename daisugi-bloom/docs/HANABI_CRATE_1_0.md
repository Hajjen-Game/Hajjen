# Hanabi Crate 1.0 — Box On Board
1 November 2026. Real level 61 and five opt-in routes.

## Purpose
Replace the Lotus seed/gate visual concept with a Japanese festival firework and a wooden on-board crate. Retain the proven vertical routing, family stage rules, saved player progress and Director fairness contracts. Only a genuine gravity delivery triggers a launch.

## Rules and presentation
Two fireworks start in their old cargo columns; two wooden crates sit on cells 43 and 47 (the bottom row) for the pilot. A normal match clears pieces beneath each firework; it drops and, when it reaches its matching crate, is consumed. A launch then travels **up all six cells above the crate in its column**, with the visible emitter in row seven. Each ordinary eligible object gains one stage and 75 points. Fixed terrain is traversed visually but never upgraded. Mist covered cells clear, Daruma/Sealed Stone receive one genuine hit, and stage-five creations release Harmony Pulse and get harvested under normal collection scoring. Multiple fireworks never double-upgrade a cell in the same launch sequence. Normal gravity and Director refill follow the effect; cards, coins and automatic moves are not granted.

## Visual and animation
Hanabi Crate 1.1 changes the target into a fixed, non-matchable cell, with a real crate piece instead of a treasure beneath its art. Fireworks stop immediately above the cell and fall into the crate during a dedicated intake animation, then launch. The base beam is now a thick, high-contrast ivory/gold shaft, with crimson halo and sequential impacts only on the launch column. Prior v1 games remain unchanged via hanabiVersion=2 for new rounds.

The 2.5D ruby-gold firework is authored as layered CSS (tapered rocket nose, antique gold band and tiny burning fuse) for high small-board readability. A warm lacquered wooden crate with gold rim and a 花 seal occupies the target board square; it does **not** block ordinary moves or relocate fixed board terrain. An upward stream of light particles with a long tail is inspired by Score Motes; tile-by-tile ring impacts echo empty-tile magic dust. It respects reduced motion and adaptive FX budgets.

## Migration and experiments
Source code reuses internal `lotusSeed`, `lotus` and existing route keys for old save compatibility; these names are not the user-facing theme. `hanabiVersion=1` identifies new rounds; old unfinished Lotus saves without that flag continue with their old instructions, old look and collection-only behavior. Existing save validation checks the flag. Prototype routes stay unranked and cannot spend cards or alter Goshuincho. This release deliberately keeps the crates **on the board** until human playtesting determines whether to move them below it.
