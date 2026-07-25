import CellShapeComponent from '../components/CellShapeComponent.js';
import ButtonComponent from '../components/ButtonComponent.js';
import GameEndComponent from '../components/GameEndComponent.js';
import TrumpetButtonComponent from '../components/TrumpetButtonComponent.js';

// area_cell = 97×97，3×3；左上角 (815, 615)；步长 95（gap=-2）
// cell = 74×74（item_bg 上图形）
const MATCH_ZONE_POSITIONS = [
    [863.5, 663.5], [958.5, 663.5], [1053.5, 663.5],
    [863.5, 758.5], [958.5, 758.5], [1053.5, 758.5],
    [863.5, 853.5], [958.5, 853.5], [1053.5, 853.5],
];

const ITEM_BG_POSITIONS = [
    [578, 331],
    [960, 331],
    [1341, 331],
];

/** 1: 倒 T；底行三格火人 → fireman1 */
const SHAPE_1 = {
    cells: [[1, 0], [1, 1], [0, 2], [1, 2], [2, 2]],
    firemanIndexes: [2, 3, 4],
    firemanTexture: 'fireman1',
};

/** 2: L；底左、底右火人 → fireman2 */
const SHAPE_2 = {
    cells: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]],
    firemanIndexes: [2, 4],
    firemanTexture: 'fireman2',
};

/** 3: 对角；右下火人 → fireman3 */
const SHAPE_3 = {
    cells: [[0, 0], [1, 1], [2, 2]],
    firemanIndexes: [2],
    firemanTexture: 'fireman3',
};

const SHAPE_CONFIGS = [SHAPE_1, SHAPE_2, SHAPE_3];

/** 底部三个单格拖拽：全程 cell_big + fireman */
const PIECE_CONFIGS = [
    { firemanTexture: 'fireman1', x: 600, y: 664 },
    { firemanTexture: 'fireman2', x: 600, y: 758 },
    { firemanTexture: 'fireman3', x: 600, y: 852 },
];

/**
 * 正确答案（九宫格 1–9）：fireman1→8，fireman2→7，fireman3→9
 * 对应下标：7、6、8
 */
const CORRECT_ZONE_BY_PIECE = [7, 6, 8];

export default class gameScene extends Phaser.Scene {
    constructor() {
        super('gameScene');
    }

    create() {
        this.isGameOver = false;
        this.errorCnt = 0;
        /** @type {Record<number, number>} zoneIndex → pieceIndex */
        this.zoneOccupied = {};
        /** @type {Record<number, number|null>} pieceIndex → 拖起前所在九宫格下标 */
        this.pieceDragFromZone = {};

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
        this.add.image(957, 757, 'option_bg');
        this.areaCells = MATCH_ZONE_POSITIONS.map(([x, y]) => this.add.image(x, y, 'area_cell'));
        this.itemBgs = ITEM_BG_POSITIONS.map(([x, y]) => this.add.image(x, y, 'item_bg'));

        this.trumpet = TrumpetButtonComponent.create(this, {
            x: 155,
            y: 910,
            soundKey: 'title1',
            autoPlay: true,
        });

        const matchZones = MATCH_ZONE_POSITIONS.map(([x, y]) => ({ x, y }));

        // 原位 cell 74；可拖入九宫格，层级低于 PIECE_CONFIGS
        const sharedVisual = {
            texture: 'cell',
            emptyTexture: 'cell',
            dragTexture: 'cell_big',
            matchedTexture: 'cell_border_big',
            cellWidth: 74,
            cellHeight: 74,
            dragCellWidth: 97,
            dragCellHeight: 97,
            dragAlpha: 1,
            showGhostOnMatch: true,
            draggable: true,
        };

        this.shapes = SHAPE_CONFIGS.map((config, index) => {
            const [x, y] = ITEM_BG_POSITIONS[index];
            return CellShapeComponent.create(this, {
                ...sharedVisual,
                cells: config.cells,
                firemanIndexes: config.firemanIndexes,
                firemanTexture: config.firemanTexture,
                firemanDragTexture: config.firemanTexture,
                x,
                y,
                homeX: x,
                homeY: y,
                depth: 20,
                matchZones,
                onMatch: () => this.sound.play('put'),
                onReturn: () => this.sound.play('put'),
                onRecall: () => this.sound.play('put'),
            });
        });

        // 底部：三个独立单格；九宫格内互拖则互换，从出生点拖到已占格则替换
        this.pieces = PIECE_CONFIGS.map((config, pieceIndex) => CellShapeComponent.create(this, {
            texture: 'cell_big',
            emptyTexture: 'cell_big',
            dragTexture: 'cell_big',
            matchedTexture: 'cell_big',
            cellWidth: 97,
            cellHeight: 97,
            dragCellWidth: 97,
            dragCellHeight: 97,
            firemanTexture: config.firemanTexture,
            firemanDragTexture: config.firemanTexture,
            cells: [[0, 0]],
            firemanIndex: 0,
            x: config.x,
            y: config.y,
            homeX: config.x,
            homeY: config.y,
            depth: 40,
            matchZones,
            matchThreshold: 50,
            dragAlpha: 1,
            showGhostOnMatch: false,
            onDragStart: () => this._onPieceDragStart(pieceIndex),
            onMatch: (_container, snap) => this._onPieceMatch(pieceIndex, snap),
            onReturn: () => this._onPieceLeave(pieceIndex, true),
            onRecall: () => this._onPieceLeave(pieceIndex, false),
        }));

        this.submitBtn = new ButtonComponent(this, {
            x: 1336,
            y: 761,
            texture: 'submit',
            clickEffectTexture: 'submit_s',
            clickDisabledTexture: 'submit_d',
            soundKey: 'btnclick',
            onClick: () => this._onSubmit(),
        });
        this.submitBtn.getMainIcon().setDepth(120);
        this._syncSubmitButtonState();
    }

