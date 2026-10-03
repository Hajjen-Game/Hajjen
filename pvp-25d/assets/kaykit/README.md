# KayKit Adventurers runtime assets

PvP-2.5D currently loads the free KayKit Adventurers character GLBs directly
from the public KayKit repository at runtime for an A/B visual integration test.

Source repository:
https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0

Pinned upstream commit:
672074b73ba276876a19e8816ecdc5241817ab47

Models used:
- Knight.glb
- Mage.glb
- Rogue_Hooded.glb
- Barbarian.glb

License: CC0 1.0 Universal (see LICENSE.txt).

The remote load is intentionally temporary. If the KayKit direction is approved,
the next asset-pipeline step is to vendor the chosen GLBs locally in pvp-25d so
the game no longer depends on raw.githubusercontent.com at runtime.
