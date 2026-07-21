import ButtonComponent from './ButtonComponent.js';

/**
 * 上一页 / 下一页（与 reset 同列 x，上下排布）
 * - 第 1 页不显示上一页；最后一页不显示下一页
 */
export default class PageNavButtonsComponent {
    /**
     * @param {Phaser.Scene} scene
     * @param {Object} config
     * @param {number} config.x - 与 reset 对齐的 x（默认 1778）
     * @param {number} config.prevY - 上一页按钮 y
     * @param {number} config.nextY - 下一页按钮 y
     * @param {number} config.totalPages - 总页数（至少 1）
     * @param {number} [config.initialPage=0] - 初始页码（从 0 起）
     * @param {string} [config.soundKey='btnclick'] - 点击音效
     * @param {number} [config.depth=30] - 深度
     * @param {(pageIndex: number) => void} [config.onPageChange] - 页码变化后回调
     * @param {string} [config.prevTexture='prev']
     * @param {string} [config.prevClickTexture='prev_s']
     * @param {string} [config.nextTexture='next']
     * @param {string} [config.nextClickTexture='next_s']
     */
    constructor(scene, config = {}) {
        const {
            x = 1778,
            prevY = 778,
            nextY = 978,
            totalPages = 2,
            initialPage = 0,
            soundKey = 'btnclick',
            depth = 30,
            onPageChange = null,
            prevTexture = 'prev',
            prevClickTexture = 'prev_s',
            nextTexture = 'next',
            nextClickTexture = 'next_s',
        } = config;

        this.scene = scene;
        this._x = x;
        this._totalPages = Math.max(1, totalPages);
        this._page = Phaser.Math.Clamp(initialPage, 0, this._totalPages - 1);
        this._onPageChange = onPageChange;

        this.prevBtn = new ButtonComponent(scene, {
            x,
            y: prevY,
            texture: prevTexture,
            clickEffectTexture: prevClickTexture,
            soundKey,
            onClick: () => this._goPrev(),
        });
        this.nextBtn = new ButtonComponent(scene, {
            x,
            y: nextY,
            texture: nextTexture,
            clickEffectTexture: nextClickTexture,
            soundKey,
            onClick: () => this._goNext(),
        });
        this.prevBtn.getMainIcon().setDepth(depth);
        this.nextBtn.getMainIcon().setDepth(depth);

        this._refresh();
    }

    /** 当前页码（从 0 起） */
    getPageIndex() {
        return this._page;
    }

    getTotalPages() {
        return this._totalPages;
    }

    /**
     * 程序化切页（会触发 onPageChange）
     * @param {number} index 从 0 起
     */
    setPage(index) {
        this._page = Phaser.Math.Clamp(index, 0, this._totalPages - 1);
        if (this._onPageChange) {
            this._onPageChange(this._page);
        }
        this._refresh();
    }

    _goPrev() {
        if (this._page <= 0) return;
        this._page--;
        if (this._onPageChange) {
            this._onPageChange(this._page);
        }
        this._refresh();
    }

    _goNext() {
        if (this._page >= this._totalPages - 1) return;
        this._page++;
        if (this._onPageChange) {
            this._onPageChange(this._page);
        }
        this._refresh();
    }

    /** 第一页隐藏上一页，最后一页隐藏下一页 */
    _refresh() {
        const showPrev = this._page > 0;
        const showNext = this._page < this._totalPages - 1;
        this._applyVisible(this.prevBtn, showPrev);
        this._applyVisible(this.nextBtn, showNext);
    }

    _applyVisible(btn, visible) {
        const icon = btn.getMainIcon();
        icon.setVisible(visible);
        if (visible) {
            btn.setEnabled(true);
        } else {
            btn.setEnabled(false);
        }
    }

    destroy() {
        if (this.prevBtn) {
            this.prevBtn.destroy();
            this.prevBtn = null;
        }
        if (this.nextBtn) {
            this.nextBtn.destroy();
            this.nextBtn = null;
        }
    }
}
