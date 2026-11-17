import { Monster } from "../ai/Monster";

export class ClassRoom {
    private monsters: Monster[] = [];
    private floor: number;
    private room: number;

    public id: string;
    public name: string;

    constructor(
        floor: number,
        room: number,
        id: string,
        name: string
    ) {
        this.floor = floor;
        this.room = room;
        this.id = id;
        this.name = name;
    }

    public isOccupied()
    {
        return this.monsters.length > 0;
    }

    public monsterStepIn(monster: Monster)
    {
        this.monsters.push(monster);
    }

    public monsterStepOut(monster: Monster): void {
        const index = this.monsters.indexOf(monster);

        if (index !== -1) {
            this.monsters.splice(index, 1);
        }
    }
}
