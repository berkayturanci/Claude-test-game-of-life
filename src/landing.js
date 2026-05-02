/**
 * landing.js — Intro/landing screen for Conway's Game of Life
 *
 * Responsibilities:
 *  1. Run a full-screen background Game of Life simulation (low opacity).
 *  2. Animate three small rule-card canvases.
 *  3. Handle the Play button → fade out landing → fade in game → call gameInit().
 */

import { GameOfLife } from './game.js';
import { liveCellColor } from './renderer.js';

// ─── CSS custom property helpers ─────────────────────────────────────────────

const css = name =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// ─── Background simulation ────────────────────────────────────────────────────

const BG_CELL_SIZE = 12; // logical px per cell in background

class BackgroundSim {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.dpr    = window.devicePixelRatio || 1;
    this.game   = null;
    this.rafId  = null;
    this._resizeHandler = () => this._resize();
  }

  start() {
    this._resize();
    window.addEventListener('resize', this._resizeHandler);
    this._loop();
  }

  stop() {
    cancelAnimationFrame(this.rafId);
    this.rafId = null;
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
      // Preserve existing cells when window is resized
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
    const liveColors = {
      sparse: css('--cell-sparse') || 'rgb(0,255,160)',
      stable: css('--cell-stable') || 'rgb(0,237,207)',
      crowded: css('--cell-crowded') || 'rgb(0,220,255)',
    };

    ctx.clearRect(0, 0, w, h);

    let live = 0;
    for (let row = 0; row < game.rows; row++) {
      for (let col = 0; col < game.cols; col++) {
        if (game.grid[row * game.cols + col]) {
          live++;
          ctx.fillStyle = liveCellColor(game.countNeighbors(col, row), liveColors);
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 8;
          ctx.fillRect(col * cellW + 0.5, row * cellH + 0.5, cellW - 0.5, cellH - 0.5);
        }
      }
    }
    ctx.shadowBlur = 0;

    const cellCount = document.getElementById('cell-count');
    if (cellCount) cellCount.textContent = live.toLocaleString();
  }

  _loop() {
    // Step every ~100ms (≈10fps) to keep CPU light
    const STEP_INTERVAL = 100;
    let last = 0;
    let generation = 0;
    const tick = (ts) => {
      if (this.rafId === null) return; // stopped
      this.rafId = requestAnimationFrame(tick);
      if (ts - last >= STEP_INTERVAL) {
        this.game.step();
        generation++;
        this._draw();
        const genCount = document.getElementById('gen-count');
        if (genCount) genCount.textContent = generation.toLocaleString();
        last = ts;
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }
}

// ─── Rule card demos ──────────────────────────────────────────────────────────

/**
 * Each card demo runs on a 5×5 grid with cells ~16px logical.
 * The canvas is 80×80 px logical.
 */

const CARD_COLS   = 5;
const CARD_ROWS   = 5;
const CARD_CELL   = 16; // logical px per cell
const LOOP_MS     = 1500; // cycle duration

/**
 * Base class for card demos. Subclasses implement `buildFrames()` which
 * returns an array of Uint8Array grids (each 5×5 = 25 cells).
 */
class CardDemo {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.dpr    = window.devicePixelRatio || 1;

    // Set physical size
    const logical = CARD_COLS * CARD_CELL;
    canvas.width  = logical * this.dpr;
    canvas.height = logical * this.dpr;
    canvas.style.width  = logical + 'px';
    canvas.style.height = logical + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.frames  = this.buildFrames();
    this.frameIdx = 0;
    this.rafId   = null;
  }

  /** @returns {Uint8Array[]} sequence of grid states */
  buildFrames() { return []; }

  _grid(cells) {
    // cells: flat array of 25 values (row-major, 5 cols)
    const g = new Uint8Array(CARD_COLS * CARD_ROWS);
    for (let i = 0; i < cells.length; i++) g[i] = cells[i] ? 1 : 0;
    return g;
  }

  _draw(grid) {
    const { ctx, dpr } = this;
    const accent = css('--cell-sparse') || css('--accent') || '#4ade80';
    const bg     = css('--bg')     || '#0f172a';
    const border = css('--border') || '#334155';
    const logical = CARD_COLS * CARD_CELL;

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, logical, logical);

    // Draw grid lines
    ctx.strokeStyle = border;
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

    // Draw live cells
    ctx.fillStyle = accent;
    for (let row = 0; row < CARD_ROWS; row++) {
      for (let col = 0; col < CARD_COLS; col++) {
        if (grid[row * CARD_COLS + col]) {
          ctx.fillRect(col * CARD_CELL + 1, row * CARD_CELL + 1, CARD_CELL - 2, CARD_CELL - 2);
        }
      }
    }
  }

  start() {
    // Initialise last to now so the first tick does not immediately fire.
    let last = performance.now();
    const msPerFrame = LOOP_MS / this.frames.length;

    const tick = (ts) => {
      if (this.rafId === null) return;
      this.rafId = requestAnimationFrame(tick);
      if (ts - last >= msPerFrame) {
        this._draw(this.frames[this.frameIdx]);
        this.frameIdx = (this.frameIdx + 1) % this.frames.length;
        last = ts;
      }
    };
    this.rafId = requestAnimationFrame(tick);
    this._draw(this.frames[0]);
  }

  stop() {
    cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }
}

