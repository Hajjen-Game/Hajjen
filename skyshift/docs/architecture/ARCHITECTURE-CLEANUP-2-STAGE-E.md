# SKYSHIFT Architecture Cleanup 2.0 – Stage E: Vault circuit modules

**Seven active Vault-specific track modules** have been reorganized from
the `skyshift/` root into `skyshift/tracks/vault/`:

- Full-tunnel layout and circuit
- Vault material and architectural parity
- Vault full lighting and premium finish
- Vault boost clarity

All original JavaScript behavior and material/geometry definitions are kept.
Only relative ESM imports were changed. Sibling Vault imports remain `./`;
external root and shared rendering imports become `../../` paths.

All active game, shared tunnel, circuit/track and risk-reward consumers,
eight affected historical unit tests, and the required GitHub Actions
references are updated. A SHA manifest plus `vault-migration-stageE.test.mjs`
audits original source-byte equivalence after inverting import paths and
verifies no unresolved imports or stale runtime/CI source paths remain.

The original unit-test SHA guarantees from migration Stages 5–8 are retained
via an additional reversible path-only overlay. Never relax original
assertions or SHAs.

**Merge gates:** Independent architecture guard green; all 35 PR fast jobs,
including 33 real Chromium/WebGL checks, green; review the diff for
path-only runtime changes. After merging, verify historical main tests
and Pages publishing. Revert this single PR for rollback.
