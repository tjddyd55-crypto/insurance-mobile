"""Draw measured widget trees to PNG. Robolectric does not keep text pixels."""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

import os

# 한글 글꼴: ONEFC_PREVIEW_FONT 우선, 없으면 흔한 CJK 글꼴 경로 중 처음 있는 것.
FONT_CANDIDATES = [
    os.environ.get("ONEFC_PREVIEW_FONT", ""),
    "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
]
FONT = next((p for p in FONT_CANDIDATES if p and os.path.exists(p)), None)
if FONT is None:
    sys.exit("no CJK font found; set ONEFC_PREVIEW_FONT")


def color(value):
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def ellipsize(draw, text, font, available):
    if available <= 0 or draw.textlength(text, font=font) <= available:
        return text
    ellipsis = "…"
    end = len(text)
    while end > 0 and draw.textlength(text[:end] + ellipsis, font=font) > available:
        end -= 1
    return ellipsis if end == 0 else text[:end] + ellipsis


def render(scene, out_dir):
    image = Image.new("RGB", (scene["width"], scene["height"]), color(scene.get("background", "#F4F6F5")))
    draw = ImageDraw.Draw(image)
    for node in scene["nodes"]:
        x, y, w, h = node["x"], node["y"], node["w"], node["h"]
        if node["kind"] == "box":
            radius = node.get("radius", 0)
            box = [x, y, x + w - 1, y + h - 1]
            draw.rounded_rectangle(box, radius=radius, fill=color(node["fill"]))
            if node.get("stroke"):
                draw.rounded_rectangle(box, radius=radius, outline=color(node["stroke"]), width=max(1, int(node.get("strokeWidth", 1))))
        elif node["kind"] == "text":
            font = ImageFont.truetype(FONT, max(1, int(round(node["size"]))))
            if node.get("bold"):
                font = ImageFont.truetype(FONT, max(1, int(round(node["size"]))))
            available = max(0, w - node.get("padX", 0) * 2)
            text = ellipsize(draw, node["text"], font, available) if node.get("ellipsize", True) else node["text"]
            bbox = draw.textbbox((0, 0), text, font=font)
            text_w = bbox[2] - bbox[0]
            text_h = bbox[3] - bbox[1]
            gravity = node.get("gravity", "start")
            if "center_h" in gravity:
                tx = x + (w - text_w) / 2
            elif "end" in gravity:
                tx = x + w - text_w - node.get("padX", 0)
            else:
                tx = x + node.get("padX", 0)
            if "center_v" in gravity:
                ty = y + (h - text_h) / 2 - bbox[1]
            elif "bottom" in gravity:
                ty = y + h - text_h - node.get("padY", 0) - bbox[1]
            else:
                ty = y + node.get("padY", 0) - bbox[1]
            fill = color(node["color"])
            draw.text((tx, ty), text, font=font, fill=fill)
            if node.get("bold"):
                draw.text((tx + 0.6, ty), text, font=font, fill=fill)
        elif node["kind"] == "icon":
            cx, cy = x + w / 2, y + h / 2
            size = min(w, h)
            ink = color("#065123")
            if node["name"] == "add":
                arm = size * 0.28
                thick = max(2, size * 0.12)
                draw.rectangle([cx - thick / 2, cy - arm, cx + thick / 2, cy + arm], fill=ink)
                draw.rectangle([cx - arm, cy - thick / 2, cx + arm, cy + thick / 2], fill=ink)
            elif node["name"] == "refresh":
                rad = size * 0.28
                draw.arc([cx - rad, cy - rad, cx + rad, cy + rad], start=40, end=300, fill=ink, width=max(2, int(size * 0.08)))
    path = Path(out_dir) / f"{scene['name']}.png"
    image.save(path)
    return path


def main():
    payload = json.loads(Path(sys.argv[1]).read_text())
    out_dir = sys.argv[2]
    for scene in payload["scenes"]:
        print(render(scene, out_dir))


if __name__ == "__main__":
    main()
