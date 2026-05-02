/**
 * Handles mouse and touch input on the canvas.
 * A single finger/pointer drag draws or erases cells based on the state
 * of the first cell touched (toggle intent is fixed for the whole stroke).
 */
export class Controls {
  constructor(canvas, renderer, game, ui) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.game = game;
    this.ui = ui;       // { togglePlay, step, randomize, clear, toggleGrid, playing }
    this.drawing = false;
    this.drawValue = 1; // 1 = draw alive, 0 = erase
    this.lastKey = null; // "col,row" of last cell painted this stroke

    this._bindMouse();
    this._bindTouch();
    this._bindKeyboard();
  }

  // ─── Mouse ───────────────────────────────────────────────────────────────

  _bindMouse() {
    const c = this.canvas;
    c.addEventListener('mousedown', e => {
      e.preventDefault();
      const { col, row } = this._mouseCell(e);
      this.drawValue = this.game.get(col, row) ? 0 : 1;
      this.drawing = true;
      this._paint(col, row);
    });
    c.addEventListener('mousemove', e => {
      if (!this.drawing) return;
      const { col, row } = this._mouseCell(e);
      this._paint(col, row);
    });
    const stop = () => { this.drawing = false; this.lastKey = null; };
    c.addEventListener('mouseup', stop);
    c.addEventListener('mouseleave', stop);
  }

  _mouseCell(e) {
    const r = this.canvas.getBoundingClientRect();
    return this.renderer.canvasToCell(e.clientX - r.left, e.clientY - r.top);
  }

  // ─── Touch (iOS Safari) ──────────────────────────────────────────────────

  _bindTouch() {
    const c = this.canvas;
    const opts = { passive: false };

    c.addEventListener('touchstart', e => {
      e.preventDefault(); // prevents scroll and 300 ms delay
      if (e.touches.length !== 1) return;
      const { col, row } = this._touchCell(e.touches[0]);
      this.drawValue = this.game.get(col, row) ? 0 : 1;
      this.drawing = true;
      this._paint(col, row);
    }, opts);

    c.addEventListener('touchmove', e => {
      e.preventDefault();
      if (!this.drawing || e.touches.length !== 1) return;
      const { col, row } = this._touchCell(e.touches[0]);
      this._paint(col, row);
    }, opts);

    const stop = e => { e.preventDefault(); this.drawing = false; this.lastKey = null; };
    c.addEventListener('touchend', stop, opts);
    c.addEventListener('touchcancel', stop, opts);
  }

  _touchCell(touch) {
    const r = this.canvas.getBoundingClientRect();
    return this.renderer.canvasToCell(
      touch.clientX - r.left,
      touch.clientY - r.top,
    );
  }

  // ─── Keyboard ────────────────────────────────────────────────────────────

  _bindKeyboard() {
    document.addEventListener('keydown', e => {
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          this.ui.togglePlay();
          break;
        case 'ArrowRight':
        case 'KeyN':
          if (!this.ui.playing) this.ui.step();
          break;
        case 'KeyR':
          this.ui.randomize();
          break;
        case 'KeyC':
          this.ui.clear();
          break;
        case 'KeyG':
          this.ui.toggleGrid();
          break;
      }
    });
  }

  // ─── Shared ──────────────────────────────────────────────────────────────

  _paint(col, row) {
    const { cols, rows } = this.game;
    if (col < 0 || col >= cols || row < 0 || row >= rows) return;
    const key = col + ',' + row;
    if (key === this.lastKey) return; // skip re-painting same cell in one stroke
    this.lastKey = key;
    this.game.set(col, row, this.drawValue);
  }
}
