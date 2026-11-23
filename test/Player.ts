import { profile } from "../src/meta/profile";
import { ITEM_ORDER, ITEM_NAMES } from "../src/meta/items";
import { Energy } from "./Energy";
import {
    ITEM_ENERGY_EFFECT,
    STARTING_BURN_COUNT,
} from "./rules";

export interface InventoryEntry {
    id: string;
    name: string;
    count: number;
}

export type UseItemResult =
    | { ok: true; id: string; energyRestored: number; energyNow: number }
    | { ok: false; id: string; reason: "not_owned" | "no_effect" | "already_full" | "depleted" };

export class Player {
    public readonly energy: Energy;

    constructor() {
        this.energy = new Energy();
    }

    get coins(): number {
        return profile.money;
    }

    set coins(value: number) {
        profile.money = value;
    }

    addCoins(amount: number): void {
        if (amount <= 0) return;
        profile.money = profile.money + amount;
    }

    canAfford(amount: number): boolean {
        return amount >= 0 && profile.money >= amount;
    }

    spend(amount: number): boolean {
        if (!this.canAfford(amount)) return false;
        profile.money = profile.money - amount;
        return true;
    }

    itemCount(id: string): number {
        return profile.itemCount(id);
    }

    hasItem(id: string): boolean {
        return this.itemCount(id) > 0;
    }

    addItem(id: string, count = 1): void {
        profile.addItem(id, count);
    }

    removeItem(id: string, count = 1): boolean {
        return profile.removeItem(id, count);
    }

    inventory(): InventoryEntry[] {
        return ITEM_ORDER
            .map((id) => ({
                id,
                name: ITEM_NAMES[id] ?? id,
                count: this.itemCount(id),
            }))
            .filter((entry) => entry.count > 0);
    }

    get nightsPassed(): number {
        return profile.nightsPassed;
    }

    isNightUnlocked(night: number): boolean {
        return profile.isNightUnlocked(night);
    }

    completeNight(night: number): number {
        return profile.completeNight(night);
    }

    startNight(): void {
        this.energy.resetForNight();
    }

    grantStartingItems(): void {
        this.addItem("burn", STARTING_BURN_COUNT);
    }

    useItem(id: string): UseItemResult {
        if (!this.hasItem(id)) {
            return { ok: false, id, reason: "not_owned" };
        }

        if (this.energy.isDepleted) {
            return { ok: false, id, reason: "depleted" };
        }

        const effect = ITEM_ENERGY_EFFECT[id];
        if (!effect || effect <= 0) {
            return { ok: false, id, reason: "no_effect" };
        }

        if (this.energy.isFull) {
            return { ok: false, id, reason: "already_full" };
        }

        const removed = this.removeItem(id, 1);
        if (!removed) {
            return { ok: false, id, reason: "not_owned" };
        }

        const restored = this.energy.restore(effect);
        return {
            ok: true,
            id,
            energyRestored: restored,
            energyNow: this.energy.current,
        };
    }
}
