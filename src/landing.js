/**
 * landing.js — Intro/landing screen for Conway's Game of Life
 *
 * Performance: a single RAF loop drives all canvas animations.
 * CSS custom properties are read once at init via refreshCssCache().
 */

import { GameOfLife } from './game.js';

// ─── CSS cache ────────────────────────────────────────────────────────────────

let C = { accent: '#4ade80', bg: '#0f172a', border: '#334155', dead: '#0f172a' };

function refreshCssCache() {
  const s = getComputedStyle(document.documentElement);
  C = {
    accent: s.getPropertyValue('--accent').trim() || '#4ade80',
    bg:     s.getPropertyValue('--bg').trim()     || '#0f172a',
    border: s.getPropertyValue('--border').trim() || '#334155',
    dead:   s.getPropertyValue('--dead').trim()   || '#0f172a',
  };
}

// ─── Unified RAF loop ─────────────────────────────────────────────────────────
// All landing canvas animations share a single requestAnimationFrame loop.
// Each simulation registers a tick function; the loop calls all of them.

const tickers = [];
let _rafId = null;

function startLoop() {
  const tick = ts => {
    if (_rafId === null) return;
    _rafId = requestAnimationFrame(tick);
    for (const fn of tickers) fn(ts);
  };
  _rafId = requestAnimationFrame(tick);
}

function stopLoop() {
  cancelAnimationFrame(_rafId);
  _rafId = null;
  tickers.length = 0;
}

// ─── Background simulation ────────────────────────────────────────────────────

const BG_CELL_SIZE     = 12;
const BG_STEP_INTERVAL = 100; // ms between game steps / redraws

class BackgroundSim {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.dpr    = window.devicePixelRatio || 1;
    this.game   = null;
    this._last  = 0;
    this._resizeHandler = () => this._resize();
    this._tick = ts => {
      if (ts - this._last >= BG_STEP_INTERVAL) {
        this.game.step();
        this._draw();
        this._last = ts;
      }
    };
  }

  start() {
    this._resize();
    window.addEventListener('resize', this._resizeHandler);
    tickers.push(this._tick);
  }

  stop() {
    const i = tickers.indexOf(this._tick);
    if (i !== -1) tickers.splice(i, 1);
    window.removeEventListener('resize', this._resizeHandler);
  }

  _resize() {
    const { canvas, ctx, dpr } = this;
    const w = window.innerWidth;
    const h = window.innerHeight;

    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cols = Math.max(10, Math.floor(w / BG_CELL_SIZE));
    const rows = Math.max(10, Math.floor(h / BG_CELL_SIZE));
    const next = new GameOfLife(cols, rows);

    if (this.game) {
      const mc = Math.min(this.game.cols, cols);
      const mr = Math.min(this.game.rows, rows);
      for (let r = 0; r < mr; r++)
        for (let c = 0; c < mc; c++)
          next.set(c, r, this.game.get(c, r));
    } else {
      next.randomize(0.3);
    }
    this.game = next;
  }

  _draw() {
    const { ctx, canvas, game, dpr } = this;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const cellW = w / game.cols;
    const cellH = h / game.rows;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = C.accent;

    for (let row = 0; row < game.rows; row++) {
      for (let col = 0; col < game.cols; col++) {
        if (game.grid[row * game.cols + col]) {
          ctx.fillRect(col * cellW + 0.5, row * cellH + 0.5, cellW - 0.5, cellH - 0.5);
        }
      }
    }
  }
}

// ─── Rule card demos ──────────────────────────────────────────────────────────

const CARD_COLS = 5;
const CARD_ROWS = 5;
const CARD_CELL = 16;
const LOOP_MS   = 1500;

class CardDemo {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.dpr    = window.devicePixelRatio || 1;

