/**
 * 通用拖拽组件
 *
 * 支持多个拖拽物放置到多个拖拽区域，具备以下核心逻辑：
 * 1. 区域A → 区域B（B有物品）：两个物品交换
 * 2. 原始位置 → 区域A（A有物品）：原有物品回到原始位置，拖拽物放入A
 * 3. 区域A → 外部（无匹配区域）：物品回到拖拽前的区域A；从 home 拖出则回原始位置
 * 4. 放入空区域：直接吸附到区域中心
 */
export default class DragDropComponent {
    /**
     * @param {Phaser.Scene} scene - Phaser 场景实例
     * @param {Object} config - 配置对象
     *
     * config.items - 拖拽物配置数组，每项：
     *   { key, texture, x, y, scale?, zonePlacedScaleMultiplier?, initialZoneKey?, data? } 或 { key, displayObject, x, y, scale?, zonePlacedScaleMultiplier?, data? }
     *   - key: 唯一标识（字符串）
     *   - texture: 纹理资源 key（与 displayObject 二选一）
     *   - displayObject: 自定义显示对象（如 Spine），与 texture 二选一；使用则 x,y 为 home 位置
     *   - x, y: 原始位置（home）
     *   - scale: 初始缩放（默认 1）
     *   - zonePlacedScaleMultiplier: 放入放置区后的缩放系数（区内 scale = homeScale * 该值；未设则用全局）
     *   - initialZoneKey: 初始所在的区域 key（可选，启动时直接放入该区域）
     *   - data: 附加业务数据，可通过 item.data 访问
     *
     * config.dropZones - 放置区域配置数组，每项：
     *   { key, x, y, width, height, texture?, slots?, data? }
     *   - slots: 固定槽位 [{ x, y }, ...]（松手在区域内即按槽位顺序依次落点，不依赖鼠标对准槽位）
     *   - key: 唯一标识
     *   - x, y: 区域中心坐标
     *   - width, height: 碰撞检测范围
     *   - texture: 区域可视化纹理（可选）
     *   - data: 附加业务数据
     *
     * config.onDrop(item, targetZone, fromZone) - 放入空区域回调
     * config.onSwap(draggedItem, existingItem, targetZone, fromZone) - 交换/替换回调
     * config.onReturn(item) - 返回原始位置回调
     * config.validateDrop(item, targetZone, fromZone) - 可选；返回 false 则拒绝放入并弹回原位/原区
     * config.onReject(item, fromZone) - 可选；validateDrop 拒绝时回调
     * config.onDragStart(item) - 开始拖拽回调
     * config.dragScale - 拖拽时缩放倍率（默认 1.05）
     * config.dragAlpha - 拖拽时透明度（默认 0.85）
     * config.snapDuration - 吸附动画时长 ms（默认 200）
     * config.returnDuration - 返回动画时长 ms（默认 300）
     * config.snapEase - 吸附缓动函数（默认 'Back.easeOut'）
     * config.returnEase - 返回缓动函数（默认 'Back.easeOut'）
     * config.depth - 基础渲染深度（默认 100）
     * config.enabled - 是否启用拖拽（默认 true）
     * config.drawZoneBounds - 是否绘制放置区域边界框（默认 false）
     * config.zoneBoundsColor - 边界框线条颜色，0xRRGGBB（默认 0x00aaff）
     * config.zoneBoundsAlpha - 边界框透明度 0~1（默认 0.6）
     * config.zoneBoundsLineWidth - 边界框线宽（默认 2）
     * config.zoneBoundsFillAlpha - 边界框填充透明度，0 表示不填充（默认 0.15）
     * config.boundsZone - 可选，自由放置边界 { x, y, width, height }；松手在区域内则保留松手位置，区域外则弹回原位
     * config.onItemClick - 可选，(item)=>{}；当按下与松手位移小于阈值时视为点击并回调，与拖拽区分
     * config.clickThreshold - 点击判定阈值（像素），默认 10
     * config.destroyOnExternalDropFromZone - 为 true 时：从放置区拖出到区外（无命中区域）则移除该物品，不回到 home；从 home 拖出区外仍回 home（默认 false）
     * config.allowMultipleItemsPerZone - 为 true 时：同一放置区可放多块，X 为从左到右等宽格子落中心（多块时不会两个只贴左右两边），Y 取区域中心线（默认 false）
     * config.zoneMultiPaddingX - 多块时可用宽度左右留白（像素），默认 0
     * config.onZoneLayoutChange - 可选，(component) => {}；多块模式下区内物品增删、重排后触发（含某区被清空）
     * config.maxItemsPerZone - 可选数字；多块时每区最多容纳块数，超出则松手不放入（从家回 home，从区 A 去满区 B 则回 A）（默认不限制）
     * config.zonePlacedScaleMultiplier - 可选；区内最终显示缩放 = homeScale * 该系数（默认 1）
     */
    constructor(scene, config = {}) {
        this.scene = scene;

        const {
            items = [],
            dropZones = [],
            boundsZone = null,
            onDrop = null,
            onSwap = null,
            onReturn = null,
            onReject = null,
            validateDrop = null,
            onDragStart = null,
            onItemClick = null,
            clickThreshold = 10,
            dragScale = 1.05,
            dragAlpha = 0.85,
            snapDuration = 200,
            returnDuration = 300,
            snapEase = 'Back.easeOut',
            returnEase = 'Back.easeOut',
            depth = 100,
            enabled = true,
            drawZoneBounds = false,
            zoneBoundsColor = 0x00aaff,
            zoneBoundsAlpha = 0.6,
            zoneBoundsLineWidth = 2,
            zoneBoundsFillAlpha = 0.15,
            destroyOnExternalDropFromZone = false,
            allowMultipleItemsPerZone = false,
            zoneMultiPaddingX = 0,
            onZoneLayoutChange = null,
            maxItemsPerZone = null,
            zonePlacedScaleMultiplier = 1,
        } = config;

        this.onZoneLayoutChange = onZoneLayoutChange;
        this.maxItemsPerZone = maxItemsPerZone;
        this.zonePlacedScaleMultiplier = zonePlacedScaleMultiplier;
        this.allowMultipleItemsPerZone = allowMultipleItemsPerZone;
        this.zoneMultiPaddingX = zoneMultiPaddingX;
        this.destroyOnExternalDropFromZone = destroyOnExternalDropFromZone;
        this.boundsZone = boundsZone;
        this.onItemClickCallback = onItemClick;
        this.clickThreshold = clickThreshold;

        this.onDropCallback = onDrop;
        this.onSwapCallback = onSwap;
        this.onReturnCallback = onReturn;
        this.onRejectCallback = onReject;
        this.validateDropCallback = validateDrop;
        this.onDragStartCallback = onDragStart;
        this.dragScale = dragScale;
        this.dragAlpha = dragAlpha;
        this.snapDuration = snapDuration;
        this.returnDuration = returnDuration;
        this.snapEase = snapEase;
        this.returnEase = returnEase;
        this.baseDepth = depth;
        this._enabled = enabled;

        this.drawZoneBounds = drawZoneBounds;
        this.zoneBoundsColor = zoneBoundsColor;
        this.zoneBoundsAlpha = zoneBoundsAlpha;
        this.zoneBoundsLineWidth = zoneBoundsLineWidth;
        this.zoneBoundsFillAlpha = zoneBoundsFillAlpha;

        this.items = [];
        this.dropZones = [];
        this._zoneMap = {};
        this._itemMap = {};
        this._draggedItem = null;

        dropZones.forEach((zc, i) => this._createDropZone(zc, i));
        items.forEach((ic, i) => this._createDragItem(ic, i));
    }

