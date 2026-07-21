import ButtonComponent from '../components/ButtonComponent.js';

export default class gameScene extends Phaser.Scene {
    constructor() {
        super('gameScene');
    }

    create() {
        this._onVisibilityChange = () => {
            this.sound.stopAll();
        };
        document.addEventListener('visibilitychange', this._onVisibilityChange);

        this.playButtonClicked = false;
        this.handIcon = null;
        this.targetAppleOriginX = 1056;
        this.targetAppleOriginY = 446;
        this.placedAppleOriginX = 1055;
        this.placedAppleOriginY = 441;
        this.answerButtonX = 966;
        this.answerButtonY = 825;
        this.answerDetailShown = false;

        this.add.image(960, 540, 'game_bg');
        this.add.image(101, 67, 'jiaobiao');
        this.add.image(960, 92.5, 'tips_txt');
        this.add.image(950, 531, 'pot');
        this.add.image(830, 417, 'item_apple');
        this.targetApple = this.add.image(this.targetAppleOriginX, this.targetAppleOriginY, 'item_apple');
        this.add.image(794, 567, 'item_apple');
        this.add.image(959, 565, 'item_apple');

        this.placedApple = this.add.image(this.placedAppleOriginX, this.placedAppleOriginY, 'item_apple2');
        this.placedApple.setVisible(false);

        this._createAnswerSection();
        this._createPlayButton();
        this._createResetButton();
    }

    _createAnswerSection() {
        const { answerButtonX: x, answerButtonY: y } = this;

        this.summaryBg = this.add.image(x, y, 'button_bg');
        this.summaryBg.setOrigin(0.5);
        this.summaryBg.setVisible(false);

        this.summaryWh = this.add.image(x, y, 'button_wh');
        this.summaryWh.setOrigin(0.5);
        this.summaryWh.setVisible(false);

        this.summaryBg.setInteractive({ useHandCursor: true });
        this.summaryBg.on('pointerup', () => {
            this.sound.play('btnclick');
            this._onSummaryBgClick();
        });

        this.ss1 = this.add.image(x - 34, y + 15, 'ss_1');
        this.ss1.setOrigin(0.5);
        this.ss1.setVisible(false);

        this.answerWh = this.add.image(x + 151, y + 15, 'button_wh');
        this.answerWh.setOrigin(0.5);
        this.answerWh.setVisible(false);

        this.answerSprite = this.add.image(x + 151, y + 15, 'answer');
        this.answerSprite.setOrigin(0.5);
        this.answerSprite.setVisible(false);

        this.answerWh.on('pointerup', () => {
            this.sound.play('btnclick');
            this.answerWh.setVisible(false);
            this.answerWh.disableInteractive();
            this.answerSprite.setVisible(true);
        });
    }

    _showAnswerButton() {
        this.summaryBg.setVisible(true);
        this.summaryWh.setVisible(true);
    }

    _onSummaryBgClick() {
        if (this.answerDetailShown) {
            return;
        }

        this.answerDetailShown = true;
        this.summaryBg.setVisible(false);
        this.summaryBg.disableInteractive();
        this.summaryWh.setVisible(false);

        this.ss1.setVisible(true);
        this.answerWh.setVisible(true);
        this.answerWh.setInteractive({ useHandCursor: true });
    }

    _createPlayButton() {
        this.playBtn = new ButtonComponent(this, {
            x: 1774,
            y: 512,
            texture: 'play',
            clickEffectTexture: 'play',
            soundKey: 'btnclick',
            keepSizeOnClickEffect: true,
            onClick: () => this._onPlayClick(),
        });
    }

    _createResetButton() {
        this.resetBtn = new ButtonComponent(this, {
            x: 1778,
            y: 878,
            texture: 'reset',
            clickEffectTexture: 'reset_s',
            soundKey: 'btnclick',
            keepSizeOnClickEffect: true,
            onClick: () => this._resetToInitialState(),
        });
    }

    _onPlayClick() {
        if (this.playButtonClicked) {
            return;
        }

        this.playButtonClicked = true;
        this.playBtn.getMainIcon().setVisible(false);
        this.playBtn.setEnabled(false);
        this._playHandTakeApple();
    }

    _playHandTakeApple() {
        const targetX = this.targetAppleOriginX;
        const targetY = this.targetAppleOriginY;
        const moveDuration = 1000;

        if (this.handIcon) {
            this.tweens.killTweensOf(this.handIcon);
            this.handIcon.destroy();
        }
        this.tweens.killTweensOf(this.targetApple);
        this.tweens.killTweensOf(this.placedApple);

        this.handIcon = this.add.image(targetX, 0, 'icon_shou');
        this.handIcon.setOrigin(0.1, 1);
        this.handIcon.y = -this.handIcon.height / 2;

        this.tweens.add({
            targets: this.handIcon,
            y: targetY,
            duration: moveDuration,
            ease: 'Linear',
            onComplete: () => {
                const exitY = -this.handIcon.height / 2;
                const moveDistance = this.handIcon.y - exitY;

                this.tweens.add({
                    targets: [this.handIcon, this.targetApple],
                    y: `-=${moveDistance}`,
                    duration: moveDuration,
                    ease: 'Linear',
                    onComplete: () => {
                        this.targetApple.setVisible(false);
                        this._playHandPlaceApple();
                    },
                });
            },
        });
    }

    _playHandPlaceApple() {
        const targetX = this.placedAppleOriginX;
        const targetY = this.placedAppleOriginY;
        const moveDuration = 1000;
        const startY = -this.handIcon.height / 2;

        this.handIcon.x = targetX;
        this.handIcon.y = startY;
        this.handIcon.setVisible(true);

        this.placedApple.x = targetX;
        this.placedApple.y = startY;
        this.placedApple.setVisible(true);

        const moveDistance = targetY - startY;

        this.tweens.add({
            targets: [this.handIcon, this.placedApple],
            y: `+=${moveDistance}`,
            duration: moveDuration,
            ease: 'Linear',
            onComplete: () => {
                this.handIcon.setVisible(false);
                this._showAnswerButton();
            },
        });
    }

    _resetToInitialState() {
        this.tweens.killTweensOf(this.targetApple);
        this.tweens.killTweensOf(this.placedApple);
        if (this.handIcon) {
            this.tweens.killTweensOf(this.handIcon);
            this.handIcon.destroy();
            this.handIcon = null;
        }

        this.targetApple.y = this.targetAppleOriginY;
        this.targetApple.setVisible(true);
        this.placedApple.y = this.placedAppleOriginY;
        this.placedApple.setVisible(false);

        this.answerDetailShown = false;
        this.summaryBg.setVisible(false);
        this.summaryBg.setInteractive({ useHandCursor: true });
        this.summaryWh.setVisible(false);
        this.ss1.setVisible(false);
        this.answerWh.setVisible(false);
        this.answerWh.disableInteractive();
        this.answerSprite.setVisible(false);

        this.playButtonClicked = false;
        this.playBtn.getMainIcon().setVisible(true);
        this.playBtn.setEnabled(true);
    }
}
