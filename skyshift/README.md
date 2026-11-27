# SKYSHIFT

A futuristic browser racing game built with Three.js/WebGL. **Neon Vault Circuit** is the active development track.

## Play

[Current game — 0.28.9.9](https://hajjen-game.github.io/Hajjen/skyshift/?track=vault&v=0.28.9.9)

The production catalog in `tracks/shared/production-catalog.mjs` defines the current release. GitHub Pages must finish deploying the corresponding main commit before a release is considered available. Latest release: [0.28.9.9 — Vault Boost, Single Wave & Clean Deck](docs/releases/current/RELEASE-02899-VAULT-BOOST-WAVE-ROAD.md). Player visual acceptance remains pending.

## Active development

Owner decision, 2026-11-27: Engineering Foundation EF01–EF08 is complete. Resume normal game development, not an ongoing EF migration.

- Implement the owner's requested game change in GitHub; keep the scope coherent. Use the existing shared engine, no duplicate tunnel per track.
- Check current main and open PRs first. Follow relevant CI in the active development session, fix failures, merge when the required exact-head checks pass, and verify Pages. No repeated user approval for already authorized implementation or merge.
- Keep checks proportional to the change. Preserve current functional, physics, build and real WebGL coverage. Historical migration tests are not design requirements. Retain them until equivalent protection has been demonstrated or they are proven obsolete; don't bypass required checks.
- Report actual results and provide a versioned play link once published. If a chat turn ends before CI finishes, state the remaining gate honestly; no claim of continuous monitoring after the response. No separate EF-monitoring workflow as the default.
- Keep release notes concise and local to the changed feature. No routine updates of completed EF migration logs.

## Architecture

- `core/`, `flight/`: race lifecycle, simulation and flight; fixed 120 Hz simulation.
- `tracks/`: course data, shared geometry/sampling, production catalog.
- `tunnel/`, `rendering/`: shared tunnel, materials, lights, road and reflections.
- `ships/`, `ui/`, `assets/`, `styles/`: presentation and resources.
- `build/`: production build and verification; `tests/`: functional, WebGL and architecture tests.
- Preserve reusable ramps, gaps, hops, tricks, landing, GRIP, bank/elevation and flight features when developing Vault or future tracks. Maintain High/4GB quality, use real game captures for graphics checks, and distinguish simulated performance from physical device measurements.

## References

[Release history](docs/releases/README.md) · [Engineering Foundation (completed)](docs/architecture/SKYSHIFT-ENGINEERING-FOUNDATION-1.0.md) · [Root consolidation (completed)](docs/architecture/SKYSHIFT-ROOT-CONSOLIDATION-STATUS.md) · [GitHub Actions](https://github.com/Hajjen-Game/Hajjen/actions)

The previous long README is preserved byte-for-byte in [Git history](https://github.com/Hajjen-Game/Hajjen/blob/d04407804df55df7055fff51c0aa58b97dbc93b7/skyshift/README.md); historical releases remain in the release archive. No old game source or regression tests removed by this documentation change.
