import bpy
import os
import sys

def log(message):
    print("[tiby-export] " + message)

args = sys.argv
try:
    separator = args.index("--")
    output_path = args[separator + 1]
except (ValueError, IndexError):
    raise SystemExit("Expected output GLB path after --")

output_path = os.path.abspath(output_path)
os.makedirs(os.path.dirname(output_path), exist_ok=True)

# Keep the neutral chibi body and rig, but remove source hair so PvP 2.5D can
# build class silhouettes with its own equipment instead of a large hairstyle.
removed = []
for obj in list(bpy.data.objects):
    name = obj.name.lower()
    if "hair" in name:
        removed.append(obj.name)
        bpy.data.objects.remove(obj, do_unlink=True)
        continue
    if obj.type in {"CAMERA", "LIGHT"}:
        bpy.data.objects.remove(obj, do_unlink=True)

log("Removed: " + (", ".join(removed) if removed else "no hair objects matched"))

# Ensure remaining game objects are exportable.
for obj in bpy.context.scene.objects:
    obj.hide_viewport = False
    obj.hide_render = False

# The source is intentionally kept rigged. Blender's glTF exporter converts
# coordinates to glTF/Y-up for Babylon.js.
bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format="GLB",
    export_animations=True,
)

if not os.path.exists(output_path):
    raise SystemExit("GLB export did not produce " + output_path)

log("Exported " + output_path + " (" + str(os.path.getsize(output_path)) + " bytes)")
