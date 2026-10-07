# Tiby base character — PvP 2.5D

PvP 2.5D uses the **Tiby 3D rigged model** by PINKCANNON as the free chibi
character template.

Source:
https://opengameart.org/content/tiby-3d-rigged-model

License: **CC0 / public domain**.

The upstream asset is supplied as Blender/FBX source. A GitHub Actions workflow
downloads the source from OpenGameArt and exports a local Babylon-compatible
`tiby-base.glb`.

The export intentionally removes source hair so the game can build readable
class silhouettes without large headgear obscuring the body from the top-down
arena camera.

Generated files:
- `tiby-base.glb`
- `SOURCE_SHA256.txt`

The source page describes the base as rigged with foot/wrist IK and about 1,794
body triangles. Class gear and colors are added by PvP 2.5D at runtime.
