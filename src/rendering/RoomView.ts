import Phaser from 'phaser';
import { DEPTH } from './depth';
import type { IEventEmitter } from '../engine/events';

export interface RoomSize {
    width: number;
    height: number;
}

export interface RoomSpot {
    id: string;
    x: number;
    y: number;
    depth?: number;
}

export interface RoomSpotsData {
    id: string;
    spots: RoomSpot[];
}

export interface RoomViewOptions {
    scene: Phaser.Scene;
    bus: IEventEmitter;
    roomId: string;
    backgroundKey: string;
    backgroundSize: RoomSize;
    spots: RoomSpotsData;
}

const PAN_MS = 450;

const ROOM_SIZE = { width: 1600, height: 702 };
type RoomLayers = "none" | "classroom-computer" | "classroom-desk" | "classroom-door";
const RoomLayersCoords: Record<string, {fx: number, fy: number, zoom: number}> = {
    "none": { fx: 0.45, fy: 0.5, zoom: 1 },
    "classroom-computer": { fx: 0.46, fy: 0.62, zoom: 1.8 },
    "classroom-desk": { fx: 0.27, fy: 0.3, zoom: 1.3 },
    "classroom-door": { fx: 0.74, fy: 0.38, zoom: 1.4 }
} as const;

export class RoomView {
    public readonly roomId: string;

    private readonly scene: Phaser.Scene;
    private readonly bus: IEventEmitter;

    private readonly bgLayer: Phaser.GameObjects.Layer;
    private readonly monsterLayer: Phaser.GameObjects.Layer;
    private readonly fgLayer: Phaser.GameObjects.Layer;
    private readonly backgroundKey?: string;
    private readonly backgroundSize?: RoomSize;

    private readonly spots: Map<string, RoomSpot> = new Map();

    private readonly monsterView: Phaser.GameObjects.Rectangle;

    private readonly camView = { x: 0, y: 0, zoom: 1 };

    public activeLayer: RoomLayers = "none";
    private layersInteractive = true;

    private hotkeysEnabled: boolean = false;

    public roomLayers: Record<string, Phaser.GameObjects.Image> = {};
    public onLayerClick: Record<string, () => void> = {};

    private onDeskKey = () => this.lookAt("classroom-desk");
    private onDoorKey = () => this.lookAt("classroom-door");
    private onComputerKey = () => this.lookAt("classroom-computer");

    private onLookingEnd = () => {
        this.activeLayer = "none";

        this.setLayersInteractive(false);
        this.moveView(RoomLayersCoords["none"]);

        this.enableHotkeys();
    };

    constructor(options: RoomViewOptions) {
        this.scene = options.scene;
        this.bus = options.bus;
        this.roomId = options.roomId;
        this.backgroundKey = options.backgroundKey;
        this.backgroundSize = options.backgroundSize;

        this.bus.on("player:looking-end", this.onLookingEnd,
            this
        );

        for (const spot of options.spots.spots) {
            this.spots.set(spot.id, spot);
        }

        this.bgLayer = this.scene.add.layer().setDepth(DEPTH.ROOM_BG);
        this.monsterLayer = this.scene.add.layer().setDepth(DEPTH.MONSTER);
        this.fgLayer = this.scene.add.layer().setDepth(DEPTH.FOREGROUND);

        this.buildBackground();
        this.buildFurniture();

        this.monsterView = this.scene.add
            .rectangle(0, 0, 70, 140, 0xc03a3a)
            .setOrigin(0.5, 1)
            .setVisible(false);
        this.monsterLayer.add(this.monsterView);

        const cam = this.scene.cameras.main;
        cam.setBounds(0, 0, ROOM_SIZE.width, ROOM_SIZE.height);

        const def = RoomLayersCoords["none"];
        this.camView.x = def.fx * ROOM_SIZE.width;
        this.camView.y = def.fy * ROOM_SIZE.height;
        this.camView.zoom = def.zoom;
        cam.setZoom(this.camView.zoom);
        cam.centerOn(this.camView.x, this.camView.y);
        this.enableHotkeys();
    }

    public addLayer(
        name: string,
        textureId: string,
        pos: { x: number; y: number },
        onClick: () => void
    ): void {
        this.onLayerClick[name] = onClick;

        const layer = this.scene.add.image(pos.x, pos.y, textureId)
            .setOrigin(0, 0)
            .setDepth(DEPTH.ROOM_BG + 2);
        layer.setTint(0x999999);

        layer.on("pointerdown", () => {
            if (!this.layersInteractive) return;
            if (this.activeLayer !== name) return;

            this.disableHotkeys();
            this.setLayersInteractive(false);

            this.onLayerClick[name]?.();
        });

        this.roomLayers[name] = layer;
        this.bgLayer.add(layer);

        this.setLayerInteractive(name, false);
    }