    // ======================== 内部方法 ========================

    _createDropZone(config, index) {
        const {
            key,
            x, y,
            width, height,
            texture = null,
            slots = null,
            data = {},
        } = config;

        const zone = {
            key: key || `zone_${index}`,
            x, y,
            width, height,
            slots: slots?.length ? slots : null,
            slotOccupants: slots?.length ? new Array(slots.length).fill(null) : null,
            currentItem: null,
            itemsInZone: this.allowMultipleItemsPerZone ? [] : null,
            visual: null,
            boundsGraphics: null,
            data,
        };

        if (texture) {
            zone.visual = this.scene.add.image(x, y, texture);
            zone.visual.setDepth(this.baseDepth - 1);
        }

        if (this.drawZoneBounds) {
            const g = this.scene.add.graphics();
            const left = x - width / 2;
            const top = y - height / 2;
            if (this.zoneBoundsFillAlpha > 0) {
                g.fillStyle(this.zoneBoundsColor, this.zoneBoundsFillAlpha);
                g.fillRect(left, top, width, height);
            }
            g.lineStyle(this.zoneBoundsLineWidth, this.zoneBoundsColor, this.zoneBoundsAlpha);
            g.strokeRect(left, top, width, height);
            g.setDepth(this.baseDepth - 2);
            zone.boundsGraphics = g;
        }

        this.dropZones.push(zone);
        this._zoneMap[zone.key] = zone;
        return zone;
    }

