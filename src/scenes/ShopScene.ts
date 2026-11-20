import Phaser, { Scene } from 'phaser';
import { MenuButton } from '../ui/MenuButton';
import { SceneKeys } from './SceneKeys';

import { profile } from '../meta/profile';

import { SCREEN_FADE_OUT_MS } from './MainMenu'

interface ShopItem {
    id: string;
    name: string;
    description: string;
    price: number;
    iconKey?: string;
}

export class ShopScene extends Scene {
    constructor() {
        super({ key: SceneKeys.ShopScene });
    }

    private items: ShopItem[] = [
        {
            id: 'hair', name: 'Парик',
            description: 'Новый кудрявый парик. Наверное можно замаскироваться и тебя не заметят', price: 250
        },
        {
            id: 'coca_tea', name: 'Необычный отвар',
            description: 'Состав неизвестен. Пробовать на вкус крайне не рекомендуется', price: 150
        },
        {
            id: 'chatgpt_pro', name: 'Подписка на ChatGPT',
            description: 'Кто-то из студентов не вышел из аккаунта и он пошёл по рукам', price: 120
        },
        {
            id: 'chalk', name: 'Школьный мел',
            description: 'Новый белый кусочек мела', price: 100
        },
        {
            id: 'burn', name: 'Энергетик Burn',
            description: 'Новый энергетик Burn, только из холодильника. Восстанавливает 70% энергии', price: 250
        },
        {
            id: 'monster', name: 'Энергетик Monster',
            description: 'Энергетик Monster, мечта бедных студентов. Восстанавливает 100% энергии', price: 375
        },
    ];

    private selectedItem: ShopItem | null = null;
    private selectedCardDrawFn: ((state: 'normal' | 'hover' | 'selected') => void) | null = null;
    private gridContainer!: Phaser.GameObjects.Container;
    private balanceText!: Phaser.GameObjects.Text;
    private detailsContainer!: Phaser.GameObjects.Container;

    create(): void {
        const bg = this.add.image(this.scale.width / 2, this.scale.height / 2, 'menu-bg');
        bg.displayWidth = this.scale.width;
        bg.displayHeight = this.scale.height;
        bg.setTint(0x6e7378);

        new MenuButton({
            scene: this,
            x: 95,
            y: 42,
            label: '← НАЗАД',
            fontSize: '13px',
            textColor: '#c8ccd0',
            backgroundColor: 0x333333,
            width: 140,
            height: 38,
            hoverSound: 'sfx_hover',
            clickSound: 'sfx_click',
            fadeOutMs: SCREEN_FADE_OUT_MS,
            onClick: () => this.scene.start(SceneKeys.MainMenu)
        });

        this.add.text(this.scale.width / 2, 42, 'МАГАЗИН', {
            color: '#d4d6d8',
            fontSize: '36px',
            fontStyle: 'bold',
            letterSpacing: 4
        }).setOrigin(0.5);

        this.createShopGrid();
        this.createDetailsPanel();

        this.createBalanceFooter();

        const vignette = this.cameras.main.filters.internal.addVignette(0.5, 0.5, 1.1, 0.5);
    }

    private createShopGrid(): void {
        const columns = 3;
        const cellWidth = 156;
        const cellHeight = 236;

        const totalWidth = columns * cellWidth;
        const totalHeight = Math.ceil(this.items.length / columns) * cellHeight;

        const gridCenterX = this.scale.width * 0.34;
        const gridCenterY = this.scale.height * 0.50;

        this.gridContainer = this.add.container(gridCenterX, gridCenterY);

        const outerFrame = this.add.graphics();
        outerFrame.lineStyle(2, 0x686d73, 1);
        outerFrame.strokeRect(-totalWidth / 2 - 2, -totalHeight / 2 - 2, totalWidth + 4, totalHeight + 4);
        this.gridContainer.add(outerFrame);

        this.items.forEach((item, index) => {
            const col = index % columns;
            const row = Math.floor(index / columns);

            const x = -totalWidth / 2 + cellWidth / 2 + col * cellWidth;
            const y = -totalHeight / 2 + cellHeight / 2 + row * cellHeight;

            const card = this.createDbdItemCard(x, y, cellWidth, cellHeight, item);
            this.gridContainer.add(card);
        });
    }

