import { defaultSave, loadSave, writeSave, type SaveData } from './save';

export const NIGHT_REWARD_BASE = 100;
export const NIGHT_REWARD_STEP = 50;

export function nightReward(night: number): number {
    return NIGHT_REWARD_BASE + Math.max(0, night - 1) * NIGHT_REWARD_STEP;
}

export function pluralRu(n: number, one: string, few: string, many: string): string {
    const mod100 = Math.abs(n) % 100;
    const mod10 = mod100 % 10;
    if (mod100 > 10 && mod100 < 20) return many;
    if (mod10 > 1 && mod10 < 5) return few;
    if (mod10 === 1) return one;
    return many;
}

export function moneyWord(n: number): string {
    return pluralRu(n, 'монета', 'монеты', 'монет');
}

class Profile {
    private data: SaveData = loadSave();

    get nightsPassed(): number {
        return this.data.nightsPassed;
    }

    get money(): number {
        return this.data.money;
    }
    set money(m: number) {
        this.data.money = m;
        writeSave(this.data);
    }

    isNightUnlocked(night: number): boolean {
        return night >= 1 && night <= this.data.nightsPassed + 1;
    }

    completeNight(night: number): number {
        const reward = nightReward(night);
        if (night > this.data.nightsPassed) {
            this.data.nightsPassed = night;
        }
        this.data.money += reward;
        writeSave(this.data);
        return reward;
    }

    itemCount(id: string): number {
        return this.data.inventory[id] ?? 0;
    }

    addItem(id: string, count = 1): void {
        if (count <= 0) return;
        this.data.inventory[id] = this.itemCount(id) + count;
        writeSave(this.data);
    }

    removeItem(id: string, count = 1): boolean {
        if (this.itemCount(id) < count) return false;
        const left = this.itemCount(id) - count;
        if (left > 0) this.data.inventory[id] = left;
        else delete this.data.inventory[id];
        writeSave(this.data);
        return true;
    }

    reset(): void {
        this.data = defaultSave();
        writeSave(this.data);
    }
}

export const profile = new Profile();