    _createDragItem(config, index) {
        const {
            key,
            texture,
            displayObject = null,
            x, y,
            scale = 1,
            zonePlacedScaleMultiplier = null,
            initialZoneKey = null,
            data = {},
        } = config;

        let sprite;
        if (displayObject) {
            sprite = displayObject;
            sprite.x = x;
            sprite.y = y;
            sprite.setScale(scale);
            sprite.setDepth(this.baseDepth);
        } else {
            sprite = this.scene.add.image(x, y, texture);
            sprite.setScale(scale);
            sprite.setDepth(this.baseDepth);
        }

        const item = {
            key: key || `item_${index}`,
            sprite,
            texture: texture || null,
            homeX: x,
            homeY: y,
            homeScale: scale,
            zonePlacedScaleMultiplier,
            currentZone: null,
            _inBounds: false,
            lastValidX: x,
            lastValidY: y,
            data,
            _dragStartZone: null,
            slotIndex: null,
        };

        sprite.setData('_dragDropItem', item);

        if (this._enabled) {
            sprite.setInteractive({ useHandCursor: true });
            this.scene.input.setDraggable(sprite);
        }

        this._setupDragEvents(sprite, item);

        this.items.push(item);
        this._itemMap[item.key] = item;

        if (initialZoneKey && this._zoneMap[initialZoneKey]) {
            const zone = this._zoneMap[initialZoneKey];
            item.currentZone = zone;
            if (this.allowMultipleItemsPerZone) {
                const slotIndex = zone.slots ? this._findFirstEmptySlotIndex(zone) : -1;
                if (zone.slots && slotIndex < 0) return item;
                this._zoneAssignItem(zone, item, slotIndex);
                this._relayoutZoneItems(zone, true);
            } else {
                zone.currentItem = item;
                sprite.x = zone.x;
                sprite.y = zone.y;
            }
        }

        return item;
    }

    _setupDragEvents(sprite, item) {
        sprite.on('dragstart', (pointer) => {
            if (!this._enabled) return;

            this._draggedItem = item;
            item._dragStartZone = item.currentZone;
            item._dragStartSlotIndex = item.slotIndex;
            item._pointerStartX = pointer != null ? pointer.x : 0;
            item._pointerStartY = pointer != null ? pointer.y : 0;
            if (this.boundsZone) item._dragStartInBounds = item._inBounds;
            item._inBounds = false;

            if (item.currentZone) {
                const prevZone = item.currentZone;
                this._zoneRemoveItem(prevZone, item);
                item.currentZone = null;
                if (this.allowMultipleItemsPerZone && !prevZone.slots) {
                    this._relayoutZoneItems(prevZone);
                } else if (this.allowMultipleItemsPerZone && this.onZoneLayoutChange) {
                    this.onZoneLayoutChange(this);
                }
            }

            sprite.setDepth(this.baseDepth + 1000);

            const pinch = item.sprite.scaleX;
            this.scene.tweens.add({
                targets: sprite,
                scaleX: pinch * this.dragScale,
                scaleY: pinch * this.dragScale,
                alpha: this.dragAlpha,
                duration: 80,
                ease: 'Sine.easeOut',
            });

            if (this.onDragStartCallback) {
                this.onDragStartCallback(item);
            }
        });

        sprite.on('drag', (_pointer, dragX, dragY) => {
            if (!this._enabled) return;
            sprite.x = dragX;
            sprite.y = dragY;
        });

        sprite.on('dragend', (pointer) => {
            if (!this._enabled || this._draggedItem !== item) return;
            this._handleDrop(item, pointer);
            this._draggedItem = null;
        });
    }

