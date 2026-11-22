# SKYSHIFT browser QA runners

SKYSHIFT Architecture Cleanup 2.0 — Stage B.

These **42** source-identical historical and current Chromium/WebGL runner programs
were moved from the `skyshift/` root into `skyshift/tests/browser/`.
Every original Git blob SHA is preserved in `stageB-migration-manifest.json`.
The independent architecture check audits every byte and every workflow path.

**The programs are not production game modules.** Their invocation paths
were updated in the existing GitHub workflows; real Chromium/WebGL assertions,
test data, image proof artifacts, server working directory and capture logic
were not modified.

Five source-sensitive or historically referenced runners were deliberately
excluded and left in their old locations. Other browser runners will require
future analysis; this is not a blanket permission to move all of them.

Rollback: revert this Stage B PR to restore original root file paths and
workflow commands. Do not edit the historical unit tests to accommodate
unreviewed moves; their original source integrity is protected.
