export class GameOfLife {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.grid = new Uint8Array(cols * rows);
    this.generation = 0;
  }

  get(col, row) {
    return this.grid[row * this.cols + col];
  }

  set(col, row, val) {
    this.grid[row * this.cols + col] = val;
  }

  toggle(col, row) {
    const i = row * this.cols + col;
    this.grid[i] ^= 1;
  }

  randomize(density = 0.3) {
    for (let i = 0; i < this.grid.length; i++) {
      this.grid[i] = Math.random() < density ? 1 : 0;
    }
    this.generation = 0;
  }

  clear() {
    this.grid.fill(0);
    this.generation = 0;
  }

  // Toroidal (wrap-around) neighbour count
  countNeighbors(col, row) {
    const { cols, rows, grid } = this;
    let n = 0;
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        if (dc === 0 && dr === 0) continue;
        const c = (col + dc + cols) % cols;
        const r = (row + dr + rows) % rows;
        n += grid[r * cols + c];
      }
    }
    return n;
  }

  step() {
    const { cols, rows, grid } = this;
    const next = new Uint8Array(cols * rows);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const n = this.countNeighbors(col, row);
        const alive = grid[row * cols + col];
        next[row * cols + col] = alive
          ? (n === 2 || n === 3 ? 1 : 0)
          : (n === 3 ? 1 : 0);
      }
    }
    this.grid = next;
    this.generation++;
  }

  get population() {
    let n = 0;
    for (let i = 0; i < this.grid.length; i++) n += this.grid[i];
    return n;
  }
}
