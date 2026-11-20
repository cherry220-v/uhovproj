export interface RoomConfig {
    id: string;
    name: string;

    ways: Record<string, number>;
    specialWays?: Record<string, number>;

    cameras?: Record<string, { active: boolean }>;
    spots?: { id: string }[];
    isSpecial?: boolean;
}

export class RoomGraph {
    private rooms: Map<string, RoomConfig>;

    constructor(configs: RoomConfig[]) {
        this.rooms = new Map(
            configs.map(room => [room.id, room])
        );
    }

    public getRoom(id: string): RoomConfig | undefined {
        return this.rooms.get(id);
    }

    public getRooms(): RoomConfig[] {
        return [...this.rooms.values()];
    }
}