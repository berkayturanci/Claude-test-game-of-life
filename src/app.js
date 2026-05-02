import { GameOfLife } from './game.js';
import { Renderer } from './renderer.js';
import { Controls } from './controls.js';

// Target logical pixels per cell. Smaller = more cells on screen.
const CELL_SIZE = 8;

const canvas   = document.getElementById('game-canvas');
const genEl    = document.getElementById('stat-gen');
const popEl    = document.getElementById('stat-pop');
const playBtn  = document.getElementById('btn-play');
const stepBtn  = document.getElementById('btn-step');
const randBtn  = document.getElementById('btn-rand');
const clearBtn = document.getElementById('btn-clear');
const gridBtn  = document.getElementById('btn-grid');
const speedEl  = document.getElementById('speed-range');
const speedLbl = document.getElementById('speed-label');

let game;
let renderer = new Renderer(canvas);
let controls;
let playing = false;
let speed = 10;   // steps per second
let rafId = null;
let lastTs = 0;
let resizeTimer = null;

// ─── Public UI interface passed to Controls ──────────────────────────────────

const ui = {
  get playing() { return playing; },
  togglePlay,
  step:       stepOnce,
  randomize,
  clear,
  toggleGrid,
};

// ─── Lifecycle ───────────────────────────────────────────────────────────────

function init() {
  resize(true);

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => resize(false), 120);
  });

  playBtn.addEventListener('click',  togglePlay);
  stepBtn.addEventListener('click',  stepOnce);
  randBtn.addEventListener('click',  randomize);
  clearBtn.addEventListener('click', clear);
  gridBtn.addEventListener('click',  toggleGrid);
  speedEl.addEventListener('input',  onSpeedChange);

  game.randomize();
  renderer.draw(game);
  updateStats();
}

// ─── Resize ──────────────────────────────────────────────────────────────────

function resize(firstTime) {
  const wrap = canvas.parentElement;
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  const cols = Math.max(10, Math.floor(w / CELL_SIZE));
  const rows = Math.max(10, Math.floor(h / CELL_SIZE));

  if (firstTime || !game || game.cols !== cols || game.rows !== rows) {
    const next = new GameOfLife(cols, rows);
    if (game) {
      // Preserve cells when grid dimensions change (top-left origin)
      const mc = Math.min(game.cols, cols);
      const mr = Math.min(game.rows, rows);
      for (let r = 0; r < mr; r++)
        for (let c = 0; c < mc; c++)
          next.set(c, r, game.get(c, r));
      next.generation = game.generation;
    }
    game = next;
    if (controls) controls.game = game;
  }

  renderer.resize(w, h, game.cols, game.rows);

  if (!controls) {
    controls = new Controls(canvas, renderer, game, ui);
  } else {
    controls.renderer = renderer;
  }

  renderer.draw(game);
}

// ─── Simulation loop ─────────────────────────────────────────────────────────

function loop(ts) {
  if (!playing) return;
  const interval = 1000 / speed;
  if (ts - lastTs >= interval) {
    game.step();
    renderer.draw(game);
    updateStats();
    lastTs = ts;
  }
  rafId = requestAnimationFrame(loop);
}

// ─── Actions ─────────────────────────────────────────────────────────────────

function togglePlay() {
  playing = !playing;
  playBtn.textContent   = playing ? '⏸' : '▶';
  playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  playBtn.classList.toggle('active', playing);
  if (playing) {
    lastTs = performance.now();
    rafId = requestAnimationFrame(loop);
  } else {
    cancelAnimationFrame(rafId);
  }
}

function stepOnce() {
  if (playing) return;
  game.step();
  renderer.draw(game);
  updateStats();
}

function randomize() {
  game.randomize();
  renderer.draw(game);
  updateStats();
}

function clear() {
  if (playing) togglePlay();
  game.clear();
  renderer.draw(game);
  updateStats();
}

function toggleGrid() {
  renderer.showGrid = !renderer.showGrid;
  gridBtn.classList.toggle('active', renderer.showGrid);
  renderer.draw(game);
}

function onSpeedChange() {
  speed = parseInt(speedEl.value, 10);
  speedLbl.textContent = speed + ' fps';
}

function updateStats() {
  genEl.textContent = game.generation;
  popEl.textContent = game.population;
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

// Export init so landing.js can call it after the transition completes.
export { init };