    _handleDrop(item, pointer) {
        // 自由放置边界：区域内保留松手位置并记为“当前位”；区域外弹回当前位；区分点击与拖拽
        if (this.boundsZone) {
            const dx = pointer.x - (item._pointerStartX ?? pointer.x);
            const dy = pointer.y - (item._pointerStartY ?? pointer.y);
            const distSq = dx * dx + dy * dy;
            const clickThresholdSq = this.clickThreshold * this.clickThreshold;
            const isClick = distSq < clickThresholdSq;

            if (isClick && this.onItemClickCallback) {
                item.sprite.x = item.lastValidX;
                item.sprite.y = item.lastValidY;
                item._inBounds = item._dragStartInBounds != null ? item._dragStartInBounds : item._inBounds;
                this.scene.tweens.killTweensOf(item.sprite);
                item.sprite.setScale(item.homeScale);
                item.sprite.setAlpha(1);
                item.sprite.setDepth(this.baseDepth);
                this.onItemClickCallback(item);
                item._dragStartZone = null;
                return;
            }

            const inBounds = this._pointInBounds(pointer.x, pointer.y, this.boundsZone);
            if (inBounds) {
                item._inBounds = true;
                item.currentZone = null;
                item.lastValidX = item.sprite.x;
                item.lastValidY = item.sprite.y;
                this._animateToCurrentPosition(item);
                if (this.onDropCallback) {
                    this.onDropCallback(item, null, item._dragStartZone);
                }
            } else {
                this._animateToLastValidPosition(item);
                if (this.onReturnCallback) this.onReturnCallback(item);
            }
            item._dragStartZone = null;
            return;
        }

        const targetZone = this._findDropZone(pointer.x, pointer.y);
        const fromZone = item._dragStartZone;

        // 拖回自己原来所在的区域
        if (targetZone && targetZone === fromZone) {
            if (this.allowMultipleItemsPerZone) {
                if (!targetZone.itemsInZone.includes(item)) {
                    if (targetZone.slots) {
                        const slotIndex = this._resolveSlotIndex(targetZone, item._dragStartSlotIndex);
                        if (slotIndex < 0) {
                            this._animateToHome(item);
                            item._dragStartZone = null;
                            return;
                        }
                        this._zoneAssignItem(targetZone, item, slotIndex);
                        this._animateItemToSlot(item, targetZone, item.slotIndex, false);
                    } else {
                        targetZone.itemsInZone.push(item);
                        item.currentZone = targetZone;
                        this._relayoutZoneItems(targetZone);
                    }
                } else if (targetZone.slots) {
                    this._animateItemToSlot(item, targetZone, item.slotIndex, false);
                }
            } else {
                this._animateToZone(item, targetZone);
                targetZone.currentItem = item;
            }
            item.currentZone = targetZone;
            item._dragStartZone = null;
            return;
        }

        // 无匹配区域：从区内拖出可清除；从区内拖出否则回原区；从 home 拖出回原始位置
        if (!targetZone) {
            if (this.destroyOnExternalDropFromZone && fromZone) {
                this.removeItem(item.key);
                return;
            }
            if (fromZone) {
                if (this.allowMultipleItemsPerZone && fromZone.slots) {
                    const slotIndex = this._resolveSlotIndex(fromZone, item._dragStartSlotIndex);
                    if (slotIndex >= 0) {
                        this._zoneAssignItem(fromZone, item, slotIndex);
                        this._animateItemToSlot(item, fromZone, item.slotIndex, false);
                    } else {
                        this._animateToHome(item);
                    }
                } else if (this.allowMultipleItemsPerZone) {
                    fromZone.itemsInZone.push(item);
                    item.currentZone = fromZone;
                    this._relayoutZoneItems(fromZone);
                } else {
                    fromZone.currentItem = item;
                    item.currentZone = fromZone;
                    this._animateToZone(item, fromZone);
                }
            } else {
                this._animateToHome(item);
            }
            if (this.onReturnCallback) {
                this.onReturnCallback(item);
            }
            item._dragStartZone = null;
            return;
        }

        // 同一区内可叠放多块：不交换、不顶回 home，只按顺序落位
        if (this.allowMultipleItemsPerZone) {
            if (!targetZone.slots) {
                if (this._isZoneFull(targetZone)) {
                    if (fromZone) {
                        fromZone.itemsInZone.push(item);
                        item.currentZone = fromZone;
                        this._relayoutZoneItems(fromZone);
                    } else {
                        this._animateToHome(item);
                        if (this.onReturnCallback) this.onReturnCallback(item);
                    }
                    item._dragStartZone = null;
                    return;
                }
                if (!this._shouldAcceptDrop(item, targetZone, fromZone)) {
                    this._rejectDrop(item, fromZone);
                    item._dragStartZone = null;
                    return;
                }
                targetZone.itemsInZone.push(item);
                item.currentZone = targetZone;
                this._relayoutZoneItems(targetZone);
                if (this.onDropCallback) this.onDropCallback(item, targetZone, fromZone);
                item._dragStartZone = null;
                return;
            }

            if (this._isZoneFull(targetZone)) {
                if (fromZone) {
                    const slotIndex = this._resolveSlotIndex(fromZone, item._dragStartSlotIndex);
                    if (slotIndex < 0) {
                        this._animateToHome(item);
                    } else {
                        this._zoneAssignItem(fromZone, item, slotIndex);
                        this._animateItemToSlot(item, fromZone, item.slotIndex, false);
                    }
                } else {
                    this._animateToHome(item);
                    if (this.onReturnCallback) this.onReturnCallback(item);
                }
                item._dragStartZone = null;
                return;
            }
            const slotIndex = this._resolveSlotIndex(targetZone);
            if (slotIndex < 0) {
                if (fromZone) {
                    const backSlot = this._resolveSlotIndex(fromZone, item._dragStartSlotIndex);
                    if (backSlot >= 0) {
                        this._zoneAssignItem(fromZone, item, backSlot);
                        this._animateItemToSlot(item, fromZone, item.slotIndex, false);
                    } else {
                        this._animateToHome(item);
                    }
                } else {
                    this._animateToHome(item);
                    if (this.onReturnCallback) this.onReturnCallback(item);
                }
                item._dragStartZone = null;
                return;
            }
            if (!this._shouldAcceptDrop(item, targetZone, fromZone)) {
                this._rejectDrop(item, fromZone);
                item._dragStartZone = null;
                return;
            }
            this._zoneAssignItem(targetZone, item, slotIndex);
            this._animateItemToSlot(item, targetZone, item.slotIndex, false);
            if (this.onDropCallback) this.onDropCallback(item, targetZone, fromZone);
            item._dragStartZone = null;
            return;
        }

        if (!this._shouldAcceptDrop(item, targetZone, fromZone)) {
            this._rejectDrop(item, fromZone);
            item._dragStartZone = null;
            return;
        }

        const existingItem = targetZone.currentItem;

        if (existingItem && existingItem !== item) {
            if (fromZone) {
                // 区域A → 区域B（B有物品）：交换
                this._animateToZone(existingItem, fromZone);
                existingItem.currentZone = fromZone;
                fromZone.currentItem = existingItem;
            } else {
                // 原始位置 → 区域（区域有物品）：原有物品回到它自己的原始位置
                this._animateToHome(existingItem);
            }

            this._animateToZone(item, targetZone);
            item.currentZone = targetZone;
            targetZone.currentItem = item;

            if (this.onSwapCallback) {
                this.onSwapCallback(item, existingItem, targetZone, fromZone);
            }
        } else {
            // 区域为空
            this._animateToZone(item, targetZone);
            item.currentZone = targetZone;
            targetZone.currentItem = item;

            if (this.onDropCallback) {
                this.onDropCallback(item, targetZone, fromZone);
            }
        }

        item._dragStartZone = null;
    }

