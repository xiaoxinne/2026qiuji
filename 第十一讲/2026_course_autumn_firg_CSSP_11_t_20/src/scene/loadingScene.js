import { GAME_CONFIG } from '../gameConfig.js';

export default class loadingScene extends Phaser.Scene {
    constructor() {
        super('loadingScene');
    }

    preload() {
        this.load.image('load_bg', 'assets/png/loadingScene/load_bg.png');
        this.load.image('loading_jd', 'assets/png/loadingScene/load_jd.png');
        this.load.spineBinary('jiazai_huli_data', 'assets/spine/jiazai_huli.skel');
        this.load.spineAtlas('jiazai_huli_atlas', 'assets/spine/jiazai_huli.atlas');

        this.load.once('complete', () => {
            this.showloading();
            this.loadGameAssets();
            this.load.start();
        });
    }

    showloading() {
        this.add.image(960, 540, 'load_bg');
        this.barLeftX = 638;
        this.barCenterY = 510.5;
        this.progressBar = this.add.image(this.barLeftX, this.barCenterY, 'loading_jd');
        this.progressBar.setOrigin(0, 0.5);
        this.barFullWidth = this.progressBar.width;
        this.barHeight = this.progressBar.height;
        this.progressBar.setCrop(0, 0, 0, this.barHeight);

        this.progressHead = this.add.spine(
            this.barLeftX,
            this.barCenterY - 20,
            'jiazai_huli_data',
            'jiazai_huli_atlas',
        );
        this.progressHead.animationState.setAnimation(0, 'idle', true);
        this.progressHead.setDepth(1);

        const progressText = this.add.text(960, 510.5, '0%', {
            fontSize: '24px',
            fill: '#ffffff',
            fontFamily: 'Arial',
        }).setOrigin(0.5);

        this.load.on('progress', (value) => {
            const cropWidth = this.barFullWidth * value;
            this.progressBar.setCrop(0, 0, cropWidth, this.barHeight);
            this._syncProgressHead(cropWidth);
            progressText.setText(`${Math.round(value * 100)}%`);
        });

        this.load.on('complete', () => {
            console.log('所有资源加载完成');
            this.scene.start('gameScene');
        });
    }

    /** jiazai_huli 中心对齐进度条裁剪右端 */
    _syncProgressHead(cropWidth) {
        this.progressHead?.setPosition(this.barLeftX + cropWidth - 40, this.barCenterY - 20);
    }

    loadGameAssets() {
        this.load.image('game_bg', 'assets/png/gameScene/bg.png');
        this.load.image('reverse', 'assets/png/gameScene/reverse.png');

        for (let i = 1; i <= GAME_CONFIG.cardCount; i += 1) {
            this.load.image(`option${i}`, `assets/png/gameScene/option${i}.png`);
            this.load.audio(`option${i}`, `assets/audio/option${i}.mp3`);
        }

        this.load.audio('btnclick', 'assets/audio/btnclick.mp3');
    }
}
