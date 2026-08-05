import ButtonComponent from '../components/ButtonComponent.js';

const RESET_BUTTON = { x: 1778, y: 878 };

/** lifangti 动效画布 1920×1080，原点在左上角 */
const CUBE_CENTER = { x: 0, y: 0 };

const TITLE_POS = { x: 960, y: 92 };

const ANIM_IDLE = 'idle';

/**
 * 三只手指：右侧 / 上侧 / 前面 → 对应 yidong1~3
 * 坐标为 1920×1080 屏幕绝对位置
 */
const HANDS = [
    { key: 'hand1', x: 1280, y: 530, anim: 'yidong3', idle: 'idle4' }, // 右侧
    { key: 'hand2', x: 1000, y: 270, anim: 'yidong2', idle: 'idle3' }, // 上侧
    { key: 'hand3', x: 770, y: 730, anim: 'yidong1', idle: 'idle2' }, // 前面
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

        this.isBusy = false;
        this.lifangti = null;
        this.handImages = [];

        this.add.image(960, 540, 'game_bg');
        this.add.image(101, 67, 'jiaobiao');
        this.add.image(TITLE_POS.x, TITLE_POS.y, 'title1').setDepth(30);

        this._createLifangti();
        this._createHands();
        this._createResetButton();
    }

    _createLifangti() {
        this.lifangti = this.add.spine(
            CUBE_CENTER.x,
            CUBE_CENTER.y,
            'lifangti_data',
            'lifangti_atlas',
        );
        this.lifangti.setDepth(50);
        this.lifangti.animationState.setAnimation(0, ANIM_IDLE, true);
    }

    _createHands() {
        this.handImages = HANDS.map((cfg) => {
            const img = this.add
                .image(cfg.x, cfg.y, cfg.key)
                .setDepth(60)
                .setInteractive({ useHandCursor: true });

            img.setData('anim', cfg.anim);
            img.setData('idle', cfg.idle);

            this.tweens.add({
                targets: img,
                scale: { from: 1, to: 1.08 },
                duration: 420,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });

            img.on('pointerdown', () => {
                if (this.isBusy || !img.visible) return;
                if (this.cache.audio.exists('btnclick')) {
                    this.sound.play('btnclick');
                }
                this._hideHand(img);
                this._playFaceAnim(cfg.anim, cfg.idle);
            });

            return img;
        });
    }

    _hideHand(img) {
        this.tweens.killTweensOf(img);
        img.disableInteractive();
        img.setVisible(false);
    }

    _showAllHands() {
        this.handImages.forEach((img) => {
            img.setVisible(true);
            img.setScale(1);
            img.setInteractive({ useHandCursor: true });
            this.tweens.killTweensOf(img);
            this.tweens.add({
                targets: img,
                scale: { from: 1, to: 1.08 },
                duration: 420,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        });
    }

    /** 点击手指：播对应面的移动动效，再落到对应 idle */
    _playFaceAnim(moveAnim, idleAnim) {
        if (this.isBusy || !this.lifangti) return;
        this.isBusy = true;

        const names = this._lifangtiAnimNames();
        const move = names.includes(moveAnim) ? moveAnim : names[0];
        const idle = names.includes(idleAnim) ? idleAnim : ANIM_IDLE;

        this.lifangti.animationState.clearListeners();
        this.lifangti.animationState.setAnimation(0, move, false);
        this.lifangti.animationState.addAnimation(0, idle, true, 0);
        this.lifangti.animationState.addListener({
            complete: (entry) => {
                if (entry?.animation?.name === move) {
                    this.isBusy = false;
                }
            },
        });
    }

    _lifangtiAnimNames() {
        const data =
            this.lifangti?.skeleton?.data ||
            this.lifangti?.animationState?.data?.skeletonData;
        return (data?.animations || []).map((a) => a.name);
    }

    _resetLifangti() {
        if (!this.lifangti) return;
        this.lifangti.animationState.clearListeners();
        this.lifangti.animationState.setAnimation(0, ANIM_IDLE, true);
        this.isBusy = false;
        this._showAllHands();
    }

    _createResetButton() {
        this.resetBtn = new ButtonComponent(this, {
            x: RESET_BUTTON.x,
            y: RESET_BUTTON.y,
            texture: 'reset',
            clickEffectTexture: 'reset_s',
            soundKey: 'btnclick',
            keepSizeOnClickEffect: true,
            onClick: () => this._onResetClick(),
        });
        this.resetBtn.getMainIcon().setDepth(120);
    }

    _onResetClick() {
        this.sound.stopAll();
        this._resetLifangti();
    }
}
