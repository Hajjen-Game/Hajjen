"""Zero-dependency test for the mobile GLB gate. Run via python3 -m unittest."""
import json
import struct
import tempfile
import unittest
from pathlib import Path
from validate_hero_glb import inspect_glb,REQUIRED,MAX_BYTES


def fake_glb(path,names=None,extra_lights=False,extra_textures=False):
    names=list(sorted(REQUIRED)) if names is None else names
    gltf={
        "asset":{"version":"2.0"},
        "nodes":[{"name":n,"mesh":i} for i,n in enumerate(names)],
        "meshes":[{"primitives":[{"attributes":{"POSITION":i},"mode":4}]}
                  for i in range(len(names))],
        "accessors":[{"count":12,"componentType":5126,"type":"VEC3"}
                     for _ in names],
        "materials":[{"name":"armor"}]
    }
    if extra_lights:gltf["extensionsUsed"]=["KHR_lights_punctual"]
    if extra_textures:gltf["images"]=[{"uri":"out-of-band.png"}]
    chunk=json.dumps(gltf,separators=(",",":")).encode("utf8")
    chunk+=b" " * (-len(chunk)%4)
    glb=struct.pack("<4sII",b"glTF",2,20+len(chunk))
    glb+=struct.pack("<II",len(chunk),0x4E4F534A)+chunk
    Path(path).write_bytes(glb)


class ValidateHeroGLBTest(unittest.TestCase):
    def setUp(self):
        self.dir=tempfile.TemporaryDirectory()
        self.path=Path(self.dir.name)/"hero.glb"
    def tearDown(self):
        self.dir.cleanup()

    def test_valid_named_pieces_and_mobile_geometry(self):
        fake_glb(self.path)
        r=inspect_glb(self.path)
        self.assertTrue(r["valid"])
        self.assertEqual(r["drawBatches"],17)
        self.assertEqual(r["triangles"],68)
        self.assertEqual(r["requiredNodes"],17)
        self.assertLess(r["bytes"],MAX_BYTES)

    def test_missing_tail_joint_rejected(self):
        fake_glb(self.path,sorted(REQUIRED-{"Hero_Tail_Plate_09"}))
        with self.assertRaisesRegex(ValueError,"Missing required nodes"):
            inspect_glb(self.path)

    def test_no_textures_or_lights(self):
        for opts in [{"extra_lights":True},{"extra_textures":True}]:
            fake_glb(self.path,**opts)
            with self.assertRaises(ValueError):inspect_glb(self.path)

    def test_corrupt_binary_rejected(self):
        self.path.write_bytes(b"not a valid glb")
        with self.assertRaises(ValueError):inspect_glb(self.path)


if __name__=="__main__":unittest.main()
