// Конфиги слоёв камер (data/layers/<камера>.json) — информационные
// файлы: точки, где монстра видно на фото, и перекрывающие объекты
export interface CameraLayersConfig {
    layers: Record<string, number>;
    spots: Record<string, number[]>;
}

const rawConfigs = import.meta.glob<CameraLayersConfig>(
    "../../data/layers/*.json",
    {
        eager: true,
        import: "default",
    }
);

const configs = new Map<string, CameraLayersConfig>();

for (const [path, config] of Object.entries(rawConfigs)) {
    const cameraId = path.split("/").pop()?.replace(/\.json$/, "");

    if (cameraId && config?.spots) {
        configs.set(cameraId, config);
    }
}

export function getLayersConfig(
    cameraId: string
): CameraLayersConfig | undefined {
    return configs.get(cameraId);
}

// Координата спота на исходном фото: сначала ищем точку по имени
// спота монстра, иначе первую заданную в конфиге
export function getSpotPosition(
    cameraId: string,
    spotName?: string | null
): { x: number; y: number } | undefined {
    const entries = Object.entries(configs.get(cameraId)?.spots ?? {});

    if (entries.length === 0) return undefined;

    const named = spotName
        ? entries.find(([id]) => id === spotName)
        : undefined;

    const [, position] = named ?? entries[0];

    return { x: position[0], y: position[1] };
}

export interface LayerAsset {
    key: string;
    floor: number;
    file: string;
}

// Картинки-перекрытия для загрузчика: ключ текстуры совпадает
// с ключом слоя, файл лежит в assets/rooms/<этаж>/layers/
export function getLayerAssets(): LayerAsset[] {
    const assets: LayerAsset[] = [];

    for (const [cameraId, config] of configs) {
        const floor = Number(cameraId.match(/^(\d+)f/)?.[1]);

        if (!floor) continue;

        for (const key of Object.keys(config.layers ?? {})) {
            assets.push({ key, floor, file: key });
        }
    }

    return assets;
}
