# EF01 — Runtime & Performance Baseline: first evidence pass
Baseline: `4983f20f6cf867f91e1ebd57ad48b1d0c685997c` (approved 0.28.9.7 runtime; roadmap merge #211). Immutable Git rollback reference. No production code changes.
## Verified starting facts
- 1,092 tracked SKYSHIFT files; 271 directly in root; 42 legacy. The extra file since L1H is the governing roadmap.
- Previous source review: 5,803 lines and 124 direct static import statements in game-v0210.mjs; runtime unchanged by L1H and #211.
- Latest pre-plan main had green Pages/track QA. Plan PR #211: architecture and fast-core/classifier successful; 33 visual jobs correctly skipped for docs only.
- Vault must remain approved visual reference. Skyline/Aurora frozen; shared jumps/tricks/landing/GRIP/geometry retained.
## EF01A evidence collection
Dedicated workflow pins the original checkout, reuses dependency-inventory-v2 and L1H historical consumer inventory, collects exact tracked file sizes/blob SHAs, literal production/comparison/test closure, reference candidates, normalized-import duplicate groups, external and unresolved paths. Review all dynamic/templated paths, CSS/assets/shaders and workflows before concluding unused. Artifacts: skyshift-ef01-static-census. No deletions authorized.
## EF01B initial browser reference
Reuse existing actual Chromium WebGL startup harness at pinned commit (SwiftShader software rendering; injected 8GB/4GB navigator.deviceMemory, not physical mobile). It measures cold boot and shared tunnel/PMREM duration, resources, heap where available, crashes/context loss and fixed-pose Vault screenshots. Retain normal High/4GB and explicit historical A/B diagnostic modes separately. Artifacts: skyshift-ef01-vault-cold-start-swiftshader. These are not actual iPhone/desktop GPU performance.
## Remaining EF01 gates (not complete)
Read resulting artifacts and classify verified vs unresolved dependency paths. Follow with controlled cold/warm navigation/network transfer, first playable frame and shader-compile observations, CPU/GPU p50/p95/p99, draw calls/triangles and repeated-run memory; fixed poses for Vault and temporary Skyline/Aurora, generic flight/GRIP/trick/boost fixture inventory and actual primary hardware measurements where available. Explicitly report unavailable fields, timing caveats and hardware limitations; do not infer gains from file sizes. A complete EF01 report must prioritize evidence-backed opportunities before EF02 starts.

## Verified EF01A results — PR #212 merged
Evidence run [45428884949](https://github.com/Hajjen-Game/Hajjen/actions/runs/45428884949), 2/2 jobs successful; architecture 1/1 and fast PR 35/35 successful on c2e28c1b9051800f82d59a41d088c4df2b0a1d5a. Merged at e7e88d4a1728d81493866d1f73f0366564f981d2. Static artifact 14937706435, startup artifact 14939465242. Values below extracted from actual job logs, not estimated.
| Category (exclusive heuristic) | files | bytes | code files | code bytes |
|---|---:|---:|---:|---:|
| Literal production | 160 | 1666162 | 151 | 1597026 |
| Literal comparison only | 3 | 163905 | 2 | 149188 |
| Literal QA only | 629 | 5380848 | 612 | 5234013 |
| Other text reference | 115 | 5005323 | 63 | 1575877 |
| Unconfirmed | 185 | 62848025 | 0 | 0 |
10 normalized-import duplicate groups; 583 dynamic candidates; 812 unresolved literal candidates across all scanned sources (not 812 live failures). Reclassify by owner, inspect dynamic and QA-relative references; zero code files in unconfirmed bucket does not prove that all remaining code is necessary. Sizes are raw Git blob sizes, not bundle/network/GPU memory.
| Profile | boot ms | tunnel ms | PMREM ms | geometries / textures / programs | JS heap MB |
|---|---:|---:|---:|---|---:|
| High normal | 10263.5 | 6056.6 | 903.6 | 90 / 20 / 81 | 636 |
| High classic route evaluator | 32161.4 | 29053.4 | 717.7 | 90 / 20 / 81 | 635 |
| High classic 10 atlases | 8967.8 | 5945.9 | 665.4 | 90 / 23 / 81 | 591 |
| High PMREM disabled | 8347 | 5904.8 | 0.2 | 90 / 19 / 53 | 621 |
| 4GB normal | 6863.6 | 4023.7 | 493.2 | 77 / 20 / 70 | 108 |
All five boots passed and reported no context loss. One observation per mode, sequential software Chromium; no confidence interval, no claim that atlas cache speeds up startup (classic happened to be faster here), no hardware GPU timings or physical RAM equivalence. Tunnel construction ~59% of normal High boot is an evidence-backed investigation priority; the classic route evaluator is much slower in this run. PMREM measurement is synchronous wall time, not isolated GPU execution. Renderer counters are counts, not bytes. Screenshots are available as artifacts; not independently visually inspected in this turn.
## EF01B — cold/warm runtime and feature evidence (candidate)
Dedicated matrix: all 3 tracks × 8GB/4GB, cold context then same-context warm reload, 1280×720, actual menu version parameters (Vault 0.28.9.7, Skyline/Aurora 0.26.5), perf=1 baseline fixed-quality diagnostic. Logs actual CDP encodedDataLength and cache flags, resource timings, boot and click-to-playing wall time, first RAF proxy, 12s raw RAF quantiles including stalls >250ms, existing engine profiler CPU/render/draw/triangle summaries and optional nonblocking GPU query, resource counters and heap before/after, fixed-pose screenshots. Not a true presented-frame timestamp; network numbers include protocol overhead and may omit pending requests, cross-origin Resource Timing may be zero. Reload is not an in-page disposal test. Fixed quality is not identical to default adaptive mode. Unsupported GPU timer or missing samples are recorded, not fabricated. Software timings are CI comparisons only.
Reviewed existing coverage: air-tricks-v080.test.mjs and corkscrew-v072.test.mjs assert legacy 120Hz flight and advanced geometry, but import older implementation versions; they do NOT prove current generic runtime feature support. track-physics-parity-v0165.test.mjs and grip-trick-lock-v0165.test.mjs compare current Skyline/Aurora steering, rail contact and preserved pre-jump TRICK/GRIP; track-integrity-v0165.test.mjs checks selected Aurora physical geometry and no-gap behavior. Vault-specific boost test and current browser QA remain in the gate. Before retirement, prove reusable feature paths using live modules and synthetic fixtures; older tests are reference evidence only.
Next: verify this PR and log results, review live dynamic/asset/shader references and duplicate families, measure or explicitly identify unavailable isolated shader compile time, physical hardware timing and repeated-run lifecycle evidence. No EF02 or runtime modifications until EF01 gate reviewed.
