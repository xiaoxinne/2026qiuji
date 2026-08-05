import { GAME_CONFIG } from '../gameConfig.js';

function pickFruitTexture() {
    const list = GAME_CONFIG.fruitTextures;
    return list[Math.floor(Math.random() * list.length)];
}

/**
 * 掉落物：水果组合（1/2/3）或炸弹（zhadan spine）
 */
export default class FallingItemComponent {
    /**
     * @param {Phaser.Scene} scene
     * @param {{ x: number, y: number, type: 'fruit'|'bomb', count: number, depth?: number }} options
     */
    constructor(scene, options) {
        this.scene = scene;
        this.type = options.type;
        this.count = options.count || 1;
        this.isAlive = true;
        this.isHit = false;
        /** @type {any|null} */
        this.bombSpine = null;

        const size = GAME_CONFIG.fruitDisplaySize;
        const gap = GAME_CONFIG.fruitGap;
        this.container = scene.add.container(options.x, options.y);
        this.container.setDepth(options.depth != null ? options.depth : 20);

        this.parts = [];
        if (this.type === 'bomb') {
            const cfg = GAME_CONFIG.zhadan || {};
            const scale = cfg.scale != null ? cfg.scale : 0.7;
            const bomb = scene.add.spine(0, 0, 'zhadan_data', 'zhadan_atlas');
            bomb.setScale(scale);
            bomb.animationState.setAnimation(0, 'idle', true);
            this.container.add(bomb);
            this.parts.push(bomb);
            this.bombSpine = bomb;
            // 命中盒按缩放后的大致尺寸
            const hit = Math.round(140 * scale);
            this.hitWidth = hit;
            this.hitHeight = hit;
        } else {
            const totalW = this.count * size + (this.count - 1) * gap;
            let x = -totalW / 2 + size / 2;
            for (let i = 0; i < this.count; i += 1) {
                const fruit = scene.add.image(x, 0, pickFruitTexture());
                fruit.setDisplaySize(size, size);
                this.container.add(fruit);
                this.parts.push(fruit);
                x += size + gap;
            }
            this.hitWidth = this.count * size + (this.count - 1) * gap;
            this.hitHeight = size;
        }
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
     * 炸弹：播 baozha 爆炸后销毁
     * @returns {Promise<void>}
     */
    playBombError() {
        this.isHit = true;
        this.isAlive = false;
        return new Promise((resolve) => {
            const spine = this.bombSpine;
            if (!spine?.animationState) {
                this.destroy();
                resolve();
                return;
            }

            const data = spine.skeleton?.data || spine.animationState?.data?.skeletonData;
            const names = (data?.animations || []).map((a) => a.name);
            const animName =
                names.find((n) => n === 'baozha') ||
                names.find((n) => /baozha|boom|explode/i.test(n)) ||
                names.find((n) => n !== 'idle') ||
                names[0];

            spine.animationState.setAnimation(0, animName, false);
            spine.animationState.addListener({
                complete: () => {
                    this.destroy();
                    resolve();
                },
            });
        });
    }

    destroy() {
        this.isAlive = false;
        this.bombSpine = null;
        if (this.container?.active) {
            this.container.destroy(true);
        }
    }
}
