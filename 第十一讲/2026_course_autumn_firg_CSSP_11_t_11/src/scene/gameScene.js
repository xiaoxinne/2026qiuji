import DragDropComponent from '../components/DragDropComponent.js';
import CellShapeComponent from '../components/CellShapeComponent.js';
import ButtonComponent from '../components/ButtonComponent.js';

/** area_cell 左上角 1337×416，宽高 89；中心间距 87（边框 2px 完全重叠成一条线） */
const MATCH_ZONE_POSITIONS = [
    [1381.5, 460.5], [1468.5, 460.5], [1555.5, 460.5],
    [1381.5, 547.5], [1468.5, 547.5], [1555.5, 547.5],
    [1381.5, 634.5], [1468.5, 634.5], [1555.5, 634.5],
];

const ITEM_BG_POSITIONS = [
    [293, 290], [567, 290], [840, 290],
    [293, 544], [567, 544], [840, 544],
    [293, 799], [567, 799], [840, 799],
];

/** 完整 3×3：全部格用 cell */
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
        this.add.image(1468, 547, 'option_bg');
        this.areaCells = MATCH_ZONE_POSITIONS.map(([x, y]) => this.add.image(x, y, 'area_cell'));
        this.itemBgs = ITEM_BG_POSITIONS.map(([x, y]) => this.add.image(x, y, 'item_bg'));

        // 相对 item_bg 中心偏移与原先一致 (-124, -104)
        const itemPositions = [
            [169, 186], [443, 186], [716, 186],
            [169, 440], [443, 440], [716, 440],
            [169, 695], [443, 695], [716, 695],
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
            width: 89,
            height: 89,
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
            return CellShapeComponent.create(this, {
                cells: config.cells,
                firemanIndex: config.firemanIndex,
                texture: 'cell',
                emptyTexture: 'cell',
                dragTexture: 'cell_big',
                matchedTexture: 'cell_border_big',
                firemanTexture: 'fireman',
                firemanDragTexture: 'fireman_big',
                cellWidth: 64,
                cellHeight: 64,
                dragCellWidth: 89,
                dragCellHeight: 89,
                x,
                y,
                homeX: x,
                homeY: y,
                depth: 20,
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
