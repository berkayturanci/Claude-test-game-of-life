import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameOfLife } from '../src/game.js';
import { Renderer, liveCellColor } from '../src/renderer.js';

function makeCtx() {
  const calls = [];
  const ctx = {
    _fillStyle: '',
    _strokeStyle: '',
    shadowColor: '',
    shadowBlur: 0,
    lineWidth: 0,
    setTransform: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn((x, y, w, h) => {
      calls.push({
        fillStyle: ctx._fillStyle,
        shadowColor: ctx.shadowColor,
        shadowBlur: ctx.shadowBlur,
        x,
        y,
        w,
        h,
      });
    }),
    set fillStyle(value) { this._fillStyle = value; },
    get fillStyle() { return this._fillStyle; },
    set strokeStyle(value) { this._strokeStyle = value; },
    get strokeStyle() { return this._strokeStyle; },
  };
  return { ctx, calls };
}

function cssMap(values) {
  return name => ({
    getPropertyValue: prop => values[prop] ?? '',
  }).getPropertyValue(name);
}

describe('liveCellColor()', () => {
  it('uses sparse green for cells with fewer than 2 neighbours', () => {
    expect(liveCellColor(0)).toBe('rgb(0,255,160)');
    expect(liveCellColor(1)).toBe('rgb(0,255,160)');
  });

  it('uses stable teal for cells with exactly 2 neighbours', () => {
    expect(liveCellColor(2)).toBe('rgb(0,237,207)');
  });

  it('uses crowded cyan for cells with 3 or more neighbours', () => {
    expect(liveCellColor(3)).toBe('rgb(0,220,255)');
    expect(liveCellColor(8)).toBe('rgb(0,220,255)');
  });

  it('accepts CSS-resolved color overrides', () => {
    const colors = { sparse: 'green', stable: 'teal', crowded: 'cyan' };
    expect(liveCellColor(1, colors)).toBe('green');
    expect(liveCellColor(2, colors)).toBe('teal');
    expect(liveCellColor(3, colors)).toBe('cyan');
  });
});

describe('Renderer', () => {
  let ctx;
  let calls;
  let canvas;

  beforeEach(() => {
    ({ ctx, calls } = makeCtx());
    canvas = {
      width: 0,
      height: 0,
      style: {},
      getContext: vi.fn(() => ctx),
    };

    globalThis.window = { devicePixelRatio: 2 };
    globalThis.document = { documentElement: {} };
    globalThis.getComputedStyle = vi.fn(() => ({
      getPropertyValue: cssMap({
        '--dead': '#050a0e',
        '--cell-sparse': 'green',
        '--cell-stable': 'teal',
        '--cell-crowded': 'cyan',
        '--grid': '#123456',
      }),
    }));
  });

  it('resizes the physical canvas for devicePixelRatio while keeping logical CSS size', () => {
    const renderer = new Renderer(canvas);
    renderer.resize(300, 150, 30, 15);

    expect(canvas.width).toBe(600);
    expect(canvas.height).toBe(300);
    expect(canvas.style.width).toBe('300px');
    expect(canvas.style.height).toBe('150px');
    expect(ctx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
  });

  it('maps canvas coordinates to grid cells', () => {
    const renderer = new Renderer(canvas);
    renderer.resize(300, 150, 30, 15);

    expect(renderer.canvasToCell(29, 19)).toEqual({ col: 2, row: 1 });
  });

  it('draws live cells with prototype-style neighbour-count colours', () => {
    const renderer = new Renderer(canvas);
    renderer.resize(50, 30, 5, 3);

    const game = new GameOfLife(5, 3);
    game.set(1, 1, 1);
    game.set(2, 1, 1);
    game.set(3, 1, 1);
    game.countNeighbors = vi.fn((col) => ({ 1: 1, 2: 2, 3: 3 })[col] ?? 0);

    renderer.draw(game);

    const liveCellCalls = calls.slice(1, 4);
    expect(liveCellCalls.map(call => call.fillStyle)).toEqual(['green', 'teal', 'cyan']);
    expect(liveCellCalls.map(call => call.shadowColor)).toEqual(['green', 'teal', 'cyan']);
    expect(liveCellCalls.every(call => call.shadowBlur === 8)).toBe(true);
  });

  it('resets glow before drawing grid lines', () => {
    const renderer = new Renderer(canvas);
    renderer.resize(50, 30, 5, 3);

    const game = new GameOfLife(5, 3);
    game.set(2, 1, 1);
    renderer.draw(game);

    expect(ctx.stroke).toHaveBeenCalledOnce();
    expect(ctx.shadowBlur).toBe(0);
    expect(ctx.strokeStyle).toBe('#123456');
  });
});
