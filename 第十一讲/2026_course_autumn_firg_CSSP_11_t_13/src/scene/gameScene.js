import DragDropComponent from '../components/DragDropComponent.js';
import CellShapeComponent from '../components/CellShapeComponent.js';
import ButtonComponent from '../components/ButtonComponent.js';

/** area_cell 左上角 1332×459，宽高 94；中心间距 92（边框 2px 重叠成一条线） */
const MATCH_ZONE_POSITIONS = [
    [1379, 506], [1471, 506], [1563, 506],
    [1379, 598], [1471, 598], [1563, 598],
];

const ITEM_BG_POSITIONS = [
    [287, 429], [563, 429], [838, 429],
    [287, 671], [563, 671], [838, 671],
];

/** 1: 上左上中 + 下右；火人在上中 */
const SHAPE_1 = {
    cells: [[0, 0], [1, 0], [2, 1]],
    firemanIndex: 1,
};

/** 2: 上右 + 下左下中；火人在下左 */
const SHAPE_2 = {
    cells: [[2, 0], [0, 1], [1, 1]],
    firemanIndex: 1,
};

/** 3: 上中 + 下三格；火人在下中 */
const SHAPE_3 = {
    cells: [[1, 0], [0, 1], [1, 1], [2, 1]],
    firemanIndex: 2,
};

/** 4: 上左右 + 下中；火人在上右 */
const SHAPE_4 = {
    cells: [[0, 0], [2, 0], [1, 1]],
    firemanIndex: 1,
};

/** 5: 上左 + 下三格；火人在下右 */
const SHAPE_5 = {
    cells: [[0, 0], [0, 1], [1, 1], [2, 1]],
    firemanIndex: 3,
};

/** 6: 上左右 + 下中；火人在上左 */
const SHAPE_6 = {
    cells: [[0, 0], [2, 0], [1, 1]],
    firemanIndex: 0,
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
        this.add.image(1470, 548, 'option_bg');
        this.areaCells = MATCH_ZONE_POSITIONS.map(([x, y]) => this.add.image(x, y, 'area_cell'));
        this.itemBgs = ITEM_BG_POSITIONS.map(([x, y]) => this.add.image(x, y, 'item_bg'));

        // 序号在 item_bg 顶部中心（item_bg 高 195）
        const itemPositions = ITEM_BG_POSITIONS.map(([x, y]) => [x, y - 195 / 2]);

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
            width: 94,
            height: 94,
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
                cellWidth: 70,
                cellHeight: 70,
                dragCellWidth: 94,
                dragCellHeight: 94,
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
