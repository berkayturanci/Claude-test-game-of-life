/**
 * tests/landing.test.js
 *
 * Unit tests for the pure-logic helpers exported from src/landing.js.
 *
 * These functions have no DOM/canvas dependencies:
 *   - buildUnderpopFrames()  – underpopulation card frame sequence
 *   - buildSurvivalFrames()  – survival card frame sequence
 *   - buildOverpopFrames()   – overpopulation card frame sequence
 *   - stepCard5x5(g)         – one GoL step on a bounded 5×5 grid (no wrap)
 */

import { describe, it, expect } from 'vitest';
import {
  buildUnderpopFrames,
  buildSurvivalFrames,
  buildOverpopFrames,
  stepCard5x5,
} from '../src/landing.js';

// ─── stepCard5x5 ─────────────────────────────────────────────────────────────

describe('stepCard5x5()', () => {
  it('returns a Uint8Array of length 25', () => {
    const g = new Uint8Array(25);
    const next = stepCard5x5(g);
    expect(next).toBeInstanceOf(Uint8Array);
    expect(next.length).toBe(25);
  });

  it('does not mutate the input grid', () => {
    const g = new Uint8Array(25);
    g[12] = 1; // centre alive
    const copy = g.slice();
    stepCard5x5(g);
    expect(g).toEqual(copy);
  });

  it('lone cell dies (underpopulation: 0 neighbours)', () => {
    const g = new Uint8Array(25);
    g[12] = 1; // centre (row=2, col=2)
    const next = stepCard5x5(g);
    expect(next[12]).toBe(0);
  });

  it('cell with 1 neighbour dies', () => {
    const g = new Uint8Array(25);
    g[12] = 1; // centre
    g[7]  = 1; // N
    const next = stepCard5x5(g);
    expect(next[12]).toBe(0);
  });

  it('cell with 2 neighbours survives', () => {
    const g = new Uint8Array(25);
    g[12] = 1; // centre
    g[7]  = 1; // N
    g[17] = 1; // S
    const next = stepCard5x5(g);
    expect(next[12]).toBe(1);
  });

  it('cell with 3 neighbours survives', () => {
    const g = new Uint8Array(25);
    g[12] = 1; // centre (2,2)
    g[7]  = 1; // N (1,2)
    g[11] = 1; // W (2,1)
    g[13] = 1; // E (2,3)
    const next = stepCard5x5(g);
    expect(next[12]).toBe(1);
  });

  it('cell with 4 neighbours dies (overpopulation)', () => {
    const g = new Uint8Array(25);
    // cross: centre + 4 cardinal neighbours
    [7, 11, 12, 13, 17].forEach(i => { g[i] = 1; });
    const next = stepCard5x5(g);
    expect(next[12]).toBe(0); // centre dies
  });

  it('dead cell with exactly 3 neighbours is born', () => {
    const g = new Uint8Array(25);
    // Three cells above centre: row=1 cols 1,2,3
    g[6]  = 1; // (1,1)
    g[7]  = 1; // (1,2)
    g[8]  = 1; // (1,3)
    // Centre (2,2)=12 should be born
    const next = stepCard5x5(g);
    expect(next[12]).toBe(1);
  });

  it('dead cell with 2 neighbours stays dead', () => {
    const g = new Uint8Array(25);
    g[6] = 1; // (1,1)
    g[7] = 1; // (1,2)
    const next = stepCard5x5(g);
    expect(next[12]).toBe(0);
  });

  it('does NOT wrap — corner has no toroidal neighbours', () => {
    // On a non-wrapping grid, cells outside the boundary are not counted.
    // Place cells that would only be neighbours via wrapping.
    const g = new Uint8Array(25);
    g[4]  = 1; // (0,4) top-right corner
    g[20] = 1; // (4,0) bottom-left corner
    g[24] = 1; // (4,4) bottom-right corner
    // (0,0) top-left: on a non-wrapping grid its only alive neighbour
    // out of those three is none that are adjacent (none are within 1 step of (0,0))
    const next = stepCard5x5(g);
    expect(next[0]).toBe(0);  // (0,0) must not be born
  });

  it('2×2 block is stable (still life)', () => {
    // Block at rows 1-2, cols 1-2
    const g = new Uint8Array(25);
    [6, 7, 11, 12].forEach(i => { g[i] = 1; });
    const next = stepCard5x5(g);
    expect(next[6]).toBe(1);
    expect(next[7]).toBe(1);
    expect(next[11]).toBe(1);
    expect(next[12]).toBe(1);
    // population unchanged
    const pop = Array.from(next).reduce((s, v) => s + v, 0);
    expect(pop).toBe(4);
  });
});

// ─── buildUnderpopFrames ──────────────────────────────────────────────────────

