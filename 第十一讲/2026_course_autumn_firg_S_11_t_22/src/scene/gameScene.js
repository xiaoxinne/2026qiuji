import DragDropComponent from '../components/DragDropComponent.js';
import CellShapeComponent from '../components/CellShapeComponent.js';
import ButtonComponent from '../components/ButtonComponent.js';

const MATCH_ZONE_POSITIONS = [
    [1321, 426.35], [1403, 426.35], [1486, 426.35],
    [1321, 508.86], [1403, 508.86], [1486, 508.86],
    [1321, 591.37], [1403, 591.37], [1486, 591.37],
];

const ITEM_BG_POSITIONS = [
    [359, 284], [642, 284], [925, 284],
    [359, 548], [642, 548], [925, 548],
    [359, 811], [642, 811], [925, 811],
];

/** 1: 倒 L，右侧三格 + 左下；fireman 最上 */
const SHAPE_1 = {
    cells: [[1, 0], [1, 1], [0, 2], [1, 2]],
    firemanIndex: 0,
};

/** 2: 2x2 缺左下 */
const SHAPE_2 = {
    cells: [[0, 0], [1, 0], [1, 1]],
    firemanIndex: 0,
};

/** 3: 右上 + 左中两格 + 右下 */
const SHAPE_3 = {
    cells: [[2, 0], [0, 1], [1, 1], [2, 2]],
    firemanIndex: 3,
};

/** 4: 上左右 + 下三格 */
const SHAPE_4 = {
    cells: [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
    firemanIndex:2,
};

/** 5: 对角线 */
const SHAPE_5 = {
    cells: [[0, 0], [1, 1], [2, 2]],
    firemanIndex: 1,
};

/** 6: 左上 + 中三格 + 右下 */
const SHAPE_6 = {
    cells: [[0, 0], [0, 1], [1, 1], [2, 1], [2, 2]],
    firemanIndex: 0,
};

/** 7: 左上 + 右中 + 右下 */
const SHAPE_7 = {
    cells: [[0, 0], [1, 1], [1, 2]],
    firemanIndex: 2,
};

/** 8: 上中 + 左右中 + 左下 */
const SHAPE_8 = {
    cells: [[1, 0], [0, 1], [2, 1], [0, 2]],
    firemanIndex: 2,
};

/** 9: 左竖三格 + 右上 */
const SHAPE_9 = {
    cells: [[0, 0], [1, 0], [0, 1], [0, 2]],
    firemanIndex: 0,
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
        this.add.image(101, 67, 'jiaobiao');
        this.add.image(960, 92, 'title1');
        this.add.image(1403.84, 508.86, 'option_bg');
        this.areaCells = MATCH_ZONE_POSITIONS.map(([x, y]) => this.add.image(x, y, 'area_cell'));
        this.itemBgs = ITEM_BG_POSITIONS.map(([x, y]) => this.add.image(x, y, 'item_bg'));

        const itemPositions = [
            [235, 180], [518, 180], [801, 180],
            [235, 444], [518, 444], [801, 444],
            [235, 708], [518, 708], [801, 708],
        ];

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
            width: 85,
            height: 85,
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
                firemanIndex: config.firemanIndex,
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
