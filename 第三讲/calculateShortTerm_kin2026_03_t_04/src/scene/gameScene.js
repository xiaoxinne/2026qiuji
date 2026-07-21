import DragDropComponent from '../components/DragDropComponent.js';
import ButtonComponent from '../components/ButtonComponent.js';

const MATCH_AREA_LAYOUT = {
    cellWidth: 100,
    cellHeight: 124,
    gapX: 10,
    gapY: 20,
    cols: 5,
    rows: 2,
};

const LEVEL_CONFIG = {
    drag: {
        items: [
            ...[0, 1, 2, 3, 4, 5].map((i) => ({
                key: `left_blue_${i}`,
                texture: 'blue',
                initialZoneKey: `left_${i}`,
            })),
            ...[0, 1, 2, 3].map((i) => ({
                key: `left_pink_${i}`,
                texture: 'pink',
                initialZoneKey: `left_${6 + i}`,
            })),
            {
                key: 'right_pink_0',
                texture: 'pink',
                initialZoneKey: 'right_0',
            },
        ],
    },
    matchGroups: [
        { key: 'left', areaX: 556, areaY: 300, startX: 286, startY: 170 },
        { key: 'right', areaX: 1365, areaY: 300, startX: 1095, startY: 170 },
    ],
    areaYAfterMark: 353,
    question: {
        mark: { x: 966, y: 689, texture: 'mark' },
        que1: { x: 898, y: 660, texture: 'que1_1' },
        que2: { x: 894, y: 772, texture: 'que1_2' },
        option: { x: 1086, y: 662, texture: 'option' },
        subOptions: [
            { key: 'subOption0', x: 881, y: 767, texture: 'option2', answerStep: 2 },
            { key: 'subOption1', x: 984, y: 764, texture: 'option2', answerStep: 3 },
            { key: 'subOption2', x: 843, y: 895, texture: 'option2', answerStep: 4 },
        ],
        tips: {
            x: 283,
            y: 695,
            textures: ['tips1_1', 'tips1_2', 'tips1_3', 'tips1_4'],
        },
        answers: [
            { step: 2, x: 881, y: 767, texture: 'answer4' },
            { step: 3, x: 985, y: 767, texture: 'answer1' },
            { step: 4, x: 843, y: 895, texture: 'answer10' },
            { step: 5, x: 1085, y: 662, texture: 'answer11' },
        ],
    },
};

function cloneMatchGroups(groups) {
    return groups.map((group) => ({ ...group }));
}

function getAreaMoveDelta(config) {
    return config.areaYAfterMark - config.matchGroups[0].areaY;
}

