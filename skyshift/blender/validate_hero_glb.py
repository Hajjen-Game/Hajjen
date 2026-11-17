#!/usr/bin/env python3
"""Validate a binary Blender-exported Stingray HERO GLB without Blender/python packages.

The model must have all designated ship+tail sockets, zero physics/skin/lights,
8k triangles / 9 materials / 34 draw batches / 700 KB or less. Run after
Blender exporter; rejects untrusted or incompatible files *before deployment*.
"""
import json
import struct
import sys
from pathlib import Path

REQUIRED={
 "Hero_Hull_Spine","Hero_Wing_L","Hero_Wing_R","Hero_Canopy",
 "Hero_Engine_L","Hero_Engine_R","Hero_Edge_L","Hero_Edge_R",
 *("Hero_Tail_Plate_%02d"%i for i in range(1,10))
}
MAX_BYTES=700000
MAX_TRIANGLES=8000
MAX_MATERIALS=9
MAX_BATCHES=34


def inspect_glb(path):
    raw=Path(path).read_bytes()
    if len(raw)>MAX_BYTES:raise ValueError("Oversized GLB: "+str(len(raw)))
    if len(raw)<20:raise ValueError("Truncated GLB")
    magic,version,total=struct.unpack_from("<4sII",raw)
    if magic!=b"glTF" or version!=2 or total!=len(raw):
        raise ValueError("Incorrect glTF 2.0 header or length")
    size,chunk_type=struct.unpack_from("<II",raw,12)
    if chunk_type!=0x4E4F534A:raise ValueError("GLB first chunk must be JSON")
    data=json.loads(raw[20:20+size])
    if data.get("asset",{}).get("version")!="2.0":
        raise ValueError("Must be glTF 2.0")
    nodes=data.get("nodes",[])
    meshes=data.get("meshes",[])
    materials=data.get("materials",[])
    accessors=data.get("accessors",[])
    names={node.get("name") for node in nodes if "mesh" in node}
    missing=REQUIRED-names
    if missing:raise ValueError("Missing required nodes: "+", ".join(sorted(missing)))
    if len(names)!=len([n for n in nodes if n.get("name") in names and "mesh" in n]):
        raise ValueError("Duplicate node names")
    if len(data.get("images",[]))>0 or len(data.get("textures",[]))>0:
        raise ValueError("Hero V1 must be texture-free (4GB device budget)")
    if data.get("extensionsUsed") and any(
      k in data["extensionsUsed"] for k in ["KHR_draco_mesh_compression",
       "KHR_lights_punctual"]):
        raise ValueError("No extra lights or decoder dependencies")
    if data.get("skins") or data.get("animations") or data.get("cameras"):
        raise ValueError("No armature, animations or cameras in render-only GLB")
    if len(materials)>MAX_MATERIALS:
        raise ValueError("Materials over budget")
    triangles=0;batches=0
    for m in meshes:
        for p in m.get("primitives",[]):
            if p.get("mode",4)!=4:raise ValueError("Triangle-list primitive required")
            accessor=accessors[p["indices"]] if "indices" in p else accessors[p["attributes"]["POSITION"]]
            if accessor["count"]%3:
                raise ValueError("Non-triangular primitive")
            triangles+=accessor["count"]//3
            batches+=1
    if batches>MAX_BATCHES or triangles>MAX_TRIANGLES:
        raise ValueError(f"Runtime budget exceeded: {batches} batches/{triangles} triangles")
    min_vertices=17
    if batches<min_vertices:raise ValueError("Asset is missing mesh primitives")
    report={"version":"ship-art-0132","valid":True,"name":Path(path).name,
            "bytes":len(raw),"meshes":len(meshes),"drawBatches":batches,
            "materials":len(materials),"triangles":triangles,
            "requiredNodes":len(REQUIRED),"textures":0,
            "colliders":0,"embeddedLights":0}
    return report


def main():
    if len(sys.argv)!=2:raise SystemExit("usage: python validate_hero_glb.py <model.glb>")
    print(json.dumps(inspect_glb(sys.argv[1]),indent=2))


if __name__=="__main__":main()
