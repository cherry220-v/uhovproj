import { BehaviorRegistry } from "./BehaviorRegistry";
import type { IBehavior } from "./IBehavior";

export interface BehaviorConfig {
    type: string;
    config?: any;
}

export class BehaviorManager {

    public static create(config: BehaviorConfig): IBehavior {
        const registration = BehaviorRegistry.get(config.type);

        if (!registration) {
            throw new Error(`Unknown behavior: ${config.type}`);
        }

        return new registration.constructor(config.config ?? {});
    }

    public static createMany(configs: BehaviorConfig[]): IBehavior[] {
        return configs.map(config => this.create(config));
    }
}