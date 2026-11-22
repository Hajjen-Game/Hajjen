# SKYSHIFT — historical release notes

This directory collects **documentation only**. It is not a JavaScript bundle, a new game build, or a source for live track/lighting configuration.

## Migration batch 1 — 0.10.x to 0.11.4

The following 13 early release notes were moved **without changing their bytes** from `skyshift/` into this directory. Their original Git blob SHA-1 identifiers remain identical, so the source material can be verified via Git history:

- [0.10.0](RELEASE-010.md)
- [0.10.1](RELEASE-0101.md)
- [0.10.3](RELEASE-0103.md)
- [0.10.4](RELEASE-0104.md)
- [0.10.5](RELEASE-0105.md)
- [0.10.7](RELEASE-0107.md)
- [0.10.8](RELEASE-0108.md)
- [0.10.9](RELEASE-0109.md)
- [0.11.0](RELEASE-0110.md)
- [0.11.1](RELEASE-0111.md)
- [0.11.2](RELEASE-0112.md)
- [0.11.3](RELEASE-0113.md)
- [0.11.4](RELEASE-0114.md)

All other historical notes remain where they are until separately audited.

### Path policy

All paths printed in the old notes document the historical layout; a reference like `game-v0113.mjs` means the file under `skyshift/`, **not** this documentation directory. The historical test scripts and their current CI workflows stay at their existing paths.

### Safety contract

Do not move `index.html`, `boot-v0210.js`, `game-v0210.mjs`, shared tunnel implementation, shaders, graphics assets or runtime imports as part of release-note archiving. Any gameplay refactor requires separate before/after performance and image evidence.

See [architecture safety baseline](../architecture/02898-repository-consolidation-baseline.md).
