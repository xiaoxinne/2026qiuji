/**
 * 按钮组件（专用组件，性能优化版）
 * 
 * 专门用于按钮功能，只包含点击相关逻辑
 * 性能优化：
 * 1. 移除所有拖拽相关代码和条件判断
 * 2. 简化点击处理逻辑
 * 3. 减少内存占用
 */
export default class ButtonComponent {
    constructor(scene, config) {
        const {
            x = 0,
            y = 0,
            texture = '', // 图片资源key
            clickEffectTexture = null, // 点击效果图片资源key（可选）
            clickDisabledTexture = null, // 点击禁用效果图片资源key（可选）
            onClick = null, // 点击回调方法（可选）
            keepSelected = false, // 点击完成后是否保持选中状态（true=保持选中，false=恢复初始状态）
            soundKey = null, // 按钮点击音效资源key（可选）
            keepSizeOnClickEffect = false // 按下时保持原尺寸不放大（高亮图与常态图尺寸不一致时使用）
        } = config;

        this.scene = scene;
        this.texture = texture;
        this.originalX = x;
        this.originalY = y;
        this.keepSizeOnClickEffect = keepSizeOnClickEffect;

        // 创建主图标
        this.mainIcon = scene.add.image(x, y, texture);
        this.mainIcon.originalX = x;
        this.mainIcon.originalY = y;
        this.originalTexture = texture;
        if (keepSizeOnClickEffect) {
            this._originalDisplayWidth = this.mainIcon.displayWidth;
            this._originalDisplayHeight = this.mainIcon.displayHeight;
        }

        // 常量
        this.CLICK_THRESHOLD = 10; // 点击判断阈值（像素）

        // 点击效果纹理
        this.clickEffectTexture = (!clickEffectTexture || clickEffectTexture === '') 
            ? texture 
            : clickEffectTexture;

        // 点击禁用纹理
        this.clickDisabledTexture = clickDisabledTexture || null;

        // 点击相关状态
        this.clickStartX = null;
        this.clickStartY = null;
        this.onClickCallback = onClick;
        this.keepSelected = keepSelected; // 是否保持选中状态
        this.isSelected = false; // 当前选中状态（仅在 keepSelected=true 时使用）
        this.isSelectedBeforeClick = false; // 记录按下前的选中状态（用于恢复）

        // 音效相关状态
        this.soundKey = soundKey; // 音效资源key
        this.isPlayingSound = false; // 音效是否正在播放
        this.soundInstance = null; // 音效实例引用
        this.delayCallTimer = null; // 延迟调用定时器引用

        // 设置点击交互
        this.mainIcon.setInteractive();
        this._setupClickEvents();
    }

