"""
Game of Life – Subagent Orchestrator
=====================================
Routes development tasks to specialized subagents.

Usage:
    python orchestrator.py "Add a glider pattern button"
    python orchestrator.py  # prompts for task interactively

Requires:
    ANTHROPIC_API_KEY env var (see .env.example)
    pip install -r requirements.txt
"""

import asyncio
import os
import sys
from pathlib import Path

from claude_agent_sdk import AgentDefinition, ClaudeAgentOptions, query

# Resolve repo root so agents always operate on the correct working directory
REPO_ROOT = str(Path(__file__).resolve().parent.parent)

AGENTS: dict[str, AgentDefinition] = {
    "game-developer": AgentDefinition(
        description=(
            "Game of Life logic specialist. Use for: modifying simulation rules, "
            "adding/removing cell patterns (gliders, still lifes, oscillators), "
            "changing grid topology, or fixing simulation bugs in src/game.js."
        ),
        prompt="""You are a Game of Life simulation specialist working in JavaScript.

Core files:
- src/game.js  – GameOfLife class (Uint8Array grid, toroidal wrap-around)
- src/app.js   – wires the game to the UI; call resize()/init() to understand flow

Rules:
- Alive cell survives with 2 or 3 live neighbours.
- Dead cell becomes alive with exactly 3 live neighbours.
- All other cases die or stay dead.

Grid uses row-major Uint8Array: index = row * cols + col.
Always preserve wrap-around neighbour logic when editing countNeighbors.
Update CLAUDE.md if you add new public methods.""",
        tools=["Read", "Edit", "Write", "Glob", "Grep"],
        model="sonnet",
    ),
    "ui-designer": AgentDefinition(
        description=(
            "UI and visual design specialist. Use for: layout changes, colour themes, "
            "button styling, typography, adding/removing UI controls in index.html or styles/main.css."
        ),
        prompt="""You are a UI/UX designer for a mobile-first Game of Life web app.

Core files:
- index.html       – HTML structure and control wiring
- styles/main.css  – all CSS, dark-themed (slate palette + green-400 accent #4ade80)

Rules:
- Mobile-first, minimum touch target 44×44 px (Apple HIG).
- CSS custom properties for colours; never use magic numbers.
- Keep the dark theme (--bg: #0f172a, --surface: #1e293b, --accent: #4ade80).
- Canvas must fill the available vertical space between header and controls.""",
        tools=["Read", "Edit", "Write", "Glob"],
        model="sonnet",
    ),
    "mobile-optimizer": AgentDefinition(
        description=(
            "iOS Safari and touch-event specialist. Use for: touch drawing bugs, "
            "scroll/bounce prevention on canvas, viewport scaling issues, "
            "devicePixelRatio rendering, or any iOS-specific behaviour."
        ),
        prompt="""You are a mobile web specialist focused on iOS Safari compatibility.

Core files:
- src/controls.js  – all touch and mouse event handling
- src/renderer.js  – devicePixelRatio canvas scaling
- index.html       – viewport meta tag

Rules:
- Touch listeners on the canvas use {passive: false} so preventDefault() works.
- canvas has touch-action: none in CSS to suppress browser scroll handling.
- renderer.resize() must call ctx.setTransform(dpr, 0, 0, dpr, 0, 0) after resizing.
- Never use deprecated touchcancel without also handling touchend.""",
        tools=["Read", "Edit", "Write", "Bash", "Glob", "Grep"],
        model="sonnet",
    ),
    "performance-tuner": AgentDefinition(
        description=(
            "Canvas rendering performance specialist. Use for: frame-rate drops, "
            "large-grid slowdowns, requestAnimationFrame loop optimisation, "
            "or profiling suggestions."
        ),
        prompt="""You are a performance optimisation specialist for canvas-based simulations.

Core files:
- src/game.js     – simulation step (inner loop, Uint8Array)
- src/renderer.js – draw() call (canvas 2D API)
- src/app.js      – RAF loop and speed control

Techniques to consider:
- Dirty-rect rendering: only redraw changed cells.
- Skip grid lines when cellW <= 5 (already gated).
- Use typed arrays for neighbour counting.
- Adaptive frame-skip when step() takes longer than the frame budget.
- OffscreenCanvas for background simulation (if browser supports it).""",
        tools=["Read", "Edit", "Write", "Bash", "Glob", "Grep"],
        model="sonnet",
    ),
}

ORCHESTRATOR_SYSTEM = """You are the lead developer for a Game of Life web application.
The project lives at: """ + REPO_ROOT + """

Structure:
  index.html        – GitHub Pages entry point
  styles/main.css   – mobile-first CSS
  src/game.js       – simulation logic
  src/renderer.js   – canvas renderer
  src/controls.js   – mouse/touch input
  src/app.js        – wires everything together
  agents/           – this orchestrator (Python, not part of the web app)

Available subagents (delegate via the Agent tool):
  game-developer    – simulation logic and patterns
  ui-designer       – HTML/CSS visual design
  mobile-optimizer  – iOS/touch compatibility
  performance-tuner – rendering performance

Delegate to the most appropriate subagent. For tasks spanning multiple concerns,
delegate sequentially: logic first, then UI, then mobile polish."""


async def run(task: str) -> None:
    print(f"\n[orchestrator] task: {task}\n{'─' * 60}")

    async for message in query(
        prompt=task,
        options=ClaudeAgentOptions(
            system_prompt=ORCHESTRATOR_SYSTEM,
            allowed_tools=["Read", "Edit", "Write", "Bash", "Glob", "Grep", "Agent"],
            agents=AGENTS,
            permission_mode="acceptEdits",
            cwd=REPO_ROOT,
        ),
    ):
        if hasattr(message, "content") and message.content:
            for block in message.content if isinstance(message.content, list) else []:
                if hasattr(block, "text") and block.text:
                    print(block.text, end="", flush=True)
        if hasattr(message, "result"):
            print(f"\n{'─' * 60}\n[done]\n{message.result}")


if __name__ == "__main__":
    if not os.environ.get("ANTHROPIC_API_KEY"):
        sys.exit("Error: ANTHROPIC_API_KEY environment variable is not set.\nSee agents/.env.example")

    task = " ".join(sys.argv[1:]).strip() if len(sys.argv) > 1 else input("Task: ").strip()
    if not task:
        sys.exit("No task provided.")

    asyncio.run(run(task))
