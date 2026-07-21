
export default class loadingScene extends Phaser.Scene {
    constructor() {
        super('loadingScene');
    }

    preload() {
        this.load.image('load_bg', 'assets/png/loadingScene/load_bg.png');
        this.load.image('loading_d', 'assets/png/loadingScene/load_d.png');
        this.load.image('loading_jd', 'assets/png/loadingScene/load_jd.png');

        this.load.once('complete', () => {
            this.showloading();
            this.loadGameAssets();
            this.load.start();
        });
    }

    showloading() {
        this.add.image(960, 540, 'load_bg');
        this.progressBar = this.add.image(651, 505, 'loading_jd');
        this.progressBar.setOrigin(0, 0.5);
        this.barFullWidth = this.progressBar.width;
        this.barHeight = this.progressBar.height;
        this.progressBar.setCrop(0, 0, 0, this.barHeight);

        this.load.on('progress', (value) => {
            const cropWidth = this.barFullWidth * value;
            this.progressBar.setCrop(0, 0, cropWidth, this.barHeight);
        });

        this.load.on('complete', () => {
            console.log('所有资源加载完成');
            this.scene.start('gameScene');
        });
    }

    loadGameAssets() {
        this.load.image('game_bg', 'assets/png/gameScene/bg.png');
        this.load.image('jiaobiao', 'assets/png/common/jiaobiao.png');

        const gameSceneAssets = [
            'item_apple', 'border', 'tips_txt',
            'button_bg', 'button_wh',
            'button_4', 'button_3', 'ss_1', 'answer',
        ];
        gameSceneAssets.forEach((key) => {
            this.load.image(key, `assets/png/gameScene/${key}.png`);
        });

        this.load.image('play', 'assets/png/common/play.png');
        this.load.image('reset', 'assets/png/common/reset.png');
        this.load.image('reset_s', 'assets/png/common/reset_s.png');
        this.load.audio('btnclick', 'assets/audio/btnclick.mp3');
    }
}