function getStartYAfterMark(config) {
    return config.matchGroups[0].startY + getAreaMoveDelta(config);
}

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
        this.add.image(960, 92, 'title1').setDepth(40);

        this.level = this._buildLevel(LEVEL_CONFIG);
        this._createPlayButton();
        this._createResetButton();
        this._applyLevelDisplay();

        this.events.once('shutdown', this._onShutdown, this);
    }

    _onShutdown() {
        document.removeEventListener('visibilitychange', this._onVisibilityChange);
    }

    _buildLevel(config) {
        const groupConfigs = cloneMatchGroups(config.matchGroups);
        const dragDepth = 20;
        const questionDepth = 30;
        const { question } = config;

        const areaSprites = groupConfigs.map(({ areaX, areaY }) => {
            return this.add.image(areaX, areaY, 'area');
        });

        const matchZones = this._createMatchAreaGroups(groupConfigs);
        const dragDrop = new DragDropComponent(this, {
            items: this._createDragItems(matchZones, config.drag),
            dropZones: matchZones,
            depth: dragDepth,
        });

        const mark = this._createClickableImage(question.mark, questionDepth);
        mark.on('pointerup', () => {
            this.sound.play('btnclick');
            this._onMarkClick();
        });

        const que1_1 = this.add.image(question.que1.x, question.que1.y, question.que1.texture)
            .setDepth(questionDepth).setVisible(false);
        const que1_2 = this.add.image(question.que2.x, question.que2.y, question.que2.texture)
            .setDepth(questionDepth).setVisible(false);

        const option = this._createClickableImage(question.option, questionDepth).setVisible(false);
        option.on('pointerup', () => {
            if (!this.level.optionEnabled) {
                return;
            }
            this.sound.play('btnclick');
            this._onOptionClick();
        });

        const subOptions = {};
        const subOptionUsed = {};
        question.subOptions.forEach((subOptionConfig) => {
            const subOption = this._createClickableImage(subOptionConfig, questionDepth).setVisible(false);
            subOption.on('pointerup', () => {
                if (!this.level.subOptionEnabled[subOptionConfig.key]) {
                    return;
                }
                this.sound.play('btnclick');
                this._onSubOptionClick(subOptionConfig.key);
            });
            subOptions[subOptionConfig.key] = subOption;
            subOptionUsed[subOptionConfig.key] = false;
        });

        const tips = this.add.image(question.tips.x, question.tips.y, question.tips.textures[0])
            .setDepth(questionDepth)
            .setVisible(false);

        const answerSprites = {};
        question.answers.forEach((answer) => {
            answerSprites[answer.step] = this.add.image(answer.x, answer.y, answer.texture)
                .setDepth(questionDepth)
                .setVisible(false);
        });

        const answerShown = {};
        question.answers.forEach((answer) => {
            answerShown[answer.step] = false;
        });

        return {
            config,
            groupConfigs,
            areaSprites,
            matchZones,
            dragDrop,
            mark,
            que1_1,
            que1_2,
            option,
            subOptions,
            subOptionUsed,
            subOptionEnabled: {},
            tips,
            tipsTextures: question.tips.textures,
            answerSprites,
            answerShown,
            tipsIndex: 0,
            optionEnabled: false,
            markUsed: false,
            optionUsed: false,
        };
    }

    _createClickableImage({ x, y, texture }, depth) {
        const image = this.add.image(x, y, texture).setDepth(depth);
        image.setInteractive({ useHandCursor: true });
        return image;
    }

    _applyLevelDisplay() {
        const level = this.level;

        level.mark.setVisible(!level.markUsed);
        if (level.markUsed) {
            level.mark.disableInteractive();
        } else {
            level.mark.setInteractive({ useHandCursor: true });
        }

        level.que1_1.setVisible(level.markUsed);
        level.que1_2.setVisible(level.optionUsed);
        level.option.setVisible(level.markUsed);
        level.tips.setVisible(level.tipsIndex >= 1);

        Object.entries(level.answerSprites).forEach(([step, sprite]) => {
            sprite.setVisible(level.answerShown[Number(step)]);
        });

        level.config.question.subOptions.forEach(({ key }) => {
            const subOption = level.subOptions[key];
            const visible = level.optionUsed;
            const enabled = level.optionUsed && !level.subOptionUsed[key];
            subOption.setVisible(visible);
            level.subOptionEnabled[key] = enabled;
            if (enabled) {
                subOption.setInteractive({ useHandCursor: true });
            } else {
                subOption.disableInteractive();
            }
        });

        if (level.tipsIndex >= 1) {
            level.tips.setTexture(level.tipsTextures[level.tipsIndex - 1]);
        } else {
            level.tips.setTexture(level.tipsTextures[0]);
        }

        level.tips.disableInteractive();

        if (level.markUsed && !level.optionUsed) {
            level.optionEnabled = true;
            level.option.setInteractive({ useHandCursor: true });
        } else {
            level.optionEnabled = false;
            level.option.disableInteractive();
        }

        this._applyPlayButtonDisplay();
    }

    _applyPlayButtonDisplay() {
        const level = this.level;
        const playDone = level.tipsIndex >= level.tipsTextures.length;

        this.playBtn.getMainIcon().setVisible(!playDone);
        this.playBtn.setEnabled(level.markUsed && !playDone);
    }

    _createPlayButton() {
        this.playBtn = new ButtonComponent(this, {
            x: 1774,
            y: 512,
            texture: 'play',
            clickEffectTexture: 'play',
            soundKey: 'btnclick',
            keepSizeOnClickEffect: true,
            onClick: () => this._onPlayClick(),
        });
        this.playBtn.getMainIcon().setDepth(40);
    }

    _onPlayClick() {
        const level = this.level;
        if (!level.markUsed || level.tipsIndex >= level.tipsTextures.length) {
            return;
        }

        level.tipsIndex += 1;
        level.tips.setVisible(true);
        level.tips.setTexture(level.tipsTextures[level.tipsIndex - 1]);

        this._applyPlayButtonDisplay();
    }

    _createResetButton() {
        this.resetBtn = new ButtonComponent(this, {
            x: 1778,
            y: 878,
            texture: 'reset',
            clickEffectTexture: 'reset_s',
            soundKey: 'btnclick',
            keepSizeOnClickEffect: true,
            onClick: () => this._resetToInitialState(),
        });
        this.resetBtn.getMainIcon().setDepth(40);
    }

    _resetToInitialState() {
        this._resetLevel();
        this._applyLevelDisplay();
    }

    _resetLevel() {
        const level = this.level;
        level.groupConfigs = cloneMatchGroups(level.config.matchGroups);

        level.areaSprites.forEach((sprite, index) => {
            sprite.y = level.groupConfigs[index].areaY;
        });

        const zones = level.dragDrop.dropZones;
        zones.forEach((zone) => {
            zone.currentItem = null;
            const groupConfig = level.groupConfigs.find((c) => c.key === zone.data.groupKey);
            const positions = this._getMatchZonePositions(groupConfig.startX, groupConfig.startY);
            const pos = positions[zone.data.index];
            zone.x = pos.x;
            zone.y = pos.y;
        });
        level.matchZones = zones;

        level.config.drag.items.forEach(({ key, initialZoneKey }) => {
            this._resetItemToZone(key, initialZoneKey);
        });

        level.tipsIndex = 0;
        level.optionEnabled = false;
        level.markUsed = false;
        level.optionUsed = false;
        Object.keys(level.subOptionUsed).forEach((key) => {
            level.subOptionUsed[key] = false;
        });
        Object.keys(level.answerShown).forEach((step) => {
            level.answerShown[Number(step)] = false;
        });
    }

    _resetItemToZone(itemKey, zoneKey) {
        const level = this.level;
        const item = level.dragDrop.getItem(itemKey);
        const zone = level.dragDrop.dropZones.find((z) => z.key === zoneKey);
        if (!item || !zone) {
            return;
        }

        this.tweens.killTweensOf(item.sprite);

        if (item.currentZone && item.currentZone !== zone) {
            item.currentZone.currentItem = null;
        }

        zone.currentItem = item;
        item.currentZone = zone;
        item.sprite.x = zone.x;
        item.sprite.y = zone.y;
        item.sprite.setScale(item.homeScale);
        item.sprite.setAlpha(1);
        item.sprite.setDepth(20);
        item.homeX = zone.x;
        item.homeY = zone.y;
    }

    _onMarkClick() {
        const level = this.level;
        level.markUsed = true;
        level.mark.setVisible(false);
        level.mark.disableInteractive();

        // this._moveAreasAfterMark();

        level.que1_1.setVisible(true);
        level.option.setVisible(true);
        level.optionEnabled = true;
        level.option.setInteractive({ useHandCursor: true });

        this._applyPlayButtonDisplay();
    }

    _moveAreasAfterMark() {
        const level = this.level;
        const { config } = level;
        const areaYAfterMark = config.areaYAfterMark;
        const startYAfterMark = getStartYAfterMark(config);
        const deltaY = getAreaMoveDelta(config);

        level.areaSprites.forEach((sprite) => {
            sprite.y = areaYAfterMark;
        });

        level.groupConfigs.forEach((groupConfig) => {
            groupConfig.areaY = areaYAfterMark;
            groupConfig.startY = startYAfterMark;
        });

        const zones = level.dragDrop.dropZones;
        zones.forEach((zone) => {
            const groupConfig = level.groupConfigs.find((c) => c.key === zone.data.groupKey);
            const positions = this._getMatchZonePositions(groupConfig.startX, groupConfig.startY);
            const pos = positions[zone.data.index];
            zone.x = pos.x;
            zone.y = pos.y;
        });
        level.matchZones = zones;

        level.dragDrop.items.forEach((item) => {
            if (item.currentZone) {
                item.sprite.x = item.currentZone.x;
                item.sprite.y = item.currentZone.y;
                item.homeX = item.currentZone.x;
                item.homeY = item.currentZone.y;
            } else {
                item.homeY += deltaY;
                item.sprite.y += deltaY;
            }
        });
    }

    _onOptionClick() {
        const level = this.level;
        level.optionUsed = true;
        level.que1_2.setVisible(true);
        level.answerShown[5] = true;

        level.optionEnabled = false;
        level.option.disableInteractive();

        this._applyLevelDisplay();
    }

    _onSubOptionClick(key) {
        const level = this.level;
        const subOptionConfig = level.config.question.subOptions.find((item) => item.key === key);
        if (!subOptionConfig) {
            return;
        }

        level.subOptionUsed[key] = true;
        level.answerShown[subOptionConfig.answerStep] = true;

        this._applyLevelDisplay();
    }

    _createDragItems(matchZones, dragConfig) {
        const getZone = (key) => matchZones.find((zone) => zone.key === key);

        return dragConfig.items.map(({ key, texture, initialZoneKey }) => {
            const zone = getZone(initialZoneKey);
            return {
                key,
                texture,
                x: zone.x,
                y: zone.y,
                initialZoneKey,
            };
        });
    }

    _createMatchAreaGroups(groupConfigs) {
        const zones = [];

        groupConfigs.forEach(({ key: groupKey, startX, startY }) => {
            this._getMatchZonePositions(startX, startY).forEach((pos, index) => {
                zones.push({
                    key: `${groupKey}_${index}`,
                    x: pos.x,
                    y: pos.y,
                    width: MATCH_AREA_LAYOUT.cellWidth,
                    height: MATCH_AREA_LAYOUT.cellHeight,
                    data: { groupKey, index, row: pos.row, col: pos.col },
                });
            });
        });

        return zones;
    }

    _getMatchZonePositions(startX, startY) {
        const { cellWidth, cellHeight, gapX, gapY, cols, rows } = MATCH_AREA_LAYOUT;
        const positions = [];

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                positions.push({
                    x: startX + col * (cellWidth + gapX) + cellWidth / 2,
                    y: startY + row * (cellHeight + gapY) + cellHeight / 2,
                    row,
                    col,
                });
            }
        }

        return positions;
    }
}
