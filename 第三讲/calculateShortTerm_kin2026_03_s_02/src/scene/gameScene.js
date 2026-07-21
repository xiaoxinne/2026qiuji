import TrumpetButtonComponent from '../components/TrumpetButtonComponent.js';
import DragDropComponent from '../components/DragDropComponent.js';
import ButtonComponent from '../components/ButtonComponent.js';
import GameEndComponent from '../components/GameEndComponent.js';

const MATCH_AREA_LAYOUT = {
    cellWidth: 117,
    cellHeight: 116,
    gapX: 9,
    gapY: 11,
    cols: 5,
    rows: 2,
};

const MATCH_GROUPS = [
    { key: 'left', areaX: 527, areaY: 480, startX: 216, startY: 334 },
    { key: 'right', areaX: 1381, areaY: 480, startX: 1071, startY: 334 },
];

const SUBMIT_BUTTON_SUB1 = { x: 952, y: 890 };
const SUBMIT_BUTTON_SUB2 = { x: 1368, y: 857 };
const WENHAO_POS = { x: 918, y: 93 };
const WENHAO_SR_SCALE = 0.8;
const OPTION_SLOT_POSITIONS = [
    { x: 629, y: 864 },
    { x: 904, y: 864 },
    { x: 1180, y: 864 },
];
const CONFIRM_NEXT_DELAY = 700;
const OPTION_ERROR_FLASH_TIMES = 3;
const OPTION_ERROR_FLASH_INTERVAL = 150;
const SLOTS_PER_SIDE = MATCH_AREA_LAYOUT.cols * MATCH_AREA_LAYOUT.rows;

/** 调试：显示匹配区域边框，对比位置用，上线前改为 false */
const SHOW_MATCH_ZONE_BOUNDS = false;

/** 第一小关拖拽物：leftCount 为左侧粉块数，rightCount 为右侧蓝块数 */
function makeDrag(leftCount, rightCount) {
    return {
        leftCount,
        rightCount,
        leftTexture: 'pink',
        rightTexture: 'blue',
    };
}

/**
 * 三关 × 两小关
 * 第一小关：drag 按关单独配置；点击提交，左或右任一侧放满 10 个即正确
 * 第二小关：options 按关单独配置；继承同关第一小关拖拽物布局
 */
const LEVEL_CONFIGS = [
    {
        subLevels: [
            { titleTexture: 'title1_1', titleAudioKey: 'title1', drag: makeDrag(9, 2) },
            {
                titleTexture: 'title1_2',
                titleAudioKey: 'title2',
                correctOption: 11,
                options: [
                    { optionTexture: 'option_11', answerTexture: 'sr_11', value: 11 },
                    { optionTexture: 'option_12', answerTexture: 'sr_12', value: 12 },
                    { optionTexture: 'option_13', answerTexture: 'sr_13', value: 13 },
                ],
            },
        ],
    },
    {
        subLevels: [
            { titleTexture: 'title2_1', titleAudioKey: 'title1', drag: makeDrag(8, 4) },
            {
                titleTexture: 'title1_2',
                titleAudioKey: 'title2',
                correctOption: 12,
                options: [
                    { optionTexture: 'option_12', answerTexture: 'sr_12', value: 12 },
                    { optionTexture: 'option_13', answerTexture: 'sr_13', value: 13 },
                    { optionTexture: 'option_14', answerTexture: 'sr_14', value: 14 },
                ],
            },
        ],
    },
    {
        subLevels: [
            { titleTexture: 'title3_1', titleAudioKey: 'title1', drag: makeDrag(7, 6) },
            {
                titleTexture: 'title1_2',
                titleAudioKey: 'title2',
                correctOption: 13,
                options: [
                    { optionTexture: 'option_13', answerTexture: 'sr_13', value: 13 },
                    { optionTexture: 'option_16', answerTexture: 'sr_16', value: 16 },
                    { optionTexture: 'option_17', answerTexture: 'sr_17', value: 17 },
                ],
            },
        ],
    },
];

