# EF02J — Historical Test & Dependency Rationalization (draft)
Base and rollback 254e869bfa3a912793117913b13d44a0eb01fd8a. #223 EF02I merged after 36/36 checks (architecture 45477230982, fast 45477230978); #222 main QA 45475219782, guard 45475219577, Pages 45475218394 all succeeded. Verified main: 220 direct root files, 1069 SKYSHIFT tracked files; 210 unit tests and 42 architecture tests. New main guard 45480733158 succeeded; track QA 45480733123 and Pages 45480732705 pending at start.

## Preliminary evidence
Eight inspected SKYSHIFT workflows name 168 of 210 unit files; 42 are not named literally in those eight. This is not a complete execution inventory: other workflows, subprocess, glob and dynamic references require verification. All 15 EF02I unit consumers are among the 42. Some are mixed behavior and historical contracts. No file may be retired simply because it is not named.

| Test | Observed assertions | Initial disposition / reason |
| --- | --- | --- |
| premium-track-v0481 | Old 1.30 boost multiplier, exact shader identifiers, geometry and pad boundary agreement | Mixed; verify equivalent current pad/geometry tests before any removal; retain now |
| premium-ship-v0482 | Historical hull stations, triangle counts and old ship material controls | Mixed historical asset specification and geometry validity; verify current model coverage; retain now |
| extended-zone-v049 | Exact old 1530m course and wave times, finite geometry, pad bounds | Mixed; preserve transferable geometry and boost/wave behavior; retain now |
| spectral-zone-v0491 | Old wave timing/constants, signed spatial propagation and HUD crossing | Mixed; preserve current spatial wave behavior; retain now |
| mobile-boot-v04911 | Exact boot/game versions and archived CSS, boot failure recovery and init order | Mixed; compare with actual current bootstrap failure/recovery tests; retain now |
| air-tricks-v080 | Executable leap, successful intentional rolls, no automatic reward, landing boost and full corkscrew | Protected reusable behavior; do not retire without proven replacement |
| track-physics-parity-v0165 | 64 actual 120Hz steering/GRIP samples, collision, projection, cross-track parity | Protected functional regression; keep |
| startup-source-frame-v02897 | Current shared-source frame parity, bounded cache, startup selection | Protected current behavior; keep |

## Census and next action
Run temporary read-only census in architecture CI. Emit each unit/architecture test's declarations, assertion count, workflow matches, resolved literal dependencies, default/comparison graph intersections and computed-path hints. Emit non-live/non-comparison source rows with transitive test owners, text consumers, bytes and unresolved references. All rows default to unresolved/retain. Review full output and pinned archive/workflow references; classify cohorts against current executable coverage and preserve all future reusable features. No permanent new test requirement intended: remove this temporary census step once evidence is captured and the rationalization is complete. No source or test deletion yet, no CI time saving claimed. Continue this draft with evidence-backed removal and replacement coverage, not a separate file-moving pass. No runtime or visuals modified. Full previous main and candidate checks required before merge.
