# Content Script Layout

This extension is intentionally no-build, so content scripts are loaded in a fixed order from `background.js`.
Keep each file browser-executable and attach shared APIs to `window.__LLM_CTX__`.

## Folders

- `core/`: lifecycle, message handlers, DOM observers, shared page state, language heuristics.
- `translation/`: text discovery, adaptive scanning, glossary and translation-specific helpers.
- `features/`: user-facing feature modules such as input translation, selection translation, shortcuts, subtitles, and FAB controls.
- `ui/`: injected content-script CSS and UI helpers.

## Load Order

Update `CONTENT_MAIN_FILES` in `background.js` when adding or moving a content script.
Modules that populate `ctx.fn` must load before modules that call those functions.
