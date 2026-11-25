import Phaser from 'phaser';
import { GlitchManager } from '../effects/GlitchManager';
import { FloorMapUI } from './FloorMapUI';
import HorrifiFilter from 'phaser4-rex-plugins/plugins/shaders/horrifi/HorrifiFilter';
import { floorMap, getCameraName, getRoomIdFromCamera, getNextCamera, cameraDataMap } from '../scenes/Cameras';
import { DEPTH } from '../rendering/depth';
import { SpecialActionRequest } from '../ai/behaviors/special/SpecialAction';
import { IEventEmitter } from '../engine/events';
import { MenuButton } from './MenuButton';
import { FloorManager } from '../engine/FloorManager';
import { MonsterManager } from '../ai/MonsterManager';
import { getLayersConfig, getSpotPosition } from '../rendering/CameraLayers';
import { HorrifiController } from 'phaser4-rex-plugins/plugins/horrififilter';

const MONITOR_FADE_MS = 130;

export interface MonitorControllerOptions {
    scene: Phaser.Scene;
    camera: Phaser.Cameras.Scene2D.Camera;
    floorManager: FloorManager;
    events: IEventEmitter;
    monsters?: MonsterManager;
    x: number;
    y: number;
    width?: number;
    height?: number;
}

const MONSTER_HEIGHT_RATIO = 0.26;

export class MonitorController extends Phaser.GameObjects.Container {
    private glitchManager!: GlitchManager;
    private events!: IEventEmitter;

    private floorManager!: FloorManager;
    public floorMap!: FloorMapUI;
    private monitorCamera!: Phaser.Cameras.Scene2D.Camera;
    private horrifi!: HorrifiFilter;

    private horrifiFilters: HorrifiFilter[] = [];

    private sharedNoiseSeed: number = Math.random();
    private monitorBlur!: Phaser.Filters.Blur;
    private cameraImage!: Phaser.GameObjects.Image;
    private viewText!: Phaser.GameObjects.Text;
    private acceptButton!: MenuButton;
    private noSignalBg!: Phaser.GameObjects.Rectangle;
    private monsters?: MonsterManager;
    private monsterSprites: Map<string, Phaser.GameObjects.Image> = new Map();
    private overlaySprites: Map<string, Phaser.GameObjects.Image[]> = new Map();

    private onKeyLeft = (event: KeyboardEvent) => {
        if (event.repeat) return;
        this.changeCamera(true);
    };

    private onKeyRight = (event: KeyboardEvent) => {
        if (event.repeat) return;
        this.changeCamera(false);
    };

    private onKeyClose = (event: KeyboardEvent) => {
        if (event.repeat) return;
        this.toggleMonitor();
    };

    private activeCamera: string = floorMap[1]?.cameras[0] ?? "1f.1s.1";

    private monitorOpen = false;
    private flashlightUsing = false;

    private pendingRequest: SpecialActionRequest | null = null;

