import bpy
import math
import os
import sys

def log(msg):
    print("[pvp25d-minihero] " + msg)

args=sys.argv
try:
    sep=args.index("--")
    variant=args[sep+1].strip().lower()
    output=os.path.abspath(args[sep+2])
except (ValueError,IndexError):
    raise SystemExit("Expected: -- <caster|rogue|warrior> <output.glb>")

if variant not in {"caster","rogue","warrior"}:
    raise SystemExit("Unknown variant: "+variant)

os.makedirs(os.path.dirname(output),exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

def make_mat(name,rgb,rough=0.88,metal=0.0):
    m=bpy.data.materials.new(name)
    m.diffuse_color=(rgb[0],rgb[1],rgb[2],1.0)
    m.roughness=rough
    m.metallic=metal
    return m

SKIN=make_mat("PVP_SKIN",(0.76,0.58,0.43),0.93)
HAIR=make_mat("PVP_HAIR",(0.12,0.075,0.05),0.96)
PRIMARY=make_mat("PVP_PRIMARY",(0.50,0.50,0.50),0.90)
SECONDARY=make_mat("PVP_SECONDARY",(0.30,0.30,0.30),0.88)
ACCENT=make_mat("PVP_ACCENT",(0.78,0.64,0.32),0.82)
METAL=make_mat("PVP_METAL",(0.47,0.50,0.54),0.62,0.10)
DARK=make_mat("PVP_DARK",(0.10,0.09,0.085),0.95)

def flat(obj):
    if obj.type=="MESH":
        for p in obj.data.polygons:
            p.use_smooth=False
    return obj

def assign(obj,mat):
    obj.data.materials.append(mat)
    return obj

def ico(name,loc,scale,mat,sub=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub,radius=1.0,location=loc)
    o=bpy.context.object
    o.name=name
    o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    assign(o,mat)
    return flat(o)

def cube(name,loc,dims,mat,rot=(0,0,0),bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1.0,location=loc,rotation=rot)
    o=bpy.context.object
    o.name=name
    o.dimensions=dims
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    assign(o,mat)
    if bevel>0:
        mod=o.modifiers.new("tiny_bevel","BEVEL")
        mod.width=bevel
        mod.segments=1
        mod.affect="EDGES"
        bpy.context.view_layer.objects.active=o
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return flat(o)

def cyl(name,loc,radius,depth,mat,rot=(0,0,0),verts=8):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=radius,depth=depth,location=loc,rotation=rot)
    o=bpy.context.object
    o.name=name
    assign(o,mat)
    return flat(o)

def cone(name,loc,r1,r2,depth,mat,rot=(0,0,0),verts=8):
    bpy.ops.mesh.primitive_cone_add(vertices=verts,radius1=r1,radius2=r2,depth=depth,location=loc,rotation=rot)
    o=bpy.context.object
    o.name=name
    assign(o,mat)
    return flat(o)

def hair_and_face(head_z,head_s):
    # Hair uses several chunks instead of a hat/helmet so the face remains visible.
    ico("hair_back",(0,0.085,head_z+0.20*head_s),(0.31*head_s,0.27*head_s,0.18*head_s),HAIR,1)
    ico("hair_left",(-0.20*head_s,-0.005,head_z+0.23*head_s),(0.15*head_s,0.18*head_s,0.16*head_s),HAIR,1)
    ico("hair_right",(0.19*head_s,0.0,head_z+0.25*head_s),(0.14*head_s,0.18*head_s,0.15*head_s),HAIR,1)
    # Forward is -Y in source space.
    eye_z=head_z+0.055*head_s
    for x in (-0.115*head_s,0.115*head_s):
        ico("eye", (x,-0.315*head_s,eye_z),(0.035*head_s,0.026*head_s,0.040*head_s),DARK,1)
    cone("nose",(0,-0.335*head_s,head_z-0.005*head_s),0.035*head_s,0.015*head_s,0.09*head_s,SKIN,rot=(math.radians(90),0,0),verts=6)

def limb(name,side,z,upper_w,lower_w,mat,arm=True):
    x=side*(0.33 if arm else 0.18)
    if arm:
        cyl(name+"_upper",(x,-0.01,z),upper_w,0.48,mat,rot=(0,math.radians(side*10),0),verts=8)
        ico(name+"_hand",(x+side*0.04,-0.02,z-0.31),(0.115,0.10,0.115),SKIN,1)
    else:
        cyl(name+"_leg",(x,0,z),lower_w,0.42,mat,verts=8)
        cube(name+"_boot",(x,-0.05,z-0.27),(0.22,0.34,0.17),DARK,bevel=0.035)

def staff():
    # Slightly tilted so it reads from the high 2.5D camera.
    cyl("staff_pole",(0.54,-0.01,1.02),0.045,1.65,METAL,rot=(math.radians(-9),0,math.radians(-4)),verts=8)
    ico("staff_orb",(0.39,-0.13,1.86),(0.16,0.16,0.16),ACCENT,1)
    ico("staff_gem",(0.39,-0.16,1.86),(0.075,0.075,0.075),PRIMARY,1)

