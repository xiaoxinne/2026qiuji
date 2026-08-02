/**
 * 通用选项组：支持单选 / 多选，每个选项可独立配置位置与贴图；
 * 选中态 texture / selectedTexture；错误态 errorTexture（showError）。
 *
 * @example
 * OptionGroupComponent.create(this, {
 *   mode: 'single',
 *   options: [
 *     { id: 'a', x: 400, y: 500, texture: 'option1', selectedTexture: 'option1_s', errorTexture: 'option1_r' },
 *   ],
 *   onChange: (selectedIds) => {},
 * });
 */
export default class OptionGroupComponent {
    static CLICK_THRESHOLD = 10;

    static create(scene, config = {}) {
        return new OptionGroupComponent(scene, config);
    }

    /**
     * 创建选项上的纯展示元素（不绑定交互）
     * @param {Phaser.Scene} scene
     * @param {Phaser.GameObjects.Image} mainIcon
     * @param {Array<any>} displays
     * @returns {Phaser.GameObjects.Image[]}
     */
    static createDisplayNodes(scene, mainIcon, displays) {
        if (!Array.isArray(displays) || displays.length === 0) return [];
        const nodes = [];
        for (const d of displays) {
            if (!d || !d.texture) continue;
            const relative = d.relative !== false;
            const x = relative ? mainIcon.x + (d.x ?? 0) : (d.x ?? mainIcon.x);
            const y = relative ? mainIcon.y + (d.y ?? 0) : (d.y ?? mainIcon.y);
            const img = scene.add.image(x, y, d.texture);
            if (d.depth != null) img.setDepth(d.depth);
            if (d.scale != null) img.setScale(d.scale);
            if (d.angle != null) img.setAngle(d.angle);
            if (d.alpha != null) img.setAlpha(d.alpha);
            if (d.origin != null) {
                const ox = d.origin.x != null ? d.origin.x : 0.5;
                const oy = d.origin.y != null ? d.origin.y : 0.5;
                img.setOrigin(ox, oy);
            }
            nodes.push(img);
        }
        return nodes;
    }

    constructor(scene, config = {}) {
        const {
            mode = 'single',
            options = [],
            allowDeselect = false,
            soundKey = null,
            onChange = null,
            keepSizeOnTextureChange = false,
            /** 禁用时无 disabledTexture 是否将选项半透明（false 则保持不透明） */
            dimWhenDisabled = true,
        } = config;

        this.scene = scene;
        this.mode = mode === 'multiple' ? 'multiple' : 'single';
        this.allowDeselect = !!allowDeselect;
        this.soundKey = soundKey || null;
        this.onChange = onChange;
        this.keepSizeOnTextureChange = !!keepSizeOnTextureChange;
        this._dimWhenDisabled = !!dimWhenDisabled;
        this._enabled = true;

        this._selected = new Set();
        this._error = new Set();

        /** @type {Array<{ id: string, icon: Phaser.GameObjects.Image, normalTexture: string, selectedTexture: string, errorTexture: string|null, disabledTexture: string|null, originalWidth: number, originalHeight: number, clickStartX: number|null, clickStartY: number|null, displayNodes: Phaser.GameObjects.Image[] }>} */
        this.items = [];

        for (const opt of options) {
            const id = opt.id != null ? String(opt.id) : null;
            if (id == null) continue;

            const x = opt.x ?? 0;
            const y = opt.y ?? 0;
            const texture = opt.texture;
            const selectedTexture = opt.selectedTexture != null ? opt.selectedTexture : texture;
            const errorTexture = opt.errorTexture != null ? opt.errorTexture : null;
            const disabledTexture = opt.disabledTexture != null ? opt.disabledTexture : null;

            const icon = scene.add.image(x, y, texture);
            if (opt.depth != null) icon.setDepth(opt.depth);
            if (opt.scale != null) icon.setScale(opt.scale);
            if (opt.angle != null) icon.setAngle(opt.angle);
            if (opt.origin != null) {
                const ox = opt.origin.x != null ? opt.origin.x : 0.5;
                const oy = opt.origin.y != null ? opt.origin.y : 0.5;
                icon.setOrigin(ox, oy);
            }
            const displayNodes = OptionGroupComponent.createDisplayNodes(scene, icon, opt.displays);

            const originalWidth = icon.displayWidth;
            const originalHeight = icon.displayHeight;

            this.items.push({
                id,
                opt,
                icon,
                normalTexture: texture,
                selectedTexture,
                errorTexture,
                disabledTexture,
                originalWidth,
                originalHeight,
                clickStartX: null,
                clickStartY: null,
                displayNodes,
            });
        }

        this._applyVisualState();
        this._bindPointer();
    }

    _bindPointer() {
        for (const item of this.items) {
            item.icon.setInteractive({ useHandCursor: true });
            item.icon.on('pointerdown', (pointer) => {
                if (!this._enabled) return;
                item.clickStartX = pointer.x;
                item.clickStartY = pointer.y;
                this._showPressTexture(item);
            });
            item.icon.on('pointerup', (pointer) => {
                if (!this._enabled) {
                    item.clickStartX = null;
                    item.clickStartY = null;
                    return;
                }
                if (item.clickStartX === null || item.clickStartY === null) {
                    this._applyVisualState();
                    return;
                }
                const dx = pointer.x - item.clickStartX;
                const dy = pointer.y - item.clickStartY;
                const distSq = dx * dx + dy * dy;
                const th = OptionGroupComponent.CLICK_THRESHOLD;
                const thresholdSq = th * th;
                const valid = distSq < thresholdSq;
                item.clickStartX = null;
                item.clickStartY = null;
                if (valid) {
                    this._toggleOrSelect(item.id);
                }
                this._applyVisualState();
            });
            item.icon.on('pointerout', () => {
                if (item.clickStartX !== null || item.clickStartY !== null) {
                    item.clickStartX = null;
                    item.clickStartY = null;
                    this._applyVisualState();
                }
            });
        }
    }

