import type { NightConfig, NightHourConfig } from "./NightRegistry";
import type { MonsterManager } from "../ai/MonsterManager";
import { BehaviorRegistry } from "../ai/behaviors/BehaviorRegistry";
import { Monster } from "../ai/Monster";
import { IEventEmitter } from "../engine/events";

export interface NightManagerOptions {
    monsters: MonsterManager;
    events: IEventEmitter;

    onHourChanged?: (hour: number) => void;
    onNightStarted?: () => void;
    onNightFinished?: () => void;

    setFloorActive: (floor: number, active: boolean) => void;
}

export class NightManager {
    private events: IEventEmitter;
    private config: NightConfig;
    private monsters: MonsterManager;

    private setFloorActive: NightManagerOptions["setFloorActive"];

    private onHourChanged?: NightManagerOptions["onHourChanged"];
    private onNightStarted?: NightManagerOptions["onNightStarted"];
    private onNightFinished?: NightManagerOptions["onNightFinished"];

    private currentHour = 0;
    private running = false;

    constructor(
        config: NightConfig,
        options: NightManagerOptions
    ) {
        this.config = config;
        this.monsters = options.monsters;
        this.events = options.events;

        this.setFloorActive = options.setFloorActive;

        this.onHourChanged = options.onHourChanged;
        this.onNightStarted = options.onNightStarted;
        this.onNightFinished = options.onNightFinished;
    }

    public startNight(): void {
        if (this.running) return;

        this.running = true;
        this.currentHour = 0;

        this.activateFloors();

        this.onNightStarted?.();

        this.nextHour();
    }

    public nextHour(): void {
        if (!this.running) return;

        this.currentHour++;

        if (this.currentHour > this.config.duration) {
            this.finishNight();
            return;
        }

        const hourConfig = this.config.hours[String(this.currentHour)];

        if (!hourConfig) {
            console.warn(`Missing config for hour ${this.currentHour}`);
            return;
        }

        this.applyHour(hourConfig);

        this.onHourChanged?.(this.currentHour);
    }

    private activateFloors(): void {
        for (const [floor, active] of Object.entries(this.config.floors)) {
            this.setFloorActive(Number(floor), active);
        }
    }

    private applyHour(config: NightHourConfig): void {
        const activeIds = new Set(config.activeMonsters);

        for (const monster of this.monsters.getAll()) {
            const active = activeIds.has(monster.id);

            monster.isActive = active;

            if (!active) continue;

            const settings = config.monsters[monster.id];

            if (!settings) continue;

            if (settings.intelligence !== undefined) {
                monster.intelligence = settings.intelligence;
            }

            this.applyBehaviors(monster, settings.behaviors);
        }
    }

    private applyBehaviors(
        monster: Monster,
        behaviors?: Record<string, Record<string, unknown>>
    ): void {
        if (!behaviors) return;

        for (const [type, config] of Object.entries(behaviors)) {
            const behavior = monster.getBehavior(type);

            if (!behavior) {
                console.warn(
                    `Monster ${monster.id} has no behavior: ${type}`
                );
                continue;
            }

            behavior.applyConfig(config);
        }
    }

    private finishNight(): void {
        this.running = false;

        for (const monster of this.monsters.getAll()) {
            monster.isActive = false;
        }

        this.onNightFinished?.();
    }

    public getCurrentHour(): number {
        return this.currentHour;
    }

    public isRunning(): boolean {
        return this.running;
    }

    public getConfig(): NightConfig {
        return this.config;
    }
}