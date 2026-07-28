import OptionGroupComponent from '../components/OptionGroupComponent.js';
import ButtonComponent from '../components/ButtonComponent.js';
import GameEndComponent from '../components/GameEndComponent.js';
import TrumpetButtonComponent from '../components/TrumpetButtonComponent.js';
import CellShapeComponent from '../components/CellShapeComponent.js';
import DragDropComponent from '../components/DragDropComponent.js';

const CORRECT_OPTION_ID = '3';

const ERROR_FLASH_TIMES = 3;
const ERROR_FLASH_INTERVAL = 150;

/** area 64×64；步长 62（gap=-2）；中心对齐 option (1412, 421) */
const MATCH_ZONE_POSITIONS = [
    [1350, 359], [1412, 359], [1474, 359],
    [1350, 421], [1412, 421], [1474, 421],
    [1350, 483], [1412, 483], [1474, 483],
];

const ITEM_BG_POSITIONS = [
    [358, 283], [625, 283], [892, 283],
    [358, 544], [625, 544], [892, 544],
    [358, 803], [625, 803], [892, 803],
];

// 序号位置
const ITEM_NUM_POSITIONS = [
    [249, 172], [516, 172], [783, 172],
    [249, 432], [516, 432], [783, 432],
    [249, 691], [516, 691], [783, 691],
];

/** 完整 3×3 */
const FULL_3X3_CELLS = [
    [0, 0], [1, 0], [2, 0],
    [0, 1], [1, 1], [2, 1],
    [0, 2], [1, 2], [2, 2],
];

/**
 * fireman 位置（按 3×3 行优先 0~8）：
 * 1中 2中右 3左上 4下中 5中左 6右上 7上中 8左下 9无
 */
const FIREMAN_INDEXES = [4, 5, 0, 7, 3, 2, 1, 6, -1];

const SHAPE_CONFIGS = FIREMAN_INDEXES.map((firemanIndex) => ({
    cells: FULL_3X3_CELLS,
    firemanIndex,
}));

const OPTIONS = [
    { id: '1', x: 1203, y: 797, texture: 'option1', selectedTexture: 'option1_s', errorTexture: 'option1_r' },
    { id: '2', x: 1412, y: 797, texture: 'option2', selectedTexture: 'option2_s', errorTexture: 'option2_r' },
    { id: '3', x: 1622, y: 797, texture: 'option3', selectedTexture: 'option3_s', errorTexture: 'option3_r' },
];

export default class gameScene extends Phaser.Scene {
    constructor() {
        super('gameScene');
        ReportHelper.gameReportParams.difficulty = 2;
        ReportHelper.report('game_start', {
            difficulty: 2,
        });
    }

    create() {
        this._onVisibilityChange = () => {
            this.sound.stopAll();
            this.trumpet?.showIdle?.();
        };
        document.addEventListener('visibilitychange', this._onVisibilityChange);

        this.isBusy = false;
        this.hasAnsweredCorrectly = false;
        this.errorCnt = 0;

        this.add.image(960, 540, 'game_bg');
        this.add.image(101, 67, 'jiaobiao');
        this.add.image(960, 92, 'title1');
        this.add.image(1404, 797, 'option_bg');
        this.add.image(1412, 421, 'option');
        this.areaCells = MATCH_ZONE_POSITIONS.map(([x, y]) => this.add.image(x, y, 'area_cell'));
        this.itemBgs = ITEM_BG_POSITIONS.map(([x, y]) => this.add.image(x, y, 'item_bg'));
        this.add.image(885, 800, 'wenhao').setDepth(30);

        const items = ITEM_NUM_POSITIONS.map(([x, y], index) => ({
            key: `drag_${index + 1}`,
            texture: `drag_${index + 1}`,
            x,
            y,
        }));

        const dropZones = MATCH_ZONE_POSITIONS.map(([x, y], index) => ({
            key: `match_${index + 1}`,
            x,
            y,
            width: 64,
            height: 64,
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
            const canDrag = index < 8;
            // 序号最高；cornerLShape（2号）中间层；其余图形底层
            const depth = index === 1 ? 40 : 20;
            return CellShapeComponent.create(this, {
                cells: config.cells,
                firemanIndex: config.firemanIndex,
                texture: 'cell',
                matchedTexture: 'cell_border',
                firemanTexture: 'fireman',
                cellWidth: 64,
                cellHeight: 64,
                dragCellWidth: 64,
                dragCellHeight: 64,
                x,
                y,
                homeX: x,
                homeY: y,
                depth,
                showGhost: canDrag,
                draggable: canDrag,
                matchZones: canDrag ? matchZones : [],
                onMatch: canDrag ? () => this.sound.play('put') : null,
                onReturn: canDrag ? () => this.sound.play('put') : null,
            });
        });

        this.trumpet = TrumpetButtonComponent.create(this, {
            x: 155,
            y: 910,
            soundKey: 'title1',
            autoPlay: true,
        });

        this.optionGroup = OptionGroupComponent.create(this, {
            mode: 'single',
            soundKey: 'btnclick',
            dimWhenDisabled: false,
            options: OPTIONS,
            onChange: () => {
                this.syncSubmitButtonState();
            },
        });

        this.submitButton = new ButtonComponent(this, {
            x: 1737,
            y: 422,
            texture: 'submit',
            clickEffectTexture: 'submit_s',
            clickDisabledTexture: 'submit_d',
            soundKey: 'btnclick',
            onClick: () => {
                this.onSubmit();
            },
        });

        this.syncSubmitButtonState();
    }

    syncSubmitButtonState() {
        if (!this.submitButton || !this.optionGroup) return;
        const canSubmit =
            !this.isBusy &&
            !this.hasAnsweredCorrectly &&
            this.optionGroup.getSelected().length > 0;
        this.submitButton.setEnabled(canSubmit);
    }

    onSubmit() {
        if (this.isBusy || this.hasAnsweredCorrectly) return;
        const selectedIds = this.optionGroup.getSelected();
        if (!selectedIds.length) return;

        const selectedId = selectedIds[0];
        const isCorrect = selectedId === CORRECT_OPTION_ID;

        if (isCorrect) {
            this.hasAnsweredCorrectly = true;
            this.isBusy = true;
            this.submitButton.setEnabled(false);
            this.optionGroup.setEnabled(false);
            this.trumpet?.stop?.();
            this.sound.play('correct');

            const correctItem = this.optionGroup.items.find((item) => item.id === CORRECT_OPTION_ID);
            if (correctItem?.icon) {
                this.playSpineEffect(correctItem.icon.x, correctItem.icon.y);
            }

            GameEndComponent.show(this, {
                errorCnt: this.errorCnt,
            });
            return;
        }

        this.isBusy = true;
        this.submitButton.setEnabled(false);
        this.optionGroup.setEnabled(false);
        this.sound.play('error1');
        this.errorCnt += 1;
        ReportHelper.recordWrongTime(0);

        this.optionGroup.flashError(selectedId, {
            times: ERROR_FLASH_TIMES,
            interval: ERROR_FLASH_INTERVAL,
            onComplete: () => {
                this.optionGroup.clearSelection();
                this.optionGroup.setEnabled(true);
                this.isBusy = false;
                this.syncSubmitButtonState();
            },
        });
    }

    playSpineEffect(x, y, onComplete, dataKey = 'effect_jinengzidan_data', atlasKey = 'effect_jinengzidan_atlas', depth = 1000) {
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
}
