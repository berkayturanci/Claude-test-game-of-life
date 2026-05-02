import { describe, it, expect, beforeEach } from 'vitest';
import { GameOfLife } from '../src/game.js';

// ─── Constructor ──────────────────────────────────────────────────────────────

describe('GameOfLife constructor', () => {
  it('initialises with correct dimensions', () => {
    const g = new GameOfLife(10, 20);
    expect(g.cols).toBe(10);
    expect(g.rows).toBe(20);
  });

  it('starts with all dead cells', () => {
    const g = new GameOfLife(5, 5);
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 5; c++)
        expect(g.get(c, r)).toBe(0);
  });

  it('starts at generation 0', () => {
    expect(new GameOfLife(5, 5).generation).toBe(0);
  });

  it('starts with population 0', () => {
    expect(new GameOfLife(5, 5).population).toBe(0);
  });
});

// ─── get / set ────────────────────────────────────────────────────────────────

describe('get() and set()', () => {
  it('sets a cell alive and reads it back', () => {
    const g = new GameOfLife(5, 5);
    g.set(2, 3, 1);
    expect(g.get(2, 3)).toBe(1);
  });

  it('sets a cell dead and reads it back', () => {
    const g = new GameOfLife(5, 5);
    g.set(0, 0, 1);
    g.set(0, 0, 0);
    expect(g.get(0, 0)).toBe(0);
  });

  it('does not affect unrelated cells', () => {
    const g = new GameOfLife(5, 5);
    g.set(1, 1, 1);
    expect(g.get(0, 0)).toBe(0);
    expect(g.get(2, 2)).toBe(0);
    expect(g.get(1, 2)).toBe(0);
  });

  it('works at every corner', () => {
    const g = new GameOfLife(4, 4);
    const corners = [[0,0],[3,0],[0,3],[3,3]];
    for (const [c, r] of corners) {
      g.set(c, r, 1);
      expect(g.get(c, r)).toBe(1);
      g.set(c, r, 0);
    }
  });
});

// ─── toggle() ─────────────────────────────────────────────────────────────────

describe('toggle()', () => {
  it('toggles dead cell to alive', () => {
    const g = new GameOfLife(5, 5);
    g.toggle(2, 2);
    expect(g.get(2, 2)).toBe(1);
  });

  it('toggles alive cell to dead', () => {
    const g = new GameOfLife(5, 5);
    g.set(2, 2, 1);
    g.toggle(2, 2);
    expect(g.get(2, 2)).toBe(0);
  });

  it('double-toggle returns to original state', () => {
    const g = new GameOfLife(5, 5);
    g.toggle(1, 1);
    g.toggle(1, 1);
    expect(g.get(1, 1)).toBe(0);
  });
});

// ─── clear() ─────────────────────────────────────────────────────────────────

describe('clear()', () => {
  it('resets all cells to dead', () => {
    const g = new GameOfLife(5, 5);
    g.randomize(1.0); // all alive
    g.clear();
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 5; c++)
        expect(g.get(c, r)).toBe(0);
  });

  it('resets generation to 0', () => {
    const g = new GameOfLife(5, 5);
    g.step(); g.step();
    g.clear();
    expect(g.generation).toBe(0);
  });

  it('resets population to 0', () => {
    const g = new GameOfLife(5, 5);
    g.randomize(1.0);
    g.clear();
    expect(g.population).toBe(0);
  });
});

// ─── randomize() ──────────────────────────────────────────────────────────────

describe('randomize()', () => {
  it('resets generation to 0', () => {
    const g = new GameOfLife(10, 10);
    g.step(); g.step(); g.step();
    g.randomize();
    expect(g.generation).toBe(0);
  });

  it('with density 1.0 makes all cells alive', () => {
    const g = new GameOfLife(5, 5);
    g.randomize(1.0);
    expect(g.population).toBe(25);
  });

  it('with density 0.0 makes all cells dead', () => {
    const g = new GameOfLife(5, 5);
    g.randomize(0.0);
    expect(g.population).toBe(0);
  });

  it('produces values only 0 or 1', () => {
    const g = new GameOfLife(10, 10);
    g.randomize(0.5);
    for (let i = 0; i < g.grid.length; i++) {
      expect(g.grid[i] === 0 || g.grid[i] === 1).toBe(true);
    }
  });
});

