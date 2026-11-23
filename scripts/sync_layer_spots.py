"""Синхронизация data/layers/<камера>.json с data/rooms.

Единый источник данных:
- список спотов каждой камеры копирует споты её комнаты
  (data/rooms/<этаж>/<комнята>.json -> "spots": [{"id": "..."}]);
- координаты точек заданы ДОЛЯМИ ширины/высоты кадра в таблице ниже,
  поэтому при пересъёмке фото той же композиции всё пересчитается само;
- файл генерируется только для камер, у которых есть фото
  (public/assets/rooms/<этаж>/<камера>.jpg).

Запуск: python3 scripts/sync_layer_spots.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

FLOORS = [1, 2, 3, 4]

# Координаты спотов в долях кадра (x, y) — точка = ноги монстра.
# Ключ камеры -> {id спота: (fx, fy)}
SPOT_FRACTIONS: dict[str, dict[str, tuple[float, float]]] = {
    # Парадная лестница: монстр за перилами (ноги скрыты, корпус видно)
    "1f.1s.1": {
        "center": (0.62, 0.72),
    },
    # Остальные камеры 1 этажа — кадр «Доска почета»
    "1f.103.1": {
        "door": (0.30, 0.66),
        "behind_desk": (0.72, 0.755),
        "center": (0.55, 0.72),
    },
}

# Перекрытия по камерам: ключ слоя -> номер слоя (выше монстра)
LAYER_TABLE: dict[str, dict[str, int]] = {
    "1f.1s.1": {"1f.1s.1.railing": 1, "1f.1s.1.sill": 1},
    "1f.103.1": {"1f.103.1.plant": 1, "1f.103.1.bench": 1},
    "1f.2s.1": {"1f.2s.1.plant": 1, "1f.2s.1.bench": 1},
    "1f.c.1": {"1f.c.1.plant": 1, "1f.c.1.bench": 1},
    "1f.c.2": {"1f.c.2.plant": 1, "1f.c.2.bench": 1},
    "1f.s.1": {"1f.s.1.plant": 1, "1f.s.1.bench": 1},
}

# Общий кадр «Доска почета» у пяти камер 1 этажа
for _cam in ["1f.2s.1", "1f.c.1", "1f.c.2", "1f.s.1"]:
    SPOT_FRACTIONS[_cam] = SPOT_FRACTIONS["1f.103.1"]


def load_room(floor: int, room_id: str) -> dict | None:
    room_dir = ROOT / f"data/rooms/{floor}"

    for path in sorted(room_dir.glob("*.json")):
        if path.name == "camera_view.json":
            continue

        try:
            config = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue

        if isinstance(config, dict) and config.get("id") == room_id:
            return config

    return None


def main() -> None:
    data_dir = ROOT / "data/layers"
    data_dir.mkdir(parents=True, exist_ok=True)

    for floor in FLOORS:
        view_path = ROOT / f"data/rooms/{floor}/camera_view.json"

        if not view_path.exists():
            continue

        cameras = json.loads(view_path.read_text(encoding="utf-8")).get("cameras", [])

        for camera_id in cameras:
            photo = ROOT / f"public/assets/rooms/{floor}/{camera_id}.jpg"

            if not photo.exists():
                print(f"-- {camera_id}: нет фото, конфиг не создаётся")
                continue

            room_id = ".".join(camera_id.split(".")[:2])
            room = load_room(floor, room_id)

            if room is None:
                print(f"!! {camera_id}: комната {room_id} не найдена")
                continue

            photo_size = None
            try:
                from PIL import Image

                with Image.open(photo) as im:
                    photo_size = im.size
            except Exception:
                photo_size = None

            width, height = photo_size or (1600, 702)

            # Споты копируются из комнаты один в один
            spot_ids = [
                spot.get("id")
                for spot in room.get("spots", [])
                if isinstance(spot, dict) and spot.get("id")
            ]

            fractions = SPOT_FRACTIONS.get(camera_id, {})
            spots: dict[str, list[int]] = {}

            for spot_id in spot_ids:
                if spot_id in fractions:
                    fx, fy = fractions[spot_id]
                    spots[spot_id] = [round(fx * width), round(fy * height)]
                else:
                    # Нет координат в таблице — точка в центре кадра
                    print(f"!! {camera_id}: спот '{spot_id}' без координат, ставлю центр")
                    spots[spot_id] = [width // 2, height // 2]

            config = {
                "layers": LAYER_TABLE.get(camera_id, {}),
                "spots": spots,
            }

            out = data_dir / f"{camera_id}.json"
            out.write_text(
                json.dumps(config, ensure_ascii=False, indent=4) + "\n",
                encoding="utf-8",
                newline="\r\n",
            )
            print(f"ok {out.relative_to(ROOT)}  spots={spot_ids}")


if __name__ == "__main__":
    main()