describe('buildUnderpopFrames()', () => {
  it('returns exactly 4 frames', () => {
    expect(buildUnderpopFrames()).toHaveLength(4);
  });

  it('all frames are Uint8Array(25)', () => {
    for (const frame of buildUnderpopFrames()) {
      expect(frame).toBeInstanceOf(Uint8Array);
      expect(frame.length).toBe(25);
    }
  });

  it('frame 0 has exactly one live cell (centre index 12)', () => {
    const [f0] = buildUnderpopFrames();
    expect(f0[12]).toBe(1);
    const pop = Array.from(f0).reduce((s, v) => s + v, 0);
    expect(pop).toBe(1);
  });

  it('frames 1–3 are all dead', () => {
    const [, f1, f2, f3] = buildUnderpopFrames();
    for (const frame of [f1, f2, f3]) {
      const pop = Array.from(frame).reduce((s, v) => s + v, 0);
      expect(pop).toBe(0);
    }
  });

  it('frame 0 centre cell correctly dies after one real GoL step', () => {
    // The underpop demo shows a lone cell dying; verify via stepCard5x5
    const [f0] = buildUnderpopFrames();
    const after = stepCard5x5(f0);
    expect(after[12]).toBe(0);
    const pop = Array.from(after).reduce((s, v) => s + v, 0);
    expect(pop).toBe(0);
  });
});

// ─── buildSurvivalFrames ──────────────────────────────────────────────────────

describe('buildSurvivalFrames()', () => {
  it('returns exactly 4 frames', () => {
    expect(buildSurvivalFrames()).toHaveLength(4);
  });

  it('all frames are Uint8Array(25)', () => {
    for (const frame of buildSurvivalFrames()) {
      expect(frame).toBeInstanceOf(Uint8Array);
      expect(frame.length).toBe(25);
    }
  });

  it('every frame has population 4 (the 2×2 block)', () => {
    for (const frame of buildSurvivalFrames()) {
      const pop = Array.from(frame).reduce((s, v) => s + v, 0);
      expect(pop).toBe(4);
    }
  });

  it('the 2×2 block occupies indices 6,7,11,12', () => {
    const frames = buildSurvivalFrames();
    for (const frame of frames) {
      expect(frame[6]).toBe(1);
      expect(frame[7]).toBe(1);
      expect(frame[11]).toBe(1);
      expect(frame[12]).toBe(1);
    }
  });

  it('block is a genuine still life — survives one GoL step', () => {
    const [f0] = buildSurvivalFrames();
    const after = stepCard5x5(f0);
    expect(after[6]).toBe(1);
    expect(after[7]).toBe(1);
    expect(after[11]).toBe(1);
    expect(after[12]).toBe(1);
    const pop = Array.from(after).reduce((s, v) => s + v, 0);
    expect(pop).toBe(4);
  });
});

// ─── buildOverpopFrames ───────────────────────────────────────────────────────

describe('buildOverpopFrames()', () => {
  it('returns exactly 4 frames', () => {
    expect(buildOverpopFrames()).toHaveLength(4);
  });

  it('all frames are Uint8Array(25)', () => {
    for (const frame of buildOverpopFrames()) {
      expect(frame).toBeInstanceOf(Uint8Array);
      expect(frame.length).toBe(25);
    }
  });

  it('frame 0 is the cross pattern (5 cells: centre + 4 cardinal)', () => {
    const [f0] = buildOverpopFrames();
    // cross indices: N=7, W=11, centre=12, E=13, S=17
    expect(f0[7]).toBe(1);
    expect(f0[11]).toBe(1);
    expect(f0[12]).toBe(1);
    expect(f0[13]).toBe(1);
    expect(f0[17]).toBe(1);
    const pop = Array.from(f0).reduce((s, v) => s + v, 0);
    expect(pop).toBe(5);
  });

  it('frame 1 is the result of one GoL step applied to the cross', () => {
    const [f0, f1] = buildOverpopFrames();
    const expected = stepCard5x5(f0);
    expect(f1).toEqual(expected);
  });

  it('frame 1 centre cell (index 12) is dead — overpopulation rule', () => {
    const [, f1] = buildOverpopFrames();
    expect(f1[12]).toBe(0);
  });

  it('frame 1 cross arms (N, W, E, S) survive', () => {
    // Each arm of the cross had 3 neighbours (centre + two adjacent arms) → survives
    const [, f1] = buildOverpopFrames();
    expect(f1[7]).toBe(1);  // N
    expect(f1[11]).toBe(1); // W
    expect(f1[13]).toBe(1); // E
    expect(f1[17]).toBe(1); // S
  });

  it('frames 2 and 3 are empty (pause before loop reset)', () => {
    const [, , f2, f3] = buildOverpopFrames();
    for (const frame of [f2, f3]) {
      const pop = Array.from(frame).reduce((s, v) => s + v, 0);
      expect(pop).toBe(0);
    }
  });
});
