import CellShapeComponent from '../components/CellShapeComponent.js';
import ButtonComponent from '../components/ButtonComponent.js';
import OptionGroupComponent from '../components/OptionGroupComponent.js';

// area_cell / cell = 99×99，3×3；左上角 (1246, 326)；步长 97（gap=-2）
const MATCH_ZONE_POSITIONS = [
    [1295.5, 375.5], [1392.5, 375.5], [1489.5, 375.5],
    [1295.5, 472.5], [1392.5, 472.5], [1489.5, 472.5],
    [1295.5, 569.5], [1392.5, 569.5], [1489.5, 569.5],
];

const ITEM_BG_X = 555;
const ITEM_BG_Y = 544;

/** 2×2：X X / X X ；火人在右上 */
const SHAPE = {
    cells: [[0, 0], [1, 0], [0, 1], [1, 1]],
    firemanIndex: 1,
};

/** 单格：cell + 火人整体可拖拽 */
const PIECE_SHAPE = {
    cells: [[0, 0]],
    firemanIndex: 0,
};

const PIECE_X = 1391;
const PIECE_Y = 694;

/** 九宫格正确答案（1 起算）：2、3、5、6 → 下标 1、2、4、5 */
const CORRECT_ZONE_INDEXES = [1, 2, 4, 5];

const CORRECT_OPTION_ID = '4';

const ERROR_FLASH_TIMES = 3;
const ERROR_FLASH_INTERVAL = 150;

const OPTIONS = [
    { id: '1', x: 1150, y: 838, texture: 'option_1', selectedTexture: 'option_1_s', errorTexture: 'option_1_r', depth: 100 },
    { id: '2', x: 1308, y: 838, texture: 'option_2', selectedTexture: 'option_2_s', errorTexture: 'option_2_r', depth: 100 },
    { id: '3', x: 1467, y: 838, texture: 'option_3', selectedTexture: 'option_3_s', errorTexture: 'option_3_r', depth: 100 },
    { id: '4', x: 1626, y: 838, texture: 'option_4', selectedTexture: 'option_4_s', errorTexture: 'option_4_r', depth: 100 },
];

export default class gameScene extends Phaser.Scene {
    constructor() {
        super('gameScene');
    }

    create() {
        this.isGameOver = false;
        this.isOptionBusy = false;
        this.hasAnsweredCorrectly = false;
        this.errorCnt = 0;
        this.occupiedZones = new Set();
        this.placedPieces = [];
        this.piece = null;

        this._onVisibilityChange = () => {
            this.sound.stopAll();
        };
        document.addEventListener('visibilitychange', this._onVisibilityChange);

        this.add.image(960, 540, 'game_bg');
        this.add.image(101, 67, 'jiaobiao');
        this.add.image(960, 92, 'title1');
        this.add.image(1391, 471, 'option_bg');
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

        // 左侧：2×2 可拖拽到九宫格
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

        this.optionGroup = OptionGroupComponent.create(this, {
            mode: 'single',
            soundKey: 'btnclick',
            dimWhenDisabled: false,
            options: OPTIONS,
            onChange: (selectedIds) => this._onOptionSelect(selectedIds),
        });

        this.submitBtn = new ButtonComponent(this, {
            x: 1533,
            y: 839,
            texture: 'submit',
            clickEffectTexture: 'submit_s',
            clickDisabledTexture: 'submit_d',
            soundKey: 'btnclick',
            onClick: () => {},
        });
        this.submitBtn.getMainIcon().setDepth(120).setVisible(false);
        this.submitBtn.setEnabled(false);

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
    }

    _getAvailableMatchZones() {
        return this.allMatchZones.filter((zone) => !this.occupiedZones.has(zone.index));
    }

    _spawnPiece() {
        this.piece = CellShapeComponent.create(this, {
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
            onMatch: () => {
                this.sound.play('put');
                this._onPiecePlaced();
            },
            onReturn: () => this.sound.play('put'),
        });
    }

    /** 单格放下后立即判正误（无提交按钮） */
    _onPiecePlaced() {
        if (this.isGameOver || !this.piece?.isMatched()) return;

        const zoneIndex = this.piece.getMatchedZoneIndex();
        if (zoneIndex == null || this.occupiedZones.has(zoneIndex)) return;

        const isCorrect = CORRECT_ZONE_INDEXES.includes(zoneIndex);
        if (!isCorrect) {
            this.sound.play('error1');
            this.errorCnt += 1;
            this.piece.recall();
            return;
        }

        this.sound.play('correct');
        const [fx, fy] = MATCH_ZONE_POSITIONS[zoneIndex];
        this._playSpineEffect(fx, fy);

        this.occupiedZones.add(zoneIndex);
        this.piece.lock();
        this.placedPieces.push(this.piece);
        this.piece = null;

        if (CORRECT_ZONE_INDEXES.every((index) => this.occupiedZones.has(index))) {
            return;
        }

        this._spawnPiece();
    }

    _onOptionSelect(selectedIds) {
        if (this.isGameOver || this.hasAnsweredCorrectly || this.isOptionBusy) return;
        if (!selectedIds?.length) return;

        const selectedId = selectedIds[0];
        if (selectedId === CORRECT_OPTION_ID) {
            this.hasAnsweredCorrectly = true;
            this.isOptionBusy = true;
            this.optionGroup.setEnabled(false);
            this.sound.play('correct');

            const correctItem = this.optionGroup.items.find((item) => item.id === CORRECT_OPTION_ID);
            if (correctItem?.icon) {
                this._playSpineEffect(correctItem.icon.x, correctItem.icon.y);
            }
            return;
        }

        this.isOptionBusy = true;
        this.optionGroup.setEnabled(false);
        this.sound.play('error1');
        this.errorCnt += 1;
        this.optionGroup.flashError(selectedId, {
            times: ERROR_FLASH_TIMES,
            interval: ERROR_FLASH_INTERVAL,
            onComplete: () => {
                this.optionGroup.clearSelection();
                this.optionGroup.setEnabled(true);
                this.isOptionBusy = false;
            },
        });
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

        if (this.piece) {
            this.piece.destroy();
            this.piece = null;
        }

        this.shape?.reset();
        this.optionGroup?.clearSelection();
        this.optionGroup?.clearError();
        this.optionGroup?.setEnabled(true);
        this.isGameOver = false;
        this.isOptionBusy = false;
        this.hasAnsweredCorrectly = false;
        this.errorCnt = 0;
        this._spawnPiece();
    }
}
