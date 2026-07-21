import NumButtonsComponent from '../components/NumButtonsComponent.js';
import ButtonComponent from '../components/ButtonComponent.js';

const NUMBER_BG_POS = { x: 1436, y: 718 };

const SUBMIT_BUTTON = { x: 1436, y: 878 };

const PLAY_BUTTON = { x: 1774, y: 512 };

const RESET_BUTTON = { x: 1778, y: 878 };

const TIPS_POS = { x: 283, y: 695 };

const STEP_PLAY_ACTIONS = {
    1: [
        { type: 'tips', texture: 'tips1_1' },
        { type: 'tips', texture: 'tips1_2' },
        { type: 'tips', texture: 'tips1_3' },
    ],
    2: [
        { type: 'tips', texture: 'tips1_4' },
        {
            type: 'break1',
            break: { x: 815, y: 687 },
            option2s: [
                { x: 766, y: 736, answer: 2 },
                { x: 868, y: 736, answer: 3 },
            ],
        },
        { type: 'tips', texture: 'tips1_5', enableBreak1Input: true },
        { type: 'tips', texture: 'tips1_6' },
        {
            type: 'break2',
            break: { x: 912, y: 732 },
            option10: { x: 912, y: 871 },
        },
    ],
};

const STEP2_DEPTH = 32;

const BREAK1_CONFIRM_DELAY = 700;

const BREAK1_BLINK_INTERVAL = 200;

const BREAK1_BLINK_COUNT = 4;

const STEP1_EQUATION_ANSWERS = {
    option2First: 5,
    option2Second: 7,
};

const EQUATION_ROW = {
    centerX: 960,
    y: 631,
    gapX: 20,
    depth: 35,
    items: [
        { texture: 'option2', selectedTexture: 'option2_s', selectable: true, maxDigits: 1, enabledFromStep: 1, x: 814 },
        { texture: 'add', selectable: false },
        { texture: 'option2', selectedTexture: 'option2_s', selectable: true, maxDigits: 1, enabledFromStep: 1, x: 953.58 },
        { texture: 'equalpng', selectable: false },
        { texture: 'option', selectedTexture: 'option_s', selectable: true, maxDigits: 2, enabledFromStep: 2 },
    ],
};

const OPTION_SR_GAP = 4;

const OPTION_ARROW_GAP = 4;

const BLOCK_DEPTH = 20;

const PINK_ITEMS = [
    { x: 600, y: 271 },
    { x: 704, y: 271 },
    { x: 809, y: 271 },
    { x: 655, y: 393 },
    { x: 758, y: 393 },
];

const BLUE_ITEMS = [
    { x: 1028, y: 271 },
    { x: 1136, y: 271 },
    { x: 1243, y: 271 },
    { x: 1350, y: 271 },
    { x: 1084, y: 390 },
    { x: 1191, y: 390 },
    { x: 1298, y: 390 },
];

const NUM_BUTTON_LAYOUT = {
    cols: 5,
    rows: 2,
    gapX: 16,
    gapY: 16,
};

function buildNumButtonPositions(scene, centerX, centerY) {
    const { cols, rows, gapX, gapY } = NUM_BUTTON_LAYOUT;
    const buttonW = scene.textures.get('num_0').getSourceImage().width;
    const buttonH = scene.textures.get('num_0').getSourceImage().height;
    const gridWidth = cols * buttonW + (cols - 1) * gapX;
    const gridHeight = rows * buttonH + (rows - 1) * gapY;
    const startX = centerX - gridWidth / 2 + buttonW / 2;
    const startY = centerY - gridHeight / 2 + buttonH / 2;

    return Array.from({ length: cols * rows }, (_, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        return {
            x: startX + col * (buttonW + gapX),
            y: startY + row * (buttonH + gapY),
        };
    });
}

