# View Mode Rules

An Obsidian plugin that lets you set a default view (editing or reading) per note or folder, without using note frontmatter.

## Features

- Set a default view on any note or folder from the file-explorer right-click menu.
- Folder rules apply to every note inside the folder; the most specific (deepest) folder wins.
- A plugin-level global default is used as a fallback, with Obsidian's built-in behavior beneath that.
- Rules survive renames and moves; rules for deleted notes are cleaned up automatically.
- Optional: re-apply configured views when navigating into already-open tabs.
- Optional: apply configured views to tabs restored at Obsidian startup.

## Resolution order

When you open a note, the plugin decides which view to use in this order:

1. A rule targeting that exact note.
2. The deepest folder rule whose folder contains the note.
3. The plugin's global default (Editing, Reading, or "Use Obsidian default").
4. Obsidian's built-in default view for new tabs.

## Install

### Scripted (recommended)

```sh
npm install
npm run install:plugin -- /absolute/path/to/your/vault
```

This builds the plugin and copies `manifest.json` and `main.js` into `<vault>/.obsidian/plugins/view-mode-rules/`.

Alternatives for passing the vault path:

- Env var: `OBSIDIAN_VAULT_PATH=/path/to/vault npm run install:plugin`
- Local file: `echo /path/to/vault > .obsidian-vault-path` (gitignored), then `npm run install:plugin`

Resolution order is CLI arg → env var → `.obsidian-vault-path`.

After installing, reload Obsidian (`Cmd/Ctrl+P → "Reload app without saving"`) and enable the plugin under `Settings → Community plugins`.

### Manual

1. `npm install && npm run build`
2. Copy `manifest.json` and `main.js` into your vault's `.obsidian/plugins/view-mode-rules/` folder.
3. Reload Obsidian and enable the plugin under `Settings → Community plugins`.

## Commands

- `View Mode Rules: Set current note to default editing view`
- `View Mode Rules: Set current note to default reading view`
- `View Mode Rules: Clear default view for current note`
- `View Mode Rules: Open settings`

## Settings

- **Global default** — fallback view when no rule matches.
- **Apply on workspace restore** — apply rules to restored tabs at startup (off by default).
- **Apply on navigation** — re-apply rules when navigating into an already-open tab (on by default).

Rules are listed in two tables (note rules and folder rules). You can edit a rule's mode inline, remove it, or add new rules by path.

## Development

- `npm run dev` — watch-mode bundle.
- `npm run build` — production bundle + typecheck.
- `npm test` — run unit tests (vitest) for the pure modules (`RuleResolver`, `normalizePath`).

## Manual smoke tests

1. Enable the plugin in a vault.
2. Right-click a note → `Default view → Reading`. Open the note in a new tab; it opens in reading view.
3. Right-click a folder → `Default view → Editing`. Open any note inside that folder; it opens in editing view. A note with its own rule overrides the folder rule.
4. Rename a note that has a rule. Check the plugin's `data.json` — the stored path reflects the rename.
5. Rename a folder that has a folder rule. Both the folder rule path and any note rules inside it update.
6. Delete a note that has a rule. The rule disappears.
7. Toggle `Apply on navigation` off. Open a note in a tab, toggle the view manually, click a link back to the same tab — your manual view is preserved.
8. Toggle `Apply on workspace restore` on. Close Obsidian with a restored tab in the "wrong" view, reopen; the correct view is applied.
9. Open a note with a rule, then click Obsidian's view-toggle to switch modes manually. Your toggle sticks; the plugin does not flip it back.

## License

MIT
