import ButtonComponent from '../components/ButtonComponent.js';

const PLAY_BUTTON = { x: 1778, y: 763 };
const RESET_BUTTON = { x: 1778, y: 878 };

/** 立体中心（游戏区） */
const CUBE_STACK_ORIGIN = { x: 960, y: 450 };

/**
 * 步进（由 cell.png 134×125 的棱长测得）
 * - col+ 向右，正面方块边长 96
 * - row+ 向后（右上方），侧面进深 (34, -24)
 * - h+ 向上 97
 */
const STEP_COL = { x: 96, y: 0 };
const STEP_ROW = { x: 34, y: -24 };
const STEP_UP = 97;

/** 数字徽章相对顶层 cell 中心的偏移（落在顶面中心偏左上） */
const NUM_OFFSET = { x: 0, y: -75 };

/** 播放时三竖列岔开的额外间距（相对中间列） */
const SPLIT_GAP = 160;
const SPLIT_DURATION = 420;

/**
 * 列状态：
 * 1 初始：不显示描边高亮、不显示数字
 * 2 选中：顶面描边高亮（cell_s）+ 圆形数字 同时出现
 * 点击在 1↔2 间切换（选中与 num 一起出现/隐藏）
 */
const COLUMN_STATE = {
    IDLE: 1,
    SELECTED: 2,
};

/**
 * cell1.png 的立体图形：6 列共 12 个 cell
 * row 0 为最前排，col 0 为最左列
 *
 *   row2: [4] [3] [1]
 *   row1: [2] [1]
 *   row0: [1]
 */
const CUBE_STACKS = [
    { col: 0, row: 0, height: 1 },
    { col: 0, row: 1, height: 2 },
    { col: 0, row: 2, height: 4 },
    { col: 1, row: 1, height: 1 },
    { col: 1, row: 2, height: 3 },
    { col: 2, row: 2, height: 1 },
];

export default class gameScene extends Phaser.Scene {
    constructor() {
        super('gameScene');
    }

    create() {
        this._onVisibilityChange = () => {
            this.sound.stopAll();
        };
        document.addEventListener('visibilitychange', this._onVisibilityChange);

        this.isBusy = false;
        this.hasFinished = false;
        this.isSplit = false;
        this.cubeImages = [];
        this.numImages = [];
        /** @type {Map<string, number>} 列状态 1/2，key = `${col},${row}` */
        this.columnStates = new Map();

        this.add.image(960, 540, 'game_bg');
        this.add.image(101, 67, 'jiaobiao');
        this.add.image(960, 92, 'title1');

        this._createCubeStack();

        this._createPlayButton();
        this._createResetButton();
    }

    _columnKey(col, row) {
        return `${col},${row}`;
    }

    _getColumnState(col, row) {
        return this.columnStates.get(this._columnKey(col, row)) || COLUMN_STATE.IDLE;
    }

    /** 下一状态：1↔2（选中与数字同步） */
    _nextColumnState(current) {
        return current === COLUMN_STATE.SELECTED ? COLUMN_STATE.IDLE : COLUMN_STATE.SELECTED;
    }

    /** 竖列岔开偏移：col0 左移、col1 不动、col2 右移 */
    _getSplitOffset(col) {
        if (!this.isSplit) return { x: 0, y: 0 };
        const delta = col - 1;
        return {
            x: delta * SPLIT_GAP * (STEP_COL.x / 96),
            y: delta * SPLIT_GAP * (STEP_COL.y / 96),
        };
    }

    /** 生成全部立方体格子坐标（含高度层） */
    _getCubeCells() {
        const cells = [];
        CUBE_STACKS.forEach(({ col, row, height }) => {
            for (let h = 0; h < height; h += 1) {
                cells.push({ col, row, h });
            }
        });
        return cells;
    }

    _cellToScreen(col, row, h) {
        return {
            x: col * STEP_COL.x + row * STEP_ROW.x,
            y: col * STEP_COL.y + row * STEP_ROW.y - h * STEP_UP,
        };
    }

    _createCubeStack() {
        this.tweens.killTweensOf(this.cubeImages);
        this.tweens.killTweensOf(this.numImages);
        this.cubeImages.forEach((img) => img.destroy());
        this.cubeImages = [];
        this.numImages.forEach((img) => img.destroy());
        this.numImages = [];
        this.columnStates.clear();
        this.isSplit = false;

        const cells = this._getCubeCells();
        // 先算相对坐标包围盒，再平移到 CUBE_STACK_ORIGIN
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        const locals = cells.map((cell) => {
            const p = this._cellToScreen(cell.col, cell.row, cell.h);
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
            return { ...cell, ...p };
        });

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const ox = CUBE_STACK_ORIGIN.x - centerX;
        const oy = CUBE_STACK_ORIGIN.y - centerY;
        this._cubeOrigin = { ox, oy };

        // 画家算法：后排先画，同排左侧先画，底层先画
        locals.sort((a, b) => b.row - a.row || a.col - b.col || a.h - b.h);

        locals.forEach((cell, index) => {
            const homeX = cell.x + ox;
            const homeY = cell.y + oy;
            const img = this.add.image(homeX, homeY, 'cell');
            img.setDepth(10 + index);
            img.setData('col', cell.col);
            img.setData('row', cell.row);
            img.setData('h', cell.h);
            img.setData('homeX', homeX);
            img.setData('homeY', homeY);
            img.setInteractive(this.input.makePixelPerfect());
            img.on('pointerdown', () => this._onCellClick(cell.col, cell.row));
            this.cubeImages.push(img);
        });

        this._createColumnNums();
        CUBE_STACKS.forEach(({ col, row }) => {
            this.columnStates.set(this._columnKey(col, row), COLUMN_STATE.IDLE);
            this._applyColumnState(col, row);
        });
    }