    _shouldAcceptDrop(item, targetZone, fromZone) {
        if (!this.validateDropCallback) return true;
        return this.validateDropCallback(item, targetZone, fromZone) !== false;
    }

    /** 校验不通过：弹回 home 或原放置区 */
    _rejectDrop(item, fromZone) {
        if (fromZone) {
            if (this.allowMultipleItemsPerZone && fromZone.slots) {
                const slotIndex = this._resolveSlotIndex(fromZone, item._dragStartSlotIndex);
                if (slotIndex >= 0) {
                    this._zoneAssignItem(fromZone, item, slotIndex);
                    this._animateItemToSlot(item, fromZone, item.slotIndex, false);
                } else {
                    this._animateToHome(item);
                }
            } else if (this.allowMultipleItemsPerZone) {
                fromZone.itemsInZone.push(item);
                item.currentZone = fromZone;
                this._relayoutZoneItems(fromZone);
            } else {
                fromZone.currentItem = item;
                item.currentZone = fromZone;
                this._animateToZone(item, fromZone);
            }
        } else {
            this._animateToHome(item);
        }
        if (this.onRejectCallback) {
            this.onRejectCallback(item, fromZone);
        }
    }

    /** 吸附在区内时的显示缩放（相对各自 homeScale） */
    _scaleInZone(item) {
        const mul = item.zonePlacedScaleMultiplier ?? this.zonePlacedScaleMultiplier ?? 1;
        return item.homeScale * mul;
    }

    _zoneRemoveItem(zone, item) {
        if (!zone || !item) return;
        if (this.allowMultipleItemsPerZone && zone.itemsInZone) {
            const i = zone.itemsInZone.indexOf(item);
            if (i >= 0) zone.itemsInZone.splice(i, 1);
            if (zone.slots && item.slotIndex != null) {
                zone.slotOccupants[item.slotIndex] = null;
                item.slotIndex = null;
            }
        } else if (zone.currentItem === item) {
            zone.currentItem = null;
        }
    }

    _zoneAssignItem(zone, item, slotIndex = -1) {
        if (!zone.itemsInZone.includes(item)) {
            zone.itemsInZone.push(item);
        }
        item.currentZone = zone;
        if (!zone.slots) return;
        if (item.slotIndex != null && zone.slotOccupants[item.slotIndex] === item) {
            zone.slotOccupants[item.slotIndex] = null;
        }
        item.slotIndex = slotIndex;
        zone.slotOccupants[slotIndex] = item;
    }

    _zoneCapacity(zone) {
        if (zone.slots) return zone.slots.length;
        if (this.maxItemsPerZone != null) return this.maxItemsPerZone;
        return Infinity;
    }

    _isZoneFull(zone) {
        return zone.itemsInZone?.length >= this._zoneCapacity(zone);
    }

    _findFirstEmptySlotIndex(zone) {
        if (!zone.slots) return -1;
        return zone.slotOccupants.findIndex((o) => !o);
    }

