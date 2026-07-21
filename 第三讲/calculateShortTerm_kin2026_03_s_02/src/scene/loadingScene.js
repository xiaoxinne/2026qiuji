
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
            this.loadStartAssets();
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
            this.scene.start('startScene');
        });
    }

    loadStartAssets() {
        this.load.image('startScneBg', 'assets/png/common/s_fm_bg.png');

        this.load.spineBinary('end_data', 'assets/spine/jieshu.skel');
        this.load.spineAtlas('end_atlas', 'assets/spine/jieshu.atlas');

        this.load.spineBinary('win_data', 'assets/spine/win.skel');
        this.load.spineAtlas('win_atlas', 'assets/spine/win.atlas');

        this.load.spineBinary('begin_data', 'assets/spine/begin.skel');
        this.load.spineAtlas('begin_atlas', 'assets/spine/begin.atlas');

        this.load.spineBinary('button_data', 'assets/spine/button.skel');
        this.load.spineAtlas('button_atlas', 'assets/spine/button.atlas');

        this.load.spineBinary('zhuanchang_data', 'assets/spine/zhuanchang.skel');
        this.load.spineAtlas('zhuanchang_atlas', 'assets/spine/zhuanchang.atlas');
    }

    loadGameAssets() {
        this.load.image('game_bg', 'assets/png/gameScene/bg.png');
        this.load.image('jiaobiao', 'assets/png/common/jiaobiao.png');
        this.load.image('title1_1', 'assets/png/gameScene/title1_1.png');
        this.load.image('title2_1', 'assets/png/gameScene/title2_1.png');
        this.load.image('title3_1', 'assets/png/gameScene/title3_1.png');
        this.load.image('title1_2', 'assets/png/gameScene/title1_2.png');
        this.load.image('area', 'assets/png/gameScene/area.png');
        this.load.image('pink', 'assets/png/gameScene/pink.png');
        this.load.image('blue', 'assets/png/gameScene/blue.png');
        this.load.image('wenhao', 'assets/png/gameScene/wenhao.png');
        this.load.image('option_11', 'assets/png/gameScene/option_11.png');
        this.load.image('option_11_s', 'assets/png/gameScene/option_11_s.png');
        this.load.image('option_11_r', 'assets/png/gameScene/option_11_r.png');
        this.load.image('option_12', 'assets/png/gameScene/option_12.png');
        this.load.image('option_12_s', 'assets/png/gameScene/option_12_s.png');
        this.load.image('option_12_r', 'assets/png/gameScene/option_12_r.png');
        this.load.image('option_13', 'assets/png/gameScene/option_13.png');
        this.load.image('option_13_s', 'assets/png/gameScene/option_13_s.png');
        this.load.image('option_13_r', 'assets/png/gameScene/option_13_r.png');
        this.load.image('option_14', 'assets/png/gameScene/option_14.png');
        this.load.image('option_14_s', 'assets/png/gameScene/option_14_s.png');
        this.load.image('option_14_r', 'assets/png/gameScene/option_14_r.png');
        this.load.image('option_16', 'assets/png/gameScene/option_16.png');
        this.load.image('option_16_s', 'assets/png/gameScene/option_16_s.png');
        this.load.image('option_16_r', 'assets/png/gameScene/option_16_r.png');
        this.load.image('option_17', 'assets/png/gameScene/option_17.png');
        this.load.image('option_17_s', 'assets/png/gameScene/option_17_s.png');
        this.load.image('option_17_r', 'assets/png/gameScene/option_17_r.png');
        this.load.image('sr_11', 'assets/png/gameScene/sr_11.png');
        this.load.image('sr_12', 'assets/png/gameScene/sr_12.png');
        this.load.image('sr_13', 'assets/png/gameScene/sr_13.png');
        this.load.image('sr_14', 'assets/png/gameScene/sr_14.png');
        this.load.image('sr_16', 'assets/png/gameScene/sr_16.png');
        this.load.image('sr_17', 'assets/png/gameScene/sr_17.png');

        this.load.image('submit', 'assets/png/common/submit.png');
        this.load.image('submit_s', 'assets/png/common/submit_s.png');
        this.load.image('submit_d', 'assets/png/common/submit_d.png');

        this.load.spineBinary('effect_jinengzidan_data', 'assets/spine/effect_jinengzidan.skel');
        this.load.spineAtlas('effect_jinengzidan_atlas', 'assets/spine/effect_jinengzidan.atlas');

        this.load.spineBinary('laba_data', 'assets/spine/laba.skel');
        this.load.spineAtlas('laba_atlas', 'assets/spine/laba.atlas');

        this.load.audio('btnclick', 'assets/audio/btnclick.mp3');
        this.load.audio('put', 'assets/audio/put.mp3');
        this.load.audio('eat', 'assets/audio/eat.mp3');
        this.load.audio('correct', 'assets/audio/correct.mp3');
        this.load.audio('error1', 'assets/audio/error1.mp3');
        this.load.audio('title1', 'assets/audio/title1.mp3');
        this.load.audio('title2', 'assets/audio/title2.mp3');
        this.load.audio('jizhang', 'assets/audio/jizhang.mp3');
        this.load.audio('givemefive', 'assets/audio/givemefive.mp3');
    }
}
