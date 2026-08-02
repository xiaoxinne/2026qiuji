import NumButtonsComponent from '../components/NumButtonsComponent.js';
import ButtonComponent from '../components/ButtonComponent.js';
import GameEndComponent from '../components/GameEndComponent.js';
import TrumpetButtonComponent from '../components/TrumpetButtonComponent.js';

const NEXT_LEVEL_DELAY = 800;
const ERROR_FLASH_TIMES = 3;
const ERROR_FLASH_INTERVAL = 150;
const DEBUG_START_LEVEL = 0; // 测试用：0=第一关，1=第二关；测完改回 0
const ANSWER_MAX_DIGITS = 2;
const ANSWER_SR_GAP = 4;

const NUM_BUTTON_LAYOUT = {
    startX: 370,
    y: 848,
    gapX: 14,
    count: 10,
};

const SUBMIT_BUTTON = {
    x: 1534,
    y: 848,
};

const CLEAR_BUTTON = {
    x: 1394,
    y: 848,
};

/** 三关填空：每关独立 title / area / answerSlots / answers */
const LEVELS = [
    {
        titleKey: 'title1',
        titleX: 960,
        titleY: 92,
        soundKey: 'title1',
        areas: [
            { key: 'area1', x: 778, y: 452 },
            { key: 'area2', x: 1117, y: 503 },
        ],
        answerSlots: [
            { x: 759, y: 93 },
            { x: 1143, y: 93 },
        ],
        answers: [7, 5],
    },
    {
        titleKey: 'title2',
        titleX: 960,
        titleY: 92,
        soundKey: 'title2',
        areas: [
            { key: 'area3', x: 937, y: 466 },
        ],
        answerSlots: [
            { x: 1454, y: 94 },
        ],
        answers: [12],
    },
    {
        titleKey: 'title3',
        titleX: 960,
        titleY: 120,
        soundKey: 'title3',
        areas: [
            { key: 'area4', x: 937, y: 466 },
        ],
        answerSlots: [
            { x: 1339, y: 94 },
            { x: 696, y: 152 },
        ],
        answers: [9, 3],
    },
];

function buildNumButtonPositions(scene) {
    const { startX, y, gapX, count } = NUM_BUTTON_LAYOUT;
    const buttonWidth = scene.textures.get('num_0').getSourceImage().width;
    const step = buttonWidth + gapX;
    return Array.from({ length: count }, (_, index) => ({
        x: startX + index * step,
        y,
    }));
}

export default class gameScene extends Phaser.Scene {
    constructor() {
        super('gameScene');
        ReportHelper.gameReportParams.difficulty = 1;
        ReportHelper.gameReportParams.question_id = '2026_course_autumn_firg_CSSP_15_s_14';
        ReportHelper.gameReportParams.questionCount = LEVELS.length;
        ReportHelper.resetWrongTimes();
        ReportHelper.report('game_start', {
            difficulty: 1,
        });
    }

    create() {
        this._onVisibilityChange = () => {
            this.sound.stopAll();
            this.trumpet?.showIdle?.();
        };
        document.addEventListener('visibilitychange', this._onVisibilityChange);

        this.isBusy = false;
        this.hasFinished = false;
        this.errorCnt = 0;
        this.levelIndex = DEBUG_START_LEVEL;
        this.areaImages = [];
        this.selectedSlotIndex = 0;
        this.answerSlots = [];

        this.add.image(960, 540, 'game_bg');
        this.add.image(101, 67, 'jiaobiao');
        this.titleImage = this.add.image(
            this.currentLevel.titleX ?? 960,
            this.currentLevel.titleY ?? 92,
            this.currentLevel.titleKey,
        );
        this.setupLevelAreas(this.levelIndex);
        this.setupAnswerSlots(this.levelIndex);

        this.add.image(948, 847, 'num_bg');

        this.trumpet = TrumpetButtonComponent.create(this, {
            x: 155,
            y: 910,
            soundKey: this.currentLevel.soundKey,
            autoPlay: true,
        });

        this.numButtons = NumButtonsComponent.create(this, {
            positions: buildNumButtonPositions(this),
            soundKey: 'btnclick',
            onClick: (value) => this.onNumberClick(value),
        });

        this.submitButton = new ButtonComponent(this, {
            x: SUBMIT_BUTTON.x,
            y: SUBMIT_BUTTON.y,
            texture: 'submit',
            clickEffectTexture: 'submit_s',
            clickDisabledTexture: 'submit_d',
            soundKey: 'btnclick',
            keepSizeOnClickEffect: true,
            onClick: () => this.onSubmit(),
        });

        this.clearButton = new ButtonComponent(this, {
            x: CLEAR_BUTTON.x,
            y: CLEAR_BUTTON.y,
            texture: 'clear',
            clickEffectTexture: 'clear_s',
            clickDisabledTexture: 'clear_d',
            soundKey: 'btnclick',
            keepSizeOnClickEffect: true,
            onClick: () => this.onClear(),
        });
        this.syncSubmitButtonState();
    }

