import { GAME_CONFIG } from '../gameConfig.js';

/**
 * 手指滑动切割：命中时播一次 daoguang；判定贴合物品外形
 */
export default class SlashCutComponent {
    /**
     * @param {Phaser.Scene} scene
     * @param {{ onSlashHit: (item: any, x: number, y: number) => void, getItems: () => any[] }} options
     */
    constructor(scene, options) {
        this.scene = scene;
        this.onSlashHit = options.onSlashHit || (() => {});
        this.getItems = options.getItems || (() => []);
        this.enabled = true;

        this.isSlashing = false;
        this.lastX = 0;
        this.lastY = 0;
        /** @type {{ x1: number, y1: number, x2: number, y2: number, t: number }[]} */
        this.segments = [];
        this._idleClearEvent = null;
        this._fadeEvent = null;
        /** @type {any|null} 同时只保留一个刀光 */
        this._daoGuangFx = null;

        this.graphics = scene.add.graphics();
        this.graphics.setDepth(500);

        scene.input.on('pointerdown', this._onDown, this);
        scene.input.on('pointermove', this._onMove, this);
        scene.input.on('pointerup', this._onUp, this);
        scene.input.on('pointerupoutside', this._onUp, this);
    }

    setEnabled(value) {
        this.enabled = value;
        if (!value) {
            this._endSlash(true);
        }
    }

    _onDown(pointer) {
        if (!this.enabled) return;
        this._cancelIdleClear();
        this._cancelFade();
        this.isSlashing = true;
        this.lastX = pointer.worldX;
        this.lastY = pointer.worldY;
        this.segments = [];
        this.graphics.clear();
        this.graphics.setAlpha(1);
    }

    _onMove(pointer) {
        if (!this.enabled || !this.isSlashing || !pointer.isDown) return;

        const x = pointer.worldX;
        const y = pointer.worldY;
        const dist = Phaser.Math.Distance.Between(this.lastX, this.lastY, x, y);
        if (dist < 4) return;

        const now = this.scene.time.now;
        this.segments.push({
            x1: this.lastX,
            y1: this.lastY,
            x2: x,
            y2: y,
            t: now,
        });
        this._testHits(this.lastX, this.lastY, x, y);

        this.lastX = x;
        this.lastY = y;

        this._pruneAndRedraw(now);
        this._armIdleClear();
    }

    _onUp() {
        if (!this.isSlashing) return;
        this._endSlash(true);
    }

    /** @param {boolean} immediate 松手/禁用时立刻清线，避免“常驻刀刃”误导 */
    _endSlash(immediate = false) {
        this.isSlashing = false;
        this._cancelIdleClear();
        this.segments = [];

        if (immediate) {
            this._cancelFade();
            this.graphics.clear();
            this.graphics.setAlpha(1);
            return;
        }

        this.graphics.clear();
        this.graphics.setAlpha(1);
    }

    _armIdleClear() {
        this._cancelIdleClear();
        this._idleClearEvent = this.scene.time.delayedCall(
            GAME_CONFIG.slashIdleClearMs,
            () => {
                this._idleClearEvent = null;
                if (this.isSlashing) {
                    this.segments = [];
                    this.graphics.clear();
                }
            },
        );
    }

    _cancelIdleClear() {
        if (this._idleClearEvent) {
            this._idleClearEvent.remove(false);
            this._idleClearEvent = null;
        }
    }

    _cancelFade() {
        if (this._fadeEvent) {
            this._fadeEvent.remove(false);
            this._fadeEvent = null;
        }
        if (this.graphics?.active) {
            this.scene.tweens.killTweensOf(this.graphics);
        }
    }

    _pruneAndRedraw(now) {
        const life = GAME_CONFIG.slashTrailLifeMs;
        this.segments = this.segments.filter((seg) => now - seg.t <= life);

        const g = this.graphics;
        g.clear();
        for (const seg of this.segments) {
            const age = now - seg.t;
            const alpha = Math.max(0.15, 1 - age / life);
            g.lineStyle(8, 0xffffff, 0.9 * alpha);
            g.beginPath();
            g.moveTo(seg.x1, seg.y1);
            g.lineTo(seg.x2, seg.y2);
            g.strokePath();
            g.lineStyle(3, 0xfff2a8, 0.75 * alpha);
            g.beginPath();
            g.moveTo(seg.x1, seg.y1);
            g.lineTo(seg.x2, seg.y2);
            g.strokePath();
        }
    }

    /** 清掉上一个刀光，保证场上只有一个 */
    _clearDaoGuang() {
        if (this._daoGuangFx?.active) {
            this._daoGuangFx.destroy();
        }
        this._daoGuangFx = null;
    }

    /**
     * 命中时播一次刀光（大：da，若无则 xiao）
     * @param {number} x
     * @param {number} y
     * @param {number} angleRad
     */
    _playDaoGuang(x, y, angleRad) {
        if (!this.scene.cache.binary.exists('daoguang_data')) return;

        this._clearDaoGuang();

        const cfg = GAME_CONFIG.daoGuang || {};
        const fx = this.scene.add.spine(x, y, 'daoguang_data', 'daoguang_atlas');
        fx.setDepth(cfg.depth != null ? cfg.depth : 520);
        fx.setScale(cfg.scale != null ? cfg.scale : 0.45);
        fx.setRotation(angleRad);
        this._daoGuangFx = fx;

        const data = fx.skeleton?.data || fx.animationState?.data?.skeletonData;
        const anims = data?.animations || [];
        const names = anims.map((a) => a.name);
        const animName =
            names.find((n) => n === 'da') ||
            names.find((n) => n === 'xiao') ||
            names[0] ||
            'da';

        fx.animationState.setAnimation(0, animName, false);
        fx.animationState.addListener({
            complete: () => {
                if (this._daoGuangFx === fx) this._daoGuangFx = null;
                if (fx.active) fx.destroy();
            },
        });
    }

    _testHits(x1, y1, x2, y2) {
        const segLen = Phaser.Math.Distance.Between(x1, y1, x2, y2);
        if (segLen < 2) return;

        const angle = Math.atan2(y2 - y1, x2 - x1);
        const items = this.getItems();
        for (const item of items) {
            if (!item?.isAlive || item.isHit) continue;
            if (item.hitTestSegment(x1, y1, x2, y2)) {
                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;
                this._playDaoGuang(midX, midY, angle);
                this.onSlashHit(item, midX, midY);
            }
        }
    }

    destroy() {
        this._cancelIdleClear();
        this._cancelFade();
        this._clearDaoGuang();
        this.scene.input.off('pointerdown', this._onDown, this);
        this.scene.input.off('pointermove', this._onMove, this);
        this.scene.input.off('pointerup', this._onUp, this);
        this.scene.input.off('pointerupoutside', this._onUp, this);
        this.graphics?.destroy();
    }
}
