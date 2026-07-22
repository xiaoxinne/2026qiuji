import DragDropComponent from '../components/DragDropComponent.js';
import CellShapeComponent from '../components/CellShapeComponent.js';
import ButtonComponent from '../components/ButtonComponent.js';

const MATCH_ZONE_POSITIONS = [
    [1314.84, 419.86], [1403.84, 419.86], [1492.84, 419.86],
    [1314.84, 508.86], [1403.84, 508.86], [1492.84, 508.86],
    [1314.84, 597.86], [1403.84, 597.86], [1492.84, 597.86],
];

const ITEM_BG_POSITIONS = [
    [359, 284], [642, 284], [925, 284],
    [359, 548], [642, 548], [925, 548],
    [359, 811], [642, 811], [925, 811],
];

/** 完整 3×3：火人格用 cell，其余格用 cell_border */
const FULL_3X3_CELLS = [
    [0, 0], [1, 0], [2, 0],
    [0, 1], [1, 1], [2, 1],
    [0, 2], [1, 2], [2, 2],
];

/** fireman 格子：第 1 个在第 8 格（index 7），其余按序 */
const FIREMAN_INDEXES = [7, 3, 5, 2, 8, 0, 1, 4, 6];

const SHAPE_CONFIGS = FIREMAN_INDEXES.map((firemanIndex) => ({
    cells: FULL_3X3_CELLS,
    firemanIndex,
}));

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
            width: 90,
            height: 90,
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
                texture: 'cell',
                emptyTexture: 'cell_border',
                dragTexture: 'cell_big',
                matchedTexture: 'cell_border_big',
                firemanTexture: 'fireman',
                firemanDragTexture: 'fireman_big',
                cellWidth: 64,
                cellHeight: 64,
                dragCellWidth: 90,
                dragCellHeight: 90,
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