    get currentLevel() {
        return LEVELS[this.levelIndex];
    }

    clearAnswerSlots() {
        this.answerSlots.forEach((slot) => {
            slot.bg?.destroy();
            slot.srImages?.forEach((img) => img.destroy());
        });
        this.answerSlots = [];
        this.selectedSlotIndex = 0;
    }

    setupAnswerSlots(levelIndex) {
        this.clearAnswerSlots();
        const slots = LEVELS[levelIndex].answerSlots || [];
        this.answerSlots = slots.map((pos, index) => {
            const bg = this.add.image(pos.x, pos.y, 'answer_bg');
            bg.setInteractive({ useHandCursor: true });
            bg.on('pointerdown', () => {
                if (this.isBusy || this.hasFinished) return;
                this.sound.play('btnclick');
                this.selectSlot(index);
            });
            return {
                index,
                x: pos.x,
                y: pos.y,
                bg,
                srImages: [],
                inputDigits: [],
                maxDigits: ANSWER_MAX_DIGITS,
                value: null,
            };
        });
        if (this.answerSlots.length > 0) {
            this.selectSlot(0);
        }
    }

    selectSlot(index) {
        if (!this.answerSlots.length) return;
        this.selectedSlotIndex = index;
        this.answerSlots.forEach((slot, i) => {
            const tex = i === index ? 'answer_bg_s' : 'answer_bg';
            slot.bg.setTexture(tex);
        });
    }

    refreshSlotVisual(slot) {
        const isSelected = slot.index === this.selectedSlotIndex;
        slot.bg.setTexture(isSelected ? 'answer_bg_s' : 'answer_bg');

        const digits = slot.inputDigits || [];
        const digitW = this.textures.get('sr_0').getSourceImage().width;
        const totalW = digits.length > 0
            ? digits.length * digitW + (digits.length - 1) * ANSWER_SR_GAP
            : 0;
        const startX = slot.x - totalW / 2 + digitW / 2;

        while (slot.srImages.length > digits.length) {
            slot.srImages.pop().destroy();
        }

        digits.forEach((d, i) => {
            const x = startX + i * (digitW + ANSWER_SR_GAP);
            if (!slot.srImages[i]) {
                slot.srImages[i] = this.add.image(x, slot.y, `sr_${d}`);
            } else {
                slot.srImages[i].setTexture(`sr_${d}`);
                slot.srImages[i].setPosition(x, slot.y);
            }
            slot.srImages[i].setVisible(true);
        });

        slot.value = digits.length > 0 ? Number(digits.join('')) : null;
    }

    clearAreaImages() {
        this.areaImages.forEach((img) => {
            if (img && img.active) img.destroy();
        });
        this.areaImages = [];
    }

    setupLevelAreas(levelIndex) {
        this.clearAreaImages();
        const level = LEVELS[levelIndex];
        this.areaImages = level.areas.map((area) => {
            const img = this.add.image(area.x, area.y, area.key);
            if (area.depth != null) img.setDepth(area.depth);
            return img;
        });
    }

    onNumberClick(value) {
        if (this.isBusy || this.hasFinished) return;
        const slot = this.answerSlots[this.selectedSlotIndex];
        if (!slot) return;

        if (slot.inputDigits.length >= slot.maxDigits) {
            slot.inputDigits = [value];
        } else {
            slot.inputDigits.push(value);
        }
        this.refreshSlotVisual(slot);
        this.syncSubmitButtonState();
    }

    hasAnyAnswer() {
        return this.answerSlots.some((slot) => slot.inputDigits.length > 0);
    }

    isAllAnswered() {
        return this.answerSlots.every((slot) => slot.inputDigits.length > 0);
    }

