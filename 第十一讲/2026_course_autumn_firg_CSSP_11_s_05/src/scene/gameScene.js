import CellShapeComponent from '../components/CellShapeComponent.js';
import ButtonComponent from '../components/ButtonComponent.js';
import GameEndComponent from '../components/GameEndComponent.js';
import TrumpetButtonComponent from '../components/TrumpetButtonComponent.js';

const MATCH_ZONE_POSITIONS = [
    [1310.84, 462.36], [1403.84, 462.36], [1496.84, 462.36],
    [1310.84, 555.36], [1403.84, 555.36], [1496.84, 555.36],
];

const ITEM_BG_POSITIONS = [
    [435, 281], [810, 281],
    [435, 546], [810, 546],
    [435, 810], [810, 810],
];

/** 完整 2×3 六格 */
const FULL_2X3_CELLS = [
    [0, 0], [1, 0], [2, 0],
    [0, 1], [1, 1], [2, 1],
];

/** fireman 贴图：按图形序号 1~6 */
const FIREMAN_TEXTURES = [
    'fireman',   // 1
    'fireman2',  // 2
    'fireman1',  // 3
    'fireman1',  // 4
    'fireman',   // 5
    'fireman2',  // 6
];

/** fireman 格子位置：1 在第 2 格，2 在第 1 格，其余按序号 */
const FIREMAN_INDEXES = [1, 0, 2, 4, 3, 5];

const SHAPE_CONFIGS = FIREMAN_INDEXES.map((firemanIndex, shapeIndex) => ({
    cells: FULL_2X3_CELLS,
    firemanIndex,
    firemanTexture: FIREMAN_TEXTURES[shapeIndex],
}));

export default class gameScene extends Phaser.Scene {
    constructor() {
        super('gameScene');
    }

    create() {
        this.isGameOver = false;
        this.errorCnt = 0;
        this.gameStartTime = this.time.now;

        this._onVisibilityChange = () => {
            this.sound.stopAll();
            this.trumpet?.showIdle?.();
        };
        document.addEventListener('visibilitychange', this._onVisibilityChange);

        ReportHelper.gameReportParams.difficulty = 0;
        ReportHelper.report('game_start', {});

        this.add.image(960, 540, 'game_bg');
        this.add.image(101, 67, 'jiaobiao');
        this.add.image(960, 92, 'title1');
        this.add.image(1403.84, 508.86, 'option_bg');
        this.areaCells = MATCH_ZONE_POSITIONS.map(([x, y]) => this.add.image(x, y, 'area_cell'));
        this.itemBgs = ITEM_BG_POSITIONS.map(([x, y]) => this.add.image(x, y, 'item_bg'));

        this.trumpet = TrumpetButtonComponent.create(this, {
            x: 155,
            y: 910,
            soundKey: 'title1',
            autoPlay: true,
        });

        const matchZones = MATCH_ZONE_POSITIONS.map(([x, y]) => ({ x, y }));

        this.shapes = SHAPE_CONFIGS.map((config, index) => {
            const [x, y] = ITEM_BG_POSITIONS[index];
            const depth = index === 1 ? 40 : 20;
            return CellShapeComponent.create(this, {
                cells: config.cells,
                firemanIndex: config.firemanIndex,
                firemanTexture: config.firemanTexture,
                firemanDragTexture: config.firemanTexture,
                x,
                y,
                homeX: x,
                homeY: y,
                cellWidth: 93,
                cellHeight: 93,
                dragCellWidth: 93,
                dragCellHeight: 93,
                depth,
                matchZones,
                onDragStart: () => this._syncSubmitButtonState(),
                onMatch: () => {
                    this.sound.play('put');
                    this._syncSubmitButtonState();
                },
                onReturn: () => {
                    this.sound.play('put');
                    this._syncSubmitButtonState();
                },
            });
        });

        this.submitBtn = new ButtonComponent(this, {
            x: 1702,
            y: 822,
            texture: 'submit',
            clickEffectTexture: 'submit_s',
            clickDisabledTexture: 'submit_d',
            soundKey: 'btnclick',
            onClick: () => this._onSubmit(),
        });
        this.submitBtn.getMainIcon().setDepth(120);
        this._syncSubmitButtonState();
    }

    _syncSubmitButtonState() {
        if (!this.submitBtn || this.isGameOver) return;
        const canSubmit = this.shapes.some((shape) => shape.isMatched());
        this.submitBtn.setEnabled(canSubmit);
    }

    _onSubmit() {
        if (this.isGameOver) return;
        if (!this.shapes.some((shape) => shape.isMatched())) return;

        const allPlaced = this.shapes.every((shape) => shape.isMatched());
        if (!allPlaced) {
            this.sound.play('error1');
            this.errorCnt += 1;
            ReportHelper.recordWrongTime(0);
            return;
        }

        this.sound.play('correct');
        this._onGameComplete();
    }

    _getStarCountByError() {
        if (this.errorCnt <= 2) return 3;
        if (this.errorCnt <= 4) return 2;
        return 1;
    }

    _onGameComplete() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.submitBtn?.setEnabled?.(false);
        this.trumpet?.stop?.();
        GameEndComponent.show(this, {
            starCount: this._getStarCountByError(),
            delay: 800,
        });
    }
}
