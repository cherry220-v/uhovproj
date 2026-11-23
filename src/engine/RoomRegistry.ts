import { RoomConfig, RoomGraph } from "./RoomConfig";

// ?f*.json — ловим и "1f.1s.json", и "2f1s.json",
// но не сами camera_view.json
const roomModules = import.meta.glob<RoomConfig>(
    "../../data/rooms/**/?f*.json",
    {
        eager: true,
        import: "default",
    }
);

// Граф комнат для AI монстров: собирается из всех data-конфигов
export function buildRoomGraph(): RoomGraph {
    const configs = Object.values(roomModules).filter(
        room => room?.id && room?.ways
    );

    return new RoomGraph(configs);
}
