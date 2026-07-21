import NumButtonsComponent from '../components/NumButtonsComponent.js';
import ButtonComponent from '../components/ButtonComponent.js';
import GameEndComponent from '../components/GameEndComponent.js';
import TrumpetButtonComponent from '../components/TrumpetButtonComponent.js';

const CONFIRM_NEXT_DELAY = 700;

const OPTION_SR_GAP = 4;

const ANSWER_BG_MAX_DIGITS = 2;

const SLOT_ERROR_FLASH_TIMES = 3;
const SLOT_ERROR_FLASH_INTERVAL = 150;

const BLOCK_ENTRANCE = {
    startScale: 0,
    duration: 300,
    delayStep: 50,
    ease: 'Back.easeOut',
};

const MATCH_AREA_LAYOUT = {
    cellWidth: 100,
    cellHeight: 124,
    gapX: 10,
    gapY: 20,
    cols: 5,
    rows: 2,
};

const MATCH_GROUPS = [
    { key: 'left', areaX: 556, areaY: 300, startX: 286, startY: 170 },
    { key: 'right', areaX: 1365, areaY: 300, startX: 1095, startY: 170 },
];

const NUMBER_BG_POS = { x: 1283, y: 760 };

const SUBMIT_BUTTON = { x: 1283, y: 921 };

const TRUMPET_POS = { x: 138, y: 907 };

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

/** 按左右侧蓝/粉块数量生成展示布局（每侧先蓝后粉，按格子顺序排列） */
function makeDisplayItems(leftBlue, leftPink, rightBlue = 0, rightPink = 0) {
    const items = [];

    for (let i = 0; i < leftBlue; i++) {
        items.push({ texture: 'blue', initialZoneKey: `left_${i}` });
    }
    for (let i = 0; i < leftPink; i++) {
        items.push({ texture: 'pink', initialZoneKey: `left_${leftBlue + i}` });
    }
    for (let i = 0; i < rightBlue; i++) {
        items.push({ texture: 'blue', initialZoneKey: `right_${i}` });
    }
    for (let i = 0; i < rightPink; i++) {
        items.push({ texture: 'pink', initialZoneKey: `right_${rightBlue + i}` });
    }

    return items;
}

/** 第 1 关：左 6 蓝 + 4 粉，右 1 粉 */
const LEVEL1_DISPLAY_ITEMS = makeDisplayItems(6, 4, 0, 1);

/** 第 2 关：左 7 蓝 + 3 粉，右 2 粉 */
const LEVEL2_DISPLAY_ITEMS = makeDisplayItems(7, 3, 0, 2);

/** 第 3 关：左 2 蓝，右 2 蓝 + 8 粉 */
const LEVEL3_DISPLAY_ITEMS = makeDisplayItems(2, 0, 2, 8);

/**
 * 三关配置：每关单独配置 que1 与 answer_bg 的位置、纹理及答案
 */
const LEVEL_CONFIGS = [
    {
        titleTexture: 'title1',
        titlePos: { x: 960, y: 92.5 },
        que1: { x: 666, y: 736, texture: 'que1' },
        answerBg: { x: 850, y: 662, answer: 11 },
        optionBgs: {
            items: [
                { x: 611, y: 895, answer: 10 },
                { x: 753, y: 767, answer: 1 },
            ],
            defaultIndex: 1,
            texture: 'option_bg',
            selectedTexture: 'option_bg_s',
            arrowTexture: 'arraw',
            arrowGap: 1,
        },
        displayItems: LEVEL1_DISPLAY_ITEMS,
    },
    {
        titleTexture: 'title1',
        titlePos: { x: 960, y: 92.5 },
        que1: { x: 671, y: 736, texture: 'que2' },
        answerBg: { x: 850, y: 662, answer: 12 },
        optionBgs: {
            items: [
                { x: 649, y: 767, answer: 3 },
                { x: 611, y: 895, answer: 10 },
            ],
            defaultIndex: 1,
            texture: 'option_bg',
            selectedTexture: 'option_bg_s',
            arrowTexture: 'arraw',
            arrowGap: 1,
        },
        displayItems: LEVEL2_DISPLAY_ITEMS,
    },
    {
        titleTexture: 'title1',
        titlePos: { x: 960, y: 92.5 },
        que1: { x: 649, y: 736, texture: 'que3' },
        answerBg: { x: 850, y: 662, answer: 12 },
        optionBgs: {
            items: [
                { x: 519, y: 768, answer: 2 },
                { x: 659, y: 896, answer: 10 },
            ],
            defaultIndex: 1,
            texture: 'option_bg',
            selectedTexture: 'option_bg_s',
            arrowTexture: 'arraw',
            arrowGap: 1,
        },
        displayItems: LEVEL3_DISPLAY_ITEMS,
    },
];

