export default class startScene extends Phaser.Scene {
    constructor() {
        super('startScene');
    }

    preload() { 
    }

    create() {          
        this.add.image(960,540,'startScneBg');
        this.beginAnima = this.add.spine(0, 0, 'begin_data', 'begin_atlas');
        this.beginAnima.animationState.setAnimation(0, "in", false);
        // console.log(this.beginAnima.skeleton.data.animations.map((a) => a.name));
        this.beginAnima.animationState.addListener({
            complete: (entry) => {
                if (entry.animation.name === "in") {
                    this.beginAnima.animationState.setAnimation(0, "idle", true);
                }
            }
        });
        //延迟两秒
        this.time.delayedCall(2000, () => {
            this.createPlayBtnAnima();
        });
    }
    createPlayBtnAnima(){
        this.buttonAnima = this.add.spine(960,900, 'button_data', 'button_atlas');
        this.buttonAnima.animationState.setAnimation(0, "idle", true);
        const btn = this.add.graphics();
        btn.fillStyle(0xffffff, 0); // alpha = 0 完全透明
        btn.fillRect(810,750, 300, 300);
        btn.setInteractive(
            new Phaser.Geom.Rectangle(810,750, 300, 300),
            Phaser.Geom.Rectangle.Contains
        );
        this.canClick = true;
        btn.on('pointerdown', () => { 
            if(!this.canClick) return ; 
            this.canClick = false;
            this.sound.play('btnclick');
            this.buttonAnima.animationState.setAnimation(0, "touch", false);
            this.beginAnima.animationState.setAnimation(0, "out", false);
            this.time.delayedCall(2000, () => {
                //停止动画
                // this.buttonAnima.animationState.stop();
                this.scene.start('gameScene');
            });
        });
    }
}