    public setLayerInteractive(layer: string, enabled: boolean): void {
        const img = this.roomLayers[layer];
        if (!img) return;

        if (enabled) {
            img.setInteractive({ useHandCursor: true });
        } else {
            img.disableInteractive();
        }
    }

    public setLayersInteractive(enabled: boolean): void {
        this.layersInteractive = enabled;

        for (const [name, layer] of Object.entries(this.roomLayers)) {
            if (enabled && this.activeLayer === name) {
                layer.setInteractive({ useHandCursor: true });
            } else {
                layer.disableInteractive();
            }
        }

        if (!enabled) {
            this.scene.input.setDefaultCursor("default");
            this.scene.game.canvas.style.cursor = "default";
        }
    }

    public destroy(): void {
        this.bgLayer.destroy();
        this.monsterLayer.destroy();
        this.fgLayer.destroy();
    }

    private buildBackground(): void {
        if (this.backgroundKey) {
            const { width, height } = this.scene.scale;

            const bg = this.scene.add.image(0, 0, this.backgroundKey)
                .setOrigin(0, 0)
                .setScrollFactor(1)
                .setDepth(1);
            bg.setTint(0x999999);
            this.bgLayer.add(bg);
        } else {
            const bg = this.scene.add.rectangle(
                0, 0, 800, 600, 0x141414
            ).setOrigin(0, 0);

            this.bgLayer.add(bg);
        }
    }

    private moveView(target: { fx: number; fy: number; zoom: number }): void {
        this.scene.tweens.killTweensOf(this.camView);

        this.scene.tweens.add({
            targets: this.camView,
            x: target.fx * ROOM_SIZE.width,
            y: target.fy * ROOM_SIZE.height,
            zoom: target.zoom,
            duration: PAN_MS,
            ease: 'Sine.easeInOut',
            onUpdate: () => {
                this.scene.cameras.main.setZoom(this.camView.zoom);
                this.scene.cameras.main.centerOn(this.camView.x, this.camView.y);
            }
        });
    }

    public enableHotkeys(): void {
        if (this.hotkeysEnabled) return;

        this.scene.input.keyboard?.on('keydown-Q', this.onDeskKey);
        this.scene.input.keyboard?.on('keydown-W', this.onDoorKey);
        this.scene.input.keyboard?.on('keydown-C', this.onComputerKey);
        // this.scene.input.keyboard?.on('keydown-ESC', () => {
        //     this.scene.scene.start("MainMenu");
        // });

        this.hotkeysEnabled = true;
    }

    public disableHotkeys(): void {
        this.scene.input.keyboard?.off('keydown-Q', () => {
            this.lookAt("classroom-desk");
        });
        this.scene.input.keyboard?.off('keydown-W', () => {
            this.lookAt("classroom-door");
        });
        this.scene.input.keyboard?.off('keydown-C', () => {
            this.lookAt("classroom-computer");
        });
        this.hotkeysEnabled = false;
    }

    private lookAt(target: RoomLayers): void {
        if (!this.hotkeysEnabled) return;

        this.disableHotkeys();
        this.setLayersInteractive(false);

        this.activeLayer = this.activeLayer === target ? "none" : target;

        this.scene.tweens.killTweensOf(this.camView);

        this.scene.tweens.add({
            targets: this.camView,
            x: RoomLayersCoords[this.activeLayer].fx * ROOM_SIZE.width,
            y: RoomLayersCoords[this.activeLayer].fy * ROOM_SIZE.height,
            zoom: RoomLayersCoords[this.activeLayer].zoom,
            duration: PAN_MS,
            ease: "Sine.easeInOut",

            onUpdate: () => {
                const cam = this.scene.cameras.main;
                cam.setZoom(this.camView.zoom);
                cam.centerOn(this.camView.x, this.camView.y);
            },

            onComplete: () => {
                if (this.activeLayer !== "none") {
                    this.setLayerInteractive(this.activeLayer, true);
                    this.layersInteractive = true;
                    this.enableHotkeys();
                } else {
                    this.enableHotkeys();
                }
            }
        });
    }

    private buildFurniture(): void {
    }

    public get layers(): Phaser.GameObjects.Layer[] {
        return [this.bgLayer, this.monsterLayer, this.fgLayer];
    }

}