    const logical = CARD_COLS * CARD_CELL;
    canvas.width  = logical * this.dpr;
    canvas.height = logical * this.dpr;
    canvas.style.width  = logical + 'px';
    canvas.style.height = logical + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.frames   = this.buildFrames();
    this.frameIdx = 0;
    this._last    = 0;
    const msPerFrame = LOOP_MS / this.frames.length;
    this._tick = ts => {
      if (ts - this._last >= msPerFrame) {
        this._draw(this.frames[this.frameIdx]);
        this.frameIdx = (this.frameIdx + 1) % this.frames.length;
        this._last = ts;
      }
    };
  }

  /** @returns {Uint8Array[]} sequence of grid states */
  buildFrames() { return []; }

  _grid(cells) {
    const g = new Uint8Array(CARD_COLS * CARD_ROWS);
    for (let i = 0; i < cells.length; i++) g[i] = cells[i] ? 1 : 0;
    return g;
  }

  _draw(grid) {
    const { ctx } = this;
    const logical = CARD_COLS * CARD_CELL;

    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, logical, logical);

    ctx.strokeStyle = C.border;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let c = 0; c <= CARD_COLS; c++) {
      ctx.moveTo(c * CARD_CELL, 0);
      ctx.lineTo(c * CARD_CELL, logical);
    }
    for (let r = 0; r <= CARD_ROWS; r++) {
      ctx.moveTo(0, r * CARD_CELL);
      ctx.lineTo(logical, r * CARD_CELL);
    }
    ctx.stroke();

    ctx.fillStyle = C.accent;
    for (let row = 0; row < CARD_ROWS; row++) {
      for (let col = 0; col < CARD_COLS; col++) {
        if (grid[row * CARD_COLS + col]) {
          ctx.fillRect(col * CARD_CELL + 1, row * CARD_CELL + 1, CARD_CELL - 2, CARD_CELL - 2);
        }
      }
    }
  }

  start() {
    this._draw(this.frames[0]);
    tickers.push(this._tick);
  }

  stop() {
    const i = tickers.indexOf(this._tick);
    if (i !== -1) tickers.splice(i, 1);
  }
}

// ─── Card 1: Underpopulation — lone cell dies ─────────────────────────────────

export function buildUnderpopFrames() {
  const empty = new Uint8Array(25);
  const alive = new Uint8Array(25); alive[12] = 1;
  return [alive, empty, empty, empty];
}

class UnderpopDemo extends CardDemo {
  buildFrames() { return buildUnderpopFrames(); }
}

// ─── Card 2: Survival — 2×2 block stays stable ───────────────────────────────

export function buildSurvivalFrames() {
  const block = new Uint8Array(25);
  [6, 7, 11, 12].forEach(i => { block[i] = 1; });
  return [block, block, block, block];
}

class SurvivalDemo extends CardDemo {
  buildFrames() { return buildSurvivalFrames(); }
}

// ─── Card 3: Overpopulation — centre cell with 4 neighbours dies ──────────────

/**
 * Compute one Game of Life step on a flat 5×5 Uint8Array.
 * Uses bounded (non-wrapping) neighbours for the card demo.
 * Exported for unit testing.
 *
 * @param {Uint8Array} g  - input grid (25 cells, row-major, 5 cols)
 * @returns {Uint8Array}  - next generation
 */
export function stepCard5x5(g) {
  const next = new Uint8Array(25);
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      let n = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5) n += g[nr * 5 + nc];
        }
      }
      const alive = g[r * 5 + c];
      next[r * 5 + c] = alive ? (n === 2 || n === 3 ? 1 : 0) : (n === 3 ? 1 : 0);
    }
  }
  return next;
}

export function buildOverpopFrames() {
  const cross = new Uint8Array(25);
  [7, 11, 12, 13, 17].forEach(i => { cross[i] = 1; });
  const after = stepCard5x5(cross);
  const empty = new Uint8Array(25);
  return [cross, after, empty, empty];
}

class OverpopDemo extends CardDemo {
  buildFrames() { return buildOverpopFrames(); }
}

// ─── Pattern type demos ───────────────────────────────────────────────────────

