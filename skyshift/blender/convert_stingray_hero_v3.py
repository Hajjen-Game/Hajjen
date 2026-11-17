#!/usr/bin/env python3
"""SKYSHIFT 0.13.4 — bring the game-ready Hero 3.0 into *actual Blender*.

Builds an editable .blend source from the checked-in reproducible sculpt,
preserves 17 named Three.js rig sockets and exports standard binary glTF 2.0.

Usage:
 blender --background --factory-startup \
  --python skyshift/blender/convert_stingray_hero_v3.py -- \
  --source skyshift/assets/ships/stingray-evo-hero-v3.gltf \
  --out skyshift/assets/ships/stingray-evo-hero-v3.glb \
  --blend skyshift/blender/build-output/stingray-evo-hero-v3.blend

The source asset has been hand-designed as a parametric 3D sculpt and is
fully editable in Blender afterward. No textures or external models are used.
"""
import argparse
import json
import sys
from pathlib import Path
import bpy

REQUIRED={
    "Hero_Hull_Spine","Hero_Wing_L","Hero_Wing_R","Hero_Canopy",
    "Hero_Engine_L","Hero_Engine_R","Hero_Edge_L","Hero_Edge_R",
    *("Hero_Tail_Plate_%02d"%i for i in range(1,10))
}


def main():
    params=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
    ap=argparse.ArgumentParser()
    ap.add_argument("--source",
                    default="skyshift/assets/ships/stingray-evo-hero-v3.gltf")
    ap.add_argument("--out",
                    default="skyshift/assets/ships/stingray-evo-hero-v3.glb")
    ap.add_argument("--blend",
                    default="skyshift/blender/build-output/stingray-evo-hero-v3.blend")
    opts=ap.parse_args(params)
    source=Path(opts.source).resolve()
    if not source.is_file():
        raise RuntimeError("Published V3 glTF sculpt not found: "+str(source))

    # Refuse incomplete or incompatible source BEFORE importing into Blender.
    gltf=json.loads(source.read_text(encoding="utf-8"))
    assert gltf["asset"]["version"]=="2.0"
    named={o.get("name") for o in gltf["nodes"] if "mesh" in o}
    assert REQUIRED.issubset(named),("Missing named sockets",REQUIRED-named)
    assert len(gltf.get("images",[]))==0
    assert len(gltf.get("skins",[]))==0
    assert len(gltf.get("animations",[]))==0

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    meshes=[o for o in bpy.context.scene.objects if o.type=="MESH"]
    names={o.name for o in meshes}
    if not REQUIRED.issubset(names):
        raise RuntimeError("Blender import changed rig socket names: "+
                           str(sorted(REQUIRED-names)))
    if len(meshes)>34:
        raise RuntimeError("Too many mesh batches: "+str(len(meshes)))

    # Blender-native editable faces. Smooth the flowing wing/canopy/engine
    # shells, keep faceted titanium armor and mechanical tail plates crisp.
    for o in meshes:
        smooth=any(o.name.startswith(x) for x in (
            "Hero_Wing_","Hero_Canopy","Hero_Engine_","Hero_Hull_Spine"))
        for f in o.data.polygons:f.use_smooth=smooth
        o["skyshift_socket"]=o.name if o.name in REQUIRED else "detail"
        o["skyshift_no_collision"]=True
        o["skyshift_art_revision"]="0.13.4"

    total=sum(len(o.data.polygons) for o in meshes)
    if total>8000:
        raise RuntimeError("Triangle limit violated: "+str(total))
    if len(bpy.data.materials)>9:
        raise RuntimeError("Too many Blender materials")
    if len(bpy.data.images)>0 or any(
        x.type in {"LIGHT","ARMATURE","CAMERA"} for x in bpy.context.scene.objects
    ):
        raise RuntimeError("Unexpected textures, lights, cameras or skins")

    blend=Path(opts.blend).resolve()
    out=Path(opts.out).resolve()
    blend.parent.mkdir(parents=True,exist_ok=True)
    out.parent.mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    bpy.ops.export_scene.gltf(
        filepath=str(out),
        export_format="GLB",
        export_yup=True,
        export_normals=True,
        export_materials="EXPORT",
        use_selection=False
    )
    if out.stat().st_size>700000:
        raise RuntimeError("GLB too large for A51 budget: "+str(out.stat().st_size))
    print("SKYSHIFT HERO 2.0 Blender source OK",
          "meshes",len(meshes),"triangles",total,
          "blend",blend,"GLB bytes",out.stat().st_size)


if __name__=="__main__":
    main()
