# View Mode Rules — Design

**Date:** 2026-04-20
**Plugin id:** `view-mode-rules`
**Plugin name:** View Mode Rules

## Summary

An Obsidian plugin that sets a default view (reading or editing) per note or per folder, without using note frontmatter. Configuration is stored in the plugin's own data file and survives renames and moves.

## Goals

- Let users pin a specific note to always open in reading or editing view.
- Let users set folder-level defaults, with the most specific (deepest) folder winning.
- Provide a global plugin default as a fallback, with a further fallback to Obsidian's built-in behavior.
- Keep note content untouched — no frontmatter writes.
- Survive note and folder renames/moves; remove rules for deleted notes.

## Non-goals

- No tag-based, regex-based, or content-based rules.
- No per-pane overrides beyond what Obsidian already offers.
- No fighting the user: the plugin does not re-enforce a view mode while a note stays open. It only applies on open and on navigation.

## Architecture

Modular plugin with narrow, independently testable units wired by `main.ts`.

```
obsidian-default-note-view/
├── manifest.json
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
├── versions.json
├── .gitignore
├── LICENSE                       # MIT
├── README.md
├── src/
│   ├── main.ts                   # Plugin class — lifecycle + wiring (composition root)
│   ├── types.ts                  # ViewMode, Rule, PluginSettings
│   ├── config-store.ts           # Load/save settings; rename/delete handlers
│   ├── rule-resolver.ts          # Path + folder rules → resolved view mode
│   ├── view-applier.ts           # Listen to Obsidian events, set leaf state
│   ├── settings-tab.ts           # PluginSettingTab subclass
│   └── menu.ts                   # File-explorer context menu + commands
└── tests/
    └── rule-resolver.test.ts     # Pure unit tests (no Obsidian runtime)
```

Responsibilities:

- **`ConfigStore`** — owns `PluginSettings`. Exposes `getSettings()`, `setRule(rule)`, `removeRule(path, target)`, `setGlobalDefault(value)`, `setToggle(key, value)`. Persists via Obsidian's `loadData()` / `saveData()`. Subscribes to `vault.on("rename")` and `vault.on("delete")` to keep rule paths in sync. Emits a change event so UI can refresh.
- **`RuleResolver`** — pure function layer. `resolve(filePath)` returns `ViewMode | null`. No Obsidian imports; unit-tested in isolation.
- **`ViewApplier`** — hooks into `workspace` events and applies resolved modes to leaves using `leaf.setViewState(...)`.
- **`SettingsTab`** — Obsidian `PluginSettingTab`. Renders global toggles, note-rules table, folder-rules table.
- **`Menu`** — registers file-explorer context menu entries and command-palette commands.

## Data model

```ts
export type ViewMode = "source" | "preview";
// "source" = editing view (source or live preview, per Obsidian's own setting)
// "preview" = reading view

export type RuleTarget = "note" | "folder";

export interface Rule {
  path: string;          // vault-relative, forward slashes, no leading/trailing slash
  target: RuleTarget;
  mode: ViewMode;
}

export type GlobalDefault = ViewMode | "obsidian-default";

export interface PluginSettings {
  rules: Rule[];
  globalDefault: GlobalDefault;       // default: "obsidian-default"
  applyOnWorkspaceRestore: boolean;   // default: false
  applyOnNavigation: boolean;         // default: true
}
```

**Invariants:**
- At most one rule per `(path, target)` pair. `setRule` overwrites if a rule with the same pair already exists.
- Paths are normalized on write in `ConfigStore` (trim whitespace, strip leading/trailing slashes, convert backslashes to forward slashes). `RuleResolver` assumes input is already normalized.

**Storage:** one JSON blob via `loadData()` / `saveData()` → written to `.obsidian/plugins/view-mode-rules/data.json`.

## Rule resolution

`RuleResolver.resolve(filePath: string): ViewMode | null` — first match wins:

1. **Note rule.** A rule with `target === "note"` and `rule.path === filePath`.
2. **Folder rule — deepest wins.** Among rules with `target === "folder"` where `filePath` starts with `rule.path + "/"`, pick the one with the longest `rule.path`.
3. **Global default.** If `settings.globalDefault` is `"source"` or `"preview"`, return it.
4. **Obsidian default.** Return `null`. Caller then skips applying any view.

**Edge cases:**
- Empty `filePath` → `null`.
- A rule with `path === ""` is treated as a vault-root folder rule that matches every file. Not created by default; only arises if the user manually configures it.
- Case sensitivity follows the vault — exact string match.

## View application

`ViewApplier` exposes `applyToLeaf(leaf: WorkspaceLeaf): void`:

