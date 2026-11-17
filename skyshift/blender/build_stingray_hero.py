#!/usr/bin/env python3
"""SKYSHIFT 0.13.2 — reproducible Blender source for Stingray EVO Hero V1.

Run: blender --background --factory-startup --python skyshift/blender/build_stingray_hero.py -- --out skyshift/assets/ships/stingray-evo-hero-v1.glb

All procedural sculpting happens in REAL Blender through bpy. Output is an
editable .blend (optional) and a glTF 2.0 GLB with 17 named mesh sockets.
No photos/textures/bakes, physics meshes, lights, animation controllers or
third-party models. Model inspired by the project's provided Stingray concept:
swept manta wings, angular dorsal nacelles, a glossy black low teardrop canopy,
fine ice-blue/purple illuminations and nine tapered mechanical tail plates.

Author game space: X = right wing, Y = up, Z = aft (+Z); nose = -Z.
Blender space: X = right, Y = forward, Z = up. to_bl() handles conversion;
export_yup=True produces native glTF / Three.js Y-up coordinates.
"""
import bpy
import bmesh
import math
import sys
import argparse
from pathlib import Path

VERSION="0.13.2"
TAIL_COUNT=9
TAIL_LEN=.68
METAL="Storm Titanium"
WING="Violet Slate Wing Armor"
INLAY="Shadow Graphite"
GLASS="Smoked Canopy"
NACELLE="Engine Armor"
GLOW="Violet Emission"
ICE="Ice Blue Guide"
JOINT="Tail Plate Metal"


def vec(p):
    """Game-space (x, y, z) to Blender (x, -z, y)."""
    x,y,z=p
    return (x,-z,y)


def material(name,rgb,metallic=0,roughness=.35,emission=None,emission_power=0):
    m=bpy.data.materials.new(name)
    m.diffuse_color=(*rgb,1)
    m.use_nodes=True
    node=m.node_tree.nodes.get("Principled BSDF")
    node.inputs["Base Color"].default_value=(*rgb,1)
    node.inputs["Metallic"].default_value=metallic
    node.inputs["Roughness"].default_value=roughness
    if emission is not None:
        node.inputs["Emission Color"].default_value=(*emission,1)
        node.inputs["Emission Strength"].default_value=emission_power
    return m


def mesh(name,vertices,faces,mat,bevel=0,smooth=False):
    m=bpy.data.meshes.new(name)
    m.from_pydata([vec(p) for p in vertices],[],faces)
    m.update()
    o=bpy.data.objects.new(name,m)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(mat)
    # Triangulate intentionally: deterministic glTF triangle counts & normals.
    bm=bmesh.new()
    bm.from_mesh(m)
    bmesh.ops.recalc_face_normals(bm,faces=bm.faces)
    bmesh.ops.triangulate(bm,faces=bm.faces,quad_method="BEAUTY",ngon_method="BEAUTY")
    bm.to_mesh(m)
    bm.free()
    if bevel:
        mod=o.modifiers.new("Carefully broken armor edges","BEVEL")
        mod.width=bevel
        mod.segments=2
        mod.affect="EDGES"
        mod.limit_method="ANGLE"
        mod.angle_limit=math.radians(32)
        bpy.context.view_layer.objects.active=o
        o.select_set(True)
        bpy.ops.object.modifier_apply(modifier=mod.name)
        o.select_set(False)
    if smooth:
        for p in o.data.polygons:p.use_smooth=True
    o["skyshift_model_version"]=VERSION
    o["skyshift_original_design"]=True
    return o


def polygon_shell(name,path,mat,top=.24,bottom=-.02,bevel=.018):
    # Concave hard-surface wing from a hand-authored, deliberate manta contour.
    # The trailing edge is scalloped; the leading edge is one continuous sweep.
    n=len(path)
    verts=[]
    for y in [top,bottom]:
        for x,z in path:
            dome=.055*(1-min(abs(x)/3.28,1))
            verts.append((x,y+dome,z))
    # Mirroring flips polygon winding. Keep BOTH wing top surfaces up-facing,
    # otherwise one wing can disappear under glTF backface culling.
    signed_area=sum(path[i][0]*path[(i+1)%n][1]-
                    path[(i+1)%n][0]*path[i][1] for i in range(n))
    top=list(range(n)) if signed_area<0 else list(range(n-1,-1,-1))
    faces=[tuple(top),tuple(i+n for i in reversed(top))]
    faces.extend([(k,(k+1)%n,(k+1)%n+n,k+n) for k in range(n)])
    return mesh(name,verts,faces,mat,bevel)


