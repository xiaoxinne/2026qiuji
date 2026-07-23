import DragDropComponent from '../components/DragDropComponent.js';
import CellShapeComponent from '../components/CellShapeComponent.js';
import ButtonComponent from '../components/ButtonComponent.js';

// area_cell 93×93，左上角 (1215, 496) → 中心 (1261.5, 542.5)；步长 91（与格子 gap=-2 对齐）
const MATCH_ZONE_POSITIONS = [
    [1261.5, 542.5], [1352.5, 542.5], [1443.5, 542.5],
    [1261.5, 633.5], [1352.5, 633.5], [1443.5, 633.5],
    [1261.5, 724.5], [1352.5, 724.5], [1443.5, 724.5],
];

const ITEM_BG_POSITIONS = [
    [358, 333], [602, 333], [846, 333],
    [358, 560], [602, 560], [846, 560],
    [358, 787], [602, 787], [846, 787],
];

/** 1: . D F / F . . / D . . */
const SHAPE_1 = {
    cells: [[1, 0], [2, 0], [0, 1], [0, 2]],
    firemanIndexes: [1, 2],
};

/** 2: F . / D . / . D */
const SHAPE_2 = {
    cells: [[0, 0], [0, 1], [1, 2]],
    firemanIndexes: [0],
};

/** 3: . . F / F D D / . . F */
const SHAPE_3 = {
    cells: [[2, 0], [0, 1], [1, 1], [2, 1], [2, 2]],
    firemanIndexes: [0, 1, 4],
};

/** 4: F . F / F D F */
const SHAPE_4 = {
    cells: [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
    firemanIndexes: [0, 1, 2, 4],
};

/** 5: D . . / . D F */
const SHAPE_5 = {
    cells: [[0, 0], [1, 1], [2, 1]],
    firemanIndexes: [2],
};

/** 6: . D / D . / F . */
const SHAPE_6 = {
    cells: [[1, 0], [0, 1], [0, 2]],
    firemanIndexes: [2],
};

/** 7: F . F / . D . / . D . */
const SHAPE_7 = {
    cells: [[0, 0], [2, 0], [1, 1], [1, 2]],
    firemanIndexes: [0, 1],
};

/** 8: . . D / F . D / . D . */
const SHAPE_8 = {
    cells: [[2, 0], [0, 1], [2, 1], [1, 2]],
    firemanIndexes: [1],
};

/** 9: D F D / . D . */
const SHAPE_9 = {
    cells: [[0, 0], [1, 0], [2, 0], [1, 1]],
    firemanIndexes: [1],
};

const SHAPE_CONFIGS = [
    SHAPE_1, SHAPE_2, SHAPE_3,
    SHAPE_4, SHAPE_5, SHAPE_6,
    SHAPE_7, SHAPE_8, SHAPE_9,
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

        this.add.image(960, 540, 'game_bg');
        this.add.image(1352.5, 633.5, 'option_bg');
        this.areaCells = MATCH_ZONE_POSITIONS.map(([x, y]) => this.add.image(x, y, 'area_cell'));
        this.itemBgs = ITEM_BG_POSITIONS.map(([x, y]) => this.add.image(x, y, 'item_bg'));

        // 序号圆心对齐 item_bg 左上角（215×216）
        const itemPositions = ITEM_BG_POSITIONS.map(([x, y]) => [x - 105, y - 90]);

        const items = itemPositions.map(([x, y], index) => ({
            key: `drag_${index + 1}`,
            texture: `drag_${index + 1}`,
            x,
            y,
        }));

        const dropZones = MATCH_ZONE_POSITIONS.map(([x, y], index) => ({
            key: `match_${index + 1}`,
            x,
            y,
            width: 93,
            height: 93,
        }));

        this.dragDrop = new DragDropComponent(this, {
            items,
            dropZones,
            depth: 100,
            showGhostOnDrop: true,
            ghostAlpha: 0.4,
            onDrop: () => this.sound.play('put'),
            onSwap: () => this.sound.play('put'),
            onReturn: () => this.sound.play('put'),
        });

        const matchZones = MATCH_ZONE_POSITIONS.map(([x, y]) => ({ x, y }));

        this.shapes = SHAPE_CONFIGS.map((config, index) => {
            const [x, y] = ITEM_BG_POSITIONS[index];
            // 序号最高；cornerLShape（2号）中间层；其余图形底层
            const depth = index === 1 ? 40 : 20;
            return CellShapeComponent.create(this, {
                cells: config.cells,
                firemanIndexes: config.firemanIndexes,
                x,
                y,
                homeX: x,
                homeY: y,
                depth,
                matchZones,
                onMatch: () => this.sound.play('put'),
                onReturn: () => this.sound.play('put'),
            });
        });

        this.lShape = this.shapes[0];
        this.cornerLShape = this.shapes[1];
        this.sampleShape = this.shapes[2];

        this.resetBtn = new ButtonComponent(this, {
            x: 1778,
            y: 878,
            texture: 'reset',
            clickEffectTexture: 'reset_s',
            soundKey: 'btnclick',
            onClick: () => this._resetGame(),
        });
        this.resetBtn.getMainIcon().setDepth(120);
    }

    _resetGame() {
        this.shapes.forEach((shape) => shape.reset());
        this.dragDrop.resetAll(true);
    }
}