    /** 按槽位顺序取第一个空位；拖回区内时优先恢复原槽位 */
    _resolveSlotIndex(zone, preferredIndex = null) {
        if (!zone.slots) return -1;
        if (preferredIndex != null && !zone.slotOccupants[preferredIndex]) {
            return preferredIndex;
        }
        return this._findFirstEmptySlotIndex(zone);
    }

    _getItemSlotPosition(zone, slotIndex) {
        if (zone.slots && slotIndex != null && zone.slots[slotIndex]) {
            return zone.slots[slotIndex];
        }
        return { x: zone.x, y: zone.y };
    }

    _animateItemToSlot(item, zone, slotIndex, immediate = false) {
        const pos = this._getItemSlotPosition(zone, slotIndex);
        const sz = this._scaleInZone(item);
        this.scene.tweens.killTweensOf(item.sprite);
        if (immediate) {
            item.sprite.x = pos.x;
            item.sprite.y = pos.y;
            item.sprite.setScale(sz);
            item.sprite.setAlpha(1);
            item.sprite.setDepth(this.baseDepth);
            return;
        }
        this.scene.tweens.add({
            targets: item.sprite,
            x: pos.x,
            y: pos.y,
            scaleX: sz,
            scaleY: sz,
            alpha: 1,
            duration: this.snapDuration,
            ease: this.snapEase,
            onComplete: () => {
                item.sprite.setDepth(this.baseDepth);
            },
        });
    }

    /** 多块时：第 index 块（0 起）落在第 index 个等宽格子的中心，从左到右依次排满可用宽度 */
    _evenXInZone(zone, index, count) {
        if (count <= 1) return zone.x;
        const pad = this.zoneMultiPaddingX || 0;
        const half = zone.width / 2;
        const left = zone.x - half + pad;
        const right = zone.x + half - pad;
        const span = Math.max(right - left, 1);
        const cell = span / count;
        return left + cell * (index + 0.5);
    }

    /**
     * 多块模式下按 X 从左到右等宽格子重排区内所有块（增删后调用）
     * @param {boolean} immediate - true 时不用动画，用于创建/程序化摆放首帧
     */
    _relayoutZoneItems(zone, immediate = false) {
        if (!this.allowMultipleItemsPerZone || !zone) return;
        if (!zone.itemsInZone?.length) {
            if (this.onZoneLayoutChange) this.onZoneLayoutChange(this);
            return;
        }
        if (zone.slots) {
            zone.itemsInZone.forEach((item) => {
                this._animateItemToSlot(item, zone, item.slotIndex, immediate);
            });
            if (this.onZoneLayoutChange) this.onZoneLayoutChange(this);
            return;
        }
        const n = zone.itemsInZone.length;
        zone.itemsInZone.forEach((item, index) => {
            const x = this._evenXInZone(zone, index, n);
            const y = zone.y;
            this.scene.tweens.killTweensOf(item.sprite);
            const sz = this._scaleInZone(item);
            if (immediate) {
                item.sprite.x = x;
                item.sprite.y = y;
                item.sprite.setScale(sz);
                item.sprite.setAlpha(1);
                item.sprite.setDepth(this.baseDepth);
            } else {
                this.scene.tweens.add({
                    targets: item.sprite,
                    x,
                    y,
                    scaleX: sz,
                    scaleY: sz,
                    alpha: 1,
                    duration: this.snapDuration,
                    ease: this.snapEase,
                    onComplete: () => {
                        item.sprite.setDepth(this.baseDepth);
                    },
                });
            }
        });
        if (this.onZoneLayoutChange) this.onZoneLayoutChange(this);
    }

    _pointInBounds(x, y, b) {
        const halfW = b.width / 2;
        const halfH = b.height / 2;
        return x >= b.x - halfW && x <= b.x + halfW &&
            y >= b.y - halfH && y <= b.y + halfH;
    }

    _animateToCurrentPosition(item) {
        this.scene.tweens.killTweensOf(item.sprite);
        this.scene.tweens.add({
            targets: item.sprite,
            scaleX: item.homeScale,
            scaleY: item.homeScale,
            alpha: 1,
            duration: this.snapDuration,
            ease: this.snapEase,
            onComplete: () => {
                item.sprite.setDepth(this.baseDepth);
            },
        });
    }

    /** 弹回“当前位”（上次在区域内松手的位置），用于 boundsZone 下拖出区域时 */
    _animateToLastValidPosition(item) {
        item._inBounds = false;
        this.scene.tweens.killTweensOf(item.sprite);
        this.scene.tweens.add({
            targets: item.sprite,
            x: item.lastValidX,
            y: item.lastValidY,
            scaleX: item.homeScale,
            scaleY: item.homeScale,
            alpha: 1,
            duration: this.returnDuration,
            ease: this.returnEase,
            onComplete: () => {
                item.sprite.setDepth(this.baseDepth);
            },
        });
    }

