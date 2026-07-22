/**
 * 翻牌游戏配置（3×3，option1~9 各一张）
 */
export const GAME_CONFIG = {
    totalCards: 9,
    cardCount: 9,
    backTexture: 'reverse',
    frontTexturePrefix: 'option',
    frontSoundKeyPrefix: 'option',
    flipDuration: 450,
    cardDepth: 10,
    cardDisplayWidth: 152,
    cardDisplayHeight: 198,
    /** 3×3 网格；gridOrigin 为左上角第一张牌的左上角坐标 */
    cols: 3,
    rows: 3,
    gridOrigin: { x: 856, y: 213 },
    gridGapX: 14,
    gridGapY: 14,
};