export default class gameScene extends Phaser.Scene {
    constructor() {
        super('gameScene');
        ReportHelper.gameReportParams.difficulty = 2;
        ReportHelper.report('game_start', {
            difficulty: 2,
        });
    }

    create() {
        this._onVisibilityChange = () => {
            this.sound.stopAll();
        };
        document.addEventListener('visibilitychange', this._onVisibilityChange);

        this.currentLevelIndex = 0;
        this.canSubmit = true;
        this.errorCnt = 0;
        this._won = false;
        ReportHelper.resetWrongTimes();
        this.queImage = null;
        this.optionBgImages = [];
        this.optionBgArrow = null;
        this.optionBgsConfig = null;
        this.selectedOptionBgIndex = null;
        this.blockSprites = [];

        this.add.image(960, 540, 'game_bg');
        this.add.image(101, 67, 'jiaobiao');
        this.numberBgImage = this.add.image(NUMBER_BG_POS.x, NUMBER_BG_POS.y, 'number_bg');

        this.numButtons = NumButtonsComponent.create(this, {
            positions: buildNumButtonPositions(this, NUMBER_BG_POS.x, NUMBER_BG_POS.y),
            soundKey: 'btnclick',
            onClick: (value, type) => {
                if (type === 'digit') this._onNumClick(value);
            },
        });
        this._setNumButtonsDepth(45);

        MATCH_GROUPS.forEach(({ areaX, areaY }) => {
            this.add.image(areaX, areaY, 'area');
        });

        this.titleImage = this.add.image(0, 0, 'title1').setDepth(40);

        this.trumpet = TrumpetButtonComponent.create(this, {
            x: TRUMPET_POS.x,
            y: TRUMPET_POS.y,
            soundKey: 'title1',
            autoPlay: false,
        });
        this.trumpet.image.setDepth(45);

        this._createSubmitButton();
        this.submitBtn.setEnabled(false);
        this.submitBtn.getMainIcon().setDepth(45);

        this.confirmSpine = this.add.spine(
            753,
            767,
            'effect_jinengzidan_data',
            'effect_jinengzidan_atlas',
        );
        this.confirmSpine.setVisible(false);

        this._startLevel(0);

        this.events.once('shutdown', this._onShutdown, this);
    }

