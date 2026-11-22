import Phaser from 'phaser';
import { GlitchManager } from '../effects/GlitchManager';
import { FloorMapUI } from './FloorMapUI';
import HorrifiFilter from 'phaser4-rex-plugins/plugins/shaders/horrifi/HorrifiFilter';
import { getCameraName, getNextCamera } from '../scenes/Cameras';
import { DEPTH } from '../rendering/depth';
import { SpecialActionRequest } from '../ai/behaviors/special/SpecialAction';
import { IEventEmitter } from '../engine/events';
import { MenuButton } from './MenuButton';
import { FloorManager } from '../engine/FloorManager';

const MONITOR_FADE_MS = 130;

export interface MonitorControllerOptions {
    scene: Phaser.Scene;
    floorManager: FloorManager;
    events: IEventEmitter;
    x: number;
    y: number;
    width?: number;
    height?: number;
}

export class MonitorController extends Phaser.GameObjects.Container {
    private glitchManager!: GlitchManager;
    private events!: IEventEmitter;
    
    private floorManager!: FloorManager;
    private floorMap!: FloorMapUI;
    private uiCamera!: Phaser.Cameras.Scene2D.Camera;
    private horrifi!: HorrifiFilter;
    private monitorBlur!: Phaser.Filters.Blur;
    private cameraImage!: Phaser.GameObjects.Image;
    private viewText!: Phaser.GameObjects.Text;
    private acceptButton!: MenuButton;

    private onKeyLeft = () => this.changeCamera(true);
    private onKeyRight = () => this.changeCamera(false);

    private activeCamera: string = "1f.1s";

    private monitorOpen = false;
    private flashlightUsing = false;
    
    private pendingRequest: SpecialActionRequest | null = null;

    constructor(options: MonitorControllerOptions) {
        super(options.scene, options.x, options.y);
        this.glitchManager = new GlitchManager(this.scene);
        this.floorManager = options.floorManager;
        this.events = options.events;

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

        this.width = options.width ?? this.scene.scale.width
        this.height = options.height ?? this.scene.scale.height

        this.scene.lights.enable();

        this.cameraImage = this.scene.add
            .image(0, 0, this.activeCamera)
            .setOrigin(0, 0)
            .setDisplaySize(this.width, this.height)
            .setScrollFactor(0)
            .setDepth(DEPTH.UI);

        this.cameraImage.enableFilters();
        this.cameraImage.setLighting(this.flashlightUsing);
        this.glitchManager.addScreenGlitches();

        const lampLight = this.scene.lights.addLight(400, 200, 3000, 0xffeedd, 3);
        lampLight.z = DEPTH.UI+100;

        this.floorMap = new FloorMapUI({
            scene: this.scene,
            floorManager: this.floorManager,
            floor: 1,
            mainCamera: this.scene.cameras.main,
            hoverSound: 'sfx_hover',
            clickSound: 'sfx_click'
        });

        this.viewText = this.scene.add
            .text(400, 590, '', { color: '#9adf9a', fontSize: '16px' })
            .setOrigin(0.5, 1)
            .setScrollFactor(0)
            .setDepth(DEPTH.UI);

        const targetFilters = this.cameraImage.filters!.internal;

        this.monitorBlur = targetFilters.addBlur(0, 0.4, 0.4, 1, 0xffffff, 1);
        this.monitorBlur.active = false;

        this.horrifi = (targetFilters as any).addRexHorrifi({
            enable: false,
            vhsEnable: true,
            vhsStrength: 0.05,
            chromaticEnable: true,
            chabIntensity: 0.03,
            scanlinesEnable: true,
            scanStrength: 0.04,
            noiseEnable: true,
            noiseStrength: 0.03,
            vignetteEnable: true,
            vignetteStrength: 0.8
        });

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
        this.acceptButton.setDepth(DEPTH.UI+1001);

        this.scene.input.keyboard?.on('keydown-Z', () => {this.cameraImage.setLighting(!this.flashlightUsing);this.flashlightUsing = !this.flashlightUsing;});
        this.updateVHS();

        this.updateMonitor();
    }

    private onMinigamePending(request: SpecialActionRequest): void {
        this.pendingRequest = request;

        this.updateMinigameButton();
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
            this.activeCamera === this.pendingRequest.roomId;

        this.acceptButton?.setVisible(isCorrectRoom);
    }

    private onAcceptMinigame(): void {
        this.pendingRequest = {roomId: "4f.414", sceneId: "QTEScene", actionId: "hacker_qte", duration: 30, monsterId: "korban_v1"};
        if (!this.pendingRequest) return;

        // if (
        //     this.activeCamera !==
        //     this.pendingRequest.roomId
        // ) return;

        this.events.emit("minigame:accept", this.pendingRequest);
        console.log("emitted in accept");
    }

    private updateVHS(): void {
        this.scene.tweens.add({
            targets: this.horrifi,
            vhsStrength: Phaser.Math.FloatBetween(0.05, 0.5),
            duration: Phaser.Math.Between(300, 1500),
            ease: 'Sine.easeInOut',
            onComplete: () => {
                this.updateVHS();
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

        if (this.monitorOpen) {
            this.monitorBlur.active = false;
            this.floorMap.visible(true);
            this.floorMap.setMapVisible(this.floorMap.mapVisible);

            this.scene.input.keyboard?.off('keydown-A', this.onKeyLeft);
            this.scene.input.keyboard?.off('keydown-D', this.onKeyRight);
            this.scene.input.keyboard?.on('keydown-A', this.onKeyLeft);
            this.scene.input.keyboard?.on('keydown-D', this.onKeyRight);
            this.playUi('sfx_click');

            this.cameraImage.setVisible(true).setAlpha(0);
            this.scene.tweens.add({
                targets: this.cameraImage,
                alpha: 1,
                duration: MONITOR_FADE_MS
            });
        } else {
            this.monitorBlur.active = true;
            this.floorMap.visible(false);

            this.scene.input.keyboard?.off('keydown-A', this.onKeyLeft);
            this.scene.input.keyboard?.off('keydown-D', this.onKeyRight);

            this.playUi('sfx_hover', 0.25);

            this.cameraImage.setVisible(true);
            this.scene.tweens.add({
                targets: this.cameraImage,
                alpha: 0,
                duration: MONITOR_FADE_MS,
                onComplete: () => this.cameraImage.setVisible(false)
            });
        }
        // this.updateMinigameButton();
    }

    public get monitorOpened(): boolean {
        return this.monitorOpen;
    }

    private changeCamera(prev = false): void {
        console.log(this.activeCamera);
        if (this.activeCamera) {
            let floor = this.floorMap.getFloor();
            let cameraId = getNextCamera(floor, this.activeCamera, this.floorManager, prev);
            this.activeCamera = cameraId;
            this.cameraImage.setTexture(cameraId);
        }
        this.viewText.setText(
            `вид: ${getCameraName(this.activeCamera)}`
        );
    }
}