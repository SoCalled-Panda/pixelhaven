#!/usr/bin/env python3
"""Visual QA: render all artwork manifests into one contact sheet PNG."""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "public" / "artwork"
OUT = Path("/home/z/my-project/artproof.png")

catalog = json.loads((ART / "catalog.json").read_text())

CELL = 6        # px per grid cell
manifests = [json.loads((ART / e["id"] / "manifest.json").read_text()) for e in catalog["artworks"]]
GRID = max(m["width"] for m in manifests)
CARD = CELL * GRID
COLS = 3
ROWS = (len(catalog["artworks"]) + COLS - 1) // COLS
PAD = 14
LABEL = 18

sheet = Image.new("RGB", (COLS * (CARD + PAD) + PAD, ROWS * (CARD + LABEL + PAD) + PAD + 10), "#fff")
draw = ImageDraw.Draw(sheet)

for i, entry in enumerate(catalog["artworks"]):
    manifest = manifests[i]
    pal = manifest["palette"]
    img = Image.new("RGB", (manifest["width"] * CELL, manifest["height"] * CELL), manifest["paperColor"])
    px = img.load()
    for y, row in enumerate(manifest["mask"]):
        for x, ch in enumerate(row):
            color = None
            if ch == "-":
                color = manifest["outlineColor"]
            elif ch != ".":
                color = pal[int(ch, 36)]
            if color:
                r, g, b = (int(color[i : i + 2], 16) for i in (1, 3, 5))
                for dy in range(CELL):
                    for dx in range(CELL):
                        px[x * CELL + dx, y * CELL + dy] = (r, g, b)
    col, row = i % COLS, i // COLS
    ox = PAD + col * (CARD + PAD)
    oy = 10 + PAD + row * (CARD + LABEL + PAD)
    sheet.paste(img, (ox, oy))
    draw.text((ox + 2, oy + CARD + 2), f'{i+1}. {entry["title"]}', fill="#43364a")

sheet.save(OUT)
print(f"contact sheet: {OUT} ({sheet.width}x{sheet.height})")
