/**
 * 0-9 数字按钮组件 + 可选 add/minus 符号按钮（独立实现，不引用 ButtonComponent）
 * 数字显示 num_0 ~ num_9；有 num_*_s 时按下高亮，否则保持默认图；符号使用 add、minus 图片，可配置选中态。
 */
export default class NumButtonsComponent {
    static CLICK_THRESHOLD = 10;

    static create(scene, config = {}) {
        return new NumButtonsComponent(scene, config);
    }

    constructor(scene, config = {}) {
        const {
            positions = [],
            onClick = null,
            soundKey = 'btnclick',
            addPosition = null,
            minusPosition = null,
            addTexture = 'add',
            addTextureSelected = 'add',
            addTextureDisabled = 'add_n',
            minusTexture = 'minus',
            minusTextureSelected = 'minus',
            minusTextureDisabled = 'minus_n',
        } = config;

        this.scene = scene;
        this.onClickCallback = onClick;
        this.soundKey = soundKey || null;
        this._enabled = true;
        this._digitsEnabled = true;
        this._symbolsEnabled = true;
        this.buttons = [];
        this.symbolButtons = [];

        for (let i = 0; i < 10; i++) {
            const digit = i === 9 ? 0 : i + 1;
            const pos = positions[i] || { x: 0, y: 0 };
            const normalTexture = `num_${digit}`;
            const highlightTexture = `num_${digit}_s`;
            const displayTexture = `num_${digit}_n`;
            const btn = this._createButton(pos.x, pos.y, normalTexture, highlightTexture, displayTexture, () => {
                if (this.onClickCallback) this.onClickCallback(digit, 'digit');
            });
            btn.digit = digit;
            btn.type = 'digit';
            this.buttons.push(btn);
        }

        if (addPosition && addPosition.x != null && addPosition.y != null) {
            const btn = this._createButton(addPosition.x, addPosition.y, addTexture, addTextureSelected, addTextureDisabled, () => {
                if (this.onClickCallback) this.onClickCallback('add', 'symbol');
            });
            btn.type = 'symbol';
            btn.symbol = 'add';
            this.symbolButtons.push(btn);
        }
        if (minusPosition && minusPosition.x != null && minusPosition.y != null) {
            const btn = this._createButton(minusPosition.x, minusPosition.y, minusTexture, minusTextureSelected, minusTextureDisabled, () => {
                if (this.onClickCallback) this.onClickCallback('minus', 'symbol');
            });
            btn.type = 'symbol';
            btn.symbol = 'minus';
            this.symbolButtons.push(btn);
        }
    }

    _createButton(x, y, normalTexture, highlightTexture, displayTexture, onTap) {
        const icon = this.scene.add.image(x, y, normalTexture);
        const originalWidth = icon.displayWidth;
        const originalHeight = icon.displayHeight;
        const btn = {
            icon,
            normalTexture,
            highlightTexture,
            displayTexture: displayTexture || null,
            originalWidth,
            originalHeight,
            clickStartX: null,
            clickStartY: null,
        };
        icon.setInteractive({ useHandCursor: true });
        icon.on('pointerdown', (pointer) => {
            if (!this._enabled) return;
            btn.clickStartX = pointer.x;
            btn.clickStartY = pointer.y;
            this._showHighlight(btn);
        });
        icon.on('pointerup', (pointer) => {
            if (!this._enabled || btn.clickStartX === null || btn.clickStartY === null) {
                btn.clickStartX = null;
                btn.clickStartY = null;
                this._showNormal(btn);
                return;
            }
            const dx = pointer.x - btn.clickStartX;
            const dy = pointer.y - btn.clickStartY;
            const distSq = dx * dx + dy * dy;
            const thresholdSq = NumButtonsComponent.CLICK_THRESHOLD * NumButtonsComponent.CLICK_THRESHOLD;
            if (distSq < thresholdSq) {
                if (this.soundKey && this.scene.sound) this.scene.sound.add(this.soundKey).play();
                onTap();
            }
            btn.clickStartX = null;
            btn.clickStartY = null;
            this._showNormal(btn);
        });
        icon.on('pointerout', () => {
            if (btn.clickStartX !== null || btn.clickStartY !== null) {
                btn.clickStartX = null;
                btn.clickStartY = null;
                this._showNormal(btn);
            }
        });
        return btn;
    }

    _showHighlight(btn) {
        try {
            // 暂无 num_*_s 时保持默认图；加载 _s 后自动切换高亮
            const tex =
                btn.highlightTexture &&
                btn.highlightTexture !== btn.normalTexture &&
                this.scene.textures.exists(btn.highlightTexture)
                    ? btn.highlightTexture
                    : btn.normalTexture;
            btn.icon.setTexture(tex);
            btn.icon.setDisplaySize(btn.originalWidth, btn.originalHeight);
        } catch (e) {}
    }

    _showNormal(btn) {
        try {
            let tex = btn.normalTexture;
            const useDisplay =
                btn.displayTexture &&
                btn.displayTexture !== btn.normalTexture &&
                this.scene.textures.exists(btn.displayTexture);
            if (btn.type === 'digit' && !this._digitsEnabled && useDisplay) tex = btn.displayTexture;
            else if (btn.type === 'symbol' && !this._symbolsEnabled && useDisplay) tex = btn.displayTexture;
            btn.icon.setTexture(tex);
            btn.icon.setDisplaySize(btn.originalWidth, btn.originalHeight);
        } catch (e) {}
    }

    getButton(digit) {
        if (digit >= 0 && digit <= 9) return this.buttons[digit];
        return null;
    }

    getSymbolButton(symbol) {
        return this.symbolButtons.find((b) => b.symbol === symbol) || null;
    }

    setEnabled(enabled) {
        this._enabled = !!enabled;
        this._applyDigitsState();
        this._applySymbolsState();
    }

    /** 数字框选中时启用数字、禁用符号；符号框选中时启用符号、数字置灰 */
    setDigitsEnabled(enabled) {
        this._digitsEnabled = !!enabled;
        this._applyDigitsState();
    }

    setSymbolsEnabled(enabled) {
        this._symbolsEnabled = !!enabled;
        this._applySymbolsState();
    }

    _applyDigitsState() {
        const canUse = this._enabled && this._digitsEnabled;
        this.buttons.forEach((btn) => {
            if (
                !this._digitsEnabled &&
                btn.displayTexture &&
                btn.displayTexture !== btn.normalTexture &&
                this.scene.textures.exists(btn.displayTexture)
            ) {
                try {
                    btn.icon.setTexture(btn.displayTexture);
                    btn.icon.setDisplaySize(btn.originalWidth, btn.originalHeight);
                } catch (e) {}
            } else {
                try {
                    btn.icon.setTexture(btn.normalTexture);
                    btn.icon.setDisplaySize(btn.originalWidth, btn.originalHeight);
                } catch (e) {}
            }
            if (canUse) {
                btn.icon.setInteractive({ useHandCursor: true });
            } else {
                btn.icon.disableInteractive();
            }
        });
    }

    _applySymbolsState() {
        const canUse = this._enabled && this._symbolsEnabled;
        this.symbolButtons.forEach((btn) => {
            btn.icon.setAlpha(1);
            const tex = canUse ? btn.normalTexture : (btn.displayTexture || btn.normalTexture);
            try {
                btn.icon.setTexture(tex);
                btn.icon.setDisplaySize(btn.originalWidth, btn.originalHeight);
            } catch (e) {}
            if (canUse) {
                btn.icon.setInteractive({ useHandCursor: true });
            } else {
                btn.icon.disableInteractive();
            }
        });
    }
}
