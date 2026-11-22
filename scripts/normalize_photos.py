#!/usr/bin/env python3
"""Нормализация фото камер для MonitorController.

Причина бага «масштаб увеличился»: телефонные снимки хранятся «на боку»
(EXIF Orientation=8, пиксели 1728x3936 вместо 3936x1728), а Phaser
игнорирует EXIF — в игре фото повёрнуты на 90°. Плюс сырое разрешение
(до 3936 px) при растяжке на экран 800x600 давало непредсказуемый «зум».

Скрипт для каждого *.jpg в указанных папках:
  1) физически разворачивает пиксели по EXIF (exif_transpose);
  2) уменьшает до ширины CAM_WIDTH (пропорции сохраняются);
  3) перезаписывает файл на месте (JPEG q88, существенно меньше весит).

Запуск из корня проекта:
  python3 scripts/normalize_room_photos.py public/assets/rooms/1
  python3 scripts/normalize_room_photos.py public/assets/rooms/2 public/assets/rooms/3
"""
import sys
from pathlib import Path

from PIL import Image, ImageOps

CAM_WIDTH = 1600


def normalize(path: Path) -> tuple[int, int]:
    im = Image.open(path)
    im = ImageOps.exif_transpose(im)
    im = im.convert('RGB')
    if im.width > CAM_WIDTH:
        new_height = round(im.height * CAM_WIDTH / im.width)
        im = im.resize((CAM_WIDTH, new_height), Image.Resampling.LANCZOS)
    im.save(path, 'JPEG', quality=88, optimize=True)
    return im.size


def main() -> None:
    roots = [Path(a) for a in sys.argv[1:]] or [Path('public/assets/rooms')]
    for root in roots:
        for photo in sorted(root.rglob('*.jpg')):
            width, height = normalize(photo)
            print(f'{photo}: {width}x{height}')


if __name__ == '__main__':
    main()