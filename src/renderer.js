const DEFAULT_LIVE_COLORS = {
  sparse: 'rgb(0,255,160)',
  stable: 'rgb(0,237,207)',
  crowded: 'rgb(0,220,255)',
};

export function liveCellColor(neighborCount, colors = DEFAULT_LIVE_COLORS) {
  if (neighborCount >= 3) return colors.crowded;
  if (neighborCount === 2) return colors.stable;
  return colors.sparse;
}

function cssVar(name, fallback) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;
    this.showGrid = true;

    // Resolved once resize() is called
    this.logicalW = 0;
    this.logicalH = 0;
    this.cols = 0;
    this.rows = 0;
    this.cellW = 0;
    this.cellH = 0;
  }

  resize(logicalW, logicalH, cols, rows) {
    const { dpr, canvas, ctx } = this;
    canvas.width = logicalW * dpr;
    canvas.height = logicalH * dpr;
    canvas.style.width = logicalW + 'px';
    canvas.style.height = logicalH + 'px';
    // Reset transform before re-scaling to avoid accumulation across calls
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.logicalW = logicalW;
    this.logicalH = logicalH;
    this.cols = cols;
    this.rows = rows;
    this.cellW = logicalW / cols;
    this.cellH = logicalH / rows;
  }

  // Convert a canvas-relative pixel position to grid coordinates
  canvasToCell(x, y) {
    return {
      col: Math.floor(x / this.cellW),
      row: Math.floor(y / this.cellH),
    };
  }

  draw(game) {
    const { ctx, cellW, cellH, logicalW, logicalH, showGrid, cols, rows } = this;
    const gap = cellW > 3 ? 0.5 : 0;

    ctx.fillStyle = cssVar('--dead', '#0f172a');
    ctx.fillRect(0, 0, logicalW, logicalH);

    const liveColors = {
      sparse: cssVar('--cell-sparse', DEFAULT_LIVE_COLORS.sparse),
      stable: cssVar('--cell-stable', DEFAULT_LIVE_COLORS.stable),
      crowded: cssVar('--cell-crowded', DEFAULT_LIVE_COLORS.crowded),
    };

    for (let row = 0; row < game.rows; row++) {
      for (let col = 0; col < game.cols; col++) {
        if (game.grid[row * game.cols + col]) {
          ctx.fillStyle = liveCellColor(game.countNeighbors(col, row), liveColors);
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = cellW >= 8 ? 8 : 0;
          ctx.fillRect(
            col * cellW + gap,
            row * cellH + gap,
            cellW - gap,
            cellH - gap,
          );
        }
      }
    }
    ctx.shadowBlur = 0;

    if (showGrid && cellW > 5) {
      ctx.strokeStyle = cssVar('--grid', '#1e293b');
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let c = 0; c <= cols; c++) {
        ctx.moveTo(c * cellW, 0);
        ctx.lineTo(c * cellW, logicalH);
      }
      for (let r = 0; r <= rows; r++) {
        ctx.moveTo(0, r * cellH);
        ctx.lineTo(logicalW, r * cellH);
      }
      ctx.stroke();
    }
  }
}
