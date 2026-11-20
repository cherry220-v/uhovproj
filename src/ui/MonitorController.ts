import Phaser from 'phaser';
import { GlitchManager } from '../effects/GlitchManager';
import { FloorMapUI } from './FloorMapUI';
import HorrifiFilter from 'phaser4-rex-plugins/plugins/shaders/horrifi/HorrifiFilter';
import { getCameraName, getNextCamera } from '../scenes/Cameras';
import { DEPTH } from '../rendering/depth';

const MONITOR_FADE_MS = 130;

export interface MonitorControllerOptions {
    scene: Phaser.Scene;
    x: number;
    y: number;
    width?: number;
    height?: number;
}

export class MonitorController extends Phaser.GameObjects.Container {
    private glitchManager!: GlitchManager;
    
    private floorMap!: FloorMapUI;
    private uiCamera!: Phaser.Cameras.Scene2D.Camera;
    private horrifi!: HorrifiFilter;
    private monitorBlur!: Phaser.Filters.Blur;
    private cameraImage!: Phaser.GameObjects.Image;
    private viewText!: Phaser.GameObjects.Text;

    private onKeyLeft = () => this.changeCamera(true);
    private onKeyRight = () => this.changeCamera(false);

    private activeCamera: string = "1f.1s";

    private monitorOpen = false;
    private flashlightUsing = false;

    constructor(options: MonitorControllerOptions) {
        super(options.scene, options.x, options.y);
        this.glitchManager = new GlitchManager(this.scene);

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

        this.scene.input.keyboard?.on('keydown-Z', () => {this.cameraImage.setLighting(!this.flashlightUsing);this.flashlightUsing = !this.flashlightUsing;});
        this.updateVHS();

        this.updateMonitor();
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
            // this.horrifi.enable = false;
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
            // this.horrifi.enable = true;
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
    }

    public get monitorOpened(): boolean {
        return this.monitorOpen;
    }

    private changeCamera(prev = false): void {
        console.log(this.activeCamera);
        if (this.activeCamera) {
            let floor = this.floorMap.getFloor();
            let cameraId = getNextCamera(floor, this.activeCamera, prev);
            this.activeCamera = cameraId;
            this.cameraImage.setTexture(cameraId);
        }
        this.viewText.setText(
            `вид: ${getCameraName(this.activeCamera)}`
        );
    }
}