export default class gameScene extends Phaser.Scene {
    constructor() {
        super('gameScene');
        ReportHelper.gameReportParams.difficulty = 1;
        ReportHelper.report('game_start', {
            difficulty: 1
        });
    }

    create() {
        this._onVisibilityChange = () => {
            this.sound.stopAll();
        };
        document.addEventListener('visibilitychange', this._onVisibilityChange);

        this.errorCnt = 0;
        this._won = false;
        this.canSubmit = true;
        this.currentLevelIndex = 0;
        this.currentSubIndex = 0;
        ReportHelper.resetWrongTimes();

        this.add.image(960, 540, 'game_bg');
        this.add.image(101, 67, 'jiaobiao');

        this.areaSprites = MATCH_GROUPS.map(({ areaX, areaY }) => {
            return this.add.image(areaX, areaY, 'area');
        });

        this.titleImage = this.add.image(960, 92, 'title1_1');
        this.wenhaoImage = this.add.image(WENHAO_POS.x, WENHAO_POS.y, 'wenhao');
        this.wenhaoImage.setVisible(false);

        this.confirmSpine = this.add.spine(
            SUBMIT_BUTTON_SUB1.x,
            SUBMIT_BUTTON_SUB1.y,
            'effect_jinengzidan_data',
            'effect_jinengzidan_atlas',
        );
        this.confirmSpine.setVisible(false);

        this.trumpet = TrumpetButtonComponent.create(this, {
            x: 138,
            y: 907,
            soundKey: 'title1',
            autoPlay: false,
        });
        this.trumpet.image.setDepth(25);

        this._createSubmitButton();
        this.submitBtn.setEnabled(false);
        this._createOptionButtons();

        this._startSubLevel(0, 0);

        this.events.once('shutdown', this._onShutdown, this);
    }

    _onShutdown() {
        document.removeEventListener('visibilitychange', this._onVisibilityChange);
        this._stopOptionErrorFlash();
        this.dragDrop?.destroy();
    }

    _getSubLevelConfig(levelIndex = this.currentLevelIndex, subIndex = this.currentSubIndex) {
        return LEVEL_CONFIGS[levelIndex].subLevels[subIndex];
    }

    /** 第二小关无 drag 配置时，沿用同关第一小关 */
    _getDragConfig(levelIndex = this.currentLevelIndex, subIndex = this.currentSubIndex) {
        const sub = LEVEL_CONFIGS[levelIndex].subLevels[subIndex];
        if (sub.drag) return sub.drag;
        return LEVEL_CONFIGS[levelIndex].subLevels[0].drag;
    }

    _startSubLevel(levelIndex, subIndex, options = {}) {
        const { preserveDrag = false } = options;
        this.currentLevelIndex = levelIndex;
        this.currentSubIndex = subIndex;
        ReportHelper.gameReportParams.difficulty = levelIndex + 1;

        const config = this._getSubLevelConfig();
        const dragConfig = this._getDragConfig(levelIndex, subIndex);
        this.titleImage.setTexture(config.titleTexture);

        if (preserveDrag && this.dragDrop) {
            this.dragDrop.setEnabled(true);
        } else {
            if (this.dragDrop) {
                this.dragDrop.destroy();
                this.dragDrop = null;
            }

            this.matchZones = this._createMatchAreaGroups(MATCH_GROUPS);
            this.dragDrop = new DragDropComponent(this, {
                items: this._createDragItems(this.matchZones, '', dragConfig),
                dropZones: this.matchZones,
                depth: 20,
                drawZoneBounds: SHOW_MATCH_ZONE_BOUNDS,
                zoneBoundsColor: 0xff6600,
                zoneBoundsAlpha: 0.9,
                zoneBoundsFillAlpha: 0.15,
                zoneBoundsLineWidth: 2,
                onDragStart: () => this._onFirstDrag(),
            });
        }

        this._updateTrumpet();
        this.canSubmit = true;
        this._hasDraggedInSubLevel = preserveDrag;
        const submitPos = subIndex === 0 ? SUBMIT_BUTTON_SUB1 : SUBMIT_BUTTON_SUB2;
        this.submitBtn.setPosition(submitPos.x, submitPos.y);
        this.submitBtn.getMainIcon().setVisible(true);
        this._applySub2UI(subIndex === 1);
        this._syncSubmitEnabled();
    }

