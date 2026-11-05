#!/usr/bin/env python3
"""生成 cocos/assets/scenes/main.scene 和 main.scene.meta。

场景结构：Scene -> Canvas（UITransform/Canvas/Widget/GameRoot）-> Camera。
GameRoot 的脚本 uuid 固定为 0f56ca5b-02b8-46c3-a278-8e586da22cf3，
场景里引用的是它的压缩 uuid 0f56cpbArhGw6J4jlhtoizz。
"""
from pathlib import Path
import json
import uuid

B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
GAMEROOT_UUID = "0f56ca5b-02b8-46c3-a278-8e586da22cf3"
SCENE_UUID = "b1e8c0a2-6f3d-4c2e-9a1b-2d3e4f5a6b7c"


def compress_uuid(u: str) -> str:
    h = u.replace("-", "")
    out = h[:5]
    for i in range(5, 32, 3):
        v = int(h[i:i + 3], 16)
        out += B64[v >> 6] + B64[v & 63]
    return out


CID = compress_uuid(GAMEROOT_UUID)
OUT = Path(__file__).resolve().parent.parent / "cocos" / "assets" / "scenes"


def vec3(x, y, z):
    return {"__type__": "cc.Vec3", "x": x, "y": y, "z": z}


Q = {"__type__": "cc.Quat", "x": 0, "y": 0, "z": 0, "w": 1}


def node(name, parent, children, comps, pos, layer):
    return {
        "__type__": "cc.Node", "_name": name, "_objFlags": 0,
        "__editorExtras__": {}, "_parent": parent, "_children": children,
        "_active": True, "_components": comps, "_prefab": None,
        "_lpos": pos, "_lrot": Q, "_lscale": vec3(1, 1, 1),
        "_mobility": 0, "_layer": layer, "_euler": vec3(0, 0, 0),
        "_id": uuid.uuid4().hex[:22],
    }


d = []
d.append({"__type__": "cc.SceneAsset", "_name": "main", "_objFlags": 0,
          "__editorExtras__": {}, "_native": "", "scene": {"__id__": 1}})
d.append({"__type__": "cc.Scene", "_name": "main", "_objFlags": 0,
          "__editorExtras__": {}, "_parent": None, "_children": [{"__id__": 2}],
          "_active": True, "_components": [], "_prefab": None,
          "_lpos": vec3(0, 0, 0), "_lrot": Q, "_lscale": vec3(1, 1, 1),
          "_mobility": 0, "_layer": 1073741824, "_euler": vec3(0, 0, 0),
          "autoReleaseAssets": False, "_globals": {"__id__": 9}, "_id": SCENE_UUID})
d.append(node("Canvas", {"__id__": 1}, [{"__id__": 3}],
              [{"__id__": 5}, {"__id__": 6}, {"__id__": 7}, {"__id__": 8}],
              vec3(360, 640, 0), 33554432))
d.append(node("Camera", {"__id__": 2}, [], [{"__id__": 4}],
              vec3(0, 0, 1000), 1073741824))
d.append({"__type__": "cc.Camera", "_name": "", "_objFlags": 0,
          "__editorExtras__": {}, "node": {"__id__": 3}, "_enabled": True,
          "__prefab": None, "_projection": 0, "_priority": 0, "_fov": 45,
          "_fovAxis": 0, "_orthoHeight": 640, "_near": 0, "_far": 2000,
          "_color": {"__type__": "cc.Color", "r": 0, "g": 0, "b": 0, "a": 255},
          "_depth": 1, "_stencil": 0, "_clearFlags": 7,
          "_rect": {"__type__": "cc.Rect", "x": 0, "y": 0, "width": 1, "height": 1},
          "_aperture": 19, "_shutter": 7, "_iso": 0, "_screenScale": 1,
          "_visibility": 41943040, "_targetTexture": None,
          "_postProcess": None, "_usePostProcess": False,
          "_cameraType": -1, "_trackingType": 0, "_id": uuid.uuid4().hex[:22]})
d.append({"__type__": "cc.UITransform", "_name": "", "_objFlags": 0,
          "__editorExtras__": {}, "node": {"__id__": 2}, "_enabled": True,
          "__prefab": None,
          "_contentSize": {"__type__": "cc.Size", "width": 720, "height": 1280},
          "_anchorPoint": {"__type__": "cc.Vec2", "x": 0.5, "y": 0.5},
          "_id": uuid.uuid4().hex[:22]})
d.append({"__type__": "cc.Canvas", "_name": "", "_objFlags": 0,
          "__editorExtras__": {}, "node": {"__id__": 2}, "_enabled": True,
          "__prefab": None, "_cameraComponent": {"__id__": 4},
          "_alignCanvasWithScreen": True, "_id": uuid.uuid4().hex[:22]})
d.append({"__type__": "cc.Widget", "_name": "", "_objFlags": 0,
          "__editorExtras__": {}, "node": {"__id__": 2}, "_enabled": True,
          "__prefab": None, "_alignFlags": 45, "_target": None,
          "_left": 0, "_right": 0, "_top": 0, "_bottom": 0,
          "_horizontalCenter": 0, "_verticalCenter": 0,
          "_isAbsLeft": True, "_isAbsRight": True, "_isAbsTop": True,
          "_isAbsBottom": True, "_isAbsHorizontalCenter": True,
          "_isAbsVerticalCenter": True, "_originalWidth": 0,
          "_originalHeight": 0, "_alignMode": 2, "_lockFlags": 0,
          "_id": uuid.uuid4().hex[:22]})
d.append({"__type__": CID, "_name": "", "_objFlags": 0,
          "__editorExtras__": {}, "node": {"__id__": 2}, "_enabled": True,
          "__prefab": None, "_id": uuid.uuid4().hex[:22]})
d.append({"__type__": "cc.SceneGlobals", "ambient": {"__id__": 10},
          "shadows": {"__id__": 11}, "_skybox": {"__id__": 12},
          "fog": {"__id__": 13}, "octree": {"__id__": 14}, "skin": {"__id__": 15},
          "lightProbeInfo": {"__id__": 16}, "postSettings": {"__id__": 17},
          "bakedWithStationaryMainLight": False, "bakedWithHighpLightmap": False})
for t in ["cc.AmbientInfo", "cc.ShadowsInfo", "cc.SkyboxInfo", "cc.FogInfo",
          "cc.OctreeInfo", "cc.SkinInfo", "cc.LightProbeInfo", "cc.PostSettingsInfo"]:
    d.append({"__type__": t})

OUT.mkdir(parents=True, exist_ok=True)
with open(OUT / "main.scene", "w", encoding="utf-8") as f:
    json.dump(d, f, indent=1)
    f.write("\n")
with open(OUT / "main.scene.meta", "w", encoding="utf-8") as f:
    json.dump({"ver": "1.1.50", "importer": "scene", "imported": True,
               "uuid": SCENE_UUID, "files": [".json"], "subMetas": {},
               "userData": {}}, f, ensure_ascii=False, indent=2)
    f.write("\n")
print(f"scene: {OUT / 'main.scene'}")
print(f"scene uuid: {SCENE_UUID}")
print(f"GameRoot compressed uuid: {CID}")
