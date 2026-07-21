
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
        this.load.image('title1', 'assets/png/gameScene/title1.png');
        this.load.image('jiaobiao', 'assets/png/common/jiaobiao.png');
        this.load.image('area', 'assets/png/gameScene/area.png');
        this.load.image('pink', 'assets/png/gameScene/pink.png');
        this.load.image('blue', 'assets/png/gameScene/blue.png');
        this.load.image('mark', 'assets/png/gameScene/mark.png');
        this.load.image('que1_1', 'assets/png/gameScene/que1_1.png');
        this.load.image('que1_2', 'assets/png/gameScene/que1_2.png');
        this.load.image('option', 'assets/png/gameScene/option.png');
        this.load.image('option2', 'assets/png/gameScene/option2.png');
        this.load.image('tips1_1', 'assets/png/gameScene/tips1_1.png');
        this.load.image('tips1_2', 'assets/png/gameScene/tips1_2.png');
        this.load.image('tips1_3', 'assets/png/gameScene/tips1_3.png');
        this.load.image('tips1_4', 'assets/png/gameScene/tips1_4.png');
        this.load.image('answer1', 'assets/png/gameScene/answer1.png');
        this.load.image('answer4', 'assets/png/gameScene/answer4.png');
        this.load.image('answer10', 'assets/png/gameScene/answer10.png');
        this.load.image('answer11', 'assets/png/gameScene/answer11.png');

        this.load.image('reset', 'assets/png/common/reset.png');
        this.load.image('reset_s', 'assets/png/common/reset_s.png');
        this.load.image('play', 'assets/png/common/play.png');
        this.load.audio('btnclick', 'assets/audio/btnclick.mp3');
    }
}
