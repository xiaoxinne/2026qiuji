/**
 * 游戏结束界面组件：半透明遮罩 + 结束 Spine + 星级 Spine + 点击继续。
 */
export default class GameEndComponent {
    static show(scene, options = {}) {
        const errorCnt = options.errorCnt != null ? options.errorCnt : 0;
        const onBeforeShow = options.onBeforeShow || (() => {});
        const delay = options.delay != null ? options.delay : 300;
        const maskColor = options.maskColor != null ? options.maskColor : 0x000000;
        const maskAlpha = options.maskAlpha != null ? options.maskAlpha : 0.5;

        const endSpineOpt = options.endSpine || {};
        const endSpine = {
            x: endSpineOpt.x != null ? endSpineOpt.x : 0,
            y: endSpineOpt.y != null ? endSpineOpt.y : 0,
            dataKey: endSpineOpt.dataKey || 'end_data',
            atlasKey: endSpineOpt.atlasKey || 'end_atlas',
            idleAnim: endSpineOpt.idleAnim || 'idle1',
            jizhangAnim: endSpineOpt.jizhangAnim || 'touch',
        };

        const winSpineOpt = options.winSpine || {};
        const winSpine = {
            x: winSpineOpt.x != null ? winSpineOpt.x : 960,
            y: winSpineOpt.y != null ? winSpineOpt.y : 200,
            dataKey: winSpineOpt.dataKey || 'win_data',
            atlasKey: winSpineOpt.atlasKey || 'win_atlas',
            star1: winSpineOpt.star1 || 'star1',
            star2: winSpineOpt.star2 || 'star2',
            star3: winSpineOpt.star3 || 'star3',
        };

        const btnAreaOpt = options.btnArea || {};
        const btnArea = {
            x: btnAreaOpt.x != null ? btnAreaOpt.x : 400,
            y: btnAreaOpt.y != null ? btnAreaOpt.y : 200,
            width: btnAreaOpt.width != null ? btnAreaOpt.width : 700,
            height: btnAreaOpt.height != null ? btnAreaOpt.height : 700,
        };

        const soundJizhang = options.soundJizhang || 'jizhang';
        const soundGiveMeFive = options.soundGiveMeFive || 'givemefive';
        const depthBase = options.depthBase != null ? options.depthBase : 1000;

        onBeforeShow();

        scene.time.delayedCall(delay, () => {
            const jizhang_sound = scene.sound.add(soundJizhang);
            jizhang_sound.play();

            const graphics = scene.add.graphics();
            graphics.fillStyle(maskColor, maskAlpha);
            graphics.fillRect(0, 0, scene.cameras.main.width, scene.cameras.main.height);
            graphics.setDepth(depthBase);
            graphics.setInteractive(
                new Phaser.Geom.Rectangle(0, 0, scene.cameras.main.width, scene.cameras.main.height),
                Phaser.Geom.Rectangle.Contains,
            );

            const endSpineObj = scene.add.spine(endSpine.x, endSpine.y, endSpine.dataKey, endSpine.atlasKey);
            endSpineObj.setDepth(depthBase + 1);
            endSpineObj.animationState.setAnimation(0, endSpine.idleAnim, true);

            const winSpineObj = scene.add.spine(winSpine.x, winSpine.y, winSpine.dataKey, winSpine.atlasKey);
            winSpineObj.setDepth(depthBase + 2);
            const tier = errorCnt <= 2 ? 0 : errorCnt <= 4 ? 1 : 2;
            const starAnim = [winSpine.star3, winSpine.star2, winSpine.star1][tier];
            winSpineObj.animationState.setAnimation(0, starAnim, false);
            ReportHelper.gameReportParams.score = [3, 2, 1][tier];

            const btn = scene.add.graphics();
            btn.fillStyle(0xffffff, 0);
            btn.fillRect(btnArea.x, btnArea.y, btnArea.width, btnArea.height);
            btn.setDepth(depthBase + 3);
            btn.setInteractive(
                new Phaser.Geom.Rectangle(btnArea.x, btnArea.y, btnArea.width, btnArea.height),
                Phaser.Geom.Rectangle.Contains,
            );

            ReportHelper.gameReportParams.is_correct = true;
            ReportHelper.report('game_answer', {});

            let ending = false;
            btn.on('pointerdown', () => {
                if (ending) return;
                ending = true;
                endSpineObj.animationState.setAnimation(0, endSpine.jizhangAnim, false);
                jizhang_sound.stop();
                scene.sound.play(soundGiveMeFive);
            });
        });
    }
}
