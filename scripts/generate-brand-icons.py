from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
MARK_PATH = ROOT / "assets" / "ui" / "mark.png"
ASSETS_DIR = ROOT / "assets"


def crop_content(image: Image.Image, threshold: int = 24) -> Image.Image:
    grayscale = image.convert("L")
    mask = grayscale.point(lambda value: 255 if value > threshold else 0)
    bbox = mask.getbbox()
    if bbox is None:
        raise ValueError("No visible content found in source image")
    return image.crop(bbox)


def extract_mark(image: Image.Image, threshold: int = 64) -> Image.Image:
    grayscale = image.convert("L")
    mask = grayscale.point(lambda value: 255 if value > threshold else 0)
    rgba = image.copy()
    rgba.putalpha(mask)
    return crop_content(rgba, threshold=1)


def fit_center(image: Image.Image, size: int, scale: float) -> Image.Image:
    target = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    inner = int(size * scale)
    fitted = ImageOps.contain(image, (inner, inner), Image.Resampling.LANCZOS)
    offset = ((size - fitted.width) // 2, (size - fitted.height) // 2)
    target.alpha_composite(fitted, offset)
    return target


def build_background(size: int) -> Image.Image:
    base = Image.new("RGBA", (size, size), "#050913")
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)

    cyan = (65, 176, 255, 255)
    steel = (151, 230, 255, 255)

    draw.ellipse(
        (size * 0.16, size * 0.14, size * 0.84, size * 0.82),
        outline=cyan,
        width=max(2, size // 96),
    )
    draw.ellipse(
        (size * 0.24, size * 0.22, size * 0.76, size * 0.74),
        outline=steel,
        width=max(2, size // 128),
    )
    draw.line(
        (size * 0.18, size * 0.5, size * 0.82, size * 0.5),
        fill=(73, 132, 219, 160),
        width=max(1, size // 160),
    )
    draw.line(
        (size * 0.5, size * 0.12, size * 0.5, size * 0.88),
        fill=(73, 132, 219, 120),
        width=max(1, size // 160),
    )

    bloom = glow.filter(ImageFilter.GaussianBlur(radius=size // 28))
    vignette = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    vignette_draw = ImageDraw.Draw(vignette)
    vignette_draw.rounded_rectangle(
        (0, 0, size - 1, size - 1),
        radius=size // 7,
        outline=(255, 255, 255, 20),
        width=max(1, size // 128),
    )

    return Image.alpha_composite(
        Image.alpha_composite(base, bloom),
        Image.alpha_composite(glow, vignette),
    )


def tint_monochrome(image: Image.Image, color: tuple[int, int, int, int]) -> Image.Image:
    alpha = image.getchannel("A")
    tinted = Image.new("RGBA", image.size, color)
    tinted.putalpha(alpha)
    return tinted


def create_favicon(icon: Image.Image) -> Image.Image:
    return icon.resize((48, 48), Image.Resampling.LANCZOS)


def compose_icon(background_size: int, emblem: Image.Image, scale: float) -> Image.Image:
    background = build_background(background_size)
    centered_emblem = fit_center(emblem, background_size, scale=scale)
    return Image.alpha_composite(background, centered_emblem)


def main() -> None:
    mark_source = Image.open(MARK_PATH).convert("RGBA")
    emblem = extract_mark(mark_source, threshold=72)
    icon = compose_icon(1024, emblem, scale=0.68)
    background = build_background(512)
    foreground = fit_center(emblem, 512, scale=0.74)
    monochrome = tint_monochrome(foreground, (218, 230, 244, 255))
    splash = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    splash.alpha_composite(fit_center(emblem, 1024, scale=0.62))
    favicon = create_favicon(icon)

    outputs = {
        ASSETS_DIR / "icon.png": icon,
        ASSETS_DIR / "favicon.png": favicon,
        ASSETS_DIR / "splash-icon.png": splash,
        ASSETS_DIR / "android-icon-background.png": background,
        ASSETS_DIR / "android-icon-foreground.png": foreground,
        ASSETS_DIR / "android-icon-monochrome.png": monochrome,
    }

    for path, image in outputs.items():
        image.save(path)
        print(f"wrote {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
