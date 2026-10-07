import bpy, math, os, sys

args=sys.argv
try:
    sep=args.index("--"); output=os.path.abspath(args[sep+1])
except (ValueError,IndexError):
    raise SystemExit("Expected output GLB after --")
os.makedirs(os.path.dirname(output),exist_ok=True)
bpy.ops.object.select_all(action="SELECT"); bpy.ops.object.delete(use_global=False)

def mat(name,rgb,rough=0.88,metal=0.0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*rgb,1); m.roughness=rough; m.metallic=metal; return m
SKIN=mat("PVP_SKIN",(0.72,0.52,0.37),0.94); HAIR=mat("PVP_HAIR",(0.10,0.055,0.035),0.96)
PRIMARY=mat("PVP_PRIMARY",(0.52,0.22,0.17),0.90); SECONDARY=mat("PVP_SECONDARY",(0.19,0.15,0.13),0.93)
ACCENT=mat("PVP_ACCENT",(0.80,0.48,0.20),0.80); METAL=mat("PVP_METAL",(0.42,0.46,0.50),0.62,0.10)
DARK=mat("PVP_DARK",(0.055,0.045,0.040),0.98)

def flat(o):
    if o.type=="MESH":
        for p in o.data.polygons: p.use_smooth=False
    return o
def assign(o,m): o.data.materials.append(m); return o
def ico(name,loc,scale,m,sub=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub,radius=1,location=loc)
    o=bpy.context.object; o.name=name; o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); return flat(assign(o,m))
def cube(name,loc,dims,m,rot=(0,0,0),bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc,rotation=rot)
    o=bpy.context.object; o.name=name; o.dimensions=dims
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); assign(o,m)
    if bevel:
        mod=o.modifiers.new("b","BEVEL"); mod.width=bevel; mod.segments=1
        bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=mod.name)
    return flat(o)
def cyl(name,loc,radius,depth,m,rot=(0,0,0),verts=8):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=radius,depth=depth,location=loc,rotation=rot)
    o=bpy.context.object; o.name=name; return flat(assign(o,m))
def cone(name,loc,r1,r2,depth,m,rot=(0,0,0),verts=8):
    bpy.ops.mesh.primitive_cone_add(vertices=verts,radius1=r1,radius2=r2,depth=depth,location=loc,rotation=rot)
    o=bpy.context.object; o.name=name; return flat(assign(o,m))
def wedge(name,loc,dims,m,rot=(0,0,0),tip=0.72):
    x,y,z=dims[0]/2,dims[1]/2,dims[2]/2
    vs=[(-x,-y,-z),(x,-y,-z),(-x*tip,y,-z),(x*tip,y,-z),(-x,-y,z),(x,-y,z),(-x*tip,y,z),(x*tip,y,z)]
    fs=[(0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)]
    me=bpy.data.meshes.new(name+"_mesh"); me.from_pydata(vs,[],fs); me.update()
    o=bpy.data.objects.new(name,me); bpy.context.collection.objects.link(o); o.location=loc; o.rotation_euler=rot
    return flat(assign(o,m))

# Short planted legs with visible boots.
for side in (-1,1):
    x=side*0.20
    cyl("thigh_"+str(side),(x,0.02,0.53),0.145,0.42,PRIMARY,verts=8)
    wedge("boot_"+str(side),(x,-0.13,0.25),(0.30,0.46,0.24),DARK,rot=(0,0,math.radians(side*3)),tip=0.54)

cone("hips",(0,0,0.78),0.36,0.31,0.34,PRIMARY,verts=8)
cyl("belt",(0,0,0.88),0.41,0.13,ACCENT,verts=8)
wedge("tabard",(0,-0.275,0.64),(0.31,0.075,0.58),SECONDARY,rot=(math.radians(-4),0,0),tip=0.66)

# Broad chest with separate front armor.
wedge("torso",(0,0,1.18),(0.98,0.52,0.66),PRIMARY,tip=0.80)
wedge("breastplate",(0,-0.305,1.20),(0.63,0.085,0.48),METAL,tip=0.72)
cube("strap",(0,-0.357,1.20),(0.12,0.035,0.58),ACCENT,rot=(0,0,math.radians(25)),bevel=0.012)

# Detached head / face so it does not read as a capsule.
cyl("neck",(0,0,1.55),0.12,0.19,SKIN,verts=8)
ico("head",(0,-0.015,1.82),(0.30,0.28,0.34),SKIN,2)
wedge("jaw",(0,-0.245,1.72),(0.37,0.12,0.20),SKIN,tip=0.70)
cube("beard",(0,-0.318,1.67),(0.31,0.055,0.18),HAIR,bevel=0.022)
ico("hair_back",(0,0.105,1.94),(0.29,0.24,0.14),HAIR,1)
wedge("hair_front",(0,-0.18,1.99),(0.44,0.16,0.11),HAIR,tip=0.50)
for x in (-0.105,0.105): ico("eye",(x,-0.294,1.84),(0.032,0.020,0.033),DARK,1)

# Asymmetric WoW-inspired pauldrons.
ico("pauldron_left",(-0.61,0,1.45),(0.32,0.25,0.24),METAL,1)
ico("pauldron_right",(0.57,0,1.43),(0.26,0.22,0.20),METAL,1)
cone("spike_left",(-0.72,0,1.68),0.11,0,0.36,ACCENT,rot=(0,math.radians(-24),math.radians(8)),verts=6)
cone("spike_right",(0.64,0,1.61),0.08,0,0.25,ACCENT,rot=(0,math.radians(20),math.radians(-8)),verts=6)

# Arms and large hands separated from chest.
for side in (-1,1):
    sx=side
    cyl("upperarm_"+str(side),(sx*0.54,-0.01,1.20),0.13,0.44,PRIMARY,rot=(0,math.radians(sx*20),math.radians(sx*8)),verts=8)
    cyl("forearm_"+str(side),(sx*0.61,-0.09,0.95),0.12,0.37,METAL,rot=(math.radians(8),math.radians(sx*12),math.radians(sx*5)),verts=8)
    ico("hand_"+str(side),(sx*0.63,-0.13,0.72),(0.15,0.13,0.145),SKIN,1)

# Oversized 2H axe in arena plane for top-down readability.
cube("axe_handle",(0.50,-0.16,1.06),(0.11,1.52,0.11),DARK,rot=(0,0,math.radians(-34)),bevel=0.018)
wedge("axe_blade",(0.93,-0.66,1.08),(0.58,0.34,0.12),METAL,rot=(0,0,math.radians(-34)),tip=0.32)
wedge("axe_back",(0.75,-0.50,1.08),(0.31,0.23,0.105),ACCENT,rot=(0,0,math.radians(146)),tip=0.40)

bpy.ops.export_scene.gltf(filepath=output,export_format="GLB",export_animations=False)
if not os.path.exists(output): raise SystemExit("Export failed")
print("[pvp25d-warrior-v2] exported",output,os.path.getsize(output))
