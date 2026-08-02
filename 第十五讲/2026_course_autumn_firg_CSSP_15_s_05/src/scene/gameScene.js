import OptionGroupComponent from '../components/OptionGroupComponent.js';
import ButtonComponent from '../components/ButtonComponent.js';
import GameEndComponent from '../components/GameEndComponent.js';
import TrumpetButtonComponent from '../components/TrumpetButtonComponent.js';

const ERROR_FLASH_TIMES = 3;
const ERROR_FLASH_INTERVAL = 150;
const NEXT_LEVEL_DELAY = 800;

const OPTIONS = [
    { id: '1', x: 585, y: 810, texture: 'option1', selectedTexture: 'option1_s', errorTexture: 'option1_r' },
    { id: '2', x: 945, y: 810, texture: 'option2', selectedTexture: 'option2_s', errorTexture: 'option2_r' },
    { id: '3', x: 1305, y: 810, texture: 'option3', selectedTexture: 'option3_s', errorTexture: 'option3_r' },
];

/** 三关：每关对应 area1～area3，并播对应读题音 */
const LEVELS = [
    { areaKey: 'area1', correctOptionId: '1', soundKey: 'title1' },
    { areaKey: 'area2', correctOptionId: '1', soundKey: 'title2' },
    { areaKey: 'area3', correctOptionId: '2', soundKey: 'title3' },
];

export default class gameScene extends Phaser.Scene {
    constructor() {
        super('gameScene');
        ReportHelper.gameReportParams.difficulty = 1;
        ReportHelper.gameReportParams.question_id = '2026_course_autumn_firg_CSSP_15_s_05';
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
        this.levelIndex = 0;

        this.add.image(960, 540, 'game_bg');
        this.add.image(101, 67, 'jiaobiao');
        this.add.image(960, 92, 'title1');
        this.areaImage = this.add.image(947, 423, LEVELS[0].areaKey);

        this.trumpet = TrumpetButtonComponent.create(this, {
            x: 155,
            y: 910,
            soundKey: 'title1',
            autoPlay: true,
        });

        this.optionGroup = OptionGroupComponent.create(this, {
            mode: 'single',
            soundKey: 'btnclick',
            dimWhenDisabled: false,
            options: OPTIONS,
            onChange: () => {
                this.syncSubmitButtonState();
            },
        });

        this.submitButton = new ButtonComponent(this, {
            x: 1534,
            y: 810,
            texture: 'submit',
            clickEffectTexture: 'submit_s',
            clickDisabledTexture: 'submit_d',
            soundKey: 'btnclick',
            onClick: () => {
                this.onSubmit();
            },
        });
        this.syncSubmitButtonState();
    }

    get currentLevel() {
        return LEVELS[this.levelIndex];
    }

    syncSubmitButtonState() {
        if (!this.submitButton || !this.optionGroup) return;
        const canSubmit =
            !this.isBusy &&
            !this.hasFinished &&
            this.optionGroup.getSelected().length > 0;
        this.submitButton.setEnabled(canSubmit);
    }

    onSubmit() {
        if (this.isBusy || this.hasFinished) return;
        const selectedIds = this.optionGroup.getSelected();
        if (!selectedIds.length) return;

        const selectedId = selectedIds[0];
        const correctId = this.currentLevel.correctOptionId;
        const isCorrect = selectedId === correctId;

        if (isCorrect) {
            this.isBusy = true;
            this.submitButton.setEnabled(false);
            this.optionGroup.setEnabled(false);
            this.trumpet?.stop?.();
            this.sound.play('correct');

            const correctItem = this.optionGroup.items.find((item) => item.id === correctId);
            if (correctItem?.icon) {
                this.playSpineEffect(correctItem.icon.x, correctItem.icon.y);
            }

            this.time.delayedCall(NEXT_LEVEL_DELAY, () => {
                if (this.levelIndex < LEVELS.length - 1) {
                    this.goToNextLevel();
                    return;
                }
                this.hasFinished = true;
                GameEndComponent.show(this, {
                    errorCnt: this.errorCnt,
                });
            });
            return;
        }

        this.isBusy = true;
        this.submitButton.setEnabled(false);
        this.optionGroup.setEnabled(false);
        this.sound.play('error1');
        this.errorCnt += 1;
        ReportHelper.recordWrongTime(this.levelIndex);

        this.optionGroup.flashError(selectedId, {
            times: ERROR_FLASH_TIMES,
            interval: ERROR_FLASH_INTERVAL,
            onComplete: () => {
                this.optionGroup.clearSelection();
                this.optionGroup.setEnabled(true);
                this.isBusy = false;
                this.syncSubmitButtonState();
            },
        });
    }

    goToNextLevel() {
        this.levelIndex += 1;
        this.areaImage.setTexture(this.currentLevel.areaKey);
        this.optionGroup.clearSelection();
        this.optionGroup.setEnabled(true);
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
