export class Stats {
    public intelligence: number;
    public aggression: number;
    public speed: number;
    public perception: number;

    constructor(
        intelligence: number,
        aggression: number,
        speed:number,
        perception: number)
        {
            this.intelligence = intelligence;
            this.aggression = aggression;
            this.speed = speed;
            this.perception = perception;
    }
}

export class MonsterConfig{
    public id: string;
    public name: string;

    public startRoom: string;

    public stats: Stats;

    constructor(
        id: string,
        name: string,
        startRoom: string,
        stats: Stats)
        {
            this.id = id;
            this.name = name;
            this.startRoom = startRoom;
            this.stats = stats;
    }
};