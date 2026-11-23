# SKYSHIFT Rendering

Stage C of Architecture Cleanup 2.0 houses the first 14 live rendering
modules, originally in the SKYSHIFT root. Module implementations are unchanged,
except for the minimal rebase of imports to other root-level files.

When expanding this folder, verify all imports, source-file test readers and
workflow commands; do not assume similarly named historical modules are safe
to relocate. Preserve the shared Skyline/Vault/Aurora renderer behavior.
