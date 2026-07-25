import CellShapeComponent from '../components/CellShapeComponent.js';
import ButtonComponent from '../components/ButtonComponent.js';
import GameEndComponent from '../components/GameEndComponent.js';
import TrumpetButtonComponent from '../components/TrumpetButtonComponent.js';

// area_cell / cell = 121×121；步长 117（gap=-4），邻边完全重叠成单线
// option_bg 左上角 (1170, 327)，367×367 → 中心 (1353.5, 510.5)
const MATCH_ZONE_POSITIONS = [
    [1236.5, 393.5], [1353.5, 393.5], [1470.5, 393.5],
    [1236.5, 510.5], [1353.5, 510.5], [1470.5, 510.5],
    [1236.5, 627.5], [1353.5, 627.5], [1470.5, 627.5],
];

/** 十字形：上中、中左、中中、中右、下中；火人在顶格 */
const CROSS_SHAPE = {
    cells: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]],
    firemanIndex: 0,
};

/** 单格：cell + 火人整体可拖拽 */
const PIECE_SHAPE = {
    cells: [[0, 0]],
    firemanIndex: 0,
};

const SHAPE_X = 521;
const SHAPE_Y = 585;

const PIECE_X = 1236;
const PIECE_Y = 839;

export default class gameScene extends Phaser.Scene {
    constructor() {
        super('gameScene');
    }

    create() {
        this.isGameOver = false;
        this.errorCnt = 0;

        this._onVisibilityChange = () => {
            this.sound.stopAll();
            this.trumpet?.showIdle?.();
        };
        document.addEventListener('visibilitychange', this._onVisibilityChange);

        ReportHelper.gameReportParams.difficulty = 1;
        ReportHelper.report('game_start', {});

        this.add.image(960, 540, 'game_bg');
        this.add.image(101, 67, 'jiaobiao');
        this.add.image(960, 92, 'title1');
        this.add.image(1353.5, 510.5, 'option_bg');
        this.areaCells = MATCH_ZONE_POSITIONS.map(([x, y]) => this.add.image(x, y, 'area_cell'));

        this.trumpet = TrumpetButtonComponent.create(this, {
            x: 155,
            y: 910,
            soundKey: 'title1',
            autoPlay: true,
        });

        const matchZones = MATCH_ZONE_POSITIONS.map(([x, y]) => ({ x, y }));
        // 提交判定：单格正确位置为第 2 格（顶行中）
        const CORRECT_ZONE = { x: MATCH_ZONE_POSITIONS[1][0], y: MATCH_ZONE_POSITIONS[1][1] };

        const sharedVisual = {
            texture: 'cell',
            emptyTexture: 'cell',
            dragTexture: 'cell',
            matchedTexture: 'cell',
            firemanTexture: 'fireman',
            firemanDragTexture: 'fireman',
            cellWidth: 121,
            cellHeight: 121,
            dragCellWidth: 121,
            dragCellHeight: 121,
        };

        // 左侧：cell 组成的十字形（展示用，不参与提交判定）
        this.shape = CellShapeComponent.create(this, {
            ...sharedVisual,
            cells: CROSS_SHAPE.cells,
            firemanIndex: CROSS_SHAPE.firemanIndex,
            x: SHAPE_X,
            y: SHAPE_Y,
            homeX: SHAPE_X,
            homeY: SHAPE_Y,
            depth: 20,
            matchZones,
            onMatch: () => this.sound.play('put'),
            onReturn: () => this.sound.play('put'),
        });

        // 底部栏：单格可拖拽，任意格可放置
        this.piece = CellShapeComponent.create(this, {
            ...sharedVisual,
            cells: PIECE_SHAPE.cells,
            firemanIndex: PIECE_SHAPE.firemanIndex,
            x: PIECE_X,
            y: PIECE_Y,
            homeX: PIECE_X,
            homeY: PIECE_Y,
            depth: 30,
            matchZones,
            onMatch: () => {
                this.sound.play('put');
                this._syncSubmitButtonState();
            },
            onReturn: () => {
                this.sound.play('put');
                this._syncSubmitButtonState();
            },
        });
        this.correctZone = CORRECT_ZONE;

        this.submitBtn = new ButtonComponent(this, {
            x: 1471,
            y: 838,
            texture: 'submit',
            clickEffectTexture: 'submit_s',
            clickDisabledTexture: 'submit_d',
            soundKey: 'btnclick',
            onClick: () => this._onSubmit(),
        });
        this.submitBtn.getMainIcon().setDepth(120);
        this._syncSubmitButtonState();
    }

    _isPieceOnCorrectZone() {
        if (!this.piece?.isMatched()) return false;
        const { x, y } = this.piece.container;
        return Math.hypot(x - this.correctZone.x, y - this.correctZone.y) < 1;
    }

    _syncSubmitButtonState() {
        if (!this.submitBtn || this.isGameOver) return;
        this.submitBtn.setEnabled(this.piece.isMatched());
    }

    _onSubmit() {
        if (this.isGameOver) return;
        if (!this.piece.isMatched()) return;

        if (!this._isPieceOnCorrectZone()) {
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
