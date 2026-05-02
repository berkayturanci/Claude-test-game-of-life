# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

Codex and Claude may both work in this repository. Assume other agents or a parent process can update files, branches, and pull requests in parallel. Inspect the working tree before editing, keep changes scoped, and never revert changes you did not make unless the user explicitly asks.

## Project

Conway's Game of Life — a static web app served via GitHub Pages, playable on desktop and iOS Safari. No build step, no bundler: plain ES modules loaded directly by the browser.

## Serving locally

```bash
# any static server works; Python is always available:
python3 -m http.server 8080
# open http://localhost:8080
```

## Validation

```bash
npm test
```

The app is plain static ES modules, but this repo can include Vitest coverage for pure logic. Run `npm test` when touching simulation logic, landing-page helpers, or shared browser-facing modules. For visual or touch changes, also serve locally and smoke-test the page in a browser.

## Collaboration rules

- Do not edit application behaviour files unless the task explicitly calls for it. Behaviour files are `index.html`, `styles/main.css`, and `src/**`.
- Before modifying files, check `git status --short` and read any relevant existing changes. Treat uncommitted edits as user/agent work.
- Keep Codex-specific repository guidance in `AGENTS.md`; keep Claude-specific guidance in `CLAUDE.md`.
- For GitHub collaboration metadata, prefer `.github/**` files such as PR templates, issue templates, and workflows.
- When a task is documentation- or workflow-only, avoid touching runtime code, generated dependency files, or unrelated README sections.

## File structure

```
index.html          – entry point (GitHub Pages root)
styles/main.css     – all CSS; dark-themed with CSS custom properties
src/
  game.js           – GameOfLife class  (simulation logic)
  renderer.js       – Renderer class    (canvas drawing)
  controls.js       – Controls class    (mouse + touch + keyboard)
  app.js            – wires the three classes together; owns the RAF loop
agents/
  orchestrator.py   – Claude/Codex agent orchestrator guidance (see below)
  requirements.txt
  .env.example
.github/
  workflows/        – GitHub Pages deploy and CI checks
  ISSUE_TEMPLATE/   – GitHub issue forms
  pull_request_template.md
```

## Architecture

### Data flow

```
app.js
  ├── GameOfLife   (src/game.js)     – pure logic, Uint8Array grid
  ├── Renderer     (src/renderer.js) – canvas 2D API, reads game.grid
  └── Controls     (src/controls.js) – writes game.set(), calls ui.*
```

`app.js` owns all mutable state: the `game` and `renderer` instances, the `playing` flag, and the RAF loop. It passes a lightweight `ui` interface object to `Controls` so controls can trigger actions without importing `app.js`.

### Grid

`GameOfLife` stores cells in a flat `Uint8Array` with row-major indexing: `index = row * cols + col`. The grid wraps toroidally — all four edges connect to the opposite edge.

### Rendering

`Renderer.resize(logicalW, logicalH, cols, rows)` must be called whenever the canvas container changes size. It sets the canvas's physical pixel dimensions (`width`/`height`) to `logical * devicePixelRatio` and calls `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` so all subsequent draw calls use logical pixels. Grid lines are suppressed when `cellW <= 5` to avoid visual noise at small cell sizes.

Colours are read from CSS custom properties (`--accent`, `--dead`, `--grid`) on each `draw()` call, so CSS theme changes take effect without touching JS.

### iOS / touch

- `touch-action: none` on `#game-canvas` (CSS) stops the browser from hijacking touch events for scroll/zoom.
- All touch listeners use `{ passive: false }` so `preventDefault()` is legal.
- `Controls` fixes the draw intent (alive→erase or dead→draw) on `touchstart` and holds it for the whole stroke, matching mouse drag behaviour.

### Speed / RAF loop

`app.js` uses a single `requestAnimationFrame` loop. The effective step rate is controlled by comparing `timestamp - lastTs` against `1000 / speed`. This means the simulation runs at most `speed` steps per second regardless of monitor refresh rate.

## Subagent orchestration

`agents/orchestrator.py` may be used by the companion agent process to route natural-language development tasks to specialised subagents:

| Subagent | Scope |
|---|---|
| `game-developer` | `src/game.js` — rules, patterns, grid topology |
| `ui-designer` | `index.html`, `styles/main.css` — layout, colours, controls |
| `mobile-optimizer` | `src/controls.js`, `src/renderer.js` — touch/iOS issues |
| `performance-tuner` | RAF loop, canvas rendering, large-grid speed |

### Setup

```bash
cd agents
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # add your ANTHROPIC_API_KEY
```

### Usage

```bash
# Delegate a task to the appropriate subagent automatically:
python orchestrator.py "Add a Glider Gun pattern button"
python orchestrator.py "Increase default cell size on mobile"
python orchestrator.py "The grid flickers on iPhone 14 – fix it"

# Interactive mode:
python orchestrator.py
```

The orchestrator may write files directly without prompting. Review `git status --short` and `git diff` after running it or after any parent process reports agent activity.

## GitHub flow

- Open pull requests with the repo PR template and include test results.
- Keep GitHub Pages deploy concerns in `.github/workflows/deploy.yml`.
- Keep PR checks lightweight: install dependencies with `npm ci` and run `npm test` when `package-lock.json` is present.
- Mention browser/iOS Safari manual checks for canvas, touch, or layout changes.

## Conway's Game of Life rules

1. A live cell with 2 or 3 live neighbours survives.
2. A dead cell with exactly 3 live neighbours becomes alive.
3. All other cells die or remain dead.

Neighbours are the 8 surrounding cells (Moore neighbourhood). The grid wraps at edges.

## CSS design tokens

All colours are CSS custom properties on `:root`. Change only those variables to retheme the app:

| Property | Value | Usage |
|---|---|---|
| `--bg` | `#0f172a` | page background, dead cells |
| `--surface` | `#1e293b` | header, controls bar |
| `--border` | `#334155` | dividers, button borders |
| `--accent` | `#4ade80` | live cells, active buttons |
| `--muted` | `#94a3b8` | secondary text |

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Space` | Play / Pause |
| `→` or `N` | Step one generation (while paused) |
| `R` | Randomize |
| `C` | Clear |
| `G` | Toggle grid |
