#!/usr/bin/env python3
"""Generate anime/manga atlas with expression variants + special icons."""

from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

CELL = 256
COLS = 18  # 6 characters * 3 expressions
ROWS = 2
OUTLINE = (18, 20, 46, 255)
SKIN = (255, 227, 206, 255)


def star_points(cx: float, cy: float, r1: float, r2: float, points: int, rot: float = -math.pi / 2):
    out = []
    for i in range(points * 2):
        r = r1 if i % 2 == 0 else r2
        a = rot + math.pi * i / points
        out.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
    return out


def glow_blob(color: tuple[int, int, int, int], blur: int = 16):
    layer = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer, "RGBA")
    d.ellipse((34, 34, CELL - 34, CELL - 34), fill=color)
    return layer.filter(ImageFilter.GaussianBlur(blur))


def halftone(draw: ImageDraw.ImageDraw, x1: int, y1: int, x2: int, y2: int, step: int = 18):
    for y in range(y1, y2, step):
        for x in range(x1, x2, step):
            if ((x // step) + (y // step)) % 2 == 0:
                draw.ellipse((x - 3, y - 3, x + 3, y + 3), fill=(255, 255, 255, 40))


def draw_eye(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, iris=(30, 65, 168, 255), lashes=False):
    draw.ellipse((x - w, y - h, x + w, y + h), fill=(255, 255, 255, 250), outline=OUTLINE, width=5)
    draw.ellipse((x - w // 2, y - 2, x + w // 2, y + h - 2), fill=iris)
    draw.ellipse((x - w // 6, y + 4, x + w // 6, y + h - 5), fill=(14, 25, 74, 255))
    draw.ellipse((x - 4, y - h + 7, x + 4, y - h + 16), fill=(255, 255, 255, 220))
    if lashes:
        draw.line((x - w - 2, y - h - 4, x + w + 2, y - h - 2), fill=OUTLINE, width=6)
        draw.line((x + w - 2, y - h - 6, x + w + 8, y - h - 10), fill=OUTLINE, width=3)


def draw_face_base(draw: ImageDraw.ImageDraw, cx: int, cy: int, r: int):
    draw.ellipse((cx - r, cy - r + 10, cx + r, cy + r + 18), fill=SKIN, outline=OUTLINE, width=7)


def draw_ribbon(draw: ImageDraw.ImageDraw, x: int, y: int, color: tuple[int, int, int, int]):
    draw.polygon([(x - 24, y), (x - 8, y - 20), (x, y)], fill=color, outline=OUTLINE, width=4)
    draw.polygon([(x + 24, y), (x + 8, y - 20), (x, y)], fill=color, outline=OUTLINE, width=4)
    draw.ellipse((x - 9, y - 9, x + 9, y + 9), fill=(255, 234, 120, 255), outline=OUTLINE, width=3)


def portrait_sakura_girl(draw: ImageDraw.ImageDraw):
    cx = cy = CELL // 2
    draw.polygon(star_points(cx, cy, 108, 58, 6), fill=(255, 170, 214, 212), outline=OUTLINE, width=6)
    halftone(draw, 36, 36, CELL - 36, CELL - 36, step=20)
    draw.polygon(
        [(34, 170), (64, 96), (114, 64), (142, 62), (182, 82), (220, 130), (214, 190), (128, 228)],
        fill=(255, 142, 199, 255),
        outline=OUTLINE,
        width=7,
    )
    draw.ellipse((52, 50, 118, 120), fill=(255, 128, 188, 255), outline=OUTLINE, width=6)
    draw.ellipse((CELL - 118, 52, CELL - 54, 122), fill=(255, 128, 188, 255), outline=OUTLINE, width=6)
    draw_ribbon(draw, 70, 50, (255, 173, 218, 255))
    draw_ribbon(draw, CELL - 70, 52, (255, 173, 218, 255))
    draw_face_base(draw, cx, cy + 24, 62)
    draw_eye(draw, cx - 30, cy + 28, 17, 21, iris=(75, 96, 205, 255), lashes=True)
    draw_eye(draw, cx + 30, cy + 28, 17, 21, iris=(75, 96, 205, 255), lashes=True)


def portrait_neko_boy(draw: ImageDraw.ImageDraw):
    cx = cy = CELL // 2
    draw.regular_polygon((cx, cy, 102), n_sides=6, rotation=30, fill=(136, 167, 255, 215), outline=OUTLINE, width=6)
    halftone(draw, 32, 32, CELL - 32, CELL - 32, step=18)
    draw.polygon([(54, 60), (96, 14), (121, 88)], fill=(114, 145, 245, 255), outline=OUTLINE, width=6)
    draw.polygon([(202, 60), (160, 14), (135, 88)], fill=(114, 145, 245, 255), outline=OUTLINE, width=6)
    draw.polygon(
        [(36, 168), (70, 104), (114, 72), (142, 72), (190, 108), (220, 168), (128, 226)],
        fill=(122, 152, 255, 255),
        outline=OUTLINE,
        width=7,
    )
    draw_face_base(draw, cx, cy + 24, 61)
    draw_eye(draw, cx - 29, cy + 30, 16, 20, iris=(55, 88, 206, 255))
    draw_eye(draw, cx + 29, cy + 30, 16, 20, iris=(55, 88, 206, 255))


def portrait_sun_priest(draw: ImageDraw.ImageDraw):
    cx = cy = CELL // 2
    draw.ellipse((32, 32, CELL - 32, CELL - 32), fill=(255, 220, 114, 212), outline=OUTLINE, width=6)
    for a in range(0, 360, 20):
        r = math.radians(a)
        x1, y1 = cx + math.cos(r) * 78, cy + math.sin(r) * 78
        x2, y2 = cx + math.cos(r) * 118, cy + math.sin(r) * 118
        draw.line((x1, y1, x2, y2), fill=(255, 246, 214, 220), width=9)
    draw.polygon(
        [(34, 160), (68, 104), (106, 68), (150, 68), (188, 104), (220, 160), (128, 228)],
        fill=(255, 194, 68, 255),
        outline=OUTLINE,
        width=7,
    )
    draw_face_base(draw, cx, cy + 24, 61)
    draw_eye(draw, cx - 30, cy + 29, 16, 20, iris=(82, 89, 170, 255))
    draw_eye(draw, cx + 30, cy + 29, 16, 20, iris=(82, 89, 170, 255))


def portrait_ink_mage(draw: ImageDraw.ImageDraw):
    cx = cy = CELL // 2
    draw.polygon([(128, 16), (232, 128), (128, 240), (24, 128)], fill=(169, 145, 255, 214), outline=OUTLINE, width=6)
    halftone(draw, 40, 40, CELL - 40, CELL - 40, step=18)
    draw.polygon(
        [(44, 168), (72, 100), (118, 66), (138, 66), (184, 100), (212, 168), (128, 226)],
        fill=(148, 118, 236, 255),
        outline=OUTLINE,
        width=7,
    )
    draw_face_base(draw, cx, cy + 24, 60)
    draw_eye(draw, cx - 29, cy + 29, 16, 20, iris=(96, 85, 196, 255))
    draw_eye(draw, cx + 29, cy + 29, 16, 20, iris=(96, 85, 196, 255))


def portrait_star_idol(draw: ImageDraw.ImageDraw):
    cx = cy = CELL // 2
    draw.polygon(star_points(cx, cy, 108, 52, 7), fill=(114, 252, 222, 210), outline=OUTLINE, width=6)
    halftone(draw, 40, 40, CELL - 40, CELL - 40, step=18)
    draw.polygon(
        [(42, 167), (80, 102), (126, 72), (152, 72), (196, 104), (214, 170), (128, 224)],
        fill=(92, 223, 189, 255),
        outline=OUTLINE,
        width=7,
    )
    draw_face_base(draw, cx, cy + 24, 60)
    draw_eye(draw, cx - 30, cy + 30, 17, 20, iris=(56, 90, 193, 255))
    draw_eye(draw, cx + 30, cy + 30, 17, 20, iris=(56, 90, 193, 255))


def portrait_blade_hero(draw: ImageDraw.ImageDraw):
    cx = cy = CELL // 2
    draw.polygon([(24, 184), (112, 62), (204, 48), (232, 82), (146, 206), (56, 224)], fill=(255, 136, 126, 215), outline=OUTLINE, width=6)
    draw.line((34, 192, 214, 52), fill=(255, 221, 219, 210), width=10)
    draw.polygon(
        [(42, 167), (76, 104), (122, 72), (156, 72), (198, 106), (214, 172), (128, 224)],
        fill=(255, 139, 131, 255),
        outline=OUTLINE,
        width=7,
    )
    draw_face_base(draw, cx, cy + 24, 60)
    draw_eye(draw, cx - 28, cy + 28, 16, 20, iris=(72, 96, 188, 255))
    draw_eye(draw, cx + 28, cy + 28, 16, 20, iris=(72, 96, 188, 255))


def apply_expression(draw: ImageDraw.ImageDraw, mood: int):
    # mood: 0 normal, 1 happy, 2 focused
    cx, cy = 128, 162
    if mood == 0:
        draw.arc((cx - 18, cy + 16, cx + 18, cy + 34), start=8, end=172, fill=(188, 84, 124, 255), width=5)
        draw.line((cx - 49, cy - 18, cx - 20, cy - 22), fill=(72, 79, 132, 230), width=4)
        draw.line((cx + 49, cy - 18, cx + 20, cy - 22), fill=(72, 79, 132, 230), width=4)
        return

    if mood == 1:
        # Hide most of the default open eyes and replace with clear smiling eyes.
        draw.ellipse((cx - 64, cy - 16, cx - 6, cy + 16), fill=(255, 228, 210, 235))
        draw.ellipse((cx + 6, cy - 16, cx + 64, cy + 16), fill=(255, 228, 210, 235))
        draw.arc((cx - 57, cy - 10, cx - 7, cy + 14), start=10, end=170, fill=OUTLINE, width=6)
        draw.arc((cx + 7, cy - 10, cx + 57, cy + 14), start=10, end=170, fill=OUTLINE, width=6)

        # Big smile with open mouth + highlight.
        draw.pieslice((cx - 34, cy + 4, cx + 34, cy + 52), start=8, end=172, fill=(201, 64, 102, 255), outline=OUTLINE, width=5)
        draw.arc((cx - 24, cy + 12, cx + 24, cy + 34), start=14, end=166, fill=(255, 178, 201, 250), width=5)

        # Blush + sparkle to sell "happy" at small tile size.
        draw.ellipse((cx - 58, cy + 8, cx - 34, cy + 26), fill=(255, 143, 178, 190))
        draw.ellipse((cx + 34, cy + 8, cx + 58, cy + 26), fill=(255, 143, 178, 190))
        sparkle = star_points(cx + 64, cy - 24, 15, 7, 5)
        draw.polygon(sparkle, fill=(255, 246, 196, 255), outline=OUTLINE, width=3)
        return

    # focused
    # Narrow the default eyes, then add sharp anime brows/eyes.
    draw.rectangle((cx - 64, cy - 2, cx + 64, cy + 18), fill=(255, 228, 210, 230))
    draw.polygon([(cx - 58, cy - 22), (cx - 12, cy - 32), (cx - 8, cy - 24), (cx - 52, cy - 14)], fill=OUTLINE)
    draw.polygon([(cx + 58, cy - 22), (cx + 12, cy - 32), (cx + 8, cy - 24), (cx + 52, cy - 14)], fill=OUTLINE)
    draw.line((cx - 53, cy + 4, cx - 13, cy - 2), fill=OUTLINE, width=6)
    draw.line((cx + 53, cy + 4, cx + 13, cy - 2), fill=OUTLINE, width=6)
    draw.line((cx - 16, cy + 28, cx + 18, cy + 21), fill=(156, 60, 96, 255), width=5)

    # Sweat streak / speed cue for "focused".
    draw.polygon([(cx + 61, cy - 10), (cx + 74, cy - 24), (cx + 82, cy - 8), (cx + 68, cy + 2)], fill=(240, 247, 255, 240), outline=OUTLINE, width=3)


def badge_line_h(draw: ImageDraw.ImageDraw):
    draw.ellipse((34, 34, CELL - 34, CELL - 34), fill=(125, 175, 255, 205), outline=OUTLINE, width=7)
    draw.rounded_rectangle((28, 110, CELL - 28, 146), radius=16, fill=(242, 249, 255, 255), outline=OUTLINE, width=6)
    draw.polygon([(16, 128), (42, 108), (42, 148)], fill=(242, 249, 255, 255), outline=OUTLINE, width=4)
    draw.polygon([(CELL - 16, 128), (CELL - 42, 108), (CELL - 42, 148)], fill=(242, 249, 255, 255), outline=OUTLINE, width=4)


def badge_line_v(draw: ImageDraw.ImageDraw):
    draw.ellipse((34, 34, CELL - 34, CELL - 34), fill=(125, 175, 255, 205), outline=OUTLINE, width=7)
    draw.rounded_rectangle((110, 28, 146, CELL - 28), radius=16, fill=(242, 249, 255, 255), outline=OUTLINE, width=6)
    draw.polygon([(128, 16), (108, 42), (148, 42)], fill=(242, 249, 255, 255), outline=OUTLINE, width=4)
    draw.polygon([(128, CELL - 16), (108, CELL - 42), (148, CELL - 42)], fill=(242, 249, 255, 255), outline=OUTLINE, width=4)


def badge_bomb(draw: ImageDraw.ImageDraw):
    draw.ellipse((38, 38, CELL - 38, CELL - 38), fill=(245, 108, 126, 235), outline=OUTLINE, width=7)
    draw.line((164, 80, 210, 34), fill=(85, 24, 32, 255), width=10)
    draw.polygon(star_points(220, 24, 19, 8, 6), fill=(255, 224, 108, 255), outline=(95, 62, 10, 255), width=4)


def badge_color(draw: ImageDraw.ImageDraw):
    draw.ellipse((38, 38, CELL - 38, CELL - 38), fill=(248, 252, 255, 230), outline=OUTLINE, width=7)
    rings = [((255, 110, 147, 250), 84), ((96, 224, 255, 250), 64), ((255, 214, 102, 250), 44), ((255, 255, 255, 255), 22)]
    for color, r in rings:
        draw.ellipse((128 - r, 128 - r, 128 + r, 128 + r), outline=color, width=16)


def badge_lock(draw: ImageDraw.ImageDraw):
    draw.ellipse((40, 40, CELL - 40, CELL - 40), fill=(138, 167, 255, 215), outline=OUTLINE, width=7)
    draw.rounded_rectangle((80, 116, 176, 188), radius=15, fill=(82, 108, 184, 255), outline=OUTLINE, width=7)
    draw.arc((74, 56, 182, 148), start=202, end=-20, fill=OUTLINE, width=10)


def badge_ink(draw: ImageDraw.ImageDraw):
    draw.ellipse((40, 40, CELL - 40, CELL - 40), fill=(168, 143, 255, 215), outline=OUTLINE, width=7)
    pts = [(128, 64), (163, 112), (176, 160), (143, 204), (113, 204), (80, 160), (93, 112)]
    draw.polygon(pts, fill=(96, 79, 186, 255), outline=OUTLINE, width=7)


def badge_frame(draw: ImageDraw.ImageDraw):
    draw.ellipse((40, 40, CELL - 40, CELL - 40), fill=(198, 219, 255, 215), outline=OUTLINE, width=7)
    draw.rounded_rectangle((68, 68, 188, 188), radius=18, outline=(58, 74, 126, 255), width=16)
    draw.rounded_rectangle((98, 98, 158, 158), radius=8, fill=(228, 236, 255, 210), outline=(58, 74, 126, 255), width=6)


def draw_portrait_variant(base_fn, mood: int):
    layer = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer, "RGBA")
    base_fn(d)
    apply_expression(d, mood)
    return layer


def render(atlas: Image.Image, col: int, row: int, layer: Image.Image, glow_color: tuple[int, int, int, int], blur: int):
    atlas.alpha_composite(glow_blob(glow_color, blur=blur), (col * CELL, row * CELL))
    atlas.alpha_composite(layer, (col * CELL, row * CELL))


def main():
    root = Path(__file__).resolve().parents[1]
    out_dir = root / "assets" / "sprites"
    out_dir.mkdir(parents=True, exist_ok=True)

    atlas = Image.new("RGBA", (CELL * COLS, CELL * ROWS), (0, 0, 0, 0))

    portraits = [
        (portrait_sakura_girl, (255, 126, 194, 76)),
        (portrait_neko_boy, (122, 164, 255, 72)),
        (portrait_sun_priest, (255, 212, 107, 74)),
        (portrait_ink_mage, (173, 142, 255, 74)),
        (portrait_star_idol, (98, 255, 216, 74)),
        (portrait_blade_hero, (255, 128, 126, 74)),
    ]

    for t_idx, (fn, glow) in enumerate(portraits):
        for mood in range(3):
            layer = draw_portrait_variant(fn, mood)
            render(atlas, t_idx * 3 + mood, 0, layer, glow, blur=18)

    badges = [
        (badge_line_h, (124, 177, 255, 70)),
        (badge_line_v, (124, 177, 255, 70)),
        (badge_bomb, (255, 124, 124, 72)),
        (badge_color, (255, 198, 108, 72)),
        (badge_lock, (124, 164, 255, 70)),
        (badge_ink, (173, 142, 255, 70)),
        (badge_frame, (194, 214, 255, 70)),
    ]

    for idx, (fn, glow) in enumerate(badges):
        layer = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer, "RGBA")
        fn(d)
        render(atlas, idx, 1, layer, glow, blur=14)

    layer = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer, "RGBA")
    d.polygon(star_points(128, 128, 92, 36, 8), fill=(255, 227, 111, 255), outline=(96, 64, 12, 255), width=6)
    render(atlas, 7, 1, layer, (255, 204, 102, 78), blur=16)

    atlas.save(out_dir / "atlas.png", optimize=True)

    meta = {
        "cell": CELL,
        "cols": COLS,
        "rows": ROWS,
        "portrait_stride": 3,
        "map": {
            "sakura": [0, 0],
            "neko": [3, 0],
            "sun": [6, 0],
            "ink": [9, 0],
            "star": [12, 0],
            "blade": [15, 0],
            "special-line-h": [0, 1],
            "special-line-v": [1, 1],
            "special-bomb": [2, 1],
            "special-color": [3, 1],
            "lock": [4, 1],
            "ink-badge": [5, 1],
            "frame-badge": [6, 1],
        },
    }
    (out_dir / "atlas.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print("Atlas generated:", out_dir / "atlas.png")


if __name__ == "__main__":
    main()