// ─── population getter ────────────────────────────────────────────────────────

describe('population getter', () => {
  it('returns 0 for empty grid', () => {
    expect(new GameOfLife(5, 5).population).toBe(0);
  });

  it('returns correct count after manual set', () => {
    const g = new GameOfLife(5, 5);
    g.set(0, 0, 1);
    g.set(1, 1, 1);
    g.set(4, 4, 1);
    expect(g.population).toBe(3);
  });

  it('returns total cell count when all alive', () => {
    const g = new GameOfLife(4, 3);
    g.randomize(1.0);
    expect(g.population).toBe(12);
  });

  it('decreases after clearing a cell', () => {
    const g = new GameOfLife(5, 5);
    g.set(0, 0, 1);
    g.set(1, 1, 1);
    expect(g.population).toBe(2);
    g.set(0, 0, 0);
    expect(g.population).toBe(1);
  });
});

// ─── countNeighbors() ─────────────────────────────────────────────────────────

describe('countNeighbors()', () => {
  it('returns 0 when all neighbours are dead', () => {
    const g = new GameOfLife(5, 5);
    expect(g.countNeighbors(2, 2)).toBe(0);
  });

  it('counts all 8 neighbours correctly in the interior', () => {
    // Fill all 8 neighbours of (2,2) on a 5×5 grid
    const g = new GameOfLife(5, 5);
    const neighbours = [
      [1,1],[2,1],[3,1],
      [1,2],      [3,2],
      [1,3],[2,3],[3,3],
    ];
    for (const [c, r] of neighbours) g.set(c, r, 1);
    expect(g.countNeighbors(2, 2)).toBe(8);
  });

  it('does not count the cell itself', () => {
    const g = new GameOfLife(5, 5);
    g.set(2, 2, 1); // only centre alive
    expect(g.countNeighbors(2, 2)).toBe(0);
  });

  // ── Toroidal wrapping ──────────────────────────────────────────────────────

  it('wraps correctly at the top-left corner (0,0)', () => {
    const g = new GameOfLife(5, 5);
    // All 8 topological neighbours of (0,0) on a 5×5 toroidal grid:
    //   (4,4) (0,4) (1,4)
    //   (4,0)       (1,0)
    //   (4,1) (0,1) (1,1)
    const neighbours = [
      [4,4],[0,4],[1,4],
      [4,0],      [1,0],
      [4,1],[0,1],[1,1],
    ];
    for (const [c, r] of neighbours) g.set(c, r, 1);
    expect(g.countNeighbors(0, 0)).toBe(8);
  });

  it('wraps correctly at the top-right corner (cols-1, 0)', () => {
    const g = new GameOfLife(5, 5);
    const neighbours = [
      [3,4],[4,4],[0,4],
      [3,0],      [0,0],
      [3,1],[4,1],[0,1],
    ];
    for (const [c, r] of neighbours) g.set(c, r, 1);
    expect(g.countNeighbors(4, 0)).toBe(8);
  });

  it('wraps correctly at the bottom-left corner (0, rows-1)', () => {
    const g = new GameOfLife(5, 5);
    const neighbours = [
      [4,3],[0,3],[1,3],
      [4,4],      [1,4],
      [4,0],[0,0],[1,0],
    ];
    for (const [c, r] of neighbours) g.set(c, r, 1);
    expect(g.countNeighbors(0, 4)).toBe(8);
  });

  it('wraps correctly at the bottom-right corner (cols-1, rows-1)', () => {
    const g = new GameOfLife(5, 5);
    const neighbours = [
      [3,3],[4,3],[0,3],
      [3,4],      [0,4],
      [3,0],[4,0],[0,0],
    ];
    for (const [c, r] of neighbours) g.set(c, r, 1);
    expect(g.countNeighbors(4, 4)).toBe(8);
  });

  it('wraps correctly along the top edge (interior column)', () => {
    const g = new GameOfLife(5, 5);
    // Neighbours of (2, 0): bottom row wraps to row 4
    const neighbours = [
      [1,4],[2,4],[3,4],
      [1,0],      [3,0],
      [1,1],[2,1],[3,1],
    ];
    for (const [c, r] of neighbours) g.set(c, r, 1);
    expect(g.countNeighbors(2, 0)).toBe(8);
  });

  it('wraps correctly along the left edge (interior row)', () => {
    const g = new GameOfLife(5, 5);
    // Neighbours of (0, 2): right column wraps to col 4
    const neighbours = [
      [4,1],[0,1],[1,1],
      [4,2],      [1,2],
      [4,3],[0,3],[1,3],
    ];
    for (const [c, r] of neighbours) g.set(c, r, 1);
    expect(g.countNeighbors(0, 2)).toBe(8);
  });

  it('returns correct partial count (3 neighbours)', () => {
    const g = new GameOfLife(5, 5);
    g.set(1, 1, 1);
    g.set(2, 1, 1);
    g.set(3, 1, 1);
    expect(g.countNeighbors(2, 2)).toBe(3);
  });
});

