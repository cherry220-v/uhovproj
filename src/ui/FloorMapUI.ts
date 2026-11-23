import Phaser from 'phaser';
import type DropDownList from 'phaser4-rex-plugins/templates/ui/dropdownlist/DropDownList';
import { DEPTH } from '../rendering/depth';
import { MenuButton } from './MenuButton';

import { GlitchManager } from '../effects/GlitchManager';
import { FloorManager } from '../engine/FloorManager';

export interface FloorMapOptions {
    scene: Phaser.Scene;
    floorManager: FloorManager;
    floor?: number;
    onFloorChange?: (floor: number) => void;
    mainCamera?: Phaser.Cameras.Scene2D.Camera;
    hoverSound?: string;
    clickSound?: string;
}

interface FloorOption {
    floor: number;
}

const SCREEN = { width: 800, height: 600 };
const MARGIN = 10;
const MAP_HEIGHT = 470;
const FRAME_PAD = 10;
const BTN_WIDTH = 130;
const BTN_HEIGHT = 30;
const GAP = 8;

const TEXT_STYLE = { color: '#dcdcdc', fontSize: '15px' } as const;
const BG_IDLE = 0x262626;
const BG_HOVER = 0x3d3d3d;
const STROKE = 0x555555;

type FillableShape = { setFillStyle(color: number): unknown };

type DepthSettable = { setDepth(depth: number): unknown };

export function floorTextureKey(floor: number): string {
    return `floor-plan-${floor}`;
}

export class FloorMapUI extends Phaser.GameObjects.Container {
    private readonly dropdown: DropDownList;
    private readonly frame: Phaser.GameObjects.Rectangle;
    private readonly mapImage: Phaser.GameObjects.Image;
    private readonly btnText: Phaser.GameObjects.Text;
    private readonly closeMapBtn: MenuButton;
    private readonly onFloorChange?: (floor: number) => void;
    private readonly hoverSound?: string;
    private readonly clickSound?: string;
    private floorManager!: FloorManager;
    private floor: number;
    private isMapVisible: boolean = true;

    constructor(options: FloorMapOptions) {
        super(options.scene);
        this.onFloorChange = options.onFloorChange;
        this.hoverSound = options.hoverSound;
        this.clickSound = options.clickSound;
        this.floor = options.floor ?? this.floorManager.getActiveFloors()[0]?.id ?? 1;
        this.floorManager = options.floorManager;

        const btnCenterY = SCREEN.height - MARGIN - BTN_HEIGHT / 2;
        const imgBottom =
            SCREEN.height - MARGIN - BTN_HEIGHT - GAP - FRAME_PAD;

        const btnBackground = this.scene.rexUI.add
            .roundRectangle(0, 0, 2, 2, 4, BG_IDLE)
            .setStrokeStyle(1, STROKE);

        this.frame = this.scene.add
            .rectangle(0, 0, 2, 2, BG_IDLE, 0.62)
            .setOrigin(0, 1)
            .setStrokeStyle(1, STROKE)
            .setScrollFactor(0)
            .setDepth(DEPTH.UI + 5);

        this.mapImage = this.scene.add
            .image(0, 0, floorTextureKey(this.floor))
            .setOrigin(0, 1)
            .setScrollFactor(0)
            .setDepth(DEPTH.UI + 6);
        
        this.closeMapBtn = new MenuButton({
            scene: this.scene,
            x: (MARGIN + BTN_WIDTH / 2) + 140,
            y: btnCenterY,
            label: '×',
            fontSize: '24px',
            width: 40,
            height: BTN_HEIGHT,
            hoverSound: 'sfx_hover',
            clickSound: 'sfx_click',
            disableAfterClick: false,
            onClick: () => {
                let v = (!this.isMapVisible) ? 1 : 0;
                this.mapImage.setAlpha(v);
                this.frame.setAlpha(v);
                this.isMapVisible = !this.isMapVisible;
            }
        });
        this.closeMapBtn.setDepth(DEPTH.UI+7);
        this.closeMapBtn.setScrollFactor(0);

        this.btnText = this.scene.add.text(0, 0, `Этаж ${this.floor}`, TEXT_STYLE);

        const floorOptions: FloorOption[] = this.floorManager
            .getActiveFloors()
            .map(f => ({ floor: f.id }));

        this.dropdown = this.scene.rexUI.add.dropDownList({
            x: MARGIN + BTN_WIDTH / 2,
            y: btnCenterY,
            width: BTN_WIDTH,
            height: BTN_HEIGHT,
            background: btnBackground,
            text: this.btnText,
            space: { left: 12, right: 12 },
            options: floorOptions,
            list: {
                createButtonCallback: (scene, option) =>
                    this.createOptionButton(scene, option as FloorOption),
                onButtonClick: (_button, index) => {
                    this.setFloor(floorOptions[index].floor);
                    this.play(this.clickSound);
                },
                onButtonOver: button => {
                    this.optionBackground(button)?.setFillStyle(BG_HOVER);
                    this.play(this.hoverSound, 0.25);
                },
                onButtonOut: button => {
                    this.optionBackground(button)?.setFillStyle(BG_IDLE);
                },
                expandDirection: 'up',
                easeIn: 120,
                easeOut: 120,
                space: { item: 4 }
            },
            value: this.floor
        });

        this.dropdown.setDepth(DEPTH.UI + 7).setScrollFactor(0);

        this.dropdown.layout();

        (this.dropdown.getElement('background') as unknown as DepthSettable | null)
            ?.setDepth(DEPTH.UI + 6);
        this.btnText.setDepth(DEPTH.UI + 7);
        this.dropdown.on(
            'list.open',
            (_ddl: unknown, panel: unknown) => {
                const listPanel = panel as DepthSettable & Phaser.GameObjects.GameObject;
                listPanel.setDepth(DEPTH.UI + 8);
                options.mainCamera?.ignore(this.collectTree(listPanel));
            }
        );

        options.mainCamera?.ignore(
            this.collectTree(this.dropdown).concat(this.frame, this.mapImage)
        );

        this.layoutFloorImage();
        this.add([
            this.frame,
            this.mapImage,
            this.closeMapBtn,
            this.dropdown
        ]);
    }

