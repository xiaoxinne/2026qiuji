import loadingScene from './scene/loadingScene.js';
import startScene from './scene/startScene.js';
import gameScene from './scene/gameScene.js';

const config = {
    type: Phaser.AUTO,
    width: 1920,
    height: 1080,
    parent: 'game-container',
    backgroundColor: '#000000',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    plugins: {
        scene: [
            {
                key: 'spine.SpinePlugin',
                plugin: spine.SpinePlugin,
                mapping: 'spine'
            }
        ]
    },
    scene: [loadingScene, startScene, gameScene]
};

new Phaser.Game(config);