    _onShutdown() {
        document.removeEventListener('visibilitychange', this._onVisibilityChange);
        this.submitBtn?.destroy();
        this.submitBtn = null;
        this._destroyNumButtons();
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

    _onSubmitClick() {
        if (!this.canSubmit || this._won || this._slotFlashEvent) return;
        const config = this._getLevelConfig();
        if (!this.optionBgImages.length) return;
        if (!this.optionBgImages.every((option) => this._isOptionFilled(option))) return;

        const slotAnswers = this._getAnswerSlotConfigs(config);
        const isCorrect = this.optionBgImages.every((option, index) => {
            return option.answer === slotAnswers[index].answer;
        });

        if (!isCorrect) {
            this.sound.play('error1');
            this.errorCnt += 1;
            ReportHelper.recordWrongTime(this.currentLevelIndex);

            const wrongIndices = this.optionBgImages
                .map((option, index) => (option.answer !== slotAnswers[index].answer ? index : -1))
                .filter((index) => index >= 0);

            this.canSubmit = false;
            this.numButtons?.setEnabled(false);
            this._setOptionBgsInteractive(false);
            this.submitBtn.setEnabled(false);

            this._playWrongSlotsErrorFlash(wrongIndices, () => {
                this._clearAllOptionInputs();
                this.canSubmit = true;
                this.numButtons?.setEnabled(true);
                this._setOptionBgsInteractive(true);
                this._syncSubmitEnabled();
            });
            return;
        }

        this._handleCorrect();
    }

    _handleCorrect() {
        if (!this.canSubmit || this._won) return;

        this.canSubmit = false;
        this.sound.play('correct');
        this.submitBtn.setEnabled(false);
        this.numButtons?.setEnabled(false);
        this._setOptionBgsInteractive(false);

        const spinePos = this._getConfirmSpinePosition();
        this.confirmSpine.setPosition(spinePos.x, spinePos.y);
        this.confirmSpine.setVisible(true);
        this.confirmSpine.animationState.setAnimation(0, 'icon flash01', true);

        this.time.delayedCall(CONFIRM_NEXT_DELAY, () => {
            this.confirmSpine.setVisible(false);
            this.canSubmit = true;
            this.numButtons?.setEnabled(true);
            this._setOptionBgsInteractive(true);

            if (this.currentLevelIndex < LEVEL_CONFIGS.length - 1) {
                this._startLevel(this.currentLevelIndex + 1);
                return;
            }

            this._won = true;
            this._disableAllInput();
            GameEndComponent.show(this, {
                errorCnt: this.errorCnt,
                onBeforeShow: () => {
                    this.trumpet?.stop();
                },
            });
        });
    }

    _getConfirmSpinePosition() {
        const selected = this.optionBgImages[this.selectedOptionBgIndex];
        if (selected) {
            return { x: selected.image.x, y: selected.image.y };
        }
        return { x: 753, y: 767 };
    }

    _setOptionBgsInteractive(enabled) {
        this.optionBgImages.forEach(({ image }) => {
            if (enabled) {
                image.setInteractive({ useHandCursor: true });
            } else {
                image.disableInteractive();
            }
        });
    }

    _disableAllInput() {
        this.numButtons?.setEnabled(false);
        this.submitBtn?.setEnabled(false);
        this._setOptionBgsInteractive(false);
        this.trumpet?.stop();
    }

    _updateTrumpet() {
        if (!this.trumpet) return;
        this.trumpet.stop();
        if (this.currentLevelIndex === 0) {
            this.trumpet.showAndPlay();
        } else {
            this.trumpet.showIdle();
        }
    }

    _onNumClick(digit) {
        if (this._slotFlashEvent) return;
        if (this.selectedOptionBgIndex == null) return;
        const option = this.optionBgImages[this.selectedOptionBgIndex];
        if (!option) return;

        if (option.inputDigits.length >= option.maxDigits) {
            option.inputDigits = [digit];
        } else {
            option.inputDigits.push(digit);
        }

        option.answer = Number(option.inputDigits.join(''));
        this._updateOptionSrDisplay(option);
        this._syncSubmitEnabled();
    }

    _isOptionFilled(option) {
        return option.inputDigits.length >= 1;
    }

    _clearOptionInput(option) {
        option.inputDigits = [];
        option.answer = null;
        option.srImages.forEach((sr) => sr.destroy());
        option.srImages = [];
    }

    _clearAllOptionInputs() {
        this.optionBgImages.forEach((option) => this._clearOptionInput(option));
    }

    _updateOptionSrDisplay(option) {
        const { inputDigits, image } = option;
        const digitW = this.textures.get('sr_0').getSourceImage().width;
        const totalW = inputDigits.length * digitW + (inputDigits.length - 1) * OPTION_SR_GAP;
        const startX = image.x - totalW / 2 + digitW / 2;

        while (option.srImages.length > inputDigits.length) {
            option.srImages.pop().destroy();
        }

        inputDigits.forEach((d, i) => {
            const x = startX + i * (digitW + OPTION_SR_GAP);
            if (!option.srImages[i]) {
                option.srImages[i] = this.add
                    .image(x, image.y, `sr_${d}`)
                    .setDepth(43);
            } else {
                option.srImages[i].setTexture(`sr_${d}`);
                option.srImages[i].setPosition(x, image.y);
                option.srImages[i].setVisible(true);
            }
        });
    }

    _syncSubmitEnabled() {
        if (!this.submitBtn) return;
        if (!this.optionBgImages.length) {
            this.submitBtn.setEnabled(false);
            return;
        }
        const allFilled = this.optionBgImages.every((option) => this._isOptionFilled(option));
        this.submitBtn.setEnabled(allFilled && this.canSubmit && !this._won);
    }

    _stopSlotErrorFlash() {
        if (this._slotFlashEvent) {
            this._slotFlashEvent.remove();
            this._slotFlashEvent = null;
        }
    }

    _playWrongSlotsErrorFlash(wrongIndices, onComplete) {
        const slots = wrongIndices
            .map((index) => this.optionBgImages[index])
            .filter(Boolean);

        if (!slots.length) {
            onComplete?.();
            return;
        }

        this._stopSlotErrorFlash();
        let step = 0;
        const totalSteps = SLOT_ERROR_FLASH_TIMES * 2;

        const tick = () => {
            if (step >= totalSteps) {
                this._slotFlashEvent = null;
                this._applyOptionBgSelection();
                onComplete?.();
                return;
            }

            const useErrorTexture = step % 2 === 0;
            slots.forEach((slot) => {
                slot.image.setTexture(useErrorTexture ? slot.errorTexture : slot.texture);
            });

            step += 1;
            this._slotFlashEvent = this.time.delayedCall(SLOT_ERROR_FLASH_INTERVAL, tick);
        };

        tick();
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

    _getAnswerSlotConfigs(config) {
        const slots = [];
        if (config.answerBg) {
            slots.push(config.answerBg);
        }
        if (config.optionBgs?.items) {
            slots.push(...config.optionBgs.items);
        }
        return slots;
    }

    _getLevelConfig(levelIndex = this.currentLevelIndex) {
        return LEVEL_CONFIGS[levelIndex];
    }

    _startLevel(levelIndex) {
        this.currentLevelIndex = levelIndex;
        const config = this._getLevelConfig(levelIndex);

        ReportHelper.gameReportParams.difficulty = levelIndex + 1;

        const { titleTexture, titlePos } = config;
        this.titleImage.setTexture(titleTexture);
        this.titleImage.setPosition(titlePos.x, titlePos.y);

        this._clearQueImage();
        this._createQueImage(config.que1);

        this._clearOptionBgs();
        if (config.answerBg || config.optionBgs) {
            this._createAnswerSlots(config, levelIndex);
        }

        this._clearBlocks();
        this._displayBlocks(config.displayItems);

        this.canSubmit = true;
        this.submitBtn?.setEnabled(false);
        this._syncSubmitEnabled();
        this._updateTrumpet();
    }

    _clearQueImage() {
        this.queImage?.destroy();
        this.queImage = null;
    }

    _createQueImage({ x, y, texture }) {
        this.queImage = this.add.image(x, y, texture).setDepth(40);
    }

    _clearOptionBgs() {
        this._stopSlotErrorFlash();
        this.optionBgImages.forEach(({ image, srImages }) => {
            srImages.forEach((sr) => sr.destroy());
            image.destroy();
        });
        this.optionBgImages = [];
        this.optionBgArrow?.destroy();
        this.optionBgArrow = null;
        this.optionBgsConfig = null;
        this.selectedOptionBgIndex = null;
    }

    _createAnswerSlots(config, levelIndex = this.currentLevelIndex) {
        const {
            defaultIndex = 0,
            texture = 'option_bg',
            selectedTexture = 'option_bg_s',
            arrowTexture = 'arraw',
            arrowGap = 8,
        } = config.optionBgs ?? {};
        this.optionBgsConfig = { arrowTexture, arrowGap };

        const slotDefs = [];
        if (config.answerBg) {
            slotDefs.push({
                ...config.answerBg,
                isAnswerBg: true,
                texture: 'answer_bg',
                selectedTexture: 'answer_bg_s',
                errorTexture: 'answer_bg_r',
            });
        }
        if (config.optionBgs?.items) {
            config.optionBgs.items.forEach((item) => {
                slotDefs.push({
                    ...item,
                    texture,
                    selectedTexture,
                    errorTexture: 'option_bg_r',
                });
            });
        }

        this.optionBgImages = slotDefs.map(({
            x,
            y,
            answer,
            maxDigits,
            isAnswerBg,
            texture: slotTexture,
            selectedTexture: slotSelectedTexture,
            errorTexture: slotErrorTexture,
        }, index) => {
            const image = this.add.image(x, y, slotTexture).setDepth(41);
            image.setInteractive({ useHandCursor: true });
            image.on('pointerup', () => this._onOptionBgClick(index));
            return {
                image,
                texture: slotTexture,
                selectedTexture: slotSelectedTexture,
                errorTexture: slotErrorTexture,
                srImages: [],
                inputDigits: [],
                answer: null,
                correctAnswer: answer,
                isAnswerBg: Boolean(isAnswerBg),
                maxDigits: isAnswerBg ? (maxDigits ?? ANSWER_BG_MAX_DIGITS) : String(answer).length,
            };
        });

        this.optionBgArrow = this.add.image(0, 0, arrowTexture).setDepth(42);

        const optionDefaultIndex = config.optionBgs ? defaultIndex : 0;
        const answerBgOffset = config.answerBg ? 1 : 0;
        this.selectedOptionBgIndex =
            levelIndex === 0 ? answerBgOffset + optionDefaultIndex : answerBgOffset;
        this._applyOptionBgSelection();
    }

    _onOptionBgClick(index) {
        if (this._slotFlashEvent) return;
        if (this.selectedOptionBgIndex === index) return;
        this.sound.play('btnclick');
        this.selectedOptionBgIndex = index;
        this._applyOptionBgSelection();
        this._syncSubmitEnabled();
    }

    _applyOptionBgSelection() {
        this.optionBgImages.forEach(({ image, texture, selectedTexture }, index) => {
            image.setTexture(index === this.selectedOptionBgIndex ? selectedTexture : texture);
        });

        const selected = this.optionBgImages[this.selectedOptionBgIndex];
        if (!selected || !this.optionBgArrow) return;

        const { image } = selected;
        const { arrowGap } = this.optionBgsConfig;
        const arrowHeight = this.optionBgArrow.height * this.optionBgArrow.scaleY;
        const bgHeight = image.displayHeight;

        this.optionBgArrow.setPosition(
            image.x,
            image.y - bgHeight / 2 - arrowHeight / 2 - arrowGap,
        );
        this.optionBgArrow.setVisible(true);
    }

    _clearBlocks() {
        this.blockSprites.forEach((sprite) => {
            this.tweens.killTweensOf(sprite);
            sprite.destroy();
        });
        this.blockSprites = [];
    }

    _displayBlocks(displayItems) {
        const zonePositions = this._buildZonePositionMap(MATCH_GROUPS);
        const { startScale, duration, delayStep, ease } = BLOCK_ENTRANCE;
        let delayIndex = 0;

        displayItems.forEach(({ texture, initialZoneKey }) => {
            const pos = zonePositions[initialZoneKey];
            if (!pos) return;

            const sprite = this.add.image(pos.x, pos.y, texture).setDepth(20);
            sprite.setScale(startScale);
            this.blockSprites.push(sprite);

            this.tweens.add({
                targets: sprite,
                scale: 1,
                duration,
                delay: delayIndex * delayStep,
                ease,
            });
            delayIndex += 1;
        });
    }

    _buildZonePositionMap(groupConfigs) {
        const positions = {};

        groupConfigs.forEach(({ key: groupKey, startX, startY }) => {
            this._getMatchZonePositions(startX, startY).forEach((pos, index) => {
                positions[`${groupKey}_${index}`] = pos;
            });
        });

        return positions;
    }

    _getMatchZonePositions(startX, startY) {
        const { cellWidth, cellHeight, gapX, gapY, cols, rows } = MATCH_AREA_LAYOUT;
        const positions = [];

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                positions.push({
                    x: startX + col * (cellWidth + gapX) + cellWidth / 2,
                    y: startY + row * (cellHeight + gapY) + cellHeight / 2,
                    row,
                    col,
                });
            }
        }

        return positions;
    }
}
