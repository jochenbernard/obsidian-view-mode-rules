# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — esbuild watch mode (does not typecheck).
- `npm run build` — `tsc -noEmit` then a minified esbuild bundle to `main.js`. Run this before committing anything that changes types.
- `npm test` / `npm run test:watch` — vitest. Only `src/rule-resolver.ts` and `src/normalize-path.ts` are unit-tested; the rest of the code depends on Obsidian's runtime and is verified manually.
- `npm run test -- tests/rule-resolver.test.ts` — run a single test file.
- `npm run install:plugin -- /path/to/vault` — build and copy `manifest.json` + `main.js` into `<vault>/.obsidian/plugins/view-mode-rules/`. Vault path resolution order is CLI arg → `OBSIDIAN_VAULT_PATH` env → `.obsidian-vault-path` file (gitignored).

## Architecture

Three collaborators own the plugin's behavior; `src/main.ts` is only wiring.

- **`ConfigStore`** (`src/config-store.ts`) owns `data.json` persistence and the in-memory `PluginSettings`. It also reacts to vault `rename` (rewriting both the renamed path and any descendant rule paths) and `delete` (removing note rules) so rules survive file moves without stale entries.
- **`RuleResolver`** (`src/rule-resolver.ts`) is a pure function over settings: note rule → deepest folder rule → global default → `null` (let Obsidian decide). An empty-string folder path is intentionally a vault-root rule that matches every file. Matching is case-sensitive and requires a `/` boundary so `Journal` does not match `JournalBackup/`.
- **`ViewApplier`** (`src/view-applier.ts`) is the only component that touches Obsidian leaves. It tracks per-leaf state in `WeakMap`s/`WeakSet`s keyed by `WorkspaceLeaf`:
  - `lastPath` — detect navigation within a leaf vs. a first open.
  - `applying` — reentrancy guard; `setState` can itself fire `layout-change`.
  - `savedMode` — the user's mode before a rule took over, restored when they navigate to a file with no matching rule (so toggling a rule off feels reversible).
  - `applyOnNextLayoutChange` — see the deferred-apply pattern below.

### Deferred apply after `file-open`

Obsidian fires `workspace.on("file-open")` synchronously while the leaf is still transitioning, so `view.getMode()` at that moment is stale (e.g. Homepage opens the source note in reading mode, and file-open still sees "preview" for the target). `handleFileOpen` therefore does not apply — it marks the leaf via `applyOnNextLayoutChange` and the actual apply happens in `handleLayoutChange` once the new mode has been committed. Any change to this flow must preserve that ordering; tests for this live in the manual smoke checklist in `README.md` (items 7–9).

### Writing a mode

Use `MarkdownView.setState({ file, mode, source: mode === "source" }, { history: false })`. `leaf.setViewState` alone will accept the new mode in its payload but keep the view's previous mode. The `applying` WeakSet must bracket the call to avoid recursion via the `layout-change` event.

### Settings that gate behavior

- `applyOnWorkspaceRestore` — when false (default), rules are only applied to leaves opened after startup; `onLayoutReady` still calls `seedLeaves()` to populate `lastPath` so the first real navigation is detected correctly.
- `applyOnNavigation` — when false, only the first file opened in a leaf is subject to rules; subsequent navigations within the same leaf are ignored (the user's manual toggle sticks).

## Conventions

- `src/obsidian-augment.d.ts` patches missing types (currently `MenuItem.setSubmenu`). Add new Obsidian runtime-but-untyped APIs here rather than casting inline.
- Use `normalizePath` from `src/normalize-path.ts` whenever a path enters `ConfigStore` from user input or the menu; resolver/lookup paths coming from Obsidian (`TFile.path`) are already canonical.
- `ViewMode` is `"source" | "preview"` — these are Obsidian's internal identifiers, not "editing"/"reading" (those are user-facing labels only).
- Narrow untyped values with `isViewMode` / `isGlobalDefault` rather than casting dropdown `value: string` to the typed enum.
