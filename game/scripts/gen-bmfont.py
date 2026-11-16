#!/usr/bin/env python3
"""Generate the two 12px bitmap fonts used by the game from tools/fonts/pixel_cn.ttf.

Both atlases contain exactly the same glyph cells, offsets and advances so all
layout math can be shared:

  pixel_plain   1-bit white glyph, no outline.
  pixel_outline white glyph + a #1a1020 outline drawn *only* on exterior
                background pixels (background reachable from the cell border
                and 8-neighbour adjacent to the glyph).  Enclosed counters and
                gaps between strokes that are not reachable from outside stay
                transparent.

The atlas is sampled with nearest filtering and has no mipmaps.  Every glyph
cell is padded by one source pixel and xoffset/yoffset are adjusted by the same
amount, so spacing and baseline do not move relative to the old single atlas.

Only Python + Pillow + fontTools are required:
    pip install pillow fonttools
"""

from __future__ import annotations

import argparse
import json
import sys
import uuid
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
FONT_DIR = ROOT / "cocos" / "assets" / "resources" / "font"
TTF_PATH = ROOT / "tools" / "fonts" / "pixel_cn.ttf"
DATA_TS = ROOT / "cocos" / "assets" / "scripts" / "ui" / "BmFontData.ts"

NATIVE_SIZE = 12
LINE_HEIGHT = 14
BASE = 11  # baseline distance from the top of a line
CELL_PAD = 1
OUTLINE_COLOR = (26, 16, 32, 255)  # #1a1020
WHITE = (255, 255, 255, 255)
TRANSPARENT = (0, 0, 0, 0)

# name, bake_outline
VARIANTS = (
    ("pixel_plain", False),
    ("pixel_outline", True),
)

# Characters that must always be present even if they only appear in dynamic
# strings (digits / format currencies / punctuation used by layout helpers).
EXTRA_CHARS = (
    "".join(chr(c) for c in range(0x20, 0x7F))
    + "\u00a0¥￥·…—–—→←↑↓×÷°★『』「」【】《》、。，！？；：（）"
    + "０１２３４５６７８９"
)

