import { GAME_CONFIG } from '../gameConfig.js';
import FallingItemComponent from '../components/FallingItemComponent.js';
import ProgressBarComponent from '../components/ProgressBarComponent.js';
import SlashCutComponent from '../components/SlashCutComponent.js';
import GameEndComponent from '../components/GameEndComponent.js';
import TrumpetButtonComponent from '../components/TrumpetButtonComponent.js';

function pickSpawnType() {
    const list = GAME_CONFIG.spawnWeights;
    const total = list.reduce((sum, item) => sum + item.weight, 0);
    let r = Math.random() * total;
    for (const item of list) {
        r -= item.weight;
        if (r <= 0) {
            return { type: item.type, count: item.count };
        }
    }
    return { type: list[0].type, count: list[0].count };
}

export default class gameScene extends Phaser.Scene {
    constructor() {
        super('gameScene');
        ReportHelper.gameReportParams.difficulty = 0;
        ReportHelper.gameReportParams.questionCount = GAME_CONFIG.questions.length;
        ReportHelper.gameReportParams.question_id = '2026_course_autumn_firg_CSSP_15_s_03';
        ReportHelper.resetWrongTimes();
        ReportHelper.report('game_start', {
            difficulty: 0,
        });
    }

    create() {
        this._onVisibilityChange = () => {
            this.sound.stopAll();
            this.trumpet?.showIdle?.();
        };
        document.addEventListener('visibilitychange', this._onVisibilityChange);

        this.add.image(960, 540, 'game_bg');
        this.add.image(101, 67, 'jiaobiao');
        this.add.image(960, 92, 'title1');

        this.trumpet = TrumpetButtonComponent.create(this, {
            x: 155,
            y: 910,
            soundKey: 'title1',
            autoPlay: true,
        });

        this.questionIndex = 0;
        this.isGameOver = false;
        this.isQuestionBusy = false;
        this.fallItems = [];
        this.pendingFills = 0;
        this.fillQueue = Promise.resolve();
        this.errorCnt = 0;
        this.gameStartTime = this.time.now;
        this._ensurePlaceholderTextures();

        const firstTarget = GAME_CONFIG.questions[0].target;
        this.progressBar = new ProgressBarComponent(this, { target: firstTarget });

        this.slash = new SlashCutComponent(this, {
            getItems: () => this.fallItems,
            onSlashHit: (item, x, y) => this._onItemSliced(item, x, y),
        });

        this.spawnTimer = this.time.addEvent({
            delay: GAME_CONFIG.spawnInterval,
            loop: true,
            callback: () => this._spawnItem(),
        });

        this._spawnItem();
    }

    /** 占位贴图：正式素材到位后可删，改为 loadingScene 加载 */
    _ensurePlaceholderTextures() {
        if (this.textures.exists(GAME_CONFIG.boxTexture)) return;

        const size = 128;
        const g = this.make.graphics({ x: 0, y: 0, add: false });

        // 箱子
        g.clear();
        g.fillStyle(0xc47a3a, 1);
        g.fillRoundedRect(8, 8, size - 16, size - 16, 14);
        g.lineStyle(6, 0x8a4a1a, 1);
        g.strokeRoundedRect(8, 8, size - 16, size - 16, 14);
        g.fillStyle(0xe8b06a, 1);
        g.fillRoundedRect(28, 28, size - 56, 28, 8);
        g.generateTexture(GAME_CONFIG.boxTexture, size, size);

        // 炸弹
        g.clear();
        g.fillStyle(0x2a2a2a, 1);
        g.fillCircle(size / 2, size / 2 + 8, 46);
        g.lineStyle(4, 0xff4444, 1);
        g.strokeCircle(size / 2, size / 2 + 8, 46);
        g.lineStyle(5, 0xffaa33, 1);
        g.beginPath();
        g.moveTo(size / 2 + 20, size / 2 - 30);
        g.lineTo(size / 2 + 36, size / 2 - 48);
        g.strokePath();
        g.fillStyle(0xffdd55, 1);
        g.fillCircle(size / 2 + 38, size / 2 - 50, 8);
        g.generateTexture(GAME_CONFIG.bombTexture, size, size);

        // 进度空格
        g.clear();
        g.fillStyle(0xffffff, 0.35);
        g.fillRoundedRect(4, 4, 72, 72, 12);
        g.lineStyle(4, 0xffffff, 0.8);
        g.strokeRoundedRect(4, 4, 72, 72, 12);
        g.generateTexture(GAME_CONFIG.progress.emptyTexture, 80, 80);

        // 进度实心
        g.clear();
        g.fillStyle(0xffc14a, 1);
        g.fillRoundedRect(4, 4, 72, 72, 12);
        g.lineStyle(4, 0xffffff, 1);
        g.strokeRoundedRect(4, 4, 72, 72, 12);
        g.fillStyle(0xc47a3a, 1);
        g.fillRoundedRect(22, 22, 36, 36, 8);
        g.generateTexture(GAME_CONFIG.progress.filledTexture, 80, 80);

        g.destroy();
    }

    update(_time, delta) {
        if (this.isGameOver || this.isQuestionBusy) return;

        const dy = (GAME_CONFIG.fallSpeed * delta) / 1000;
        for (let i = this.fallItems.length - 1; i >= 0; i -= 1) {
            const item = this.fallItems[i];
            if (!item.isAlive) {
                this.fallItems.splice(i, 1);
                continue;
            }
            item.setPosition(item.x, item.y + dy);
            if (item.y > GAME_CONFIG.despawnY) {
                item.destroy();
                this.fallItems.splice(i, 1);
            }
        }
    }

