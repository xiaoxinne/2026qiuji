import ButtonComponent from '../components/ButtonComponent.js';

const ITEM_DEPTH = 20;
const PRICE_DEPTH = 21;
const NUM_DEPTH = 25;
const NUM_GAP = 4;

const ANSWER_SLOTS = [
    { x: 698, y: 755 },
    { x: 948, y: 755 },
];

const SUM_SLOT = { x: 1222, y: 755 };

const LINES = [
    { x: 697, y: 806, texture: 'line', selectedTexture: 'line_s' },
    { x: 961, y: 806, texture: 'line', selectedTexture: 'line_s' },
];

const SLOT_HIT_AREAS = [
    { x: 617, y: 717, width: 162, height: 95 },
    { x: 881, y: 717, width: 162, height: 95 },
];

const HIT_DEPTH = 30;
const BUTTON_DEPTH = 40;

const RESET_BUTTON = { x: 1778, y: 878 };

const ITEMS = [
    { x: 520, y: 449, texture: 'item1', selectedTexture: 'item1_s', value: 3 },
    { x: 817, y: 480, texture: 'item2', selectedTexture: 'item2_s', value: 7 },
    { x: 1116, y: 432, texture: 'item3', selectedTexture: 'item3_s', value: 8 },
    { x: 1420, y: 464, texture: 'item4', selectedTexture: 'item4_s', value: 9 },
];

export default class gameScene extends Phaser.Scene {
    constructor() {
        super('gameScene');
    }

    create() {
        this._onVisibilityChange = () => {
            this.sound.stopAll();
        };
        document.addEventListener('visibilitychange', this._onVisibilityChange);

        this.add.image(960, 540, 'game_bg');
        this.add.image(972, 234, 'title1');

        this.itemBlocks = ITEMS.map((config) => this._createToggleItem(config));

        this.slotValues = [null, null];
        this.slotSprites = [[], []];
        this.sumSprites = [];
        this.activeSlotIndex = 0;

        this.add.image(519, 586, 'price_3').setDepth(PRICE_DEPTH);
        this.add.image(817, 586, 'price_7').setDepth(PRICE_DEPTH);
        this.add.image(1116, 586, 'price_8').setDepth(PRICE_DEPTH);
        this.add.image(1420, 586, 'price_9').setDepth(PRICE_DEPTH);

        this.lineSprites = LINES.map(({ x, y, texture }, index) =>
            this.add.image(x, y, index === 0 ? LINES[0].selectedTexture : texture),
        );
        this._createSlotHitAreas();
        this.add.image(828, 780, 'add');
        this.add.image(1091, 780, 'equal');
        this.add.image(1222, 806, 'line');

        this._createResetButton();

        this.events.once('shutdown', this._onShutdown, this);
    }

    _createResetButton() {
        this.resetBtn = new ButtonComponent(this, {
            x: RESET_BUTTON.x,
            y: RESET_BUTTON.y,
            texture: 'reset',
            clickEffectTexture: 'reset_s',
            soundKey: 'btnclick',
            keepSizeOnClickEffect: true,
            onClick: () => this._resetToInitialState(),
        });
        this.resetBtn.getMainIcon().setDepth(BUTTON_DEPTH);
    }

    _resetToInitialState() {
        this.slotValues = [null, null];
        this._clearDigits(this.slotSprites[0]);
        this._clearDigits(this.slotSprites[1]);
        this._clearDigits(this.sumSprites);

        this.itemBlocks.forEach((item) => {
            item.selected = false;
            item.sprite.setTexture(item.texture);
        });

        this.activeSlotIndex = 0;
        this._updateLineSelection();
    }

    _clearDigits(sprites) {
        sprites.forEach((sprite) => sprite.destroy());
        sprites.length = 0;
    }

    _createSlotHitAreas() {
        SLOT_HIT_AREAS.forEach((area, index) => {
            const zone = this.add.zone(area.x, area.y, area.width, area.height);
            zone.setOrigin(0, 0);
            zone.setDepth(HIT_DEPTH);
            zone.setInteractive({ useHandCursor: true });
            zone.on('pointerup', () => {
                this.sound.play('btnclick');
                this._selectSlot(index);
            });
        });
    }

    _selectSlot(index) {
        this.activeSlotIndex = index;
        this._updateLineSelection();
    }

    _updateLineSelection() {
        this.lineSprites.forEach((sprite, index) => {
            sprite.setTexture(
                index === this.activeSlotIndex
                    ? LINES[index].selectedTexture
                    : LINES[index].texture,
            );
        });
    }

    _createToggleItem({ x, y, texture, selectedTexture, value }) {
        const item = {
            selected: false,
            texture,
            selectedTexture,
            value,
            sprite: this.add.image(x, y, texture).setDepth(ITEM_DEPTH),
        };

        item.sprite.setInteractive({ useHandCursor: true });
        item.sprite.on('pointerup', () => this._toggleItem(item));
        return item;
    }

    _toggleItem(item) {
        this.sound.play('btnclick');
        if (item.selected) {
            this._tryFillSlot(item.value);
            return;
        }
        item.selected = true;
        item.sprite.setTexture(item.selectedTexture);
        this._tryFillSlot(item.value);
    }

    _tryFillSlot(value) {
        const slotIndex = this.activeSlotIndex;
        this.slotValues[slotIndex] = value;
        this._showDigits(this.slotSprites[slotIndex], ANSWER_SLOTS[slotIndex], [value]);
        this._updateLineSelection();

        if (this.slotValues[0] !== null && this.slotValues[1] !== null) {
            this._updateSum();
        } else if (slotIndex === 0 && this.slotValues[1] === null) {
            this._selectSlot(1);
        }
    }

    _updateSum() {
        const sum = this.slotValues[0] + this.slotValues[1];
        this._showDigits(this.sumSprites, SUM_SLOT, String(sum).split('').map(Number));
    }

    _showDigits(sprites, { x, y }, digits) {
        const digitW = this.textures.get('num_0').getSourceImage().width;
        const totalW = digits.length * digitW + (digits.length - 1) * NUM_GAP;
        const startX = x - totalW / 2 + digitW / 2;

        while (sprites.length > digits.length) {
            sprites.pop().destroy();
        }

        digits.forEach((digit, index) => {
            const posX = startX + index * (digitW + NUM_GAP);
            const textureKey = `num_${digit}`;
            if (!sprites[index]) {
                sprites[index] = this.add.image(posX, y, textureKey).setDepth(NUM_DEPTH);
            } else {
                sprites[index].setTexture(textureKey).setPosition(posX, y).setVisible(true);
            }
        });
    }

    _onShutdown() {
        document.removeEventListener('visibilitychange', this._onVisibilityChange);
    }
}
