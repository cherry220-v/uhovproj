import Phaser, { Scene } from "phaser";
import type { IEventEmitter } from "../engine/events";
import type { SpecialActionRequest } from "../ai/behaviors/special/SpecialAction";
import { MenuButton } from "../ui/MenuButton";

export class DoorScene extends Scene {
    private eventsBus: IEventEmitter | undefined;
    private closeButton!: MenuButton;

    constructor() {
        super({ key: "DoorScene" });
    }

    public init(data: { eventBus?: IEventEmitter }): void {
        this.eventsBus = data?.eventBus;
    }

    public create() {
        this.closeButton = new MenuButton({
            scene: this,
            x: 300,
            y: 400,
            label: "Close",
            onClick: () => {this.closeScene();}
        });
    }

    private closeScene() {
        this.events.emit("player:looking-end");
        this.scene.stop();
    }
};