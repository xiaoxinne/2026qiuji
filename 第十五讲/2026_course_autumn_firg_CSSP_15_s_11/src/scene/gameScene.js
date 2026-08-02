import OptionGroupComponent from '../components/OptionGroupComponent.js';
import ButtonComponent from '../components/ButtonComponent.js';
import GameEndComponent from '../components/GameEndComponent.js';
import TrumpetButtonComponent from '../components/TrumpetButtonComponent.js';

const ERROR_FLASH_TIMES = 3;
const ERROR_FLASH_INTERVAL = 150;
const NEXT_LEVEL_DELAY = 800;
const AREA_MERGE_DURATION = 700;
const AREA_MERGE_HOLD_MS = 200; // 合并移动结束后，停留多久再进下一关
const DEBUG_START_LEVEL = 0; // 测试用：0=第一关，1=第二关；测完改回 0

const OPTIONS = [
    { id: '1', x: 600, y: 809, texture: 'option1', selectedTexture: 'option1_s', errorTexture: 'option1_r' },
    { id: '2', x: 833, y: 809, texture: 'option2', selectedTexture: 'option2_s', errorTexture: 'option2_r' },
    { id: '3', x: 1065, y: 809, texture: 'option3', selectedTexture: 'option3_s', errorTexture: 'option3_r' },
    { id: '4', x: 1297, y: 809, texture: 'option4', selectedTexture: 'option4_s', errorTexture: 'option4_r' },
];

/** 两关：第 1 关 X 合并；第 2 关 Y 合并 */
const LEVELS = [
    {
        areas: [
            { key: 'area1', x: 704, y: 434 },
            { key: 'area1', x: 1184, y: 434 },
        ],
        mergeOnCorrect: true,
        mergeAxis: 'x',
        mergeNudge: 40, // 紧挨微调：越大越近（可略叠）
        correctOptionId: '2',
        soundKey: 'title1',
    },
    {
        areas: [
            { key: 'area2', x: 935, y: 340, depth: 20 },
            { key: 'area2', x: 935, y: 550, depth: 10 },
        ],
        mergeOnCorrect: true,
        mergeAxis: 'y',
        mergeNudge: 45,
        correctOptionId: '3',
        soundKey: 'title2',
    },
];

export default class gameScene extends Phaser.Scene {
    constructor() {
        super('gameScene');
        ReportHelper.gameReportParams.difficulty = 1;
        ReportHelper.gameReportParams.question_id = '2026_course_autumn_firg_CSSP_15_s_11';
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

        this.add.image(960, 540, 'game_bg');
        this.add.image(101, 67, 'jiaobiao');
        this.add.image(960, 92, 'title1');
        this.setupLevelAreas(this.levelIndex);

        this.trumpet = TrumpetButtonComponent.create(this, {
            x: 155,
            y: 910,
            soundKey: this.currentLevel.soundKey,
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
            y: 809,
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

            if (this.currentLevel.mergeOnCorrect) {
                this.playAreaMerge(() => this.afterCorrect());
                return;
            }

            this.time.delayedCall(NEXT_LEVEL_DELAY, () => this.afterCorrect());
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

    /** 两块 area 沿 X 或 Y 靠拢紧挨（由当前关 mergeAxis 决定） */
    playAreaMerge(onComplete) {
        const axis = this.currentLevel.mergeAxis === 'y' ? 'y' : 'x';
        const nudge = this.currentLevel.mergeNudge != null ? this.currentLevel.mergeNudge : 0;
        const images = this.areaImages
            .filter((img) => img && img.active)
            .sort((a, b) => a[axis] - b[axis]);
        if (images.length < 2) {
            onComplete?.();
            return;
        }

        const first = images[0];
        const second = images[images.length - 1];
        const mid = (first[axis] + second[axis]) / 2;

        let firstTarget;
        let secondTarget;
        if (axis === 'x') {
            const firstSize = first.displayWidth;
            const secondSize = second.displayWidth;
            firstTarget = mid - secondSize / 2 + nudge;
            secondTarget = mid + firstSize / 2 - nudge;
        } else {
            const firstSize = first.displayHeight;
            const secondSize = second.displayHeight;
            firstTarget = mid - secondSize / 2 + nudge;
            secondTarget = mid + firstSize / 2 - nudge;
        }

        const targets = [
            { img: first, props: { [axis]: firstTarget } },
            { img: second, props: { [axis]: secondTarget } },
        ];
        let finished = 0;

        targets.forEach(({ img, props }) => {
            this.tweens.add({
                targets: img,
                ...props,
                duration: AREA_MERGE_DURATION,
                ease: 'Cubic.easeInOut',
                onComplete: () => {
                    finished += 1;
                    if (finished >= targets.length) {
                        this.time.delayedCall(AREA_MERGE_HOLD_MS, () => onComplete?.());
                    }
                },
            });
        });
    }

    afterCorrect() {
        if (this.levelIndex < LEVELS.length - 1) {
            this.goToNextLevel();
            return;
        }
        this.hasFinished = true;
        GameEndComponent.show(this, {
            errorCnt: this.errorCnt,
        });
    }

    goToNextLevel() {
        this.levelIndex += 1;
        this.setupLevelAreas(this.levelIndex);
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