const DEMO_STILL = [[0,0],[1,0],[0,1],[1,1]];
const DEMO_OSCIL = [[0,0],[1,0],[2,0]];
const DEMO_SHIP  = [[1,0],[2,1],[0,2],[1,2],[2,2]];
const DEMO_GUN   = [
  [24,0],[22,1],[24,1],[12,2],[13,2],[20,2],[21,2],[34,2],[35,2],
  [11,3],[15,3],[20,3],[21,3],[34,3],[35,3],[0,4],[1,4],[10,4],[16,4],[20,4],[21,4],
  [0,5],[1,5],[10,5],[14,5],[16,5],[17,5],[22,5],[24,5],[10,6],[16,6],[24,6],
  [11,7],[15,7],[12,8],[13,8],
];

class PatternDemo {
  constructor(canvas, cells, cols, rows, cellPx, fps = 10) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width        = cols * cellPx * dpr;
    canvas.height       = rows * cellPx * dpr;
    canvas.style.width  = cols * cellPx + 'px';
    canvas.style.height = rows * cellPx + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.ctx    = ctx;
    this.cellPx = cellPx;
    this._last  = 0;
    this.game   = new GameOfLife(cols, rows);

    const maxC = cells.reduce((m, [c])   => Math.max(m, c), 0);
    const maxR = cells.reduce((m, [, r]) => Math.max(m, r), 0);
    const offC = Math.floor((cols - maxC - 1) / 2);
    const offR = Math.floor((rows - maxR - 1) / 2);
    for (const [c, r] of cells) {
      const gc = offC + c, gr = offR + r;
      if (gc >= 0 && gc < cols && gr >= 0 && gr < rows) this.game.set(gc, gr, 1);
    }

    const ms = 1000 / fps;
    this._tick = ts => {
      if (ts - this._last >= ms) { this.game.step(); this._draw(); this._last = ts; }
    };
    this._draw();
  }

  _draw() {
    const { ctx, game, cellPx } = this;
    const { cols, rows } = game;
    ctx.fillStyle = C.dead || C.bg;
    ctx.fillRect(0, 0, cols * cellPx, rows * cellPx);
    ctx.fillStyle = C.accent;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (game.grid[r * cols + c])
          ctx.fillRect(c * cellPx + 0.5, r * cellPx + 0.5, cellPx - 1, cellPx - 1);
  }

  start() { tickers.push(this._tick); }
  stop()  { const i = tickers.indexOf(this._tick); if (i !== -1) tickers.splice(i, 1); }
}

// ─── Landing screen orchestrator ─────────────────────────────────────────────

export function initLanding(onPlay) {
  const landing  = document.getElementById('landing');
  const bgCanvas = document.getElementById('landing-bg');
  const playBtn  = document.getElementById('landing-play');

  // Read CSS custom properties once up front
  refreshCssCache();

  const bgSim = new BackgroundSim(bgCanvas);
  bgSim.start();

  const demos = [
    new UnderpopDemo(document.getElementById('card-canvas-1')),
    new SurvivalDemo(document.getElementById('card-canvas-2')),
    new OverpopDemo(document.getElementById('card-canvas-3')),
  ];
  demos.forEach(d => d.start());

  const patternDemos = [
    new PatternDemo(document.getElementById('demo-canvas-1'), DEMO_STILL, 10, 10,  8),
    new PatternDemo(document.getElementById('demo-canvas-2'), DEMO_OSCIL, 10, 10,  8,  5),
    new PatternDemo(document.getElementById('demo-canvas-3'), DEMO_SHIP,  16, 16,  5),
    new PatternDemo(document.getElementById('demo-canvas-4'), DEMO_GUN,   50, 20,  4,  8),
  ];
  patternDemos.forEach(d => d.start());

  // Single unified RAF loop drives all canvas animations
  startLoop();

  playBtn.addEventListener('click', () => {
    playBtn.disabled = true;
    landing.classList.add('landing--fade-out');

    const transDuration =
      parseFloat(getComputedStyle(landing).transitionDuration) * 1000 || 0;

    let handled = false;
    const finish = () => {
      if (handled) return;
      handled = true;
      stopLoop();
      landing.style.display = 'none';
      onPlay();
    };

    landing.addEventListener('transitionend', finish, { once: true });
    setTimeout(finish, transDuration + 100);
  });
}