    /**
     * 设置点击事件
     * 行为：
     * - keepSelected=false：按下时显示选中状态，松开后恢复初始状态
     * - keepSelected=true：按下时显示选中状态，松开后如果未选中则变为选中并保持
     */
    _setupClickEvents() {
        // 点击开始事件（按下时显示选中状态）
        this.mainIcon.on('pointerdown', (pointer) => {
            // 如果音效正在播放，忽略点击（防止重复点击）
            if (this.isPlayingSound || (this.soundInstance && this.soundInstance.isPlaying)) {
                return;
            }

            this.clickStartX = pointer.x;
            this.clickStartY = pointer.y;
            
            // 记录按下前的选中状态（用于恢复）
            this.isSelectedBeforeClick = this.isSelected;
            
            // 按下时总是显示选中状态（B.png）
            this.showClickEffect();
        });

        // 点击结束事件
        this.mainIcon.on('pointerup', (pointer) => {
            if (this.clickStartX === null || this.clickStartY === null) {
                this._resetClickState();
                return;
            }

            // 计算移动距离（使用平方距离，避免开方）
            const dx = pointer.x - this.clickStartX;
            const dy = pointer.y - this.clickStartY;
            const distanceSquared = dx * dx + dy * dy;
            const thresholdSquared = this.CLICK_THRESHOLD * this.CLICK_THRESHOLD;

            // 如果移动距离小于阈值，认为是有效点击
            if (distanceSquared < thresholdSquared) {
                // 如果音效正在播放，忽略点击（防止重复点击）
                if (this.isPlayingSound || (this.soundInstance && this.soundInstance.isPlaying)) {
                    // 恢复按下前的状态
                    if (this.keepSelected) {
                        this.isSelected = this.isSelectedBeforeClick;
                        if (this.isSelected) {
                            this.showClickEffect();
                        } else {
                            this.hideClickEffect();
                        }
                    } else {
                        this.hideClickEffect();
                    }
                    this._resetClickState();
                    return;
                }

                // 播放音效（如果配置了音效）
                if (this.soundKey) {
                    this.playSound();
                }

                if (this.keepSelected) {
                    // 保持选中模式：如果未选中，则变为选中并保持；如果已选中，则保持选中
                    if (!this.isSelected) {
                        // 从未选中变为选中
                        this.isSelected = true;
                        this.showClickEffect();
                    } else {
                        // 已选中，保持选中状态（显示B.png）
                        this.showClickEffect();
                    }
                } else {
                    // 不保持选中模式：恢复初始状态
                    this.hideClickEffect();
                }

                // 执行点击回调
                if (this.onClickCallback) {
                    this.onClickCallback(this.mainIcon, pointer, this.isSelected);
                }
            } else {
                // 移动距离过大，恢复按下前的状态
                if (this.keepSelected) {
                    // 保持选中模式：恢复按下前的选中状态
                    if (this.isSelectedBeforeClick) {
                        this.showClickEffect();
                    } else {
                        this.hideClickEffect();
                    }
                } else {
                    // 不保持选中模式：恢复初始状态
                    this.hideClickEffect();
                }
            }

            // 重置点击状态
            this._resetClickState();
        });

        // 鼠标移出事件
        this.mainIcon.on('pointerout', (pointer) => {
            if (this.clickStartX !== null && this.clickStartY !== null) {
                if (this.keepSelected) {
                    // 保持选中模式：恢复按下前的选中状态
                    if (this.isSelectedBeforeClick) {
                        this.showClickEffect();
                    } else {
                        this.hideClickEffect();
                    }
                } else {
                    // 不保持选中模式：恢复初始状态
                    this.hideClickEffect();
                }
            }
        });
    }

    /**
     * 重置点击状态
     */
    _resetClickState() {
        this.clickStartX = null;
        this.clickStartY = null;
    }

    /**
     * 显示点击效果（选中状态）
     */
    showClickEffect() {
        if (!this.clickEffectTexture || !this.mainIcon) {
            return;
        }

        try {
            this.mainIcon.setTexture(this.clickEffectTexture);
            if (this.keepSizeOnClickEffect && this._originalDisplayWidth != null) {
                this.mainIcon.setDisplaySize(this._originalDisplayWidth, this._originalDisplayHeight);
            }
        } catch (error) {
            // 静默处理
        }
    }

    /**
     * 隐藏点击效果（取消选中状态）
     */
    hideClickEffect() {
        if (!this.mainIcon || !this.originalTexture) {
            return;
        }

        try {
            this.mainIcon.setTexture(this.originalTexture);
        } catch (error) {
            if (this.texture) {
                try {
                    this.mainIcon.setTexture(this.texture);
                } catch (e) {
                    // 静默处理
                }
            }
        }
    }

    /**
     * 获取主图标对象
     */
    getMainIcon() {
        return this.mainIcon;
    }

    /**
     * 设置位置
     */
    setPosition(x, y) {
        this.originalX = x;
        this.originalY = y;
        if (this.mainIcon) {
            this.mainIcon.x = x;
            this.mainIcon.y = y;
            this.mainIcon.originalX = x;
            this.mainIcon.originalY = y;
        }
    }

    /**
     * 获取选中状态
     * 仅在 keepSelected=true 时有效
     */
    getSelected() {
        return this.isSelected;
    }

