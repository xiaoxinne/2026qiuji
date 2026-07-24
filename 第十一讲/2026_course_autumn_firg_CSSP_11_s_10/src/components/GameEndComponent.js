/**
 * 游戏结束界面：对齐 C_1_s_15
 * 遮罩 → jieshu in → in_idle + 星级 → 点击 touch → touch_idle
 */
export default class GameEndComponent {
    static show(scene, options = {}) {
        const starCount = options.starCount != null
            ? options.starCount
            : (options.errorCnt != null
                ? (options.errorCnt <= 2 ? 3 : options.errorCnt <= 4 ? 2 : 1)
                : 3);
        const onBeforeShow = options.onBeforeShow || (() => {});
        const delay = options.delay != null ? options.delay : 800;
        const maskColor = options.maskColor != null ? options.maskColor : 0x000000;
        const maskAlpha = options.maskAlpha != null ? options.maskAlpha : 0.5;

        const endSpineOpt = options.endSpine || {};
        const endSpine = {
            x: endSpineOpt.x != null ? endSpineOpt.x : 0,
            y: endSpineOpt.y != null ? endSpineOpt.y : 0,
            dataKey: endSpineOpt.dataKey || 'end_data',
            atlasKey: endSpineOpt.atlasKey || 'end_atlas',
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
            x: btnAreaOpt.x != null ? btnAreaOpt.x : 600,
            y: btnAreaOpt.y != null ? btnAreaOpt.y : 300,
            width: btnAreaOpt.width != null ? btnAreaOpt.width : 700,
            height: btnAreaOpt.height != null ? btnAreaOpt.height : 700,
        };

        const soundJizhang = options.soundJizhang || 'jizhang';
        const soundGiveMeFive = options.soundGiveMeFive || 'givemefive';
        const depthBase = options.depthBase != null ? options.depthBase : 800;

        onBeforeShow();

        const endSpineObj = scene.add.spine(endSpine.x, endSpine.y, endSpine.dataKey, endSpine.atlasKey);
        endSpineObj.setVisible(false);
        endSpineObj.setDepth(depthBase + 199);
        endSpineObj.animationState.setAnimation(0, 'in', false);
        endSpineObj.animationState.timeScale = 0;

        scene.time.delayedCall(delay, () => {
            scene.sound.stopAll();
            const jizhang_sound = scene.sound.add(soundJizhang);
            jizhang_sound.play();

            const graphics = scene.add.graphics();
            graphics.fillStyle(maskColor, maskAlpha);
            graphics.setDepth(depthBase);
            graphics.fillRect(0, 0, scene.cameras.main.width, scene.cameras.main.height);
            graphics.setInteractive(
                new Phaser.Geom.Rectangle(0, 0, scene.cameras.main.width, scene.cameras.main.height),
                Phaser.Geom.Rectangle.Contains,
            );

            endSpineObj.setVisible(true);
            endSpineObj.animationState.timeScale = 1;
            endSpineObj.animationState.setAnimation(0, 'in', false);

            let starsShown = false;
            let ending = false;

            const showStars = () => {
                if (starsShown) return;
                starsShown = true;

                const winSpineObj = scene.add.spine(winSpine.x, winSpine.y, winSpine.dataKey, winSpine.atlasKey);
                winSpineObj.setDepth(depthBase + 199);
                const starAnim = starCount >= 3
                    ? winSpine.star3
                    : starCount === 2
                        ? winSpine.star2
                        : winSpine.star1;
                winSpineObj.animationState.setAnimation(0, starAnim, false);

                ReportHelper.gameReportParams.score = starCount >= 3 ? 3 : starCount === 2 ? 2 : 1;
                ReportHelper.gameReportParams.is_correct = true;
                ReportHelper.report('game_answer', {});

                const btn = scene.add.graphics();
                btn.fillStyle(0xffffff, 0);
                btn.fillRect(btnArea.x, btnArea.y, btnArea.width, btnArea.height);
                btn.setDepth(depthBase + 200);
                btn.setInteractive(
                    new Phaser.Geom.Rectangle(btnArea.x, btnArea.y, btnArea.width, btnArea.height),
                    Phaser.Geom.Rectangle.Contains,
                );

                btn.on('pointerdown', () => {
                    if (ending) return;
                    ending = true;
                    endSpineObj.animationState.setAnimation(0, 'touch', false);
                    jizhang_sound.stop();
                    scene.sound.play(soundGiveMeFive);
                });
            };

            endSpineObj.animationState.addListener({
                complete: (entry) => {
                    if (entry.animation.name === 'in') {
                        showStars();
                        endSpineObj.animationState.setAnimation(0, 'in_idle', true);
                    } else if (entry.animation.name === 'touch') {
                        endSpineObj.animationState.setAnimation(0, 'touch_idle', true);
                    }
                },
            });
        });
    }
}
