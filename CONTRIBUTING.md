# Contributing

## Development commands

- `npm run dev` — esbuild watch mode (does not typecheck).
- `npm run build` — `tsc -noEmit` then a minified esbuild bundle to `main.js`. Run this before committing anything that changes types.
- `npm test` / `npm run test:watch` — vitest. Only `src/rule-resolver.ts` and `src/normalize-path.ts` are unit-tested; the rest depends on Obsidian's runtime and is verified manually via the smoke tests below.
- `npm run test -- tests/rule-resolver.test.ts` — run a single test file.

## Installing a local build into a vault

Use the `install:plugin` script to build and copy `manifest.json` + `main.js` into `<vault>/.obsidian/plugins/view-mode-rules/`:

```sh
npm install
npm run install:plugin -- /absolute/path/to/your/vault
```

Alternatives for passing the vault path:

- Env var: `OBSIDIAN_VAULT_PATH=/path/to/vault npm run install:plugin`
- Local file: `echo /path/to/vault > .obsidian-vault-path` (gitignored), then `npm run install:plugin`

Resolution order is CLI arg → env var → `.obsidian-vault-path`.

After installing, reload Obsidian (`Cmd/Ctrl+P → "Reload app without saving"`) and enable the plugin under `Settings → Community plugins`.

## Manual smoke tests

The pure modules are unit-tested, but the parts that touch Obsidian's workspace are verified by hand. Run through this list before cutting a release or merging a behavioral change.

1. Enable the plugin in a vault.
2. Right-click a note → `Default view → Reading`. Open the note in a new tab; it opens in reading view.
3. Right-click a folder → `Default view → Editing`. Open any note inside that folder; it opens in editing view. A note with its own rule overrides the folder rule.
4. Rename a note that has a rule. Check the plugin's `data.json` — the stored path reflects the rename.
5. Rename a folder that has a folder rule. Both the folder rule path and any note rules inside it update.
6. Delete a note that has a rule. The rule disappears.
7. Toggle `Apply on navigation` off. Open a note in a tab, toggle the view manually, click a link back to the same tab — your manual view is preserved.
8. Toggle `Apply on workspace restore` on. Close Obsidian with a restored tab in the "wrong" view, reopen; the correct view is applied.
9. Open a note with a rule, then click Obsidian's view-toggle to switch modes manually. Your toggle sticks; the plugin does not flip it back.

## Releasing

See [`docs/PUBLISHING.md`](docs/PUBLISHING.md) for the release workflow and the first-time community-directory submission steps.