1. If the leaf's view isn't a `MarkdownView`, return.
2. Read `filePath` from the view's file; if absent, return.
3. `mode = resolver.resolve(filePath)`. If `null`, return.
4. If `MarkdownView.getMode()` already equals `mode`, return (avoid flicker).
5. Call `leaf.setViewState({ type: "markdown", state: { ...currentState, mode, source: mode === "source" } })`. Preserve other state fields.

A re-entrancy guard (`WeakSet<WorkspaceLeaf>`) prevents recursion when `setViewState` itself triggers `layout-change`.

**Distinguishing first-open from navigation.** `ViewApplier` holds a `WeakMap<WorkspaceLeaf, string>` mapping each leaf to the last file path it displayed. On a `file-open` event:

- If the leaf is absent from the map, this is a first-open for that leaf → always apply.
- If the leaf is in the map with a different path, this is navigation into an existing tab → apply only if `settings.applyOnNavigation === true`.
- Same path as before → no-op.

The map is updated after each decision.

**Event wiring** (registered with `this.registerEvent(...)` inside the `onLayoutReady` callback so startup restoration doesn't trigger the handlers):

- `workspace.on("file-open", file)` — fires on new-tab opens and on navigation into existing tabs (link clicks, file explorer clicks). Runs the first-open/navigation logic above on the active leaf.
- `workspace.on("layout-change")` — debounced sweep of the active leaf for edge cases (drag-dropped tabs, leaves becoming markdown after type change).
- **Startup.** In `onload()`, after `workspace.onLayoutReady(...)`:
  1. Seed the `WeakMap` with current `(leaf, filePath)` pairs for every restored markdown leaf, so later tab-switches into those leaves are correctly classified as navigation (not first-open).
  2. If `settings.applyOnWorkspaceRestore === true`, iterate those leaves and call `applyToLeaf` on each. Otherwise skip.
  3. Register the event listeners above.

The plugin never forces a view while a note remains open; if the user toggles manually, the plugin does not fight them.

## UI surfaces

### File-explorer context menu (`src/menu.ts`)

Registered via `workspace.on("file-menu", menu, file)`.

- For a `TFile` (markdown only, non-markdown skipped): submenu **Default view** with entries `Editing`, `Reading`, `Inherit (remove rule)`. Currently-active choice is marked.
- For a `TFolder`: same submenu, operates on a folder rule.

### Command palette

- `View Mode Rules: Set current note to default editing view`
- `View Mode Rules: Set current note to default reading view`
- `View Mode Rules: Clear default view for current note`
- `View Mode Rules: Open settings`

Each uses `checkCallback` so it hides when there is no active markdown file (except the settings command).

### Settings tab (`src/settings-tab.ts`)

Top section:

- **Global default** dropdown — `Use Obsidian default` / `Editing` / `Reading`.
- **Apply on workspace restore** toggle — default off.
- **Apply on navigation** toggle — default on. When off, the plugin only applies on a tab's first open.

Rules:

- **Note rules** table — sorted alphabetically. Columns: path (read-only), mode dropdown, delete button. "Add note rule" button opens a `FuzzySuggestModal` seeded with vault files, plus a mode picker; manual path entry allowed.
- **Folder rules** table — same layout, seeded with vault folders.

Empty state: a short helper line pointing users to the file-explorer context menu.

## Build tooling

- TypeScript ~5.4, bundled with esbuild to `main.js`.
- `package.json` scripts: `dev` (esbuild watch), `build` (typecheck then esbuild production bundle), `test` (vitest).
- `manifest.json`: id `view-mode-rules`, name `View Mode Rules`, `minAppVersion: "1.5.0"`.
- `versions.json` kept in sync with releases.

## Testing

- Unit tests (vitest) for `rule-resolver.ts` and the path-normalization helpers in `config-store.ts`. These are pure and fully coverable.
- `view-applier.ts`, `menu.ts`, and `settings-tab.ts` are thin glue over Obsidian APIs; no unit tests. Manual smoke-test steps go in the README.
- Resolver test coverage: hierarchy ordering, longest-prefix folder matching, normalization edge cases, empty path, vault-root folder rule.

## Repo setup

- `git init` in the project directory (already initialized).
- `.gitignore`: `node_modules/`, `main.js`, `*.log`, `.DS_Store`, `data.json`.
- `LICENSE`: MIT.
- `README.md` with install instructions (manual copy into `.obsidian/plugins/view-mode-rules/` until community listing), feature summary, settings reference, and manual smoke-test steps.
- No CI in the initial plan.

## Commit cadence

One commit per completed implementation step: scaffolding, resolver + tests, config store, view applier, menu + commands, settings tab, README.
