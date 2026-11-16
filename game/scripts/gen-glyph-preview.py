#!/usr/bin/env python3
"""Render the r26 glyph-legibility preview from the real bitmap atlases.

The preview shows the 30 most common UI characters at k=2 (24 physical pixels
per 12px source glyph):

  * row 1-2: pixel_outline, white glyph + exterior #1a1020 outline on dark;
  * row 3-4: pixel_plain, #1a1020 glyph on light paper.

Glyphs are sampled from the real .fnt/.png pairs with NEAREST at integer scale.
"""
from __future__ import annotations

import re
from collections import Counter
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
FONT_DIR = ROOT / "cocos" / "assets" / "resources" / "font"
OUT = Path("/workspace/ly15_glyph_preview.png")
FALLBACK_OUT = ROOT / "ly15_glyph_preview.png"
ART_OUT = Path("/workspace/lingyuan_art/ly15_glyph_preview.png")
SCALE = 2

# Curated fallback if source-literal frequency cannot produce 30 CJK chars.
FALLBACK_CHARS = list(
    "饱腹体力第天时间收入家地图盒子开重抽就吃了睡觉回去深圳生存认证"
)

INK = (26, 16, 32)
DARK_BG = (35, 30, 43)
LIGHT_BG = (247, 236, 211)
WHITE = (255, 255, 255)


def read_fnt(name: str) -> dict[int, dict[str, int]]:
    glyphs: dict[int, dict[str, int]] = {}
    text = (FONT_DIR / f"{name}.fnt").read_text("utf-8")
    for line in text.splitlines():
        if not line.startswith("char "):
            continue
        d = {k: int(v) for k, v in re.findall(r"(\w+)=(-?\d+)", line)}
        glyphs[d["id"]] = d
    return glyphs


def literal_chars() -> Counter:
    """Count CJK characters inside TypeScript string literals."""
    counts: Counter = Counter()
    pattern = re.compile(r"'([^'\\]*(?:\\.[^'\\]*)*)'|\"([^\"\\]*(?:\\.[^\"\\]*)*)\"|`([^`\\]*(?:\\.[^`\\]*)*)`")
    for path in sorted((ROOT / "cocos" / "assets" / "scripts").rglob("*.ts")):
        if path.name in ("BmFontData.ts", "Version.ts"):
            continue
        text = path.read_text("utf-8")
        for m in pattern.finditer(text):
            value = next((g for g in m.groups() if g is not None), "")
            for ch in value:
                if "\u4e00" <= ch <= "\u9fff":
                    counts[ch] += 1
    return counts


def pick_chars(glyphs: dict[int, dict[str, int]]) -> list[str]:
    counts = literal_chars()
    chosen = [ch for ch, _ in counts.most_common() if ord(ch) in glyphs and len(ch) == 1]
    for ch in FALLBACK_CHARS:
        if ch not in chosen and ord(ch) in glyphs:
            chosen.append(ch)
    # Keep the requested 30, but report the actual list.
    return chosen[:30]


def plain_ink(im: Image.Image) -> Image.Image:
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    src = im.load()
    dst = out.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = src[x, y]
            if a > 0:
                dst[x, y] = (INK[0], INK[1], INK[2], a)
    return out


def draw_row(
    canvas: Image.Image,
    y: int,
    chars: list[str],
    glyphs: dict[int, dict[str, int]],
    atlas: Image.Image,
    ink_plain: bool,
) -> int:
    draw = ImageDraw.Draw(canvas)
    baseline = y + 16
    x = 24
    max_h = 0
    for ch in chars:
        g = glyphs[ord(ch)]
        w, h = g["width"], g["height"]
        if w > 0 and h > 0:
            crop = atlas.crop((g["x"], g["y"], g["x"] + w, g["y"] + h))
            if ink_plain:
                crop = plain_ink(crop)
            crop = crop.resize((w * SCALE, h * SCALE), Image.NEAREST)
            gx = x + g["xoffset"] * SCALE
            gy = baseline + g["yoffset"] * SCALE
            canvas.alpha_composite(crop, (gx, gy))
            max_h = max(max_h, (g["yoffset"] + h) * SCALE)
        x += g["xadvance"] * SCALE
    return baseline + max_h + 10


def main() -> int:
    glyphs = read_fnt("pixel_outline")
    plain_glyphs = read_fnt("pixel_plain")
    if set(glyphs) != set(plain_glyphs):
        raise SystemExit("plain/outline glyph sets differ")
    chars = pick_chars(glyphs)
    if len(chars) < 30:
        raise SystemExit(f"only {len(chars)} glyphs available for preview")
    print(f"chars({len(chars)}): {''.join(chars)}")

    width = 24 * 2 + sum(glyphs[ord(c)]["xadvance"] * SCALE for c in chars) + 24
    height = 380
    canvas = Image.new("RGBA", (width, height), DARK_BG)
    draw = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18)
        small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
    except Exception:
        font = ImageFont.load_default()
        small = font

    draw.text((24, 10), "pixel_outline · white glyph / exterior #1a1020 outline · k=2", fill=WHITE, font=font)
    outline = Image.open(FONT_DIR / "pixel_outline.png").convert("RGBA")
    y = draw_row(canvas, 40, chars, glyphs, outline, False)

    # Light half of the sheet.
    draw.rectangle((0, y - 8, width, height), fill=LIGHT_BG)
    draw.text((24, y + 8), "pixel_plain · #1a1020 glyph / no outline · k=2", fill=INK, font=font)
    plain = Image.open(FONT_DIR / "pixel_plain.png").convert("RGBA")
    draw_row(canvas, y + 40, chars, glyphs, plain, True)

    draw.text(
        (24, height - 28),
        "source 12px, NEAREST integer x2; if a glyph is ambiguous here it is a 12px source limit",
        fill=INK,
        font=small,
    )

    for out in (OUT, ART_OUT, FALLBACK_OUT):
        try:
            out.parent.mkdir(parents=True, exist_ok=True)
            canvas.save(out, optimize=True)
            print(f"wrote {out}")
        except OSError as e:
            print(f"skip {out}: {e}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