// ─── Card 1: Underpopulation — lone cell dies ─────────────────────────────────
// Frame 0: single cell alive at centre
// Frame 1: cell dead (died, no neighbours)
// Frames 2–3: pause on dead state before reset

export function buildUnderpopFrames() {
  const empty  = new Uint8Array(25);

  // Centre cell at (2,2) → index 2*5+2 = 12
  const alive  = new Uint8Array(25); alive[12] = 1;

  // 4 frames: alive → dead → dead → dead (visual pause)
  return [alive, empty, empty, empty];
}

class UnderpopDemo extends CardDemo {
  buildFrames() { return buildUnderpopFrames(); }
}

// ─── Card 2: Survival — 2×2 block stays stable ───────────────────────────────
// Block occupies rows 1-2, cols 1-2 (4 cells). Each has exactly 3 neighbours.
// It never changes — so all frames are the same.

export function buildSurvivalFrames() {
  const block = new Uint8Array(25);
  // (row=1,col=1)=6, (row=1,col=2)=7, (row=2,col=1)=11, (row=2,col=2)=12
  [6, 7, 11, 12].forEach(i => { block[i] = 1; });
  // 4 identical frames — block stays put
  return [block, block, block, block];
}

class SurvivalDemo extends CardDemo {
  buildFrames() { return buildSurvivalFrames(); }
}

// ─── Card 3: Overpopulation — centre cell with 4 neighbours dies ───────────────
// Frame 0: cross pattern (centre + 4 cardinal neighbours)
// Frame 1: after one step — centre dies (had 4 neighbours), each arm had 1 neighbour → die
//           BUT corner cells that had 3 neighbours may be born — let's just show the
//           "before" and "after" states computed by the real rules, then reset.

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
  // Cross: centre (2,2) + N(1,2) + S(3,2) + W(2,1) + E(2,3)
  // indices in row-major 5×5:
  //   (r,c) → r*5+c
  //   (2,2)=12, (1,2)=7, (3,2)=17, (2,1)=11, (2,3)=13
  const cross = new Uint8Array(25);
  [7, 11, 12, 13, 17].forEach(i => { cross[i] = 1; });

  const after = stepCard5x5(cross);
  const empty = new Uint8Array(25);

  // Show: cross → after → pause → pause (reset to cross on next cycle)
  return [cross, after, empty, empty];
}

class OverpopDemo extends CardDemo {
  buildFrames() { return buildOverpopFrames(); }
}

class ReproductionDemo extends CardDemo {
  buildFrames() {
    const before = new Uint8Array(25);
    [6, 8, 16].forEach(i => { before[i] = 1; });
    const after = stepCard5x5(before);
    return [before, after, after, before];
  }
}

// ─── Pattern type demos ───────────────────────────────────────────────────────