FALLBACK_FONTS = [
    "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]

# Fixed namespace so re-running this script does not churn .meta UUIDs.
UUID_NS = uuid.UUID("b7c9f74e-2a6d-4e0a-8d8b-3f0c1a2b3c4d")


def eprint(*args) -> None:
    print(*args, file=sys.stderr)


def ensure_deps() -> None:
    try:
        ImageFont.truetype
    except Exception:  # pragma: no cover
        raise SystemExit("Pillow is required: pip install pillow fonttools")


def collect_source_chars() -> set[str]:
    """Return every character that appears in game source.

    We intentionally include comments as well as string literals.  It is a
    small over-approximation that guarantees no dynamic string is ever missing
    a glyph, at the cost of a few hundred extra atlas cells.
    """
    chars: set[str] = set(EXTRA_CHARS)
    sources = [
        *sorted((ROOT / "src" / "core").rglob("*.ts")),
        *sorted((ROOT / "cocos" / "assets" / "scripts").rglob("*.ts")),
    ]
    for path in sources:
        if path.name == "BmFontData.ts":
            continue
        text = path.read_text("utf-8")
        for ch in text:
            if ch in "\n\r\t":
                continue
            chars.add(ch)
    return chars


def make_font(path: str):
    return ImageFont.truetype(str(path), NATIVE_SIZE, layout_engine=ImageFont.Layout.BASIC)


def load_font_info(path: Path):
    tt = TTFont(str(path))
    cmap = tt.getBestCmap() or {}
    hmtx = tt["hmtx"]
    upem = tt["head"].unitsPerEm
    pil = make_font(str(path))
    return tt, cmap, hmtx, upem, pil


def glyph_advance(info, ch: str) -> int | None:
    if ch in " \u00a0":
        return 6
    tt, cmap, hmtx, upem, pil = info
    glyph = cmap.get(ord(ch))
    if glyph is None:
        return None
    units = hmtx[glyph][0]
    return int(round(units / upem * NATIVE_SIZE))


def glyph_mask(info, ch: str) -> tuple[Image.Image | None, int, int]:
    """Render one character at 12px, threshold to 1-bit.

    Returns (mask, x0, baseline).  x0 is the horizontal origin used when
    drawing; baseline is the y coordinate of the baseline inside the mask.
    """
    tt, cmap, hmtx, upem, pil = info
    ascent, descent = pil.getmetrics()
    pad = 6
    width = max(1, int(round(pil.getlength(ch)))) + pad * 2 + 6
    height = ascent + descent + pad * 2
    img = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(img)
    baseline = pad + ascent
    draw.text((pad, baseline), ch, font=pil, fill=255, anchor="ls")
    mask = img.point(lambda v: 255 if v >= 128 else 0)
    bbox = mask.getbbox()
    if bbox is None:
        return None, 0, baseline
    left, top, right, bottom = bbox
    cropped = mask.crop((left, top, right, bottom))
    return cropped, left, baseline - top


def estimate_atlas(chars: list[str], infos) -> tuple[int, int, dict[str, tuple]]:
    """Measure cells and choose a power-of-two atlas that fits."""
    cells: dict[str, tuple[int, int]] = {}
    for ch in chars:
        if ch in " \u00a0":
            cells[ch] = (0, 0)
            continue
        placed = False
        for info in infos:
            if glyph_advance(info, ch) is not None:
                mask, _x0, _base = glyph_mask(info, ch)
                if mask is None:
                    cells[ch] = (0, 0)
                else:
                    cells[ch] = (mask.width + CELL_PAD * 2, mask.height + CELL_PAD * 2)
                placed = True
                break
        if not placed:
            cells[ch] = (0, 0)
    for width, height in [(512, 512), (512, 1024), (1024, 1024), (1024, 2048), (2048, 2048)]:
        x = y = shelf_h = 0
        ok = True
        for w, h in cells.values():
            if w <= 0 or h <= 0:
                continue
            if w + 2 > width:
                ok = False
                break
            if x + w + 1 > width:
                x = 0
                y += shelf_h + 1
                shelf_h = 0
            if y + h + 1 > height:
                ok = False
                break
            x += w + 1
            shelf_h = max(shelf_h, h)
        if ok:
            return width, height, cells
    raise SystemExit("font atlas does not fit in 2048x2048")


def exterior_outline(mask: Image.Image, pad: int) -> Image.Image:
    """Return an RGBA image with outline pixels only outside the glyph.

    The background is flood-filled from the padded cell border using
    4-neighbour connectivity (so a diagonal pinhole cannot leak into a
    counter).  A reachable background pixel becomes outline when it is
    8-neighbour adjacent to a glyph pixel.  Background trapped inside a
    counter never belongs to the exterior region and therefore stays clear.
    """
    w, h = mask.size
    cw, ch = w + pad * 2, h + pad * 2
    glyph_pixels: set[tuple[int, int]] = set()
    src = mask.load()
    for y in range(h):
        for x in range(w):
            if src[x, y] > 0:
                glyph_pixels.add((x + pad, y + pad))

    outside: set[tuple[int, int]] = set()
    queue: deque[tuple[int, int]] = deque()
    seen: set[tuple[int, int]] = set()

    def push(x: int, y: int) -> None:
        if x < 0 or y < 0 or x >= cw or y >= ch:
            return
        if (x, y) in glyph_pixels or (x, y) in seen:
            return
        seen.add((x, y))
        queue.append((x, y))

    for x in range(cw):
        push(x, 0)
        push(x, ch - 1)
    for y in range(ch):
        push(0, y)
        push(cw - 1, y)

    while queue:
        x, y = queue.popleft()
        outside.add((x, y))
        push(x - 1, y)
        push(x + 1, y)
        push(x, y - 1)
        push(x, y + 1)

    neighbours8 = (
        (-1, -1), (0, -1), (1, -1),
        (-1, 0), (1, 0),
        (-1, 1), (0, 1), (1, 1),
    )
    out = Image.new("RGBA", (cw, ch), TRANSPARENT)
    px = out.load()
    for x, y in outside:
        for dx, dy in neighbours8:
            if (x + dx, y + dy) in glyph_pixels:
                px[x, y] = OUTLINE_COLOR
                break
    # White 1-bit glyph on top.  The outline remains only on exterior pixels
    # because glyph pixels were never painted by the loop above.
    out.paste(Image.new("RGBA", (w, h), WHITE), (pad, pad), mask)
    return out


def plain_glyph(mask: Image.Image, pad: int) -> Image.Image:
    w, h = mask.size
    out = Image.new("RGBA", (w + pad * 2, h + pad * 2), TRANSPARENT)
    out.paste(Image.new("RGBA", (w, h), WHITE), (pad, pad), mask)
    return out


def write_variant(
    name: str,
    bake_outline: bool,
    atlas_w: int,
    atlas_h: int,
    ordered: list[str],
    cells: dict[str, tuple[int, int]],
    glyph_data: dict[str, tuple[Image.Image, int, int, int] | None],
    placements: dict[str, dict],
    out_dir: Path,
) -> tuple[int, int]:
    """Write one .fnt/.png/.meta family.  placements must be precomputed."""
    fnt_path = out_dir / f"{name}.fnt"
    png_path = out_dir / f"{name}.png"
    atlas = Image.new("RGBA", (atlas_w, atlas_h), TRANSPARENT)

    for ch in ordered:
        p = placements[ch]
        if p["w"] <= 0 or p["h"] <= 0:
            continue
        data = glyph_data.get(ch)
        if data is None:
            continue
        mask, _x0, _base, _adv = data
        glyph = exterior_outline(mask, CELL_PAD) if bake_outline else plain_glyph(mask, CELL_PAD)
        atlas.alpha_composite(glyph, (p["x"], p["y"]))

    atlas.save(png_path, optimize=True)

    lines = [
        f'info face="{name}" size={NATIVE_SIZE} bold=0 italic=0 charset="" unicode=1 '
        f'stretchH=100 smooth=0 aa=0 padding={CELL_PAD},{CELL_PAD},{CELL_PAD},{CELL_PAD} spacing=0,0',
        f"common lineHeight={LINE_HEIGHT} base={BASE} scaleW={atlas_w} scaleH={atlas_h} "
        f"pages=1 packed=0 alphaChnl=0 redChnl=4 greenChnl=4 blueChnl=4",
        f'page id=0 file="{name}.png"',
        f"chars count={len(placements)}",
    ]
    for ch in sorted(placements, key=ord):
        p = placements[ch]
        ch_id = ord(ch)
        letter = ch.replace("\\", "\\\\").replace('"', '\\"')
        lines.append(
            f'char id={ch_id} x={p["x"]} y={p["y"]} width={p["w"]} height={p["h"]} '
            f'xoffset={p["xoffset"]} yoffset={p["yoffset"]} xadvance={p["xadvance"]} '
            f'page=0 chnl=0 letter="{letter}"'
        )
    fnt_path.write_text("\n".join(lines) + "\n", "utf-8")

    # ---- Cocos .meta for the .fnt ------------------------------------------
    fnt_uuid = str(uuid.uuid5(UUID_NS, f"{name}.fnt"))
    png_uuid = str(uuid.uuid5(UUID_NS, f"{name}.png"))
    fnt_config = {
        "commonHeight": LINE_HEIGHT,
        "fontSize": NATIVE_SIZE,
        "atlasName": f"{name}.png",
        "fontDefDictionary": {
            str(ord(ch)): {
                "rect": {
                    "x": p["x"], "y": p["y"],
                    "width": p["w"], "height": p["h"],
                },
                "xOffset": p["xoffset"], "yOffset": p["yoffset"],
                "xAdvance": p["xadvance"],
            }
            for ch, p in sorted(placements.items(), key=lambda kv: ord(kv[0]))
        },
        "kerningDict": {},
    }
    fnt_meta = {
        "ver": "1.0.6",
        "importer": "bitmap-font",
        "imported": True,
        "uuid": fnt_uuid,
        "files": [".json"],
        "subMetas": {},
        "userData": {
            "_fntConfig": fnt_config,
            "fontSize": NATIVE_SIZE,
            "textureUuid": png_uuid,
        },
    }
    fnt_path.with_suffix(".fnt.meta").write_text(
        json.dumps(fnt_meta, ensure_ascii=False, indent=2) + "\n", "utf-8"
    )

    # ---- Cocos .meta for the PNG (nearest, clamp, no mipmaps) --------------
    def sub_meta(display_name: str, importer: str, sub_uuid: str, user_data: dict) -> dict:
        return {
            "ver": "1.0.22" if importer == "texture" else "1.0.12",
            "importer": importer,
            "uuid": sub_uuid,
            "displayName": display_name,
            "id": "6c48a" if importer == "texture" else "f9941",
            "name": display_name,
            "imported": True,
            "files": [".json"],
            "subMetas": {},
            "userData": user_data,
        }

    texture_uuid = f"{png_uuid}@6c48a"
    sprite_uuid = f"{png_uuid}@f9941"
    half_w, half_h = atlas_w / 2, atlas_h / 2
    png_meta = {
        "ver": "1.0.27",
        "importer": "image",
        "imported": True,
        "uuid": png_uuid,
        "files": [".json", ".png"],
        "subMetas": {
            "6c48a": sub_meta("texture", "texture", texture_uuid, {
                "wrapModeS": "clamp-to-edge",
                "wrapModeT": "clamp-to-edge",
                "minfilter": "nearest",
                "magfilter": "nearest",
                "mipfilter": "none",
                "premultiplyAlpha": False,
                "anisotropy": 0,
                "isUuid": True,
                "imageUuidOrDatabaseUri": png_uuid,
                "visible": False,
            }),
            "f9941": sub_meta("spriteFrame", "sprite-frame", sprite_uuid, {
                "wrapModeS": "clamp-to-edge",
                "wrapModeT": "clamp-to-edge",
                "minfilter": "nearest",
                "magfilter": "nearest",
                "mipfilter": "none",
                "premultiplyAlpha": False,
                "anisotropy": 1,
                "trimType": "none",
                "trimThreshold": 1,
                "rotated": False,
                "offsetX": 0,
                "offsetY": 0,
                "trimX": 0,
                "trimY": 0,
                "width": atlas_w,
                "height": atlas_h,
                "rawWidth": atlas_w,
                "rawHeight": atlas_h,
                "borderTop": 0,
                "borderBottom": 0,
                "borderLeft": 0,
                "borderRight": 0,
                "packable": False,
                "pixelsToUnit": 100,
                "pivotX": 0.5,
                "pivotY": 0.5,
                "meshType": 0,
                "vertices": {
                    "rawPosition": [-half_w, -half_h, 0, half_w, -half_h, 0, -half_w, half_h, 0, half_w, half_h, 0],
                    "indexes": [0, 1, 2, 2, 1, 3],
                    "uv": [0, 0, atlas_w, 0, 0, atlas_h, atlas_w, atlas_h],
                    "nuv": [0, 0, 1, 0, 0, 1, 1, 1],
                    "minPosition": [-half_w, -half_h, 0],
                    "maxPosition": [half_w, half_h, 0],
                },
                "isUVChanged": False,
                "imageUuidOrDatabaseUri": texture_uuid,
                "atlasUuid": "",
            }),
        },
        "userData": {
            "type": "sprite-frame",
            "hasAlpha": True,
            "fixAlphaTransparencyArtifacts": False,
            "redirect": texture_uuid,
        },
    }
    png_path.with_suffix(".png.meta").write_text(
        json.dumps(png_meta, ensure_ascii=False, indent=2) + "\n", "utf-8"
    )
    return png_path.stat().st_size, fnt_path.stat().st_size


def main() -> int:
    ensure_deps()
    ap = argparse.ArgumentParser(description="generate pixel_plain / pixel_outline BMFonts")
    ap.add_argument("--ttf", default=str(TTF_PATH))
    ap.add_argument("--out-dir", default=str(FONT_DIR))
    args = ap.parse_args()

    ttf_path = Path(args.ttf)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    if not ttf_path.exists():
        raise SystemExit(f"missing {ttf_path}")

    main_info = load_font_info(ttf_path)
    infos = [main_info]
    for fallback in FALLBACK_FONTS:
        p = Path(fallback)
        if p.exists():
            try:
                infos.append(load_font_info(p))
            except Exception:
                pass

    chars = sorted(c for c in collect_source_chars() if c not in "\n\r\t")
    atlas_w, atlas_h, cells = estimate_atlas(chars, infos)

    ordered = sorted(chars, key=lambda c: (-cells.get(c, (0, 0))[1], -cells.get(c, (0, 0))[0], ord(c)))
    placements: dict[str, dict] = {}
    glyph_data: dict[str, tuple[Image.Image, int, int, int] | None] = {}
    x = y = shelf_h = 0
    missing: list[str] = []

    for ch in ordered:
        cw, chh = cells.get(ch, (0, 0))
        if cw <= 0 or chh <= 0:
            space_adv = 0
            for info in infos:
                a = glyph_advance(info, ch)
                if a is not None:
                    space_adv = a
                    break
            placements[ch] = {
                "x": 0, "y": 0, "w": 0, "h": 0,
                "xoffset": 0, "yoffset": 0,
                "xadvance": space_adv if ch in " \u00a0" else 12,
            }
            glyph_data[ch] = None
            if ch not in " \u00a0":
                missing.append(ch)
            continue

        if x + cw + 1 > atlas_w:
            x = 0
            y += shelf_h + 1
            shelf_h = 0

        chosen = None
        for info in infos:
            if glyph_advance(info, ch) is None:
                continue
            if ch in " \u00a0":
                chosen = info
                break
            mask, _x0, _b = glyph_mask(info, ch)
            if mask is not None:
                chosen = info
                break
        if chosen is None:
            missing.append(ch)
            placements[ch] = {
                "x": 0, "y": 0, "w": 0, "h": 0,
                "xoffset": 0, "yoffset": 0, "xadvance": 12,
            }
            glyph_data[ch] = None
            continue

        advance = glyph_advance(chosen, ch)
        if advance is None:
            advance = 12
        if ch in " \u00a0":
            placements[ch] = {
                "x": 0, "y": 0, "w": 0, "h": 0,
                "xoffset": 0, "yoffset": 0, "xadvance": advance,
            }
            glyph_data[ch] = None
            continue

        mask, x0, baseline_from_top = glyph_mask(chosen, ch)
        if mask is None:
            placements[ch] = {
                "x": 0, "y": 0, "w": 0, "h": 0,
                "xoffset": 0, "yoffset": 0, "xadvance": advance,
            }
            glyph_data[ch] = None
            continue

        glyph_w = mask.width + CELL_PAD * 2
        glyph_h = mask.height + CELL_PAD * 2
        placements[ch] = {
            "x": x, "y": y, "w": glyph_w, "h": glyph_h,
            # The cell is padded by 1px; subtract it so the ink and baseline
            # stay at exactly the same position as the old unpadded atlas.
            "xoffset": int(x0) - CELL_PAD,
            "yoffset": BASE - int(baseline_from_top) - CELL_PAD,
            "xadvance": advance,
        }
        glyph_data[ch] = (mask, x0, baseline_from_top, advance)
        x += cw + 1
        shelf_h = max(shelf_h, chh)

    if missing:
        eprint(f"[gen-bmfont] missing glyphs ({len(missing)}): {''.join(missing)}")
        if any(c not in " \u00a0" for c in missing):
            raise SystemExit(1)

    sizes: list[tuple[str, int, int]] = []
    for name, bake_outline in VARIANTS:
        png_size, fnt_size = write_variant(
            name, bake_outline, atlas_w, atlas_h, ordered, cells,
            glyph_data, placements, out_dir,
        )
        sizes.append((name, png_size, fnt_size))

    # ---- TypeScript advance table used by all layout math -------------------
    advances = {ch: p["xadvance"] for ch, p in placements.items()}
    data_lines = [
        "// Generated by scripts/gen-bmfont.py — do not edit by hand.",
        "// Advances are in native 12px design units (BMFont xadvance).",
        f"export const BM_FONT_NATIVE_SIZE = {NATIVE_SIZE};",
        f"export const BM_FONT_LINE_HEIGHT = {LINE_HEIGHT};",
        f"export const BM_FONT_BASE = {BASE};",
        "export const BM_FONT_ADVANCES: Record<string, number> = {",
    ]
    for ch in sorted(advances, key=ord):
        data_lines.append(f"  {json.dumps(ch, ensure_ascii=False)}: {advances[ch]},")
    data_lines.append("};")
    data_lines.append(
        "export const BM_FONT_DEFAULT_ADVANCE = BM_FONT_ADVANCES['中'] ?? 12;"
    )
    DATA_TS.write_text("\n".join(data_lines) + "\n", "utf-8")

    print(f"chars={len(placements)} atlas={atlas_w}x{atlas_h}")
    for name, png_size, fnt_size in sizes:
        print(f"{name}: png={png_size}B fnt={fnt_size}B")
    print(f"wrote {out_dir.relative_to(ROOT)}/pixel_plain.* and pixel_outline.*")
    print(f"wrote {DATA_TS.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
