/**
 * 水果忍者式切割掉落物 — 可调参数集中在此
 */
export const GAME_CONFIG = {
    /** 两道题：进度空格子数量 */
    questions: [
        { target: 5 },
        { target: 6 },
    ],

    /** 掉落物类型与随机权重：1箱:2箱:3箱:炸弹 = 4:2:1:3 */
    spawnWeights: [
        { type: 'box', count: 1, weight: 4 },
        { type: 'box', count: 2, weight: 2 },
        { type: 'box', count: 3, weight: 1 },
        { type: 'bomb', count: 1, weight: 3 },
    ],

    /** 匀速下坠速度（像素/秒），可调 */
    fallSpeed: 220,

    /** 生成间隔（毫秒） */
    spawnInterval: 1100,

    /** 同时场上最多掉落物数量 */
    maxAliveItems: 6,

    /** 生成区域（物品中心 x 随机范围，y 为屏幕上方） */
    spawnX: { min: 360, max: 1560 },
    spawnY: -120,

    /** 落到此 y 以下销毁 */
    despawnY: 1180,

    /** 切割判定：指针轨迹与物品包围盒膨胀（尽量贴合视觉，避免隔空命中） */
    hitPadding: 4,

    /** 单次滑动最短距离（像素），过短不计切割 */
    slashMinDistance: 36,

    /** 刀光仅保留最近这段时间的轨迹（毫秒），避免铺成常驻切割线 */
    slashTrailLifeMs: 90,

    /** 按住但停止移动后，多久清掉刀光（毫秒） */
    slashIdleClearMs: 50,

    /** 箱子贴图（占位，后续可替换为正式素材 key） */
    boxTexture: 'item_box',
    bombTexture: 'item_bomb',

    /** 多箱组合内箱子间距 */
    boxGap: 12,
    boxDisplaySize: 96,

    /** 进度条：首格中心、间距 */
    progress: {
        startX: 760,
        y: 200,
        gap: 88,
        emptyTexture: 'progress_empty',
        filledTexture: 'progress_filled',
        depth: 50,
    },

    /** 追尾飞向进度格时长（毫秒） */
    trailDuration: 420,

    /** 消除缩放淡出时长（毫秒） */
    eliminateDuration: 280,

    /** 炸弹错误闪烁 */
    bombFlashTimes: 3,
    bombFlashInterval: 120,

    /** 通关星级按总用时（秒） */
    starTimeSeconds: {
        star3: 60,
        star2: 120,
    },
};
