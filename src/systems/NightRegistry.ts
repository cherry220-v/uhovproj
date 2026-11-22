export interface NightBehaviorConfig {
    [key: string]: unknown;
}

export interface NightMonsterConfig {
    intelligence?: number;
    behaviors?: Record<string, NightBehaviorConfig>;
}

export interface NightHourConfig {
    activeMonsters: string[];
    monsters: Record<string, NightMonsterConfig>;
}

export interface NightConfig {
    id: string;
    duration: number;

    floors: Record<string, boolean>;

    hours: Record<string, NightHourConfig>;
}

const nightConfigs = import.meta.glob<NightConfig>(
    "../../data/nights/*.json",
    {
        eager: true,
        import: "default",
    }
);

export class NightRegistry {
    private static nights: Map<string, NightConfig> = new Map();

    static {
        for (const config of Object.values(nightConfigs)) {
            if (this.nights.has(config.id)) {
                console.warn(`Duplicate night config: ${config.id}`);
                continue;
            }

            this.nights.set(config.id, config);
        }
        console.log(NightRegistry.nights);
    }

    public static get(id: string): NightConfig | undefined {
        return this.nights.get(id);
    }

    public static getAll(): NightConfig[] {
        return Array.from(this.nights.values());
    }

    public static has(id: string): boolean {
        return this.nights.has(id);
    }

    public static get size(): number {
        return this.nights.size;
    }
}