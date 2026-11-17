/**
 * Хранится в localStorage; при сборке в Tauri localStorage живёт в WebView,
 */
export interface SaveData {
    version: number;
    nightsPassed: number;
    money: number;
    inventory: Record<string, number>;
}

export const SAVE_VERSION = 1;

const STORAGE_KEY = 'fNightsAtRKSI.save';

export function defaultSave(): SaveData {
    return { version: SAVE_VERSION, nightsPassed: 0, money: 0, inventory: {} };
}

function sanitizeInventory(raw: unknown): Record<string, number> {
    const result: Record<string, number> = {};
    if (!raw || typeof raw !== 'object') return result;
    for (const [id, count] of Object.entries(raw as Record<string, unknown>)) {
        const n = Math.floor(Number(count));
        if (id && Number.isFinite(n) && n > 0) {
            result[id] = n;
        }
    }
    return result;
}

export function loadSave(): SaveData {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultSave();
        const parsed = JSON.parse(raw) as Partial<SaveData> | null;
        if (!parsed || typeof parsed !== 'object') return defaultSave();
        return {
            version: SAVE_VERSION,
            nightsPassed: Math.max(0, Math.floor(Number(parsed.nightsPassed) || 0)),
            money: Math.max(0, Math.floor(Number(parsed.money) || 0)),
            inventory: sanitizeInventory(parsed.inventory)
        };
    } catch {
        return defaultSave();
    }
}

export function writeSave(data: SaveData): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
        console.warn('Save: не удалось записать сохранение', err);
    }
}