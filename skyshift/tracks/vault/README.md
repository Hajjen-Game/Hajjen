# SKYSHIFT Tracks – Vault circuit

Architecture Cleanup 2.0 Stage E: dedicated Vault-specific racing modules.

Seven original modules have been moved under `tracks/vault/`. Their track,
architecture, material, lighting, finish and boost behavior are unchanged;
only ESM imports to external root modules have been rebased. See
`stageE-migration-manifest.json` for original immutable blob SHAs.

The `tunnel/` folder contains shared optics and light effects; `rendering/`
contains shared material/reflection implementation. These Vault modules are
track-specific and should not be copied into future circuits.

Remaining core and historical track files require separate path audits.
