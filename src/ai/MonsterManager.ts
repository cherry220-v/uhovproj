import { Monster } from "./Monster";
import type { IEventEmitter } from "../engine/events";
import Phaser from "phaser";

export interface MonsterManagerOptions {
    events: IEventEmitter;
}

export class MonsterManager {
    private monsters: Map<string, Monster> = new Map();
    private events: IEventEmitter;

    constructor(options: MonsterManagerOptions) {
        this.events = options.events;
    }

    public add(monster: Monster): void {
        if (this.monsters.has(monster.id)) {
            console.warn(`Monster ${monster.id} already exists`);
            return;
        }

        this.monsters.set(monster.id, monster);
    }

    public getById(id: string): Monster | undefined {
        return this.monsters.get(id);
    }

    public getAll(): Monster[] {
        return Array.from(this.monsters.values());
    }

    public has(id: string): boolean {
        return this.monsters.has(id);
    }

    public remove(id: string): boolean {
        const monster = this.monsters.get(id);

        if (!monster) return false;

        this.monsters.delete(id);
        return true;
    }

    public get size(): number {
        return this.monsters.size;
    }

    public update(delta: number): void {
        for (const monster of this.monsters.values()) {
            monster.update(delta);
            switch (monster.state) {
            case "idle":
            case "moving":
            case "watching":
            case "special":
            case "returning":
                break;

            case "attacking":
                this.onAttack(monster);
                break;
        }
        }
    }

    private onAttack(monster: Monster): void {
        const deathText = monster.deathTexts!.length > 0
        ? Phaser.Utils.Array.GetRandom(monster.deathTexts!)
        : "Вы не пережили эту ночь.";
        this.events.emit("monster:attack", {
            monster: monster,
            deathText: deathText
        });
    }

    public tick(): void {
        for (const monster of this.monsters.values()) {
            this.events.emit("monster:tick", {
                monsterId: monster.id,
                roomId: monster.currentRoom,
            });
        }
    }

    public clear(): void {
        this.monsters.clear();
    }

    public destroy(): void {
        this.clear();
    }
}