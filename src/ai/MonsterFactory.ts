import { Monster } from "./Monster";
import type { IEventEmitter } from "./events";
import type { BehaviorConfig } from "./behaviors/IBehavior";

export interface MonsterConfig {
    id: string;
    name: string;
    startRoom: string;
    behaviors: BehaviorConfig[];
}

export interface MonsterFactoryOptions {
    events: IEventEmitter;
}

export class MonsterFactory {
    private events: IEventEmitter;

    constructor({ events }: MonsterFactoryOptions) {
        this.events = events;
    }

    public create(config: MonsterConfig): Monster {
        const monster = new Monster(
            config.id,
            config.name,
            config.startRoom
        );

        for (const behaviorConfig of config.behaviors) {
        }

        return monster;
    }

    public createMany(configs: MonsterConfig[]): Monster[] {
        return configs.map(config => this.create(config));
    }
}