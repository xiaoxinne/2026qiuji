/**
 * 用 cell 图块拼出可拖拽图形。
 * cells 为相对格子坐标 [col, row]，例如 [[2, 0], [0, 1], [1, 1], [2, 2]]
 * firemanIndexes：哪些格子上叠加火人（兼容 firemanIndex 单值）
 * matchZones：放置区中心点 [{ x, y }, ...]，用于匹配吸附
 * 匹配成功后左侧原位显示半透明 ghost，点击可召回并重新拖拽
 */
export default class CellShapeComponent {
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
      dragTexture = 'cell_big',
      matchedTexture = 'cell_border_big',
      firemanTexture = 'fireman',
      firemanDragTexture = 'fireman_big',
      firemanIndex = 0,
      firemanIndexes = null,
      cellWidth = 59,
      cellHeight = 59,
      dragCellWidth = 78,
      dragCellHeight = 78,
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

    const firemanSet = new Set(
      Array.isArray(firemanIndexes)
        ? firemanIndexes
        : (firemanIndex >= 0 ? [firemanIndex] : []),
    );
    const isFireman = (index) => firemanSet.has(index);

    const cols = cells.map(([col]) => col);
    const rows = cells.map(([, row]) => row);
    const minCol = Math.min(...cols);
    const minRow = Math.min(...rows);

    // cell_big / cell_border_big = 78；gap=-1 → 中心距 77，邻边重叠 1px
    const borderOverlap = 1;
    const normalLayout = CellShapeComponent._buildLayout(
      cells, minCol, minRow, cellWidth, cellHeight, -2, -2,
    );
    const dragVisualLayout = CellShapeComponent._buildLayout(
      cells, minCol, minRow, dragCellWidth, dragCellHeight, -borderOverlap, -borderOverlap,
    );
    const matchLayout = matchZones.length
      ? CellShapeComponent._buildLayoutFromMatchZones(
        cells, minCol, minRow, matchZones, dragCellWidth, dragCellHeight,
      )
      : dragVisualLayout;

    // 拖拽/匹配/放置使用同一套相对布局，避免吸附瞬间格子相对容器偏移造成跳动
    const placeLayout = matchZones.length ? matchLayout : dragVisualLayout;

    const container = scene.add.container(x, y).setDepth(depth);
    const cellSprites = cells.map((_cell, index) => {
      const pos = normalLayout.positions[index];
      return scene.add.image(pos.x, pos.y, texture);
    });
    container.add(cellSprites);

    const firemanSprites = [...firemanSet]
      .filter((index) => index >= 0 && index < cells.length)
      .map((index) => {
        const pos = normalLayout.positions[index];
        const sprite = scene.add.image(pos.x, pos.y, firemanTexture);
        sprite.setData('cellIndex', index);
        return sprite;
      });
    container.add(firemanSprites);

    const ghostContainer = scene.add.container(homeX, homeY).setDepth(depth - 1);
    const ghostCells = cells.map((_cell, index) => {
      const pos = normalLayout.positions[index];
      return scene.add.image(pos.x, pos.y, texture);
    });
    ghostContainer.add(ghostCells);
    const ghostFiremen = [...firemanSet]
      .filter((index) => index >= 0 && index < cells.length)
      .map((index) => {
        const pos = normalLayout.positions[index];
        return scene.add.image(pos.x, pos.y, firemanTexture);
      });
    ghostContainer.add(ghostFiremen);
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
        let cellTex = texture;
        if (mode === 'dragging') {
          cellTex = dragTexture;
        } else if (mode === 'matched') {
          cellTex = isFireman(index) ? dragTexture : matchedTexture;
        }
        sprite.setTexture(cellTex);
        sprite.x = layout.positions[index].x;
        sprite.y = layout.positions[index].y;
      });
      const useBig = mode === 'dragging' || mode === 'matched';
      firemanSprites.forEach((sprite) => {
        const index = sprite.getData('cellIndex');
        const pos = layout.positions[index];
        sprite.setTexture(useBig ? firemanDragTexture : firemanTexture);
        sprite.x = pos.x;
        sprite.y = pos.y;
      });
      if (dragEnabled) {
        updateInteractive(layout);
      }
    };

    const setDragEnabled = (enabled) => {
      dragEnabled = enabled;
      if (enabled) {
        updateInteractive(matched ? placeLayout : normalLayout);
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
        ease: 'Cubic.easeOut',
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
      applyLayout(placeLayout, 'dragging');
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
      container.setDepth(depth);

      const snap = CellShapeComponent._findMatch(
        container, placeLayout, cells, matchZones, matchThreshold,
      );

      if (snap) {
        matched = true;
        applyLayout(placeLayout, 'matched');
        scene.tweens.add({
          targets: container,
          x: snap.x,
          y: snap.y,
          duration: snapDuration,
          ease: 'Cubic.easeOut',
          onComplete: () => {
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
      scene.tweens.add({
        targets: container,
        x: homeX,
        y: homeY,
        duration: snapDuration,
        ease: 'Cubic.easeOut',
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
      firemanSprites,
      firemanIndexes: [...firemanSet],
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
