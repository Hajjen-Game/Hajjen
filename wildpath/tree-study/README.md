# Wildpath — Tree Study 3.0 (Pass 13)

**Preview:** https://hajjen-game.github.io/Hajjen/wildpath/tree-study/

### Design intent
After 1.0→2.0 yielded only a modest visual improvement, the user elected to leave Meshy/Tripo and develop our existing free, original 3D tree further.

In 3.0 we replace 2.0's forest of exposed, spiky isolated leaves with:
- **12 hand-arranged flattened irregular foliage masses** (sculpted vertex-color meshes), with asymmetry and scalloped contours
- **775 curved and raised individual edge/detail leaves**, slightly larger and more intentionally layered than the prior 1,373-leaf crown
- 6 continuous major branches from 2.0, retaining the original curved trunk, nuanced bark and flowers
- softly painted light/shade transitions over canopy volumes instead of harsh planar shadow noise
- diffuse transparent radial canopy and root-contact shadows (the trunk and branches remain real-time shadow casters)
- softer warm/cool lighting and clear A/B version controls

No external 3D AI service, paid asset or imported Meshy file is used. No main Wildpath gameplay or nature-system file is changed.

### A/B versions
- Default \`/wildpath/tree-study/\`: new 3.0
- \`/wildpath/tree-study/?tree=v2\`: previous 2.0
- \`/wildpath/tree-study/?tree=v1\`: original 1.0

### Validation
Unit checks verify version links, 3D mesh construction and foliage shadow approach. Mobile browser rendering and how natural the crown looks remain **subject to user evaluation**, not assumed from code. Watch FPS and compare side/back/elevated angles and the softness of cast shadows.

Keep user feedback as art direction; do not add more leaves by default if shape is the underlying problem.