    _showPressTexture(item) {
        try {
            item.icon.setTexture(item.selectedTexture);
            if (this.keepSizeOnTextureChange) {
                item.icon.setDisplaySize(item.originalWidth, item.originalHeight);
            }
        } catch (e) {}
    }

    _applyVisualState() {
        for (const item of this.items) {
            const selected = this._selected.has(item.id);
            const errored = this._error.has(item.id);
            let tex = selected ? item.selectedTexture : item.normalTexture;
            if (errored && item.errorTexture) {
                tex = item.errorTexture;
            }
            if (!this._enabled && item.disabledTexture) {
                tex = item.disabledTexture;
            }
            try {
                item.icon.setTexture(tex);
                if (this.keepSizeOnTextureChange) {
                    item.icon.setDisplaySize(item.originalWidth, item.originalHeight);
                }
            } catch (e) {}
            const dim =
                !this._enabled && !item.disabledTexture && this._dimWhenDisabled;
            item.icon.setAlpha(dim ? 0.45 : 1);
        }
    }

    _toggleOrSelect(id) {
        const prev = new Set(this._selected);
        this.clearError();

        if (this.mode === 'single') {
            if (this._selected.has(id) && this.allowDeselect) {
                this._selected.clear();
            } else {
                this._selected.clear();
                this._selected.add(id);
            }
        } else {
            if (this._selected.has(id)) this._selected.delete(id);
            else this._selected.add(id);
        }

        const changed =
            prev.size !== this._selected.size ||
            [...prev].some((x) => !this._selected.has(x)) ||
            [...this._selected].some((x) => !prev.has(x));

        if (changed && this.soundKey && this.scene.sound) {
            this.scene.sound.add(this.soundKey).play();
        }

        if (changed && this.onChange) {
            this.onChange(this.getSelected(), { id, mode: this.mode });
        }
    }

    /** @returns {string[]} 当前选中的选项 id（单选时 0 或 1 个） */
    getSelected() {
        return [...this._selected];
    }

    /**
     * 程序化设置选中项
     * @param {string|string[]} ids 单选时只保留第一个；多选时为集合
     */
    setSelected(ids) {
        const list = Array.isArray(ids) ? ids.map(String) : ids != null ? [String(ids)] : [];
        this._selected.clear();
        if (this.mode === 'single') {
            if (list.length > 0) this._selected.add(list[0]);
        } else {
            list.forEach((id) => this._selected.add(id));
        }
        this._applyVisualState();
    }

    clearSelection() {
        this._selected.clear();
        this._applyVisualState();
    }

    /**
     * 显示错误态（_r）；不传 ids 时对当前选中项生效
     * @param {string|string[]|null} ids
     */
    showError(ids = null) {
        const list =
            ids == null
                ? this.getSelected()
                : Array.isArray(ids)
                  ? ids.map(String)
                  : [String(ids)];
        this._error.clear();
        list.forEach((id) => this._error.add(id));
        this._applyVisualState();
    }

    clearError() {
        if (this._error.size === 0) return;
        this._error.clear();
        this._applyVisualState();
    }

    /**
     * 错误态闪烁（_r 与常态/选中态交替），结束后回调
     * @param {string|string[]|null} ids
     * @param {{ times?: number, interval?: number, onComplete?: Function }} options
     */
    flashError(ids = null, options = {}) {
        const list =
            ids == null
                ? this.getSelected()
                : Array.isArray(ids)
                  ? ids.map(String)
                  : [String(ids)];
        if (!list.length) {
            options.onComplete?.();
            return;
        }

        this._stopFlashError();
        const times = options.times != null ? options.times : 3;
        const interval = options.interval != null ? options.interval : 150;
        let step = 0;
        const totalSteps = times * 2;

        const tick = () => {
            if (step >= totalSteps) {
                this._flashEvent = null;
                this.clearError();
                options.onComplete?.();
                return;
            }
            if (step % 2 === 0) this.showError(list);
            else this.clearError();
            step += 1;
            this._flashEvent = this.scene.time.delayedCall(interval, tick);
        };
        tick();
    }

    _stopFlashError() {
        if (this._flashEvent) {
            this._flashEvent.remove(false);
            this._flashEvent = null;
        }
    }

    setEnabled(enabled) {
        this._enabled = !!enabled;
        for (const item of this.items) {
            if (this._enabled) item.icon.setInteractive({ useHandCursor: true });
            else item.icon.disableInteractive();
        }
        this._applyVisualState();
    }

    destroy() {
        this._stopFlashError();
        for (const item of this.items) {
            if (Array.isArray(item.displayNodes)) {
                for (const node of item.displayNodes) {
                    if (node) node.destroy();
                }
                item.displayNodes = [];
            }
            if (item.icon) {
                item.icon.off('pointerdown');
                item.icon.off('pointerup');
                item.icon.off('pointerout');
                item.icon.destroy();
            }
        }
        this.items = [];
        this.onChange = null;
    }
}
