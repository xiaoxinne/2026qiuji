import OptionGroupComponent from '../components/OptionGroupComponent.js';
import ButtonComponent from '../components/ButtonComponent.js';
import GameEndComponent from '../components/GameEndComponent.js';
import TrumpetButtonComponent from '../components/TrumpetButtonComponent.js';

const CORRECT_OPTION_ID = '3';

const ERROR_FLASH_TIMES = 3;
const ERROR_FLASH_INTERVAL = 150;

const OPTIONS = [
    { id: '1', x: 1203, y: 797, texture: 'option1', selectedTexture: 'option1_s', errorTexture: 'option1_r' },
    { id: '2', x: 1412, y: 797, texture: 'option2', selectedTexture: 'option2_s', errorTexture: 'option2_r' },
    { id: '3', x: 1622, y: 797, texture: 'option3', selectedTexture: 'option3_s', errorTexture: 'option3_r' },
];

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
            this.trumpet?.showIdle?.();
        };
        document.addEventListener('visibilitychange', this._onVisibilityChange);

        this.isBusy = false;
        this.hasAnsweredCorrectly = false;
        this.errorCnt = 0;

        this.add.image(960, 540, 'game_bg');
        this.add.image(960, 92, 'title1');
        this.add.image(961, 376, 'area');
        this.add.image(1404, 797, 'option_bg');

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
            y: 753,
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

    syncSubmitButtonState() {
        if (!this.submitButton || !this.optionGroup) return;
        const canSubmit =
            !this.isBusy &&
            !this.hasAnsweredCorrectly &&
            this.optionGroup.getSelected().length > 0;
        this.submitButton.setEnabled(canSubmit);
    }

    onSubmit() {
        if (this.isBusy || this.hasAnsweredCorrectly) return;
        const selectedIds = this.optionGroup.getSelected();
        if (!selectedIds.length) return;

        const selectedId = selectedIds[0];
        const isCorrect = selectedId === CORRECT_OPTION_ID;

        if (isCorrect) {
            this.hasAnsweredCorrectly = true;
            this.isBusy = true;
            this.submitButton.setEnabled(false);
            this.optionGroup.setEnabled(false);
            this.trumpet?.stop?.();
            this.sound.play('correct');

            const correctItem = this.optionGroup.items.find((item) => item.id === CORRECT_OPTION_ID);
            if (correctItem?.icon) {
                this.playSpineEffect(correctItem.icon.x, correctItem.icon.y);
            }

            GameEndComponent.show(this, {
                errorCnt: this.errorCnt,
            });
            return;
        }

        this.isBusy = true;
        this.submitButton.setEnabled(false);
        this.optionGroup.setEnabled(false);
        this.sound.play('error1');
        this.errorCnt += 1;
        ReportHelper.recordWrongTime(0);

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
