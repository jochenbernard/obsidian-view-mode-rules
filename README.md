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

### From the Obsidian community plugins browser

> Available once the plugin is accepted into the community directory. Submission is pending — use one of the other methods below in the meantime.

1. Open `Settings → Community plugins`.
2. Turn off Restricted mode if it is on.
3. Click `Browse`, search for `View Mode Rules`, and install.
4. Enable the plugin in `Settings → Community plugins`.

### Manual

1. Download `manifest.json` and `main.js` from the latest [GitHub release](https://github.com/jochenbernard/obsidian-view-mode-rules/releases).
2. Copy both files into your vault's `.obsidian/plugins/view-mode-rules/` folder (create the folder if it does not exist).
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

## Scope

Only Markdown notes are affected. Non-Markdown file types (PDFs, canvases, images, etc.) are ignored by rule resolution and by the file-menu action.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for build, test, and release instructions.

## License

MIT
