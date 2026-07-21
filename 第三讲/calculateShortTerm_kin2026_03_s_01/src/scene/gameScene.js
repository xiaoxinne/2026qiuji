import NumButtonsComponent from '../components/NumButtonsComponent.js';
import ButtonComponent from '../components/ButtonComponent.js';
import GameEndComponent from '../components/GameEndComponent.js';
import TrumpetButtonComponent from '../components/TrumpetButtonComponent.js';

const APPLE_LAYOUT = {
    y: 456,
    centerX: 960,
    spacing: 167,
};

const APPLE_ENTRANCE = {
    startY: -300,
    handOffsetY: 200,
    duration: 400,
    intervalDelay: 500,
    greenDelay: 800,
    jianpanDelay: 800,
    takeAppleDelay: 800,
    equationDelay: 800,
};

const NUM_BUTTON_LAYOUT = {
    startX: 471,
    y: 877,
    gapX: 11,
    count: 10,
};

const ANSWER_DISPLAY = {
    x: 1108,
    y: 738,
};

const SUBMIT_BUTTON = {
    x: 1471,
    y: 877,
};

const CONFIRM_NEXT_DELAY = 700;

const OPTION_BG_DEFAULT = {
    x: 970,
    y: 454,
};

const LEVEL_CONFIGS = [
    { animationType: 'add', redCount: 5, greenCount: 2, queTexture: 'que1_1', answer: 7, appleScale: 1, optionBg: 'option_bg' },
    {
        animationType: 'add',
        redCount: 6,
        greenCount: 3,
        queTexture: 'que1_2',
        answer: 9,
        appleScale: 0.85,
        appleY: 437,
        appleXs: [432, 574, 715, 857, 999, 1140, 1282, 1424, 1565],
        optionBg: 'option_bg2',
        optionBgPos: { x: 997, y: 440 },
    },
    {
        animationType: 'subtract',
        redCount: 7,
        greenCount: 0,
        takeCount: 2,
        takenTexture: 'apple_red_old',
        queTexture: 'que1_3',
        answer: 5,
        appleScale: 1,
        optionBg: 'option_bg',
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

function buildAppleTextures(redCount, greenCount) {
    return [
        ...Array(redCount).fill('apple_red'),
        ...Array(greenCount).fill('apple_green'),
    ];
}

export default class gameScene extends Phaser.Scene {
    constructor() {
        super('gameScene');
        ReportHelper.gameReportParams.difficulty = 0;
        ReportHelper.report('game_start', {
            difficulty: 0,
        });
    }

    create() {
        this._onVisibilityChange = () => {
            this.sound.stopAll();
        };
        document.addEventListener('visibilitychange', this._onVisibilityChange);

        this.errorCnt = 0;
        this._won = false;
        ReportHelper.resetWrongTimes();

        this.add.image(960, 540, 'game_bg');
        this.add.image(101, 67, 'jiaobiao');
        this.add.image(960, 92, 'title1');

        this.trumpet = TrumpetButtonComponent.create(this, {
            x: 138,
            y: 907,
            soundKey: 'title1',
            autoPlay: false,
            visible: false,
        });
        this.trumpet.image.setDepth(25);

        this.optionBgImage = this.add.image(970, 454, 'option_bg');
        this.que1Image = this.add.image(882, 736, 'que1_1');
        this.que1Image.setVisible(false);
        this.answerBg = this.add.image(1104, 738, 'answer_bg');
        this.answerBg.setVisible(false);
        this.answerImage = this.add.image(ANSWER_DISPLAY.x, ANSWER_DISPLAY.y, 'sr_0');
        this.answerImage.setVisible(false);
        this._ensureAnswerArea();

        this.appleSprites = [];
        this.selectedNumber = null;
        this.currentLevelIndex = 0;
        this.canSubmit = true;

        this._startLevel(this.currentLevelIndex);
    }

    _ensureAnswerArea() {
        if (!this.confirmSpine) {
            this.confirmSpine = this.add.spine(
                ANSWER_DISPLAY.x,
                ANSWER_DISPLAY.y,
                'effect_jinengzidan_data',
                'effect_jinengzidan_atlas',
            );
            this.confirmSpine.setVisible(false);
        }
    }

    _startLevel(levelIndex) {
        this.currentLevelConfig = LEVEL_CONFIGS[levelIndex];
        this.selectedNumber = null;
        this.canSubmit = true;
        this.answerImage.setVisible(false);
        if (this.confirmSpine) {
            this.confirmSpine.setVisible(false);
        }

        this.que1Image.setTexture(this.currentLevelConfig.queTexture);
        const optionBgPos = this.currentLevelConfig.optionBgPos ?? OPTION_BG_DEFAULT;
        this.optionBgImage.setTexture(this.currentLevelConfig.optionBg ?? 'option_bg');
        this.optionBgImage.setPosition(optionBgPos.x, optionBgPos.y);
        this.que1Image.setVisible(false);
        this.answerBg.setVisible(false);

        this._destroyInputUI();
        this._updateTrumpetForLevel(levelIndex);
        this._buildAppleSprites(this.currentLevelConfig);
        this._playAppleEntranceAnimation();
    }

    _updateTrumpetForLevel(levelIndex) {
        if (!this.trumpet) return;
        this.trumpet.stop();
        if (levelIndex === 0) {
            this.trumpet.setVisible(false);
            return;
        }
        this.trumpet.showIdle();
    }

    _onEntranceComplete() {
        if (this.currentLevelIndex !== 0 || !this.trumpet) return;
        this.trumpet.showAndPlay();
    }

    _buildAppleSprites(config) {
        const { redCount, greenCount, appleScale = 1, appleY, appleXs } = config;
        this.appleSprites.forEach((apple) => apple.destroy());
        const textures = buildAppleTextures(redCount, greenCount);
        const defaultY = appleY ?? APPLE_LAYOUT.y;
        const startX = APPLE_LAYOUT.centerX - ((textures.length - 1) * APPLE_LAYOUT.spacing) / 2;
        this.appleSprites = textures.map((texture, index) => {
            const x = appleXs?.[index] ?? startX + index * APPLE_LAYOUT.spacing;
            const y = defaultY;
            const apple = this.add.image(x, y, texture);
            apple.finalY = y;
            apple.setScale(appleScale);
            apple.setVisible(false);
            return apple;
        });
    }

    _destroyInputUI() {
        if (this.numButtons) {
            this.numButtons.buttons.forEach((btn) => btn.icon.destroy());
            this.numButtons.symbolButtons.forEach((btn) => btn.icon.destroy());
            this.numButtons = null;
        }
        if (this.submitBtn) {
            this.submitBtn.destroy();
            this.submitBtn = null;
        }
    }

    _createNumButtons() {
        this.numButtons = NumButtonsComponent.create(this, {
            positions: buildNumButtonPositions(this),
            soundKey: 'btnclick',
            onClick: (value) => this._onNumberClick(value),
        });
    }

    _onNumberClick(value) {
        this.selectedNumber = value;
        this.answerImage.setTexture(`sr_${value}`);
        this.answerImage.setVisible(true);
        this._syncSubmitEnabled();
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
        this._syncSubmitEnabled();
    }

    _syncSubmitEnabled() {
        if (!this.submitBtn) return;
        this.submitBtn.setEnabled(this.selectedNumber != null);
    }

    _onSubmitClick() {
        if (!this.canSubmit || this.selectedNumber == null) return;
        if (this._won) return;

        if (this.selectedNumber !== this.currentLevelConfig.answer) {
            this.sound.play('error1');
            this.errorCnt += 1;
            ReportHelper.recordWrongTime(this.currentLevelIndex);
            return;
        }

        this.canSubmit = false;
        this.sound.play('correct');
        this.submitBtn.setEnabled(false);
        this.confirmSpine.setVisible(true);
        this.confirmSpine.animationState.setAnimation(0, 'icon flash01', true);

        this.time.delayedCall(CONFIRM_NEXT_DELAY, () => {
            this.confirmSpine.setVisible(false);
            this.canSubmit = true;

            if (this.currentLevelIndex < LEVEL_CONFIGS.length - 1) {
                this.currentLevelIndex += 1;
                this._startLevel(this.currentLevelIndex);
                return;
            }

            this._won = true;
            this._disableAllInput();
            if (this.trumpet?.sound?.isPlaying) this.trumpet.stop();
            GameEndComponent.show(this, {
                errorCnt: this.errorCnt,
                onBeforeShow: () => {
                    this.trumpet?.stop();
                },
            });
        });
    }

    _disableAllInput() {
        if (this.numButtons) {
            this.numButtons.setEnabled(false);
        }
        this.submitBtn?.setEnabled(false);
    }

    _playAppleEntranceAnimation() {
        if (this.currentLevelConfig.animationType === 'subtract') {
            this._playSubtractAppleAnimation();
            return;
        }

        const { redCount } = this.currentLevelConfig;
        const redApples = this.appleSprites.slice(0, redCount);
        const greenApples = this.appleSprites.slice(redCount);

        this._playAppleSequence(redApples, () => {
            this.time.delayedCall(APPLE_ENTRANCE.greenDelay, () => {
                this._playAppleSequence(greenApples, () => this._showQuestionUI());
            });
        });
    }

    _playSubtractAppleAnimation() {
        const { takeCount = 0 } = this.currentLevelConfig;
        const keepCount = this.appleSprites.length - takeCount;
        const takeApples = this.appleSprites.slice(keepCount);

        this._playAppleSequence(this.appleSprites, () => {
            this.time.delayedCall(APPLE_ENTRANCE.takeAppleDelay, () => {
                this._playAppleTakeSequence(takeApples, () => {
                    this.time.delayedCall(APPLE_ENTRANCE.equationDelay, () => {
                        this._showQuestionUI();
                    });
                });
            });
        });
    }

    _playAppleTakeSequence(apples, onComplete) {
        if (!apples.length) {
            onComplete?.();
            return;
        }

        let index = 0;
        const lastIndex = apples.length - 1;
        this.time.addEvent({
            delay: APPLE_ENTRANCE.intervalDelay * 2,
            repeat: lastIndex,
            callback: () => {
                const isLast = index === lastIndex;
                this._animTakeApple(apples[index], isLast ? onComplete : null);
                index += 1;
            },
        });
    }

    _playAppleSequence(apples, onComplete) {
        if (!apples.length) {
            onComplete?.();
            return;
        }

        let index = 0;
        const lastIndex = apples.length - 1;
        this.time.addEvent({
            delay: APPLE_ENTRANCE.intervalDelay,
            repeat: lastIndex,
            callback: () => {
                const isLast = index === lastIndex;
                this._animPutApple(apples[index], isLast ? onComplete : null);
                index += 1;
            },
        });
    }

    _showQuestionUI() {
        this._onEntranceComplete();
        this.que1Image.setVisible(true);
        this.answerBg.setVisible(true);

        this.time.delayedCall(APPLE_ENTRANCE.jianpanDelay, () => {
            this._createNumButtons();
            this._createSubmitButton();
        });
    }

    _animPutApple(apple, onComplete) {
        const targetY = apple.finalY ?? APPLE_LAYOUT.y;
        this.sound.play('put');
        apple.y = APPLE_ENTRANCE.startY;
        apple.setVisible(true);

        this.tweens.add({
            targets: apple,
            y: targetY,
            duration: APPLE_ENTRANCE.duration,
            ease: 'Linear',
        });

        const hand = this.add.image(
            apple.x,
            APPLE_ENTRANCE.startY - APPLE_ENTRANCE.handOffsetY,
            'icon_shou',
        );
        this.tweens.add({
            targets: hand,
            y: targetY - APPLE_ENTRANCE.handOffsetY,
            duration: APPLE_ENTRANCE.duration,
            yoyo: true,
            ease: 'Linear',
            onComplete: () => {
                hand.destroy();
                onComplete?.();
            },
        });
    }

    _animTakeApple(apple, onComplete) {
        const targetY = apple.finalY ?? APPLE_LAYOUT.y;
        const takenTexture = this.currentLevelConfig.takenTexture ?? 'apple_red_old';
        const { startY, handOffsetY, duration } = APPLE_ENTRANCE;

        this.sound.play('eat');
        apple.setVisible(true);
        apple.y = targetY;

        this.tweens.add({
            targets: apple,
            y: startY,
            duration,
            delay: duration,
            ease: 'Linear',
            onComplete: () => {
                apple.y = startY;
                apple.setTexture(takenTexture);
                this.tweens.add({
                    targets: apple,
                    y: targetY,
                    duration,
                    ease: 'Linear',
                    onComplete: () => onComplete?.(),
                });
            },
        });

        const hand = this.add.image(apple.x, startY - handOffsetY, 'icon_shou');
        this.tweens.add({
            targets: hand,
            y: targetY - handOffsetY,
            duration,
            yoyo: true,
            repeat: 1,
            ease: 'Linear',
            onComplete: () => hand.destroy(),
        });
    }
}
