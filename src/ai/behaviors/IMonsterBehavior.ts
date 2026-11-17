import type { Monster } from "../Monster";

export interface IMonsterBehavior {
    update(monster: Monster, delta: number): void;
}

export interface BehaviorMeta {
    type: string;
    name: string;
    description?: string;
}