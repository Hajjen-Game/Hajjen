function color3(BABYLON, hex) {
  return BABYLON.Color3.FromHexString(hex);
}

function material(BABYLON, scene, name, diffuse, specular = "#1b120d") {
  const mat = new BABYLON.StandardMaterial(name, scene);
  mat.diffuseColor = color3(BABYLON, diffuse);
  mat.specularColor = color3(BABYLON, specular);
  mat.specularPower = 12;
  return mat;
}

function createBox(BABYLON, scene, name, width, height, depth, position, mat) {
  const mesh = BABYLON.MeshBuilder.CreateBox(
    name,
    { width, height, depth },
    scene,
  );
  mesh.position.set(position.x, position.y, position.z);
  mesh.material = mat;
  return mesh;
}

function addFloor(BABYLON, scene, arena, mapping, materials, root) {
  const ground = BABYLON.MeshBuilder.CreateGround(
    "babylon-arena-floor",
    {
      width: mapping.worldWidth,
      height: mapping.worldHeight,
      subdivisions: 1,
    },
    scene,
  );
  ground.position.y = 0;
  ground.material = materials.floor;
  ground.receiveShadows = true;
  ground.parent = root;

  const centerDisc = BABYLON.MeshBuilder.CreateCylinder(
    "babylon-center-disc",
    {
      diameter: Math.min(mapping.worldWidth, mapping.worldHeight) * 0.37,
      height: 0.045,
      tessellation: 72,
    },
    scene,
  );
  centerDisc.position.y = 0.025;
  centerDisc.material = materials.floorLift;
  centerDisc.receiveShadows = true;
  centerDisc.parent = root;

  const maxRing = Math.min(mapping.worldWidth, mapping.worldHeight);
  [0.19, 0.30, 0.42, 0.56, 0.73].forEach((ratio, index) => {
    const ring = BABYLON.MeshBuilder.CreateTorus(
      "babylon-floor-ring-" + index,
      {
        diameter: maxRing * ratio,
        thickness: index < 2 ? 0.12 : 0.09,
        tessellation: 96,
      },
      scene,
    );
    ring.position.y = 0.055;
    ring.material = materials.seam;
    ring.parent = root;
  });

  // A restrained radial stone layout gives the floor authored structure while
  // keeping the actual combat center quiet enough for class icons and VFX.
  for (let i = 0; i < 12; i += 1) {
    const angle = i / 12 * Math.PI * 2;
    const length = maxRing * 0.34;
    const seam = BABYLON.MeshBuilder.CreateBox(
      "babylon-radial-seam-" + i,
      { width: 0.055, height: 0.026, depth: length },
      scene,
    );
    seam.position.set(
      Math.sin(angle) * length * 0.25,
      0.052,
      Math.cos(angle) * length * 0.25,
    );
    seam.rotation.y = angle;
    seam.material = materials.seamSoft;
    seam.parent = root;
  }

  return ground;
}

function addBorder(BABYLON, scene, arena, mapping, materials, root, shadowCasters) {
  const b = arena.bounds;
  const borderPx = 24;
  const borderWorld = borderPx * mapping.scale;
  const borderHeight = 3.4;
  const centerX = b.x + b.w / 2;
  const centerY = b.y + b.h / 2;

  const definitions = [
    {
      id: "top",
      x: centerX,
      y: b.y - borderPx / 2,
      w: b.w + borderPx * 2,
      h: borderPx,
    },
    {
      id: "bottom",
      x: centerX,
      y: b.y + b.h + borderPx / 2,
      w: b.w + borderPx * 2,
      h: borderPx,
    },
    {
      id: "left",
      x: b.x - borderPx / 2,
      y: centerY,
      w: borderPx,
      h: b.h,
    },
    {
      id: "right",
      x: b.x + b.w + borderPx / 2,
      y: centerY,
      w: borderPx,
      h: b.h,
    },
  ];

  for (const edge of definitions) {
    const p = mapping.gameToWorld(edge.x, edge.y, borderHeight / 2);
    const mesh = createBox(
      BABYLON,
      scene,
      "babylon-border-" + edge.id,
      edge.w * mapping.scale,
      borderHeight,
      edge.h * mapping.scale,
      p,
      materials.border,
    );
    mesh.parent = root;
    mesh.receiveShadows = true;
    shadowCasters.push(mesh);
  }

  const cornerSize = borderWorld * 2.6;
  const corners = [
    [b.x - borderPx, b.y - borderPx],
    [b.x + b.w + borderPx, b.y - borderPx],
    [b.x - borderPx, b.y + b.h + borderPx],
    [b.x + b.w + borderPx, b.y + b.h + borderPx],
  ];

  corners.forEach(([x, y], index) => {
    const p = mapping.gameToWorld(x, y, borderHeight * 0.72);
    const block = createBox(
      BABYLON,
      scene,
      "babylon-corner-block-" + index,
      cornerSize,
      borderHeight * 1.44,
      cornerSize,
      p,
      materials.borderCap,
    );
    block.parent = root;
    block.receiveShadows = true;
    shadowCasters.push(block);
  });
}

