
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
        this.load.image('item', 'assets/png/gameScene/item.png');
        this.load.image('pink', 'assets/png/gameScene/pink.png');
        this.load.image('pink_s', 'assets/png/gameScene/pink_s.png');
        this.load.image('blue', 'assets/png/gameScene/blue.png');
        this.load.image('blue_s', 'assets/png/gameScene/blue_s.png');
        this.load.image('option', 'assets/png/gameScene/option.png');
        this.load.image('option_s', 'assets/png/gameScene/option_s.png');
        this.load.image('option2', 'assets/png/gameScene/option2.png');
        this.load.image('option2_s', 'assets/png/gameScene/option2_s.png');
        this.load.image('option2_r', 'assets/png/gameScene/option2_r.png');
        this.load.image('add', 'assets/png/gameScene/add.png');
        this.load.image('equalpng', 'assets/png/gameScene/equalpng.png');
        this.load.image('tips1_1', 'assets/png/gameScene/tips1_1.png');
        this.load.image('tips1_2', 'assets/png/gameScene/tips1_2.png');
        this.load.image('tips1_3', 'assets/png/gameScene/tips1_3.png');
        this.load.image('tips1_4', 'assets/png/gameScene/tips1_4.png');
        this.load.image('tips1_5', 'assets/png/gameScene/tips1_5.png');
        this.load.image('tips1_6', 'assets/png/gameScene/tips1_6.png');
        this.load.image('break1', 'assets/png/gameScene/break1.png');
        this.load.image('break2', 'assets/png/gameScene/break2.png');
        this.load.image('option10', 'assets/png/gameScene/option10.png');
        this.load.image('answer11', 'assets/png/gameScene/answer11.png');
        this.load.image('arrow', 'assets/png/gameScene/arrow.png');
        this.load.image('number_bg', 'assets/png/gameScene/number_bg.png');

        for (let i = 0; i <= 9; i++) {
            this.load.image(`num_${i}`, `assets/png/gameScene/num_${i}.png`);
            this.load.image(`sr_${i}`, `assets/png/gameScene/sr_${i}.png`);
            this.load.image(`hr_${i}`, `assets/png/gameScene/hr_${i}.png`);
        }

        this.load.image('submit', 'assets/png/common/submit.png');
        this.load.image('submit_s', 'assets/png/common/submit_s.png');
        this.load.image('submit_d', 'assets/png/common/submit_d.png');

        this.load.image('reset', 'assets/png/common/reset.png');
        this.load.image('reset_s', 'assets/png/common/reset_s.png');
        this.load.image('play', 'assets/png/common/play.png');
        this.load.spineBinary('effect_jinengzidan_data', 'assets/spine/effect_jinengzidan.skel');
        this.load.spineAtlas('effect_jinengzidan_atlas', 'assets/spine/effect_jinengzidan.atlas');
        this.load.audio('btnclick', 'assets/audio/btnclick.mp3');
    }
}
