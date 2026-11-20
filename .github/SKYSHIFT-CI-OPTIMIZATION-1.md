# SKYSHIFT CI Optimization 1.0

## Problem observed 20 November 2026

Previously every development-branch **push** and **pull_request** could start
the entire 63-job test suite (including dozens of historical Chromium/WebGL
render passes), without concurrency cancellation. Repeated shader edits
saturated the queue even when the older revisions were obsolete.

## New workflow tiers

| When | Workflow | Tests |
|---|---|---|
| Each new/updated SKYSHIFT pull request | `SKYSHIFT fast PR checks` | One unit/flight/solar-seal job + one current native-WebGL screenshot job (8 GB and simulated 4 GB) |
| Release candidate, **before merging** | Manually run `SKYSHIFT track logic checks` on the PR source branch | All existing 63 full/regression jobs; includes historical WebGL, GRIP, white-spill and road coverage |
| Commit/merge to `main` | `SKYSHIFT track logic checks` | Same full suite, as post-merge safety verification |

New fast PR runs use `concurrency.cancel-in-progress: true` keyed by PR number.
This cancels superseded jobs for the **same** PR, not unrelated projects or
the `main` release jobs. We no longer run the same full suite for both a
branch push and a pull request.

The full historic suite still exists, unchanged, under
`.github/workflows/skyshift-tests.yml`. It is deliberately not fired by
every PR edit. It can be started manually with **Actions → SKYSHIFT track
logic checks → Run workflow → choose release branch → Run workflow**.

## Release checklist

1. Check `SKYSHIFT fast PR checks` is green on the PR's current HEAD.
2. On the same candidate commit/branch, manually dispatch **full** SKYSHIFT
   track logic checks; require a completed successful run and review its
   screenshot artifacts before merging.
3. Merge only after both checks pass; post-merge full checks run on `main`.
4. If a shader test fails, correct the candidate and rerun both tiers.
5. Do not consider green unit tests proof of correct lighting: the active
   same-camera real WebGL visual test remains mandatory.

Important: old runs already queued **before** these workflow changes retain
their original schedule; GitHub may keep showing those until completed or
manually cancelled through its UI. CI Optimization 1.0 prevents further
unnecessary full-suite fan-out; it cannot retroactively cancel existing runs.

No changes to game code, native nine-stage neon, light isolation, physics,
road, GRIP, camera or Pages deployment settings.
