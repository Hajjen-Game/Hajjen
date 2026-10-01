# PixiJS renderer rollout

Stable pre-Pixi fallback:
- branch: `arena3v3-stable-before-pixi-20261001`
- commit: `5164b0f29e96d4e210c13913b93833dc429925ec`

## Runtime modes

Normal URL:
- current Canvas 2D renderer
- this remains the default during migration

Add `?renderer=pixi`:
- pinned PixiJS 8.21.0
- explicitly requests WebGL
- Pixi renders the arena texture, actor bodies, names, basic health/resource/cast bars
- the existing Canvas remains a transparent effects overlay for current spell VFX and floating combat text
- if PixiJS fails to initialize, RendererBridge automatically falls back to the existing CanvasRenderer

## Migration rule

Do not remove CanvasRenderer or make Pixi the default until the Pixi path has parity for:
- actors and targeting feedback
- aura / CC icons
- cast feedback
- all class VFX
- both arena environments
- click targeting and mouse steering
- match reset / arena swap

The purpose of the first phase is to validate Pixi/WebGL in the real game while keeping the known-good renderer intact.
