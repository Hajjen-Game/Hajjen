# SKYSHIFT – Skyline circuit

Architecture Cleanup 2.0 Stage F establishes the Skyline-specific module
directory. `skyline-challenges-v0140.mjs` is now located here.

Other Skyline-specific modules will follow only after their complete
dependency and historical-test references are audited. Shared track
selection and 3D geometry are located in `../shared/`, not duplicated.
