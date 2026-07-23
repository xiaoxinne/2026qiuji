/**
 * 用 cell 图块拼出可拖拽图形。
 * cells 为相对格子坐标 [col, row]，例如 [[2, 0], [0, 1], [1, 1], [2, 2]]
 * firemanIndex：哪一个格子上叠加火人（默认 0）
 * matchZones：放置区中心点 [{ x, y }, ...]，用于匹配吸附
 * 匹配成功后左侧原位显示半透明 ghost，点击可召回并重新拖拽
 */
export default class CellShapeComponent {
  /** 已放置图形的递增 depth，保证后放置的在上层，避免松手掉层闪烁 */
  static _matchedDepthSeq = 100;

  static _buildLayout(cells, minCol, minRow, cellWidth, cellHeight, gapX, gapY) {
    const cols = cells.map(([col]) => col);
    const rows = cells.map(([, row]) => row);
    const width = (Math.max(...cols) - minCol + 1) * (cellWidth + gapX) - gapX;
    const height = (Math.max(...rows) - minRow + 1) * (cellHeight + gapY) - gapY;

    const positions = cells.map(([col, row]) => ({
      x: (col - minCol) * (cellWidth + gapX) + cellWidth / 2 - width / 2,
      y: (row - minRow) * (cellHeight + gapY) + cellHeight / 2 - height / 2,
    }));

    const hitRects = cells.map(([col, row]) => new Phaser.Geom.Rectangle(
      (col - minCol) * (cellWidth + gapX) - width / 2,
      (row - minRow) * (cellHeight + gapY) - height / 2,
      cellWidth,
      cellHeight,
    ));

    return { width, height, positions, hitRects };
  }

  static _buildLayoutFromMatchZones(cells, minCol, minRow, matchZones, cellWidth, cellHeight) {
    const xs = [...new Set(matchZones.map((z) => z.x))].sort((a, b) => a - b);
    const ys = [...new Set(matchZones.map((z) => z.y))].sort((a, b) => a - b);

    const zonePositions = cells.map(([col, row]) => ({
      x: xs[col - minCol],
      y: ys[row - minRow],
    }));

    const centerX = zonePositions.reduce((sum, pos) => sum + pos.x, 0) / zonePositions.length;
    const centerY = zonePositions.reduce((sum, pos) => sum + pos.y, 0) / zonePositions.length;

    const positions = zonePositions.map((pos) => ({
      x: pos.x - centerX,
      y: pos.y - centerY,
    }));

    const left = Math.min(...positions.map((pos) => pos.x - cellWidth / 2));
    const right = Math.max(...positions.map((pos) => pos.x + cellWidth / 2));
    const top = Math.min(...positions.map((pos) => pos.y - cellHeight / 2));
    const bottom = Math.max(...positions.map((pos) => pos.y + cellHeight / 2));

    const hitRects = positions.map((pos) => new Phaser.Geom.Rectangle(
      pos.x - cellWidth / 2,
      pos.y - cellHeight / 2,
      cellWidth,
      cellHeight,
    ));

    return {
      width: right - left,
      height: bottom - top,
      positions,
      hitRects,
    };
  }

  static _findMatch(container, layout, cells, matchZones, threshold) {
    if (!matchZones?.length) return null;

    const xs = [...new Set(matchZones.map((z) => z.x))].sort((a, b) => a - b);
    const ys = [...new Set(matchZones.map((z) => z.y))].sort((a, b) => a - b);
    const zoneGrid = matchZones.map((z, index) => ({
      x: z.x,
      y: z.y,
      index,
      col: xs.indexOf(z.x),
      row: ys.indexOf(z.y),
    }));

    const cellWorlds = layout.positions.map((pos) => ({
      x: container.x + pos.x,
      y: container.y + pos.y,
    }));

    const assignments = cellWorlds.map((cw) => {
      let best = null;
      let bestDist = threshold;
      for (const zone of zoneGrid) {
        const dist = Math.hypot(zone.x - cw.x, zone.y - cw.y);
        if (dist < bestDist) {
          bestDist = dist;
          best = zone;
        }
      }
      return best;
    });

    if (assignments.some((zone) => !zone)) return null;

    const zoneIndexes = assignments.map((zone) => zone.index);
    if (new Set(zoneIndexes).size !== zoneIndexes.length) return null;

    const minCellCol = Math.min(...cells.map(([col]) => col));
    const minCellRow = Math.min(...cells.map(([, row]) => row));
    const minZoneCol = Math.min(...assignments.map((zone) => zone.col));
    const minZoneRow = Math.min(...assignments.map((zone) => zone.row));

    for (let i = 0; i < cells.length; i++) {
      const cellCol = cells[i][0] - minCellCol;
      const cellRow = cells[i][1] - minCellRow;
      const zoneCol = assignments[i].col - minZoneCol;
      const zoneRow = assignments[i].row - minZoneRow;
      if (cellCol !== zoneCol || cellRow !== zoneRow) return null;
    }

    let dx = 0;
    let dy = 0;
    for (let i = 0; i < cellWorlds.length; i++) {
      dx += assignments[i].x - cellWorlds[i].x;
      dy += assignments[i].y - cellWorlds[i].y;
    }
    dx /= cellWorlds.length;
    dy /= cellWorlds.length;

    return {
      x: container.x + dx,
      y: container.y + dy,
    };
  }