    _clearPieceOccupation(pieceIndex) {
        Object.keys(this.zoneOccupied).forEach((key) => {
            if (this.zoneOccupied[key] === pieceIndex) {
                delete this.zoneOccupied[key];
            }
        });
    }

    _onPieceDragStart(pieceIndex) {
        let fromZone = null;
        Object.keys(this.zoneOccupied).forEach((key) => {
            if (this.zoneOccupied[key] === pieceIndex) {
                fromZone = Number(key);
            }
        });
        this.pieceDragFromZone[pieceIndex] = fromZone;
        this._clearPieceOccupation(pieceIndex);
        this._syncSubmitButtonState();
    }

    _onPieceLeave(pieceIndex, playSound) {
        this._clearPieceOccupation(pieceIndex);
        this.pieceDragFromZone[pieceIndex] = null;
        if (playSound) this.sound.play('put');
        this._syncSubmitButtonState();
    }

    _onPieceMatch(pieceIndex, snap) {
        const zoneIndex = snap?.zoneIndex;
        if (zoneIndex == null) return;

        this.sound.play('put');
        const fromZone = this.pieceDragFromZone[pieceIndex];
        this._clearPieceOccupation(pieceIndex);

        const occupant = this.zoneOccupied[zoneIndex];
        this.zoneOccupied[zoneIndex] = pieceIndex;

        if (occupant != null && occupant !== pieceIndex) {
            // 拖起方与目标方都在九宫格中 → 互换；从出生点拖入则替换退回
            if (fromZone != null) {
                this.zoneOccupied[fromZone] = occupant;
                const [zx, zy] = MATCH_ZONE_POSITIONS[fromZone];
                this.pieces[occupant]?.snapToZone?.(fromZone, zx, zy);
            } else {
                this.pieces[occupant]?.recall?.();
            }
        }

        this.pieceDragFromZone[pieceIndex] = zoneIndex;
        this._syncSubmitButtonState();
    }

    _areAllPiecesPlaced() {
        return this.pieces.every((piece) => piece.isMatched());
    }

    _areAllPiecesCorrect() {
        return this.pieces.every((piece, index) => {
            if (!piece.isMatched()) return false;
            return piece.getMatchedZoneIndex() === CORRECT_ZONE_BY_PIECE[index];
        });
    }

    _syncSubmitButtonState() {
        if (!this.submitBtn || this.isGameOver) return;
        this.submitBtn.setEnabled(this._areAllPiecesPlaced());
    }

    _onSubmit() {
        if (this.isGameOver) return;
        if (!this._areAllPiecesPlaced()) return;

        if (!this._areAllPiecesCorrect()) {
            this.sound.play('error1');
            this.errorCnt += 1;
            ReportHelper.recordWrongTime(0);
            return;
        }

        this.sound.play('correct');
        CORRECT_ZONE_BY_PIECE.forEach((zoneIndex) => {
            const [fx, fy] = MATCH_ZONE_POSITIONS[zoneIndex];
            this._playSpineEffect(fx, fy);
        });
        this._onGameComplete();
    }

    _playSpineEffect(x, y, onComplete, dataKey = 'effect_jinengzidan_data', atlasKey = 'effect_jinengzidan_atlas', depth = 1000) {
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
