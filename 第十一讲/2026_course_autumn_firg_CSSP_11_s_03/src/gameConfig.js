/**
 * 翻牌配对游戏配置（牌数量、位置等可在此修改）
 */
export const GAME_CONFIG = {
    totalCards: 8,
    pairCount: 4,
    /** 正面贴图编号：每项一对，对应 option{N}.png */
    pairTextureIds: [4, 5, 2, 8],
    backTexture: 'reverse',
    frontTexturePrefix: 'option',
    flipDuration: 450,
    mismatchDelay: 600,
    removeDuration: 300,
    cardDepth: 10,
    cardDisplayWidth: 152,
    cardDisplayHeight: 198,
    /** 2x4 网格；gridOrigin 为左上角第一张牌的左上角坐标 */
    cols: 4,
    rows: 2,
    gridOrigin: { x: 651, y: 361 },
    gridGapX: 10,
    gridGapY: 10,
    /** 星级按通关用时（秒）：≤star3 三星，≤star2 二星，否则一星 */
    starTimeSeconds: {
        star3: 30,
        star2: 60,
    },
};
