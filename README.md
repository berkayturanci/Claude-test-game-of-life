# Conway's Game of Life

A browser-playable Conway's Game of Life implementation served as a static GitHub Pages site. There is no build step and no bundler: the app is plain HTML, CSS, and ES modules loaded directly by the browser.

Live site: https://berkayturanci.github.io/Claude-test-game-of-life/

## Run Locally

Serve the repository root with any static server:

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080.

## Test

```bash
npm test
```

Tests use Vitest for pure logic and browser-facing helper coverage.

## Controls

- Click/tap or drag on the canvas to draw or erase cells. The first cell in a stroke sets the stroke intent.
- Play/Pause starts and stops the simulation.
- Step advances one generation while paused.
- Rand randomizes the board.
- Clear resets all cells.
- Grid toggles grid-line rendering.
- Speed changes the simulation rate from 1 to 60 fps.
- Patterns loads a preset pattern centered on the board.

### Keyboard Shortcuts

| Key | Action |
|---|---|
| Space | Play / Pause |
| Right Arrow or N | Step one generation while paused |
| R | Randomize |
| C | Clear |
| G | Toggle grid |

## Pattern Support

Preset patterns live in `src/patterns.js` and are exposed through the Patterns menu. Current presets include Glider, Gosper Glider Gun, Lightweight Spaceship, Pulsar, Blinker, Toad, Beacon, Block, R-pentomino, Diehard, and Acorn.

## File Structure

```text
index.html          Entry point and landing/game shell
styles/main.css     CSS, layout, theme tokens, and touch behavior
src/
  app.js            App wiring, RAF loop, controls, and resize handling
  game.js           GameOfLife simulation logic
  renderer.js       Canvas rendering
  controls.js       Mouse, touch, and keyboard input
  landing.js        Landing-page animation and transition
  patterns.js       Preset pattern definitions
tests/              Vitest test coverage
.github/workflows/  CI and GitHub Pages deploy workflows
AGENTS.md           Codex repository guidance
CLAUDE.md           Claude repository guidance
```

## Architecture

`app.js` owns the mutable runtime state: the `GameOfLife` instance, `Renderer`, `Controls`, play/pause state, speed, and the single `requestAnimationFrame` loop. `GameOfLife` stores the board as a row-major `Uint8Array` and applies Conway's rules with toroidal edge wrapping. `Renderer` draws the grid to a 2D canvas with device-pixel-ratio scaling. `Controls` maps mouse, touch, and keyboard input to a small UI interface passed in by `app.js`.

## GitHub Workflows

- CI runs on pull requests and pushes to `main`, installs dependencies with `npm ci`, and runs `npm test`.
- Deploy runs on pushes to `main` or manual dispatch, uploads the repository root as a GitHub Pages artifact, and publishes it with `actions/deploy-pages`.

## Collaboration

Codex and Claude can both work in this repository. Follow `AGENTS.md` for Codex-specific guidance and `CLAUDE.md` for Claude-specific guidance. Check the working tree before editing, keep changes scoped, and do not revert changes made by other agents or the parent GitHub issue/PR process.
