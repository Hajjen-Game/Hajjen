# SKYSHIFT Architecture Cleanup 2.0 — Stage K: historical Chromium smoke QA

Base `c16ea84e136f878e872c4c3caf770abe842bd4c6` (Stage J merged). This draft PR moves **57** unmodified
historical `browser-smoke-v*.mjs` runners from the SKYSHIFT root to
`skyshift/tests/browser/legacy/`, while retaining their **original immutable
Git blob SHAs** in `stageK-migration-manifest.json`. No runtime source,
HTML, boot, ship, flight, tunnel, rendering, physics, track or shader is edited.

All 57 candidates were preflight-inspected: no `import.meta.url`, no
static relative Node imports, and no cwd-relative `readFileSync/existsSync`
calls. Their `page.evaluate` dynamic imports run relative to the **browser's
/skyshift/ document URL**, not this Node harness's disk location, so they are
intentionally kept byte-identical. The scripts continue to run with the repo
working directory, unchanged.

**Five protected historical harnesses stay in the root:** `browser-smoke-v04991.mjs`, `browser-smoke-v0498.mjs`, `browser-smoke-v071.mjs`, `browser-smoke-v080.mjs`, `browser-smoke-v081.mjs`.
Historical Stage 5–8 unit tests read these five via original root paths;
they are deliberately excluded to avoid touching historical test assertions
or relaxing SHA guards.

The existing `skyshift-tests.yml` historical CI commands use the new
location for all 57; the remaining five stay on their existing paths.
A new independent Stage K architecture guard verifies 57 original Git blob
hashes, executable CI references and the five protected source-reader paths.
All 57 scripts are also Node syntax-checked.

**Merge gate:** after Stage J's four post-merge main workflows complete green,
require the Stage K independent guard, fast PR checks, **all real 33 WebGL
tests** and all relevant historical tests to pass. Review path-only diff.
Only then merge the PR, followed by four main QA/Pages successes.
Rollback with a single PR revert. Do not merge while CI is queued or red.
