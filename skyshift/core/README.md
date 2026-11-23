# SKYSHIFT runtime performance and fidelity

Architecture Cleanup 2.0 Stage I groups 15 original performance-audit, frame-pacing, render optimizer, smart-fidelity and settings modules in `skyshift/core/`. The original source Git object IDs are recorded in `stageI-migration-manifest.json`; any external ESM paths are only rebased. No frame timing, adaptive fidelity thresholds, steering, graphics, visual materials or gameplay values are intentionally modified. Do not move loaders with asset-relative URLs into this folder.
