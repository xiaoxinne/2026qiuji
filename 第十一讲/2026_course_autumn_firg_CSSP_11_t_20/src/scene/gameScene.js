import { GAME_CONFIG } from '../gameConfig.js';
import MemoryCardComponent from '../components/MemoryCardComponent.js';

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
    const ids = Array.from({ length: config.cardCount }, (_, i) => i + 1);
    return shuffleArray(ids);
}

function getCardSoundKey(config, cardId) {
    return `${config.frontSoundKeyPrefix}${cardId}`;
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
        };
        document.addEventListener('visibilitychange', this._onVisibilityChange);

        this.add.image(960, 540, 'game_bg');

        this.isBusy = false;
        this.activeCard = null;
        this._initCards();
    }

    _initCards() {
        this.cards?.forEach((card) => card.destroy());
        this.cards = [];
        this.isBusy = false;
        this.activeCard = null;

        const positions = buildCardPositions(GAME_CONFIG);
        const deck = buildDeck(GAME_CONFIG);

        deck.forEach((cardId, index) => {
            const { x, y } = positions[index];
            const frontTexture = `${GAME_CONFIG.frontTexturePrefix}${cardId}`;
            const card = new MemoryCardComponent(this, {
                x,
                y,
                pairId: cardId,
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
        if (this.isBusy || card.isFlipping) {
            return;
        }

        this.isBusy = true;

        if (card.isFaceUp) {
            await card.flipToBack();
            if (this.activeCard === card) {
                this.activeCard = null;
            }
            this.isBusy = false;
            return;
        }

        if (this.activeCard && this.activeCard !== card) {
            await this.activeCard.flipToBack();
        }

        await card.flipToFront();
        this.activeCard = card;
        this.sound.stopAll();
        this.sound.play(getCardSoundKey(GAME_CONFIG, card.pairId));

        this.isBusy = false;
    }
}
