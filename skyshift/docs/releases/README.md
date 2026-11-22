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

## Migration batch 2 — 0.12.0 to 0.16.5 (stage 3)

The next 26 release notes were moved **without modifying their content**; see `release-manifest.json` for the original Git blob SHAs. The [archive integrity test](../../tests/architecture/release-archive-integrity.test.mjs) checks **all 39 moved notes**, their original bytes, and these links.

- [0.12.0](RELEASE-0120.md)
- [0.12.1](RELEASE-0121.md)
- [0.13.0](RELEASE-0130.md)
- [0.13.1](RELEASE-0131.md)
- [0.13.2](RELEASE-0132.md)
- [0.13.2.1](RELEASE-01321.md)
- [0.13.3](RELEASE-0133.md)
- [0.13.4](RELEASE-0134.md)
- [0.13.4.1](RELEASE-01341.md)
- [0.13.4.2](RELEASE-01342.md)
- [0.13.4.3](RELEASE-01343.md)
- [0.13.4.4](RELEASE-01344.md)
- [0.13.4.5](RELEASE-01345.md)
- [0.13.4.6](RELEASE-01346.md)
- [0.13.4.7](RELEASE-01347.md)
- [0.13.4.8](RELEASE-01348.md)
- [0.13.5](RELEASE-0135.md)
- [0.14.0](RELEASE-0140.md)
- [0.15.0](RELEASE-0150.md)
- [0.15.1](RELEASE-0151.md)
- [0.16.0](RELEASE-0160.md)
- [0.16.1](RELEASE-0161.md)
- [0.16.2](RELEASE-0162.md)
- [0.16.3](RELEASE-0163.md)
- [0.16.4](RELEASE-0164.md)
- [0.16.5](RELEASE-0165.md)

## Migration batch 3 — 0.21–0.23 historical notes (stage 4)

Fourteen additional release notes were moved byte-for-byte; all 53 archived release notes are validated using their original Git blob hashes.

- [0211](RELEASE-0211.md)
- [02123](RELEASE-02123.md)
- [02124](RELEASE-02124.md)
- [02125](RELEASE-02125.md)
- [02126](RELEASE-02126.md)
- [0213](RELEASE-0213.md)
- [0214](RELEASE-0214.md)
- [0215](RELEASE-0215.md)
- [0216](RELEASE-0216.md)
- [0220-P1](RELEASE-0220-P1.md)
- [0220-P2](RELEASE-0220-P2.md)
- [0220-P3](RELEASE-0220-P3.md)
- [0220-P4](RELEASE-0220-P4.md)
- [0230-P1](RELEASE-0230-P1.md)

Other historical release notes stay in `skyshift/` pending separate audit. This archive is **not** a source of active game code or a replacement for Git history.


### Path policy

All paths printed in the old notes document the historical layout; a reference like `game-v0113.mjs` means the file under `skyshift/`, **not** this documentation directory. The historical test scripts and their current CI workflows stay at their existing paths.

### Safety contract

Do not move `index.html`, `boot-v0210.js`, `game-v0210.mjs`, shared tunnel implementation, shaders, graphics assets or runtime imports as part of release-note archiving. Any gameplay refactor requires separate before/after performance and image evidence.

See [architecture safety baseline](../architecture/02898-repository-consolidation-baseline.md).
