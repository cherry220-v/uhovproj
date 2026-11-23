"""Генерация ассетов механики появления монстра на камерах.

Создаёт:
1. public/assets/monsters/korban_v1.png — красный квадрат-заглушка монстра.
2. public/assets/rooms/1/layers/<ключ>.png — перекрытия: полноформатные
   прозрачные PNG, в которых непрозрачна только вырезка из самого фото
   (трюк «перерисовываем те же пиксели поверх монстра» — объект бесшовно
   накрывает монстра, стоящего за ним).

Споты и конфиги data/layers/<камера>.json генерирует соседний скрипт
scripts/sync_layer_spots.py — он копирует споты из data/rooms.

Запуск: python3 scripts/make_monster_assets.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]

PHOTO_A = ROOT / "public/assets/rooms/1/1f.1s.1.jpg"
PHOTO_B = ROOT / "public/assets/rooms/1/1f.103.1.jpg"


def make_monster_stub() -> None:
    """Красный квадрат korban_v1 с тёмной окантовкой."""
    size = 128
    border = 6

    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, size - 1, size - 1], fill=(180, 16, 16, 255))
    d.rectangle(
        [border, border, size - 1 - border, size - 1 - border],
        fill=(224, 32, 32, 255),
    )

    out = ROOT / "public/assets/monsters/korban_v1.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    im.save(out)
    print("ok", out.relative_to(ROOT))


def build_camera_spec() -> dict:
    """Перекрытия для каждой камеры 1 этажа.

    Координаты заданы долями ширины/высоты кадра (фото 1600x702),
    поэтому при пересъёмке фото той же композиции всё пересчитается само.
    """
    spec = {
        # Парадная лестница: перила справа и подоконник накрывают монстра
        "1f.1s.1": {
            "photo": PHOTO_A,
            "layers": {
                "1f.1s.1.railing": ((0.53, 0.66, 1.0, 1.0), 1),
                "1f.1s.1.sill": ((0.33, 0.55, 0.56, 0.76), 1),
            },
        },
    }

    # Остальные 5 камер 1 этажа — одинаковый кадр «Доска почета»:
    # растение накрывает монстра на споте behind_desk, скамья справа
    for cam in ["1f.103.1", "1f.c.1", "1f.c.2", "1f.s.1", "1f.2s.1"]:
        spec[cam] = {
            "photo": PHOTO_B,
            "layers": {
                f"{cam}.plant": ((0.60, 0.04, 0.88, 0.52), 1),
                f"{cam}.bench": ((0.82, 0.58, 1.0, 1.0), 1),
            },
        }

    return spec


def make_overlay(photo: Image.Image, box) -> Image.Image:
    """Полноформатный прозрачный PNG с вырезкой фото на её месте."""
    w, h = photo.size
    fx1, fy1, fx2, fy2 = box
    x1, y1 = round(fx1 * w), round(fy1 * h)
    x2, y2 = round(fx2 * w), round(fy2 * h)

    overlay = Image.new("RGBA", photo.size, (0, 0, 0, 0))
    region = photo.convert("RGB").crop((x1, y1, x2, y2))
    overlay.paste(region, (x1, y1))
    return overlay


def main() -> None:
    make_monster_stub()

    layers_dir = ROOT / "public/assets/rooms/1/layers"
    layers_dir.mkdir(parents=True, exist_ok=True)

    for camera_id, item in build_camera_spec().items():
        photo = Image.open(item["photo"])

        for key, (box, _layer) in item["layers"].items():
            out = layers_dir / f"{key}.png"
            make_overlay(photo, box).save(out)
            print("ok", out.relative_to(ROOT))


if __name__ == "__main__":
    main()
