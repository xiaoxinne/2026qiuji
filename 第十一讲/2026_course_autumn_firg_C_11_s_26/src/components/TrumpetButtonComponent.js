/**
 * Trumpet button component.
 * Uses a spine animation as the button visual and replays title audio on click.
 */
export default class TrumpetButtonComponent {
    /**
     * @param {Phaser.Scene} scene
     * @param {Object} options
     * @param {number} [options.x=540]
     * @param {number} [options.y=100]
     * @param {number} [options.scale=1]
     * @param {string} [options.spineDataKey='laba_data']
     * @param {string} [options.spineAtlasKey='laba_atlas']
     * @param {string} [options.soundKey='title1']
     * @param {boolean} [options.autoPlay=false]
     * @param {boolean} [options.visible=true]
     * @returns {{ image: any, sound: Phaser.Sound.BaseSound, play: Function, stop: Function, setVisible: Function, showAndPlay: Function, showIdle: Function }}
     */
    static create(scene, options = {}) {
        const x = options.x != null ? options.x : 540;
        const y = options.y != null ? options.y : 100;
        const scale = options.scale != null ? options.scale : 1;
        const spineDataKey = options.spineDataKey || 'laba_data';
        const spineAtlasKey = options.spineAtlasKey || 'laba_atlas';
        const soundKey = options.soundKey || 'title1';
        const autoPlay = options.autoPlay === true;
        const visible = options.visible !== false;

        const sound = scene.sound.add(soundKey);
        const image = scene.add.spine(x, y, spineDataKey, spineAtlasKey).setScale(scale);
        const animations = image.skeleton?.data?.animations || [];
        const animationNames = animations.map((animation) => animation.name);
        const idleAnimation = animationNames.includes('idle')
            ? 'idle'
            : (animationNames[0] || 'animation');
        const talkAnimation = animationNames.includes('talk')
            ? 'talk'
            : idleAnimation;

        const playIdle = () => {
            image.animationState.setAnimation(0, idleAnimation, true);
        };

        const playTalkWithSound = () => {
            image.animationState.setAnimation(0, talkAnimation, true);
            if (sound.isPlaying) sound.stop();
            sound.play();
        };

        const stop = () => {
            if (sound.isPlaying) sound.stop();
        };

        playIdle();
        sound.on('complete', playIdle);
        sound.on('stop', playIdle);

        image.setVisible(visible);
        if (autoPlay && visible) {
            playTalkWithSound();
        }

        image.setInteractive({ useHandCursor: true });
        image.on('pointerdown', () => {
            if (sound.isPlaying) return;
            scene.sound.play('btnclick');
            playTalkWithSound();
        });

        return {
            image,
            sound,
            play: playTalkWithSound,
            stop,
            setVisible: (value) => {
                image.setVisible(value);
            },
            showAndPlay: () => {
                image.setVisible(true);
                playTalkWithSound();
            },
            showIdle: () => {
                image.setVisible(true);
                playIdle();
            },
        };
    }
}