// ─── step() – Conway's rules ──────────────────────────────────────────────────

describe('step() – Conway rules', () => {
  it('increments generation by 1 each call', () => {
    const g = new GameOfLife(5, 5);
    g.step();
    expect(g.generation).toBe(1);
    g.step();
    expect(g.generation).toBe(2);
  });

  // Rule 1: alive cell with <2 neighbours dies (underpopulation)
  it('alive cell with 0 neighbours dies', () => {
    const g = new GameOfLife(5, 5);
    g.set(2, 2, 1);
    g.step();
    expect(g.get(2, 2)).toBe(0);
  });

  it('alive cell with 1 neighbour dies', () => {
    const g = new GameOfLife(5, 5);
    g.set(2, 2, 1);
    g.set(2, 1, 1);
    g.step();
    expect(g.get(2, 2)).toBe(0);
  });

  // Rule 2: alive cell with 2 or 3 neighbours survives
  it('alive cell with 2 neighbours survives', () => {
    const g = new GameOfLife(5, 5);
    g.set(2, 2, 1);
    g.set(2, 1, 1);
    g.set(2, 3, 1);
    g.step();
    expect(g.get(2, 2)).toBe(1);
  });

  it('alive cell with 3 neighbours survives', () => {
    const g = new GameOfLife(5, 5);
    g.set(2, 2, 1);
    g.set(1, 1, 1);
    g.set(2, 1, 1);
    g.set(3, 1, 1);
    g.step();
    expect(g.get(2, 2)).toBe(1);
  });

  // Rule 3: alive cell with >3 neighbours dies (overpopulation)
  it('alive cell with 4 neighbours dies', () => {
    const g = new GameOfLife(5, 5);
    g.set(2, 2, 1);
    g.set(1, 1, 1);
    g.set(2, 1, 1);
    g.set(3, 1, 1);
    g.set(1, 2, 1);
    g.step();
    expect(g.get(2, 2)).toBe(0);
  });

  // Rule 4: dead cell with exactly 3 neighbours becomes alive (reproduction)
  it('dead cell with exactly 3 neighbours becomes alive', () => {
    const g = new GameOfLife(5, 5);
    g.set(1, 1, 1);
    g.set(2, 1, 1);
    g.set(3, 1, 1);
    g.step();
    expect(g.get(2, 2)).toBe(1);
  });

  it('dead cell with 2 neighbours stays dead', () => {
    const g = new GameOfLife(5, 5);
    g.set(1, 1, 1);
    g.set(2, 1, 1);
    g.step();
    expect(g.get(2, 2)).toBe(0);
  });

  it('dead cell with 4 neighbours stays dead', () => {
    const g = new GameOfLife(5, 5);
    g.set(1, 1, 1);
    g.set(2, 1, 1);
    g.set(3, 1, 1);
    g.set(1, 2, 1);
    g.step();
    expect(g.get(2, 2)).toBe(0);
  });

  // ── Still lifes (should be stable after any number of steps) ──────────────

  it('Block (2×2 still life) is stable', () => {
    // Block at (1,1)-(2,2)
    const g = new GameOfLife(6, 6);
    g.set(1, 1, 1); g.set(2, 1, 1);
    g.set(1, 2, 1); g.set(2, 2, 1);
    g.step();
    expect(g.get(1, 1)).toBe(1);
    expect(g.get(2, 1)).toBe(1);
    expect(g.get(1, 2)).toBe(1);
    expect(g.get(2, 2)).toBe(1);
    expect(g.population).toBe(4);
  });

  // ── Oscillators ───────────────────────────────────────────────────────────

  it('Blinker (period-2 oscillator) horizontal → vertical → horizontal', () => {
    //  Initial (horizontal):  _ X _
    //                         _ X _
    //                         _ X _
    const g = new GameOfLife(5, 5);
    g.set(2, 1, 1); g.set(2, 2, 1); g.set(2, 3, 1);
    g.step();
    // Should become vertical: _ _ _ / X X X / _ _ _
    expect(g.get(1, 2)).toBe(1);
    expect(g.get(2, 2)).toBe(1);
    expect(g.get(3, 2)).toBe(1);
    expect(g.get(2, 1)).toBe(0);
    expect(g.get(2, 3)).toBe(0);
    g.step();
    // Back to horizontal
    expect(g.get(2, 1)).toBe(1);
    expect(g.get(2, 2)).toBe(1);
    expect(g.get(2, 3)).toBe(1);
    expect(g.get(1, 2)).toBe(0);
    expect(g.get(3, 2)).toBe(0);
  });

  // ── Glider (period-4 spaceship) ───────────────────────────────────────────

  it('Glider advances correctly over 4 steps', () => {
    // Standard glider at top-left of a large grid (no wrap interference)
    // Generation 0 pattern (row, col):
    //   (0,1) (1,2) (2,0) (2,1) (2,2)
    const g = new GameOfLife(20, 20);
    g.set(1, 0, 1);
    g.set(2, 1, 1);
    g.set(0, 2, 1); g.set(1, 2, 1); g.set(2, 2, 1);

    // After 4 steps a glider shifts +1 col, +1 row
    for (let i = 0; i < 4; i++) g.step();

    expect(g.get(2, 1)).toBe(1);
    expect(g.get(3, 2)).toBe(1);
    expect(g.get(1, 3)).toBe(1);
    expect(g.get(2, 3)).toBe(1);
    expect(g.get(3, 3)).toBe(1);
    expect(g.population).toBe(5);
  });

  // ── step() uses a snapshot (next grid), not in-place mutation ─────────────

  it('uses double-buffer: next state based solely on current state', () => {
    // Three-cell horizontal line should produce a blinker (standard result),
    // not an artefact of reading already-updated cells.
    const g = new GameOfLife(5, 5);
    g.set(1, 2, 1); g.set(2, 2, 1); g.set(3, 2, 1);
    g.step();
    // Expect classic blinker flip
    expect(g.get(2, 1)).toBe(1);
    expect(g.get(2, 2)).toBe(1);
    expect(g.get(2, 3)).toBe(1);
    expect(g.get(1, 2)).toBe(0);
    expect(g.get(3, 2)).toBe(0);
  });
});

