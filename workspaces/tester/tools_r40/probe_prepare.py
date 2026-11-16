#!/usr/bin/env python3
import argparse
import hashlib
import json
import os
import shutil
from pathlib import Path

COMMIT = "d3d65b662c29b5a9d2103a011a5c2bb87f3a2edb"
VERSION = "r40"
TAG = "r40 d3d65b6"
PLAYER = "baishizhou"
CASES = [
    ("futian_cbd", "福田CBD"),
    ("dongmen", "东门"),
]
SOURCE_SCRIPTS = {
    "assets/scripts/ui/MapLayout.ts": "b7db7976c14324a7eb57835ee4daba74a36ad267e2e8ce29492b7d7e567fd134",
    "assets/scripts/GameRoot.ts": "7fd8f57703f990b7e3327536dc084ff12daf20ec17eaac1030d7261a987b2ecf",
}
BUILD_FILES = [
    "game.js",
    "game.json",
    "project.config.json",
    "project.private.config.json",
]

def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            chunk = f.read(1024 * 1024)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()

def scan_links(root):
    for dirpath, dirnames, filenames in os.walk(root, followlinks=False):
        for name in dirnames + filenames:
            p = Path(dirpath) / name
            if p.is_symlink():
                raise SystemExit("SYMLINK_FOUND: " + str(p))
            if p.is_file() and p.stat().st_nlink > 1:
                raise SystemExit("HARDLINK_FOUND: " + str(p))

def no_original_refs(case_dir, source_root, build_dir):
    needles = [str(source_root), str(build_dir)]
    for rel in ["game.js", "project.config.json", "__ly15_probe_driver.js", "__ly15_probe_prelude.js", "case.json"]:
        p = case_dir / rel
        if not p.is_file():
            continue
        data = p.read_text(errors="ignore")
        for needle in needles:
            if needle in data:
                raise SystemExit("ORIGINAL_PATH_REF: " + str(p))

def verify_info(info_path, manifest_path, build_dir, source_root):
    if not info_path.is_file():
        raise SystemExit("INFO_MISSING: " + str(info_path))
    if not manifest_path.is_file():
        raise SystemExit("BUILD_MANIFEST_MISSING: " + str(manifest_path))
    info = json.loads(info_path.read_text(encoding="utf-8"))
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if info.get("commit") != COMMIT:
        raise SystemExit("INFO_COMMIT_MISMATCH")
    if info.get("version") != VERSION or info.get("tag") != TAG:
        raise SystemExit("INFO_TAG_MISMATCH")
    if manifest.get("commit") != COMMIT or manifest.get("version") != VERSION or manifest.get("tag") != TAG:
        raise SystemExit("MANIFEST_TAG_MISMATCH")
    for rel, expected in SOURCE_SCRIPTS.items():
        p = source_root / rel
        if not p.is_file() or sha256(p) != expected:
            raise SystemExit("SOURCE_SCRIPT_MISMATCH: " + rel)
    for rel, item in manifest.get("build_files", {}).items():
        p = build_dir / rel
        if not p.is_file() or p.stat().st_size != item.get("size") or sha256(p) != item.get("sha256"):
            raise SystemExit("BUILD_FILE_MISMATCH: " + rel)
    return info, manifest

def append_driver(case_dir, driver_data):
    game = case_dir / "game.js"
    original = game.read_bytes()
    prelude = (
        'globalThis.__LY15_PROBE_APPROVED__=true;\n'
        'globalThis.__LY15_PROBE_CASE__="' + case_dir.name + '";\n'
        'globalThis.__LY15_PROBE_PLAYER__="' + PLAYER + '";\n'
    ).encode("utf-8")
    new_data = original + b"\n" + prelude + driver_data
    tmp = case_dir / "game.js.ly15probe"
    with open(tmp, "xb") as f:
        f.write(new_data)
    os.replace(tmp, game)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--approved", action="store_true")
    parser.add_argument("--build-dir", required=True)
    parser.add_argument("--source-root", required=True)
    parser.add_argument("--info", required=True)
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--out-root", required=True)
    args = parser.parse_args()
    if not args.approved:
        raise SystemExit("HOLD: --approved required")

    driver = Path(__file__).resolve().parent / "probe_driver.js"
    if not driver.is_file():
        raise SystemExit("DRIVER_MISSING: " + str(driver))
    build_dir = Path(args.build_dir).resolve()
    source_root = Path(args.source_root).resolve()
    out_root = Path(args.out_root).resolve()
    if not build_dir.is_dir() or not source_root.is_dir():
        raise SystemExit("INPUT_DIR_MISSING")
    if out_root.exists():
        raise SystemExit("OUT_ROOT_EXISTS: " + str(out_root))
    if not out_root.parent.is_dir():
        raise SystemExit("OUT_PARENT_MISSING")
    if os.path.commonpath([str(out_root), str(build_dir)]) in (str(out_root), str(build_dir)):
        raise SystemExit("OUT_OVERLAPS_BUILD")

    verify_info(Path(args.info), Path(args.manifest), build_dir, source_root)
    scan_links(build_dir)
    driver_data = driver.read_bytes()
    out_root.mkdir()

    for case_id, label in CASES:
        dest = out_root / case_id
        shutil.copytree(build_dir, dest, symlinks=False, copy_function=shutil.copy2)
        scan_links(dest)
        for rel in BUILD_FILES:
            if not (dest / rel).is_file():
                raise SystemExit("CASE_BUILD_FILE_MISSING: " + str(dest / rel))
        shutil.copyfile(driver, dest / "__ly15_probe_driver.js")
        append_driver(dest, driver_data)
        case = {
            "mode": "probe-layout",
            "not_normal_touch": True,
            "case": case_id,
            "label": label,
            "player": PLAYER,
            "injection_position": "append-after-original",
        }
        with open(dest / "case.json", "x", encoding="utf-8") as f:
            json.dump(case, f, ensure_ascii=False, indent=2)
            f.write("\n")
        no_original_refs(dest, source_root, build_dir)
        manifest = {
            "case": case_id,
            "label": label,
            "player": PLAYER,
            "mode": "probe-layout",
            "not_normal_touch": True,
            "commit": COMMIT,
            "version": VERSION,
            "tag": TAG,
            "source_game_sha256": sha256(dest / "game.js"),
            "driver_sha256": sha256(dest / "__ly15_probe_driver.js"),
            "config_sha256": sha256(dest / "project.config.json"),
            "private_sha256": sha256(dest / "project.private.config.json"),
        }
        with open(dest / "case_manifest.json", "x", encoding="utf-8") as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)
            f.write("\n")

    print("PREPARED: " + str(out_root))
    print("CASES: futian_cbd, dongmen")

if __name__ == "__main__":
    main()
