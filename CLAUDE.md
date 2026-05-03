# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Conway's Game of Life — a static web app served via GitHub Pages, playable on desktop and iOS Safari. No build step, no bundler: plain ES modules loaded directly by the browser.

## Serving locally

```bash
# any static server works; Python is always available:
python3 -m http.server 8080
# open http://localhost:8080
```

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
  orchestrator.py   – Claude Agent SDK orchestrator (see below)
  requirements.txt
  .env.example
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

## Subagent orchestrator

`agents/orchestrator.py` uses the **Claude Agent SDK** to route natural-language development tasks to specialised subagents:

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

The orchestrator uses `permission_mode="acceptEdits"` — it writes files directly without prompting. Review the git diff after running it.

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

## Commit conventions

Use the `type(scope): description` format from Conventional Commits:

| Type | When to use |
|---|---|
| `feat` | New feature or behaviour |
| `fix` | Bug fix |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `docs` | Documentation only |
| `refactor` | Code restructure, no behaviour change |
| `chore` | Tooling, config, CI changes |
| `ci` | GitHub Actions / workflow changes |

Examples: `feat: add Pulsar pattern`, `fix: wrap-around off-by-one on resize`, `perf: skip redraw when no cells changed`

## Testing

Tests live in `tests/` and run with Vitest (`npm test`).

- Write tests in **Arrange → Act → Assert** order.
- Name tests as full sentences: `"dead cell with exactly 3 neighbours becomes alive"`.
- Target **≥ 80 % branch coverage** for `src/game.js` (pure logic, easy to cover).
- Do not test the canvas API or DOM — unit-test the `GameOfLife` class only.
- Run `npm test` before pushing any change to `src/game.js`.

## Agent safety rules — preventing file overwrite (ezilme)

These rules exist because PR #11 overwrote a major redesign (commits `523c3c4`, `61753e8`, `b776307`) that was pushed to main after the agent's session started. Follow them on every task.

### Before touching any file

1. **Always sync before branching.**
   ```bash
   git fetch origin
   git log origin/main -5          # see what landed since your session started
   ```
   If `origin/main` has commits you don't have locally, pull first:
   ```bash
   git pull origin main
   ```

2. **Branch from `origin/main`, not from local HEAD.**
   ```bash
   git checkout -b feat/my-thing origin/main
   ```
   Never branch from a local snapshot that may be behind.

3. **Check the last-touching commit for each file you plan to modify.**
   ```bash
   git log --oneline -3 -- src/landing.js styles/main.css
   ```
   If the file was touched in a commit you don't recognise, read it fresh with `Read` before writing.

### When writing files

4. **Prefer targeted `Edit` over full-file `Write`.** `Write` replaces the entire file. If any line was added after your last `Read`, you silently drop it. Use `Edit` with the smallest possible old/new strings.

5. **Never push a full-file replacement for a file touched in the last 5 commits** without first diffing against `origin/main`:
   ```bash
   git diff origin/main -- src/landing.js
   ```

6. **After staging, diff before committing.**
   ```bash
   git diff --cached --stat
   ```
   If the stat shows unexpected deletions (e.g. `-570` lines in a CSS file), stop and investigate.

### When creating PRs

7. **State the base commit in the PR description** so a reviewer can verify the branch was cut from the latest main, not from an older snapshot.

8. **If a PR was created before these checks were done, do NOT merge it.** Fetch main, rebase, re-read every changed file, then re-push.

### Cloudflare Pages deployment

The site deploys to Cloudflare Pages via `.github/workflows/cloudflare-pages.yml`.
Two repository secrets are required (set in GitHub → Settings → Secrets → Actions):

| Secret | Where to get it |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens → Create Token (Pages: Edit) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → right-hand sidebar on any zone page |

The Cloudflare Pages project name is `game-of-life` (must match the project created in the Cloudflare dashboard). No build command — the site is deployed as-is from the repo root.
