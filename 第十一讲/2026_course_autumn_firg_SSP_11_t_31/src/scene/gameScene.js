import DragDropComponent from '../components/DragDropComponent.js';
import CellShapeComponent from '../components/CellShapeComponent.js';
import ButtonComponent from '../components/ButtonComponent.js';

// area_cell 106×106，2×3；左上角 (1249, 405) → 中心 (1302, 458)；步长 103
const MATCH_ZONE_POSITIONS = [
    [1302, 458], [1405, 458], [1508, 458],
    [1302, 561], [1405, 561], [1508, 561],
];

const ITEM_BG_POSITIONS = [
    [316, 388], [622, 388], [927, 388],
    [316, 672], [622, 672], [927, 672],
];

/** 1: . X X / X . . */
const SHAPE_1 = {
    cells: [[1, 0], [2, 0], [0, 1]],
    firemanIndexes: [0, 1, 2],
};

/** 2: X X . / X X X */
const SHAPE_2 = {
    cells: [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1]],
    firemanIndexes: [0, 1, 2, 3, 4],
};

/** 3: . . X / X X . */
const SHAPE_3 = {
    cells: [[2, 0], [0, 1], [1, 1]],
    firemanIndexes: [0, 1, 2],
};

/** 4: . X . / X . X */
const SHAPE_4 = {
    cells: [[1, 0], [0, 1], [2, 1]],
    firemanIndexes: [0, 1, 2],
};

/** 5: X X / . X */
const SHAPE_5 = {
    cells: [[0, 0], [1, 0], [1, 1]],
    firemanIndexes: [0, 1, 2],
};

/** 6: X X . / X . X */
const SHAPE_6 = {
    cells: [[0, 0], [1, 0], [0, 1], [2, 1]],
    firemanIndexes: [0, 1, 2, 3],
};

const SHAPE_CONFIGS = [
    SHAPE_1, SHAPE_2, SHAPE_3,
    SHAPE_4, SHAPE_5, SHAPE_6,
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
        this.add.image(1405, 509, 'option_bg');
        this.areaCells = MATCH_ZONE_POSITIONS.map(([x, y]) => this.add.image(x, y, 'area_cell'));
        this.itemBgs = ITEM_BG_POSITIONS.map(([x, y]) => this.add.image(x, y, 'item_bg'));

        // 序号位置
        const itemPositions = [
            [180, 295], [485, 295], [791, 295],
            [180, 579], [485, 579], [791, 579],
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
            width: 106,
            height: 106,
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