    syncSubmitButtonState() {
        const canSubmit =
            !this.isBusy &&
            !this.hasFinished &&
            this.isAllAnswered();
        const canClear =
            !this.isBusy &&
            !this.hasFinished &&
            this.hasAnyAnswer();
        this.submitButton?.setEnabled(canSubmit);
        this.clearButton?.setEnabled(canClear);
    }

    clearSelectedAnswer() {
        const slot = this.answerSlots[this.selectedSlotIndex];
        if (!slot) return;
        slot.inputDigits = [];
        this.refreshSlotVisual(slot);
        this.syncSubmitButtonState();
    }

    clearAllAnswers() {
        this.answerSlots.forEach((slot) => {
            slot.inputDigits = [];
            this.refreshSlotVisual(slot);
        });
        this.syncSubmitButtonState();
    }

    onClear() {
        if (this.isBusy || this.hasFinished) return;
        this.clearSelectedAnswer();
    }

    onSubmit() {
        if (this.isBusy || this.hasFinished) return;
        if (!this.isAllAnswered()) return;

        const correctAnswers = this.currentLevel.answers || [];
        const wrongSlots = this.answerSlots.filter(
            (slot, i) => slot.value !== correctAnswers[i],
        );
        const isCorrect = wrongSlots.length === 0;

        if (isCorrect) {
            this.isBusy = true;
            this.submitButton.setEnabled(false);
            this.clearButton.setEnabled(false);
            this.numButtons?.setEnabled?.(false);
            this.trumpet?.stop?.();
            this.sound.play('correct');

            this.answerSlots.forEach((slot) => {
                this.playSpineEffect(slot.x, slot.y);
            });

            this.time.delayedCall(NEXT_LEVEL_DELAY, () => this.afterCorrect());
            return;
        }

        this.isBusy = true;
        this.submitButton.setEnabled(false);
        this.clearButton.setEnabled(false);
        this.sound.play('error1');
        this.errorCnt += 1;
        ReportHelper.recordWrongTime(this.levelIndex);

        this.flashErrorSlots(wrongSlots, () => {
            wrongSlots.forEach((slot) => {
                slot.inputDigits = [];
                this.refreshSlotVisual(slot);
            });
            this.isBusy = false;
            this.syncSubmitButtonState();
        });
    }

    flashErrorSlots(slots, onComplete) {
        let count = 0;
        const flash = () => {
            const showError = count % 2 === 0;
            slots.forEach((slot) => {
                slot.bg.setTexture(showError ? 'answer_bg_r' : 'answer_bg');
            });
            count += 1;
            if (count >= ERROR_FLASH_TIMES * 2) {
                slots.forEach((slot) => this.refreshSlotVisual(slot));
                onComplete?.();
                return;
            }
            this.time.delayedCall(ERROR_FLASH_INTERVAL, flash);
        };
        flash();
    }

    afterCorrect() {
        if (this.levelIndex < LEVELS.length - 1) {
            this.goToNextLevel();
            return;
        }
        this.hasFinished = true;
        this.numButtons?.setEnabled?.(false);
        GameEndComponent.show(this, {
            errorCnt: this.errorCnt,
        });
    }

    goToNextLevel() {
        this.levelIndex += 1;
        this.setupLevelAreas(this.levelIndex);
        this.setupAnswerSlots(this.levelIndex);
        this.titleImage.setTexture(this.currentLevel.titleKey);
        this.titleImage.setPosition(
            this.currentLevel.titleX ?? 960,
            this.currentLevel.titleY ?? 92,
        );
        this.numButtons?.setEnabled?.(true);
        this.isBusy = false;
        this.syncSubmitButtonState();
        this.playLevelTitle();
    }

    playLevelTitle() {
        if (!this.trumpet) return;
        const { soundKey } = this.currentLevel;
        this.trumpet.setSoundKey?.(soundKey);
        this.trumpet.showAndPlay();
    }

    playSpineEffect(x, y, onComplete, dataKey = 'effect_jinengzidan_data', atlasKey = 'effect_jinengzidan_atlas', depth = 1000) {
        const effectSpine = this.add.spine(x, y, dataKey, atlasKey);
        effectSpine.setDepth(depth);
        const data = effectSpine.skeleton?.data || effectSpine.animationState?.data?.skeletonData;
        const anims = data?.animations;
        const animName = anims && anims.length > 0 ? anims[0].name : 'animation';
        effectSpine.animationState.setAnimation(0, animName, false);
        effectSpine.animationState.addListener({
            complete: () => {
                effectSpine.destroy();
                if (onComplete) onComplete();
            },
        });
    }
}