    constructor(options: MonitorControllerOptions) {
        super(options.scene, options.x, options.y);
        this.glitchManager = new GlitchManager(this.scene);
        this.floorManager = options.floorManager;
        this.events = options.events;
        this.monitorCamera = options.camera;
        this.monsters = options.monsters;

        this.events.on(
            "monitor:minigame-pending",
            this.onMinigamePending,
            this
        );

        this.events.on(
            "monitor:minigame-pending-end",
            this.clearMinigamePending,
            this
        );

        this.width = options.width ?? this.scene.scale.width;
        this.height = options.height ?? this.scene.scale.height;

        this.scene.lights.enable();

        this.cameraImage = this.scene.add
            .image(0, 0, this.activeCamera)
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(DEPTH.UI);
        this.add(this.cameraImage);
        this.cameraImage.setVisible(false);
        this.fitCameraImage();

        this.cameraImage.enableFilters();
        this.cameraImage.setLighting(this.flashlightUsing);
        this.glitchManager.addScreenGlitches();

        const lampLight = this.scene.lights.addLight(400, 200, 3000, 0xffeedd, 3);
        lampLight.z = DEPTH.UI + 100;

        this.floorMap = new FloorMapUI({
            scene: this.scene,
            floorManager: this.floorManager,
            floor: 1,
            mainCamera: this.scene.cameras.main,
            hoverSound: 'sfx_hover',
            clickSound: 'sfx_click',
            onFloorChange: () => this.onFloorChanged()
        });
        this.floorMap.setDepth(DEPTH.UI+1000);
        this.add(this.floorMap);

        this.viewText = this.scene.add
            .text(400, 590, '', { color: '#9adf9a', fontSize: '16px' })
            .setOrigin(0.5, 1)
            .setScrollFactor(0)
            .setDepth(DEPTH.UI+100);
        this.add(this.viewText);

        const targetFilters = this.cameraImage.filters!.internal;

        this.monitorBlur = targetFilters.addBlur(0, 0.4, 0.4, 1, 0xffffff, 1);
        this.monitorBlur.active = false;

        const { width } = this.scene.scale;

        this.acceptButton = new MenuButton({
            scene: this.scene,
            x: width - 110,
            y: 45,
            label: "#rrf421",
            onClick: () => this.onAcceptMinigame(),
            width: 180,
            height: 50,
            fontSize: "18px",
            backgroundColor: 0x8b0000,
            textColor: "#ffffff",
            disableAfterClick: false
        });
        this.add(this.acceptButton);
        this.acceptButton.setDepth(DEPTH.UI + 1001);

        this.noSignalBg = this.scene.add
            .rectangle(0, 0, this.width, this.height, 0x000000)
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(DEPTH.UI - 1)
            .setVisible(false);
        this.add(this.noSignalBg);

        this.updateCameraView();

        this.scene.input.keyboard?.on('keydown-Z', () => { this.cameraImage.setLighting(!this.flashlightUsing); this.flashlightUsing = !this.flashlightUsing; });

        this.updateMonitor();
    }

    private onMinigamePending(request: SpecialActionRequest): void {
        this.pendingRequest = request;

        this.updateMinigameButton();
    }
    
    private fixRenderOrder(): void {
        if (this.viewText) {
            this.remove(this.viewText, false);
            this.add(this.viewText);
        }

        if (this.acceptButton) {
            this.remove(this.acceptButton, false);
            this.add(this.acceptButton);
        }
    }

    private clearMinigamePending(
        request: SpecialActionRequest
    ): void {
        if (
            !this.pendingRequest ||
            this.pendingRequest.monsterId !== request.monsterId ||
            this.pendingRequest.actionId !== request.actionId
        ) {
            return;
        }

        this.pendingRequest = null;

        this.acceptButton?.setVisible(false);

        this.updateMinigameButton();
    }

    private updateMinigameButton(): void {
        if (!this.pendingRequest) {
            this.acceptButton?.setVisible(false);
            return;
        }

        const isCorrectRoom =
            getRoomIdFromCamera(this.activeCamera) ===
            getRoomIdFromCamera(this.pendingRequest.roomId);

        this.acceptButton?.setVisible(isCorrectRoom);
    }

    private onAcceptMinigame(): void {
        if (!this.pendingRequest) {
            this.pendingRequest = {
                roomId: "4f.414",
                sceneId: "QTEScene",
                actionId: "hacker_qte",
                duration: 30,
                monsterId: "korban_v1"
            };
        }

        this.events.emit("minigame:accept", this.pendingRequest);
    }

    public updateMonitorVHS(filter: HorrifiController): void {
        const proxy = { vhsStrength: 0.05 };

        this.scene.tweens.add({
            targets: proxy,
            vhsStrength: Phaser.Math.FloatBetween(0.05, 0.5),
            duration: Phaser.Math.Between(300, 5500),
            ease: 'Sine.easeInOut',

            onUpdate: () => {
                if ('vhsStrength' in filter) {
                    (filter as any).vhsStrength = proxy.vhsStrength;
                }
            },

            onComplete: () => {
                if (!this.monitorOpen) return;

                this.updateMonitorVHS(filter);
            }
        });
    }

    private playUi(key: string, volume = 0.4): void {
        if (this.scene.cache.audio.exists(key)) {
            this.scene.sound.play(key, { volume });
        }
    }

    public toggleMonitor(): void {
        this.monitorOpen = !this.monitorOpen;
        this.updateMonitor();
    }

