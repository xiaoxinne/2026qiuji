import CellShapeComponent from '../components/CellShapeComponent.js';
import ButtonComponent from '../components/ButtonComponent.js';

// area_cell / cell = 99×99，3×3；左上角 (1246, 376)；步长 97（gap=-2）
const MATCH_ZONE_POSITIONS = [
    [1295.5, 425.5], [1392.5, 425.5], [1489.5, 425.5],
    [1295.5, 522.5], [1392.5, 522.5], [1489.5, 522.5],
    [1295.5, 619.5], [1392.5, 619.5], [1489.5, 619.5],
];

const ITEM_BG_X = 555;
const ITEM_BG_Y = 544;

/** L 形展示用：X . / X X ；火人在上左 */
const SHAPE = {
    cells: [[0, 0], [0, 1], [1, 1]],
    firemanIndex: 0,
};

/** 单格：cell + 火人整体可拖拽 */
const PIECE_SHAPE = {
    cells: [[0, 0]],
    firemanIndex: 0,
};

const PIECE_X = 1266;
const PIECE_Y = 839;

/** 九宫格正确答案（1 起算）：1、2、4、5 → 下标 0、1、3、4 */
const CORRECT_ZONE_INDEXES = [0, 1, 3, 4];

export default class gameScene extends Phaser.Scene {
    constructor() {
        super('gameScene');
    }

    create() {
        this.isGameOver = false;
        this.errorCnt = 0;
        this.occupiedZones = new Set();
        this.placedPieces = [];
        this.homePiece = null;

        this._onVisibilityChange = () => {
            this.sound.stopAll();
        };
        document.addEventListener('visibilitychange', this._onVisibilityChange);

        this.add.image(960, 540, 'game_bg');
        this.add.image(101, 67, 'jiaobiao');
        this.add.image(960, 92, 'title1');
        this.add.image(1391, 521, 'option_bg');
        this.areaCells = MATCH_ZONE_POSITIONS.map(([x, y]) => this.add.image(x, y, 'area_cell'));
        this.itemBg = this.add.image(ITEM_BG_X, ITEM_BG_Y, 'item_bg');

        this.allMatchZones = MATCH_ZONE_POSITIONS.map(([x, y], index) => ({ x, y, index }));

        const sharedVisual = {
            cellWidth: 99,
            cellHeight: 99,
            dragCellWidth: 99,
            dragCellHeight: 99,
            matchThreshold: 50,
            dragAlpha: 1,
            showGhost: false,
        };

        // 左侧：L 形可拖拽到九宫格
        this.shape = CellShapeComponent.create(this, {
            ...sharedVisual,
            cells: SHAPE.cells,
            firemanIndex: SHAPE.firemanIndex,
            x: ITEM_BG_X,
            y: ITEM_BG_Y,
            homeX: ITEM_BG_X,
            homeY: ITEM_BG_Y,
            depth: 20,
            getMatchZones: () => this.allMatchZones,
            onMatch: () => this.sound.play('put'),
            onReturn: () => this.sound.play('put'),
        });

        this.submitBtn = new ButtonComponent(this, {
            x: 1533,
            y: 839,
            texture: 'submit',
            clickEffectTexture: 'submit_s',
            clickDisabledTexture: 'submit_d',
            soundKey: 'btnclick',
            onClick: () => this._onSubmit(),
        });
        this.submitBtn.getMainIcon().setDepth(120);

        this.resetBtn = new ButtonComponent(this, {
            x: 1778,
            y: 878,
            texture: 'reset',
            clickEffectTexture: 'reset_s',
            soundKey: 'btnclick',
            onClick: () => this._resetGame(),
        });
        this.resetBtn.getMainIcon().setDepth(120);

        this._spawnPiece();
        this._syncSubmitButtonState();
    }

    _getAvailableMatchZones() {
        return this.allMatchZones.filter((zone) => !this.occupiedZones.has(zone.index));
    }

    _spawnPiece() {
        if (this.isGameOver || this.homePiece) return;

        const piece = CellShapeComponent.create(this, {
            cellWidth: 99,
            cellHeight: 99,
            dragCellWidth: 99,
            dragCellHeight: 99,
            matchThreshold: 50,
            dragAlpha: 1,
            showGhost: false,
            cells: PIECE_SHAPE.cells,
            firemanIndex: PIECE_SHAPE.firemanIndex,
            x: PIECE_X,
            y: PIECE_Y,
            homeX: PIECE_X,
            homeY: PIECE_Y,
            depth: 30,
            getMatchZones: () => this._getAvailableMatchZones(),
            onDragStart: () => {
                if (piece._zoneIndex != null) {
                    this.occupiedZones.delete(piece._zoneIndex);
                    piece._zoneIndex = null;
                }
                this._syncSubmitButtonState();
            },
            onMatch: () => {
                this.sound.play('put');
                const zoneIndex = piece.getMatchedZoneIndex();
                if (zoneIndex != null) {
                    piece._zoneIndex = zoneIndex;
                    this.occupiedZones.add(zoneIndex);
                }

                if (this.homePiece === piece) {
                    this.homePiece = null;
                    this.placedPieces.push(piece);
                    this._spawnPiece();
                }

                this._syncSubmitButtonState();
            },
            onReturn: () => {
                this.sound.play('put');
                if (this.homePiece === piece) {
                    this._syncSubmitButtonState();
                    return;
                }

                this.placedPieces = this.placedPieces.filter((p) => p !== piece);
                if (this.homePiece) {
                    piece.destroy();
                } else {
                    this.homePiece = piece;
                }
                this._syncSubmitButtonState();
            },
        });

        piece._zoneIndex = null;
        this.homePiece = piece;
        this._syncSubmitButtonState();
    }

    _syncSubmitButtonState() {
        if (!this.submitBtn || this.isGameOver) return;
        this.submitBtn.setEnabled(this.occupiedZones.size > 0);
    }

    _onSubmit() {
        if (this.isGameOver || this.occupiedZones.size === 0) return;

        const isCorrect = this.occupiedZones.size === CORRECT_ZONE_INDEXES.length
            && CORRECT_ZONE_INDEXES.every((index) => this.occupiedZones.has(index));
        if (!isCorrect) {
            this.sound.play('error1');
            this.errorCnt += 1;
            this.placedPieces.forEach((piece) => piece.destroy());
            this.placedPieces = [];
            this.occupiedZones.clear();
            this._syncSubmitButtonState();
            return;
        }

        this.sound.play('correct');
        this.placedPieces.forEach((piece) => {
            piece.lock();
            const zoneIndex = piece._zoneIndex;
            if (zoneIndex == null || !CORRECT_ZONE_INDEXES.includes(zoneIndex)) return;
            const [fx, fy] = MATCH_ZONE_POSITIONS[zoneIndex];
            this._playSpineEffect(fx, fy);
        });

        if (this.homePiece) {
            this.homePiece.destroy();
            this.homePiece = null;
        }

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

    _resetGame() {
        this.placedPieces.forEach((piece) => piece.destroy());
        this.placedPieces = [];
        this.occupiedZones.clear();

        if (this.homePiece) {
            this.homePiece.destroy();
            this.homePiece = null;
        }

        this.shape?.reset();
        this.isGameOver = false;
        this.errorCnt = 0;
        this._spawnPiece();
        this._syncSubmitButtonState();
    }

    _onGameComplete() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.submitBtn?.setEnabled?.(false);
    }
}