    public get currentFloor(): number {
        return this.floor;
    }

    public setFloor(floor: number): void {
        this.floor = floor;
        this.btnText.setText(`Этаж ${floor}`);
        this.layoutFloorImage();
        this.onFloorChange?.(floor);
    }

    public getFloor(): number {
        return this.floor;
    }

    public closeList(): void {
        if (this.dropdown.isOpened) {
            this.dropdown.closeListPanel();
        }
    }

    private collectTree(
        root: Phaser.GameObjects.GameObject
    ): Phaser.GameObjects.GameObject[] {
        const out: Phaser.GameObjects.GameObject[] = [root];
        const walk = (obj: Phaser.GameObjects.GameObject): void => {
            const kids = (obj as unknown as { children?: unknown }).children;
            const list = Array.isArray(kids)
                ? kids
                : (kids as { list?: Phaser.GameObjects.GameObject[] } | undefined)
                      ?.list;
            if (Array.isArray(list)) {
                for (const kid of list) {
                    out.push(kid);
                    walk(kid);
                }
            }
        };
        walk(root);
        return out;
    }

    public destroy(): void {
        this.dropdown.destroy();
        this.mapImage.destroy();
        this.frame.destroy();
    }

    private layoutFloorImage(): void {
        const key = floorTextureKey(this.floor);

        if (!this.scene.textures.exists(key)) {
            this.mapImage.setVisible(false);
            this.frame.setVisible(false);
            return;
        }

        this.mapImage.setVisible(true);
        this.frame.setVisible(true);

        const source = this.scene.textures.get(key).getSourceImage() as {
            width: number;
            height: number;
        };
        const aspect = source.width / source.height;
        const mapWidth = Math.round(MAP_HEIGHT * aspect);

        const imgX = MARGIN + FRAME_PAD;
        const imgBottom =
            SCREEN.height - MARGIN - BTN_HEIGHT - GAP - FRAME_PAD;

        this.mapImage
            .setTexture(key)
            .setPosition(imgX, imgBottom)
            .setDisplaySize(mapWidth, MAP_HEIGHT);

        this.frame
            .setPosition(MARGIN, imgBottom + FRAME_PAD)
            .setSize(mapWidth + FRAME_PAD * 2, MAP_HEIGHT + FRAME_PAD * 2);
    }

    private createOptionButton(
        scene: Phaser.Scene,
        option: FloorOption
    ): Phaser.GameObjects.GameObject {
        return scene.rexUI.add.label({
            width: BTN_WIDTH,
            height: 28,
            background: scene.rexUI.add.roundRectangle(0, 0, 2, 2, 4, BG_IDLE),
            text: scene.add.text(0, 0, `Этаж ${option.floor}`, TEXT_STYLE),
            space: { left: 12 }
        });
    }

    private optionBackground(
        button: Phaser.GameObjects.GameObject
    ): FillableShape | null {
        const getElement = (
            button as Phaser.GameObjects.GameObject & {
                getElement?: (
                    name: string
                ) => Phaser.GameObjects.GameObject | null;
            }
        ).getElement;
        const bg = getElement?.call(button, 'background');
        return (bg as FillableShape | null) ?? null;
    }

    private play(key?: string, volume = 0.4): void {
        if (key && this.scene.cache.audio.exists(key)) {
            this.scene.sound.play(key, { volume });
        }
    }
    
    public setMapVisible(b: boolean) {
        let v = (b) ? 1 : 0
        this.frame.setAlpha(v);
        this.mapImage.setAlpha(v);
    }

    public get mapVisible(): boolean {
        return this.isMapVisible;
    }
}