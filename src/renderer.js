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

    ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue('--dead').trim() || '#0f172a';
    ctx.fillRect(0, 0, logicalW, logicalH);

    ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent').trim() || '#4ade80';

    for (let row = 0; row < game.rows; row++) {
      for (let col = 0; col < game.cols; col++) {
        if (game.grid[row * game.cols + col]) {
          ctx.fillRect(
            col * cellW + gap,
            row * cellH + gap,
            cellW - gap,
            cellH - gap,
          );
        }
      }
    }

    if (showGrid && cellW > 5) {
      ctx.strokeStyle = getComputedStyle(document.documentElement)
        .getPropertyValue('--grid').trim() || '#1e293b';
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
