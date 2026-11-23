export { Player } from "./Player";
export type { InventoryEntry, UseItemResult } from "./Player";
export { Energy } from "./Energy";
export type { EnergyDepletionListener } from "./Energy";
export {
    ENERGY_MAX,
    ENERGY_IDLE_DRAIN_PER_SEC,
    ENERGY_CAMERA_DRAIN_PER_SEC,
    ENERGY_MINIGAME_COST,
    STARTING_BURN_COUNT,
    ITEM_ENERGY_EFFECT,
} from "./rules";

import { Player } from "./Player";

export const player = new Player();