def dagger(side):
    x=side*0.47
    # Horizontal blade is deliberately oversized for arena readability.
    cube("dagger_blade",(x,-0.20,0.92),(0.11,0.56,0.055),METAL,rot=(0,0,math.radians(side*18)),bevel=0.025)
    cube("dagger_grip",(x,-0.47,0.92),(0.11,0.18,0.09),DARK,rot=(0,0,math.radians(side*18)),bevel=0.018)
    cube("dagger_guard",(x,-0.37,0.92),(0.26,0.07,0.07),ACCENT,rot=(0,0,math.radians(side*18)),bevel=0.018)

def greatsword():
    # Large diagonal 2H silhouette; blade lies mostly in the arena plane.
    cube("greatsword_blade",(0.50,-0.16,1.04),(0.20,1.08,0.08),METAL,rot=(0,0,math.radians(-24)),bevel=0.03)
    cube("greatsword_grip",(0.22,0.30,1.04),(0.13,0.34,0.11),DARK,rot=(0,0,math.radians(-24)),bevel=0.02)
    cube("greatsword_guard",(0.31,0.16,1.04),(0.44,0.09,0.10),ACCENT,rot=(0,0,math.radians(-24)),bevel=0.02)

# Shared chibi proportions: short legs, short torso, large readable head.
if variant=="caster":
    head_z=1.56
    head_s=1.0
    head_scale=(0.37,0.34,0.42)
    ico("head",(0,0,head_z),head_scale,SKIN,2)
    hair_and_face(head_z,head_s)
    cone("robe",(0,0,0.67),0.46,0.27,1.08,PRIMARY,verts=8)
    cone("upper_robe",(0,0,1.14),0.31,0.35,0.48,PRIMARY,verts=8)
    cyl("mantle",(0,0,1.30),0.42,0.14,SECONDARY,verts=8)
    cube("tabard",(0,-0.32,0.92),(0.22,0.07,0.72),SECONDARY,bevel=0.025)
    for side in (-1,1):
        ico("caster_shoulder",(side*0.37,0,1.30),(0.16,0.13,0.12),SECONDARY,1)
        cyl("caster_arm",(side*0.40,0,1.02),0.10,0.48,PRIMARY,rot=(0,math.radians(side*8),0),verts=8)
        ico("caster_hand",(side*0.43,-0.02,0.76),(0.12,0.10,0.115),SKIN,1)
    staff()

elif variant=="rogue":
    head_z=1.48
    head_s=0.96
    ico("head",(0,0,head_z),(0.34,0.31,0.38),SKIN,2)
    hair_and_face(head_z,head_s)
    cone("rogue_torso",(0,0,1.02),0.31,0.27,0.58,SECONDARY,verts=8)
    cyl("rogue_belt",(0,0,0.76),0.32,0.12,ACCENT,verts=8)
    cube("rogue_scarf",(0,-0.30,1.29),(0.46,0.08,0.13),PRIMARY,rot=(0,0,math.radians(-7)),bevel=0.025)
    cube("rogue_scarf_tail",(-0.20,0.16,1.05),(0.14,0.46,0.08),PRIMARY,rot=(0,0,math.radians(-30)),bevel=0.02)
    limb("rogue_arm_l",-1,1.05,0.09,0.0,SECONDARY,True)
    limb("rogue_arm_r",1,1.05,0.09,0.0,SECONDARY,True)
    limb("rogue_leg_l",-1,0.50,0.0,0.105,SECONDARY,False)
    limb("rogue_leg_r",1,0.50,0.0,0.105,SECONDARY,False)
    dagger(-1); dagger(1)

elif variant=="warrior":
    head_z=1.54
    head_s=0.94
    ico("head",(0,0,head_z),(0.33,0.30,0.37),SKIN,2)
    hair_and_face(head_z,head_s)
    cube("warrior_chest",(0,0,1.04),(0.82,0.46,0.62),PRIMARY,bevel=0.10)
    cube("warrior_breastplate",(0,-0.27,1.05),(0.52,0.08,0.43),METAL,bevel=0.045)
    cone("warrior_waist",(0,0,0.67),0.35,0.30,0.42,PRIMARY,verts=8)
    cyl("warrior_belt",(0,0,0.77),0.37,0.12,ACCENT,verts=8)
    for side in (-1,1):
        ico("warrior_pauldron",(side*0.53,0,1.31),(0.26,0.22,0.20),METAL,1)
        cyl("warrior_arm",(side*0.48,0,0.98),0.115,0.48,PRIMARY,rot=(0,math.radians(side*8),0),verts=8)
        ico("warrior_hand",(side*0.50,-0.02,0.71),(0.135,0.115,0.13),SKIN,1)
        limb("warrior_leg_"+("l" if side<0 else "r"),side,0.48,0.0,0.125,PRIMARY,False)
    greatsword()

# Give every mesh a tiny bevel-like faceted look where possible and keep flat shading.
for obj in bpy.context.scene.objects:
    if obj.type=="MESH":
        flat(obj)

bpy.ops.export_scene.gltf(
    filepath=output,
    export_format="GLB",
    export_animations=False,
)

if not os.path.exists(output):
    raise SystemExit("GLB export failed: "+output)

log("Exported "+variant+" -> "+output+" ("+str(os.path.getsize(output))+" bytes)")