    private updateMonitor() {
        this.floorMap.closeList();

        this.scene.tweens.killTweensOf(this.cameraImage);

        const hasSignal = this.scene.textures.exists(this.activeCamera);

        this.scene.input.keyboard?.off('keydown-A', this.onKeyLeft);
        this.scene.input.keyboard?.off('keydown-D', this.onKeyRight);
        this.scene.input.keyboard?.off('keydown-E', this.onKeyClose);

        if (this.monitorOpen) {
            this.monitorBlur.active = false;
            this.floorMap.setVisible(true);
            this.floorMap.setMapVisible(this.floorMap.mapVisible);
            this.noSignalBg.setVisible(!hasSignal);

            this.scene.input.keyboard?.on('keydown-A', this.onKeyLeft);
            this.scene.input.keyboard?.on('keydown-D', this.onKeyRight);
            this.scene.input.keyboard?.on('keydown-E', () => {this.toggleMonitor();});
            this.playUi('sfx_click');

            this.cameraImage.setVisible(hasSignal).setAlpha(0);
            this.scene.tweens.add({
                targets: this.cameraImage,
                alpha: 1,
                duration: MONITOR_FADE_MS
            });
        } else {
            this.monitorBlur.active = true;
            this.floorMap.setVisible(false);
            this.noSignalBg.setVisible(false);

            this.scene.input.keyboard?.removeAllKeys(true, true);

            this.events.emit("player:looking-end");

            this.playUi('sfx_hover', 0.25);

            this.cameraImage.setVisible(hasSignal);
            this.scene.tweens.add({
                targets: this.cameraImage,
                alpha: 0,
                duration: MONITOR_FADE_MS,
                onComplete: () => this.cameraImage.setVisible(false)
            });
        }
    }

    public get monitorOpened(): boolean {
        return this.monitorOpen;
    }

    private getCoverTransform(): {
        cover: number;
        offsetX: number;
        offsetY: number;
        sourceWidth: number;
        sourceHeight: number;
    } | null {
        if (!this.scene.textures.exists(this.activeCamera)) {
            return null;
        }

        const source = this.scene.textures.get(this.activeCamera).getSourceImage() as {
            width: number;
            height: number;
        };

        const cover = Math.max(this.width / source.width, this.height / source.height);
        const displayWidth = Math.round(source.width * cover);
        const displayHeight = Math.round(source.height * cover);

        return {
            cover,
            offsetX: Math.round((this.width - displayWidth) / 2),
            offsetY: Math.round((this.height - displayHeight) / 2),
            sourceWidth: source.width,
            sourceHeight: source.height
        };
    }

    private fitCameraImage(): void {
        const transform = this.getCoverTransform();

        if (!transform) {
            return;
        }

        this.cameraImage
            .setDisplaySize(
                Math.round(transform.sourceWidth * transform.cover),
                Math.round(transform.sourceHeight * transform.cover)
            )
            .setPosition(transform.offsetX, transform.offsetY);
    }

    public refresh(): void {
        this.syncOverlays();
        this.syncMonsters();
        this.fixRenderOrder();
    }

    private syncOverlays(): void {
        if (this.monitorOpen) {
            this.getOverlaySprites(this.activeCamera);
        }

        const transform = this.getCoverTransform();
        const displayWidth = transform
            ? Math.round(transform.sourceWidth * transform.cover)
            : 0;
        const displayHeight = transform
            ? Math.round(transform.sourceHeight * transform.cover)
            : 0;

        for (const [cameraId, overlays] of this.overlaySprites) {
            const cameraInfo = cameraDataMap[this.activeCamera];
            let isActive =
                this.monitorOpen &&
                transform !== null &&
                cameraId === this.activeCamera;
            if (!cameraInfo?.active) isActive = false;

            for (const overlay of overlays) {
                overlay.setVisible(isActive);
                overlay.setLighting(this.flashlightUsing);
                this.add(overlay);

                if (isActive) {
                    overlay
                        .setDisplaySize(displayWidth, displayHeight)
                        .setPosition(transform!.offsetX, transform!.offsetY);
                }
            }
        }
    }

