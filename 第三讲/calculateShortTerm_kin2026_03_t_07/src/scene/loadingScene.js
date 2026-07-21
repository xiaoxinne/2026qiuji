
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
        this.load.image('item1', 'assets/png/gameScene/item1.png');
        this.load.image('item2', 'assets/png/gameScene/item2.png');
        this.load.image('item3', 'assets/png/gameScene/item3.png');
        this.load.image('item4', 'assets/png/gameScene/item4.png');
        this.load.image('item1_s', 'assets/png/gameScene/item1_s.png');
        this.load.image('item2_s', 'assets/png/gameScene/item2_s.png');
        this.load.image('item3_s', 'assets/png/gameScene/item3_s.png');
        this.load.image('item4_s', 'assets/png/gameScene/item4_s.png');
        this.load.image('price_3', 'assets/png/gameScene/price_3.png');
        this.load.image('price_7', 'assets/png/gameScene/price_7.png');
        this.load.image('price_8', 'assets/png/gameScene/price_8.png');
        this.load.image('price_9', 'assets/png/gameScene/price_9.png');
        this.load.image('line', 'assets/png/gameScene/line.png');
        this.load.image('line_s', 'assets/png/gameScene/line_s.png');
        this.load.image('add', 'assets/png/gameScene/add.png');
        this.load.image('equal', 'assets/png/gameScene/equal.png');
        for (let i = 0; i <= 9; i++) {
            this.load.image(`num_${i}`, `assets/png/gameScene/num_${i}.png`);
        }
      
        this.load.image('reset', 'assets/png/common/reset.png');
        this.load.image('reset_s', 'assets/png/common/reset_s.png');
        this.load.image('play', 'assets/png/common/play.png');
        this.load.audio('btnclick', 'assets/audio/btnclick.mp3');
    }
}
