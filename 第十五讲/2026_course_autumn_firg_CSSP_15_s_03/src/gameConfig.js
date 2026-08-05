/**
 * 水果忍者式切割掉落物 — 可调参数集中在此
 */
export const GAME_CONFIG = {
    /** 两道题：进度空格子数量 */
    questions: [
        { target: 5 },
        { target: 6 },
    ],

    /** 掉落物类型与随机权重：1果:2果:3果:炸弹 = 4:2:1:3 */
    spawnWeights: [
        { type: 'fruit', count: 1, weight: 4 },
        { type: 'fruit', count: 2, weight: 2 },
        { type: 'fruit', count: 3, weight: 1 },
        { type: 'bomb', count: 1, weight: 3 },
    ],

    /** 水果贴图 key（与 loadingScene 加载一致） */
    fruitTextures: [
        'fruit_apple',
        'fruit_banana',
        'fruit_lemon',
        'fruit_mangosteen',
        'fruit_orange',
        'fruit_peach',
        'fruit_strawberry',
        'fruit_watermelon',
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

    /** daoguang 刀光 spine（命中时只播一个） */
    daoGuang: {
        scale: 0.45,
        depth: 520,
    },

    /** 炸弹 spine：下落 idle，切中 baozha */
    zhadan: {
        scale: 0.7,
        depth: 20,
    },

    /** 多果组合内间距与显示尺寸（gap=0 紧挨） */
    fruitGap: 0,
    fruitDisplaySize: 96,

    /** 进度条：水平居中，y=103；格子紧挨（间距=贴图宽 106） */
    progress: {
        y: 103,
        gap: 106,
        emptyTexture: 'progress_n',
        filledTexture: 'progress_s',
        depth: 50,
    },

    /** 追尾飞向进度格时长（毫秒） */
    trailDuration: 420,

    /** 消除缩放淡出时长（毫秒） */
    eliminateDuration: 280,

    /** 通关星级按总用时（秒） */
    starTimeSeconds: {
        star3: 60,
        star2: 120,
    },
};