function addObstacle(
  BABYLON,
  scene,
  obstacle,
  index,
  mapping,
  materials,
  root,
  shadowCasters,
) {
  const rect = mapping.rectToWorld(obstacle);
  const height = 8.4 + Math.min(2.2, Math.max(rect.width, rect.depth) * 0.035);
  const baseCenter = {
    x: rect.center.x,
    y: height / 2,
    z: rect.center.z,
  };

  // The main body preserves the exact logical X/Z footprint. Decorative caps
  // sit inside that footprint so visuals never imply extra collision.
  const body = createBox(
    BABYLON,
    scene,
    "babylon-los-body-" + (obstacle.id || index),
    rect.width,
    height,
    rect.depth,
    baseCenter,
    materials.stoneSide,
  );
  body.parent = root;
  body.receiveShadows = true;
  shadowCasters.push(body);

  const capInset = Math.min(0.85, Math.min(rect.width, rect.depth) * 0.08);
  const capHeight = 0.48;
  const cap = createBox(
    BABYLON,
    scene,
    "babylon-los-cap-" + (obstacle.id || index),
    Math.max(0.5, rect.width - capInset),
    capHeight,
    Math.max(0.5, rect.depth - capInset),
    {
      x: rect.center.x,
      y: height + capHeight / 2,
      z: rect.center.z,
    },
    materials.stoneTop,
  );
  cap.parent = root;
  cap.receiveShadows = true;
  shadowCasters.push(cap);

  const lowerBandHeight = 0.52;
  const lowerBand = createBox(
    BABYLON,
    scene,
    "babylon-los-base-" + (obstacle.id || index),
    rect.width,
    lowerBandHeight,
    rect.depth,
    {
      x: rect.center.x,
      y: lowerBandHeight / 2,
      z: rect.center.z,
    },
    materials.stoneBase,
  );
  lowerBand.parent = root;
  lowerBand.receiveShadows = true;
  shadowCasters.push(lowerBand);
}

export function buildBabylonArenaGeometry(BABYLON, scene, arena, mapping) {
  const root = new BABYLON.TransformNode("babylon-arena-root", scene);
  const shadowCasters = [];

  const materials = {
    floor: material(BABYLON, scene, "mat-floor", "#5c3422", "#1b100c"),
    floorLift: material(BABYLON, scene, "mat-floor-lift", "#68402a", "#21150f"),
    seam: material(BABYLON, scene, "mat-floor-seam", "#2b1811", "#120b08"),
    seamSoft: material(BABYLON, scene, "mat-floor-seam-soft", "#3a2117", "#120b08"),
    stoneSide: material(BABYLON, scene, "mat-stone-side", "#4c2b20", "#1a100d"),
    stoneTop: material(BABYLON, scene, "mat-stone-top", "#76503a", "#2c1c14"),
    stoneBase: material(BABYLON, scene, "mat-stone-base", "#342018", "#140c09"),
    border: material(BABYLON, scene, "mat-border", "#3e251b", "#140d09"),
    borderCap: material(BABYLON, scene, "mat-border-cap", "#523124", "#1a100c"),
  };

  materials.seam.alpha = 0.82;
  materials.seamSoft.alpha = 0.32;

  const ground = addFloor(BABYLON, scene, arena, mapping, materials, root);
  addBorder(BABYLON, scene, arena, mapping, materials, root, shadowCasters);

  for (let index = 0; index < arena.obstacles.length; index += 1) {
    addObstacle(
      BABYLON,
      scene,
      arena.obstacles[index],
      index,
      mapping,
      materials,
      root,
      shadowCasters,
    );
  }

  return {
    root,
    ground,
    shadowCasters,
    dispose() {
      root.dispose(false, true);
      Object.values(materials).forEach(mat => mat?.dispose?.());
    },
  };
}
