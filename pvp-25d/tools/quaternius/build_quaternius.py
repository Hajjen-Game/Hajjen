# build-trigger: quaternius-v1
import bpy
import math
import os
import sys
from mathutils import Vector

def log(message):
    print("[quaternius-pvp25d] " + message)

args = sys.argv
try:
    sep = args.index("--")
    variant = args[sep + 1].strip().lower()
    source_path = os.path.abspath(args[sep + 2])
    output_path = os.path.abspath(args[sep + 3])
except (ValueError, IndexError):
    raise SystemExit("Expected: -- <caster|rogue|warrior> <source.gltf> <output.glb>")

if variant not in {"caster", "rogue", "warrior"}:
    raise SystemExit("Unknown variant: " + variant)

os.makedirs(os.path.dirname(output_path), exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

log("Importing " + source_path)
bpy.ops.import_scene.gltf(filepath=source_path)

armatures = [o for o in bpy.context.scene.objects if o.type == "ARMATURE"]
if not armatures:
    raise SystemExit("No armature found in Quaternius source")
armature = armatures[0]

# Remove the large top-down hood and the asymmetric source pauldron. PvP 2.5D
# supplies its own class-readable head/shoulder shapes instead.
for obj in list(bpy.context.scene.objects):
    lower = obj.name.lower()
    if "head_hood" in lower or "acc_pauldron" in lower:
        bpy.data.objects.remove(obj, do_unlink=True)

mesh_objects = [o for o in bpy.context.scene.objects if o.type == "MESH"]
if not mesh_objects:
    raise SystemExit("No mesh objects found after import")

def bounds(objects):
    mn = Vector((float("inf"), float("inf"), float("inf")))
    mx = Vector((float("-inf"), float("-inf"), float("-inf")))
    for obj in objects:
        for corner in obj.bound_box:
            p = obj.matrix_world @ Vector(corner)
            mn.x=min(mn.x,p.x); mn.y=min(mn.y,p.y); mn.z=min(mn.z,p.z)
            mx.x=max(mx.x,p.x); mx.y=max(mx.y,p.y); mx.z=max(mx.z,p.z)
    return mn,mx

mn,mx=bounds(mesh_objects)
height=max(mx.z-mn.z, 1e-6)
cx=(mn.x+mx.x)*0.5
cy=(mn.y+mx.y)*0.5
log("Imported height=" + str(round(height,4)))

def mat(name, rgb, rough=0.88):
    m=bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.diffuse_color=(rgb[0],rgb[1],rgb[2],1.0)
    m.roughness=rough
    m.metallic=0.0
    return m

skin=mat("PVP_SKIN",(0.76,0.58,0.43),0.92)
primary=mat("PVP_GEAR_PRIMARY",(0.52,0.48,0.42),0.90)
secondary=mat("PVP_GEAR_SECONDARY",(0.27,0.29,0.31),0.82)

# Replace giant texture atlases with compact flat materials. Skin primitives
# retain their own material so Babylon can keep skin and class gear separate.
for obj in mesh_objects:
    for idx, old in enumerate(list(obj.data.materials)):
        old_name=(old.name if old else "").lower()
        obj.data.materials[idx] = skin if "regular_male" in old_name else primary

def smoothstep(a,b,x):
    if a == b:
        return 0.0
    t=max(0.0,min(1.0,(x-a)/(b-a)))
    return t*t*(3.0-2.0*t)

# Shape the actual skinned outfit so the silhouettes differ before Babylon.
width={"caster":0.93,"rogue":0.84,"warrior":1.16}[variant]
depth={"caster":0.96,"rogue":0.90,"warrior":1.08}[variant]
for obj in mesh_objects:
    inv=obj.matrix_world.inverted()
    for v in obj.data.vertices:
        p=obj.matrix_world @ v.co
        t=(p.z-mn.z)/height
        torso=smoothstep(0.24,0.38,t)*(1.0-smoothstep(0.72,0.82,t))
        p.x=cx+(p.x-cx)*(1.0+(width-1.0)*torso)
        p.y=cy+(p.y-cy)*(1.0+(depth-1.0)*torso)
        v.co=inv @ p
    obj.data.update()

def parent_keep_world(obj, bone_name):
    if bone_name not in armature.pose.bones:
        obj.parent=armature
        return
    world=obj.matrix_world.copy()
    obj.parent=armature
    obj.parent_type="BONE"
    obj.parent_bone=bone_name
    obj.matrix_world=world

def ico(name, loc, scale, material, bone=None):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1.0, location=loc)
    o=bpy.context.object
    o.name=name
    o.scale=scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    if bone:
        parent_keep_world(o,bone)
    return o

