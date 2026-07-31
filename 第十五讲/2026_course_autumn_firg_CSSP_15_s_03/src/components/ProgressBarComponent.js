import { GAME_CONFIG } from '../gameConfig.js';

/**
 * 进度条：以空格子数量表示目标，填充后表示已收集的箱子数
 */
export default class ProgressBarComponent {
    /**
     * @param {Phaser.Scene} scene
     * @param {{ target: number, startX?: number, y?: number, gap?: number }} options
     */
    constructor(scene, options = {}) {
        this.scene = scene;
        this.target = options.target || 5;
        this.filled = 0;
        this.cells = [];

        const cfg = GAME_CONFIG.progress;
        const startX = options.startX != null ? options.startX : cfg.startX;
        const y = options.y != null ? options.y : cfg.y;
        const gap = options.gap != null ? options.gap : cfg.gap;

        // 整体水平居中：以 startX 为第一格中心时，按 target 微调
        const totalW = (this.target - 1) * gap;
        const firstX = 960 - totalW / 2;

        for (let i = 0; i < this.target; i += 1) {
            const x = firstX + i * gap;
            const img = scene.add.image(x, y, cfg.emptyTexture);
            img.setDepth(cfg.depth);
            this.cells.push(img);
        }
    }

    get remaining() {
        return Math.max(0, this.target - this.filled);
    }

    get isFull() {
        return this.filled >= this.target;
    }

    /** 下一个待填充格子的世界坐标；已满返回 null */
    getNextFillPosition() {
        if (this.isFull) return null;
        const cell = this.cells[this.filled];
        return { x: cell.x, y: cell.y };
    }

    /** 填充一格，返回该格坐标 */
    fillOne() {
        if (this.isFull) return null;
        const cell = this.cells[this.filled];
        cell.setTexture(GAME_CONFIG.progress.filledTexture);
        this.filled += 1;
        return { x: cell.x, y: cell.y };
    }

    reset(target) {
        this.target = target;
        this.filled = 0;
        this.cells.forEach((c) => c.destroy());
        this.cells = [];

        const cfg = GAME_CONFIG.progress;
        const gap = cfg.gap;
        const totalW = (this.target - 1) * gap;
        const firstX = 960 - totalW / 2;

        for (let i = 0; i < this.target; i += 1) {
            const x = firstX + i * gap;
            const img = this.scene.add.image(x, cfg.y, cfg.emptyTexture);
            img.setDepth(cfg.depth);
            this.cells.push(img);
        }
    }

    destroy() {
        this.cells.forEach((c) => c.destroy());
        this.cells = [];
    }
}
