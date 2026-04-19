# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Read `AGENT_GUIDE.md` first

`AGENT_GUIDE.md` is the authoritative developer guide. It contains a "How to make common changes" matrix mapping every typical change (colours, sessions, pace tables, block structure, mileage growth, day assignments, taper, persistence, navigation) to the exact file and function to edit. Consult it before touching anything in `engine/`, `data/`, or `src/ui/`.

## Running the app

No build step, no `package.json`. The app is vanilla JS loaded via native ES modules (`<script type="module">`).

```bash
# Open directly
open index.html

# Or serve statically (required if you hit CORS on fetch() for data/*.json)
npx serve .
python3 -m http.server 8080
```

## Running tests

Tests are browser-run, not CLI. There is no `npm test`.

- **Full grouped suite:** open `tests/index.html` in a browser. The tests are inlined in that file (single `<script type="module">` block). Results persist to `localStorage` and are exportable as JSON via the toolbar.
- **Legacy runner:** `tests/testRunner.html` loads `tests/engine.spec.js` — a separate, older spec file. Prefer adding new engine tests to the inline block in `tests/index.html`.
- **Stale file:** `tests/engine_spec.js` (underscore variant) is not referenced by any HTML runner; treat as orphaned.

## Node-based tooling

A few scripts run under Node (used for data validation and re-extraction from the source Excel workbook — not at runtime):

```bash
node tools/validate-sessionTemplates.js   # verifies sum(reps) == Session Distance for all 151 sessions
node tools/extract-from-excel.js          # re-extract data/*.json from the workbook
```

## Architecture — the three-layer rule

The codebase is deliberately split into three decoupled layers. Changes to one layer should not require changes to another:

| Layer      | Files                                | Constraint                                                     |
| ---------- | ------------------------------------ | -------------------------------------------------------------- |
| **Data**   | `data/*.json`                        | Schema-stable. Engine reads fixed property names.              |
| **Engine** | `engine/*.js`                        | **Pure functions. No DOM. No `localStorage`. No imports from `src/`.** |
| **UI**     | `index.html`, `styles/*`, `src/**`   | Consumes engine output. Uses `store.js` for persistence.       |

`engine/planGenerator.js` is the orchestrator: `dateScaffold → blockOptimizer → mileageProgression → (loop: distanceAllocation → weeklySchedule → sessionSelector → paceEngine) → taperProtocol`.

## Do-not-break contracts

These are load-bearing and silently break the engine if renamed:

- **JSON property names** — `Session Distance`, `Total Distance`, `Upper`, `Lower`, `UppeDif`, `LowerDif`, `Rep 1`…`Rep N`. The engine reads these exact strings.
- **The 14 session table names** in `data/sessionTemplates.json` — renaming any requires updating `getSessionTableName()` and `getFinalSessionTableName()` in `engine/sessionSelector.js`.
- **Pace table naming convention** `{Type}_Paces_{Style}_{MarathonTime}` — used by `paceEngine.js` and `config.json`'s `paceSummary`.
- **Units** — `Session Distance` / `Total Distance` are **metres**; pace `Upper`/`Lower` are **seconds**. The UI divides by 1000 for km display.

## UI conventions

- Event handlers are attached to `window.*` (e.g., `window.generatePlan`, `window.navigate`, `window.openDay`) and invoked from inline `onclick` in HTML strings returned by `src/ui/renderers.js`. Keep this pattern; no framework.
- All design tokens live in `styles/tokens.css`. Prefer editing the token over hardcoding values. Note: a few gradients in `components.css` / `app.css` use hardcoded hex — grep for `linear-gradient` if the accent colour changes.
- State is persisted to `localStorage` via `src/store.js` using a **multi-plan** scheme: `marathon-plans-index` (list of plans), `marathon-plan::{id}` (each full plan), `marathon-comp::{id}` (completions per plan). The legacy single-plan keys `marathon-training-plan` / `marathon-completions` are read once by `_migrate()` at boot and then removed — do not write to them. Strava credentials/tokens live under `marathon-strava` via `src/strava.js`.

## Project context

The generator is a browser port of an Excel/VBA "Training Block Template V9" workbook. The JSON in `data/` was extracted from that workbook; `data/extracted_data.json` is the raw reference extraction and is **not read at runtime**. Expect minor numeric divergence from the VBA because random session picks use `Math.random()` instead of `Rnd`, and pace arithmetic uses seconds instead of Excel date serials.
