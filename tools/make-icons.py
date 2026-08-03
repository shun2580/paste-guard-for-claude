#!/usr/bin/env python3
"""icons/icon.svg から 16/48/128px の PNG を生成する。

使い方 (WSL):
    pip install cairosvg --break-system-packages
    python3 tools/make-icons.py
"""
from pathlib import Path

import cairosvg

ROOT = Path(__file__).resolve().parent.parent
SVG = ROOT / "icons" / "icon.svg"

for size in (16, 48, 128):
    out = ROOT / "icons" / f"icon{size}.png"
    cairosvg.svg2png(
        url=str(SVG), write_to=str(out), output_width=size, output_height=size
    )
    print(f"generated {out.relative_to(ROOT)}")