// ─── Toroidal step() ──────────────────────────────────────────────────────────

describe('step() – toroidal wrapping', () => {
  it('birth wraps across the right/left boundary', () => {
    // Three live cells straddling the right edge in the same row:
    //   cols-2, cols-1, 0  (same row) → cell at cols-1 row±1 should be born
    const cols = 5, rows = 5;
    const g = new GameOfLife(cols, rows);
    // Horizontal blinker across column wrap: cols at (3,2),(4,2),(0,2)
    g.set(3, 2, 1); g.set(4, 2, 1); g.set(0, 2, 1);
    g.step();
    // The centre of that wrapped blinker is col 4 (mod), vertical cells should appear
    expect(g.get(4, 1)).toBe(1);
    expect(g.get(4, 2)).toBe(1);
    expect(g.get(4, 3)).toBe(1);
  });

  it('glider wraps from bottom edge to top', () => {
    // Place a blinker near the bottom edge; verify the born cells appear at row 0
    const g = new GameOfLife(5, 5);
    // Horizontal at row 4 (last row)
    g.set(1, 4, 1); g.set(2, 4, 1); g.set(3, 4, 1);
    g.step();
    // Vertical blinker centred at (2,4) after rotation
    expect(g.get(2, 3)).toBe(1);
    expect(g.get(2, 4)).toBe(1);
    expect(g.get(2, 0)).toBe(1); // wrapped to row 0
  });
});
