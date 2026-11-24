#!/usr/bin/env python3
"""Сжимает PNG-изображения игры в WebP, не удаляя исходные файлы."""
import re
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("Для сжатия установи Pillow: python -m pip install Pillow")

QUALITY = 82
DEFAULT_MAX = 1024
MAX_SIDE = {
    "fon": 1280, "loading": 1280, "pol": 1280,
    "pole": 1100, "lake": 1100, "factory": 1100,
    "miner": 700,
    "miner1h": 650, "miner6h": 650, "miner24h": 650,
    "6h": 600, "12h": 600, "24h": 600,
    "X2": 480, "X10": 480,
    "pushka": 420, "prorab": 520, "yeti_axe": 520, "yeti_saw": 520,
    "snow": 320, "ice": 128, "profile": 256,
}


def main() -> None:
    root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent
    assets = root / "assets"
    assets_js = root / "js" / "core" / "assets-loading.js"
    base_css = root / "css" / "core" / "base.css"
    if not assets.is_dir():
        sys.exit(f"Не найдена папка assets: {assets}")

    pngs = sorted(assets.glob("*.png"))
    if not pngs:
        sys.exit("В assets нет PNG-файлов")

    total_before = total_after = 0
    for png in pngs:
        with Image.open(png) as source:
            image = source.convert("RGBA" if "A" in source.getbands() else "RGB")
        width, height = image.size
        limit = MAX_SIDE.get(png.stem, DEFAULT_MAX)
        longest = max(width, height)
        if longest > limit:
            scale = limit / longest
            image = image.resize((max(1, round(width * scale)), max(1, round(height * scale))), Image.Resampling.LANCZOS)

        output = assets / f"{png.stem}.webp"
        image.save(output, "WEBP", quality=QUALITY, method=6, alpha_quality=90)
        before, after = png.stat().st_size, output.stat().st_size
        total_before += before
        total_after += after
        print(f"{png.stem}: {before / 1024:.0f} KB -> {after / 1024:.0f} KB")

    if not assets_js.is_file():
        sys.exit(f"Не найден файл загрузки изображений: {assets_js}")
    source = assets_js.read_text(encoding="utf-8")
    updated, count = re.subn(r"const ASSET_EXT = '(?:png|webp)';", "const ASSET_EXT = 'webp';", source)
    if count != 1:
        sys.exit("Не удалось однозначно найти ASSET_EXT в js/core/assets-loading.js; файлы WebP созданы, код не изменён")
    assets_js.write_text(updated, encoding="utf-8")
    if not base_css.is_file():
        sys.exit(f"Не найден файл базовых стилей: {base_css}")
    css_source = base_css.read_text(encoding="utf-8")
    css_updated, css_count = re.subn(r"(\.\./\.\./assets/(?:fon|ice|profile))\.png", r"\1.webp", css_source)
    if css_count != 3:
        sys.exit("Не удалось обновить все 3 CSS-пути изображений; проверь css/core/base.css")
    base_css.write_text(css_updated, encoding="utf-8")
    ratio = total_before / max(total_after, 1)
    print(f"Итого: {total_before / 1024:.0f} KB -> {total_after / 1024:.0f} KB (примерно в {ratio:.1f} раза меньше)")
    print("js/core/assets-loading.js переключён на WebP; исходные PNG сохранены")


if __name__ == "__main__":
    main()