function buildCenteredRowPositions(scene, { centerX, items, gapX }) {
    const widths = items.map((item) => scene.textures.get(item.texture).getSourceImage().width);

    if (items.some((item) => item.x != null)) {
        let nextLeft = null;

        return items.map((item, index) => {
            const width = widths[index];
            let posX;

            if (item.x != null) {
                posX = item.x;
                nextLeft = item.x + width / 2 + gapX;
            } else if (nextLeft != null) {
                posX = nextLeft + width / 2;
                nextLeft += width + gapX;
            } else {
                posX = centerX;
            }

            const { x, ...rest } = item;
            return { x: posX, ...rest };
        });
    }

    const totalWidth = widths.reduce((sum, width) => sum + width, 0) + (items.length - 1) * gapX;
    let x = centerX - totalWidth / 2;

    return items.map((item, index) => {
        const width = widths[index];
        const posX = x + width / 2;
        x += width + gapX;
        return { x: posX, ...item };
    });
}

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
        this.add.image(101, 67, 'jiaobiao');
        this.add.image(960, 92.5, 'title1');
        this.add.image(952, 511, 'item');

        this._createSelectableBlocks();
        this._createEquationRow();
        this.selectionArrow = this.add.image(0, 0, 'arrow').setDepth(50).setVisible(false);

        this.numberBgImage = this.add.image(NUMBER_BG_POS.x, NUMBER_BG_POS.y, 'number_bg');

        this.numButtons = NumButtonsComponent.create(this, {
            positions: buildNumButtonPositions(this, NUMBER_BG_POS.x, NUMBER_BG_POS.y),
            soundKey: 'btnclick',
            onClick: (value, type) => {
                if (type === 'digit') this._onNumClick(value);
            },
        });
        this._setNumButtonsDepth(45);

        this._createSubmitButton();
        this.submitBtn.setEnabled(false);
        this.submitBtn.getMainIcon().setDepth(45);
        this._setNumPadVisible(false);

        this.currentStep = 1;
        this.step1Completed = false;
        this.playIndex = 0;
        this.break1InputEnabled = false;
        this.break1SubmitPassed = false;
        this.break1SubmitLocked = false;
        this.break1ConfirmSpines = null;
        this.break1BlinkTimer = null;
        this.step2PlayComplete = false;
        this.optionAnswerRevealed = false;
        this.selectedBreak1Index = null;
        this.break1Image = null;
        this.break1Option2Items = null;
        this.break2Image = null;
        this.option10Image = null;
        this.answer11Image = null;
        this.tipsImage = this.add.image(TIPS_POS.x, TIPS_POS.y, 'tips1_1')
            .setDepth(30)
            .setVisible(false);

        this._createPlayButton();
        this._createResetButton();
        this._applyPlayButtonDisplay();
        this._syncInputEnabled();

        this.events.once('shutdown', this._onShutdown, this);
    }

    _onShutdown() {
        document.removeEventListener('visibilitychange', this._onVisibilityChange);
        this.playBtn?.destroy();
        this.playBtn = null;
        this.resetBtn?.destroy();
        this.resetBtn = null;
        this.submitBtn?.destroy();
        this.submitBtn = null;
        this.selectionArrow?.destroy();
        this.selectionArrow = null;
        this._destroySelectableBlocks();
        this._destroyStep2Elements();
        this._destroyEquationRow();
        this._destroyNumButtons();
    }

    _createSelectableBlocks() {
        this.pinkBlocks = PINK_ITEMS.map((pos) =>
            this._createToggleBlock({ ...pos, normalTexture: 'pink', selectedTexture: 'pink_s' }),
        );
        this.blueBlocks = BLUE_ITEMS.map((pos) =>
            this._createToggleBlock({ ...pos, normalTexture: 'blue', selectedTexture: 'blue_s' }),
        );
    }

    _createToggleBlock({ x, y, normalTexture, selectedTexture }) {
        const block = {
            selected: false,
            normalTexture,
            selectedTexture,
            sprite: this.add.image(x, y, normalTexture).setDepth(BLOCK_DEPTH),
        };

        block.sprite.setInteractive({ useHandCursor: true });
        block.sprite.on('pointerup', () => this._toggleBlock(block));
        return block;
    }

    _toggleBlock(block) {
        this.sound.play('btnclick');
        block.selected = !block.selected;
        block.sprite.setTexture(block.selected ? block.selectedTexture : block.normalTexture);
    }

    _destroySelectableBlocks() {
        [...(this.pinkBlocks || []), ...(this.blueBlocks || [])].forEach((block) => {
            block.sprite?.destroy();
        });
        this.pinkBlocks = null;
        this.blueBlocks = null;
    }

    _createEquationRow() {
        const positions = buildCenteredRowPositions(this, EQUATION_ROW);
        this.selectedEquationIndex = null;
        this.equationItems = positions.map((item, index) => {
            const equationItem = {
                ...item,
                inputDigits: [],
                srImages: [],
                sprite: this.add.image(item.x, EQUATION_ROW.y, item.texture).setDepth(EQUATION_ROW.depth),
            };

            if (item.selectable) {
                equationItem.sprite.setInteractive({ useHandCursor: true });
                equationItem.sprite.on('pointerup', () => this._onEquationOptionClick(index));
            }

            return equationItem;
        });
    }

    _getPlayActions() {
        return STEP_PLAY_ACTIONS[this.currentStep] || [];
    }

    _isPlayDone() {
        return this.playIndex >= this._getPlayActions().length;
    }

    _isStep1Option2InputReady() {
        return this.currentStep === 1 && this.playIndex > 0 && !this.step1Completed;
    }

    _getEquationValue(item) {
        if (!item?.inputDigits?.length) return null;
        return Number(item.inputDigits.join(''));
    }

    _getOption2Items() {
        return this.equationItems.filter((item) => item.texture === 'option2');
    }

    _isEquationItemEnabled(item) {
        if (!item?.selectable) return false;
        if (this.currentStep !== 1) return false;
        if (item.enabledFromStep > this.currentStep) return false;
        if (this.step1Completed) return false;
        if (item.texture === 'option2') {
            return this._isStep1Option2InputReady();
        }
        if (!this._isPlayDone()) return false;
        return true;
    }

    _canUseBreak1Input() {
        return this.currentStep === 2
            && this.break1InputEnabled
            && !this.break1SubmitPassed
            && !this.break1SubmitLocked;
    }

    _shouldShowNumPad() {
        if (this.currentStep === 1) {
            if (!this._isStep1Option2InputReady()) return false;
            if (this.selectedEquationIndex == null) return false;
            const selected = this.equationItems[this.selectedEquationIndex];
            return this._isEquationItemEnabled(selected);
        }

        if (this.currentStep === 2) {
            if (!this._canUseBreak1Input()) return false;
            if (this.selectedBreak1Index == null) return false;
            return true;
        }

        return false;
    }

    _setNumPadVisible(visible) {
        this.numberBgImage?.setVisible(visible);
        this.numButtons?.buttons.forEach((btn) => btn.icon.setVisible(visible));
        this.numButtons?.symbolButtons.forEach((btn) => btn.icon.setVisible(visible));
        this.submitBtn?.getMainIcon()?.setVisible(visible);
        if (!visible) {
            this.submitBtn?.setEnabled(false);
        }
    }

    _updateNumPadDisplay() {
        const visible = this._shouldShowNumPad();
        this._setNumPadVisible(visible);
        this.numButtons?.setEnabled(visible);
        this._syncSubmitEnabled();
    }

    _syncInputEnabled() {
        const inputReadyStep1 = this._isStep1Option2InputReady();
        const canUseBreak1Input = this._canUseBreak1Input();

        this.equationItems?.forEach((item, index) => {
            if (!item.selectable) return;

            const enabled = this._isEquationItemEnabled(item);
            if (enabled) {
                item.sprite.setInteractive({ useHandCursor: true });
            } else {
                item.sprite.disableInteractive();
                if (this.selectedEquationIndex === index) {
                    this.selectedEquationIndex = null;
                }
            }
        });

        this.break1Option2Items?.forEach((item, index) => {
            if (canUseBreak1Input) {
                item.sprite.setInteractive({ useHandCursor: true });
            } else {
                item.sprite.disableInteractive();
                if (this.selectedBreak1Index === index) {
                    this.selectedBreak1Index = null;
                }
            }
        });

        const optionItem = this.equationItems?.find((item) => item.texture === 'option');
        if (optionItem) {
            if (this.step2PlayComplete && !this.optionAnswerRevealed) {
                optionItem.sprite.setInteractive({ useHandCursor: true });
            } else if (!this._isEquationItemEnabled(optionItem)) {
                optionItem.sprite.disableInteractive();
            }
        }

        if (inputReadyStep1) {
            const selected = this.equationItems[this.selectedEquationIndex];
            if (selected && !this._isEquationItemEnabled(selected)) {
                this.selectedEquationIndex = null;
            }
        }

        if (canUseBreak1Input) {
            const selected = this.break1Option2Items?.[this.selectedBreak1Index];
            if (this.selectedBreak1Index != null && !selected) {
                this.selectedBreak1Index = null;
            }
        }

        this._applyEquationOptionSelection();
        this._applyBreak1OptionSelection();
        this._updateNumPadDisplay();
    }

    _checkStep1Equation() {
        if (this.currentStep !== 1 || this.step1Completed || !this._isStep1Option2InputReady()) {
            return;
        }

        const [firstOption2, secondOption2] = this._getOption2Items();
        if (!firstOption2 || !secondOption2) return;

        const firstValue = this._getEquationValue(firstOption2);
        const secondValue = this._getEquationValue(secondOption2);
        if (firstValue !== STEP1_EQUATION_ANSWERS.option2First
            || secondValue !== STEP1_EQUATION_ANSWERS.option2Second) {
            return;
        }

        if (!this._isEquationOptionFilled(firstOption2) || !this._isEquationOptionFilled(secondOption2)) {
            return;
        }

        this._enterStep2();
    }

    _enterStep2() {
        if (this.currentStep !== 1 || this.step1Completed) return;

        this.step1Completed = true;
        this.currentStep = 2;
        this.playIndex = 0;
        this.break1InputEnabled = false;
        this.break1SubmitPassed = false;
        this.break1SubmitLocked = false;
        this._clearBreak1ConfirmSpines();
        this._stopBreak1BlinkEffect();
        this.step2PlayComplete = false;
        this.optionAnswerRevealed = false;
        this.selectedBreak1Index = null;
        this.selectedEquationIndex = null;
        this.tipsImage.setVisible(false);
        this._applyPlayButtonDisplay();
        this._syncInputEnabled();
    }

    _showBreak1(action) {
        this.break1Image = this.add.image(action.break.x, action.break.y, 'break1').setDepth(STEP2_DEPTH);
        this.break1Option2Items = action.option2s.map((cfg, index) => {
            const item = {
                x: cfg.x,
                y: cfg.y,
                answer: cfg.answer,
                texture: 'option2',
                selectedTexture: 'option2_s',
                wrongTexture: 'option2_r',
                maxDigits: 1,
                inputDigits: [],
                srImages: [],
                sprite: this.add.image(cfg.x, cfg.y, 'option2').setDepth(STEP2_DEPTH + 1),
            };
            item.sprite.on('pointerup', () => this._onBreak1Option2Click(index));
            return item;
        });
    }

    _showBreak2(action) {
        this.break2Image = this.add.image(action.break.x, action.break.y, 'break2').setDepth(STEP2_DEPTH);
        this.option10Image = this.add.image(action.option10.x, action.option10.y, 'option10').setDepth(STEP2_DEPTH + 1);
        this.step2PlayComplete = true;
    }

    _executePlayAction(action) {
        switch (action.type) {
            case 'tips':
                this.tipsImage.setVisible(true);
                this.tipsImage.setTexture(action.texture);
                if (action.enableBreak1Input) {
                    this.break1InputEnabled = true;
                }
                break;
            case 'break1':
                this._showBreak1(action);
                break;
            case 'break2':
                this._showBreak2(action);
                break;
            default:
                break;
        }
    }

    _onBreak1Option2Click(index) {
        if (!this._canUseBreak1Input()) return;
        if (this.selectedBreak1Index === index) return;

        this.sound.play('btnclick');
        this.selectedBreak1Index = index;
        this._syncInputEnabled();
    }

    _applyBreak1OptionSelection() {
        this.break1Option2Items?.forEach((item, index) => {
            const selected = index === this.selectedBreak1Index && this._canUseBreak1Input();
            item.sprite.setTexture(selected ? item.selectedTexture : item.texture);
        });

        if (!this._canUseBreak1Input()) {
            return;
        }

        const selected = this.break1Option2Items?.[this.selectedBreak1Index];
        if (selected) {
            this._updateSelectionArrow(selected);
        } else {
            this._hideSelectionArrow();
        }
    }

    _updateSelectionArrow(item) {
        if (!item?.sprite || !this.selectionArrow) {
            this._hideSelectionArrow();
            return;
        }

        const { sprite } = item;
        const arrowHeight = this.selectionArrow.displayHeight;
        const bgHeight = sprite.displayHeight;

        this.selectionArrow.setPosition(
            sprite.x,
            sprite.y - bgHeight / 2 - arrowHeight / 2 - OPTION_ARROW_GAP,
        );
        this.selectionArrow.setVisible(true);
    }

    _hideSelectionArrow() {
        this.selectionArrow?.setVisible(false);
    }

    _revealAnswer11() {
        const optionItem = this.equationItems.find((item) => item.texture === 'option');
        if (!optionItem || this.optionAnswerRevealed) return;

        this.sound.play('btnclick');

        this.answer11Image = this.add
            .image(optionItem.sprite.x, optionItem.sprite.y, 'answer11')
            .setDepth(EQUATION_ROW.depth + 10);
        this.optionAnswerRevealed = true;
        optionItem.sprite.disableInteractive();
    }

    _destroyStep2Elements() {
        this._clearBreak1ConfirmSpines();
        this._stopBreak1BlinkEffect();
        this.break1Image?.destroy();
        this.break2Image?.destroy();
        this.option10Image?.destroy();
        this.answer11Image?.destroy();
        this.break1Option2Items?.forEach((item) => {
            item.srImages?.forEach((srImage) => srImage.destroy());
            item.sprite?.destroy();
        });
        this.break1Image = null;
        this.break2Image = null;
        this.option10Image = null;
        this.answer11Image = null;
        this.break1Option2Items = null;
    }

    _onEquationOptionClick(index) {
        const item = this.equationItems[index];
        if (item.texture === 'option' && this.step2PlayComplete && !this.optionAnswerRevealed) {
            this._revealAnswer11();
            return;
        }
        if (!this._isEquationItemEnabled(item)) return;
        if (this.selectedEquationIndex === index) return;

        this.sound.play('btnclick');
        this.selectedEquationIndex = index;
        this._syncInputEnabled();
    }

    _applyEquationOptionSelection() {
        this.equationItems.forEach((item, index) => {
            if (!item.selectable) return;
            const selected = index === this.selectedEquationIndex && this._isEquationItemEnabled(item);
            item.sprite.setTexture(selected ? item.selectedTexture : item.texture);
        });

        if (this._canUseBreak1Input()) {
            return;
        }

        const selected = this.equationItems[this.selectedEquationIndex];
        if (selected && this._isEquationItemEnabled(selected)) {
            this._updateSelectionArrow(selected);
        } else {
            this._hideSelectionArrow();
        }
    }

    _updateInputSrDisplay(item, depth, digitPrefix = 'sr') {
        const { inputDigits, sprite } = item;

        if (!inputDigits.length) {
            item.srImages.forEach((srImage) => srImage.destroy());
            item.srImages = [];
            return;
        }

        const digitW = this.textures.get(`${digitPrefix}_0`).getSourceImage().width;
        const totalW = inputDigits.length * digitW + (inputDigits.length - 1) * OPTION_SR_GAP;
        const startX = sprite.x - totalW / 2 + digitW / 2;

        while (item.srImages.length > inputDigits.length) {
            item.srImages.pop().destroy();
        }

        inputDigits.forEach((digit, index) => {
            const x = startX + index * (digitW + OPTION_SR_GAP);
            const textureKey = `${digitPrefix}_${digit}`;
            if (!item.srImages[index]) {
                item.srImages[index] = this.add
                    .image(x, sprite.y, textureKey)
                    .setDepth(depth);
            } else {
                item.srImages[index].setTexture(textureKey);
                item.srImages[index].setPosition(x, sprite.y);
                item.srImages[index].setVisible(true);
            }
        });
    }

    _updateEquationSrDisplay(item) {
        this._updateInputSrDisplay(item, EQUATION_ROW.depth + 10, 'sr');
    }

    _updateBreak1SrDisplay(item) {
        this._updateInputSrDisplay(item, STEP2_DEPTH + 2, 'hr');
    }

    _isEquationOptionFilled(item) {
        return item.inputDigits.length === item.maxDigits;
    }

    _syncSubmitEnabled() {
        if (!this.submitBtn) {
            return;
        }

        if (this._canUseBreak1Input() && this._shouldShowNumPad()) {
            const allFilled = this.break1Option2Items?.length
                && this.break1Option2Items.every((item) => this._isEquationOptionFilled(item));
            this.submitBtn.setEnabled(!!allFilled);
            return;
        }

        this.submitBtn.setEnabled(false);
    }

    _destroyEquationRow() {
        this.equationItems?.forEach((item) => {
            item.srImages?.forEach((srImage) => srImage.destroy());
            item.sprite?.destroy();
        });
        this.equationItems = null;
        this.selectedEquationIndex = null;
    }

    _createSubmitButton() {
        this.submitBtn = new ButtonComponent(this, {
            x: SUBMIT_BUTTON.x,
            y: SUBMIT_BUTTON.y,
            texture: 'submit',
            clickEffectTexture: 'submit_s',
            clickDisabledTexture: 'submit_d',
            soundKey: 'btnclick',
            keepSizeOnClickEffect: true,
            onClick: () => this._onSubmitClick(),
        });
    }

    _createPlayButton() {
        this.playBtn = new ButtonComponent(this, {
            x: PLAY_BUTTON.x,
            y: PLAY_BUTTON.y,
            texture: 'play',
            clickEffectTexture: 'play',
            soundKey: 'btnclick',
            keepSizeOnClickEffect: true,
            onClick: () => this._onPlayClick(),
        });
        this.playBtn.getMainIcon().setDepth(40);
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
        this.resetBtn.getMainIcon().setDepth(40);
    }

    _resetToInitialState() {
        this.scene.restart();
    }

    _applyPlayButtonDisplay() {
        const playDone = this._isPlayDone();
        this.playBtn.getMainIcon().setVisible(!playDone);
        this.playBtn.setEnabled(!playDone);
    }

    _onPlayClick() {
        const actions = this._getPlayActions();
        if (this.playIndex >= actions.length) {
            return;
        }

        const action = actions[this.playIndex];
        this.playIndex += 1;
        this._executePlayAction(action);
        this._applyPlayButtonDisplay();
        this._syncInputEnabled();
        this._syncSubmitEnabled();
    }

    _onBreak1NumClick(digit) {
        const option = this.break1Option2Items?.[this.selectedBreak1Index];
        if (!option || !this._canUseBreak1Input()) return;

        if (option.inputDigits.length >= option.maxDigits) {
            option.inputDigits = [digit];
        } else {
            option.inputDigits.push(digit);
        }

        this._updateBreak1SrDisplay(option);
        this._syncSubmitEnabled();
    }

    _onNumClick(digit) {
        if (this._canUseBreak1Input()) {
            this._onBreak1NumClick(digit);
            return;
        }

        if (this.selectedEquationIndex == null) return;

        const option = this.equationItems[this.selectedEquationIndex];
        if (!this._isEquationItemEnabled(option)) return;

        if (option.inputDigits.length >= option.maxDigits) {
            option.inputDigits = [digit];
        } else {
            option.inputDigits.push(digit);
        }

        this._updateEquationSrDisplay(option);
        this._checkStep1Equation();
        this._syncSubmitEnabled();
    }

    _validateBreak1Answers() {
        if (this.break1SubmitLocked) return;

        const items = this.break1Option2Items || [];
        if (items.length < 2) return;

        const allFilled = items.every((item) => this._isEquationOptionFilled(item));
        if (!allFilled) return;

        this.break1SubmitLocked = true;

        const isCorrect = items.every((item) => this._getEquationValue(item) === item.answer);
        if (!isCorrect) {
            this._playBreak1WrongEffect();
            return;
        }

        this._playBreak1CorrectEffect();
    }

    _clearBreak1ConfirmSpines() {
        this.break1ConfirmSpines?.forEach((spine) => spine.destroy());
        this.break1ConfirmSpines = null;
    }

    _stopBreak1BlinkEffect() {
        this.break1BlinkTimer?.remove();
        this.break1BlinkTimer = null;
        this.break1Option2Items?.forEach((item) => {
            this.tweens.killTweensOf(item.sprite);
        });
    }

    _playBreak1CorrectEffect() {
        this._setNumPadVisible(false);
        this.submitBtn?.setEnabled(false);
        this.numButtons?.setEnabled(false);
        this._hideSelectionArrow();

        this.break1ConfirmSpines = this.break1Option2Items.map((item) => {
            const spine = this.add.spine(
                item.x,
                item.y,
                'effect_jinengzidan_data',
                'effect_jinengzidan_atlas',
            );
            spine.setDepth(STEP2_DEPTH + 5);
            spine.animationState.setAnimation(0, 'icon flash01', true);
            return spine;
        });

        this.time.delayedCall(BREAK1_CONFIRM_DELAY, () => {
            this._clearBreak1ConfirmSpines();
            this.break1SubmitPassed = true;
            this.break1SubmitLocked = false;
            this.break1Option2Items.forEach((item) => item.sprite.disableInteractive());
            this.selectedBreak1Index = null;
            this._applyBreak1OptionSelection();
            this._syncInputEnabled();
            this._syncSubmitEnabled();
        });
    }

    _playBreak1WrongEffect() {
        const items = this.break1Option2Items || [];
        if (!items.length) {
            this.break1SubmitLocked = false;
            return;
        }

        this._setNumPadVisible(false);
        this.submitBtn?.setEnabled(false);
        this.numButtons?.setEnabled(false);
        this._stopBreak1BlinkEffect();

        let showWrong = true;
        const totalSteps = BREAK1_BLINK_COUNT * 2;

        items.forEach((item) => {
            item.sprite.setTexture(item.wrongTexture);
        });

        this.break1BlinkTimer = this.time.addEvent({
            delay: BREAK1_BLINK_INTERVAL,
            repeat: totalSteps - 1,
            callback: () => {
                showWrong = !showWrong;
                items.forEach((item, index) => {
                    if (showWrong) {
                        item.sprite.setTexture(item.wrongTexture);
                    } else {
                        const selected = index === this.selectedBreak1Index;
                        item.sprite.setTexture(selected ? item.selectedTexture : item.texture);
                    }
                });
            },
        });

        this.time.delayedCall(BREAK1_BLINK_INTERVAL * totalSteps, () => {
            this._stopBreak1BlinkEffect();
            this.break1SubmitLocked = false;
            this._applyBreak1OptionSelection();
            this._syncInputEnabled();
            this._syncSubmitEnabled();
        });
    }

    _onSubmitClick() {
        if (this._canUseBreak1Input()) {
            this._validateBreak1Answers();
        }
    }

    _setNumButtonsDepth(depth) {
        if (!this.numButtons) return;
        this.numButtons.buttons.forEach((btn) => btn.icon.setDepth(depth));
        this.numButtons.symbolButtons.forEach((btn) => btn.icon.setDepth(depth));
    }

    _destroyNumButtons() {
        if (!this.numButtons) return;
        this.numButtons.buttons.forEach((btn) => btn.icon.destroy());
        this.numButtons.symbolButtons.forEach((btn) => btn.icon.destroy());
        this.numButtons = null;
    }
}