    _resetWenhaoDisplay() {
        this.wenhaoImage.setTexture('wenhao');
        this.wenhaoImage.setScale(1);
    }

    _applySub2UI(show) {
        this._stopOptionErrorFlash();
        this.wenhaoImage.setVisible(show);
        this.optionSlots.forEach((slot) => slot.image.setVisible(false));
        if (!show) return;

        this._selectedOptionValue = null;
        this._selectedOptionIndex = null;
        this._resetWenhaoDisplay();

        const { options = [] } = this._getSubLevelConfig();
        this._currentSub2Options = options.map((opt, index) => ({
            ...opt,
            selectedTexture: `${opt.optionTexture}_s`,
            errorTexture: `${opt.optionTexture}_r`,
            ...OPTION_SLOT_POSITIONS[index],
        }));
        this._resetAllOptionTextures();
        this._currentSub2Options.forEach((opt, index) => {
            const slot = this.optionSlots[index];
            slot.image.setPosition(opt.x, opt.y);
            slot.image.setVisible(true);
        });
    }

    _resetAllOptionTextures() {
        this._currentSub2Options.forEach((opt, index) => {
            this.optionSlots[index].image.setTexture(opt.optionTexture);
        });
    }

    _stopOptionErrorFlash() {
        if (this._optionFlashEvent) {
            this._optionFlashEvent.remove();
            this._optionFlashEvent = null;
        }
    }

    _playOptionErrorFlash(index, onComplete) {
        const opt = this._currentSub2Options[index];
        const image = this.optionSlots[index]?.image;
        if (!opt || !image) {
            onComplete?.();
            return;
        }

        this._stopOptionErrorFlash();
        let step = 0;
        const totalSteps = OPTION_ERROR_FLASH_TIMES * 2;

        const tick = () => {
            if (step >= totalSteps) {
                image.setTexture(opt.optionTexture);
                this._optionFlashEvent = null;
                onComplete?.();
                return;
            }
            image.setTexture(step % 2 === 0 ? opt.errorTexture : opt.optionTexture);
            step += 1;
            this._optionFlashEvent = this.time.delayedCall(OPTION_ERROR_FLASH_INTERVAL, tick);
        };

        tick();
    }

    _createOptionButtons() {
        this._currentSub2Options = [];
        this.optionSlots = OPTION_SLOT_POSITIONS.map((pos, index) => {
            const image = this.add.image(pos.x, pos.y, 'option_11');
            image.setInteractive({ useHandCursor: true });
            image.on('pointerup', () => this._onOptionClick(index));
            image.setVisible(false);
            return { image, index };
        });
    }

    _onOptionClick(index) {
        if (this.currentSubIndex !== 1 || !this.canSubmit || this._won) return;
        if (this._optionFlashEvent) return;
        const opt = this._currentSub2Options[index];
        if (!opt) return;
        this.sound.play('btnclick');
        this._selectedOptionIndex = index;
        this._selectedOptionValue = opt.value;
        this._resetAllOptionTextures();
        this.optionSlots[index].image.setTexture(opt.selectedTexture);
        this.wenhaoImage.setTexture(opt.answerTexture);
        this.wenhaoImage.setScale(WENHAO_SR_SCALE);
        this._syncSubmitEnabled();
    }

    _onFirstDrag() {
        if (this._hasDraggedInSubLevel) return;
        this._hasDraggedInSubLevel = true;
        this._syncSubmitEnabled();
    }

    _syncSubmitEnabled() {
        if (!this.submitBtn || this._won) return;
        let enabled;
        if (this.currentSubIndex === 1) {
            enabled = this.canSubmit && this._selectedOptionValue != null;
        } else {
            enabled = this.canSubmit && this._hasDraggedInSubLevel;
        }
        this.submitBtn.setEnabled(enabled);
    }

