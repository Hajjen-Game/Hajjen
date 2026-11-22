# SKYSHIFT CI Optimization 2.0 — conservative first pass

## Objective

Reduce the previous 20+ minute checks for test, documentation and proof-image edits without skipping critical gameplay or graphics tests.

## PR behavior

- Always run fast-core, architecture safety guard and CI classifier regression tests.
- The 33 original Chrome/WebGL jobs run when ANY production, browser script, asset, stylesheet, entrypoint, CI workflow or unknown path changes.
- Skip those 33 jobs only when ALL changed paths belong to tests, docs, previews or root SKYSHIFT Markdown files.
- Use NUL-delimited git diff from the two parents of GitHub's PR merge commit. If history/diff is unavailable, default to full visual QA.
- Keep all original browser test commands, proof artifacts and existing job identities unchanged. Skipped checks remain visible as skipped, not as passed.

## Main branch

The full historical workflow auto-runs for production and CI changes but not test-only, doc-only or preview-only pushes. The workflow_dispatch manual full-release audit remains available.

## Safety and rollout

This is the conservative first phase of CI 2.0. On this workflow-changing PR, all 34 jobs intentionally run. After merging, make a docs/test-only PR to confirm jobs skip, then a live-source PR to confirm all 34 run. Never merge a PR with failed mandatory jobs. More granular subsystem selection and caching require a separately verified follow-up.

Rollback: revert this PR to restore previous 34-job PR and full historical main behavior. No runtime game code is modified.
