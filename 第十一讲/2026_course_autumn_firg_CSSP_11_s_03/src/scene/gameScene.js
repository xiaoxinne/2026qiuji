import { GAME_CONFIG } from '../gameConfig.js';
import MemoryCardComponent from '../components/MemoryCardComponent.js';
import GameEndComponent from '../components/GameEndComponent.js';
import TrumpetButtonComponent from '../components/TrumpetButtonComponent.js';

function shuffleArray(array) {
    const result = array.slice();
    for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

function buildCardPositions(config) {
    const colStep = config.cardDisplayWidth + (config.gridGapX ?? 0);
    const rowStep = config.cardDisplayHeight + (config.gridGapY ?? 0);
    const halfW = config.cardDisplayWidth / 2;
    const halfH = config.cardDisplayHeight / 2;
    const positions = [];
    for (let row = 0; row < config.rows; row += 1) {
        for (let col = 0; col < config.cols; col += 1) {
            // gridOrigin 为左上角；Phaser image 默认原点在中心，需换算
            const left = config.gridOrigin.x + col * colStep;
            const top = config.gridOrigin.y + row * rowStep;
            positions.push({
                x: left + halfW,
                y: top + halfH,
            });
        }
    }
    return positions.slice(0, config.totalCards);
}

function buildDeck(config) {
    const pairIds = [];
    for (let i = 1; i <= config.pairCount; i += 1) {
        pairIds.push(i, i);
    }
    return shuffleArray(pairIds);
}

export default class gameScene extends Phaser.Scene {
    constructor() {
        super('gameScene');
        ReportHelper.gameReportParams.difficulty = 0;
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

        this.openCards = [];
        this.isBusy = false;
        this.matchedPairs = 0;
        this.isGameOver = false;
        this.gameStartTime = this.time.now;

        this._initCards();
    }

    _initCards() {
        this.cards?.forEach((card) => card.destroy());
        this.cards = [];
        this.openCards = [];
        this.isBusy = false;
        this.matchedPairs = 0;

        const positions = buildCardPositions(GAME_CONFIG);
        const deck = buildDeck(GAME_CONFIG);

        deck.forEach((pairId, index) => {
            const { x, y } = positions[index];
            const frontTexture = `${GAME_CONFIG.frontTexturePrefix}${pairId}`;
            const card = new MemoryCardComponent(this, {
                x,
                y,
                pairId,
                frontTexture,
                backTexture: GAME_CONFIG.backTexture,
                depth: GAME_CONFIG.cardDepth,
                flipDuration: GAME_CONFIG.flipDuration,
                displayWidth: GAME_CONFIG.cardDisplayWidth,
                displayHeight: GAME_CONFIG.cardDisplayHeight,
                onClick: (clickedCard) => this._onCardClick(clickedCard),
            });
            this.cards.push(card);
        });
    }

    async _onCardClick(card) {
        if (this.isGameOver || this.isBusy || card.isMatched || card.isFlipping) {
            return;
        }

        if (card.isFaceUp) {
            if (this.openCards.length === 1 && this.openCards[0] === card) {
                this.isBusy = true;
                this.sound.play('btnclick');
                await card.flipToBack();
                this.openCards = [];
                this.isBusy = false;
            }
            return;
        }

        if (this.openCards.length >= 2) {
            return;
        }

        this.isBusy = true;
        this.sound.play('btnclick');
        await card.flipToFront();
        this.openCards.push(card);

        if (this.openCards.length < 2) {
            this.isBusy = false;
            return;
        }

        const [first, second] = this.openCards;
        if (first.pairId === second.pairId) {
            await Promise.all([
                first.remove(GAME_CONFIG.removeDuration),
                second.remove(GAME_CONFIG.removeDuration),
            ]);
            this.openCards = [];
            this.matchedPairs += 1;

            if (this.matchedPairs >= GAME_CONFIG.pairCount) {
                this._onGameComplete();
            }
        } else {
            await new Promise((resolve) => {
                this.time.delayedCall(GAME_CONFIG.mismatchDelay, resolve);
            });
            await Promise.all([first.flipToBack(), second.flipToBack()]);
            this.openCards = [];
        }

        this.isBusy = false;
    }

    _getStarCountByTime() {
        const elapsedSec = (this.time.now - this.gameStartTime) / 1000;
        const { star3, star2 } = GAME_CONFIG.starTimeSeconds;
        if (elapsedSec <= star3) return 3;
        if (elapsedSec <= star2) return 2;
        return 1;
    }

    _onGameComplete() {
        if (this.isGameOver) {
            return;
        }
        this.isGameOver = true;
        GameEndComponent.show(this, {
            starCount: this._getStarCountByTime(),
            delay: 800,
        });
    }
}
