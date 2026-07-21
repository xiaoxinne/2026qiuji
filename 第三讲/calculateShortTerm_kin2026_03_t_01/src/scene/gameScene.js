import ButtonComponent from '../components/ButtonComponent.js';

const PANEL_CONFIGS = [
    {
        x: 635,
        y: 479,
        whX: 850,
        whY: 552,
        toggleKey: 'button_4',
        apples: [
            { x: 537, y: 384 },
            { x: 723, y: 408 },
            { x: 507, y: 508 },
            { x: 643, y: 506 },
        ],
    },
    {
        x: 1284,
        y: 479,
        whX: 1500,
        whY: 552,
        toggleKey: 'button_3',
        apples: [
            { x: 1185, y: 384 },
            { x: 1371, y: 408 },
            { x: 1252, y: 509 },
        ],
    },
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

        this.playButtonClicked = false;
        this.panelElements = [];
        this.gameState = {
            panelRevealed: [false, false],
            summaryButtonShown: false,
            answerDetailShown: false,
        };

        this.add.image(960, 540, 'game_bg');
        this.add.image(101, 67, 'jiaobiao');
        this.add.image(960, 92.5, 'tips_txt');

        this._createPanels();
        this._createPlayButton();
        this._createResetButton();
        this._createAnswerSection();
    }

    _playClickSound() {
        this.sound.play('btnclick');
    }

    _createPanels() {
        PANEL_CONFIGS.forEach((config, index) => {
            const panel = {
                border: null,
                apples: [],
                buttonWh: null,
                toggleBtn: null,
            };

            const border = this.add.image(config.x, config.y, 'border');
            border.setOrigin(0.5);
            panel.border = border;

            config.apples.forEach((pos) => {
                const apple = this.add.image(pos.x, pos.y, 'item_apple');
                apple.setOrigin(0.5);
                panel.apples.push(apple);
            });

            const { buttonWh, toggleBtn } = this._createToggleButton(
                config.whX,
                config.whY,
                config.toggleKey,
                () => this._onPanelRevealed(index),
            );
            panel.buttonWh = buttonWh;
            panel.toggleBtn = toggleBtn;

            if (index === 1) {
                this._setPanelVisible(panel, false);
            }

            this.panelElements.push(panel);
        });
    }

    _setPanelVisible(panel, visible) {
        panel.border.setVisible(visible);
        panel.apples.forEach((apple) => apple.setVisible(visible));
        panel.buttonWh.setVisible(visible);
        panel.toggleBtn.setVisible(false);

        if (visible) {
            panel.buttonWh.setInteractive({ useHandCursor: true });
        } else {
            panel.buttonWh.disableInteractive();
        }
    }

    _createToggleButton(x, y, toggleKey, onRevealed) {
        const buttonWh = this.add.image(x, y, 'button_wh');
        buttonWh.setOrigin(0.5);
        buttonWh.setInteractive({ useHandCursor: true });

        const toggleBtn = this.add.image(x, y, toggleKey);
        toggleBtn.setOrigin(0.5);
        toggleBtn.setVisible(false);

        buttonWh.on('pointerup', () => {
            this._playClickSound();
            buttonWh.setVisible(false);
            buttonWh.disableInteractive();
            toggleBtn.setVisible(true);
            onRevealed?.();
        });

        return { buttonWh, toggleBtn };
    }

    _onPanelRevealed(panelIndex) {
        this.gameState.panelRevealed[panelIndex] = true;
        this._checkSummaryButtonReveal();
    }

    _createAnswerSection() {
        this.summaryBg = this.add.image(974, 722, 'button_bg');
        this.summaryBg.setOrigin(0.5);
        this.summaryBg.setVisible(false);

        this.summaryWh = this.add.image(974, 722, 'button_wh');
        this.summaryWh.setOrigin(0.5);
        this.summaryWh.setVisible(false);

        this.summaryBg.setInteractive({ useHandCursor: true });
        this.summaryBg.on('pointerup', () => {
            this._playClickSound();
            this._onSummaryBgClick();
        });

        this.ss1 = this.add.image(940, 737, 'ss_1');
        this.ss1.setOrigin(0.5);
        this.ss1.setVisible(false);

        this.answerWh = this.add.image(1125, 737, 'button_wh');
        this.answerWh.setOrigin(0.5);
        this.answerWh.setVisible(false);

        this.answerSprite = this.add.image(1125, 737, 'answer');
        this.answerSprite.setOrigin(0.5);
        this.answerSprite.setVisible(false);

        this.answerWh.on('pointerup', () => {
            this._playClickSound();
            this.answerWh.setVisible(false);
            this.answerWh.disableInteractive();
            this.answerSprite.setVisible(true);
        });
    }

    _checkSummaryButtonReveal() {
        if (this.gameState.summaryButtonShown) {
            return;
        }

        if (!this.gameState.panelRevealed.every(Boolean)) {
            return;
        }

        this.gameState.summaryButtonShown = true;
        this.summaryBg.setVisible(true);
        this.summaryWh.setVisible(true);
    }

    _onSummaryBgClick() {
        if (this.gameState.answerDetailShown) {
            return;
        }

        this.gameState.answerDetailShown = true;
        this.summaryBg.setVisible(false);
        this.summaryBg.disableInteractive();
        this.summaryWh.setVisible(false);

        this.ss1.setVisible(true);
        this.answerWh.setVisible(true);
        this.answerWh.setInteractive({ useHandCursor: true });
    }

    _resetPanelToggle(panel) {
        panel.buttonWh.setVisible(true);
        panel.buttonWh.setInteractive({ useHandCursor: true });
        panel.toggleBtn.setVisible(false);
    }

    _resetToInitialState() {
        this.playButtonClicked = false;
        this.gameState.panelRevealed = [false, false];
        this.gameState.summaryButtonShown = false;
        this.gameState.answerDetailShown = false;

        this._resetPanelToggle(this.panelElements[0]);
        this._setPanelVisible(this.panelElements[0], true);

        this._resetPanelToggle(this.panelElements[1]);
        this._setPanelVisible(this.panelElements[1], false);

        this.summaryBg.setVisible(false);
        this.summaryBg.setInteractive({ useHandCursor: true });
        this.summaryWh.setVisible(false);

        this.ss1.setVisible(false);
        this.answerWh.setVisible(false);
        this.answerWh.disableInteractive();
        this.answerSprite.setVisible(false);

        this.playBtn.getMainIcon().setVisible(true);
        this.playBtn.setEnabled(true);
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
        this._setPanelVisible(this.panelElements[1], true);
    }
}
