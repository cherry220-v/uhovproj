import { Monster } from "./Monster";
import type { BehaviorConfig, IBehavior } from "./behaviors/IBehavior";
import type { IEventEmitter } from "../engine/events";
import type { RoomGraph } from "../engine/RoomConfig";
import { DefaultMovingBehavior } from "./behaviors/movement/DefaultMoving";
import type { DefaultMovingConfig } from "./behaviors/movement/DefaultMoving";
import { SpecialActionBehavior } from "./behaviors/special/SpecialActionBehavior";

export interface MonsterConfig {
    id: string;
    name: string;
    startRoom: string;
    behaviors: BehaviorConfig[];
    deathTexts: string[];

    sounds: {
        move: string[];
        attack: string[];
        watching: string[];
    };
}

export interface MonsterFactoryOptions {
    events: IEventEmitter;
    graph: RoomGraph;
}

export class MonsterFactory {
    private events: IEventEmitter;
    private graph: RoomGraph;

    constructor({ events, graph }: MonsterFactoryOptions) {
        this.events = events;
        this.graph = graph;
    }

    public create(config: MonsterConfig): Monster {
        const monster = new Monster(
            config.id,
            config.name,
            config.startRoom,
            config.deathTexts,
            config.sounds
        );

        for (const behaviorConfig of config.behaviors ?? []) {
            const behavior = this.createBehavior(behaviorConfig);

            if (behavior) {
                monster.addBehavior(behavior);
            }
        }

        return monster;
    }

    public createMany(configs: MonsterConfig[]): Monster[] {
        return configs.map(config => this.create(config));
    }

    private createBehavior(
        behaviorConfig: BehaviorConfig
    ): IBehavior | undefined {
        const raw = (behaviorConfig.config ?? {}) as Record<string, unknown>;

        switch (behaviorConfig.type) {
            case "default_moving":
                return new DefaultMovingBehavior(
                    raw as unknown as DefaultMovingConfig,
                    this.graph
                );

            case "special_action": {
                const duration = Number(raw.duration);
                const cooldownMs = Number(raw.cooldownMs);

                return new SpecialActionBehavior(
                    {
                        actionId: String(raw.actionId ?? "special"),
                        sceneId:
                            typeof raw.sceneId === "string"
                                ? raw.sceneId
                                : typeof raw.scene === "string"
                                    ? raw.scene
                                    : undefined,
                        duration: Number.isFinite(duration)
                            ? duration
                            : undefined,
                        cooldownMs: Number.isFinite(cooldownMs)
                            ? cooldownMs
                            : undefined
                    },
                    this.events
                );
            }

            default:
                console.warn(
                    `MonsterFactory: unknown behavior "${behaviorConfig.type}"`
                );

                return undefined;
        }
    }
}
