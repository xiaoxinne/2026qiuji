import DragDropComponent from '../components/DragDropComponent.js';
import ButtonComponent from '../components/ButtonComponent.js';
import PageNavButtonsComponent from '../components/PageNavButtonsComponent.js';

const TOTAL_PAGES = 2;

const MATCH_AREA_LAYOUT = {
    cellWidth: 120,
    cellHeight: 116,
    gapX: 9,
    gapY: 11,
    cols: 5,
    rows: 2,
};

/**
 * 关卡配置表：第 1 关 index=0，第 2 关 index=1
 * 修改第二关时，复制第一关结构，按需改坐标、素材 key、数量即可
 */
const LEVEL_CONFIGS = [
    {
        drag: {
            leftCount: 9,
            rightCount: 6,
            leftTexture: 'pink',
            rightTexture: 'blue',
        },
        matchGroups: [
            { key: 'left', areaX: 581, areaY: 403, startX: 265, startY: 258 },
            { key: 'right', areaX: 1338, areaY: 403, startX: 1023, startY: 258 },
        ],
        question: {
            mark: { x: 966, y: 689, texture: 'mark' },
            que1: { x: 890, y: 689, texture: 'que1_1' },
            que2: { x: 907, y: 884, texture: 'que1_2' },
            option: { x: 1113, y: 690, texture: 'option' },
            tips: {
                x: 283,
                y: 795,
                textures: ['tips1_1', 'tips1_2', 'tips1_3', 'tips1_4'],
            },
            answers: [
                { step: 2, x: 868, y: 817, texture: 'answer1' },
                { step: 3, x: 990, y: 817, texture: 'answer5' },
                { step: 4, x: 822, y: 982, texture: 'answer10' },
                { step: 5, x: 1113, y: 690, texture: 'answer15' },
            ],
        },
    },
    {
        // 第二关：逻辑与第一关相同，按需修改下方配置
        drag: {
            leftCount: 3,
            rightCount: 8,
            leftTexture: 'pink',
            rightTexture: 'blue',
        },
        matchGroups: [
            { key: 'left', areaX: 581, areaY: 403, startX: 272, startY: 258 },
            { key: 'right', areaX: 1338, areaY: 403, startX: 1030, startY: 258 },
        ],
        question: {
            mark: { x: 966, y: 689, texture: 'mark' },
            que1: { x: 890, y: 689, texture: 'que2_1' },
            que2: { x: 801, y: 884, texture: 'que2_2' },
            option: { x: 1113, y: 690, texture: 'option' },
            tips: {
                x: 283,
                y: 795,
                textures: ['tips2_1', 'tips2_2', 'tips2_3', 'tips2_4'],
            },
            answers: [
                { step: 2, x: 841, y: 817, texture: 'answer2' },
                { step: 3, x: 719, y: 817, texture: 'answer1' },
                { step: 4, x: 884, y: 982, texture: 'answer10' },
                { step: 5, x: 1113, y: 690, texture: 'answer11' },
            ],
        },
    },
];

