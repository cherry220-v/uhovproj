import { BehaviorRegistry } from "./BehaviorRegistry";

import { RandomMovement } from "./movement/RandomMovement";
// import { SequentialMovement } from "./movement/SequentialMovement";
// import { DirectAttack } from "./attack/DirectAttack";

export function registerBehaviors(): void {

    BehaviorRegistry.register(
        {
            type: "random_movement",
            name: "Случайное перемещение",
            description: "Случайно выбирает следующую комнату"
        },
        RandomMovement
    );

    // BehaviorRegistry.register(
    //     {
    //         type: "sequential_movement",
    //         name: "Последовательное перемещение"
    //     },
    //     SequentialMovement
    // );

    // BehaviorRegistry.register(
    //     {
    //         type: "direct_attack",
    //         name: "Прямая атака"
    //     },
    //     DirectAttack
    // );
}