  static create(scene, options = {}) {
    const {
      cells = [[0, 0]],
      x = 0,
      y = 0,
      texture = 'cell',
      emptyTexture = 'cell',
      dragTexture = 'cell_big',
      matchedTexture = 'cell_border_big',
      firemanTexture = 'fireman',
      firemanDragTexture = 'fireman_big',
      firemanIndex = 0,
      cellWidth = 64,
      cellHeight = 64,
      dragCellWidth = 89,
      dragCellHeight = 89,
      gapX = 0,
      gapY = 0,
      depth = 30,
      homeX = x,
      homeY = y,
      dragAlpha = 0.85,
      ghostAlpha = 0.4,
      matchZones = [],
      matchThreshold = 42,
      snapDuration = 200,
      onDragStart = null,
      onDragEnd = null,
      onMatch = null,
      onReturn = null,
      onRecall = null,
    } = options;

    const cols = cells.map(([col]) => col);
    const rows = cells.map(([, row]) => row);
    const minCol = Math.min(...cols);
    const minRow = Math.min(...rows);

    // 两边框完全重叠成一条线：cell(64) 与 cell_big(89) 均为 overlap 2
    const normalBorderOverlap = 2;
    const dragBorderOverlap = 2;
    const normalLayout = CellShapeComponent._buildLayout(
      cells, minCol, minRow, cellWidth, cellHeight, -normalBorderOverlap, -normalBorderOverlap,
    );
    const dragVisualLayout = CellShapeComponent._buildLayout(
      cells, minCol, minRow, dragCellWidth, dragCellHeight, -dragBorderOverlap, -dragBorderOverlap,
    );
    const matchLayout = matchZones.length
      ? CellShapeComponent._buildLayoutFromMatchZones(
        cells, minCol, minRow, matchZones, dragCellWidth, dragCellHeight,
      )
      : dragVisualLayout;

    const container = scene.add.container(x, y).setDepth(depth);
    const cellSprites = cells.map((_cell, index) => {
      const pos = normalLayout.positions[index];
      const tex = index === firemanIndex ? texture : emptyTexture;
      return scene.add.image(pos.x, pos.y, tex).setOrigin(0.5, 0.5);
    });
    container.add(cellSprites);

    let firemanSprite = null;
    if (firemanIndex >= 0 && firemanIndex < cells.length) {
      const pos = normalLayout.positions[firemanIndex];
      firemanSprite = scene.add.image(pos.x, pos.y, firemanTexture).setOrigin(0.5, 0.5);
      container.add(firemanSprite);
    }

    // ghost 固定低 depth，避免其它图形拖拽改 depth 时带动半透明层闪烁
    const ghostContainer = scene.add.container(homeX, homeY).setDepth(10);
    const ghostCells = cells.map((_cell, index) => {
      const pos = normalLayout.positions[index];
      const tex = index === firemanIndex ? texture : emptyTexture;
      return scene.add.image(pos.x, pos.y, tex).setOrigin(0.5, 0.5);
    });
    ghostContainer.add(ghostCells);
    let ghostFireman = null;
    if (firemanIndex >= 0 && firemanIndex < cells.length) {
      const pos = normalLayout.positions[firemanIndex];
      ghostFireman = scene.add.image(pos.x, pos.y, firemanTexture).setOrigin(0.5, 0.5);
      ghostContainer.add(ghostFireman);
    }
    ghostContainer.setAlpha(ghostAlpha).setVisible(false);

    let activeHitRects = normalLayout.hitRects;
    let matched = false;
    let dragEnabled = true;

    const hitTest = (_area, localX, localY) => (
      activeHitRects.some((rect) => Phaser.Geom.Rectangle.Contains(rect, localX, localY))
    );

    const updateInteractive = (layout) => {
      const { width, height } = layout;
      const hitArea = new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height);
      activeHitRects = layout.hitRects;
      if (dragEnabled) {
        container.setInteractive(hitArea, hitTest);
        scene.input.setDraggable(container);
      }
    };