function cloneMatchGroups(groups) {
    return groups.map((group) => ({ ...group }));
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
        this.add.image(960, 92.5, 'title1');

        this.levels = LEVEL_CONFIGS.map((config, index) => this._buildLevel(index, config));

        this._createResetButton();

        this.pageNav = new PageNavButtonsComponent(this, {
            x: 1778,
            prevY: 638,
            nextY: 638,
            totalPages: TOTAL_PAGES,
            initialPage: 0,
            soundKey: 'btnclick',
            depth: 30,
            onPageChange: (pageIndex) => {
                this.applyPage(pageIndex);
            },
        });
        this.applyPage(0);

        this.events.once('shutdown', this._onShutdown, this);
    }

    _onShutdown() {
        document.removeEventListener('visibilitychange', this._onVisibilityChange);
        if (this.pageNav) {
            this.pageNav.destroy();
            this.pageNav = null;
        }
    }

    /** 切换页：显示当前关元素，隐藏另一关 */
    applyPage(pageIndex) {
        this.currentLevelIndex = pageIndex;
        this.levels.forEach((level, index) => {
            const show = index === pageIndex;
            this._setLevelVisible(level, show);
            if (show) {
                this._applyLevelDisplay(level);
            }
        });
    }

    _getLevel(index = this.currentLevelIndex) {
        return this.levels[index];
    }

    _buildLevel(levelIndex, config) {
        const groupConfigs = cloneMatchGroups(config.matchGroups);
        const zonePrefix = `l${levelIndex}_`;
        const dragDepth = 20;
        const questionDepth = 30;
        const { question } = config;

        const areaSprites = groupConfigs.map(({ areaX, areaY }) => {
            return this.add.image(areaX, areaY, 'area');
        });

        const matchZones = this._createMatchAreaGroups(groupConfigs, zonePrefix);
        const dragDrop = new DragDropComponent(this, {
            items: this._createDragItems(matchZones, zonePrefix, config.drag),
            dropZones: matchZones,
            depth: dragDepth,
        });

        const mark = this._createClickableImage(question.mark, questionDepth);
        mark.on('pointerup', () => {
            this.sound.play('btnclick');
            this._onMarkClick(levelIndex);
        });

        const que1_1 = this.add.image(question.que1.x, question.que1.y, question.que1.texture)
            .setDepth(questionDepth).setVisible(false);
        const que1_2 = this.add.image(question.que2.x, question.que2.y, question.que2.texture)
            .setDepth(questionDepth).setVisible(false);

        const option = this._createClickableImage(question.option, questionDepth).setVisible(false);
        option.on('pointerup', () => {
            const level = this._getLevel(levelIndex);
            if (!level.optionEnabled) {
                return;
            }
            this.sound.play('btnclick');
            this._onOptionClick(levelIndex);
        });

        const tips = this._createClickableImage(
            { x: question.tips.x, y: question.tips.y, texture: question.tips.textures[0] },
            questionDepth,
        ).setVisible(false);
        tips.on('pointerup', () => {
            this.sound.play('btnclick');
            this._onTipsClick(levelIndex);
        });

        const answerSprites = {};
        question.answers.forEach((answer) => {
            answerSprites[answer.step] = this.add.image(answer.x, answer.y, answer.texture)
                .setDepth(questionDepth)
                .setVisible(false);
        });

        return {
            levelIndex,
            config,
            groupConfigs,
            zonePrefix,
            areaSprites,
            matchZones,
            dragDrop,
            mark,
            que1_1,
            que1_2,
            option,
            tips,
            tipsTextures: question.tips.textures,
            answerSprites,
            tipsStep: 0,
            optionEnabled: false,
            markUsed: false,
        };
    }

    _createClickableImage({ x, y, texture }, depth) {
        const image = this.add.image(x, y, texture).setDepth(depth);
        image.setInteractive({ useHandCursor: true });
        return image;
    }

    _setLevelVisible(level, visible) {
        level.areaSprites.forEach((sprite) => sprite.setVisible(visible));
        level.dragDrop.setEnabled(visible);
        level.dragDrop.items.forEach((item) => item.sprite.setVisible(visible));

        if (!visible) {
            [
                level.mark,
                level.que1_1,
                level.que1_2,
                level.option,
                level.tips,
                ...Object.values(level.answerSprites),
            ].forEach((sprite) => sprite.setVisible(false));
        }
    }

    _applyLevelDisplay(level) {
        level.mark.setVisible(!level.markUsed);
        if (level.markUsed) {
            level.mark.disableInteractive();
        } else {
            level.mark.setInteractive({ useHandCursor: true });
        }

        level.que1_1.setVisible(level.markUsed);
        level.que1_2.setVisible(level.tipsStep >= 1);
        level.option.setVisible(level.markUsed);
        level.tips.setVisible(level.tipsStep >= 1);

        Object.entries(level.answerSprites).forEach(([step, sprite]) => {
            sprite.setVisible(level.tipsStep >= Number(step));
        });

        if (level.tipsStep >= 1) {
            const textureIndex = Math.min(level.tipsStep, level.tipsTextures.length) - 1;
            level.tips.setTexture(level.tipsTextures[textureIndex]);
        } else {
            level.tips.setTexture(level.tipsTextures[0]);
        }

        if (level.markUsed && level.tipsStep < 1) {
            level.optionEnabled = true;
            level.option.setInteractive({ useHandCursor: true });
        } else {
            level.optionEnabled = false;
            level.option.disableInteractive();
        }

        const maxTipsStep = Math.max(...Object.keys(level.answerSprites).map(Number));
        if (level.tipsStep >= maxTipsStep) {
            level.tips.disableInteractive();
        } else if (level.tipsStep >= 1) {
            level.tips.setInteractive({ useHandCursor: true });
        } else {
            level.tips.disableInteractive();
        }
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
        this._resetLevel(this._getLevel());
        this._applyLevelDisplay(this._getLevel());
    }

    _resetLevel(level) {
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

        const { leftCount, rightCount } = level.config.drag;
        for (let i = 0; i < leftCount; i++) {
            this._resetItemToZone(level, `${level.zonePrefix}pink_${i}`, `${level.zonePrefix}left_${i}`);
        }
        for (let i = 0; i < rightCount; i++) {
            this._resetItemToZone(level, `${level.zonePrefix}blue_${i}`, `${level.zonePrefix}right_${i}`);
        }

        level.tipsStep = 0;
        level.optionEnabled = false;
        level.markUsed = false;
    }

    _resetItemToZone(level, itemKey, zoneKey) {
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

    _onMarkClick(levelIndex) {
        if (this.pageNav.getPageIndex() !== levelIndex) {
            return;
        }
        const level = this._getLevel(levelIndex);
        level.markUsed = true;
        level.mark.setVisible(false);
        level.mark.disableInteractive();

        level.que1_1.setVisible(true);
        level.option.setVisible(true);
        level.optionEnabled = true;
        level.option.setInteractive({ useHandCursor: true });
    }

    _onOptionClick(levelIndex) {
        if (this.pageNav.getPageIndex() !== levelIndex) {
            return;
        }
        const level = this._getLevel(levelIndex);
        level.que1_2.setVisible(true);
        level.tips.setVisible(true);
        level.tipsStep = 1;
        level.tips.setTexture(level.tipsTextures[0]);
        level.tips.setInteractive({ useHandCursor: true });

        level.optionEnabled = false;
        level.option.disableInteractive();
    }

    _onTipsClick(levelIndex) {
        if (this.pageNav.getPageIndex() !== levelIndex) {
            return;
        }
        const level = this._getLevel(levelIndex);
        const nextStep = level.tipsStep + 1;
        const maxAnswerStep = Math.max(...Object.keys(level.answerSprites).map(Number));

        if (nextStep > maxAnswerStep) {
            return;
        }

        level.tipsStep = nextStep;

        if (nextStep <= level.tipsTextures.length) {
            level.tips.setTexture(level.tipsTextures[nextStep - 1]);
        }

        const answerSprite = level.answerSprites[nextStep];
        if (answerSprite) {
            answerSprite.setVisible(true);
        }

        if (level.tipsStep >= maxAnswerStep) {
            level.tips.disableInteractive();
        }
    }

    _createDragItems(matchZones, zonePrefix, dragConfig) {
        const items = [];
        const getZone = (key) => matchZones.find((zone) => zone.key === key);
        const { leftCount, rightCount, leftTexture, rightTexture } = dragConfig;

        for (let i = 0; i < leftCount; i++) {
            const zone = getZone(`${zonePrefix}left_${i}`);
            items.push({
                key: `${zonePrefix}pink_${i}`,
                texture: leftTexture,
                x: zone.x,
                y: zone.y,
                initialZoneKey: `${zonePrefix}left_${i}`,
            });
        }

        for (let i = 0; i < rightCount; i++) {
            const zone = getZone(`${zonePrefix}right_${i}`);
            items.push({
                key: `${zonePrefix}blue_${i}`,
                texture: rightTexture,
                x: zone.x,
                y: zone.y,
                initialZoneKey: `${zonePrefix}right_${i}`,
            });
        }

        return items;
    }

    _createMatchAreaGroups(groupConfigs, zonePrefix) {
        const zones = [];

        groupConfigs.forEach(({ key: groupKey, startX, startY }) => {
            this._getMatchZonePositions(startX, startY).forEach((pos, index) => {
                zones.push({
                    key: `${zonePrefix}${groupKey}_${index}`,
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