    private createDbdItemCard(
        x: number,
        y: number,
        width: number,
        height: number,
        item: ShopItem
    ): Phaser.GameObjects.Container {
        const card = this.add.container(x, y);
        const graphics = this.add.graphics();

        // Отрисовка состаренной серой карточки в стиле DBD
        const drawCard = (state: 'normal' | 'hover' | 'selected') => {
            graphics.clear();

            const bgFill = state === 'selected' ? 0x2c2f33 : state === 'hover' ? 0x222428 : 0x16171a;
            const borderColor = state === 'selected' ? 0xd9dde0 : state === 'hover' ? 0x8c9298 : 0x3e4146;
            const innerFrameColor = state === 'selected' ? 0x7c8288 : 0x292b2f;

            // Основной матовый серый фон
            graphics.fillStyle(bgFill, 0.96);
            graphics.fillRect(-width / 2, -height / 2, width, height);

            // Тонкая стыковочная рамка
            graphics.lineStyle(1, borderColor, 1);
            graphics.strokeRect(-width / 2, -height / 2, width, height);

            // Внутренняя потертая рамка с отступом
            graphics.lineStyle(1, innerFrameColor, 0.85);
            graphics.strokeRect(-width / 2 + 5, -height / 2 + 5, width - 10, height - 10);

            // Угловые засечки при наведении или выборе (характерный акцент DBD)
            if (state === 'hover' || state === 'selected') {
                const tick = 10;
                const pad = 5;
                graphics.lineStyle(2, borderColor, 1);

                // Левый верхний угол
                graphics.beginPath();
                graphics.moveTo(-width / 2 + pad, -height / 2 + pad + tick);
                graphics.lineTo(-width / 2 + pad, -height / 2 + pad);
                graphics.lineTo(-width / 2 + pad + tick, -height / 2 + pad);
                graphics.strokePath();

                // Правый нижний угол
                graphics.beginPath();
                graphics.moveTo(width / 2 - pad, height / 2 - pad - tick);
                graphics.lineTo(width / 2 - pad, height / 2 - pad);
                graphics.lineTo(width / 2 - pad - tick, height / 2 - pad);
                graphics.strokePath();
            }
        };

        drawCard('normal');

        // Квадратный слот товара (иконка)
        const iconSize = 96;
        const iconY = -44;
        const iconSlotBg = this.add.rectangle(0, iconY, iconSize, iconSize, 0x0f1012)
            .setStrokeStyle(1, 0x45484d);

        let iconObj: Phaser.GameObjects.GameObject;
        if (item.iconKey && this.textures.exists(item.iconKey)) {
            const img = this.add.image(0, iconY, item.iconKey);
            img.setDisplaySize(iconSize - 10, iconSize - 10);
            iconObj = img;
        } else {
            iconObj = this.add.text(0, iconY, '?', {
                color: '#52565c',
                fontSize: '36px',
                fontStyle: 'bold'
            }).setOrigin(0.5);
        }

        // Название предмета
        const nameText = this.add.text(0, 34, item.name.toUpperCase(), {
            color: '#c8ccd0',
            fontSize: '14px',
            fontStyle: 'bold',
            align: 'center',
            wordWrap: { width: width - 20 }
        }).setOrigin(0.5);

        // Тонкий разделитель
        const line = this.add.rectangle(0, 68, width - 28, 1, 0x3b3e42);

        // Цена
        const priceText = this.add.text(0, 88, `${item.price} ОЧКОВ`, {
            color: '#9ea3a8',
            fontSize: '14px',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        card.add([graphics, iconSlotBg, iconObj, nameText, line, priceText]);
        // Интерактивность без смещения карточек (чтобы не ломать монолитную сетку)
        card.setSize(width, height);
        card.setInteractive({ useHandCursor: true });
        card.on('pointerover', () => {
            this.sound.play('sfx_hover', { volume: 0.4 });
            if (this.selectedItem?.id !== item.id) {
                drawCard('hover');
            }
        });
        card.on('pointerout', () => {
            if (this.selectedItem?.id !== item.id) {
                drawCard('normal');
            }
        });
        card.on('pointerdown', () => {
            this.sound.play('sfx_click');
            if (this.selectedCardDrawFn && this.selectedItem?.id !== item.id) {
                this.selectedCardDrawFn('normal');
            }
            this.selectedItem = item;
            this.selectedCardDrawFn = drawCard;
            drawCard('selected');
            this.showItemDetails(item);
        });
        return card;
    }
    private createDetailsPanel(): void {
        // Высота совпадает с высотой 2 рядов карточек (236 * 2 = 472), стоит в том же слое справа
        const panelWidth = 350;
        const panelHeight = 472;
        const panelX = this.scale.width * 0.76;
        const panelY = this.scale.height * 0.50;
        this.detailsContainer = this.add.container(panelX, panelY);
        this.detailsContainer.setAlpha(0); // Невидима на том же слое до выбора товара
        this.detailsContainer.setVisible(false);
        // Состаренная серая рамка правой панели
        const panelBg = this.add.graphics();
        panelBg.fillStyle(0x16171a, 0.96);
        panelBg.fillRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight);
        panelBg.lineStyle(2, 0x5c6066, 1);
        panelBg.strokeRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight);
        panelBg.lineStyle(1, 0x2c2f33, 1);
        panelBg.strokeRect(-panelWidth / 2 + 6, -panelHeight / 2 + 6, panelWidth - 12, panelHeight - 12);
        // Увеличенный квадратный слот иконки
        const bigIconSize = 148;
        const bigIconY = -125;
        const bigIconFrame = this.add.rectangle(0, bigIconY, bigIconSize, bigIconSize, 0x0e0f11)
            .setStrokeStyle(1, 0x686d73);
        const bigIcon = this.add.image(0, bigIconY, '').setName('bigIcon').setVisible(false);
        const bigIconFallback = this.add.text(0, bigIconY, '?', {
            color: '#52565c',
            fontSize: '54px',
            fontStyle: 'bold'
        }).setOrigin(0.5).setName('bigIconFallback');
        // Заголовок товара
        const itemTitle = this.add.text(0, -25, '', {
            color: '#e1e4e8',
            fontSize: '20px',
            fontStyle: 'bold',
            align: 'center',
            wordWrap: { width: panelWidth - 36 }
        }).setOrigin(0.5).setName('itemTitle');
        // Разделитель
        const divider = this.add.rectangle(0, 0, panelWidth - 50, 1, 0x3b3e42);
        // Описание товара
        const itemDesc = this.add.text(0, 65, '', {
            color: '#9ea3a8',
            fontSize: '15px',
            align: 'center',
            lineSpacing: 6,
            wordWrap: { width: panelWidth - 44 }
        }).setOrigin(0.5).setName('itemDesc');
        // Кнопка «Купить» снизу панели
        const btnWidth = 240;
        const btnHeight = 46;
        const btnY = 178;
        const buyBtnBg = this.add.rectangle(0, btnY, btnWidth, btnHeight, 0x26292e)
            .setStrokeStyle(1, 0x8c9298)
            .setInteractive({ useHandCursor: true })
            .setName('buyBtnBg');
        const buyBtnText = this.add.text(0, btnY, 'КУПИТЬ', {
            color: '#e1e4e8',
            fontSize: '16px',
            fontStyle: 'bold',
            letterSpacing: 1
        }).setOrigin(0.5).setName('buyBtnText');
        buyBtnBg.on('pointerover', () => {
            this.sound.play('sfx_hover', { volume: 0.4 });
            buyBtnBg.setFillStyle(0x363a40);
            buyBtnBg.setStrokeStyle(1, 0xd9dde0);
        });
        buyBtnBg.on('pointerout', () => {
            buyBtnBg.setFillStyle(0x26292e);
            buyBtnBg.setStrokeStyle(1, 0x8c9298);
        });
        buyBtnBg.on('pointerdown', () => {
            this.sound.play('sfx_click');
            if (this.selectedItem) {
                this.onBuyItem(this.selectedItem);
            }
        });
        this.detailsContainer.add([
            panelBg,
            bigIconFrame,
            bigIcon,
            bigIconFallback,
            itemTitle,
            divider,
            itemDesc,
            buyBtnBg,
            buyBtnText
        ]);
    }
    private showItemDetails(item: ShopItem): void {
        const bigIcon = this.detailsContainer.getByName('bigIcon') as Phaser.GameObjects.Image;
        const fallback = this.detailsContainer.getByName('bigIconFallback') as Phaser.GameObjects.Text;
        const title = this.detailsContainer.getByName('itemTitle') as Phaser.GameObjects.Text;
        const desc = this.detailsContainer.getByName('itemDesc') as Phaser.GameObjects.Text;
        const btnText = this.detailsContainer.getByName('buyBtnText') as Phaser.GameObjects.Text;
        if (item.iconKey && this.textures.exists(item.iconKey)) {
            bigIcon.setTexture(item.iconKey);
            bigIcon.setDisplaySize(134, 134);
            bigIcon.setVisible(true);
            fallback.setVisible(false);
        } else {
            bigIcon.setVisible(false);
            fallback.setVisible(true);
        }
        title.setText(item.name.toUpperCase());
        desc.setText(item.description);
        btnText.setText(`КУПИТЬ(${ item.price })`);
        if (!this.detailsContainer.visible) {
            this.detailsContainer.setVisible(true);
            this.tweens.add({
                targets: this.detailsContainer,
                alpha: 1,
                duration: 160,
                ease: 'Linear'
            });
        }
    }
    private createBalanceFooter(): void {
        const footerY = this.scale.height - 38;
        const boxWidth = 260;
        const boxHeight = 36;
        const footerContainer = this.add.container(this.scale.width / 2, footerY);
        const bg = this.add.graphics();
        bg.fillStyle(0x141517, 0.92);
        bg.fillRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
        bg.lineStyle(1, 0x4b4f54, 1);
        bg.strokeRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
        this.balanceText = this.add.text(0, 0, `БАЛАНС: ${ profile.money } ОЧКОВ`, {
            color: '#c8ccd0',
            fontSize: '15px',
            fontStyle: 'bold',
            letterSpacing: 1
        }).setOrigin(0.5);
        footerContainer.add([bg, this.balanceText]);
    }
    private onBuyItem(item: ShopItem): void {
        if (profile.money >= item.price) {
            profile.money -= item.price;
            this.balanceText.setText(`БАЛАНС: ${ profile.money } ОЧКОВ`);
            console.log('Куплено: ${ item.name }');
        } else {
            this.balanceText.setColor('#a84444');
            this.tweens.add({
                targets: this.balanceText,
                x: { from: -5, to: 5 },
                duration: 50,
                yoyo: true,
                repeat: 3,
                onComplete: () => {
                    this.balanceText.setX(0);
                    this.balanceText.setColor('#c8ccd0');
                }
            });
        }
    }
}