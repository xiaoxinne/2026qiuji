import ButtonComponent from '../components/ButtonComponent.js';

const PLAY_BUTTON = { x: 1778, y: 763 };
const RESET_BUTTON = { x: 1778, y: 878 };

/** 四竖列合拢后的中心 */
const CUBE_CENTER = { x: 960, y: 450 };
/** 合拢时竖切片横向错位（= 正面小方块边长 104，无缝拼成 4×4×4） */
const AREA_SLICE_DX = 104;
/** 拆分时竖列之间的间距 */
const SPLIT_DX = 200;
const SPLIT_DURATION = 420;
/** 四列中心（col 0~3） */
const COL_MID = 1.5;

/** 4 个竖列 area1~area4 */
const AREA_COLUMNS = [
    { key: 'area1', col: 0 },
    { key: 'area2', col: 1 },
    { key: 'area3', col: 2 },
    { key: 'area4', col: 3 },
];

const TITLE_POS = { x: 960, y: 92 };
/** 填空底框：只有点它才显示答案 */
const ANSWER_BG_POS = { x: 1152, y: 94 };

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
        this.isSplit = false;
        this.areaImages = [];
        this.answerVisible = false;

        this.add.image(960, 540, 'game_bg');
        this.add.image(101, 67, 'jiaobiao');
        // title1 仅展示，不可点击
        this.add.image(TITLE_POS.x, TITLE_POS.y, 'title1').setDepth(30);

        this._createAreaColumns();
        this._createAnswerSlot();
        this._createPlayButton();
        this._createResetButton();
    }

    _colOffset(col, gap) {
        return (col - COL_MID) * gap;
    }

    _createAreaColumns() {
        this.tweens.killTweensOf(this.areaImages);
        this.areaImages.forEach((img) => img.destroy());
        this.areaImages = [];
        this.isSplit = false;

        // 画家算法：左侧先画、右侧后画（同 t_12）
        const areas = [...AREA_COLUMNS].sort((a, b) => a.col - b.col);
        this.areaImages = areas.map((area, index) => {
            const homeX = CUBE_CENTER.x + this._colOffset(area.col, AREA_SLICE_DX);
            const homeY = CUBE_CENTER.y;
            const img = this.add.image(homeX, homeY, area.key);
            img.setDepth(10 + index);
            img.setData('col', area.col);
            img.setData('homeX', homeX);
            img.setData('homeY', homeY);
            img.setInteractive(this.input.makePixelPerfect());
            img.on('pointerdown', () => {
                if (this.cache.audio.exists('btnclick')) {
                    this.sound.play('btnclick');
                }
                this._toggleSplit();
            });
            return img;
        });
    }

    /** 组合 ↔ 拆分 循环切换（音效由调用方处理，避免 Play 按钮播两次） */
    _toggleSplit() {
        if (this.isBusy) return;
        this.isSplit = !this.isSplit;
        this._tweenColumnSpread();
    }

    /** 只有点击 answer_bg 才显示/隐藏 answer */
    _createAnswerSlot() {
        this.answerBg = this.add.image(ANSWER_BG_POS.x, ANSWER_BG_POS.y, 'answer_bg').setDepth(31);
        this.answerBg.setInteractive({ useHandCursor: true });

        this.answerImage = this.add
            .image(ANSWER_BG_POS.x, ANSWER_BG_POS.y, 'answer')
            .setDepth(32)
            .setVisible(false);

        this.answerBg.on('pointerdown', () => {
            if (this.isBusy) return;
            if (this.cache.audio.exists('btnclick')) {
                this.sound.play('btnclick');
            }
            this.answerVisible = !this.answerVisible;
            this.answerImage.setVisible(this.answerVisible);
        });
    }

    _getSplitOffset(col) {
        if (!this.isSplit) return { x: 0, y: 0 };
        return {
            x: this._colOffset(col, SPLIT_DX) - this._colOffset(col, AREA_SLICE_DX),
            y: 0,
        };
    }

    /** 合拢 ↔ 拆分（4 竖列） */
    _tweenColumnSpread() {
        const targets = this.areaImages;
        if (!targets.length) {
            this.isBusy = false;
            return;
        }

        this.isBusy = true;
        this.tweens.killTweensOf(targets);

        let pending = targets.length;
        targets.forEach((img) => {
            const col = img.getData('col');
            const homeX = img.getData('homeX');
            const homeY = img.getData('homeY');
            const off = this._getSplitOffset(col);
            this.tweens.add({
                targets: img,
                x: homeX + off.x,
                y: homeY + off.y,
                duration: SPLIT_DURATION,
                ease: 'Sine.easeInOut',
                onComplete: () => {
                    pending -= 1;
                    if (pending <= 0) this.isBusy = false;
                },
            });
        });
    }

    _snapColumnsHome() {
        this.tweens.killTweensOf(this.areaImages);
        this.isSplit = false;
        this.areaImages.forEach((img) => {
            img.setPosition(img.getData('homeX'), img.getData('homeY'));
        });
        this.isBusy = false;
    }

    _createPlayButton() {
        this.playBtn = new ButtonComponent(this, {
            x: PLAY_BUTTON.x,
            y: PLAY_BUTTON.y,
            texture: 'play',
            clickEffectTexture: 'play_s',
            soundKey: 'btnclick',
            keepSizeOnClickEffect: true,
            onClick: () => this._onPlayClick(),
        });
        this.playBtn.getMainIcon().setDepth(120);
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

    /** 播放：合拢 / 拆成 4 竖列，循环切换并播动效 */
    _onPlayClick() {
        this._toggleSplit();
    }

    _onResetClick() {
        this.sound.stopAll();
        this._snapColumnsHome();
        this.answerVisible = false;
        this.answerImage?.setVisible(false);
    }
}
