import { BehaviorRegistry } from "./BehaviorRegistry";

import { DefaultMovingBehavior } from "./movement/DefaultMoving";

export function registerBehaviors(): void {

    BehaviorRegistry.register(
        DefaultMovingBehavior.meta,
        DefaultMovingBehavior
    );
}