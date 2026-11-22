import type { Monster } from "../Monster";

export interface BehaviorMeta {
    type: string;
    name: string;
    description?: string;
}

export interface BehaviorConfig {
    type: string;
    config: Record<string, unknown>;
}

export abstract class IBehavior {
    public abstract readonly meta: BehaviorMeta;

    public onAttach(_monster: Monster): void {}
    public onDetach(_monster: Monster): void {}

    public applyConfig(_config: Record<string, unknown>): void {}

    public abstract update(
        monster: Monster,
        delta: number
    ): void;
}

export interface ISpecialActionBehavior extends IBehavior {
    resolve(success: boolean): void;
}