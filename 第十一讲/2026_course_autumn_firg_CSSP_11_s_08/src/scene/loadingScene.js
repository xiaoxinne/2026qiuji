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
            this.loadStartAssets();
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
            this.scene.start('startScene');
        });
    }

    /** jiazai_huli 中心对齐进度条裁剪右端 */
    _syncProgressHead(cropWidth) {
        this.progressHead?.setPosition(this.barLeftX + cropWidth - 40, this.barCenterY - 20);
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

        this.load.spineBinary('laba_data', 'assets/spine/laba.skel');
        this.load.spineAtlas('laba_atlas', 'assets/spine/laba.atlas');

        this.load.spineBinary('effect_jinengzidan_data', 'assets/spine/effect_jinengzidan.skel');
        this.load.spineAtlas('effect_jinengzidan_atlas', 'assets/spine/effect_jinengzidan.atlas');

        this.load.audio('jizhang', 'assets/audio/jizhang.mp3');
        this.load.audio('givemefive', 'assets/audio/givemefive.mp3');
    }

    loadGameAssets() {
        this.load.image('game_bg', 'assets/png/gameScene/bg.png');
        this.load.image('title1', 'assets/png/gameScene/title1.png');
        this.load.image('jiaobiao', 'assets/png/common/jiaobiao.png');

        this.load.image('option_bg', 'assets/png/gameScene/option_bg.png');
        this.load.image('submit', 'assets/png/common/submit.png');
        this.load.image('submit_s', 'assets/png/common/submit_s.png');
        this.load.image('submit_d', 'assets/png/common/submit_d.png');

        for (let i = 1; i <= 3; i += 1) {
            this.load.image(`option${i}`, `assets/png/gameScene/option${i}.png`);
            this.load.image(`option${i}_s`, `assets/png/gameScene/option${i}_s.png`);
            this.load.image(`option${i}_r`, `assets/png/gameScene/option${i}_r.png`);
        }

        this.load.audio('btnclick', 'assets/audio/btnclick.mp3');
        this.load.audio('error1', 'assets/audio/error1.mp3');
        this.load.audio('correct', 'assets/audio/correct.mp3');
        this.load.audio('title1', 'assets/audio/title1.mp3');
    }
}