    _getTitleAudioKey(levelIndex = this.currentLevelIndex, subIndex = this.currentSubIndex) {
        const sub = LEVEL_CONFIGS[levelIndex].subLevels[subIndex];
        if (sub.titleAudioKey) return sub.titleAudioKey;
        return subIndex === 1 ? 'title2' : 'title1';
    }

    _updateTrumpet() {
        if (!this.trumpet) return;
        this.trumpet.stop();
        this.trumpet.setSoundKey(this._getTitleAudioKey());
        this.trumpet.showAndPlay();
    }

    _createSubmitButton() {
        this.submitBtn = new ButtonComponent(this, {
            x: SUBMIT_BUTTON_SUB1.x,
            y: SUBMIT_BUTTON_SUB1.y,
            texture: 'submit',
            clickEffectTexture: 'submit_s',
            clickDisabledTexture: 'submit_d',
            soundKey: 'btnclick',
            keepSizeOnClickEffect: true,
            onClick: () => this._onSubmitClick(),
        });
    }

    _onSubmitClick() {
        if (!this.canSubmit || this._won) return;
        if (this.currentSubIndex === 1 && this._selectedOptionValue == null) return;

        const isSub1 = this.currentSubIndex === 0;
        const isCorrect = isSub1
            ? this._isTenOnEitherSide()
            : this._isSub2AnswerCorrect();

        if (!isCorrect) {
            this.sound.play('error1');
            this.errorCnt += 1;
            ReportHelper.recordWrongTime(this.currentLevelIndex);
            if (!isSub1) {
                const wrongIndex = this._selectedOptionIndex;
                this._selectedOptionValue = null;
                this._selectedOptionIndex = null;
                this._resetWenhaoDisplay();
                this.submitBtn.setEnabled(false);
                if (wrongIndex != null) {
                    this._playOptionErrorFlash(wrongIndex, () => {
                        this._resetAllOptionTextures();
                        this._syncSubmitEnabled();
                    });
                    return;
                }
            }
            this._syncSubmitEnabled();
            return;
        }

        this._handleCorrect();
    }

    _getConfirmSpinePosition() {
        return this.currentSubIndex === 0 ? SUBMIT_BUTTON_SUB1 : SUBMIT_BUTTON_SUB2;
    }

    _handleCorrect() {
        if (!this.canSubmit || this._won) return;

        this.canSubmit = false;
        this.sound.play('correct');
        this.submitBtn.setEnabled(false);
        this.dragDrop.setEnabled(false);
        const spinePos = this._getConfirmSpinePosition();
        this.confirmSpine.setPosition(spinePos.x, spinePos.y);
        this.confirmSpine.setVisible(true);
        this.confirmSpine.animationState.setAnimation(0, 'icon flash01', true);

        this.time.delayedCall(CONFIRM_NEXT_DELAY, () => {
            this.confirmSpine.setVisible(false);
            this._advanceAfterCorrect();
        });
    }

    _countItemsInGroup(groupKey) {
        return this.dragDrop.items.filter(
            (item) => item.currentZone?.data?.groupKey === groupKey,
        ).length;
    }

    _isTenOnEitherSide() {
        return this._countItemsInGroup('left') >= SLOTS_PER_SIDE
            || this._countItemsInGroup('right') >= SLOTS_PER_SIDE;
    }

    _advanceAfterCorrect() {
        const { currentLevelIndex, currentSubIndex } = this;

        if (currentSubIndex === 0) {
            this._startSubLevel(currentLevelIndex, 1, { preserveDrag: true });
            return;
        }

        if (currentLevelIndex < LEVEL_CONFIGS.length - 1) {
            this._startSubLevel(currentLevelIndex + 1, 0);
            return;
        }

        this._won = true;
        this.submitBtn.setEnabled(false);
        if (this.trumpet?.sound?.isPlaying) this.trumpet.stop();
        GameEndComponent.show(this, {
            errorCnt: this.errorCnt,
            onBeforeShow: () => {
                this.trumpet?.stop();
            },
        });
    }

    _isSub2AnswerCorrect() {
        return this._selectedOptionValue === this._getSubLevelConfig().correctOption;
    }

    _createMatchAreaGroups(groupConfigs, zonePrefix = '') {
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
}
