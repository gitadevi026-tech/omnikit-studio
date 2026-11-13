from pathlib import Path
import sys

from PIL import Image, ImageChops


source = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("logo.png")
output = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("icon.ico")

with Image.open(source) as image:
    logo = image.convert("RGBA")
    background = Image.new("RGB", logo.size, "white")
    foreground = ImageChops.difference(logo.convert("RGB"), background)
    bounds = foreground.point(lambda pixel: 255 if pixel > 20 else 0).getbbox()
    if bounds:
        logo = logo.crop(bounds)

    side = max(logo.size)
    padding = max(1, round(side * 0.03))
    side += padding * 2
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.alpha_composite(logo, ((side - logo.width) // 2, (side - logo.height) // 2))
    square.save(
        output,
        format="ICO",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )

print(f"Created {output}")