    private syncMonsters(): void {
        const transform = this.getCoverTransform();
        const roomId = getRoomIdFromCamera(this.activeCamera);
        const shown = new Set<string>();

        if (this.monitorOpen && transform) {
            for (const monster of this.monsters?.getAll() ?? []) {
                if (!monster.isActive) continue;
                if (monster.currentRoom !== roomId) continue;

                const sprite = this.getMonsterSprite(monster.id);

                if (!sprite) continue;

                const spot = getSpotPosition(this.activeCamera, monster.spot);

                if (!spot) continue;

                const size = Math.round(
                    transform.sourceHeight *
                    MONSTER_HEIGHT_RATIO *
                    transform.cover
                );

                sprite
                    .setDisplaySize(size, size)
                    .setPosition(
                        transform.offsetX + spot.x * transform.cover,
                        transform.offsetY + spot.y * transform.cover
                    )
                    .setVisible(true);

                shown.add(monster.id);
                this.add(sprite);
            }
        }

        for (const [id, sprite] of this.monsterSprites) {
            if (!shown.has(id)) {
                sprite.setVisible(false);
            }
        }
    }

    private getMonsterSprite(
        monsterId: string
    ): Phaser.GameObjects.Image | undefined {
        const existing = this.monsterSprites.get(monsterId);

        if (existing) {
            return existing;
        }

        const texture = `monster_${monsterId}`;

        if (!this.scene.textures.exists(texture)) {
            return undefined;
        }

        const sprite = this.scene.add
            .image(0, 0, texture)
            .setOrigin(0.5, 1)
            .setScrollFactor(0)
            .setDepth(DEPTH.UI + 1)
            .setVisible(false);

        this.monsterSprites.set(monsterId, sprite);
        this.add(sprite);

        return sprite;
    }

    private getOverlaySprites(cameraId: string): Phaser.GameObjects.Image[] {
        const cached = this.overlaySprites.get(cameraId);

        if (cached) {
            return cached;
        }

        const config = getLayersConfig(cameraId);
        const sprites: Phaser.GameObjects.Image[] = [];

        for (const [key, layer] of Object.entries(config?.layers ?? {})) {
            if (!this.scene.textures.exists(key)) continue;

            const overlay = this.scene.add
                .image(0, 0, key)
                .setOrigin(0, 0)
                .setScrollFactor(0)
                .setDepth(DEPTH.UI + 2 + layer)
                .setVisible(false);

            sprites.push(overlay);
            this.add(overlay);
        }

        this.overlaySprites.set(cameraId, sprites);

        return sprites;
    }

    private onFloorChanged(): void {
        const floor = this.floorMap.getFloor();
        const cameras = floorMap[floor]?.cameras ?? [];

        if (cameras.length > 0) {
            const withTexture = cameras.find(id => this.scene.textures.exists(id));

            this.activeCamera = withTexture ?? cameras[0];
        }

        this.updateCameraView();
        this.updateMinigameButton();
    }

    private changeCamera(prev = false): void {
        const floor = this.floorMap.getFloor();
        const cameras = floorMap[floor]?.cameras ?? [];

        if (cameras.length > 0) {
            let nextId = getNextCamera(floor, this.activeCamera, this.floorManager, prev);

            for (let i = 0; i < cameras.length; i++) {
                if (this.scene.textures.exists(nextId)) break;

                nextId = getNextCamera(floor, nextId, this.floorManager, prev);
            }

            this.activeCamera = nextId;
        }

        this.updateCameraView();
    }

    private updateCameraView(): void {
        const cameraInfo = cameraDataMap[this.activeCamera];

        let hasSignal = this.scene.textures.exists(this.activeCamera);
        if (!cameraInfo?.active) hasSignal = false;

        this.noSignalBg.setVisible(!hasSignal && this.monitorOpen);

        if (hasSignal) {
            this.cameraImage.setTexture(this.activeCamera);
            this.fitCameraImage();
            this.cameraImage.setVisible(this.monitorOpen);

            this.viewText.setText(`вид: ${getCameraName(this.activeCamera)}`);
        } else {
            this.cameraImage.setVisible(false);
            this.overlaySprites.forEach((element: Phaser.GameObjects.Image[]) => {
                element.forEach(img => {
                    img.setVisible(false);
                });
            });

            this.monsterSprites.forEach((element: Phaser.GameObjects.Image) => {
                element.setVisible(false);
            });
            this.viewText.setText(`${getCameraName(this.activeCamera)} — нет сигнала`);
        }
    }
}
