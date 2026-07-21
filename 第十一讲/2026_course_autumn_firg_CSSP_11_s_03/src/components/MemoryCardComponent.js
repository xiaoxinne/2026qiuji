/**
 * 翻牌组件：背面 reverse / 正面 option1~8，带 scaleX 翻转动画。
 */
export default class MemoryCardComponent {
    constructor(scene, config) {
        const {
            x = 0,
            y = 0,
            pairId = 0,
            frontTexture = '',
            backTexture = 'reverse',
            depth = 10,
            flipDuration = 200,
            displayWidth = 152,
            displayHeight = 198,
            onClick = null,
        } = config;

        this.scene = scene;
        this.pairId = pairId;
        this.frontTexture = frontTexture;
        this.backTexture = backTexture;
        this.flipDuration = flipDuration;
        this.displayWidth = displayWidth;
        this.displayHeight = displayHeight;
        this.onClick = onClick;

        this.isFaceUp = false;
        this.isMatched = false;
        this.isFlipping = false;

        this.sprite = scene.add.image(x, y, backTexture);
        this.sprite.setDisplaySize(displayWidth, displayHeight);
        this.baseScaleX = this.sprite.scaleX;
        this.baseScaleY = this.sprite.scaleY;
        this.sprite.setDepth(depth);
        this.sprite.setInteractive({ useHandCursor: true });
        this.sprite.on('pointerdown', () => {
            if (this.onClick) {
                this.onClick(this);
            }
        });
    }

    flipToFront() {
        if (this.isFaceUp || this.isFlipping || this.isMatched) {
            return Promise.resolve();
        }
        this.isFlipping = true;
        return this._playFlip(this.frontTexture).then(() => {
            this.isFaceUp = true;
            this.isFlipping = false;
        });
    }

    flipToBack() {
        if (!this.isFaceUp || this.isFlipping || this.isMatched) {
            return Promise.resolve();
        }
        this.isFlipping = true;
        return this._playFlip(this.backTexture).then(() => {
            this.isFaceUp = false;
            this.isFlipping = false;
        });
    }

    remove(duration = 300) {
        this.isMatched = true;
        this.sprite.disableInteractive();
        return new Promise((resolve) => {
            this.scene.tweens.add({
                targets: this.sprite,
                alpha: 0,
                scaleX: 0.5,
                scaleY: 0.5,
                duration,
                onComplete: () => {
                    this.sprite.destroy();
                    this.sprite = null;
                    resolve();
                },
            });
        });
    }

    _playFlip(textureKey) {
        return new Promise((resolve) => {
            const half = this.flipDuration / 2;
            this.scene.tweens.add({
                targets: this.sprite,
                scaleX: 0,
                duration: half,
                ease: 'Linear',
                onComplete: () => {
                    this.sprite.setTexture(textureKey);
                    this.sprite.setDisplaySize(this.displayWidth, this.displayHeight);
                    this.baseScaleX = this.sprite.scaleX;
                    this.scene.tweens.add({
                        targets: this.sprite,
                        scaleX: this.baseScaleX,
                        duration: half,
                        ease: 'Linear',
                        onComplete: resolve,
                    });
                },
            });
        });
    }

    destroy() {
        if (this.sprite) {
            this.sprite.destroy();
            this.sprite = null;
        }
    }
}