def cube(name, loc, dims, material, bone=None, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
    o=bpy.context.object
    o.name=name
    o.dimensions=dims
    o.rotation_euler=rot
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    if bone:
        parent_keep_world(o,bone)
    return o

def cone(name, loc, r1, r2, depth_value, material, bone=None):
    bpy.ops.mesh.primitive_cone_add(
        vertices=8,
        radius1=r1,
        radius2=r2,
        depth=depth_value,
        location=loc,
    )
    o=bpy.context.object
    o.name=name
    o.data.materials.append(material)
    if bone:
        parent_keep_world(o,bone)
    return o

# Clean, hatless miniature head. It is intentionally smaller than Tiby's
# head and is bone-parented for later Quaternius animation-library work.
head_bone=armature.pose.bones.get("Head")
if head_bone:
    head_pos=armature.matrix_world @ head_bone.head
else:
    head_pos=Vector((cx,cy,mx.z-height*0.08))
head_radius={"caster":0.105,"rogue":0.098,"warrior":0.095}[variant]*height
ico(
    "PVP_SKIN_HEAD",
    (head_pos.x,head_pos.y,head_pos.z+head_radius*0.35),
    (head_radius*0.88,head_radius*0.88,head_radius),
    skin,
    "Head",
)

if variant == "caster":
    cone(
        "PVP_GEAR_PRIMARY_ROBE",
        (cx,cy,mn.z+height*0.28),
        height*0.21,height*0.125,height*0.46,
        primary,
        "pelvis",
    )
    cone(
        "PVP_GEAR_SECONDARY_MANTLE",
        (cx,cy,mn.z+height*0.66),
        height*0.185,height*0.17,height*0.075,
        secondary,
        "spine_03",
    )
    for side,bone in ((-1,"clavicle_l"),(1,"clavicle_r")):
        ico(
            "PVP_GEAR_SECONDARY_COLLAR_" + ("L" if side<0 else "R"),
            (cx+side*height*0.145,cy,mn.z+height*0.67),
            (height*0.075,height*0.060,height*0.055),
            secondary,
            bone,
        )

elif variant == "rogue":
    cube(
        "PVP_GEAR_SECONDARY_SCARF",
        (cx,cy-height*0.09,mn.z+height*0.69),
        (height*0.28,height*0.055,height*0.065),
        secondary,
        "neck_01",
        (0,0,math.radians(-7)),
    )
    cone(
        "PVP_GEAR_PRIMARY_BELT",
        (cx,cy,mn.z+height*0.43),
        height*0.145,height*0.145,height*0.055,
        primary,
        "pelvis",
    )

elif variant == "warrior":
    cube(
        "PVP_GEAR_PRIMARY_CHEST",
        (cx,cy,mn.z+height*0.58),
        (height*0.43,height*0.25,height*0.27),
        primary,
        "spine_02",
    )
    cube(
        "PVP_GEAR_SECONDARY_BREASTPLATE",
        (cx,cy-height*0.135,mn.z+height*0.59),
        (height*0.29,height*0.040,height*0.21),
        secondary,
        "spine_02",
    )
    for side,bone in ((-1,"clavicle_l"),(1,"clavicle_r")):
        ico(
            "PVP_GEAR_SECONDARY_PAULDRON_" + ("L" if side<0 else "R"),
            (cx+side*height*0.245,cy,mn.z+height*0.70),
            (height*0.135,height*0.105,height*0.095),
            secondary,
            bone,
        )

# Strip unused imported images/materials from the export.
for image in list(bpy.data.images):
    if image.users == 0:
        bpy.data.images.remove(image)

bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format="GLB",
    export_animations=True,
)

if not os.path.exists(output_path):
    raise SystemExit("Export failed: " + output_path)
log("Exported " + variant + " " + str(os.path.getsize(output_path)) + " bytes")
