# SKYSHIFT 0.23.0 — Physical Material & Lighting Rebuild
## Pass 1: Physical Material Reference Gallery

This pass is a focused test of a premium metallic surface response, not a promise of an identical reproduction of the concept image.

The current tunnel was changed to sun-isolated MeshBasicMaterial in 0.21.2 to eliminate unwanted white solar glare. We retain that isolation and use physically inspired GGX neon-only shading rather than restoring exterior PBR light.

**Study stretch:** original tunnel metres 78–304, with soft transitions at both ends. The remainder remains the previous 0.22.0.4 surface, providing a controlled baseline.

**Finish:** graphite panel faces, satin titanium, raised edges, dark reveals and unique roughness for panels, vault, ribs and conduits. The high tier uses two world-frame light vectors derived from the original banked track. The 4 GB tier receives a cheaper no-extra-attribute implementation. The nine-stage native neon color wave remains the light color source. Near-field micro-brush detail fades out with distance.

**No physical changes:** no new road, ship, rail, collider, camera, steering, GRIP, flight speed, extra dynamic light or render pass. Exterior sunlight containment remains.

**Compare:** /skyshift/?v=0.23.0 and /skyshift/?v=0.23.0&physicalMaterial=classic.
Same-frame diagnostics: ?physicalMaterialSmoke=1&physicalMaterialFrameProof=1. Chrome WebGL QA checks cyan, gold, jade and 4GB, as well as road clarity/white solar light. A green build and a real visual comparison are required before artistic approval.

**Next:** Pass 2 should only expand the lighting response once Pass 1 looks visibly more premium in actual gameplay.
