import type { MonsterConfig } from "./MonsterFactory";

const monsterConfigs = import.meta.glob<MonsterConfig>(
    "../../data/monsters/*.json",
    {
        eager: true,
        import: "default",
    }
);

export class MonsterRegistry {
    private static monsters: Map<string, MonsterConfig> = new Map();

    static {
        for (const config of Object.values(monsterConfigs)) {
            this.monsters.set(config.id, config);
        }
    }

    public static get(id: string): MonsterConfig | undefined {
        return this.monsters.get(id);
    }

    public static getAll(): MonsterConfig[] {
        return Array.from(this.monsters.values());
    }

    public static has(id: string): boolean {
        return this.monsters.has(id);
    }
}