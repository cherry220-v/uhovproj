import { Monster } from "./Monster";

export class MonsterManager{
    public getById(id: string): Monster {return new Monster("", "", "");}
}