def loft(name,stations,mat,sides=12,bevel=0):
    # (Z, half width, center Y, top radius, underbody radius)
    verts=[]
    for z,width,y,top,under in stations:
        for k in range(sides):
            t=2*math.pi*k/sides
            x=math.sin(t)*width
            height=top*math.cos(t) if math.cos(t)>0 else under*math.cos(t)
            verts.append((x,y+height,z))
    faces=[]
    for j in range(len(stations)-1):
        for k in range(sides):
            a=j*sides+k;b=j*sides+(k+1)%sides
            c=b+sides;d=a+sides
            faces.append((a,b,c,d))
    faces.append(tuple(range(sides-1,-1,-1)))
    faces.append(tuple(range((len(stations)-1)*sides,len(stations)*sides)))
    return mesh(name,verts,faces,mat,bevel,smooth=False)


def ribbon(name,waypoints,width,mat,y_raise=.025):
    # Flat surface-inlaid emissive stripe, 2 triangles per segment.
    verts=[];faces=[]
    for i,(x,y,z) in enumerate(waypoints):
        p=waypoints[max(0,i-1)]
        q=waypoints[min(len(waypoints)-1,i+1)]
        dx=q[0]-p[0];dz=q[2]-p[2]
        inv=1/max(.00001,math.hypot(dx,dz))
        nx=-dz*inv;nz=dx*inv
        verts.extend([(x+nx*width*.5,y+y_raise,z+nz*width*.5),
                      (x-nx*width*.5,y+y_raise,z-nz*width*.5)])
        if i:
            a=2*(i-1);b=2*i
            faces.append((a,a+1,b+1,b))
    return mesh(name,verts,faces,mat)


def cylinder(name,cx,cy,za,zb,r1,r2,mat,segments=16):
    verts=[];faces=[]
    for z,r in [(za,r1),(zb,r2)]:
        for k in range(segments):
            th=2*math.pi*k/segments
            verts.append((cx+r*math.cos(th),cy+r*math.sin(th),z))
    for k in range(segments):
        n=(k+1)%segments
        faces.append((k,n,n+segments,k+segments))
    faces.append(tuple(range(segments-1,-1,-1)))
    faces.append(tuple(range(segments,2*segments)))
    return mesh(name,verts,faces,mat,bevel=.016)


def panel(name,coords,mat):
    # Black vent/armor recesses defined as real 3D geometry, not an image.
    pts=[(x,y,z) for x,y,z in coords]
    return mesh(name,pts,[tuple(range(len(pts)))],mat)


def tail_plate(idx,mat):
    progress=idx/8
    root=.315-.205*progress
    tip=max(.082,root-.024)
    length=TAIL_LEN*.91
    top=.210-.080*progress
    # The nine plates are authored in THEIR OWN joint-local coordinate.
    # Parent dynamically in Three.js to the original nine-spring joint chain.
    contour=[(-1,0),(-.83,.56),(0,1),(.83,.56),
             (1,0),(.75,-.35),(0,-.55),(-.75,-.35)]
    verts=[]
    for z,w,t in [(0,root,top),(length,tip,top*.70)]:
        verts.extend([(x*w,y*t,z) for x,y in contour])
    faces=[]
    sides=len(contour)
    for k in range(sides):
        n=(k+1)%sides
        faces.append((k,n,n+sides,k+sides))
    faces.extend([tuple(range(sides-1,-1,-1)),
                  tuple(range(sides,2*sides))])
    o=mesh("Hero_Tail_Plate_"+str(idx+1).zfill(2),verts,faces,mat,bevel=.014)
    o["skyshift_attach_to_joint"]=str(idx+1).zfill(2)
    o["skyshift_rest_local_origin"]=True
    return o


