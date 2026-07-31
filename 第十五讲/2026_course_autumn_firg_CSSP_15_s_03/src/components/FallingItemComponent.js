import { GAME_CONFIG } from '../gameConfig.js';

/**
 * 掉落物：箱子组合（1/2/3）或炸弹
 */
export default class FallingItemComponent {
    /**
     * @param {Phaser.Scene} scene
     * @param {{ x: number, y: number, type: 'box'|'bomb', count: number, depth?: number }} options
     */
    constructor(scene, options) {
        this.scene = scene;
        this.type = options.type;
        this.count = options.count || 1;
        this.isAlive = true;
        this.isHit = false;

        const size = GAME_CONFIG.boxDisplaySize;
        const gap = GAME_CONFIG.boxGap;
        this.container = scene.add.container(options.x, options.y);
        this.container.setDepth(options.depth != null ? options.depth : 20);

        this.parts = [];
        if (this.type === 'bomb') {
            const bomb = scene.add.image(0, 0, GAME_CONFIG.bombTexture);
            bomb.setDisplaySize(size, size);
            this.container.add(bomb);
            this.parts.push(bomb);
        } else {
            const totalW = this.count * size + (this.count - 1) * gap;
            let x = -totalW / 2 + size / 2;
            for (let i = 0; i < this.count; i += 1) {
                const box = scene.add.image(x, 0, GAME_CONFIG.boxTexture);
                box.setDisplaySize(size, size);
                this.container.add(box);
                this.parts.push(box);
                x += size + gap;
            }
        }

        const boundsW =
            this.type === 'bomb'
                ? size
                : this.count * size + (this.count - 1) * gap;
        this.hitWidth = boundsW;
        this.hitHeight = size;
    }

    get x() {
        return this.container.x;
    }

    get y() {
        return this.container.y;
    }

    setPosition(x, y) {
        this.container.setPosition(x, y);
    }

    /** 轴对齐包围盒（含 padding） */
    getHitBounds(padding = 0) {
        return new Phaser.Geom.Rectangle(
            this.x - this.hitWidth / 2 - padding,
            this.y - this.hitHeight / 2 - padding,
            this.hitWidth + padding * 2,
            this.hitHeight + padding * 2,
        );
    }

    /** 线段是否与包围盒相交 */
    hitTestSegment(x1, y1, x2, y2, padding = GAME_CONFIG.hitPadding) {
        if (!this.isAlive || this.isHit) return false;
        const rect = this.getHitBounds(padding);
        return Phaser.Geom.Intersects.LineToRectangle(
            new Phaser.Geom.Line(x1, y1, x2, y2),
            rect,
        );
    }

    /**
     * 消除动效：缩放淡出后销毁
     * @returns {Promise<void>}
     */
    playEliminate() {
        this.isHit = true;
        this.isAlive = false;
        // 关闭交互态后仍保留 container 做 tween
        return new Promise((resolve) => {
            this.scene.tweens.add({
                targets: this.container,
                scaleX: 1.25,
                scaleY: 1.25,
                alpha: 0,
                duration: GAME_CONFIG.eliminateDuration,
                ease: 'Cubic.easeIn',
                onComplete: () => {
                    this.destroy();
                    resolve();
                },
            });
        });
    }

    /**
     * 炸弹错误闪烁后销毁
     * @returns {Promise<void>}
     */
    playBombError() {
        this.isHit = true;
        this.isAlive = false;
        return new Promise((resolve) => {
            let flashes = 0;
            const max = GAME_CONFIG.bombFlashTimes;
            const interval = GAME_CONFIG.bombFlashInterval;

            const tick = () => {
                flashes += 1;
                this.container.setAlpha(flashes % 2 === 1 ? 0.25 : 1);
                if (flashes >= max * 2) {
                    this.destroy();
                    resolve();
                    return;
                }
                this.scene.time.delayedCall(interval, tick);
            };
            tick();
        });
    }

    destroy() {
        this.isAlive = false;
        if (this.container?.active) {
            this.container.destroy(true);
        }
    }
}