const DEMO_STILL = [[0,0],[1,0],[0,1],[1,1]]; // Block (still life)
const DEMO_OSCIL = [[0,0],[1,0],[2,0]];        // Blinker (oscillator)
const DEMO_SHIP  = [[1,0],[2,1],[0,2],[1,2],[2,2]]; // Glider (spaceship)
const DEMO_GUN   = [
  [24,0],[22,1],[24,1],[12,2],[13,2],[20,2],[21,2],[34,2],[35,2],
  [11,3],[15,3],[20,3],[21,3],[34,3],[35,3],[0,4],[1,4],[10,4],[16,4],[20,4],[21,4],
  [0,5],[1,5],[10,5],[14,5],[16,5],[17,5],[22,5],[24,5],[10,6],[16,6],[24,6],
  [11,7],[15,7],[12,8],[13,8],
]; // Gosper Glider Gun

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
    this.fps    = fps;
    this.rafId  = null;
    this.game   = new GameOfLife(cols, rows);

    const maxC = cells.reduce((m, [c])   => Math.max(m, c), 0);
    const maxR = cells.reduce((m, [, r]) => Math.max(m, r), 0);
    const offC = Math.floor((cols - maxC - 1) / 2);
    const offR = Math.floor((rows - maxR - 1) / 2);
    for (const [c, r] of cells) {
      const gc = offC + c, gr = offR + r;
      if (gc >= 0 && gc < cols && gr >= 0 && gr < rows) this.game.set(gc, gr, 1);
    }
    this._draw();
  }

  _draw() {
    const { ctx, game, cellPx } = this;
    const { cols, rows } = game;
    ctx.fillStyle = css('--dead') || '#0f172a';
    ctx.fillRect(0, 0, cols * cellPx, rows * cellPx);
    ctx.fillStyle = css('--cell-sparse') || css('--accent') || '#4ade80';
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (game.grid[r * cols + c])
          ctx.fillRect(c * cellPx + 0.5, r * cellPx + 0.5, cellPx - 1, cellPx - 1);
  }

  start() {
    let last = 0;
    const ms = 1000 / this.fps;
    const tick = ts => {
      if (this.rafId === null) return;
      this.rafId = requestAnimationFrame(tick);
      if (ts - last >= ms) { this.game.step(); this._draw(); last = ts; }
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop() { cancelAnimationFrame(this.rafId); this.rafId = null; }
}

// ─── CTA background: Gosper Glider Gun ───────────────────────────────────────

const GOSPER_GUN = [
  [0,4],[0,5],[1,4],[1,5],
  [10,4],[10,5],[10,6],[11,3],[11,7],[12,2],[12,8],[13,2],[13,8],
  [14,5],[15,3],[15,7],[16,4],[16,5],[16,6],[17,5],
  [20,2],[20,3],[20,4],[21,2],[21,3],[21,4],[22,1],[22,5],
  [24,0],[24,1],[24,5],[24,6],
  [34,2],[34,3],[35,2],[35,3],
];

class CtaGunSim {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas?.getContext('2d');
    this.game = new GameOfLife(70, 40);
    this.rafId = null;
    this.last = 0;
    this.generation = 0;
    this._resizeHandler = () => this._resize();
  }

  start() {
    if (!this.canvas || !this.ctx) return;
    this._seed();
    this._resize();
    window.addEventListener('resize', this._resizeHandler);
    this.rafId = requestAnimationFrame(ts => this._loop(ts));
  }

  stop() {
    cancelAnimationFrame(this.rafId);
    this.rafId = null;
    window.removeEventListener('resize', this._resizeHandler);
  }

  _seed() {
    this.game.clear();
    const offC = 2;
    const offR = 8;
    for (const [c, r] of GOSPER_GUN) this.game.set(c + offC, r + offR, 1);
    this.generation = 0;
  }

  _resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.offsetWidth;
    const h = this.canvas.offsetHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  _draw() {
    const { ctx, canvas, game } = this;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    const cell = Math.min(w / game.cols, h / game.rows) * 0.85;
    const offX = (w - game.cols * cell) / 2;
    const offY = (h - game.rows * cell) / 2;
    const liveColors = {
      sparse: css('--cell-sparse') || 'rgb(0,255,160)',
      stable: css('--cell-stable') || 'rgb(0,237,207)',
      crowded: css('--cell-crowded') || 'rgb(0,220,255)',
    };

    ctx.clearRect(0, 0, w, h);
    for (let row = 0; row < game.rows; row++) {
      for (let col = 0; col < game.cols; col++) {
        if (game.grid[row * game.cols + col]) {
          ctx.fillStyle = liveCellColor(game.countNeighbors(col, row), liveColors);
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 8;
          ctx.fillRect(offX + col * cell + 1, offY + row * cell + 1, cell - 1.5, cell - 1.5);
        }
      }
    }
    ctx.shadowBlur = 0;
  }

  _loop(ts) {
    if (this.rafId === null) return;
    this.rafId = requestAnimationFrame(nextTs => this._loop(nextTs));
    if (ts - this.last < 100) return;
    this.last = ts;
    this.game.step();
    this.generation++;
    if (this.generation > 300) this._seed();
    this._draw();
  }
}

// ─── Landing screen orchestrator ─────────────────────────────────────────────

export function initLanding(onPlay) {
  const landing   = document.getElementById('landing');
  const bgCanvas  = document.getElementById('landing-bg');
  const playBtns  = document.querySelectorAll('.landing-start');

  // Background simulation
  const bgSim = new BackgroundSim(bgCanvas);
  bgSim.start();

  // Rule card demos
  const demos = [
    new UnderpopDemo(document.getElementById('card-canvas-1')),
    new SurvivalDemo(document.getElementById('card-canvas-2')),
    new OverpopDemo(document.getElementById('card-canvas-3')),
    new ReproductionDemo(document.getElementById('card-canvas-4')),
  ];
  demos.forEach(d => d.start());

  const ctaSim = new CtaGunSim(document.getElementById('cta-canvas'));
  ctaSim.start();

  // Play button → transition
  const startGame = () => {
    // Prevent double-clicks
    playBtns.forEach(btn => { btn.disabled = true; });

    // Fade out landing
    landing.classList.add('landing--fade-out');

    // Determine the actual transition duration so we can set a safety fallback.
    // If prefers-reduced-motion is set or transitions are disabled the
    // transitionend event never fires, so we must not rely on it alone.
    const transDuration =
      parseFloat(getComputedStyle(landing).transitionDuration) * 1000 || 0;

    let handled = false;
    const finish = () => {
      if (handled) return;
      handled = true;

      // Stop background animation to save CPU
      bgSim.stop();
      demos.forEach(d => d.stop());
      ctaSim.stop();

      // Hide landing so game canvas can resize correctly
      landing.style.display = 'none';

      // Initialise and show the game
      onPlay();
    };

    landing.addEventListener('transitionend', finish, { once: true });
    // Safety: if transitionend never fires (e.g. prefers-reduced-motion),
    // fall back after the expected duration + a small buffer.
    setTimeout(finish, transDuration + 100);
  };

  playBtns.forEach(btn => btn.addEventListener('click', startGame));
}
