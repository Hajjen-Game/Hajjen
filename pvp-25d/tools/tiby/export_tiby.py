import bpy
import math
import os
import sys
from mathutils import Vector

def log(message):
    print("[tiby-export] " + message)

args = sys.argv
try:
    separator = args.index("--")
    variant = args[separator + 1].strip().lower()
    output_path = args[separator + 2]
except (ValueError, IndexError):
    raise SystemExit("Expected: -- <base|caster|rogue|warrior> <output.glb>")

if variant not in {"base", "caster", "rogue", "warrior"}:
    raise SystemExit("Unknown Tiby variant: " + variant)

output_path = os.path.abspath(output_path)
os.makedirs(os.path.dirname(output_path), exist_ok=True)

# Keep the neutral CC0 rig/body, but remove source hair and editor-only objects.
removed = []
for obj in list(bpy.data.objects):
    name = obj.name.lower()
    if "hair" in name:
        removed.append(obj.name)
        bpy.data.objects.remove(obj, do_unlink=True)
        continue
    if obj.type in {"CAMERA", "LIGHT"}:
        bpy.data.objects.remove(obj, do_unlink=True)

for obj in bpy.context.scene.objects:
    obj.hide_viewport = False
    obj.hide_render = False

mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
log("Variant: " + variant)
log("Meshes: " + ", ".join(obj.name for obj in mesh_objects))
log("Armatures: " + ", ".join(obj.name for obj in armatures))
if armatures:
    log("Bones: " + ", ".join(b.name for b in armatures[0].data.bones))

def scene_bounds():
    minimum = Vector((float("inf"), float("inf"), float("inf")))
    maximum = Vector((float("-inf"), float("-inf"), float("-inf")))
    found = False
    for obj in mesh_objects:
        for corner in obj.bound_box:
            world = obj.matrix_world @ Vector(corner)
            minimum.x = min(minimum.x, world.x)
            minimum.y = min(minimum.y, world.y)
            minimum.z = min(minimum.z, world.z)
            maximum.x = max(maximum.x, world.x)
            maximum.y = max(maximum.y, world.y)
            maximum.z = max(maximum.z, world.z)
            found = True
    if not found:
        raise SystemExit("Tiby source contained no mesh bounds")
    return minimum, maximum

minimum, maximum = scene_bounds()
height = maximum.z - minimum.z
center_x = (minimum.x + maximum.x) * 0.5
center_y = (minimum.y + maximum.y) * 0.5
log("Bounds min=" + str(tuple(round(v, 4) for v in minimum))
    + " max=" + str(tuple(round(v, 4) for v in maximum))
    + " height=" + str(round(height, 4)))

def smoothstep(edge0, edge1, x):
    if edge1 == edge0:
        return 0.0
    t = max(0.0, min(1.0, (x - edge0) / (edge1 - edge0)))
    return t * t * (3.0 - 2.0 * t)

def reshape_source():
    if variant == "base":
        return

    torso_width = {
        "caster": 0.92,
        "rogue": 0.84,
        "warrior": 1.18,
    }[variant]
    torso_depth = {
        "caster": 0.96,
        "rogue": 0.90,
        "warrior": 1.08,
    }[variant]
    head_scale = {
        "caster": 0.84,
        "rogue": 0.82,
        "warrior": 0.80,
    }[variant]

    for obj in mesh_objects:
        inverse = obj.matrix_world.inverted()
        for vertex in obj.data.vertices:
            world = obj.matrix_world @ vertex.co
            t = (world.z - minimum.z) / max(height, 1e-6)

            # Reduce the large Tiby head smoothly instead of creating a seam
            # at the neck. This is the biggest readability change for PvP 2.5D.
            head_weight = smoothstep(0.69, 0.84, t)
            head_factor = 1.0 + (head_scale - 1.0) * head_weight
            world.x = center_x + (world.x - center_x) * head_factor
            world.y = center_y + (world.y - center_y) * head_factor

            # Shape the torso/shoulder mass differently per archetype.
            up = smoothstep(0.25, 0.42, t)
            down = 1.0 - smoothstep(0.68, 0.78, t)
            torso_weight = up * down
            world.x = center_x + (world.x - center_x) * (
                1.0 + (torso_width - 1.0) * torso_weight
            )
            world.y = center_y + (world.y - center_y) * (
                1.0 + (torso_depth - 1.0) * torso_weight
            )

            vertex.co = inverse @ world

        obj.data.update()

def make_material(name, rgb):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (rgb[0], rgb[1], rgb[2], 1.0)
    material.roughness = 0.88
    return material