    /**
     * 碰撞检测：找到包含坐标点的区域；多区域重叠时取最近中心
     */
    _findDropZone(x, y) {
        let best = null;
        let bestDist = Infinity;

        for (const zone of this.dropZones) {
            const halfW = zone.width / 2;
            const halfH = zone.height / 2;
            if (x >= zone.x - halfW && x <= zone.x + halfW &&
                y >= zone.y - halfH && y <= zone.y + halfH) {
                const dx = x - zone.x;
                const dy = y - zone.y;
                const dist = dx * dx + dy * dy;
                if (dist < bestDist) {
                    bestDist = dist;
                    best = zone;
                }
            }
        }

        return best;
    }

    _animateToZone(item, zone) {
        const sz = this._scaleInZone(item);
        this.scene.tweens.killTweensOf(item.sprite);
        this.scene.tweens.add({
            targets: item.sprite,
            x: zone.x,
            y: zone.y,
            scaleX: sz,
            scaleY: sz,
            alpha: 1,
            duration: this.snapDuration,
            ease: this.snapEase,
            onComplete: () => {
                item.sprite.setDepth(this.baseDepth);
            },
        });
    }

    _animateToHome(item) {
        item.currentZone = null;
        this.scene.tweens.killTweensOf(item.sprite);
        this.scene.tweens.add({
            targets: item.sprite,
            x: item.homeX,
            y: item.homeY,
            scaleX: item.homeScale,
            scaleY: item.homeScale,
            alpha: 1,
            duration: this.returnDuration,
            ease: this.returnEase,
            onComplete: () => {
                item.sprite.setDepth(this.baseDepth);
            },
        });
    }

    // ======================== 公共 API ========================

    /**
     * 启用/禁用拖拽
     */
    setEnabled(enabled) {
        this._enabled = enabled;
        this.items.forEach(item => {
            if (enabled) {
                item.sprite.setInteractive({ useHandCursor: true });
                this.scene.input.setDraggable(item.sprite);
            } else {
                item.sprite.disableInteractive();
            }
        });
    }

    /**
     * 通过 key 获取拖拽物
     */
    getItem(key) {
        return this._itemMap[key] || null;
    }

    /**
     * 通过 key 获取放置区域
     */
    getZone(key) {
        return this._zoneMap[key] || null;
    }

    /**
     * 获取某个区域当前放置的物品（无则返回 null）
     */
    getZoneItem(zoneKey) {
        const zone = this._zoneMap[zoneKey];
        if (!zone) return null;
        if (this.allowMultipleItemsPerZone && zone.itemsInZone && zone.itemsInZone.length) {
            return zone.itemsInZone[0];
        }
        return zone.currentItem;
    }

    /**
     * 某区域内当前所有物品（仅 allowMultipleItemsPerZone 时长度可大于 1）
     */
    getZoneItems(zoneKey) {
        const zone = this._zoneMap[zoneKey];
        if (!zone) return [];
        if (this.allowMultipleItemsPerZone && zone.itemsInZone) {
            return [...zone.itemsInZone];
        }
        return zone.currentItem ? [zone.currentItem] : [];
    }

    /**
     * 获取某个物品当前所在的区域（无则返回 null）
     */
    getItemZone(itemKey) {
        const item = this._itemMap[itemKey];
        return item ? item.currentZone : null;
    }

    /**
     * 获取所有区域的放置状态
     * @returns {Object} { zoneKey: itemKey | null }
     */
    getState() {
        const state = {};
        this.dropZones.forEach(zone => {
            if (this.allowMultipleItemsPerZone && zone.itemsInZone) {
                state[zone.key] = zone.itemsInZone.map((i) => i.key);
            } else {
                state[zone.key] = zone.currentItem ? zone.currentItem.key : null;
            }
        });
        return state;
    }

    /**
     * 判断是否所有区域都已放置物品
     */
    isAllZonesFilled() {
        if (this.allowMultipleItemsPerZone) {
            return this.dropZones.every((zone) => zone.itemsInZone && zone.itemsInZone.length > 0);
        }
        return this.dropZones.every((zone) => zone.currentItem !== null);
    }