    /** 每列顶部数字徽章（按列高度用 num_1 ~ num_4），与选中态同步显隐 */
    _createColumnNums() {
        this.numImages.forEach((img) => img.destroy());
        this.numImages = [];

        const { ox, oy } = this._cubeOrigin || { ox: 0, oy: 0 };
        CUBE_STACKS.forEach(({ col, row, height }) => {
            const topH = height - 1;
            const p = this._cellToScreen(col, row, topH);
            const tex = `num_${height}`;
            if (!this.textures.exists(tex)) return;

            const homeX = p.x + ox + NUM_OFFSET.x;
            const homeY = p.y + oy + NUM_OFFSET.y;
            const num = this.add.image(homeX, homeY, tex);
            num.setDepth(200 + row * 10 + col);
            num.setData('col', col);
            num.setData('row', row);
            num.setData('height', height);
            num.setData('homeX', homeX);
            num.setData('homeY', homeY);
            num.setVisible(false);
            this.numImages.push(num);
        });
    }

    _applyColumnState(col, row) {
        const state = this._getColumnState(col, row);
        const selected = state === COLUMN_STATE.SELECTED;
        const cellTex = selected ? 'cell_s' : 'cell';

        this.cubeImages.forEach((img) => {
            if (img.getData('col') === col && img.getData('row') === row) {
                img.setTexture(cellTex);
            }
        });

        this.numImages.forEach((num) => {
            if (num.getData('col') === col && num.getData('row') === row) {
                num.setVisible(selected);
            }
        });
    }

    /** 点击任意 cell：选中高亮与圆形数字一起出现/隐藏 */
    _onCellClick(col, row) {
        if (this.isBusy || this.hasFinished) return;

        const key = this._columnKey(col, row);
        const current = this._getColumnState(col, row);
        const next = this._nextColumnState(current);
        this.columnStates.set(key, next);

        if (this.cache.audio.exists('btnclick')) {
            this.sound.play('btnclick');
        }

        this._applyColumnState(col, row);
    }

    _resetCellSelection() {
        CUBE_STACKS.forEach(({ col, row }) => {
            this.columnStates.set(this._columnKey(col, row), COLUMN_STATE.IDLE);
            this._applyColumnState(col, row);
        });
    }

    /** 三竖列岔开 / 重合 */
    _tweenColumnSpread() {
        const targets = [...this.cubeImages, ...this.numImages];
        if (targets.length === 0) {
            this.isBusy = false;
            return;
        }

        this.isBusy = true;
        this.tweens.killTweensOf(targets);

        let pending = targets.length;
        const onOneComplete = () => {
            pending -= 1;
            if (pending <= 0) {
                this.isBusy = false;
            }
        };

        targets.forEach((img) => {
            const col = img.getData('col');
            const homeX = img.getData('homeX');
            const homeY = img.getData('homeY');
            const off = this._getSplitOffset(col);
            this.tweens.add({
                targets: img,
                x: homeX + off.x,
                y: homeY + off.y,
                duration: SPLIT_DURATION,
                ease: 'Sine.easeInOut',
                onComplete: onOneComplete,
            });
        });
    }

    _snapColumnsHome() {
        this.tweens.killTweensOf([...this.cubeImages, ...this.numImages]);
        this.isSplit = false;
        [...this.cubeImages, ...this.numImages].forEach((img) => {
            img.setPosition(img.getData('homeX'), img.getData('homeY'));
        });
        this.isBusy = false;
    }

    _createPlayButton() {
        this.playBtn = new ButtonComponent(this, {
            x: PLAY_BUTTON.x,
            y: PLAY_BUTTON.y,
            texture: 'play',
            clickEffectTexture: 'play_s',
            soundKey: 'btnclick',
            keepSizeOnClickEffect: true,
            onClick: () => this._onPlayClick(),
        });
        this.playBtn.getMainIcon().setDepth(120);
    }

    _createResetButton() {
        this.resetBtn = new ButtonComponent(this, {
            x: RESET_BUTTON.x,
            y: RESET_BUTTON.y,
            texture: 'reset',
            clickEffectTexture: 'reset_s',
            soundKey: 'btnclick',
            keepSizeOnClickEffect: true,
            onClick: () => this._onResetClick(),
        });
        this.resetBtn.getMainIcon().setDepth(120);
    }

    /** 播放：三竖列岔开；再点重合 */
    _onPlayClick() {
        if (this.isBusy || this.hasFinished) return;
        this.isSplit = !this.isSplit;
        this._tweenColumnSpread();
    }

    _onResetClick() {
        this.sound.stopAll();
        this.hasFinished = false;
        this._snapColumnsHome();
        this._resetCellSelection();
    }
}