    _spawnItem() {
        if (this.isGameOver || this.isQuestionBusy) return;
        const alive = this.fallItems.filter((it) => it.isAlive).length;
        if (alive >= GAME_CONFIG.maxAliveItems) return;

        const pick = pickSpawnType();
        const x = Phaser.Math.Between(GAME_CONFIG.spawnX.min, GAME_CONFIG.spawnX.max);
        const item = new FallingItemComponent(this, {
            x,
            y: GAME_CONFIG.spawnY,
            type: pick.type,
            count: pick.count,
        });
        this.fallItems.push(item);
    }

    _effectiveRemaining() {
        return Math.max(0, this.progressBar.remaining - this.pendingFills);
    }

    async _onItemSliced(item) {
        if (this.isGameOver || this.isQuestionBusy || !item.isAlive || item.isHit) {
            return;
        }

        // 立刻占住，避免同一刀多段重复命中
        item.isHit = true;

        if (item.type === 'bomb') {
            this.sound.play('error1');
            this.errorCnt += 1;
            ReportHelper.recordWrongTime(this.questionIndex);
            this._playSpineEffect(item.x, item.y);
            await item.playBombError();
            this._removeItem(item);
            return;
        }

        // 箱子：先播消除
        this.sound.play('correct');
        const fromX = item.x;
        const fromY = item.y;
        const boxCount = item.count;
        const remaining = this._effectiveRemaining();

        /**
         * 进度将满且切割数 > 剩余格数时（如目标5且已填4，切2/3箱）：
         * 只播消除，不追尾、不填格
         */
        const canFill = boxCount <= remaining && remaining > 0;
        if (canFill) {
            this.pendingFills += boxCount;
        }

        await item.playEliminate();
        this._removeItem(item);

        if (!canFill) {
            return;
        }

        await this._enqueueFills(fromX, fromY, boxCount);

        if (this.progressBar.isFull && this.pendingFills === 0) {
            this._onQuestionComplete();
        }
    }

    /** 串行填充，避免多刀同时追尾导致格子错位 */
    _enqueueFills(fromX, fromY, boxCount) {
        const run = async () => {
            for (let i = 0; i < boxCount; i += 1) {
                if (this.progressBar.isFull) {
                    this.pendingFills = Math.max(0, this.pendingFills - (boxCount - i));
                    break;
                }
                const targetPos = this.progressBar.getNextFillPosition();
                if (!targetPos) {
                    this.pendingFills = Math.max(0, this.pendingFills - (boxCount - i));
                    break;
                }
                await this._playTrailToProgress(fromX, fromY, targetPos.x, targetPos.y);
                this.progressBar.fillOne();
                this.pendingFills = Math.max(0, this.pendingFills - 1);
                this.sound.play('put');
            }
        };
        const next = this.fillQueue.then(run, run);
        this.fillQueue = next.catch(() => {});
        return next;
    }

    _removeItem(item) {
        const idx = this.fallItems.indexOf(item);
        if (idx >= 0) this.fallItems.splice(idx, 1);
    }

    /**
     * 追尾动效：spine 从切割点飞到进度格
     */
    _playTrailToProgress(fromX, fromY, toX, toY) {
        return new Promise((resolve) => {
            const trail = this.add.spine(
                fromX,
                fromY,
                'effect_jinengzidan_data',
                'effect_jinengzidan_atlas',
            );
            trail.setDepth(600);
            const data = trail.skeleton?.data || trail.animationState?.data?.skeletonData;
            const anims = data?.animations;
            const animName = anims && anims.length > 0 ? anims[0].name : 'animation';
            trail.animationState.setAnimation(0, animName, true);

            this.tweens.add({
                targets: trail,
                x: toX,
                y: toY,
                duration: GAME_CONFIG.trailDuration,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    trail.destroy();
                    resolve();
                },
            });
        });
    }

    _playSpineEffect(x, y, onComplete) {
        const effectSpine = this.add.spine(
            x,
            y,
            'effect_jinengzidan_data',
            'effect_jinengzidan_atlas',
        );
        effectSpine.setDepth(1000);
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

    _clearFallItems() {
        this.fallItems.forEach((item) => item.destroy());
        this.fallItems = [];
    }

    _onQuestionComplete() {
        if (this.isQuestionBusy || this.isGameOver) return;
        this.isQuestionBusy = true;
        this.slash.setEnabled(false);
        this._clearFallItems();

        const nextIndex = this.questionIndex + 1;
        if (nextIndex >= GAME_CONFIG.questions.length) {
            this._onGameComplete();
            return;
        }

        this.time.delayedCall(600, () => {
            this.questionIndex = nextIndex;
            this.pendingFills = 0;
            this.fillQueue = Promise.resolve();
            const target = GAME_CONFIG.questions[nextIndex].target;
            this.progressBar.reset(target);
            this.isQuestionBusy = false;
            this.slash.setEnabled(true);
            this._spawnItem();
        });
    }

    _getStarCountByTime() {
        const elapsedSec = (this.time.now - this.gameStartTime) / 1000;
        const { star3, star2 } = GAME_CONFIG.starTimeSeconds;
        if (elapsedSec <= star3) return 3;
        if (elapsedSec <= star2) return 2;
        return 1;
    }

    _onGameComplete() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.slash.setEnabled(false);
        this.spawnTimer?.remove(false);
        this._clearFallItems();
        this.trumpet?.stop?.();

        GameEndComponent.show(this, {
            starCount: this._getStarCountByTime(),
            errorCnt: this.errorCnt,
            delay: 500,
        });
    }
}