    /**
     * 将物品程序化放入指定区域（带动画）
     */
    placeItem(itemKey, zoneKey, animate = true) {
        const item = this._itemMap[itemKey];
        const zone = this._zoneMap[zoneKey];
        if (!item || !zone) return;

        const oldZone = item.currentZone;
        if (oldZone) {
            this._zoneRemoveItem(oldZone, item);
        }
        if (this.allowMultipleItemsPerZone && oldZone && oldZone !== zone && oldZone.itemsInZone?.length && !oldZone.slots) {
            this._relayoutZoneItems(oldZone);
        } else if (this.allowMultipleItemsPerZone && oldZone && oldZone !== zone && oldZone.slots && this.onZoneLayoutChange) {
            this.onZoneLayoutChange(this);
        }

        if (this.allowMultipleItemsPerZone) {
            if (this._isZoneFull(zone)) return;
            const slotIndex = zone.slots ? this._findFirstEmptySlotIndex(zone) : -1;
            if (zone.slots && slotIndex < 0) return;
            this._zoneAssignItem(zone, item, slotIndex);
            this._relayoutZoneItems(zone, !animate);
            return;
        }

        if (zone.currentItem && zone.currentItem !== item) {
            this._animateToHome(zone.currentItem);
        }

        item.currentZone = zone;
        zone.currentItem = item;

        if (animate) {
            this._animateToZone(item, zone);
        } else {
            item.sprite.x = zone.x;
            item.sprite.y = zone.y;
            item.sprite.setScale(this._scaleInZone(item));
            item.sprite.setAlpha(1);
            item.sprite.setDepth(this.baseDepth);
        }
    }

    /**
     * 将物品程序化归位到原始位置（带动画）
     */
    returnItem(itemKey, animate = true) {
        const item = this._itemMap[itemKey];
        if (!item) return;

        const z = item.currentZone;
        if (z) {
            this._zoneRemoveItem(z, item);
        }
        if (this.allowMultipleItemsPerZone && z?.itemsInZone?.length && !z.slots) {
            this._relayoutZoneItems(z);
        } else if (this.allowMultipleItemsPerZone && z?.slots && this.onZoneLayoutChange) {
            this.onZoneLayoutChange(this);
        }

        if (animate) {
            this._animateToHome(item);
        } else {
            item.currentZone = null;
            item.sprite.x = item.homeX;
            item.sprite.y = item.homeY;
            item.sprite.setScale(item.homeScale);
            item.sprite.setAlpha(1);
            item.sprite.setDepth(this.baseDepth);
        }
    }

    /**
     * 所有物品归位
     */
    resetAll(animate = true) {
        this.items.forEach(item => {
            this.returnItem(item.key, animate);
        });
    }

    /**
     * 动态添加拖拽物
     */
    addItem(config) {
        return this._createDragItem(config, this.items.length);
    }

    /**
     * 动态添加放置区域
     */
    addDropZone(config) {
        return this._createDropZone(config, this.dropZones.length);
    }

    /**
     * 动态移除拖拽物
     */
    removeItem(key) {
        const item = this._itemMap[key];
        if (!item) return;

        const z = item.currentZone;
        if (z) {
            this._zoneRemoveItem(z, item);
        }
        if (this.allowMultipleItemsPerZone && z) {
            if (z.slots) {
                if (this.onZoneLayoutChange) this.onZoneLayoutChange(this);
            } else {
                this._relayoutZoneItems(z);
            }
        }

        this.scene.tweens.killTweensOf(item.sprite);
        item.sprite.off('dragstart');
        item.sprite.off('drag');
        item.sprite.off('dragend');
        item.sprite.destroy();

        this.items = this.items.filter(i => i !== item);
        delete this._itemMap[key];
    }

    /**
     * 动态移除放置区域
     */
    removeDropZone(key) {
        const zone = this._zoneMap[key];
        if (!zone) return;

        if (this.allowMultipleItemsPerZone && zone.itemsInZone) {
            const copy = [...zone.itemsInZone];
            zone.itemsInZone.length = 0;
            copy.forEach((it) => {
                it.currentZone = null;
                this._animateToHome(it);
            });
        } else if (zone.currentItem) {
            this._animateToHome(zone.currentItem);
        }
        if (zone.visual) {
            zone.visual.destroy();
        }
        if (zone.boundsGraphics && !zone.boundsGraphics.destroyed) {
            zone.boundsGraphics.destroy();
        }

        this.dropZones = this.dropZones.filter(z => z !== zone);
        delete this._zoneMap[key];
    }

    /**
     * 销毁组件，清理所有资源
     */
    destroy() {
        this.items.forEach(item => {
            this.scene.tweens.killTweensOf(item.sprite);
            item.sprite.off('dragstart');
            item.sprite.off('drag');
            item.sprite.off('dragend');
            if (item.sprite && !item.sprite.destroyed) {
                item.sprite.destroy();
            }
        });

        this.dropZones.forEach(zone => {
            if (zone.visual && !zone.visual.destroyed) {
                zone.visual.destroy();
            }
            if (zone.boundsGraphics && !zone.boundsGraphics.destroyed) {
                zone.boundsGraphics.destroy();
            }
        });

        this.items = [];
        this.dropZones = [];
        this._zoneMap = {};
        this._itemMap = {};
        this._draggedItem = null;
    }
}
