import ButtonComponent from '../components/ButtonComponent.js';

/** 三关：每关播对应读题音 */
const LEVELS = [
    { soundKey: 'title1' },
    { soundKey: 'title2' },
    { soundKey: 'title3' },
];

const PLAY_BUTTON = { x: 1778, y: 763 };
const RESET_BUTTON = { x: 1778, y: 878 };
const QUETION_POS = { x: 960, y: 829 };

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

/**
 * 列状态：
 * 1 初始：不显示描边高亮、不显示数字
 * 2 顶面和描边高亮（cell_s），不显示数字
 * 3 显示数字 + 状态1外观（常态 cell）
 * 首次点击 1→2，之后 2↔3 循环
 */
const COLUMN_STATE = {
    IDLE: 1,
    HIGHLIGHT: 2,
    NUMBER: 3,
};

/**
 * cell1.png 的立体图形：8 列共 18 个 cell
 * row 0 为最前排，col 0 为最左列
 */
const CUBE_STACKS = [
    { col: 0, row: 0, height: 1 },
    { col: 0, row: 1, height: 2 },
    { col: 0, row: 2, height: 3 },
    { col: 0, row: 3, height: 4 },
    { col: 1, row: 2, height: 2 },
    { col: 1, row: 3, height: 3 },
    { col: 2, row: 3, height: 2 },
    { col: 3, row: 3, height: 1 },
];

export default class gameScene extends Phaser.Scene {
    constructor() {
        super('gameScene');
        ReportHelper.gameReportParams.difficulty = 1;
        ReportHelper.gameReportParams.question_id = '2026_course_autumn_firg_CSSP_15_t_06';
        ReportHelper.gameReportParams.questionCount = LEVELS.length;
        ReportHelper.resetWrongTimes();
        ReportHelper.report('game_start', {
            difficulty: 1,
        });
    }

    create() {
        this._onVisibilityChange = () => {
            this.sound.stopAll();
        };
        document.addEventListener('visibilitychange', this._onVisibilityChange);

        this.isBusy = false;
        this.hasFinished = false;
        this.errorCnt = 0;
        this.levelIndex = 0;
        this.cubeImages = [];
        this.numImages = [];
        /** @type {Map<string, number>} 列状态 1/2/3，key = `${col},${row}` */
        this.columnStates = new Map();

        this.add.image(960, 540, 'game_bg');
        this.add.image(101, 67, 'jiaobiao');
        this.add.image(960, 92, 'title1');

        this._createCubeStack();

        this.quetionImage = this.add.image(QUETION_POS.x, QUETION_POS.y, 'quetion').setVisible(false);

        this._createPlayButton();
        this._createResetButton();

        this.playLevelTitle();
    }

    _columnKey(col, row) {
        return `${col},${row}`;
    }

    _getColumnState(col, row) {
        return this.columnStates.get(this._columnKey(col, row)) || COLUMN_STATE.IDLE;
    }

    /** 下一状态：1→2，之后 2↔3 */
    _nextColumnState(current) {
        if (current === COLUMN_STATE.IDLE) return COLUMN_STATE.HIGHLIGHT;
        if (current === COLUMN_STATE.HIGHLIGHT) return COLUMN_STATE.NUMBER;
        return COLUMN_STATE.HIGHLIGHT;
    }

    get currentLevel() {
        return LEVELS[this.levelIndex];
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
        this.cubeImages.forEach((img) => img.destroy());
        this.cubeImages = [];
        this.numImages.forEach((img) => img.destroy());
        this.numImages = [];
        this.columnStates.clear();

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
            const img = this.add.image(cell.x + ox, cell.y + oy, 'cell');
            img.setDepth(10 + index);
            img.setData('col', cell.col);
            img.setData('row', cell.row);
            img.setData('h', cell.h);
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

    /** 每列顶部数字徽章（按列高度用 num_1 ~ num_4），默认隐藏 */
    _createColumnNums() {
        this.numImages.forEach((img) => img.destroy());
        this.numImages = [];

        const { ox, oy } = this._cubeOrigin || { ox: 0, oy: 0 };
        CUBE_STACKS.forEach(({ col, row, height }) => {
            const topH = height - 1;
            const p = this._cellToScreen(col, row, topH);
            const tex = `num_${height}`;
            if (!this.textures.exists(tex)) return;

            const num = this.add.image(
                p.x + ox + NUM_OFFSET.x,
                p.y + oy + NUM_OFFSET.y,
                tex,
            );
            num.setDepth(200 + row * 10 + col);
            num.setData('col', col);
            num.setData('row', row);
            num.setData('height', height);
            num.setVisible(false);
            this.numImages.push(num);
        });
    }

    _applyColumnState(col, row) {
        const state = this._getColumnState(col, row);
        const cellTex = state === COLUMN_STATE.HIGHLIGHT ? 'cell_s' : 'cell';
        const showNum = state === COLUMN_STATE.NUMBER;

        this.cubeImages.forEach((img) => {
            if (img.getData('col') === col && img.getData('row') === row) {
                img.setTexture(cellTex);
            }
        });

        this.numImages.forEach((num) => {
            if (num.getData('col') === col && num.getData('row') === row) {
                num.setVisible(showNum);
            }
        });
    }

    /** 点击任意 cell：推进该列状态 1→2，之后 2↔3 */
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

    _onPlayClick() {
        this.quetionImage?.setVisible(true);
        this.playLevelTitle();
    }

    _onResetClick() {
        this.sound.stopAll();
        this.levelIndex = 0;
        this.isBusy = false;
        this.hasFinished = false;
        this.errorCnt = 0;
        this.quetionImage?.setVisible(false);
        this._resetCellSelection();
        this.playLevelTitle();
    }

    goToNextLevel() {
        this.levelIndex += 1;
        this.isBusy = false;
        this.playLevelTitle();
    }

    playLevelTitle() {
        const { soundKey } = this.currentLevel;
        if (!soundKey || !this.cache.audio.exists(soundKey)) return;
        this.sound.stopAll();
        this.sound.play(soundKey);
    }

    playSpineEffect(x, y, onComplete, dataKey = 'effect_jinengzidan_data', atlasKey = 'effect_jinengzidan_atlas', depth = 1000) {
        const effectSpine = this.add.spine(x, y, dataKey, atlasKey);
        effectSpine.setDepth(depth);
        const data = effectSpine.skeleton?.data || effectSpine.animationState?.data?.skeletonData;
        const anims = data?.animations;
        const animName = anims && anims.length > 0 ? anims[0].name : 'animation';
        effectSpine.animationState.setAnimation(0, animName, false);
        effectSpine.animationState.addListener({
            complete: () => {
                effectSpine.destroy();
                if (onComplete) onComplete();
            },
        });
    }
}