def make_hero():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    mats={}
    mats["metal"]=material(METAL,(.24,.27,.40),.82,.30)
    mats["wing"]=material(WING,(.23,.25,.40),.76,.32)
    mats["dark"]=material(INLAY,(.022,.032,.071),.55,.40)
    mats["glass"]=material(GLASS,(.017,.026,.069),.33,.15,
                           (.013,.044,.100),.17)
    mats["engine"]=material(NACELLE,(.10,.12,.21),.87,.27)
    mats["violet"]=material(GLOW,(.57,.21,.87),.15,.28,
                           (.72,.23,1.0),2.4)
    mats["ice"]=material(ICE,(.49,.87,1.0),.14,.28,
                        (.68,.94,1.0),2.5)
    mats["tail"]=material(JOINT,(.26,.29,.42),.83,.30)

    loft("Hero_Hull_Spine",[
        (-2.78,.044,.00,.03,.025),(-2.38,.22,.06,.13,.14),
        (-1.95,.41,.10,.22,.17),(-1.32,.55,.11,.27,.18),
        (-.70,.64,.10,.27,.19),(-.15,.63,.09,.23,.18),
        (.56,.50,.07,.20,.17),(1.10,.41,.055,.16,.15),
        (1.52,.29,.05,.11,.12)
    ],mats["metal"],16,.02)

    outline=[
        (.43,-2.06),(.85,-2.17),(1.19,-2.04),(1.57,-1.82),
        (2.13,-1.49),(2.57,-1.08),(3.04,-.58),(3.29,-.21),
        (3.28,.01),(3.05,.27),(2.74,.53),(2.50,.83),
        (2.21,1.26),(1.92,2.32),(1.61,2.47),
        (1.42,1.79),(1.22,1.10),(.93,.70),(.45,.34)
    ]
    for side,label in [(-1,"L"),(1,"R")]:
        path=[(side*x,z) for x,z in outline]
        polygon_shell("Hero_Wing_"+label,path,mats["wing"],top=.25,bottom=-.025)
        # Radial-vent cutouts and recessed graphite channels on each wing.
        panel("Hero_Detail_Vent_1_"+label,[
            (side*.94,.323,-1.00),(side*1.32,.310,-.79),
            (side*1.76,.294,-.33),(side*1.24,.313,-.52)
        ],mats["dark"])
        panel("Hero_Detail_Vent_2_"+label,[
            (side*1.80,.289,.18),(side*2.29,.274,.37),
            (side*2.07,.279,.67),(side*1.53,.302,.49)
        ],mats["dark"])
        # Continuous violet leading-edge glow; only ~1.7 cm wide.
        edge=[(side*x,.258+.055*(1-min(x/3.28,1)),z)
              for x,z in outline[:10]]
        ribbon("Hero_Edge_"+label,edge,.025,mats["violet"],.025)
        # Cyan accents are part of the actual wing geometry, no alpha decals.
        ribbon("Hero_Detail_ICE_"+label,[
            (side*.90,.326,.73),(side*1.38,.319,.61),
            (side*2.14,.299,.40),(side*2.69,.274,.28)
        ],.042,mats["ice"],.021)
        # Two broad twin engines match current gameplay socket +/-1.99m.
        cylinder("Hero_Engine_"+label,side*1.99,.060,1.48,2.37,
                 .28,.285,mats["engine"],16)
        # Lens highlight as a small emissive ring, not a particle emitter.
        cylinder("Hero_Detail_Engine_Core_"+label,side*1.99,.060,
                 2.371,2.41,.165,.16,mats["violet"],14)

    loft("Hero_Canopy",[
        (-2.17,.05,.30,.06,.021),(-1.97,.20,.34,.24,.04),
        (-1.52,.30,.36,.36,.05),(-.96,.34,.37,.34,.05),
        (-.41,.33,.36,.26,.05),(.07,.23,.33,.16,.04),
        (.38,.075,.30,.06,.020)
    ],mats["glass"],14,.012)

    # Symmetric two-piece canopy highlights, engine fins and a lit keel.
    for side,label in [(-1,"L"),(1,"R")]:
        ribbon("Hero_Detail_Canopy_"+label,[
            (side*.17,.52,-1.91),(side*.29,.695,-1.52),
            (side*.34,.69,-.91),(side*.29,.59,-.38)
        ],.021,mats["ice"],.018)
        panel("Hero_Detail_Engine_Fin_"+label,[
            (side*1.65,.22,1.18),(side*1.94,.29,1.54),
            (side*2.10,.19,2.09),(side*1.76,.22,1.83)
        ],mats["metal"])
    ribbon("Hero_Detail_Keel",[
        (0,.345,.79),(0,.325,1.17),(0,.258,1.46)
    ],.026,mats["violet"],.019)
    for idx in range(TAIL_COUNT):tail_plate(idx,mats["tail"])

    # Contract-critical restrictions: GLB is render-only, no collisions,
    # physics attributes, lights, textures, armatures, or particle rigs.
    meshes=[obj for obj in bpy.context.scene.objects if obj.type=="MESH"]
    for obj in meshes:
        if obj.data.uv_layers:obj.data.uv_layers.clear()
        obj["skyshift_no_collider"]=True
    assert all(obj.type=="MESH" for obj in bpy.context.scene.objects)
    assert len([o for o in meshes if o.name.startswith("Hero_Tail_Plate_")])==9
    assert len(meshes)<=34,("draw-call budget",len(meshes))
    total=sum(len(o.data.polygons) for o in meshes)
    assert total<=8000,("triangle budget",total)
    return meshes,total


def main():
    if bpy.app.version<(4,0,0):
        raise RuntimeError("Blender 4.0+ is required for this hero asset")
    args=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
    parser=argparse.ArgumentParser()
    parser.add_argument("--out",default="skyshift/assets/ships/stingray-evo-hero-v1.glb")
    parser.add_argument("--save-blend",default="")
    p=parser.parse_args(args)
    meshes,triangles=make_hero()
    output=Path(p.out).resolve()
    output.parent.mkdir(parents=True,exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        export_yup=True,
        export_extras=True,
        export_materials="EXPORT",
        use_selection=False,
    )
    if p.save_blend:
        target=Path(p.save_blend).resolve()
        target.parent.mkdir(parents=True,exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=str(target))
    size=output.stat().st_size
    if size>700000:
        raise RuntimeError("GLB too large for 4 GB mobile target: "+str(size))
    print(f"SKYSHIFT HERO BUILD OK: {len(meshes)} nodes, "+
          f"{triangles} triangles, {size} bytes, {output}")


if __name__=="__main__":main()
