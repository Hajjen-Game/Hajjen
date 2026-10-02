export const ARENA_WORLD_SCALE = 0.1;

export function createArenaWorldMapping(arena, options = {}) {
  const width = Math.max(1, Number(arena?.width) || 1280);
  const height = Math.max(1, Number(arena?.height) || 720);
  const scale = Math.max(0.001, Number(options.scale) || ARENA_WORLD_SCALE);

  const gameToWorld = (x, y, elevation = 0) => ({
    x: (Number(x) - width / 2) * scale,
    y: Number(elevation) || 0,
    z: (height / 2 - Number(y)) * scale,
  });

  const worldToGame = (x, z) => ({
    x: Number(x) / scale + width / 2,
    y: height / 2 - Number(z) / scale,
  });

  const rectToWorld = (rect, elevation = 0) => {
    const center = gameToWorld(
      Number(rect?.x) + Number(rect?.w) / 2,
      Number(rect?.y) + Number(rect?.h) / 2,
      elevation,
    );

    return {
      center,
      width: Math.max(0.01, Number(rect?.w) * scale),
      depth: Math.max(0.01, Number(rect?.h) * scale),
    };
  };

  const configureOrthographicCamera = (
    camera,
    { cameraHeight = 96, cameraDepth = 44, padding = 1 } = {},
  ) => {
    const h = Math.max(1, Math.abs(Number(cameraHeight) || 96));
    const d = Math.max(0.01, Math.abs(Number(cameraDepth) || 44));
    const length = Math.hypot(h, d);

    // With the camera tilted only around X, ground-plane Y in the original
    // 2D game projects linearly through world Z. Matching the ortho vertical
    // span to that projection keeps gameplay coordinates aligned with Pixi.
    const projectedHalfHeight = (height * scale * 0.5) * (h / length);
    const halfWidth = width * scale * 0.5;

    camera.orthoLeft = -halfWidth * padding;
    camera.orthoRight = halfWidth * padding;
    camera.orthoTop = projectedHalfHeight * padding;
    camera.orthoBottom = -projectedHalfHeight * padding;

    return { cameraHeight: h, cameraDepth: d };
  };

  const worldToScreen = (BABYLON, scene, camera, engine, point) => {
    if (!BABYLON || !scene || !camera || !engine || !point) return null;

    const viewport = camera.viewport.toGlobal(
      engine.getRenderWidth(),
      engine.getRenderHeight(),
    );
    const projected = BABYLON.Vector3.Project(
      new BABYLON.Vector3(point.x, point.y, point.z),
      BABYLON.Matrix.Identity(),
      scene.getTransformMatrix(),
      viewport,
    );

    return { x: projected.x, y: projected.y, z: projected.z };
  };

  return Object.freeze({
    width,
    height,
    scale,
    worldWidth: width * scale,
    worldHeight: height * scale,
    gameToWorld,
    worldToGame,
    rectToWorld,
    configureOrthographicCamera,
    worldToScreen,
  });
}