primary_mat = make_material("PVP_GEAR_PRIMARY", (0.56, 0.58, 0.60))
secondary_mat = make_material("PVP_GEAR_SECONDARY", (0.28, 0.30, 0.33))

def tag_object(obj, name, material):
    obj.name = name
    if obj.data and hasattr(obj.data, "materials"):
        obj.data.materials.clear()
        obj.data.materials.append(material)
    return obj

def add_cone(name, z, radius_bottom, radius_top, depth, material, vertices=8):
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius_bottom,
        radius2=radius_top,
        depth=depth,
        location=(center_x, center_y, z),
    )
    return tag_object(bpy.context.object, name, material)

def add_cube(name, loc, scale, material):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
    obj = tag_object(bpy.context.object, name, material)
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return obj

def add_ico(name, loc, scale, material):
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=1,
        radius=1.0,
        location=loc,
    )
    obj = tag_object(bpy.context.object, name, material)
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return obj

def build_caster():
    add_cone(
        "PVP_GEAR_PRIMARY_ROBE",
        minimum.z + height * 0.29,
        height * 0.235,
        height * 0.125,
        height * 0.50,
        primary_mat,
    )
    add_cone(
        "PVP_GEAR_PRIMARY_TORSO",
        minimum.z + height * 0.55,
        height * 0.155,
        height * 0.145,
        height * 0.30,
        primary_mat,
    )
    add_cone(
        "PVP_GEAR_SECONDARY_MANTLE",
        minimum.z + height * 0.68,
        height * 0.205,
        height * 0.185,
        height * 0.075,
        secondary_mat,
    )
    for side in (-1, 1):
        add_ico(
            "PVP_GEAR_SECONDARY_COLLAR_" + ("L" if side < 0 else "R"),
            (
                center_x + side * height * 0.17,
                center_y,
                minimum.z + height * 0.69,
            ),
            (height * 0.10, height * 0.075, height * 0.065),
            secondary_mat,
        )

def build_rogue():
    add_cone(
        "PVP_GEAR_SECONDARY_VEST",
        minimum.z + height * 0.54,
        height * 0.145,
        height * 0.125,
        height * 0.28,
        secondary_mat,
    )
    add_cone(
        "PVP_GEAR_PRIMARY_BELT",
        minimum.z + height * 0.43,
        height * 0.155,
        height * 0.155,
        height * 0.055,
        primary_mat,
    )
    for side in (-1, 1):
        add_ico(
            "PVP_GEAR_PRIMARY_SHOULDER_" + ("L" if side < 0 else "R"),
            (
                center_x + side * height * 0.145,
                center_y,
                minimum.z + height * 0.67,
            ),
            (height * 0.075, height * 0.060, height * 0.065),
            primary_mat,
        )
    scarf = add_cube(
        "PVP_GEAR_PRIMARY_SCARF",
        (center_x, center_y - height * 0.11, minimum.z + height * 0.69),
        (height * 0.28, height * 0.055, height * 0.07),
        primary_mat,
    )
    scarf.rotation_euler[2] = math.radians(-7)

def build_warrior():
    add_cube(
        "PVP_GEAR_PRIMARY_CHEST",
        (center_x, center_y, minimum.z + height * 0.57),
        (height * 0.48, height * 0.29, height * 0.31),
        primary_mat,
    )
    add_cube(
        "PVP_GEAR_SECONDARY_BREASTPLATE",
        (
            center_x,
            center_y - height * 0.155,
            minimum.z + height * 0.58,
        ),
        (height * 0.31, height * 0.045, height * 0.24),
        secondary_mat,
    )
    add_cone(
        "PVP_GEAR_PRIMARY_WAIST",
        minimum.z + height * 0.36,
        height * 0.205,
        height * 0.18,
        height * 0.22,
        primary_mat,
    )
    for side in (-1, 1):
        add_ico(
            "PVP_GEAR_SECONDARY_PAULDRON_" + ("L" if side < 0 else "R"),
            (
                center_x + side * height * 0.275,
                center_y,
                minimum.z + height * 0.70,
            ),
            (height * 0.165, height * 0.125, height * 0.115),
            secondary_mat,
        )

reshape_source()
if variant == "caster":
    build_caster()
elif variant == "rogue":
    build_rogue()
elif variant == "warrior":
    build_warrior()

bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format="GLB",
    export_animations=True,
)

if not os.path.exists(output_path):
    raise SystemExit("GLB export did not produce " + output_path)

log(
    "Exported "
    + variant
    + " -> "
    + output_path
    + " ("
    + str(os.path.getsize(output_path))
    + " bytes)"
)