    const setGhostInteractive = () => {
      const { width, height, hitRects } = normalLayout;
      const hitArea = new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height);
      ghostContainer.setInteractive(hitArea, (_area, localX, localY) => (
        hitRects.some((rect) => Phaser.Geom.Rectangle.Contains(rect, localX, localY))
      ));
    };
    setGhostInteractive();

    const applyLayout = (layout, mode) => {
      activeHitRects = layout.hitRects;
      cellSprites.forEach((sprite, index) => {
        let cellTex = index === firemanIndex ? texture : emptyTexture;
        if (mode === 'dragging') {
          // 拖拽放大：全部格用 cell_big，边框重叠成一条线
          cellTex = dragTexture;
        } else if (mode === 'matched') {
          // 放置放大：火人格 cell_big，其余格 cell_border_big，边框重叠成一条线
          cellTex = index === firemanIndex ? dragTexture : matchedTexture;
        }
        sprite.setTexture(cellTex);
        sprite.x = layout.positions[index].x;
        sprite.y = layout.positions[index].y;
      });
      if (firemanSprite) {
        const pos = layout.positions[firemanIndex];
        const useBig = mode === 'dragging' || mode === 'matched';
        firemanSprite.setTexture(useBig ? firemanDragTexture : firemanTexture);
        firemanSprite.x = pos.x;
        firemanSprite.y = pos.y;
      }
      if (dragEnabled) {
        updateInteractive(layout);
      }
    };

    const setDragEnabled = (enabled) => {
      dragEnabled = enabled;
      if (enabled) {
        updateInteractive(matched ? matchLayout : normalLayout);
      } else {
        container.disableInteractive();
      }
    };

    const showGhost = () => {
      ghostContainer.setVisible(true);
    };

    const hideGhost = () => {
      ghostContainer.setVisible(false);
    };

    const recallToHome = () => {
      if (!matched) return;
      matched = false;
      hideGhost();
      scene.tweens.killTweensOf(container);
      scene.tweens.add({
        targets: container,
        x: homeX,
        y: homeY,
        duration: snapDuration,
        ease: 'Back.easeOut',
        onComplete: () => {
          applyLayout(normalLayout, 'normal');
          setDragEnabled(true);
          container.setDepth(depth);
          container.setAlpha(1);
          if (onRecall) onRecall(container);
        },
      });
    };

    applyLayout(normalLayout, 'normal');
    scene.input.setDraggable(container);

    container.on('dragstart', () => {
      if (!dragEnabled) return;
      if (matched) {
        matched = false;
        hideGhost();
      }
      container.setDepth(depth + 1000);
      applyLayout(dragVisualLayout, 'dragging');
      container.setAlpha(dragAlpha);
      if (onDragStart) onDragStart(container);
    });

    container.on('drag', (_pointer, dragX, dragY) => {
      if (!dragEnabled) return;
      container.x = dragX;
      container.y = dragY;
    });

    container.on('dragend', () => {
      if (!dragEnabled) return;
      container.setAlpha(1);

      const snap = CellShapeComponent._findMatch(
        container, matchLayout, cells, matchZones, matchThreshold,
      );

      if (snap) {
        matched = true;
        // 保持在上层并递增，避免先降回 base depth 导致已放置图形（尤其半透明边框）闪一下
        container.setDepth(CellShapeComponent._matchedDepthSeq++);
        scene.tweens.add({
          targets: container,
          x: snap.x,
          y: snap.y,
          duration: snapDuration,
          ease: 'Back.easeOut',
          onComplete: () => {
            applyLayout(matchLayout, 'matched');
            setDragEnabled(true);
            showGhost();
            if (onMatch) onMatch(container, snap);
            if (onDragEnd) onDragEnd(container, true);
          },
        });
        return;
      }

      matched = false;
      hideGhost();
      container.setDepth(depth);
      scene.tweens.add({
        targets: container,
        x: homeX,
        y: homeY,
        duration: snapDuration,
        ease: 'Back.easeOut',
        onComplete: () => {
          applyLayout(normalLayout, 'normal');
          if (onReturn) onReturn(container);
          if (onDragEnd) onDragEnd(container, false);
        },
      });
    });

    ghostContainer.on('pointerup', () => {
      if (!matched) return;
      scene.sound.play('btnclick');
      recallToHome();
    });

    return {
      container,
      ghostContainer,
      cells,
      cellSprites,
      firemanSprite,
      firemanIndex,
      homeX,
      homeY,
      isMatched: () => matched,
      recall: recallToHome,
      reset: () => {
        matched = false;
        hideGhost();
        scene.tweens.killTweensOf(container);
        applyLayout(normalLayout, 'normal');
        setDragEnabled(true);
        container.setAlpha(1);
        container.setDepth(depth);
        container.x = homeX;
        container.y = homeY;
      },
    };
  }
}