    /**
     * 设置选中状态
     * 仅在 keepSelected=true 时有效
     */
    setSelected(selected) {
        if (!this.keepSelected) {
            // 如果不保持选中模式，此方法无效
            return;
        }

        if (this.isSelected === selected) {
            return;
        }

        this.isSelected = selected;
        if (this.isSelected) {
            this.showClickEffect();
        } else {
            this.hideClickEffect();
        }
    }

    /**
     * 播放音效
     */
    playSound() {
        if (!this.soundKey || !this.scene.sound) {
            return;
        }

        // 双重检查：如果音效正在播放，直接返回（防止重复播放）
        if (this.isPlayingSound || (this.soundInstance && this.soundInstance.isPlaying)) {
            return;
        }

        // 立即设置 isPlayingSound 为 true，防止在播放过程中再次调用
        this.isPlayingSound = true;

        // 清理之前的延迟调用（如果存在）
        if (this.delayCallTimer) {
            this.delayCallTimer.remove();
            this.delayCallTimer = null;
        }

        // 停止并销毁之前的音效实例（如果存在且不在播放）
        if (this.soundInstance && !this.soundInstance.isPlaying) {
            this.soundInstance.destroy();
            this.soundInstance = null;
        }

        // 创建新的音效实例并播放
        this.soundInstance = this.scene.sound.add(this.soundKey);

        // 监听音效播放完成事件（如果支持）
        if (this.soundInstance && this.soundInstance.on) {
            this.soundInstance.once('complete', () => {
                this.isPlayingSound = false;
                if (this.delayCallTimer) {
                    this.delayCallTimer.remove();
                    this.delayCallTimer = null;
                }
            });
        }

        // 播放音效
        if (this.soundInstance) {
            this.soundInstance.play();

            // 获取音效时长（毫秒）
            const duration = this.soundInstance.duration || 1000; // 默认1秒

            // 延迟调用，在音效播放完成后重置 isPlayingSound（作为备用方案）
            this.delayCallTimer = this.scene.time.delayedCall(duration, () => {
                this.isPlayingSound = false;
                this.delayCallTimer = null;
            });
        } else {
            // 如果创建音效实例失败，立即重置状态
            this.isPlayingSound = false;
        }
    }

    /**
     * 设置点击回调
     */
    setOnClick(onClick) {
        this.onClickCallback = onClick;
    }

    /**
     * 设置音效
     * @param {string} soundKey - 音效资源key
     */
    setSound(soundKey) {
        this.soundKey = soundKey;
    }

    /**
     * 设置按钮是否可点击
     * @param {boolean} enabled - true=可点击，false=不可点击
     */
    setEnabled(enabled) {
        if (!this.mainIcon) return;

        if (enabled) {
            // 恢复可点击状态
            this.mainIcon.setInteractive();
            // 恢复纹理：如果当前是选中状态则显示选中纹理，否则显示原始纹理
            if (this.keepSelected && this.isSelected) {
                this.showClickEffect();
            } else {
                this.hideClickEffect();
            }
        } else {
            // 禁用点击
            this.mainIcon.disableInteractive();
            // 如果有禁用纹理，切换为禁用纹理
            if (this.clickDisabledTexture) {
                this.mainIcon.setTexture(this.clickDisabledTexture);
            }
        }
    }

    /**
     * 销毁组件
     */
    destroy() {
        // 移除点击事件监听器
        if (this.mainIcon) {
            this.mainIcon.off('pointerdown');
            this.mainIcon.off('pointerup');
            this.mainIcon.off('pointerout');
        }

        // 清理延迟调用定时器
        if (this.delayCallTimer) {
            this.delayCallTimer.remove();
            this.delayCallTimer = null;
        }

        // 停止并销毁音效实例
        if (this.soundInstance) {
            if (this.soundInstance.isPlaying) {
                this.soundInstance.stop();
            }
            this.soundInstance.destroy();
            this.soundInstance = null;
        }

        // 销毁主图标
        if (this.mainIcon) {
            this.mainIcon.destroy();
            this.mainIcon = null;
        }
    }
}
